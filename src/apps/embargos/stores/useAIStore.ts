/**
 * @file useAIStore.ts
 * @description Store de IA do subapp Embargos. Delega para a factory compartilhada.
 */

import { createAIStore } from '../../../stores/shared/createAIStore';
import type { AISettings } from '../../../types/ai';

const store = createAIStore({
  persistName: 'embargos-ai-store',
  apiKeyStorageKey: 'embargos-api-keys',
  apiKeyFallbackKeys: ['sentencify-ai-settings']
});

export const useAIStore = store.useStore;

/** Persiste API keys encriptadas no localStorage do Embargos. */
export const persistApiKeys = (apiKeys: AISettings['apiKeys']): void => {
  store.persistKeys(apiKeys);
};

export {
  selectProvider,
  selectCurrentModel,
  selectCurrentApiKey
} from '../../../stores/shared/createAIStore';

export default useAIStore;
