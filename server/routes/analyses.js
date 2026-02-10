// server/routes/analyses.js - CRUD de Análises de Prepauta
// v1.39.0 - API REST para análises do Analisador de Prepauta

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
    console.error('[Analyses] JSON parse error:', e);
    return fallback;
  }
}

/** Valida formato de data YYYY-MM-DD */
function isValidISODate(dateStr) {
  return !dateStr || /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
}

/** Extrai número do processo do nome do arquivo (padrão [1234567-89.1234.5.67.8901]) */
function extractNumeroFromFilename(filename) {
  if (!filename) return null;
  const match = filename.match(/\[(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})\]/);
  return match ? match[1] : null;
}

// ═══════════════════════════════════════════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════════════

// Aplicar auth em todas as rotas
router.use(authMiddleware);

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/analyses - Listar análises do usuário
// ═══════════════════════════════════════════════════════════════════════════

router.get('/', (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;
    const { search, resultado, dataPauta } = req.query;

    let query = `
      SELECT id, numero_processo, reclamante, reclamadas,
             nome_arquivo_peticao, nome_arquivo_contestacao,
             nomes_arquivos_emendas, nomes_arquivos_contestacoes,
             data_pauta, horario_audiencia, resultado_audiencia,
             pendencias, observacoes, sintese, resultado, created_at, updated_at
      FROM analyses
      WHERE user_id = ? AND deleted_at IS NULL
    `;
    const params = [userId];

    // Filtro por busca (número do processo ou reclamante)
    if (search) {
      query += ` AND (numero_processo LIKE ? OR reclamante LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    // Filtro por resultado da audiência
    if (resultado) {
      query += ` AND resultado_audiencia = ?`;
      params.push(resultado);
    }

    // Filtro por data da pauta
    if (dataPauta) {
      query += ` AND data_pauta = ?`;
      params.push(dataPauta);
    }

    query += ` ORDER BY created_at DESC`;

    const analyses = db.prepare(query).all(...params);

    // Converter campos JSON
    const result = analyses.map(a => ({
      id: a.id,
      numeroProcesso: a.numero_processo || extractNumeroFromFilename(a.nome_arquivo_peticao),
      reclamante: a.reclamante,
      reclamadas: safeJsonParse(a.reclamadas, []),
      nomeArquivoPeticao: a.nome_arquivo_peticao,
      nomeArquivoContestacao: a.nome_arquivo_contestacao,
      nomesArquivosEmendas: safeJsonParse(a.nomes_arquivos_emendas, []),
      nomesArquivosContestacoes: safeJsonParse(a.nomes_arquivos_contestacoes, [])
        || (a.nome_arquivo_contestacao ? [a.nome_arquivo_contestacao] : []),
      dataPauta: a.data_pauta,
      horarioAudiencia: a.horario_audiencia,
      resultadoAudiencia: a.resultado_audiencia,
      pendencias: safeJsonParse(a.pendencias, []),
      observacoes: a.observacoes,
      sintese: a.sintese,
      resultado: safeJsonParse(a.resultado, {}),
      createdAt: a.created_at,
      updatedAt: a.updated_at,
    }));

    res.json({ analyses: result, count: result.length });
  } catch (error) {
    console.error('[Analyses] List error:', error);
    res.status(500).json({ error: 'Erro ao listar análises' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/analyses/:id - Retornar análise específica
// ═══════════════════════════════════════════════════════════════════════════

router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;
    const { id } = req.params;

    const analysis = db.prepare(`
      SELECT id, numero_processo, reclamante, reclamadas,
             nome_arquivo_peticao, nome_arquivo_contestacao,
             nomes_arquivos_emendas, nomes_arquivos_contestacoes,
             data_pauta, horario_audiencia, resultado_audiencia,
             pendencias, observacoes, sintese, resultado, created_at, updated_at
      FROM analyses
      WHERE id = ? AND user_id = ? AND deleted_at IS NULL
    `).get(id, userId);

    if (!analysis) {
      return res.status(404).json({ error: 'Análise não encontrada' });
    }

    res.json({
      id: analysis.id,
      numeroProcesso: analysis.numero_processo || extractNumeroFromFilename(analysis.nome_arquivo_peticao),
      reclamante: analysis.reclamante,
      reclamadas: safeJsonParse(analysis.reclamadas, []),
      nomeArquivoPeticao: analysis.nome_arquivo_peticao,
      nomeArquivoContestacao: analysis.nome_arquivo_contestacao,
      nomesArquivosEmendas: safeJsonParse(analysis.nomes_arquivos_emendas, []),
      nomesArquivosContestacoes: safeJsonParse(analysis.nomes_arquivos_contestacoes, [])
        || (analysis.nome_arquivo_contestacao ? [analysis.nome_arquivo_contestacao] : []),
      dataPauta: analysis.data_pauta,
      horarioAudiencia: analysis.horario_audiencia,
      resultadoAudiencia: analysis.resultado_audiencia,
      pendencias: safeJsonParse(analysis.pendencias, []),
      observacoes: analysis.observacoes,
      sintese: analysis.sintese,
      resultado: safeJsonParse(analysis.resultado, {}),
      createdAt: analysis.created_at,
      updatedAt: analysis.updated_at,
    });
  } catch (error) {
    console.error('[Analyses] Get error:', error);
    res.status(500).json({ error: 'Erro ao buscar análise' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/analyses - Criar nova análise
// ═══════════════════════════════════════════════════════════════════════════

router.post('/', (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;
    const {
      resultado,
      nomeArquivoPeticao,
      nomeArquivoContestacao,      // Legacy (singular)
      nomesArquivosEmendas,        // NOVO: array
      nomesArquivosContestacoes,   // NOVO: array
      dataPauta,
      horarioAudiencia,
    } = req.body;

    if (!resultado) {
      return res.status(400).json({ error: 'Resultado da análise é obrigatório' });
    }

    if (dataPauta && !isValidISODate(dataPauta)) {
      return res.status(400).json({ error: 'dataPauta deve estar em formato YYYY-MM-DD' });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    // Extrair dados do resultado para facilitar buscas
    const numeroProcesso = extractNumeroFromFilename(nomeArquivoPeticao) || resultado.identificacao?.numeroProcesso || null;
    const reclamante = resultado.identificacao?.reclamantes?.[0] || null;
    const reclamadas = resultado.identificacao?.reclamadas
      ? JSON.stringify(resultado.identificacao.reclamadas)
      : null;

    db.prepare(`
      INSERT INTO analyses (
        id, user_id, numero_processo, reclamante, reclamadas,
        nome_arquivo_peticao, nome_arquivo_contestacao,
        nomes_arquivos_emendas, nomes_arquivos_contestacoes,
        data_pauta, horario_audiencia, resultado,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      userId,
      numeroProcesso,
      reclamante,
      reclamadas,
      nomeArquivoPeticao || null,
      nomeArquivoContestacao || null,
      nomesArquivosEmendas ? JSON.stringify(nomesArquivosEmendas) : null,
      nomesArquivosContestacoes ? JSON.stringify(nomesArquivosContestacoes) : null,
      dataPauta || null,
      horarioAudiencia || null,
      JSON.stringify(resultado),
      now,
      now
    );

    res.status(201).json({
      id,
      message: 'Análise criada com sucesso',
    });
  } catch (error) {
    console.error('[Analyses] Create error:', error);
    res.status(500).json({ error: 'Erro ao criar análise' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// PUT /api/analyses/:id/replace - Substituir resultado completo (reanálise)
// IMPORTANTE: Deve vir ANTES de PUT /:id para não ser capturado como parâmetro
// ═══════════════════════════════════════════════════════════════════════════

router.put('/:id/replace', (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;
    const { id } = req.params;
    const {
      resultado,
      nomeArquivoPeticao,
      nomesArquivosEmendas,
      nomesArquivosContestacoes,
    } = req.body;

    if (!resultado) {
      return res.status(400).json({ error: 'Resultado da análise é obrigatório' });
    }

    // Verificar se análise existe
    const existing = db.prepare(`
      SELECT id FROM analyses
      WHERE id = ? AND user_id = ? AND deleted_at IS NULL
    `).get(id, userId);

    if (!existing) {
      return res.status(404).json({ error: 'Análise não encontrada' });
    }

    const now = new Date().toISOString();

    // Extrair dados do resultado para facilitar buscas
    const numeroProcesso = extractNumeroFromFilename(nomeArquivoPeticao) || resultado.identificacao?.numeroProcesso || null;
    const reclamante = resultado.identificacao?.reclamantes?.[0] || null;
    const reclamadas = resultado.identificacao?.reclamadas
      ? JSON.stringify(resultado.identificacao.reclamadas)
      : null;

    db.prepare(`
      UPDATE analyses
      SET resultado = ?,
          numero_processo = ?,
          reclamante = ?,
          reclamadas = ?,
          nome_arquivo_peticao = COALESCE(?, nome_arquivo_peticao),
          nomes_arquivos_emendas = COALESCE(?, nomes_arquivos_emendas),
          nomes_arquivos_contestacoes = ?,
          updated_at = ?
      WHERE id = ? AND user_id = ?
    `).run(
      JSON.stringify(resultado),
      numeroProcesso,
      reclamante,
      reclamadas,
      nomeArquivoPeticao || null,
      nomesArquivosEmendas ? JSON.stringify(nomesArquivosEmendas) : null,
      JSON.stringify(nomesArquivosContestacoes || []),
      now,
      id,
      userId
    );

    res.json({ id, message: 'Análise substituída com sucesso' });
  } catch (error) {
    console.error('[Analyses] Replace error:', error);
    res.status(500).json({ error: 'Erro ao substituir análise' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// PUT /api/analyses/:id - Atualizar análise (horário, resultado, pendências)
// ═══════════════════════════════════════════════════════════════════════════

router.put('/:id', (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;
    const { id } = req.params;
    const {
      dataPauta,
      horarioAudiencia,
      resultadoAudiencia,
      pendencias,
      observacoes,
      sintese,
    } = req.body;

    if (dataPauta && !isValidISODate(dataPauta)) {
      return res.status(400).json({ error: 'dataPauta deve estar em formato YYYY-MM-DD' });
    }

    // Verificar se análise existe
    const existing = db.prepare(`
      SELECT id FROM analyses
      WHERE id = ? AND user_id = ? AND deleted_at IS NULL
    `).get(id, userId);

    if (!existing) {
      return res.status(404).json({ error: 'Análise não encontrada' });
    }

    const now = new Date().toISOString();
    const pendenciasJson = pendencias ? JSON.stringify(pendencias) : null;

    db.prepare(`
      UPDATE analyses
      SET data_pauta = COALESCE(?, data_pauta),
          horario_audiencia = COALESCE(?, horario_audiencia),
          resultado_audiencia = COALESCE(?, resultado_audiencia),
          pendencias = COALESCE(?, pendencias),
          observacoes = COALESCE(?, observacoes),
          sintese = COALESCE(?, sintese),
          updated_at = ?
      WHERE id = ? AND user_id = ?
    `).run(
      dataPauta,
      horarioAudiencia,
      resultadoAudiencia,
      pendenciasJson,
      observacoes,
      sintese,
      now,
      id,
      userId
    );

    res.json({
      id,
      message: 'Análise atualizada com sucesso',
    });
  } catch (error) {
    console.error('[Analyses] Update error:', error);
    res.status(500).json({ error: 'Erro ao atualizar análise' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// PUT /api/analyses/batch/data-pauta - Atualizar data da pauta em lote
// ═══════════════════════════════════════════════════════════════════════════

router.put('/batch/data-pauta', (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;
    const { ids, dataPauta } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'IDs são obrigatórios' });
    }

    if (ids.length > 1000) {
      return res.status(400).json({ error: 'Máximo 1000 análises por operação em lote' });
    }

    if (dataPauta !== null && !isValidISODate(dataPauta)) {
      return res.status(400).json({ error: 'dataPauta deve estar em formato YYYY-MM-DD ou null' });
    }

    const now = new Date().toISOString();
    const placeholders = ids.map(() => '?').join(',');

    const result = db.prepare(`
      UPDATE analyses
      SET data_pauta = ?, updated_at = ?
      WHERE id IN (${placeholders}) AND user_id = ? AND deleted_at IS NULL
    `).run(dataPauta, now, ...ids, userId);

    res.json({
      message: `${result.changes} análise(s) atualizada(s)`,
      updatedCount: result.changes,
    });
  } catch (error) {
    console.error('[Analyses] Batch update error:', error);
    res.status(500).json({ error: 'Erro ao atualizar análises em lote' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// DELETE /api/analyses/batch - Soft delete em lote
// (DEVE vir antes de /:id para não ser capturado como parâmetro)
// ═══════════════════════════════════════════════════════════════════════════

router.delete('/batch', (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'IDs são obrigatórios' });
    }

    if (ids.length > 1000) {
      return res.status(400).json({ error: 'Máximo 1000 análises por operação em lote' });
    }

    const now = new Date().toISOString();
    const placeholders = ids.map(() => '?').join(',');

    const result = db.prepare(`
      UPDATE analyses
      SET deleted_at = ?, updated_at = ?
      WHERE id IN (${placeholders}) AND user_id = ? AND deleted_at IS NULL
    `).run(now, now, ...ids, userId);

    res.json({
      message: `${result.changes} análise(s) removida(s)`,
      deletedCount: result.changes,
    });
  } catch (error) {
    console.error('[Analyses] Batch delete error:', error);
    res.status(500).json({ error: 'Erro ao remover análises em lote' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// DELETE /api/analyses/:id - Soft delete de análise
// ═══════════════════════════════════════════════════════════════════════════

router.delete('/:id', (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;
    const { id } = req.params;

    const now = new Date().toISOString();

    const result = db.prepare(`
      UPDATE analyses
      SET deleted_at = ?, updated_at = ?
      WHERE id = ? AND user_id = ? AND deleted_at IS NULL
    `).run(now, now, id, userId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Análise não encontrada' });
    }

    res.json({ id, message: 'Análise removida com sucesso' });
  } catch (error) {
    console.error('[Analyses] Delete error:', error);
    res.status(500).json({ error: 'Erro ao remover análise' });
  }
});

export default router;
