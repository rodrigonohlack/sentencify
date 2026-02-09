import crypto from 'crypto';

class FinCSVParserService {
  /**
   * Parse CSV content (semicolon-separated, Brazilian credit card format)
   * Header: Data de Compra;Nome no Cartao;Final do Cartao;Categoria;Descricao;Parcela;Valor (em US$);Cotacao (em R$);Valor (em R$)
   */
  parse(csvContent) {
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV vazio ou sem dados');
    }

    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cols = line.split(';');
      if (cols.length < 9) continue;

      const [dateStr, cardHolder, cardLastFour, bankCategory, description, installment, valueUsdStr, exchangeRateStr, valueBrlStr] = cols;

      const purchaseDate = this.parseDate(dateStr);
      if (!purchaseDate) continue;

      const valueUsd = this.parseNumber(valueUsdStr);
      const exchangeRate = this.parseNumber(exchangeRateStr);
      const valueBrl = this.parseNumber(valueBrlStr);

      const isRefund = valueBrl < 0 ? 1 : 0;
      const parsed = this.parseInstallment(installment?.trim() || null);

      rows.push({
        purchase_date: purchaseDate,
        card_holder: cardHolder?.trim() || null,
        card_last_four: cardLastFour?.trim() || null,
        bank_category: bankCategory?.trim() === '-' ? null : bankCategory?.trim() || null,
        description: description?.trim() || '',
        installment: installment?.trim() || null,
        value_usd: valueUsd,
        exchange_rate: exchangeRate,
        value_brl: valueBrl,
        is_refund: isRefund,
        installment_number: parsed?.number ?? null,
        installment_total: parsed?.total ?? null,
      });
    }

    return rows;
  }

  /**
   * Parse installment string "03/10" -> { number: 3, total: 10 }
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
   * Extract billing month (YYYY-MM) from filename
   * e.g. "Fatura_2026-01-25.csv" -> "2026-01"
   */
  parseBillingMonth(filename) {
    if (!filename) return null;
    const match = filename.match(/Fatura_(\d{4}-\d{2})-\d{2}\.csv/);
    return match ? match[1] : null;
  }

  parseDate(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.trim().split('/');
    if (parts.length !== 3) return null;
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  parseNumber(str) {
    if (!str) return 0;
    const cleaned = str.trim().replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }

  computeHash(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

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

export default new FinCSVParserService();
