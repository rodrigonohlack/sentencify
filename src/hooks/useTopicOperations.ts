/**
 * @file useTopicOperations.ts
 * @description Hook para operações de tópicos (renomear, unir, separar, criar)
 * Extraído do App.tsx v1.37.7 - FASE 6 LegalDecisionEditor refactoring
 */

import { useCallback } from 'react';
import type { Topic, TopicCategory, AnalyzedDocuments } from '../types';
import { plainTextToHtml } from '../utils/text';

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

export interface GenerateMiniReportOptions {
  title: string;
  context?: string;
  includeComplementares?: boolean;
}

export interface BatchReportOptions {
  batchSize?: number;
  delayBetweenBatches?: number;
  onProgress?: (current: number, total: number, batchNum: number, totalBatches: number) => void;
}

export interface BatchReportResult {
  results: Array<{ title: string; relatorio?: string; status?: string }>;
  errors: Array<{ title: string; error?: string; status?: string }>;
}

export type NewTopicData = Partial<Topic>;

export interface AIIntegrationForOperations {
  setRegenerating: (value: boolean) => void;
  aiSettings: {
    parallelRequests?: number;
  };
}

export interface TopicManagerForOperations {
  selectedTopics: Topic[];
  extractedTopics: Topic[];
  setSelectedTopics: (topics: Topic[] | ((prev: Topic[]) => Topic[])) => void;
  setExtractedTopics: (topics: Topic[] | ((prev: Topic[]) => Topic[])) => void;
  topicToRename: Topic | null;
  newTopicName: string;
  setTopicToRename: (topic: Topic | null) => void;
  setNewTopicName: (name: string) => void;
  topicsToMerge: Topic[];
  setTopicsToMerge: (topics: Topic[]) => void;
  topicToSplit: Topic | null;
  splitNames: string[];
  setTopicToSplit: (topic: Topic | null) => void;
  setSplitNames: (names: string[]) => void;
  newTopicData: Partial<Topic> | null;
  setNewTopicData: (data: Partial<Topic> | null) => void;
}

export type TopicOperationModalKey = 'rename' | 'merge' | 'split' | 'newTopic';

export interface UseTopicOperationsProps {
  aiIntegration: AIIntegrationForOperations;
  topicManager: TopicManagerForOperations;
  analyzedDocuments: AnalyzedDocuments;
  generateMiniReport: (options: GenerateMiniReportOptions) => Promise<string>;
  generateMiniReportsBatch: (topics: Array<{ title: string; category: TopicCategory; context?: string; includeComplementares?: boolean }>, options?: BatchReportOptions) => Promise<BatchReportResult>;
  setError: (error: string) => void;
  setAnalysisProgress: (progress: string) => void;
  closeModal: (modalName: TopicOperationModalKey) => void;
}

