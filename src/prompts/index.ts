// ═══════════════════════════════════════════════════════════════════════════════════════════
// 📝 BARREL EXPORT: PROMPTS DE IA
// v1.35.76: Adiciona exports modulares (CORE, STYLE, SAFETY) para estilo substitutivo
//
// @version 1.35.80 - Migrado para TypeScript
// ═══════════════════════════════════════════════════════════════════════════════════════════

export {
  AI_INSTRUCTIONS,
  AI_INSTRUCTIONS_CORE,
  AI_INSTRUCTIONS_STYLE,
  AI_INSTRUCTIONS_SAFETY
} from './system';
export { AI_PROMPTS } from './ai-prompts';
export {
  DOUBLE_CHECK_PROMPTS,
  buildDoubleCheckPrompt,
  DOUBLE_CHECK_OPERATION_LABELS
} from './double-check-prompts';
export { INSTRUCAO_NAO_PRESUMIR } from './instrucoes';
export {
  buildDocumentContentArray,
  buildMiniReportPromptCore,
  buildMiniReportPrompt,
  buildBatchMiniReportPrompt
} from './promptBuilders';
export type {
  AnalyzedDocumentsForPrompt,
  BuildDocumentOptions,
  AISettingsForPrompt,
  PartesProcesso,
  MiniReportPromptCore,
  BuildMiniReportPromptOptions
} from './promptBuilders';
export {
  buildBulkAnalysisPrompt,
  BULK_AI_CONFIG,
  INTER_BATCH_DELAY,
  BULK_API_TIMEOUT_MS,
  VALID_FILE_EXTENSIONS,
  VALID_FILE_TYPES,
  MAX_BULK_FILES
} from './bulk-prompts';
export { buildAnalysisPrompt } from './document-analysis-prompts';
