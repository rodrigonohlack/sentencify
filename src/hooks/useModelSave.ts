/**
 * @file useModelSave.ts
 * @description Hook para gerenciamento de salvamento de modelos
 * @version 1.37.14
 *
 * Funções extraídas do App.tsx:
 * - executeSaveModel: Salva modelo após verificação de similaridade
 * - saveModel: Salva modelo novo ou editado (com verificação de similaridade)
 * - saveModelWithoutClosing: Salva sem fechar modal (Ctrl+S)
 * - executeSaveAsNew: Salva como novo modelo (do preview)
 * - executeExtractedModelSave: Salva modelo extraído de decisão
 * - processBulkSaveNext: Processa fila de salvamento em lote
 * - handleSimilarityCancel/SaveNew/Replace: Handlers do modal de similaridade
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { Model, NewModelData, SimilarityWarningState } from '../types';
import { generateModelId } from '../utils/text';
import { TFIDFSimilarity } from '../services/EmbeddingsServices';
import AIModelService from '../services/AIModelService';

// ════════════════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════════════════

export interface ModelLibraryForSave {
  models: Model[];
  newModel: NewModelData;
  editingModel: Model | null;
  extractedModelPreview: NewModelData | null;
  similarityWarning: SimilarityWarningState | null;
  setModels: (models: Model[] | ((prev: Model[]) => Model[])) => void;
  setNewModel: (model: NewModelData | ((prev: NewModelData) => NewModelData)) => void;
  setEditingModel: (model: Model | null) => void;
  setExtractedModelPreview: (model: NewModelData | null) => void;
  setSimilarityWarning: (warning: SimilarityWarningState | null) => void;
  setHasUnsavedChanges: (value: boolean) => void;
}

export interface CloudSyncForSave {
  trackChange?: (operation: 'create' | 'update' | 'delete', model: Partial<Model> & { id: string }) => void;
  trackChangeBatch?: (changes: Array<{ operation: 'create' | 'update' | 'delete'; model: Partial<Model> & { id: string } }>) => void;
}

export interface APICacheForSave {
  invalidate: (prefix: string) => void;
}

export interface ModelPreviewForSave {
  closeSaveAsNew: () => void;
  closePreview: () => void;
}

export interface UseModelSaveProps {
  modelLibrary: ModelLibraryForSave;
  aiSettings: {
    modelSemanticEnabled?: boolean;
  };
  searchModelReady: boolean;
  cloudSync: CloudSyncForSave | null;
  apiCache: APICacheForSave;
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  modelEditorRef: React.RefObject<{ root?: HTMLElement } | null>;
  closeModal: (modalId: string) => void;
  modelPreview: ModelPreviewForSave;
  sanitizeHTML: (dirty: string | null | undefined) => string;
  setError: (error: string) => void;
}

export interface UseModelSaveReturn {
  // Estados
  savingModel: boolean;
  modelSaved: boolean;
  savingFromSimilarity: boolean;

  // Funções de salvamento
  saveModel: (formData?: NewModelData) => Promise<void>;
  saveModelWithoutClosing: (formData?: NewModelData) => Promise<void>;
  executeSaveModel: (modelData: Partial<Model> & { id: string; title: string; content: string; embedding?: number[] }, isReplace?: boolean, replaceId?: string | null) => Promise<void>;
  executeSaveAsNew: (modelData: Partial<Model> & { id: string; title: string; content: string; embedding?: number[] }, isReplace?: boolean, replaceId?: string | null) => Promise<void>;
  executeExtractedModelSave: (modelData: Partial<Model> & { title: string; content: string; embedding?: number[] }, isReplace?: boolean, replaceId?: string | null) => Promise<void>;
  processBulkSaveNext: (queue: Array<{ title: string; content: string; keywords?: string | string[]; category?: string; embedding?: number[] }>, saved: Model[], skipped: number, replacements: Array<{ oldId: string; newModel: Model }>) => Promise<void>;

  // Handlers do modal de similaridade
  handleSimilarityCancel: () => void;
  handleSimilaritySaveNew: () => Promise<void>;
  handleSimilarityReplace: () => Promise<void>;
}

// ════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Remove HTML tags e retorna texto puro
 */
