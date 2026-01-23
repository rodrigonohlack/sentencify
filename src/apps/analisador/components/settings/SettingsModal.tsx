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
import type { GeminiThinkingLevel, OpenAIReasoningLevel, TokenMetrics } from '../../types';

// ═══════════════════════════════════════════════════════════════════════════════
// Preços por modelo (USD / 1M tokens)
// ═══════════════════════════════════════════════════════════════════════════════
const MODEL_PRICES = {
  sonnet: { input: 3.00, output: 15.00, cacheWrite: 3.75, cacheRead: 0.30 },
  opus: { input: 5.00, output: 25.00, cacheWrite: 6.25, cacheRead: 0.50 },
  geminiPro: { input: 2.00, output: 12.00, cacheWrite: 2.50, cacheRead: 0.20 },
  geminiFlash: { input: 0.50, output: 3.00, cacheWrite: 0.625, cacheRead: 0.05 },
  openai: { input: 1.75, output: 14.00, cacheWrite: 1.75, cacheRead: 0.175 },
  grok: { input: 0.20, output: 0.50, cacheWrite: 0.20, cacheRead: 0.05 },
} as const;

const calculateCost = (m: TokenMetrics, prices: { input: number; output: number; cacheWrite: number; cacheRead: number }): number => {
  return ((m.totalInput / 1_000_000) * prices.input) +
         ((m.totalOutput / 1_000_000) * prices.output) +
         ((m.totalCacheRead / 1_000_000) * prices.cacheRead) +
         ((m.totalCacheCreation / 1_000_000) * prices.cacheWrite);
};

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
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Uso de Tokens (sessão)
              </h3>
              <button
                onClick={resetTokenMetrics}
                className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                Resetar
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <p className="text-slate-500 dark:text-slate-400">Input</p>
                <p className="font-semibold text-slate-800 dark:text-slate-100">
                  {tokenMetrics.totalInput.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <p className="text-slate-500 dark:text-slate-400">Output</p>
                <p className="font-semibold text-slate-800 dark:text-slate-100">
                  {tokenMetrics.totalOutput.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <p className="text-slate-500 dark:text-slate-400">Requisições</p>
                <p className="font-semibold text-slate-800 dark:text-slate-100">
                  {tokenMetrics.requestCount}
                </p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <p className="text-slate-500 dark:text-slate-400">Cache Lido</p>
                <p className="font-semibold text-slate-800 dark:text-slate-100">
                  {tokenMetrics.totalCacheRead.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <p className="text-slate-500 dark:text-slate-400">Cache Write</p>
                <p className="font-semibold text-slate-800 dark:text-slate-100">
                  {tokenMetrics.totalCacheCreation.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Custo Estimado */}
            <div className="mt-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-2">
                💰 Custo Estimado
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-blue-600 dark:text-blue-400">Sonnet 4/4.5</span>
                  <span className="font-mono text-slate-700 dark:text-slate-200">
                    ${calculateCost(tokenMetrics, MODEL_PRICES.sonnet).toFixed(4)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-600 dark:text-purple-400">Opus 4.5</span>
                  <span className="font-mono text-slate-700 dark:text-slate-200">
                    ${calculateCost(tokenMetrics, MODEL_PRICES.opus).toFixed(4)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-600 dark:text-emerald-400">Gemini 3 Pro</span>
                  <span className="font-mono text-slate-700 dark:text-slate-200">
                    ${calculateCost(tokenMetrics, MODEL_PRICES.geminiPro).toFixed(4)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cyan-600 dark:text-cyan-400">Gemini 3 Flash</span>
                  <span className="font-mono text-slate-700 dark:text-slate-200">
                    ${calculateCost(tokenMetrics, MODEL_PRICES.geminiFlash).toFixed(4)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-600 dark:text-green-400">OpenAI GPT-5.2</span>
                  <span className="font-mono text-slate-700 dark:text-slate-200">
                    ${calculateCost(tokenMetrics, MODEL_PRICES.openai).toFixed(4)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Grok 4.1 Fast</span>
                  <span className="font-mono text-slate-700 dark:text-slate-200">
                    ${calculateCost(tokenMetrics, MODEL_PRICES.grok).toFixed(4)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default SettingsModal;
