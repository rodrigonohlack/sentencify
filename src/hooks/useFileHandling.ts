/**
 * @file useFileHandling.ts
 * @description Hook para gerenciamento de upload em lote e operacoes de arquivo
 * @version v1.39.03
 *
 * Funções extraídas do App.tsx:
 * - getBulkPendingFilesCount
 * - handleConfirmBulkCancel
 * - generateModelsFromFileContent
 * - callWithRetry
 * - processFileWithProgress
 * - processBulkFiles
 * - handleBulkFileUpload
 * - saveBulkModels
 * - removeBulkReviewModel
 * - toggleFavorite
 */

import React from 'react';
import { Model, AISettings } from '../types';
import { TFIDFSimilarity } from '../services/EmbeddingsServices';
import { parseAIResponse, extractJSON, BulkExtractionSchema } from '../schemas/ai-responses';
import { withRetry, AI_RETRY_DEFAULTS } from '../utils/retry';
import {
  AI_PROMPTS,
  buildBulkAnalysisPrompt,
  BULK_AI_CONFIG,
  INTER_BATCH_DELAY,
  BULK_API_TIMEOUT_MS,
  VALID_FILE_EXTENSIONS,
  VALID_FILE_TYPES,
  MAX_BULK_FILES
} from '../prompts';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS E INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

/** Interface para o modelLibrary */
export interface ModelLibraryForFileHandling {
  models: Model[];
  setModels: (models: Model[]) => void;
  bulkFiles: Array<{ file: File; name: string; size: number }>;
  setBulkFiles: (files: Array<{ file: File; name: string; size: number }>) => void;
  bulkProcessing: boolean;
  setBulkProcessing: (processing: boolean) => void;
  bulkProcessedFiles: Array<{ file: string; status: string; modelsCount?: number; models?: Model[]; error?: string; duration: string }>;
  setBulkProcessedFiles: (files: Array<{ file: string; status: string; modelsCount?: number; models?: Model[]; error?: string; duration: string }>) => void;
  bulkGeneratedModels: Model[];
  setBulkGeneratedModels: (models: Model[]) => void;
  bulkErrors: Array<{ file: string; status: string; error?: string; duration: string }>;
  setBulkErrors: (errors: Array<{ file: string; status: string; error?: string; duration: string }>) => void;
  bulkCancelController: AbortController | null;
  setBulkCancelController: (controller: AbortController | null) => void;
  bulkCurrentBatch: number;
  setBulkCurrentBatch: (batch: number) => void;
  bulkStaggerDelay: number;
  bulkReviewModels: Model[];
  setBulkReviewModels: (models: Model[]) => void;
  suggestions: Model[];
  setSuggestions: (suggestions: Model[]) => void;
  setHasUnsavedChanges: (hasChanges: boolean) => void;
}

/** Interface para aiIntegration */
export interface AIIntegrationForFileHandling {
  aiSettings: AISettings;
  callAI: (
    messages: Array<{ role: string; content: Array<{ type: string; text?: string }> }>,
    options?: {
      maxTokens?: number;
      useInstructions?: boolean;
      timeout?: number;
      abortSignal?: AbortSignal;
      logMetrics?: boolean;
      temperature?: number;
      topP?: number;
      topK?: number;
    }
  ) => Promise<string>;
}

/** Interface para apiCache */
export interface APICacheForFileHandling {
  get: (key: string) => unknown;
  set: (key: string, value: string) => void;
}

/** Interface para documentServices */
export interface DocumentServicesForFileHandling {
  extractTextFromBulkFile: (file: File) => Promise<string>;
}

/** Interface para cloudSync */
export interface CloudSyncForFileHandling {
  trackChange?: (action: 'create' | 'update' | 'delete', model: Model) => void;
}

/** Interface para modelPreview */
export interface ModelPreviewForFileHandling {
  previewingModel: Model | null;
  openPreview: (model: Model) => void;
}

