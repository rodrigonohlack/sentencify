// server/routes/prova-oral.js - CRUD de Análises de Prova Oral
// v1.39.08 - API REST para análises de prova oral trabalhista

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/database.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/** Parse JSON com fallback seguro para evitar crash em dados corrompidos */
function safeJsonParse(jsonStr, fallback = {}) {
  if (!jsonStr) return fallback;
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error('[ProvaOral] JSON parse error:', e);
    return fallback;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════════════

// Aplicar auth em todas as rotas
router.use(authMiddleware);

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/prova-oral - Listar análises do usuário
// ═══════════════════════════════════════════════════════════════════════════

router.get('/', (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;
    const { search } = req.query;

    let query = `
      SELECT id, numero_processo, reclamante, reclamada, vara,
             transcricao, sintese_processo, resultado,
             created_at, updated_at
      FROM prova_oral_analyses
      WHERE user_id = ? AND deleted_at IS NULL
    `;
    const params = [userId];

    // Filtro por busca (número do processo, reclamante ou reclamada)
    if (search) {
      query += ` AND (numero_processo LIKE ? OR reclamante LIKE ? OR reclamada LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY created_at DESC`;

    const analyses = db.prepare(query).all(...params);

    // Converter campos JSON
    const result = analyses.map(a => ({
      id: a.id,
      numeroProcesso: a.numero_processo,
      reclamante: a.reclamante,
      reclamada: a.reclamada,
      vara: a.vara,
      transcricao: a.transcricao || '',
      sinteseProcesso: a.sintese_processo || '',
      resultado: safeJsonParse(a.resultado, {}),
      createdAt: a.created_at,
      updatedAt: a.updated_at,
    }));

    res.json({ analyses: result, count: result.length });
  } catch (error) {
    console.error('[ProvaOral] List error:', error);
    res.status(500).json({ error: 'Erro ao listar análises' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/prova-oral/:id - Retornar análise específica
// ═══════════════════════════════════════════════════════════════════════════

router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;
    const { id } = req.params;

    const analysis = db.prepare(`
      SELECT id, numero_processo, reclamante, reclamada, vara,
             transcricao, sintese_processo, resultado,
             created_at, updated_at
      FROM prova_oral_analyses
      WHERE id = ? AND user_id = ? AND deleted_at IS NULL
    `).get(id, userId);

    if (!analysis) {
      return res.status(404).json({ error: 'Análise não encontrada' });
    }

    res.json({
      id: analysis.id,
      numeroProcesso: analysis.numero_processo,
      reclamante: analysis.reclamante,
      reclamada: analysis.reclamada,
      vara: analysis.vara,
      transcricao: analysis.transcricao || '',
      sinteseProcesso: analysis.sintese_processo || '',
      resultado: safeJsonParse(analysis.resultado, {}),
      createdAt: analysis.created_at,
      updatedAt: analysis.updated_at,
    });
  } catch (error) {
    console.error('[ProvaOral] Get error:', error);
    res.status(500).json({ error: 'Erro ao buscar análise' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/prova-oral - Criar nova análise
// ═══════════════════════════════════════════════════════════════════════════

router.post('/', (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;
    const {
      resultado,
      transcricao,
      sinteseProcesso,
    } = req.body;

    if (!resultado) {
      return res.status(400).json({ error: 'Resultado da análise é obrigatório' });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    // Extrair dados do resultado para facilitar buscas
    const numeroProcesso = resultado.processo?.numeroProcesso || null;
    const reclamante = resultado.processo?.reclamante || null;
    const reclamada = resultado.processo?.reclamada || null;
    const vara = resultado.processo?.vara || null;

    db.prepare(`
      INSERT INTO prova_oral_analyses (
        id, user_id, numero_processo, reclamante, reclamada, vara,
        transcricao, sintese_processo, resultado,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      userId,
      numeroProcesso,
      reclamante,
      reclamada,
      vara,
      transcricao || '',
      sinteseProcesso || '',
      JSON.stringify(resultado),
      now,
      now
    );

    res.status(201).json({
      id,
      message: 'Análise criada com sucesso',
    });
  } catch (error) {
    console.error('[ProvaOral] Create error:', error);
    res.status(500).json({ error: 'Erro ao criar análise' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// DELETE /api/prova-oral/:id - Soft delete de análise
// ═══════════════════════════════════════════════════════════════════════════

router.delete('/:id', (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;
    const { id } = req.params;

    const now = new Date().toISOString();

    const result = db.prepare(`
      UPDATE prova_oral_analyses
      SET deleted_at = ?, updated_at = ?
      WHERE id = ? AND user_id = ? AND deleted_at IS NULL
    `).run(now, now, id, userId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Análise não encontrada' });
    }

    res.json({ id, message: 'Análise removida com sucesso' });
  } catch (error) {
    console.error('[ProvaOral] Delete error:', error);
    res.status(500).json({ error: 'Erro ao remover análise' });
  }
});

export default router;
