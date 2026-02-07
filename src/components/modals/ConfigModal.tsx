/**
 * @file ConfigModal.tsx
 * @description Modal de configurações de IA - Refatorado para usar hooks/stores diretamente
 * @version 1.40.06
 *
 * v1.40.06: Refatoração MAJOR - eliminou 52 props via import direto de hooks/stores
 *
 * 18 seções:
 * 1. Provedor de IA (Claude/Gemini/OpenAI/Grok)
 * 2. Chaves API (4 providers + teste)
 * 3. Pensamento Prolongado (Extended Thinking)
 * 4. Double Check de Respostas
 * 5. Mini-Relatórios Detalhados
 * 6. Tópicos por Requisição
 * 7. Requisições Paralelas
 * 8. Modo PDF
 * 9. Anonimização
 * 10. Base de Dados
 * 11. Busca Semântica (E5-base)
 * 12-15. Modelos customizados (Relatório, Dispositivo, Tópico, Estilo)
 * 16. Prompts Rápidos
 * 17. Uso de Tokens
 * 18. Tópicos Complementares
 */

import React from 'react';
import {
  X, Zap, Download, Upload, Check, RefreshCw, Trash2, Plus,
  AlertCircle, FileText, Scale, BookOpen, Sparkles, Wand2
} from 'lucide-react';
import { ProviderIcon } from '../ui/ProviderIcon';
import { CSS } from '../../constants/styles';
import AIModelService from '../../services/AIModelService';
import { useAIStore } from '../../stores/useAIStore';
import { useUIStore } from '../../stores/useUIStore';
import { useModelsStore } from '../../stores/useModelsStore';
import { EmbeddingsCDNService } from '../../services/EmbeddingsServices';
import { API_BASE } from '../../constants/api';
import {
  useNERManagement,
  useSemanticSearchManagement,
  useEmbeddingsManagement,
  useLegislacao,
  useJurisprudencia,
  useDragDropTopics,
  useExportImport,
  useIndexedDB,
  VOICE_MODEL_CONFIG
} from '../../hooks';
import type {
  AIProvider,
  GeminiThinkingLevel,
  QuickPrompt,
  TopicoComplementar,
  TopicCategory,
  VoiceImprovementModel
} from '../../types';

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS - Props simplificadas (v1.40.06)
// ═══════════════════════════════════════════════════════════════════════════════

export interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER - getModelDisplayName (extraído de useAIIntegration)
// ═══════════════════════════════════════════════════════════════════════════════

