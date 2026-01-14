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

import React, { useState, useEffect, useRef } from 'react';
import { CHANGELOG } from './constants/changelog';
import { EXPORT_STYLES } from './constants/export-styles';
import { Upload, FileText, Plus, Search, Save, Trash2, ChevronDown, ChevronUp, Download, AlertCircle, AlertTriangle, Edit2, Edit3, Merge, Split, PlusCircle, Sparkles, Edit, GripVertical, BookOpen, Book, Zap, Scale, Loader2, Check, X, Clock, RefreshCw, Info, Code, Copy, ArrowRight, Eye, Wand2, LogOut, Share2, Link, Users, Mail, RotateCcw } from 'lucide-react';
import LoginScreen, { useAuth } from './components/LoginScreen';

// v1.34.0: Cloud Sync - Magic Link Authentication + SQLite Sync
import useCloudSync, { type UseCloudSyncReturn, type SharedLibrary } from './hooks/useCloudSync';
import LoginMagicModal from './components/LoginMagicModal';
import SyncStatusIndicator from './components/SyncStatusIndicator';

// v1.36.61+: Zustand Stores - Estado global gerenciado
// useModalManagerCompat movido para src/hooks/useModalManager.ts (v1.36.78)
import { useAISettingsCompat } from './stores/useAIStore';
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
import { useFullscreen, useSpacingControl, useFontSizeControl, useFeatureFlags, useThrottledBroadcast, useAPICache, usePrimaryTabLock, useFieldVersioning, useThemeManagement, useTabbedInterface, useIndexedDB, validateModel, sanitizeModel, useLegislacao, LEIS_METADATA, getLeiFromId, saveArtigosToIndexedDB, loadArtigosFromIndexedDB, clearArtigosFromIndexedDB, sortArtigosNatural, useJurisprudencia, IRR_TYPES, isIRRType, JURIS_TIPOS_DISPONIVEIS, JURIS_TRIBUNAIS_DISPONIVEIS, savePrecedentesToIndexedDB, loadPrecedentesFromIndexedDB, clearPrecedentesFromIndexedDB, useChatAssistant, MAX_CHAT_HISTORY_MESSAGES, useModelPreview, useLocalStorage, savePdfToIndexedDB, getPdfFromIndexedDB, removePdfFromIndexedDB, clearAllPdfsFromIndexedDB, useProofManager, useDocumentManager, useTopicManager, useModalManager, useModelLibrary, searchModelsInLibrary, removeAccents, SEARCH_STOPWORDS, SINONIMOS_JURIDICOS, useQuillEditor, sanitizeQuillHTML, useDocumentServices, useAIIntegration, useDocumentAnalysis, useReportGeneration, useProofAnalysis, useTopicOrdering, useDragDropTopics, useTopicOperations, useModelGeneration, useEmbeddingsManagement, useModelSave, useDispositivoGeneration, useDecisionTextGeneration, useFactsComparison, useModelExtraction, useDetectEntities, useExportImport, useDecisionExport, useSlashMenu, useFileHandling, useNERManagement, useChangeDetectionHashes, useSemanticSearchManagement } from './hooks';
import type { CurationData } from './hooks/useDocumentAnalysis';
import { API_BASE } from './constants/api';
import { SPACING_PRESETS, FONTSIZE_PRESETS } from './constants/presets';
import { APP_VERSION } from './constants/app-version';

// v1.34.4: Admin Panel - Gerenciamento de emails autorizados
import AdminPanel from './components/AdminPanel';

// v1.35.30: Modal de curadoria de tópicos pré-geração
import TopicCurationModal from './components/TopicCurationModal';

// v1.35.40: Google Drive - Salvar/Carregar projetos na nuvem
import { GoogleOAuthProvider } from '@react-oauth/google';
import { useGoogleDrive, GOOGLE_CLIENT_ID } from './hooks/useGoogleDrive';
import { GoogleDriveButton, DriveFilesModal } from './components/GoogleDriveButton';
import { VoiceButton } from './components/VoiceButton';
import { ModelGeneratorModal } from './components/ModelGeneratorModal';
import { FactsComparisonModalContent } from './components/FactsComparisonModal';
import { TopicCard, SortableTopicCard, ModelCard, ProofCard, VirtualList, SuggestionCard, SplitDivider, SpacingDropdown, FontSizeDropdown, ProcessingModeSelector, VersionCompareModal, VersionSelect, JurisprudenciaCard, ArtigoCard, ChatBubble, ChatHistoryArea, ChatInput, InsertDropdown, BaseModal, ModalFooter, ModalWarningBox, ModalInfoBox, ModalAmberBox, ModalContentPreview, RenameTopicModal, DeleteTopicModal, MergeTopicsModal, SplitTopicModal, NewTopicModal, DeleteModelModal, DeleteAllModelsModal, DeleteAllPrecedentesModal, ExtractModelConfirmModal, ExtractedModelPreviewModal, SimilarityWarningModal, AddProofTextModal, DeleteProofModal, ProofAnalysisModal, LinkProofModal, RestoreSessionModal, ClearProjectModal, LogoutConfirmModal, BulkDiscardConfirmModal, ConfirmBulkCancelModal, TextPreviewModal, FullscreenModelPanel, ModelSearchPanel, JurisprudenciaTab, LegislacaoTab, AIAssistantBaseLegacy, AIAssistantBase, AIAssistantModal, AIAssistantGlobalModal, AIAssistantModelModal, extractPlainText, isOralProof, hasOralProofsForTopic, AnalysisModal, ExportModal, AnonymizationNamesModal, LinkedProofsModal, ShareLibraryModal, AcceptSharePage, DispositivoModal, BulkReviewModal, BulkUploadModal, ModelFormFields, SlashCommandMenu, JurisprudenciaModal, getQuillToolbarConfig, QuillEditorBase, QuillModelEditor, QuillDecisionEditor, QuillMiniRelatorioEditor, AIRegenerationSection, FieldEditor, InlineFormattingToolbar, ModelFormModal, ModelPreviewModal, GlobalEditorSection, DecisionEditorContainer, LockedTabOverlay, GlobalEditorModal, ConfigModal, ModelsTab, UploadTab, ErrorBoundary } from './components';  // v1.36.82+: UI, v1.36.85-91: Modals/AI, v1.36.86: Cards, v1.36.87: Panels, v1.36.94: Editors, v1.36.97: Editor Containers, v1.36.99: GlobalEditorModal, v1.37.30: ConfigModal, v1.37.31: ModelsTab, v1.37.32: UploadTab
import useFactsComparisonCache, { openFactsDB, FACTS_STORE_NAME } from './hooks/useFactsComparisonCache';
import useSentenceReviewCache, { openReviewDB, REVIEW_STORE_NAME } from './hooks/useSentenceReviewCache';

// v1.35.26: Prompts de IA movidos para src/prompts/
// v1.37.18: buildDocumentContentArray, buildMiniReportPrompt, buildBatchMiniReportPrompt extraídos
import { AI_INSTRUCTIONS, AI_INSTRUCTIONS_CORE, AI_INSTRUCTIONS_STYLE, AI_INSTRUCTIONS_SAFETY, AI_PROMPTS, INSTRUCAO_NAO_PRESUMIR, buildDocumentContentArray, buildMiniReportPromptCore, buildMiniReportPrompt, buildBatchMiniReportPrompt } from './prompts';

// v1.36.95: Estilos centralizados
import { CSS, RESULTADO_STYLES, getResultadoStyle } from './constants/styles';

// v1.37.0: Estilos CSS-in-JS extraídos
import { GlobalHoverStyles, ThemeStyles } from './styles';
import { buildMiniRelatorioComparisonPrompt, buildDocumentosComparisonPrompt, buildPdfComparisonPrompt } from './prompts/facts-comparison-prompts';

// v1.36.60: AIModelService extraído para src/services/
import AIModelService from './services/AIModelService';

// v1.36.81: Serviços de embeddings extraídos
import { TFIDFSimilarity, EmbeddingsService, JurisEmbeddingsService, EmbeddingsCDNService, chunkJurisText, JURIS_CHUNK_THRESHOLD, JURIS_CHUNK_SIZE, JURIS_CHUNK_OVERLAP } from './services/EmbeddingsServices';

// v1.36.81: Utilitários extraídos
import { anonymizeText, normalizeHTMLSpacing, removeMetaComments, SPECIAL_TOPICS, isSpecialTopic, isRelatorio, isDispositivo, generateModelId } from './utils/text';
import { STATUS_INVALIDOS, isStatusValido, jurisCache, JURIS_CACHE_TTL, hashJurisKey, stemJuridico, expandWithSynonyms, refineJurisWithAIHelper, findJurisprudenciaHelper } from './utils/jurisprudencia';
import { searchModelsBySimilarity } from './utils/models';

// v1.36.96: Context helpers extraídos
import { prepareDocumentsContext, prepareProofsContext, prepareOralProofsContext, fastHashUtil } from './utils/context-helpers';
import { injectQuillStyles, injectQuillLightStyles } from './utils/quill-styles-injector';
import { htmlToPlainText, htmlToFormattedText, plainTextToHtml, cleanHtmlForExport } from './utils/html-conversion';

// v1.35.79: Tipos TypeScript centralizados (ETAPA 0 reorganização completa)
import type {
  // Core Types
  ModalKey, ModalState, TextPreviewState, AISettings, TokenMetrics,
  Topic, TopicCategory, TopicResultado, TopicoComplementar, Model, NewModelData, Proof, ProofFile, ProofText, ProofAnalysisResult,
  ProcessingMode, InsertMode, FieldVersion, DriveFile, GeminiThinkingLevel,
  ProgressState, ToastState, SlashMenuState, ModelGeneratorModalState,
  FiltrosJuris, FiltrosLegislacao, PastedText, ChatMessage, Precedente, Artigo,
  JurisSuggestion, ShareInfo, DownloadStatus, EmbeddingsDownloadStatus, DataDownloadStatus,
  DocumentAnalysis, PartesProcesso, QuillInstance, QuillDelta, NewProofTextData, CacheEntry, CacheStats,
  TargetField,
  // FASE 8.2: Tipos adicionais para useState com objetos
  LocalModelForm, SlashMenuStateExtended, DownloadItemStatus,
  EmbeddingsDownloadStatusExtended, DataDownloadStatusExtended, ActiveFormatsState,
  // FASE 8.7: Tipos para AIModelService e serviços
  AIModelType, AIModelStatus, AIModelServiceStatus, AIModelServiceProgress,
  NERRawEntity, NERProcessedEntity, AIModelStatusCallback, AIWorkerMessage, PendingWorkerPromise,
  LegislacaoEmbeddingItem, JurisEmbeddingItem, JurisEmbeddingWithSimilarity, SimilaritySearchResult, JurisFiltros,
  CDNDownloadType, DownloadProgressCallback, BatchCompleteCallback, CDNFileName, EstimatedSizes,
  BulkFile, BulkGeneratedModel, BulkError,
  AIGenContextItem, AIGenContext, AIGenState, AIGenAction, AnonymizationSettings,
  QuickPrompt, AIMessage, AIMessageContent, AITextContent, AIDocumentContent, AICallOptions, AIProvider, GeminiRequest, GeminiGenerationConfig,
  OpenAIMessage, OpenAIMessagePart, OpenAIReasoningConfig, OpenAIReasoningLevel,
  FactsComparisonSource, FactsComparisonResult,  // v1.36.12
  DoubleCheckSettings, DoubleCheckOperations, DoubleCheckResult, DoubleCheckCorrection,  // v1.36.50
  // MODAL PROPS (movido de App.tsx v1.35.79)
  ModelFormModalProps, ModelPreviewModalProps, RenameTopicModalProps, DeleteTopicModalProps, MergeTopicsModalProps, SplitTopicModalProps,
  NewTopicModalProps, DeleteModelModalProps, DeleteAllModelsModalProps, DeleteAllPrecedentesModalProps,
  ExportModalProps, JurisprudenciaModalProps, SimilarityWarningState, SimilarityWarningModalProps, ShareLibraryModalProps, AnalysisModalProps, DispositivoModalProps, BulkReviewModalProps, BulkUploadModalProps, SlashCommandMenuProps, LinkedProofsModalProps,
  LogoutConfirmModalProps, RestoreSessionModalProps, ClearProjectModalProps,
  AddProofTextModalProps, ProofAnalysisModalProps, DeleteProofModalProps,
  ConfirmBulkCancelModalProps, BulkDiscardConfirmModalProps, TextPreviewModalProps,
  ExtractModelConfirmModalProps, ExtractedModelPreviewModalProps, LinkProofModalProps,
  // COMPONENT PROPS (movido de App.tsx v1.35.79)
  FieldEditorProps, FieldEditorRef, GlobalEditorSectionProps,
  QuillEditorBaseProps, QuillModelEditorProps, QuillDecisionEditorProps, QuillMiniRelatorioEditorProps,
  DecisionEditorContainerProps, GlobalEditorModalProps, TopicCardProps, SortableTopicCardProps, ModelCardProps, ProofCardProps,
  SuggestionCardProps, ArtigoCardProps, JurisprudenciaCardProps, ChatBubbleProps,
  // UI/PANEL PROPS (movido de App.tsx v1.35.79)
  VirtualListProps, ProcessingModeSelectorProps, InsertDropdownProps,
  SpacingDropdownProps, FontSizeDropdownProps, ChatInputProps, ChatHistoryAreaProps,
  LockedTabOverlayProps, LegislacaoTabProps, JurisprudenciaTabProps,
  FullscreenModelPanelProps, ModelSearchPanelProps, AcceptSharePageProps,
  // AI ASSISTANT PROPS (movido de App.tsx v1.35.79)
  AIAssistantBaseLegacyProps, AIAssistantBaseProps, AIAssistantModalProps,
  AIAssistantGlobalModalProps, AIAssistantModelModalProps,
  // FUNCTION TYPES
  CallAIFunction,
  // SESSION/PROJECT TYPES (movido de App.tsx v1.35.79)
  AnalyzedDocuments, ExtractedTexts, DocumentProcessingModes, UploadedFile,
  SessionState, ProjectState, UploadPdfData, UploadPdfs, ImportedProject, ImportCallbacks, RestoreSessionCallbacks, ImportProjectCallbacks, ClearProjectCallbacks,
  // BASE COMPONENT PROPS (movido de App.tsx v1.35.91)
  BaseModalProps, AnonymizationNamesModalProps, ErrorBoundaryProps, ErrorBoundaryState,
  // LIBRARY TYPES
  PdfjsLib, PdfDocument, PdfPage, MammothLib, TesseractLib, TesseractWorker, TesseractScheduler
} from './types';

