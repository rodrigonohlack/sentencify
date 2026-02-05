import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// IMPORTANTE: Carregar .env ANTES de qualquer import que use process.env
config({ path: join(dirname(fileURLToPath(import.meta.url)), '..', '.env') });

// v1.35.12: Sentry error tracking (deve ser inicializado cedo)
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN_BACKEND,
  environment: process.env.NODE_ENV || 'development',
  enabled: process.env.NODE_ENV === 'production',
});

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { Readable } from 'stream';

import claudeRoutes from './routes/claude.js';
import geminiRoutes from './routes/gemini.js';
import openaiRoutes from './routes/openai.js';
import grokRoutes from './routes/grok.js';
import authRoutes from './routes/auth.js';
import authMagicRoutes from './routes/auth-magic.js';
import modelsRoutes from './routes/models.js';
import syncRoutes from './routes/sync.js';
import adminRoutes from './routes/admin.js';
import shareRoutes from './routes/share.js';
import analysesRoutes from './routes/analyses.js';
import provaOralRoutes from './routes/prova-oral.js';
import usersRoutes from './routes/users.js';
import noticiasRoutes from './routes/noticias.js';
import { initDatabase } from './db/database.js';

// Inicializar banco de dados SQLite
initDatabase();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// v1.35.17: Confiar no proxy Cloudflare/Render para rate limiting correto
// Sem isso, todos os usuários parecem vir do mesmo IP (o IP do proxy)
app.set('trust proxy', 1);

// CORS para permitir requests do frontend (Render + Vercel + localhost + domínio próprio)
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'https://sentencify.onrender.com',
  'https://sentencifyai.vercel.app',
  'https://sentencify.ia.br',
  'https://www.sentencify.ia.br'
];

// v1.35.44: COOP header para permitir comunicação com popup do Google OAuth
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  next();
});

// v1.38.3: Content Security Policy (CSP) para proteção contra XSS
// Recursos externos mapeados: CDNs (Quill, PDF.js, Tesseract, DOMPurify),
// APIs IA (Claude, Gemini, OpenAI, Grok), Google (Drive, OAuth),
// HuggingFace (modelos NER/E5), GitHub Releases (embeddings), Sentry
app.use((req, res, next) => {
  const cspDirectives = [
    // Fallback: apenas recursos do próprio domínio
    "default-src 'self'",

    // Scripts: CDNs necessários + unsafe-inline/eval para Quill e Transformers.js WASM
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.quilljs.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://accounts.google.com",

    // Estilos: Quill injeta estilos inline dinamicamente
    "style-src 'self' 'unsafe-inline' https://cdn.quilljs.com https://cdn.jsdelivr.net",

    // Imagens: avatares Google, data URIs (favicon), blobs (PDFs renderizados)
    "img-src 'self' data: blob: https://lh3.googleusercontent.com https://*.googleusercontent.com",

    // Fontes: apenas locais (Lucide React icons são npm)
    "font-src 'self'",

    // Conexões: APIs de IA, Google, HuggingFace, GitHub, Sentry, CDNs
    "connect-src 'self' https://api.anthropic.com https://generativelanguage.googleapis.com https://api.openai.com https://api.x.ai https://www.googleapis.com https://accounts.google.com https://oauth2.googleapis.com https://github.com https://raw.githubusercontent.com https://cdn-lfs.huggingface.co https://huggingface.co https://cas-bridge.xethub.hf.co https://o4510650008076288.ingest.us.sentry.io https://cdn.quilljs.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",

    // Frames: popup do Google OAuth
    "frame-src 'self' https://accounts.google.com",

    // Workers: PDF.js e Tesseract usam blob workers, ai-worker.js é local
    "worker-src 'self' blob:",

    // Child frames/workers
    "child-src 'self' blob:",

    // Bloquear plugins (Flash, Java, etc.)
    "object-src 'none'",

    // Restringir base URI para evitar hijacking
    "base-uri 'self'",

    // Restringir destinos de formulários
    "form-action 'self'"
  ];

  res.setHeader('Content-Security-Policy', cspDirectives.join('; '));
  next();
});

app.use(cors({
  origin: function(origin, callback) {
    // Permitir requests sem origin (ex: curl, Postman, health checks)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('CORS não permitido'), false);
  },
  credentials: true
}));

// Cookie parser para CSRF tokens
app.use(cookieParser());

// Parser JSON com limite aumentado para PDFs grandes (Render não tem limite de plataforma)
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// CSRF protection removida: rotas /api/models, /api/share, /api/sync usam
// Bearer token auth (authMiddleware), que é imune a CSRF por design.

