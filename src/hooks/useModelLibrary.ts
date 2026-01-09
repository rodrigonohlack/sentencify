/**
 * 🎣 CUSTOM HOOK: useModelLibrary - Biblioteca de modelos jurídicos
 * Versão simplificada extraída do App.jsx para testes
 *
 * @version 1.35.76 - Migrado para TypeScript
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import type { Model, BulkFile, BulkGeneratedModel, BulkError, NewModelData } from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS (re-exports de types/index.ts)
// ═══════════════════════════════════════════════════════════════════════════

export type { BulkFile, BulkGeneratedModel, BulkError, NewModelData };

/** Modo de visualização dos modelos */
export type ModelViewMode = 'cards' | 'list';

/** Fonte das sugestões */
export type SuggestionsSource = 'local' | 'api' | null;

/** Aviso de similaridade */
export interface SimilarityWarning {
  model: Model;
  similarity: number;
  message?: string;
}

/** Resultado do processamento de arquivo bulk */
export interface BulkProcessedFile {
  file: string;
  status: string;
  modelsCount?: number;
  models?: Model[];
  error?: string;
  duration: string;
}

/** Opções para busca de modelos */
export interface SearchOptions {
  limit?: number | null;
  includeContent?: boolean;
}

/** Retorno do hook useModelLibrary */
export interface UseModelLibraryReturn {
  // --- Seção 1: Dados Core ---
  models: Model[];
  setModels: React.Dispatch<React.SetStateAction<Model[]>>;
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: React.Dispatch<React.SetStateAction<boolean>>;
  isLoadingModels: boolean;
  setIsLoadingModels: React.Dispatch<React.SetStateAction<boolean>>;
  persistenceError: string | null;
  setPersistenceError: React.Dispatch<React.SetStateAction<string | null>>;

  // --- Seção 2: Busca ---
  searchTerm: string;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  selectedCategory: string;
  setSelectedCategory: React.Dispatch<React.SetStateAction<string>>;
  showFavoritesOnly: boolean;
  setShowFavoritesOnly: React.Dispatch<React.SetStateAction<boolean>>;
  currentModelPage: number;
  setCurrentModelPage: React.Dispatch<React.SetStateAction<number>>;
  manualSearchTerm: string;
  setManualSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  manualSearchResults: Model[];
  setManualSearchResults: React.Dispatch<React.SetStateAction<Model[]>>;
  suggestions: Model[];
  setSuggestions: React.Dispatch<React.SetStateAction<Model[]>>;
  suggestionsSource: SuggestionsSource;
  setSuggestionsSource: React.Dispatch<React.SetStateAction<SuggestionsSource>>;
  loadingSuggestions: boolean;
  setLoadingSuggestions: React.Dispatch<React.SetStateAction<boolean>>;
  modelViewMode: ModelViewMode;
  setModelViewMode: React.Dispatch<React.SetStateAction<ModelViewMode>>;
  modelsPerPage: number;
  performManualSearch: (term: string) => void;
  debouncedManualSearch: (term: string) => void;

  // --- Seção 3: Formulário ---
  newModel: NewModelData;
  setNewModel: React.Dispatch<React.SetStateAction<NewModelData>>;
  editingModel: Model | null;
  setEditingModel: React.Dispatch<React.SetStateAction<Model | null>>;
  extractingModelFromDecision: boolean;
  setExtractingModelFromDecision: React.Dispatch<React.SetStateAction<boolean>>;
  showExtractModelButton: boolean;
  setShowExtractModelButton: React.Dispatch<React.SetStateAction<boolean>>;
  extractedModelPreview: NewModelData | null;
  setExtractedModelPreview: React.Dispatch<React.SetStateAction<NewModelData | null>>;
  exportedModelsText: string;
  setExportedModelsText: React.Dispatch<React.SetStateAction<string>>;
  modelToDelete: Model | null;
  setModelToDelete: React.Dispatch<React.SetStateAction<Model | null>>;
  similarityWarning: SimilarityWarning | null;
  setSimilarityWarning: React.Dispatch<React.SetStateAction<SimilarityWarning | null>>;
  resetForm: () => void;
  startEditingModel: (model: Model) => void;

