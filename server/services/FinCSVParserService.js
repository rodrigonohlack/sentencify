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
      });
    }

    return rows;
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
    const stmt = db.prepare(`
      SELECT 1 FROM expenses
      WHERE user_id = ? AND purchase_date = ? AND description = ? AND value_brl = ? AND card_last_four = ? AND deleted_at IS NULL
      LIMIT 1
    `);

    return rows.map((row, index) => {
      const isDuplicate = !!stmt.get(userId, row.purchase_date, row.description, row.value_brl, row.card_last_four);
      return { ...row, index, isDuplicate };
    });
  }
}

export default new FinCSVParserService();
