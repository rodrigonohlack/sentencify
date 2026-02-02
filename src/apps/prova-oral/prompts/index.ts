/**
 * @file index.ts
 * @description Exportação centralizada de prompts
 */

// Prompt original (mantido para referência/fallback)
export { PROVA_ORAL_SYSTEM_PROMPT } from './analysis';

// Prompts para fluxo de três fases
export { PROVA_ORAL_TRANSCRIPTION_PROMPT } from './transcription';
export { PROVA_ORAL_JURIDICAL_ANALYSIS_PROMPT } from './juridical-analysis';
export { PROVA_ORAL_PROBATORY_ANALYSIS_PROMPT } from './probatory-analysis';