const getModelDisplayName = (modelId: string): string => {
  const models: Record<string, string> = {
    // Claude
    'claude-sonnet-4-20250514': 'Claude Sonnet 4.5',
    'claude-opus-4-5-20251101': 'Claude Opus 4.5',
    // Gemini 3
    'gemini-3-flash-preview': 'Gemini 3 Flash',
    'gemini-3-pro-preview': 'Gemini 3 Pro',
    // OpenAI GPT-5.2
    'gpt-5.2': 'GPT-5.2 Thinking',
    'gpt-5.2-chat-latest': 'GPT-5.2 Instant',
    // xAI Grok 4.1
    'grok-4-1-fast-reasoning': 'Grok 4.1 Fast',
    'grok-4-1-fast-non-reasoning': 'Grok 4.1 Instant'
  };
  return models[modelId] || modelId;
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE
// ═══════════════════════════════════════════════════════════════════════════════

export const ConfigModal: React.FC<ConfigModalProps> = ({ isOpen, onClose }) => {
  // ─────────────────────────────────────────────────────────────────────────────
  // STORES (Zustand)
  // ─────────────────────────────────────────────────────────────────────────────
  const aiSettings = useAIStore((s) => s.aiSettings);
  const setAiSettings = useAIStore((s) => s.setAiSettings);
  const tokenMetrics = useAIStore((s) => s.tokenMetrics);
  const apiTestStatuses = useAIStore((s) => s.apiTestStatuses);
  const setApiTestStatus = useAIStore((s) => s.setApiTestStatus);

  const showToast = useUIStore((s) => s.showToast);
  const openModelGenerator = useUIStore((s) => s.openModelGenerator);
  const setShowDataDownloadModal = useUIStore((s) => s.setShowDataDownloadModal);
  const setShowEmbeddingsDownloadModal = useUIStore((s) => s.setShowEmbeddingsDownloadModal);

  const modelsCount = useModelsStore((s) => s.models.length);

  // ─────────────────────────────────────────────────────────────────────────────
  // HOOKS
  // ─────────────────────────────────────────────────────────────────────────────
  const legislacao = useLegislacao();
  const jurisprudencia = useJurisprudencia();
  const legislacaoCount = legislacao.artigos?.length || 0;
  const jurisprudenciaCount = jurisprudencia.precedentes?.length || 0;

  // NER Management
  const nerManagement = useNERManagement();
  const {
    nerEnabled,
    setNerEnabled,
    nerIncludeOrg,
    setNerIncludeOrg,
    nerModelReady,
    setNerModelReady,
    nerInitializing,
    setNerInitializing,
    nerDownloadProgress,
    setNerDownloadProgress
  } = nerManagement;

  // Semantic Search Management
  const searchManagement = useSemanticSearchManagement();
  const {
    searchEnabled,
    setSearchEnabled,
    searchModelReady,
    setSearchModelReady,
    searchInitializing,
    setSearchInitializing,
    searchDownloadProgress,
    setSearchDownloadProgress
  } = searchManagement;

  // IndexedDB (para saveModels)
  const indexedDB = useIndexedDB();

  // Models store para embeddings
  const models = useModelsStore((s) => s.models);
  const setModels = useModelsStore((s) => s.setModels);

  // Embeddings Management
  const embeddingsManagement = useEmbeddingsManagement({
    showToast,
    modelLibrary: { models, setModels },
    legislacao: { reloadArtigos: legislacao.reloadArtigos },
    jurisprudencia: { reloadPrecedentes: jurisprudencia.reloadPrecedentes },
    indexedDB: { saveModels: indexedDB.saveModels },
    searchModelReady
  });

  const {
    embeddingsCount,
    jurisEmbeddingsCount,
    clearEmbeddings,
    clearJurisEmbeddings,
    clearModelEmbeddings,
    generateModelEmbeddings,
    generatingModelEmbeddings,
    modelEmbeddingsProgress,
    setDataDownloadStatus
  } = embeddingsManagement;

  // Calcular modelEmbeddingsCount
  const modelEmbeddingsCount = React.useMemo(() =>
    models.filter(m => m.embedding && m.embedding.length === 768).length,
    [models]
  );

  // Drag & Drop para tópicos complementares
  const dragDrop = useDragDropTopics({
    selectedTopics: [], // Não usado para complementares
    setSelectedTopics: () => {}, // Não usado para complementares
    aiIntegration: { aiSettings, setAiSettings }
  });

  const {
    draggedComplementaryIndex,
    dragOverComplementaryIndex,
    handleComplementaryDragStart,
    handleComplementaryDragEnd,
    handleComplementaryDragOver,
    handleComplementaryDragLeave,
    handleComplementaryDrop
  } = dragDrop;

  // Export/Import
  const exportImport = useExportImport({
    modelLibrary: {
      models,
      selectedCategory: 'all',
      setModels,
      setHasUnsavedChanges: () => {}
    },
    aiIntegration: { aiSettings, setAiSettings },
    cloudSync: null,
    searchModelReady,
    showToast,
    setError: (err) => showToast(err, 'error'),
    generateModelId: () => `model_${Date.now()}_${Math.random().toString(36).slice(2)}`
  });

  const { exportAiSettings, importAiSettings } = exportImport;

  // ─────────────────────────────────────────────────────────────────────────────
  // HANDLERS LOCAIS (antes eram passados como props)
  // ─────────────────────────────────────────────────────────────────────────────

  // initNerModel - inicializar modelo NER
  const initNerModel = React.useCallback(async () => {
    if (nerInitializing || nerModelReady) return;
    setNerInitializing(true);
    setNerDownloadProgress(0);

    const unsubscribe = AIModelService.subscribe((_status, progress) => {
      if (progress.ner > 0) {
        setNerDownloadProgress(Math.round(progress.ner));
      }
    });

    try {
      await AIModelService.init('ner');
      setNerModelReady(true);
    } catch (err) {
      console.error('[NER] Erro ao inicializar:', err);
      showToast('Erro ao carregar modelo NER: ' + (err as Error).message, 'error');
    } finally {
      setNerInitializing(false);
      unsubscribe();
    }
  }, [nerInitializing, nerModelReady, setNerInitializing, setNerDownloadProgress, setNerModelReady, showToast]);

  // initSearchModel - inicializar modelo de busca semântica
  const initSearchModel = React.useCallback(async () => {
    if (searchInitializing || searchModelReady) return;
    setSearchInitializing(true);
    setSearchDownloadProgress(0);

    const unsubscribe = AIModelService.subscribe((_status, progress) => {
      if (progress.search > 0) {
        setSearchDownloadProgress(Math.round(progress.search));
      }
    });

    try {
      await AIModelService.init('search');
      setSearchModelReady(true);
    } catch (err) {
      console.error('[Search] Erro ao inicializar:', err);
      showToast('Erro ao carregar modelo de busca: ' + (err as Error).message, 'error');
    } finally {
      setSearchInitializing(false);
      unsubscribe();
    }
  }, [searchInitializing, searchModelReady, setSearchInitializing, setSearchDownloadProgress, setSearchModelReady, showToast]);

  // handleSearchToggle - toggle master de busca semântica
  const handleSearchToggle = React.useCallback(async (newEnabled: boolean) => {
    setSearchEnabled(newEnabled);
    localStorage.setItem('searchEnabled', JSON.stringify(newEnabled));

    if (!newEnabled) {
      // Desligando: descarregar modelo E5 da memória
      if (AIModelService.isReady('search')) {
        console.log('[E5] Descarregando modelo...');
        AIModelService.unload('search').then(() => {
          setSearchModelReady(false);
        });
      }
    } else {
      // Ligando: inicializar modelo E5 se necessário
      if (!searchModelReady && !searchInitializing) {
        await initSearchModel();
      }
    }
  }, [setSearchEnabled, searchModelReady, searchInitializing, setSearchModelReady, initSearchModel]);

  // handleLegislacaoToggle
  const handleLegislacaoToggle = React.useCallback((newEnabled: boolean) => {
    setAiSettings(prev => ({ ...prev, semanticSearchEnabled: newEnabled }));
    if (newEnabled) localStorage.setItem('legislacaoSemanticMode', 'true');
  }, [setAiSettings]);

  // handleJurisToggle
  const handleJurisToggle = React.useCallback((newEnabled: boolean) => {
    setAiSettings(prev => ({ ...prev, jurisSemanticEnabled: newEnabled }));
    if (newEnabled) localStorage.setItem('jurisSemanticMode', 'true');
  }, [setAiSettings]);

  // handleModelToggle
  const handleModelToggle = React.useCallback((newEnabled: boolean) => {
    setAiSettings(prev => ({ ...prev, modelSemanticEnabled: newEnabled }));
    if (newEnabled) localStorage.setItem('modelSemanticMode', 'true');
  }, [setAiSettings]);

  // v1.38.46: Auto-reset modelo de voice improvement quando key do provider é removida
  React.useEffect(() => {
    if (!aiSettings.voiceImprovement?.enabled) return;

    const selectedModel = aiSettings.voiceImprovement?.model || 'haiku';
    const selectedConfig = VOICE_MODEL_CONFIG[selectedModel];
    if (!selectedConfig) return;

    const selectedKey = aiSettings.apiKeys?.[selectedConfig.provider];
    const isSelectedAvailable = selectedKey && selectedKey.trim().length > 0;

    if (!isSelectedAvailable) {
      // Encontrar primeiro modelo disponível
      const firstAvailable = (Object.entries(VOICE_MODEL_CONFIG) as [VoiceImprovementModel, typeof VOICE_MODEL_CONFIG['haiku']][])
        .find(([, config]) => {
          const apiKey = aiSettings.apiKeys?.[config.provider];
          return apiKey && apiKey.trim().length > 0;
        });

      if (firstAvailable) {
        setAiSettings({
          ...aiSettings,
          voiceImprovement: { ...aiSettings.voiceImprovement, enabled: true, model: firstAvailable[0] }
        });
      }
    }
  }, [aiSettings, setAiSettings]);

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  if (!isOpen) return null;

  return (
    <div className={`${CSS.modalOverlay} overflow-auto`}>
      <div className={`${CSS.modalContainer} theme-border-modal theme-modal-glow animate-modal max-w-2xl w-full my-auto`}>
        <div className={CSS.modalHeader}>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-blue-500/20">
                <Zap className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold theme-text-primary">Configurações de IA</h3>
                <p className="text-sm theme-text-muted">Escolha o modelo e as configurações para análise de documentos</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl theme-bg-secondary-50 theme-hover-bg transition-colors"
              title="Fechar"
            >
              <X className="w-5 h-5 theme-text-tertiary" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* ═══════════════════════════════════════════════════════════════════════════════
              SEÇÃO 1: Provedor de IA
              ═══════════════════════════════════════════════════════════════════════════════ */}
          <div>
            <label className="block text-sm font-medium theme-text-tertiary mb-3">Provedor de IA</label>
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => setAiSettings({ ...aiSettings, provider: 'claude' })}
                className={`p-3 rounded-lg border-2 transition-all text-left ${
                  aiSettings.provider === 'claude'
                    ? 'bg-orange-600/20 border-orange-500'
                    : 'theme-bg-secondary-30 theme-border-input hover-theme-border'
                }`}
              >
                <div className="flex items-center gap-2">
                  <ProviderIcon provider="claude" size={20} className="text-orange-400" />
                  <div>
                    <div className="font-semibold theme-text-primary text-sm">Claude</div>
                    <div className="text-xs theme-text-muted">Anthropic</div>
                  </div>
                </div>
              </button>
              <button
                onClick={() => setAiSettings({ ...aiSettings, provider: 'gemini' })}
                className={`p-3 rounded-lg border-2 transition-all text-left ${
                  aiSettings.provider === 'gemini'
                    ? 'bg-blue-600/20 border-blue-500'
                    : 'theme-bg-secondary-30 theme-border-input hover-theme-border'
                }`}
              >
                <div className="flex items-center gap-2">
                  <ProviderIcon provider="gemini" size={20} className="text-blue-400" />
                  <div>
                    <div className="font-semibold theme-text-primary text-sm">Gemini</div>
                    <div className="text-xs theme-text-muted">Google</div>
                  </div>
                </div>
              </button>
              <button
                onClick={() => setAiSettings({ ...aiSettings, provider: 'openai' })}
                className={`p-3 rounded-lg border-2 transition-all text-left ${
                  aiSettings.provider === 'openai'
                    ? 'bg-emerald-600/20 border-emerald-500'
                    : 'theme-bg-secondary-30 theme-border-input hover-theme-border'
                }`}
              >
                <div className="flex items-center gap-2">
                  <ProviderIcon provider="openai" size={20} className="text-emerald-400" />
                  <div>
                    <div className="font-semibold theme-text-primary text-sm">OpenAI</div>
                    <div className="text-xs theme-text-muted">GPT-5.2</div>
                  </div>
                </div>
              </button>
              <button
                onClick={() => setAiSettings({ ...aiSettings, provider: 'grok' })}
                className={`p-3 rounded-lg border-2 transition-all text-left ${
                  aiSettings.provider === 'grok'
                    ? 'bg-gray-600/20 border-gray-400'
                    : 'theme-bg-secondary-30 theme-border-input hover-theme-border'
                }`}
              >
                <div className="flex items-center gap-2">
                  <ProviderIcon provider="grok" size={20} className="text-gray-400" />
                  <div>
                    <div className="font-semibold theme-text-primary text-sm">Grok</div>
                    <div className="text-xs theme-text-muted">xAI</div>
                  </div>
                </div>
              </button>
            </div>

            {/* Model Selection based on provider */}
            <div className="mt-3">
              <label className="block text-xs theme-text-muted mb-1">
                Modelo {aiSettings.provider === 'claude' ? 'Claude' :
                       aiSettings.provider === 'gemini' ? 'Gemini' :
                       aiSettings.provider === 'openai' ? 'OpenAI' : 'Grok'}:
              </label>
              {aiSettings.provider === 'claude' && (
                <select
                  value={aiSettings.claudeModel || 'claude-sonnet-4-20250514'}
                  onChange={(e) => setAiSettings({ ...aiSettings, claudeModel: e.target.value, model: e.target.value })}
                  className="w-full px-3 py-2 theme-bg-secondary border theme-border-input rounded text-sm theme-text-secondary"
                >
                  <option value="claude-sonnet-4-20250514">Sonnet 4.5 ($3/$15 por 1M)</option>
                  <option value="claude-opus-4-5-20251101">Opus 4.5 ($15/$75 por 1M)</option>
                </select>
              )}
              {aiSettings.provider === 'gemini' && (
                <select
                  value={aiSettings.geminiModel || 'gemini-3-flash-preview'}
                  onChange={(e) => setAiSettings({ ...aiSettings, geminiModel: e.target.value })}
                  className="w-full px-3 py-2 theme-bg-secondary border theme-border-input rounded text-sm theme-text-secondary"
                >
                  <option value="gemini-3-flash-preview">Gemini 3 Flash ($0.50/$3.00 por 1M)</option>
                  <option value="gemini-3-pro-preview">Gemini 3 Pro ($2.00/$12 por 1M)</option>
                </select>
              )}
              {aiSettings.provider === 'openai' && (
                <select
                  value={aiSettings.openaiModel || 'gpt-5.2-chat-latest'}
                  onChange={(e) => setAiSettings({ ...aiSettings, openaiModel: e.target.value as 'gpt-5.2' | 'gpt-5.2-chat-latest' })}
                  className="w-full px-3 py-2 theme-bg-secondary border theme-border-input rounded text-sm theme-text-secondary"
                >
                  <option value="gpt-5.2-chat-latest">GPT-5.2 Instant ($1.75/$14 por 1M)</option>
                  <option value="gpt-5.2">GPT-5.2 Thinking - com Reasoning ($1.75/$14 por 1M)</option>
                </select>
              )}
              {aiSettings.provider === 'grok' && (
                <select
                  value={aiSettings.grokModel || 'grok-4-1-fast-reasoning'}
                  onChange={(e) => setAiSettings({ ...aiSettings, grokModel: e.target.value as 'grok-4-1-fast-reasoning' | 'grok-4-1-fast-non-reasoning' })}
                  className="w-full px-3 py-2 theme-bg-secondary border theme-border-input rounded text-sm theme-text-secondary"
                >
                  <option value="grok-4-1-fast-reasoning">Grok 4.1 Fast ($0.20/$0.50 por 1M) - 2M contexto</option>
                  <option value="grok-4-1-fast-non-reasoning">Grok 4.1 Instant ($0.20/$0.50 por 1M) - sem thinking</option>
                </select>
              )}
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════════════════
              SEÇÃO 2: Chaves API
              ═══════════════════════════════════════════════════════════════════════════════ */}
          <div>
            <label className="block text-sm font-medium theme-text-tertiary mb-3">
              Chaves API <span className="text-xs font-normal theme-text-muted">(armazenadas localmente)</span>
            </label>
            <div className="space-y-3">
              {/* Claude API Key */}
              <div>
                <label className="block text-xs theme-text-muted mb-1">Anthropic (Claude):</label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={aiSettings.apiKeys?.claude || ''}
                    onChange={(e) => setAiSettings({
                      ...aiSettings,
                      apiKeys: { ...aiSettings.apiKeys, claude: e.target.value }
                    })}
                    placeholder="sk-ant-..."
                    className="flex-1 px-3 py-2 theme-bg-secondary border theme-border-input rounded text-sm theme-text-secondary"
                  />
                  <button
                    onClick={async () => {
                      setApiTestStatus('claude', 'testing');
                      try {
                        const resp = await fetch(`${API_BASE}/api/claude/messages`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', 'x-api-key': aiSettings.apiKeys?.claude || '' },
                          body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 10, messages: [{ role: 'user', content: 'Olá' }] })
                        });
                        setApiTestStatus('claude', resp.ok ? 'ok' : 'error');
                      } catch { setApiTestStatus('claude', 'error'); }
                      setTimeout(() => setApiTestStatus('claude', null), 2000);
                    }}
                    disabled={apiTestStatuses.claude === 'testing'}
                    className={`px-3 py-2 text-white rounded text-sm min-w-[60px] transition-colors ${
                      apiTestStatuses.claude === 'ok' ? 'bg-green-600' :
                      apiTestStatuses.claude === 'error' ? 'bg-red-600' :
                      'bg-purple-600 hover:bg-purple-700'
                    }`}
                  >
                    {apiTestStatuses.claude === 'testing' ? '...' :
                     apiTestStatuses.claude === 'ok' ? '✓' :
                     apiTestStatuses.claude === 'error' ? '✗' : 'Testar'}
                  </button>
                </div>
              </div>
              {/* Gemini API Key */}
              <div>
                <label className="block text-xs theme-text-muted mb-1">Google (Gemini):</label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={aiSettings.apiKeys?.gemini || ''}
                    onChange={(e) => setAiSettings({
                      ...aiSettings,
                      apiKeys: { ...aiSettings.apiKeys, gemini: e.target.value }
                    })}
                    placeholder="AIza..."
                    className="flex-1 px-3 py-2 theme-bg-secondary border theme-border-input rounded text-sm theme-text-secondary"
                  />
                  <button
                    onClick={async () => {
                      setApiTestStatus('gemini', 'testing');
                      try {
                        const resp = await fetch(`${API_BASE}/api/gemini/generate`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', 'x-api-key': aiSettings.apiKeys?.gemini || '' },
                          body: JSON.stringify({
                            model: 'gemini-3-flash-preview',
                            request: { contents: [{ role: 'user', parts: [{ text: 'Olá' }] }], generationConfig: { maxOutputTokens: 100, thinking_config: { thinking_level: 'minimal' } } }
                          })
                        });
                        setApiTestStatus('gemini', resp.ok ? 'ok' : 'error');
                      } catch { setApiTestStatus('gemini', 'error'); }
                      setTimeout(() => setApiTestStatus('gemini', null), 2000);
                    }}
                    disabled={apiTestStatuses.gemini === 'testing'}
                    className={`px-3 py-2 text-white rounded text-sm min-w-[60px] transition-colors ${
                      apiTestStatuses.gemini === 'ok' ? 'bg-green-600' :
                      apiTestStatuses.gemini === 'error' ? 'bg-red-600' :
                      'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {apiTestStatuses.gemini === 'testing' ? '...' :
                     apiTestStatuses.gemini === 'ok' ? '✓' :
                     apiTestStatuses.gemini === 'error' ? '✗' : 'Testar'}
                  </button>
                </div>
              </div>
              {/* OpenAI API Key */}
              <div>
                <label className="block text-xs theme-text-muted mb-1">OpenAI (GPT):</label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={aiSettings.apiKeys?.openai || ''}
                    onChange={(e) => setAiSettings({
                      ...aiSettings,
                      apiKeys: { ...aiSettings.apiKeys, openai: e.target.value }
                    })}
                    placeholder="sk-..."
                    className="flex-1 px-3 py-2 theme-bg-secondary border theme-border-input rounded text-sm theme-text-secondary"
                  />
                  <button
                    onClick={async () => {
                      setApiTestStatus('openai', 'testing');
                      try {
                        const resp = await fetch(`${API_BASE}/api/openai/chat`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', 'x-api-key': aiSettings.apiKeys?.openai || '' },
                          body: JSON.stringify({
                            model: 'gpt-5.2-chat-latest',
                            max_tokens: 10,
                            messages: [{ role: 'user', content: 'Olá' }]
                          })
                        });
                        setApiTestStatus('openai', resp.ok ? 'ok' : 'error');
                      } catch { setApiTestStatus('openai', 'error'); }
                      setTimeout(() => setApiTestStatus('openai', null), 2000);
                    }}
                    disabled={apiTestStatuses.openai === 'testing'}
                    className={`px-3 py-2 text-white rounded text-sm min-w-[60px] transition-colors ${
                      apiTestStatuses.openai === 'ok' ? 'bg-green-600' :
                      apiTestStatuses.openai === 'error' ? 'bg-red-600' :
                      'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                  >
                    {apiTestStatuses.openai === 'testing' ? '...' :
                     apiTestStatuses.openai === 'ok' ? '✓' :
                     apiTestStatuses.openai === 'error' ? '✗' : 'Testar'}
                  </button>
                </div>
              </div>
              {/* Grok API Key */}
              <div>
                <label className="block text-xs theme-text-muted mb-1">xAI (Grok):</label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={aiSettings.apiKeys?.grok || ''}
                    onChange={(e) => setAiSettings({
                      ...aiSettings,
                      apiKeys: { ...aiSettings.apiKeys, grok: e.target.value }
                    })}
                    placeholder="xai-..."
                    className="flex-1 px-3 py-2 theme-bg-secondary border theme-border-input rounded text-sm theme-text-secondary"
                  />
                  <button
                    onClick={async () => {
                      setApiTestStatus('grok', 'testing');
                      try {
                        const resp = await fetch(`${API_BASE}/api/grok/chat`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', 'x-api-key': aiSettings.apiKeys?.grok || '' },
                          body: JSON.stringify({
                            model: 'grok-4-1-fast-non-reasoning',
                            max_tokens: 10,
                            messages: [{ role: 'user', content: 'Olá' }]
                          })
                        });
                        setApiTestStatus('grok', resp.ok ? 'ok' : 'error');
                      } catch { setApiTestStatus('grok', 'error'); }
                      setTimeout(() => setApiTestStatus('grok', null), 2000);
                    }}
                    disabled={apiTestStatuses.grok === 'testing'}
                    className={`px-3 py-2 text-white rounded text-sm min-w-[60px] transition-colors ${
                      apiTestStatuses.grok === 'ok' ? 'bg-green-600' :
                      apiTestStatuses.grok === 'error' ? 'bg-red-600' :
                      'bg-gray-600 hover:bg-gray-700'
                    }`}
                  >
                    {apiTestStatuses.grok === 'testing' ? '...' :
                     apiTestStatuses.grok === 'ok' ? '✓' :
                     apiTestStatuses.grok === 'error' ? '✗' : 'Testar'}
                  </button>
                </div>
              </div>
            </div>
            <p className="text-xs theme-text-muted mt-2">
              As chaves são armazenadas apenas no seu navegador (localStorage). Nunca são enviadas para servidores externos.
            </p>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════════════════
              SEÇÃO 3: Pensamento Prolongado
              ═══════════════════════════════════════════════════════════════════════════════ */}
          <div>
            <label className="block text-sm font-medium theme-text-tertiary mb-3">
              Pensamento Prolongado (Extended Thinking)
            </label>

            {/* CLAUDE: Toggle + Budget numérico */}
            {aiSettings.provider === 'claude' && (
              <>
                <button
                  onClick={() => setAiSettings({ ...aiSettings, useExtendedThinking: !aiSettings.useExtendedThinking })}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                    aiSettings.useExtendedThinking
                      ? 'bg-purple-600/20 border-purple-500'
                      : 'theme-bg-secondary-30 theme-border-input hover-theme-border'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className={CSS.flexGap2}>
                        <span className="font-semibold theme-text-primary">
                          {aiSettings.useExtendedThinking ? '✓ Ativado' : 'Desativado'}
                        </span>
                        {aiSettings.useExtendedThinking && (
                          <span className="text-xs bg-purple-500 text-white px-2 py-0.5 rounded">+{parseInt(aiSettings.thinkingBudget || '10000')/1000}k tokens</span>
                        )}
                      </div>
                      <p className="text-xs theme-text-muted mt-1">
                        {aiSettings.useExtendedThinking
                          ? `A IA usará até ${(parseInt(aiSettings.thinkingBudget || '10000')/1000).toFixed(0)}K tokens extras para pensar antes de responder.`
                          : 'A IA responderá mais rapidamente, com análise padrão.'
                        }
                      </p>
                    </div>
                    <div className={`w-12 h-6 rounded-full transition-colors relative ${
                      aiSettings.useExtendedThinking ? 'bg-purple-500' : 'theme-bg-tertiary'
                    }`}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        aiSettings.useExtendedThinking ? 'translate-x-7' : 'translate-x-1'
                      }`}></div>
                    </div>
                  </div>
                </button>

                {aiSettings.useExtendedThinking && (
                  <div className="mt-3 pl-4">
                    <label className="block text-xs theme-text-muted mb-1">Budget de Pensamento:</label>
                    <select
                      value={aiSettings.thinkingBudget || '10000'}
                      onChange={(e) => setAiSettings({ ...aiSettings, thinkingBudget: e.target.value })}
                      className="w-full px-3 py-2 theme-bg-secondary border theme-border-input rounded text-sm theme-text-secondary"
                    >
                      {(aiSettings.claudeModel || aiSettings.model)?.includes('opus') ? (
                        <>
                          <option value="10000">10K tokens (Padrão)</option>
                          <option value="20000">20K tokens (Recomendado)</option>
                          <option value="30000">30K tokens (Máximo Opus)</option>
                        </>
                      ) : (
                        <>
                          <option value="10000">10K tokens (Padrão)</option>
                          <option value="20000">20K tokens (Recomendado)</option>
                          <option value="40000">40K tokens (Alta qualidade)</option>
                          <option value="62000">62K tokens (Máximo Sonnet)</option>
                        </>
                      )}
                    </select>
                    {parseInt(aiSettings.thinkingBudget || '10000') >= 40000 && (
                      <p className="text-xs text-amber-400 mt-1">
                        ⚠️ Respostas podem demorar mais com budgets altos
                      </p>
                    )}
                  </div>
                )}
              </>
            )}

            {/* GEMINI 3: Dropdown de thinking_level */}
            {aiSettings.provider === 'gemini' && (
              <div className="p-4 rounded-lg border-2 border-amber-500/50 bg-amber-500/10">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-amber-400">⚠️</span>
                  <span className="font-semibold theme-text-primary">Gemini 3 sempre usa Thinking</span>
                </div>
                <p className="text-xs theme-text-muted mb-3">
                  O Gemini 3 não permite desativar o pensamento prolongado. Escolha o nível de profundidade:
                </p>
                <select
                  value={aiSettings.geminiThinkingLevel || 'high'}
                  onChange={(e) => setAiSettings({ ...aiSettings, geminiThinkingLevel: e.target.value as GeminiThinkingLevel })}
                  className="w-full px-3 py-2 theme-bg-secondary border theme-border-input rounded text-sm theme-text-secondary"
                >
                  {aiSettings.geminiModel?.includes('flash') && (
                    <option value="minimal">Minimal (mais rápido, menos preciso)</option>
                  )}
                  <option value="low">Low (equilíbrio velocidade/qualidade)</option>
                  {aiSettings.geminiModel?.includes('flash') && (
                    <option value="medium">Medium (recomendado)</option>
                  )}
                  <option value="high">High (mais lento, mais preciso)</option>
                </select>
                <p className="text-xs theme-text-muted mt-2">
                  {aiSettings.geminiModel?.includes('pro')
                    ? '💡 Gemini 3 Pro suporta apenas Low e High'
                    : '💡 Gemini 3 Flash suporta todos os níveis'
                  }
                </p>
              </div>
            )}

            {/* OPENAI: Reasoning Config (só para gpt-5.2) */}
            {aiSettings.provider === 'openai' && aiSettings.openaiModel === 'gpt-5.2' && (
              <div className="p-4 rounded-lg border-2 border-emerald-500/50 bg-emerald-500/10">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-emerald-400">🧠</span>
                  <span className="font-semibold theme-text-primary">GPT-5.2 Reasoning</span>
                </div>
                <p className="text-xs theme-text-muted mb-3">
                  O modelo pensa passo-a-passo antes de responder. Níveis mais altos produzem respostas mais elaboradas, mas custam mais tokens.
                </p>
                <select
                  value={aiSettings.openaiReasoningLevel || 'medium'}
                  onChange={(e) => setAiSettings({ ...aiSettings, openaiReasoningLevel: e.target.value as 'low' | 'medium' | 'high' | 'xhigh' })}
                  className="w-full px-3 py-2 theme-bg-secondary border theme-border-input rounded text-sm theme-text-secondary"
                >
                  <option value="low">Low - Rápido, menos detalhado</option>
                  <option value="medium">Medium - Balanceado (Recomendado)</option>
                  <option value="high">High - Mais detalhado</option>
                  <option value="xhigh">Extra High - Máxima qualidade (lento)</option>
                </select>
                {aiSettings.openaiReasoningLevel === 'xhigh' && (
                  <p className="text-xs text-amber-400 mt-2">
                    ⚠️ Nível xhigh pode demorar vários minutos. Timeout aumentado para 5 min.
                  </p>
                )}
              </div>
            )}

            {/* OPENAI: Info para modo Instant */}
            {aiSettings.provider === 'openai' && aiSettings.openaiModel === 'gpt-5.2-chat-latest' && (
              <div className="p-4 rounded-lg border-2 border-emerald-500/30 bg-emerald-500/5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-emerald-400">⚡</span>
                  <span className="font-semibold theme-text-primary">GPT-5.2 Instant</span>
                </div>
                <p className="text-xs theme-text-muted">
                  Modelo rápido sem reasoning. Ideal para tarefas simples e respostas imediatas.
                  Não suporta thinking/reasoning.
                </p>
              </div>
            )}

            {/* GROK Thinking: Info sobre modelos */}
            {aiSettings.provider === 'grok' && aiSettings.grokModel === 'grok-4-1-fast-reasoning' && (
              <div className="p-4 rounded-lg border-2 border-purple-500/50 bg-purple-500/10">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-purple-400">🧠</span>
                  <span className="font-semibold theme-text-primary">Grok 4.1 Fast Thinking</span>
                  <span className="text-xs bg-purple-500 text-white px-2 py-0.5 rounded">Thinking Embutido</span>
                </div>
                <p className="text-xs theme-text-muted">
                  Modelo da xAI com 2M de contexto e raciocínio integrado. O thinking é automático e não configurável.
                </p>
                <p className="text-xs text-emerald-400 mt-2">
                  💰 $0.20/1M input + $0.50/1M output = ~$0.35/1M total (96% mais barato que Claude)
                </p>
              </div>
            )}

            {/* GROK Instant: Sem suporte a thinking */}
            {aiSettings.provider === 'grok' && aiSettings.grokModel === 'grok-4-1-fast-non-reasoning' && (
              <div className="p-4 rounded-lg border-2 border-amber-500/50 bg-amber-500/10">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-amber-400">⚡</span>
                  <span className="font-semibold theme-text-primary">Grok 4.1 Fast Instant</span>
                  <span className="text-xs bg-amber-500 text-white px-2 py-0.5 rounded">Sem Thinking</span>
                </div>
                <p className="text-xs theme-text-muted">
                  Modelo da xAI com 2M de contexto, modo instant para respostas rápidas. Este modelo não suporta pensamento prolongado.
                </p>
                <p className="text-xs text-emerald-400 mt-2">
                  💰 $0.20/1M input + $0.50/1M output = ~$0.35/1M total (96% mais barato que Claude)
                </p>
              </div>
            )}

            {/* Log Thinking - desabilitado para modelos sem reasoning */}
            {(() => {
              const isDisabled = aiSettings.provider === 'grok' ||
                (aiSettings.provider === 'openai' && aiSettings.openaiModel === 'gpt-5.2-chat-latest');
              return (
                <label className={`flex items-center gap-3 p-3 mt-4 rounded-lg theme-bg-secondary-30 border theme-border-input transition-colors ${
                  isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:theme-bg-secondary'
                }`}>
                  <input
                    type="checkbox"
                    checked={aiSettings.logThinking || false}
                    onChange={(e) => setAiSettings({ ...aiSettings, logThinking: e.target.checked })}
                    disabled={isDisabled}
                    className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <div className="flex-1">
                    <span className="font-medium theme-text-primary text-sm">Log thinking no console</span>
                    <p className="text-xs theme-text-muted mt-0.5">
                      Exibe o raciocínio da IA no console (F12).
                      {isDisabled && <span className="text-amber-400"> Este modelo não expõe reasoning.</span>}
                    </p>
                  </div>
                </label>
              );
            })()}
          </div>

          {/* ═══════════════════════════════════════════════════════════════════════════════
              SEÇÃO 4: Double Check de Respostas
              ═══════════════════════════════════════════════════════════════════════════════ */}
          <div>
            <label className="block text-sm font-medium theme-text-tertiary mb-3">
              🔄 Double Check de Respostas
            </label>

            {/* Toggle principal */}
            <button
              onClick={() => {
                const current = aiSettings.doubleCheck || {
                  enabled: false,
                  provider: 'claude' as AIProvider,
                  model: 'claude-sonnet-4-20250514',
                  // v1.37.65: Adicionado proofAnalysis e quickPrompt
                  operations: { topicExtraction: false, dispositivo: false, sentenceReview: false, factsComparison: false, proofAnalysis: false, quickPrompt: false }
                };
                setAiSettings({
                  ...aiSettings,
                  doubleCheck: { ...current, enabled: !current.enabled }
                });
              }}
              className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                aiSettings.doubleCheck?.enabled
                  ? 'bg-purple-600/20 border-purple-500'
                  : 'theme-bg-secondary-30 theme-border-input hover-theme-border'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className={CSS.flexGap2}>
                    <span className="font-semibold theme-text-primary">
                      {aiSettings.doubleCheck?.enabled ? '✓ Ativado' : 'Desativado'}
                    </span>
                    {aiSettings.doubleCheck?.enabled && (
                      <span className="text-xs bg-purple-500 text-white px-2 py-0.5 rounded">Verificação Dupla</span>
                    )}
                  </div>
                  <p className="text-xs theme-text-muted mt-1">
                    Reanalisa respostas da IA para detectar falhas, omissões e falsos positivos.
                  </p>
                </div>
                <div className={`w-12 h-6 rounded-full transition-colors relative ${
                  aiSettings.doubleCheck?.enabled ? 'bg-purple-500' : 'theme-bg-tertiary'
                }`}>
                  <div className={`absolute w-5 h-5 rounded-full bg-white shadow top-0.5 transition-all ${
                    aiSettings.doubleCheck?.enabled ? 'right-0.5' : 'left-0.5'
                  }`} />
                </div>
              </div>
            </button>

            {/* Opções expandidas quando ativado */}
            {aiSettings.doubleCheck?.enabled && (
              <div className="mt-4 space-y-4 p-4 rounded-lg theme-bg-secondary-30 border theme-border-input">
                {/* Seletor de Provider */}
                <div>
                  <label className="block text-xs font-medium theme-text-tertiary mb-2">
                    Provider para verificação
                  </label>
                  <select
                    value={aiSettings.doubleCheck?.provider || 'claude'}
                    onChange={(e) => {
                      const provider = e.target.value as AIProvider;
                      const defaultModels: Record<AIProvider, string> = {
                        claude: 'claude-sonnet-4-20250514',
                        gemini: 'gemini-3-flash-preview',
                        openai: 'gpt-5.2-chat-latest',
                        grok: 'grok-4-1-fast-reasoning'
                      };
                      setAiSettings({
                        ...aiSettings,
                        doubleCheck: {
                          ...aiSettings.doubleCheck!,
                          provider,
                          model: defaultModels[provider]
                        }
                      });
                    }}
                    className="w-full p-2 rounded-lg theme-bg-secondary border theme-border-input theme-text-primary text-sm"
                  >
                    <option value="claude">Claude (Anthropic)</option>
                    <option value="gemini">Gemini (Google)</option>
                    <option value="openai">GPT (OpenAI)</option>
                    <option value="grok">Grok (xAI)</option>
                  </select>
                </div>

                {/* Seletor de Modelo (dinâmico baseado no provider) */}
                <div>
                  <label className="block text-xs font-medium theme-text-tertiary mb-2">
                    Modelo para verificação
                  </label>
                  <select
                    value={aiSettings.doubleCheck?.model || 'claude-sonnet-4-20250514'}
                    onChange={(e) => {
                      setAiSettings({
                        ...aiSettings,
                        doubleCheck: {
                          ...aiSettings.doubleCheck!,
                          model: e.target.value
                        }
                      });
                    }}
                    className="w-full p-2 rounded-lg theme-bg-secondary border theme-border-input theme-text-primary text-sm"
                  >
                    {aiSettings.doubleCheck?.provider === 'claude' && (
                      <>
                        <option value="claude-sonnet-4-20250514">Claude Sonnet 4</option>
                        <option value="claude-opus-4-5-20251101">Claude Opus 4.5</option>
                      </>
                    )}
                    {aiSettings.doubleCheck?.provider === 'gemini' && (
                      <>
                        <option value="gemini-3-flash-preview">Gemini 3 Flash</option>
                        <option value="gemini-3-pro-preview">Gemini 3 Pro</option>
                      </>
                    )}
                    {aiSettings.doubleCheck?.provider === 'openai' && (
                      <>
                        <option value="gpt-5.2-chat-latest">GPT-5.2 Instant</option>
                        <option value="gpt-5.2">GPT-5.2 Thinking</option>
                      </>
                    )}
                    {aiSettings.doubleCheck?.provider === 'grok' && (
                      <>
                        <option value="grok-4-1-fast-reasoning">Grok 4.1 Fast Thinking</option>
                        <option value="grok-4-1-fast-non-reasoning">Grok 4.1 Fast Instant</option>
                      </>
                    )}
                  </select>
                </div>

                {/* Thinking Config específico para Double Check */}
                {aiSettings.doubleCheck?.provider === 'claude' && (
                  <div>
                    <label className="block text-xs font-medium theme-text-tertiary mb-2">
                      Extended Thinking Budget
                    </label>
                    <select
                      value={aiSettings.doubleCheck?.claudeThinkingBudget || 0}
                      onChange={(e) => {
                        setAiSettings({
                          ...aiSettings,
                          doubleCheck: {
                            ...aiSettings.doubleCheck!,
                            claudeThinkingBudget: parseInt(e.target.value)
                          }
                        });
                      }}
                      className="w-full p-2 rounded-lg theme-bg-secondary border theme-border-input theme-text-primary text-sm"
                    >
                      <option value="0">Desativado</option>
                      {aiSettings.doubleCheck?.model?.includes('opus') ? (
                        <>
                          <option value="10000">10K tokens (Padrão)</option>
                          <option value="20000">20K tokens (Recomendado)</option>
                          <option value="30000">30K tokens (Máximo Opus)</option>
                        </>
                      ) : (
                        <>
                          <option value="10000">10K tokens (Padrão)</option>
                          <option value="20000">20K tokens (Recomendado)</option>
                          <option value="40000">40K tokens (Alta qualidade)</option>
                          <option value="62000">62K tokens (Máximo Sonnet)</option>
                        </>
                      )}
                    </select>
                    {(aiSettings.doubleCheck?.claudeThinkingBudget || 0) >= 40000 && (
                      <p className="text-xs text-amber-400 mt-1">
                        ⚠️ Verificação pode demorar mais com budgets altos
                      </p>
                    )}
                  </div>
                )}

                {aiSettings.doubleCheck?.provider === 'gemini' && (
                  <div>
                    <label className="block text-xs font-medium theme-text-tertiary mb-2">
                      Thinking Level
                    </label>
                    <p className="text-xs theme-text-muted mb-2">
                      Gemini 3 não permite desativar thinking
                    </p>
                    <select
                      value={aiSettings.doubleCheck?.geminiThinkingLevel || 'low'}
                      onChange={(e) => {
                        setAiSettings({
                          ...aiSettings,
                          doubleCheck: {
                            ...aiSettings.doubleCheck!,
                            geminiThinkingLevel: e.target.value as GeminiThinkingLevel
                          }
                        });
                      }}
                      className="w-full p-2 rounded-lg theme-bg-secondary border theme-border-input theme-text-primary text-sm"
                    >
                      {aiSettings.doubleCheck?.model?.includes('flash') && (
                        <option value="minimal">Minimal (mais rápido)</option>
                      )}
                      <option value="low">Low (equilíbrio)</option>
                      {aiSettings.doubleCheck?.model?.includes('flash') && (
                        <option value="medium">Medium (recomendado)</option>
                      )}
                      <option value="high">High (mais preciso)</option>
                    </select>
                    <p className="text-xs theme-text-muted mt-1">
                      {aiSettings.doubleCheck?.model?.includes('pro')
                        ? '💡 Gemini 3 Pro suporta apenas Low e High'
                        : '💡 Gemini 3 Flash suporta todos os níveis'}
                    </p>
                  </div>
                )}

                {aiSettings.doubleCheck?.provider === 'openai' &&
                 aiSettings.doubleCheck?.model === 'gpt-5.2' && (
                  <div>
                    <label className="block text-xs font-medium theme-text-tertiary mb-2">
                      Reasoning Level
                    </label>
                    <select
                      value={aiSettings.doubleCheck?.openaiReasoningLevel || 'medium'}
                      onChange={(e) => {
                        setAiSettings({
                          ...aiSettings,
                          doubleCheck: {
                            ...aiSettings.doubleCheck!,
                            openaiReasoningLevel: e.target.value as 'low' | 'medium' | 'high' | 'xhigh'
                          }
                        });
                      }}
                      className="w-full p-2 rounded-lg theme-bg-secondary border theme-border-input theme-text-primary text-sm"
                    >
                      <option value="low">Low - Rápido</option>
                      <option value="medium">Medium - Balanceado (Recomendado)</option>
                      <option value="high">High - Mais detalhado</option>
                      <option value="xhigh">Extra High - Máxima qualidade (lento)</option>
                    </select>
                    {aiSettings.doubleCheck?.openaiReasoningLevel === 'xhigh' && (
                      <p className="text-xs text-amber-400 mt-1">
                        ⚠️ Nível xhigh pode demorar vários minutos
                      </p>
                    )}
                  </div>
                )}

                {aiSettings.doubleCheck?.provider === 'openai' &&
                 aiSettings.doubleCheck?.model === 'gpt-5.2-chat-latest' && (
                  <p className="text-xs theme-text-muted p-2 rounded bg-gray-500/10">
                    ⚡ GPT-5.2 Instant não suporta thinking/reasoning
                  </p>
                )}

                {aiSettings.doubleCheck?.provider === 'grok' &&
                 aiSettings.doubleCheck?.model?.includes('reasoning') && (
                  <div className="p-3 rounded-lg border border-purple-500/30 bg-purple-500/10">
                    <div className="flex items-center gap-2">
                      <span className="text-purple-400">🧠</span>
                      <span className="text-sm theme-text-primary">Grok 4.1 Fast Thinking</span>
                    </div>
                    <p className="text-xs theme-text-muted mt-1">
                      Thinking é automático e não configurável
                    </p>
                  </div>
                )}

                {aiSettings.doubleCheck?.provider === 'grok' &&
                 aiSettings.doubleCheck?.model?.includes('non-reasoning') && (
                  <p className="text-xs theme-text-muted p-2 rounded bg-gray-500/10">
                    ⚡ Grok 4.1 Fast Instant não suporta thinking
                  </p>
                )}

                {/* Operações que usam Double Check */}
                <div>
                  <label className="block text-xs font-medium theme-text-tertiary mb-2">
                    Operações com verificação
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 p-2 rounded-lg hover:theme-bg-secondary cursor-pointer">
                      <input
                        type="checkbox"
                        checked={aiSettings.doubleCheck?.operations.topicExtraction || false}
                        onChange={(e) => {
                          setAiSettings({
                            ...aiSettings,
                            doubleCheck: {
                              ...aiSettings.doubleCheck!,
                              operations: {
                                ...aiSettings.doubleCheck!.operations,
                                topicExtraction: e.target.checked
                              }
                            }
                          });
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-purple-500 focus:ring-purple-500"
                      />
                      <div className="flex-1">
                        <span className="text-sm theme-text-primary">Extração de tópicos</span>
                        <p className="text-xs theme-text-muted">
                          Verifica falsos positivos, omissões e categorização incorreta
                        </p>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 p-2 rounded-lg hover:theme-bg-secondary cursor-pointer">
                      <input
                        type="checkbox"
                        checked={aiSettings.doubleCheck?.operations.dispositivo || false}
                        onChange={(e) => {
                          setAiSettings({
                            ...aiSettings,
                            doubleCheck: {
                              ...aiSettings.doubleCheck!,
                              operations: {
                                ...aiSettings.doubleCheck!.operations,
                                dispositivo: e.target.checked
                              }
                            }
                          });
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-purple-500 focus:ring-purple-500"
                      />
                      <div className="flex-1">
                        <span className="text-sm theme-text-primary">Dispositivo</span>
                        <p className="text-xs theme-text-muted">
                          Verifica omissões de pedidos e contradições com fundamentação
                        </p>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 p-2 rounded-lg hover:theme-bg-secondary cursor-pointer">
                      <input
                        type="checkbox"
                        checked={aiSettings.doubleCheck?.operations.sentenceReview || false}
                        onChange={(e) => {
                          setAiSettings({
                            ...aiSettings,
                            doubleCheck: {
                              ...aiSettings.doubleCheck!,
                              operations: {
                                ...aiSettings.doubleCheck!.operations,
                                sentenceReview: e.target.checked
                              }
                            }
                          });
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-purple-500 focus:ring-purple-500"
                      />
                      <div className="flex-1">
                        <span className="text-sm theme-text-primary">Revisar sentença</span>
                        <p className="text-xs theme-text-muted">
                          Valida análise de omissões, contradições e obscuridades
                        </p>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 p-2 rounded-lg hover:theme-bg-secondary cursor-pointer">
                      <input
                        type="checkbox"
                        checked={aiSettings.doubleCheck?.operations.factsComparison || false}
                        onChange={(e) => {
                          setAiSettings({
                            ...aiSettings,
                            doubleCheck: {
                              ...aiSettings.doubleCheck!,
                              operations: {
                                ...aiSettings.doubleCheck!.operations,
                                factsComparison: e.target.checked
                              }
                            }
                          });
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-purple-500 focus:ring-purple-500"
                      />
                      <div className="flex-1">
                        <span className="text-sm theme-text-primary">Confronto de fatos</span>
                        <p className="text-xs theme-text-muted">
                          Verifica completude, classificação e correção das alegações
                        </p>
                      </div>
                    </label>
                    {/* v1.37.65: Análise de provas */}
                    <label className="flex items-center gap-3 p-2 rounded-lg hover:theme-bg-secondary cursor-pointer">
                      <input
                        type="checkbox"
                        checked={aiSettings.doubleCheck?.operations.proofAnalysis || false}
                        onChange={(e) => {
                          setAiSettings({
                            ...aiSettings,
                            doubleCheck: {
                              ...aiSettings.doubleCheck!,
                              operations: {
                                ...aiSettings.doubleCheck!.operations,
                                proofAnalysis: e.target.checked
                              }
                            }
                          });
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-purple-500 focus:ring-purple-500"
                      />
                      <div className="flex-1">
                        <span className="text-sm theme-text-primary">Análise de provas</span>
                        <p className="text-xs theme-text-muted">
                          Verifica completude, coerência e objetividade da análise
                        </p>
                      </div>
                    </label>
                    {/* v1.37.65: Quick Prompts */}
                    <label className="flex items-center gap-3 p-2 rounded-lg hover:theme-bg-secondary cursor-pointer">
                      <input
                        type="checkbox"
                        checked={aiSettings.doubleCheck?.operations.quickPrompt || false}
                        onChange={(e) => {
                          setAiSettings({
                            ...aiSettings,
                            doubleCheck: {
                              ...aiSettings.doubleCheck!,
                              operations: {
                                ...aiSettings.doubleCheck!.operations,
                                quickPrompt: e.target.checked
                              }
                            }
                          });
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-purple-500 focus:ring-purple-500"
                      />
                      <div className="flex-1">
                        <span className="text-sm theme-text-primary">Prompts rápidos (Assistente IA)</span>
                        <p className="text-xs theme-text-muted">
                          Verifica atendimento à solicitação e precisão jurídica
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Aviso de custo */}
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <div className="flex items-start gap-2">
                    <span className="text-amber-400">⚠️</span>
                    <p className="text-xs text-amber-700 dark:text-amber-200">
                      Double Check <strong>dobra o custo e tempo</strong> de cada operação selecionada.
                      Use apenas quando a precisão for crítica.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ═══════════════════════════════════════════════════════════════════════════════
              SEÇÃO 4.5: Melhoria de Voz por IA (v1.37.88)
              ═══════════════════════════════════════════════════════════════════════════════ */}
          <div>
            <label className="block text-sm font-medium theme-text-tertiary mb-3">
              🎤 Melhoria de Voz por IA
            </label>

            {/* Toggle habilitar/desabilitar */}
            <button
              onClick={() => setAiSettings({
                ...aiSettings,
                voiceImprovement: {
                  ...aiSettings.voiceImprovement,
                  enabled: !aiSettings.voiceImprovement?.enabled,
                  model: aiSettings.voiceImprovement?.model || 'haiku'
                }
              })}
              className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                aiSettings.voiceImprovement?.enabled
                  ? 'bg-indigo-600/20 border-indigo-500'
                  : 'theme-bg-secondary-30 theme-border-input hover-theme-border'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className={CSS.flexGap2}>
                    <span className="font-semibold theme-text-primary">
                      {aiSettings.voiceImprovement?.enabled ? '✓ Ativado' : 'Desativado'}
                    </span>
                    {aiSettings.voiceImprovement?.enabled && (
                      <span className="text-xs bg-indigo-500 text-white px-2 py-0.5 rounded">
                        {VOICE_MODEL_CONFIG[aiSettings.voiceImprovement?.model || 'haiku'].displayName}
                      </span>
                    )}
                  </div>
                  <p className="text-xs theme-text-muted mt-1">
                    {aiSettings.voiceImprovement?.enabled
                      ? 'Textos ditados por voz serão automaticamente melhorados pela IA antes de serem inseridos.'
                      : 'Melhorar automaticamente textos ditados por voz, tornando-os fluidos e gramaticalmente corretos.'
                    }
                  </p>
                </div>
                <div className={`w-12 h-6 rounded-full transition-colors relative ${
                  aiSettings.voiceImprovement?.enabled ? 'bg-indigo-500' : 'theme-bg-tertiary'
                }`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    aiSettings.voiceImprovement?.enabled ? 'translate-x-7' : 'translate-x-1'
                  }`}></div>
                </div>
              </div>
            </button>

            {/* Dropdown de modelo (só aparece quando habilitado) */}
            {aiSettings.voiceImprovement?.enabled && (
              <div className="mt-4 p-4 rounded-lg theme-bg-secondary-30 border theme-border-input space-y-4">
                <div>
                  <label className="block text-xs font-medium theme-text-muted mb-2">
                    Modelo para Melhoria
                  </label>
                  <select
                    value={aiSettings.voiceImprovement?.model || 'haiku'}
                    onChange={(e) => setAiSettings({
                      ...aiSettings,
                      voiceImprovement: {
                        ...aiSettings.voiceImprovement,
                        enabled: true,
                        model: e.target.value as VoiceImprovementModel
                      }
                    })}
                    className="w-full px-3 py-2 rounded-lg theme-bg-primary theme-text-primary theme-border-input border text-sm"
                  >
                    {/* Só mostra modelos cujo provider tem API key configurada */}
                    {(Object.entries(VOICE_MODEL_CONFIG) as [VoiceImprovementModel, typeof VOICE_MODEL_CONFIG['haiku']][])
                      .filter(([, config]) => {
                        const apiKey = aiSettings.apiKeys?.[config.provider];
                        return apiKey && apiKey.trim().length > 0;
                      })
                      .map(([key, config]) => (
                        <option key={key} value={key}>
                          {config.displayName}
                        </option>
                      ))
                    }
                  </select>
                  {/* Aviso se nenhum modelo disponível */}
                  {(Object.entries(VOICE_MODEL_CONFIG) as [VoiceImprovementModel, typeof VOICE_MODEL_CONFIG['haiku']][])
                    .filter(([, config]) => {
                      const apiKey = aiSettings.apiKeys?.[config.provider];
                      return apiKey && apiKey.trim().length > 0;
                    }).length === 0 && (
                    <p className="text-xs text-red-400 mt-2">
                      Configure pelo menos uma API key acima para usar este recurso.
                    </p>
                  )}
                </div>

                {/* Aviso de custo */}
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <div className="flex items-start gap-2">
                    <span className="text-amber-400">⚠️</span>
                    <p className="text-xs text-amber-700 dark:text-amber-200">
                      Cada ditado fará uma chamada extra à API do modelo selecionado.
                      Modelos rápidos como Haiku/Flash são baratos (~0.001 por chamada).
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ═══════════════════════════════════════════════════════════════════════════════
              SEÇÃO 5: Nível de Detalhe nos Mini-Relatórios
              ═══════════════════════════════════════════════════════════════════════════════ */}
          <div>
            <label className="block text-sm font-medium theme-text-tertiary mb-3">Nível de Detalhe nos Mini-Relatórios</label>
            <button
              onClick={() => setAiSettings({ ...aiSettings, detailedMiniReports: !aiSettings.detailedMiniReports })}
              className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                aiSettings.detailedMiniReports
                  ? 'bg-green-600/20 border-green-500'
                  : 'theme-bg-secondary-30 theme-border-input hover-theme-border'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className={CSS.flexGap2}>
                    <span className="font-semibold theme-text-primary">
                      {aiSettings.detailedMiniReports ? '✓ Ativado' : 'Desativado'}
                    </span>
                    {aiSettings.detailedMiniReports && (
                      <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded">Alto Detalhe</span>
                    )}
                  </div>
                  <p className="text-xs theme-text-muted mt-1">
                    {aiSettings.detailedMiniReports
                      ? 'Os mini-relatórios serão gerados com descrição fática detalhada, incluindo mais informações sobre os fatos alegados pelas partes (postulatórios e defensivos).'
                      : 'Os mini-relatórios serão gerados com nível de detalhe padrão. Recomendado para a maioria dos casos.'
                    }
                  </p>
                </div>
                <div className={`w-12 h-6 rounded-full transition-colors relative ${
                  aiSettings.detailedMiniReports ? 'bg-green-500' : 'theme-bg-tertiary'
                }`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    aiSettings.detailedMiniReports ? 'translate-x-7' : 'translate-x-1'
                  }`}></div>
                </div>
              </div>
            </button>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════════════════
              SEÇÃO 6: Tópicos por Requisição
              ═══════════════════════════════════════════════════════════════════════════════ */}
          <div>
            <label className="block text-sm font-medium theme-text-tertiary mb-3">Tópicos por Requisição</label>
            <div className="flex items-center justify-between p-4 rounded-lg theme-bg-secondary-30 theme-border-input border-2">
              <div className="flex-1">
                <p className="text-sm theme-text-primary font-medium">Quantos mini-relatórios gerar por chamada à API</p>
                <p className="text-xs theme-text-muted mt-1">
                  Mais tópicos = menos chamadas = mais rápido. "Todos" usa 1 requisição com limite maior (48K tokens).
                </p>
              </div>
              <select
                value={aiSettings.topicsPerRequest || 1}
                onChange={(e) => {
                  const val = e.target.value;
                  setAiSettings({ ...aiSettings, topicsPerRequest: val === 'all' ? 'all' : parseInt(val) });
                }}
                className="ml-4 px-3 py-2 rounded-lg theme-bg-primary theme-text-primary theme-border-input border text-sm font-medium"
              >
                <option value={1}>1 (padrão)</option>
                <option value={3}>3 tópicos</option>
                <option value={5}>5 tópicos</option>
                <option value="all">Todos (1 requisição)</option>
              </select>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════════════════
              SEÇÃO 7: Requisições Paralelas
              ═══════════════════════════════════════════════════════════════════════════════ */}
          <div>
            <label className="block text-sm font-medium theme-text-tertiary mb-3">Requisições Paralelas</label>
            <div className="flex items-center justify-between p-4 rounded-lg theme-bg-secondary-30 theme-border-input border-2">
              <div className="flex-1">
                <p className="text-sm theme-text-primary font-medium">Quantas requisições enviar simultaneamente</p>
                <p className="text-xs theme-text-muted mt-1">
                  Mais paralelas = mais rápido, mas pode causar erro 429 se exceder limite da API.
                </p>
              </div>
              <select
                value={aiSettings.parallelRequests || 5}
                onChange={(e) => {
                  setAiSettings({ ...aiSettings, parallelRequests: parseInt(e.target.value) });
                }}
                className="ml-4 px-3 py-2 rounded-lg theme-bg-primary theme-text-primary theme-border-input border text-sm font-medium"
              >
                <option value={3}>3 (Conservador)</option>
                <option value={5}>5 (Padrão)</option>
                <option value={10}>10 (Rápido)</option>
                <option value={15}>15 (Alto volume)</option>
                <option value={20}>20 (Máximo)</option>
              </select>
            </div>
            <div className="mt-2 p-3 rounded-lg theme-bg-tertiary text-xs theme-text-muted">
              <p className="font-semibold theme-text-secondary mb-1">Limites por API (RPM = requisições/minuto):</p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                <div>
                  <span className="text-purple-400 font-medium">Claude:</span>
                  <ul className="ml-2 mt-0.5 space-y-0.5">
                    <li>• Tier 1 ($5): 50 RPM → usar 3-5</li>
                    <li>• Tier 2+ ($40+): 1000+ RPM → 10-15</li>
                  </ul>
                </div>
                <div>
                  <span className="text-blue-400 font-medium">Gemini:</span>
                  <ul className="ml-2 mt-0.5 space-y-0.5">
                    <li>• Free: 5-10 RPM → usar 3</li>
                    <li>• Pago: 300+ RPM → 10-20</li>
                  </ul>
                </div>
                <div>
                  <span className="text-green-400 font-medium">OpenAI:</span>
                  <ul className="ml-2 mt-0.5 space-y-0.5">
                    <li>• Tier 1: ~1000 RPM → 10-15</li>
                    <li>• Tier 2+: 2000+ RPM → 15-20</li>
                  </ul>
                </div>
                <div>
                  <span className="text-gray-400 font-medium">Grok:</span>
                  <ul className="ml-2 mt-0.5 space-y-0.5">
                    <li>• Pay-as-you-go: 480 RPM</li>
                    <li>• Recomendado: 10-20</li>
                  </ul>
                </div>
              </div>
              <p className="mt-2 text-orange-600 dark:text-orange-300 font-medium">⚠️ Erro 429 = limite excedido. Reduza o valor.</p>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════════════════
              SEÇÃO 8: Modo de Processamento de PDF
              ═══════════════════════════════════════════════════════════════════════════════ */}
          <div>
            <label className="block text-sm font-medium theme-text-tertiary mb-3">
              Modo de Processamento de PDF
            </label>
            <div className="space-y-3">
              {/* Opção 1: PDF Puro */}
              <button
                onClick={() => setAiSettings({ ...aiSettings, ocrEngine: 'pdf-puro' })}
                className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                  aiSettings.ocrEngine === 'pdf-puro'
                    ? 'bg-stone-600/20 border-stone-500'
                    : 'theme-bg-secondary-30 theme-border-input hover-theme-border'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                    aiSettings.ocrEngine === 'pdf-puro'
                      ? 'border-stone-500 bg-stone-500'
                      : 'theme-border'
                  }`}>
                    {aiSettings.ocrEngine === 'pdf-puro' && (
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    )}
                  </div>
                  <div className="flex-1">
                    <span className="font-semibold theme-text-primary text-sm">PDF Puro (Binário)</span>
                    <p className="text-xs theme-text-muted mt-1">
                      Envia o PDF como arquivo binário, sem extração de texto. Usa mais tokens mas preserva 100% do documento.
                    </p>
                  </div>
                </div>
              </button>

              {/* Opção 2: Extrair Texto */}
              <button
                onClick={() => {
                  if (aiSettings.ocrEngine === 'pdf-puro') {
                    setAiSettings({ ...aiSettings, ocrEngine: 'pdfjs' });
                  }
                }}
                className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                  ['pdfjs', 'tesseract', 'claude-vision'].includes(aiSettings.ocrEngine)
                    ? 'bg-blue-600/20 border-blue-500'
                    : 'theme-bg-secondary-30 theme-border-input hover-theme-border'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                    ['pdfjs', 'tesseract', 'claude-vision'].includes(aiSettings.ocrEngine)
                      ? 'border-blue-500 bg-blue-500'
                      : 'theme-border'
                  }`}>
                    {['pdfjs', 'tesseract', 'claude-vision'].includes(aiSettings.ocrEngine) && (
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className={CSS.flexGap2}>
                      <span className="font-semibold theme-text-primary text-sm">Extrair Texto</span>
                      <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded">Recomendado</span>
                    </div>
                    <p className="text-xs theme-text-muted mt-1">
                      Extrai o texto do PDF antes de enviar. Economiza tokens e permite busca no texto.
                    </p>
                  </div>
                </div>
              </button>

              {/* Sub-opções de extração */}
              {['pdfjs', 'tesseract', 'claude-vision'].includes(aiSettings.ocrEngine) && (
                <div className="ml-4 border-l-2 border-blue-500/30 pl-4 space-y-3">
                  <p className="text-xs font-semibold theme-text-blue mb-2">Método de extração:</p>

                  {/* PDF.js */}
                  <button
                    onClick={() => setAiSettings({ ...aiSettings, ocrEngine: 'pdfjs' })}
                    className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                      aiSettings.ocrEngine === 'pdfjs'
                        ? 'bg-green-600/20 border-green-500'
                        : 'theme-bg-secondary-30 theme-border-input hover-theme-border'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                        aiSettings.ocrEngine === 'pdfjs' ? 'border-green-500 bg-green-500' : 'theme-border'
                      }`}>
                        {aiSettings.ocrEngine === 'pdfjs' && <div className="w-2 h-2 bg-white rounded-full"></div>}
                      </div>
                      <div className="flex-1">
                        <div className={CSS.flexGap2}>
                          <span className="font-semibold theme-text-primary text-sm">PDF.js - Padrão</span>
                          <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded">Gratuito</span>
                        </div>
                        <p className="text-xs theme-text-muted mt-1">
                          ✅ Rápido e gratuito | ⚠️ Não funciona com PDFs escaneados (imagens)
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Tesseract OCR */}
                  <button
                    onClick={() => setAiSettings({ ...aiSettings, ocrEngine: 'tesseract' })}
                    className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                      aiSettings.ocrEngine === 'tesseract'
                        ? 'bg-cyan-600/20 border-cyan-500'
                        : 'theme-bg-secondary-30 theme-border-input hover-theme-border'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                        aiSettings.ocrEngine === 'tesseract' ? 'border-cyan-500 bg-cyan-500' : 'theme-border'
                      }`}>
                        {aiSettings.ocrEngine === 'tesseract' && <div className="w-2 h-2 bg-white rounded-full"></div>}
                      </div>
                      <div className="flex-1">
                        <div className={CSS.flexGap2}>
                          <span className="font-semibold theme-text-primary text-sm">Tesseract OCR - Offline</span>
                          <span className="text-xs bg-cyan-500 text-white px-2 py-0.5 rounded">Gratuito</span>
                        </div>
                        <p className="text-xs theme-text-muted mt-1">
                          ✅ 100% offline e gratuito | ✅ Funciona com PDFs escaneados | ⏱️ ~15-30s por página
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Claude Vision */}
                  <button
                    onClick={() => setAiSettings({ ...aiSettings, ocrEngine: 'claude-vision' })}
                    className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                      aiSettings.ocrEngine === 'claude-vision'
                        ? 'bg-purple-600/20 border-purple-500'
                        : 'theme-bg-secondary-30 theme-border-input hover-theme-border'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                        aiSettings.ocrEngine === 'claude-vision' ? 'border-purple-500 bg-purple-500' : 'theme-border'
                      }`}>
                        {aiSettings.ocrEngine === 'claude-vision' && <div className="w-2 h-2 bg-white rounded-full"></div>}
                      </div>
                      <div className="flex-1">
                        <div className={CSS.flexGap2}>
                          <span className="font-semibold theme-text-primary text-sm">Claude Vision - OCR Avançado</span>
                          <span className="text-xs bg-yellow-500 text-stone-900 px-2 py-0.5 rounded">API</span>
                        </div>
                        <p className="text-xs theme-text-muted mt-1">
                          💰 ~$0.04/10 páginas | ✅ Funciona com PDFs escaneados | ⏱️ ~3-8s por página
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Aviso de custo para Claude Vision */}
                  {aiSettings.ocrEngine === 'claude-vision' && (
                    <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-yellow-500 mb-1">Atenção: Consumo de Tokens</p>
                          <ul className="text-xs theme-text-tertiary space-y-1">
                            <li>• ~100-500 tokens/página (entrada) + ~100-300 tokens/página (saída)</li>
                            <li>• Estimativa: ~$0.04 USD para 10 páginas</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════════════════
              SEÇÃO 9: Anonimização de Documentos
              ═══════════════════════════════════════════════════════════════════════════════ */}
          <div>
            <label className="block text-sm font-medium theme-text-tertiary mb-3">Anonimização de Documentos</label>
            {!['pdfjs', 'tesseract'].includes(aiSettings.ocrEngine) ? (
              <div className="p-4 rounded-lg bg-stone-700/30 border border-stone-600/50">
                <div className="flex items-start gap-3">
                  <span className="text-xl">🔒</span>
                  <div>
                    <p className="text-sm font-medium theme-text-muted">Indisponível com o método atual</p>
                    <p className="text-xs theme-text-muted mt-1">
                      A anonimização só funciona com extração via PDF.js ou Tesseract. Com "{aiSettings.ocrEngine === 'pdf-puro' ? 'PDF Puro' : 'Claude Vision'}", o documento já é enviado à IA antes da anonimização.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <button
                  onClick={() => setAiSettings({
                    ...aiSettings,
                    anonymization: { ...aiSettings.anonymization, enabled: !aiSettings.anonymization?.enabled }
                  })}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                    aiSettings.anonymization?.enabled
                      ? 'bg-amber-600/20 border-amber-500'
                      : 'theme-bg-secondary-30 theme-border-input hover-theme-border'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className={CSS.flexGap2}>
                        <span className="text-xl">🔒</span>
                        <span className="font-semibold theme-text-primary">
                          {aiSettings.anonymization?.enabled ? '✓ Ativada' : 'Desativada'}
                        </span>
                      </div>
                      <p className="text-xs theme-text-muted mt-1">
                        {aiSettings.anonymization?.enabled
                          ? 'Dados sensíveis serão removidos do texto antes do envio à IA (CPF, RG, telefones, etc.)'
                          : 'O texto será enviado à IA sem modificações.'
                        }
                      </p>
                    </div>
                    <div className={`w-12 h-6 rounded-full transition-colors relative ${
                      aiSettings.anonymization?.enabled ? 'bg-amber-500' : 'theme-bg-tertiary'
                    }`}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        aiSettings.anonymization?.enabled ? 'translate-x-7' : 'translate-x-1'
                      }`}></div>
                    </div>
                  </div>
                </button>

                {aiSettings.anonymization?.enabled && (
                  <div className="mt-3 p-4 rounded-lg theme-bg-secondary-30 border theme-border-input">
                    <p className="text-xs font-semibold theme-text-muted mb-3">Tipos de dados a anonimizar:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { key: 'cpf', label: 'CPF' },
                        { key: 'rg', label: 'RG' },
                        { key: 'pis', label: 'PIS/PASEP' },
                        { key: 'ctps', label: 'CTPS' },
                        { key: 'telefone', label: 'Telefones' },
                        { key: 'email', label: 'E-mails' },
                        { key: 'contaBancaria', label: 'Dados Bancários' },
                        { key: 'processo', label: 'Nº Processo (CNJ)' },
                        { key: 'valores', label: 'Valores (R$)' },
                        { key: 'nomes', label: 'Nomes das Partes' }
                      ].map(({ key, label }) => (
                        <label key={key} className="flex items-center gap-2 text-xs theme-text-secondary cursor-pointer">
                          <input
                            type="checkbox"
                            checked={(aiSettings.anonymization as unknown as Record<string, boolean | undefined> | null)?.[key] !== false}
                            onChange={(e) => setAiSettings({
                              ...aiSettings,
                              anonymization: { ...aiSettings.anonymization, [key]: e.target.checked }
                            })}
                            className="w-4 h-4 rounded border-gray-500 text-amber-500 focus:ring-amber-500"
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                    <p className="text-xs theme-text-muted mt-3 italic">
                      Valores (R$) está desativado por padrão pois são relevantes para análise de pedidos.
                    </p>

                    {/* IA Local - Detecção de Nomes (NER) */}
                    <div className="border-t theme-border-secondary pt-4 mt-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium theme-text-primary">🧠 Detecção Automática de Nomes</span>
                          <span className="text-xs bg-purple-500/20 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded">IA Local</span>
                        </div>
                        <div
                          className={`toggle-switch ${nerEnabled ? 'active' : ''}`}
                          onClick={async () => {
                            const newVal = !nerEnabled;
                            setNerEnabled(newVal);
                            localStorage.setItem('nerEnabled', JSON.stringify(newVal));
                            if (!newVal && nerModelReady) {
                              await AIModelService.unload('ner');
                              setNerModelReady(false);
                            }
                          }}
                        >
                          <div className="toggle-knob"></div>
                        </div>
                      </div>

                      {nerEnabled && (
                        <div className="theme-bg-tertiary rounded-lg p-3 border theme-border-input">
                          <p className="text-xs theme-text-muted mb-3">
                            Modelo NER multilíngue - baixado automaticamente do HuggingFace (~150MB).
                          </p>
                          <div className="space-y-2 mb-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {nerModelReady ? (
                                  <span className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                                    <Check className="w-4 h-4" />
                                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                                    Pronto
                                  </span>
                                ) : nerInitializing ? (
                                  <span className="flex items-center gap-1.5 text-xs text-blue-400">
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    Baixando modelo... {nerDownloadProgress > 0 && `${nerDownloadProgress}%`}
                                  </span>
                                ) : (
                                  <button
                                    onClick={initNerModel}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-xs font-medium"
                                  >
                                    <Download className="w-3 h-3" />
                                    Baixar Agora (~150MB)
                                  </button>
                                )}
                              </div>
                              {nerModelReady && (
                                <button
                                  onClick={() => AIModelService.unload('ner').then(() => setNerModelReady(false))}
                                  className="text-xs text-red-400 hover:text-red-300"
                                  title="Descarregar modelo da memória"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                            {nerInitializing && nerDownloadProgress > 0 && (
                              <div className="h-1.5 bg-gray-600 rounded-full overflow-hidden">
                                <div className="h-full bg-purple-500 transition-all duration-300" style={{ width: `${nerDownloadProgress}%` }} />
                              </div>
                            )}
                          </div>

                          {/* Toggle para incluir empresas (ORG) */}
                          <div className="pt-3 border-t theme-border-secondary">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <div
                                className={`toggle-switch ${nerIncludeOrg ? 'active' : ''}`}
                                onClick={() => {
                                  const newVal = !nerIncludeOrg;
                                  setNerIncludeOrg(newVal);
                                  localStorage.setItem('nerIncludeOrg', JSON.stringify(newVal));
                                }}
                              >
                                <div className="toggle-knob"></div>
                              </div>
                              <span className="text-xs theme-text-secondary">
                                Incluir empresas (reclamadas)
                              </span>
                            </label>
                            <p className="text-xs theme-text-muted mt-1 ml-10">
                              Detecta nomes de empresas (ORG) com score ≥ 90%. Filtra tribunais e órgãos públicos.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ═══════════════════════════════════════════════════════════════════════════════
              SEÇÃO 10: Base de Dados
              ═══════════════════════════════════════════════════════════════════════════════ */}
          <div className="theme-bg-secondary-50 rounded-lg p-4 border theme-border-input">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-medium theme-text-tertiary">
                📚 Base de Dados
                <span className="text-xs theme-text-muted">
                  ({legislacaoCount} artigos, {jurisprudenciaCount} precedentes)
                </span>
              </label>
              <button
                onClick={async () => {
                  const legNeeded = await EmbeddingsCDNService.needsDataDownload('legislacao');
                  const jurisNeeded = await EmbeddingsCDNService.needsDataDownload('jurisprudencia');
                  setDataDownloadStatus({
                    legislacao: { needed: legNeeded, downloading: false, progress: 0, error: null, completed: false },
                    jurisprudencia: { needed: jurisNeeded, downloading: false, progress: 0, error: null, completed: false }
                  });
                  localStorage.removeItem('dismissedDataPrompt');
                  setShowDataDownloadModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                <Download className="w-3 h-3" /> Baixar/Atualizar
              </button>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════════════════
              SEÇÃO 11: Busca Semântica (E5-base)
              ═══════════════════════════════════════════════════════════════════════════════ */}
          <div className="space-y-4">
            {/* Toggle Master - Controla carregamento do modelo E5 */}
            <div className="theme-bg-secondary-50 rounded-lg p-4 border theme-border-input">
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center gap-2 text-sm font-medium theme-text-tertiary">
                  🧠 IA Local (Busca Semântica)
                  <span className="text-xs bg-blue-500/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded">E5-base</span>
                </label>
                <div
                  className={`toggle-switch ${searchEnabled ? 'active' : ''}`}
                  onClick={() => handleSearchToggle(!searchEnabled)}
                >
                  <div className="toggle-knob"></div>
                </div>
              </div>

              {searchEnabled && (
                <div className="space-y-3">
                  <p className="text-xs theme-text-muted">
                    Modelo E5-base multilingual - baixado automaticamente do HuggingFace na primeira vez (~400MB)
                  </p>

                  <div className="theme-bg-tertiary rounded-lg p-3 border theme-border-input space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {searchModelReady ? (
                          <span className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                            <Check className="w-4 h-4" />
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                            Modelo Pronto
                          </span>
                        ) : searchInitializing ? (
                          <span className="flex items-center gap-1.5 text-xs text-blue-400">
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Baixando modelo... {searchDownloadProgress > 0 && `${searchDownloadProgress}%`}
                          </span>
                        ) : (
                          <button
                            onClick={initSearchModel}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
                          >
                            <Download className="w-3 h-3" />
                            Baixar Agora (~400MB)
                          </button>
                        )}
                      </div>
                      {searchModelReady && (
                        <button
                          onClick={() => AIModelService.unload('search').then(() => setSearchModelReady(false))}
                          className="text-xs text-red-400 hover:text-red-300"
                          title="Descarregar modelo da memória"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    {searchInitializing && searchDownloadProgress > 0 && (
                      <div className="h-1.5 bg-gray-600 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${searchDownloadProgress}%` }} />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Sub-toggles - Só aparecem quando modelo E5 carregado */}
            {searchEnabled && searchModelReady && (
              <div className="space-y-3 pl-4 border-l-2 border-blue-500/30">
                {/* Legislação */}
                <div className="theme-bg-secondary-50 rounded-lg p-4 border theme-border-input">
                  <div className="flex items-center justify-between mb-2">
                    <label className="flex items-center gap-2 text-sm font-medium theme-text-tertiary">
                      📜 Legislação
                      <span className="text-xs theme-text-muted">({embeddingsCount} embeddings)</span>
                    </label>
                    <div className={`toggle-switch ${aiSettings.semanticSearchEnabled ? 'active' : ''}`} onClick={() => handleLegislacaoToggle(!aiSettings.semanticSearchEnabled)}>
                      <div className="toggle-knob"></div>
                    </div>
                  </div>

                  {aiSettings.semanticSearchEnabled && (
                    <div className="space-y-3 pt-2 border-t theme-border-subtle">
                      <div className="flex items-center gap-2 flex-wrap">
                        {embeddingsCount === 0 ? (
                          <button onClick={() => setShowEmbeddingsDownloadModal(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                            <Download className="w-3 h-3" /> Baixar do CDN
                          </button>
                        ) : (
                          <span className="text-xs text-green-500 flex items-center gap-1"><Check className="w-3 h-3" /> Instalado</span>
                        )}
                        {embeddingsCount > 0 && (<button onClick={clearEmbeddings} className="px-2 py-1.5 text-red-500 dark:text-red-400 text-xs"><Trash2 className="w-3 h-3" /></button>)}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs theme-text-muted">Threshold:</span>
                        <input type="range" min="20" max="80" value={aiSettings.semanticThreshold} onChange={(e) => setAiSettings({ ...aiSettings, semanticThreshold: Number(e.target.value) })} className="flex-1 h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer" />
                        <span className="text-xs theme-text-primary w-10 text-right">{aiSettings.semanticThreshold}%</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Jurisprudência */}
                <div className="theme-bg-secondary-50 rounded-lg p-4 border theme-border-input">
                  <div className="flex items-center justify-between mb-2">
                    <label className="flex items-center gap-2 text-sm font-medium theme-text-tertiary">
                      📚 Jurisprudência
                      <span className="text-xs theme-text-muted">({jurisEmbeddingsCount} embeddings)</span>
                    </label>
                    <div className={`toggle-switch ${aiSettings.jurisSemanticEnabled ? 'active' : ''}`} onClick={() => handleJurisToggle(!aiSettings.jurisSemanticEnabled)}>
                      <div className="toggle-knob"></div>
                    </div>
                  </div>

                  {aiSettings.jurisSemanticEnabled && (
                    <div className="space-y-3 pt-2 border-t theme-border-subtle">
                      <div className="flex items-center gap-2 flex-wrap">
                        {jurisEmbeddingsCount === 0 ? (
                          <button onClick={() => setShowEmbeddingsDownloadModal(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                            <Download className="w-3 h-3" /> Baixar do CDN
                          </button>
                        ) : (
                          <span className="text-xs text-green-500 flex items-center gap-1"><Check className="w-3 h-3" /> Instalado</span>
                        )}
                        {jurisEmbeddingsCount > 0 && (<button onClick={clearJurisEmbeddings} className="px-2 py-1.5 text-red-500 dark:text-red-400 text-xs"><Trash2 className="w-3 h-3" /></button>)}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs theme-text-muted">Threshold:</span>
                        <input type="range" min="20" max="80" value={aiSettings.jurisSemanticThreshold} onChange={(e) => setAiSettings({ ...aiSettings, jurisSemanticThreshold: Number(e.target.value) })} className="flex-1 h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer" />
                        <span className="text-xs theme-text-primary w-10 text-right">{aiSettings.jurisSemanticThreshold}%</span>
                      </div>
                      {jurisEmbeddingsCount > 0 && searchModelReady && (
                        <div className="flex items-center justify-between mt-3 pt-3 border-t theme-border-subtle">
                          <label className="text-xs theme-text-muted">🤖 Jurisprudência via IA Local<span className="block opacity-70">Busca semântica nos editores</span></label>
                          <div className={`toggle-switch ${aiSettings.useLocalAIForJuris ? 'active' : ''}`}
                               onClick={() => setAiSettings({ ...aiSettings, useLocalAIForJuris: !aiSettings.useLocalAIForJuris })}>
                            <div className="toggle-knob"></div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Modelos */}
                <div className="theme-bg-secondary-50 rounded-lg p-4 border theme-border-input">
                  <div className="flex items-center justify-between mb-2">
                    <label className="flex items-center gap-2 text-sm font-medium theme-text-tertiary">
                      📦 Modelos
                      <span className="text-xs theme-text-muted">({modelEmbeddingsCount}/{modelsCount})</span>
                    </label>
                    <div className={`toggle-switch ${aiSettings.modelSemanticEnabled ? 'active' : ''}`} onClick={() => handleModelToggle(!aiSettings.modelSemanticEnabled)}>
                      <div className="toggle-knob"></div>
                    </div>
                  </div>

                  {aiSettings.modelSemanticEnabled && (
                    <div className="space-y-3 pt-2 border-t theme-border-subtle">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={generateModelEmbeddings} disabled={generatingModelEmbeddings}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${!generatingModelEmbeddings ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-gray-400 dark:bg-gray-600 text-gray-600 dark:text-gray-400 cursor-not-allowed'}`}>
                          {generatingModelEmbeddings ? (<><RefreshCw className="w-3 h-3 animate-spin" /> Gerando... {modelEmbeddingsProgress.current}/{modelEmbeddingsProgress.total}</>) : (<><Sparkles className="w-3 h-3" /> Gerar Embeddings</>)}
                        </button>
                        {modelEmbeddingsCount > 0 && (<button onClick={clearModelEmbeddings} className="px-2 py-1.5 text-red-500 dark:text-red-400 text-xs"><Trash2 className="w-3 h-3" /></button>)}
                      </div>
                      {generatingModelEmbeddings && modelEmbeddingsProgress.total > 0 && (
                        <div className="h-1.5 bg-gray-600 rounded-full overflow-hidden">
                          <div className="h-full bg-purple-500 transition-all duration-300" style={{ width: `${(modelEmbeddingsProgress.current / modelEmbeddingsProgress.total) * 100}%` }} />
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        <span className="text-xs theme-text-muted">Threshold:</span>
                        <input type="range" min="20" max="80" value={aiSettings.modelSemanticThreshold} onChange={(e) => setAiSettings({ ...aiSettings, modelSemanticThreshold: Number(e.target.value) })} className="flex-1 h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer" />
                        <span className="text-xs theme-text-primary w-10 text-right">{aiSettings.modelSemanticThreshold}%</span>
                      </div>
                      {modelEmbeddingsCount > 0 && searchModelReady && (
                        <div className="flex items-center justify-between mt-3 pt-3 border-t theme-border-subtle">
                          <label className="text-xs theme-text-muted">🤖 Sugestões via IA Local<span className="block opacity-70">Busca semântica instantânea</span></label>
                          <div className={`toggle-switch ${aiSettings.useLocalAIForSuggestions ? 'active' : ''}`}
                               onClick={() => setAiSettings({ ...aiSettings, useLocalAIForSuggestions: !aiSettings.useLocalAIForSuggestions })}>
                            <div className="toggle-knob"></div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ═══════════════════════════════════════════════════════════════════════════════
              SEÇÃO 12-15: Modelos customizados
              ═══════════════════════════════════════════════════════════════════════════════ */}
          {/* Modelo de Mini-Relatório */}
          <div>
            <label className="block text-sm font-medium theme-text-tertiary mb-3">
              Modelo de Mini-Relatório (Opcional)
            </label>
            <div className="space-y-3">
              <textarea
                value={aiSettings.modeloRelatorio || ''}
                onChange={(e) => setAiSettings({ ...aiSettings, modeloRelatorio: e.target.value })}
                placeholder="Ex: O reclamante sustenta que [fatos]. Alega [argumentos]. Requer [pedido]. A reclamada, por sua vez, defende que [argumentos da defesa]."
                className="w-full h-32 theme-bg-secondary-50 border-2 theme-border-input rounded-lg p-3 theme-text-primary text-sm focus:border-blue-500 focus:outline-none resize-none"
              />
              <button
                onClick={() => openModelGenerator('modeloRelatorio')}
                className="flex items-center gap-2 px-3 py-1.5 text-xs bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded-lg transition-colors"
              >
                <Wand2 className="w-3.5 h-3.5" />
                Gerar a partir de exemplos
              </button>
              <p className="text-xs theme-text-muted flex items-start gap-2">
                <FileText className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-400" />
                <span>
                  Defina um modelo personalizado para os mini-relatórios gerados automaticamente.
                  Se deixar vazio, será usado o modelo padrão do sistema.
                </span>
              </p>
              {aiSettings.modeloRelatorio && (
                <div className="flex items-center justify-between bg-green-900/20 border border-green-500/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-xs theme-text-green">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    Modelo personalizado ativo ({aiSettings.modeloRelatorio.length} caracteres)
                  </div>
                  <button
                    onClick={() => setAiSettings({ ...aiSettings, modeloRelatorio: '' })}
                    className="text-xs text-red-400 hover:text-red-300 underline"
                  >
                    Limpar
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Modelo de Dispositivo */}
          <div>
            <label className="block text-sm font-medium theme-text-tertiary mb-3">
              Modelo de Dispositivo (Opcional)
            </label>
            <div className="space-y-3">
              <textarea
                value={aiSettings.modeloDispositivo || ''}
                onChange={(e) => setAiSettings({ ...aiSettings, modeloDispositivo: e.target.value })}
                placeholder="Ex: Ante o exposto, DECIDO: a) Julgar [resultado] o pedido de [tópico]; b) Deferir/Indeferir [especificação]..."
                className="w-full h-32 theme-bg-secondary-50 border-2 theme-border-input rounded-lg p-3 theme-text-primary text-sm focus:border-blue-500 focus:outline-none resize-none"
              />
              <button
                onClick={() => openModelGenerator('modeloDispositivo')}
                className="flex items-center gap-2 px-3 py-1.5 text-xs bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded-lg transition-colors"
              >
                <Wand2 className="w-3.5 h-3.5" />
                Gerar a partir de exemplos
              </button>
              <p className="text-xs theme-text-muted flex items-start gap-2">
                <Scale className="w-4 h-4 flex-shrink-0 mt-0.5 text-purple-400" />
                <span>
                  Defina um modelo personalizado para o dispositivo da sentença.
                  Se deixar vazio, será usado o modelo padrão do sistema.
                </span>
              </p>
              {aiSettings.modeloDispositivo && (
                <div className="flex items-center justify-between bg-green-900/20 border border-green-500/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-xs theme-text-green">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    Modelo personalizado ativo ({aiSettings.modeloDispositivo.length} caracteres)
                  </div>
                  <button
                    onClick={() => setAiSettings({ ...aiSettings, modeloDispositivo: '' })}
                    className="text-xs text-red-400 hover:text-red-300 underline"
                  >
                    Limpar
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Modelo do Tópico RELATÓRIO */}
          <div>
            <label className="block text-sm font-medium theme-text-tertiary mb-3">
              Modelo do Tópico RELATÓRIO (Opcional)
            </label>
            <div className="space-y-3">
              <textarea
                value={aiSettings.modeloTopicoRelatorio || ''}
                onChange={(e) => setAiSettings({ ...aiSettings, modeloTopicoRelatorio: e.target.value })}
                placeholder='Ex: A presente reclamação foi ajuizada em [data]. Realizou-se audiência em [data]. Foram juntados [documentos]. O processo encontra-se [situação].'
                className="w-full h-32 theme-bg-secondary-50 border-2 theme-border-input rounded-lg p-3 theme-text-primary text-sm focus:border-blue-500 focus:outline-none resize-none"
              />
              <button
                onClick={() => openModelGenerator('modeloTopicoRelatorio')}
                className="flex items-center gap-2 px-3 py-1.5 text-xs bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded-lg transition-colors"
              >
                <Wand2 className="w-3.5 h-3.5" />
                Gerar a partir de exemplos
              </button>
              <p className="text-xs theme-text-muted flex items-start gap-2">
                <BookOpen className="w-4 h-4 flex-shrink-0 mt-0.5 text-green-400" />
                <span>
                  Defina um modelo personalizado para o tópico especial "RELATÓRIO" que resume o histórico processual.
                  Se deixar vazio, será usado o modelo padrão do sistema.
                </span>
              </p>
              {aiSettings.modeloTopicoRelatorio && (
                <div className="flex items-center justify-between bg-green-900/20 border border-green-500/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-xs theme-text-green">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    Modelo personalizado ativo ({aiSettings.modeloTopicoRelatorio.length} caracteres)
                  </div>
                  <button
                    onClick={() => setAiSettings({ ...aiSettings, modeloTopicoRelatorio: '' })}
                    className="text-xs text-red-400 hover:text-red-300 underline"
                  >
                    Limpar
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Estilo de Redação Personalizado */}
          <div>
            <label className="block text-sm font-medium theme-text-tertiary mb-3">
              Estilo de Redação Personalizado (Opcional)
            </label>
            <div className="space-y-3">
              <textarea
                value={aiSettings.customPrompt || ''}
                onChange={(e) => setAiSettings({ ...aiSettings, customPrompt: e.target.value })}
                placeholder="Ex: Use linguagem mais coloquial, evite termos técnicos em excesso, seja mais direto e objetivo, etc."
                className="w-full h-32 theme-bg-secondary-50 border-2 theme-border-input rounded-lg p-3 theme-text-primary text-sm focus:border-blue-500 focus:outline-none resize-none"
              />
              <button
                onClick={() => openModelGenerator('estiloRedacao')}
                className="flex items-center gap-2 px-3 py-1.5 text-xs bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded-lg transition-colors"
              >
                <Wand2 className="w-3.5 h-3.5" />
                Gerar a partir de exemplos
              </button>
              <p className="text-xs theme-text-muted flex items-start gap-2">
                <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5 text-purple-400" />
                <span>
                  Defina instruções adicionais para personalizar o estilo de redação da IA.
                  Estas instruções SUBSTITUEM o estilo padrão do sistema, permitindo personalização completa.
                </span>
              </p>
              {aiSettings.customPrompt && (
                <div className="flex items-center justify-between bg-green-900/20 border border-green-500/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-xs theme-text-green">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    Estilo personalizado ativo ({aiSettings.customPrompt.length} caracteres)
                  </div>
                  <button
                    onClick={() => setAiSettings({ ...aiSettings, customPrompt: '' })}
                    className="text-xs text-red-400 hover:text-red-300 underline"
                  >
                    Limpar
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════════════════
              SEÇÃO 16: Prompts Rápidos
              ═══════════════════════════════════════════════════════════════════════════════ */}
          <div className="mt-6">
            <label className="block text-sm font-medium theme-text-tertiary mb-3">
              ⚡ Prompts Rápidos
            </label>
            <p className="text-xs theme-text-muted mb-3">
              Atalhos para perguntas frequentes ao assistente IA. Clique para enviar instantaneamente.
            </p>
            <div className="space-y-2 mb-3">
              {(aiSettings.quickPrompts || []).map((qp: QuickPrompt, idx: number) => (
                <div key={qp.id} className="flex items-start gap-2 p-2 theme-bg-secondary rounded-lg">
                  <input
                    value={qp.icon}
                    onChange={(e) => {
                      const updated = [...aiSettings.quickPrompts];
                      updated[idx] = { ...updated[idx], icon: e.target.value };
                      setAiSettings({ ...aiSettings, quickPrompts: updated });
                    }}
                    disabled={qp.isDefault}
                    className={`w-10 text-center theme-bg-app border theme-border-input rounded p-1 text-sm ${qp.isDefault ? 'opacity-60 cursor-not-allowed' : ''}`}
                    maxLength={2}
                    placeholder="📝"
                  />
                  <input
                    value={qp.label}
                    onChange={(e) => {
                      const updated = [...aiSettings.quickPrompts];
                      updated[idx] = { ...updated[idx], label: e.target.value };
                      setAiSettings({ ...aiSettings, quickPrompts: updated });
                    }}
                    disabled={qp.isDefault}
                    className={`w-28 theme-bg-app border theme-border-input rounded p-1 text-sm ${qp.isDefault ? 'opacity-60 cursor-not-allowed' : ''}`}
                    placeholder="Nome"
                  />
                  {qp.specialHandler ? (
                    <div className="flex-1 theme-bg-app border theme-border-input rounded p-2 text-xs theme-text-muted italic flex items-center">
                      ⚙️ Prompt com lógica especial (sub-opções)
                    </div>
                  ) : (
                    <textarea
                      value={qp.prompt}
                      onChange={(e) => {
                        const updated = [...aiSettings.quickPrompts];
                        updated[idx] = { ...updated[idx], prompt: e.target.value };
                        setAiSettings({ ...aiSettings, quickPrompts: updated });
                      }}
                      disabled={qp.isDefault}
                      className={`flex-1 theme-bg-app border theme-border-input rounded p-1 text-xs resize-none ${qp.isDefault ? 'opacity-60 cursor-not-allowed' : ''}`}
                      rows={2}
                      placeholder="Texto do prompt..."
                    />
                  )}
                  {qp.isDefault ? (
                    <span className="p-1 text-xs theme-text-muted" title="Prompt padrão do sistema (protegido)">
                      🔒
                    </span>
                  ) : (
                    <button
                      onClick={() => {
                        const updated = aiSettings.quickPrompts.filter((_: QuickPrompt, i: number) => i !== idx);
                        setAiSettings({ ...aiSettings, quickPrompts: updated });
                      }}
                      className="p-1 text-red-500 hover:text-red-400"
                      title="Remover"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={() => {
                const newPrompt: QuickPrompt = {
                  id: `qp-${Date.now()}`,
                  label: '',
                  prompt: '',
                  icon: '📝'
                };
                const updated = [...(aiSettings.quickPrompts || []), newPrompt];
                setAiSettings({ ...aiSettings, quickPrompts: updated });
              }}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700"
            >
              + Adicionar Prompt Rápido
            </button>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════════════════
              SEÇÃO 17: Uso de Tokens
              ═══════════════════════════════════════════════════════════════════════════════ */}
          {(() => {
            const metrics = tokenMetrics || {};
            const totalTokens = (metrics.totalInput || 0) + (metrics.totalOutput || 0) +
                                (metrics.totalCacheRead || 0) + (metrics.totalCacheCreation || 0);
            const cacheRate = totalTokens > 0
              ? Math.round(((metrics.totalCacheRead || 0) / totalTokens) * 100)
              : 0;
            const formatNumber = (n: number) => {
              if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
              if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
              return (n || 0).toString();
            };
            const calculateCost = (m: typeof metrics, prices: { input: number; cacheWrite: number; cacheRead: number; output: number }) => {
              const inputCost = ((m.totalInput || 0) / 1000000) * prices.input;
              const cacheWriteCost = ((m.totalCacheCreation || 0) / 1000000) * prices.cacheWrite;
              const cacheReadCost = ((m.totalCacheRead || 0) / 1000000) * prices.cacheRead;
              const outputCost = ((m.totalOutput || 0) / 1000000) * prices.output;
              return inputCost + cacheWriteCost + cacheReadCost + outputCost;
            };
            const sonnetPrices = { input: 3.00, output: 15.00, cacheWrite: 3.75, cacheRead: 0.30 };
            const opusPrices = { input: 5.00, output: 25.00, cacheWrite: 6.25, cacheRead: 0.50 };
            const geminiPrices = { input: 2.00, output: 12.00, cacheWrite: 2.50, cacheRead: 0.20 };
            const geminiFlashPrices = { input: 0.50, output: 3.00, cacheWrite: 0.625, cacheRead: 0.05 };
            const openaiPrices = { input: 1.75, output: 14.00, cacheWrite: 1.75, cacheRead: 0.175 };
            const grokPrices = { input: 0.20, output: 0.50, cacheWrite: 0.20, cacheRead: 0.05 };

            return (
              <div className="border-t theme-border-secondary pt-4 mt-4">
                <label className="block text-sm font-medium theme-text-tertiary mb-3">
                  📊 Uso de Tokens (Projeto Atual)
                </label>

                {(metrics.requestCount ?? 0) > 0 ? (
                  <div className="theme-bg-secondary-30 rounded-lg p-4 border theme-border-input space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="theme-text-secondary text-sm">Total de Tokens:</span>
                      <span className="font-mono font-semibold theme-text-primary">{formatNumber(totalTokens)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="theme-text-secondary text-sm">Requisições:</span>
                      <span className="font-mono theme-text-primary">{metrics.requestCount}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="theme-text-secondary text-sm">Taxa de Cache:</span>
                      <span className="font-mono text-green-400">{cacheRate}%</span>
                    </div>

                    <div className="border-t theme-border-secondary pt-3 mt-3 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="theme-text-muted">📥 Input:</span>
                        <span className="font-mono theme-text-secondary">{formatNumber(metrics.totalInput ?? 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="theme-text-muted">📤 Output:</span>
                        <span className="font-mono theme-text-secondary">{formatNumber(metrics.totalOutput ?? 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-400">💾 Cache Read:</span>
                        <span className="font-mono text-green-400">{formatNumber(metrics.totalCacheRead ?? 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-yellow-400">🆕 Cache Write:</span>
                        <span className="font-mono text-yellow-400">{formatNumber(metrics.totalCacheCreation ?? 0)}</span>
                      </div>
                    </div>

                    <div className="border-t theme-border-secondary pt-3 mt-3 space-y-2">
                      <span className="theme-text-secondary text-sm block mb-2">💰 Custo Estimado:</span>
                      <div className="flex justify-between items-center">
                        <span className="text-xs theme-text-muted">Sonnet 4/4.5:</span>
                        <span className="font-mono text-sm text-blue-400">${calculateCost(metrics, sonnetPrices).toFixed(4)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs theme-text-muted">Opus 4.5:</span>
                        <span className="font-mono text-sm text-purple-400">${calculateCost(metrics, opusPrices).toFixed(4)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs theme-text-muted">Gemini 3 Pro:</span>
                        <span className="font-mono text-sm text-emerald-400">${calculateCost(metrics, geminiPrices).toFixed(4)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs theme-text-muted">Gemini 3 Flash:</span>
                        <span className="font-mono text-sm text-cyan-400">${calculateCost(metrics, geminiFlashPrices).toFixed(4)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs theme-text-muted">OpenAI GPT-5.2:</span>
                        <span className="font-mono text-sm text-green-400">${calculateCost(metrics, openaiPrices).toFixed(4)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs theme-text-muted">Grok 4.1 Fast:</span>
                        <span className="font-mono text-sm text-gray-400">${calculateCost(metrics, grokPrices).toFixed(4)}</span>
                      </div>
                    </div>

                    {/* v1.37.91: Breakdown por modelo */}
                    {metrics.byModel && Object.keys(metrics.byModel).length > 0 && (
                      <div className="border-t theme-border-secondary pt-3 mt-3">
                        <span className="theme-text-secondary text-sm block mb-2">📋 Detalhes por Modelo:</span>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {Object.entries(metrics.byModel)
                            .sort((a, b) => (b[1].input + b[1].output) - (a[1].input + a[1].output))
                            .map(([modelId, modelMetrics]) => {
                              // Calcular custo real baseado no provider
                              const providerPrices = {
                                claude: sonnetPrices,
                                gemini: geminiFlashPrices,
                                openai: openaiPrices,
                                grok: grokPrices
                              }[modelMetrics.provider] || sonnetPrices;
                              const modelCost = ((modelMetrics.input / 1000000) * providerPrices.input) +
                                              ((modelMetrics.output / 1000000) * providerPrices.output) +
                                              ((modelMetrics.cacheRead / 1000000) * providerPrices.cacheRead) +
                                              ((modelMetrics.cacheCreation / 1000000) * providerPrices.cacheWrite);
                              const providerColors = {
                                claude: 'text-orange-400',
                                gemini: 'text-blue-400',
                                openai: 'text-green-400',
                                grok: 'text-gray-400'
                              };
                              const colorClass = providerColors[modelMetrics.provider] || 'theme-text-secondary';
                              return (
                                <div key={modelId} className="theme-bg-primary-50 rounded p-2 text-xs">
                                  <div className="flex justify-between items-center mb-1">
                                    <span className={`font-medium truncate max-w-[180px] ${colorClass}`} title={modelId}>
                                      {modelId.replace(/-\d{8}$/, '')}
                                    </span>
                                    <span className="font-mono text-yellow-400">${modelCost.toFixed(4)}</span>
                                  </div>
                                  <div className="flex justify-between text-xs theme-text-muted">
                                    <span>📥 {formatNumber(modelMetrics.input)} | 📤 {formatNumber(modelMetrics.output)}</span>
                                    <span>{modelMetrics.requestCount} req</span>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                        {/* Custo Total Real */}
                        <div className="flex justify-between items-center mt-3 pt-2 border-t theme-border-secondary">
                          <span className="font-medium theme-text-primary text-sm">💵 Custo Total Real:</span>
                          <span className="font-mono font-bold text-yellow-400">
                            ${Object.values(metrics.byModel).reduce((acc, m) => {
                              const prices = {
                                claude: sonnetPrices,
                                gemini: geminiFlashPrices,
                                openai: openaiPrices,
                                grok: grokPrices
                              }[m.provider] || sonnetPrices;
                              return acc +
                                ((m.input / 1000000) * prices.input) +
                                ((m.output / 1000000) * prices.output) +
                                ((m.cacheRead / 1000000) * prices.cacheRead) +
                                ((m.cacheCreation / 1000000) * prices.cacheWrite);
                            }, 0).toFixed(4)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="theme-text-muted text-sm">Nenhuma requisição realizada ainda neste projeto.</p>
                )}
              </div>
            );
          })()}

          {/* ═══════════════════════════════════════════════════════════════════════════════
              SEÇÃO 18: Tópicos Complementares Automáticos
              ═══════════════════════════════════════════════════════════════════════════════ */}
          <div>
            <label className="block text-sm font-medium theme-text-tertiary mb-3">
              📋 Tópicos Complementares Automáticos
            </label>
            <div className="theme-bg-secondary-30 rounded-lg p-4 border theme-border-input">
              <p className="text-xs theme-text-muted mb-3">
                Tópicos que serão adicionados automaticamente ao final da análise de documentos (não selecionados por padrão).
                <br />
                <span className="text-blue-400">💡 Dica: Arraste os tópicos para reordená-los</span>
              </p>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {(aiSettings.topicosComplementares || []).map((topico: TopicoComplementar, idx: number) => (
                  <div
                    key={topico.id}
                    draggable
                    onDragStart={(e) => handleComplementaryDragStart(e, idx)}
                    onDragEnd={handleComplementaryDragEnd}
                    onDragOver={(e) => handleComplementaryDragOver(e, idx)}
                    onDragLeave={handleComplementaryDragLeave}
                    onDrop={(e) => handleComplementaryDrop(e, idx)}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-move ${
                      topico.enabled
                        ? 'theme-bg-tertiary-30 theme-border'
                        : 'theme-bg-secondary/20 theme-border-input opacity-60'
                    } ${
                      draggedComplementaryIndex === idx
                        ? 'opacity-50 border-blue-500'
                        : ''
                    } ${
                      dragOverComplementaryIndex === idx
                        ? 'border-green-500 border-2 scale-105'
                        : ''
                    }`}
                  >
                    <div className="cursor-grab active:cursor-grabbing theme-text-disabled hover:theme-text-tertiary transition-colors" title="Arrastar para reordenar">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z"></path>
                      </svg>
                    </div>
                    <input
                      type="checkbox"
                      checked={topico.enabled}
                      onChange={(e) => {
                        const updated = [...(aiSettings.topicosComplementares || [])];
                        updated[idx] = { ...updated[idx], enabled: e.target.checked };
                        setAiSettings({ ...aiSettings, topicosComplementares: updated });
                      }}
                      className="w-4 h-4 rounded theme-border text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm theme-text-primary font-medium truncate">{topico.title}</div>
                      <div className={CSS.textMuted}>{topico.category}</div>
                    </div>
                    <button
                      onClick={() => {
                        const updated = (aiSettings.topicosComplementares || []).filter((_: TopicoComplementar, i: number) => i !== idx);
                        setAiSettings({ ...aiSettings, topicosComplementares: updated });
                      }}
                      className="text-red-400 hover:text-red-300 transition-colors p-1"
                      title="Remover tópico"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {(aiSettings.topicosComplementares || []).length === 0 && (
                <p className="text-xs theme-text-disabled text-center py-4">
                  Nenhum tópico complementar configurado
                </p>
              )}

              <div className="mt-3 pt-3 border-t theme-border-input">
                <p className="text-xs theme-text-muted mb-2">Adicionar novo tópico:</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Título do tópico..."
                    id="newComplementaryTitle"
                    className="flex-1 px-3 py-2 theme-bg-primary border theme-border-input rounded text-sm theme-text-primary theme-placeholder focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <select
                    id="newComplementaryCategory"
                    defaultValue="MÉRITO"
                    className="px-3 py-2 theme-bg-primary border theme-border-input rounded text-sm theme-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="PRELIMINAR">Preliminar</option>
                    <option value="MÉRITO">Mérito</option>
                    <option value="PEDIDOS">Pedidos</option>
                    <option value="OUTROS">Outros</option>
                  </select>
                  <button
                    onClick={() => {
                      const titleInput = document.getElementById('newComplementaryTitle') as HTMLInputElement | null;
                      const categorySelect = document.getElementById('newComplementaryCategory') as HTMLSelectElement | null;
                      const title = titleInput?.value.trim();

                      if (title && titleInput && categorySelect) {
                        const complementares = aiSettings.topicosComplementares || [];
                        const newId = Math.max(0, ...complementares.map((t: TopicoComplementar) => t.id)) + 1;
                        const newOrdem = complementares.length + 1;
                        const newTopico: TopicoComplementar = {
                          id: newId,
                          title: title,
                          category: categorySelect.value as TopicCategory,
                          enabled: true,
                          ordem: newOrdem
                        };

                        setAiSettings({
                          ...aiSettings,
                          topicosComplementares: [...complementares, newTopico]
                        });

                        titleInput.value = '';
                        showToast('Tópico complementar adicionado!', 'success');
                      } else {
                        showToast('Digite um título para o tópico', 'error');
                      }
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Footer fixo com botões */}
        <div className="p-6 border-t theme-border-secondary space-y-4">
          {/* Botões de Exportar/Importar Configurações */}
          <div className="flex gap-3">
            <button
              onClick={exportAiSettings}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover-green-700 transition-colors text-sm font-medium"
            >
              <Download className="w-4 h-4" />
              Exportar Configurações
            </button>
            <label className="flex-1">
              <input
                type="file"
                accept=".json"
                onChange={importAiSettings}
                className="hidden"
              />
              <div className="flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 rounded-lg hover-amber-700 transition-colors text-sm font-medium cursor-pointer">
                <Upload className="w-4 h-4" />
                Importar Configurações
              </div>
            </label>
          </div>

          <div className="flex justify-between items-center">
            <div className="text-xs theme-text-muted space-y-1">
              <div>
                Modelo atual: <span className="theme-text-secondary font-medium">
                  {aiSettings.provider === 'gemini'
                    ? getModelDisplayName(aiSettings.geminiModel || '')
                    : aiSettings.provider === 'openai'
                    ? getModelDisplayName(aiSettings.openaiModel || 'gpt-5.2-chat-latest')
                    : aiSettings.provider === 'grok'
                    ? getModelDisplayName(aiSettings.grokModel || 'grok-4-1-fast-reasoning')
                    : getModelDisplayName(aiSettings.claudeModel || aiSettings.model || '')}
                </span>
                {aiSettings.useExtendedThinking && <span className="ml-2 text-purple-400">• Pensamento prolongado ativo</span>}
                {aiSettings.provider === 'gemini' && aiSettings.geminiThinkingLevel && (
                  <span className="ml-2 text-blue-400">• Thinking: {aiSettings.geminiThinkingLevel}</span>
                )}
              </div>
              {aiSettings.customPrompt && (
                <div className="flex items-center gap-2 text-green-400">
                  <Sparkles className="w-3 h-3" />
                  <span>Estilo personalizado configurado</span>
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover-blue-700 transition-colors font-medium"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigModal;
