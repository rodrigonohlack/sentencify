// server/routes/prova-oral.js - CRUD de Análises de Prova Oral
// v1.40.12 - API REST para análises de prova oral trabalhista + compartilhamento

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
// GET /api/prova-oral/sharing - Listar quem tem acesso às minhas análises
// IMPORTANTE: Deve vir ANTES de /:id para não ser capturada por ela
// ═══════════════════════════════════════════════════════════════════════════

router.get('/sharing', (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;

    const recipients = db.prepare(`
      SELECT u.id, u.email
      FROM prova_oral_access pa
      JOIN users u ON pa.recipient_id = u.id
      WHERE pa.owner_id = ?
      ORDER BY u.email
    `).all(userId);

    res.json({ recipients });
  } catch (error) {
    console.error('[ProvaOral] Sharing list error:', error);
    res.status(500).json({ error: 'Erro ao listar compartilhamentos' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// PUT /api/prova-oral/sharing - Atualizar lista de compartilhamento
// ═══════════════════════════════════════════════════════════════════════════

router.put('/sharing', (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;
    const { recipientIds } = req.body;

    if (!Array.isArray(recipientIds)) {
      return res.status(400).json({ error: 'recipientIds deve ser um array' });
    }

    // Transação: remove antigos e insere novos
    const transaction = db.transaction(() => {
      db.prepare('DELETE FROM prova_oral_access WHERE owner_id = ?').run(userId);

      const insert = db.prepare(`
        INSERT INTO prova_oral_access (id, owner_id, recipient_id)
        VALUES (?, ?, ?)
      `);

      for (const recipientId of recipientIds) {
        insert.run(uuidv4(), userId, recipientId);
      }
    });

    transaction();

    res.json({ success: true, count: recipientIds.length });
  } catch (error) {
    console.error('[ProvaOral] Sharing update error:', error);
    res.status(500).json({ error: 'Erro ao atualizar compartilhamentos' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/prova-oral - Listar análises do usuário (próprias + compartilhadas)
// ═══════════════════════════════════════════════════════════════════════════

router.get('/', (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;
    const { search } = req.query;

    // Query expandida para incluir análises compartilhadas
    let query = `
      SELECT
        poa.id, poa.numero_processo, poa.reclamante, poa.reclamada, poa.vara,
        poa.transcricao, poa.sintese_processo, poa.resultado,
        poa.created_at, poa.updated_at,
        u.email as owner_email,
        CASE WHEN poa.user_id = ? THEN 1 ELSE 0 END as is_own
      FROM prova_oral_analyses poa
      JOIN users u ON poa.user_id = u.id
      WHERE poa.deleted_at IS NULL
        AND (
          poa.user_id = ?
          OR poa.user_id IN (
            SELECT owner_id FROM prova_oral_access WHERE recipient_id = ?
          )
        )
    `;
    const params = [userId, userId, userId];

    // Filtro por busca (número do processo, reclamante ou reclamada)
    if (search) {
      query += ` AND (poa.numero_processo LIKE ? OR poa.reclamante LIKE ? OR poa.reclamada LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY poa.created_at DESC`;

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
      isOwn: a.is_own === 1,
      ownerEmail: a.owner_email,
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

    // Permitir acesso a análises próprias ou compartilhadas
    const analysis = db.prepare(`
      SELECT
        poa.id, poa.numero_processo, poa.reclamante, poa.reclamada, poa.vara,
        poa.transcricao, poa.sintese_processo, poa.resultado,
        poa.created_at, poa.updated_at, poa.user_id,
        u.email as owner_email,
        CASE WHEN poa.user_id = ? THEN 1 ELSE 0 END as is_own
      FROM prova_oral_analyses poa
      JOIN users u ON poa.user_id = u.id
      WHERE poa.id = ?
        AND poa.deleted_at IS NULL
        AND (
          poa.user_id = ?
          OR poa.user_id IN (
            SELECT owner_id FROM prova_oral_access WHERE recipient_id = ?
          )
        )
    `).get(userId, id, userId, userId);

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
      isOwn: analysis.is_own === 1,
      ownerEmail: analysis.owner_email,
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
// PUT /api/prova-oral/:id - Atualizar análise (dono ou usuários com acesso compartilhado)
// ═══════════════════════════════════════════════════════════════════════════

router.put('/:id', (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;
    const { id } = req.params;
    const { resultado } = req.body;

    if (!resultado) {
      return res.status(400).json({ error: 'Resultado é obrigatório' });
    }

    const now = new Date().toISOString();

    // Verificar acesso (dono ou destinatário compartilhado) — mesmo padrão do GET /:id
    const accessCheck = db.prepare(`
      SELECT id FROM prova_oral_analyses
      WHERE id = ? AND deleted_at IS NULL
        AND (user_id = ? OR user_id IN (
          SELECT owner_id FROM prova_oral_access WHERE recipient_id = ?
        ))
    `).get(id, userId, userId);

    if (!accessCheck) {
      return res.status(404).json({ error: 'Análise não encontrada' });
    }

    const result = db.prepare(`
      UPDATE prova_oral_analyses SET resultado = ?, updated_at = ?
      WHERE id = ? AND deleted_at IS NULL
    `).run(JSON.stringify(resultado), now, id);

    res.json({ id, message: 'Análise atualizada com sucesso' });
  } catch (error) {
    console.error('[ProvaOral] Update error:', error);
    res.status(500).json({ error: 'Erro ao atualizar análise' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// DELETE /api/prova-oral/:id - Soft delete de análise (apenas próprias)
// ═══════════════════════════════════════════════════════════════════════════

router.delete('/:id', (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;
    const { id } = req.params;

    const now = new Date().toISOString();

    // Apenas o dono pode deletar a análise
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
