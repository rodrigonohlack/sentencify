// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE - Seletor de Modelo de IA
// v1.41.0 - Seletor de modelo específico do provedor selecionado
// ═══════════════════════════════════════════════════════════════════════════

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

  const currentModel = getCurrentModel();
  const selectedModelInfo = providerInfo.models.find(m => m.id === currentModel);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium theme-text-primary">
        Modelo
      </label>
      <select
        value={currentModel}
        onChange={handleChange}
        className="w-full px-4 py-3 theme-bg-secondary border theme-border-secondary rounded-xl theme-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
      >
        {providerInfo.models.map((model) => (
          <option key={model.id} value={model.id}>
            {model.name}
            {model.recommended ? ' (Recomendado)' : ''}
          </option>
        ))}
      </select>
      {selectedModelInfo?.description && (
        <p className="text-xs theme-text-muted">
          {selectedModelInfo.description}
        </p>
      )}
    </div>
  );
};

export default ModelSelector;
