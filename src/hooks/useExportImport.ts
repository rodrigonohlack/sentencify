/**
 * @file useExportImport.ts
 * @description Hook para exportar/importar configurações e modelos
 * @version v1.37.25
 *
 * Extraído do App.tsx para modularização.
 * Gerencia exportação e importação de configurações IA e modelos.
 */

import React from 'react';
import AIModelService from '../services/AIModelService';
import { stripInlineColors } from '../utils/color-stripper';
import type { Model, AISettings } from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

export interface ModelLibraryForExportImport {
  models: Model[];
  selectedCategory: string;
  setModels: (updater: Model[] | ((prev: Model[]) => Model[])) => void;
  setHasUnsavedChanges: (value: boolean) => void;
}

export interface AIIntegrationForExportImport {
  aiSettings: AISettings;
  setAiSettings: (settings: AISettings | ((prev: AISettings) => AISettings)) => void;
}

export interface CloudSyncForExportImport {
  trackChangeBatch?: (changes: Array<{ operation: 'create' | 'update' | 'delete'; model: Model }>) => void;
}

export interface UseExportImportProps {
  modelLibrary: ModelLibraryForExportImport;
  aiIntegration: AIIntegrationForExportImport;
  cloudSync: CloudSyncForExportImport | null;
  searchModelReady: boolean;
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  setError: (error: string) => void;
  generateModelId: () => string;
}

