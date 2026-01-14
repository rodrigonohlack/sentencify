/**
 * @file useModelLibrary.ts
 * @description Hook para gerenciamento da biblioteca de modelos jurídicos
 * @version 1.36.78
 *
 * Extraído do App.tsx - wrapper sobre Zustand + lógica de busca e bulk
 * v1.36.63: Estado core migrado para Zustand
 */

import React from 'react';
import { useModelLibraryCompat } from '../stores/useModelsStore';
import type { Model } from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// BUSCA INTELIGENTE DE MODELOS (v1.15.0)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Remove acentos de uma string para normalização de busca
 */
export const removeAccents = (str: string) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/**
 * Stopwords em português (palavras ignoradas na busca)
 */
export const SEARCH_STOPWORDS = new Set(['de', 'do', 'da', 'dos', 'das', 'em', 'no', 'na', 'nos', 'nas',
  'para', 'com', 'por', 'pelo', 'pela', 'pelos', 'pelas', 'ao', 'aos',
  'um', 'uma', 'uns', 'umas', 'o', 'a', 'os', 'as', 'e', 'ou', 'que', 'se']);

/**
 * Dicionário de sinônimos jurídicos para expansão de busca
 */
export const SINONIMOS_JURIDICOS: Record<string, string[]> = {
  'horas extras': ['sobrejornada', 'jornada extraordinaria', 'horas suplementares', 'hora extra'],
  'rescisao indireta': ['despedida indireta', 'justa causa do empregador', 'resilição indireta'],
  'verbas rescisorias': ['haveres rescisorios', 'parcelas rescisorias', 'direitos rescisorios', 'saldo de salario', 'aviso previo'],
  'rescisao': ['verbas rescisorias', 'rescisao contratual', 'dispensa', 'desligamento', 'termino do contrato'],
  'adicional noturno': ['hora noturna', 'trabalho noturno'],
  'danos morais': ['indenização por dano moral', 'reparação moral', 'dano extrapatrimonial', 'dano moral', 'lesao moral'],
  'dano moral': ['danos morais', 'indenização por dano moral', 'reparação moral', 'dano extrapatrimonial'],
  'danos materiais': ['dano patrimonial', 'prejuizo material'],
  'assedio moral': ['mobbing', 'perseguição no trabalho'],
  'insalubridade': ['adicional de insalubridade', 'agente insalubre'],
  'periculosidade': ['adicional de periculosidade', 'risco de vida'],
  'vinculo empregaticio': ['relação de emprego', 'contrato de trabalho'],
  'aviso previo': ['pre-aviso', 'denúncia do contrato'],
  'ferias': ['ferias vencidas', 'ferias proporcionais', 'terco constitucional'],
  'fgts': ['fundo de garantia', 'fundiario', 'deposito fundiario'],
  'multa 477': ['multa rescisoria', 'atraso nas verbas'],
  'multa 467': ['verbas incontroversos'],
  'equiparação salarial': ['isonomia salarial', 'salario igual'],
  'desvio de função': ['acúmulo de função', 'diferenças salariais'],
  'justa causa': ['dispensa por justa causa', 'falta grave'],
  'estabilidade': ['garantia de emprego', 'estabilidade provisoria'],
  'acidente de trabalho': ['acidente laboral', 'sinistro ocupacional'],
  'doenca ocupacional': ['doenca profissional', 'doenca do trabalho'],
  'intervalo intrajornada': ['intervalo para refeição', 'hora de almoço'],
  'intervalo interjornada': ['descanso entre jornadas'],
  'banco de horas': ['compensação de jornada'],
  'terceirização': ['outsourcing', 'prestação de serviços'],
  'responsabilidade subsidiaria': ['condenação subsidiária'],
  'responsabilidade solidaria': ['condenação solidária'],
  'prescrição': ['prazo prescricional', 'prescrição quinquenal', 'prescrição bienal'],
  'litigância de má-fé': ['ma-fe processual'],
  'honorarios': ['honorarios advocaticios', 'honorários sucumbenciais'],
  'justica gratuita': ['gratuidade de justica', 'assistência judiciária'],
  'inss': ['contribuição previdenciária', 'previdência social', 'inss patronal', 'cota parte'],
  'contribuição sindical': ['imposto sindical', 'contribuição confederativa'],
  'salario': ['remuneração', 'contraprestação', 'vencimentos'],
  'demissao': ['dispensa', 'desligamento', 'rescisao contratual'],
  'contrato': ['vinculo', 'pacto laboral', 'relação contratual'],
  'inadimplemento': ['mora salarial', 'falta de pagamento', 'atraso salarial'],
  'gestante': ['gravidez', 'licenca maternidade', 'estabilidade gestante', 'gravida'],
  'cipeiro': ['cipa', 'estabilidade cipeiro', 'membro da cipa'],
  'dirigente sindical': ['estabilidade sindical', 'garantia sindical', 'representante sindical'],
  'dispensa discriminatoria': ['dispensa arbitraria', 'demissao discriminatoria', 'dispensa ilicita'],
  'acúmulo de função': ['desvio funcional', 'função diversa', 'plus salarial'],
  'sobreaviso': ['plantão', 'prontidão', 'tempo à disposição'],
  'pejotização': ['fraude trabalhista', 'contrato fraudulento', 'simulação'],
  'grupo economico': ['responsabilidade solidaria', 'conglomerado', 'empresas coligadas'],
  'sucessao trabalhista': ['sucessao de empregadores', 'transferência de empresa'],
};

