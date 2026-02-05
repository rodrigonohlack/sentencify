// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTES - Barrel Export
// v1.41.0 - Exportação centralizada de componentes do app de notícias
// ═══════════════════════════════════════════════════════════════════════════

// Auth
export { LoginGate, useLoginGate } from './auth/LoginGate';

// Feed
export { NewsCard } from './feed/NewsCard';
export { NewsFeed } from './feed/NewsFeed';
export { NewsFilters } from './feed/NewsFilters';

// Detail
export { NewsDetail } from './detail/NewsDetail';

// Sources
export { ManualInput } from './sources/ManualInput';

// Settings
export { SettingsModal } from './settings/SettingsModal';
export { AIProviderSelector } from './settings/AIProviderSelector';
export { ModelSelector } from './settings/ModelSelector';
export { APIKeyInput } from './settings/APIKeyInput';
