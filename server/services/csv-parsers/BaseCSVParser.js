import crypto from 'crypto';

/**
 * Base class for bank CSV parsers.
 * Contains shared logic: hashing, installment parsing, duplicate detection.
 * Subclasses must implement: parse(), parseBillingMonth()
 */
export default class BaseCSVParser {
  /** Override in subclass */
  static bankId = 'base';
  static bankName = 'Base';

  /**
   * Parse CSV content into standardized row objects.
   * Must be implemented by each bank parser.
   */
  parse(csvContent) {
    throw new Error('parse() must be implemented by subclass');
  }

  /**
   * Extract billing month (YYYY-MM) from filename.
   * Override in subclass if the bank uses a specific filename format.
   */
  parseBillingMonth(filename) {
    return null;
  }

  /**
   * Parse Brazilian number format: "1.234,56" → 1234.56
   */
  parseNumber(str) {
    if (!str) return 0;
    const cleaned = str.trim().replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }

  /**
   * Compute SHA-256 hash of file content (for duplicate file detection)
   */
  computeHash(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Parse installment string "03/10" → { number: 3, total: 10 }
   * Returns null for "Única", null, empty, or invalid formats
   */
  parseInstallment(str) {
    if (!str || str.toLowerCase() === 'única') return null;
    const match = str.match(/^(\d+)\/(\d+)$/);
    if (!match) return null;
    const number = parseInt(match[1], 10);
    const total = parseInt(match[2], 10);
    if (number < 1 || total < 1 || number > total) return null;
    return { number, total };
  }

  /**
   * Detect duplicates and reconciliation matches against existing expenses.
   * Shared across all bank parsers — works on the standardized row format.
   */
  findDuplicates(db, userId, rows) {
    // Check for real duplicates (exclude csv_projected from duplicate detection)
    const duplicateStmt = db.prepare(`
      SELECT 1 FROM expenses
      WHERE user_id = ? AND purchase_date = ? AND description = ? AND value_brl = ? AND card_last_four = ?
        AND source != 'csv_projected' AND deleted_at IS NULL
      LIMIT 1
    `);

    // Check for reconciliation match (projected expense)
    const reconcileStmt = db.prepare(`
      SELECT id, installment_group_id FROM expenses
      WHERE user_id = ? AND source = 'csv_projected' AND description = ? AND purchase_date = ?
        AND value_brl = ? AND card_last_four = ? AND installment_number = ? AND installment_total = ?
        AND deleted_at IS NULL
      LIMIT 1
    `);

    return rows.map((row, index) => {
      // Check reconciliation first (installment rows only)
      if (row.installment_number && row.installment_total) {
        const projected = reconcileStmt.get(
          userId, row.description, row.purchase_date,
          row.value_brl, row.card_last_four, row.installment_number, row.installment_total
        );
        if (projected) {
          return {
            ...row, index, isDuplicate: false,
            isReconciliation: true,
            projectedExpenseId: projected.id,
            installment_group_id: projected.installment_group_id,
          };
        }
      }

      const isDuplicate = !!duplicateStmt.get(userId, row.purchase_date, row.description, row.value_brl, row.card_last_four);
      return {
        ...row, index, isDuplicate,
        isReconciliation: false,
        projectedExpenseId: null,
        installment_group_id: null,
      };
    });
  }
}