/**
 * Busca modelos na biblioteca por termo
 * Suporta busca exata (entre aspas) e fuzzy, com expansão de sinônimos
 */
export const searchModelsInLibrary = (
  models: Model[],
  term: string,
  options: { limit?: number | null; includeContent?: boolean; useSynonyms?: boolean; boostByUsage?: boolean } = {}
) => {
  if (!term || !term.trim()) return [];

  const {
    limit = null,
    includeContent = true,
    useSynonyms = true,
    boostByUsage = true
  } = options;

  const normalizedTerm = removeAccents(term.toLowerCase().trim());

  // Extrair termos entre aspas (busca exata) e termos normais (fuzzy)
  const exactTerms: string[] = [];
  const quotedRegex = /"([^"]+)"/g;
  let match;
  while ((match = quotedRegex.exec(normalizedTerm)) !== null) {
    exactTerms.push(match[1].trim());
  }

  // Remover termos entre aspas e processar palavras restantes como fuzzy
  const termWithoutQuotes = normalizedTerm.replace(quotedRegex, '').trim();
  const fuzzyTerms = termWithoutQuotes.split(/\s+/).filter((w: string) => w.length > 2 && !SEARCH_STOPWORDS.has(w));

  if (exactTerms.length === 0 && fuzzyTerms.length === 0) return [];

  // Expandir sinônimos apenas para termos fuzzy
  const expandedFuzzy = new Set(fuzzyTerms);
  if (useSynonyms) {
    fuzzyTerms.forEach((word: string) => {
      Object.entries(SINONIMOS_JURIDICOS).forEach(([key, synonyms]) => {
        if (key.includes(word) || word.includes(key)) {
          synonyms.forEach(s => expandedFuzzy.add(s));
        }
      });
    });
  }

  const scored = models.map(model => {
    const titleNorm = removeAccents((model.title || '').toLowerCase());
    const keywordsRaw = Array.isArray(model.keywords) ? model.keywords.join(' ') : (model.keywords || '');
    const keywordsNorm = removeAccents(keywordsRaw.toLowerCase());
    const contentNorm = includeContent ? removeAccents((model.content || '').toLowerCase()) : '';

    let score = 0;
    let matchedExact = 0;
    let matchedFuzzy = 0;

    // Verificar termos EXATOS (entre aspas) - busca por palavra inteira
    for (const word of exactTerms) {
      const wordRegex = new RegExp(`\\b${word}\\b`, 'i');
      const inTitle = wordRegex.test(titleNorm);
      const inKeywords = wordRegex.test(keywordsNorm);
      const inContent = wordRegex.test(contentNorm);

      if (inTitle) { score += 15; matchedExact++; }
      if (inKeywords) { score += 8; matchedExact++; }
      if (inContent) { score += 3; matchedExact++; }
    }

    // Verificar termos FUZZY (sem aspas) - busca por substring
    for (const word of expandedFuzzy) {
      const inTitle = titleNorm.includes(word);
      const inKeywords = keywordsNorm.includes(word);
      const inContent = contentNorm.includes(word);

      if (inTitle) score += 10;
      if (inKeywords) score += 5;
      if (inContent) score += 2;
      if (fuzzyTerms.includes(word) && (inTitle || inKeywords || inContent)) matchedFuzzy++;
    }

    // Termos exatos são OBRIGATÓRIOS - zerar score se não encontrou todos
    if (exactTerms.length > 0 && matchedExact < exactTerms.length) score = 0;

    // Boost se todos os termos fuzzy originais foram encontrados
    if (matchedFuzzy >= fuzzyTerms.length && fuzzyTerms.length > 0) score += 20;

    // Aplicar boosts APENAS se houve algum match (evita favoritos sem match aparecerem)
    if (score > 0) {
      if (boostByUsage && model.usageCount) score += Math.min(model.usageCount * 0.5, 10);
      if (model.favorite) score += 5;
    }

    return { model, score };
  });

  const results = scored
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ model }) => model);

  return limit ? results.slice(0, limit) : results;
};

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS LOCAIS (BULK)
// ═══════════════════════════════════════════════════════════════════════════════

