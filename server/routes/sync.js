// server/routes/sync.js - Sincronização Bidirecional
// v1.1.0 - Incluir modelos compartilhados no pull

import express from 'express';
import { getDb } from '../db/database.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Aplicar auth em todas as rotas
router.use(authMiddleware);

// POST /api/sync/pull
// Retorna mudanças desde o último sync (com paginação)
// v1.1.0: Inclui modelos de bibliotecas compartilhadas
router.post('/pull', (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;
    const userEmail = req.user.email;
    const { lastSyncAt, limit = 50, offset = 0 } = req.body;

    // v1.1.0: Buscar bibliotecas compartilhadas com este usuário
    // v1.35.19: Incluir accepted_at para detectar shares recém-aceitos
    const sharedLibraries = db.prepare(`
      SELECT la.owner_id, la.permission, u.email as owner_email, la.accepted_at
      FROM library_access la
      JOIN users u ON la.owner_id = u.id
      WHERE la.recipient_id = ?
    `).all(userId);

    const sharedOwnerIds = sharedLibraries.map(lib => lib.owner_id);

    // v1.35.19: Separar shares recém-aceitos (após lastSyncAt) dos já conhecidos
    // Para recém-aceitos, precisamos buscar TODOS os modelos (não apenas atualizados)
    const newlySharedOwnerIds = lastSyncAt
      ? sharedLibraries.filter(lib => new Date(lib.accepted_at) > new Date(lastSyncAt)).map(lib => lib.owner_id)
      : [];
    const knownSharedOwnerIds = sharedOwnerIds.filter(id => !newlySharedOwnerIds.includes(id));

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
        SELECT m.id, m.title, m.content, m.category, m.keywords, m.is_favorite,
               m.embedding, m.created_at, m.updated_at, m.deleted_at, m.sync_version,
               m.user_id as owner_id, u.email as owner_email
        FROM models m
        JOIN users u ON m.user_id = u.id
        WHERE m.user_id = ? AND m.updated_at > ?
        ORDER BY m.updated_at ASC
        LIMIT ? OFFSET ?
      `);
    } else {
      // Full sync: todos os modelos ativos
      totalQuery = db.prepare(`
        SELECT COUNT(*) as count FROM models
        WHERE user_id = ? AND deleted_at IS NULL
      `);
      modelsQuery = db.prepare(`
        SELECT m.id, m.title, m.content, m.category, m.keywords, m.is_favorite,
               m.embedding, m.created_at, m.updated_at, m.deleted_at, m.sync_version,
               m.user_id as owner_id, u.email as owner_email
        FROM models m
        JOIN users u ON m.user_id = u.id
        WHERE m.user_id = ? AND m.deleted_at IS NULL
        ORDER BY m.updated_at ASC
        LIMIT ? OFFSET ?
      `);
    }

    const total = lastSyncAt
      ? totalQuery.get(userId, lastSyncAt).count
      : totalQuery.get(userId).count;

    const models = lastSyncAt
      ? modelsQuery.all(userId, lastSyncAt, limit, offset)
      : modelsQuery.all(userId, limit, offset);

    // v1.35.19: Buscar modelos compartilhados com lógica melhorada
    // - Para shares RECÉM-ACEITOS (accepted_at > lastSyncAt): buscar TODOS os modelos
    // - Para shares JÁ CONHECIDOS: usar filtro incremental (updated_at > lastSyncAt)
    let sharedModels = [];
    if (offset === 0 && sharedOwnerIds.length > 0) {

      // 1. Shares recém-aceitos: buscar TODOS os modelos (sem filtro de updated_at)
      if (newlySharedOwnerIds.length > 0) {
        const newPlaceholders = newlySharedOwnerIds.map(() => '?').join(',');
        const newlySharedModels = db.prepare(`
          SELECT m.id, m.title, m.content, m.category, m.keywords, m.is_favorite,
                 m.embedding, m.created_at, m.updated_at, m.deleted_at, m.sync_version,
                 m.user_id as owner_id, u.email as owner_email
          FROM models m
          JOIN users u ON m.user_id = u.id
          WHERE m.user_id IN (${newPlaceholders}) AND m.deleted_at IS NULL
          ORDER BY m.updated_at ASC
        `).all(...newlySharedOwnerIds);
        sharedModels.push(...newlySharedModels);
        console.log(`[Sync] Pull: ${newlySharedModels.length} modelos de ${newlySharedOwnerIds.length} shares recém-aceitos`);
      }

      // 2. Shares já conhecidos: usar lógica incremental ou full conforme lastSyncAt
      if (knownSharedOwnerIds.length > 0) {
        const knownPlaceholders = knownSharedOwnerIds.map(() => '?').join(',');

        if (lastSyncAt) {
          // INCREMENTAL: apenas atualizados desde lastSyncAt (inclui deletados para remoção no cliente)
          const knownSharedModels = db.prepare(`
            SELECT m.id, m.title, m.content, m.category, m.keywords, m.is_favorite,
                   m.embedding, m.created_at, m.updated_at, m.deleted_at, m.sync_version,
                   m.user_id as owner_id, u.email as owner_email
            FROM models m
            JOIN users u ON m.user_id = u.id
            WHERE m.user_id IN (${knownPlaceholders}) AND m.updated_at > ?
            ORDER BY m.updated_at ASC
          `).all(...knownSharedOwnerIds, lastSyncAt);
          sharedModels.push(...knownSharedModels);
          console.log(`[Sync] Pull incremental: ${knownSharedModels.length} shared atualizados desde ${lastSyncAt}`);
        } else {
          // FULL: todos modelos compartilhados ativos
          const knownSharedModels = db.prepare(`
            SELECT m.id, m.title, m.content, m.category, m.keywords, m.is_favorite,
                   m.embedding, m.created_at, m.updated_at, m.deleted_at, m.sync_version,
                   m.user_id as owner_id, u.email as owner_email
            FROM models m
            JOIN users u ON m.user_id = u.id
            WHERE m.user_id IN (${knownPlaceholders}) AND m.deleted_at IS NULL
            ORDER BY m.updated_at ASC
          `).all(...knownSharedOwnerIds);
          sharedModels.push(...knownSharedModels);
          console.log(`[Sync] Pull full: ${knownSharedModels.length} shared de ${knownSharedOwnerIds.length} bibliotecas`);
        }
      }
    }

    // Converter campos para formato do cliente
    const convertModel = (m, isShared) => ({
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
      // v1.1.0: Campos de compartilhamento
      ownerId: m.owner_id,
      ownerEmail: m.owner_email,
      isShared,
    });

    const ownModels = models.map(m => convertModel(m, false));
    const sharedModelsList = sharedModels.map(m => {
      const lib = sharedLibraries.find(l => l.owner_id === m.owner_id);
      return {
        ...convertModel(m, true),
        sharedPermission: lib?.permission || 'view'
      };
    });

    const allModels = [...ownModels, ...sharedModelsList];
    const serverTime = new Date().toISOString();
    const hasMore = offset + models.length < total;

    console.log(`[Sync] Pull: ${models.length}/${total} próprios + ${sharedModelsList.length} compartilhados (offset=${offset}, hasMore=${hasMore})`);

    res.json({
      models: allModels,
      serverTime,
      count: allModels.length,
      total: total + sharedModelsList.length,
      hasMore,
      // v1.1.0: Informações sobre bibliotecas compartilhadas
      sharedLibraries: sharedLibraries.map(lib => ({
        ownerId: lib.owner_id,
        ownerEmail: lib.owner_email,
        permission: lib.permission
      }))
    });
  } catch (error) {
    console.error('[Sync] Pull error:', error);
    res.status(500).json({ error: 'Erro ao sincronizar' });
  }
});

// POST /api/sync/push
// Recebe mudanças do cliente
// v1.35.1: Suporta edição/exclusão de modelos compartilhados (se permission = 'edit')
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

    // v1.35.1: Buscar bibliotecas compartilhadas com permissão de edição
    const editableOwners = db.prepare(`
      SELECT owner_id FROM library_access
      WHERE recipient_id = ? AND permission = 'edit'
    `).all(userId).map(r => r.owner_id);

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

    // v1.35.1: Buscar modelo existente para verificar propriedade
    const getModelStmt = db.prepare(`SELECT user_id, sync_version FROM models WHERE id = ?`);

    // Processar cada mudança em uma transaction
    const processChanges = db.transaction(() => {
      for (const change of changes) {
        const { operation, model } = change;

        if (!model || !model.id) continue;

        const embeddingBlob = model.embedding
          ? Buffer.from(new Float32Array(model.embedding).buffer)
          : null;

        // v1.35.1: Determinar o owner_id efetivo (próprio ou compartilhado com edit)
        let effectiveOwnerId = userId;
        if (operation === 'update' || operation === 'delete') {
          const existingModel = getModelStmt.get(model.id);
          if (existingModel) {
            if (existingModel.user_id === userId) {
              effectiveOwnerId = userId;
            } else if (editableOwners.includes(existingModel.user_id)) {
              effectiveOwnerId = existingModel.user_id;
              console.log(`[Sync] Editando modelo compartilhado ${model.id} do owner ${effectiveOwnerId}`);
            } else {
              results.conflicts.push({ id: model.id, reason: 'no_permission' });
              continue;
            }
          }
        }

        if (operation === 'create') {
          try {
            insertStmt.run(
              model.id,
              userId, // Modelos criados sempre pertencem ao usuário atual
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
            effectiveOwnerId, // v1.35.1: Usar owner efetivo
            model.syncVersion || 0
          );

          if (info.changes > 0) {
            logStmt.run(userId, 'update', model.id, (model.syncVersion || 0) + 1);
            results.updated.push(model.id);
          } else {
            // v1.35.11: Conflito de versão - incluir versão atual do servidor para diagnóstico
            const currentModel = getModelStmt.get(model.id);
            results.conflicts.push({
              id: model.id,
              reason: 'version_mismatch',
              clientVersion: model.syncVersion || 0,
              serverVersion: currentModel?.sync_version || 0
            });
          }
        } else if (operation === 'delete') {
          const now = new Date().toISOString();
          deleteStmt.run(now, now, model.id, effectiveOwnerId); // v1.35.1: Usar owner efetivo
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
