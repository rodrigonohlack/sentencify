// server/routes/sync.js - Sincronização Bidirecional
// v1.0.3 - Fix Buffer→Float32Array conversion para embeddings (768 floats, não 3072 bytes)

import express from 'express';
import { getDb } from '../db/database.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Aplicar auth em todas as rotas
router.use(authMiddleware);

// POST /api/sync/pull
// Retorna mudanças desde o último sync (com paginação)
router.post('/pull', (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;
    const { lastSyncAt, limit = 50, offset = 0 } = req.body;


    // Contar total de modelos para hasMore
    let totalQuery;
    let modelsQuery;

    if (lastSyncAt) {
      // Incremental: apenas mudanças desde lastSyncAt
      totalQuery = db.prepare(`
        SELECT COUNT(*) as count FROM models
        WHERE user_id = ? AND updated_at > ?
      `);
      modelsQuery = db.prepare(`
        SELECT id, title, content, category, keywords, is_favorite,
               embedding, created_at, updated_at, deleted_at, sync_version
        FROM models
        WHERE user_id = ? AND updated_at > ?
        ORDER BY updated_at ASC
        LIMIT ? OFFSET ?
      `);
    } else {
      // Full sync: todos os modelos ativos
      totalQuery = db.prepare(`
        SELECT COUNT(*) as count FROM models
        WHERE user_id = ? AND deleted_at IS NULL
      `);
      modelsQuery = db.prepare(`
        SELECT id, title, content, category, keywords, is_favorite,
               embedding, created_at, updated_at, deleted_at, sync_version
        FROM models
        WHERE user_id = ? AND deleted_at IS NULL
        ORDER BY updated_at ASC
        LIMIT ? OFFSET ?
      `);
    }

    const total = lastSyncAt
      ? totalQuery.get(userId, lastSyncAt).count
      : totalQuery.get(userId).count;

    const models = lastSyncAt
      ? modelsQuery.all(userId, lastSyncAt, limit, offset)
      : modelsQuery.all(userId, limit, offset);

    // Converter campos para formato do cliente
    const result = models.map(m => ({
      id: m.id,
      title: m.title,
      content: m.content,
      category: m.category,
      keywords: m.keywords,
      isFavorite: Boolean(m.is_favorite),
      embedding: m.embedding ? Array.from(new Float32Array(m.embedding.buffer, m.embedding.byteOffset, m.embedding.length / 4)) : null,
      createdAt: m.created_at,
      updatedAt: m.updated_at,
      deletedAt: m.deleted_at,
      syncVersion: m.sync_version,
    }));

    const serverTime = new Date().toISOString();
    const hasMore = offset + result.length < total;

    console.log(`[Sync] Pull: ${result.length}/${total} modelos (offset=${offset}, hasMore=${hasMore})`);

    res.json({
      models: result,
      serverTime,
      count: result.length,
      total,
      hasMore,
    });
  } catch (error) {
    console.error('[Sync] Pull error:', error);
    res.status(500).json({ error: 'Erro ao sincronizar' });
  }
});

// POST /api/sync/push
// Recebe mudanças do cliente
router.post('/push', (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;
    const { changes } = req.body;

    if (!Array.isArray(changes)) {
      return res.status(400).json({ error: 'Changes deve ser um array' });
    }

    const results = {
      created: [],
      updated: [],
      deleted: [],
      conflicts: [],
    };

    // Prepared statements para performance
    // v1.0.2: INSERT OR REPLACE para evitar erro de UNIQUE constraint
    const insertStmt = db.prepare(`
      INSERT OR REPLACE INTO models (id, user_id, title, content, category, keywords, is_favorite, embedding, created_at, updated_at, sync_version)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);

    const updateStmt = db.prepare(`
      UPDATE models
      SET title = ?, content = ?, category = ?, keywords = ?, is_favorite = ?,
          embedding = ?, updated_at = ?, sync_version = sync_version + 1
      WHERE id = ? AND user_id = ? AND sync_version = ?
    `);

    const deleteStmt = db.prepare(`
      UPDATE models
      SET deleted_at = ?, updated_at = ?, sync_version = sync_version + 1
      WHERE id = ? AND user_id = ?
    `);

    const logStmt = db.prepare(`
      INSERT INTO sync_log (user_id, operation, model_id, sync_version)
      VALUES (?, ?, ?, ?)
    `);

    // Processar cada mudança em uma transaction
    const processChanges = db.transaction(() => {
      for (const change of changes) {
        const { operation, model } = change;

        if (!model || !model.id) continue;

        const embeddingBlob = model.embedding
          ? Buffer.from(new Float32Array(model.embedding).buffer)
          : null;

        if (operation === 'create') {
          try {
            insertStmt.run(
              model.id,
              userId,
              model.title,
              model.content,
              model.category || null,
              model.keywords || null,
              model.isFavorite ? 1 : 0,
              embeddingBlob,
              model.createdAt || new Date().toISOString(),
              model.updatedAt || new Date().toISOString()
            );
            logStmt.run(userId, 'create', model.id, 1);
            results.created.push(model.id);
          } catch (err) {
            if (err.code === 'SQLITE_CONSTRAINT') {
              results.conflicts.push({ id: model.id, reason: 'already_exists' });
            } else {
              throw err;
            }
          }
        } else if (operation === 'update') {
          const info = updateStmt.run(
            model.title,
            model.content,
            model.category || null,
            model.keywords || null,
            model.isFavorite ? 1 : 0,
            embeddingBlob,
            model.updatedAt || new Date().toISOString(),
            model.id,
            userId,
            model.syncVersion || 0
          );

          if (info.changes > 0) {
            logStmt.run(userId, 'update', model.id, (model.syncVersion || 0) + 1);
            results.updated.push(model.id);
          } else {
            // Conflito de versão
            results.conflicts.push({ id: model.id, reason: 'version_mismatch' });
          }
        } else if (operation === 'delete') {
          const now = new Date().toISOString();
          deleteStmt.run(now, now, model.id, userId);
          logStmt.run(userId, 'delete', model.id, 0);
          results.deleted.push(model.id);
        }
      }
    });

    processChanges();

    res.json({
      success: true,
      results,
      serverTime: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Sync] Push error:', error);
    res.status(500).json({ error: 'Erro ao sincronizar' });
  }
});

// GET /api/sync/status
// Retorna status de sincronização do usuário
router.get('/status', (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;

    const stats = db.prepare(`
      SELECT
        COUNT(*) as totalModels,
        SUM(CASE WHEN deleted_at IS NULL THEN 1 ELSE 0 END) as activeModels,
        MAX(updated_at) as lastUpdate
      FROM models WHERE user_id = ?
    `).get(userId);

    res.json({
      ...stats,
      serverTime: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Sync] Status error:', error);
    res.status(500).json({ error: 'Erro ao obter status' });
  }
});

export default router;
