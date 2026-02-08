import { create } from 'zustand';
import type { Settings } from '../types';

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
  apiKeys: { gemini: '', grok: '' },
  isLoading: false,

  setSettings: (settings) => set({ settings }),
  setApiKeys: (apiKeys) => set({ apiKeys }),
  setLoading: (isLoading) => set({ isLoading }),
}));
