/**
 * @file useModelEditing.ts
 * @description Hook para handlers de edição de modelos
 * @version 1.38.52
 *
 * Extraído do App.tsx para reduzir tamanho do arquivo.
 * Contém handlers para: saveQuickEdit, confirmSaveAsNew, startEditingModel, duplicateModel.
 */

import { useCallback } from 'react';
import type { Model, SimilarityWarningState } from '../types';
import { generateModelId } from '../utils/text';
import { TFIDFSimilarity } from '../services/EmbeddingsServices';
import AIModelService from '../services/AIModelService';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Model Library subset needed for model editing
 */
interface ModelLibraryForEditing {
  models: Model[];
  suggestions: Model[];
  setModels: React.Dispatch<React.SetStateAction<Model[]>> | ((models: Model[]) => void);
  setSuggestions: ((suggestions: Model[]) => void);
  setEditingModel: (model: Model | null) => void;
  setNewModel: (model: { title: string; content: string; keywords: string; category: string }) => void;
  setHasUnsavedChanges: (value: boolean) => void;
  setSimilarityWarning: (warning: SimilarityWarningState | null) => void;
}

/**
 * Model Preview subset needed for model editing
 */
interface ModelPreviewForEditing {
  previewingModel: Model | null;
  editedContent: string | null;
  saveAsNewData: { title: string; keywords?: string; category?: string; content: string } | null;
  onModelUpdatedRef: React.RefObject<((model: Model) => void) | null> | null;
  openPreview: (model: Model) => void;
  cancelEditing: () => void;
  closeSaveAsNew: () => void;
  closePreview: () => void;
}

/**
 * AI Settings subset needed for model editing
 */
interface AISettingsForEditing {
  modelSemanticEnabled?: boolean;
}

/**
 * AI Integration subset needed for model editing
 */
interface AIIntegrationForEditing {
  aiSettings: AISettingsForEditing;
}

/**
 * Cloud Sync subset needed for model editing
 */
interface CloudSyncForEditing {
  trackChange?: (action: 'create' | 'update' | 'delete', model: Model) => void;
}

/**
 * API Cache subset needed for model editing
 */
interface APICacheForEditing {
  invalidate: (prefix: string) => void;
}

export interface UseModelEditingProps {
  modelLibrary: ModelLibraryForEditing;
  modelPreview: ModelPreviewForEditing;
  aiIntegration: AIIntegrationForEditing;
  cloudSync: CloudSyncForEditing | null;
  apiCache: APICacheForEditing;
  searchModelReady: boolean;
  sanitizeHTML: (html: string) => string;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  setError: (error: string) => void;
  openModal: (modal: string) => void;
  modelFormRef: React.RefObject<HTMLDivElement | null>;
  modelEditorRef: React.RefObject<{ root?: HTMLElement } | null>;
}

export interface UseModelEditingReturn {
  saveQuickEdit: (editorRef: React.RefObject<{ root?: HTMLElement } | null>) => Promise<void>;
  confirmSaveAsNew: () => Promise<void>;
  startEditingModel: (model: Model) => void;
  duplicateModel: (model: Model) => Promise<void>;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Strips HTML tags from a string
 */
const stripHTML = (html: string): string => {
  const div = document.createElement('div');
  div.innerHTML = html || '';
  return div.textContent || div.innerText || '';
};

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

export function useModelEditing(props: UseModelEditingProps): UseModelEditingReturn {
  const {
    modelLibrary,
    modelPreview,
    aiIntegration,
    cloudSync,
    apiCache,
    searchModelReady,
    sanitizeHTML,
    showToast,
    setError,
    openModal,
    modelFormRef,
    modelEditorRef,
  } = props;

  /**
   * Saves quick edits to a model (from preview modal)
   * Regenerates embedding if local AI is active
   */
  const saveQuickEdit = useCallback(async (editorRef: React.RefObject<{ root?: HTMLElement } | null>) => {
    if (!modelPreview.previewingModel) {
      showToast('Erro: nenhum modelo selecionado', 'error');
      return;
    }

    // Capture content from Quill editor
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

      const updatedModel: Model = {
        ...modelPreview.previewingModel,
        content: newContent,
        updatedAt: new Date().toISOString()
      };

      // Regenerate embedding if local AI is active
      if (aiIntegration.aiSettings.modelSemanticEnabled && searchModelReady) {
        await new Promise(resolve => setTimeout(resolve, 50));
        try {
          const text = [updatedModel.title, updatedModel.keywords, stripHTML(updatedModel.content).slice(0, 2000)].filter(Boolean).join(' ');
          updatedModel.embedding = await AIModelService.getEmbedding(text, 'passage');
        } catch (err) {
          console.warn('[MODEL-EMBED] Erro ao regenerar embedding:', err);
        }
      } else if (updatedModel.embedding) {
        delete updatedModel.embedding;
      }

      modelLibrary.setModels(modelLibrary.models.map(m => m.id === modelId ? updatedModel : m));
      // Track update for sync
      if (cloudSync?.trackChange) cloudSync.trackChange('update', updatedModel);
      modelLibrary.setHasUnsavedChanges(true);
      TFIDFSimilarity.invalidate();
      apiCache.invalidate('suggestions_');

      // Sync suggestions if they exist
      if (modelLibrary.suggestions?.length > 0) {
        modelLibrary.setSuggestions(
          modelLibrary.suggestions.map(s => s.id === modelId ? updatedModel : s)
        );
      }

      // Notify listeners (e.g., GlobalEditorModal) about model update
      if (modelPreview.onModelUpdatedRef?.current) {
        modelPreview.onModelUpdatedRef.current(updatedModel);
      }

      // Update model in preview to reflect changes
      modelPreview.openPreview(updatedModel);
      modelPreview.cancelEditing();

      showToast('Modelo salvo com sucesso!', 'success');
    } catch (err) {
      showToast('Erro ao salvar modelo: ' + (err as Error).message, 'error');
    }
  }, [
    modelPreview,
    modelLibrary,
    aiIntegration.aiSettings.modelSemanticEnabled,
    searchModelReady,
    cloudSync,
    apiCache,
    sanitizeHTML,
    showToast,
  ]);