// v1.33.58: dnd-kit para drag and drop com suporte a wheel scroll
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS as DndCSS } from '@dnd-kit/utilities';

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
const LegalDecisionEditor = ({ onLogout, cloudSync, receivedModels, activeSharedLibraries, clearReceivedModels }: {
  onLogout: () => void;
  cloudSync: UseCloudSyncReturn;
  receivedModels: Model[] | null;
  activeSharedLibraries: Array<{ ownerId: string; ownerEmail: string }> | null;
  clearReceivedModels: () => void;
}) => {

  // 🎣 CUSTOM HOOKS
  // v1.37.38: toast, showToast, clearToast agora vêm do useUIStore via useModalManager
  const { modals, openModal, closeModal, closeAllModals, isAnyModalOpen, textPreview, setTextPreview, toast, showToast, clearToast } = useModalManager();
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
        localStorage.setItem('sentencify-models-count', String(mergedModels.length));
        console.log(`[Sync] Salvo ${mergedModels.length} modelos no IndexedDB`);
      }).catch(err => {
        console.error('[Sync] Erro ao salvar no IndexedDB:', err);
      });

      clearReceivedModels();
    }
  }, [receivedModels, activeSharedLibraries, clearReceivedModels, setLibraryModels, isLoadingModels, indexedDBAvailable, saveToIndexedDB]);
  // ↑ v1.35.4: Removido libraryModels das deps - usamos libraryModelsRef para evitar loop
  // ↑ v1.35.24: Adicionado activeSharedLibraries para filtrar owners revogados

  // 🤖 v1.19.0: Chat interativo do assistente IA (Editor Individual)
  const chatAssistant = useChatAssistant(aiIntegration);

  // 📜 v1.24: Versionamento de campos (Editor Individual)
  const fieldVersioning = useFieldVersioning();

  // ☁️ v1.35.40: Google Drive - Salvar/Carregar projetos
  const googleDrive = useGoogleDrive();
  const [driveFilesModalOpen, setDriveFilesModalOpen] = React.useState(false);
  const [driveFiles, setDriveFiles] = React.useState<DriveFile[]>([]);

  // 🪄 v1.35.69: Gerador de Modelo a partir de Exemplos (v1.35.77: +estiloRedacao)
  const [modelGeneratorModal, setModelGeneratorModal] = React.useState<ModelGeneratorModalState>({
    isOpen: false,
    targetField: null // 'modeloRelatorio' | 'modeloDispositivo' | 'modeloTopicoRelatorio' | 'estiloRedacao'
  });

  const openModelGenerator = React.useCallback((targetField: TargetField) => {
    setModelGeneratorModal({ isOpen: true, targetField });
  }, []);

  const closeModelGenerator = React.useCallback(() => {
    setModelGeneratorModal({ isOpen: false, targetField: null });
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
    setModelGeneratorModal({ isOpen: false, targetField: null });
  }, [modelGeneratorModal.targetField, aiIntegration.setAiSettings]);

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
  const { appTheme, isDarkMode, editorTheme, toggleAppTheme, toggleEditorTheme } = useThemeManagement();

  // 🧠 v1.37.41: Estados NER - extraído para useNERManagement (FASE 40)
  const {
    nerFilesStored, nerModelReady, nerInitializing, nerDownloadProgress,
    detectingNames, nerEnabled, nerIncludeOrg,
    setNerFilesStored, setNerModelReady, setNerInitializing, setNerDownloadProgress,
    setDetectingNames, setNerEnabled, setNerIncludeOrg
  } = useNERManagement();

  // 🔍 v1.37.43: Busca Semântica - extraído para useSemanticSearchManagement (FASE 42)
  const {
    searchFilesStored, searchModelReady, searchInitializing, searchDownloadProgress,
    searchEnabled,
    setSearchFilesStored, setSearchModelReady, setSearchInitializing, setSearchDownloadProgress,
    setSearchEnabled
  } = useSemanticSearchManagement();

  // v1.32.24: Modal de changelog
  const [showChangelogModal, setShowChangelogModal] = React.useState(false);

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
  const [autoSaveDirty, setAutoSaveDirty] = React.useState(false);
  const lastAutoSaveSnapshotRef = React.useRef<string | null>(null);
  const autoSaveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // v1.12.28: Ref para snapshot atualizado (evita stale closure no auto-save)
  const currentSessionSnapshotRef = React.useRef<SessionState | null>(null);

  // Helper: marcar sessão como dirty (needs save)
  const markSessionDirty = React.useCallback(() => {
    setAutoSaveDirty(true);
  }, []);

  // 🚀 OTIMIZAÇÃO v1.7 (FASE 1.3): Batch DOM updates para evitar múltiplos reflows
  // Antes: 3 innerHTML = 3 reflows (~300ms total)
  // Depois: 1 RAF batch = 1 reflow (~100ms)
  // v1.35.92: Tipo union para suportar refs diretos e Quill refs
  const batchDOMUpdates = React.useCallback((updates: Array<{ ref: React.RefObject<HTMLElement | QuillInstance | null>; content: string; property?: string }>) => {
    requestAnimationFrame(() => {
      updates.forEach(({ ref, content, property = 'innerHTML' }) => {
        if (!ref || !ref.current) return;

        try {
          // Suporta refs diretos ou Quill refs (com .root)
          const element = ('root' in ref.current && ref.current.root) ? ref.current.root : ref.current as HTMLElement;

          if (property === 'innerHTML') {
            element.innerHTML = content;
          } else if (property === 'innerText') {
            element.innerText = content;
          } else if (property === 'textContent') {
            element.textContent = content;
          }
        } catch (err) {
        }
      });
    });
  }, []);

  // 🔄 MULTI-TAB SYNC: Registrar callback (v1.7 BUGFIX) ───────────────────
  // Refs para evitar closure stale (sempre acessar versão mais recente)
  const indexedDBRef = React.useRef(indexedDB);
  const modelLibraryRef = React.useRef(modelLibrary);
  const featureFlagsRef = React.useRef(featureFlags);

  // Atualizar refs quando os objetos mudarem
  React.useEffect(() => {
    indexedDBRef.current = indexedDB;
    modelLibraryRef.current = modelLibrary;
    featureFlagsRef.current = featureFlags;
  }, [indexedDB, modelLibrary, featureFlags]);

  React.useEffect(() => {
    // Registrar callback para receber notificações de sync de outras tabs
    const handleSync = async ({ action, timestamp }: { action: string; timestamp: number }) => {

      // Usar refs para acessar versão sempre atualizada (evitar closure stale)
      const currentIndexedDB = indexedDBRef.current;
      const currentModelLibrary = modelLibraryRef.current;
      const currentFeatureFlags = featureFlagsRef.current;

      // Skip if IndexedDB feature flag is disabled
      if (!currentFeatureFlags.isEnabled('useIndexedDB')) {
        return;
      }

      // Skip if IndexedDB não está disponível
      if (!currentIndexedDB.isAvailable) {
        return;
      }

      try {
        // Recarregar modelos do IndexedDB (cache já foi invalidado pelo hook)
        const reloadedModels = await currentIndexedDB.loadModels();


        // Atualizar state React com modelos sincronizados
        currentModelLibrary.setModels(reloadedModels);

        // Atualizar ref para evitar save loop
        lastSavedModelsRef.current = JSON.stringify(reloadedModels);

      } catch (err) {
        currentModelLibrary.setPersistenceError(`Erro ao sincronizar com outra tab: ${(err as Error).message}`);
      }
    };

    // Registrar callback no hook useIndexedDB
    indexedDB.setSyncCallback(handleSync);


    // Cleanup: remover callback
    return () => {
      indexedDB.setSyncCallback(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ⚠️ Array vazio OK: handleSync usa refs (sempre atualizadas) ao invés de closure

  // Load Models no mount
  React.useEffect(() => {
    // Skip if already loaded
    if (hasLoadedModelsRef.current) {
      return;
    }

    // Skip if IndexedDB feature flag is disabled
    if (!featureFlags.isEnabled('useIndexedDB')) {
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
        } else if (isMounted) {
          hasLoadedModelsRef.current = true; // Marcar como carregado mesmo se vazio
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
  }, [indexedDB.isAvailable]); // Only re-run when IndexedDB becomes available

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

        // v1.34.6: Salvar contagem para sync comparar com servidor
        localStorage.setItem('sentencify-models-count', String(modelLibrary.models.length));

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
  const { activeTab, setActiveTab, goToTopics, goToEditor, goToModels } = useTabbedInterface();
  // 🔔 v1.37.38: toast e showToast extraídos para useUIStore (vem do useModalManager acima)
  const [error, setError] = useState<string | { type: string; message: string }>('');
  const [copySuccess, setCopySuccess] = useState(false);
  const copyTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  // v1.37.14: Estados savingModel, modelSaved, savingFromSimilarity movidos para useModelSave hook

  // v1.17.0: Estado para texto de nomes no modal de anonimização
  // NOTA: showAnonymizationModal, showTopicCurationModal e pendingCurationData agora vêm do useDocumentAnalysis (v1.36.81)
  const [anonymizationNamesText, setAnonymizationNamesText] = useState('');

  // v1.21.14: Sincronizar nomes do modal com aiSettings persistido
  useEffect(() => {
    const nomesUsuario = aiIntegration?.aiSettings?.anonymization?.nomesUsuario;
    if (Array.isArray(nomesUsuario) && nomesUsuario.length > 0) {
      setAnonymizationNamesText(nomesUsuario.join('\n'));
    }
  }, [aiIntegration?.aiSettings?.anonymization?.nomesUsuario]);

  // v1.37.27: slashMenu movido para useSlashMenu hook (instanciado após showToast)

  // v1.21.21: Estados para revisão crítica de sentença
  const [reviewScope, setReviewScope] = useState<'decisionOnly' | 'decisionWithDocs'>('decisionOnly');
  const [reviewResult, setReviewResult] = useState('');
  const [generatingReview, setGeneratingReview] = useState(false);
  const [reviewFromCache, setReviewFromCache] = useState(false); // v1.36.57: Indicar se veio do cache
  const sentenceReviewCache = useSentenceReviewCache(); // v1.36.57: Cache de revisão de sentença

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
    analyzing, analysisProgress, extractingText, showPasteArea, extractedTexts, showTextPreview,
    // v1.12.18: Modos de processamento por documento
    documentProcessingModes,
    // Documentos - Setters
    setPeticaoFiles, setContestacaoFiles, setComplementaryFiles,
    setPastedPeticaoTexts, setPastedContestacaoTexts, setPastedComplementaryTexts,
    setAnalyzedDocuments,
    setAnalyzing, setAnalysisProgress, setExtractingText, setShowPasteArea, setExtractedTexts, setShowTextPreview,
    // v1.12.18: Setters de modos de processamento
    setDocumentProcessingModes, setPeticaoMode, setContestacaoMode, setComplementarMode,
    // Documentos - Handlers
    handlePastedText, removePastedText, removePeticaoFile,
    handleUploadPeticao, handleUploadContestacao, handleUploadComplementary,
    // Documentos - Persistência (com alias para evitar conflito)
    serializeForPersistence: serializeDocuments,
    restoreFromPersistence: restoreDocuments,
    clearAll: clearDocuments
  } = documentManager;

  const {
    // Tópicos - Estados
    extractedTopics, selectedTopics,
    editingTopic, lastEditedTopicTitle, topicContextScope,
    savingTopic,
    topicToDelete, topicToRename, newTopicName, topicsToMerge, topicToSplit, splitNames, newTopicData,
    // Tópicos - Setters
    setExtractedTopics, setSelectedTopics,
    setEditingTopic, setLastEditedTopicTitle, setTopicContextScope,
    setSavingTopic,
    setTopicToDelete, setTopicToRename, setNewTopicName, setTopicsToMerge, setTopicToSplit, setSplitNames, setNewTopicData
    // ⚠️ NOTA: Handlers de tópicos (prepareDeleteTopic, confirmDeleteTopic, etc.)
    // permanecem no componente principal pois dependem de modals e lógica complexa
    // Não fazemos destructuring deles para evitar conflitos
  } = topicManager;

  // 🔄 v1.37.42: Hashes de detecção de mudanças - extraído para useChangeDetectionHashes (FASE 41)
  const { extractedTopicsHash, selectedTopicsHash, proofsHash } = useChangeDetectionHashes(
    extractedTopics,
    selectedTopics,
    proofManager
  );

  // ═══════════════════════════════════════════════════════════════════════════════
  // v1.37.6: useDragDropTopics - Hook extraído para drag and drop de tópicos
  // ═══════════════════════════════════════════════════════════════════════════════
  const dragDrop = useDragDropTopics({
    selectedTopics,
    setSelectedTopics,
    aiIntegration,
  });

  // Destructure para uso mais fácil
  const {
    draggedIndex, dragOverIndex, draggedComplementaryIndex, dragOverComplementaryIndex,
    setDraggedIndex, setDragOverIndex, setDraggedComplementaryIndex, setDragOverComplementaryIndex,
    specialTopicIds, customCollisionDetection,
    handleDndDragEnd, handleDragStart, handleDragEnd, handleDragOver, handleDragLeave, handleDrop,
    handleComplementaryDragStart, handleComplementaryDragEnd, handleComplementaryDragOver,
    handleComplementaryDragLeave, handleComplementaryDrop,
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
  const [partesProcesso, setPartesProcesso] = useState<PartesProcesso>({ reclamante: '', reclamadas: [] });

  // 📊 v1.36.73: Hook de geração de relatórios ────────────────────────────────
  const reportGeneration = useReportGeneration({
    aiIntegration,
    analyzedDocuments,
    partesProcesso,
  });

  const {
    generateMiniReport,
    generateMultipleMiniReports,
    generateMiniReportsBatch,
    generateRelatorioProcessual,
    isGeneratingReport,
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
  const [exportedText, setExportedText] = useState('');
  const [exportedHtml, setExportedHtml] = useState('');
    
  // 📋 ESTADO: Informações do Processo (v1.3.5.1)
  const [processoNumero, setProcessoNumero] = useState('');
  // Número do processo trabalhista (ex: ATOrd 0000313-98.2025.5.08.0110)

  // 🔧 ESTADOS: Utilitários
  const [domPurifyReady, setDomPurifyReady] = useState(false);
  const [quillReady, setQuillReady] = useState(false);
  const [quillError, setQuillError] = useState<Error | null>(null);
  const [quillRetryCount, setQuillRetryCount] = useState(0);

  // 🧠 v1.37.41: Estados NER movidos para useNERManagement (FASE 40)

  // 🔍 v1.37.43: Estados Busca Semântica (E5-base) movidos para useSemanticSearchManagement (FASE 42)
  // v1.35.74: semanticSearchEnabled, semanticThreshold, jurisSemanticEnabled, jurisSemanticThreshold
  // movidos para aiSettings (agora em aiIntegration.aiSettings.X)
  // v1.37.9: embeddingsCount, jurisEmbeddingsCount, embeddingsProgress, jurisEmbeddingsProgress,
  // embeddingsDownloadStatus, dataDownloadStatus, generatingModelEmbeddings, modelEmbeddingsProgress
  // movidos para useEmbeddingsManagement hook
  const jurisEmbeddingsFileInputRef = useRef<HTMLInputElement | null>(null);
  // v1.32.18: Jurisprudência via IA Local nos editores
  // v1.35.74: useLocalAIForJuris movido para aiSettings

  // v1.33.19: Toggle para busca semântica na busca manual de modelos (editores individual e global)
  // v1.33.20: Inicializa com modelSemanticEnabled (respeitando config IA)
  // v1.35.74: Agora usa aiIntegration.aiSettings.modelSemanticEnabled
  const [useSemanticManualSearch, setUseSemanticManualSearch] = useState(() => aiIntegration.aiSettings.modelSemanticEnabled);

  // v1.35.75: Feedback inline nos botões de teste de API Key
  const [claudeTestStatus, setClaudeTestStatus] = useState<'testing' | 'ok' | 'error' | null>(null); // null | 'testing' | 'ok' | 'error'
  const [geminiTestStatus, setGeminiTestStatus] = useState<'testing' | 'ok' | 'error' | null>(null);
  // v1.35.97: OpenAI e Grok test status
  const [openaiTestStatus, setOpenaiTestStatus] = useState<'testing' | 'ok' | 'error' | null>(null);
  const [grokTestStatus, setGrokTestStatus] = useState<'testing' | 'ok' | 'error' | null>(null);
  const [semanticManualSearchResults, setSemanticManualSearchResults] = useState<Model[] | null>(null);
  const [semanticManualSearching, setSemanticManualSearching] = useState(false);

  // 📜 v1.26.02: Hook de legislação para geração de embeddings
  const legislacao = useLegislacao();

  // 📚 v1.27.00: Hook de jurisprudência para acessar precedentes
  // v1.37.9: Movido de dentro da seção de embeddings para cá
  const jurisprudencia = useJurisprudencia();

  // 🎯 REFS
  const bulkFileInputRef = useRef<HTMLInputElement | null>(null);
  const bulkEditorRef = useRef<QuillInstance | null>(null); // v1.35.92: Tipar como QuillInstance
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

  useEffect(() => {
    // Verificar se já está carregado
    if (window.DOMPurify) {
      setDomPurifyReady(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/dompurify@3.0.6/dist/purify.min.js';
    script.async = true;
    script.onload = () => {
      setDomPurifyReady(true);
    };
    script.onerror = () => {
    };

    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

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

  // 📝 Quill.js Loader (FASE 4 - Rich Text Editor)
  // v1.37.20: injectQuillStyles e injectQuillLightStyles movidos para src/utils/quill-styles-injector.ts
  useEffect(() => {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 2000; // 2 segundos
    let styleDelayTimeout: ReturnType<typeof setTimeout> | null = null;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    let isMounted = true;

    // Verificar se já existe script carregando/carregado
    const existingScript = document.getElementById('quill-library-js');
    const existingCSS = document.getElementById('quill-theme-css');

    // Se Quill já está disponível e scripts existem, apenas inicializar estilos
    if (window.Quill && existingScript && existingCSS) {
      styleDelayTimeout = setTimeout(() => {
        if (isMounted) {
          injectQuillStyles();
          injectQuillLightStyles();
          setQuillReady(true);
          setQuillError(null);
        }
      }, 100);
      return () => { isMounted = false; if (styleDelayTimeout) clearTimeout(styleDelayTimeout); };
    }

    // Remover scripts antigos apenas se não houver Quill ativo
    if (!window.Quill) {
      if (existingScript) existingScript.remove();
      if (existingCSS) existingCSS.remove();
    }

    // Carregar CSS primeiro
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/quill@2.0.2/dist/quill.snow.css';
    link.id = 'quill-theme-css';

    link.onerror = () => {
      if (isMounted) setQuillError(new Error('Falha ao carregar tema do editor'));
    };

    document.head.appendChild(link);

    // Carregar JavaScript
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/quill@2.0.2/dist/quill.js';
    script.async = true;
    script.id = 'quill-library-js';

    script.onload = () => {
      if (!isMounted) return;
      if (window.Quill) {
        styleDelayTimeout = setTimeout(() => {
          if (isMounted) {
            injectQuillStyles();
            injectQuillLightStyles();
            setQuillReady(true);
            setQuillError(null);
          }
        }, 100);
      } else {
        setQuillError(new Error('Biblioteca carregada mas não disponível'));
      }
    };

    script.onerror = () => {
      if (!isMounted) return;
      if (quillRetryCount < MAX_RETRIES) {
        retryTimeout = setTimeout(() => {
          if (isMounted) setQuillRetryCount(prev => prev + 1);
        }, RETRY_DELAY);
      } else {
        setQuillError(new Error(`Falha ao carregar editor após ${MAX_RETRIES} tentativas. Verifique sua conexão.`));
      }
    };

    document.head.appendChild(script);

    // Cleanup
    return () => {
      isMounted = false;
      if (styleDelayTimeout) clearTimeout(styleDelayTimeout);
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, [quillRetryCount]);

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

  // 🚀 OTIMIZAÇÃO v1.4.1: Agrupar useEffects relacionados (keyboard + scroll management)
  useEffect(() => {
    // Atalho Ctrl+S para salvar
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (editingTopic) {
          saveTopicEditWithoutClosing();
        } else if (modals.modelForm) {
          saveModelWithoutClosing();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [editingTopic, modals.modelForm]);

  // ESC para fechar modal de configurações
  // v1.36.46: Não fechar se ModelGeneratorModal está aberto (respeitar hierarquia)
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && modals.settings && !modelGeneratorModal.isOpen) {
        closeModal('settings');
      }
    };

    if (modals.settings) {
      window.addEventListener('keydown', handleEscape);
    }

    return () => window.removeEventListener('keydown', handleEscape);
  }, [modals.settings, closeModal, modelGeneratorModal.isOpen]);

  // v1.35.64: Bloquear scroll do body quando modal de configurações aberto
  React.useEffect(() => {
    if (modals.settings) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [modals.settings]);

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
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
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
            indexedDB.saveModels(modelLibrary.models).catch(err => {
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

  // Persistência e Sessão
  const checkSavedSession = () => {
    try {
      const saved = localStorage.getItem('sentencifySession');
      if (saved) {
        const session = JSON.parse(saved);
        storage.setSessionLastSaved(session.savedAt);
        openModal('restoreSession');
      }
    } catch (err) {
    }
  };


  // 🔒 Sanitização com DOMPurify (memoizada)
  const sanitizeHTML = React.useCallback((dirty: string | null | undefined) => {
    // Se DOMPurify não estiver carregado ainda, retorna string vazia para segurança
    if (!domPurifyReady || !window.DOMPurify) {
      return ''; // Mais seguro retornar vazio do que conteúdo não sanitizado
    }

    // Configuração de sanitização para permitir apenas tags seguras de formatação
    const cleanHTML = window.DOMPurify.sanitize(dirty || '', {
      ALLOWED_TAGS: [
        'p', 'br', 'div', 'span',           // Estrutura
        'strong', 'b', 'em', 'i', 'u',      // Formatação básica
        'ul', 'ol', 'li',                    // Listas
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6', // Cabeçalhos
        'blockquote'                         // v1.36.6: Citações
      ],
      ALLOWED_ATTR: [
        'class', 'id', 'style',              // Atributos permitidos (limitados)
        'data-list'                          // v1.36.6: Tipo de lista (bullet/ordered)
      ],
      ALLOWED_STYLES: {
        '*': {
          'font-weight': [/^bold$/],
          'font-style': [/^italic$/],
          'text-decoration': [/^underline$/],
          'text-align': [/^(left|center|right|justify)$/],  // v1.36.6: Alinhamento
          'margin-left': [/^\d+(\.\d+)?(em|px|rem)$/],      // v1.36.6: Indent
          'padding-left': [/^\d+(\.\d+)?(em|px|rem)$/],     // v1.36.6: Blockquote
          'border-left': [/.*/]                              // v1.36.6: Blockquote
        }
      },
      KEEP_CONTENT: true,                     // Preserva conteúdo de tags removidas
      RETURN_TRUSTED_TYPE: false
    });

    return cleanHTML;
  }, [domPurifyReady]); // ✅ Estável - só muda quando DOMPurify carrega

  // 📝 Utility functions para Quill.js (movidas para escopo global)

  // Função de teste de sanitização (disponível no console via window.testSanitization)
  const testSanitization = (testHTML: string) => {
    const sanitized = sanitizeHTML(testHTML);
    return sanitized;
  };

  // Expor função de teste no console (desenvolvimento)
  if (typeof window !== 'undefined') {
    window.testSanitization = testSanitization;
    window.checkDOMPurify = () => ({
      version: window.DOMPurify?.version || 'Desconhecida',
      isSupported: domPurifyReady && !!window.DOMPurify
    });
  }

  // 🧠 v1.25: NER HANDLERS - IA Offline para detecção de nomes

  // Ref para garantir inicialização única (proteção contra StrictMode/re-renders)
  const nerInitStartedRef = useRef(false);

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

  // v1.32.00: Handlers simplificados (modelos são baixados automaticamente)
  const initNerModel = async () => {
    if (nerInitializing || nerModelReady) return;
    setNerInitializing(true);
    setNerDownloadProgress(0);

    // Listener para progresso do download
    const unsubscribe = AIModelService.subscribe((status, progress) => {
      if (progress.ner > 0) {
        setNerDownloadProgress(Math.round(progress.ner));
      }
    });

    try {
      await AIModelService.init('ner');
      setNerModelReady(true);
      showToast('Modelo NER pronto!', 'success');
    } catch (err) {
      showToast('Erro ao inicializar NER: ' + (err as Error).message, 'error');
    } finally {
      setNerInitializing(false);
      setNerDownloadProgress(0);
      unsubscribe();
    }
  };

  // 🔍 v1.32.00: HANDLERS: Busca Semântica (E5-base) - Simplificado
  const searchInitStartedRef = useRef(false);

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

  // v1.32.00: Inicializar modelo de busca com progresso
  const initSearchModel = async () => {
    if (searchInitializing || searchModelReady) return;
    setSearchInitializing(true);
    setSearchDownloadProgress(0);

    // Listener para progresso do download
    const unsubscribe = AIModelService.subscribe((status, progress) => {
      if (progress.search > 0) {
        setSearchDownloadProgress(Math.round(progress.search));
      }
    });

    try {
      await AIModelService.init('search');
      setSearchModelReady(true);
      showToast('Modelo de busca pronto!', 'success');
    } catch (err) {
      showToast('Erro ao inicializar: ' + (err as Error).message, 'error');
    } finally {
      setSearchInitializing(false);
      setSearchDownloadProgress(0);
      unsubscribe();
    }
  };

  // v1.32.00: Handler MASTER - controla carregamento/descarregamento do modelo E5
  const handleSearchToggle = async (newEnabled: boolean) => {
    setSearchEnabled(newEnabled);
    localStorage.setItem('searchEnabled', JSON.stringify(newEnabled));

    if (!newEnabled) {
      // Desligando: descarregar modelo E5 da memória
      if (AIModelService.isReady('search')) {
        await AIModelService.unload('search');
        setSearchModelReady(false);
        console.log('[SEARCH] Modelo E5 descarregado');
      }
    }
  };

  // v1.32.17: NER agora é carregado sob demanda (ao clicar "Detectar Nomes")
  // Removido auto-init para economizar ~2GB de RAM
  // O modelo será carregado automaticamente em extractEntities() quando necessário

  // v1.32.06: Auto-inicializar Search ao carregar página se estava ativado
  React.useEffect(() => {
    if (searchEnabled && !searchModelReady && !searchInitializing) {
      if (import.meta.env.DEV) console.log('[SEARCH] Auto-inicializando modelo (estava ativado)...');
      // Delay para não bloquear render inicial
      const timer = setTimeout(() => {
        initSearchModel();
      }, 1000); // Delay maior para não competir com NER
      return () => clearTimeout(timer);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // v1.28.00: Toggle individual de legislação (não afeta modelo E5)
  // v1.28.01: Ao habilitar, também seta modo semântico como padrão na aba
  // v1.35.74: Agora usa aiIntegration.setAiSettings (persiste automaticamente)
  const handleLegislacaoToggle = (newEnabled: boolean) => {
    aiIntegration.setAiSettings(prev => ({ ...prev, semanticSearchEnabled: newEnabled }));
    if (newEnabled) localStorage.setItem('legislacaoSemanticMode', 'true');
  };

  // v1.28.01: Handler para toggle de Jurisprudência
  // v1.35.74: Agora usa aiIntegration.setAiSettings
  const handleJurisToggle = (newEnabled: boolean) => {
    aiIntegration.setAiSettings(prev => ({ ...prev, jurisSemanticEnabled: newEnabled }));
    if (newEnabled) localStorage.setItem('jurisSemanticMode', 'true');
  };

  // v1.28.01: Handler para toggle de Modelos
  // v1.35.74: Agora usa aiIntegration.setAiSettings
  const handleModelToggle = (newEnabled: boolean) => {
    aiIntegration.setAiSettings(prev => ({ ...prev, modelSemanticEnabled: newEnabled }));
    if (newEnabled) localStorage.setItem('modelSemanticMode', 'true');
  };

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
  // ═══════════════════════════════════════════════════════════════════════════════
  const {
    exportAiSettings,
    importAiSettings,
    exportModels,
    importModels,
    checkDuplicate
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
    executeSaveModel,
    executeSaveAsNew,
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
    generateModelsFromFileContent,
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

  const {
    embeddingsCount,
    jurisEmbeddingsCount,
    embeddingsProgress,
    jurisEmbeddingsProgress,
    importingEmbeddings,
    importingJurisEmbeddings,
    generatingModelEmbeddings,
    modelEmbeddingsProgress,
    showDataDownloadModal,
    setShowDataDownloadModal,
    dataDownloadStatus,
    setDataDownloadStatus,
    showEmbeddingsDownloadModal,
    setShowEmbeddingsDownloadModal,
    embeddingsDownloadStatus,
    embeddingsFileInputRef,
    handleImportEmbeddings,
    handleImportJurisEmbeddings,
    handleStartDataDownload,
    handleStartEmbeddingsDownload,
    handleDismissDataPrompt,
    handleDismissEmbeddingsPrompt,
    clearEmbeddings,
    clearJurisEmbeddings,
    clearModelEmbeddings,
    generateModelEmbeddings,
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

  // 🔧 HELPER FUNCTIONS - v1.3.5.1

  // Verifica se um tópico está decidido
  const isTopicDecidido = React.useCallback((topic: Topic) => {
    if (!topic) return false;

    // DISPOSITIVO usa editedContent
    if (isDispositivo(topic)) {
      return topic.editedContent && topic.editedContent.trim() !== '';
    }

    if (isRelatorio(topic)) {
      return (topic.editedRelatorio && topic.editedRelatorio.trim() !== '') ||
             (topic.relatorio && topic.relatorio.trim() !== '');
    }

    // Tópicos normais precisam de conteúdo E resultado selecionado
    const temConteudo = topic.editedFundamentacao && topic.editedFundamentacao.trim() !== '';
    const temResultado = topic.resultado && topic.resultado.trim() !== '';

    return temConteudo && temResultado;
  }, []);

  // 🚀 OTIMIZAÇÕES DE PERFORMANCE - v1.2.7

  // 📊 Contadores memoizados para evitar recálculos a cada render
  const topicsDecididos = React.useMemo(() => {
    return selectedTopics.filter(t =>
      isTopicDecidido(t) &&
      t.title.toUpperCase() !== 'RELATÓRIO' &&
      t.title.toUpperCase() !== 'DISPOSITIVO'
    ).length;
  }, [selectedTopics, isTopicDecidido]);

  const topicsPendentes = React.useMemo(() => {
    return selectedTopics.filter(t =>
      !isTopicDecidido(t) &&
      t.title.toUpperCase() !== 'RELATÓRIO' &&
      t.title.toUpperCase() !== 'DISPOSITIVO'
    ).length;
  }, [selectedTopics, isTopicDecidido]);

  const topicsSemDecisao = React.useMemo(() => {
    return selectedTopics.filter(t => !isTopicDecidido(t));
  }, [selectedTopics, isTopicDecidido]);

  const topicsSemResultado = React.useMemo(() => {
    return selectedTopics.filter(t =>
      t.title.toUpperCase() !== 'RELATÓRIO' &&
      t.title.toUpperCase() !== 'DISPOSITIVO' &&
      !t.resultado
    );
  }, [selectedTopics]);

  const canGenerateDispositivo = React.useMemo(() => {
    // Precisa ter pelo menos 1 tópico selecionado
    if (selectedTopics.length === 0) {
      return { enabled: false, reason: 'Nenhum tópico selecionado' };
    }

    // Filtrar tópicos relevantes (exceto RELATÓRIO e DISPOSITIVO)
    const topicsRelevantes = selectedTopics.filter(t =>
      t.title.toUpperCase() !== 'RELATÓRIO' &&
      t.title.toUpperCase() !== 'DISPOSITIVO'
    );

    if (topicsRelevantes.length === 0) {
      return { enabled: false, reason: 'Nenhum tópico de mérito/preliminar selecionado' };
    }

    // Verificar tópicos sem conteúdo (fundamentação não escrita)
    const semConteudo = topicsRelevantes.filter(t =>
      !t.editedFundamentacao || t.editedFundamentacao.trim() === ''
    );

    // Verificar tópicos com conteúdo mas sem resultado selecionado
    const semResultado = topicsRelevantes.filter(t =>
      t.editedFundamentacao && t.editedFundamentacao.trim() !== '' &&
      (!t.resultado || t.resultado.trim() === '')
    );

    const totalPendentes = semConteudo.length + semResultado.length;

    if (totalPendentes > 0) {
      // Construir mensagem detalhada
      let detalhes = [];

      if (semConteudo.length > 0) {
        const primeiros = semConteudo.slice(0, 3).map(t => t.title);
        const resto = semConteudo.length > 3 ? ` e mais ${semConteudo.length - 3}` : '';
        detalhes.push(`${semConteudo.length} sem conteúdo: ${primeiros.join(', ')}${resto}`);
      }

      if (semResultado.length > 0) {
        const primeiros = semResultado.slice(0, 3).map(t => t.title);
        const resto = semResultado.length > 3 ? ` e mais ${semResultado.length - 3}` : '';
        detalhes.push(`${semResultado.length} sem resultado: ${primeiros.join(', ')}${resto}`);
      }

      return {
        enabled: false,
        reason: `${totalPendentes} tópico${totalPendentes > 1 ? 's' : ''} pendente${totalPendentes > 1 ? 's' : ''} (${detalhes.join(' | ')})`
      };
    }

    return { enabled: true, reason: '' };
  }, [selectedTopics]);

  // v1.14.5: Excluir DISPOSITIVO para evitar ruído do conteúdo antigo
  const topicsParaDispositivo = React.useMemo(() => {
    return selectedTopics.filter(topic =>
      topic.title.toUpperCase() !== 'RELATÓRIO' &&
      topic.title.toUpperCase() !== 'DISPOSITIVO' &&
      topic.resultado !== 'SEM RESULTADO'
    );
  }, [selectedTopics]);

  const selectedTopicTitles = React.useMemo(() =>
    selectedTopics.map(t => t.title).join('|'),
    [selectedTopics.map(t => t.title).join('|')]
  );

  // v1.19.2: Normalizar comparação case-insensitive para evitar duplicatas
  const unselectedTopics = React.useMemo(() => {
    return extractedTopics.filter(topic =>
      !selectedTopics.find(st =>
        (st.title || '').toUpperCase().trim() === (topic.title || '').toUpperCase().trim()
      )
    );
  }, [extractedTopics, selectedTopicTitles]);

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

  // 🎯 v1.4.6.3: OPT-06 - Handlers Memoizados para Editor de Decisões
  // Estes handlers são passados como props para DecisionEditorContainer.
  // Memoizá-los evita quebrar React.memo e recalcular useMemo internos.

  const handleFundamentacaoChange = React.useCallback((html: string) => {
    setEditingTopic(prev => {
      if (!prev) return prev;
      return { ...prev, editedFundamentacao: html };
    });
  }, []);

  const handleRelatorioChange = React.useCallback((html: string) => {
    setEditingTopic(prev => {
      if (!prev) return prev;
      return { ...prev, editedRelatorio: html };
    });
  }, []);

  const handleCategoryChange = React.useCallback((newCategory: string) => {
    setEditingTopic(prev => {
      if (!prev) return prev;
      return { ...prev, category: newCategory as TopicCategory };
    });

    // Atualiza selectedTopics
    setSelectedTopics(prevSelected => {
      const selectedIndex = prevSelected.findIndex((t: Topic) => t.title === editingTopic?.title);
      if (selectedIndex === -1) return prevSelected;

      const newSelected = [...prevSelected];
      newSelected[selectedIndex] = { ...newSelected[selectedIndex], category: newCategory as TopicCategory };
      return newSelected;
    });

    // Atualiza extractedTopics
    setExtractedTopics(prevExtracted => {
      const extractedIndex = prevExtracted.findIndex((t: Topic) => t.title === editingTopic?.title);
      if (extractedIndex === -1) return prevExtracted;

      const newExtracted = [...prevExtracted];
      newExtracted[extractedIndex] = { ...newExtracted[extractedIndex], category: newCategory as TopicCategory };
      return newExtracted;
    });
  }, [editingTopic?.title]);

  // 🎨 v1.4.7: Helper Centralizado para Configuração de Editores por Tipo
  // Este helper retorna configuração específica para cada tipo de tópico,
  // permitindo especialização de editores sem acoplar componentes filhos.

  const getTopicEditorConfig = React.useCallback((topicTitle: string) => {
    switch(topicTitle?.toUpperCase()) {
      case 'RELATÓRIO':
        return {
          showCategory: false,
          showMiniRelatorio: true,
          showDecisionEditor: false,
          relatorioConfig: {
            label: '📄 Relatório:',
            minHeight: 'min-h-48',
            showRegenerateSection: true
          },
          editorConfig: {}
        };

      case 'DISPOSITIVO':
        return {
          showCategory: false,
          showMiniRelatorio: false,
          showDecisionEditor: true,
          relatorioConfig: {},
          editorConfig: {
            label: '📋 Dispositivo:',
            placeholder: 'Descreva o resultado da decisão (PROCEDENTE, IMPROCEDENTE, etc)...',
            showRegenerateSection: true
          }
        };

      default:
        // Tópicos normais (PRELIMINAR, MÉRITO, etc)
        return {
          showCategory: true,
          showMiniRelatorio: true,
          showDecisionEditor: true,
          relatorioConfig: {},
          editorConfig: {}
        };
    }
  }, []);

  // 📚 FUNÇÕES: Gerenciamento de Modelos
  // Hook useModelLibrary já gerencia persistência via 'sentencify-models'
  // v1.37.8: generateKeywordsWithAI e generateTitleWithAI movidos para useModelGeneration hook
  // v1.37.14: executeSaveModel, saveModel, saveModelWithoutClosing movidos para useModelSave hook

  // Salva edições rápidas de um modelo
  // v1.27.02: Regenerar embedding se IA local estiver ativa
  const saveQuickEdit = async (editorRef: React.RefObject<{ root?: HTMLElement } | null>) => {
    if (!modelPreview.previewingModel) {
      showToast('Erro: nenhum modelo selecionado', 'error');
      return;
    }

    // Capturar conteúdo do editor Quill
    const newContent = editorRef.current?.root
      ? sanitizeHTML(editorRef.current.root.innerHTML)
      : modelPreview.editedContent;

    if (!newContent || !newContent.trim()) {
      showToast('Conteúdo não pode estar vazio', 'error');
      return;
    }

    try {
      const modelId = modelPreview.previewingModel.id;
      if (!modelLibrary.models.some(m => m.id === modelId)) {
        showToast('Modelo não encontrado na biblioteca', 'error');
        return;
      }

      const updatedModel = {
        ...modelPreview.previewingModel,
        content: newContent,
        updatedAt: new Date().toISOString()
      };

      // v1.27.02: Regenerar embedding se IA local estiver ativa
      if (aiIntegration.aiSettings.modelSemanticEnabled && searchModelReady) {
        await new Promise(resolve => setTimeout(resolve, 50));
        try {
          const stripHTML = (html: string) => {
            const div = document.createElement('div');
            div.innerHTML = html || '';
            return div.textContent || div.innerText || '';
          };
          const text = [updatedModel.title, updatedModel.keywords, stripHTML(updatedModel.content).slice(0, 2000)].filter(Boolean).join(' ');
          updatedModel.embedding = await AIModelService.getEmbedding(text, 'passage');
        } catch (err) {
          console.warn('[MODEL-EMBED] Erro ao regenerar embedding:', err);
        }
      } else if (updatedModel.embedding) {
        delete updatedModel.embedding;
      }

      modelLibrary.setModels(modelLibrary.models.map(m => m.id === modelId ? updatedModel : m));
      // v1.34.0: Rastrear update para sync
      if (cloudSync?.trackChange) cloudSync.trackChange('update', updatedModel);
      modelLibrary.setHasUnsavedChanges(true);
      TFIDFSimilarity.invalidate();
      apiCache.invalidate('suggestions_');

      // Sincronizar sugestões se existirem (evita mostrar conteúdo antigo ao clicar "Visualizar" novamente)
      if (modelLibrary.suggestions?.length > 0) {
        modelLibrary.setSuggestions(
          modelLibrary.suggestions.map(s => s.id === modelId ? updatedModel : s)
        );
      }

      // v1.19.2: Notificar listeners (ex: GlobalEditorModal) sobre atualização do modelo
      if (modelPreview.onModelUpdatedRef?.current) {
        modelPreview.onModelUpdatedRef.current(updatedModel);
      }

      // Atualizar o modelo no preview para refletir mudanças
      modelPreview.openPreview(updatedModel);
      modelPreview.cancelEditing();

      showToast('Modelo salvo com sucesso!', 'success');
    } catch (err) {
      showToast('Erro ao salvar modelo: ' + (err as Error).message, 'error');
    }
  };

  // v1.15.3: Salva como novo modelo (a partir do preview editado)
  // v1.27.02: Gera embedding automaticamente se IA local estiver ativa
  const confirmSaveAsNew = async () => {
    const data = modelPreview.saveAsNewData;
    if (!data) {
      showToast('Erro: nenhum modelo para salvar', 'error');
      return;
    }

    const { title, keywords, category, content } = data;

    if (!title?.trim()) {
      showToast('Título é obrigatório', 'error');
      return;
    }

    if (!content?.trim()) {
      showToast('Conteúdo não pode estar vazio', 'error');
      return;
    }

    const modelId = generateModelId();
    const modelData: Model = {
      id: modelId,
      title: title.trim(),
      content: sanitizeHTML(content),
      keywords: keywords?.trim() || '',
      category: category || 'Mérito',
      createdAt: new Date().toISOString()
    };

    // Verificar similaridade com TF-IDF
    const simResult = TFIDFSimilarity.findSimilar(modelData, modelLibrary.models, 0.80);
    if (simResult.hasSimilar) {
      modelLibrary.setSimilarityWarning({
        newModel: modelData,
        similarModel: simResult.similarModel,
        similarity: simResult.similarity,
        context: 'saveAsNew'
      } as SimilarityWarningState);
      return;
    }

    // v1.27.02: Gerar embedding se IA local estiver ativa
    if (aiIntegration.aiSettings.modelSemanticEnabled && searchModelReady) {
      await new Promise(resolve => setTimeout(resolve, 50));
      try {
        const stripHTML = (html: string) => {
          const div = document.createElement('div');
          div.innerHTML = html || '';
          return div.textContent || div.innerText || '';
        };
        const text = [modelData.title, modelData.keywords, stripHTML(modelData.content).slice(0, 2000)].filter(Boolean).join(' ');
        modelData.embedding = await AIModelService.getEmbedding(text, 'passage');
      } catch (err) {
        console.warn('[MODEL-EMBED] Erro ao gerar embedding:', err);
      }
    }

    // Salvar novo modelo
    modelLibrary.setModels(prev => [...prev, modelData]);
    // v1.34.0: Rastrear create para sync
    if (cloudSync?.trackChange) cloudSync.trackChange('create', modelData);
    modelLibrary.setHasUnsavedChanges(true);
    TFIDFSimilarity.invalidate();
    apiCache.invalidate('suggestions_');

    showToast('Novo modelo criado com sucesso!', 'success');
    modelPreview.closeSaveAsNew();
    modelPreview.closePreview();
  };

  // v1.37.14: executeSaveAsNew movido para useModelSave hook

  const startEditingModel = (model: Model) => {
    modelLibrary.setEditingModel(model);
    modelLibrary.setNewModel({
      title: model.title,
      content: model.content,
      keywords: typeof model.keywords === 'string' ? model.keywords : (model.keywords || []).join(', '),
      category: model.category || ''
    });
    openModal('modelForm');
    
    // Scroll suave para o formulário de edição
    setTimeout(() => {
      if (modelFormRef.current) {
        modelFormRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    }, 100);

    setTimeout(() => {
      if (modelEditorRef.current?.root) {
        modelEditorRef.current.root.innerHTML = sanitizeHTML(model.content);
      }
    }, 200);
  };

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

  const regenerateRelatorio = async (topicTitle: string, topicContext: string) => {
    aiIntegration.setRegenerating(true);
    setAnalysisProgress(`🔄 Regenerando relatório para "${topicTitle}"...`);
    try {
      const result = await generateMiniReport({ title: topicTitle, context: topicContext });
      return result;
    } catch (err) {
      setError('Erro ao regerar mini-relatório: ' + (err as Error).message);
      return null;
    } finally {
      aiIntegration.setRegenerating(false);
    }
  };

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

  // ✏️ FUNÇÕES: Editor de Texto

  const applyFormat = (command: string, value: string | null = null) => {
    document.execCommand(command, false, value ?? undefined);
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  const applyModelFormat = (command: string, value: string | null = null) => {
    document.execCommand(command, false, value ?? undefined);
    if (modelEditorRef.current) {
      modelEditorRef.current.focus();
    }
  };

  // v1.37.23: htmlToPlainText, htmlToFormattedText, plainTextToHtml, cleanHtmlForExport
  // movidos para src/utils/html-conversion.ts

  const confirmDeleteModel = (model: Model) => {
    modelLibrary.setModelToDelete(model);
    openModal('deleteModel');
  };

  const executeDeleteModel = async () => {
    if (!modelLibrary.modelToDelete) return;

    try {
      const modelId = modelLibrary.modelToDelete.id;
      const modelToDelete = modelLibrary.modelToDelete;
      modelLibrary.setModels(modelLibrary.models.filter(m => m.id !== modelId));
      // v1.34.0: Rastrear delete para sync
      if (cloudSync?.trackChange) cloudSync.trackChange('delete', { ...modelToDelete, updatedAt: new Date().toISOString() });
      modelLibrary.setHasUnsavedChanges(true);
      // Remover das sugestões também
      if (modelLibrary.suggestions?.length > 0) {
        modelLibrary.setSuggestions(modelLibrary.suggestions.filter(m => m.id !== modelId));
      }
      closeModal('deleteModel');
      modelLibrary.setModelToDelete(null);
    } catch (err) {
      setError('Erro ao excluir modelo: ' + (err as Error).message);
    }
  };

  const deleteAllModels = async () => {
    if (modelLibrary.deleteAllConfirmText !== 'EXCLUIR') {
      setError('Digite "EXCLUIR" para confirmar');
      return;
    }

    try {
      // v1.35.2: Rastrear cada modelo como delete para sync com servidor
      const modelsToDelete = [...modelLibrary.models];
      const now = new Date().toISOString();

      for (const model of modelsToDelete) {
        if (cloudSync?.trackChange) {
          cloudSync.trackChange('delete', { ...model, updatedAt: now });
        }
      }

      modelLibrary.setModels([]);
      modelLibrary.setHasUnsavedChanges(true);
      closeModal('deleteAllModels');
      modelLibrary.setDeleteAllConfirmText('');
    } catch (err) {
      setError('Erro ao excluir todos os modelos: ' + (err as Error).message);
    }
  };

  // v1.27.02: Gera embedding automaticamente se IA local estiver ativa
  // v1.33.7: Feedback visual ao duplicar modelo
  const duplicateModel = async (model: Model) => {
    try {
      showToast('⏳ Duplicando modelo...', 'info');
      await new Promise(resolve => setTimeout(resolve, 50)); // yield para UI

      const modelId = generateModelId();
      const duplicatedModel: Model = {
        ...model,
        id: modelId,
        title: `${model.title} (Cópia)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        embedding: undefined, // Limpar para regenerar com novo título
        // v1.35.22: Cópia é modelo próprio, não compartilhado
        isShared: false,
        ownerId: undefined,
        ownerEmail: undefined,
        sharedPermission: undefined,
      };

      // v1.27.02: Gerar novo embedding se IA local estiver ativa
      if (aiIntegration.aiSettings.modelSemanticEnabled && searchModelReady) {
        await new Promise(resolve => setTimeout(resolve, 50));
        try {
          const stripHTML = (html: string) => {
            const div = document.createElement('div');
            div.innerHTML = html || '';
            return div.textContent || div.innerText || '';
          };
          const text = [duplicatedModel.title, duplicatedModel.keywords, stripHTML(duplicatedModel.content).slice(0, 2000)].filter(Boolean).join(' ');
          duplicatedModel.embedding = await AIModelService.getEmbedding(text, 'passage');
        } catch (err) {
          console.warn('[MODEL-EMBED] Erro ao gerar embedding:', err);
        }
      }

      modelLibrary.setModels(prev => [...prev, duplicatedModel]);
      // v1.34.0: Rastrear create para sync (duplicação cria novo modelo)
      if (cloudSync?.trackChange) cloudSync.trackChange('create', duplicatedModel);
      modelLibrary.setHasUnsavedChanges(true);

      showToast('✅ Modelo duplicado com sucesso!', 'success');
    } catch (err) {
      setError('Erro ao duplicar modelo: ' + (err as Error).message);
    }
  };

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
    analyzing: documentAnalyzing,
    analysisProgress: documentAnalysisProgress,
    showAnonymizationModal,
    showTopicCurationModal,
    pendingCurationData,
    handleAnalyzeDocuments,
    handleAnonymizationConfirm,
    handleCurationConfirm,
    handleCurationCancel,
    setShowAnonymizationModal,
    setShowTopicCurationModal,
    setAnalyzing: setDocumentAnalyzing,
    setAnalysisProgress: setDocumentAnalysisProgress,
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

  // v1.19.2: Normalizar comparações case-insensitive
  const toggleTopicSelection = (topic: Topic) => {
    const topicTitleUpper = (topic.title || '').toUpperCase().trim();
    const exists = selectedTopics.find(t => (t.title || '').toUpperCase().trim() === topicTitleUpper);
    if (exists) {
      // Remover tópico se já está selecionado
      setSelectedTopics(selectedTopics.filter(t => (t.title || '').toUpperCase().trim() !== topicTitleUpper));
    } else {
      // Adicionar tópico
      const newTopic = { ...topic, order: selectedTopics.length };
      
      // Se for RELATÓRIO, adicionar no início
      if (isRelatorio(topic)) {
        setSelectedTopics([newTopic, ...selectedTopics]);
        return;
      }

      // Se for DISPOSITIVO, adicionar no final
      if (isDispositivo(topic)) {
        setSelectedTopics([...selectedTopics, newTopic]);
        return;
      }

      // Para qualquer outro tópico, inserir antes do DISPOSITIVO
      const dispositivoIndex = selectedTopics.findIndex((t: Topic) => isDispositivo(t));
      
      if (dispositivoIndex !== -1) {
        // DISPOSITIVO existe - inserir antes dele
        const newTopics = [...selectedTopics];
        newTopics.splice(dispositivoIndex, 0, newTopic);
        setSelectedTopics(newTopics);
      } else {
        // DISPOSITIVO não existe - adicionar no final
        setSelectedTopics([...selectedTopics, newTopic]);
      }
    }
  };

  const deleteTopic = (topicToDelete: Topic) => {
    setTopicToDelete(topicToDelete);
    openModal('deleteTopic');
  };

  const confirmDeleteTopic = () => {
    if (topicToDelete) {
      // Remove dos tópicos extraídos
      setExtractedTopics(extractedTopics.filter(t => t.title !== topicToDelete.title));
      // Remove dos tópicos selecionados caso esteja lá
      setSelectedTopics(selectedTopics.filter(t => t.title !== topicToDelete.title));
      // Remove dos tópicos para mesclar caso esteja lá
      setTopicsToMerge(topicsToMerge.filter((t: Topic) => t.title !== topicToDelete.title));
    }
    closeModal('deleteTopic');
    setTopicToDelete(null);
  };

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
  const STOPWORDS = new Set([
    'de', 'da', 'do', 'dos', 'das', 'para', 'com', 'sem', 'por', 'pelo', 'pela',
    'em', 'no', 'na', 'nos', 'nas', 'ao', 'aos', 'à', 'às', 'um', 'uma', 'uns', 'umas',
    'o', 'a', 'os', 'as', 'e', 'ou', 'mas', 'que', 'qual', 'quando', 'onde', 'como'
  ]);

  // Sistema de pontuação local para filtrar candidatos
  const scoreModel = (model: Model, topicTitle: string, topicCategory: string, topicRelatorio: string) => {
    let score = 0;

    const titleLower = topicTitle.toLowerCase();
    const modelTitleLower = model.title.toLowerCase();

    // Remover stopwords e pegar palavras relevantes
    const titleWords = titleLower.split(/\s+/)
      .filter((w: string) => w.length > 2 && !STOPWORDS.has(w));
    const modelWords = modelTitleLower.split(/\s+/)
      .filter((w: string) => w.length > 2 && !STOPWORDS.has(w));

    // 1. Correspondência exata de palavras (peso 10)
    titleWords.forEach((titleWord: string) => {
      if (modelWords.includes(titleWord)) {
        score += 10;
      }
    });

    // 2. Correspondência parcial de palavras (peso 5)
    titleWords.forEach((titleWord: string) => {
      modelWords.forEach((modelWord: string) => {
        if (titleWord !== modelWord && (titleWord.includes(modelWord) || modelWord.includes(titleWord))) {
          score += 5;
        }
      });
    });

    // 3. Keywords (peso 12 - mais importante)
    if (model.keywords) {
      const kwStr = Array.isArray(model.keywords) ? model.keywords.join(',') : model.keywords;
      const keywords = kwStr.toLowerCase().split(',')
        .map((k: string) => k.trim())
        .filter((k: string) => k.length > 0);

      keywords.forEach((keyword: string) => {
        if (titleLower.includes(keyword) || keyword.includes(titleLower.replace(/\s+/g, ''))) {
          score += 12;
        }

        // Verificar também no mini-relatório
        if (topicRelatorio && topicRelatorio.toLowerCase().includes(keyword)) {
          score += 3;
        }
      });
    }

    // 4. Palavras do título do modelo aparecem no mini-relatório (peso 2)
    if (topicRelatorio) {
      const relatorioLower = topicRelatorio.toLowerCase();
      modelWords.forEach((word: string) => {
        if (relatorioLower.includes(word)) {
          score += 2;
        }
      });
    }

    return score;
  };

  // Refinamento semântico com IA (para top candidatos)
  // v1.35.8: useCallback para evitar re-criação a cada render (causa lag no textarea)
  const refineWithAI = React.useCallback(async (topCandidates: Model[], topicTitle: string, topicCategory: string, topicRelatorio: string) => {
    if (topCandidates.length === 0) return [];

    try {
      const prompt = `${AI_PROMPTS.roles.relevancia}

CONTEXTO DO TÓPICO:
Título: ${topicTitle}
Categoria: ${topicCategory || 'Não especificada'}
Mini-relatório: ${topicRelatorio || 'Não disponível'}

MODELOS CANDIDATOS:
${topCandidates.map((m: Model, i: number) => `${i + 1}. [ID: ${m.id}] ${m.title}
   Categoria: ${m.category || 'N/A'}
   Keywords: ${m.keywords || 'N/A'}
   Resumo: ${m.content || 'N/A'}`).join('\n\n')}

TAREFA:
Analise semanticamente qual desses modelos é mais relevante para o tópico em questão.
Considere:
1. Similaridade temática entre título do tópico e título do modelo
2. Relevância das keywords com o contexto do mini-relatório
3. Categoria compatível
4. Aplicabilidade do conteúdo do modelo ao contexto do tópico

Responda APENAS com um array JSON contendo os IDs dos modelos ordenados por relevância (do mais relevante ao menos relevante).
Formato: ["id1", "id2", "id3", ...]

Inclua APENAS modelos que sejam realmente relevantes. Se nenhum for relevante, retorne array vazio: []`;

      // Usar Sonnet 4.5 (modelo padrão) para recomendação de modelos
      const apiRequest = aiIntegration.buildApiRequest([{
        role: 'user',
        content: [{ type: 'text', text: prompt }]
      }], 1000);

      // Sobrescrever modelo para Sonnet 4.5 (modelo padrão recomendado)
      apiRequest.model = 'claude-sonnet-4-20250514';

      let textContent;
      try {
        // v1.21.26: Parametros deterministicos para ranking de modelos
        // v1.30: Removido model explícito - usa provider/modelo das configurações
        textContent = await aiIntegration.callAI(apiRequest.messages as AIMessage[], {
          maxTokens: 300,
          useInstructions: false,
          disableThinking: true,
          logMetrics: true,
          temperature: 0.0,
          topP: 0.9,
          topK: 40
        });
      } catch (err) {
        return topCandidates; // Retorna candidatos sem reordenar
      }

      // Extrair array JSON da resposta
      const jsonMatch = textContent.match(/\[[\s\S]*?\]/);
      if (!jsonMatch) {
        return topCandidates;
      }

      const rankedIds = JSON.parse(jsonMatch[0]);

      // Reordenar modelos baseado no ranking da IA
      const ranked: Model[] = [];
      rankedIds.forEach((id: string) => {
        const model = topCandidates.find((m: Model) => m.id === id);
        if (model) ranked.push(model);
      });

      // Adicionar modelos que não foram ranqueados pela IA (se houver)
      topCandidates.forEach((m: Model) => {
        if (!ranked.find((r: Model) => r.id === m.id)) {
          ranked.push(m);
        }
      });

      return ranked;

    } catch (error) {
      return topCandidates; // Retorna candidatos sem reordenar em caso de erro
    }
  }, [aiIntegration.buildApiRequest, aiIntegration.callAI]);

  // 🚀 v1.8.2: Função principal de busca de sugestões (híbrida - COM CACHE)
  // v1.28.02: Suporte a IA Local via embeddings
  // v1.35.8: useCallback para evitar re-criação a cada render (causa lag no textarea de "regenerar com IA")
  const findSuggestions = React.useCallback(async (topic: Topic) => {
    // v1.29.05: Não gerar sugestões para tópicos especiais (RELATÓRIO e DISPOSITIVO)
    if (isSpecialTopic(topic)) return { suggestions: [], source: null };
    // v1.28.02: IA Local para sugestões (sem API Claude)
    // v1.35.74: Usa aiSettings unificado
    if (aiIntegration.aiSettings.useLocalAIForSuggestions && searchModelReady && modelLibrary.models.some(m => m.embedding?.length === 768)) {
      if (!topic?.title || topic.title.length < 3) return { suggestions: [], source: null }; // v1.28.05
      // v1.32.22: Usar apenas título para query mais focada (categoria e relatório diluem relevância)
      const topicText = topic.title;
      const cacheKey = `suggestions_local_${topicText}`;
      const cached = apiCache.get(cacheKey);
      if (cached && typeof cached === 'string') return JSON.parse(cached); // v1.28.05: cache já tem formato { suggestions, source }
      try {
        await new Promise(r => setTimeout(r, 0)); // v1.28.03: Yield para UI não congelar
        // v1.32.20: toLowerCase para E5 case-sensitive
        const qEmb = await AIModelService.getEmbedding(topicText.toLowerCase(), 'query');
        const threshold = (aiIntegration.aiSettings.modelSemanticThreshold || 60) / 100;
        const results = modelLibrary.models
          .filter(m => m.embedding?.length === 768)
          .map(m => ({ ...m, similarity: AIModelService.cosineSimilarity(qEmb, m.embedding || []) }))
          .filter(m => m.similarity >= threshold)
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, 5);
        const result = { suggestions: results, source: 'local' }; // v1.28.05
        apiCache.set(cacheKey, JSON.stringify(result));
        return result;
      } catch { /* fallback para sistema atual */ }
    }

    if (!topic || !topic.title || topic.title.length < 3) return { suggestions: [], source: null };
    if (modelLibrary.models.length === 0) return { suggestions: [], source: null };

    const topicTitle = topic.title;
    const topicCategory = topic.category;
    const topicRelatorio = topic.relatorio || topic.editedRelatorio || '';

    // 🚀 v1.8.2: Cache key baseado em título + categoria + relatório do tópico
    const cacheKey = `suggestions_${topicTitle}_${topicCategory}_${topicRelatorio}`;

    // 🚀 v1.8.2: Verificar cache antes de processar
    const cachedResult = apiCache.get(cacheKey);
    if (cachedResult && typeof cachedResult === 'string') {
      return JSON.parse(cachedResult); // v1.28.04: já inclui { suggestions, source }
    }

    // PASSO 1: Pontuação local
    const scoredModels = modelLibrary.models.map(model => ({
      model,
      score: scoreModel(model, topicTitle, topicCategory, topicRelatorio)
    })).filter(item => item.score > 0); // Filtrar apenas com alguma relevância

    // Ordenar por score
    scoredModels.sort((a, b) => b.score - a.score);

    // Pegar top 10 candidatos para refinamento com IA
    const topCandidates = scoredModels.slice(0, 10).map(item => item.model);

    if (topCandidates.length === 0) return { suggestions: [], source: null };

    // PASSO 2: Refinamento semântico com IA (apenas para top candidatos)
    const refinedModels = await refineWithAI(topCandidates, topicTitle, topicCategory, topicRelatorio);

    // Retornar top 5 modelos mais relevantes
    const topSuggestions = refinedModels.slice(0, 5);
    const result = { suggestions: topSuggestions, source: 'api' }; // v1.28.04

    // 🚀 v1.8.2: Cachear sugestões refinadas
    apiCache.set(cacheKey, JSON.stringify(result));

    return result;
  }, [aiIntegration.aiSettings.useLocalAIForSuggestions, searchModelReady, modelLibrary.models, aiIntegration.aiSettings.modelSemanticThreshold, apiCache, refineWithAI]);

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

  // Função para detectar automaticamente o resultado do julgamento usando IA
  const detectResultadoAutomatico = async (topicTitle: string, decisionText: string, topicCategory: string) => {
    // Não detectar para RELATÓRIO e DISPOSITIVO
    if (topicTitle.toUpperCase() === 'RELATÓRIO' || topicTitle.toUpperCase() === 'DISPOSITIVO') {
      return null;
    }

    // Se não há texto de decisão, não detectar
    if (!decisionText || decisionText.trim() === '') {
      return null;
    }

    try {
      const plainText = htmlToPlainText(decisionText);

      const prompt = `${AI_PROMPTS.roles.classificacao}

TÓPICO SENDO ANALISADO:
Título: ${topicTitle}
Categoria: ${topicCategory || 'Não especificada'}

TEXTO DA DECISÃO ESCRITA PELO USUÁRIO:
${plainText}

TAREFA:
Analise o texto da decisão e identifique o resultado do julgamento.

OPÇÕES POSSÍVEIS (escolha UMA):
1. PROCEDENTE - quando o pedido foi totalmente deferido/acolhido
2. IMPROCEDENTE - quando o pedido foi totalmente indeferido/rejeitado
3. PARCIALMENTE PROCEDENTE - quando o pedido foi parcialmente deferido
4. ACOLHIDO - quando uma preliminar, exceção ou questão processual foi acolhida
5. REJEITADO - quando uma preliminar, exceção ou questão processual foi rejeitada
6. SEM RESULTADO - para tópicos administrativos/acessórios sem julgamento de mérito
7. INDEFINIDO - quando o texto não deixa claro o resultado ou está incompleto

CRITÉRIOS DE ANÁLISE:
- Procure por palavras-chave como: "defiro", "indefiro", "julgo procedente", "julgo improcedente", "parcialmente", "acolho", "rejeito"
- Considere o contexto geral do texto
- Se a categoria for PRELIMINAR, prefira ACOLHIDO/REJEITADO
- Se a categoria for MÉRITO, prefira PROCEDENTE/IMPROCEDENTE/PARCIALMENTE PROCEDENTE
- Se o tópico tratar de deduções previdenciárias, prazos e condições para cumprimento da decisão, juros ou correção monetária, retorne SEM RESULTADO
- Se houver dúvida ou o texto estiver incompleto, retorne INDEFINIDO

Responda APENAS com uma das palavras: PROCEDENTE, IMPROCEDENTE, PARCIALMENTE PROCEDENTE, ACOLHIDO, REJEITADO, SEM RESULTADO ou INDEFINIDO.
Não adicione explicações, pontos finais ou outros caracteres. Apenas a palavra.`;

      // v1.21.26: Parametros deterministicos para classificacao
      const textContent = await aiIntegration.callAI([{
        role: 'user',
        content: [{ type: 'text', text: prompt }]
      }], {
        maxTokens: 500,
        useInstructions: false,
        logMetrics: true,
        temperature: 0.0,
        topP: 0.9,
        topK: 20
      });

      const resultado = textContent.toUpperCase();

      // Validar resultado
      const resultadosValidos = ['PROCEDENTE', 'IMPROCEDENTE', 'PARCIALMENTE PROCEDENTE', 'ACOLHIDO', 'REJEITADO', 'SEM RESULTADO', 'INDEFINIDO'];

      if (resultadosValidos.includes(resultado)) {
        // Se for INDEFINIDO, retornar null para não sobrescrever escolha manual do usuário
        return resultado === 'INDEFINIDO' ? null : resultado;
      } else {
        return null;
      }

    } catch (error) {
      return null;
    }
  };

  const saveTopicEdit = async () => {
    if (!editingTopic) return;
    setSavingTopic(true);
    try {
      const isRelatorio = editingTopic.title.toUpperCase() === 'RELATÓRIO';
      const isDispositivo = editingTopic.title.toUpperCase() === 'DISPOSITIVO';

      // Validar refs baseado no tipo de tópico
      if (isRelatorio && !relatorioRef.current) return;
      if (isDispositivo && !editorRef.current) return;
      if (!isRelatorio && !isDispositivo && (!editorRef.current || !relatorioRef.current)) return;

      // Capturar conteúdo dos editores (apenas os que existem)
            const content = editorRef.current ? sanitizeHTML(editorRef.current.root.innerHTML) : '';
            const relatorio = relatorioRef.current ? sanitizeHTML(relatorioRef.current.root.innerHTML) : '';

      let updatedTopic = {
        ...editingTopic,
        editedRelatorio: relatorio,
        relatorio: htmlToPlainText(relatorio)
      };

            if (isDispositivo) {
        updatedTopic.editedContent = content;
      } else if (!isRelatorio) {
        // Apenas tópicos normais (não RELATÓRIO, não DISPOSITIVO) usam editedFundamentacao
        updatedTopic.editedFundamentacao = content;
      }

      // Detectar resultado automaticamente APENAS se não foi escolha manual do usuário
      // Isso permite re-detecção quando o usuário muda o texto da decisão
      if (!updatedTopic.resultadoManual) {
        const resultadoDetectado = await detectResultadoAutomatico(
          updatedTopic.title || '',
          content,
          updatedTopic.category || ''
        );

        if (resultadoDetectado) {
          updatedTopic.resultado = resultadoDetectado;
        }
      }

      const updatedTopics = selectedTopics.map(t =>
        t.title === editingTopic.title ? updatedTopic : t
      );
      setSelectedTopics(updatedTopics);

      // Atualizar também em extractedTopics
      const extractedIndex = extractedTopics.findIndex((t: Topic) => t.title === editingTopic.title);
      if (extractedIndex !== -1) {
        const newExtracted = [...extractedTopics];
        newExtracted[extractedIndex] = { ...newExtracted[extractedIndex], resultado: updatedTopic.resultado };
        setExtractedTopics(newExtracted);
      }

      setLastEditedTopicTitle(editingTopic.title);
      setEditingTopic(null);
      modelLibrary.setSuggestions([]);
      setActiveTab('topics');
    } finally {
      setSavingTopic(false);
    }
  };

  const saveTopicEditWithoutClosing = async () => {
    if (!editingTopic) return;
    setSavingTopic(true);
    try {
      const isRelatorio = editingTopic.title.toUpperCase() === 'RELATÓRIO';
      const isDispositivo = editingTopic.title.toUpperCase() === 'DISPOSITIVO';

      // Validar refs baseado no tipo de tópico
      if (isRelatorio && !relatorioRef.current) return;
      if (isDispositivo && !editorRef.current) return;
      if (!isRelatorio && !isDispositivo && (!editorRef.current || !relatorioRef.current)) return;

      // Capturar conteúdo dos editores (apenas os que existem)
            const content = editorRef.current ? sanitizeHTML(editorRef.current.root.innerHTML) : '';
            const relatorio = relatorioRef.current ? sanitizeHTML(relatorioRef.current.root.innerHTML) : '';

      let updatedTopic = {
        ...editingTopic,
        editedRelatorio: relatorio,
        relatorio: htmlToPlainText(relatorio)
      };

            if (isDispositivo) {
        updatedTopic.editedContent = content;
      } else if (!isRelatorio) {
        // Apenas tópicos normais (não RELATÓRIO, não DISPOSITIVO) usam editedFundamentacao
        updatedTopic.editedFundamentacao = content;
      }

      // Botão "Salvar e Fechar" (saveTopicEdit) continua com detecção automática

      const updatedTopics = selectedTopics.map(t =>
        t.title === editingTopic.title ? updatedTopic : t
      );
      setSelectedTopics(updatedTopics);

      // Atualizar também em extractedTopics
      const extractedIndex = extractedTopics.findIndex((t: Topic) => t.title === editingTopic.title);
      if (extractedIndex !== -1) {
        const newExtracted = [...extractedTopics];
        newExtracted[extractedIndex] = { ...newExtracted[extractedIndex], resultado: updatedTopic.resultado };
        setExtractedTopics(newExtracted);
      }

      // Atualizar também o editingTopic com os dados salvos
      setEditingTopic(updatedTopic);

      setLastEditedTopicTitle(editingTopic.title);

      // Feedback visual simples (sem detecção de resultado)
      const successMsg = document.createElement('div');
      successMsg.className = 'fixed top-4 left-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2 animate-pulse';
      successMsg.innerHTML = '<span>✓</span> Salvo!';

      document.body.appendChild(successMsg);
      setTimeout(() => successMsg.remove(), 3000);
    } finally {
      setSavingTopic(false);
    }
  };

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
  });
  const {
    generateAiText,
    insertAiText,
    buildContextForChat,
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
    factsComparisonCache: factsComparisonCacheIndividual,
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

  // v1.21.21: Função para revisar sentença buscando omissões, contradições e obscuridades
  // v1.36.57: Cache persistente para revisão de sentença
  const reviewSentence = async () => {
    if (!canGenerateDispositivo.enabled) {
      setError('Complete todos os tópicos antes de revisar a sentença.');
      return;
    }

    setGeneratingReview(true);
    setError('');

    try {
      // v1.36.57: Verificar cache primeiro
      const cachedReview = await sentenceReviewCache.getReview(reviewScope);
      if (cachedReview) {
        setReviewResult(cachedReview);
        setReviewFromCache(true);
        closeModal('sentenceReview');
        openModal('sentenceReviewResult');
        setGeneratingReview(false);
        return;
      }

      // Não há cache, gerar com IA
      setReviewFromCache(false);
      const contentArray: AIMessageContent[] = [];

      // Se escopo inclui documentos, usar buildDocumentContentArray existente
      if (reviewScope === 'decisionWithDocs') {
        const docsArray = buildDocumentContentArray(analyzedDocuments, { includeComplementares: true });
        contentArray.push(...docsArray);
      }

      // Adicionar decisão completa
      contentArray.push({
        type: 'text' as const,
        text: `DECISÃO PARA REVISÃO:\n\n${buildDecisionText()}`
      });

      // v1.21.25: Parametros especificos para revisao critica (mais rigoroso, menos criativo)
      const result = await aiIntegration.callAI([{
        role: 'user',
        content: contentArray
      }], {
        maxTokens: 8192,
        systemPrompt: AI_PROMPTS.revisaoSentenca(reviewScope === 'decisionWithDocs'),
        useInstructions: false,
        logMetrics: true,
        temperature: 0.2,
        topP: 0.9,
        topK: 40
      });

      let reviewFinal = normalizeHTMLSpacing(result.trim());

      // v1.36.56: Double Check da Revisão de Sentença
      if (aiIntegration.aiSettings.doubleCheck?.enabled &&
          aiIntegration.aiSettings.doubleCheck?.operations.sentenceReview) {

        try {
          const { verified, corrections, summary } = await aiIntegration.performDoubleCheck(
            'sentenceReview',
            reviewFinal,
            buildDecisionText()  // Contexto: a decisão completa
          );

          if (corrections.length > 0) {
            reviewFinal = verified;
            showToast(`🔄 Double Check: ${corrections.length} correção(ões) - ${summary}`, 'info');
            console.log('[DoubleCheck Review] Correções aplicadas:', corrections);
          } else {
            console.log('[DoubleCheck Review] Nenhuma correção necessária');
          }
        } catch (dcError) {
          console.error('[DoubleCheck Review] Erro:', dcError);
          // Continuar com revisão original em caso de erro
        }
      }

      // v1.36.57: Salvar no cache após gerar
      await sentenceReviewCache.saveReview(reviewScope, reviewFinal);

      setReviewResult(reviewFinal);
      closeModal('sentenceReview');
      openModal('sentenceReviewResult');
    } catch (err) {
      setError('Erro ao revisar sentença: ' + (err as Error).message);
    } finally {
      setGeneratingReview(false);
    }
  };

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
  // v1.28.01: Usa toggle global como padrão se não houver valor no localStorage
  // v1.35.74: Usa aiSettings unificado
  const [useModelSemanticSearch, setUseModelSemanticSearch] = React.useState(() => {
    try {
      const stored = localStorage.getItem('modelSemanticMode');
      if (stored !== null) return stored === 'true';
      return aiIntegration.aiSettings.modelSemanticEnabled; // Usa toggle global como fallback
    } catch { return false; }
  });
  const [modelSemanticResults, setModelSemanticResults] = React.useState<Model[] | null>(null);
  const [searchingModelSemantics, setSearchingModelSemantics] = React.useState(false);

  // Busca semântica de modelos disponível se: toggle global ativo + modelo pronto + modelos com embedding
  const modelSemanticAvailable = aiIntegration.aiSettings.modelSemanticEnabled && searchModelReady && modelEmbeddingsCount > 0;

  // Handler para busca semântica de modelos
  // v1.35.74: Usa aiSettings unificado
  const performModelSemanticSearch = React.useCallback(async (query: string) => {
    if (!query || query.length < 3 || !modelSemanticAvailable) {
      setModelSemanticResults(null);
      return;
    }
    setSearchingModelSemantics(true);
    try {
      const threshold = (aiIntegration.aiSettings.modelSemanticThreshold ?? 75) / 100;
      const results = await searchModelsBySimilarity(modelLibrary.models, query, { threshold, limit: 30 });
      setModelSemanticResults(results);
    } catch (err) {
      console.error('[Model Semantic] Erro na busca:', err);
      setModelSemanticResults(null);
    } finally {
      setSearchingModelSemantics(false);
    }
  }, [modelSemanticAvailable, aiIntegration.aiSettings.modelSemanticThreshold, modelLibrary.models]);

  // Debounce para busca semântica de modelos
  const modelSemanticSearchTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(() => {
    if (useModelSemanticSearch && modelSemanticAvailable && modelLibrary.searchTerm) {
      if (modelSemanticSearchTimeoutRef.current) clearTimeout(modelSemanticSearchTimeoutRef.current);
      modelSemanticSearchTimeoutRef.current = setTimeout(() => {
        performModelSemanticSearch(modelLibrary.searchTerm);
      }, 500);
    } else {
      setModelSemanticResults(null);
    }
    return () => {
      if (modelSemanticSearchTimeoutRef.current) {
        clearTimeout(modelSemanticSearchTimeoutRef.current);
      }
    };
  }, [modelLibrary.searchTerm, useModelSemanticSearch, modelSemanticAvailable, performModelSemanticSearch]);

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
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="theme-bg-primary rounded-lg shadow-2xl border theme-border-secondary" style={{ backgroundColor: 'var(--bg-primary)', opacity: 0.95 }}>
          <div className={CSS.modalHeader}>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                  SENTENCIFY.AI
                </h1>

                {/* Campo de Número do Processo (v1.3.5.1) */}
                <div className="mt-2 mb-1">
                  <input
                    type="text"
                    value={processoNumero}
                    onChange={(e) => setProcessoNumero(e.target.value)}
                    placeholder="Nº do Processo (ex: ATOrd 0000313-98.2025.5.08.0110)"
                    className="w-full max-w-md px-3 py-1.5 rounded text-sm font-mono theme-bg-secondary border theme-border-primary theme-text-secondary theme-placeholder focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all theme-hover-bg"
                    style={{ transition: 'all 0.2s ease' }}
                  />
                </div>

                <p className="theme-text-muted mt-1">Ferramenta integrada com IA para auxílio na minuta de sentenças trabalhistas</p>
              </div>
              <div className="text-right">
                <div className="flex items-center justify-end gap-2 mb-2">
                  <p className="text-xs theme-text-disabled">
                    <button onClick={() => setShowChangelogModal(true)} className="hover:text-blue-400 transition-colors cursor-pointer" title="Ver histórico de alterações">
                      Versão {APP_VERSION}
                    </button>
                    {' '}- <span className="text-amber-500 font-semibold">PROTÓTIPO</span> (não utilizar com processos reais)
                  </p>
                </div>
                <p className="text-xs theme-text-muted mt-1">Made by <span className="text-blue-400">Rodrigo Nohlack Corrêa Cesar</span></p>
                <p className="text-xs theme-text-disabled">Juiz do Trabalho no TRT8</p>

                <div className="mt-2 flex gap-2 justify-end flex-wrap">
                  {/* 📖 v1.32.11: Botão Manual do Usuário */}
                  <button
                    onClick={() => window.open('/MANUAL_USUARIO_AVANCADO.html', '_blank')}
                    className="px-2 py-1 rounded text-base flex items-center justify-center theme-btn-secondary transition-colors duration-200"
                    title="Manual do Usuário Avançado"
                  >
                    📖
                  </button>
                  {/* 🎨 v1.9.13: Toggle Tema Claro/Escuro */}
                  <button
                    onClick={toggleAppTheme}
                    className="px-2 py-1 rounded text-base flex items-center justify-center theme-btn-secondary transition-colors duration-200"
                    title={appTheme === 'dark' ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}
                  >
                    {appTheme === 'dark' ? '☀️' : '🌙'}
                  </button>
                  <button
                    onClick={() => openModal('settings')}
                    className="px-3 py-1 rounded text-xs flex items-center gap-1 theme-btn-secondary transition-colors duration-200"
                  >
                    ⚙️ Configurações IA
                  </button>
                  {/* ☁️ v1.35.40: Google Drive */}
                  <GoogleDriveButton
                    isConnected={googleDrive.isConnected}
                    isLoading={googleDrive.isLoading}
                    userEmail={googleDrive.userEmail}
                    userPhoto={googleDrive.userPhoto}
                    onConnect={googleDrive.connect}
                    onDisconnect={googleDrive.disconnect}
                    onSave={async () => {
                      try {
                        const allStatesWithAI = {
                          processoNumero,
                          pastedPeticaoTexts,
                          pastedContestacaoTexts,
                          pastedComplementaryTexts,
                          extractedTopics,
                          selectedTopics,
                          partesProcesso,
                          activeTab,
                          analyzedDocuments,
                          proofFiles: proofManager.proofFiles,
                          proofTexts: proofManager.proofTexts,
                          proofUsePdfMode: proofManager.proofUsePdfMode,
                          extractedProofTexts: proofManager.extractedProofTexts,
                          proofExtractionFailed: proofManager.proofExtractionFailed,
                          proofTopicLinks: proofManager.proofTopicLinks,
                          proofAnalysisResults: proofManager.proofAnalysisResults,
                          proofConclusions: proofManager.proofConclusions,
                          aiSettings: aiIntegration.aiSettings,
                          peticaoFiles,
                          contestacaoFiles,
                          complementaryFiles,
                          extractedTexts,
                          documentProcessingModes,
                          tokenMetrics: aiIntegration.tokenMetrics
                        };
                        // Converter PDFs para base64 para salvar no Drive
                        const projectJson = await storage.buildProjectJson(allStatesWithAI);
                        const fileName = `sentencify-${processoNumero || 'projeto'}-${new Date().toISOString().split('T')[0]}.json`;
                        await googleDrive.saveFile(fileName, projectJson);
                        setError({ type: 'success', message: `Projeto salvo no Google Drive: ${fileName}` });
                      } catch (err) {
                        setError({ type: 'error', message: `Erro ao salvar no Drive: ${(err as Error).message}` });
                      }
                    }}
                    onLoadClick={async () => {
                      try {
                        const files = await googleDrive.listFiles();
                        setDriveFiles(files);
                        setDriveFilesModalOpen(true);
                      } catch (err) {
                        setError({ type: 'error', message: `Erro ao listar arquivos: ${(err as Error).message}` });
                      }
                    }}
                    // v1.35.51: Props para salvar/carregar local (consolidado no dropdown)
                    onSaveLocal={() => {
                      const allStatesWithAI = {
                        processoNumero,
                        pastedPeticaoTexts,
                        pastedContestacaoTexts,
                        pastedComplementaryTexts,
                        extractedTopics,
                        selectedTopics,
                        partesProcesso,
                        activeTab,
                        analyzedDocuments,
                        proofFiles: proofManager.proofFiles,
                        proofTexts: proofManager.proofTexts,
                        proofUsePdfMode: proofManager.proofUsePdfMode,
                        extractedProofTexts: proofManager.extractedProofTexts,
                        proofExtractionFailed: proofManager.proofExtractionFailed,
                        proofTopicLinks: proofManager.proofTopicLinks,
                        proofAnalysisResults: proofManager.proofAnalysisResults,
                        proofConclusions: proofManager.proofConclusions,
                        aiSettings: aiIntegration.aiSettings,
                        peticaoFiles,
                        contestacaoFiles,
                        complementaryFiles,
                        extractedTexts,
                        documentProcessingModes,
                        tokenMetrics: aiIntegration.tokenMetrics
                      };
                      storage.exportProject(allStatesWithAI, (err: string | null) => setError(err || ''));
                    }}
                    onLoadLocal={(e) => {
                      const callbacks = {
                        setPastedPeticaoTexts,
                        setPastedContestacaoTexts,
                        setPastedComplementaryTexts,
                        setExtractedTopics,
                        setSelectedTopics,
                        setPartesProcesso,
                        setAnalyzedDocuments,
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
                        setAiSettings: aiIntegration.setAiSettings,
                        setError,
                        setProcessoNumero,
                        setPeticaoFiles,
                        setContestacaoFiles,
                        setComplementaryFiles,
                        setExtractedTexts,
                        setDocumentProcessingModes,
                        setTokenMetrics: aiIntegration.setTokenMetrics
                      };

                      const autoSaveFn = (states: SessionState, setErrorFn: (err: string | null) => void, immediate: boolean) => {
                        return storage.autoSaveSession(states, setErrorFn, immediate);
                      };

                      storage.importProject(e, callbacks, autoSaveFn);
                    }}
                    // v1.35.52: Limpar projeto consolidado no dropdown
                    onClear={() => openModal('clearProject')}
                    isDarkMode={appTheme === 'dark'}
                  />
                  {/* 🔄 v1.35.57: Botão Sair na mesma linha */}
                  {cloudSync?.isAuthenticated && (
                    <button
                      onClick={() => openModal('logout')}
                      className="px-3 py-1 rounded text-xs flex items-center gap-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/30 transition-colors duration-200"
                      title="Sair do sistema"
                    >
                      <LogOut className="w-3 h-3" />
                      Sair
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            {/* Aviso sobre responsabilidade */}
            <div className="mt-4 p-3 theme-bg-amber-accent border border-amber-500/30 rounded-lg">
              <div className="flex items-start gap-2">
                <span className="theme-text-amber text-lg flex-shrink-0">⚠️</span>
                <div className="text-xs theme-text-amber-muted">
                  <span className="font-semibold">Aviso Importante:</span> Esta ferramenta utiliza Inteligência Artificial para auxiliar na redação de sentenças.
                  A IA pode cometer erros, omitir informações relevantes ou gerar conteúdo impreciso.
                  <span className="block mt-1 font-semibold theme-text-amber">É responsabilidade do usuário revisar, verificar e validar todas as informações geradas antes de utilizá-las.</span>
                  <span className="block mt-1 theme-text-amber-muted">Sua revisão é fundamental, na forma estabelecida pela <span className="font-semibold">Resolução 615/2025 do CNJ</span>.</span>
                </div>
              </div>
            </div>
          </div>

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
                peticaoFiles={peticaoFiles}
                contestacaoFiles={contestacaoFiles}
                complementaryFiles={complementaryFiles}
                setContestacaoFiles={setContestacaoFiles}
                setComplementaryFiles={setComplementaryFiles}
                pastedPeticaoTexts={pastedPeticaoTexts}
                pastedContestacaoTexts={pastedContestacaoTexts}
                pastedComplementaryTexts={pastedComplementaryTexts}
                analyzedDocuments={analyzedDocuments}
                setAnalyzedDocuments={setAnalyzedDocuments}
                documentProcessingModes={documentProcessingModes}
                setDocumentProcessingModes={setDocumentProcessingModes}
                getDefaultProcessingMode={getDefaultProcessingMode}
                setPeticaoMode={setPeticaoMode}
                setContestacaoMode={setContestacaoMode}
                setComplementarMode={setComplementarMode}
                processoNumero={processoNumero}
                setProcessoNumero={setProcessoNumero}
                handleUploadPeticao={handleUploadPeticao}
                handleUploadContestacao={handleUploadContestacao}
                handleUploadComplementary={handleUploadComplementary}
                removePeticaoFile={removePeticaoFile}
                removePastedText={removePastedText}
                showPasteArea={showPasteArea}
                setShowPasteArea={setShowPasteArea}
                handlePastedText={handlePastedText}
                setTextPreview={setTextPreview}
                documentAnalyzing={documentAnalyzing}
                handleAnalyzeDocuments={handleAnalyzeDocuments}
                aiIntegration={aiIntegration}
                documentServices={documentServices}
                removePdfFromIndexedDB={removePdfFromIndexedDB}
              />
            )}

            {activeTab === 'topics' && (
              <div className="space-y-6">
                {extractedTopics.length === 0 ? (
                  <div className="text-center py-12 theme-text-muted">
                    <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>Nenhum tópico extraído ainda. Faça upload e análise dos documentos.</p>
                  </div>
                ) : (
                  <>
                    <div>
                      <div className="mb-4 space-y-3">
                        {/* Linha 1: Título e Botões */}
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="text-xl font-bold text-blue-400">
                              Gerenciar Tópicos {selectedTopics.length > 0 && `(${selectedTopics.length} selecionados)`}
                            </h3>
                            <p className="text-xs theme-text-muted mt-1 flex items-center gap-2">
                              Clique para selecionar • <GripVertical className="w-3 h-3" /> Arraste para reordenar • Use setas e números
                            </p>
                          </div>
                          <div className="flex gap-2 flex-nowrap overflow-x-auto">
                            {topicsToMerge.length >= 2 && (
                              <button
                                onClick={() => openModal('merge')}
                                disabled={aiIntegration.regenerating}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm disabled:opacity-50 hover-amber-700-from-600 bg-amber-600 text-white transition-colors duration-300"
                              >
                                <Merge className="w-4 h-4" />
                                Unir {topicsToMerge.length} Selecionados
                              </button>
                            )}
                            <button
                              onClick={() => openModal('newTopic')}
                              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover-green-700-from-600 bg-emerald-600 text-white transition-colors duration-300"
                            >
                              <PlusCircle className="w-4 h-4" />
                              Novo Tópico
                            </button>
                            {/* v1.11.0: Botão de Edição Global */}
                            {selectedTopics.length > 0 && (
                              <button
                                onClick={() => openModal('globalEditor')}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover-cyan-700-from-600 bg-cyan-600 text-white transition-colors duration-300"
                              >
                                <Edit className="w-4 h-4" />
                                Edição Global
                              </button>
                            )}
                            {selectedTopics.length > 0 && (
                              <>
                                {/* v1.21.21: Botão Revisar Sentença */}
                                <div className="relative group">
                                  <button
                                    onClick={() => openModal('sentenceReview')}
                                    disabled={!canGenerateDispositivo.enabled || generatingReview}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-white transition-all ${
                                      !canGenerateDispositivo.enabled || generatingReview
                                        ? 'opacity-50 cursor-not-allowed'
                                        : 'hover-amber-700-from-600'
                                    }`}
                                    style={{
                                      backgroundColor: canGenerateDispositivo.enabled && !generatingReview ? '#d97706' : '#6b7280',
                                      transition: 'background-color 0.3s ease'
                                    }}
                                  >
                                    {generatingReview ? (
                                      <>
                                        <div className={CSS.spinner}></div>
                                        <span>Revisando...</span>
                                      </>
                                    ) : (
                                      <>
                                        <Scale className="w-4 h-4" />
                                        Revisar Sentença
                                      </>
                                    )}
                                  </button>
                                  {/* Tooltip quando desabilitado */}
                                  {!canGenerateDispositivo.enabled && !generatingReview && (
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 theme-bg-primary text-white text-xs rounded-lg shadow-lg border border-amber-500/50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 max-w-xs">
                                      <div className="flex items-start gap-2">
                                        <span className="text-xl flex-shrink-0">⚠️</span>
                                        <span>{canGenerateDispositivo.reason}</span>
                                      </div>
                                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-amber-500/50"></div>
                                    </div>
                                  )}
                                </div>
                                {/* v1.5.14: Botão com validação e tooltip */}
                                <div className="relative group">
                                  <button
                                    onClick={generateDispositivo}
                                    disabled={!canGenerateDispositivo.enabled || aiIntegration.generatingDispositivo}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-white transition-all ${
                                      !canGenerateDispositivo.enabled || aiIntegration.generatingDispositivo
                                        ? 'opacity-50 cursor-not-allowed'
                                        : 'hover-purple-700-from-600'
                                    }`}
                                    style={{
                                      backgroundColor: canGenerateDispositivo.enabled && !aiIntegration.generatingDispositivo ? '#9333ea' : '#6b7280',
                                      transition: 'background-color 0.3s ease'
                                    }}
                                  >
                                    {aiIntegration.generatingDispositivo ? (
                                      <>
                                        <div className={CSS.spinner}></div>
                                        <span>Gerando...</span>
                                      </>
                                    ) : (
                                      <>
                                        <Sparkles className="w-4 h-4" />
                                        Gerar Dispositivo
                                      </>
                                    )}
                                  </button>

                                  {/* Tooltip explicativo quando desabilitado - v1.5.14: Otimizado para múltiplos tópicos */}
                                  {!canGenerateDispositivo.enabled && !aiIntegration.generatingDispositivo && (
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 theme-bg-primary text-white text-xs rounded-lg shadow-lg border border-amber-500/50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 max-w-xs">
                                      <div className="flex items-start gap-2">
                                        <span className="text-xl flex-shrink-0">⚠️</span>
                                        <span>{canGenerateDispositivo.reason}</span>
                                      </div>
                                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-amber-500/50"></div>
                                    </div>
                                  )}
                                </div>
                                <button
                                  onClick={exportDecision}
                                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm hover-blue-700-from-600 bg-blue-600 text-white transition-colors duration-300"
                                >
                                  <Download className="w-4 h-4" />
                                  Exportar Minuta Completa
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        
                        {/* Linha 2: Contadores de Status */}
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="flex items-center gap-2 px-3 py-1.5 theme-bg-green-accent rounded-lg border border-green-500/30">
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            <span className="text-xs theme-text-green font-medium">
                              {topicsDecididos} Decididos
                            </span>
                          </div>
                          <div className="flex items-center gap-2 px-3 py-1.5 theme-bg-amber-accent rounded-lg border border-amber-500/30">
                            <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                            <span className="text-xs theme-text-amber font-medium">
                              {topicsPendentes} Pendentes
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Aviso sobre mini-relatórios gerados por IA */}
                      <div className="mb-4 p-3 theme-bg-blue-accent border border-blue-500/30 rounded-lg">
                        <div className="flex items-start gap-2">
                          <span className="theme-text-blue text-sm">ℹ️</span>
                          <div className="text-xs theme-text-blue-muted">
                            <p>Os mini-relatórios foram gerados automaticamente por IA. Revise-os e complemente com informações relevantes antes de decidir.</p>
                            <p className="mt-1 theme-text-blue-muted">Sua revisão é fundamental, na forma estabelecida pela <span className="font-semibold">Resolução 615/2025 do CNJ</span>.</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        {/* v1.33.59: DndContext com collision detection customizado (ignora RELATÓRIO/DISPOSITIVO) */}
                        <DndContext
                          sensors={dndSensors}
                          collisionDetection={customCollisionDetection}
                          onDragEnd={handleDndDragEnd}
                        >
                          <SortableContext
                            items={selectedTopics.map(t => t.id || t.title)}
                            strategy={verticalListSortingStrategy}
                          >
                            {/* Renderizar tópicos selecionados primeiro (na ordem correta) - v1.33.58: SortableTopicCard */}
                            {selectedTopics.map((topic, selectedIdx) => (
                              <SortableTopicCard
                                key={topic.id || topic.title}
                                id={String(topic.id || topic.title)}
                                topic={topic}
                                selectedIdx={selectedIdx}
                                topicRefs={topicRefs}
                                lastEditedTopicTitle={lastEditedTopicTitle}
                                selectedTopics={selectedTopics}
                                extractedTopics={extractedTopics}
                                topicsToMerge={topicsToMerge}
                                toggleTopicSelection={toggleTopicSelection}
                                moveTopicUp={moveTopicUp}
                                moveTopicDown={moveTopicDown}
                                moveTopicToPosition={moveTopicToPosition}
                                setSelectedTopics={setSelectedTopics}
                                setExtractedTopics={setExtractedTopics}
                                startEditing={startEditing}
                                setTopicToRename={setTopicToRename}
                                setNewTopicName={setNewTopicName}
                                openModal={openModal}
                                setTopicToSplit={setTopicToSplit}
                                setTopicsToMerge={setTopicsToMerge}
                              />
                            ))}
                          </SortableContext>
                        </DndContext>

                        {/* Renderizar tópicos NÃO selecionados por último */}
                        {/* v1.4.6.2: OPT-01 - Memoizado no corpo do componente (linha 10546) */}
                        {unselectedTopics.map((topic, idx) => {
                            const isRelatorioOrDispositivo = isSpecialTopic(topic);
                            
                            return (
                          <div
                            key={topic.title}
                            className="p-4 rounded-lg border-2 transition-all theme-bg-secondary-30 theme-border-input hover-theme-border hover-slate-700/50"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                  {/* Seletor de categoria - editável (não mostrar para RELATÓRIO e DISPOSITIVO) */}
                                  {!isRelatorioOrDispositivo && (
                                    <select
                                      value={topic.category || 'MÉRITO'}
                                      onChange={(e) => {
                                        e.stopPropagation();
                                        const newExtracted = [...extractedTopics];
                                        const extractedIndex = extractedTopics.findIndex((t: Topic) => t.title === topic.title);
                                        if (extractedIndex !== -1) {
                                          newExtracted[extractedIndex] = { ...newExtracted[extractedIndex], category: e.target.value as TopicCategory };
                                          setExtractedTopics(newExtracted);
                                        }
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                      className="text-xs px-2 py-1 rounded cursor-pointer font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 border-2 theme-border theme-text-secondary hover-category-select"
                                      title="Clique para alterar a categoria"
                                    >
                                      <option value="PRELIMINAR">📋 Preliminar</option>
                                      <option value="PREJUDICIAL">⚠️ Prejudicial</option>
                                      <option value="MÉRITO">⚖️ Mérito</option>
                                      <option value="PROCESSUAL">📝 Processual</option>
                                    </select>
                                  )}
                                  
                                  <h4 
                                    className="font-semibold theme-text-primary cursor-pointer"
                                    onClick={() => toggleTopicSelection(topic)}
                                  >
                                    {topic.title.toUpperCase()}
                                  </h4>
                                  {/* Indicador de status de decisão - não mostrar para RELATÓRIO e DISPOSITIVO */}
                                  {topic.title.toUpperCase() !== 'RELATÓRIO' && topic.title.toUpperCase() !== 'DISPOSITIVO' && (
                                    isTopicDecidido(topic) ? (
                                      <span className="flex items-center gap-1 text-xs theme-bg-green-accent theme-text-green px-2 py-1 rounded border border-green-500/30">
                                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                        Decidido
                                      </span>
                                    ) : (
                                      <span className="flex items-center gap-1 text-xs theme-bg-amber-accent theme-text-amber px-2 py-1 rounded border border-amber-500/30">
                                        <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                                        Pendente
                                      </span>
                                    )
                                  )}
                                </div>
                              </div>
                              <div className={CSS.flexGap2}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteTopic(topic);
                                  }}
                                  className="p-2 rounded hover-delete-topic"
                                  title="Excluir tópico"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                                <div className="flex flex-col items-center gap-1">
                                  <span className="text-xs theme-text-disabled">Clique para selecionar</span>
                                  <input
                                    type="checkbox"
                                    checked={false}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      toggleTopicSelection(topic);
                                    }}
                                    className="w-5 h-5 rounded cursor-pointer"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === 'proofs' && (
              <div className="space-y-6">
                {/* v1.36.36: Aviso removido - bloqueio visual no seletor é suficiente */}

                <div className="theme-gradient-card-50 rounded-lg p-6 border theme-border-secondary">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-blue-400 mb-2">Gestão de Provas</h3>
                      <p className="text-sm theme-text-muted">
                        Faça upload de documentos probatórios, analise com IA e vincule aos tópicos da decisão
                      </p>
                    </div>
                    <Scale className="w-8 h-8 text-blue-400 opacity-50" />
                  </div>

                  {/* Seção de Upload */}
                  <div className="space-y-4 mb-8">
                    <h4 className="text-lg font-semibold theme-text-secondary flex items-center gap-2">
                      <Upload className="w-5 h-5" />
                      Upload de Provas
                    </h4>

                    {/* Upload de PDF */}
                    <div className="border-2 border-dashed theme-border-input rounded-lg p-6 hover-border-blue-500 transition-colors">
                      <input
                        type="file"
                        accept="application/pdf"
                        multiple
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          if (files.length > 0) {
                            proofManager.handleUploadProofPdf(files);
                          }
                          e.target.value = '';
                        }}
                        className="hidden"
                        id="proof-pdf-upload"
                      />
                      <label
                        htmlFor="proof-pdf-upload"
                        className="flex flex-col items-center cursor-pointer"
                      >
                        <Upload className="w-12 h-12 theme-text-muted mb-3" />
                        <p className="theme-text-tertiary font-medium mb-1">Clique para fazer upload de PDFs</p>
                        <p className="text-sm theme-text-disabled">Suporta múltiplos arquivos PDF</p>
                      </label>
                    </div>

                    {/* Área para colar texto */}
                    <div className="space-y-2">
                      <button
                        onClick={() => {
                          proofManager.setNewProofTextData({ name: '', text: '' });
                          openModal('addProofText');
                        }}
                        className="w-full py-3 theme-bg-secondary rounded-lg hover-slate-600 transition-colors flex items-center justify-center gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        Colar Texto como Prova
                      </button>
                    </div>
                  </div>

                  {/* Lista de Provas */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold theme-text-secondary flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Provas Enviadas ({proofManager.proofFiles.length + proofManager.proofTexts.length})
                    </h4>

                    {proofManager.proofFiles.length === 0 && proofManager.proofTexts.length === 0 ? (
                      <div className="text-center py-12 theme-text-muted border border-dashed theme-border-input rounded-lg">
                        <Scale className="w-16 h-16 mx-auto mb-4 opacity-30" />
                        <p>Nenhuma prova enviada ainda</p>
                        <p className="text-sm mt-2">Faça upload de PDFs ou cole textos acima</p>
                      </div>
                    ) : extractedTopics.length === 0 ? (
                      <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-4">
                        <p className="text-sm theme-text-amber flex items-start gap-2">
                          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                          <span>
                            <strong>Atenção:</strong> Para vincular provas a tópicos, primeiro analise os documentos na aba "Upload & Análise".
                          </span>
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* 🚀 v1.8.2: Componentizado com ProofCard - PROVAS EM PDF */}
                        {proofManager.proofFiles.map((proof: Proof) => (
                          <ProofCard
                            key={proof.id}
                            proof={proof}
                            isPdf={true}
                            proofManager={proofManager}
                            openModal={openModal}
                            setError={setError}
                            extractTextFromPDFWithMode={documentServices.extractTextFromPDFWithMode}
                            anonymizationEnabled={aiIntegration.aiSettings?.anonymization?.enabled}
                            grokEnabled={aiIntegration.aiSettings?.provider === 'grok'}
                            anonConfig={aiIntegration.aiSettings?.anonymization}
                            nomesParaAnonimizar={aiIntegration.aiSettings?.anonymization?.nomesUsuario || []}
                            editorTheme={appTheme as 'dark' | 'light' | undefined}
                            setTextPreview={setTextPreview}
                          />
                        ))}

                        {/* 🚀 v1.8.2: Componentizado com ProofCard - PROVAS EM TEXTO */}
                        {proofManager.proofTexts.map((proof: Proof) => (
                          <ProofCard
                            key={proof.id}
                            proof={proof}
                            isPdf={false}
                            proofManager={proofManager}
                            openModal={openModal}
                            setError={setError}
                            extractTextFromPDFWithMode={documentServices.extractTextFromPDFWithMode}
                            anonymizationEnabled={aiIntegration.aiSettings?.anonymization?.enabled}
                            grokEnabled={aiIntegration.aiSettings?.provider === 'grok'}
                            anonConfig={aiIntegration.aiSettings?.anonymization}
                            nomesParaAnonimizar={aiIntegration.aiSettings?.anonymization?.nomesUsuario || []}
                            editorTheme={appTheme as 'dark' | 'light' | undefined}
                            setTextPreview={setTextPreview}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'editor' && (
              <div ref={editorContainerRef} className="space-y-6">
                {!editingTopic ? (
                  <div className="text-center py-12 theme-text-muted">
                    <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>Selecione um tópico na aba "Tópicos" para editar</p>
                  </div>
                ) : (
                  <div className="relative grid lg:grid-cols-3 gap-6">
                    {/* v1.32.00: Overlay removido - IA roda em worker */}
                    <div className="lg:col-span-2">
                      {/* Componente ExtraÃ­do - DecisionEditorContainer */}
                      <DecisionEditorContainer
                        ref={editorContainerRef}
                        editorRef={editorRef}
                        relatorioRef={relatorioRef}
                        topic={editingTopic}
                        onSave={saveTopicEdit}
                        onCancel={() => {
                          setLastEditedTopicTitle(editingTopic.title);
                          setEditingTopic(null);
                          modelLibrary.setSuggestions([]);
                          setActiveTab('topics');
                        }}
                        onSaveWithoutClosing={saveTopicEditWithoutClosing}
                        onCategoryChange={handleCategoryChange}
                        onFundamentacaoChange={handleFundamentacaoChange}
                        onRelatorioChange={handleRelatorioChange}
                        onOpenAIAssistant={() => openModal('aiAssistant')}
                        onOpenJurisModal={() => openModal('jurisIndividual')}
                        onExtractModel={confirmExtractModel}
                        onSaveAsModel={saveAsModel}
                        onRegenerateRelatorio={
                          isRelatorio(editingTopic)
                            ? regenerateRelatorioProcessual
                            : regenerateRelatorioWithInstruction
                        }
                        savingTopic={savingTopic}
                        extractingModel={modelLibrary.extractingModelFromDecision}
                        showExtractButton={modelLibrary.showExtractModelButton}
                        regeneratingRelatorio={aiIntegration.regeneratingRelatorio}
                        relatorioInstruction={aiIntegration.relatorioInstruction}
                        onInstructionChange={aiIntegration.setRelatorioInstruction}
                        sanitizeHTML={sanitizeHTML}
                        selectedTopics={selectedTopics}
                        setSelectedTopics={setSelectedTopics}
                        extractedTopics={extractedTopics}
                        setExtractedTopics={setExtractedTopics}
                                              getTopicEditorConfig={getTopicEditorConfig}
                                              quillReady={quillReady}
                        quillError={quillError}
                                              onRegenerateDispositivo={regenerateDispositivoWithInstruction}
                        dispositivoInstruction={aiIntegration.dispositivoInstruction}
                        onDispositivoInstructionChange={aiIntegration.setDispositivoInstruction}
                        regeneratingDispositivo={aiIntegration.regeneratingDispositivo}
                        editorTheme={editorTheme as 'dark' | 'light' | undefined}
                        toggleEditorTheme={toggleEditorTheme}
                        models={modelLibrary.models}
                        onInsertModel={insertModelContent}
                        onPreviewModel={modelPreview.openPreview}
                        findSuggestions={findSuggestions}
                        onSlashCommand={openSlashMenu}
                        isDirty={isIndividualDirty}
                        versioning={fieldVersioning}
                        onOpenFactsComparison={editingTopic?.title?.toUpperCase() !== 'DISPOSITIVO' && editingTopic?.title?.toUpperCase() !== 'RELATÓRIO' ? handleOpenFactsComparisonIndividual : null}
                      />
                    </div>

                    <div className="space-y-4">
                          {/* Painel de Provas Vinculadas */}
                          {linkedProofs.length > 0 && (
                          <div className="theme-bg-green-accent rounded-lg border border-green-500/30 overflow-hidden">
                            <div
                              className="p-4 border-b border-green-500/30 flex items-center justify-between cursor-pointer hover-proof-panel"
                              onClick={() => proofManager.setShowProofPanel(!proofManager.showProofPanel)}
                            >
                              <div className={CSS.flexGap2}>
                                <Scale className="w-5 h-5 theme-text-green" />
                                <h4 className="font-bold theme-text-green">
                                  Provas Vinculadas ({linkedProofs.length})
                                </h4>
                              </div>
                              <button className="theme-text-green hover-text-green-300">
                                {proofManager.showProofPanel ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                              </button>
                            </div>

                            {proofManager.showProofPanel && (
                              <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                                {linkedProofs.map((proof: Proof) => (
                                  <div
                                    key={proof.id}
                                    className="theme-bg-secondary-50 rounded-lg p-3 border theme-border-input"
                                  >
                                    <div className="flex items-center gap-2 mb-2">
                                      <FileText className="w-4 h-4 text-blue-400 flex-shrink-0" />
                                      <h5 className="font-medium theme-text-secondary text-sm flex-1 truncate">{proof.name}</h5>
                                      <span className={`px-2 py-0.5 text-xs rounded ${
                                        (proof.isPdf && proofManager.proofUsePdfMode[proof.id] !== false)
                                          ? 'theme-bg-red-accent theme-text-red'
                                          : 'theme-bg-blue-accent theme-text-blue'
                                      }`}>
                                        {(proof.isPdf && proofManager.proofUsePdfMode[proof.id] !== false) ? 'PDF' : 'TEXTO'}
                                      </span>
                                    </div>

                                    {/* Análise IA */}
                                    {proofManager.proofAnalysisResults[proof.id] && (
                                      <div className="mb-2 p-2 theme-bg-blue-accent border border-blue-500/30 rounded text-xs">
                                        <div className="flex items-center gap-1 mb-1">
                                          <Sparkles className="w-3 h-3 theme-text-blue" />
                                          <span className="font-medium theme-text-blue">
                                            {proofManager.proofAnalysisResults[proof.id].type === 'livre' ? 'Análise Livre' : 'Análise Contextual'}
                                          </span>
                                        </div>
                                        <div className="max-h-32 overflow-y-auto">
                                          <p className="theme-text-tertiary whitespace-pre-wrap">
                                            {proofManager.proofAnalysisResults[proof.id].result}
                                          </p>
                                        </div>
                                      </div>
                                    )}

                                    {/* Conclusões Manuais */}
                                    {proofManager.proofConclusions[proof.id] && (
                                      <div className="p-2 theme-bg-green-accent border border-green-500/30 rounded text-xs">
                                        <div className="flex items-center gap-1 mb-1">
                                          <Edit className="w-3 h-3 theme-text-green" />
                                          <span className="font-medium theme-text-green">Minhas Conclusões</span>
                                        </div>
                                        <div className="max-h-24 overflow-y-auto">
                                          <p className="theme-text-tertiary whitespace-pre-wrap">
                                            {proofManager.proofConclusions[proof.id]}
                                          </p>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          )}

                          <h4 className="font-bold text-purple-400">💡 Sugestões de Modelos</h4>

                      {/* Campo de busca manual */}
                      <div className="theme-bg-secondary-30 rounded-lg p-3 border theme-border-input">
                        <label className={CSS.label}>
                          🔍 Busca Manual
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={modelLibrary.manualSearchTerm}
                            onChange={(e) => {
                              modelLibrary.setManualSearchTerm(e.target.value);
                              // v1.33.19: Só faz busca textual se não estiver em modo semântico
                              if (!useSemanticManualSearch) {
                                modelLibrary.debouncedManualSearch(e.target.value);
                              }
                            }}
                            placeholder={useSemanticManualSearch ? "Busca por significado..." : "Digite para buscar modelos por título, palavras-chave ou conteúdo..."}
                            className="flex-1 px-3 py-2 theme-bg-primary border theme-border-input rounded-lg theme-text-primary text-sm theme-placeholder focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all"
                          />
                          {modelLibrary.manualSearchTerm && (
                            <button
                              onClick={() => {
                                modelLibrary.setManualSearchTerm('');
                                modelLibrary.setManualSearchResults([]);
                                setSemanticManualSearchResults(null);
                              }}
                              className="px-3 py-2 theme-bg-tertiary rounded-lg hover-slate-700 transition-colors text-sm"
                              title="Limpar busca"
                            >
                              ✕
                            </button>
                          )}
                          {/* v1.33.19: Toggle busca semântica/textual */}
                          {searchModelReady && (
                            <button
                              onClick={() => {
                                setUseSemanticManualSearch(prev => !prev);
                                // Limpar resultados ao alternar modo
                                modelLibrary.setManualSearchResults([]);
                                setSemanticManualSearchResults(null);
                              }}
                              className={`px-2 py-1 rounded text-sm transition-colors ${
                                useSemanticManualSearch
                                  ? 'bg-purple-600 text-white hover:bg-purple-700'
                                  : 'theme-bg-tertiary theme-text-secondary hover:bg-slate-600'
                              }`}
                              title={useSemanticManualSearch ? 'Busca semântica (por significado)' : 'Busca textual (por palavras)'}
                            >
                              {useSemanticManualSearch ? '🧠' : '🔤'}
                            </button>
                          )}
                        </div>
                        {semanticManualSearching && (
                          <p className="text-xs text-purple-400 mt-2 flex items-center gap-1">
                            <span className="animate-spin inline-block w-3 h-3 border border-purple-400 border-t-transparent rounded-full"></span>
                            Buscando por significado...
                          </p>
                        )}
                        {!semanticManualSearching && modelLibrary.manualSearchTerm && modelLibrary.manualSearchResults.length > 0 && (
                          <p className="text-xs theme-text-muted mt-2">
                            {modelLibrary.manualSearchResults.length} modelo{modelLibrary.manualSearchResults.length > 1 ? 's' : ''} encontrado{modelLibrary.manualSearchResults.length > 1 ? 's' : ''}
                            {useSemanticManualSearch && <span className="ml-1 text-purple-400">(semântica)</span>}
                          </p>
                        )}
                      </div>

                      {/* Resultados da busca manual */}
                      {modelLibrary.manualSearchResults.length > 0 ? (
                        <div className="space-y-3">
                          <p className="text-sm text-blue-400 font-medium">Resultados da Busca:</p>
                          {modelLibrary.manualSearchResults.map((model, idx) => (
                            <SuggestionCard
                              key={model.id || `manual-${idx}`}
                              model={model}
                              similarity={model.similarity}
                              index={idx}
                              totalSuggestions={modelLibrary.manualSearchResults.length}
                              onPreview={modelPreview.openPreview}
                              onInsert={insertModelContent}
                              sanitizeHTML={sanitizeHTML}
                              showRanking={false}
                            />
                          ))}
                        </div>
                      ) : modelLibrary.manualSearchTerm && modelLibrary.manualSearchResults.length === 0 ? (
                        <p className="theme-text-muted text-sm">Nenhum modelo encontrado para "{modelLibrary.manualSearchTerm}"</p>
                      ) : (
                        <>
                          {/* Sugestões automáticas */}
                          <div className="border-t theme-border-input pt-4">
                            <p className="text-sm theme-text-muted font-medium mb-3 flex items-center gap-2">Sugestões Automáticas:{modelLibrary.suggestionsSource === 'local' && <span className="bg-purple-600 text-white px-1.5 py-0.5 rounded text-[10px]">🤖 IA Local</span>}</p>
                            {modelLibrary.loadingSuggestions ? (
                              <div className="flex flex-col items-center justify-center py-8 space-y-3">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
                                <p className="theme-text-muted text-sm text-center">
                                  Analisando modelos relevantes com IA...
                                </p>
                              </div>
                            ) : modelLibrary.suggestions.length === 0 ? (
                              <p className="theme-text-muted text-sm">Nenhum modelo sugerido automaticamente</p>
                            ) : (
                              <div className="space-y-3">
                                {modelLibrary.suggestions.map((model, idx) => (
                                  <SuggestionCard
                                    key={model.id || idx}
                                    model={model}
                                    similarity={model.similarity}
                                    index={idx}
                                    totalSuggestions={modelLibrary.suggestions.length}
                                    onPreview={modelPreview.openPreview}
                                    onInsert={insertModelContent}
                                    sanitizeHTML={sanitizeHTML}
                                    showRanking={true}
                                  />
                                ))}
                              </div>
                              )
                            }
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'jurisprudencia' && (
              <JurisprudenciaTab
                openModal={openModal}
                closeModal={closeModal}
                modals={modals}
                isReadOnly={!primaryTabLock.isPrimaryTab}
                jurisSemanticEnabled={aiIntegration.aiSettings.jurisSemanticEnabled}
                searchModelReady={searchModelReady}
                jurisEmbeddingsCount={jurisEmbeddingsCount}
                jurisSemanticThreshold={aiIntegration.aiSettings.jurisSemanticThreshold}
              />
            )}

            {activeTab === 'legislacao' && (
              <LegislacaoTab
                openModal={openModal}
                closeModal={closeModal}
                modals={modals}
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
                modals={modals}
                openModal={openModal}
                closeModal={closeModal}
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

      <ExportModal
        isOpen={modals.export}
        onClose={() => closeModal('export')}
        exportedText={exportedText}
        exportedHtml={exportedHtml}
        copySuccess={copySuccess}
        setCopySuccess={setCopySuccess}
        setError={setError}
      />

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

      {/* v1.21.21: Modal de opções para revisão de sentença */}
      {modals.sentenceReview && (
        <div className={CSS.modalOverlay}>
          <div className={`${CSS.modalContainer} theme-border-modal theme-modal-glow animate-modal max-w-lg`}>
            <div className={CSS.modalHeader}>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-amber-500/20">
                    <Scale className="w-6 h-6 text-amber-400" />
                  </div>
                  <h3 className="text-lg font-semibold theme-text-primary">Revisar Sentença</h3>
                </div>
                <button
                  onClick={() => closeModal('sentenceReview')}
                  className="p-2 rounded-xl theme-bg-secondary-50 theme-hover-bg transition-colors"
                  title="Fechar"
                >
                  <X className="w-5 h-5 theme-text-tertiary" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm theme-text-tertiary mb-4">
                Análise crítica da decisão buscando omissões, contradições e obscuridades que poderiam fundamentar embargos de declaração.
              </p>
              {/* Radio 1: Apenas decisão */}
              <label className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                reviewScope === 'decisionOnly' ? 'border-amber-500 bg-amber-500/10' : 'theme-border-input theme-bg-secondary-30'
              }`}>
                <input
                  type="radio"
                  name="reviewScope"
                  checked={reviewScope === 'decisionOnly'}
                  onChange={() => setReviewScope('decisionOnly')}
                  className="w-4 h-4 text-amber-600 mt-1"
                />
                <div>
                  <span className="text-sm font-medium theme-text-primary">Apenas a decisão completa</span>
                  <p className="text-xs theme-text-muted mt-1">RELATÓRIO + todos os tópicos (mini-relatórios + decisões) + DISPOSITIVO</p>
                </div>
              </label>
              {/* Radio 2: Decisão + documentos */}
              <label className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                reviewScope === 'decisionWithDocs' ? 'border-amber-500 bg-amber-500/10' : 'theme-border-input theme-bg-secondary-30'
              } ${!(analyzedDocuments?.peticoesText?.length > 0 || analyzedDocuments?.contestacoesText?.length > 0) ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <input
                  type="radio"
                  name="reviewScope"
                  disabled={!(analyzedDocuments?.peticoesText?.length > 0 || analyzedDocuments?.contestacoesText?.length > 0)}
                  checked={reviewScope === 'decisionWithDocs'}
                  onChange={() => (analyzedDocuments?.peticoesText?.length > 0 || analyzedDocuments?.contestacoesText?.length > 0) && setReviewScope('decisionWithDocs')}
                  className="w-4 h-4 text-amber-600 mt-1"
                />
                <div>
                  <span className="text-sm font-medium theme-text-primary">Decisão + peças processuais</span>
                  <p className="text-xs theme-text-muted mt-1">Inclui petição inicial, contestações e documentos complementares</p>
                  {!(analyzedDocuments?.peticoesText?.length > 0 || analyzedDocuments?.contestacoesText?.length > 0) && (
                    <p className="text-xs text-red-400 mt-1">Nenhum documento extraído disponível</p>
                  )}
                </div>
              </label>
            </div>
            <div className={CSS.modalFooter}>
              <button onClick={() => closeModal('sentenceReview')} disabled={generatingReview} className={CSS.btnSecondary}>
                Cancelar
              </button>
              <button
                onClick={reviewSentence}
                disabled={generatingReview}
                className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover-amber-700 disabled:opacity-50"
              >
                {generatingReview ? (
                  <>
                    <div className={CSS.spinner}></div>
                    Analisando...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Iniciar Revisão
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* v1.21.21: Modal de resultado da revisão de sentença */}
      {modals.sentenceReviewResult && reviewResult && (
        <div className={`${CSS.modalOverlay} overflow-auto`}>
          <div className={`${CSS.modalContainer} max-w-5xl w-full max-h-[95vh] flex flex-col my-auto`}>
            <div className={`${CSS.modalHeader} flex-shrink-0`}>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <Scale className="w-6 h-6 text-amber-400" />
                  <div>
                    <h3 className="text-xl font-bold text-amber-400">Revisão Crítica da Sentença</h3>
                    <div className="flex items-center gap-2">
                      <p className="text-sm theme-text-muted">Análise detalhada por IA - revise os apontamentos abaixo</p>
                      {/* v1.36.57: Badge de cache */}
                      {reviewFromCache && (
                        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">
                          📦 Cache
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button onClick={() => closeModal('sentenceReviewResult')} className="p-2 rounded-lg hover-slate-700">
                  <X className="w-5 h-5 theme-text-muted" />
                </button>
              </div>
            </div>
            {/* Aviso */}
            <div className="mx-6 mt-4 p-4 bg-amber-500/15 border border-amber-500/30 rounded-lg flex-shrink-0">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-400 mb-1">REVISÃO POR IA - AVALIE CRITICAMENTE</p>
                  <p className="text-xs theme-text-muted">Esta análise foi gerada por inteligência artificial e pode conter falsos positivos ou não identificar todos os problemas. Use como ferramenta de apoio, não como decisão final.</p>
                </div>
              </div>
            </div>
            {/* Conteúdo com scroll */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div
                className="prose prose-sm max-w-none theme-text-secondary dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: sanitizeHTML(reviewResult) }}
              />
            </div>
            {/* Footer */}
            <div className={`${CSS.modalFooter} flex-shrink-0`}>
              <button
                onClick={async () => {
                  try {
                    // v1.25.18: Usar helper ao invés de DOM (memory leak fix)
                    const plainText = extractPlainText(reviewResult);
                    await navigator.clipboard.writeText(plainText);
                    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
                    setCopySuccess(true);
                    copyTimeoutRef.current = setTimeout(() => setCopySuccess(false), 3000);
                  } catch (err) {
                    setError('Erro ao copiar: ' + (err as Error).message);
                  }
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg ${copySuccess ? 'bg-green-600 text-white' : 'theme-bg-secondary hover-slate-600'}`}
              >
                {copySuccess ? (
                  <><Check className="w-4 h-4" /> Copiado!</>
                ) : (
                  <><Copy className="w-4 h-4" /> Copiar Texto</>
                )}
              </button>
              {/* v1.36.57: Botão Regenerar (limpa cache e gera novamente) */}
              <button
                onClick={async () => {
                  await sentenceReviewCache.deleteReview(reviewScope);
                  closeModal('sentenceReviewResult');
                  openModal('sentenceReview');
                }}
                className="flex items-center gap-2 px-4 py-2 theme-bg-secondary hover-slate-600 rounded-lg"
                title="Limpar cache e gerar nova revisão"
              >
                <RotateCcw className="w-4 h-4" /> Regenerar
              </button>
              <button
                onClick={() => closeModal('sentenceReviewResult')}
                className="px-6 py-2 bg-amber-600 text-white rounded-lg hover-amber-700"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      <RenameTopicModal
        isOpen={modals.rename}
        onClose={() => closeModal('rename')}
        topicToRename={topicToRename}
        setTopicToRename={setTopicToRename}
        newTopicName={newTopicName}
        setNewTopicName={setNewTopicName}
        handleRenameTopic={handleRenameTopic}
        isRegenerating={aiIntegration.regenerating}
        hasDocuments={!!(analyzedDocuments.peticoes?.length > 0 || analyzedDocuments.peticoesText?.length > 0)}
      />

      <DeleteTopicModal
        isOpen={modals.deleteTopic}
        onClose={() => closeModal('deleteTopic')}
        topicToDelete={topicToDelete}
        setTopicToDelete={setTopicToDelete}
        onConfirmDelete={confirmDeleteTopic}
      />

      <MergeTopicsModal
        isOpen={modals.merge}
        onClose={() => closeModal('merge')}
        topicsToMerge={topicsToMerge}
        onConfirmMerge={handleMergeTopics}
        isRegenerating={aiIntegration.regenerating}
        hasDocuments={!!(analyzedDocuments.peticoes?.length > 0 || analyzedDocuments.peticoesText?.length > 0)}
      />

      <SplitTopicModal
        isOpen={modals.split}
        onClose={() => closeModal('split')}
        topicToSplit={topicToSplit}
        setTopicToSplit={setTopicToSplit}
        splitNames={splitNames}
        setSplitNames={setSplitNames}
        onConfirmSplit={handleSplitTopic}
        isRegenerating={aiIntegration.regenerating}
        hasDocuments={!!(analyzedDocuments.peticoes?.length > 0 || analyzedDocuments.peticoesText?.length > 0)}
      />

      <NewTopicModal
        isOpen={modals.newTopic}
        onClose={() => closeModal('newTopic')}
        newTopicData={newTopicData}
        setNewTopicData={setNewTopicData}
        onConfirmCreate={handleCreateNewTopic}
        isRegenerating={aiIntegration.regenerating}
        hasDocuments={!!(analyzedDocuments.peticoes?.length > 0 || analyzedDocuments.peticoesText?.length > 0)}
      />

      <AIAssistantModal
        isOpen={modals.aiAssistant}
        onClose={() => {
          closeModal('aiAssistant');
          chatAssistant.clear();
        }}
        contextScope={topicContextScope}
        setContextScope={setTopicContextScope}
        topicTitle={editingTopic?.title}
        chatHistory={chatAssistant.history}
        onSendMessage={handleSendChatMessage}
        onInsertResponse={handleInsertChatResponse}
        generating={chatAssistant.generating}
        onClear={chatAssistant.clear}
        lastResponse={chatAssistant.lastResponse}
        sanitizeHTML={sanitizeHTML}
        quickPrompts={aiIntegration.aiSettings.quickPrompts}
        proofManager={proofManager}
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
      <DriveFilesModal
        isOpen={driveFilesModalOpen}
        onClose={() => setDriveFilesModalOpen(false)}
        files={driveFiles}
        isLoading={googleDrive.isLoading}
        onLoad={async (file: DriveFile) => {
          try {
            const projectData = await googleDrive.loadFile(file.id);
            // Simular evento de importação de arquivo
            const callbacks = {
              setPastedPeticaoTexts,
              setPastedContestacaoTexts,
              setPastedComplementaryTexts,
              setExtractedTopics,
              setSelectedTopics,
              setPartesProcesso,
              setAnalyzedDocuments,
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
              setAiSettings: aiIntegration.setAiSettings,
              setError,
              setProcessoNumero,
              setPeticaoFiles,
              setContestacaoFiles,
              setComplementaryFiles,
              setExtractedTexts,
              setDocumentProcessingModes,
              setTokenMetrics: aiIntegration.setTokenMetrics
            };
            await storage.importProjectFromJson(projectData as ImportedProject, callbacks, async (allStates) => {
              await storage.autoSaveSession(allStates, (err) => err && setError(err), true);
            });
            setDriveFilesModalOpen(false);
            setError({ type: 'success', message: `Projeto carregado do Google Drive: ${file.name}` });
          } catch (err) {
            setError({ type: 'error', message: `Erro ao carregar projeto: ${(err as Error).message}` });
          }
        }}
        onDelete={async (file: DriveFile) => {
          try {
            await googleDrive.deleteFile(file.id);
            setDriveFiles(prev => prev.filter(f => f.id !== file.id));
            setError({ type: 'success', message: `Arquivo excluído: ${file.name}` });
          } catch (err) {
            setError({ type: 'error', message: `Erro ao excluir: ${(err as Error).message}` });
          }
        }}
        onShare={async (fileId, email, role) => {
          try {
            await googleDrive.shareFile(fileId, email, role as 'writer' | 'reader');
            const roleText = role === 'writer' ? 'edição' : 'visualização';
            setError({ type: 'success', message: `Compartilhado com ${email} (${roleText})` });
          } catch (err) {
            setError({ type: 'error', message: `Erro ao compartilhar: ${(err as Error).message}` });
          }
        }}
        onRefresh={async () => {
          try {
            const files = await googleDrive.listFiles();
            setDriveFiles(files);
          } catch (err) {
            setError({ type: 'error', message: `Erro ao atualizar: ${(err as Error).message}` });
          }
        }}
        onGetPermissions={googleDrive.getPermissions}
        onRemovePermission={googleDrive.removePermission}
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


      {/* v1.37.30: ConfigModal extraído para src/components/modals/ConfigModal.tsx */}
      <ConfigModal
        isOpen={modals.settings}
        onClose={() => closeModal('settings')}
        aiSettings={aiIntegration.aiSettings}
        setAiSettings={aiIntegration.setAiSettings}
        tokenMetrics={aiIntegration.tokenMetrics}
        getModelDisplayName={aiIntegration.getModelDisplayName}
        modelsCount={modelLibrary.models.length}
        legislacaoCount={legislacao.artigos?.length || 0}
        jurisprudenciaCount={jurisprudencia.precedentes?.length || 0}
        nerEnabled={nerEnabled}
        setNerEnabled={setNerEnabled}
        nerIncludeOrg={nerIncludeOrg}
        setNerIncludeOrg={setNerIncludeOrg}
        nerModelReady={nerModelReady}
        setNerModelReady={setNerModelReady}
        nerInitializing={nerInitializing}
        nerDownloadProgress={nerDownloadProgress}
        initNerModel={initNerModel}
        searchEnabled={searchEnabled}
        setSearchEnabled={setSearchEnabled}
        searchModelReady={searchModelReady}
        setSearchModelReady={setSearchModelReady}
        searchInitializing={searchInitializing}
        searchDownloadProgress={searchDownloadProgress}
        initSearchModel={initSearchModel}
        handleSearchToggle={handleSearchToggle}
        handleLegislacaoToggle={handleLegislacaoToggle}
        handleJurisToggle={handleJurisToggle}
        handleModelToggle={handleModelToggle}
        claudeTestStatus={claudeTestStatus}
        setClaudeTestStatus={setClaudeTestStatus}
        geminiTestStatus={geminiTestStatus}
        setGeminiTestStatus={setGeminiTestStatus}
        openaiTestStatus={openaiTestStatus}
        setOpenaiTestStatus={setOpenaiTestStatus}
        grokTestStatus={grokTestStatus}
        setGrokTestStatus={setGrokTestStatus}
        embeddingsCount={embeddingsCount}
        jurisEmbeddingsCount={jurisEmbeddingsCount}
        modelEmbeddingsCount={modelEmbeddingsCount}
        generatingModelEmbeddings={generatingModelEmbeddings}
        modelEmbeddingsProgress={modelEmbeddingsProgress}
        clearEmbeddings={clearEmbeddings}
        clearJurisEmbeddings={clearJurisEmbeddings}
        clearModelEmbeddings={clearModelEmbeddings}
        generateModelEmbeddings={generateModelEmbeddings}
        setShowDataDownloadModal={setShowDataDownloadModal}
        setShowEmbeddingsDownloadModal={setShowEmbeddingsDownloadModal}
        setDataDownloadStatus={setDataDownloadStatus}
        exportAiSettings={exportAiSettings}
        importAiSettings={importAiSettings}
        openModelGenerator={openModelGenerator}
        showToast={showToast}
        draggedComplementaryIndex={draggedComplementaryIndex}
        dragOverComplementaryIndex={dragOverComplementaryIndex}
        handleComplementaryDragStart={handleComplementaryDragStart}
        handleComplementaryDragEnd={handleComplementaryDragEnd}
        handleComplementaryDragOver={handleComplementaryDragOver}
        handleComplementaryDragLeave={handleComplementaryDragLeave}
        handleComplementaryDrop={handleComplementaryDrop}
        API_BASE={API_BASE}
      />

      {/* v1.32.24: Modal de Changelog - v1.33.51: migrado para BaseModal */}
      <BaseModal
        isOpen={showChangelogModal}
        onClose={() => setShowChangelogModal(false)}
        title="Histórico de Alterações"
        icon={<Clock />}
        iconColor="blue"
        size="md"
      >
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {CHANGELOG.map((item, i: number) => (
            <div key={i} className="mb-3 pb-3 border-b theme-border-secondary last:border-0">
              <span className="text-blue-400 font-mono text-sm font-semibold">v{item.version}</span>
              <p className="theme-text-secondary text-sm mt-1">{item.feature}</p>
            </div>
          ))}
        </div>
      </BaseModal>

      {/* 📥 v1.33.61: Modal de Download de Dados Essenciais (legislação e jurisprudência) - v1.35.67: migrado para BaseModal */}
      <BaseModal
        isOpen={showDataDownloadModal}
        onClose={handleDismissDataPrompt}
        title="Baixar Base de Dados"
        icon={<Download />}
        iconColor="blue"
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <button
              onClick={handleDismissDataPrompt}
              disabled={dataDownloadStatus.legislacao.downloading || dataDownloadStatus.jurisprudencia.downloading}
              className="px-4 py-2 text-sm theme-text-secondary hover:theme-text-primary disabled:opacity-50"
            >
              Depois
            </button>
            <button
              onClick={handleStartDataDownload}
              disabled={dataDownloadStatus.legislacao.downloading || dataDownloadStatus.jurisprudencia.downloading ||
                       (!dataDownloadStatus.legislacao.needed && !dataDownloadStatus.jurisprudencia.needed)}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {(dataDownloadStatus.legislacao.downloading || dataDownloadStatus.jurisprudencia.downloading) ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> Baixando...</>
              ) : (
                <><Download className="w-4 h-4" /> Baixar Agora</>
              )}
            </button>
          </div>
        }
      >
        <div className="p-4 space-y-4">
          <p className="text-sm theme-text-secondary">
            Para usar o Sentencify, é necessário baixar a base de dados de legislação e jurisprudência (~5 MB total, download único e rápido).
          </p>

          {/* Legislação */}
          {dataDownloadStatus.legislacao.needed && (
            <div className="p-3 rounded-lg theme-bg-secondary border theme-border-input">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium theme-text-primary">📜 Legislação (~3 MB)</span>
                {dataDownloadStatus.legislacao.downloading && (
                  <span className="text-xs theme-text-muted">
                    {Math.round(dataDownloadStatus.legislacao.progress * 100)}%
                  </span>
                )}
                {dataDownloadStatus.legislacao.completed && (
                  <span className="text-xs text-green-500">✓ Concluído</span>
                )}
              </div>
              {dataDownloadStatus.legislacao.downloading && (
                <div className="h-2 bg-gray-600 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${dataDownloadStatus.legislacao.progress * 100}%` }}
                  />
                </div>
              )}
              {dataDownloadStatus.legislacao.error && (
                <p className="text-xs text-red-400 mt-1">{dataDownloadStatus.legislacao.error}</p>
              )}
            </div>
          )}

          {/* Jurisprudência */}
          {dataDownloadStatus.jurisprudencia.needed && (
            <div className="p-3 rounded-lg theme-bg-secondary border theme-border-input">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium theme-text-primary">⚖️ Jurisprudência (~2 MB)</span>
                {dataDownloadStatus.jurisprudencia.downloading && (
                  <span className="text-xs theme-text-muted">
                    {Math.round(dataDownloadStatus.jurisprudencia.progress * 100)}%
                  </span>
                )}
                {dataDownloadStatus.jurisprudencia.completed && (
                  <span className="text-xs text-green-500">✓ Concluído</span>
                )}
              </div>
              {dataDownloadStatus.jurisprudencia.downloading && (
                <div className="h-2 bg-gray-600 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all duration-300"
                    style={{ width: `${dataDownloadStatus.jurisprudencia.progress * 100}%` }}
                  />
                </div>
              )}
              {dataDownloadStatus.jurisprudencia.error && (
                <p className="text-xs text-red-400 mt-1">{dataDownloadStatus.jurisprudencia.error}</p>
              )}
            </div>
          )}

          {/* Mensagem se ambos já foram baixados */}
          {!dataDownloadStatus.legislacao.needed && !dataDownloadStatus.jurisprudencia.needed && (
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
              <p className="text-sm text-green-400 flex items-center gap-2">
                <Check className="w-4 h-4" /> Base de dados instalada!
              </p>
            </div>
          )}
        </div>
      </BaseModal>

      {/* 🌐 v1.33.0: Modal de Download de Embeddings do CDN - v1.35.67: migrado para BaseModal */}
      <BaseModal
        isOpen={showEmbeddingsDownloadModal}
        onClose={handleDismissEmbeddingsPrompt}
        title="Baixar Dados para Busca Semântica"
        icon={<Download />}
        iconColor="blue"
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <button
              onClick={handleDismissEmbeddingsPrompt}
              disabled={embeddingsDownloadStatus.legislacao.downloading || embeddingsDownloadStatus.jurisprudencia.downloading}
              className="px-4 py-2 text-sm theme-text-secondary hover:theme-text-primary disabled:opacity-50"
            >
              Depois
            </button>
            <button
              onClick={handleStartEmbeddingsDownload}
              disabled={embeddingsDownloadStatus.legislacao.downloading || embeddingsDownloadStatus.jurisprudencia.downloading ||
                       (!embeddingsDownloadStatus.legislacao.needed && !embeddingsDownloadStatus.jurisprudencia.needed)}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {(embeddingsDownloadStatus.legislacao.downloading || embeddingsDownloadStatus.jurisprudencia.downloading) ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> Baixando...</>
              ) : (
                <><Download className="w-4 h-4" /> Baixar Agora</>
              )}
            </button>
          </div>
        }
      >
        <div className="p-4 space-y-4">
          <p className="text-sm theme-text-secondary">
            Para usar a busca semântica de legislação e jurisprudência, é necessário baixar os dados de embeddings (~250 MB total, download único).
          </p>

          {/* Legislação */}
          {embeddingsDownloadStatus.legislacao.needed && (
            <div className="p-3 rounded-lg theme-bg-secondary border theme-border-input">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium theme-text-primary">📜 Legislação (~211 MB)</span>
                {embeddingsDownloadStatus.legislacao.downloading && (
                  <span className="text-xs theme-text-muted">
                    {Math.round(embeddingsDownloadStatus.legislacao.progress * 100)}%
                  </span>
                )}
                {!embeddingsDownloadStatus.legislacao.needed && embeddingsDownloadStatus.legislacao.progress === 1 && (
                  <span className="text-xs text-green-500">✓ Concluído</span>
                )}
              </div>
              {embeddingsDownloadStatus.legislacao.downloading && (
                <div className="h-2 bg-gray-600 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${embeddingsDownloadStatus.legislacao.progress * 100}%` }}
                  />
                </div>
              )}
              {embeddingsDownloadStatus.legislacao.error && (
                <p className="text-xs text-red-400 mt-1">{embeddingsDownloadStatus.legislacao.error}</p>
              )}
            </div>
          )}

          {/* Jurisprudência */}
          {embeddingsDownloadStatus.jurisprudencia.needed && (
            <div className="p-3 rounded-lg theme-bg-secondary border theme-border-input">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium theme-text-primary">📚 Jurisprudência (~38 MB)</span>
                {embeddingsDownloadStatus.jurisprudencia.downloading && (
                  <span className="text-xs theme-text-muted">
                    {Math.round(embeddingsDownloadStatus.jurisprudencia.progress * 100)}%
                  </span>
                )}
                {!embeddingsDownloadStatus.jurisprudencia.needed && embeddingsDownloadStatus.jurisprudencia.progress === 1 && (
                  <span className="text-xs text-green-500">✓ Concluído</span>
                )}
              </div>
              {embeddingsDownloadStatus.jurisprudencia.downloading && (
                <div className="h-2 bg-gray-600 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all duration-300"
                    style={{ width: `${embeddingsDownloadStatus.jurisprudencia.progress * 100}%` }}
                  />
                </div>
              )}
              {embeddingsDownloadStatus.jurisprudencia.error && (
                <p className="text-xs text-red-400 mt-1">{embeddingsDownloadStatus.jurisprudencia.error}</p>
              )}
            </div>
          )}

          {/* Mensagem se ambos já foram baixados */}
          {!embeddingsDownloadStatus.legislacao.needed && !embeddingsDownloadStatus.jurisprudencia.needed && (
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
              <p className="text-sm text-green-400 flex items-center gap-2">
                <Check className="w-4 h-4" /> Todos os embeddings já estão instalados!
              </p>
            </div>
          )}
        </div>
      </BaseModal>

      {/* Modal de Restaurar Sessão */}
      <RestoreSessionModal
        isOpen={modals.restoreSession}
        onClose={() => closeModal('restoreSession')}
        sessionLastSaved={storage.sessionLastSaved}
        onRestoreSession={() => {
          const callbacks = {
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
          };
          storage.restoreSession(callbacks);
        }}
        onStartNew={() => {
          closeModal('restoreSession');
          openModal('clearProject');
        }}
      />

      {/* Modal de Confirmação de Limpeza de Projeto */}
      <ClearProjectModal
        isOpen={modals.clearProject}
        onClose={() => {
          closeModal('clearProject');
          openModal('restoreSession');
        }}
        onConfirmClear={() => {
          const callbacks = {
            // Callbacks de restauração
            setPastedPeticaoTexts,
            setPastedContestacaoTexts,
            setPastedComplementaryTexts,
            setExtractedTopics,
            setSelectedTopics,
            setPartesProcesso,
            setAnalyzedDocuments,
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
            // Callbacks adicionais para limpeza (múltiplos)
            setPeticaoFiles,
            setContestacaoFiles,
            setComplementaryFiles,
            // v1.13.7: Adicionar setters de textos extraídos e modos de processamento
            setExtractedTexts,
            setDocumentProcessingModes,
            setProofToDelete: proofManager.setProofToDelete,
            setProofToLink: proofManager.setProofToLink,
            setProofToAnalyze: proofManager.setProofToAnalyze,
            clearAnalyzingProofs: proofManager.clearAnalyzingProofs,
            setShowProofPanel: proofManager.setShowProofPanel,
            setNewProofTextData: proofManager.setNewProofTextData,
            setTokenMetrics: aiIntegration.setTokenMetrics // v1.20.3: Contador de tokens
          };
          storage.clearProject(callbacks);
          // v1.25.19: Limpar nomes de anonimização ao limpar projeto
          aiIntegration.setAiSettings(prev => ({
            ...prev,
            anonymization: { ...prev.anonymization, nomesUsuario: [] }
          }));
          setAnonymizationNamesText('');
        }}
      />

      {/* v1.33.57: Modal de Confirmação de Logout */}
      {onLogout && (
        <LogoutConfirmModal
          isOpen={modals.logout}
          onClose={() => closeModal('logout')}
          onConfirm={() => {
            closeModal('logout');
            onLogout();
            window.location.reload();
          }}
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
      <DeleteModelModal
        isOpen={modals.deleteModel}
        onClose={() => closeModal('deleteModel')}
        modelToDelete={modelLibrary.modelToDelete}
        setModelToDelete={modelLibrary.setModelToDelete}
        onConfirmDelete={executeDeleteModel}
      />

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
      <SimilarityWarningModal
        warning={modelLibrary.similarityWarning}
        saving={savingFromSimilarity}
        onCancel={handleSimilarityCancel}
        onSaveNew={handleSimilaritySaveNew}
        onReplace={handleSimilarityReplace}
        sanitizeHTML={sanitizeHTML}
      />

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
      <BulkDiscardConfirmModal
        isOpen={modals.bulkDiscardConfirm}
        onClose={() => {
          closeModal('bulkDiscardConfirm');
          openModal('bulkReview'); // Reabre o modal de revisão se cancelar
        }}
        totalModels={modelLibrary.bulkReviewModels.length}
        onConfirm={() => {
          closeModal('bulkDiscardConfirm');
          closeModal('bulkModal');
          modelLibrary.resetBulkState();
        }}
      />

      {/* v1.5.15: Modal de Confirmação - Cancelar Processamento */}
      <ConfirmBulkCancelModal
        isOpen={modals.confirmBulkCancel}
        onClose={() => closeModal('confirmBulkCancel')}
        filesInProgress={getBulkPendingFilesCount()}
        onConfirm={handleConfirmBulkCancel}
      />

      {/* ============= FIM DOS MODAIS DE GERAÇÃO EM MASSA ============= */}

      {/* Modal de Confirmação de Exclusão em Massa */}
      <DeleteAllModelsModal
        isOpen={modals.deleteAllModels}
        onClose={() => closeModal('deleteAllModels')}
        totalModels={modelLibrary.models.length}
        confirmText={modelLibrary.deleteAllConfirmText}
        setConfirmText={modelLibrary.setDeleteAllConfirmText}
        onConfirmDelete={deleteAllModels}
      />


      {/* Modal de Confirmação - Extrair Modelo */}
      <ExtractModelConfirmModal
        isOpen={modals.extractModelConfirm}
        onClose={() => closeModal('extractModelConfirm')}
        editingTopic={editingTopic}
        editorRef={editorRef}
        onConfirmExtract={extractModelFromDecisionText}
      />

      {/* Modal de Preview/Edição - Modelo Extraído */}
      <ExtractedModelPreviewModal
        isOpen={modals.extractedModelPreview}
        onClose={() => closeModal('extractedModelPreview')}
        extractedModel={modelLibrary.extractedModelPreview}
        setExtractedModel={modelLibrary.setExtractedModelPreview}
        onSave={saveExtractedModel}
        onCancel={cancelExtractedModel}
        sanitizeHTML={sanitizeHTML}
      />

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

      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed top-4 left-4 z-[9999] animate-slide-in-right">
          <div className={`
            rounded-lg shadow-2xl border p-4 min-w-[320px] max-w-md
            ${toast.type === 'success' ? 'theme-toast-success' : ''}
            ${toast.type === 'error' ? 'theme-toast-error' : ''}
            ${toast.type === 'info' ? 'theme-toast-info' : ''}
            ${toast.type === 'warning' ? 'theme-toast-warning' : ''}
          `}>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 text-2xl">
                {toast.type === 'success' && '✅'}
                {toast.type === 'error' && '❌'}
                {toast.type === 'info' && 'ℹ️'}
                {toast.type === 'warning' && '⚠️'}
              </div>
              <div className="flex-1">
                <p className="text-sm theme-text-primary whitespace-pre-line">{toast.message}</p>
              </div>
              <button
                onClick={clearToast}
                className="flex-shrink-0 text-white/60 hover-text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* v1.4.6: Removido Mini-toolbar flutuante (76 linhas) */}
      {/* v1.4.8: Removido Toolbar Fixa no Topo (82 linhas) - não mais necessária com editor de altura fixa */}

      {/* Modal: Adicionar Prova (Texto) */}
      <AddProofTextModal
        isOpen={modals.addProofText}
        onClose={() => closeModal('addProofText')}
        newProofData={proofManager.newProofTextData}
        setNewProofData={proofManager.setNewProofTextData}
        onAddProof={() => {
          if (proofManager.newProofTextData.text.trim()) {
            const anonConfig = aiIntegration?.aiSettings?.anonymization;
            const anonymizationEnabled = anonConfig?.enabled;

            // v1.21.3: Se anonimização ativa, abrir modal para confirmar nomes
            if (anonymizationEnabled) {
              proofManager.setPendingProofText({
                name: proofManager.newProofTextData.name.trim() || 'Prova (texto)',
                text: proofManager.newProofTextData.text.trim()
              });
              closeModal('addProofText');
              openModal('proofTextAnonymization');
            } else {
              // Salvar diretamente sem anonimização
              const id = Date.now() + Math.random();
              const name = proofManager.newProofTextData.name.trim() || 'Prova (texto)';
              proofManager.setProofTexts(prev => [...prev, {
                id,
                text: proofManager.newProofTextData.text.trim(),
                name,
                type: 'text',
                uploadDate: new Date().toISOString()
              }]);
              closeModal('addProofText');
              proofManager.setNewProofTextData({ name: '', text: '' });
            }
          }
        }}
      />

      {/* v1.21.3: Modal de Nomes para Anonimização de Prova de Texto */}
      <AnonymizationNamesModal
        isOpen={modals.proofTextAnonymization}
        onClose={() => {
          closeModal('proofTextAnonymization');
          proofManager.setPendingProofText(null);
          proofManager.setNewProofTextData({ name: '', text: '' });
        }}
        onConfirm={(nomes: string[]) => {
          if (proofManager.pendingProofText) {
            const anonConfig = aiIntegration?.aiSettings?.anonymization;
            // Persistir nomes para uso futuro
            aiIntegration.setAiSettings((prev: AISettings) => ({
              ...prev,
              anonymization: {
                ...prev.anonymization,
                nomesUsuario: nomes
              }
            }));
            // Anonimizar e salvar prova
            const pendingProof = proofManager.pendingProofText;
            if (!pendingProof) return;
            const id = Date.now() + Math.random();
            const anonText = anonymizeText(pendingProof.text, anonConfig, nomes);
            proofManager.setProofTexts((prev: ProofText[]) => [...prev, {
              id,
              text: anonText,
              name: pendingProof.name,
              type: 'text',
              uploadDate: new Date().toISOString()
            }]);
            closeModal('proofTextAnonymization');
            proofManager.setPendingProofText(null);
            proofManager.setNewProofTextData({ name: '', text: '' });
            showToast('✅ Prova de texto adicionada com anonimização', 'success');
          }
        }}
        nomesTexto={anonymizationNamesText}
        setNomesTexto={setAnonymizationNamesText}
        nerEnabled={nerEnabled}
        detectingNames={detectingNames}
        onDetectNames={async () => {
          setDetectingNames(true);
          try { await detectarNomesAutomaticamente(proofManager.pendingProofText?.text, true); }
          catch { setDetectingNames(false); }
        }}
        onOpenAiSettings={() => { closeModal('proofTextAnonymization'); openModal('settings'); }}
      />

      {/* v1.21.5: Modal de Nomes para Anonimização de Extração de PDF */}
      <AnonymizationNamesModal
        isOpen={modals.proofExtractionAnonymization}
        onClose={() => {
          closeModal('proofExtractionAnonymization');
          proofManager.setPendingExtraction(null);
        }}
        onConfirm={(nomes: string[]) => {
          if (proofManager.pendingExtraction) {
            // Persistir nomes para uso futuro
            aiIntegration.setAiSettings((prev: AISettings) => ({
              ...prev,
              anonymization: {
                ...prev.anonymization,
                nomesUsuario: nomes
              }
            }));
            // Executar extração com nomes confirmados
            proofManager.pendingExtraction?.executeExtraction?.(nomes);
            closeModal('proofExtractionAnonymization');
            proofManager.setPendingExtraction(null);
            showToast('📝 Extraindo texto com anonimização...', 'info');
          }
        }}
        nomesTexto={anonymizationNamesText}
        setNomesTexto={setAnonymizationNamesText}
        nerEnabled={nerEnabled}
        detectingNames={detectingNames}
        onDetectNames={async () => {
          // v1.36.40: Fix - usar extractTextFromPDFWithMode com modo selecionado (Tesseract, etc.)
          setDetectingNames(true);
          try {
            const proofId = proofManager.pendingExtraction?.proofId;
            const proof = proofManager.pendingExtraction?.proof as ProofFile | undefined;

            if (!proof || !proof.file) {
              showToast('Prova não encontrada ou arquivo indisponível', 'error');
              setDetectingNames(false);
              return;
            }

            // Usar o modo de extração selecionado pelo usuário
            const userMode = proofManager.proofProcessingModes[proofId as string] || 'pdfjs';
            // Bloquear modos binários (anonimização sempre exige texto)
            const blockedModes = ['claude-vision', 'pdf-puro'];
            const selectedMode = blockedModes.includes(userMode) ? 'pdfjs' : userMode;

            // Extrair texto com o modo correto (PDF.js ou Tesseract)
            const extractedText = await documentServices.extractTextFromPDFWithMode(proof.file, selectedMode, null);

            if (extractedText && extractedText.trim().length > 50) {
              await detectarNomesAutomaticamente(extractedText, true);
            } else {
              showToast('PDF sem texto extraível. Tente modo Tesseract OCR.', 'error');
              setDetectingNames(false);
            }
          } catch (err) {
            console.error('[NER] Erro ao extrair PDF para NER:', err);
            showToast('Erro ao extrair texto do PDF', 'error');
            setDetectingNames(false);
          }
        }}
        onOpenAiSettings={() => { closeModal('proofExtractionAnonymization'); openModal('settings'); }}
      />

      {/* v1.21.16: Modal de Preview de Texto Extraído */}
      <TextPreviewModal
        isOpen={textPreview.isOpen}
        onClose={() => setTextPreview({ isOpen: false, title: '', text: '' })}
        title={textPreview.title}
        text={textPreview.text}
      />

      {/* Modal: Seleção de Tipo de Análise de Prova */}
      <ProofAnalysisModal
        isOpen={modals.proofAnalysis}
        onClose={() => {
          closeModal('proofAnalysis');
          proofManager.setProofToAnalyze(null);
          proofManager.setProofAnalysisCustomInstructions('');
          proofManager.setUseOnlyMiniRelatorios(false);
          proofManager.setIncludeLinkedTopicsInFree(false);
        }}
        proofToAnalyze={proofManager.proofToAnalyze}
        customInstructions={proofManager.proofAnalysisCustomInstructions}
        setCustomInstructions={proofManager.setProofAnalysisCustomInstructions}
        useOnlyMiniRelatorios={proofManager.useOnlyMiniRelatorios}
        setUseOnlyMiniRelatorios={proofManager.setUseOnlyMiniRelatorios}
        includeLinkedTopicsInFree={proofManager.includeLinkedTopicsInFree}
        setIncludeLinkedTopicsInFree={proofManager.setIncludeLinkedTopicsInFree}
        proofTopicLinks={proofManager.proofTopicLinks}
        editorTheme={editorTheme}
        onAnalyzeContextual={async () => {
          closeModal('proofAnalysis');
          if (proofManager.proofToAnalyze) {
            await analyzeProof(proofManager.proofToAnalyze, 'contextual', proofManager.proofAnalysisCustomInstructions, proofManager.useOnlyMiniRelatorios, false);
          }
          proofManager.setProofToAnalyze(null);
          proofManager.setProofAnalysisCustomInstructions('');
          proofManager.setUseOnlyMiniRelatorios(false);
          proofManager.setIncludeLinkedTopicsInFree(false);
        }}
        onAnalyzeFree={async () => {
          closeModal('proofAnalysis');
          if (proofManager.proofToAnalyze) {
            await analyzeProof(proofManager.proofToAnalyze, 'livre', proofManager.proofAnalysisCustomInstructions, false, proofManager.includeLinkedTopicsInFree);
          }
          proofManager.setProofToAnalyze(null);
          proofManager.setProofAnalysisCustomInstructions('');
          proofManager.setUseOnlyMiniRelatorios(false);
          proofManager.setIncludeLinkedTopicsInFree(false);
        }}
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

      {/* Modal: Confirmar Exclusão de Prova */}
      <DeleteProofModal
        isOpen={modals.deleteProof}
        onClose={() => {
          closeModal('deleteProof');
          proofManager.setProofToDelete(null);
        }}
        proofToDelete={proofManager.proofToDelete}
        onConfirmDelete={async () => {
          const proofToDelete = proofManager.proofToDelete;
          if (!proofToDelete) return;

          // v1.36.32: Limpar IndexedDB se for PDF
          if (proofToDelete.isPdf || ('type' in proofToDelete && proofToDelete.type === 'pdf')) {
            try {
              await removePdfFromIndexedDB(`proof-${proofToDelete.id}`);
            } catch (err) { }
          }

          // v1.36.32: Usar handler existente do hook (tipagem correta, limpa todos os estados)
          proofManager.handleDeleteProof(proofToDelete);

          closeModal('deleteProof');
          proofManager.setProofToDelete(null);
        }}
      />

      {/* Ícone de Auto-Save Discreto */}
      {storage.showAutoSaveIndicator && (
        <div className="fixed bottom-4 right-4 z-[9999] animate-in fade-in duration-300">
          <div className="theme-autosave p-2 rounded-full shadow-lg border">
            <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
      )}

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

  // v1.35.0: Rota /share/:token abre página de aceite de compartilhamento
  const shareMatch = window.location.pathname.match(/^\/share\/([a-f0-9]+)$/i);

  // v1.34.1: Estado para modelos recebidos do servidor (para merge)
  const [receivedModels, setReceivedModels] = React.useState<Model[] | null>(null);
  // v1.35.24: Lista de bibliotecas compartilhadas ativas (para filtrar modelos de owners revogados)
  const [activeSharedLibraries, setActiveSharedLibraries] = React.useState<Array<{ ownerId: string; ownerEmail: string }> | null>(null);

  // v1.35.1: Memoizar callbacks para evitar re-criação de pull/sync a cada render
  // v1.35.24: Receber sharedLibraries junto com models
  const handleModelsReceived = React.useCallback((models: Model[], sharedLibraries: Array<{ ownerId: string; ownerEmail: string }>) => {
    setReceivedModels(models);
    setActiveSharedLibraries(sharedLibraries || []);
  }, []);
  const clearReceivedModels = React.useCallback(() => {
    setReceivedModels(null);
    setActiveSharedLibraries(null);
  }, []);

  const cloudSync = useCloudSync({
    onModelsReceived: handleModelsReceived
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
