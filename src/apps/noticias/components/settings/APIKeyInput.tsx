// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE - Input de API Key
// v1.41.0 - Input para API Key com toggle de visibilidade
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { Eye, EyeOff, Key, CheckCircle } from 'lucide-react';
import { useAIStore, persistApiKeys } from '../../stores';
import type { AIProvider } from '../../types';

interface APIKeyInputProps {
  provider: AIProvider;
  label: string;
  placeholder?: string;
}

export const APIKeyInput: React.FC<APIKeyInputProps> = ({
  provider,
  label,
  placeholder = 'sk-...'
}) => {
  const [showKey, setShowKey] = useState(false);
  const apiKeys = useAIStore((s) => s.aiSettings.apiKeys);
  const setApiKey = useAIStore((s) => s.setApiKey);

  const currentKey = apiKeys[provider] || '';
  const hasKey = currentKey.length > 0;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newKey = e.target.value;
    setApiKey(provider, newKey);
    persistApiKeys({ ...apiKeys, [provider]: newKey });
  };

  return (
    <div className="space-y-2">
      <label className="flex items-center justify-between">
        <span className="text-sm font-medium theme-text-primary">{label}</span>
        {hasKey && (
          <span className="flex items-center gap-1 text-xs text-green-400">
            <CheckCircle className="w-3 h-3" />
            Configurada
          </span>
        )}
      </label>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 theme-text-muted">
          <Key className="w-4 h-4" />
        </div>
        <input
          type={showKey ? 'text' : 'password'}
          value={currentKey}
          onChange={handleChange}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-3 theme-bg-secondary border theme-border-secondary rounded-xl theme-text-primary placeholder:theme-text-muted focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        />
        <button
          type="button"
          onClick={() => setShowKey(!showKey)}
          className="absolute right-3 top-1/2 -translate-y-1/2 theme-text-muted hover:theme-text-primary transition-colors"
        >
          {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};

export default APIKeyInput;
