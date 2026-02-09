import BaseCSVParser from './BaseCSVParser.js';

/**
 * Parser for Banco C6 credit card CSV files.
 * Format: semicolon-separated, 9 columns, DD/MM/YYYY dates.
 * Filename pattern: "Fatura_YYYY-MM-DD.csv"
 */
export default class C6BankParser extends BaseCSVParser {
  static bankId = 'c6';
  static bankName = 'Banco C6';

  /**
   * Parse C6 CSV content.
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
   * Extract billing month from C6 filename.
   * e.g. "Fatura_2026-01-25.csv" → "2026-01"
   */
  parseBillingMonth(filename) {
    if (!filename) return null;
    const match = filename.match(/Fatura_(\d{4}-\d{2})-\d{2}\.csv/);
    return match ? match[1] : null;
  }

  /**
   * Parse C6 date format: DD/MM/YYYY → YYYY-MM-DD
   */
  parseDate(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.trim().split('/');
    if (parts.length !== 3) return null;
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
}
