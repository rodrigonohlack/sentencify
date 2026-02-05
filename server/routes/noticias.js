// server/routes/noticias.js - CRUD de Notícias Jurídicas
// v1.41.0 - API REST para app de notícias jurídicas trabalhistas

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/database.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/** Parse JSON com fallback seguro para evitar crash em dados corrompidos */
function safeJsonParse(jsonStr, fallback = []) {
  if (!jsonStr) return fallback;
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error('[Noticias] JSON parse error:', e);
    return fallback;
  }
}

/** Converte período para número de dias */
function periodToDays(period) {
  const periodDays = { today: 1, week: 7, biweekly: 14, month: 30 };
  return periodDays[period] || null;
}

// ═══════════════════════════════════════════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════════════

// Aplicar auth em todas as rotas
router.use(authMiddleware);

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/noticias - Listar notícias com filtros e paginação
// Inclui status de favorito/lida do usuário
// ═══════════════════════════════════════════════════════════════════════════

router.get('/', (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;
    const {
      sources,
      period,
      searchQuery,
      onlyFavorites,
      onlyUnread,
      limit = '50',
      offset = '0'
    } = req.query;

    // Query base com JOINs para favoritos/lidas do usuário
    let sql = `
      SELECT
        n.id, n.source_id, n.source_name, n.title, n.description,
        n.content, n.link, n.published_at, n.fetched_at, n.themes,
        n.ai_summary, n.ai_summary_generated_at, n.created_at, n.updated_at,
        CASE WHEN nf.user_id IS NOT NULL THEN 1 ELSE 0 END as is_favorite,
        CASE WHEN nl.user_id IS NOT NULL THEN 1 ELSE 0 END as is_read
      FROM noticias n
      LEFT JOIN noticias_favoritos nf ON n.id = nf.noticia_id AND nf.user_id = ?
      LEFT JOIN noticias_lidas nl ON n.id = nl.noticia_id AND nl.user_id = ?
      WHERE 1=1
    `;
    const params = [userId, userId];

    // Filtro por fontes
    if (sources) {
      const sourceList = sources.split(',').map(s => s.trim()).filter(Boolean);
      if (sourceList.length > 0) {
        sql += ` AND n.source_id IN (${sourceList.map(() => '?').join(',')})`;
        params.push(...sourceList);
      }
    }

    // Filtro por período
    if (period && period !== 'all') {
      const days = periodToDays(period);
      if (days) {
        sql += ` AND n.published_at >= datetime('now', '-${days} days')`;
      }
    }

    // Filtro por busca (título ou descrição)
    if (searchQuery) {
      sql += ` AND (n.title LIKE ? OR n.description LIKE ?)`;
      params.push(`%${searchQuery}%`, `%${searchQuery}%`);
    }

    // Filtro somente favoritos
    if (onlyFavorites === 'true') {
      sql += ` AND nf.user_id IS NOT NULL`;
    }

    // Filtro somente não lidas
    if (onlyUnread === 'true') {
      sql += ` AND nl.user_id IS NULL`;
    }

    // Contagem total (sem paginação)
    const countSql = sql.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM');
    const countResult = db.prepare(countSql).get(...params);
    const total = countResult?.total || 0;

    // Ordenação e paginação
    sql += ` ORDER BY n.published_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const news = db.prepare(sql).all(...params);

    // Converter para formato camelCase
    const result = news.map(n => ({
      id: n.id,
      sourceId: n.source_id,
      sourceName: n.source_name,
      title: n.title,
      description: n.description,
      content: n.content,
      link: n.link,
      publishedAt: n.published_at,
      fetchedAt: n.fetched_at,
      themes: safeJsonParse(n.themes, []),
      aiSummary: n.ai_summary,
      aiSummaryGeneratedAt: n.ai_summary_generated_at,
      isFavorite: !!n.is_favorite,
      isRead: !!n.is_read,
      createdAt: n.created_at,
      updatedAt: n.updated_at,
    }));

    res.json({
      news: result,
      total,
      hasMore: parseInt(offset, 10) + news.length < total
    });
  } catch (error) {
    console.error('[Noticias] List error:', error);
    res.status(500).json({ error: 'Erro ao listar notícias' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/noticias/favorites - Listar favoritos do usuário
// ═══════════════════════════════════════════════════════════════════════════

router.get('/favorites', (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;
    const { limit = '50', offset = '0' } = req.query;

    const sql = `
      SELECT
        n.id, n.source_id, n.source_name, n.title, n.description,
        n.content, n.link, n.published_at, n.fetched_at, n.themes,
        n.ai_summary, n.ai_summary_generated_at, n.created_at, n.updated_at,
        1 as is_favorite,
        CASE WHEN nl.user_id IS NOT NULL THEN 1 ELSE 0 END as is_read
      FROM noticias n
      INNER JOIN noticias_favoritos nf ON n.id = nf.noticia_id AND nf.user_id = ?
      LEFT JOIN noticias_lidas nl ON n.id = nl.noticia_id AND nl.user_id = ?
      ORDER BY nf.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const news = db.prepare(sql).all(userId, userId, parseInt(limit, 10), parseInt(offset, 10));

    const result = news.map(n => ({
      id: n.id,
      sourceId: n.source_id,
      sourceName: n.source_name,
      title: n.title,
      description: n.description,
      content: n.content,
      link: n.link,
      publishedAt: n.published_at,
      fetchedAt: n.fetched_at,
      themes: safeJsonParse(n.themes, []),
      aiSummary: n.ai_summary,
      aiSummaryGeneratedAt: n.ai_summary_generated_at,
      isFavorite: true,
      isRead: !!n.is_read,
      createdAt: n.created_at,
      updatedAt: n.updated_at,
    }));

    res.json({ news: result, count: result.length });
  } catch (error) {
    console.error('[Noticias] Favorites error:', error);
    res.status(500).json({ error: 'Erro ao listar favoritos' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/noticias - Criar nova notícia (importação manual ou RSS)
// ═══════════════════════════════════════════════════════════════════════════

router.post('/', (req, res) => {
  try {
    const db = getDb();
    const {
      sourceId,
      sourceName,
      title,
      description,
      content,
      link,
      publishedAt,
      themes
    } = req.body;

    if (!title || !link || !sourceId || !sourceName) {
      return res.status(400).json({
        error: 'Campos obrigatórios: title, link, sourceId, sourceName'
      });
    }

    // Verificar se notícia já existe (pelo link)
    const existing = db.prepare('SELECT id FROM noticias WHERE link = ?').get(link);
    if (existing) {
      return res.json({
        id: existing.id,
        message: 'Notícia já existe',
        alreadyExists: true
      });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO noticias (
        id, source_id, source_name, title, description, content,
        link, published_at, fetched_at, themes, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      sourceId,
      sourceName,
      title,
      description || '',
      content || null,
      link,
      publishedAt || now,
      now,
      themes ? JSON.stringify(themes) : null,
      now,
      now
    );

    res.status(201).json({
      id,
      message: 'Notícia criada com sucesso'
    });
  } catch (error) {
    console.error('[Noticias] Create error:', error);
    res.status(500).json({ error: 'Erro ao criar notícia' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/noticias/batch - Criar notícias em lote (RSS fetch)
// ═══════════════════════════════════════════════════════════════════════════

router.post('/batch', (req, res) => {
  try {
    const db = getDb();
    const { news } = req.body;

    if (!news || !Array.isArray(news) || news.length === 0) {
      return res.status(400).json({ error: 'Array de notícias é obrigatório' });
    }

    if (news.length > 500) {
      return res.status(400).json({ error: 'Máximo 500 notícias por lote' });
    }

    const now = new Date().toISOString();
    let inserted = 0;
    let skipped = 0;

    const insertStmt = db.prepare(`
      INSERT OR IGNORE INTO noticias (
        id, source_id, source_name, title, description, content,
        link, published_at, fetched_at, themes, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction((newsItems) => {
      for (const item of newsItems) {
        const result = insertStmt.run(
          uuidv4(),
          item.sourceId,
          item.sourceName,
          item.title,
          item.description || '',
          item.content || null,
          item.link,
          item.publishedAt || now,
          now,
          item.themes ? JSON.stringify(item.themes) : null,
          now,
          now
        );
        if (result.changes > 0) {
          inserted++;
        } else {
          skipped++;
        }
      }
    });

    transaction(news);

    res.json({
      message: `${inserted} notícia(s) inserida(s), ${skipped} já existiam`,
      inserted,
      skipped
    });
  } catch (error) {
    console.error('[Noticias] Batch create error:', error);
    res.status(500).json({ error: 'Erro ao criar notícias em lote' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// PUT /api/noticias/:id/summary - Salvar resumo IA (compartilhado)
// ═══════════════════════════════════════════════════════════════════════════

router.put('/:id/summary', (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;
    const { id } = req.params;
    const { summary } = req.body;

    if (!summary) {
      return res.status(400).json({ error: 'Resumo é obrigatório' });
    }

    // Verificar se notícia existe
    const existing = db.prepare('SELECT id FROM noticias WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Notícia não encontrada' });
    }

    const now = new Date().toISOString();

    db.prepare(`
      UPDATE noticias
      SET ai_summary = ?,
          ai_summary_generated_at = ?,
          ai_summary_generated_by = ?,
          updated_at = ?
      WHERE id = ?
    `).run(summary, now, userId, now, id);

    res.json({
      id,
      message: 'Resumo salvo com sucesso',
      aiSummaryGeneratedAt: now
    });
  } catch (error) {
    console.error('[Noticias] Summary save error:', error);
    res.status(500).json({ error: 'Erro ao salvar resumo' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/noticias/:id/favorite - Adicionar aos favoritos
// ═══════════════════════════════════════════════════════════════════════════

router.post('/:id/favorite', (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;
    const { id } = req.params;

    // Verificar se notícia existe
    const existing = db.prepare('SELECT id FROM noticias WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Notícia não encontrada' });
    }

    const now = new Date().toISOString();

    try {
      db.prepare(`
        INSERT INTO noticias_favoritos (user_id, noticia_id, created_at)
        VALUES (?, ?, ?)
      `).run(userId, id, now);
      res.json({ success: true, message: 'Adicionado aos favoritos' });
    } catch (e) {
      // Já é favorito (constraint unique)
      res.json({ success: true, alreadyFavorite: true });
    }
  } catch (error) {
    console.error('[Noticias] Favorite add error:', error);
    res.status(500).json({ error: 'Erro ao adicionar favorito' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// DELETE /api/noticias/:id/favorite - Remover dos favoritos
// ═══════════════════════════════════════════════════════════════════════════

router.delete('/:id/favorite', (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;
    const { id } = req.params;

    db.prepare(`
      DELETE FROM noticias_favoritos
      WHERE user_id = ? AND noticia_id = ?
    `).run(userId, id);

    res.json({ success: true, message: 'Removido dos favoritos' });
  } catch (error) {
    console.error('[Noticias] Favorite remove error:', error);
    res.status(500).json({ error: 'Erro ao remover favorito' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/noticias/:id/read - Marcar como lida
// ═══════════════════════════════════════════════════════════════════════════

router.post('/:id/read', (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;
    const { id } = req.params;

    const now = new Date().toISOString();

    try {
      db.prepare(`
        INSERT INTO noticias_lidas (user_id, noticia_id, read_at)
        VALUES (?, ?, ?)
      `).run(userId, id, now);
    } catch (e) {
      // Já está marcada como lida (constraint unique)
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[Noticias] Mark read error:', error);
    res.status(500).json({ error: 'Erro ao marcar como lida' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/noticias/fetch - Trigger para buscar novas notícias
// NOTA: A busca RSS é feita no frontend por questões de CORS
// Este endpoint serve como placeholder para futura implementação server-side
// ═══════════════════════════════════════════════════════════════════════════

router.post('/fetch', (req, res) => {
  res.json({
    fetched: 0,
    errors: [],
    message: 'RSS fetch is handled client-side due to CORS restrictions'
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/noticias/stats - Estatísticas de notícias (admin)
// ═══════════════════════════════════════════════════════════════════════════

router.get('/stats', (req, res) => {
  try {
    const db = getDb();

    const total = db.prepare('SELECT COUNT(*) as count FROM noticias').get();
    const withSummary = db.prepare('SELECT COUNT(*) as count FROM noticias WHERE ai_summary IS NOT NULL').get();
    const todayCount = db.prepare(`
      SELECT COUNT(*) as count FROM noticias
      WHERE published_at >= datetime('now', '-1 day')
    `).get();
    const sourceStats = db.prepare(`
      SELECT source_id, source_name, COUNT(*) as count
      FROM noticias
      GROUP BY source_id
      ORDER BY count DESC
    `).all();

    res.json({
      total: total.count,
      withSummary: withSummary.count,
      today: todayCount.count,
      bySources: sourceStats.map(s => ({
        sourceId: s.source_id,
        sourceName: s.source_name,
        count: s.count
      }))
    });
  } catch (error) {
    console.error('[Noticias] Stats error:', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
});

export default router;
