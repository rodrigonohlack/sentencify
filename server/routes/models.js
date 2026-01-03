// server/routes/models.js - CRUD de Modelos
// v1.0.0 - API REST para modelos de decisão

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/database.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Aplicar auth em todas as rotas
router.use(authMiddleware);

// GET /api/models
// Lista todos os modelos do usuário
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;

    const models = db.prepare(`
      SELECT id, title, content, category, keywords, is_favorite,
             embedding, created_at, updated_at, sync_version
      FROM models
      WHERE user_id = ? AND deleted_at IS NULL
      ORDER BY updated_at DESC
    `).all(userId);

    // Converter campos
    const result = models.map(m => ({
      ...m,
      isFavorite: Boolean(m.is_favorite),
      embedding: m.embedding ? Array.from(new Float32Array(m.embedding)) : null,
      createdAt: m.created_at,
      updatedAt: m.updated_at,
      syncVersion: m.sync_version,
    }));

    res.json({ models: result, count: result.length });
  } catch (error) {
    console.error('[Models] List error:', error);
    res.status(500).json({ error: 'Erro ao listar modelos' });
  }
});

// GET /api/models/:id
// Retorna um modelo específico
router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;
    const { id } = req.params;

    const model = db.prepare(`
      SELECT id, title, content, category, keywords, is_favorite,
             embedding, created_at, updated_at, sync_version
      FROM models
      WHERE id = ? AND user_id = ? AND deleted_at IS NULL
    `).get(id, userId);

    if (!model) {
      return res.status(404).json({ error: 'Modelo não encontrado' });
    }

    res.json({
      ...model,
      isFavorite: Boolean(model.is_favorite),
      embedding: model.embedding ? Array.from(new Float32Array(model.embedding)) : null,
      createdAt: model.created_at,
      updatedAt: model.updated_at,
      syncVersion: model.sync_version,
    });
  } catch (error) {
    console.error('[Models] Get error:', error);
    res.status(500).json({ error: 'Erro ao buscar modelo' });
  }
});

// POST /api/models
// Cria um novo modelo
router.post('/', (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;
    const { id, title, content, category, keywords, isFavorite, embedding, createdAt, updatedAt } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Título e conteúdo são obrigatórios' });
    }

    const modelId = id || uuidv4();
    const now = new Date().toISOString();
    const embeddingBlob = embedding ? Buffer.from(new Float32Array(embedding).buffer) : null;

    db.prepare(`
      INSERT INTO models (id, user_id, title, content, category, keywords, is_favorite, embedding, created_at, updated_at, sync_version)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      modelId,
      userId,
      title,
      content,
      category || null,
      keywords || null,
      isFavorite ? 1 : 0,
      embeddingBlob,
      createdAt || now,
      updatedAt || now
    );

    // Log sync
    db.prepare(`
      INSERT INTO sync_log (user_id, operation, model_id, sync_version)
      VALUES (?, 'create', ?, 1)
    `).run(userId, modelId);

    res.status(201).json({
      id: modelId,
      message: 'Modelo criado com sucesso',
    });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT') {
      return res.status(409).json({ error: 'Modelo já existe' });
    }
    console.error('[Models] Create error:', error);
    res.status(500).json({ error: 'Erro ao criar modelo' });
  }
});

// PUT /api/models/:id
// Atualiza um modelo existente
router.put('/:id', (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;
    const { id } = req.params;
    const { title, content, category, keywords, isFavorite, embedding, syncVersion } = req.body;

    // Verificar se modelo existe
    const existing = db.prepare(`
      SELECT sync_version FROM models
      WHERE id = ? AND user_id = ? AND deleted_at IS NULL
    `).get(id, userId);

    if (!existing) {
      return res.status(404).json({ error: 'Modelo não encontrado' });
    }

    // Verificar conflito de versão (se fornecido)
    if (syncVersion !== undefined && existing.sync_version !== syncVersion) {
      return res.status(409).json({
        error: 'Conflito de versão',
        code: 'VERSION_CONFLICT',
        serverVersion: existing.sync_version,
      });
    }

    const now = new Date().toISOString();
    const embeddingBlob = embedding ? Buffer.from(new Float32Array(embedding).buffer) : null;

    db.prepare(`
      UPDATE models
      SET title = COALESCE(?, title),
          content = COALESCE(?, content),
          category = ?,
          keywords = ?,
          is_favorite = COALESCE(?, is_favorite),
          embedding = COALESCE(?, embedding),
          updated_at = ?,
          sync_version = sync_version + 1
      WHERE id = ? AND user_id = ?
    `).run(
      title,
      content,
      category,
      keywords,
      isFavorite !== undefined ? (isFavorite ? 1 : 0) : null,
      embeddingBlob,
      now,
      id,
      userId
    );

    // Log sync
    db.prepare(`
      INSERT INTO sync_log (user_id, operation, model_id, sync_version)
      VALUES (?, 'update', ?, ?)
    `).run(userId, id, existing.sync_version + 1);

    res.json({
      id,
      message: 'Modelo atualizado com sucesso',
      syncVersion: existing.sync_version + 1,
    });
  } catch (error) {
    console.error('[Models] Update error:', error);
    res.status(500).json({ error: 'Erro ao atualizar modelo' });
  }
});

// DELETE /api/models/:id
// Soft delete de um modelo
router.delete('/:id', (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;
    const { id } = req.params;

    const now = new Date().toISOString();

    const result = db.prepare(`
      UPDATE models
      SET deleted_at = ?, updated_at = ?, sync_version = sync_version + 1
      WHERE id = ? AND user_id = ? AND deleted_at IS NULL
    `).run(now, now, id, userId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Modelo não encontrado' });
    }

    // Log sync
    db.prepare(`
      INSERT INTO sync_log (user_id, operation, model_id, sync_version)
      VALUES (?, 'delete', ?, 0)
    `).run(userId, id);

    res.json({ id, message: 'Modelo removido com sucesso' });
  } catch (error) {
    console.error('[Models] Delete error:', error);
    res.status(500).json({ error: 'Erro ao remover modelo' });
  }
});

export default router;
