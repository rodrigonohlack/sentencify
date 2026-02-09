import BaseCSVParser from './BaseCSVParser.js';

/**
 * Parser for Caixa Econômica Federal (CEF) credit card PDF invoices.
 * Uses Gemini 3.0 Flash multimodal to extract transactions from PDF.
 */
export default class CEFPDFParser extends BaseCSVParser {
  static bankId = 'cef';
  static bankName = 'Caixa Econômica Federal';

  constructor() {
    super();
    /** @type {'pdf'} */
    this.fileType = 'pdf';
    /** @type {string|null} */
    this._extractedBillingMonth = null;
  }

  /**
   * Parse CEF PDF content via Gemini multimodal.
   * @param {Buffer} pdfBuffer - Raw PDF file buffer
   * @param {string} apiKey - Gemini API key
   * @returns {Promise<Array>} Standardized CSVPreviewRow-compatible objects
   */
  async parse(pdfBuffer, apiKey) {
    if (!apiKey) {
      throw new Error('API key Gemini necessária para importar PDF da Caixa');
    }

    const base64 = pdfBuffer.toString('base64');

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inlineData: {
                  mimeType: 'application/pdf',
                  data: base64,
                },
              },
              {
                text: EXTRACTION_PROMPT,
              },
            ],
          }],
          generationConfig: {
            temperature: 1.0,
            maxOutputTokens: 8192,
            responseMimeType: 'application/json',
            thinkingConfig: { thinkingLevel: 'minimal' },
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Gemini ${response.status}: ${err}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.find(p => p.text)?.text;

    if (!text) {
      throw new Error('Gemini não retornou dados da fatura');
    }

    const parsed = JSON.parse(text);

    if (!parsed.transactions || !Array.isArray(parsed.transactions)) {
      throw new Error('Formato de resposta inválido: transactions não encontrado');
    }

    // Store billing month for route to use
    this._extractedBillingMonth = parsed.billing_month || null;

    // Normalize to CSVPreviewRow format
    const cardHolder = parsed.card_holder || null;
    const cardLastFour = parsed.card_last_four || null;

    return parsed.transactions.map((t) => {
      const installmentParsed = this.parseInstallment(t.installment || null);

      return {
        purchase_date: t.purchase_date,
        card_holder: cardHolder,
        card_last_four: cardLastFour,
        bank_category: null,
        description: t.description || '',
        installment: t.installment || null,
        value_usd: 0,
        exchange_rate: 0,
        value_brl: t.value_brl || 0,
        is_refund: t.is_refund ? 1 : 0,
        installment_number: installmentParsed?.number ?? null,
        installment_total: installmentParsed?.total ?? null,
      };
    });
  }

  /**
   * Return billing month extracted from the PDF content by Gemini.
   */
  parseBillingMonth(_filename) {
    return this._extractedBillingMonth;
  }
}

// ═══════════════════════════════════════════════════════════════
// Gemini extraction prompt
// ═══════════════════════════════════════════════════════════════

const EXTRACTION_PROMPT = `Analise esta fatura de cartão de crédito da Caixa Econômica Federal.
Extraia TODAS as transações e retorne APENAS um JSON válido:

{
  "card_holder": "NOME COMPLETO",
  "card_last_four": "1234",
  "billing_month": "2026-01",
  "transactions": [
    {
      "purchase_date": "2026-01-15",
      "description": "SUPERMERCADO XYZ",
      "value_brl": 123.45,
      "installment": "03/10",
      "is_refund": false
    }
  ]
}

Regras:
- Datas: YYYY-MM-DD
- Valores: número positivo (sem R$)
- is_refund: true para estornos/créditos
- installment: "NN/NN" se parcelado, null se à vista/parcela única
- billing_month: mês de referência da fatura (YYYY-MM)
- Não omita nenhuma transação`;
