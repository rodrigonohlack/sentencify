/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                              SENTENCIFY AI - App.tsx                                   ║
 * ╠════════════════════════════════════════════════════════════════════════════════════════╣
 * ║  Componente principal da aplicação.                                                   ║
 * ║                                                                                        ║
 * ║  Estrutura modular:                                                                   ║
 * ║    src/hooks/       - ~25 hooks customizados                                          ║
 * ║    src/stores/      - Zustand stores (UI, AI, Models, Topics, Proofs)                 ║
 * ║    src/components/  - Componentes reutilizaveis                                       ║
 * ║    src/prompts/     - Prompts e instrucoes para IA                                    ║
 * ║    src/services/    - Servicos (NER, embeddings)                                      ║
 * ║    src/types/       - Interfaces TypeScript                                           ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useEffect, useRef } from 'react';
import { Upload, FileText, Save, AlertCircle, BookOpen, Book, Scale, X } from 'lucide-react';
import { useAuth } from './components/LoginScreen';

// v1.34.0: Cloud Sync - Magic Link Authentication + SQLite Sync
import useCloudSync, { type UseCloudSyncReturn } from './hooks/useCloudSync';
import LoginMagicModal from './components/LoginMagicModal';

// v1.36.61+: Zustand Stores - Estado global gerenciado
// useModalManagerCompat movido para src/hooks/useModalManager.ts (v1.36.78)
import { useUIStore } from './stores/useUIStore';
import { useModelsStore } from './stores/useModelsStore';
// v1.40.05: Novas stores para editor e regeneração
import { useEditorStore } from './stores/useEditorStore';
// useRegenerationStore disponível para componentes que precisam de estado de regeneração
// Componentes filhos importam diretamente quando necessário
// import { useRegenerationStore } from './stores/useRegenerationStore';
// useModelLibraryCompat movido para src/hooks/useModelLibrary.ts (v1.36.78)
// useTopicManagerCompat movido para src/hooks/useTopicManager.ts (v1.36.77)
// useProofManagerCompat movido para src/hooks/useProofManager.ts (v1.36.76)

// v1.36.66: Hooks TIER 0 extraídos para arquivos separados
// v1.36.69: useIndexedDB (TIER 1), validateModel, sanitizeModel extraídos
// v1.36.72: useJurisprudencia extraído
// v1.36.73: useChatAssistant extraído
// v1.36.74: useModelPreview extraído
// v1.36.75: useLocalStorage extraído (inclui PDF IndexedDB helpers)
// v1.36.76: useProofManager, useDocumentManager extraídos
// v1.36.77: useTopicManager extraído
// v1.36.78: useModalManager, useModelLibrary extraídos
// v1.36.79: useQuillEditor, useDocumentServices extraídos
// v1.36.80: useAIIntegration extraído
// v1.36.81: useDocumentAnalysis extraído
import { useSpacingControl, useFontSizeControl, useFeatureFlags, useAPICache, usePrimaryTabLock, useFieldVersioning, useThemeManagement, useTabbedInterface, useIndexedDB, useLegislacao, useJurisprudencia, useChatAssistant, useModelPreview, useLocalStorage, useProofManager, useDocumentManager, useTopicManager, useModalManager, useModelLibrary, searchModelsInLibrary, useDocumentServices, useAIIntegration, useDocumentAnalysis, useReportGeneration, useProofAnalysis, useTopicOrdering, useDragDropTopics, useTopicOperations, useModelGeneration, useEmbeddingsManagement, useModelSave, useDispositivoGeneration, useDecisionTextGeneration, useFactsComparison, useModelExtraction, useDetectEntities, useExportImport, useDecisionExport, useSlashMenu, useFileHandling, useNERManagement, useChangeDetectionHashes, useSemanticSearchManagement, useQuillInitialization, useTopicValidation, useKeyboardShortcuts, useEditorHandlers, useReviewSentence, type AIIntegrationForReview, useSemanticSearchHandlers, useModelSuggestions, useMultiTabSync, useDriveFileHandlers, useSessionCallbacks, useTopicEditing, useModelEditing, useProofModalCallbacks, useGoogleDriveActions, useProvaOralImport } from './hooks';
import { API_BASE } from './constants/api';
import { APP_VERSION } from './constants/app-version';

// v1.34.4: Admin Panel - Gerenciamento de emails autorizados
import AdminPanel from './components/AdminPanel';

// v1.38.0: Analisador de Prepauta - Rota /analise
import { AnalisadorApp } from './apps/analisador';

// v1.39.08: Análise de Prova Oral - Rota /prova-oral
import { ProvaOralApp } from './apps/prova-oral';
import type { SavedProvaOralAnalysis } from './apps/prova-oral/types';
import { formatProvaOralSections, type ProvaOralSectionKey, type FormatProvaOralOptions } from './utils/formatProvaOralImport';

// v1.35.30: Modal de curadoria de tópicos pré-geração
import TopicCurationModal from './components/TopicCurationModal';

// v1.35.40: Google Drive - Salvar/Carregar projetos na nuvem
import { GoogleOAuthProvider } from '@react-oauth/google';
import { useGoogleDrive, GOOGLE_CLIENT_ID } from './hooks/useGoogleDrive';
import { DriveFilesModal } from './components/GoogleDriveButton';
import { ModelGeneratorModal } from './components/ModelGeneratorModal';
import { FactsComparisonModalContent } from './components/FactsComparisonModal';
import { BaseModal, ExtractModelConfirmModal, ExtractedModelPreviewModal, AddProofTextModal, ProofAnalysisModal, LinkProofModal, RestoreSessionModal, ClearProjectModal, LogoutConfirmModal, ConfirmBulkCancelModal, DeleteProofModal, JurisprudenciaTab, LegislacaoTab, AIAssistantModal, AIAssistantModelModal, AnalysisModal, AnonymizationNamesModal, ShareLibraryModal, AcceptSharePage, DispositivoModal, BulkReviewModal, BulkUploadModal, SlashCommandMenu, JurisprudenciaModal, ModelPreviewModal, LockedTabOverlay, GlobalEditorModal, ConfigModal, ModelsTab, UploadTab, ProofsTab, TopicsTab, EditorTabContent, ErrorBoundary, ModalRoot, AppHeader } from './components';
import useChatHistoryCache from './hooks/useChatHistoryCache';

// v1.35.26: Prompts de IA movidos para src/prompts/
// v1.37.18: buildDocumentContentArray, buildMiniReportPrompt, buildBatchMiniReportPrompt extraídos
import { AI_INSTRUCTIONS_STYLE, AI_PROMPTS, buildDocumentContentArray } from './prompts';

// v1.36.95: Estilos centralizados
import { CSS } from './constants/styles';

// v1.37.0: Estilos CSS-in-JS extraídos
import { GlobalHoverStyles, ThemeStyles } from './styles';

// v1.37.51: Componentes UI e Modais extraídos
import { Toast } from './components/ui/Toast';
import { AutoSaveIndicator } from './components/ui/AutoSaveIndicator';
// v1.38.51: ChangelogModal movido para ModalRoot
import { SentenceReviewOptionsModal, SentenceReviewResultModal } from './components/modals/SentenceReviewModals';
import { DataDownloadModal, EmbeddingsDownloadModal } from './components/modals/DownloadModals';

// v1.36.60: AIModelService extraído para src/services/
import AIModelService from './services/AIModelService';

// v1.36.81: TFIDFSimilarity movido para useModelEditing hook

// v1.36.81: Utilitários extraídos
import { normalizeHTMLSpacing, isSpecialTopic, isRelatorio, isDispositivo, generateModelId } from './utils/text';
import { searchModelsBySimilarity } from './utils/models';

// v1.36.96: Context helpers extraídos
import { fastHashUtil } from './utils/context-helpers';
import { htmlToFormattedText } from './utils/html-conversion';

// v1.35.79: Tipos TypeScript centralizados (ETAPA 0 reorganização completa)
import type {
  Topic, Model, ProofFile, ProofText,
  QuillInstance, QuillDelta,
  TargetField,
  SessionState,
  ModalKey
} from './types';

// v1.33.58: dnd-kit para drag and drop com suporte a wheel scroll
import { PointerSensor, useSensor, useSensors } from '@dnd-kit/core';

// 🔧 VERSÃO DA APLICAÇÃO - Importado de src/constants/app-version.ts


// v1.33.31: API_BASE movido para src/constants/api.ts (v1.36.80)

// v1.35.25: CHANGELOG movido para src/constants/changelog.js

const AUTO_SAVE_DEBOUNCE_MS = 5000;

// v1.19.0: Limite de mensagens no chat do assistente IA
// MAX_CHAT_HISTORY_MESSAGES extraído para src/hooks/useChatAssistant.ts (v1.36.73)

// v1.36.95: INSTRUCAO_NAO_PRESUMIR movido para src/prompts/instrucoes.ts
// v1.36.95: CSS, RESULTADO_STYLES, getResultadoStyle movidos para src/constants/styles.ts

// v1.32.00: LocalAIProcessingOverlay removido - IA agora roda em Web Worker (não bloqueia UI)

// v1.36.81: Serviços e utilitários extraídos para src/services/ e src/utils/
// TFIDFSimilarity, EmbeddingsService, JurisEmbeddingsService, EmbeddingsCDNService -> src/services/EmbeddingsServices.ts
// anonymizeText, normalizeHTMLSpacing, removeMetaComments, topic helpers -> src/utils/text.ts
// jurisprudencia helpers (findJurisprudenciaHelper, stemJuridico, etc.) -> src/utils/jurisprudencia.ts
// searchModelsBySimilarity -> src/utils/models.ts

// 🔍 MODEL VALIDATION & SANITIZATION (v1.36.69) - extraídos para src/hooks/useIndexedDB.ts

// useProofManager extraído para src/hooks/useProofManager.ts (v1.36.76)

// useDocumentManager extraído para src/hooks/useDocumentManager.ts (v1.36.76)

// useTopicManager extraído para src/hooks/useTopicManager.ts (v1.36.77)

// useChatAssistant extraído para src/hooks/useChatAssistant.ts (v1.36.73)

// useJurisprudencia extraído para src/hooks/useJurisprudencia.ts (v1.36.72)

// useLegislacao extraído para src/hooks/useLegislacao.ts (v1.36.71)

// SpacingDropdown, FontSizeDropdown, VersionCompareModal, VersionSelect extraídos para src/components/ (v1.36.82-83)

// 💡 SuggestionCard e SplitDivider extraídos para src/components/cards/ (v1.36.82)

// 🔧 FullscreenModelPanel, ModelSearchPanel extraídos para src/components/panels/ (v1.36.87)
// 🔧 JurisprudenciaTab, LegislacaoTab extraídos para src/components/panels/ (v1.36.87)

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 📋 SEÇÃO 5: MODAIS ESPECÍFICOS
// ~50 modais: RenameTopicModal, DeleteTopicModal, GlobalEditorModal, ConfigModal, etc.
// ═══════════════════════════════════════════════════════════════════════════════════════════

// 🔧 BaseModal, ModalFooter, ModalWarningBox, ModalInfoBox, ModalAmberBox, ModalContentPreview extraídos para src/components/modals/BaseModal.tsx (v1.36.85)
// 🔧 RenameTopicModal, DeleteTopicModal, MergeTopicsModal, SplitTopicModal, NewTopicModal extraídos para src/components/modals/TopicModals.tsx (v1.36.85)
// 🔧 DeleteModelModal, DeleteAllModelsModal, DeleteAllPrecedentesModal extraídos para src/components/modals/ModelModals.tsx (v1.36.85)

// Modal: Confirmar Extração de Modelo
// 🔧 ExtractModelConfirmModal extraído para src/components/modals/ModelExtractionModals.tsx (v1.36.88)

// Modal: Preview de Modelo Extraído
// 🔧 ExtractedModelPreviewModal extraído para src/components/modals/ModelExtractionModals.tsx (v1.36.88)

// 🔧 AddProofTextModal extraído para src/components/modals/ProofModals.tsx (v1.36.85)

// v1.33.45: Migrado para BaseModal
// 🔧 ProofAnalysisModal extraído para src/components/modals/ProofModals.tsx (v1.36.89)

// v1.33.45: Migrado para BaseModal
// 🔧 LinkProofModal extraído para src/components/modals/ProofModals.tsx (v1.36.89)

// 🔧 DeleteProofModal extraído para src/components/modals/ProofModals.tsx (v1.36.85)

// 💬 Chat components (ChatBubble, ChatHistoryArea, ChatInput, InsertDropdown) extraídos para src/components/chat/ (v1.36.84)









// 🔧 RestoreSessionModal, ClearProjectModal, LogoutConfirmModal extraídos para src/components/modals/SessionModals.tsx (v1.36.85)


// Modal: Anonimização (migrado para BaseModal) - v1.25: + NER
// v1.29.03: Adicionar overlay IA Local durante detecção

// 🔧 TextPreviewModal extraído para src/components/modals/TextPreviewModal.tsx (v1.36.85)


// 🔧 BulkDiscardConfirmModal, ConfirmBulkCancelModal extraídos para src/components/modals/BulkModals.tsx (v1.36.85)

// 🔧 LockedTabOverlay extraído para src/components/ui/LockedTabOverlay.tsx (v1.36.98)

// 🔍 Modal de Aviso de Similaridade (v1.13.3 - Comparação lado a lado)
// v1.33.3: Feedback visual "Salvando..." durante geração de embedding
// 🔧 SimilarityWarningModal extraído para src/components/modals/ModelExtractionModals.tsx (v1.36.88)






// 📝 LINKED PROOFS MODAL (v1.12.14)



// v1.36.97: GlobalEditorSection movido para src/components/editors/GlobalEditorSection.tsx

// 🔧 GlobalEditorModal extraído para src/components/modals/GlobalEditorModal.tsx (v1.36.99)

// v1.36.96: prepareDocumentsContext movido para src/utils/context-helpers.ts

// v1.36.96: prepareProofsContext, prepareOralProofsContext movidos para src/utils/context-helpers.ts

// ═══════════════════════════════════════════════════════════════════════════════════════════
// ✏️ SEÇÃO 6: QUILL EDITOR
// QuillEditorBase, QuillModelEditor, QuillDecisionEditor, QuillMiniRelatorioEditor
// ═══════════════════════════════════════════════════════════════════════════════════════════

// 🔧 QUILL.JS UTILITY FUNCTIONS (v1.4.0 - FASE 4)






// v1.36.97: DecisionEditorContainer movido para src/components/editors/DecisionEditorContainer.tsx

// v1.36.96: fastHashUtil movido para src/utils/context-helpers.ts

// useDocumentServices extraído para src/hooks/useDocumentServices.ts (v1.36.79)

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 🤖 SEÇÃO 7: AI_PROMPTS
// v1.35.26: AI_PROMPTS movido para src/prompts/ai-prompts.js (~820 linhas extraídas)
// ═══════════════════════════════════════════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════════════════════════════════════════
// ⚖️ SEÇÃO 8: LEGALDECISIONEDITOR
// Componente principal da aplicação (~12.500 linhas)
// Contém: handleAnalyzeDocuments, generateDispositivo
// analyzeProof extraído para useProofAnalysis hook (v1.36.73)
// reorderTopicsViaLLM extraído para useTopicOrdering hook (v1.37.5)
// ═══════════════════════════════════════════════════════════════════════════════════════════

