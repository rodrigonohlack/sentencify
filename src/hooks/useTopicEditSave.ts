/**
 * @file useTopicEditSave.ts
 * @description Hook para salvar edições de tópicos (consolidado saveTopicEdit + saveTopicEditWithoutClosing)
 * @version 1.37.58
 */

import { useCallback } from 'react';
import type { Topic } from '../types';
import { htmlToPlainText } from '../utils/html-conversion';
import type { ResultadoValido } from './useResultadoDetection';

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

interface QuillInstance {
  root: HTMLElement;
}

interface ModelLibrary {
  setSuggestions: (suggestions: unknown[]) => void;
}

interface UseTopicEditSaveProps {
  editingTopic: Topic | null;
  setEditingTopic: (topic: Topic | null) => void;
  selectedTopics: Topic[];
  setSelectedTopics: (topics: Topic[]) => void;
  extractedTopics: Topic[];
  setExtractedTopics: (topics: Topic[]) => void;
  editorRef: React.RefObject<QuillInstance | null>;
  relatorioRef: React.RefObject<QuillInstance | null>;
  modelLibrary: ModelLibrary;
  setActiveTab: (tab: string) => void;
  setLastEditedTopicTitle: (title: string) => void;
  setSavingTopic: (saving: boolean) => void;
  sanitizeHTML: (html: string) => string;
  detectResultadoAutomatico: (
    topicTitle: string,
    decisionText: string,
    topicCategory: string
  ) => Promise<ResultadoValido | null>;
}

interface SaveOptions {
  closeEditor?: boolean;
  detectResultado?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITÁRIOS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Mostra toast de sucesso temporário
 */
function showSuccessToast(message: string = 'Salvo!'): void {
  const successMsg = document.createElement('div');
  successMsg.className = 'fixed top-4 left-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2 animate-pulse';
  successMsg.innerHTML = `<span>✓</span> ${message}`;

  document.body.appendChild(successMsg);
  setTimeout(() => successMsg.remove(), 3000);
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hook para salvar edições de tópicos
 *
 * @example
 * const { saveTopicEdit, saveTopicEditWithoutClosing } = useTopicEditSave({ ... });
 */
export default function useTopicEditSave({
  editingTopic,
  setEditingTopic,
  selectedTopics,
  setSelectedTopics,
  extractedTopics,
  setExtractedTopics,
  editorRef,
  relatorioRef,
  modelLibrary,
  setActiveTab,
  setLastEditedTopicTitle,
  setSavingTopic,
  sanitizeHTML,
  detectResultadoAutomatico,
}: UseTopicEditSaveProps) {

  /**
   * Função interna unificada para salvar tópico
   */
  const saveTopicEditInternal = useCallback(async (options: SaveOptions = {}) => {
    const { closeEditor = true, detectResultado = true } = options;

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

      let updatedTopic: Topic = {
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

      // Detectar resultado automaticamente APENAS se solicitado e não foi escolha manual
      if (detectResultado && !updatedTopic.resultadoManual) {
        const resultadoDetectado = await detectResultadoAutomatico(
          updatedTopic.title || '',
          content,
          updatedTopic.category || ''
        );

        if (resultadoDetectado) {
          updatedTopic.resultado = resultadoDetectado;
        }
      }

      // Atualizar selectedTopics
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

      if (closeEditor) {
        setEditingTopic(null);
        modelLibrary.setSuggestions([]);
        setActiveTab('topics');
      } else {
        // Atualizar editingTopic com os dados salvos
        setEditingTopic(updatedTopic);
        showSuccessToast();
      }

    } finally {
      setSavingTopic(false);
    }
  }, [
    editingTopic,
    setEditingTopic,
    selectedTopics,
    setSelectedTopics,
    extractedTopics,
    setExtractedTopics,
    editorRef,
    relatorioRef,
    modelLibrary,
    setActiveTab,
    setLastEditedTopicTitle,
    setSavingTopic,
    sanitizeHTML,
    detectResultadoAutomatico,
  ]);

  /**
   * Salva e fecha o editor
   */
  const saveTopicEdit = useCallback(async () => {
    return saveTopicEditInternal({ closeEditor: true, detectResultado: true });
  }, [saveTopicEditInternal]);

  /**
   * Salva sem fechar o editor (Ctrl+S)
   */
  const saveTopicEditWithoutClosing = useCallback(async () => {
    return saveTopicEditInternal({ closeEditor: false, detectResultado: false });
  }, [saveTopicEditInternal]);

  return {
    saveTopicEdit,
    saveTopicEditWithoutClosing,
  };
}

export { useTopicEditSave };
