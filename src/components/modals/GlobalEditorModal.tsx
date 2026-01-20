/**
 * @file GlobalEditorModal.tsx
 * @description Modal de edição global da sentença - permite editar todos os topicos em uma unica interface
 * @version 1.38.16
 *
 * Extraido do App.tsx (linhas 361-1930) como parte da refatoracao de componentes.
 * Este componente gerencia a edição em tela cheia de todos os tópicos selecionados,
 * com suporte a sugestoes de modelos, assistente IA, jurisprudencia e confronto de fatos.
 *
 * v1.38.16: Toggle "Incluir petições e contestações" persistido por tópico (IndexedDB)
 */

import React from 'react';
import { Edit, X, Save, Loader2, Search, BookOpen, Scale, AlertCircle } from 'lucide-react';

// Hooks
import { useChatAssistant, useFieldVersioning, searchModelsInLibrary } from '../../hooks';
import useFactsComparisonCache from '../../hooks/useFactsComparisonCache';
import useChatHistoryCache from '../../hooks/useChatHistoryCache';

// Components
import { GlobalEditorSection } from '../editors/GlobalEditorSection';
import { SuggestionCard } from '../cards/SuggestionCard';
import { SpacingDropdown } from '../ui/SpacingDropdown';
import { FontSizeDropdown } from '../ui/FontSizeDropdown';
import { BaseModal } from './BaseModal';
import { AIAssistantGlobalModal } from '../ai/AIAssistantComponents';
import { LinkedProofsModal } from './MiscModals';
import { JurisprudenciaModal } from './JurisprudenciaModal';
import { FactsComparisonModalContent } from '../FactsComparisonModal';

// Types
import type {
  GlobalEditorModalProps,
  Topic,
  TopicCategory,
  TopicResultado,
  Model,
  ProgressState,
  FactsComparisonSource,
  FactsComparisonResult,
  InsertMode,
  AIMessageContent,
  AIDocumentContent,
  Proof,
  ProofFile,
  ProofText,
  PastedText,
  ContextScope
} from '../../types';

// Utils
import { normalizeHTMLSpacing } from '../../utils/text';
import { prepareDocumentsContext, prepareProofsContext, prepareOralProofsContext } from '../../utils/context-helpers';

// Prompts
import { AI_PROMPTS, INSTRUCAO_NAO_PRESUMIR } from '../../prompts';
import {
  buildMiniRelatorioComparisonPrompt,
  buildDocumentosComparisonPrompt,
  buildPdfComparisonPrompt
} from '../../prompts/facts-comparison-prompts';

// ═══════════════════════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════════════════════

/** Tempo de debounce para auto-save (ms) */
const AUTO_SAVE_DEBOUNCE_MS = 5000;

// ═══════════════════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════════════════

/**
 * Modal de edição global da sentença
 *
 * Permite editar todos os tópicos selecionados em uma única interface,
 * com suporte a:
 * - Sugestões automáticas de modelos
 * - Busca manual de modelos (textual e semântica)
 * - Assistente IA interativo
 * - Jurisprudência contextual
 * - Confronto de fatos (petição vs contestação)
 *
 * @param props - Props do componente (GlobalEditorModalProps)
 */