/** Props do hook useFileHandling */
export interface UseFileHandlingProps {
  modelLibrary: ModelLibraryForFileHandling;
  aiIntegration: AIIntegrationForFileHandling;
  apiCache: APICacheForFileHandling;
  documentServices: DocumentServicesForFileHandling;
  cloudSync?: CloudSyncForFileHandling;
  modelPreview: ModelPreviewForFileHandling;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  setError: (error: string) => void;
  openModal: (modalId: string) => void;
  closeModal: (modalId: string) => void;
  processBulkSaveNext: (
    queue: Array<{ title: string; content: string; keywords?: string | string[]; category?: string; embedding?: number[] }>,
    saved: Model[],
    skipped: number,
    replacements: Array<{ oldId: string; newModel: Model }>
  ) => Promise<void>;
}

/** Retorno do hook useFileHandling */
export interface UseFileHandlingReturn {
  getBulkPendingFilesCount: () => number;
  handleConfirmBulkCancel: () => void;
  generateModelsFromFileContent: (
    textContent: string,
    fileName: string,
    abortSignal?: AbortSignal | null
  ) => Promise<Model[]>;
  processBulkFiles: () => Promise<void>;
  handleBulkFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  saveBulkModels: () => void;
  removeBulkReviewModel: (modelId: string) => void;
  toggleFavorite: (modelId: string) => Promise<void>;
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook para gerenciamento de upload em lote e operações de arquivo
 */
export function useFileHandling({
  modelLibrary,
  aiIntegration,
  apiCache,
  documentServices,
  cloudSync,
  modelPreview,
  showToast,
  setError,
  openModal,
  closeModal,
  processBulkSaveNext
}: UseFileHandlingProps): UseFileHandlingReturn {

  // ═══════════════════════════════════════════════════════════════════════════
  // CONTAGEM DE ARQUIVOS PENDENTES
  // ═══════════════════════════════════════════════════════════════════════════

  const getBulkPendingFilesCount = React.useCallback(() => {
    return modelLibrary.bulkFiles.length - modelLibrary.bulkProcessedFiles.length;
  }, [modelLibrary.bulkFiles.length, modelLibrary.bulkProcessedFiles.length]);

  // ═══════════════════════════════════════════════════════════════════════════
  // CANCELAMENTO DO BULK PROCESSING
  // ═══════════════════════════════════════════════════════════════════════════

  const handleConfirmBulkCancel = React.useCallback(() => {
    closeModal('confirmBulkCancel');
    if (modelLibrary.bulkCancelController) {
      modelLibrary.bulkCancelController.abort();
      modelLibrary.setBulkProcessing(false);
      modelLibrary.setBulkCancelController(null);
      modelLibrary.setBulkCurrentBatch(0);
      showToast('Processamento cancelado pelo usuário', 'info');
      // Se houver modelos gerados, abrir modal de revisão
      if (modelLibrary.bulkGeneratedModels.length > 0) {
        openModal('bulkReview');
      }
    }
  }, [
    closeModal,
    openModal,
    showToast,
    modelLibrary.bulkCancelController,
    modelLibrary.setBulkProcessing,
    modelLibrary.setBulkCancelController,
    modelLibrary.setBulkCurrentBatch,
    modelLibrary.bulkGeneratedModels.length
  ]);

  // ═══════════════════════════════════════════════════════════════════════════
  // GERAÇÃO DE MODELOS A PARTIR DE CONTEÚDO
  // ═══════════════════════════════════════════════════════════════════════════

  const generateModelsFromFileContent = React.useCallback(async (
    textContent: string,
    fileName: string,
    abortSignal: AbortSignal | null = null
  ): Promise<Model[]> => {
    // Verificar cancelamento antes de começar
    if (abortSignal?.aborted) {
      throw new Error('Processamento cancelado pelo usuário');
    }

    // Validar texto
    if (!textContent || typeof textContent !== 'string' || textContent.trim().length < 50) {
      throw new Error('Texto muito curto ou inválido para análise');
    }

    // Cache key baseado em fileName + textContent
    const cacheKey = `bulkModels_${fileName}_${textContent}`;

    // Verificar cache antes de chamar API
    const cachedModels = apiCache.get(cacheKey);
    if (cachedModels && typeof cachedModels === 'string') {
      return JSON.parse(cachedModels);
    }

    const textToAnalyze = textContent.trim();

    // Construir prompt usando função externa
    const analysisPrompt = buildBulkAnalysisPrompt(
      textToAnalyze,
      AI_PROMPTS.estiloRedacao || ''
    );

    // Chamar IA com configurações otimizadas
    const aiResponseText = await aiIntegration.callAI([{
      role: 'user',
      content: [{ type: 'text', text: analysisPrompt }]
    }], {
      maxTokens: BULK_AI_CONFIG.maxTokens,
      useInstructions: true,
      timeout: BULK_AI_CONFIG.timeout,
      abortSignal: abortSignal || undefined,
      logMetrics: true,
      temperature: BULK_AI_CONFIG.temperature,
      topP: BULK_AI_CONFIG.topP,
      topK: BULK_AI_CONFIG.topK
    });

    // Parse e validação com schema Zod
    const validated = parseAIResponse(aiResponseText, BulkExtractionSchema);
    let parsedModelos: ReturnType<typeof BulkExtractionSchema['parse']>['modelos'];
    if (validated.success) {
      parsedModelos = validated.data.modelos;
    } else {
      console.warn('[BulkExtraction] Validação Zod falhou, usando fallback:', validated.error);
      const jsonStr = extractJSON(aiResponseText);
      if (!jsonStr) throw new Error('Nenhum JSON encontrado na resposta');
      const parsed = JSON.parse(jsonStr);
      if (!parsed.modelos || !Array.isArray(parsed.modelos) || parsed.modelos.length === 0) {
        throw new Error('Nenhum modelo identificado no documento');
      }
      parsedModelos = parsed.modelos;
    }

    if (parsedModelos.length === 0) {
      throw new Error('Nenhum modelo identificado no documento');
    }

    // Formata os modelos
    const modelos: Model[] = parsedModelos.map((m, idx: number) => ({
      id: `bulk-${Date.now()}-${idx}`,
      title: m.titulo || `Modelo ${idx + 1}`,
      category: m.categoria || 'Sem categoria',
      keywords: Array.isArray(m.palavrasChave) ? m.palavrasChave.join(', ') : (m.palavrasChave || ''),
      content: m.conteudo || '<p>Conteúdo não gerado</p>',
      sourceFile: fileName,
      createdAt: new Date().toISOString(),
      isFavorite: false
    }));

    // Cachear modelos gerados
    apiCache.set(cacheKey, JSON.stringify(modelos));

    return modelos;
  }, [aiIntegration, apiCache]);

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCESSAMENTO DE ARQUIVO COM PROGRESSO
  // ═══════════════════════════════════════════════════════════════════════════

  const processFileWithProgress = React.useCallback(async (
    file: File,
    _index: number,
    abortSignal: AbortSignal | null
  ): Promise<{ file: string; status: string; modelsCount?: number; models?: Model[]; error?: string; duration: string }> => {
    const startTime = Date.now();

    try {
      // Verificar cancelamento antes de iniciar
      if (abortSignal?.aborted) {
        throw new Error('Processamento cancelado pelo usuário');
      }

      // PASSO 1: Extrair texto (local, rápido)
      const textContent = await documentServices.extractTextFromBulkFile(file);

      // Verificar cancelamento após extração
      if (abortSignal?.aborted) {
        throw new Error('Processamento cancelado pelo usuário');
      }

      // PASSO 2: Gerar modelos com IA (API call com retry)
      const models = await withRetry(
        () => generateModelsFromFileContent(textContent, file.name, abortSignal),
        {
          ...AI_RETRY_DEFAULTS,
          timeoutMs: BULK_API_TIMEOUT_MS,
          abortSignal,
          onRetry: (attempt, err, delay) => {
            console.warn(`[processFile] Erro na tentativa ${attempt} (${file.name}), retry em ${delay}ms:`, err.message);
          }
        }
      );

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);

      return {
        file: file.name,
        status: 'success',
        modelsCount: models.length,
        models,
        duration
      };

    } catch (err) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);

      return {
        file: file.name,
        status: 'error',
        error: (err as Error).message,
        duration
      };
    }
  }, [documentServices, generateModelsFromFileContent]);

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCESSAMENTO EM LOTE
  // ═══════════════════════════════════════════════════════════════════════════

  const processBulkFiles = React.useCallback(async () => {
    if (modelLibrary.bulkFiles.length === 0) return;

    try {
      modelLibrary.setBulkProcessing(true);
      modelLibrary.setBulkProcessedFiles([]);
      modelLibrary.setBulkGeneratedModels([]);
      modelLibrary.setBulkErrors([]);

      if (modelLibrary.bulkCancelController) {
        modelLibrary.setBulkCancelController(null);
      }

      // Criar AbortController NOVO para este processamento
      const cancelController = new AbortController();
      modelLibrary.setBulkCancelController(cancelController);

      // Usar valor configurável de requisições paralelas
      const BULK_BATCH_SIZE = aiIntegration.aiSettings.parallelRequests || 5;

      // Processar em batches para evitar rate limit 429
      const allResults: PromiseSettledResult<{ file: string; status: string; modelsCount?: number; models?: Model[]; error?: string; duration: string }>[] = [];
      const processedFiles: Array<{ file: string; status: string; modelsCount?: number; models?: Model[]; error?: string; duration: string }> = [];
      const generatedModels: Model[] = [];
      const errors: Array<{ file: string; status: string; error?: string; duration: string }> = [];

      for (let i = 0; i < modelLibrary.bulkFiles.length; i += BULK_BATCH_SIZE) {
        const batch = modelLibrary.bulkFiles.slice(i, i + BULK_BATCH_SIZE);
        const batchNumber = Math.floor(i / BULK_BATCH_SIZE) + 1;

        modelLibrary.setBulkCurrentBatch(batchNumber);

        // Criar promises para este batch
        const promises = batch.map((bulkFile, batchIndex) => {
          const startDelay = batchIndex * modelLibrary.bulkStaggerDelay;

          return new Promise(resolve => setTimeout(resolve, startDelay))
            .then(() => processFileWithProgress(bulkFile.file, i + batchIndex, cancelController.signal));
        });

        // Aguardar batch atual
        const batchResults = await Promise.allSettled(promises);
        allResults.push(...batchResults);

        // Processar resultados deste batch em tempo real
        batchResults.forEach(result => {
          if (result.status === 'fulfilled' && result.value.status === 'success') {
            processedFiles.push(result.value);
            if (result.value.models) {
              generatedModels.push(...result.value.models);
            }
          } else {
            const errorData = result.status === 'rejected' ? result.reason : result.value;
            processedFiles.push(errorData);
            errors.push(errorData);
          }
        });

        // Atualizar UI em tempo real após cada batch
        modelLibrary.setBulkProcessedFiles([...processedFiles]);
        modelLibrary.setBulkGeneratedModels([...generatedModels]);
        modelLibrary.setBulkErrors([...errors]);

        // Delay entre batches (exceto no último)
        if (i + BULK_BATCH_SIZE < modelLibrary.bulkFiles.length) {
          await new Promise(resolve => setTimeout(resolve, INTER_BATCH_DELAY));

          // Verificar se foi cancelado durante o delay
          if (cancelController.signal.aborted) {
            break;
          }
        }
      }

      // Atualizar estados finais
      modelLibrary.setBulkProcessedFiles(processedFiles);
      modelLibrary.setBulkGeneratedModels(generatedModels);
      modelLibrary.setBulkErrors(errors);

      // Pré-calcular similaridade para cada modelo gerado
      const modelsWithSimilarity = generatedModels.map(model => {
        const simResult = TFIDFSimilarity.findSimilar(model, modelLibrary.models, 0.80);
        if (simResult.hasSimilar) {
          return { ...model, similarityInfo: { similarity: simResult.similarity, similarModel: simResult.similarModel } };
        }
        return model;
      });
      modelLibrary.setBulkReviewModels(modelsWithSimilarity);

      // Limpar controller e resetar batch
      modelLibrary.setBulkCancelController(null);
      modelLibrary.setBulkCurrentBatch(0);

      // Abrir modal de revisão
      openModal('bulkReview');

    } catch (err) {
      setError((err as Error).message);
    } finally {
      modelLibrary.setBulkProcessing(false);
    }
  }, [
    modelLibrary,
    aiIntegration.aiSettings.parallelRequests,
    processFileWithProgress,
    openModal,
    setError
  ]);

  // ═══════════════════════════════════════════════════════════════════════════
  // UPLOAD DE ARQUIVOS EM LOTE
  // ═══════════════════════════════════════════════════════════════════════════

  const handleBulkFileUpload = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);

    if (files.length === 0) return;

    if (files.length > MAX_BULK_FILES) {
      showToast(`⚠️ Limite máximo de ${MAX_BULK_FILES} arquivos por lote. Por favor, selecione menos arquivos.`, 'error');
      return;
    }

    // Validar tipos de arquivo - PDF, TXT, DOCX, DOC
    const invalidFiles = files.filter(f => {
      const ext = '.' + (f.name.split('.').pop() || '').toLowerCase();
      return !VALID_FILE_EXTENSIONS.includes(ext as typeof VALID_FILE_EXTENSIONS[number]) &&
             !VALID_FILE_TYPES.includes(f.type as typeof VALID_FILE_TYPES[number]);
    });

    if (invalidFiles.length > 0) {
      showToast(`⚠️ Arquivos inválidos detectados:\n${invalidFiles.map(f => f.name).join('\n')}\n\n✅ Tipos suportados: PDF, DOCX, DOC, TXT`, 'error');
      return;
    }

    const bulkFilesData = files.map(file => ({ file, name: file.name, size: file.size }));
    modelLibrary.setBulkFiles(bulkFilesData);
  }, [showToast, modelLibrary.setBulkFiles]);

  // ═══════════════════════════════════════════════════════════════════════════
  // SALVAR MODELOS DO BULK
  // ═══════════════════════════════════════════════════════════════════════════

  const saveBulkModels = React.useCallback(() => {
    if (modelLibrary.bulkReviewModels.length === 0) {
      showToast('Nenhum modelo para salvar.', 'error');
      return;
    }
    // Cast para o formato esperado por processBulkSaveNext
    const queue = modelLibrary.bulkReviewModels.map(m => ({
      title: m.title,
      content: m.content,
      keywords: m.keywords,
      category: m.category,
      embedding: m.embedding
    }));
    processBulkSaveNext(queue, [], 0, []);
  }, [modelLibrary.bulkReviewModels, showToast, processBulkSaveNext]);

  // ═══════════════════════════════════════════════════════════════════════════
  // REMOVER MODELO DA REVISÃO
  // ═══════════════════════════════════════════════════════════════════════════

  const removeBulkReviewModel = React.useCallback((modelId: string) => {
    const updated = modelLibrary.bulkReviewModels.filter(m => m.id !== modelId);
    modelLibrary.setBulkReviewModels(updated);
  }, [modelLibrary.bulkReviewModels, modelLibrary.setBulkReviewModels]);

  // ═══════════════════════════════════════════════════════════════════════════
  // TOGGLE FAVORITO
  // ═══════════════════════════════════════════════════════════════════════════

  const toggleFavorite = React.useCallback(async (modelId: string) => {
    try {
      let updatedModel: Model | null = null;
      const updated = modelLibrary.models.map((m: Model) => {
        if (m.id === modelId) {
          updatedModel = { ...m, favorite: !m.favorite, updatedAt: new Date().toISOString() };
          return updatedModel;
        }
        return m;
      });
      modelLibrary.setModels(updated);

      // Rastrear update para sync
      if (cloudSync?.trackChange && updatedModel) {
        cloudSync.trackChange('update', updatedModel);
      }
      modelLibrary.setHasUnsavedChanges(true);

      // Atualizar sugestões se modelo estiver nelas
      if (updatedModel && modelLibrary.suggestions?.length > 0) {
        const finalUpdatedModel = updatedModel;
        modelLibrary.setSuggestions(modelLibrary.suggestions.map(m => m.id === modelId ? finalUpdatedModel : m));
      }

      // Atualizar preview se modelo estiver aberto
      if (updatedModel && modelPreview.previewingModel?.id === modelId) {
        modelPreview.openPreview(updatedModel);
      }
    } catch (err) {
      setError('Erro ao favoritar modelo: ' + (err as Error).message);
    }
  }, [
    modelLibrary.models,
    modelLibrary.setModels,
    modelLibrary.suggestions,
    modelLibrary.setSuggestions,
    modelLibrary.setHasUnsavedChanges,
    cloudSync,
    modelPreview.previewingModel?.id,
    modelPreview.openPreview,
    setError
  ]);

  // ═══════════════════════════════════════════════════════════════════════════
  // RETORNO
  // ═══════════════════════════════════════════════════════════════════════════

  return {
    getBulkPendingFilesCount,
    handleConfirmBulkCancel,
    generateModelsFromFileContent,
    processBulkFiles,
    handleBulkFileUpload,
    saveBulkModels,
    removeBulkReviewModel,
    toggleFavorite
  };
}
