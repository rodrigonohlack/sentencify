import { create } from 'zustand';
import type { Settings } from '../types';

function loadApiKeysFromStorage(): Record<string, string> {
  try {
    const stored = localStorage.getItem('ger-despesas-api-keys');
    return stored ? JSON.parse(stored) : { gemini: '', grok: '' };
  } catch {
    return { gemini: '', grok: '' };
  }
}

interface SettingsState {
  settings: Settings | null;
  apiKeys: Record<string, string>;
  isLoading: boolean;
  setSettings: (settings: Settings) => void;
  setApiKeys: (keys: Record<string, string>) => void;
  setLoading: (loading: boolean) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: null,
  apiKeys: loadApiKeysFromStorage(),
  isLoading: false,

  setSettings: (settings) => set({ settings }),
  setApiKeys: (apiKeys) => set({ apiKeys }),
  setLoading: (isLoading) => set({ isLoading }),
}));
