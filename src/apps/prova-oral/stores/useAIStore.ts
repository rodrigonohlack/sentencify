/**
 * @file useAIStore.ts
 * @description Store de IA do app Prova Oral. Delega para a factory
 *              compartilhada. Cadeia de fallback 2-níveis: lê do próprio
 *              storage e depois do Analisador e do Sentencify.
 */

import { createAIStore } from '../../../stores/shared/createAIStore';
import type { AISettings } from '../../../types/ai';

const store = createAIStore({
  persistName: 'prova-oral-ai-store',
  apiKeyStorageKey: 'prova-oral-api-keys',
  apiKeyFallbackKeys: ['analisador-prepauta-api-keys', 'sentencify-ai-settings']
});

export const useAIStore = store.useStore;

/** Persiste API keys encriptadas no localStorage próprio do Prova Oral. */
export const persistApiKeys = (apiKeys: AISettings['apiKeys']): void => {
  store.persistKeys(apiKeys);
};

export {
  selectProvider,
  selectCurrentModel,
  selectCurrentApiKey
} from '../../../stores/shared/createAIStore';

export default useAIStore;
