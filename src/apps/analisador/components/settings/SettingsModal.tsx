/**
 * @file SettingsModal.tsx
 * @description Modal de configurações de IA
 */

import React from 'react';
import { Modal, Button } from '../ui';
import { AIProviderSelector } from './AIProviderSelector';
import { ModelSelector } from './ModelSelector';
import { APIKeyInput } from './APIKeyInput';
import { useAIStore, useAnalysesStore } from '../../stores';
import type { GeminiThinkingLevel, OpenAIReasoningLevel } from '../../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const provider = useAIStore((s) => s.aiSettings.provider);
  const openaiModel = useAIStore((s) => s.aiSettings.openaiModel);
  const grokModel = useAIStore((s) => s.aiSettings.grokModel);
  const useExtendedThinking = useAIStore((s) => s.aiSettings.useExtendedThinking);
  const thinkingBudget = useAIStore((s) => s.aiSettings.thinkingBudget);
  const geminiThinkingLevel = useAIStore((s) => s.aiSettings.geminiThinkingLevel);
  const openaiReasoningLevel = useAIStore((s) => s.aiSettings.openaiReasoningLevel);
  const tokenMetrics = useAIStore((s) => s.tokenMetrics);
  const resetTokenMetrics = useAIStore((s) => s.resetTokenMetrics);
  const concurrencyLimit = useAnalysesStore((s) => s.settings.concurrencyLimit);
  const setConcurrencyLimit = useAnalysesStore((s) => s.setConcurrencyLimit);
  const setUseExtendedThinking = useAIStore((s) => s.setUseExtendedThinking);
  const setThinkingBudget = useAIStore((s) => s.setThinkingBudget);
  const setGeminiThinkingLevel = useAIStore((s) => s.setGeminiThinkingLevel);
  const setOpenAIReasoningLevel = useAIStore((s) => s.setOpenAIReasoningLevel);

  const getProviderKeyConfig = () => {
    switch (provider) {
      case 'claude':
        return { label: 'API Key Anthropic', placeholder: 'sk-ant-...' };
      case 'gemini':
        return { label: 'API Key Google', placeholder: 'AIza...' };
      case 'openai':
        return { label: 'API Key OpenAI', placeholder: 'sk-...' };
      case 'grok':
        return { label: 'API Key xAI', placeholder: 'xai-...' };
      default:
        return { label: 'API Key', placeholder: '' };
    }
  };

  const keyConfig = getProviderKeyConfig();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Configurações de IA"
      size="lg"
      footer={
        <Button onClick={onClose}>
          Fechar
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Seletor de Provedor */}
        <AIProviderSelector />

        {/* Seletor de Modelo */}
        <ModelSelector />

        {/* Configurações de Thinking/Reasoning */}
        <div className="pt-4 border-t border-slate-200">
          <h3 className="text-sm font-medium text-slate-700 mb-4">
            Configurações de Raciocínio
          </h3>

          {/* Claude: Extended Thinking */}
          {provider === 'claude' && (
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useExtendedThinking}
                  onChange={(e) => setUseExtendedThinking(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                />
                <span className="text-sm text-slate-700">Extended Thinking</span>
              </label>
              {useExtendedThinking && (
                <div>
                  <label className="block text-xs text-slate-500 mb-1">
                    Budget de Thinking (tokens)
                  </label>
                  <input
                    type="number"
                    value={thinkingBudget}
                    onChange={(e) => setThinkingBudget(e.target.value)}
                    min="1000"
                    max="100000"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}
            </div>
          )}

          {/* Gemini: Thinking Level */}
          {provider === 'gemini' && (
            <div>
              <label className="block text-xs text-slate-500 mb-1">
                Nível de Thinking
              </label>
              <select
                value={geminiThinkingLevel}
                onChange={(e) => setGeminiThinkingLevel(e.target.value as GeminiThinkingLevel)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="minimal">Minimal</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High (Recomendado)</option>
              </select>
            </div>
          )}

          {/* OpenAI: Reasoning Level (só para gpt-5.2) */}
          {provider === 'openai' && openaiModel === 'gpt-5.2' && (
            <div>
              <label className="block text-xs text-slate-500 mb-1">
                Nível de Reasoning
              </label>
              <select
                value={openaiReasoningLevel}
                onChange={(e) => setOpenAIReasoningLevel(e.target.value as OpenAIReasoningLevel)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium (Recomendado)</option>
                <option value="high">High</option>
              </select>
            </div>
          )}

          {/* OpenAI: Instant mode info */}
          {provider === 'openai' && openaiModel === 'gpt-5.2-chat-latest' && (
            <p className="text-xs text-slate-500">
              Modo Instant: respostas rápidas sem thinking explícito.
            </p>
          )}

          {/* Grok: Model info */}
          {provider === 'grok' && (
            <p className="text-xs text-slate-500">
              {grokModel === 'grok-4-1-fast-reasoning'
                ? 'Modo Reasoning: raciocínio avançado ativado.'
                : 'Modo Instant: respostas rápidas sem thinking.'}
            </p>
          )}
        </div>

        {/* API Key do provedor selecionado */}
        <APIKeyInput
          provider={provider}
          label={keyConfig.label}
          placeholder={keyConfig.placeholder}
        />

        {/* Outras API Keys */}
        <div className="pt-4 border-t border-slate-200">
          <h3 className="text-sm font-medium text-slate-700 mb-4">
            Outras API Keys (para trocar de provedor)
          </h3>
          <div className="space-y-4">
            {provider !== 'claude' && (
              <APIKeyInput
                provider="claude"
                label="API Key Anthropic"
                placeholder="sk-ant-..."
              />
            )}
            {provider !== 'gemini' && (
              <APIKeyInput
                provider="gemini"
                label="API Key Google"
                placeholder="AIza..."
              />
            )}
            {provider !== 'openai' && (
              <APIKeyInput
                provider="openai"
                label="API Key OpenAI"
                placeholder="sk-..."
              />
            )}
            {provider !== 'grok' && (
              <APIKeyInput
                provider="grok"
                label="API Key xAI"
                placeholder="xai-..."
              />
            )}
          </div>
        </div>

        {/* Processamento em Lote */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-4">
            Processamento em Lote
          </h3>
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
              Processos simultâneos (1–10)
            </label>
            <input
              type="number"
              value={concurrencyLimit}
              onChange={(e) => setConcurrencyLimit(parseInt(e.target.value, 10) || 1)}
              min="1"
              max="10"
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Número de processos analisados em paralelo. Valores maiores são mais rápidos, mas consomem mais recursos.
            </p>
          </div>
        </div>

        {/* Métricas de Tokens */}
        {tokenMetrics.requestCount > 0 && (
          <div className="pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-slate-700">
                Uso de Tokens (sessão)
              </h3>
              <button
                onClick={resetTokenMetrics}
                className="text-xs text-indigo-600 hover:text-indigo-700"
              >
                Resetar
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-slate-500">Input</p>
                <p className="font-semibold text-slate-800">
                  {tokenMetrics.totalInput.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-slate-500">Output</p>
                <p className="font-semibold text-slate-800">
                  {tokenMetrics.totalOutput.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-slate-500">Requisições</p>
                <p className="font-semibold text-slate-800">
                  {tokenMetrics.requestCount}
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-slate-500">Cache Lido</p>
                <p className="font-semibold text-slate-800">
                  {tokenMetrics.totalCacheRead.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default SettingsModal;
