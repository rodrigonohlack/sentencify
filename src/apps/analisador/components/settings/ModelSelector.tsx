/**
 * @file ModelSelector.tsx
 * @description Seletor de modelo de IA
 */

import React from 'react';
import { useAIStore } from '../../stores';
import { AI_PROVIDERS } from '../../constants/models';

export const ModelSelector: React.FC = () => {
  const provider = useAIStore((s) => s.aiSettings.provider);
  const aiSettings = useAIStore((s) => s.aiSettings);
  const setModel = useAIStore((s) => s.setModel);

  const providerInfo = AI_PROVIDERS[provider];

  const getCurrentModel = () => {
    switch (provider) {
      case 'claude': return aiSettings.claudeModel;
      case 'gemini': return aiSettings.geminiModel;
      case 'openai': return aiSettings.openaiModel;
      case 'grok': return aiSettings.grokModel;
      default: return aiSettings.claudeModel;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setModel(provider, e.target.value);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700">
        Modelo
      </label>
      <select
        value={getCurrentModel()}
        onChange={handleChange}
        className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
      >
        {providerInfo.models.map((model) => (
          <option key={model.id} value={model.id}>
            {model.name}
            {model.recommended ? ' (Recomendado)' : ''}
          </option>
        ))}
      </select>
      {providerInfo.models.find(m => m.id === getCurrentModel())?.description && (
        <p className="text-sm text-slate-500">
          {providerInfo.models.find(m => m.id === getCurrentModel())?.description}
        </p>
      )}
    </div>
  );
};

export default ModelSelector;
