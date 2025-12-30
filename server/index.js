import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import claudeRoutes from './routes/claude.js';
import geminiRoutes from './routes/gemini.js';

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// CORS para permitir requests do frontend
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));

// Parser JSON com limite aumentado para PDFs
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rotas de proxy para APIs de IA
app.use('/api/claude', claudeRoutes);
app.use('/api/gemini', geminiRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
  ║   • Claude:  /api/claude/messages                    ║
  ║   • Gemini:  /api/gemini/generate                    ║
  ║   • Health:  /api/health                             ║
  ║                                                       ║
  ╚═══════════════════════════════════════════════════════╝
  `);
});