// 📦 COMPONENTE PRINCIPAL: LegalDecisionEditor
// v1.34.1: Adicionado props receivedModels e clearReceivedModels para merge de sync
const LegalDecisionEditor = ({ onLogout, cloudSync, receivedModels, activeSharedLibraries, clearReceivedModels, setModelsLoaded }: {
  onLogout: () => void;
  cloudSync: UseCloudSyncReturn;
  receivedModels: Model[] | null;
  activeSharedLibraries: Array<{ ownerId: string; ownerEmail: string }> | null;
  clearReceivedModels: () => void;
  /** v1.37.78: Callback para indicar que modelos foram carregados do IndexedDB */
  setModelsLoaded: (loaded: boolean) => void;
}) => {

  // 🎣 CUSTOM HOOKS
  // v1.37.38: toast, showToast, clearToast agora vêm do useUIStore via useModalManager
  // v1.38.51: textPreview, setTextPreview removidos - migrados para ModalRoot
  const { modals, openModal, closeModal, showToast } = useModalManager();
  const aiIntegration = useAIIntegration();
  const featureFlags = useFeatureFlags();
  const indexedDB = useIndexedDB();   const apiCache = useAPICache(50, 5 * 60 * 1000); // 🚀 v1.8.2: Cache de API (50 entradas, TTL 5min)
  const storage = useLocalStorage();
  const modelLibrary = useModelLibrary();

  // v1.35.1: Merge modelos recebidos do servidor (APÓS IndexedDB carregar)
  // IMPORTANTE: Modelos compartilhados são SUBSTITUÍDOS (não mesclados) para refletir exclusões do proprietário
  // v1.35.1: Extrair apenas as propriedades necessárias para evitar re-renders desnecessários
  const { models: libraryModels, setModels: setLibraryModels, isLoadingModels } = modelLibrary;
  const { isAvailable: indexedDBAvailable, saveModels: saveToIndexedDB } = indexedDB;

  // v1.35.4: Usar ref para libraryModels evitando dependência circular no useEffect abaixo
  // Antes: libraryModels estava nas deps do effect, mas o effect chamava setLibraryModels(),
  // causando loop infinito de re-renders que congelava a UI durante digitação
  const libraryModelsRef = React.useRef(libraryModels);
  libraryModelsRef.current = libraryModels;

  React.useEffect(() => {
    // Esperar IndexedDB terminar de carregar antes de fazer merge
    if (isLoadingModels || !indexedDBAvailable) {
      return;
    }

    // v1.35.4: Usar ref para evitar dependência circular
    const currentLibraryModels = libraryModelsRef.current;

    // v1.35.1: Executar merge se recebeu modelos OU se tem modelos compartilhados locais que podem ter sido deletados
    const hasLocalSharedModels = currentLibraryModels.some(m => m.isShared);
    if (receivedModels && (receivedModels.length > 0 || hasLocalSharedModels)) {
      console.log(`[Sync] Merge: ${receivedModels.length} do servidor + ${currentLibraryModels.length} locais (${hasLocalSharedModels ? 'tem' : 'sem'} compartilhados locais)`);

      // v1.35.1: Separar modelos próprios dos compartilhados
      // v1.35.21: Também separar compartilhados locais para preservar quando servidor não retorna
      const localOwnModels = currentLibraryModels.filter(m => !m.isShared);
      const localSharedModels = currentLibraryModels.filter(m => m.isShared);
      const serverOwnModels = receivedModels.filter((m: Model) => !m.isShared);
      const serverSharedModels = receivedModels.filter((m: Model) => m.isShared);

      // Merge apenas para modelos PRÓPRIOS
      const merged = new Map(localOwnModels.map(m => [m.id, m]));
      for (const serverModel of serverOwnModels) {
        if (serverModel.deletedAt) {
          merged.delete(serverModel.id);
        } else {
          const local = merged.get(serverModel.id);
          if (!local || new Date(serverModel.updatedAt || 0) > new Date(local.updatedAt || 0)) {
            merged.set(serverModel.id, serverModel);
          }
        }
      }

      // v1.35.24: Filtrar compartilhados locais por owners que ainda têm acesso ativo
      // Isso resolve B8b: quando share é removido, modelos desse owner são excluídos no próximo sync
      const activeOwnerIds = new Set((activeSharedLibraries || []).map((lib: { ownerId: string }) => lib.ownerId));
      const validLocalSharedModels = localSharedModels.filter(m => m.ownerId && activeOwnerIds.has(m.ownerId));

      if (localSharedModels.length !== validLocalSharedModels.length) {
        console.log(`[Sync] Removidos ${localSharedModels.length - validLocalSharedModels.length} modelos de owners sem acesso`);
      }

      // v1.35.21: Preservar compartilhados locais (validados) se servidor não retornou nenhum
      // Isso evita perder modelos quando sync incremental não retorna compartilhados
      // (porque nenhum foi atualizado desde lastSyncAt)
      // Quando servidor retorna compartilhados, substituir completamente (para refletir exclusões)
      const finalSharedModels = serverSharedModels.length > 0
        ? serverSharedModels  // Servidor retornou compartilhados → substituir
        : validLocalSharedModels;  // Servidor não retornou → preservar apenas de owners válidos

      // Combinar: modelos próprios mesclados + compartilhados (servidor ou locais preservados)
      const mergedModels = [...Array.from(merged.values()), ...finalSharedModels];
      console.log(`[Sync] Merge resultado: ${merged.size} próprios + ${finalSharedModels.length} compartilhados (${serverSharedModels.length > 0 ? 'servidor' : 'local'}) = ${mergedModels.length} total`);

      // Atualizar state
      setLibraryModels(mergedModels);

      // v1.34.7: Salvar IMEDIATAMENTE no IndexedDB (não esperar debounce)
      saveToIndexedDB(mergedModels).then(() => {
        // v1.37.75: Filtrar compartilhados para consistência com servidor
        const ownModels = mergedModels.filter(m => !m.isShared);
        localStorage.setItem('sentencify-models-count', String(ownModels.length));
        console.log(`[Sync] Salvo ${mergedModels.length} modelos no IndexedDB (${ownModels.length} próprios)`);
      }).catch(err => {
        console.error('[Sync] Erro ao salvar no IndexedDB:', err);
      });

      clearReceivedModels();
    }
  }, [receivedModels, activeSharedLibraries, clearReceivedModels, setLibraryModels, isLoadingModels, indexedDBAvailable, saveToIndexedDB]);
  // ↑ v1.35.4: Removido libraryModels das deps - usamos libraryModelsRef para evitar loop
  // ↑ v1.35.24: Adicionado activeSharedLibraries para filtrar owners revogados

  // 📜 v1.24: Versionamento de campos (Editor Individual)
  const fieldVersioning = useFieldVersioning();

  // ☁️ v1.35.40: Google Drive - Salvar/Carregar projetos
  const googleDrive = useGoogleDrive();
  // v1.37.49: driveFilesModalOpen e driveFiles migrados para useUIStore
  const driveFilesModalOpen = useUIStore((s) => s.modals.driveFiles);
  const setDriveFilesModalOpen = React.useCallback((open: boolean) => {
    if (open) useUIStore.getState().openModal('driveFiles');
    else useUIStore.getState().closeModal('driveFiles');
  }, []);
  const driveFiles = useUIStore((s) => s.driveFilesList);
  const setDriveFiles = useUIStore((s) => s.setDriveFilesList);

  // 🪄 v1.35.69: Gerador de Modelo a partir de Exemplos (v1.35.77: +estiloRedacao)
  // v1.37.49: modelGeneratorModal migrado para useUIStore
  const modelGeneratorModalOpen = useUIStore((s) => s.modals.modelGenerator);
  const modelGeneratorTargetField = useUIStore((s) => s.modelGeneratorTargetField) as TargetField | null;
  const modelGeneratorModal = React.useMemo(() => ({
    isOpen: modelGeneratorModalOpen,
    targetField: modelGeneratorTargetField
  }), [modelGeneratorModalOpen, modelGeneratorTargetField]);

  const closeModelGenerator = React.useCallback(() => {
    useUIStore.getState().closeModelGenerator();
  }, []);

  const handleModelGenerated = React.useCallback((generatedPrompt: string) => {
    const { targetField } = modelGeneratorModal;
    if (targetField) {
      // v1.35.77: estiloRedacao salva em customPrompt (não em estiloRedacao)
      const settingKey = targetField === 'estiloRedacao' ? 'customPrompt' : targetField;
      aiIntegration.setAiSettings(prev => ({
        ...prev,
        [settingKey]: generatedPrompt
      }));
    }
    closeModelGenerator();
  }, [modelGeneratorModal.targetField, aiIntegration.setAiSettings, closeModelGenerator]);

  const getHardcodedPrompt = React.useCallback((targetField: string) => {
    const prompts: Record<string, string> = {
      modeloRelatorio: AI_PROMPTS.instrucoesRelatorioPadrao || '',
      modeloDispositivo: AI_PROMPTS.instrucoesDispositivoPadrao || '',
      modeloTopicoRelatorio: AI_PROMPTS.instrucoesRelatorioPadrao || '',
      estiloRedacao: AI_INSTRUCTIONS_STYLE // v1.35.77: Estilo de redação usa AI_INSTRUCTIONS_STYLE como referência
    };
    return prompts[targetField] || '';
  }, []);

  // 📄 v1.9.12: Serviços de Processamento de Documentos ────────────────────
  const documentServices = useDocumentServices(aiIntegration);

  const proofManager = useProofManager(documentServices);   const documentManager = useDocumentManager(storage.clearPdfCache);   const topicManager = useTopicManager();   const modelPreview = useModelPreview(); // Preview de modelos sugeridos

  // v1.39.08: Import de análises de Prova Oral
  const provaOralImport = useProvaOralImport();
  const [provaOralAnalyses, setProvaOralAnalyses] = React.useState<SavedProvaOralAnalysis[]>([]);
  const [selectedProvaOralAnalysis, setSelectedProvaOralAnalysis] = React.useState<SavedProvaOralAnalysis | null>(null);
  const [isImportingProvaOral, setIsImportingProvaOral] = React.useState(false);

  // 🤖 v1.19.0: Chat interativo do assistente IA (Editor Individual)
  // v1.37.94: Adicionado cache para persistência do histórico
  // v1.37.95: isOpen força reload ao abrir (sincroniza após clear em outro editor)
  const chatHistoryCache = useChatHistoryCache();
  const chatAssistant = useChatAssistant(aiIntegration, {
    topicTitle: topicManager.editingTopic?.title,
    isOpen: modals.aiAssistant,
    saveChat: chatHistoryCache.saveChat,
    getChat: chatHistoryCache.getChat,
    deleteChat: chatHistoryCache.deleteChat
  });

  // v1.38.16: Toggle "Incluir petições e contestações" persistido por tópico
  const [topicIncludeMainDocs, setTopicIncludeMainDocsState] = React.useState(false);

  // v1.38.16: Wrapper que persiste no cache
  const setTopicIncludeMainDocs = React.useCallback((value: boolean) => {
    setTopicIncludeMainDocsState(value);
    const topicTitle = topicManager.editingTopic?.title;
    if (topicTitle) {
      chatHistoryCache.setIncludeMainDocs(topicTitle, value);
    }
  }, [topicManager.editingTopic?.title, chatHistoryCache]);

  // v1.38.16: Carregar includeMainDocs do cache ao abrir assistente
  React.useEffect(() => {
    const loadIncludeMainDocs = async () => {
      const topicTitle = topicManager.editingTopic?.title;
      if (modals.aiAssistant && topicTitle) {
        const savedInclude = await chatHistoryCache.getIncludeMainDocs(topicTitle);
        setTopicIncludeMainDocsState(savedInclude);
      }
    };
    loadIncludeMainDocs();
  }, [modals.aiAssistant, topicManager.editingTopic?.title, chatHistoryCache]);

  // v1.39.06: Toggle "Incluir documentos complementares" persistido por tópico
  const [topicIncludeComplementaryDocs, setTopicIncludeComplementaryDocsState] = React.useState(false);

  // v1.39.06: Wrapper que persiste no cache
  const setTopicIncludeComplementaryDocs = React.useCallback((value: boolean) => {
    setTopicIncludeComplementaryDocsState(value);
    const topicTitle = topicManager.editingTopic?.title;
    if (topicTitle) {
      chatHistoryCache.setIncludeComplementaryDocs(topicTitle, value);
    }
  }, [topicManager.editingTopic?.title, chatHistoryCache]);

  // v1.39.06: Carregar includeComplementaryDocs do cache ao abrir assistente
  React.useEffect(() => {
    const loadIncludeComplementaryDocs = async () => {
      const topicTitle = topicManager.editingTopic?.title;
      if (modals.aiAssistant && topicTitle) {
        const savedInclude = await chatHistoryCache.getIncludeComplementaryDocs(topicTitle);
        setTopicIncludeComplementaryDocsState(savedInclude);
      }
    };
    loadIncludeComplementaryDocs();
  }, [modals.aiAssistant, topicManager.editingTopic?.title, chatHistoryCache]);

  // v1.13.9: Ref para auto-save debounced no Editor Individual
  const individualAutoSaveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // v1.13.9: Auto-save com debounce no Editor Individual
  React.useEffect(() => {
    const editingTopic = topicManager.editingTopic;
    if (!editingTopic) return;

    // Limpar timer anterior
    if (individualAutoSaveTimerRef.current) {
      clearTimeout(individualAutoSaveTimerRef.current);
    }

    // Debounce: aguardar 3s antes de sincronizar
    individualAutoSaveTimerRef.current = setTimeout(() => {
      // Sincronizar editingTopic → selectedTopics
      topicManager.setSelectedTopics(prev =>
        prev.map(t => t.title === editingTopic.title ? { ...t, ...editingTopic } : t)
      );
      topicManager.setExtractedTopics(prev =>
        prev.map(t => t.title === editingTopic.title ? { ...t, ...editingTopic } : t)
      );
    }, AUTO_SAVE_DEBOUNCE_MS);

    return () => {
      if (individualAutoSaveTimerRef.current) {
        clearTimeout(individualAutoSaveTimerRef.current);
      }
    };
  }, [topicManager.editingTopic]);

  // v1.13.9: Detectar se há mudanças não salvas no Editor Individual
  // v1.35.3: Extrair valores primitivos para evitar recálculo desnecessário a cada keystroke
  // Nota: não declarar editingTopic aqui pois já é destructured de topicManager mais abaixo (linha ~19820)
  const editingTopicTitle = topicManager.editingTopic?.title;
  const editingTopicFundamentacao = topicManager.editingTopic?.editedFundamentacao;
  const editingTopicRelatorio = topicManager.editingTopic?.editedRelatorio;
  const editingTopicContent = topicManager.editingTopic?.editedContent;
  const editingTopicCategory = topicManager.editingTopic?.category;

  // v1.37.21: Estados para Confronto de Fatos movidos para useFactsComparison hook
  // (factsComparisonResultIndividual, generatingFactsComparisonIndividual, factsComparisonErrorIndividual, factsComparisonCacheIndividual)

  const isIndividualDirty = React.useMemo(() => {
    if (!editingTopicTitle) return false;

    const original = topicManager.selectedTopics.find(t => t.title === editingTopicTitle);
    if (!original) return false;

    // Comparar campos editáveis
    return (
      editingTopicFundamentacao !== original.editedFundamentacao ||
      editingTopicRelatorio !== original.editedRelatorio ||
      editingTopicContent !== original.editedContent ||
      editingTopicCategory !== original.category
    );
  }, [editingTopicTitle, editingTopicFundamentacao, editingTopicRelatorio, editingTopicContent, editingTopicCategory, topicManager.selectedTopics]);

  // 📏 v1.10.13: Hooks de configuração global de editor (para Quick Edit)
  const { spacing, setSpacing } = useSpacingControl();
  const { fontSize, setFontSize } = useFontSizeControl();

  // 🔒 v1.9.5: Sistema de Lock de Aba Primária ────────────────────────────
  const primaryTabLock = usePrimaryTabLock();

  // 💓 v1.33.31: Heartbeat keepalive (evita Render free tier dormir)
  const HEARTBEAT_INTERVAL = 10 * 60 * 1000; // 10 minutos
  React.useEffect(() => {
    // Só ativa em produção
    if (!import.meta.env.PROD) return;

    const keepAlive = async () => {
      try {
        await fetch(`${API_BASE}/api/health`, { method: 'GET' });
      } catch (err) {
        // Silencioso - servidor pode estar acordando
      }
    };

    // Primeiro heartbeat imediato (acorda servidor se dormindo)
    keepAlive();

    // Heartbeats periódicos
    const interval = setInterval(keepAlive, HEARTBEAT_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  // 🎨 v1.37.37: Sistema de Tema - extraído para useThemeManagement (FASE 35)
  const { appTheme, editorTheme, toggleAppTheme, toggleEditorTheme } = useThemeManagement();

  // v1.40.05: Sincronizar stores com hooks existentes
  const editorStoreSetTheme = useEditorStore((s) => s.setEditorTheme);
  const editorStoreSetQuillReady = useEditorStore((s) => s.setQuillReady);
  const editorStoreSetQuillError = useEditorStore((s) => s.setQuillError);

  // 🧠 v1.37.41: Estados NER - extraído para useNERManagement (FASE 40)
  // v1.40.07: Removidas variáveis não utilizadas (agora em ConfigModal)
  const {
    detectingNames, nerEnabled, nerIncludeOrg,
    setNerModelReady, setDetectingNames
  } = useNERManagement();

  // 🔍 v1.37.43: Busca Semântica - extraído para useSemanticSearchManagement (FASE 42)
  // v1.40.07: Removidas variáveis não utilizadas (agora em ConfigModal)
  const {
    searchModelReady,
    setSearchModelReady
  } = useSemanticSearchManagement();

  // 📝 v1.37.42: Quill/DOMPurify - extraído para useQuillInitialization (FASE 43)
  const {
    quillReady, quillError,
    sanitizeHTML
  } = useQuillInitialization();

  // v1.40.05: Sincronizar stores com valores dos hooks
  React.useEffect(() => {
    if (editorTheme) {
      editorStoreSetTheme(editorTheme as 'dark' | 'light');
    }
  }, [editorTheme, editorStoreSetTheme]);

  React.useEffect(() => {
    editorStoreSetQuillReady(quillReady);
  }, [quillReady, editorStoreSetQuillReady]);

  React.useEffect(() => {
    editorStoreSetQuillError(quillError);
  }, [quillError, editorStoreSetQuillError]);

  // v1.32.24: Modal de changelog
  // v1.37.49: showChangelogModal migrado para useUIStore
  const setShowChangelogModal = React.useCallback((open: boolean) => {
    if (open) useUIStore.getState().openModal('changelog');
    else useUIStore.getState().closeModal('changelog');
  }, []);

  // 💾 PERSISTÊNCIA AUTOMÁTICA: Load/Save modelos (v1.7)

  // Ref para garantir que load só execute UMA VEZ
  const hasLoadedModelsRef = React.useRef(false);

  // Ref para rastrear último array de models salvo (otimização de performance)
  const lastSavedModelsRef = React.useRef<string | null>(null);

  // 🚀 OTIMIZAÇÃO v1.7: Fast hash ao invés de JSON.stringify (FASE 1.2) ──────
  // Hash rápido baseado apenas em IDs e timestamps (~1ms vs 50-200ms stringify)
  const modelsHashRef = React.useRef<string | null>(null);

  const fastHash = React.useCallback((str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0; // Convert to 32bit integer
    }
    return hash.toString(36);
  }, []);

  // Calcular hash dos modelos (apenas IDs + timestamps, não conteúdo completo)
  const currentModelsHash = React.useMemo(() => {
    if (modelLibrary.models.length === 0) return 'empty';

    // Signature baseada em metadados (rápido)
    const signature = modelLibrary.models
      .map(m => `${m.id}-${m.updatedAt || m.createdAt || ''}`)
      .join('|');

    return fastHash(signature);
  }, [modelLibrary.models, fastHash]); // 🐛 BUGFIX: models completo (detecta edições), não só length

  // 🚀 OTIMIZAÇÃO v1.7: Auto-save com dirty tracking (FASE 1.1) ──────────────
  // v1.37.49: autoSaveDirty migrado para useUIStore
  const autoSaveDirty = useUIStore((s) => s.autoSaveDirty);
  const setAutoSaveDirty = useUIStore((s) => s.setAutoSaveDirty);
  const lastAutoSaveSnapshotRef = React.useRef<string | null>(null);
  const autoSaveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // v1.12.28: Ref para snapshot atualizado (evita stale closure no auto-save)
  const currentSessionSnapshotRef = React.useRef<SessionState | null>(null);

  // Helper: marcar sessão como dirty (needs save)
  const markSessionDirty = React.useCallback(() => {
    useUIStore.getState().setAutoSaveDirty(true);
  }, []);

  // 🚀 OTIMIZAÇÃO v1.7 (FASE 1.3): Batch DOM updates para evitar múltiplos reflows
  // Antes: 3 innerHTML = 3 reflows (~300ms total)
  // Depois: 1 RAF batch = 1 reflow (~100ms)
  // v1.35.92: Tipo union para suportar refs diretos e Quill refs

  // 🔄 MULTI-TAB SYNC: v1.37.46 - Hook extraído
  useMultiTabSync({
    indexedDB,
    featureFlags,
    lastSavedModelsRef,
  });

  // Load Models no mount
  React.useEffect(() => {
    // Skip if already loaded
    if (hasLoadedModelsRef.current) {
      return;
    }

    // Skip if IndexedDB feature flag is disabled
    if (!featureFlags.isEnabled('useIndexedDB')) {
      setModelsLoaded(true); // v1.37.78: Se IndexedDB desabilitado, marcar como carregado
      return;
    }

    // Wait for IndexedDB to be initialized (isAvailable becomes true AFTER dbInstance is ready)
    if (!indexedDB.isAvailable) {
      return;
    }

    let isMounted = true;

    const loadModelsFromStorage = async () => {
      modelLibrary.setIsLoadingModels(true);
      modelLibrary.setPersistenceError(null);

      try {
        const loadedModels = await indexedDB.loadModels();

        if (isMounted && loadedModels && loadedModels.length > 0) {
          modelLibrary.setModels(loadedModels);
          hasLoadedModelsRef.current = true; // Marcar como carregado
          setModelsLoaded(true); // v1.37.78: Notificar que modelos foram carregados
        } else if (isMounted) {
          hasLoadedModelsRef.current = true; // Marcar como carregado mesmo se vazio
          setModelsLoaded(true); // v1.37.78: Notificar mesmo se vazio
        }
      } catch (err) {
        if (isMounted) {
          modelLibrary.setPersistenceError((err as Error).message);
        }
      } finally {
        if (isMounted) {
          modelLibrary.setIsLoadingModels(false);
        }
      }
    };

    loadModelsFromStorage();

    return () => {
      isMounted = false;
    };
  }, [indexedDB.isAvailable, setModelsLoaded]); // v1.37.78: Added setModelsLoaded

  // Save Models quando mudarem (v1.7 FASE 1.2: hash ao invés de stringify)
  React.useEffect(() => {
    // Skip if IndexedDB feature flag is disabled
    if (!featureFlags.isEnabled('useIndexedDB')) {
      return;
    }

    // Skip if IndexedDB is not available
    if (!indexedDB.isAvailable) {
      return;
    }

    // Skip if currently loading (to avoid save loop)
    if (modelLibrary.isLoadingModels) {
      return;
    }

    // Skip first load when models is empty array (not yet loaded)
    if (modelLibrary.models.length === 0 && !hasLoadedModelsRef.current) {
      return;
    }

    // 🚀 OTIMIZAÇÃO v1.7 (FASE 1.2): Hash comparison ao invés de JSON.stringify
    // Antes: JSON.stringify(100 models) = 50-200ms de bloqueio
    // Depois: Hash apenas IDs+timestamps = ~1ms
    const lastHash = modelsHashRef.current;

    if (currentModelsHash === lastHash) {
      // Nenhuma mudança real detectada, skip save
      return;
    }

    // Debounce save to avoid excessive writes
    const timeoutId = setTimeout(async () => {
      try {
        await indexedDB.saveModels(modelLibrary.models);

        // v1.37.75: Filtrar compartilhados para consistência com servidor
        const ownModels = modelLibrary.models.filter(m => !m.isShared);
        localStorage.setItem('sentencify-models-count', String(ownModels.length));

        // Atualizar ref com hash atual
        modelsHashRef.current = currentModelsHash;

        modelLibrary.setPersistenceError(null);
      } catch (err) {
        modelLibrary.setPersistenceError((err as Error).message);
      }
    }, 1500); // 🚀 v1.8.1: 1500ms debounce (-20% saves em edições rápidas)

    return () => clearTimeout(timeoutId);
  }, [currentModelsHash, modelLibrary.isLoadingModels]); // Hash ao invés de models array

  // 🎨 v1.37.37: Navegação - extraído para useTabbedInterface (FASE 32)
  const { activeTab, setActiveTab } = useTabbedInterface();
  // 🔔 v1.37.38: toast e showToast extraídos para useUIStore (vem do useModalManager acima)
  // v1.37.49: error, copySuccess migrados para useUIStore
  const error = useUIStore((s) => s.error);
  const setError = useUIStore((s) => s.setError);
  const copySuccess = useUIStore((s) => s.copySuccess);
  const setCopySuccess = useUIStore((s) => s.setCopySuccess);
  const copyTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  // v1.37.14: Estados savingModel, modelSaved, savingFromSimilarity movidos para useModelSave hook

  // v1.17.0: Estado para texto de nomes no modal de anonimização
  // NOTA: showAnonymizationModal, showTopicCurationModal e pendingCurationData agora vêm do useDocumentAnalysis (v1.36.81)
  // v1.37.49: anonymizationNamesText migrado para useUIStore
  const anonymizationNamesText = useUIStore((s) => s.anonymizationNamesText);
  const setAnonymizationNamesText = useUIStore((s) => s.setAnonymizationNamesText);

  // v1.21.14: Sincronizar nomes do modal com aiSettings persistido
  useEffect(() => {
    const nomesUsuario = aiIntegration?.aiSettings?.anonymization?.nomesUsuario;
    if (Array.isArray(nomesUsuario) && nomesUsuario.length > 0) {
      useUIStore.getState().setAnonymizationNamesText(nomesUsuario.join('\n'));
    }
  }, [aiIntegration?.aiSettings?.anonymization?.nomesUsuario]);

  // v1.37.27: slashMenu movido para useSlashMenu hook (instanciado após showToast)
  // v1.37.43: Estados de revisão movidos para useReviewSentence hook (FASE 44)

  // Scroll automático para o topo quando aparecer erro
  useEffect(() => {
    if (error) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [error]);

  // Cleanup de timeout do copySuccess para evitar memory leak
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  // 📂 DESTRUCTURING: useDocumentManager & useTopicManager (v1.2.7)
  const {
    // Documentos - Estados
    peticaoFiles, contestacaoFiles, complementaryFiles,
    pastedPeticaoTexts, pastedContestacaoTexts, pastedComplementaryTexts,
    analyzedDocuments,
    extractedTexts,
    // v1.12.18: Modos de processamento por documento
    documentProcessingModes,
    // Documentos - Setters
    setPeticaoFiles, setContestacaoFiles, setComplementaryFiles,
    setPastedPeticaoTexts, setPastedContestacaoTexts, setPastedComplementaryTexts,
    setAnalyzedDocuments,
    setAnalysisProgress, setExtractedTexts,
    // v1.12.18: Setters de modos de processamento
    setDocumentProcessingModes,
    // Documentos - Handlers
    removePeticaoFile,
    handleUploadPeticao, handleUploadContestacao, handleUploadComplementary
  } = documentManager;

  const {
    // Tópicos - Estados
    extractedTopics, selectedTopics,
    editingTopic, lastEditedTopicTitle, topicContextScope,
    savingTopic,
    // Tópicos - Setters
    setExtractedTopics, setSelectedTopics,
    setEditingTopic, setLastEditedTopicTitle, setTopicContextScope,
    // ⚠️ NOTA: setSavingTopic, setTopicToDelete movidos para useTopicEditing
    // Handlers de tópicos (prepareDeleteTopic, confirmDeleteTopic, etc.)
    // permanecem no componente principal pois dependem de modals e lógica complexa
  } = topicManager;

  // 🔄 v1.37.42: Hashes de detecção de mudanças - extraído para useChangeDetectionHashes (FASE 41)
  const { extractedTopicsHash, selectedTopicsHash, proofsHash } = useChangeDetectionHashes(
    extractedTopics,
    selectedTopics,
    proofManager
  );

  // ✅ v1.37.42: Validação de tópicos - extraído para useTopicValidation (FASE 49)
  const {
    isTopicDecidido, topicsParaDispositivo,
    canGenerateDispositivo
  } = useTopicValidation(selectedTopics, extractedTopics);

  // ✅ v1.37.42: Handlers de editor - extraído para useEditorHandlers (FASE 50)
  const {
    handleFundamentacaoChange, handleRelatorioChange,
    handleCategoryChange, getTopicEditorConfig
  } = useEditorHandlers({
    editingTopicTitle: editingTopic?.title,
    setEditingTopic,
    setSelectedTopics,
    setExtractedTopics,
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // v1.37.6: useDragDropTopics - Hook extraído para drag and drop de tópicos
  // ═══════════════════════════════════════════════════════════════════════════════
  const dragDrop = useDragDropTopics({
    selectedTopics,
    setSelectedTopics,
    aiIntegration,
  });

  // Destructure para uso mais fácil
  // v1.40.07: Removidas variáveis drag complementary (agora em ConfigModal via useDragDropTopics)
  const {
    customCollisionDetection,
    handleDndDragEnd,
  } = dragDrop;

  // 🆕 v1.12.18: Helper para determinar modo padrão baseado nas configurações globais
  // v1.12.22: Simplificado - agora usa diretamente ocrEngine (pdfjs | pdf-puro | claude-vision)
  // v1.12.25: Removido autoExtractPDFText - usa apenas ocrEngine
  const getDefaultProcessingMode = React.useCallback(() => {
    return aiIntegration.aiSettings?.ocrEngine || 'pdfjs';
  }, [aiIntegration.aiSettings.ocrEngine]);

  // 🔄 v1.37.42: Hashes (extractedTopicsHash, selectedTopicsHash, proofsHash) movidos para useChangeDetectionHashes (FASE 41)

  // v1.13.6: Hash para detectar mudanças em Upload (arquivos, extractedTexts, documentProcessingModes)
  const uploadHash = React.useMemo(() => {
    try {
      // v1.13.7: Incluir arquivos PDF selecionados no hash (compatível com formato {file, id})
      const peticaoFilesSig = peticaoFiles.map((f, i: number) => `${i}:${f?.file?.name || f?.name || ''}:${f?.file?.size || f?.size || 0}`).join('|');
      const contestacaoFilesSig = contestacaoFiles.map((f, i: number) => `${i}:${f?.file?.name || f?.name || ''}:${f?.file?.size || f?.size || 0}`).join('|');
      const complementaryFilesSig = complementaryFiles.map((f, i: number) => `${i}:${f?.file?.name || f?.name || ''}:${f?.file?.size || f?.size || 0}`).join('|');

      // extractedTexts: { peticoes: [{text, name}], contestacoes: [{text, name}], complementares: [{text, name}] }
      const peticoesText = (extractedTexts?.peticoes || [])
        .map((c, i: number) => `${i}:${(c?.text || '').substring(0, 50)}`)
        .join('|');

      const contestacoesText = (extractedTexts?.contestacoes || [])
        .map((c, i: number) => {
          const text = c?.text || '';
          return `${i}:${text.substring(0, 50)}`;
        })
        .join('|');

      const complementaresText = (extractedTexts?.complementares || [])
        .map((c, i: number) => {
          const text = c?.text || '';
          return `${i}:${text.substring(0, 50)}`;
        })
        .join('|');

      // documentProcessingModes: { peticoes: string[], contestacoes: string[], complementares: string[] }
      const peticoesModes = (documentProcessingModes?.peticoes || []).join(',');
      const contestacoesModes = (documentProcessingModes?.contestacoes || []).join(',');
      const complementaresModes = (documentProcessingModes?.complementares || []).join(',');

      // v1.13.7: Signature inclui arquivos + textos extraídos + modos
      const signature = `${peticaoFilesSig}||${contestacaoFilesSig}||${complementaryFilesSig}||${peticoesText}||${contestacoesText}||${complementaresText}||${peticoesModes}||${contestacoesModes}||${complementaresModes}`;
      return fastHashUtil(signature);
    } catch (err) {
      return 'error';
    }
  }, [peticaoFiles, contestacaoFiles, complementaryFiles, extractedTexts, documentProcessingModes]);

  // 🖱️ v1.37.6: Estados de Drag & Drop agora em useDragDropTopics hook
  // (draggedIndex, dragOverIndex, draggedComplementaryIndex, dragOverComplementaryIndex)

  // 💾 ESTADOS: Sessão e Persistência
  // v1.37.49: partesProcesso migrado para useUIStore
  const partesProcesso = useUIStore((s) => s.partesProcesso);
  const setPartesProcesso = useUIStore((s) => s.setPartesProcesso);

  // 📊 v1.36.73: Hook de geração de relatórios ────────────────────────────────
  const reportGeneration = useReportGeneration({
    aiIntegration,
    analyzedDocuments,
    partesProcesso,
  });

  const {
    generateMiniReport,
    generateMiniReportsBatch,
    generateRelatorioProcessual,
  } = reportGeneration;

  // ═══════════════════════════════════════════════════════════════════════════════
  // v1.37.7: useTopicOperations - Hook extraído para operações de tópicos
  // ═══════════════════════════════════════════════════════════════════════════════
  const topicOperations = useTopicOperations({
    aiIntegration,
    topicManager,
    analyzedDocuments,
    generateMiniReport,
    generateMiniReportsBatch,
    setError: (error: string) => setError(error),
    setAnalysisProgress,
    closeModal: closeModal as (modalName: 'rename' | 'merge' | 'split' | 'newTopic') => void,
  });

  const {
    handleRenameTopic,
    handleMergeTopics,
    handleSplitTopic,
    handleCreateNewTopic,
  } = topicOperations;

  // ═══════════════════════════════════════════════════════════════════════════════
  // v1.37.8: useModelGeneration - Hook extraído para geração de keywords/título
  // ═══════════════════════════════════════════════════════════════════════════════
  // v1.37.13: apiCache removido - cada clique gera nova resposta
  // v1.37.15: modelEditorRef movido para antes do hook (precisa ler conteúdo do editor)
  const modelEditorRef = useRef<QuillInstance | null>(null);
  const modelGeneration = useModelGeneration({
    aiIntegration,
    modelLibrary,
    modelEditorRef,
    setError: (error: string) => setError(error),
  });

  const { generateKeywordsWithAI, generateTitleWithAI } = modelGeneration;

  // 📝 ESTADOS: Editor de Texto Rico
  // v1.37.49: exportedText, exportedHtml migrados para useUIStore
  const exportedText = useUIStore((s) => s.exportedText);
  const setExportedText = useUIStore((s) => s.setExportedText);
  const exportedHtml = useUIStore((s) => s.exportedHtml);
  const setExportedHtml = useUIStore((s) => s.setExportedHtml);

  // 📋 ESTADO: Informações do Processo (v1.3.5.1)
  // v1.37.49: processoNumero migrado para useUIStore
  const processoNumero = useUIStore((s) => s.processoNumero);
  const setProcessoNumero = useUIStore((s) => s.setProcessoNumero);
  // Número do processo trabalhista (ex: ATOrd 0000313-98.2025.5.08.0110)

  // 🔧 v1.37.42: Estados Quill/DOMPurify movidos para useQuillInitialization (FASE 43)

  // 🧠 v1.37.41: Estados NER movidos para useNERManagement (FASE 40)

  // 🔍 v1.37.43: Estados Busca Semântica (E5-base) movidos para useSemanticSearchManagement (FASE 42)
  // v1.35.74: semanticSearchEnabled, semanticThreshold, jurisSemanticEnabled, jurisSemanticThreshold
  // movidos para aiSettings (agora em aiIntegration.aiSettings.X)
  // v1.37.9: embeddingsCount, jurisEmbeddingsCount, embeddingsProgress, jurisEmbeddingsProgress,
  // embeddingsDownloadStatus, dataDownloadStatus, generatingModelEmbeddings, modelEmbeddingsProgress
  // movidos para useEmbeddingsManagement hook
  // v1.32.18: Jurisprudência via IA Local nos editores
  // v1.35.74: useLocalAIForJuris movido para aiSettings

  // v1.33.19: Toggle para busca semântica na busca manual de modelos (editores individual e global)
  // v1.33.20: Inicializa com modelSemanticEnabled (respeitando config IA)
  // v1.35.74: Agora usa aiIntegration.aiSettings.modelSemanticEnabled
  // v1.37.49: useSemanticManualSearch migrado para useModelsStore
  const useSemanticManualSearch = useModelsStore((s) => s.useSemanticManualSearch);
  const setUseSemanticManualSearch = useModelsStore((s) => s.setUseSemanticManualSearch);

  // Sincronizar useSemanticManualSearch com aiSettings.modelSemanticEnabled na inicialização
  React.useEffect(() => {
    useModelsStore.getState().setUseSemanticManualSearch(aiIntegration.aiSettings.modelSemanticEnabled ?? false);
  }, [aiIntegration.aiSettings.modelSemanticEnabled]);

  // v1.38.24: apiTestStatuses movidos diretamente para ConfigModal via useAIStore

  // 📜 v1.26.02: Hook de legislação para geração de embeddings
  const legislacao = useLegislacao();

  // 📚 v1.27.00: Hook de jurisprudência para acessar precedentes
  // v1.37.9: Movido de dentro da seção de embeddings para cá
  const jurisprudencia = useJurisprudencia();

  // ═══════════════════════════════════════════════════════════════════════════════
  // v1.38.52: Handlers de modais de sessão e Google Drive extraídos para hooks
  // ═══════════════════════════════════════════════════════════════════════════════

  // Google Drive handlers
  const driveFileHandlers = useDriveFileHandlers({
    googleDrive,
    storage,
    proofManager,
    aiIntegration,
    setPastedPeticaoTexts,
    setPastedContestacaoTexts,
    setPastedComplementaryTexts,
    setExtractedTopics,
    setSelectedTopics,
    setPartesProcesso,
    setAnalyzedDocuments,
    setActiveTab,
    setError,
    setProcessoNumero,
    setPeticaoFiles,
    setContestacaoFiles,
    setComplementaryFiles,
    setExtractedTexts,
    setDocumentProcessingModes,
    setDriveFilesModalOpen,
    setDriveFiles,
  });

  // GoogleDriveButton actions (save, load, local save/load)
  const googleDriveActions = useGoogleDriveActions({
    googleDrive,
    storage,
    proofManager,
    aiIntegration,
    documentState: {
      processoNumero,
      pastedPeticaoTexts,
      pastedContestacaoTexts,
      pastedComplementaryTexts,
      extractedTopics,
      selectedTopics,
      partesProcesso,
      activeTab,
      analyzedDocuments,
      peticaoFiles,
      contestacaoFiles,
      complementaryFiles,
      extractedTexts,
      documentProcessingModes,
    },
    documentSetters: {
      setPastedPeticaoTexts,
      setPastedContestacaoTexts,
      setPastedComplementaryTexts,
      setExtractedTopics,
      setSelectedTopics,
      setPartesProcesso,
      setAnalyzedDocuments,
      setActiveTab,
      setProcessoNumero,
      setPeticaoFiles,
      setContestacaoFiles,
      setComplementaryFiles,
      setExtractedTexts,
      setDocumentProcessingModes,
    },
    setError,
    showToast,
    setDriveFiles,
    setDriveFilesModalOpen,
    openModal,
  });

  // Session modal handlers (RestoreSession, ClearProject, Logout)
  const sessionCallbacks = useSessionCallbacks({
    storage,
    aiIntegration,
    openModal,
    closeModal,
    proofManager,
    setPastedPeticaoTexts,
    setPastedContestacaoTexts,
    setPastedComplementaryTexts,
    setExtractedTopics,
    setSelectedTopics,
    setPartesProcesso,
    setAnalyzedDocuments,
    setActiveTab,
    setError,
    setProcessoNumero,
    setPeticaoFiles,
    setContestacaoFiles,
    setComplementaryFiles,
    setExtractedTexts,
    setDocumentProcessingModes,
    setAnonymizationNamesText,
    onLogout,
  });

  // 🎯 REFS
  const bulkFileInputRef = useRef<HTMLInputElement | null>(null);
  const editorRef = useRef<QuillInstance | null>(null); // v1.35.92: Tipar como QuillInstance
  // v1.37.15: modelEditorRef movido para antes de useModelGeneration
  const modelFormRef = useRef<HTMLDivElement | null>(null);
  const relatorioRef = useRef<QuillInstance | null>(null); // v1.35.92: Tipar como QuillInstance
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const topicRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const editorContainerRef = useRef<HTMLDivElement | null>(null);

  // v1.20.2: Cleanup de refs de tópicos removidos para evitar memory leak
  const cleanupTopicRefs = React.useCallback((currentTitles: string[]) => {
    const titles = new Set(currentTitles);
    Object.keys(topicRefs.current).forEach(title => {
      if (!titles.has(title)) delete topicRefs.current[title];
    });
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════════
  // v1.38.52: useTopicEditing - Topic editing handlers extraídos para hook
  // ═══════════════════════════════════════════════════════════════════════════════
  const topicEditing = useTopicEditing({
    topicManager,
    aiIntegration,
    modelLibrary,
    openModal,
    setActiveTab,
    sanitizeHTML,
    editorRef,
    relatorioRef,
  });

  const {
    toggleTopicSelection,
    deleteTopic,
    saveTopicEdit,
    saveTopicEditWithoutClosing,
    detectResultadoAutomatico,
  } = topicEditing;

  // v1.38.52: useModelEditing - Model editing handlers extraídos para hook
  const modelEditing = useModelEditing({
    modelLibrary,
    modelPreview,
    aiIntegration,
    cloudSync,
    apiCache,
    searchModelReady,
    sanitizeHTML,
    showToast,
    setError,
    openModal: openModal as (modal: string) => void,
    modelFormRef,
    modelEditorRef,
  });

  const {
    saveQuickEdit,
    confirmSaveAsNew,
    startEditingModel,
    duplicateModel,
  } = modelEditing;

  // ⚡ EFFECTS

  // 🔄 v1.9 FASE 2: Implementar reloadSessionFromStorage com todos os setters
  React.useEffect(() => {
    // Redefinir reloadSessionFromStorage com acesso aos setters
    const reloadImpl = async () => {
      try {

        await storage.restoreSession({
          setPastedPeticaoTexts,
          setPastedContestacaoTexts,
          setPastedComplementaryTexts,
          setExtractedTopics,
          setSelectedTopics,
          setPartesProcesso,
          setAnalyzedDocuments,
          // v1.13.7: Adicionar setters de arquivos de Upload para restaurar PDFs do IndexedDB
          setPeticaoFiles,
          setContestacaoFiles,
          setComplementaryFiles,
          setExtractedTexts,
          setDocumentProcessingModes,
          setProofFiles: proofManager.setProofFiles,
          setProofTexts: proofManager.setProofTexts,
          setProofUsePdfMode: proofManager.setProofUsePdfMode,
          setExtractedProofTexts: proofManager.setExtractedProofTexts,
          setProofExtractionFailed: proofManager.setProofExtractionFailed,
          setProofTopicLinks: proofManager.setProofTopicLinks,
          setProofAnalysisResults: proofManager.setProofAnalysisResults,
          setProofConclusions: proofManager.setProofConclusions,
          setProofSendFullContent: proofManager.setProofSendFullContent,
          setActiveTab,
          closeModal,
          setError,
          setProcessoNumero,
          setTokenMetrics: aiIntegration.setTokenMetrics // v1.20.3: Contador de tokens
        });


        // Atualizar ref para refletir novo estado
        // Note: localStateRef was removed - timestamp tracking handled elsewhere
      } catch (err) {
        setError('Erro ao sincronizar com outra aba: ' + (err as Error).message);
      }
    };

    // Substituir o placeholder vazio
    if (typeof window !== 'undefined') {
      window.__reloadSessionFromStorage = reloadImpl;
    }
  }, [
    storage,
    setPastedPeticaoTexts, setPastedContestacaoTexts, setPastedComplementaryTexts,
    setExtractedTopics, setSelectedTopics, setPartesProcesso, setAnalyzedDocuments,
    proofManager, setActiveTab, closeModal, setError, setProcessoNumero
  ]);

  // 📝 v1.37.42: DOMPurify loader movido para useQuillInitialization (FASE 43)

  // v1.33.19: Effect para busca semântica manual de modelos
  useEffect(() => {
    if (!useSemanticManualSearch || !searchModelReady || !modelLibrary.manualSearchTerm || modelLibrary.manualSearchTerm.trim().length < 2) {
      setSemanticManualSearchResults(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setSemanticManualSearching(true);
      try {
        const results = await searchModelsBySimilarity(modelLibrary.models, modelLibrary.manualSearchTerm.toLowerCase(), { threshold: 0.3, limit: 10 });
        setSemanticManualSearchResults(results);
        // Também atualizar os resultados no modelLibrary para exibição
        modelLibrary.setManualSearchResults(results);
      } catch (error) {
        console.error('[ModelSearch] Erro na busca semântica:', error);
        setSemanticManualSearchResults(null);
      }
      setSemanticManualSearching(false);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [useSemanticManualSearch, modelLibrary.manualSearchTerm, searchModelReady, modelLibrary.models]);

  // v1.40.09: Toast quando modelo de busca fica pronto
  const searchModelReadyPrevRef = useRef(false);
  useEffect(() => {
    // Só mostrar toast quando muda de false para true (não na montagem)
    if (searchModelReady && !searchModelReadyPrevRef.current) {
      showToast('Modelo de busca pronto!', 'success');
    }
    searchModelReadyPrevRef.current = searchModelReady;
  }, [searchModelReady, showToast]);

  // 📝 v1.37.42: Quill.js Loader movido para useQuillInitialization (FASE 43)

  useEffect(() => {
        // loadAiSettings() agora está dentro do hook useAIIntegration

        if (primaryTabLock.isPrimaryTab) {
      storage.checkSavedSession(openModal);
    }
  }, [primaryTabLock.isPrimaryTab]);

  
  // Resetar página de modelos quando filtros/busca mudarem
  useEffect(() => {
    modelLibrary.setCurrentModelPage(1);
  }, [modelLibrary.searchTerm, modelLibrary.selectedCategory, modelLibrary.showFavoritesOnly]);

  // 🚀 OTIMIZAÇÃO v1.7: Observer para marcar dirty (FASE 1.1) - DEPS REDUZIDAS
  // 🔄 v1.9.1: Agora usa HASHES para detectar edições de campos (não apenas add/remove)
  // Observa apenas valores primitivos (strings, numbers) ao invés de objetos/arrays completos
  // Isso reduz drasticamente re-renders (primitive comparison vs deep comparison)
  useEffect(() => {
    // Marca como dirty quando qualquer estado crítico mudar
    // Este effect é LEVE (apenas seta flag booleana, não faz save)
    // v1.13.7: Incluir arquivos de Upload na condição
    if (extractedTopics.length > 0 || selectedTopics.length > 0 ||
        proofManager.proofFiles.length > 0 || proofManager.proofTexts.length > 0 ||
        peticaoFiles.length > 0 || contestacaoFiles.length > 0 || complementaryFiles.length > 0 ||
        (aiIntegration.tokenMetrics.requestCount || 0) > 0) {
      markSessionDirty();
      // 🚫 v1.9.5: DESABILITADO - Timestamp de edição não mais usado (sync removido)
      // localStateRef.current.lastLocalEditTimestamp = Date.now();
    }
  }, [
    processoNumero,
    pastedPeticaoTexts?.length || 0,
    extractedTopicsHash,  // ✅ Detecta mudanças em título, conteúdo, categoria
    selectedTopicsHash,   // ✅ Detecta mudanças em título, conteúdo, categoria
    proofsHash,           // ✅ Detecta mudanças em provas (files, texts, extracted)
    uploadHash,           // v1.13.6: Detecta mudanças em Upload (extractedTexts, documentProcessingModes)
    // Outros lengths (não precisam de hash pois são simples)
    pastedContestacaoTexts?.length || 0,
    pastedComplementaryTexts?.length || 0,
    (analyzedDocuments?.peticoes?.length || 0) + (analyzedDocuments?.contestacoes?.length || 0) + (analyzedDocuments?.complementares?.length || 0),
    partesProcesso?.reclamante || '',
    partesProcesso?.reclamadas || '',
    aiIntegration.tokenMetrics.requestCount,  // v1.22.01: Persistir tokens ao contabilizar
    markSessionDirty
  ]);

  // v1.12.28: Manter snapshot atualizado para evitar stale closures no auto-save
  // Este useEffect roda a cada render e atualiza o ref com os valores atuais
  // Assim, o setTimeout dentro do auto-save sempre acessa dados frescos via ref
  React.useEffect(() => {
    currentSessionSnapshotRef.current = {
      processoNumero,
      pastedPeticaoTexts,
      pastedContestacaoTexts,
      pastedComplementaryTexts,
      extractedTopics,
      selectedTopics,
      partesProcesso,
      activeTab,
      analyzedDocuments,
      // v1.13.5: Incluir extractedTexts para não perder textos de Upload
      extractedTexts,
      // v1.13.6: Incluir modos de processamento de Upload
      documentProcessingModes,
      // v1.13.7: Indicador de arquivos de Upload (para decidir se deve salvar sessão)
      hasUploadFiles: !!(peticaoFiles.length > 0 || contestacaoFiles.length > 0 || complementaryFiles.length > 0),
      // v1.20.3: Arquivos de Upload (para autoSaveSession)
      peticaoFiles,
      contestacaoFiles,
      complementaryFiles,
      proofFiles: proofManager.proofFiles,
      proofTexts: proofManager.proofTexts,
      proofUsePdfMode: proofManager.proofUsePdfMode,
      proofSendFullContent: proofManager.proofSendFullContent, // v1.19.2: Persistir flag enviar conteúdo completo
      extractedProofTexts: proofManager.extractedProofTexts,
      proofExtractionFailed: proofManager.proofExtractionFailed,
      proofTopicLinks: proofManager.proofTopicLinks,
      proofAnalysisResults: proofManager.proofAnalysisResults,
      proofConclusions: proofManager.proofConclusions,
      // v1.20.3: Contador de tokens persistente
      tokenMetrics: aiIntegration.tokenMetrics
    };
  });

  // 🚀 OTIMIZAÇÃO v1.7: Auto-save quando dirty (FASE 1.1) - Pesado, mas só roda quando flag muda
  // Separação: Observer (leve) marca dirty → Este effect (pesado) faz o save
  // Benefício: Save com debounce não recria a cada mudança de estado
  useEffect(() => {
    // 🔒 v1.9.5: PROTEÇÃO - Apenas aba primária pode salvar sessão
    if (!primaryTabLock.isPrimaryTab) {
      setAutoSaveDirty(false);
      return;
    }

    // Skip se não está dirty
    if (!autoSaveDirty) return;

    // v1.12.28: Usar ref para verificação (evita stale closure)
    const currentSnapshot = currentSessionSnapshotRef.current;

    // Skip se não há dados para salvar
    // v1.13.7: Incluir verificação de arquivos de Upload
    if (!currentSnapshot ||
        ((currentSnapshot.extractedTopics?.length || 0) === 0 &&
         (currentSnapshot.selectedTopics?.length || 0) === 0 &&
         (currentSnapshot.proofFiles?.length || 0) === 0 &&
         (currentSnapshot.proofTexts?.length || 0) === 0 &&
         !currentSnapshot.hasUploadFiles)) {
      setAutoSaveDirty(false);
      return;
    }

    // Limpar timer anterior
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Debounce: aguardar 3s antes de salvar
    // v1.12.28: Usar ref para snapshot (evita stale closure - bug das provas sumindo)
    autoSaveTimerRef.current = setTimeout(() => {
      const snapshot = currentSessionSnapshotRef.current;
      if (!snapshot) return;

      // Comparar com último snapshot (evitar saves duplicados)
      const currentJson = JSON.stringify(snapshot);
      if (currentJson !== lastAutoSaveSnapshotRef.current) {
        storage.autoSaveSession(snapshot, (err) => err && setError(err));
        lastAutoSaveSnapshotRef.current = currentJson;
      }

      // Limpar dirty flag
      setAutoSaveDirty(false);
    }, AUTO_SAVE_DEBOUNCE_MS);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [autoSaveDirty, primaryTabLock.isPrimaryTab]); // 🔒 v1.9.5: + lock para proteger save


  // 🛠️ FUNÇÕES UTILITÁRIAS

  React.useEffect(() => {
    const handleBeforeUnload = (_e: BeforeUnloadEvent) => {
      const skipBeforeunload = sessionStorage.getItem('sentencify-skip-beforeunload');
      if (skipBeforeunload) {
        sessionStorage.removeItem('sentencify-skip-beforeunload');
        return; // Sair sem salvar
      }

      // 🔥 SAVE FORÇADO: Salvar modelos imediatamente no IndexedDB antes de sair
      if (modelLibrary.models.length > 0 && indexedDB.isSupported) {
        try {
          // 🚀 OTIMIZAÇÃO v1.7 (FASE 1.2): Hash comparison ao invés de JSON.stringify
          // Evita bloquear main thread por 50-200ms no beforeunload
          const lastHash = modelsHashRef.current;

          if (currentModelsHash !== lastHash) {
            // ⚠️ NOTA: IndexedDB é assíncrono, mas tentamos salvar aqui
            // O navegador pode ou não aguardar a operação completar
            // Por isso mantemos também o auto-save com debounce
            indexedDB.saveModels(modelLibrary.models).catch(_err => {
            });

            // Atualizar ref imediatamente (otimista)
            modelsHashRef.current = currentModelsHash;

          } else {
          }
        } catch (err) {
        }
      }

      // ℹ️ AVISO OPCIONAL: Pode ser removido já que temos persistência automática
      // Mantido apenas como lembrete de que exportação é recomendada
      // (Não bloqueia a saída da página)
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [currentModelsHash, indexedDB.isSupported]); // Hash ao invés de models array

  // v1.38.0: checkSavedSession removido (já existe em useLocalStorage - chamado via storage.checkSavedSession)

  // 🔒 v1.37.42: sanitizeHTML e testSanitization movidos para useQuillInitialization (FASE 43)

  // 🧠 v1.25: NER HANDLERS - IA Offline para detecção de nomes

  // Ref para garantir inicialização única (proteção contra StrictMode/re-renders)

  // Verificar arquivos do modelo NER + auto-inicializar se anonimização ativa
  const anonymizationEnabled = aiIntegration?.aiSettings?.anonymization?.enabled;
  React.useEffect(() => {
    if (anonymizationEnabled) {
      // Auto-inicializar se anonimização ativa e arquivos presentes
      // v1.32.00: Verificar status do modelo NER via novo AIModelService
      setNerModelReady(AIModelService.isReady('ner'));
    } else {
      // v1.32.00: Descarregar modelo quando anonimização desabilitada
      if (AIModelService.isReady('ner')) {
        console.log('[NER] Descarregando modelo...');
        AIModelService.unload('ner').then(() => {
          setNerModelReady(false);
        });
      }
    }
  }, [anonymizationEnabled]);

  // v1.40.07: initNerModel movido para ConfigModal (usa diretamente via hook)

  // 🔍 v1.32.00: HANDLERS: Busca Semântica (E5-base) - Simplificado

  // v1.32.00: Verificar status do modelo de busca ao montar
  // v1.37.9: embeddingsCount agora gerenciado pelo useEmbeddingsManagement hook
  React.useEffect(() => {
    const checkSearchModel = async () => {
      try {
        setSearchModelReady(AIModelService.isReady('search'));
      } catch (err) {
        console.warn('[Search] Erro ao verificar:', err);
      }
    };
    checkSearchModel();
  }, []);

  // v1.40.07: initSearchModel, handleSearchToggle, handleLegislacaoToggle,
  // handleJurisToggle, handleModelToggle movidos para ConfigModal (usa diretamente via hooks)

  // ═══════════════════════════════════════════════════════════════════════════════
  // v1.37.9: Embeddings functions movidos para useEmbeddingsManagement hook
  // Funções extraídas: clearEmbeddings, handleImportEmbeddings, clearJurisEmbeddings,
  // generateModelEmbeddings, clearModelEmbeddings, handleImportJurisEmbeddings,
  // handleStartDataDownload, handleStartEmbeddingsDownload, handleDismissDataPrompt,
  // handleDismissEmbeddingsPrompt + useEffects de inicialização
  // ═══════════════════════════════════════════════════════════════════════════════

  // v1.32.00: Removido SEARCH_FILES_REQUIRED (modelos são baixados automaticamente)

  // v1.37.24: detectarNomesAutomaticamente movido para useDetectEntities hook (instanciado após showToast)
  // Constantes STOP_WORDS_*, GENTILIC_WORDS, ORG_STOP_WORDS também movidas para useDetectEntities

  // v1.37.25: exportAiSettings, importAiSettings movidos para useExportImport hook
  // v1.37.38: showToast movido para useUIStore (vem do useModalManager no início)

  // ═══════════════════════════════════════════════════════════════════════════════
  // v1.37.27: useSlashMenu - Hook extraído para acesso rápido a modelos com \
  // ═══════════════════════════════════════════════════════════════════════════════
  const {
    slashMenu,
    openSlashMenu,
    closeSlashMenu,
    navigateSlashMenu,
    selectModelFromSlash,
    updateSlashSearchTerm
  } = useSlashMenu({
    sanitizeHTML,
    showToast
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // v1.37.24: useDetectEntities - Hook extraído para detecção de entidades NER
  // ═══════════════════════════════════════════════════════════════════════════════
  const { detectarNomesAutomaticamente } = useDetectEntities({
    nerEnabled,
    nerIncludeOrg,
    anonymizationNamesText,
    setAnonymizationNamesText,
    setDetectingNames,
    pastedPeticaoTexts,
    pastedContestacaoTexts,
    peticaoFiles,
    contestacaoFiles,
    extractedTexts,
    documentServices: documentServices as Parameters<typeof useDetectEntities>[0]['documentServices'],
    showToast,
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // v1.37.25: useExportImport - Hook extraído para exportar/importar configurações e modelos
  // v1.40.07: exportAiSettings, importAiSettings movidos para ConfigModal
  // ═══════════════════════════════════════════════════════════════════════════════
  const {
    exportModels,
    importModels
  } = useExportImport({
    modelLibrary: modelLibrary as Parameters<typeof useExportImport>[0]['modelLibrary'],
    aiIntegration: aiIntegration as Parameters<typeof useExportImport>[0]['aiIntegration'],
    cloudSync,
    searchModelReady,
    showToast,
    setError,
    generateModelId
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // v1.37.14: useModelSave - Hook extraído para salvamento de modelos
  // ═══════════════════════════════════════════════════════════════════════════════
  const modelSave = useModelSave({
    modelLibrary,
    aiSettings: aiIntegration.aiSettings,
    searchModelReady,
    cloudSync,
    apiCache,
    showToast,
    modelEditorRef,
    closeModal: closeModal as (modalId: string) => void,
    modelPreview,
    sanitizeHTML,
    setError: (error: string) => setError(error),
  });

  const {
    savingModel,
    modelSaved,
    savingFromSimilarity,
    saveModel,
    saveModelWithoutClosing,
    executeExtractedModelSave,
    processBulkSaveNext,
    handleSimilarityCancel,
    handleSimilaritySaveNew,
    handleSimilarityReplace,
  } = modelSave;

  // ═══════════════════════════════════════════════════════════════════════════════
  // v1.37.28: useFileHandling - Hook extraído para upload em lote e operações de arquivo
  // ═══════════════════════════════════════════════════════════════════════════════
  const fileHandling = useFileHandling({
    modelLibrary: modelLibrary as unknown as Parameters<typeof useFileHandling>[0]['modelLibrary'],
    aiIntegration: aiIntegration as unknown as Parameters<typeof useFileHandling>[0]['aiIntegration'],
    apiCache,
    documentServices: documentServices as unknown as Parameters<typeof useFileHandling>[0]['documentServices'],
    cloudSync,
    modelPreview,
    showToast,
    setError,
    openModal: openModal as (modalId: string) => void,
    closeModal: closeModal as (modalId: string) => void,
    processBulkSaveNext,
  });

  const {
    getBulkPendingFilesCount,
    handleConfirmBulkCancel,
    processBulkFiles,
    handleBulkFileUpload,
    saveBulkModels,
    removeBulkReviewModel,
    toggleFavorite,
  } = fileHandling;

  // ═══════════════════════════════════════════════════════════════════════════════
  // v1.37.22: useModelExtraction - Hook extraído para extração de modelos de decisão
  // ═══════════════════════════════════════════════════════════════════════════════
  const modelExtraction = useModelExtraction({
    editingTopic,
    aiIntegration: aiIntegration as unknown as Parameters<typeof useModelExtraction>[0]['aiIntegration'],
    modelLibrary: modelLibrary as unknown as Parameters<typeof useModelExtraction>[0]['modelLibrary'],
    apiCache,
    editorRef,
    openModal: openModal as (modalId: string) => void,
    closeModal: closeModal as (modalId: string) => void,
    setError,
    showToast,
    executeExtractedModelSave,
  });

  const {
    extractModelFromDecisionText,
    saveExtractedModel,
    cancelExtractedModel,
  } = modelExtraction;

  // ═══════════════════════════════════════════════════════════════════════════════
  // v1.37.9: useEmbeddingsManagement - Hook extraído para gerenciamento de embeddings
  // ═══════════════════════════════════════════════════════════════════════════════
  const embeddingsManagement = useEmbeddingsManagement({
    showToast,
    modelLibrary,
    legislacao,
    jurisprudencia,
    indexedDB,
    searchModelReady,
  });

  // v1.40.07: Variáveis não utilizadas removidas (agora em ConfigModal via useEmbeddingsManagement)
  const {
    embeddingsCount,
    jurisEmbeddingsCount,
    showDataDownloadModal,
    dataDownloadStatus,
    showEmbeddingsDownloadModal,
    embeddingsDownloadStatus,
    handleStartDataDownload,
    handleStartEmbeddingsDownload,
    handleDismissDataPrompt,
    handleDismissEmbeddingsPrompt,
  } = embeddingsManagement;

  // v1.37.27: Funções do Slash Menu movidas para useSlashMenu hook
  // findSlashPosition, openSlashMenu, closeSlashMenu, navigateSlashMenu,
  // selectModelFromSlash, updateSlashSearchTerm + useEffects (ESC e click outside)

  useEffect(() => {
    if (editingTopic) {
      aiIntegration.setRelatorioInstruction(''); // Limpar instrução ao mudar de tópico
    }
  }, [editingTopic?.title]); // Só roda quando o TÍTULO mudar (trocar de tópico)

  useEffect(() => {
    if (lastEditedTopicTitle && activeTab === 'topics') {
      let nestedTimeoutId: ReturnType<typeof setTimeout> | null = null;
      // Timeout maior para garantir que o DOM foi atualizado após troca de aba
      const timeoutId = setTimeout(() => {
        const element = topicRefs.current[lastEditedTopicTitle];
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          nestedTimeoutId = setTimeout(() => setLastEditedTopicTitle(null), 2000);
        } else {
          setLastEditedTopicTitle(null); // Limpa para não ficar travado
        }
      }, 300); // Aumentado de 100ms para 300ms

      return () => {
        clearTimeout(timeoutId);
        if (nestedTimeoutId) clearTimeout(nestedTimeoutId);
      };
    }
  }, [lastEditedTopicTitle, activeTab]);

  // v1.20.2: Cleanup de refs órfãs quando tópicos mudam
  React.useEffect(() => {
    if (selectedTopics?.length) {
      cleanupTopicRefs(selectedTopics.map(t => t.title));
    }
  }, [selectedTopics, cleanupTopicRefs]);

  // 🎯 HANDLERS COM useCallback (memoizados para evitar recriação)

  // v1.33.58: dnd-kit sensors e handler para drag and drop com wheel scroll
  const dndSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Mínimo de 8px de movimento antes de iniciar drag (evita cliques acidentais)
      },
    })
  );

  // v1.37.6: Handlers de Drag & Drop extraídos para useDragDropTopics hook
  // (specialTopicIds, customCollisionDetection, handleDndDragEnd, handleDragStart, handleDragEnd,
  //  handleDragOver, handleDragLeave, handleDrop, handleComplementaryDragStart, handleComplementaryDragEnd,
  //  handleComplementaryDragOver, handleComplementaryDragLeave, handleComplementaryDrop)

  // 📚 FUNÇÕES: Gerenciamento de Modelos
  // Hook useModelLibrary já gerencia persistência via 'sentencify-models'
  // v1.37.8: generateKeywordsWithAI e generateTitleWithAI movidos para useModelGeneration hook
  // v1.37.14: executeSaveModel, saveModel, saveModelWithoutClosing movidos para useModelSave hook
  // v1.38.52: saveQuickEdit, confirmSaveAsNew, startEditingModel, duplicateModel movidos para useModelEditing hook

  // v1.37.25: exportModels, importModels, checkDuplicate movidos para useExportImport hook

  // ============================================================================
  // v1.37.18: HELPERS PARA GERAÇÃO DE MINI-RELATÓRIOS EXTRAÍDOS
  // ============================================================================
  // buildDocumentContentArray → src/prompts/promptBuilders.ts (importado acima)
  // buildMiniReportPromptCore → useReportGeneration hook (tem própria versão)
  // buildMiniReportPrompt → useReportGeneration hook (tem própria versão)
  // buildBatchMiniReportPrompt → useReportGeneration hook (tem própria versão)
  // generateMiniReport, generateMultipleMiniReports, generateMiniReportsBatch → useReportGeneration hook
  // reorderTopicsViaLLM → useTopicOrdering hook
  // ============================================================================


  const regenerateRelatorioWithInstruction = async () => {
    if (!aiIntegration.relatorioInstruction?.trim()) {
      setError('Digite uma instrução para regeração do mini-relatório');
      return;
    }
    if (!editingTopic) {
      setError('Nenhum tópico selecionado para edição');
      return;
    }
    const cacheKey = `relatorioCustom_${editingTopic.title}_${aiIntegration.relatorioInstruction}_${JSON.stringify(analyzedDocuments)}`;
    const cachedRelatorio = apiCache.get(cacheKey);
    if (cachedRelatorio) {
      setEditingTopic(prev => {
        if (!prev) return prev;
        return { ...prev, editedRelatorio: cachedRelatorio as string };
      });
      closeModal('regenerateRelatorioCustom');
      return;
    }
    aiIntegration.setRegeneratingRelatorio(true);
    setError('');
    try {
      const isRelatorioTopic = editingTopic.title.toUpperCase().includes('RELATÓRIO');
      const instructionMentionsComplementares = /\b(documento complementar|ata|audiência|prova|juntad[oa]|anexad[oa]|complementar)\b/i.test(aiIntegration.relatorioInstruction);
      const htmlContent = await generateMiniReport({
        title: editingTopic.title,
        instruction: aiIntegration.relatorioInstruction,
        currentRelatorio: editingTopic.editedRelatorio || editingTopic.relatorio,
        includeComplementares: isRelatorioTopic || instructionMentionsComplementares
      });
      apiCache.set(cacheKey, htmlContent);
      const updatedTopic = { ...editingTopic, editedRelatorio: htmlContent, relatorio: htmlContent };
      setEditingTopic(updatedTopic);
      if (relatorioRef.current) {
        relatorioRef.current.root.innerHTML = normalizeHTMLSpacing(sanitizeHTML(htmlContent));
      }
      setSelectedTopics(selectedTopics.map(t => t.title === editingTopic.title ? updatedTopic : t));
      setExtractedTopics(extractedTopics.map(t => t.title === editingTopic.title ? updatedTopic : t));
      aiIntegration.setRelatorioInstruction('');
    } catch (err) {
      setError('Erro ao regerar mini-relatório: ' + (err as Error).message);
    } finally {
      aiIntegration.setRegeneratingRelatorio(false);
    }
  };

  const regenerateRelatorioProcessual = async () => {
    if (!editingTopic || editingTopic.title.toUpperCase() !== 'RELATÓRIO') {
      setError('Esta função só pode ser usada para o tópico RELATÓRIO');
      return;
    }
    aiIntegration.setRegeneratingRelatorio(true);
    setAnalysisProgress('🔄 Regenerando RELATÓRIO processual...');
    try {
      const contentArray = buildDocumentContentArray(analyzedDocuments, { includeComplementares: true });
      const instrucao = (aiIntegration.relatorioInstruction || '').trim();
      if (instrucao) {
        contentArray.push({ type: 'text', text: `⚠️ INSTRUÇÃO ADICIONAL DO USUÁRIO:\n${instrucao}` });
      }
      const relatorioGerado = await generateRelatorioProcessual(contentArray);
      if (!relatorioGerado?.trim()) throw new Error('Relatório gerado está vazio');
      const htmlContent = normalizeHTMLSpacing(relatorioGerado.trim());
      const updatedTopic = { ...editingTopic, editedRelatorio: htmlContent };
      setEditingTopic(updatedTopic);
      if (relatorioRef.current) {
        relatorioRef.current.root.innerHTML = normalizeHTMLSpacing(sanitizeHTML(htmlContent));
      }
      setSelectedTopics(selectedTopics.map(t => t.title === editingTopic.title ? updatedTopic : t));
      setExtractedTopics(extractedTopics.map(t => t.title === editingTopic.title ? updatedTopic : t));
      setAnalysisProgress('');
      aiIntegration.setRelatorioInstruction('');
      showToast('✅ RELATÓRIO processual regenerado!', 'success');
    } catch (err) {
      setError('Erro ao regerar RELATÓRIO: ' + (err as Error).message);
      setAnalysisProgress('');
    } finally {
      aiIntegration.setRegeneratingRelatorio(false);
    }
  };

  // 📋 v1.37.7: Funções de Gerenciamento de Tópicos extraídas para useTopicOperations hook
  // (handleRenameTopic, handleMergeTopics, handleSplitTopic, handleCreateNewTopic)

  // 🤖 v1.37.17: Funções de Geração de Texto com IA extraídas para useDecisionTextGeneration
  // (generateAiText, insertAiText, buildContextForChat, handleInsertChatResponse,
  //  handleSendChatMessage, generateAiTextForModel, insertAiTextModel)

  // v1.37.23: htmlToPlainText, htmlToFormattedText, plainTextToHtml, cleanHtmlForExport
  // movidos para src/utils/html-conversion.ts

  // v1.38.0: applyFormat e applyModelFormat removidos (código morto, nunca usados)

  const confirmDeleteModel = (model: Model) => {
    modelLibrary.setModelToDelete(model);
    openModal('deleteModel');
  };

  // v1.38.0: executeDeleteModel removido (lógica já está em useModelModalHandlers.confirmDeleteModel)

  // Função para extrair modelo do texto de decisão
  const confirmExtractModel = () => {
    if (!editingTopic || !editorRef.current) {
      setError('Nenhum tópico em edição');
      return;
    }

        const decisionText = editorRef.current.root ? editorRef.current.root.innerText : '';

    if (!decisionText || decisionText.trim().length < 100) {
      setError('Texto da decisão muito curto (mínimo 100 caracteres)');
      return;
    }

    // Mostrar modal de confirmação
    openModal('extractModelConfirm');
  };

  // v1.13.2: Salvar como modelo (preserva texto 100%, sem usar IA)
  const saveAsModel = () => {
    if (!editingTopic || !editorRef.current) {
      setError('Nenhum tópico em edição');
      return;
    }
    const htmlContent = editorRef.current.root ? sanitizeHTML(editorRef.current.root.innerHTML) : '';
    if (!htmlContent || htmlContent.replace(/<[^>]+>/g, '').trim().length < 50) {
      setError('Texto da decisão muito curto');
      return;
    }
    modelLibrary.setEditingModel(null);
    modelLibrary.setNewModel({
      title: editingTopic.title || '',
      content: htmlContent,
      keywords: '',
      category: editingTopic.category || ''
    });
    setActiveTab('models');
    openModal('modelForm');
    setTimeout(() => {
      if (modelEditorRef.current?.root) {
        modelEditorRef.current.root.innerHTML = htmlContent;
      }
    }, 100);
  };

  // v1.37.22: extractModelFromDecisionText, saveExtractedModel, cancelExtractedModel
  // movidos para src/hooks/useModelExtraction.ts

  // ═══════════════════════════════════════════════════════════════════════════════
  // v1.37.28: FUNÇÕES DE FILE HANDLING MOVIDAS PARA useFileHandling
  // getBulkPendingFilesCount, handleConfirmBulkCancel, generateModelsFromFileContent,
  // callWithRetry, processFileWithProgress, processBulkFiles, handleBulkFileUpload,
  // saveBulkModels, removeBulkReviewModel, toggleFavorite
  // ═══════════════════════════════════════════════════════════════════════════════

  // v1.37.14: processBulkSaveNext, handleSimilarityCancel, handleSimilaritySaveNew, handleSimilarityReplace
  // movidos para useModelSave hook

  // CÓDIGO REMOVIDO - agora disponível via fileHandling hook (useFileHandling.ts)
  // Funções movidas: generateModelsFromFileContent, callWithRetry, processFileWithProgress,
  // processBulkFiles, handleBulkFileUpload, saveBulkModels, removeBulkReviewModel, toggleFavorite
  // Prompt movido para: src/constants/bulk-prompts.ts (buildBulkAnalysisPrompt)

  // ═══════════════════════════════════════════════════════════════════════════════
  // v1.36.81: FUNÇÕES DE ANÁLISE DE DOCUMENTOS MOVIDAS PARA useDocumentAnalysis
  // handleAnalyzeDocuments, handleAnonymizationConfirm, analyzeDocuments,
  // handleCurationConfirm, handleCurationCancel
  // ═══════════════════════════════════════════════════════════════════════════════

  // CÓDIGO REMOVIDO - agora importado de ./hooks/useDocumentAnalysis
  // Funções agora disponíveis via destructuring do hook documentAnalysis:
  // - handleAnalyzeDocuments
  // - handleAnonymizationConfirm
  // - handleCurationConfirm
  // - handleCurationCancel
  // Estados:
  // - showAnonymizationModal, setShowAnonymizationModal
  // - showTopicCurationModal, setShowTopicCurationModal
  // - pendingCurationData
  // - documentAnalyzing (alias de analyzing)
  // - documentAnalysisProgress (alias de analysisProgress)

  // v1.36.73: generateRelatorioProcessual MOVIDO para useReportGeneration hook
  // (src/hooks/useReportGeneration.ts)

  // ═══════════════════════════════════════════════════════════════════════════════
  // v1.37.5: useTopicOrdering - Hook extraído para reordenação de tópicos via LLM
  // ═══════════════════════════════════════════════════════════════════════════════
  const { reorderTopicsViaLLM } = useTopicOrdering({
    aiIntegration,
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // v1.36.81: useDocumentAnalysis - Hook extraído para análise de documentos
  // ═══════════════════════════════════════════════════════════════════════════════
  const documentAnalysis = useDocumentAnalysis({
    aiIntegration,
    documentServices,
    storage,
    peticaoFiles,
    pastedPeticaoTexts,
    contestacaoFiles,
    pastedContestacaoTexts,
    complementaryFiles,
    pastedComplementaryTexts,
    documentProcessingModes: documentManager.documentProcessingModes,
    setExtractedTopics,
    setSelectedTopics,
    setPartesProcesso,
    setExtractedTexts,
    setAnalyzedDocuments,
    setPeticaoFiles,
    setContestacaoFiles,
    setComplementaryFiles,
    setActiveTab,
    setError: (error: string) => setError(error),
    showToast,
    generateRelatorioProcessual,
    generateMiniReportsBatch,
    reorderTopicsViaLLM,
  });

  // Destructure para uso mais fácil
  const {
    analysisProgress: documentAnalysisProgress,
    showAnonymizationModal,
    showTopicCurationModal,
    pendingCurationData,
    handleAnalyzeDocuments,
    handleAnonymizationConfirm,
    handleCurationConfirm,
    handleCurationCancel,
    setShowAnonymizationModal,
  } = documentAnalysis;

  // ═══════════════════════════════════════════════════════════════════════════════
  // v1.36.73: useProofAnalysis - Hook extraído para análise de provas
  // ═══════════════════════════════════════════════════════════════════════════════
  const proofAnalysis = useProofAnalysis({
    aiIntegration,
    proofManager,
    documentServices,
    storage,
    selectedTopics,
    analyzedDocuments,
    setError,
    showToast,
  });

  const { analyzeProof } = proofAnalysis;

  // v1.38.52: useProofModalCallbacks - Proof modal callbacks extraídos para hook
  // ═══════════════════════════════════════════════════════════════════════════════
  const proofModalCallbacks = useProofModalCallbacks({
    proofManager,
    aiIntegration,
    documentServices,
    openModal: openModal as (modal: ModalKey) => void,
    closeModal: closeModal as (modal: ModalKey) => void,
    showToast,
    setDetectingNames,
    detectarNomesAutomaticamente,
    analyzeProof,
  });

  const {
    handleAddProofText,
    handleProofTextAnonymizationClose,
    handleProofTextAnonymizationConfirm,
    handleProofTextAnonymizationDetect,
    handleProofExtractionAnonymizationClose,
    handleProofExtractionAnonymizationConfirm,
    handleProofExtractionAnonymizationDetect,
    handleProofAnalysisClose,
    handleAnalyzeContextual,
    handleAnalyzeFree,
    handleDeleteProofClose,
    handleDeleteProofConfirm,
  } = proofModalCallbacks;

  // ═══════════════════════════════════════════════════════════════════════════
  // v1.39.08: Handlers de importação de Prova Oral
  // ═══════════════════════════════════════════════════════════════════════════

  const handleRefreshProvaOralAnalyses = React.useCallback(async () => {
    const analyses = await provaOralImport.listAnalyses();
    setProvaOralAnalyses(analyses);
  }, [provaOralImport.listAnalyses]);

  const handleSelectProvaOralAnalysis = React.useCallback((analysis: SavedProvaOralAnalysis) => {
    setSelectedProvaOralAnalysis(analysis);
    closeModal('importProvaOralList');
    openModal('importProvaOralSections');
  }, [closeModal, openModal]);

  const handleImportProvaOral = React.useCallback(async (
    analysis: SavedProvaOralAnalysis,
    sections: ProvaOralSectionKey[],
    options?: FormatProvaOralOptions
  ) => {
    setIsImportingProvaOral(true);
    try {
      // Formatar seções selecionadas como texto
      const analysisText = formatProvaOralSections(analysis.resultado, sections, options);

      // Nome da prova
      const proofName = analysis.numeroProcesso
        ? `Prova Oral - ${analysis.numeroProcesso}`
        : `Prova Oral - ${new Date(analysis.createdAt).toLocaleDateString('pt-BR')}`;

      // Criar nova ProofText com a transcrição
      const newProofId = crypto.randomUUID();
      const newProofText: import('./types').ProofText = {
        id: newProofId,
        name: proofName,
        text: analysis.transcricao,
        type: 'text',
        uploadDate: new Date().toISOString()
      };

      // Adicionar ao store de provas
      proofManager.setProofTexts((prev) => [...prev, newProofText]);

      // Adicionar análise importada se houver seções selecionadas
      if (analysisText.trim()) {
        proofManager.addProofAnalysis(newProofId, {
          type: 'importada',
          result: analysisText,
          sourceProvaOralId: analysis.id
        });
      }

      // Fechar modal e mostrar sucesso
      closeModal('importProvaOralSections');
      setSelectedProvaOralAnalysis(null);
      showToast('Análise de Prova Oral importada com sucesso!', 'success');
    } catch (err) {
      console.error('Erro ao importar Prova Oral:', err);
      showToast('Erro ao importar análise', 'error');
    } finally {
      setIsImportingProvaOral(false);
    }
  }, [proofManager, closeModal, showToast]);

  // v1.38.52: toggleTopicSelection e deleteTopic extraídos para useTopicEditing hook
  // v1.37.99: confirmDeleteTopic movido para useTopicModalHandlers (usado pelo ModalRoot)

  const moveTopicUp = (index: number) => {
    if (index === 0) return;
    
    // Bloquear movimento de RELATÓRIO e DISPOSITIVO
    const topic = selectedTopics[index];
    const targetTopic = selectedTopics[index - 1];
    
    if (isSpecialTopic(topic)) {
      return;
    }

    if (isSpecialTopic(targetTopic)) {
      return;
    }

    const newTopics = [...selectedTopics];
    [newTopics[index - 1], newTopics[index]] = [newTopics[index], newTopics[index - 1]];
    setSelectedTopics(newTopics);
  };

  const moveTopicDown = (index: number) => {
    if (index === selectedTopics.length - 1) return;

    // Bloquear movimento de RELATÓRIO e DISPOSITIVO
    const topic = selectedTopics[index];
    const targetTopic = selectedTopics[index + 1];

    if (isSpecialTopic(topic)) {
      return;
    }

    if (isSpecialTopic(targetTopic)) {
      return;
    }

    const newTopics = [...selectedTopics];
    [newTopics[index], newTopics[index + 1]] = [newTopics[index + 1], newTopics[index]];
    setSelectedTopics(newTopics);
  };

  const moveTopicToPosition = (currentIndex: number, newPosition: number) => {
    if (newPosition < 1 || newPosition > selectedTopics.length) return;
    const newIndex = newPosition - 1;
    if (currentIndex === newIndex) return;

    // Bloquear movimento de RELATÓRIO e DISPOSITIVO
    const topic = selectedTopics[currentIndex];
    const targetTopic = selectedTopics[newIndex];

    if (isSpecialTopic(topic)) {
      return;
    }

    if (isSpecialTopic(targetTopic)) {
      return;
    }

    const newTopics = [...selectedTopics];
    const [movedTopic] = newTopics.splice(currentIndex, 1);
    newTopics.splice(newIndex, 0, movedTopic);
    setSelectedTopics(newTopics);
  };

  // Lista de stopwords para filtrar

  // v1.37.45: FASE 47 - Hook de sugestões de modelos extraído
  const { findSuggestions } = useModelSuggestions({
    aiIntegration,
    apiCache,
    searchModelReady,
  });

  const startEditing = async (topic: Topic) => {
    const topicCopy = {
      ...topic,
      editedFundamentacao: topic.editedFundamentacao || topic.fundamentacao || '',
      editedRelatorio: topic.editedRelatorio || topic.relatorio || ''
    };
    setEditingTopic(topicCopy);
    modelLibrary.setSuggestions([]); // Limpar sugestões antigas primeiro
    modelLibrary.setLoadingSuggestions(true); // Indicar que está carregando
    setActiveTab('editor');

    // Scroll suave para o início da área de edição
    setTimeout(() => {
      if (editorContainerRef.current) {
        editorContainerRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    }, 100);

    // Buscar sugestões de forma assíncrona (não bloqueia a abertura do editor)
    try {
      const { suggestions, source } = await findSuggestions(topicCopy); // v1.28.04
      modelLibrary.setSuggestions(suggestions);
      modelLibrary.setSuggestionsSource(source);
    } catch (error) {
      modelLibrary.setSuggestions([]);
      modelLibrary.setSuggestionsSource(null);
    } finally {
      modelLibrary.setLoadingSuggestions(false);
    }
  };

  const insertModelContent = (content: string) => {
    if (editorRef.current && editingTopic) {
      const quill = editorRef.current;

      // Obter posição do cursor (ou fim do documento se não houver seleção)
      const range = quill.getSelection();
      const position = range ? range.index : quill.getLength() - 1;

      // Sanitizar conteúdo antes de inserir
      const sanitizedContent = sanitizeHTML(content);

      // Inserir quebras de linha antes do conteúdo
      quill.insertText(position, '\n\n');

      // Inserir HTML na posição do cursor + 2 (após as quebras)
      quill.clipboard.dangerouslyPasteHTML(position + 2, sanitizedContent);

      // Mover cursor para o final do conteúdo inserido
      try {
        const delta = quill.clipboard.convert(sanitizedContent) as QuillDelta | null;
        // QuillDelta.length() é um método - calcular manualmente
        let insertedLength = 0;
        if (delta?.ops) {
          for (const op of delta.ops) {
            if (typeof op.insert === 'string') {
              insertedLength += op.insert.length;
            } else if (op.insert) {
              insertedLength += 1;
            }
          }
        }
        quill.setSelection(position + 2 + insertedLength);
      } catch {
        // Fallback: mover para o final
        quill.setSelection(quill.getLength());
      }

      // Atualizar estado com o novo HTML
      const newHTML = sanitizeHTML(quill.root.innerHTML);
      setEditingTopic({
        ...editingTopic,
        editedFundamentacao: newHTML
      });
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // v1.37.42: useKeyboardShortcuts - Atalhos de teclado (Ctrl+S, ESC) e scroll lock
  // ═══════════════════════════════════════════════════════════════════════════════
  useKeyboardShortcuts({
    editingTopic,
    isModelFormOpen: modals.modelForm,
    isSettingsOpen: modals.settings,
    isModelGeneratorOpen: modelGeneratorModal.isOpen,
    saveTopicEditWithoutClosing,
    saveModelWithoutClosing,
    closeSettingsModal: () => closeModal('settings'),
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // v1.37.26: useDecisionExport - Hook extraído para exportação da decisão
  // ═══════════════════════════════════════════════════════════════════════════════
  const { exportDecision } = useDecisionExport({
    selectedTopics,
    setError,
    openModal: openModal as (modalId: string) => void,
    setExportedText,
    setExportedHtml,
    setCopySuccess,
    copyTimeoutRef
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // v1.37.16: useDispositivoGeneration - Hook extraído para geração do DISPOSITIVO
  // ═══════════════════════════════════════════════════════════════════════════════
  const dispositivoGeneration = useDispositivoGeneration({
    selectedTopics,
    setSelectedTopics,
    extractedTopics,
    setExtractedTopics,
    editingTopic,
    setEditingTopic,
    topicsParaDispositivo,
    aiIntegration: aiIntegration as unknown as Parameters<typeof useDispositivoGeneration>[0]['aiIntegration'],
    editorRef,
    setError,
    setAnalysisProgress,
    openModal: openModal as (modalId: string) => void,
    showToast,
    sanitizeHTML,
    isTopicDecidido,
    htmlToFormattedText,
  });
  const { generateDispositivo, regenerateDispositivoWithInstruction } = dispositivoGeneration;

  // v1.37.16: generateDispositivo e regenerateDispositivoWithInstruction movidos para useDispositivoGeneration
  // Código removido: ~425 linhas (generateDispositivo + regenerateDispositivoWithInstruction)

  // ═══════════════════════════════════════════════════════════════════════════════
  // v1.37.17: useDecisionTextGeneration - Hook extraído para geração de texto de decisão
  // ═══════════════════════════════════════════════════════════════════════════════
  const decisionTextGeneration = useDecisionTextGeneration({
    aiIntegration: aiIntegration as unknown as Parameters<typeof useDecisionTextGeneration>[0]['aiIntegration'],
    proofManager: proofManager as unknown as Parameters<typeof useDecisionTextGeneration>[0]['proofManager'],
    chatAssistant: chatAssistant as unknown as Parameters<typeof useDecisionTextGeneration>[0]['chatAssistant'],
    modelLibrary: modelLibrary as unknown as Parameters<typeof useDecisionTextGeneration>[0]['modelLibrary'],
    analyzedDocuments,
    editorRef,
    modelEditorRef,
    editingTopic,
    setEditingTopic,
    selectedTopics,
    topicContextScope: topicContextScope as 'current' | 'all',
    storage,
    closeModal: closeModal as (modalId: string) => void,
    setError,
    sanitizeHTML,
    showToast,
  });
  const {
    handleInsertChatResponse,
    handleSendChatMessage,
    generateAiTextForModel,
    insertAiTextModel,
  } = decisionTextGeneration;

  // v1.37.17: generateAiText, insertAiText, buildContextForChat, handleInsertChatResponse,
  // handleSendChatMessage, generateAiTextForModel, insertAiTextModel movidos para useDecisionTextGeneration
  // Código removido: ~430 linhas

  // ═══════════════════════════════════════════════════════════════════════════════
  // v1.37.21: useFactsComparison - Hook extraído para Confronto de Fatos
  // ═══════════════════════════════════════════════════════════════════════════════
  const factsComparison = useFactsComparison({
    editingTopic,
    aiIntegration: aiIntegration as unknown as Parameters<typeof useFactsComparison>[0]['aiIntegration'],
    analyzedDocuments,
    openModal: openModal as (modalId: string) => void,
    showToast,
  });
  const {
    generatingFactsComparison: generatingFactsComparisonIndividual,
    factsComparisonResult: factsComparisonResultIndividual,
    factsComparisonError: factsComparisonErrorIndividual,
    setFactsComparisonResult: setFactsComparisonResultIndividual,
    setFactsComparisonError: setFactsComparisonErrorIndividual,
    handleOpenFactsComparison: handleOpenFactsComparisonIndividual,
    handleGenerateFactsComparison: handleGenerateFactsComparisonIndividual,
  } = factsComparison;

  // v1.37.21: handleOpenFactsComparisonIndividual e handleGenerateFactsComparisonIndividual
  // movidos para useFactsComparison hook. Código removido: ~200 linhas

  // v1.21.21: Função para montar texto completo da decisão (RELATÓRIO + TÓPICOS + DISPOSITIVO)
  const buildDecisionText = React.useCallback(() => {
    const parts = [];

    // RELATÓRIO
    const relatorio = selectedTopics.find(isRelatorio);
    if (relatorio) {
      parts.push('=== RELATÓRIO ===\n\n' +
        htmlToFormattedText(relatorio.editedRelatorio || relatorio.relatorio || ''));
    }

    // TÓPICOS (exceto RELATÓRIO e DISPOSITIVO)
    parts.push('\n\n=== FUNDAMENTAÇÃO ===\n');
    selectedTopics
      .filter(t => !isRelatorio(t) && !isDispositivo(t))
      .forEach(topic => {
        const miniRelatorio = htmlToFormattedText(topic.editedRelatorio || topic.relatorio || '');
        const decisao = htmlToFormattedText(topic.editedFundamentacao || '');
        parts.push(`\n### ${topic.title.toUpperCase()} (${topic.category || 'Sem categoria'})\nResultado: ${topic.resultado || 'NÃO DEFINIDO'}\n\nMini-relatório:\n${miniRelatorio || 'Não preenchido'}\n\nDecisão:\n${decisao || 'Não preenchida'}`);
      });

    // DISPOSITIVO
    const dispositivo = selectedTopics.find(isDispositivo);
    if (dispositivo?.editedContent) {
      parts.push('\n\n=== DISPOSITIVO ===\n\n' +
        htmlToFormattedText(dispositivo.editedContent));
    }

    return parts.join('');
  }, [selectedTopics]);

  // ✅ v1.37.43: useReviewSentence - Revisão crítica de sentença extraída (FASE 44)
  const {
    reviewScope, setReviewScope, reviewResult,
    generatingReview, reviewFromCache, reviewSentence, clearReviewCache
  } = useReviewSentence({
    canGenerateDispositivo,
    setError,
    buildDecisionText,
    buildDocumentContentArray,
    analyzedDocuments,
    aiIntegration: aiIntegration as unknown as AIIntegrationForReview,
    showToast,
    closeModal,
    openModal,
  });

  // 🚀 OTIMIZAÇÃO v1.15.0: Busca inteligente unificada com sinônimos e normalização
  const filteredModels = React.useMemo(() => {
    let results = modelLibrary.models;

    // Aplicar busca inteligente se houver termo
    if (modelLibrary.searchTerm.trim()) {
      results = searchModelsInLibrary(results, modelLibrary.searchTerm, {
        includeContent: true,
        limit: null
      });
    }

    // Aplicar filtros adicionais (categoria, favoritos e propriedade)
    return results.filter(m => {
      const matchesCategory = modelLibrary.selectedCategory === 'all' || m.category === modelLibrary.selectedCategory;
      const matchesFavorite = !modelLibrary.showFavoritesOnly || m.favorite;
      // v1.35.0: Filtro de propriedade (todos/meus/compartilhados)
      const matchesOwnership =
        modelLibrary.ownershipFilter === 'all' ||
        (modelLibrary.ownershipFilter === 'mine' && !m.isShared) ||
        (modelLibrary.ownershipFilter === 'shared' && m.isShared);
      return matchesCategory && matchesFavorite && matchesOwnership;
    });
  }, [modelLibrary.models, modelLibrary.searchTerm, modelLibrary.selectedCategory, modelLibrary.showFavoritesOnly, modelLibrary.ownershipFilter]);

  // 🚀 OTIMIZAÇÃO v1.4.1: Memoizar paginação para evitar recálculo e slice desnecessários
  const { currentModels, totalModelPages, indexOfFirstModel, indexOfLastModel } = React.useMemo(() => {
    const totalPages = Math.ceil(filteredModels.length / modelLibrary.modelsPerPage);
    const lastIdx = modelLibrary.currentModelPage * modelLibrary.modelsPerPage;
    const firstIdx = lastIdx - modelLibrary.modelsPerPage;
    const paginatedModels = filteredModels.slice(firstIdx, lastIdx);
    return {
      currentModels: paginatedModels,
      totalModelPages: totalPages,
      indexOfFirstModel: firstIdx,
      indexOfLastModel: lastIdx
    };
  }, [filteredModels, modelLibrary.currentModelPage, modelLibrary.modelsPerPage]);

  // 🚀 v1.4.3: Memoizar cálculo de provas vinculadas (evita recálculo durante digitação)
  const linkedProofs = React.useMemo(() => {
    if (!editingTopic) return [];

    const linkedProofIds = Object.keys(proofManager.proofTopicLinks).filter(proofId =>
      proofManager.proofTopicLinks[proofId]?.includes(editingTopic.title)
    );

    return [
      ...proofManager.proofFiles.filter((p: ProofFile) => linkedProofIds.includes(String(p.id))).map((p: ProofFile) => ({ ...p, isPdf: true })),
      ...proofManager.proofTexts.filter((p: ProofText) => linkedProofIds.includes(String(p.id))).map((p: ProofText) => ({ ...p, isPdf: false }))
    ];
  }, [editingTopic?.title, proofManager.proofTopicLinks]);

  // 📦 v1.27.01: Contagem de modelos com embedding e estados de busca semântica
  const modelEmbeddingsCount = React.useMemo(() =>
    modelLibrary.models.filter(m => m.embedding?.length === 768).length,
    [modelLibrary.models]
  );

  // v1.37.44: FASE 52 - Hook de busca semântica extraído
  const {
    setSemanticManualSearchResults,
    semanticManualSearching,
    setSemanticManualSearching,
    useModelSemanticSearch,
    setUseModelSemanticSearch,
    modelSemanticResults,
    setModelSemanticResults,
    searchingModelSemantics,
    modelSemanticAvailable,
  } = useSemanticSearchHandlers({
    aiSettings: aiIntegration.aiSettings,
    searchModelReady,
    modelEmbeddingsCount,
  });

  // 🚀 v1.4.3: Pré-calcular categorias e contagens (1 loop em vez de N+2)
  const { categories, categoryCounts } = React.useMemo(() => {
    const cats = new Set<string>();
    const counts: Record<string, number> = {};
    let withoutCategory = 0;
    let favorites = 0;

    modelLibrary.models.forEach(m => {
      if (m.category) {
        cats.add(m.category);
        counts[m.category] = (counts[m.category] || 0) + 1;
      } else {
        withoutCategory++;
      }
      if (m.favorite) favorites++;
    });

    return {
      categories: Array.from(cats).sort(),
      categoryCounts: { counts, withoutCategory, favorites }
    };
  }, [modelLibrary.models]);

  // 🎨 JSX: RENDERIZAÇÃO DO COMPONENTE

  return (
    <>
      <GlobalHoverStyles />
      <ThemeStyles />
      <div className="min-h-screen theme-gradient-app theme-text-primary">
      <div className="container mx-auto p-4 max-w-[95vw]">
        <div className="theme-bg-primary rounded-lg shadow-2xl border theme-border-secondary" style={{ backgroundColor: 'var(--bg-primary)', opacity: 0.95 }}>
          {/* v1.38.53: Header extraído para AppHeader component */}
          <AppHeader
            processoNumero={processoNumero}
            setProcessoNumero={setProcessoNumero}
            appTheme={appTheme}
            toggleAppTheme={toggleAppTheme}
            setShowChangelogModal={setShowChangelogModal}
            openModal={openModal}
            googleDrive={googleDrive}
            googleDriveActions={googleDriveActions}
            cloudSync={cloudSync}
          />

          {error && (
            <div className={`mx-6 mt-4 p-4 rounded-lg flex items-start gap-3 ${
              typeof error === 'object' && error.type === 'success'
                ? 'bg-green-500/10 border border-green-500/50'
                : 'bg-red-500/10 border border-red-500/50'
            }`}>
              <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                typeof error === 'object' && error.type === 'success' ? 'text-green-400' : 'text-red-400'
              }`} />
              <p className="theme-text-primary flex-1">
                {typeof error === 'object' ? error.message : error}
              </p>
              <button onClick={() => setError('')} className={`p-1 rounded transition-colors error-close-btn ${
                typeof error === 'object' && error.type === 'success' ? 'text-green-400' : 'text-red-400'
              }`}>
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="border-b theme-border-secondary">
            {/* v1.20.5: Flex-wrap para quebrar linha em telas estreitas */}
            <div className="flex flex-wrap gap-2 p-2">
              {[
                { id: 'upload', label: 'Upload & Análise', icon: Upload },
                { id: 'topics', label: 'Tópicos', icon: FileText },
                { id: 'proofs', label: 'Provas', icon: Scale },
                { id: 'jurisprudencia', label: 'Jurisprudência', icon: BookOpen },
                { id: 'legislacao', label: 'Legislação', icon: Book },
                { id: 'editor', label: 'Editor', icon: FileText },
                { id: 'models', label: 'Modelos', icon: Save }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white shadow-lg hover-blue-700-from-600'
                      : 'theme-text-tertiary hover-tab-inactive'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            {/* v1.37.32: Upload Tab extraído para src/components/tabs/UploadTab.tsx */}
            {activeTab === 'upload' && (
              <UploadTab
                getDefaultProcessingMode={getDefaultProcessingMode}
                processoNumero={processoNumero}
                setProcessoNumero={setProcessoNumero}
                handleUploadPeticao={handleUploadPeticao}
                handleUploadContestacao={handleUploadContestacao}
                handleUploadComplementary={handleUploadComplementary}
                removePeticaoFile={removePeticaoFile}
                handleAnalyzeDocuments={handleAnalyzeDocuments}
                aiIntegration={aiIntegration}
                documentServices={documentServices}
              />
            )}

            {activeTab === 'topics' && (
              <TopicsTab
                topicRefs={topicRefs}
                dndSensors={dndSensors}
                customCollisionDetection={customCollisionDetection}
                handleDndDragEnd={handleDndDragEnd}
                regenerating={aiIntegration.regenerating}
                generatingDispositivo={aiIntegration.generatingDispositivo}
                generatingReview={generatingReview}
                canGenerateDispositivo={canGenerateDispositivo}
                toggleTopicSelection={toggleTopicSelection}
                moveTopicUp={moveTopicUp}
                moveTopicDown={moveTopicDown}
                moveTopicToPosition={moveTopicToPosition}
                startEditing={startEditing}
                deleteTopic={deleteTopic}
                generateDispositivo={generateDispositivo}
                exportDecision={exportDecision}
                isTopicDecidido={isTopicDecidido}
                isSpecialTopic={isSpecialTopic}
                CSS={CSS}
              />
            )}

            {activeTab === 'proofs' && (
              <ProofsTab
                proofManager={proofManager}
                documentServices={documentServices}
              />
            )}

            {/* v1.38.52: Editor Tab extraído para src/components/tabs/EditorTabContent.tsx */}
            {activeTab === 'editor' && (
              <EditorTabContent
                editorContainerRef={editorContainerRef}
                editorRef={editorRef}
                relatorioRef={relatorioRef}
                editingTopic={editingTopic}
                selectedTopics={selectedTopics}
                extractedTopics={extractedTopics}
                setSelectedTopics={setSelectedTopics}
                setExtractedTopics={setExtractedTopics}
                setEditingTopic={setEditingTopic}
                setLastEditedTopicTitle={setLastEditedTopicTitle}
                setActiveTab={setActiveTab}
                linkedProofs={linkedProofs}
                modelLibrary={modelLibrary}
                modelPreview={modelPreview}
                proofManager={proofManager}
                aiIntegration={aiIntegration}
                saveTopicEdit={saveTopicEdit}
                saveTopicEditWithoutClosing={saveTopicEditWithoutClosing}
                savingTopic={savingTopic}
                handleCategoryChange={handleCategoryChange}
                handleFundamentacaoChange={handleFundamentacaoChange}
                handleRelatorioChange={handleRelatorioChange}
                regenerateRelatorioWithInstruction={regenerateRelatorioWithInstruction}
                regenerateRelatorioProcessual={regenerateRelatorioProcessual}
                regenerateDispositivoWithInstruction={regenerateDispositivoWithInstruction}
                confirmExtractModel={confirmExtractModel}
                saveAsModel={saveAsModel}
                insertModelContent={insertModelContent}
                findSuggestions={findSuggestions}
                getTopicEditorConfig={getTopicEditorConfig}
                quillReady={quillReady}
                quillError={quillError}
                editorTheme={editorTheme as 'dark' | 'light' | undefined}
                toggleEditorTheme={toggleEditorTheme}
                isIndividualDirty={isIndividualDirty}
                fieldVersioning={fieldVersioning}
                handleOpenFactsComparisonIndividual={handleOpenFactsComparisonIndividual}
                openSlashMenu={openSlashMenu}
                openModal={openModal as (modal: string) => void}
                sanitizeHTML={sanitizeHTML}
                searchModelReady={searchModelReady}
                useSemanticManualSearch={useSemanticManualSearch}
                setUseSemanticManualSearch={setUseSemanticManualSearch}
                semanticManualSearching={semanticManualSearching}
                setSemanticManualSearchResults={setSemanticManualSearchResults}
              />
            )}

            {activeTab === 'jurisprudencia' && (
              <JurisprudenciaTab
                isReadOnly={!primaryTabLock.isPrimaryTab}
                jurisSemanticEnabled={aiIntegration.aiSettings.jurisSemanticEnabled}
                searchModelReady={searchModelReady}
                jurisEmbeddingsCount={jurisEmbeddingsCount}
                jurisSemanticThreshold={aiIntegration.aiSettings.jurisSemanticThreshold}
              />
            )}

            {activeTab === 'legislacao' && (
              <LegislacaoTab
                isReadOnly={!primaryTabLock.isPrimaryTab}
                semanticSearchEnabled={aiIntegration.aiSettings.semanticSearchEnabled}
                searchModelReady={searchModelReady}
                embeddingsCount={embeddingsCount}
                semanticThreshold={aiIntegration.aiSettings.semanticThreshold}
              />
            )}


            {/* v1.37.31: Models Tab extraído para src/components/tabs/ModelsTab.tsx */}
            {activeTab === 'models' && (
              <ModelsTab
                modelLibrary={modelLibrary}
                cloudSync={cloudSync}
                aiIntegration={{
                  generatingKeywords: aiIntegration.generatingKeywords,
                  generatingTitle: aiIntegration.generatingTitle
                }}
                useModelSemanticSearch={useModelSemanticSearch}
                setUseModelSemanticSearch={setUseModelSemanticSearch}
                modelSemanticResults={modelSemanticResults}
                setModelSemanticResults={setModelSemanticResults}
                searchingModelSemantics={searchingModelSemantics}
                modelSemanticAvailable={modelSemanticAvailable}
                filteredModels={filteredModels}
                currentModels={currentModels}
                totalModelPages={totalModelPages}
                indexOfFirstModel={indexOfFirstModel}
                indexOfLastModel={indexOfLastModel}
                categories={categories}
                categoryCounts={categoryCounts}
                exportModels={exportModels}
                importModels={importModels}
                saveModel={saveModel}
                saveModelWithoutClosing={saveModelWithoutClosing}
                generateKeywordsWithAI={generateKeywordsWithAI}
                generateTitleWithAI={generateTitleWithAI}
                startEditingModel={startEditingModel}
                toggleFavorite={toggleFavorite}
                duplicateModel={duplicateModel}
                confirmDeleteModel={confirmDeleteModel}
                sanitizeHTML={sanitizeHTML}
                fileInputRef={fileInputRef}
                modelFormRef={modelFormRef}
                modelEditorRef={modelEditorRef}
                quillReady={quillReady}
                quillError={quillError}
                editorTheme={editorTheme}
                toggleEditorTheme={toggleEditorTheme}
                modelSaved={modelSaved}
                savingModel={savingModel}
              />
            )}
          </div>
        </div>

        <div className="mt-6 text-center">
          <div className="inline-block theme-bg-primary/90 rounded-lg px-6 py-3 border theme-border-secondary">
            <p className="text-sm theme-text-muted">
              <span className="bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent font-semibold">SENTENCIFY.AI</span>
              {' '}- Versão {APP_VERSION} - <span className="text-amber-500 font-semibold">PROTÓTIPO</span>
            </p>
            <p className="text-xs theme-text-disabled mt-1">
              Desenvolvido por <span className="text-blue-400 font-medium">Rodrigo Nohlack Corrêa Cesar</span>, Juiz do Trabalho no TRT8
            </p>
          </div>
        </div>
      </div>

      {/* v1.37.73: ExportModal movido para ModalRoot */}

      <DispositivoModal
        isOpen={modals.dispositivo}
        onClose={() => closeModal('dispositivo')}
        dispositivoText={aiIntegration.dispositivoText}
        setDispositivoText={aiIntegration.setDispositivoText}
        copySuccess={copySuccess}
        setCopySuccess={setCopySuccess}
        setError={setError}
        extractedTopics={extractedTopics}
        setExtractedTopics={setExtractedTopics}
        selectedTopics={selectedTopics}
        setSelectedTopics={setSelectedTopics}
        sanitizeHTML={sanitizeHTML}
      />

      {/* v1.37.51: Modais de Revisão de Sentença extraídos para componentes */}
      <SentenceReviewOptionsModal
        reviewScope={reviewScope}
        setReviewScope={setReviewScope}
        analyzedDocuments={analyzedDocuments}
        generatingReview={generatingReview}
        reviewSentence={reviewSentence}
      />

      <SentenceReviewResultModal
        reviewResult={reviewResult}
        reviewFromCache={reviewFromCache}
        sanitizeHTML={sanitizeHTML}
        clearReviewCache={clearReviewCache}
        setError={setError}
      />

      {/* v1.37.74: Modais de tópicos movidos para ModalRoot */}
      {/* RenameTopicModal, DeleteTopicModal, MergeTopicsModal, SplitTopicModal, NewTopicModal */}

      {/* v1.38.12: Adicionado allTopics para ContextScopeSelector */}
      {/* v1.38.16: Adicionado includeMainDocs com persistência por tópico */}
      {/* v1.39.06: Adicionado includeComplementaryDocs com persistência por tópico */}
      <AIAssistantModal
        isOpen={modals.aiAssistant}
        onClose={() => closeModal('aiAssistant')}
        contextScope={topicContextScope}
        setContextScope={setTopicContextScope}
        topicTitle={editingTopic?.title}
        chatHistory={chatAssistant.history}
        onSendMessage={handleSendChatMessage}
        onInsertResponse={handleInsertChatResponse}
        generating={chatAssistant.generating}
        onClear={chatAssistant.clear}
        lastResponse={chatAssistant.lastResponse}
        includeMainDocs={topicIncludeMainDocs}
        setIncludeMainDocs={setTopicIncludeMainDocs}
        includeComplementaryDocs={topicIncludeComplementaryDocs}
        setIncludeComplementaryDocs={setTopicIncludeComplementaryDocs}
        sanitizeHTML={sanitizeHTML}
        quickPrompts={aiIntegration.aiSettings.quickPrompts}
        proofManager={proofManager}
        allTopics={selectedTopics}
      />

      {/* v1.20.0: Modal de Jurisprudência (editor individual) */}
      {/* v1.32.18: Props para busca semântica */}
      {/* v1.33.16: jurisSemanticEnabled para toggle interno */}
      <JurisprudenciaModal
        isOpen={modals.jurisIndividual}
        onClose={() => closeModal('jurisIndividual')}
        topicTitle={editingTopic?.title}
        topicRelatorio={editingTopic?.relatorio || editingTopic?.editedRelatorio}
        callAI={aiIntegration?.callAI}
        useLocalAI={aiIntegration.aiSettings.useLocalAIForJuris && searchModelReady && jurisEmbeddingsCount > 0}
        jurisSemanticThreshold={aiIntegration.aiSettings.jurisSemanticThreshold}
        jurisSemanticEnabled={searchModelReady && jurisEmbeddingsCount > 0}
      />

      {/* v1.36.21: Modal Confronto de Fatos (editor individual) */}
      <BaseModal
        isOpen={modals.factsComparisonIndividual}
        onClose={() => {
          closeModal('factsComparisonIndividual');
          setFactsComparisonResultIndividual(null);
          setFactsComparisonErrorIndividual(null);
        }}
        title="Confronto de Fatos"
        subtitle={editingTopic?.title || ''}
        icon={<Scale />}
        iconColor="yellow"
        size="xl"
        preventClose={generatingFactsComparisonIndividual}
      >
        <FactsComparisonModalContent
          topicTitle={editingTopic?.title || ''}
          topicRelatorio={editingTopic?.editedRelatorio || editingTopic?.relatorio || ''}
          hasPeticao={!!(analyzedDocuments?.peticoesText?.length)}
          hasContestacao={!!(analyzedDocuments?.contestacoesText?.length)}
          onGenerate={handleGenerateFactsComparisonIndividual}
          cachedResult={factsComparisonResultIndividual}
          isGenerating={generatingFactsComparisonIndividual}
          error={factsComparisonErrorIndividual}
        />
      </BaseModal>

      <AIAssistantModelModal
        isOpen={modals.aiAssistantModel}
        onClose={() => {
          closeModal('aiAssistantModel');
          aiIntegration.setAiInstructionModel('');
          aiIntegration.setAiGeneratedTextModel('');
        }}
        aiInstructionModel={aiIntegration.aiInstructionModel}
        setAiInstructionModel={aiIntegration.setAiInstructionModel}
        generatingAiModel={aiIntegration.generatingAiModel}
        aiGeneratedTextModel={aiIntegration.aiGeneratedTextModel}
        setAiGeneratedTextModel={aiIntegration.setAiGeneratedTextModel}
        onGenerateText={generateAiTextForModel}
        onInsertText={insertAiTextModel}
        sanitizeHTML={sanitizeHTML}
      />

      <AnalysisModal
        isOpen={modals.analysis}
        analysisProgress={documentAnalysisProgress}
        peticaoFiles={peticaoFiles}
        pastedPeticaoTexts={pastedPeticaoTexts}
        contestacaoFiles={contestacaoFiles}
        pastedContestacaoTexts={pastedContestacaoTexts}
        complementaryFiles={complementaryFiles}
        pastedComplementaryTexts={pastedComplementaryTexts}
      />

      {/* v1.35.30: Modal de Curadoria de Tópicos */}
      <TopicCurationModal
        isOpen={showTopicCurationModal}
        onConfirm={handleCurationConfirm}
        onCancel={handleCurationCancel}
        initialTopics={pendingCurationData?.topics || []}
        model={
          aiIntegration.aiSettings?.provider === 'gemini'
            ? (aiIntegration.aiSettings?.geminiModel || 'gemini-3-flash-preview')
            : aiIntegration.aiSettings?.provider === 'openai'
              ? (aiIntegration.aiSettings?.openaiModel || 'gpt-5.2-chat-latest')
              : aiIntegration.aiSettings?.provider === 'grok'
                ? (aiIntegration.aiSettings?.grokModel || 'grok-4-1-fast-reasoning')
                : (aiIntegration.aiSettings?.model || 'claude-sonnet-4-20250514')
        }
        parallelRequests={aiIntegration.aiSettings?.parallelRequests || 5}
        isDarkMode={appTheme === 'dark'}
        provider={aiIntegration.aiSettings?.provider || 'claude'}
        thinkingBudget={aiIntegration.aiSettings?.thinkingBudget || '10000'}
        useExtendedThinking={aiIntegration.aiSettings?.useExtendedThinking ?? true}
        geminiThinkingLevel={aiIntegration.aiSettings?.geminiThinkingLevel || 'high'}
        topicsPerRequest={aiIntegration.aiSettings?.topicsPerRequest || 1}
      />

      {/* v1.35.40: Modal de arquivos do Google Drive */}
      {/* v1.38.52: Callbacks extraídos para useDriveFileHandlers hook */}
      <DriveFilesModal
        isOpen={driveFilesModalOpen}
        onClose={() => setDriveFilesModalOpen(false)}
        files={driveFiles}
        isLoading={googleDrive.isLoading}
        onLoad={driveFileHandlers.handleDriveLoad}
        onDelete={driveFileHandlers.handleDriveDelete}
        onShare={driveFileHandlers.handleDriveShare}
        onRefresh={driveFileHandlers.handleDriveRefresh}
        onGetPermissions={driveFileHandlers.handleDriveGetPermissions}
        onRemovePermission={driveFileHandlers.handleDriveRemovePermission}
        userEmail={googleDrive.userEmail}
        isDarkMode={appTheme === 'dark'}
      />

      {/* v1.35.69: Modal de Geração de Modelo a partir de Exemplos */}
      <ModelGeneratorModal
        isOpen={modelGeneratorModal.isOpen}
        onClose={closeModelGenerator}
        targetField={modelGeneratorModal.targetField}
        onSave={handleModelGenerated}
        callAI={aiIntegration.callAI}
        hardcodedPrompt={modelGeneratorModal.targetField ? getHardcodedPrompt(modelGeneratorModal.targetField) : ''}
      />


      {/* v1.40.06: ConfigModal refatorado - usa hooks/stores diretamente (52 → 2 props) */}
      <ConfigModal
        isOpen={modals.settings}
        onClose={() => closeModal('settings')}
      />

      {/* v1.38.51: ChangelogModal e DoubleCheckReviewModal movidos para ModalRoot */}

      {/* v1.37.51: Modais de Download extraídos para componentes */}
      <DataDownloadModal
        isOpen={showDataDownloadModal}
        onDismiss={handleDismissDataPrompt}
        onStartDownload={handleStartDataDownload}
        status={dataDownloadStatus}
      />

      <EmbeddingsDownloadModal
        isOpen={showEmbeddingsDownloadModal}
        onDismiss={handleDismissEmbeddingsPrompt}
        onStartDownload={handleStartEmbeddingsDownload}
        status={embeddingsDownloadStatus}
      />

      {/* Modal de Restaurar Sessão */}
      {/* v1.38.52: Callbacks extraídos para useSessionCallbacks hook */}
      <RestoreSessionModal
        isOpen={modals.restoreSession}
        onClose={() => closeModal('restoreSession')}
        sessionLastSaved={storage.sessionLastSaved}
        onRestoreSession={sessionCallbacks.handleRestoreSession}
        onStartNew={sessionCallbacks.handleStartNew}
      />

      {/* Modal de Confirmação de Limpeza de Projeto */}
      {/* v1.38.52: Callbacks extraídos para useSessionCallbacks hook */}
      <ClearProjectModal
        isOpen={modals.clearProject}
        onClose={sessionCallbacks.handleCloseClearProject}
        onConfirmClear={sessionCallbacks.handleConfirmClear}
      />

      {/* v1.33.57: Modal de Confirmação de Logout */}
      {/* v1.38.52: Callbacks extraídos para useSessionCallbacks hook */}
      {onLogout !== undefined && (
        <LogoutConfirmModal
          isOpen={modals.logout}
          onClose={sessionCallbacks.handleCloseLogout}
          onConfirm={sessionCallbacks.handleConfirmLogout}
        />
      )}

      {/* v1.35.0: Modal de Compartilhamento de Biblioteca */}
      <ShareLibraryModal
        isOpen={modals.shareLibrary}
        onClose={() => closeModal('shareLibrary')}
        user={cloudSync?.user}
        onRemoveSharedModels={(ownerId: string) => {
          // v1.35.23: Remover modelos compartilhados desse owner ao remover acesso
          modelLibrary.setModels((prev: Model[]) => {
            const filtered = prev.filter((m: Model) => !(m.isShared && m.ownerId === ownerId));
            console.log(`[Share] Removidos ${prev.length - filtered.length} modelos do owner ${ownerId}`);
            saveToIndexedDB(filtered);
            return filtered;
          });
        }}
      />

      {/* Modal de Nomes para Anonimização - v1.17.0 (v1.25: + NER) */}
      <AnonymizationNamesModal
        isOpen={showAnonymizationModal}
        onClose={() => setShowAnonymizationModal(false)}
        onConfirm={handleAnonymizationConfirm}
        nomesTexto={anonymizationNamesText}
        setNomesTexto={setAnonymizationNamesText}
        nerEnabled={nerEnabled}
        detectingNames={detectingNames}
        onDetectNames={detectarNomesAutomaticamente}
        onOpenAiSettings={() => { setShowAnonymizationModal(false); openModal('settings'); }}
      />

      {/* Modal de Confirmação de Exclusão de Modelo */}
      {/* v1.37.73: DeleteModelModal movido para ModalRoot */}

      {/* ============= MODAIS DE GERAÇÃO EM MASSA ============= */}

      {/* Modal 1: Upload de Arquivos */}
      {/* Modal de Upload/Processamento em Lote */}
      <BulkUploadModal
        isOpen={modals.bulkModal}
        onClose={() => {
          closeModal('bulkModal');
          modelLibrary.setBulkFiles([]);
        }}
        isProcessing={modelLibrary.bulkProcessing}
        isReviewOpen={modals.bulkReview}
        bulkFiles={modelLibrary.bulkFiles}
        bulkFileInputRef={bulkFileInputRef}
        onFileUpload={handleBulkFileUpload}
        onRemoveFile={modelLibrary.removeBulkFile}
        onProcess={processBulkFiles}
        currentFileIndex={modelLibrary.bulkCurrentFileIndex}
        processedFiles={modelLibrary.bulkProcessedFiles}
        bulkStaggerDelay={modelLibrary.bulkStaggerDelay}
        setBulkStaggerDelay={modelLibrary.setBulkStaggerDelay}
        bulkCancelController={modelLibrary.bulkCancelController}
        generatedModels={modelLibrary.bulkGeneratedModels}
        bulkCurrentBatch={modelLibrary.bulkCurrentBatch}
        bulkBatchSize={aiIntegration.aiSettings.parallelRequests || 5}
        openModal={openModal}
      />

      {/* 🔍 v1.13.1: Modal de Aviso de Similaridade */}
      {/* v1.37.73: SimilarityWarningModal movido para ModalRoot */}

      {/* Modal 3: Revisão de Modelos Gerados */}
      {/* Modal de Revisão de Modelos Gerados em Lote */}
      <BulkReviewModal
        isOpen={modals.bulkReview}
        onClose={() => closeModal('bulkReview')}
        bulkReviewModels={modelLibrary.bulkReviewModels}
        bulkFiles={modelLibrary.bulkFiles}
        bulkGeneratedModels={modelLibrary.bulkGeneratedModels}
        bulkErrors={modelLibrary.bulkErrors}
        onRemoveModel={removeBulkReviewModel}
        onDiscard={() => {
          closeModal('bulkReview');
          openModal('bulkDiscardConfirm');
        }}
        onSave={saveBulkModels}
        sanitizeHTML={sanitizeHTML}
      />

      {/* Modal de Confirmação - Descartar Modelos Gerados */}
      {/* v1.37.73: BulkDiscardConfirmModal movido para ModalRoot */}

      {/* v1.5.15: Modal de Confirmação - Cancelar Processamento */}
      <ConfirmBulkCancelModal
        isOpen={modals.confirmBulkCancel}
        onClose={() => closeModal('confirmBulkCancel')}
        filesInProgress={getBulkPendingFilesCount()}
        onConfirm={handleConfirmBulkCancel}
      />

      {/* ============= FIM DOS MODAIS DE GERAÇÃO EM MASSA ============= */}

      {/* Modal de Confirmação de Exclusão em Massa */}
      {/* v1.37.73: DeleteAllModelsModal movido para ModalRoot */}


      {/* Modal de Confirmação - Extrair Modelo */}
      <ExtractModelConfirmModal
        isOpen={modals.extractModelConfirm}
        onClose={() => closeModal('extractModelConfirm')}
        editingTopic={editingTopic}
        editorRef={editorRef}
        onConfirmExtract={extractModelFromDecisionText}
      />

      {/* Modal de Preview/Edição - Modelo Extraído */}
      {/* v1.37.73: ExtractedModelPreviewModal movido para ModalRoot */}

      {/* v1.15.3: Modal de "Salvar como Novo Modelo" (reutiliza ExtractedModelPreviewModal) */}
      <ExtractedModelPreviewModal
        isOpen={modelPreview.saveAsNewData !== null}
        onClose={() => modelPreview.closeSaveAsNew()}
        extractedModel={modelPreview.saveAsNewData}
        setExtractedModel={(data) => modelPreview.setSaveAsNewData(data)}
        onSave={confirmSaveAsNew}
        onCancel={() => modelPreview.closeSaveAsNew()}
        sanitizeHTML={sanitizeHTML}
      />

      {/* v1.11.0: Modal de Edição Global */}
      <GlobalEditorModal
        isOpen={modals.globalEditor}
        onClose={() => closeModal('globalEditor')}
        selectedTopics={selectedTopics}
        setSelectedTopics={setSelectedTopics}
        setExtractedTopics={setExtractedTopics}
        models={modelLibrary.models}
        findSuggestions={findSuggestions}
        sanitizeHTML={sanitizeHTML}
        showToast={showToast}
        fontSize={fontSize}
        spacing={spacing}
        setFontSize={setFontSize}
        setSpacing={setSpacing}
        editorTheme={appTheme}
        quillReady={quillReady}
        quillError={quillError}
        modelPreview={modelPreview}
        analyzedDocuments={analyzedDocuments}
        proofManager={proofManager}
        aiIntegration={aiIntegration}
        detectResultadoAutomatico={detectResultadoAutomatico}
        onSlashCommand={openSlashMenu}
        fileToBase64={storage.fileToBase64}
        openModal={openModal}
        closeModal={closeModal}
        useLocalAIForSuggestions={aiIntegration.aiSettings.useLocalAIForSuggestions}
        useLocalAIForJuris={aiIntegration.aiSettings.useLocalAIForJuris}
        jurisSemanticThreshold={aiIntegration.aiSettings.jurisSemanticThreshold}
        searchModelReady={searchModelReady}
        jurisEmbeddingsCount={jurisEmbeddingsCount}
        searchModelsBySimilarity={searchModelsBySimilarity}
        modelSemanticEnabled={aiIntegration.aiSettings.modelSemanticEnabled}
      />

      {/* Modal de Preview de Modelo (Sugestões) - GLOBAL (v1.12.2: movido para depois do GlobalEditorModal) */}
      {/* v1.15.2: Usa função contextual se disponível (ex: GlobalEditorModal) */}
      <ModelPreviewModal
        isOpen={modelPreview.isPreviewOpen}
        model={modelPreview.previewingModel}
        onInsert={modelPreview.contextualInsertFnRef?.current || insertModelContent}
        onClose={modelPreview.closePreview}
        sanitizeHTML={sanitizeHTML}
        showToast={showToast}
        // Props para Quick Edit
        isEditing={modelPreview.isEditing}
        editedContent={modelPreview.editedContent}
        onStartEditing={modelPreview.startEditing}
        onCancelEditing={modelPreview.cancelEditing}
        onSaveEdit={saveQuickEdit}
        onContentChange={modelPreview.setEditedContent}
        quillReady={quillReady}
        quillError={quillError}
        // Props para configurações globais de editor
        fontSize={fontSize}
        spacing={spacing}
        editorTheme={appTheme}
        // Prop para exclusão de modelo
        onDelete={confirmDeleteModel}
        // Prop para favoritar modelo
        onToggleFavorite={toggleFavorite}
        // v1.15.3: Prop para "Salvar como Novo Modelo"
        onOpenSaveAsNew={modelPreview.openSaveAsNew}
      />

      {/* v1.15.3: Slash Command Menu - Acesso rápido a modelos com / */}
      {/* v1.33.8: Adicionado suporte a busca semântica e tooltip preview */}
      <SlashCommandMenu
        isOpen={slashMenu.isOpen}
        position={slashMenu.position}
        models={modelLibrary.models}
        searchTerm={slashMenu.searchTerm}
        selectedIndex={slashMenu.selectedIndex}
        onSelect={selectModelFromSlash}
        onClose={() => closeSlashMenu(true)}
        onSearchChange={updateSlashSearchTerm}
        onNavigate={navigateSlashMenu}
        semanticAvailable={modelSemanticAvailable}
        searchModelsBySimilarity={searchModelsBySimilarity}
      />

      {/* v1.37.51: Toast extraído para componente */}
      <Toast />

      {/* v1.37.73: ModalRoot - modais simples centralizados com Zustand */}
      <ModalRoot
        exportedText={exportedText}
        exportedHtml={exportedHtml}
        onBulkDiscard={() => {
          closeModal('bulkDiscardConfirm');
          closeModal('bulkModal');
          modelLibrary.resetBulkState();
        }}
        bulkReviewModelsCount={modelLibrary.bulkReviewModels.length}
        onSimilarityCancel={handleSimilarityCancel}
        onSimilaritySaveNew={handleSimilaritySaveNew}
        onSimilarityReplace={handleSimilarityReplace}
        savingFromSimilarity={savingFromSimilarity}
        sanitizeHTML={sanitizeHTML}
        onSaveExtractedModel={saveExtractedModel}
        onCancelExtractedModel={cancelExtractedModel}
        // v1.37.74: Topic modals
        handleRenameTopic={handleRenameTopic}
        handleMergeTopics={handleMergeTopics}
        handleSplitTopic={handleSplitTopic}
        handleCreateNewTopic={handleCreateNewTopic}
        isRegenerating={aiIntegration.regenerating}
        hasDocuments={!!(analyzedDocuments.peticoes?.length > 0 || analyzedDocuments.peticoesText?.length > 0)}
        // v1.37.77: trackChange para rastrear deletes de modelos para sync
        trackChange={cloudSync?.trackChange}
        // v1.39.08: Import Prova Oral
        provaOralAnalyses={provaOralAnalyses}
        provaOralLoading={provaOralImport.isLoading}
        provaOralError={provaOralImport.error}
        onRefreshProvaOralAnalyses={handleRefreshProvaOralAnalyses}
        selectedProvaOralAnalysis={selectedProvaOralAnalysis}
        onSelectProvaOralAnalysis={handleSelectProvaOralAnalysis}
        onImportProvaOral={handleImportProvaOral}
        isImportingProvaOral={isImportingProvaOral}
      />

      {/* v1.4.6: Removido Mini-toolbar flutuante (76 linhas) */}
      {/* v1.4.8: Removido Toolbar Fixa no Topo (82 linhas) - não mais necessária com editor de altura fixa */}

      {/* Modal: Adicionar Prova (Texto) - v1.38.52: callback extraído para useProofModalCallbacks */}
      <AddProofTextModal
        isOpen={modals.addProofText}
        onClose={() => closeModal('addProofText')}
        newProofData={proofManager.newProofTextData}
        setNewProofData={proofManager.setNewProofTextData}
        onAddProof={handleAddProofText}
      />

      {/* v1.21.3: Modal de Nomes para Anonimização de Prova de Texto - v1.38.52: callbacks extraídos */}
      <AnonymizationNamesModal
        isOpen={modals.proofTextAnonymization}
        onClose={handleProofTextAnonymizationClose}
        onConfirm={handleProofTextAnonymizationConfirm}
        nomesTexto={anonymizationNamesText}
        setNomesTexto={setAnonymizationNamesText}
        nerEnabled={nerEnabled}
        detectingNames={detectingNames}
        onDetectNames={handleProofTextAnonymizationDetect}
        onOpenAiSettings={() => { closeModal('proofTextAnonymization'); openModal('settings'); }}
      />

      {/* v1.21.5: Modal de Nomes para Anonimização de Extração de PDF - v1.38.52: callbacks extraídos */}
      <AnonymizationNamesModal
        isOpen={modals.proofExtractionAnonymization}
        onClose={handleProofExtractionAnonymizationClose}
        onConfirm={handleProofExtractionAnonymizationConfirm}
        nomesTexto={anonymizationNamesText}
        setNomesTexto={setAnonymizationNamesText}
        nerEnabled={nerEnabled}
        detectingNames={detectingNames}
        onDetectNames={handleProofExtractionAnonymizationDetect}
        onOpenAiSettings={() => { closeModal('proofExtractionAnonymization'); openModal('settings'); }}
      />

      {/* v1.38.51: TextPreviewModal movido para ModalRoot */}

      {/* Modal: Seleção de Tipo de Análise de Prova - v1.38.52: callbacks extraídos */}
      <ProofAnalysisModal
        isOpen={modals.proofAnalysis}
        onClose={handleProofAnalysisClose}
        proofToAnalyze={proofManager.proofToAnalyze}
        customInstructions={proofManager.proofAnalysisCustomInstructions}
        setCustomInstructions={proofManager.setProofAnalysisCustomInstructions}
        useOnlyMiniRelatorios={proofManager.useOnlyMiniRelatorios}
        setUseOnlyMiniRelatorios={proofManager.setUseOnlyMiniRelatorios}
        includeLinkedTopicsInFree={proofManager.includeLinkedTopicsInFree}
        setIncludeLinkedTopicsInFree={proofManager.setIncludeLinkedTopicsInFree}
        proofTopicLinks={proofManager.proofTopicLinks}
        editorTheme={editorTheme}
        onAnalyzeContextual={handleAnalyzeContextual}
        onAnalyzeFree={handleAnalyzeFree}
      />

      {/* Modal: Vincular Prova a Tópicos */}
      <LinkProofModal
        isOpen={modals.linkProof}
        onClose={() => {
          closeModal('linkProof');
          proofManager.setProofToLink(null);
        }}
        proofToLink={proofManager.proofToLink}
        extractedTopics={extractedTopics}
        proofTopicLinks={proofManager.proofTopicLinks}
        setProofTopicLinks={proofManager.setProofTopicLinks}
      />

      {/* Modal: Confirmar Exclusão de Prova - v1.38.52: callbacks extraídos */}
      <DeleteProofModal
        isOpen={modals.deleteProof}
        onClose={handleDeleteProofClose}
        proofToDelete={proofManager.proofToDelete}
        onConfirmDelete={handleDeleteProofConfirm}
      />

      {/* v1.37.51: AutoSaveIndicator extraído para componente */}
      <AutoSaveIndicator show={storage.showAutoSaveIndicator} />

      {/* v1.9.5: Overlay para abas bloqueadas (não-primárias) */}
      <LockedTabOverlay
        isPrimaryTab={primaryTabLock.isPrimaryTab}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />
    </div>
    </>
  );
};

// 🔒 DOCUMENTAÇÃO DE SEGURANÇA - DOMPURIFY
/*
SANITIZAÇÃO DE HTML IMPLEMENTADA COM DOMPURIFY

✅ Implementação concluída em: 2025-11-12
📦 Biblioteca: DOMPurify 3.0.6 (carregada via CDN)
🎯 Objetivo: Prevenir ataques XSS (Cross-Site Scripting)

LOCAIS PROTEGIDOS:
1. ✅ Editores de tópicos (editorRef, relatorioRef) - Linhas 884-885
2. ✅ Editor de modelos (modelEditorRef) - Linha 1218
3. ✅ Regeneração de relatórios - Linha 1554
4. ✅ Inserção de texto gerado por IA (decisões) - Linhas 2580-2586
5. ✅ Inserção de texto gerado por IA (modelos) - Linhas 2716-2722
6. ✅ Conversão HTML para texto plano - Linha 2781
7. ✅ Inserção de conteúdo de modelos - Linha 5107
8. ✅ Mensagens de feedback com interpolação - Linhas 5315-5317

CONFIGURAÇÃO DE SANITIZAÇÃO (linha 503-522):
- Tags permitidas: p, br, div, span, strong, b, em, i, u, ul, ol, li, h1-h6
- Atributos permitidos: class, id, style (limitado)
- Estilos permitidos: font-weight, font-style, text-decoration
- Remove scripts, eventos onclick, e outros vetores de ataque

CASOS NÃO SANITIZADOS (seguros):
- innerHTML = '' (limpeza de editores) - Linhas 1142, 7517, 7532, 8014
- innerHTML com texto estático (mensagens) - Linhas 1188, 5319

TESTES SUGERIDOS:
1. Tentar inserir <script>alert('XSS')</script> em editor
2. Tentar inserir <img src=x onerror=alert('XSS')>
3. Verificar que formatação básica (negrito, itálico) continua funcionando
4. Confirmar que links e estilos maliciosos são removidos

COMPORTAMENTO EM CASO DE FALHA:
- Se DOMPurify não carregar: retorna string vazia (seguro por padrão)
- Console mostra avisos quando DOMPurify não está pronto
- Loading assíncrono não bloqueia inicialização da aplicação

DEPENDÊNCIAS:
- CDN: https://cdn.jsdelivr.net/npm/dompurify@3.0.6/dist/purify.min.js
- Carregamento: useEffect na linha 250-276
- Estado: domPurifyReady (linha 247)
*/

// 🔧 GlobalHoverStyles extraído para src/styles/GlobalHoverStyles.tsx (v1.37.0)
// 🔧 ThemeStyles extraído para src/styles/ThemeStyles.tsx (v1.37.0)

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 🛡️ SEÇÃO 9: ERROR BOUNDARY & EXPORT
// Tratamento de erros com fallback, wrapper SentencifyAI, export default
// ═══════════════════════════════════════════════════════════════════════════════════════════



// 📤 EXPORT
// v1.34.4: Cloud Sync + Admin Panel
const SentencifyAI = () => {
  // v1.34.4: Rota /admin abre painel de administração
  if (window.location.pathname === '/admin') {
    return <AdminPanel />;
  }

  // v1.38.0: Rota /analise abre Analisador de Prepauta
  if (window.location.pathname.startsWith('/analise')) {
    return <AnalisadorApp />;
  }

  // v1.39.08: Rota /prova-oral abre Análise de Prova Oral
  if (window.location.pathname.startsWith('/prova-oral')) {
    return <ProvaOralApp />;
  }

  // v1.35.0: Rota /share/:token abre página de aceite de compartilhamento
  const shareMatch = window.location.pathname.match(/^\/share\/([a-f0-9]+)$/i);

  // v1.34.1: Estado para modelos recebidos do servidor (para merge)
  // v1.37.49: receivedModels e activeSharedLibraries migrados para useModelsStore
  const receivedModels = useModelsStore((s) => s.receivedModels);
  // v1.35.24: Lista de bibliotecas compartilhadas ativas (para filtrar modelos de owners revogados)
  const activeSharedLibraries = useModelsStore((s) => s.activeSharedLibraries);

  // v1.35.1: Memoizar callbacks para evitar re-criação de pull/sync a cada render
  // v1.35.24: Receber sharedLibraries junto com models
  const handleModelsReceived = React.useCallback((models: Model[], sharedLibraries: Array<{ ownerId: string; ownerEmail: string }>) => {
    useModelsStore.getState().setReceivedModels(models);
    useModelsStore.getState().setActiveSharedLibraries(sharedLibraries || []);
  }, []);
  const clearReceivedModels = React.useCallback(() => {
    useModelsStore.getState().setReceivedModels(null);
    useModelsStore.getState().setActiveSharedLibraries(null);
  }, []);

  // v1.37.78: Estado para indicar que modelos foram carregados do IndexedDB
  const [modelsLoaded, setModelsLoaded] = React.useState(false);

  const cloudSync = useCloudSync({
    onModelsReceived: handleModelsReceived,
    modelsLoaded: modelsLoaded
  });

  // Fallback para auth legada durante transição
  const legacyAuth = useAuth();

  // Mostrar loading enquanto verifica auth
  if (cloudSync.authLoading || legacyAuth.isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-6">
        {/* Spinner Neon + Ripple - v1.33.50 */}
        <div className="spinner-neon-ripple">
          <div className="ripple"></div>
          <div className="ripple"></div>
          <div className="ripple"></div>
          <div className="core">
            <div className="outer"></div>
            <div className="inner"></div>
          </div>
        </div>
        <span className="text-slate-400 animate-pulse">Carregando...</span>
      </div>
    );
  }

  // v1.35.0: Se estiver em rota de compartilhamento
  if (shareMatch) {
    const shareToken = shareMatch[1];

    // Se não autenticado, mostrar login primeiro (após login volta para a mesma URL)
    if (!cloudSync.isAuthenticated) {
      return (
        <div className="min-h-screen bg-slate-900">
          <LoginMagicModal
            isOpen={true}
            onClose={() => {}}
            onRequestLink={cloudSync.requestMagicLink}
            onVerify={cloudSync.verifyToken}
            devLink={cloudSync.devLink ?? undefined}
          />
        </div>
      );
    }

    // Usuário autenticado, mostrar página de aceite
    return <AcceptSharePage token={shareToken} />;
  }

  // v1.34.0: Mostrar modal de login Magic Link se não autenticado
  if (!cloudSync.isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900">
        <LoginMagicModal
          isOpen={true}
          onClose={() => {}} // Modal não pode ser fechado sem autenticar
          onRequestLink={cloudSync.requestMagicLink}
          onVerify={cloudSync.verifyToken}
          devLink={cloudSync.devLink ?? undefined}
        />
      </div>
    );
  }

  // App normal com ErrorBoundary
  return (
    <ErrorBoundary>
      <LegalDecisionEditor
        onLogout={cloudSync.logout}
        cloudSync={cloudSync}
        receivedModels={receivedModels}
        activeSharedLibraries={activeSharedLibraries}
        clearReceivedModels={clearReceivedModels}
        setModelsLoaded={setModelsLoaded}
      />
    </ErrorBoundary>
  );
};

// v1.35.40: Wrapper com GoogleOAuthProvider para integração com Google Drive
const SentencifyAIWithGoogleDrive = () => (
  <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
    <SentencifyAI />
  </GoogleOAuthProvider>
);

export default SentencifyAIWithGoogleDrive;
