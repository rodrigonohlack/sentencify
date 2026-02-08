import express from 'express';
import { getDb } from '../db/database.js';
import authMiddleware from '../middleware/auth.js';
import CategorizationService from '../services/FinCategorizationService.js';

const router = express.Router();

// POST /batch - Categorize batch via LLM
router.post('/batch', authMiddleware, async (req, res) => {
  try {
    const { expense_ids, provider } = req.body;
    const apiKey = req.headers['x-api-key'];
    const db = getDb();

    if (!expense_ids || !Array.isArray(expense_ids) || expense_ids.length === 0) {
      return res.status(400).json({ error: 'Lista de expense_ids obrigatória' });
    }

    const settings = db.prepare('SELECT * FROM financeiro_settings WHERE user_id = ?').get(req.user.id);
    const selectedProvider = provider || settings?.preferred_provider || 'gemini';

    const placeholders = expense_ids.map(() => '?').join(',');
    const expenses = db.prepare(`
      SELECT * FROM expenses
      WHERE id IN (${placeholders}) AND user_id = ? AND deleted_at IS NULL
    `).all(...expense_ids, req.user.id);

    if (expenses.length === 0) {
      return res.status(404).json({ error: 'Nenhuma despesa encontrada' });
    }

    const batches = CategorizationService.buildBatches(expenses);
    const allResults = [];

    for (const batch of batches) {
      const prompt = CategorizationService.buildPrompt(batch);

      let responseText;
      try {
        responseText = await callLLM(selectedProvider, prompt, apiKey);
      } catch (llmError) {
        console.error('[Financeiro:Categorize] LLM error:', llmError.message);
        return res.status(502).json({ error: `Erro ao chamar ${selectedProvider}: ${llmError.message}` });
      }

      const results = CategorizationService.parseResponse(responseText, batch.length);

      for (const result of results) {
        allResults.push({
          id: batch[result.index].id,
          category_id: result.category_id,
          category_source: 'llm',
          category_confidence: 0.85,
        });
      }
    }

    const stmt = db.prepare(`
      UPDATE expenses SET category_id = ?, category_source = ?, category_confidence = ?, updated_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `);

    const updateAll = db.transaction((results) => {
      for (const r of results) {
        stmt.run(r.category_id, r.category_source, r.category_confidence, r.id, req.user.id);
      }
    });

    updateAll(allResults);

    res.json({
      success: true,
      categorized: allResults.length,
      total: expenses.length,
      results: allResults,
    });
  } catch (error) {
    console.error('[Financeiro:Categorize] Batch error:', error);
    res.status(500).json({ error: 'Erro ao categorizar despesas' });
  }
});

// POST /uncategorized - Categorize ALL uncategorized expenses
router.post('/uncategorized', authMiddleware, async (req, res) => {
  try {
    const { provider } = req.body;
    const apiKey = req.headers['x-api-key'];
    const db = getDb();

    const settings = db.prepare('SELECT * FROM financeiro_settings WHERE user_id = ?').get(req.user.id);
    const selectedProvider = provider || settings?.preferred_provider || 'gemini';

    const expenses = db.prepare(`
      SELECT * FROM expenses
      WHERE user_id = ? AND category_id IS NULL AND deleted_at IS NULL
    `).all(req.user.id);

    if (expenses.length === 0) {
      return res.json({ success: true, categorized: 0, total: 0, results: [] });
    }

    const batches = CategorizationService.buildBatches(expenses);
    const allResults = [];

    for (const batch of batches) {
      try {
        const prompt = CategorizationService.buildPrompt(batch);
        const responseText = await callLLM(selectedProvider, prompt, apiKey);
        const results = CategorizationService.parseResponse(responseText, batch.length);

        for (const result of results) {
          allResults.push({
            id: batch[result.index].id,
            category_id: result.category_id,
            category_source: 'llm',
            category_confidence: 0.85,
          });
        }
      } catch (batchError) {
        console.error('[Financeiro:Categorize] Batch error (skipping):', batchError.message);
        continue;
      }
    }

    const stmt = db.prepare(`
      UPDATE expenses SET category_id = ?, category_source = ?, category_confidence = ?, updated_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `);

    const updateAll = db.transaction((results) => {
      for (const r of results) {
        stmt.run(r.category_id, r.category_source, r.category_confidence, r.id, req.user.id);
      }
    });

    updateAll(allResults);

    res.json({
      success: true,
      categorized: allResults.length,
      total: expenses.length,
      results: allResults,
    });
  } catch (error) {
    console.error('[Financeiro:Categorize] Uncategorized error:', error);
    res.status(500).json({ error: 'Erro ao categorizar despesas' });
  }
});

// POST /single - Re-categorize a single expense
router.post('/single', authMiddleware, async (req, res) => {
  try {
    const { expense_id, provider } = req.body;
    const apiKey = req.headers['x-api-key'];
    const db = getDb();

    const expense = db.prepare('SELECT * FROM expenses WHERE id = ? AND user_id = ? AND deleted_at IS NULL').get(expense_id, req.user.id);

    if (!expense) {
      return res.status(404).json({ error: 'Despesa não encontrada' });
    }

    const settings = db.prepare('SELECT * FROM financeiro_settings WHERE user_id = ?').get(req.user.id);
    const selectedProvider = provider || settings?.preferred_provider || 'gemini';

    const prompt = CategorizationService.buildPrompt([expense]);
    const responseText = await callLLM(selectedProvider, prompt, apiKey);
    const results = CategorizationService.parseResponse(responseText, 1);

    if (results.length > 0) {
      db.prepare(`
        UPDATE expenses SET category_id = ?, category_source = 'llm', category_confidence = 0.85, updated_at = datetime('now')
        WHERE id = ? AND user_id = ?
      `).run(results[0].category_id, expense_id, req.user.id);
    }

    res.json({
      success: true,
      category_id: results[0]?.category_id || null,
    });
  } catch (error) {
    console.error('[Financeiro:Categorize] Single error:', error);
    res.status(500).json({ error: 'Erro ao categorizar despesa' });
  }
});

async function callLLM(provider, prompt, apiKey) {
  if (provider === 'gemini') {
    const key = apiKey || process.env.GEMINI_API_KEY;
    if (!key) throw new Error('API key Gemini não configurada');

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Gemini ${response.status}: ${err}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  if (provider === 'grok') {
    const key = apiKey || process.env.GROK_API_KEY;
    if (!key) throw new Error('API key Grok não configurada');

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: 'grok-3-fast',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Grok ${response.status}: ${err}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  throw new Error(`Provider desconhecido: ${provider}`);
}

export default router;
