/**
 * @file index.ts
 * @description Barrel export para AI Assistant components
 * @version 1.36.90
 */

export {
  AIAssistantBaseLegacy,
  AIAssistantBase,
  AIAssistantModal,
  AIAssistantGlobalModal,
  AIAssistantModelModal,
  extractPlainText,
  isOralProof,
  hasOralProofsForTopic
} from './AIAssistantComponents';

export { QuickPromptWithOptions } from './QuickPromptWithOptions';
export type { QuickPromptWithOptionsProps } from './QuickPromptWithOptions';
