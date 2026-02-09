import { v4 as uuidv4 } from 'uuid';

class FinRecurringService {
  generateForMonth(db, userId, yearMonth) {
    const [year, month] = yearMonth.split('-').map(Number);

    const recurring = db.prepare(`
      SELECT * FROM recurring_expenses
      WHERE user_id = ? AND is_active = 1 AND deleted_at IS NULL
    `).all(userId);

    if (recurring.length === 0) return { generated: 0, skipped: 0 };

    let generated = 0;
    let skipped = 0;

    const insertStmt = db.prepare(`
      INSERT INTO expenses (id, user_id, purchase_date, description, value_brl, category_id, category_source, source, recurring_expense_id, is_refund, billing_month)
      VALUES (?, ?, ?, ?, ?, ?, 'manual', 'recurring', ?, 0, ?)
    `);

    const checkStmt = db.prepare(`
      SELECT 1 FROM expenses
      WHERE user_id = ? AND recurring_expense_id = ? AND purchase_date LIKE ? AND deleted_at IS NULL
      LIMIT 1
    `);

    const generate = db.transaction(() => {
      for (const rec of recurring) {
        const daysInMonth = new Date(year, month, 0).getDate();
        const day = Math.min(rec.due_day, daysInMonth);
        const purchaseDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        const exists = checkStmt.get(userId, rec.id, `${yearMonth}%`);
        if (exists) {
          skipped++;
          continue;
        }

        insertStmt.run(uuidv4(), userId, purchaseDate, rec.description, rec.value_brl, rec.category_id, rec.id, yearMonth);
        generated++;
      }
    });

    generate();

    return { generated, skipped };
  }

  getReminders(db, userId, days = 3) {
    const today = new Date();
    const currentDay = today.getDate();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

    const recurring = db.prepare(`
      SELECT r.*, c.name as category_name, c.icon as category_icon, c.color as category_color
      FROM recurring_expenses r
      LEFT JOIN categories c ON r.category_id = c.id
      WHERE r.user_id = ? AND r.is_active = 1 AND r.deleted_at IS NULL
    `).all(userId);

    return recurring.filter(rec => {
      const dueDay = Math.min(rec.due_day, daysInMonth);
      const diff = dueDay - currentDay;
      return diff >= 0 && diff <= days;
    }).map(rec => ({
      ...rec,
      due_date: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(Math.min(rec.due_day, daysInMonth)).padStart(2, '0')}`,
      days_until: Math.min(rec.due_day, daysInMonth) - currentDay,
    }));
  }
}

export default new FinRecurringService();
