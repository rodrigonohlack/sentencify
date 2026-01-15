/**
 * @file useTopicEditorHandlers.ts
 * @description Handlers para operações de edição de tópicos
 * @version 1.37.58
 */

import { useCallback } from 'react';
import type { Topic } from '../types';
import { isRelatorio, isDispositivo, isSpecialTopic } from '../utils/text';

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

interface QuillInstance {
  root: HTMLElement;
  getSelection: () => { index: number; length: number } | null;
  getLength: () => number;
  insertText: (index: number, text: string) => void;
  setSelection: (index: number, length?: number) => void;
  clipboard: {
    dangerouslyPasteHTML: (index: number, html: string) => void;
    convert: (html: string) => QuillDelta | null;
  };
}

interface QuillDelta {
  ops?: Array<{ insert?: string | object }>;
}

interface ModelLibrary {
  setSuggestions: (suggestions: unknown[]) => void;
  setLoadingSuggestions: (loading: boolean) => void;
  setSuggestionsSource: (source: string | null) => void;
}

interface SuggestionsResult {
  suggestions: unknown[];
  source: string;
}

interface UseTopicEditorHandlersProps {
  selectedTopics: Topic[];
  setSelectedTopics: (topics: Topic[]) => void;
  editingTopic: Topic | null;
  setEditingTopic: (topic: Topic | null) => void;
  setTopicToDelete: (topic: Topic | null) => void;
  setActiveTab: (tab: string) => void;
  openModal: (modalId: string) => void;
  modelLibrary: ModelLibrary;
  editorRef: React.RefObject<QuillInstance | null>;
  editorContainerRef: React.RefObject<HTMLElement | null>;
  sanitizeHTML: (html: string) => string;
  findSuggestions: (topic: Topic) => Promise<SuggestionsResult>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hook para handlers de operações de tópicos no editor
 *
 * @example
 * const handlers = useTopicEditorHandlers({ ... });
 */
export default function useTopicEditorHandlers({
  selectedTopics,
  setSelectedTopics,
  editingTopic,
  setEditingTopic,
  setTopicToDelete,
  setActiveTab,
  openModal,
  modelLibrary,
  editorRef,
  editorContainerRef,
  sanitizeHTML,
  findSuggestions,
}: UseTopicEditorHandlersProps) {

  /**
   * Toggle seleção de um tópico (adiciona/remove da lista de selecionados)
   */
  const toggleTopicSelection = useCallback((topic: Topic) => {
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
  }, [selectedTopics, setSelectedTopics]);

  /**
   * Prepara a deleção de um tópico (abre modal de confirmação)
   */
  const deleteTopic = useCallback((topicToDelete: Topic) => {
    setTopicToDelete(topicToDelete);
    openModal('deleteTopic');
  }, [setTopicToDelete, openModal]);

  /**
   * Move tópico para cima na lista
   */
  const moveTopicUp = useCallback((index: number) => {
    if (index === 0) return;

    // Bloquear movimento de RELATÓRIO e DISPOSITIVO
    const topic = selectedTopics[index];
    const targetTopic = selectedTopics[index - 1];

    if (isSpecialTopic(topic) || isSpecialTopic(targetTopic)) {
      return;
    }

    const newTopics = [...selectedTopics];
    [newTopics[index - 1], newTopics[index]] = [newTopics[index], newTopics[index - 1]];
    setSelectedTopics(newTopics);
  }, [selectedTopics, setSelectedTopics]);

  /**
   * Move tópico para baixo na lista
   */
  const moveTopicDown = useCallback((index: number) => {
    if (index === selectedTopics.length - 1) return;

    // Bloquear movimento de RELATÓRIO e DISPOSITIVO
    const topic = selectedTopics[index];
    const targetTopic = selectedTopics[index + 1];

    if (isSpecialTopic(topic) || isSpecialTopic(targetTopic)) {
      return;
    }

    const newTopics = [...selectedTopics];
    [newTopics[index], newTopics[index + 1]] = [newTopics[index + 1], newTopics[index]];
    setSelectedTopics(newTopics);
  }, [selectedTopics, setSelectedTopics]);

  /**
   * Move tópico para posição específica
   */
  const moveTopicToPosition = useCallback((currentIndex: number, newPosition: number) => {
    if (newPosition < 1 || newPosition > selectedTopics.length) return;
    const newIndex = newPosition - 1;
    if (currentIndex === newIndex) return;

    // Bloquear movimento de RELATÓRIO e DISPOSITIVO
    const topic = selectedTopics[currentIndex];
    const targetTopic = selectedTopics[newIndex];

    if (isSpecialTopic(topic) || isSpecialTopic(targetTopic)) {
      return;
    }

    const newTopics = [...selectedTopics];
    const [movedTopic] = newTopics.splice(currentIndex, 1);
    newTopics.splice(newIndex, 0, movedTopic);
    setSelectedTopics(newTopics);
  }, [selectedTopics, setSelectedTopics]);

  /**
   * Inicia edição de um tópico
   */
  const startEditing = useCallback(async (topic: Topic) => {
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
      const { suggestions, source } = await findSuggestions(topicCopy);
      modelLibrary.setSuggestions(suggestions);
      modelLibrary.setSuggestionsSource(source);
    } catch (error) {
      modelLibrary.setSuggestions([]);
      modelLibrary.setSuggestionsSource(null);
    } finally {
      modelLibrary.setLoadingSuggestions(false);
    }
  }, [setEditingTopic, modelLibrary, setActiveTab, editorContainerRef, findSuggestions]);

  /**
   * Insere conteúdo de modelo no editor
   */
  const insertModelContent = useCallback((content: string) => {
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
        const delta = quill.clipboard.convert(sanitizedContent);
        // Calcular comprimento do delta manualmente
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
  }, [editorRef, editingTopic, sanitizeHTML, setEditingTopic]);

  return {
    toggleTopicSelection,
    deleteTopic,
    moveTopicUp,
    moveTopicDown,
    moveTopicToPosition,
    startEditing,
    insertModelContent,
  };
}

export { useTopicEditorHandlers };
