/**
 * @file useRelatorioRegeneration.ts
 * @description Hook para regeneração de relatórios de tópicos
 * @version 1.37.58
 */

import { useCallback } from 'react';
import type { Topic, AnalyzedDocuments, AITextContent, AIDocumentContent } from '../types';
import { normalizeHTMLSpacing } from '../utils/text';
import { buildDocumentContentArray } from '../prompts';

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

interface QuillInstance {
  root: HTMLElement;
}

interface AIIntegration {
  setRegenerating: (value: boolean) => void;
  setRegeneratingRelatorio: (value: boolean) => void;
  relatorioInstruction: string;
  setRelatorioInstruction: (value: string) => void;
}

interface APICache {
  get: (key: string) => unknown;
  set: (key: string, value: unknown) => void;
}

interface GenerateMiniReportOptions {
  title: string;
  context?: string;
  instruction?: string;
  currentRelatorio?: string;
  includeComplementares?: boolean;
}

interface UseRelatorioRegenerationProps {
  editingTopic: Topic | null;
  setEditingTopic: React.Dispatch<React.SetStateAction<Topic | null>>;
  selectedTopics: Topic[];
  setSelectedTopics: (topics: Topic[]) => void;
  extractedTopics: Topic[];
  setExtractedTopics: (topics: Topic[]) => void;
  analyzedDocuments: AnalyzedDocuments;
  relatorioRef: React.RefObject<QuillInstance | null>;
  aiIntegration: AIIntegration;
  apiCache: APICache;
  generateMiniReport: (options: GenerateMiniReportOptions) => Promise<string>;
  generateRelatorioProcessual: (contentArray: Array<AITextContent | AIDocumentContent>) => Promise<string>;
  closeModal: (modalId: string) => void;
  setError: (error: string) => void;
  setAnalysisProgress: (progress: string) => void;
  sanitizeHTML: (html: string) => string;
  showToast: (message: string, type: string) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hook para regeneração de relatórios de tópicos
 *
 * @example
 * const { regenerateRelatorio, regenerateRelatorioWithInstruction, regenerateRelatorioProcessual } = useRelatorioRegeneration({ ... });
 */
export default function useRelatorioRegeneration({
  editingTopic,
  setEditingTopic,
  selectedTopics,
  setSelectedTopics,
  extractedTopics,
  setExtractedTopics,
  analyzedDocuments,
  relatorioRef,
  aiIntegration,
  apiCache,
  generateMiniReport,
  generateRelatorioProcessual,
  closeModal,
  setError,
  setAnalysisProgress,
  sanitizeHTML,
  showToast,
}: UseRelatorioRegenerationProps) {

  /**
   * Regenera o mini-relatório de um tópico
   */
  const regenerateRelatorio = useCallback(async (topicTitle: string, topicContext: string) => {
    aiIntegration.setRegenerating(true);
    setAnalysisProgress(`🔄 Regenerando relatório para "${topicTitle}"...`);
    try {
      const result = await generateMiniReport({ title: topicTitle, context: topicContext });
      return result;
    } catch (err) {
      setError('Erro ao regerar mini-relatório: ' + (err as Error).message);
      return null;
    } finally {
      aiIntegration.setRegenerating(false);
    }
  }, [aiIntegration, setAnalysisProgress, generateMiniReport, setError]);

  /**
   * Regenera o mini-relatório com instrução customizada do usuário
   */
  const regenerateRelatorioWithInstruction = useCallback(async () => {
    if (!aiIntegration.relatorioInstruction?.trim()) {
      setError('Digite uma instrução para regeração do mini-relatório');
      return;
    }
    if (!editingTopic) {
      setError('Nenhum tópico selecionado para edição');
      return;
    }

    const cacheKey = `relatorioCustom_${editingTopic.title}_${aiIntegration.relatorioInstruction}_${JSON.stringify(analyzedDocuments)}`;
    const cachedRelatorio = apiCache.get(cacheKey);

    if (cachedRelatorio) {
      setEditingTopic(prev => {
        if (!prev) return prev;
        return { ...prev, editedRelatorio: cachedRelatorio as string };
      });
      closeModal('regenerateRelatorioCustom');
      return;
    }

    aiIntegration.setRegeneratingRelatorio(true);
    setError('');

    try {
      const isRelatorioTopic = editingTopic.title.toUpperCase().includes('RELATÓRIO');
      const instructionMentionsComplementares = /\b(documento complementar|ata|audiência|prova|juntad[oa]|anexad[oa]|complementar)\b/i.test(aiIntegration.relatorioInstruction);

      const htmlContent = await generateMiniReport({
        title: editingTopic.title,
        instruction: aiIntegration.relatorioInstruction,
        currentRelatorio: editingTopic.editedRelatorio || editingTopic.relatorio,
        includeComplementares: isRelatorioTopic || instructionMentionsComplementares
      });

      apiCache.set(cacheKey, htmlContent);

      const updatedTopic = { ...editingTopic, editedRelatorio: htmlContent, relatorio: htmlContent };
      setEditingTopic(updatedTopic);

      if (relatorioRef.current) {
        relatorioRef.current.root.innerHTML = normalizeHTMLSpacing(sanitizeHTML(htmlContent));
      }

      setSelectedTopics(selectedTopics.map(t => t.title === editingTopic.title ? updatedTopic : t));
      setExtractedTopics(extractedTopics.map(t => t.title === editingTopic.title ? updatedTopic : t));
      aiIntegration.setRelatorioInstruction('');
    } catch (err) {
      setError('Erro ao regerar mini-relatório: ' + (err as Error).message);
    } finally {
      aiIntegration.setRegeneratingRelatorio(false);
    }
  }, [
    aiIntegration,
    editingTopic,
    analyzedDocuments,
    apiCache,
    generateMiniReport,
    closeModal,
    setError,
    setEditingTopic,
    relatorioRef,
    sanitizeHTML,
    selectedTopics,
    setSelectedTopics,
    extractedTopics,
    setExtractedTopics,
  ]);

  /**
   * Regenera o RELATÓRIO processual completo
   */
  const regenerateRelatorioProcessual = useCallback(async () => {
    if (!editingTopic || editingTopic.title.toUpperCase() !== 'RELATÓRIO') {
      setError('Esta função só pode ser usada para o tópico RELATÓRIO');
      return;
    }

    aiIntegration.setRegeneratingRelatorio(true);
    setAnalysisProgress('🔄 Regenerando RELATÓRIO processual...');

    try {
      const contentArray = buildDocumentContentArray(analyzedDocuments, { includeComplementares: true });
      const instrucao = (aiIntegration.relatorioInstruction || '').trim();

      if (instrucao) {
        contentArray.push({ type: 'text' as const, text: `⚠️ INSTRUÇÃO ADICIONAL DO USUÁRIO:\n${instrucao}` });
      }

      const relatorioGerado = await generateRelatorioProcessual(contentArray);
      if (!relatorioGerado?.trim()) throw new Error('Relatório gerado está vazio');

      const htmlContent = normalizeHTMLSpacing(relatorioGerado.trim());
      const updatedTopic = { ...editingTopic, editedRelatorio: htmlContent };

      setEditingTopic(updatedTopic);

      if (relatorioRef.current) {
        relatorioRef.current.root.innerHTML = normalizeHTMLSpacing(sanitizeHTML(htmlContent));
      }

      setSelectedTopics(selectedTopics.map(t => t.title === editingTopic.title ? updatedTopic : t));
      setExtractedTopics(extractedTopics.map(t => t.title === editingTopic.title ? updatedTopic : t));
      setAnalysisProgress('');
      aiIntegration.setRelatorioInstruction('');
      showToast('✅ RELATÓRIO processual regenerado!', 'success');
    } catch (err) {
      setError('Erro ao regerar RELATÓRIO: ' + (err as Error).message);
      setAnalysisProgress('');
    } finally {
      aiIntegration.setRegeneratingRelatorio(false);
    }
  }, [
    editingTopic,
    aiIntegration,
    analyzedDocuments,
    generateRelatorioProcessual,
    setError,
    setAnalysisProgress,
    setEditingTopic,
    relatorioRef,
    sanitizeHTML,
    selectedTopics,
    setSelectedTopics,
    extractedTopics,
    setExtractedTopics,
    showToast,
  ]);

  return {
    regenerateRelatorio,
    regenerateRelatorioWithInstruction,
    regenerateRelatorioProcessual,
  };
}

export { useRelatorioRegeneration };