const GlobalEditorModal: React.FC<GlobalEditorModalProps> = ({
  isOpen,
  onClose,
  selectedTopics,
  setSelectedTopics,
  setExtractedTopics,
  models,
  findSuggestions,
  sanitizeHTML,
  showToast,
  fontSize = 'normal',
  spacing = 'normal',
  setFontSize = null,
  setSpacing = null,
  editorTheme = 'dark',
  quillReady = false,
  quillError = null,
  modelPreview = null,
  analyzedDocuments = {},
  proofManager = null,
  aiIntegration = null,
  detectResultadoAutomatico = null,
  onSlashCommand = null,
  fileToBase64 = null,
  openModal = null,
  closeModal = null,
  useLocalAIForSuggestions = false,
  useLocalAIForJuris = false,
  jurisSemanticThreshold = 50,
  searchModelReady = false,
  jurisEmbeddingsCount = 0,
  searchModelsBySimilarity = null,
  modelSemanticEnabled = false
}) => {
  // Estado local para os tópicos (cópia para edição)
  const [localTopics, setLocalTopics] = React.useState<Topic[]>([]);
  const [isDirty, setIsDirty] = React.useState(false);
  const [originalTopics, setOriginalTopics] = React.useState<Topic[]>([]);

  // Estados para sugestoes de modelos - v1.12.2: inicia true para sugestoes funcionarem na primeira abertura
  const [isSplitMode, setIsSplitMode] = React.useState(true);
  const [splitPosition, setSplitPosition] = React.useState(80); // v1.13: 80/20 por padrao
  const [currentFocusedTopic, setCurrentFocusedTopic] = React.useState<{ title: string; category: TopicCategory; relatorio: string; index: number } | null>(null);
  const isSavingRef = React.useRef(false); // Indica quando salvando para evitar reset de sugestoes
  const wasOpenRef = React.useRef(false); // Track se modal ja estava aberto (evita reset no Ctrl+S)
  const [suggestions, setSuggestions] = React.useState<Model[]>([]);
  const [suggestionsSource, setSuggestionsSource] = React.useState<string | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = React.useState(false);

  // Estados para busca manual de modelos - v1.12.12
  const [globalManualSearchTerm, setGlobalManualSearchTerm] = React.useState('');
  const [globalManualSearchResults, setGlobalManualSearchResults] = React.useState<Model[]>([]);

  // v1.33.19: Estados para busca semantica na busca manual do editor global
  // v1.33.20: Inicializa com modelSemanticEnabled (respeitando config IA)
  const [useGlobalSemanticSearch, setUseGlobalSemanticSearch] = React.useState(modelSemanticEnabled);
  const [globalSemanticSearching, setGlobalSemanticSearching] = React.useState(false);

  // Estados para modais de confirmacao
  const [showCancelConfirm, setShowCancelConfirm] = React.useState(false);

  // Estado para secoes colapsadas - iniciar todas colapsadas
  const [collapsedSections, setCollapsedSections] = React.useState<Record<string, boolean>>({});

  // Estados para deteccao automatica de resultado ao salvar - v1.13
  const [editedTopicTitles, setEditedTopicTitles] = React.useState(new Set());
  const [isAnalyzingResults, setIsAnalyzingResults] = React.useState(false);
  const [analyzingProgress, setAnalyzingProgress] = React.useState<ProgressState>({ current: 0, total: 0 });

  // Estados para modal de provas vinculadas - v1.12.14
  const [showProofsModal, setShowProofsModal] = React.useState(false);
  const [proofsModalTopicIndex, setProofsModalTopicIndex] = React.useState<number | null>(null);

  const [showAIAssistant, setShowAIAssistant] = React.useState(false);
  const [aiAssistantTopicIndex, setAiAssistantTopicIndex] = React.useState<number | null>(null);
  const [globalAiInstruction, setGlobalAiInstruction] = React.useState('');
  const [globalAiGeneratedText, setGlobalAiGeneratedText] = React.useState('');
  const [generatingGlobalAi, setGeneratingGlobalAi] = React.useState(false);
  const [globalContextScope, setGlobalContextScope] = React.useState<ContextScope>('current'); // v1.38.12: 'current' | 'selected' | 'all'
  // v1.38.16: Toggle de documentos persistido por tópico
  const [globalIncludeMainDocs, setGlobalIncludeMainDocsState] = React.useState(true);

  // v1.37.92: Cache de histórico de chat por tópico
  const chatHistoryCache = useChatHistoryCache();

  // v1.19.0: Chat interativo do assistente IA (Global)
  // v1.37.92: Adiciona persistência de chat por tópico
  // v1.37.95: isOpen força reload ao abrir (sincroniza após clear em outro editor)
  const currentTopicTitle = aiAssistantTopicIndex !== null ? localTopics[aiAssistantTopicIndex]?.title : undefined;
  const chatAssistantGlobal = useChatAssistant(aiIntegration, {
    topicTitle: currentTopicTitle,
    isOpen: showAIAssistant,
    saveChat: chatHistoryCache.saveChat,
    getChat: chatHistoryCache.getChat,
    deleteChat: chatHistoryCache.deleteChat
  });

  // v1.24: Versionamento de campos
  const fieldVersioning = useFieldVersioning();

  // v1.20.0: Jurisprudencia contextual (usa componente JurisprudenciaModal)
  const [showJurisModal, setShowJurisModal] = React.useState(false);
  const [jurisTopicIndex, setJurisTopicIndex] = React.useState<number | null>(null);

  // v1.36.12: Confronto de Fatos (Inicial vs Contestacao)
  const [showFactsComparison, setShowFactsComparison] = React.useState(false);
  const [factsComparisonTopicIndex, setFactsComparisonTopicIndex] = React.useState<number | null>(null);
  const [factsComparisonResult, setFactsComparisonResult] = React.useState<FactsComparisonResult | null>(null);
  const [generatingFactsComparison, setGeneratingFactsComparison] = React.useState(false);
  const [factsComparisonError, setFactsComparisonError] = React.useState<string | null>(null);
  const factsComparisonCache = useFactsComparisonCache();

  // Ref para o container (drag do divisor)
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const prevIsSplitModeRef = React.useRef<boolean>(isSplitMode);
  const isSplitModeRef = React.useRef<boolean>(isSplitMode);
  // v1.13.8: Ref para auto-save debounced no Editor Global
  const globalAutoSaveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    isSplitModeRef.current = isSplitMode;
  }, [isSplitMode]);

  // v1.19.2: Registrar listener para sincronizar sugestoes quando modelo e editado
  React.useEffect(() => {
    if (modelPreview && isOpen) {
      modelPreview.onModelUpdatedRef.current = (updatedModel: Model) => {
        setSuggestions(prev => prev.map(s => s.id === updatedModel.id ? updatedModel : s));
        setGlobalManualSearchResults(prev => prev.map(s => s.id === updatedModel.id ? updatedModel : s));
      };
    }
    return () => {
      if (modelPreview) {
        modelPreview.onModelUpdatedRef.current = null;
      }
    };
  }, [modelPreview, isOpen]);

  // Funcao de busca manual debounced - v1.12.13: Usa helper reutilizavel
  const debouncedGlobalManualSearch = React.useMemo(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    return (term: string) => {
      if (timeoutId) clearTimeout(timeoutId);
      if (!term.trim()) {
        setGlobalManualSearchResults([]);
        return;
      }
      timeoutId = setTimeout(() => {
        const results = searchModelsInLibrary(models || [], term);
        setGlobalManualSearchResults(results);
      }, 300);
    };
  }, [models]);

  // v1.33.19: useEffect para busca semantica na busca manual do editor global
  React.useEffect(() => {
    if (!useGlobalSemanticSearch || !searchModelReady || !searchModelsBySimilarity || !globalManualSearchTerm || globalManualSearchTerm.trim().length < 2) {
      return;
    }

    const timeoutId = setTimeout(async () => {
      setGlobalSemanticSearching(true);
      try {
        const results = await searchModelsBySimilarity(models || [], globalManualSearchTerm.toLowerCase(), { threshold: 0.3, limit: 10 });
        // Resultados ja sao modelos com similarity, apenas converter para array de Model
        setGlobalManualSearchResults(results as Model[]);
      } catch (error) {
        console.error('[GlobalEditor] Erro na busca semantica:', error);
      }
      setGlobalSemanticSearching(false);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [useGlobalSemanticSearch, globalManualSearchTerm, searchModelReady, searchModelsBySimilarity, models]);

  // Inicializar localTopics quando abrir
  React.useEffect(() => {
    // So inicializar quando ABRIR (transicao false -> true)
    // Isso evita reset quando Ctrl+S atualiza selectedTopics
    const isOpening = isOpen && !wasOpenRef.current;

    if (isOpening && selectedTopics.length > 0) {
      const copy = structuredClone(selectedTopics);
      setLocalTopics(copy);
      setOriginalTopics(structuredClone(copy));
      setIsDirty(false);
      setCurrentFocusedTopic(null);
      setSuggestions([]);
      setIsSplitMode(true);
      // v1.13: Limpar rastreamento de edicoes ao abrir
      setEditedTopicTitles(new Set());
      // Iniciar todas secoes colapsadas
      const initialCollapsed: Record<number, boolean> = {};
      copy.forEach((_: Topic, idx: number) => { initialCollapsed[idx] = true; });
      setCollapsedSections(initialCollapsed);

      // v1.36.45: Resetar estados dos sub-modais ao abrir (evita bug de ESC)
      setShowAIAssistant(false);
      setAiAssistantTopicIndex(null);
      setShowJurisModal(false);
      setJurisTopicIndex(null);
      setShowFactsComparison(false);
      setFactsComparisonTopicIndex(null);
      setFactsComparisonResult(null);
      setFactsComparisonError(null);
    }

    wasOpenRef.current = isOpen;
  }, [isOpen, selectedTopics]);

  // Handler para mudanca de campo
  const handleFieldChange = React.useCallback((topicIndex: number, field: string, html: string) => {
    setLocalTopics(prev => {
      const updated = [...prev];
      const topicTitle = updated[topicIndex]?.title;
      updated[topicIndex] = {
        ...updated[topicIndex],
        [field]: html
      };
      // Se for editedRelatorio, também atualizar relatorio
      if (field === 'editedRelatorio') {
        updated[topicIndex].relatorio = html;
      }
      // v1.13: Rastrear edições no campo decisão para detecção automática de resultado
      if (field === 'editedFundamentacao' && topicTitle) {
        setEditedTopicTitles(prevSet => new Set(prevSet).add(topicTitle));
      }
      return updated;
    });
    setIsDirty(true);
  }, []);

  // Handler para foco em campo (sugestões contextuais) - v1.12.2: usa ref para evitar closure stale
  const handleFieldFocus = React.useCallback(async (topicIndex: number, fieldType: string, topic: Topic | null) => {
    if (fieldType === 'fundamentacao' && topic) {
      // Campo de fundamentação/decisão focado -> buscar sugestões automaticamente
      const topicInfo = {
        index: topicIndex,
        title: topic.title,
        category: topic.category,
        relatorio: topic.editedRelatorio || topic.relatorio || ''
      };
      setCurrentFocusedTopic(topicInfo);

      // Buscar sugestoes automaticamente (apenas se em split mode) - usa ref para valor atual
      if (isSplitModeRef.current && findSuggestions) {
        setLoadingSuggestions(true);
        try {
          await new Promise(r => setTimeout(r, 0)); // v1.28.06: Yield para UI
          const results = await findSuggestions({
            title: topicInfo.title,
            category: topicInfo.category,
            relatorio: topicInfo.relatorio
          });
          // v1.28.06: Suporta novo formato { suggestions, source }
          if (results && 'suggestions' in results) {
            setSuggestions(results.suggestions);
            setSuggestionsSource(results.source ?? null);
          } else {
            setSuggestions(results || []);
            setSuggestionsSource(null);
          }
        } catch (error) {
          setSuggestionsSource(null);
        } finally {
          setLoadingSuggestions(false);
        }
      }
    } else {
      // Outro campo focado -> limpar contexto de sugestoes
      setCurrentFocusedTopic(null);
      setSuggestions([]);
    }
  }, [findSuggestions]); // Removido isSplitMode das deps - agora usa ref

  React.useEffect(() => {
    // Detectar transição de false -> true
    const wasOff = !prevIsSplitModeRef.current;
    const isNowOn = isSplitMode;
    prevIsSplitModeRef.current = isSplitMode;

    // Só buscar quando split mode ACABOU de ser ativado (não em cada render)
    if (wasOff && isNowOn && currentFocusedTopic && findSuggestions) {
      const fetchSuggestions = async () => {
        setLoadingSuggestions(true);
        try {
          await new Promise(r => setTimeout(r, 0)); // v1.28.06: Yield para UI
          const results = await findSuggestions({
            title: currentFocusedTopic.title,
            category: currentFocusedTopic.category,
            relatorio: currentFocusedTopic.relatorio
          });
          // v1.28.06: Suporta novo formato { suggestions, source }
          if (results && 'suggestions' in results) {
            setSuggestions(results.suggestions);
            setSuggestionsSource(results.source ?? null);
          } else {
            setSuggestions(results || []);
            setSuggestionsSource(null);
          }
        } catch (error) {
          setSuggestionsSource(null);
        } finally {
          setLoadingSuggestions(false);
        }
      };

      fetchSuggestions();
    }
  }, [isSplitMode, currentFocusedTopic, findSuggestions]); // Agora com todas as dependências

  // Inserir modelo no campo de fundamentação do tópico focado
  const handleInsertModel = React.useCallback((modelContent: string) => {
    if (currentFocusedTopic?.index === undefined) return;

    const topicIndex = currentFocusedTopic.index;
    setLocalTopics(prev => {
      const updated = [...prev];
      const currentContent = updated[topicIndex].editedFundamentacao ||
                            updated[topicIndex].fundamentacao || '';

      // Adicionar ao final do conteúdo existente
      updated[topicIndex].editedFundamentacao = currentContent +
        (currentContent ? '<p><br></p>' : '') + modelContent;

      return updated;
    });

    setIsDirty(true);
    showToast?.('Modelo inserido', 'success');
  }, [currentFocusedTopic, showToast]);

  // v1.33.23: Ref para handleInsertModel (evita loop infinito no useEffect abaixo)
  const handleInsertModelRef = React.useRef(handleInsertModel);
  React.useEffect(() => {
    handleInsertModelRef.current = handleInsertModel;
  }, [handleInsertModel]);

  const handlePreviewModel = React.useCallback((model: Model) => {
    if (modelPreview?.openPreview) {
      modelPreview.openPreview(model);
    }
  }, [modelPreview]);

  // v1.15.2: Registrar funcao de insercao contextual quando modal abre
  // v1.33.23: Usa ref para evitar loop (handleInsertModel muda frequentemente)
  React.useEffect(() => {
    if (isOpen && modelPreview?.setContextualInsertFn) {
      // Wrapper com identidade estavel que chama a ref
      modelPreview.setContextualInsertFn((content: string) => handleInsertModelRef.current(content));
    }
    return () => {
      if (modelPreview?.setContextualInsertFn) {
        modelPreview.setContextualInsertFn(null);
      }
    };
  }, [isOpen, modelPreview]); // Removido handleInsertModel das dependencias

  // Salvar alteracoes (sem fechar) - usa isSavingRef para preservar sugestoes
  const handleSaveOnly = React.useCallback(() => {
    // Marcar que estamos salvando (para useEffect ignorar reset)
    isSavingRef.current = true;

    // Sincronizar estados externos
    setSelectedTopics(localTopics);
    setExtractedTopics((prev: Topic[]) =>
      prev.map((et: Topic) => {
        const updated = localTopics.find((lt: Topic) => lt.title === et.title);
        return updated ? { ...et, ...updated } : et;
      })
    );

    setIsDirty(false);
    showToast?.('Alterações salvas!', 'success');
  }, [localTopics, setSelectedTopics, setExtractedTopics, showToast]);

  // v1.13.8: Auto-save com debounce no Editor Global
  React.useEffect(() => {
    // Só rodar se modal está aberto e há mudanças
    if (!isOpen || !isDirty) return;

    // Limpar timer anterior
    if (globalAutoSaveTimerRef.current) {
      clearTimeout(globalAutoSaveTimerRef.current);
    }

    // Debounce: aguardar 3s antes de salvar automaticamente
    globalAutoSaveTimerRef.current = setTimeout(() => {
      // Marcar que estamos salvando (para useEffect ignorar reset)
      isSavingRef.current = true;

      // Sincronizar estados externos
      setSelectedTopics(localTopics);
      setExtractedTopics((prev: Topic[]) =>
        prev.map((et: Topic) => {
          const updated = localTopics.find((lt: Topic) => lt.title === et.title);
          return updated ? { ...et, ...updated } : et;
        })
      );

      setIsDirty(false);
      // Não mostrar toast no auto-save (apenas o indicador verde já é suficiente)
    }, AUTO_SAVE_DEBOUNCE_MS);

    return () => {
      if (globalAutoSaveTimerRef.current) {
        clearTimeout(globalAutoSaveTimerRef.current);
      }
    };
  }, [isOpen, isDirty, localTopics, setSelectedTopics, setExtractedTopics]);

  // Salvar e fechar - sincroniza estados externos e fecha
  // v1.13: Agora também detecta automaticamente o resultado para tópicos editados
  const handleSaveAndClose = React.useCallback(async () => {
    // v1.13: Identificar tópicos que precisam de análise de resultado:
    // - Foram editados (campo decisão)
    // - Não tem resultadoManual (usuário não escolheu manualmente)
    // - Não são RELATÓRIO ou DISPOSITIVO
    const topicsToAnalyze = detectResultadoAutomatico ? localTopics.filter(t =>
      editedTopicTitles.has(t.title) &&
      !t.resultadoManual &&
      t.category !== 'RELATÓRIO' &&
      t.category !== 'DISPOSITIVO' &&
      t.title.toUpperCase() !== 'RELATÓRIO' &&
      t.title.toUpperCase() !== 'DISPOSITIVO'
    ) : [];

    let updatedTopics = [...localTopics];

    if (topicsToAnalyze.length > 0) {
      // Mostrar modal de progresso
      setIsAnalyzingResults(true);
      setAnalyzingProgress({ current: 0, total: topicsToAnalyze.length });

      // v1.33.11: Usar valor configuravel de requisicoes paralelas
      const BATCH_SIZE = aiIntegration?.aiSettings?.parallelRequests || 5;

      for (let i = 0; i < topicsToAnalyze.length; i += BATCH_SIZE) {
        const batch = topicsToAnalyze.slice(i, i + BATCH_SIZE);

        const promises = batch.map(async (topic: Topic) => {
          const resultado = detectResultadoAutomatico ? await detectResultadoAutomatico(
            topic.title,
            topic.editedFundamentacao || topic.fundamentacao || '',
            topic.category
          ) : null;
          return { title: topic.title, resultado };
        });

        const results = await Promise.allSettled(promises);

        // Atualizar topicos com resultados detectados
        let rejectedCount = 0;
        results.forEach(r => {
          if (r.status === 'fulfilled' && r.value.resultado) {
            const idx = updatedTopics.findIndex((t: Topic) => t.title === r.value.title);
            if (idx !== -1) {
              updatedTopics[idx] = { ...updatedTopics[idx], resultado: r.value.resultado as TopicResultado };
            }
          } else if (r.status === 'rejected') {
            rejectedCount++;
          }
        });
        if (rejectedCount > 0) {
          console.warn(`[SentencifyAI] ${rejectedCount} tópico(s) falharam na detecção automática de resultado`);
        }

        setAnalyzingProgress({ current: Math.min(i + BATCH_SIZE, topicsToAnalyze.length), total: topicsToAnalyze.length });

        // Delay entre batches para evitar rate limit (exceto último)
        if (i + BATCH_SIZE < topicsToAnalyze.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      setIsAnalyzingResults(false);
    }

    // Aplicar alteracoes aos tópicos selecionados
    setSelectedTopics(updatedTopics);

    // Sincronizar com extractedTopics
    setExtractedTopics((prev: Topic[]) =>
      prev.map((et: Topic) => {
        const updated = updatedTopics.find((lt: Topic) => lt.title === et.title);
        return updated ? { ...et, ...updated } : et;
      })
    );

    showToast?.('Alterações salvas com sucesso!', 'success');
    setEditedTopicTitles(new Set()); // Limpar rastreamento
    onClose();
  }, [localTopics, editedTopicTitles, setSelectedTopics, setExtractedTopics, showToast, onClose, detectResultadoAutomatico, aiIntegration?.aiSettings?.parallelRequests]);

  // Cancelar
  const handleCancel = React.useCallback(() => {
    if (isDirty) {
      setShowCancelConfirm(true);
      return;
    }
    onClose();
  }, [isDirty, onClose]);

  // Confirmar cancelamento
  const confirmCancel = React.useCallback(() => {
    setShowCancelConfirm(false);
    onClose();
  }, [onClose]);

  // v1.38.16: Wrapper para setIncludeMainDocs que persiste no cache
  const setGlobalIncludeMainDocs = React.useCallback((value: boolean) => {
    setGlobalIncludeMainDocsState(value);
    // Salvar no cache se houver tópico ativo
    if (aiAssistantTopicIndex !== null && localTopics[aiAssistantTopicIndex]) {
      chatHistoryCache.setIncludeMainDocs(localTopics[aiAssistantTopicIndex].title, value);
    }
  }, [aiAssistantTopicIndex, localTopics, chatHistoryCache]);

  // v1.38.16: Carrega includeMainDocs do cache ao abrir assistente
  const handleOpenAIAssistant = React.useCallback(async (topicIndex: number) => {
    setAiAssistantTopicIndex(topicIndex);
    // Carregar config do cache
    const topicTitle = localTopics[topicIndex]?.title;
    if (topicTitle) {
      const savedInclude = await chatHistoryCache.getIncludeMainDocs(topicTitle);
      setGlobalIncludeMainDocsState(savedInclude);
    }
    setShowAIAssistant(true);
  }, [localTopics, chatHistoryCache]);

  // v1.12.14: Handler para abrir modal de provas vinculadas
  const handleOpenProofsModal = React.useCallback((topicIndex: number) => {
    setProofsModalTopicIndex(topicIndex);
    setShowProofsModal(true);
  }, []);

  // v1.36.12: Handler para abrir modal de confronto de fatos
  const handleOpenFactsComparison = React.useCallback(async (topicIndex: number) => {
    setFactsComparisonTopicIndex(topicIndex);
    setFactsComparisonError(null);

    // Verificar cache
    const topic = localTopics[topicIndex];
    if (topic) {
      const cached = await factsComparisonCache.getComparison(topic.title, 'mini-relatorio');
      if (cached) {
        setFactsComparisonResult(cached);
      } else {
        // Tentar cache de documentos
        const cachedDocs = await factsComparisonCache.getComparison(topic.title, 'documentos-completos');
        setFactsComparisonResult(cachedDocs);
      }
    }

    setShowFactsComparison(true);
  }, [localTopics, factsComparisonCache]);

  // v1.36.12: Handler para gerar confronto de fatos
  const handleGenerateFactsComparison = React.useCallback(async (source: FactsComparisonSource) => {
    if (!aiIntegration || factsComparisonTopicIndex === null) return;

    const topic = localTopics[factsComparisonTopicIndex];
    if (!topic) return;

    setGeneratingFactsComparison(true);
    setFactsComparisonError(null);

    try {
      let prompt: string;

      if (source === 'mini-relatorio') {
        const relatorio = topic.editedRelatorio || topic.relatorio || '';
        if (!relatorio.trim()) {
          throw new Error('Mini-relatório não disponível para este tópico.');
        }
        prompt = buildMiniRelatorioComparisonPrompt(topic.title, relatorio);
      } else {
        // Documentos completos - priorizar texto, fallback para PDF binário
        const peticaoText = (analyzedDocuments?.peticoesText || []).map((t: PastedText) => t.text || '').join('\n\n');
        const contestacaoText = (analyzedDocuments?.contestacoesText || []).map((t: PastedText) => t.text || '').join('\n\n');
        const impugnacaoText = (analyzedDocuments?.complementaresText || []).map((t: PastedText) => t.text || '').join('\n\n');

        const hasText = peticaoText.trim() || contestacaoText.trim();
        // v1.36.22: PDFs base64 estão em analyzedDocuments?.peticoes (não em peticaoFiles)
        const hasPdfs = (analyzedDocuments?.peticoes?.length || 0) > 0 || (analyzedDocuments?.contestacoes?.length || 0) > 0;

        if (!hasText && !hasPdfs) {
          throw new Error('Nenhum documento disponível (petição ou contestação).');
        }

        if (hasText) {
          // Caminho padrão: usar texto extraído
          prompt = buildDocumentosComparisonPrompt(topic.title, peticaoText, contestacaoText, impugnacaoText);
        } else {
          // v1.36.22: Fallback para PDF binário (quando não há texto extraído)
          prompt = buildPdfComparisonPrompt(topic.title);
        }
      }

      // Construir mensagem - pode ser texto simples ou incluir PDFs binários
      let messageContent: AIMessageContent[];

      const peticaoTextFallback = (analyzedDocuments?.peticoesText || []).map((t: PastedText) => t.text || '').join('\n\n');
      const contestacaoTextFallback = (analyzedDocuments?.contestacoesText || []).map((t: PastedText) => t.text || '').join('\n\n');
      const hasTextForMessage = peticaoTextFallback.trim() || contestacaoTextFallback.trim();

      if (hasTextForMessage || source === 'mini-relatorio') {
        // Texto simples
        messageContent = [{ type: 'text', text: prompt }];
      } else {
        // v1.36.22: Incluir PDFs binarios como fallback (de analyzedDocuments.peticoes/contestacoes/complementares)
        messageContent = [{ type: 'text', text: prompt }];

        // Adicionar peticoes como PDF
        for (const base64 of (analyzedDocuments?.peticoes || [])) {
          if (base64) {
            messageContent.push({ type: 'text', text: '\n\n PETICAO INICIAL (documento PDF a seguir):' });
            messageContent.push({
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: base64
              }
            } as AIDocumentContent);
          }
        }

        // Adicionar contestacoes como PDF
        for (const base64 of (analyzedDocuments?.contestacoes || [])) {
          if (base64) {
            messageContent.push({ type: 'text', text: '\n\n CONTESTACAO (documento PDF a seguir):' });
            messageContent.push({
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: base64
              }
            } as AIDocumentContent);
          }
        }

        // Adicionar complementares como PDF
        for (const base64 of (analyzedDocuments?.complementares || [])) {
          if (base64) {
            messageContent.push({ type: 'text', text: '\n\n DOCUMENTO COMPLEMENTAR (documento PDF a seguir):' });
            messageContent.push({
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: base64
              }
            } as AIDocumentContent);
          }
        }
      }

      const response = await aiIntegration.callAI([{
        role: 'user',
        content: messageContent
      }], {
        maxTokens: 8000,
        useInstructions: false,
        temperature: 0.3,
        topP: 0.9,
        topK: 40
      });

      // Extrair JSON da resposta (pode vir com markdown)
      let jsonStr = response;
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      } else {
        // Tentar encontrar JSON direto
        const firstBrace = response.indexOf('{');
        const lastBrace = response.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
          jsonStr = response.substring(firstBrace, lastBrace + 1);
        }
      }

      const parsed = JSON.parse(jsonStr);

      // v1.36.58: Double Check do Confronto de Fatos
      // v1.37.68: Usar messageContent original (já construído acima)
      let verifiedParsed = parsed;
      if (aiIntegration.aiSettings.doubleCheck?.enabled &&
          aiIntegration.aiSettings.doubleCheck?.operations.factsComparison &&
          aiIntegration.performDoubleCheck) {
        try {
          const { verified, corrections, summary } = await aiIntegration.performDoubleCheck(
            'factsComparison',
            JSON.stringify(parsed, null, 2),
            messageContent  // v1.37.68: Array original (já é AIMessageContent[])
          );

          if (corrections.length > 0) {
            const verifiedObj = JSON.parse(verified);
            // Extrair o resultado verificado (pode estar em verifiedResult ou ser o objeto inteiro)
            verifiedParsed = verifiedObj.verifiedResult || verifiedObj;
            showToast?.(`Double Check: ${corrections.length} correcao(oes) - ${summary}`, 'info');
            console.log('[DoubleCheck FactsComparison] Correções:', corrections);
          }
        } catch (dcError) {
          console.error('[DoubleCheck FactsComparison] Erro:', dcError);
          // Continuar com parsed original em caso de erro
        }
      }

      const result: FactsComparisonResult = {
        topicTitle: topic.title,
        source,
        generatedAt: new Date().toISOString(),
        tabela: verifiedParsed.tabela || [],
        fatosIncontroversos: verifiedParsed.fatosIncontroversos || [],
        fatosControversos: verifiedParsed.fatosControversos || [],
        pontosChave: verifiedParsed.pontosChave || [],
        resumo: verifiedParsed.resumo || ''
      };

      // Salvar no cache
      await factsComparisonCache.saveComparison(topic.title, source, result);

      setFactsComparisonResult(result);
    } catch (err) {
      console.error('[FactsComparison] Erro:', err);
      setFactsComparisonError(err instanceof Error ? err.message : 'Erro ao gerar analise. Tente novamente.');
    } finally {
      setGeneratingFactsComparison(false);
    }
  }, [aiIntegration, factsComparisonTopicIndex, localTopics, analyzedDocuments, factsComparisonCache, showToast]);

  // v1.12.14: Helper para calcular provas vinculadas a um topico
  const getLinkedProofsForTopic = React.useCallback((topicTitle: string) => {
    if (!proofManager) return [];
    const proofTopicLinks = proofManager.proofTopicLinks || {};
    const linkedProofIds = Object.keys(proofTopicLinks).filter(proofId =>
      proofTopicLinks[proofId]?.includes(topicTitle)
    );
    return [
      ...(proofManager.proofFiles || []).filter((p: ProofFile) => linkedProofIds.includes(String(p.id))).map((p: ProofFile) => ({ ...p, isPdf: true as const })),
      ...(proofManager.proofTexts || []).filter((p: ProofText) => linkedProofIds.includes(String(p.id))).map((p: ProofText) => ({ ...p, isPdf: false as const }))
    ] as Proof[];
  }, [proofManager]);

  const generateGlobalAiText = React.useCallback(async () => {
    if (!globalAiInstruction.trim() || !aiIntegration || aiAssistantTopicIndex === null) return;

    setGeneratingGlobalAi(true);
    setGlobalAiGeneratedText('');

    try {
      const topic = localTopics[aiAssistantTopicIndex];
      if (!topic) throw new Error('Tópico não encontrado');

      // Preparar documentos usando helper
      const { contentArray, flags } = prepareDocumentsContext(analyzedDocuments);
      const { hasPeticao, hasContestacoes, hasComplementares } = flags;

      // v1.19.5: Usar função centralizada para provas
      // v1.19.2: Passar flag de anonimização
      // v1.21.5: Passar anonConfig para anonimizar texto
      const { proofDocuments, proofsContext, hasProofs } = fileToBase64 ? await prepareProofsContext(
        proofManager, topic.title, fileToBase64, aiIntegration?.aiSettings?.anonymization?.enabled, aiIntegration?.aiSettings?.anonymization
      ) : { proofDocuments: [], proofsContext: '', hasProofs: false };
      contentArray.push(...proofDocuments);

      // Preparar contexto baseado no escopo selecionado
      let decisionContext = '';

      if (globalContextScope === 'current') {
        // Apenas o tópico atual
        decisionContext = `
CONTEXTO DO TÓPICO:
Título: ${topic.title}
Categoria: ${topic.category || 'Não especificada'}

MINI-RELATÓRIO DO TÓPICO:
${topic.editedRelatorio || topic.relatorio || 'Não disponível'}

DECISÃO JÁ ESCRITA:
${topic.editedFundamentacao || topic.fundamentacao || 'Ainda não foi escrito nada'}
`;
      } else {
        // Toda a decisão (todos os tópicos)
        decisionContext = 'CONTEXTO COMPLETO DA DECISÃO:\n\n';

        localTopics.forEach((t, index) => {
          const titleUpper = t.title.toUpperCase();
          if (titleUpper === 'RELATÓRIO') {
            decisionContext += `RELATÓRIO GERAL:\n${t.editedRelatorio || t.relatorio || 'Não disponível'}\n\n---\n\n`;
          } else if (titleUpper === 'DISPOSITIVO') {
            decisionContext += `DISPOSITIVO:\n${t.editedContent || ''}\n\n---\n\n`;
          } else {
            decisionContext += `TÓPICO ${index}: ${t.title} (${t.category || 'Sem categoria'})
Mini-relatório: ${t.editedRelatorio || t.relatorio || 'Não disponível'}
Decisão: ${t.editedFundamentacao || t.fundamentacao || 'Não escrita'}

---

`;
          }
        });

        decisionContext += `\nTÓPICO SENDO EDITADO: ${topic.title}`;
      }

      // 8. Adicionar instrução final (mesmo prompt do assistente individual)
      contentArray.push({
        type: 'text',
        text: `Você está auxiliando na redação de uma DECISÃO JUDICIAL TRABALHISTA.

${decisionContext}

${hasPeticao || hasContestacoes || hasComplementares || hasProofs ? `
DOCUMENTOS DISPONÍVEIS PARA CONSULTA:
${hasPeticao ? '- Petição inicial' : ''}
${hasContestacoes ? '- Contestação(ões)' : ''}
${hasComplementares ? '- Documento(s) complementar(es)' : ''}
${hasProofs ? '- Prova(s) vinculada(s) a este tópico' : ''}

Os documentos foram anexados acima. Você pode e DEVE consultá-los para fundamentar sua decisão, especialmente:
- Para identificar alegações e argumentos das partes
- Para verificar provas mencionadas
- Para fundamentar sua decisão com base no que foi apresentado nos autos
${hasProofs ? '- Para analisar as provas vinculadas e suas respectivas análises/conclusões' : ''}
` : ''}
${proofsContext}
INSTRUÇÃO DO USUÁRIO:
${globalAiInstruction}

IMPORTANTE - NÃO INCLUIR MINI-RELATÓRIO:
- O mini-relatório já foi fornecido acima apenas como CONTEXTO
- NÃO repita ou resuma os fatos no texto gerado
- NÃO inicie com "Trata-se de...", "Cuida-se de...", "O reclamante postula..."
- Vá DIRETO para a análise jurídica, fundamentação e conclusão

${AI_PROMPTS.estiloRedacao}

Com base em TODOS os elementos acima (contexto do tópico, documentos processuais e instrução do usuário), gere o texto solicitado.

O texto deve:
- Ser adequado para uma decisão judicial trabalhista
- Usar SEMPRE a primeira pessoa
- Manter linguagem formal, mas acessível
- Evitar latinismos desnecessários
- Ser claro e objetivo
- Considerar o contexto do tópico e o que já foi escrito
- FUNDAMENTAR-SE nos documentos processuais (petição, contestações, provas)
- Citar fatos específicos dos autos quando relevante
- Aplicar bases legais quando apropriado

${AI_PROMPTS.formatacaoHTML("A <strong>CLT</strong> estabelece que...")}

${AI_PROMPTS.formatacaoParagrafos("<p>Passo a analisar...</p><p>A CLT estabelece...</p>")}

${AI_PROMPTS.numeracaoReclamadas}

Responda APENAS com o texto gerado em HTML, sem prefácio, sem explicações. Gere texto pronto para ser inserido na decisão.`
      });

      // Chamar API
      // v1.21.26: Parametros para assistente interativo (criativo moderado)
      const textContent = await aiIntegration.callAI([{
        role: 'user',
        content: contentArray as AIMessageContent[]
      }], {
        maxTokens: 4000,
        useInstructions: true,
        logMetrics: true,
        temperature: 0.5,
        topP: 0.9,
        topK: 80
      });

      setGlobalAiGeneratedText(textContent.trim());
    } catch (err) {
      showToast?.('Erro ao gerar texto: ' + (err as Error).message, 'error');
    } finally {
      setGeneratingGlobalAi(false);
    }
  }, [globalAiInstruction, aiIntegration, aiAssistantTopicIndex, localTopics, analyzedDocuments, proofManager, globalContextScope, showToast, fileToBase64]);

  const insertGlobalAiText = React.useCallback((mode: InsertMode) => {
    if (!globalAiGeneratedText || aiAssistantTopicIndex === null) return;

    setLocalTopics(prev => {
      const updated = [...prev];
      const currentContent = updated[aiAssistantTopicIndex].editedFundamentacao ||
                            updated[aiAssistantTopicIndex].fundamentacao || '';
      const normalizedAiText = normalizeHTMLSpacing(globalAiGeneratedText);

      let newContent;
      switch (mode) {
        case 'replace':
          newContent = sanitizeHTML(normalizedAiText);
          break;
        case 'append':
          newContent = sanitizeHTML(currentContent + '<p><br></p>' + normalizedAiText);
          break;
        case 'prepend':
          newContent = sanitizeHTML(normalizedAiText + '<p><br></p>' + currentContent);
          break;
        default:
          newContent = currentContent;
      }

      updated[aiAssistantTopicIndex].editedFundamentacao = newContent;
      return updated;
    });

    setIsDirty(true);
    setShowAIAssistant(false);
    setAiAssistantTopicIndex(null);
    setGlobalAiInstruction('');
    setGlobalAiGeneratedText('');
    showToast?.('Texto inserido com sucesso!', 'success');
  }, [globalAiGeneratedText, aiAssistantTopicIndex, sanitizeHTML, showToast]);

  // v1.19.0: Constroi contexto completo para chat do assistente IA (Global)
  // v1.19.5: Agora assincrono para suportar PDFs binarios
  // v1.21.1: Aceita options para filtrar provas
  // v1.38.12: Suporte a includeMainDocs e selectedContextTopics
  const buildContextForChatGlobal = React.useCallback(async (userMessage: string, options: { proofFilter?: string; includeMainDocs?: boolean; selectedContextTopics?: string[] } = {}) => {
    if (aiAssistantTopicIndex === null) return [];
    const topic = localTopics[aiAssistantTopicIndex];
    if (!topic) return [];
    const { proofFilter, includeMainDocs = true, selectedContextTopics } = options;

    // v1.38.12: Filtrar documentos baseado no toggle includeMainDocs
    const docsToSend = includeMainDocs
      ? analyzedDocuments
      : {
          // Excluir petições e contestações
          peticoes: [],
          peticoesText: [],
          contestacoes: [],
          contestacoesText: [],
          // Manter complementares
          complementares: analyzedDocuments.complementares,
          complementaresText: analyzedDocuments.complementaresText,
        };

    // Preparar documentos usando helper
    const { contentArray, flags } = prepareDocumentsContext(docsToSend);
    const { hasPeticao, hasContestacoes, hasComplementares } = flags;

    // v1.21.1: Usar funcao de provas orais se filtro ativo
    // v1.19.2: Passar flag de anonimizacao
    // v1.21.5: Passar anonConfig para anonimizar texto
    const prepareFunction = proofFilter === 'oral' ? prepareOralProofsContext : prepareProofsContext;
    const { proofDocuments, proofsContext, hasProofs } = fileToBase64 ? await prepareFunction(
      proofManager, topic.title, fileToBase64, aiIntegration?.aiSettings?.anonymization?.enabled, aiIntegration?.aiSettings?.anonymization
    ) : { proofDocuments: [] as AIMessageContent[], proofsContext: '', hasProofs: false };
    contentArray.push(...proofDocuments);

    // v1.38.12: Determinar escopo efetivo
    const effectiveScope = selectedContextTopics && selectedContextTopics.length > 0 ? 'selected' : globalContextScope;

    // Contexto baseado no escopo selecionado
    let decisionContext = '';
    if (effectiveScope === 'current') {
      decisionContext = `
CONTEXTO DO TÓPICO:
Título: ${topic.title}
Categoria: ${topic.category || 'Não especificada'}

MINI-RELATÓRIO DO TÓPICO:
${topic.editedRelatorio || topic.relatorio || 'Não disponível'}

DECISÃO JÁ ESCRITA:
${topic.editedFundamentacao || topic.fundamentacao || 'Ainda não foi escrito nada'}
`;
    } else if (effectiveScope === 'selected' && selectedContextTopics) {
      // v1.38.12: Escopo de tópicos selecionados
      decisionContext = 'CONTEXTO DOS TÓPICOS SELECIONADOS:\n\n';
      const topicsToInclude = localTopics.filter(t => selectedContextTopics.includes(t.title));

      topicsToInclude.forEach((t, index) => {
        decisionContext += `TÓPICO ${index + 1}: ${t.title} (${t.category || 'Sem categoria'})
Mini-relatório: ${t.editedRelatorio || t.relatorio || 'Não disponível'}
Decisão: ${t.editedFundamentacao || t.fundamentacao || 'Não escrita'}

---

`;
      });

      decisionContext += `\nTÓPICO SENDO EDITADO: ${topic.title}`;
    } else {
      // Escopo 'all' - Toda a decisão
      decisionContext = 'CONTEXTO COMPLETO DA DECISÃO:\n\n';
      localTopics.forEach((t, index) => {
        const titleUpper = t.title.toUpperCase();
        if (titleUpper === 'RELATÓRIO') {
          decisionContext += `RELATÓRIO GERAL:\n${t.editedRelatorio || t.relatorio || 'Não disponível'}\n\n---\n\n`;
        } else if (titleUpper === 'DISPOSITIVO') {
          decisionContext += `DISPOSITIVO:\n${t.editedContent || ''}\n\n---\n\n`;
        } else {
          decisionContext += `TÓPICO ${index}: ${t.title} (${t.category || 'Sem categoria'})
Mini-relatório: ${t.editedRelatorio || t.relatorio || 'Não disponível'}
Decisão: ${t.editedFundamentacao || t.fundamentacao || 'Não escrita'}

---

`;
        }
      });
      decisionContext += `\nTÓPICO SENDO EDITADO: ${topic.title}`;
    }

    // Verificar se anonimização está ativada
    const anonymizationEnabled = aiIntegration?.aiSettings?.anonymization?.enabled;

    // Montar prompt completo
    contentArray.push({
      type: 'text',
      text: `Você está auxiliando na redação de uma DECISÃO JUDICIAL TRABALHISTA.

${decisionContext}

${hasPeticao || hasContestacoes || hasComplementares || hasProofs ? `
DOCUMENTOS DISPONÍVEIS PARA CONSULTA:
${hasPeticao ? '- Petição inicial' : ''}
${hasContestacoes ? '- Contestação(ões)' : ''}
${hasComplementares ? '- Documento(s) complementar(es)' : ''}
${hasProofs ? '- Prova(s) vinculada(s) a este tópico' : ''}

Os documentos foram anexados acima. Você pode e DEVE consultá-los para fundamentar sua decisão.
${hasProofs ? '- Analise as provas vinculadas e suas respectivas análises/conclusões' : ''}
` : ''}
${proofsContext}

${INSTRUCAO_NAO_PRESUMIR}

${AI_PROMPTS.estiloRedacao}
${AI_PROMPTS.numeracaoReclamadas}
${anonymizationEnabled ? AI_PROMPTS.preservarAnonimizacao : ''}

NÃO INCLUIR MINI-RELATÓRIO no texto gerado.

INSTRUÇÃO DO USUÁRIO:
${userMessage}

Quando faltar informação expressa necessária à redação, PERGUNTE ao usuário antes de redigir. Prefira perguntar a presumir.

ANTES DE REDIGIR QUALQUER TEXTO DE DECISÃO:
Liste as informações/conclusões que você precisa confirmar com o usuário.
Só prossiga com a redação APÓS receber as respostas.
Se não houver nada a confirmar, indique "Nenhuma informação pendente" e prossiga.

Quando gerar texto para a decisão, responda em HTML.
${AI_PROMPTS.formatacaoHTML("A <strong>CLT</strong> estabelece...")}
${AI_PROMPTS.formatacaoParagrafos("<p>Primeiro parágrafo.</p><p>Segundo parágrafo.</p>")}`
    });

    return contentArray;
  }, [localTopics, aiAssistantTopicIndex, analyzedDocuments, proofManager, globalContextScope, aiIntegration?.aiSettings?.anonymization?.enabled, fileToBase64]);

  // v1.19.0: Handler para inserir resposta do chat no editor global
  const handleInsertGlobalChatResponse = React.useCallback((mode: InsertMode) => {
    const response = chatAssistantGlobal.lastResponse;
    if (!response || aiAssistantTopicIndex === null) return;

    setLocalTopics(prev => {
      const updated = [...prev];
      const currentContent = updated[aiAssistantTopicIndex].editedFundamentacao ||
                            updated[aiAssistantTopicIndex].fundamentacao || '';
      const normalizedAiText = normalizeHTMLSpacing(response);

      let newContent;
      switch (mode) {
        case 'replace':
          newContent = sanitizeHTML(normalizedAiText);
          break;
        case 'append':
          newContent = sanitizeHTML(currentContent + '<p><br></p>' + normalizedAiText);
          break;
        case 'prepend':
          newContent = sanitizeHTML(normalizedAiText + '<p><br></p>' + currentContent);
          break;
        default:
          newContent = sanitizeHTML(normalizedAiText);
      }

      updated[aiAssistantTopicIndex].editedFundamentacao = newContent;
      return updated;
    });

    setIsDirty(true);
  }, [chatAssistantGlobal.lastResponse, aiAssistantTopicIndex, sanitizeHTML]);

  // v1.19.0: Handler para enviar mensagem no chat global
  // v1.21.1: Aceita options (ex: { proofFilter: 'oral' }) para filtrar provas
  // v1.21.6: Verifica provas vinculadas + anonimização -> abre modal de nomes
  // v1.38.12: Suporte a includeMainDocs e selectedContextTopics
  const handleSendGlobalChatMessage = React.useCallback(async (message: string, options: { proofFilter?: string; includeMainDocs?: boolean; selectedContextTopics?: string[] } = {}) => {
    // v1.21.13: Removido modal de anonimização - provas CONFLITO são filtradas em prepareProofsContext
    const contextBuilderWithOptions = (msg: string) => buildContextForChatGlobal(msg, options);
    await chatAssistantGlobal.send(message, contextBuilderWithOptions);
  }, [chatAssistantGlobal, buildContextForChatGlobal]);

  // Toggle split mode
  const toggleSplitMode = React.useCallback(() => {
    setIsSplitMode(prev => !prev);
  }, []);

  // Handlers para drag do divisor
  const handleMouseDown = React.useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleMouseMove = React.useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    const clampedPercentage = Math.max(30, Math.min(80, percentage));
    setSplitPosition(clampedPercentage);
  }, [isDragging]);

  const handleMouseUp = React.useCallback(() => {
    setIsDragging(false);
  }, []);

  // Mouse up global para drag
  React.useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Atalhos de teclado
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S: Salvar (sem fechar)
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        if (isDirty) handleSaveOnly();
      }

      // Ctrl+M: Toggle split mode
      if (e.ctrlKey && e.key === 'm') {
        e.preventDefault();
        toggleSplitMode();
      }

      // ESC: Fechar sub-modais primeiro, depois o modal pai
      // v1.36.45: Respeita hierarquia de modais
      if (e.key === 'Escape') {
        if (showCancelConfirm) return;

        // Fechar sub-modais primeiro (hierarquia)
        if (showJurisModal) {
          setShowJurisModal(false);
          setJurisTopicIndex(null);
          return;
        }
        if (showAIAssistant) {
          setShowAIAssistant(false);
          setAiAssistantTopicIndex(null);
          // v1.37.92: Não limpar chat ao fechar via ESC (persiste no cache)
          return;
        }
        if (showFactsComparison) {
          setShowFactsComparison(false);
          setFactsComparisonTopicIndex(null);
          setFactsComparisonResult(null);
          setFactsComparisonError(null);
          return;
        }

        handleCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDirty, handleSaveOnly, toggleSplitMode, handleCancel, showCancelConfirm, showJurisModal, showAIAssistant, showFactsComparison]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex flex-col theme-bg-app overflow-visible">
      {/* v1.13: Modal de progresso da análise de resultados */}
      {isAnalyzingResults && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
          <div className="theme-bg-primary rounded-xl p-6 shadow-xl border theme-border max-w-sm">
            <div className="flex items-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              <div>
                <p className="font-medium theme-text">Analisando resultados...</p>
                <p className="text-sm theme-text-muted">
                  Tópico {analyzingProgress.current} de {analyzingProgress.total}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* v1.32.00: Overlay removido - IA roda em worker */}
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b theme-border-secondary theme-bg-secondary flex-shrink-0">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold theme-text-primary flex items-center gap-2">
            <Edit className="w-5 h-5 text-cyan-400" />
            Edicao Global
          </h2>
          <span className="text-xs theme-text-muted">
            {localTopics.length} topico{localTopics.length !== 1 ? 's' : ''}
          </span>
          {currentFocusedTopic && (
            <span className="px-3 py-1 text-xs rounded-full theme-bg-purple-accent theme-text-purple border border-purple-500/30">
              Editando: {currentFocusedTopic.title}
              {currentFocusedTopic.category && ` (${currentFocusedTopic.category})`}
            </span>
          )}
          {isDirty && (
            <span className="px-2 py-1 text-xs rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
              Não salvo
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* v1.12.2: Botão Modelos padronizado igual ao fullscreen */}
          <button
            onClick={toggleSplitMode}
            className={`px-3 py-1.5 text-white text-xs rounded flex items-center gap-1.5 transition-all ${
              isSplitMode
                ? 'bg-amber-700 ring-2 ring-amber-400'
                : 'bg-amber-600 hover-amber-700'
            }`}
            title={isSplitMode ? 'Fechar Modelos (Ctrl+M)' : 'Abrir Biblioteca de Modelos (Ctrl+M)'}
          >
            <BookOpen className="w-3.5 h-3.5" />
            {isSplitMode ? 'Fechar Modelos' : 'Modelos'}
          </button>

          {/* v1.12.2: Seletores de espacamento e tamanho de fonte (configuracao global) */}
          {setSpacing && <SpacingDropdown value={spacing} onChange={setSpacing} />}
          {setFontSize && <FontSizeDropdown value={fontSize} onChange={setFontSize} />}

          <button
            onClick={handleCancel}
            className="px-3 py-1.5 text-xs rounded flex items-center gap-1.5 theme-bg-tertiary theme-text-secondary hover-slate-600"
            title="ESC"
          >
            <X className="w-4 h-4" />
            Cancelar
          </button>

          <button
            onClick={handleSaveOnly}
            className="px-4 py-1.5 text-xs rounded flex items-center gap-1.5 bg-blue-600 text-white hover-blue-500"
            title="Ctrl+S"
          >
            <Save className="w-4 h-4" />
            Salvar
          </button>

          <button
            onClick={handleSaveAndClose}
            className="px-4 py-1.5 text-xs rounded flex items-center gap-1.5 bg-green-600 text-white hover-green-700-from-600"
          >
            <Save className="w-4 h-4" />
            Salvar e Sair
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div
        ref={containerRef}
        className="flex flex-1 min-h-0 overflow-hidden"
      >
        {/* Editor Pane - Lista de topicos com editores separados */}
        <div
          className="flex flex-col min-h-0 overflow-hidden"
          style={{ width: isSplitMode ? `${splitPosition}%` : '100%' }}
        >
          <div className={`flex-1 overflow-y-auto p-6 fontsize-${fontSize} spacing-${spacing}`}>
            {localTopics.length > 0 ? (
              localTopics.map((topic, index) => (
                <GlobalEditorSection
                  key={`${topic.title}-${index}`}
                  topic={topic}
                  topicIndex={index}
                  onFieldChange={handleFieldChange}
                  onFieldFocus={handleFieldFocus}
                  onSlashCommand={onSlashCommand}
                  quillReady={quillReady}
                  quillError={quillError}
                  editorTheme={editorTheme}
                  onOpenAIAssistant={handleOpenAIAssistant}
                  onOpenProofsModal={handleOpenProofsModal}
                  onOpenJurisModal={(idx: number) => {
                    setJurisTopicIndex(idx);
                    setShowJurisModal(true);
                  }}
                  onOpenFactsComparison={handleOpenFactsComparison}
                  linkedProofsCount={getLinkedProofsForTopic(topic.title).length}
                  isCollapsed={collapsedSections[index] ?? false}
                  onToggleCollapse={(idx: number) => setCollapsedSections(prev => ({ ...prev, [idx]: !prev[idx] }))}
                  versioning={fieldVersioning}
                />
              ))
            ) : (
              <div className="flex items-center justify-center h-full theme-text-muted">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <span>Carregando topicos...</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Split Divider */}
        {isSplitMode && (
          <div
            className="w-1 cursor-col-resize flex-shrink-0 theme-bg-tertiary hover:bg-purple-500 transition-colors"
            onMouseDown={handleMouseDown}
          />
        )}

        {/* Model Suggestions Pane */}
        {isSplitMode && (
          <div
            className="flex flex-col min-h-0 overflow-hidden theme-bg-secondary"
            style={{ width: `${100 - splitPosition}%` }}
          >
            {/* Panel Header - v1.12.1: Sugestões automáticas */}
            <div className="p-4 border-b theme-border-secondary flex-shrink-0">
              <h3 className="text-sm font-semibold theme-text-primary mb-2 flex items-center gap-2">Sugestões de Modelos{suggestionsSource === 'local' && <span className="bg-purple-600 text-white px-1.5 py-0.5 rounded text-[10px]">IA Local</span>}</h3>

              {currentFocusedTopic ? (
                <p className="text-xs theme-text-muted flex items-center gap-1.5">
                  {loadingSuggestions && (
                    <span className="w-3 h-3 border border-purple-500 border-t-transparent rounded-full animate-spin inline-block"></span>
                  )}
                  <span>
                    {loadingSuggestions ? 'Buscando para:' : 'Sugestões para:'}{' '}
                    <strong>{currentFocusedTopic.title}</strong>
                    {currentFocusedTopic.category && ` (${currentFocusedTopic.category})`}
                  </span>
                </p>
              ) : (
                <p className="text-xs theme-text-muted italic">
                  Clique em um campo de "Decisão" para ver sugestões de modelos
                </p>
              )}
            </div>

            {/* Campo de Busca Manual - v1.12.12 */}
            <div className="px-4 pt-3 pb-2 border-b theme-border-secondary flex-shrink-0">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 theme-text-muted" />
                  <input
                    type="text"
                    value={globalManualSearchTerm}
                    onChange={(e) => {
                      setGlobalManualSearchTerm(e.target.value);
                      // v1.33.19: Só faz busca textual se não estiver em modo semântico
                      if (!useGlobalSemanticSearch) {
                        debouncedGlobalManualSearch(e.target.value);
                      }
                    }}
                    placeholder={useGlobalSemanticSearch ? "Busca por significado..." : "Buscar modelos..."}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded theme-bg-primary border theme-border-input theme-text-primary"
                  />
                </div>
                {globalManualSearchTerm && (
                  <button
                    onClick={() => {
                      setGlobalManualSearchTerm('');
                      setGlobalManualSearchResults([]);
                    }}
                    className="px-3 py-2 theme-bg-tertiary rounded hover-slate-600 text-sm theme-text-secondary"
                    title="Limpar busca"
                  >
                    x
                  </button>
                )}
                {/* v1.33.19: Toggle busca semantica/textual */}
                {searchModelReady && (
                  <button
                    onClick={() => {
                      setUseGlobalSemanticSearch((prev: boolean) => !prev);
                      // Limpar resultados ao alternar modo
                      setGlobalManualSearchResults([]);
                    }}
                    className={`px-2 py-1 rounded text-sm transition-colors ${
                      useGlobalSemanticSearch
                        ? 'bg-purple-600 text-white hover:bg-purple-700'
                        : 'theme-bg-tertiary theme-text-secondary hover:bg-slate-600'
                    }`}
                    title={useGlobalSemanticSearch ? 'Busca semantica (por significado)' : 'Busca textual (por palavras)'}
                  >
                    {useGlobalSemanticSearch ? 'S' : 'T'}
                  </button>
                )}
              </div>
              {globalSemanticSearching && (
                <p className="text-xs text-purple-400 mt-2 flex items-center gap-1">
                  <span className="animate-spin inline-block w-3 h-3 border border-purple-400 border-t-transparent rounded-full"></span>
                  Buscando por significado...
                </p>
              )}
              {!globalSemanticSearching && globalManualSearchTerm && globalManualSearchResults.length > 0 && (
                <p className="text-xs theme-text-muted mt-2">
                  {globalManualSearchResults.length} modelo(s) encontrado(s)
                  {useGlobalSemanticSearch && <span className="ml-1 text-purple-400">(semantica)</span>}
                </p>
              )}
              {!globalSemanticSearching && globalManualSearchTerm && globalManualSearchResults.length === 0 && (
                <p className="text-xs text-amber-400 mt-2">
                  Nenhum modelo encontrado para "{globalManualSearchTerm}"
                </p>
              )}
            </div>

            {/* Suggestions List - v1.12.2: Usando SuggestionCard com botoes Visualizar/Inserir */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {/* v1.12.12: Mostrar resultados da busca manual primeiro, depois sugestoes automaticas */}
              {globalManualSearchResults.length > 0 ? (
                <>
                  <p className="text-xs theme-text-muted mb-2 font-medium">Resultados da busca:</p>
                  {globalManualSearchResults.map((model, idx) => (
                    <SuggestionCard
                      key={model.id || `search-${idx}`}
                      model={model}
                      similarity={model.similarity}
                      index={idx}
                      totalSuggestions={globalManualSearchResults.length}
                      onPreview={handlePreviewModel}
                      onInsert={(content: string) => handleInsertModel(content)}
                      sanitizeHTML={sanitizeHTML}
                      showRanking={false}
                    />
                  ))}
                </>
              ) : suggestions.length > 0 ? (
                suggestions.map((model, idx) => (
                  <SuggestionCard
                    key={model.id || idx}
                    model={model}
                    similarity={model.similarity}
                    index={idx}
                    totalSuggestions={suggestions.length}
                    onPreview={handlePreviewModel}
                    onInsert={(content: string) => handleInsertModel(content)}
                    sanitizeHTML={sanitizeHTML}
                    showRanking={true}
                  />
                ))
              ) : (
                <div className="text-center py-8 theme-text-muted text-sm">
                  {loadingSuggestions ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Buscando sugestoes...</span>
                    </div>
                  ) : currentFocusedTopic ? (
                    <span>Nenhum modelo encontrado para este topico</span>
                  ) : globalManualSearchTerm ? (
                    <span>Use a busca acima para encontrar modelos</span>
                  ) : (
                    <span>Clique em um campo de "Decisao" para ver sugestoes</span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal de Confirmacao - Cancelar */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setShowCancelConfirm(false)}
          />
          <div className="relative theme-bg-primary rounded-lg shadow-xl border theme-border-input max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-amber-400 mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Descartar alterações?
            </h3>
            <p className="theme-text-secondary mb-6">
              Você tem alterações não salvas. Deseja descartá-las?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="px-4 py-2 text-sm rounded theme-bg-tertiary theme-text-secondary hover-slate-600"
              >
                Continuar Editando
              </button>
              <button
                onClick={confirmCancel}
                className="px-4 py-2 text-sm rounded bg-red-600 text-white hover-red-700-from-600"
              >
                Descartar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* v1.19.0: Modal Assistente IA Global - Chat Interativo */}
      {/* v1.38.12: Adicionado allTopics para ContextScopeSelector */}
      {/* v1.38.16: Adicionado includeMainDocs com persistência por tópico */}
      {showAIAssistant && aiAssistantTopicIndex !== null && (
        <AIAssistantGlobalModal
          isOpen={showAIAssistant}
          onClose={() => {
            setShowAIAssistant(false);
            setAiAssistantTopicIndex(null);
            // v1.37.92: Não limpar chat ao fechar (persiste no cache)
            // O usuário pode limpar explicitamente via botão "Limpar Chat"
          }}
          topicTitle={localTopics[aiAssistantTopicIndex]?.title}
          chatHistory={chatAssistantGlobal.history}
          onSendMessage={handleSendGlobalChatMessage}
          onInsertResponse={handleInsertGlobalChatResponse}
          generating={chatAssistantGlobal.generating}
          onClear={chatAssistantGlobal.clear}
          lastResponse={chatAssistantGlobal.lastResponse}
          contextScope={globalContextScope}
          setContextScope={setGlobalContextScope}
          includeMainDocs={globalIncludeMainDocs}
          setIncludeMainDocs={setGlobalIncludeMainDocs}
          sanitizeHTML={sanitizeHTML}
          quickPrompts={aiIntegration?.aiSettings?.quickPrompts}
          proofManager={proofManager}
          allTopics={localTopics}
        />
      )}

      {/* v1.12.14: Modal de Provas Vinculadas */}
      {showProofsModal && proofsModalTopicIndex !== null && (
        <LinkedProofsModal
          isOpen={showProofsModal}
          onClose={() => {
            setShowProofsModal(false);
            setProofsModalTopicIndex(null);
          }}
          topicTitle={localTopics[proofsModalTopicIndex]?.title || ''}
          linkedProofs={getLinkedProofsForTopic(localTopics[proofsModalTopicIndex]?.title || '')}
          proofManager={proofManager ? {
            proofTopicLinks: proofManager.proofTopicLinks || {},
            setProofTopicLinks: proofManager.setProofTopicLinks,
            proofAnalysisResults: proofManager.proofAnalysisResults || {},
            proofConclusions: proofManager.proofConclusions || {}
          } : {
            proofTopicLinks: {},
            setProofTopicLinks: () => {},
            proofAnalysisResults: {},
            proofConclusions: {}
          }}
        />
      )}

      {/* v1.20.0: Modal de Jurisprudencia (componente reutilizavel) */}
      {/* v1.32.18: Props para busca semantica */}
      {/* v1.33.16: jurisSemanticEnabled para toggle interno */}
      <JurisprudenciaModal
        isOpen={showJurisModal && jurisTopicIndex !== null}
        onClose={() => { setShowJurisModal(false); setJurisTopicIndex(null); }}
        topicTitle={jurisTopicIndex !== null ? localTopics[jurisTopicIndex]?.title : undefined}
        topicRelatorio={jurisTopicIndex !== null ? (localTopics[jurisTopicIndex]?.editedRelatorio || localTopics[jurisTopicIndex]?.relatorio) : undefined}
        callAI={aiIntegration?.callAI}
        useLocalAI={useLocalAIForJuris && searchModelReady && jurisEmbeddingsCount > 0}
        jurisSemanticThreshold={jurisSemanticThreshold}
        jurisSemanticEnabled={searchModelReady && jurisEmbeddingsCount > 0}
      />

      {/* v1.36.21: Modal de Confronto de Fatos (usando BaseModal) */}
      <BaseModal
        isOpen={showFactsComparison && factsComparisonTopicIndex !== null}
        onClose={() => {
          setShowFactsComparison(false);
          setFactsComparisonTopicIndex(null);
          setFactsComparisonResult(null);
          setFactsComparisonError(null);
        }}
        title="Confronto de Fatos"
        subtitle={factsComparisonTopicIndex !== null ? localTopics[factsComparisonTopicIndex]?.title || '' : ''}
        icon={<Scale />}
        iconColor="yellow"
        size="xl"
        preventClose={generatingFactsComparison}
      >
        <FactsComparisonModalContent
          topicTitle={factsComparisonTopicIndex !== null ? localTopics[factsComparisonTopicIndex]?.title || '' : ''}
          topicRelatorio={factsComparisonTopicIndex !== null ? (localTopics[factsComparisonTopicIndex]?.editedRelatorio || localTopics[factsComparisonTopicIndex]?.relatorio) : undefined}
          hasPeticao={(analyzedDocuments?.peticoesText?.length || 0) > 0 || !!analyzedDocuments?.peticao}
          hasContestacao={(analyzedDocuments?.contestacoesText?.length || 0) > 0 || (analyzedDocuments?.contestacoes?.length || 0) > 0}
          onGenerate={handleGenerateFactsComparison}
          cachedResult={factsComparisonResult}
          isGenerating={generatingFactsComparison}
          error={factsComparisonError}
        />
      </BaseModal>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════════════════

export { GlobalEditorModal, AUTO_SAVE_DEBOUNCE_MS };
export default GlobalEditorModal;