type BulkProcessedFile = { file: string; status: string; modelsCount?: number; models?: Model[]; error?: string; duration: string };
type BulkError = { file: string; error?: string; status?: string; duration?: string };
type BulkFile = { file: File; name: string; size: number; status?: 'pending' | 'processing' | 'done' | 'error'; error?: string };
type BulkGeneratedModel = { id?: string; title: string; content: string; keywords?: string | string[]; category?: string; embedding?: number[]; sourceFile?: string; similarityInfo?: { similarity: number; similarModel: Model } };

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK: useModelLibrary
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Tipo de retorno do useModelLibrary
 */
export type UseModelLibraryReturn = ReturnType<typeof useModelLibrary>;

/**
 * Hook para gerenciamento da biblioteca de modelos jurídicos
 * Combina estado Zustand + lógica de busca + processamento em lote
 */
const useModelLibrary = () => {

  // ===========================================================================
  // v1.36.63: Estado migrado para Zustand - ver src/stores/useModelsStore.ts
  // Seções 1, 2 e 3 agora usam o store global
  // ===========================================================================
  const {
    // Seção 1: Dados Core
    models, setModels,
    hasUnsavedChanges, setHasUnsavedChanges,
    isLoadingModels, setIsLoadingModels,
    persistenceError, setPersistenceError,
    // Seção 2: Busca e Filtros
    searchTerm, setSearchTerm,
    selectedCategory, setSelectedCategory,
    showFavoritesOnly, setShowFavoritesOnly,
    ownershipFilter, setOwnershipFilter,
    currentModelPage, setCurrentModelPage,
    manualSearchTerm, setManualSearchTerm,
    manualSearchResults, setManualSearchResults,
    suggestions, setSuggestions,
    suggestionsSource, setSuggestionsSource,
    loadingSuggestions, setLoadingSuggestions,
    modelViewMode, setModelViewMode,
    modelsPerPage,
    // Seção 3: Formulário
    newModel, setNewModel,
    editingModel, setEditingModel,
    extractingModelFromDecision, setExtractingModelFromDecision,
    showExtractModelButton, setShowExtractModelButton,
    extractedModelPreview, setExtractedModelPreview,
    exportedModelsText, setExportedModelsText,
    modelToDelete, setModelToDelete,
    similarityWarning, setSimilarityWarning,
    resetForm, startEditingModel
  } = useModelLibraryCompat();

  // --- Busca manual por termo (lógica encapsulada) ---
  const performManualSearch = React.useCallback((term: string) => {
    if (!term?.trim()) {
      setManualSearchResults([]);
      return;
    }
    const results = searchModelsInLibrary(models, term, { limit: 10, includeContent: true });
    setManualSearchResults(results);
  }, [models, setManualSearchResults]);

  // --- Busca com debounce 300ms ---
  const debouncedSearchTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedManualSearch = React.useCallback((term: string) => {
    if (debouncedSearchTimeoutRef.current) clearTimeout(debouncedSearchTimeoutRef.current);
    debouncedSearchTimeoutRef.current = setTimeout(() => performManualSearch(term), 300);
  }, [performManualSearch]);

  // ===========================================================================
  // SEÇÃO 4: PROCESSAMENTO EM LOTE (BULK)
  // ===========================================================================

  const [deleteAllConfirmText, setDeleteAllConfirmText] = React.useState<string>('');
  const [bulkFiles, setBulkFiles] = React.useState<BulkFile[]>([]);
  const [bulkProcessing, setBulkProcessing] = React.useState<boolean>(false);
  const [bulkCurrentFileIndex, setBulkCurrentFileIndex] = React.useState<number>(0);
  const [bulkProcessedFiles, setBulkProcessedFiles] = React.useState<BulkProcessedFile[]>([]);
  const [bulkGeneratedModels, setBulkGeneratedModels] = React.useState<BulkGeneratedModel[]>([]);
  const [bulkErrors, setBulkErrors] = React.useState<BulkError[]>([]);
  const [bulkReviewModels, setBulkReviewModels] = React.useState<BulkGeneratedModel[]>([]);
  const [bulkEditingModel, setBulkEditingModel] = React.useState<BulkGeneratedModel | null>(null);
  const [bulkCancelController, setBulkCancelController] = React.useState<AbortController | null>(null);
  const [bulkStaggerDelay, setBulkStaggerDelay] = React.useState<number>(0);
  const [bulkCurrentBatch, setBulkCurrentBatch] = React.useState<number>(0);

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
  const removeBulkFile = React.useCallback((index: number) => {
    setBulkFiles(prev => prev.filter((_, i: number) => i !== index));
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
    ownershipFilter, setOwnershipFilter, // v1.35.0
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

export { useModelLibrary };
