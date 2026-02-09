import C6BankParser from './C6BankParser.js';
import CEFPDFParser from './CEFPDFParser.js';

// ═══════════════════════════════════════════════════════════════
// Registry: bankId → parser instance
// To add a new bank: create XxxParser.js, import, add to map.
// ═══════════════════════════════════════════════════════════════

const parsers = {
  c6: new C6BankParser(),
  cef: new CEFPDFParser(),
};

/** List of available banks (for frontend selector) */
export const AVAILABLE_BANKS = Object.values(parsers).map(p => ({
  id: p.constructor.bankId,
  name: p.constructor.bankName,
}));

/** Get parser by bankId or throw */
export function getParser(bankId) {
  const parser = parsers[bankId];
  if (!parser) throw new Error(`Parser não encontrado para banco: ${bankId}`);
  return parser;
}
