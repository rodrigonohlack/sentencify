/**
 * @file index.ts
 * @description Barrel export para componentes UI
 * @version 1.36.98
 */

export { SpacingDropdown } from './SpacingDropdown';
export type { SpacingDropdownProps } from './SpacingDropdown';

export { FontSizeDropdown } from './FontSizeDropdown';
export type { FontSizeDropdownProps } from './FontSizeDropdown';

export { ProcessingModeSelector } from './ProcessingModeSelector';
export type { ProcessingModeSelectorProps } from './ProcessingModeSelector';

export { SlashCommandMenu } from './SlashCommandMenu';

// v1.36.98: LockedTabOverlay
export { LockedTabOverlay } from './LockedTabOverlay';

// v1.38.12: ContextScopeSelector - Seletor de escopo de contexto para Assistente IA
export { ContextScopeSelector } from './ContextScopeSelector';
export type { ContextScopeSelectorProps } from './ContextScopeSelector';
// ContextScope type vem de src/types/index.ts (fonte única de verdade)
