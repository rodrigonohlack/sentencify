/**
 * @file useTopicEditing.ts
 * @description Hook para handlers de edição de tópicos
 * @version 1.38.52
 *
 * Extraído do App.tsx para reduzir tamanho do arquivo.
 * Contém handlers para: toggleTopicSelection, deleteTopic, saveTopicEdit, saveTopicEditWithoutClosing.
 */

import { useCallback } from 'react';
import type {
  Topic,
  TopicResultado,
  ModalKey,
  QuillInstance,
  AIMessage,
  AICallOptions,
} from '../types';
import { htmlToPlainText } from '../utils/html-conversion';
import { isRelatorio, isDispositivo } from '../utils/text';
import { AI_PROMPTS } from '../prompts';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * AI Integration subset needed for topic editing
 */
interface AIIntegrationForTopicEditing {
  callAI: (messages: AIMessage[], options?: AICallOptions) => Promise<string>;
}

/**
 * Topic Manager subset needed for topic editing
 */
interface TopicManagerForEditing {
  editingTopic: Topic | null;
  selectedTopics: Topic[];
  extractedTopics: Topic[];
  setSavingTopic: (saving: boolean) => void;
  setEditingTopic: (topic: Topic | null) => void;
  setSelectedTopics: React.Dispatch<React.SetStateAction<Topic[]>>;
  setExtractedTopics: (topics: Topic[]) => void;
  setLastEditedTopicTitle: (title: string | null) => void;
  setTopicToDelete: (topic: Topic | null) => void;
}

/**
 * Model Library subset needed for topic editing
 */
interface ModelLibraryForTopicEditing {
  setSuggestions: (suggestions: never[]) => void;
}

export interface UseTopicEditingProps {
  topicManager: TopicManagerForEditing;
  aiIntegration: AIIntegrationForTopicEditing;
  modelLibrary: ModelLibraryForTopicEditing;
  openModal: (modal: ModalKey) => void;
  setActiveTab: (tab: string) => void;
  sanitizeHTML: (html: string) => string;
  editorRef: React.RefObject<QuillInstance | null>;
  relatorioRef: React.RefObject<QuillInstance | null>;
}