  // --- Seção 4: Bulk ---
  deleteAllConfirmText: string;
  setDeleteAllConfirmText: React.Dispatch<React.SetStateAction<string>>;
  bulkFiles: BulkFile[];
  setBulkFiles: React.Dispatch<React.SetStateAction<BulkFile[]>>;
  bulkProcessing: boolean;
  setBulkProcessing: React.Dispatch<React.SetStateAction<boolean>>;
  bulkCurrentFileIndex: number;
  setBulkCurrentFileIndex: React.Dispatch<React.SetStateAction<number>>;
  bulkProcessedFiles: BulkProcessedFile[];
  setBulkProcessedFiles: React.Dispatch<React.SetStateAction<BulkProcessedFile[]>>;
  bulkGeneratedModels: BulkGeneratedModel[];
  setBulkGeneratedModels: React.Dispatch<React.SetStateAction<BulkGeneratedModel[]>>;
  bulkErrors: BulkError[];
  setBulkErrors: React.Dispatch<React.SetStateAction<BulkError[]>>;
  bulkReviewModels: BulkGeneratedModel[];
  setBulkReviewModels: React.Dispatch<React.SetStateAction<BulkGeneratedModel[]>>;
  bulkEditingModel: BulkGeneratedModel | null;
  setBulkEditingModel: React.Dispatch<React.SetStateAction<BulkGeneratedModel | null>>;
  bulkCancelController: AbortController | null;
  setBulkCancelController: React.Dispatch<React.SetStateAction<AbortController | null>>;
  bulkStaggerDelay: number;
  setBulkStaggerDelay: React.Dispatch<React.SetStateAction<number>>;
  bulkCurrentBatch: number;
  setBulkCurrentBatch: React.Dispatch<React.SetStateAction<number>>;
  cancelBulkProcessing: () => void;
  removeBulkFile: (index: number) => void;
  resetBulkState: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: Busca simples em modelos (versão testável)
// ═══════════════════════════════════════════════════════════════════════════

export const searchModelsInLibrary = (
  models: Model[],
  term: string,
  options: SearchOptions = {}
): Model[] => {
  if (!term || !term.trim()) return [];

  const { limit = null, includeContent = true } = options;
  const normalizedTerm = term.toLowerCase().trim();

  const results = models.filter((model) => {
    const title = (model.title || '').toLowerCase();
    const keywords =
      typeof model.keywords === 'string'
        ? model.keywords.toLowerCase()
        : Array.isArray(model.keywords)
          ? model.keywords.join(' ').toLowerCase()
          : '';
    const content = includeContent ? (model.content || '').toLowerCase() : '';

    return (
      title.includes(normalizedTerm) ||
      keywords.includes(normalizedTerm) ||
      content.includes(normalizedTerm)
    );
  });

  return limit ? results.slice(0, limit) : results;
};

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

const useModelLibrary = (): UseModelLibraryReturn => {
  // ===========================================================================
  // SEÇÃO 1: DADOS CORE
  // ===========================================================================
  const [models, setModels] = useState<Model[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [isLoadingModels, setIsLoadingModels] = useState<boolean>(false);
  const [persistenceError, setPersistenceError] = useState<string | null>(null);

  // ===========================================================================
  // SEÇÃO 2: BUSCA E FILTROS
  // ===========================================================================
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState<boolean>(false);
  const [currentModelPage, setCurrentModelPage] = useState<number>(1);
  const [manualSearchTerm, setManualSearchTerm] = useState<string>('');
  const [manualSearchResults, setManualSearchResults] = useState<Model[]>([]);
  const [suggestions, setSuggestions] = useState<Model[]>([]);
  const [suggestionsSource, setSuggestionsSource] = useState<SuggestionsSource>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState<boolean>(false);
  const [modelViewMode, setModelViewMode] = useState<ModelViewMode>('cards');
  const modelsPerPage = 5;

  // --- Busca manual por termo ---
  const performManualSearch = useCallback(
    (term: string): void => {
      if (!term?.trim()) {
        setManualSearchResults([]);
        return;
      }
      const results = searchModelsInLibrary(models, term, { limit: 10, includeContent: true });
      setManualSearchResults(results);
    },
    [models]
  );

  // --- Busca com debounce 300ms ---
  const debouncedSearchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedManualSearch = useCallback(
    (term: string): void => {
      if (debouncedSearchTimeoutRef.current) {
        clearTimeout(debouncedSearchTimeoutRef.current);
      }
      debouncedSearchTimeoutRef.current = setTimeout(() => performManualSearch(term), 300);
    },
    [performManualSearch]
  );

  // ===========================================================================
  // SEÇÃO 3: FORMULÁRIO E EDIÇÃO
  // ===========================================================================
  const [newModel, setNewModel] = useState<NewModelData>({
    title: '',
    content: '',
    keywords: '',
    category: ''
  });
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [extractingModelFromDecision, setExtractingModelFromDecision] = useState<boolean>(false);
  const [showExtractModelButton, setShowExtractModelButton] = useState<boolean>(true);
  const [extractedModelPreview, setExtractedModelPreview] = useState<NewModelData | null>(null);
  const [exportedModelsText, setExportedModelsText] = useState<string>('');
  const [modelToDelete, setModelToDelete] = useState<Model | null>(null);
  const [similarityWarning, setSimilarityWarning] = useState<SimilarityWarning | null>(null);

  // --- Resetar formulário ---
  const resetForm = useCallback((): void => {
    setNewModel({ title: '', content: '', keywords: '', category: '' });
    setEditingModel(null);
    setExtractedModelPreview(null);
    setSimilarityWarning(null);
  }, []);

  // --- Iniciar edição de modelo ---
  const startEditingModel = useCallback((model: Model): void => {
    setEditingModel(model);
    setNewModel({
      title: model.title || '',
      content: model.content || '',
      keywords: typeof model.keywords === 'string' ? model.keywords : (model.keywords || []).join(', '),
      category: model.category || ''
    });
  }, []);

  // ===========================================================================
  // SEÇÃO 4: PROCESSAMENTO EM LOTE (BULK)
  // ===========================================================================
  const [deleteAllConfirmText, setDeleteAllConfirmText] = useState<string>('');
  const [bulkFiles, setBulkFiles] = useState<BulkFile[]>([]);
  const [bulkProcessing, setBulkProcessing] = useState<boolean>(false);
  const [bulkCurrentFileIndex, setBulkCurrentFileIndex] = useState<number>(0);
  const [bulkProcessedFiles, setBulkProcessedFiles] = useState<BulkProcessedFile[]>([]);
  const [bulkGeneratedModels, setBulkGeneratedModels] = useState<BulkGeneratedModel[]>([]);
  const [bulkErrors, setBulkErrors] = useState<BulkError[]>([]);
  const [bulkReviewModels, setBulkReviewModels] = useState<BulkGeneratedModel[]>([]);
  const [bulkEditingModel, setBulkEditingModel] = useState<BulkGeneratedModel | null>(null);
  const [bulkCancelController, setBulkCancelController] = useState<AbortController | null>(null);
  const [bulkStaggerDelay, setBulkStaggerDelay] = useState<number>(0);
  const [bulkCurrentBatch, setBulkCurrentBatch] = useState<number>(0);

  // --- Cancelar processamento bulk ---
  const cancelBulkProcessing = useCallback((): void => {
    if (bulkCancelController) {
      bulkCancelController.abort();
      setBulkCancelController(null);
    }
    setBulkProcessing(false);
    setBulkCurrentBatch(0);
  }, [bulkCancelController]);

  // --- Remover arquivo da fila ---
  const removeBulkFile = useCallback((index: number): void => {
    setBulkFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // --- Resetar estados bulk ---
  const resetBulkState = useCallback((): void => {
    setBulkFiles([]);
    setBulkProcessedFiles([]);
    setBulkGeneratedModels([]);
    setBulkReviewModels([]);
    setBulkErrors([]);
    setBulkEditingModel(null);
  }, []);

  // --- Cleanup ao desmontar ---
  useEffect(() => {
    return () => {
      if (bulkCancelController) {
        bulkCancelController.abort();
        setBulkCancelController(null);
      }
    };
  }, [bulkCancelController]);

  // ===========================================================================
  // RETORNO - Interface Pública
  // ===========================================================================
  return {
    // --- Seção 1: Dados Core ---
    models,
    setModels,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    isLoadingModels,
    setIsLoadingModels,
    persistenceError,
    setPersistenceError,

    // --- Seção 2: Busca ---
    searchTerm,
    setSearchTerm,
    selectedCategory,
    setSelectedCategory,
    showFavoritesOnly,
    setShowFavoritesOnly,
    currentModelPage,
    setCurrentModelPage,
    manualSearchTerm,
    setManualSearchTerm,
    manualSearchResults,
    setManualSearchResults,
    suggestions,
    setSuggestions,
    suggestionsSource,
    setSuggestionsSource,
    loadingSuggestions,
    setLoadingSuggestions,
    modelViewMode,
    setModelViewMode,
    modelsPerPage,
    performManualSearch,
    debouncedManualSearch,

    // --- Seção 3: Formulário ---
    newModel,
    setNewModel,
    editingModel,
    setEditingModel,
    extractingModelFromDecision,
    setExtractingModelFromDecision,
    showExtractModelButton,
    setShowExtractModelButton,
    extractedModelPreview,
    setExtractedModelPreview,
    exportedModelsText,
    setExportedModelsText,
    modelToDelete,
    setModelToDelete,
    similarityWarning,
    setSimilarityWarning,
    resetForm,
    startEditingModel,

    // --- Seção 4: Bulk ---
    deleteAllConfirmText,
    setDeleteAllConfirmText,
    bulkFiles,
    setBulkFiles,
    bulkProcessing,
    setBulkProcessing,
    bulkCurrentFileIndex,
    setBulkCurrentFileIndex,
    bulkProcessedFiles,
    setBulkProcessedFiles,
    bulkGeneratedModels,
    setBulkGeneratedModels,
    bulkErrors,
    setBulkErrors,
    bulkReviewModels,
    setBulkReviewModels,
    bulkEditingModel,
    setBulkEditingModel,
    bulkCancelController,
    setBulkCancelController,
    bulkStaggerDelay,
    setBulkStaggerDelay,
    bulkCurrentBatch,
    setBulkCurrentBatch,
    cancelBulkProcessing,
    removeBulkFile,
    resetBulkState
  };
};

export default useModelLibrary;
