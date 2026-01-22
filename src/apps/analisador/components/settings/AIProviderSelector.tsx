/**
 * @file AIProviderSelector.tsx
 * @description Seletor de provedor de IA
 */

import React from 'react';
import { Brain, Sparkles, MessageCircle, Zap, Check } from 'lucide-react';
import { useAIStore } from '../../stores';
import { AI_PROVIDERS } from '../../constants/models';
import type { AIProvider } from '../../types';

const providerIcons: Record<AIProvider, React.ReactNode> = {
  claude: <Brain className="w-5 h-5" />,
  gemini: <Sparkles className="w-5 h-5" />,
  openai: <MessageCircle className="w-5 h-5" />,
  grok: <Zap className="w-5 h-5" />
};

export const AIProviderSelector: React.FC = () => {
  const provider = useAIStore((s) => s.aiSettings.provider);
  const apiKeys = useAIStore((s) => s.aiSettings.apiKeys);
  const setProvider = useAIStore((s) => s.setProvider);

  const handleSelect = (newProvider: AIProvider) => {
    setProvider(newProvider);
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-slate-700">
        Provedor de IA
      </label>
      <div className="grid grid-cols-2 gap-3">
        {(Object.keys(AI_PROVIDERS) as AIProvider[]).map((key) => {
          const info = AI_PROVIDERS[key];
          const isSelected = provider === key;
          const hasApiKey = !!apiKeys[key];

          return (
            <button
              key={key}
              onClick={() => handleSelect(key)}
              className={`
                relative p-4 rounded-xl border-2 text-left transition-all
                ${isSelected
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
                }
              `}
            >
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <Check className="w-4 h-4 text-indigo-600" />
                </div>
              )}

              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isSelected ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-600'}`}>
                  {providerIcons[key]}
                </div>
                <div>
                  <p className={`font-medium ${isSelected ? 'text-indigo-700' : 'text-slate-700'}`}>
                    {info.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {hasApiKey ? 'API Key configurada' : 'API Key não configurada'}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AIProviderSelector;