// v1.35.13: Rate limiting para proteção contra abuso
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10,
  message: { error: 'Muitas tentativas. Aguarde 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 30,
  message: { error: 'Limite de requisições IA atingido. Aguarde 1 minuto.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 100,
  message: { error: 'Muitas requisições. Aguarde 1 minuto.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Aplicar rate limiters (ordem importa - específicos antes do geral)
app.use('/api/auth', authLimiter);
app.use('/api/claude', aiLimiter);
app.use('/api/gemini', aiLimiter);
app.use('/api/openai', aiLimiter);
app.use('/api/grok', aiLimiter);
app.use('/api', generalLimiter);

// Rota de autenticação simples (v1.33.41)
app.use('/api/auth', authRoutes);

// Rotas de autenticação magic link (v1.34.0)
app.use('/api/auth/magic', authMagicRoutes);

// Rotas de modelos e sincronização (v1.34.0)
app.use('/api/models', modelsRoutes);
app.use('/api/sync', syncRoutes);

// Rotas de administração (v1.34.4)
app.use('/api/admin', adminRoutes);

// Rotas de compartilhamento (v1.35.0)
app.use('/api/share', shareRoutes);

// Rotas de análises do Analisador de Prepauta (v1.39.0)
app.use('/api/analyses', analysesRoutes);

// Rotas de análises de Prova Oral (v1.39.08)
app.use('/api/prova-oral', provaOralRoutes);

// Rotas de usuários (v1.40.12 - para compartilhamento)
app.use('/api/users', usersRoutes);

// Rotas de notícias jurídicas (v1.41.0)
app.use('/api/noticias', noticiasRoutes);

// Rotas de proxy para APIs de IA
app.use('/api/claude', claudeRoutes);
app.use('/api/gemini', geminiRoutes);
app.use('/api/openai', openaiRoutes);
app.use('/api/grok', grokRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// v1.33.32: Proxy para embeddings do GitHub Releases (streaming para evitar OOM)
// v1.33.61: Adicionado suporte para arquivos de dados (legis-data.json, juris-data.json)
app.get('/api/embeddings', async (req, res) => {
  const { file } = req.query;

  // Arquivos permitidos e suas releases correspondentes
  const allowedFiles = {
    'legis-embeddings.json': 'embeddings-v1',
    'juris-embeddings.json': 'embeddings-v1',
    'legis-data.json': 'data-v1',
    'juris-data.json': 'data-v1'
  };

  if (!file || !allowedFiles[file]) {
    return res.status(400).json({ error: 'Invalid file parameter' });
  }

  const releaseTag = allowedFiles[file];
  const githubUrl = `https://github.com/rodrigonohlack/sentencify/releases/download/${releaseTag}/${file}`;

  try {
    console.log(`[Embeddings] Streaming ${file}...`);

    const response = await fetch(githubUrl);

    if (!response.ok) {
      throw new Error(`GitHub returned ${response.status}`);
    }

    const contentLength = response.headers.get('Content-Length');
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }
    res.setHeader('Content-Type', 'application/json');

    // Stream direto sem buffering (evita estouro de 512MB RAM no Render free tier)
    const nodeStream = Readable.fromWeb(response.body);

    nodeStream.on('error', (err) => {
      console.error(`[Embeddings] Stream error:`, err.message);
      if (!res.headersSent) {
        res.status(500).json({ error: err.message });
      }
    });

    nodeStream.pipe(res);

  } catch (error) {
    console.error(`[Embeddings] Error:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// v1.41.0: Proxy para RSS feeds (evita CORS e dependência de proxy externo)
app.get('/api/rss-proxy', async (req, res) => {
  const { url } = req.query;

  if (!url) return res.status(400).json({ error: 'URL é obrigatória' });

  // Whitelist de domínios permitidos (anti-SSRF)
  const ALLOWED_DOMAINS = ['.jus.br', 'conjur.com.br', 'migalhas.com.br', 'jota.info'];
  try {
    const parsed = new URL(url);
    const isAllowed = ALLOWED_DOMAINS.some(d => parsed.hostname.endsWith(d));
    if (!isAllowed) return res.status(403).json({ error: 'Domínio não permitido' });
  } catch { return res.status(400).json({ error: 'URL inválida' }); }

  // Fetch com timeout de 15s
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'SentencifyAI/1.0 RSS Reader' }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.send(text);
  } catch (error) {
    res.status(502).json({ error: error.name === 'AbortError' ? 'Timeout' : error.message });
  } finally {
    clearTimeout(timeoutId);
  }
});

// Em produção, servir arquivos estáticos do build
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, '../dist')));
  app.get('*', (req, res) => {
    res.sendFile(join(__dirname, '../dist/index.html'));
  });
}

// v1.35.12: Sentry error handler (deve ser o último middleware)
Sentry.setupExpressErrorHandler(app);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════════════════╗
  ║                                                       ║
  ║   SentencifyAI Server v1.41.0                        ║
  ║   ────────────────────────────────────────────────   ║
  ║   Backend:  http://localhost:${PORT}                   ║
  ║   Frontend: http://localhost:3000                    ║
  ║   Admin:    http://localhost:3000/admin              ║
  ║                                                       ║
  ║   APIs:                                              ║
  ║   • Auth:     /api/auth + /api/auth/magic            ║
  ║   • Admin:    /api/admin (emails autorizados)        ║
  ║   • Share:    /api/share (compartilhamento)          ║
  ║   • Models:   /api/models (CRUD)                     ║
  ║   • Sync:     /api/sync (push/pull)                  ║
  ║   • Analyses: /api/analyses (prepauta)               ║
  ║   • Noticias: /api/noticias (feed jurídico)          ║
  ║   • Claude:   /api/claude/messages                   ║
  ║   • Gemini:   /api/gemini/generate                   ║
  ║   • OpenAI:   /api/openai/chat                       ║
  ║   • Grok:     /api/grok/chat                         ║
  ║   • Health:   /api/health                            ║
  ║                                                       ║
  ╚═══════════════════════════════════════════════════════╝
  `);
});
