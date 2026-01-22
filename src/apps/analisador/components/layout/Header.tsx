/**
 * @file Header.tsx
 * @description Cabeçalho principal da aplicação
 */

import React from 'react';
import { Scale, Settings, Cpu, ArrowLeft } from 'lucide-react';
import { useAIStore } from '../../stores';
import { getProviderName, getModelName } from '../../constants/models';

interface HeaderProps {
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSettings }) => {
  const { provider, claudeModel, geminiModel, openaiModel, grokModel } = useAIStore((s) => s.aiSettings);

  const getCurrentModel = () => {
    switch (provider) {
      case 'claude': return claudeModel;
      case 'gemini': return geminiModel;
      case 'openai': return openaiModel;
      case 'grok': return grokModel;
      default: return claudeModel;
    }
  };

  const handleBackToSentencify = () => {
    window.location.href = '/';
  };

  return (
    <header className="bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo e Título */}
          <div className="flex items-center gap-4">
            {/* Botão voltar */}
            <button
              onClick={handleBackToSentencify}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
              title="Voltar ao Sentencify"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl">
                <Scale className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">
                  Analisador de Prepauta
                </h1>
                <p className="text-sm text-slate-500">
                  Análise de Petições Trabalhistas
                </p>
              </div>
            </div>
          </div>

          {/* Info do Modelo e Configurações */}
          <div className="flex items-center gap-4">
            {/* Badge do modelo atual */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg">
              <Cpu className="w-4 h-4 text-indigo-600" />
              <span className="text-sm font-medium text-slate-700">
                {getProviderName(provider)} - {getModelName(provider, getCurrentModel())}
              </span>
            </div>

            {/* Botão de Configurações */}
            <button
              onClick={onOpenSettings}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
              title="Configurações"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
