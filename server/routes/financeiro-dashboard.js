import express from 'express';
import { getDb } from '../db/database.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// GET /summary?month=YYYY-MM
router.get('/summary', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const { month } = req.query;

    if (!month) return res.status(400).json({ error: 'Parametro month obrigatorio (YYYY-MM)' });

    const current = db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN is_refund = 0 THEN value_brl ELSE 0 END), 0) as total_expenses,
        COALESCE(SUM(CASE WHEN is_refund = 1 THEN ABS(value_brl) ELSE 0 END), 0) as total_refunds,
        COALESCE(SUM(value_brl), 0) as net_total,
        COUNT(*) as transaction_count,
        COALESCE(MAX(CASE WHEN is_refund = 0 THEN value_brl END), 0) as max_expense,
        COALESCE(AVG(CASE WHEN is_refund = 0 THEN value_brl END), 0) as avg_expense
      FROM expenses
      WHERE user_id = ? AND purchase_date LIKE ? AND deleted_at IS NULL
    `).get(req.user.id, `${month}%`);

    const [year, mon] = month.split('-').map(Number);
    const prevDate = new Date(year, mon - 2, 1);
    const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

    const previous = db.prepare(`
      SELECT COALESCE(SUM(CASE WHEN is_refund = 0 THEN value_brl ELSE 0 END), 0) as total_expenses
      FROM expenses
      WHERE user_id = ? AND purchase_date LIKE ? AND deleted_at IS NULL
    `).get(req.user.id, `${prevMonth}%`);

    const biggest = db.prepare(`
      SELECT description, value_brl FROM expenses
      WHERE user_id = ? AND purchase_date LIKE ? AND deleted_at IS NULL AND is_refund = 0
      ORDER BY value_brl DESC LIMIT 1
    `).get(req.user.id, `${month}%`);

    const daysInMonth = new Date(year, mon, 0).getDate();

    const changePercent = previous.total_expenses > 0
      ? ((current.total_expenses - previous.total_expenses) / previous.total_expenses) * 100
      : 0;

    res.json({
      total_expenses: current.total_expenses,
      total_refunds: current.total_refunds,
      net_total: current.net_total,
      transaction_count: current.transaction_count,
      max_expense: current.max_expense,
      max_expense_description: biggest?.description || null,
      avg_per_day: current.total_expenses / daysInMonth,
      change_percent: Math.round(changePercent * 10) / 10,
      previous_total: previous.total_expenses,
    });
  } catch (error) {
    console.error('[Financeiro:Dashboard] Summary error:', error);
    res.status(500).json({ error: 'Erro ao gerar resumo' });
  }
});

// GET /by-category?month=YYYY-MM
router.get('/by-category', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const { month } = req.query;
    if (!month) return res.status(400).json({ error: 'Parametro month obrigatorio' });

    const data = db.prepare(`
      SELECT
        c.id as category_id, c.name as category_name, c.icon as category_icon, c.color as category_color,
        SUM(CASE WHEN e.is_refund = 0 THEN e.value_brl ELSE 0 END) as total,
        COUNT(*) as count
      FROM expenses e
      LEFT JOIN categories c ON e.category_id = c.id
      WHERE e.user_id = ? AND e.purchase_date LIKE ? AND e.deleted_at IS NULL
      GROUP BY c.id
      ORDER BY total DESC
    `).all(req.user.id, `${month}%`);

    res.json({ categories: data });
  } catch (error) {
    console.error('[Financeiro:Dashboard] By category error:', error);
    res.status(500).json({ error: 'Erro ao gerar dados por categoria' });
  }
});

// GET /by-holder?month=YYYY-MM
router.get('/by-holder', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const { month } = req.query;
    if (!month) return res.status(400).json({ error: 'Parametro month obrigatorio' });

    const data = db.prepare(`
      SELECT
        card_holder, card_last_four,
        SUM(CASE WHEN is_refund = 0 THEN value_brl ELSE 0 END) as total,
        COUNT(*) as count
      FROM expenses
      WHERE user_id = ? AND purchase_date LIKE ? AND deleted_at IS NULL
      GROUP BY card_holder, card_last_four
      ORDER BY total DESC
    `).all(req.user.id, `${month}%`);

    res.json({ holders: data });
  } catch (error) {
    console.error('[Financeiro:Dashboard] By holder error:', error);
    res.status(500).json({ error: 'Erro ao gerar dados por titular' });
  }
});

// GET /trends?from=YYYY-MM&to=YYYY-MM
router.get('/trends', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const { from, to } = req.query;
    if (!from || !to) return res.status(400).json({ error: 'Parametros from e to obrigatorios' });

    const data = db.prepare(`
      SELECT
        substr(purchase_date, 1, 7) as month,
        SUM(CASE WHEN is_refund = 0 THEN value_brl ELSE 0 END) as total,
        COUNT(*) as count
      FROM expenses
      WHERE user_id = ? AND substr(purchase_date, 1, 7) >= ? AND substr(purchase_date, 1, 7) <= ? AND deleted_at IS NULL
      GROUP BY month
      ORDER BY month ASC
    `).all(req.user.id, from, to);

    res.json({ trends: data });
  } catch (error) {
    console.error('[Financeiro:Dashboard] Trends error:', error);
    res.status(500).json({ error: 'Erro ao gerar tendencias' });
  }
});

// GET /alerts?month=YYYY-MM
router.get('/alerts', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const { month } = req.query;
    if (!month) return res.status(400).json({ error: 'Parametro month obrigatorio' });

    const alerts = db.prepare(`
      WITH current_month AS (
        SELECT category_id, SUM(CASE WHEN is_refund = 0 THEN value_brl ELSE 0 END) as current_total
        FROM expenses
        WHERE user_id = ? AND purchase_date LIKE ? AND deleted_at IS NULL
        GROUP BY category_id
      ),
      avg_months AS (
        SELECT category_id, AVG(monthly_total) as avg_total
        FROM (
          SELECT category_id, substr(purchase_date, 1, 7) as month,
            SUM(CASE WHEN is_refund = 0 THEN value_brl ELSE 0 END) as monthly_total
          FROM expenses
          WHERE user_id = ? AND deleted_at IS NULL AND purchase_date NOT LIKE ?
          GROUP BY category_id, month
        )
        GROUP BY category_id
      )
      SELECT
        cm.category_id, c.name as category_name, c.color as category_color,
        cm.current_total, COALESCE(am.avg_total, 0) as avg_total,
        CASE WHEN am.avg_total > 0 THEN ((cm.current_total - am.avg_total) / am.avg_total * 100) ELSE 0 END as percent_above
      FROM current_month cm
      LEFT JOIN avg_months am ON cm.category_id = am.category_id
      LEFT JOIN categories c ON cm.category_id = c.id
      WHERE cm.current_total > COALESCE(am.avg_total, 0) * 1.2
      ORDER BY percent_above DESC
    `).all(req.user.id, `${month}%`, req.user.id, `${month}%`);

    res.json({ alerts });
  } catch (error) {
    console.error('[Financeiro:Dashboard] Alerts error:', error);
    res.status(500).json({ error: 'Erro ao gerar alertas' });
  }
});

export default router;
