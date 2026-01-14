/**
 * @file index.ts
 * @description Barrel export para todos os componentes
 * @version 1.36.94
 */

// UI Components
export * from './ui';

// Card Components
export * from './cards';

// Panel Components
export * from './panels';

// Version Components
export * from './version';

// Chat Components
export * from './chat';

// Modal Components
export * from './modals';

// AI Assistant Components
export * from './ai';

// Form Components
export * from './forms';

// Editor Components
export * from './editors';

// Tab Components (v1.37.31)
export * from './tabs';

// ErrorBoundary (v1.37.1)
export { ErrorBoundary } from './ErrorBoundary';

// SyncStatusIndicator (v1.37.31)
export { default as SyncStatusIndicator, SyncStatusIcon } from './SyncStatusIndicator';
