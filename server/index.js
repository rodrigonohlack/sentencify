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
import rateLimit from 'express-rate-limit';
import { Readable } from 'stream';

import claudeRoutes from './routes/claude.js';
import geminiRoutes from './routes/gemini.js';
import authRoutes from './routes/auth.js';
import authMagicRoutes from './routes/auth-magic.js';
import modelsRoutes from './routes/models.js';
import syncRoutes from './routes/sync.js';
import adminRoutes from './routes/admin.js';
import shareRoutes from './routes/share.js';
import { initDatabase } from './db/database.js';

// Inicializar banco de dados SQLite
initDatabase();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// CORS para permitir requests do frontend (Render + Vercel + localhost)
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'https://sentencify.onrender.com',
  'https://sentencifyai.vercel.app'
];

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

// Parser JSON com limite aumentado para PDFs grandes (Render não tem limite de plataforma)
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

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

// Rotas de proxy para APIs de IA
app.use('/api/claude', claudeRoutes);
app.use('/api/gemini', geminiRoutes);

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
  ║   SentencifyAI Server v1.35.14                       ║
  ║   ────────────────────────────────────────────────   ║
  ║   Backend:  http://localhost:${PORT}                   ║
  ║   Frontend: http://localhost:3000                    ║
  ║   Admin:    http://localhost:3000/admin              ║
  ║                                                       ║
  ║   APIs:                                              ║
  ║   • Auth:    /api/auth + /api/auth/magic             ║
  ║   • Admin:   /api/admin (emails autorizados)         ║
  ║   • Share:   /api/share (compartilhamento)           ║
  ║   • Models:  /api/models (CRUD)                      ║
  ║   • Sync:    /api/sync (push/pull)                   ║
  ║   • Claude:  /api/claude/messages                    ║
  ║   • Gemini:  /api/gemini/generate                    ║
  ║   • Health:  /api/health                             ║
  ║                                                       ║
  ╚═══════════════════════════════════════════════════════╝
  `);
});