  /**
   * Saves as a new model (from edited preview)
   * Generates embedding automatically if local AI is active
   */
  const confirmSaveAsNew = useCallback(async () => {
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

    // Check similarity with TF-IDF
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

    // Generate embedding if local AI is active
    if (aiIntegration.aiSettings.modelSemanticEnabled && searchModelReady) {
      await new Promise(resolve => setTimeout(resolve, 50));
      try {
        const text = [modelData.title, modelData.keywords, stripHTML(modelData.content).slice(0, 2000)].filter(Boolean).join(' ');
        modelData.embedding = await AIModelService.getEmbedding(text, 'passage');
      } catch (err) {
        console.warn('[MODEL-EMBED] Erro ao gerar embedding:', err);
      }
    }

    // Save new model
    modelLibrary.setModels([...modelLibrary.models, modelData]);
    // Track create for sync
    if (cloudSync?.trackChange) cloudSync.trackChange('create', modelData);
    modelLibrary.setHasUnsavedChanges(true);
    TFIDFSimilarity.invalidate();
    apiCache.invalidate('suggestions_');

    showToast('Novo modelo criado com sucesso!', 'success');
    modelPreview.closeSaveAsNew();
    modelPreview.closePreview();
  }, [
    modelPreview,
    modelLibrary,
    aiIntegration.aiSettings.modelSemanticEnabled,
    searchModelReady,
    cloudSync,
    apiCache,
    sanitizeHTML,
    showToast,
  ]);

  /**
   * Starts editing a model in the model form
   */
  const startEditingModel = useCallback((model: Model) => {
    modelLibrary.setEditingModel(model);
    modelLibrary.setNewModel({
      title: model.title,
      content: model.content,
      keywords: typeof model.keywords === 'string' ? model.keywords : (model.keywords || []).join(', '),
      category: model.category || ''
    });
    openModal('modelForm');

    // Smooth scroll to form
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
  }, [modelLibrary, openModal, modelFormRef, modelEditorRef, sanitizeHTML]);

  /**
   * Duplicates a model
   * Generates embedding automatically if local AI is active
   */
  const duplicateModel = useCallback(async (model: Model) => {
    try {
      showToast('⏳ Duplicando modelo...', 'info');
      await new Promise(resolve => setTimeout(resolve, 50)); // yield for UI

      const modelId = generateModelId();
      const duplicatedModel: Model = {
        ...model,
        id: modelId,
        title: `${model.title} (Cópia)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        embedding: undefined, // Clear to regenerate with new title
        // Copy is own model, not shared
        isShared: false,
        ownerId: undefined,
        ownerEmail: undefined,
        sharedPermission: undefined,
      };

      // Generate new embedding if local AI is active
      if (aiIntegration.aiSettings.modelSemanticEnabled && searchModelReady) {
        await new Promise(resolve => setTimeout(resolve, 50));
        try {
          const text = [duplicatedModel.title, duplicatedModel.keywords, stripHTML(duplicatedModel.content).slice(0, 2000)].filter(Boolean).join(' ');
          duplicatedModel.embedding = await AIModelService.getEmbedding(text, 'passage');
        } catch (err) {
          console.warn('[MODEL-EMBED] Erro ao gerar embedding:', err);
        }
      }

      modelLibrary.setModels([...modelLibrary.models, duplicatedModel]);
      // Track create for sync (duplication creates new model)
      if (cloudSync?.trackChange) cloudSync.trackChange('create', duplicatedModel);
      modelLibrary.setHasUnsavedChanges(true);

      showToast('✅ Modelo duplicado com sucesso!', 'success');
    } catch (err) {
      setError('Erro ao duplicar modelo: ' + (err as Error).message);
    }
  }, [
    modelLibrary,
    aiIntegration.aiSettings.modelSemanticEnabled,
    searchModelReady,
    cloudSync,
    showToast,
    setError,
  ]);

  return {
    saveQuickEdit,
    confirmSaveAsNew,
    startEditingModel,
    duplicateModel,
  };
}