export interface UseTopicEditingReturn {
  toggleTopicSelection: (topic: Topic) => void;
  deleteTopic: (topic: Topic) => void;
  saveTopicEdit: () => Promise<void>;
  saveTopicEditWithoutClosing: () => Promise<void>;
  detectResultadoAutomatico: (
    topicTitle: string,
    decisionText: string,
    topicCategory: string
  ) => Promise<TopicResultado>;
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

export function useTopicEditing(props: UseTopicEditingProps): UseTopicEditingReturn {
  const {
    topicManager,
    aiIntegration,
    modelLibrary,
    openModal,
    setActiveTab,
    sanitizeHTML,
    editorRef,
    relatorioRef,
  } = props;

  const {
    editingTopic,
    selectedTopics,
    extractedTopics,
    setSavingTopic,
    setEditingTopic,
    setSelectedTopics,
    setExtractedTopics,
    setLastEditedTopicTitle,
    setTopicToDelete,
  } = topicManager;

  /**
   * Detecta automaticamente o resultado do julgamento baseado no texto
   */
  const detectResultadoAutomatico = useCallback(async (
    topicTitle: string,
    decisionText: string,
    topicCategory: string
  ): Promise<TopicResultado> => {
    // Não detectar para RELATÓRIO e DISPOSITIVO
    if (topicTitle.toUpperCase() === 'RELATÓRIO' || topicTitle.toUpperCase() === 'DISPOSITIVO') {
      return null;
    }

    // Se não há texto de decisão, não detectar
    if (!decisionText || decisionText.trim() === '') {
      return null;
    }

    try {
      const plainText = htmlToPlainText(decisionText);

      const prompt = `${AI_PROMPTS.roles.classificacao}

TÓPICO SENDO ANALISADO:
Título: ${topicTitle}
Categoria: ${topicCategory || 'Não especificada'}

TEXTO DA DECISÃO ESCRITA PELO USUÁRIO:
${plainText}

TAREFA:
Analise o texto da decisão e identifique o resultado do julgamento.

OPÇÕES POSSÍVEIS (escolha UMA):
1. PROCEDENTE - quando o pedido foi totalmente deferido/acolhido
2. IMPROCEDENTE - quando o pedido foi totalmente indeferido/rejeitado
3. PARCIALMENTE PROCEDENTE - quando o pedido foi parcialmente deferido
4. ACOLHIDO - quando uma preliminar, exceção ou questão processual foi acolhida
5. REJEITADO - quando uma preliminar, exceção ou questão processual foi rejeitada
6. SEM RESULTADO - para tópicos administrativos/acessórios sem julgamento de mérito
7. INDEFINIDO - quando o texto não deixa claro o resultado ou está incompleto

CRITÉRIOS DE ANÁLISE:
- Procure por palavras-chave como: "defiro", "indefiro", "julgo procedente", "julgo improcedente", "parcialmente", "acolho", "rejeito"
- Considere o contexto geral do texto
- Se a categoria for PRELIMINAR, prefira ACOLHIDO/REJEITADO
- Se a categoria for MÉRITO, prefira PROCEDENTE/IMPROCEDENTE/PARCIALMENTE PROCEDENTE
- Se o tópico tratar de deduções previdenciárias, prazos e condições para cumprimento da decisão, juros ou correção monetária, retorne SEM RESULTADO
- Se houver dúvida ou o texto estiver incompleto, retorne INDEFINIDO

Responda APENAS com uma das palavras: PROCEDENTE, IMPROCEDENTE, PARCIALMENTE PROCEDENTE, ACOLHIDO, REJEITADO, SEM RESULTADO ou INDEFINIDO.
Não adicione explicações, pontos finais ou outros caracteres. Apenas a palavra.`;

      const textContent = await aiIntegration.callAI([{
        role: 'user',
        content: [{ type: 'text', text: prompt }]
      }], {
        maxTokens: 500,
        useInstructions: false,
        logMetrics: true,
        temperature: 0.0,
        topP: 0.9,
        topK: 20
      });

      const resultado = textContent.toUpperCase().trim();

      // Mapear para TopicResultado válido
      const validResults: TopicResultado[] = [
        'PROCEDENTE', 'IMPROCEDENTE', 'PARCIALMENTE PROCEDENTE',
        'ACOLHIDO', 'REJEITADO', 'SEM RESULTADO', 'INDEFINIDO'
      ];

      if (validResults.includes(resultado as TopicResultado)) {
        return resultado as TopicResultado;
      }

      return null;
    } catch (error) {
      return null;
    }
  }, [aiIntegration]);

  /**
   * Toggle selection of a topic (add/remove from selected list)
   * Handles special placement rules for RELATÓRIO (first) and DISPOSITIVO (last)
   */
  const toggleTopicSelection = useCallback((topic: Topic) => {
    const topicTitleUpper = (topic.title || '').toUpperCase().trim();
    const exists = selectedTopics.find(t => (t.title || '').toUpperCase().trim() === topicTitleUpper);

    if (exists) {
      // Remove topic if already selected
      setSelectedTopics(selectedTopics.filter(t => (t.title || '').toUpperCase().trim() !== topicTitleUpper));
    } else {
      // Add topic
      const newTopic = { ...topic, order: selectedTopics.length };

      // If RELATÓRIO, add at beginning
      if (isRelatorio(topic)) {
        setSelectedTopics([newTopic, ...selectedTopics]);
        return;
      }

      // If DISPOSITIVO, add at end
      if (isDispositivo(topic)) {
        setSelectedTopics([...selectedTopics, newTopic]);
        return;
      }

      // For any other topic, insert before DISPOSITIVO
      const dispositivoIndex = selectedTopics.findIndex((t: Topic) => isDispositivo(t));

      if (dispositivoIndex !== -1) {
        // DISPOSITIVO exists - insert before it
        const newTopics = [...selectedTopics];
        newTopics.splice(dispositivoIndex, 0, newTopic);
        setSelectedTopics(newTopics);
      } else {
        // DISPOSITIVO doesn't exist - add at end
        setSelectedTopics([...selectedTopics, newTopic]);
      }
    }
  }, [selectedTopics, setSelectedTopics]);

  /**
   * Prepare a topic for deletion (opens confirmation modal)
   */
  const deleteTopic = useCallback((topicToDelete: Topic) => {
    setTopicToDelete(topicToDelete);
    openModal('deleteTopic');
  }, [setTopicToDelete, openModal]);

  /**
   * Save topic edit and close editor
   * Includes automatic result detection
   */
  const saveTopicEdit = useCallback(async () => {
    if (!editingTopic) return;
    setSavingTopic(true);

    try {
      const isRelatorioTopic = editingTopic.title.toUpperCase() === 'RELATÓRIO';
      const isDispositivoTopic = editingTopic.title.toUpperCase() === 'DISPOSITIVO';

      // Validate refs based on topic type
      if (isRelatorioTopic && !relatorioRef.current) return;
      if (isDispositivoTopic && !editorRef.current) return;
      if (!isRelatorioTopic && !isDispositivoTopic && (!editorRef.current || !relatorioRef.current)) return;

      // Capture editor content (only from existing refs)
      const content = editorRef.current ? sanitizeHTML(editorRef.current.root.innerHTML) : '';
      const relatorio = relatorioRef.current ? sanitizeHTML(relatorioRef.current.root.innerHTML) : '';

      let updatedTopic: Topic = {
        ...editingTopic,
        editedRelatorio: relatorio,
        relatorio: htmlToPlainText(relatorio)
      };

      if (isDispositivoTopic) {
        updatedTopic.editedContent = content;
      } else if (!isRelatorioTopic) {
        // Only normal topics (not RELATÓRIO, not DISPOSITIVO) use editedFundamentacao
        updatedTopic.editedFundamentacao = content;
      }

      // Detect result automatically ONLY if not a manual choice by user
      // This allows re-detection when user changes the decision text
      if (!updatedTopic.resultadoManual) {
        const resultadoDetectado = await detectResultadoAutomatico(
          updatedTopic.title || '',
          content,
          updatedTopic.category || ''
        );

        if (resultadoDetectado) {
          updatedTopic.resultado = resultadoDetectado;
        }
      }

      const updatedTopics = selectedTopics.map(t =>
        t.title === editingTopic.title ? updatedTopic : t
      );
      setSelectedTopics(updatedTopics);

      // Update in extractedTopics as well
      const extractedIndex = extractedTopics.findIndex((t: Topic) => t.title === editingTopic.title);
      if (extractedIndex !== -1) {
        const newExtracted = [...extractedTopics];
        newExtracted[extractedIndex] = { ...newExtracted[extractedIndex], resultado: updatedTopic.resultado };
        setExtractedTopics(newExtracted);
      }

      setLastEditedTopicTitle(editingTopic.title);
      setEditingTopic(null);
      modelLibrary.setSuggestions([]);
      setActiveTab('topics');
    } finally {
      setSavingTopic(false);
    }
  }, [
    editingTopic,
    selectedTopics,
    extractedTopics,
    setSavingTopic,
    setEditingTopic,
    setSelectedTopics,
    setExtractedTopics,
    setLastEditedTopicTitle,
    sanitizeHTML,
    editorRef,
    relatorioRef,
    detectResultadoAutomatico,
    modelLibrary,
    setActiveTab,
  ]);

  /**
   * Save topic edit without closing editor
   * Does NOT include automatic result detection (faster save)
   */
  const saveTopicEditWithoutClosing = useCallback(async () => {
    if (!editingTopic) return;
    setSavingTopic(true);

    try {
      const isRelatorioTopic = editingTopic.title.toUpperCase() === 'RELATÓRIO';
      const isDispositivoTopic = editingTopic.title.toUpperCase() === 'DISPOSITIVO';

      // Validate refs based on topic type
      if (isRelatorioTopic && !relatorioRef.current) return;
      if (isDispositivoTopic && !editorRef.current) return;
      if (!isRelatorioTopic && !isDispositivoTopic && (!editorRef.current || !relatorioRef.current)) return;

      // Capture editor content (only from existing refs)
      const content = editorRef.current ? sanitizeHTML(editorRef.current.root.innerHTML) : '';
      const relatorio = relatorioRef.current ? sanitizeHTML(relatorioRef.current.root.innerHTML) : '';

      let updatedTopic: Topic = {
        ...editingTopic,
        editedRelatorio: relatorio,
        relatorio: htmlToPlainText(relatorio)
      };

      if (isDispositivoTopic) {
        updatedTopic.editedContent = content;
      } else if (!isRelatorioTopic) {
        // Only normal topics (not RELATÓRIO, not DISPOSITIVO) use editedFundamentacao
        updatedTopic.editedFundamentacao = content;
      }

      const updatedTopics = selectedTopics.map(t =>
        t.title === editingTopic.title ? updatedTopic : t
      );
      setSelectedTopics(updatedTopics);

      // Update in extractedTopics as well
      const extractedIndex = extractedTopics.findIndex((t: Topic) => t.title === editingTopic.title);
      if (extractedIndex !== -1) {
        const newExtracted = [...extractedTopics];
        newExtracted[extractedIndex] = { ...newExtracted[extractedIndex], resultado: updatedTopic.resultado };
        setExtractedTopics(newExtracted);
      }

      // Update editingTopic with saved data (keep editor open)
      setEditingTopic(updatedTopic);
      setLastEditedTopicTitle(editingTopic.title);

      // Simple visual feedback (no result detection)
      const successMsg = document.createElement('div');
      successMsg.className = 'fixed top-4 left-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2 animate-pulse';
      successMsg.innerHTML = '<span>✓</span> Salvo!';

      document.body.appendChild(successMsg);
      setTimeout(() => successMsg.remove(), 3000);
    } finally {
      setSavingTopic(false);
    }
  }, [
    editingTopic,
    selectedTopics,
    extractedTopics,
    setSavingTopic,
    setEditingTopic,
    setSelectedTopics,
    setExtractedTopics,
    setLastEditedTopicTitle,
    sanitizeHTML,
    editorRef,
    relatorioRef,
  ]);

  return {
    toggleTopicSelection,
    deleteTopic,
    saveTopicEdit,
    saveTopicEditWithoutClosing,
    detectResultadoAutomatico,
  };
}
