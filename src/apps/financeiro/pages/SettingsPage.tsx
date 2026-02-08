import { useEffect, useCallback } from 'react';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useUIStore } from '../stores/useUIStore';
import { apiFetch } from '../utils/api';
import { ENDPOINTS } from '../constants/api';
import { encryptString } from '../utils/crypto';
import { Spinner } from '../components/ui';
import Header from '../components/layout/Header';
import ProviderSelector from '../components/settings/ProviderSelector';
import APIKeyInput from '../components/settings/APIKeyInput';
import type { Settings } from '../types';

const API_KEY_STORAGE = 'ger-despesas-api-keys';

export default function SettingsPage() {
  const { settings, apiKeys, isLoading, setSettings, setApiKeys, setLoading } = useSettingsStore();
  const addToast = useUIStore((s) => s.addToast);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ settings: Settings }>(ENDPOINTS.SETTINGS);
      setSettings(data.settings);
    } catch {
      addToast('Erro ao carregar configurações', 'error');
    } finally {
      setLoading(false);
    }
  }, [setSettings, setLoading, addToast]);

  const loadApiKeys = useCallback(async () => {
    try {
      const stored = localStorage.getItem(API_KEY_STORAGE);
      if (stored) {
        const keys = JSON.parse(stored);
        setApiKeys(keys);
      }
    } catch {
      // Keys not available
    }
  }, [setApiKeys]);

  useEffect(() => {
    fetchSettings();
    loadApiKeys();
  }, []);

  const handleProviderChange = async (provider: 'gemini' | 'grok') => {
    try {
      const data = await apiFetch<{ settings: Settings }>(ENDPOINTS.SETTINGS, {
        method: 'PUT',
        body: JSON.stringify({ preferred_provider: provider }),
      });
      setSettings(data.settings);
      addToast('Provedor atualizado', 'success');
    } catch {
      addToast('Erro ao atualizar provedor', 'error');
    }
  };

  const handleSaveApiKey = async (provider: string, rawKey: string) => {
    try {
      const encrypted = await encryptString(rawKey);
      const updated = { ...apiKeys, [provider]: encrypted };
      localStorage.setItem(API_KEY_STORAGE, JSON.stringify(updated));
      setApiKeys(updated);
      addToast(`API key ${provider} salva com segurança`, 'success');
    } catch {
      addToast('Erro ao salvar API key', 'error');
    }
  };

  if (isLoading && !settings) {
    return (
      <div>
        <Header title="Configurações" />
        <Spinner size="lg" className="mt-20" />
      </div>
    );
  }

  return (
    <div>
      <Header title="Configurações" subtitle="Preferências e chaves de API" />

      <div className="flex flex-col gap-6 max-w-2xl">
        {/* Provider selection */}
        <div className="glass-card">
          <ProviderSelector
            value={settings?.preferred_provider || 'gemini'}
            onChange={handleProviderChange}
          />
        </div>

        {/* API Keys */}
        <div className="glass-card flex flex-col gap-6">
          <h3 className="text-base font-bold text-[#1e1b4b] tracking-tight">Chaves de API</h3>
          <p className="text-xs text-[#7c7caa] -mt-4">
            As chaves são criptografadas (AES-256-GCM) e armazenadas localmente no seu navegador.
          </p>
          <APIKeyInput
            provider="gemini"
            label="Google Gemini"
            value={apiKeys.gemini || ''}
            onSave={(key) => handleSaveApiKey('gemini', key)}
          />
          <div className="border-t border-indigo-500/10" />
          <APIKeyInput
            provider="grok"
            label="xAI Grok"
            value={apiKeys.grok || ''}
            onSave={(key) => handleSaveApiKey('grok', key)}
          />
        </div>

        {/* Reminder days */}
        <div className="glass-card">
          <h3 className="text-base font-bold text-[#1e1b4b] tracking-tight mb-4">Lembretes</h3>
          <div className="flex items-center gap-3">
            <label className="text-sm text-[#7c7caa] font-medium">Alertar com antecedência de</label>
            <select
              value={settings?.reminder_days || 3}
              onChange={async (e) => {
                try {
                  const data = await apiFetch<{ settings: Settings }>(ENDPOINTS.SETTINGS, {
                    method: 'PUT',
                    body: JSON.stringify({ reminder_days: parseInt(e.target.value) }),
                  });
                  setSettings(data.settings);
                  addToast('Lembrete atualizado', 'success');
                } catch {
                  addToast('Erro ao atualizar', 'error');
                }
              }}
              className="bg-white/55 backdrop-blur-lg border border-white/70 rounded-xl px-3 py-2 text-sm font-semibold text-[#1e1b4b] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="1">1 dia</option>
              <option value="3">3 dias</option>
              <option value="5">5 dias</option>
              <option value="7">7 dias</option>
            </select>
            <span className="text-sm text-[#7c7caa] font-medium">antes do vencimento</span>
          </div>
        </div>
      </div>
    </div>
  );
}