export interface UseExportImportReturn {
  exportAiSettings: () => Promise<void>;
  importAiSettings: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  exportModels: () => Promise<void>;
  importModels: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  checkDuplicate: (newModel: { title: string; content: string; category?: string }, existingModels: Model[]) => { isDuplicate: boolean; reason?: string; existingId?: string };
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

export function useExportImport({
  modelLibrary,
  aiIntegration,
  cloudSync,
  searchModelReady,
  showToast,
  setError,
  generateModelId
}: UseExportImportProps): UseExportImportReturn {

  // Export AI settings
  const exportAiSettings = React.useCallback(async () => {
    const dataStr = JSON.stringify(aiIntegration.aiSettings, null, 2);

    try {
      await navigator.clipboard.writeText(dataStr);

      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sentencify-configuracoes-' + new Date().toISOString().split('T')[0] + '.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast('Configurações exportadas com sucesso! Arquivo baixado e copiado para área de transferência.', 'success');
    } catch (err) {
      showToast('Erro ao exportar configurações: ' + (err as Error).message, 'error');
    }
  }, [aiIntegration.aiSettings, showToast]);

  // Import AI settings
  const importAiSettings = React.useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const importedSettings = JSON.parse(text);

      if (typeof importedSettings !== 'object') {
        showToast('Arquivo inválido.', 'error');
        return;
      }

      const mergedSettings = {
        model: importedSettings.model || 'claude-sonnet-4-20250514',
        useExtendedThinking: importedSettings.useExtendedThinking || false,
        customPrompt: importedSettings.customPrompt || '',
        modeloRelatorio: importedSettings.modeloRelatorio || '',
        modeloDispositivo: importedSettings.modeloDispositivo || '',
        modeloTopicoRelatorio: importedSettings.modeloTopicoRelatorio || '',
        topicosComplementares: importedSettings.topicosComplementares || [
          { id: 1, title: 'HONORÁRIOS ADVOCATÍCIOS', category: 'MÉRITO', enabled: true, ordem: 1 },
          { id: 2, title: 'HONORÁRIOS PERICIAIS', category: 'MÉRITO', enabled: true, ordem: 2 },
          { id: 3, title: 'JUROS E CORREÇÃO MONETÁRIA', category: 'MÉRITO', enabled: true, ordem: 3 },
          { id: 4, title: 'DEDUÇÕES DE NATUREZA PREVIDENCIÁRIA E FISCAL', category: 'MÉRITO', enabled: true, ordem: 4 },
          { id: 5, title: 'COMPENSAÇÃO/DEDUÇÃO/ABATIMENTO', category: 'MÉRITO', enabled: true, ordem: 5 }
        ]
      };

      aiIntegration.setAiSettings((prev: AISettings) => ({
        ...prev,
        ...mergedSettings
      }));
      showToast('Configurações importadas com sucesso!', 'success');
      event.target.value = '';
    } catch (err) {
      showToast('Erro ao importar: ' + (err as Error).message, 'error');
      event.target.value = '';
    }
  }, [aiIntegration, showToast]);

  // Export models
  const exportModels = React.useCallback(async () => {
    try {
      const modelsToExport = modelLibrary.selectedCategory === 'all'
        ? modelLibrary.models
        : modelLibrary.models.filter(m => m.category === modelLibrary.selectedCategory);

      const dataStr = JSON.stringify(modelsToExport, null, 2);

      // Copiar para clipboard
      await navigator.clipboard.writeText(dataStr);

      // Download do arquivo
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const categoryName = modelLibrary.selectedCategory === 'all' ? 'todos' : modelLibrary.selectedCategory.toLowerCase().replace(/\s+/g, '-');
      a.download = `sentencify-modelos-${categoryName}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      modelLibrary.setHasUnsavedChanges(false);
      showToast(`Modelos exportados com sucesso!\n\n${modelsToExport.length} modelo(s) exportado(s).\nArquivo baixado e copiado para área de transferência.`, 'success');
    } catch (err) {
      showToast('Erro ao exportar modelos: ' + (err as Error).message, 'error');
    }
  }, [modelLibrary, showToast]);

  // Check duplicate models
  const checkDuplicate = React.useCallback((
    newModel: { title: string; content: string; category?: string },
    existingModels: Model[]
  ): { isDuplicate: boolean; reason?: string; existingId?: string } => {
    // Level 1: Exact title + category match
    const exactMatch = existingModels.find(
      (existing: Model) => existing.title === newModel.title &&
                  existing.category === (newModel.category || '')
    );

    if (exactMatch) {
      return {
        isDuplicate: true,
        reason: 'Mesmo título e categoria',
        existingId: exactMatch.id
      };
    }

    // Level 2: Exact content match (normalized)
    const normalizeContent = (text: string) => {
      return text.toLowerCase().trim().replace(/\s+/g, ' ');
    };

    const contentA = normalizeContent(newModel.content);
    const contentMatch = existingModels.find(
      (existing: Model) => normalizeContent(existing.content) === contentA
    );

    if (contentMatch) {
      return {
        isDuplicate: true,
        reason: 'Conteúdo idêntico (título diferente)',
        existingId: contentMatch.id
      };
    }

    return { isDuplicate: false };
  }, []);

  // Import models
  const importModels = React.useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const importedModels = JSON.parse(text);

      if (!Array.isArray(importedModels)) {
        setError('Arquivo inválido. Deve conter um array de modelos.');
        return;
      }

      let importCount = 0;
      let duplicateCount = 0;
      const newModels: Model[] = [];
      const duplicates: Array<{ title: string; reason: string; existingId: string }> = [];

      for (const model of importedModels) {
        if (model.title && model.content) {
          const dupCheck = checkDuplicate(model, modelLibrary.models);

          if (dupCheck.isDuplicate) {
            duplicateCount++;
            duplicates.push({
              title: model.title,
              reason: dupCheck.reason || 'duplicado',
              existingId: dupCheck.existingId || ''
            });
            continue; // SKIP this model
          }

          const modelId = `${generateModelId()}_import${importCount}`;
          // v1.37.81: Sanitizar cores inline (sistema color-free)
          const modelData: Model = {
            id: modelId,
            title: model.title as string,
            content: stripInlineColors(model.content as string),
            keywords: model.keywords || '',
            category: model.category || '',
            createdAt: new Date().toISOString(),
            embedding: model.embedding
          };
          newModels.push(modelData);
          importCount++;
        }
      }

      // Generate embeddings for models without embedding if AI is ready
      if (aiIntegration.aiSettings.modelSemanticEnabled && searchModelReady && newModels.length > 0) {
        const modelsWithoutEmbedding = newModels.filter(m => !m.embedding || m.embedding.length !== 768);
        if (modelsWithoutEmbedding.length > 0) {
          const stripHTML = (html: string) => {
            const div = document.createElement('div');
            div.innerHTML = html || '';
            return div.textContent || div.innerText || '';
          };
          for (const model of modelsWithoutEmbedding) {
            try {
              const text = [model.title, model.keywords, stripHTML(model.content).slice(0, 2000)].filter(Boolean).join(' ');
              model.embedding = await AIModelService.getEmbedding(text, 'passage');
              // Yield to not block UI
              await new Promise(resolve => setTimeout(resolve, 0));
            } catch (err) {
              console.warn('[MODEL-EMBED] Erro ao gerar embedding para modelo importado:', err);
            }
          }
        }
      }

      if (newModels.length > 0) {
        modelLibrary.setModels(prev => [...prev, ...newModels]);
        // Use trackChangeBatch for efficient import
        if (cloudSync?.trackChangeBatch) {
          cloudSync.trackChangeBatch(newModels.map(model => ({ operation: 'create', model })));
        }
        modelLibrary.setHasUnsavedChanges(true);
      }

      setError('');

      // Enhanced notification
      if (duplicateCount > 0) {
        showToast(
          `${importCount} modelo(s) importado(s) com sucesso!\n${duplicateCount} duplicata(s) ignorada(s)`,
          importCount > 0 ? 'success' : 'warning'
        );
      } else {
        showToast(`${importCount} modelo(s) importado(s) com sucesso!`, 'success');
      }

    } catch (err) {
      setError('Erro ao importar modelos: ' + (err as Error).message);
    }
  }, [modelLibrary, aiIntegration.aiSettings.modelSemanticEnabled, searchModelReady, cloudSync, showToast, setError, generateModelId, checkDuplicate]);

  return {
    exportAiSettings,
    importAiSettings,
    exportModels,
    importModels,
    checkDuplicate
  };
}