export interface UseTopicOperationsReturn {
  handleRenameTopic: (shouldRegenerate?: boolean) => Promise<void>;
  handleMergeTopics: () => Promise<void>;
  handleSplitTopic: () => Promise<void>;
  handleCreateNewTopic: () => Promise<void>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hook para operações de tópicos
 *
 * @description Gerencia as operações CRUD de tópicos:
 * - Renomear: altera título e regenera mini-relatório
 * - Unir: combina múltiplos tópicos em um
 * - Separar: divide tópico em subtópicos
 * - Criar: adiciona novo tópico
 *
 * @param props - Propriedades do hook
 * @returns Handlers para operações de tópicos
 */
export function useTopicOperations({
  aiIntegration,
  topicManager,
  analyzedDocuments,
  generateMiniReport,
  generateMiniReportsBatch,
  setError,
  setAnalysisProgress,
  closeModal,
}: UseTopicOperationsProps): UseTopicOperationsReturn {

  const {
    selectedTopics, extractedTopics,
    setSelectedTopics, setExtractedTopics,
    topicToRename, newTopicName, setTopicToRename, setNewTopicName,
    topicsToMerge, setTopicsToMerge,
    topicToSplit, splitNames, setTopicToSplit, setSplitNames,
    newTopicData, setNewTopicData,
  } = topicManager;

  // Renomear tópico
  const handleRenameTopic = useCallback(async (shouldRegenerate = true) => {
    if (!newTopicName.trim() || !topicToRename) return;
    const upperCaseTitle = newTopicName.trim().toUpperCase();
    aiIntegration.setRegenerating(true);
    setError('');
    try {
      let newRelatorio = topicToRename.relatorio;
      if (shouldRegenerate) {
        setAnalysisProgress(`🔄 Regenerando mini-relatório para "${upperCaseTitle}"...`);
        const renameContext = `**CONTEXTO DE RENOMEAÇÃO:**
Tópico ANTERIOR: "${topicToRename.title}"
Tópico NOVO: "${upperCaseTitle}"
**INSTRUÇÃO:** Busque informações ESPECÍFICAS sobre "${upperCaseTitle}" nos documentos.
NÃO replique o conteúdo do tópico anterior "${topicToRename.title}".
Se o novo título representa um aspecto DIFERENTE do anterior, extraia informações DIFERENTES.
Se não houver informações específicas, indique: "Não foram localizadas informações específicas sobre ${upperCaseTitle} nas peças processuais."`;
        newRelatorio = await generateMiniReport({ title: upperCaseTitle, context: renameContext });
      }
      if (newRelatorio) {
        setSelectedTopics(selectedTopics.map(t => t.title === topicToRename.title ? { ...t, title: upperCaseTitle, relatorio: newRelatorio } : t));
        setExtractedTopics(extractedTopics.map(t => t.title === topicToRename.title ? { ...t, title: upperCaseTitle, relatorio: newRelatorio } : t));
      } else {
        setError('Não foi possível gerar o mini-relatório para o tópico renomeado.');
      }
    } catch (err) {
      setError('Erro ao renomear tópico: ' + (err as Error).message);
    } finally {
      aiIntegration.setRegenerating(false);
    }
    closeModal('rename');
    setTopicToRename(null);
    setNewTopicName('');
  }, [newTopicName, topicToRename, aiIntegration, selectedTopics, extractedTopics, setSelectedTopics, setExtractedTopics, setTopicToRename, setNewTopicName, generateMiniReport, setError, setAnalysisProgress, closeModal]);

  // Unir tópicos
  const handleMergeTopics = useCallback(async () => {
    if (topicsToMerge.length < 2) {
      setError('Selecione pelo menos 2 tópicos para unir');
      return;
    }
    aiIntegration.setRegenerating(true);
    setError('');
    try {
      const mergedTitle = topicsToMerge.map(t => t.title).join(' e ');
      setAnalysisProgress(`🔄 Gerando mini-relatório unificado para "${mergedTitle}"...`);
      const topicsInfo = topicsToMerge.map((t, i: number) => `${i + 1}. ${t.title}`).join('\n');
      const mergeContext = `**CONTEXTO DE UNIÃO DE TÓPICOS:**
Os seguintes tópicos estão sendo unidos em um único tópico:
${topicsInfo}
**INSTRUÇÃO:** Crie um mini-relatório unificado que contemple TODOS os aspectos dos tópicos originais.
Extraia informações relevantes para TODOS os tópicos sendo unidos.
Unifique as informações de forma coerente e abrangente.`;
      const newRelatorio = await generateMiniReport({ title: mergedTitle, context: mergeContext });
      if (newRelatorio) {
        const mergedTopic = { title: mergedTitle, category: topicsToMerge[0]?.category || 'MÉRITO' as TopicCategory, relatorio: newRelatorio, editedContent: '' };
        const mergeSet = new Set(topicsToMerge.map(mt => mt.title));
        // Calcular posição correta: contar quantos itens NÃO mesclados vêm ANTES do primeiro mesclado
        const firstTopicIndex = selectedTopics.findIndex((t: Topic) => mergeSet.has(t.title));
        const insertPosition = firstTopicIndex >= 0 ? selectedTopics.slice(0, firstTopicIndex).filter(t => !mergeSet.has(t.title)).length : 0;
        const remainingTopics = selectedTopics.filter(t => !mergeSet.has(t.title));
        remainingTopics.splice(insertPosition, 0, mergedTopic);
        setSelectedTopics(remainingTopics);
        const firstExtractedIndex = extractedTopics.findIndex((t: Topic) => mergeSet.has(t.title));
        const extractInsertPosition = firstExtractedIndex >= 0 ? extractedTopics.slice(0, firstExtractedIndex).filter(t => !mergeSet.has(t.title)).length : 0;
        const remainingExtracted = extractedTopics.filter(t => !mergeSet.has(t.title));
        remainingExtracted.splice(extractInsertPosition, 0, mergedTopic);
        setExtractedTopics(remainingExtracted);
        closeModal('merge');
        setTopicsToMerge([]);
      } else {
        setError('Não foi possível gerar o mini-relatório unificado. Tente novamente.');
      }
    } catch (err) {
      setError('Erro ao unir tópicos: ' + (err as Error).message);
    } finally {
      aiIntegration.setRegenerating(false);
    }
  }, [topicsToMerge, aiIntegration, selectedTopics, extractedTopics, setSelectedTopics, setExtractedTopics, setTopicsToMerge, generateMiniReport, setError, setAnalysisProgress, closeModal]);

  // Separar tópico
  const handleSplitTopic = useCallback(async () => {
    if (!topicToSplit || splitNames.filter(n => n.trim()).length < 2) return;
    const validNames = splitNames.filter(n => n.trim()).map(n => n.trim().toUpperCase());
    aiIntegration.setRegenerating(true);
    setError('');
    try {
      const splitContext = `**CONTEXTO DE DIVISÃO:**
Tópico original: "${topicToSplit.title}"
**INSTRUÇÃO:** Este é um subtópico derivado de "${topicToSplit.title}".
Extraia APENAS informações relevantes para o subtópico específico.
Se não houver informações específicas nos documentos, indique de forma clara.`;
      const topicsToGenerate = validNames.map(name => ({
        title: name,
        category: topicToSplit.category,
        context: splitContext,
        includeComplementares: true
      }));
      const { results, errors } = await generateMiniReportsBatch(topicsToGenerate, {
        batchSize: aiIntegration.aiSettings.parallelRequests || 5,
        delayBetweenBatches: 1000,
        onProgress: (current: number, total: number, batchNum: number, totalBatches: number) => {
          setAnalysisProgress(`🚀 Gerando subtópicos... ${current}/${total} (Lote ${batchNum}/${totalBatches})`);
        }
      });
      if (errors.length > 0) {
        setError(`${errors.length} subtópico(s) falharam: ${errors.map(e => e.error || 'erro desconhecido').join('; ')}`);
      }
      const newTopics = results.map(r => ({ title: r.title, category: topicToSplit.category, relatorio: r.relatorio || '', editedContent: '' }));
      if (newTopics.length === 0) {
        throw new Error('Nenhum subtópico foi gerado com sucesso.');
      }
      const originalIndex = selectedTopics.findIndex((t: Topic) => t.title === topicToSplit.title);
      const remainingTopics = selectedTopics.filter(t => t.title !== topicToSplit.title);
      remainingTopics.splice(originalIndex, 0, ...newTopics);
      setSelectedTopics(remainingTopics);
      const originalExtractedIndex = extractedTopics.findIndex((t: Topic) => t.title === topicToSplit.title);
      const remainingExtracted = extractedTopics.filter(t => t.title !== topicToSplit.title);
      remainingExtracted.splice(originalExtractedIndex, 0, ...newTopics);
      setExtractedTopics(remainingExtracted);
    } catch (err) {
      setError('Erro ao separar tópico: ' + (err as Error).message);
    } finally {
      aiIntegration.setRegenerating(false);
    }
    closeModal('split');
    setTopicToSplit(null);
    setSplitNames(['', '']);
  }, [topicToSplit, splitNames, aiIntegration, selectedTopics, extractedTopics, setSelectedTopics, setExtractedTopics, setTopicToSplit, setSplitNames, generateMiniReportsBatch, setError, setAnalysisProgress, closeModal]);

  // Criar novo tópico
  const handleCreateNewTopic = useCallback(async () => {
    if (!newTopicData?.title?.trim()) {
      setError('Digite um título para o tópico');
      return;
    }
    const upperCaseTitle = newTopicData.title.trim().toUpperCase();
    const category = newTopicData.category || 'MÉRITO';
    aiIntegration.setRegenerating(true);
    setError('');
    try {
      let newRelatorio = (newTopicData.relatorio || '').trim();
      if (!newRelatorio && (analyzedDocuments.peticoes?.length > 0 || analyzedDocuments.peticoesText?.length > 0)) {
        try {
          newRelatorio = await generateMiniReport({
            title: upperCaseTitle,
            context: `Tópico criado manualmente na categoria "${category}". Se não houver informações específicas, indique que o tópico foi criado manualmente.`,
            includeComplementares: true
          });
        } catch (apiErr) {
          setError('Não foi possível gerar automaticamente: ' + (apiErr as Error).message);
          newRelatorio = plainTextToHtml(`Tópico "${upperCaseTitle}" criado manualmente.\n\nErro ao analisar documentos.`);
        }
      } else if (!newRelatorio) {
        newRelatorio = plainTextToHtml(`Tópico "${upperCaseTitle}" criado manualmente.\n\nNão há documentos para análise.`);
      }
      const newTopic: Topic = { title: upperCaseTitle, category: category as TopicCategory, relatorio: newRelatorio, editedContent: '' };
      setExtractedTopics([...extractedTopics, newTopic]);
      closeModal('newTopic');
      setNewTopicData({ title: '', category: 'MÉRITO', relatorio: '' });
      setError('');
    } catch (err) {
      setError('Erro ao criar tópico: ' + (err as Error).message);
    } finally {
      aiIntegration.setRegenerating(false);
    }
  }, [newTopicData, analyzedDocuments, aiIntegration, extractedTopics, setExtractedTopics, setNewTopicData, generateMiniReport, setError, closeModal]);

  return {
    handleRenameTopic,
    handleMergeTopics,
    handleSplitTopic,
    handleCreateNewTopic,
  };
}
