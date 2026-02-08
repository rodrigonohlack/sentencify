import { useState, useCallback } from 'react';
import { useUIStore } from '../stores/useUIStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { apiFetch } from '../utils/api';
import { ENDPOINTS } from '../constants/api';
import { decryptString } from '../utils/crypto';

export function useCategorization() {
  const [isCategorizing, setIsCategorizing] = useState(false);
  const addToast = useUIStore((s) => s.addToast);
  const apiKeys = useSettingsStore((s) => s.apiKeys);
  const settings = useSettingsStore((s) => s.settings);

  const categorizeBatch = useCallback(async (expenseIds: string[], provider?: string) => {
    setIsCategorizing(true);
    try {
      const selectedProvider = provider || settings?.preferred_provider || 'gemini';
      const encryptedKey = apiKeys[selectedProvider] || '';
      const apiKey = encryptedKey ? await decryptString(encryptedKey) : '';

      const headers: Record<string, string> = {};
      if (apiKey) headers['x-api-key'] = apiKey;

      const data = await apiFetch<{
        success: boolean;
        categorized: number;
        total: number;
        results: Array<{ id: string; category_id: string }>;
      }>(ENDPOINTS.CATEGORIZE_BATCH, {
        method: 'POST',
        body: JSON.stringify({ expense_ids: expenseIds, provider: selectedProvider }),
        headers,
      });

      addToast(`${data.categorized} despesas categorizadas com IA!`, 'success');
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao categorizar';
      addToast(message, 'error');
      throw error;
    } finally {
      setIsCategorizing(false);
    }
  }, [apiKeys, settings, addToast]);

  return { categorizeBatch, isCategorizing };
}
