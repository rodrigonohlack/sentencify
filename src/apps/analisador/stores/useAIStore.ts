/**
 * @file useAIStore.ts
 * @description Store de IA do Analisador. Delega para a factory compartilhada
 *              em src/stores/shared/createAIStore.
 */

import { createAIStore } from '../../../stores/shared/createAIStore';
import type { AISettings } from '../../../types/ai';

const store = createAIStore({
  persistName: 'analisador-prepauta-ai-store',
  apiKeyStorageKey: 'analisador-prepauta-api-keys',
  apiKeyFallbackKeys: ['sentencify-ai-settings']
});

export const useAIStore = store.useStore;

/** Persiste API keys encriptadas no localStorage do Analisador. */
export const persistApiKeys = (apiKeys: AISettings['apiKeys']): void => {
  store.persistKeys(apiKeys);
};

export {
  selectProvider,
  selectCurrentModel,
  selectCurrentApiKey
} from '../../../stores/shared/createAIStore';

export default useAIStore;
