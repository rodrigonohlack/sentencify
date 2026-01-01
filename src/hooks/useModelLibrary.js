// 🎣 CUSTOM HOOK: useModelLibrary - Biblioteca de modelos jurídicos
// Versão simplificada extraída do App.jsx para testes
import React from 'react';

// Busca simples em modelos (versão testável)
export const searchModelsInLibrary = (models, term, options = {}) => {
  if (!term || !term.trim()) return [];

  const { limit = null, includeContent = true } = options;
  const normalizedTerm = term.toLowerCase().trim();

  const results = models.filter(model => {
    const title = (model.title || '').toLowerCase();
    const keywords = (model.keywords || '').toLowerCase();
    const content = includeContent ? (model.content || '').toLowerCase() : '';

    return title.includes(normalizedTerm) ||
           keywords.includes(normalizedTerm) ||
           content.includes(normalizedTerm);
  });

  return limit ? results.slice(0, limit) : results;
};

const useModelLibrary = () => {
  // ===========================================================================
  // SEÇÃO 1: DADOS CORE
  // ===========================================================================
  const [models, setModels] = React.useState([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false);
  const [isLoadingModels, setIsLoadingModels] = React.useState(false);
  const [persistenceError, setPersistenceError] = React.useState(null);

  // ===========================================================================
  // SEÇÃO 2: BUSCA E FILTROS
  // ===========================================================================
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = React.useState(false);
  const [currentModelPage, setCurrentModelPage] = React.useState(1);
  const [manualSearchTerm, setManualSearchTerm] = React.useState('');
  const [manualSearchResults, setManualSearchResults] = React.useState([]);
  const [suggestions, setSuggestions] = React.useState([]);
  const [suggestionsSource, setSuggestionsSource] = React.useState(null);
  const [loadingSuggestions, setLoadingSuggestions] = React.useState(false);
  const [modelViewMode, setModelViewMode] = React.useState('cards');
  const modelsPerPage = 5;

  // --- Busca manual por termo ---
  const performManualSearch = React.useCallback((term) => {
    if (!term?.trim()) {
      setManualSearchResults([]);
      return;
    }
    const results = searchModelsInLibrary(models, term, { limit: 10, includeContent: true });
    setManualSearchResults(results);
  }, [models]);

  // --- Busca com debounce 300ms ---
  const debouncedSearchTimeoutRef = React.useRef(null);
  const debouncedManualSearch = React.useCallback((term) => {
    clearTimeout(debouncedSearchTimeoutRef.current);
    debouncedSearchTimeoutRef.current = setTimeout(() => performManualSearch(term), 300);
  }, [performManualSearch]);

  // ===========================================================================
  // SEÇÃO 3: FORMULÁRIO E EDIÇÃO
  // ===========================================================================
  const [newModel, setNewModel] = React.useState({ title: '', content: '', keywords: '', category: '' });
  const [editingModel, setEditingModel] = React.useState(null);
  const [extractingModelFromDecision, setExtractingModelFromDecision] = React.useState(false);
  const [showExtractModelButton, setShowExtractModelButton] = React.useState(true);
  const [extractedModelPreview, setExtractedModelPreview] = React.useState(null);
  const [exportedModelsText, setExportedModelsText] = React.useState('');
  const [modelToDelete, setModelToDelete] = React.useState(null);
  const [similarityWarning, setSimilarityWarning] = React.useState(null);

  // --- Resetar formulário ---
  const resetForm = React.useCallback(() => {
    setNewModel({ title: '', content: '', keywords: '', category: '' });
    setEditingModel(null);
    setExtractedModelPreview(null);
    setSimilarityWarning(null);
  }, []);

  // --- Iniciar edição de modelo ---
  const startEditingModel = React.useCallback((model) => {
    setEditingModel(model);
    setNewModel({
      title: model.title || '',
      content: model.content || '',
      keywords: model.keywords || '',
      category: model.category || ''
    });
  }, []);

  // ===========================================================================
  // SEÇÃO 4: PROCESSAMENTO EM LOTE (BULK)
  // ===========================================================================
  const [deleteAllConfirmText, setDeleteAllConfirmText] = React.useState('');
  const [bulkFiles, setBulkFiles] = React.useState([]);
  const [bulkProcessing, setBulkProcessing] = React.useState(false);
  const [bulkCurrentFileIndex, setBulkCurrentFileIndex] = React.useState(0);
  const [bulkProcessedFiles, setBulkProcessedFiles] = React.useState([]);
  const [bulkGeneratedModels, setBulkGeneratedModels] = React.useState([]);
  const [bulkErrors, setBulkErrors] = React.useState([]);
  const [bulkReviewModels, setBulkReviewModels] = React.useState([]);
  const [bulkEditingModel, setBulkEditingModel] = React.useState(null);
  const [bulkCancelController, setBulkCancelController] = React.useState(null);
  const [bulkStaggerDelay, setBulkStaggerDelay] = React.useState(0);
  const [bulkCurrentBatch, setBulkCurrentBatch] = React.useState(0);

  // --- Cancelar processamento bulk ---
  const cancelBulkProcessing = React.useCallback(() => {
    if (bulkCancelController) {
      bulkCancelController.abort();
      setBulkCancelController(null);
    }
    setBulkProcessing(false);
    setBulkCurrentBatch(0);
  }, [bulkCancelController]);

  // --- Remover arquivo da fila ---
  const removeBulkFile = React.useCallback((index) => {
    setBulkFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  // --- Resetar estados bulk ---
  const resetBulkState = React.useCallback(() => {
    setBulkFiles([]);
    setBulkProcessedFiles([]);
    setBulkGeneratedModels([]);
    setBulkReviewModels([]);
    setBulkErrors([]);
    setBulkEditingModel(null);
  }, []);

  // --- Cleanup ao desmontar ---
  React.useEffect(() => {
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
    models, setModels,
    hasUnsavedChanges, setHasUnsavedChanges,
    isLoadingModels, setIsLoadingModels,
    persistenceError, setPersistenceError,

    // --- Seção 2: Busca ---
    searchTerm, setSearchTerm,
    selectedCategory, setSelectedCategory,
    showFavoritesOnly, setShowFavoritesOnly,
    currentModelPage, setCurrentModelPage,
    manualSearchTerm, setManualSearchTerm,
    manualSearchResults, setManualSearchResults,
    suggestions, setSuggestions,
    suggestionsSource, setSuggestionsSource,
    loadingSuggestions, setLoadingSuggestions,
    modelViewMode, setModelViewMode,
    modelsPerPage,
    performManualSearch, debouncedManualSearch,

    // --- Seção 3: Formulário ---
    newModel, setNewModel,
    editingModel, setEditingModel,
    extractingModelFromDecision, setExtractingModelFromDecision,
    showExtractModelButton, setShowExtractModelButton,
    extractedModelPreview, setExtractedModelPreview,
    exportedModelsText, setExportedModelsText,
    modelToDelete, setModelToDelete,
    similarityWarning, setSimilarityWarning,
    resetForm, startEditingModel,

    // --- Seção 4: Bulk ---
    deleteAllConfirmText, setDeleteAllConfirmText,
    bulkFiles, setBulkFiles,
    bulkProcessing, setBulkProcessing,
    bulkCurrentFileIndex, setBulkCurrentFileIndex,
    bulkProcessedFiles, setBulkProcessedFiles,
    bulkGeneratedModels, setBulkGeneratedModels,
    bulkErrors, setBulkErrors,
    bulkReviewModels, setBulkReviewModels,
    bulkEditingModel, setBulkEditingModel,
    bulkCancelController, setBulkCancelController,
    bulkStaggerDelay, setBulkStaggerDelay,
    bulkCurrentBatch, setBulkCurrentBatch,
    cancelBulkProcessing, removeBulkFile, resetBulkState
  };
};

export default useModelLibrary;