const stripHTML = (html: string): string => {
  const div = document.createElement('div');
  div.innerHTML = html || '';
  return div.textContent || div.innerText || '';
};

/**
 * Gera embedding para um modelo se IA local estiver ativa
 */
const generateModelEmbedding = async (
  modelData: { title: string; keywords?: string | string[]; content: string; embedding?: number[] },
  modelSemanticEnabled: boolean,
  searchModelReady: boolean
): Promise<number[] | undefined> => {
  if (!modelSemanticEnabled || !searchModelReady || modelData.embedding) {
    return modelData.embedding;
  }

  try {
    const text = [
      modelData.title,
      modelData.keywords,
      stripHTML(modelData.content).slice(0, 2000)
    ].filter(Boolean).join(' ');
    return await AIModelService.getEmbedding(text, 'passage');
  } catch (err) {
    console.warn('[MODEL-EMBED] Erro ao gerar embedding:', err);
    return undefined;
  }
};

// ════════════════════════════════════════════════════════════════════════════
// HOOK PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

export function useModelSave({
  modelLibrary,
  aiSettings,
  searchModelReady,
  cloudSync,
  apiCache,
  showToast,
  modelEditorRef,
  closeModal,
  modelPreview,
  sanitizeHTML,
  setError,
}: UseModelSaveProps): UseModelSaveReturn {

  // Estados
  const [savingModel, setSavingModel] = useState(false);
  const [modelSaved, setModelSaved] = useState(false);
  const [savingFromSimilarity, setSavingFromSimilarity] = useState(false);

  // Refs para dependências que podem ser atualizadas após inicialização
  // Isso resolve o problema de cloudSync ser null durante a renderização inicial
  const cloudSyncRef = useRef(cloudSync);
  const modelLibraryRef = useRef(modelLibrary);
  const aiSettingsRef = useRef(aiSettings);
  const searchModelReadyRef = useRef(searchModelReady);

  // Atualizar refs quando as props mudam
  useEffect(() => {
    cloudSyncRef.current = cloudSync;
    modelLibraryRef.current = modelLibrary;
    aiSettingsRef.current = aiSettings;
    searchModelReadyRef.current = searchModelReady;
  }, [cloudSync, modelLibrary, aiSettings, searchModelReady]);

  // ══════════════════════════════════════════════════════════════════════════
  // FUNÇÕES DE SALVAMENTO
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Executa salvamento do modelo (chamado após verificação de similaridade)
   * Gera embedding automaticamente se IA local estiver ativa
   */
  const executeSaveModel = useCallback(async (
    modelData: Partial<Model> & { id: string; title: string; content: string; embedding?: number[] },
    isReplace = false,
    replaceId: string | null = null
  ) => {
    // Gerar embedding se modelo de busca estiver pronto E opção ativada
    if (aiSettings.modelSemanticEnabled && searchModelReady && !modelData.embedding) {
      await new Promise(resolve => setTimeout(resolve, 50));
      modelData.embedding = await generateModelEmbedding(modelData, aiSettings.modelSemanticEnabled, searchModelReady);
    } else if (!aiSettings.modelSemanticEnabled && modelData.embedding) {
      delete modelData.embedding;
    }

    if (isReplace && replaceId) {
      const updatedModel = { ...modelData, id: replaceId, updatedAt: new Date().toISOString() };
      const updated = modelLibrary.models.map(m => m.id === replaceId ? updatedModel : m);
      modelLibrary.setModels(updated as Model[]);
      if (cloudSyncRef.current?.trackChange) cloudSyncRef.current.trackChange('update', updatedModel as Model);
      TFIDFSimilarity.invalidate();
      apiCache.invalidate('suggestions_');
    } else {
      modelLibrary.setModels(prev => [...prev, modelData as Model]);
      if (cloudSyncRef.current?.trackChange) cloudSyncRef.current.trackChange('create', modelData as Model);
      TFIDFSimilarity.invalidate();
      apiCache.invalidate('suggestions_');
    }

    modelLibrary.setHasUnsavedChanges(true);
    setModelSaved(true);

    setTimeout(() => {
      modelLibrary.setNewModel({ title: '', content: '', keywords: '', category: '' });
      if (modelEditorRef.current?.root) modelEditorRef.current.root.innerHTML = '';
      closeModal('modelForm');
      setError('');
      setModelSaved(false);
    }, 1200);
  }, [aiSettings.modelSemanticEnabled, searchModelReady, modelLibrary, apiCache, modelEditorRef, closeModal, setError]);

  /**
   * Salva modelo novo ou editado
   * Para novos modelos, verifica similaridade antes de salvar
   */
  const saveModel = useCallback(async (formData?: NewModelData) => {
    const effectiveModel = formData || modelLibrary.newModel;
    const currentContent = modelEditorRef.current?.root
      ? sanitizeHTML(modelEditorRef.current.root.innerHTML)
      : effectiveModel.content;

    if (!effectiveModel.title || !currentContent) {
      setError('Título e conteúdo são obrigatórios');
      return;
    }

    setSavingModel(true);
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
      const editingModel = modelLibrary.editingModel;

      if (editingModel) {
        // Edição de modelo existente - sem verificação de similaridade
        const modelData: Model = {
          ...editingModel,
          title: effectiveModel.title,
          content: currentContent,
          keywords: effectiveModel.keywords,
          category: effectiveModel.category,
          updatedAt: new Date().toISOString()
        };

        // Regenerar embedding se IA local estiver ativa
        if (aiSettings.modelSemanticEnabled && searchModelReady) {
          modelData.embedding = await generateModelEmbedding(modelData, aiSettings.modelSemanticEnabled, searchModelReady);
        } else if (modelData.embedding) {
          delete modelData.embedding;
        }

        const updated = modelLibrary.models.map(m => m.id === editingModel.id ? modelData : m);
        modelLibrary.setModels(updated);
        if (cloudSyncRef.current?.trackChange) cloudSyncRef.current.trackChange('update', modelData);
        modelLibrary.setHasUnsavedChanges(true);
        TFIDFSimilarity.invalidate();
        apiCache.invalidate('suggestions_');
        modelLibrary.setEditingModel(null);
        setModelSaved(true);

        setTimeout(() => {
          modelLibrary.setNewModel({ title: '', content: '', keywords: '', category: '' });
          if (modelEditorRef.current?.root) modelEditorRef.current.root.innerHTML = '';
          closeModal('modelForm');
          setError('');
          setModelSaved(false);
        }, 1200);
      } else {
        // Novo modelo - verificar similaridade
        const modelId = generateModelId();
        const modelData: Model = {
          id: modelId,
          title: effectiveModel.title,
          content: currentContent,
          keywords: effectiveModel.keywords,
          category: effectiveModel.category,
          createdAt: new Date().toISOString()
        };

        const simResult = TFIDFSimilarity.findSimilar(modelData, modelLibrary.models, 0.80);
        if (simResult.hasSimilar) {
          modelLibrary.setSimilarityWarning({
            newModel: modelData,
            similarModel: simResult.similarModel,
            similarity: simResult.similarity,
            context: 'saveModel'
          } as SimilarityWarningState);
          return;
        }

        await executeSaveModel(modelData);
      }
    } catch (err) {
      setError('Erro ao salvar modelo: ' + (err as Error).message);
    } finally {
      setSavingModel(false);
    }
  }, [modelLibrary, modelEditorRef, sanitizeHTML, aiSettings.modelSemanticEnabled, searchModelReady, apiCache, closeModal, setError, executeSaveModel]);

  /**
   * Salva modelo sem fechar o modal (para Ctrl+S)
   */
  const saveModelWithoutClosing = useCallback(async (formData?: NewModelData) => {
    const effectiveModel = formData || modelLibrary.newModel;
    const currentContent = modelEditorRef.current?.root
      ? sanitizeHTML(modelEditorRef.current.root.innerHTML)
      : effectiveModel.content;

    if (!effectiveModel.title || !currentContent) {
      setError('Título e conteúdo são obrigatórios');
      return;
    }

    try {
      const editingModel = modelLibrary.editingModel;

      if (editingModel) {
        const modelData: Model = {
          ...editingModel,
          title: effectiveModel.title,
          content: currentContent,
          keywords: effectiveModel.keywords,
          category: effectiveModel.category,
          updatedAt: new Date().toISOString()
        };

        const updated = modelLibrary.models.map(m => m.id === editingModel.id ? modelData : m);
        modelLibrary.setModels(updated);
        if (cloudSyncRef.current?.trackChange) cloudSyncRef.current.trackChange('update', modelData);
        modelLibrary.setHasUnsavedChanges(true);
        modelLibrary.setEditingModel(modelData);
        modelLibrary.setNewModel({ ...effectiveModel, content: currentContent });
      } else {
        const modelId = generateModelId();
        const modelData: Model = {
          id: modelId,
          title: effectiveModel.title,
          content: currentContent,
          keywords: effectiveModel.keywords,
          category: effectiveModel.category,
          createdAt: new Date().toISOString()
        };

        modelLibrary.setModels(prev => [...prev, modelData]);
        if (cloudSyncRef.current?.trackChange) cloudSyncRef.current.trackChange('create', modelData);
        modelLibrary.setHasUnsavedChanges(true);
        modelLibrary.setEditingModel(modelData);
        modelLibrary.setNewModel({ ...effectiveModel, content: currentContent });
      }

      setError('');

      // Feedback visual temporário
      const successMsg = document.createElement('div');
      successMsg.className = 'fixed top-4 left-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2 animate-pulse';
      successMsg.innerHTML = '<span>✓</span> Modelo salvo!';
      document.body.appendChild(successMsg);
      setTimeout(() => successMsg.remove(), 2000);
    } catch (err) {
      setError('Erro ao salvar modelo: ' + (err as Error).message);
    }
  }, [modelLibrary, modelEditorRef, sanitizeHTML, setError]);

  /**
   * Executa salvamento de "Salvar como Novo" (do ModelPreview)
   */
  const executeSaveAsNew = useCallback(async (
    modelData: Partial<Model> & { id: string; title: string; content: string; embedding?: number[] },
    isReplace = false,
    replaceId: string | null = null
  ) => {
    // Gerar embedding se modelo de busca estiver pronto E opção ativada
    if (aiSettings.modelSemanticEnabled && searchModelReady && !modelData.embedding) {
      await new Promise(resolve => setTimeout(resolve, 50));
      modelData.embedding = await generateModelEmbedding(modelData, aiSettings.modelSemanticEnabled, searchModelReady);
    } else if (!aiSettings.modelSemanticEnabled && modelData.embedding) {
      delete modelData.embedding;
    }

    if (isReplace && replaceId) {
      const updatedModel = { ...modelData, id: replaceId, updatedAt: new Date().toISOString() };
      const updated = modelLibrary.models.map(m => m.id === replaceId ? updatedModel : m);
      modelLibrary.setModels(updated as Model[]);
      if (cloudSyncRef.current?.trackChange) cloudSyncRef.current.trackChange('update', updatedModel as Model);
    } else {
      modelLibrary.setModels(prev => [...prev, modelData as Model]);
      if (cloudSyncRef.current?.trackChange) cloudSyncRef.current.trackChange('create', modelData as Model);
    }

    modelLibrary.setHasUnsavedChanges(true);
    TFIDFSimilarity.invalidate();
    apiCache.invalidate('suggestions_');
    showToast('Novo modelo criado com sucesso!', 'success');
    modelPreview.closeSaveAsNew();
    modelPreview.closePreview();
  }, [aiSettings.modelSemanticEnabled, searchModelReady, modelLibrary, apiCache, showToast, modelPreview]);

  /**
   * Executa salvamento de modelo extraído de decisão
   */
  const executeExtractedModelSave = useCallback(async (
    modelData: Partial<Model> & { title: string; content: string; embedding?: number[] },
    isReplace = false,
    replaceId: string | null = null
  ) => {
    // Gerar embedding se modelo de busca estiver pronto E opção ativada
    if (aiSettings.modelSemanticEnabled && searchModelReady && !modelData.embedding) {
      await new Promise(resolve => setTimeout(resolve, 50));
      modelData.embedding = await generateModelEmbedding(modelData, aiSettings.modelSemanticEnabled, searchModelReady);
    } else if (!aiSettings.modelSemanticEnabled && modelData.embedding) {
      delete modelData.embedding;
    }

    if (isReplace && replaceId) {
      const updatedModel = { ...modelData, id: replaceId, updatedAt: new Date().toISOString() };
      const updated = modelLibrary.models.map(m => m.id === replaceId ? updatedModel : m);
      modelLibrary.setModels(updated as Model[]);
      if (cloudSyncRef.current?.trackChange) cloudSyncRef.current.trackChange('update', updatedModel as Model);
    } else {
      const newModel: Model = { ...modelData, id: crypto.randomUUID(), updatedAt: new Date().toISOString() } as Model;
      modelLibrary.setModels(prev => [...prev, newModel]);
      if (cloudSyncRef.current?.trackChange) cloudSyncRef.current.trackChange('create', newModel);
    }

    modelLibrary.setHasUnsavedChanges(true);
    TFIDFSimilarity.invalidate();
    apiCache.invalidate('suggestions_');
    showToast(`✅ Modelo "${modelData.title}" ${isReplace ? 'substituído' : 'salvo'} com sucesso!`, 'success');
    closeModal('extractedModelPreview');
    modelLibrary.setExtractedModelPreview(null);
  }, [aiSettings.modelSemanticEnabled, searchModelReady, modelLibrary, apiCache, showToast, closeModal]);

  /**
   * Processa fila de salvamento em lote (bulk)
   * Usa recursão com verificação de similaridade para cada modelo
   */
  const processBulkSaveNext = useCallback(async (
    queue: Array<{ title: string; content: string; keywords?: string | string[]; category?: string; embedding?: number[] }>,
    saved: Model[],
    skipped: number,
    replacements: Array<{ oldId: string; newModel: Model }>
  ) => {
    if (queue.length === 0) {
      if (saved.length > 0 || replacements.length > 0) {
        // Gerar embeddings para todos os modelos novos se IA local ativa E opção ativada
        if (aiSettings.modelSemanticEnabled && searchModelReady) {
          for (const model of saved) {
            if (!model.embedding) {
              model.embedding = await generateModelEmbedding(model, aiSettings.modelSemanticEnabled, searchModelReady);
            }
          }
          for (const { newModel } of replacements) {
            if (!newModel.embedding) {
              newModel.embedding = await generateModelEmbedding(newModel, aiSettings.modelSemanticEnabled, searchModelReady);
            }
          }
        }

        let updatedModels = [...modelLibrary.models];
        const batchChanges: Array<{ operation: 'create' | 'update' | 'delete'; model: Partial<Model> & { id: string } }> = [];

        for (const { oldId, newModel } of replacements) {
          const replacedModel = { ...newModel, id: oldId, updatedAt: new Date().toISOString() };
          updatedModels = updatedModels.map(m => m.id === oldId ? replacedModel : m);
          batchChanges.push({ operation: 'update', model: replacedModel });
        }

        modelLibrary.setModels([...updatedModels, ...saved]);
        saved.forEach((model: Model) => batchChanges.push({ operation: 'create', model }));

        if (cloudSyncRef.current?.trackChangeBatch && batchChanges.length > 0) {
          cloudSyncRef.current.trackChangeBatch(batchChanges);
        }

        modelLibrary.setHasUnsavedChanges(true);
        TFIDFSimilarity.invalidate();
        apiCache.invalidate('suggestions_');
      }

      closeModal('bulkReview');
      closeModal('bulkModal');

      const total = saved.length + replacements.length;
      const msg = skipped > 0
        ? `✅ ${total} modelo(s) adicionado(s). ${skipped} ignorado(s).`
        : `✅ ${total} modelo(s) adicionado(s) com sucesso!`;
      showToast(msg, 'success');
      return;
    }

    const [current, ...rest] = queue;
    const currentModel: Model = { ...current, id: crypto.randomUUID(), updatedAt: new Date().toISOString() } as Model;
    const simResult = TFIDFSimilarity.findSimilar(currentModel, [...modelLibrary.models, ...saved], 0.80);

    if (simResult.hasSimilar) {
      modelLibrary.setSimilarityWarning({
        context: 'saveBulkModel',
        newModel: currentModel,
        similarModel: simResult.similarModel,
        similarity: simResult.similarity,
        bulkQueue: rest,
        bulkSaved: saved,
        bulkSkipped: skipped,
        bulkReplacements: replacements
      });
    } else {
      saved.push(currentModel);
      await processBulkSaveNext(rest, saved, skipped, replacements);
    }
  }, [aiSettings.modelSemanticEnabled, searchModelReady, modelLibrary, apiCache, closeModal, showToast]);

  // ══════════════════════════════════════════════════════════════════════════
  // HANDLERS DO MODAL DE SIMILARIDADE
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Cancela o salvamento (ignora modelo similar no bulk)
   */
  const handleSimilarityCancel = useCallback(() => {
    const w = modelLibrary.similarityWarning;
    if (w?.context === 'saveBulkModel') {
      modelLibrary.setSimilarityWarning(null);
      setTimeout(() => processBulkSaveNext(w.bulkQueue || [], w.bulkSaved || [], (w.bulkSkipped || 0) + 1, w.bulkReplacements || []), 0);
    } else {
      modelLibrary.setSimilarityWarning(null);
    }
  }, [modelLibrary, processBulkSaveNext]);

  /**
   * Salva como novo modelo (mesmo com similaridade)
   */
  const handleSimilaritySaveNew = useCallback(async () => {
    const w = modelLibrary.similarityWarning;
    if (!w) return;

    setSavingFromSimilarity(true);
    await new Promise(resolve => setTimeout(resolve, 50));

    if (w.context === 'saveModel') await executeSaveModel(w.newModel);
    else if (w.context === 'saveExtractedModel') await executeExtractedModelSave(w.newModel);
    else if (w.context === 'saveAsNew') await executeSaveAsNew(w.newModel);
    else if (w.context === 'saveBulkModel') {
      setSavingFromSimilarity(false);
      modelLibrary.setSimilarityWarning(null);
      const bulkSaved = w.bulkSaved || [];
      bulkSaved.push(w.newModel);
      setTimeout(() => processBulkSaveNext(w.bulkQueue || [], bulkSaved, w.bulkSkipped || 0, w.bulkReplacements || []), 0);
      return;
    }

    setSavingFromSimilarity(false);
    modelLibrary.setSimilarityWarning(null);
  }, [modelLibrary, executeSaveModel, executeExtractedModelSave, executeSaveAsNew, processBulkSaveNext]);

  /**
   * Substitui modelo existente similar
   */
  const handleSimilarityReplace = useCallback(async () => {
    const w = modelLibrary.similarityWarning;
    if (!w) return;

    setSavingFromSimilarity(true);
    await new Promise(resolve => setTimeout(resolve, 50));

    if (w.context === 'saveModel') await executeSaveModel(w.newModel, true, w.similarModel.id);
    else if (w.context === 'saveExtractedModel') await executeExtractedModelSave(w.newModel, true, w.similarModel.id);
    else if (w.context === 'saveAsNew') await executeSaveAsNew(w.newModel, true, w.similarModel.id);
    else if (w.context === 'saveBulkModel') {
      setSavingFromSimilarity(false);
      modelLibrary.setSimilarityWarning(null);
      const bulkReplacements = w.bulkReplacements || [];
      bulkReplacements.push({ oldId: w.similarModel.id, newModel: w.newModel });
      setTimeout(() => processBulkSaveNext(w.bulkQueue || [], w.bulkSaved || [], w.bulkSkipped || 0, bulkReplacements), 0);
      return;
    }

    setSavingFromSimilarity(false);
    modelLibrary.setSimilarityWarning(null);
  }, [modelLibrary, executeSaveModel, executeExtractedModelSave, executeSaveAsNew, processBulkSaveNext]);

  // ══════════════════════════════════════════════════════════════════════════
  // RETORNO
  // ══════════════════════════════════════════════════════════════════════════

  return {
    // Estados
    savingModel,
    modelSaved,
    savingFromSimilarity,

    // Funções de salvamento
    saveModel,
    saveModelWithoutClosing,
    executeSaveModel,
    executeSaveAsNew,
    executeExtractedModelSave,
    processBulkSaveNext,

    // Handlers do modal de similaridade
    handleSimilarityCancel,
    handleSimilaritySaveNew,
    handleSimilarityReplace,
  };
}
