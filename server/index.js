import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Readable } from 'stream';

import claudeRoutes from './routes/claude.js';
import geminiRoutes from './routes/gemini.js';
import authRoutes from './routes/auth.js';

config();

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

// Rota de autenticação (v1.33.41)
app.use('/api/auth', authRoutes);

// Rotas de proxy para APIs de IA
app.use('/api/claude', claudeRoutes);
app.use('/api/gemini', geminiRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// v1.33.32: Proxy para embeddings do GitHub Releases (streaming para evitar OOM)
app.get('/api/embeddings', async (req, res) => {
  const { file } = req.query;

  if (!file || !['legis-embeddings.json', 'juris-embeddings.json'].includes(file)) {
    return res.status(400).json({ error: 'Invalid file parameter' });
  }

  const githubUrl = `https://github.com/rodrigonohlack/sentencify/releases/download/embeddings-v1/${file}`;

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

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════════════════╗
  ║                                                       ║
  ║   SentencifyAI Server                                ║
  ║   ────────────────────────────────────────────────   ║
  ║   Backend:  http://localhost:${PORT}                   ║
  ║   Frontend: http://localhost:3000                    ║
  ║                                                       ║
  ║   APIs:                                              ║
  ║   • Auth:    /api/auth                               ║
  ║   • Claude:  /api/claude/messages                    ║
  ║   • Gemini:  /api/gemini/generate                    ║
  ║   • Health:  /api/health                             ║
  ║                                                       ║
  ╚═══════════════════════════════════════════════════════╝
  `);
});
