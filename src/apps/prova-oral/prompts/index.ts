/**
 * @file index.ts
 * @description Exportação centralizada de prompts
 */

// Prompt original (mantido para referência/fallback)
export { PROVA_ORAL_SYSTEM_PROMPT } from './analysis';

// Novos prompts para fluxo de duas fases
export { PROVA_ORAL_TRANSCRIPTION_PROMPT } from './transcription';
export { PROVA_ORAL_JURIDICAL_ANALYSIS_PROMPT } from './juridical-analysis';
