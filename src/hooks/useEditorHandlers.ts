/**
 * @file useEditorHandlers.ts
 * @description Hook para handlers de edição de tópicos
 *
 * FASE 50: Extraído do App.tsx para consolidar handlers
 * relacionados ao editor de decisão.
 *
 * Responsabilidades:
 * - handleFundamentacaoChange - Atualiza fundamentação
 * - handleRelatorioChange - Atualiza mini-relatório
 * - handleCategoryChange - Atualiza categoria do tópico
 * - getTopicEditorConfig - Retorna configuração por tipo de tópico
 */

import { useCallback } from 'react';
import type { Topic, TopicCategory } from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

export interface TopicEditorConfig {
  showCategory: boolean;
  showMiniRelatorio: boolean;
  showDecisionEditor: boolean;
  relatorioConfig: {
    label?: string;
    minHeight?: string;
    showRegenerateSection?: boolean;
  };
  editorConfig: {
    label?: string;
    placeholder?: string;
    showRegenerateSection?: boolean;
  };
}

export interface UseEditorHandlersProps {
  editingTopicTitle: string | undefined;
  setEditingTopic: React.Dispatch<React.SetStateAction<Topic | null>>;
  setSelectedTopics: React.Dispatch<React.SetStateAction<Topic[]>>;
  setExtractedTopics: React.Dispatch<React.SetStateAction<Topic[]>>;
}

export interface UseEditorHandlersReturn {
  handleFundamentacaoChange: (html: string) => void;
  handleRelatorioChange: (html: string) => void;
  handleCategoryChange: (newCategory: string) => void;
  getTopicEditorConfig: (topicTitle: string) => TopicEditorConfig;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hook para handlers de edição de tópicos
 *
 * @param props - Dependências necessárias
 */
export function useEditorHandlers({
  editingTopicTitle,
  setEditingTopic,
  setSelectedTopics,
  setExtractedTopics,
}: UseEditorHandlersProps): UseEditorHandlersReturn {
  // ═══════════════════════════════════════════════════════════════════════════════
  // HANDLERS DE CONTEÚDO
  // ═══════════════════════════════════════════════════════════════════════════════

  const handleFundamentacaoChange = useCallback((html: string) => {
    setEditingTopic(prev => {
      if (!prev) return prev;
      return { ...prev, editedFundamentacao: html };
    });
  }, [setEditingTopic]);

  const handleRelatorioChange = useCallback((html: string) => {
    setEditingTopic(prev => {
      if (!prev) return prev;
      return { ...prev, editedRelatorio: html };
    });
  }, [setEditingTopic]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // HANDLER DE CATEGORIA
  // ═══════════════════════════════════════════════════════════════════════════════

  const handleCategoryChange = useCallback((newCategory: string) => {
    setEditingTopic(prev => {
      if (!prev) return prev;
      return { ...prev, category: newCategory as TopicCategory };
    });

    // Atualiza selectedTopics
    setSelectedTopics(prevSelected => {
      const selectedIndex = prevSelected.findIndex((t: Topic) => t.title === editingTopicTitle);
      if (selectedIndex === -1) return prevSelected;

      const newSelected = [...prevSelected];
      newSelected[selectedIndex] = { ...newSelected[selectedIndex], category: newCategory as TopicCategory };
      return newSelected;
    });

    // Atualiza extractedTopics
    setExtractedTopics(prevExtracted => {
      const extractedIndex = prevExtracted.findIndex((t: Topic) => t.title === editingTopicTitle);
      if (extractedIndex === -1) return prevExtracted;

      const newExtracted = [...prevExtracted];
      newExtracted[extractedIndex] = { ...newExtracted[extractedIndex], category: newCategory as TopicCategory };
      return newExtracted;
    });
  }, [editingTopicTitle, setEditingTopic, setSelectedTopics, setExtractedTopics]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // CONFIGURAÇÃO DO EDITOR
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * v1.4.7: Helper Centralizado para Configuração de Editores por Tipo
   * Este helper retorna configuração específica para cada tipo de tópico,
   * permitindo especialização de editores sem acoplar componentes filhos.
   */
  const getTopicEditorConfig = useCallback((topicTitle: string): TopicEditorConfig => {
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

  return {
    handleFundamentacaoChange,
    handleRelatorioChange,
    handleCategoryChange,
    getTopicEditorConfig,
  };
}

export default useEditorHandlers;
