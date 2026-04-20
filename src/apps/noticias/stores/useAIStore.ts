// ═══════════════════════════════════════════════════════════════════════════
// STORE - Configurações de IA (App de Notícias)
// Delega para a factory compartilhada. Usa o localStorage do Analisador
// como destino das apiKeys (compartilhamento intencional).
// ═══════════════════════════════════════════════════════════════════════════

import { createAIStore } from '../../../stores/shared/createAIStore';
import type { AISettings } from '../../../types/ai';

const store = createAIStore({
  persistName: 'noticias-juridicas-ai-store',
  apiKeyStorageKey: 'analisador-prepauta-api-keys',
  apiKeyFallbackKeys: ['sentencify-ai-settings']
});

export const useAIStore = store.useStore;

/** Persiste API keys encriptadas no localStorage compartilhado com o Analisador. */
export const persistApiKeys = (apiKeys: AISettings['apiKeys']): void => {
  store.persistKeys(apiKeys);
};

export {
  selectProvider,
  selectCurrentModel,
  selectCurrentApiKey
} from '../../../stores/shared/createAIStore';

export default useAIStore;
