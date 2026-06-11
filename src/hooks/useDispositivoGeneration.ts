/**
 * @file useDispositivoGeneration.ts
 * @description Hook para geração e regeneração do DISPOSITIVO da sentença
 * Extraído do App.tsx v1.37.16 - FASE 11 refactoring
 *
 * v1.37.59: Integração com DoubleCheckReviewModal - abre modal para revisão de correções
 */

import { useCallback, useRef, useEffect } from 'react';
import type { Topic, AIMessage, AICallOptions, AIMessageContent, DoubleCheckCorrection, DoubleCheckReviewResult } from '../types';
import { buildDispositivoPromptText } from '../prompts';
import { normalizeHTMLSpacing, isRelatorio } from '../utils/text';
import { useUIStore } from '../stores/useUIStore';

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

export type DoubleCheckOperation = 'topicExtraction' | 'dispositivo' | 'sentenceReview' | 'factsComparison';

/** Callback para receber chunks de texto durante streaming */
export type StreamChunkCallback = (fullText: string) => void;

export interface AIIntegrationForDispositivo {
  callAI: (messages: AIMessage[], options?: AICallOptions) => Promise<string>;
  // v1.39.09: Streaming para evitar timeout
  callAIStream?: (messages: AIMessage[], options?: {
    maxTokens?: number;
    useInstructions?: boolean;
    /** v1.53.7: estilo sem proibição de enumerações (dispositivo é enumerado) */
    semFormatoNarrativo?: boolean;
    /** v1.53.10: safety sem auto-revisão final (saída vai direto pro editor) */
    semRevisaoFinal?: boolean;
    onChunk?: StreamChunkCallback;
  }) => Promise<string>;
  aiSettings: {
    modeloDispositivo?: string;
    anonymization?: { enabled?: boolean };
    doubleCheck?: {
      enabled: boolean;
      operations: {
        dispositivo?: boolean;
      };
    };
  };
  dispositivoInstruction?: string;
  setGeneratingDispositivo: (value: boolean) => void;
  setRegeneratingDispositivo: (value: boolean) => void;
  setDispositivoText: (text: string) => void;
  setDispositivoInstruction: (instruction: string) => void;
  performDoubleCheck: (
    operation: DoubleCheckOperation,
    content: string,
    context: AIMessageContent[],  // v1.37.68: mudou de string para array
    onProgress?: (msg: string) => void
  ) => Promise<{ verified: string; corrections: DoubleCheckCorrection[]; summary: string; confidence?: number; failed?: boolean }>;
}

export interface QuillInstance {
  root: HTMLElement;
  getText: () => string;
  getContents: () => unknown;
  setContents: (delta: unknown) => void;
  clipboard: { dangerouslyPasteHTML: (html: string) => void };
}

export interface UseDispositivoGenerationProps {
  selectedTopics: Topic[];
  setSelectedTopics: (topics: Topic[] | ((prev: Topic[]) => Topic[])) => void;
  extractedTopics: Topic[];
  setExtractedTopics: (topics: Topic[] | ((prev: Topic[]) => Topic[])) => void;
  editingTopic: Topic | null;
  setEditingTopic: (topic: Topic | null) => void;
  topicsParaDispositivo: Topic[];
  aiIntegration: AIIntegrationForDispositivo;
  editorRef: React.RefObject<QuillInstance | null>;
  setError: (error: string) => void;
  setAnalysisProgress: (progress: string) => void;
  openModal: (modalId: 'dispositivo' | string) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  sanitizeHTML: (html: string) => string;
  // Funções utilitárias passadas do App.tsx
  isTopicDecidido: (topic: Topic) => boolean | string | null | undefined;
  htmlToFormattedText: (html: string) => string;
}

/** Opções para geração de dispositivo */
export interface GenerateDispositivoOptions {
  /** v1.39.09: Usar streaming para evitar timeout */
  useStreaming?: boolean;
  /** v1.39.09: Callback para receber texto conforme chega */
  onChunk?: StreamChunkCallback;
}

export interface UseDispositivoGenerationReturn {
  generateDispositivo: (options?: GenerateDispositivoOptions) => Promise<void>;
  regenerateDispositivoWithInstruction: (options?: GenerateDispositivoOptions) => Promise<void>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hook para geração do DISPOSITIVO da sentença
 *
 * @description Gera o dispositivo com base nos tópicos decididos,
 * aplicando modelo personalizado e Double Check quando configurado.
 *
 * @param props - Propriedades do hook
 * @returns Funções para gerar e regenerar dispositivo
 */
export function useDispositivoGeneration({
  selectedTopics,
  setSelectedTopics,
  extractedTopics,
  setExtractedTopics,
  editingTopic,
  setEditingTopic,
  topicsParaDispositivo,
  aiIntegration,
  editorRef,
  setError,
  setAnalysisProgress,
  openModal,
  showToast,
  sanitizeHTML,
  isTopicDecidido,
  htmlToFormattedText,
}: UseDispositivoGenerationProps): UseDispositivoGenerationReturn {

  // Double Check Review - Zustand actions (v1.37.59)
  const openDoubleCheckReview = useUIStore(state => state.openDoubleCheckReview);
  const doubleCheckResult = useUIStore(state => state.doubleCheckResult);
  const setDoubleCheckResult = useUIStore(state => state.setDoubleCheckResult);

  // Ref para armazenar o resolver da Promise que aguarda decisão do usuário
  const pendingDoubleCheckResolve = useRef<((result: DoubleCheckReviewResult) => void) | null>(null);

  // Quando o usuário decide no modal, resolver a Promise pendente
  useEffect(() => {
    if (doubleCheckResult && doubleCheckResult.operation === 'dispositivo' && pendingDoubleCheckResolve.current) {
      pendingDoubleCheckResolve.current(doubleCheckResult);
      pendingDoubleCheckResolve.current = null;
      setDoubleCheckResult(null); // Limpar após consumir
    }
  }, [doubleCheckResult, setDoubleCheckResult]);

  /**
   * Gera o DISPOSITIVO inicial baseado nos tópicos decididos
   * v1.39.09: Suporte a streaming para evitar timeout no Render
   */
  const generateDispositivo = useCallback(async (options: GenerateDispositivoOptions = {}) => {
    const { useStreaming = false, onChunk } = options;
    if (selectedTopics.length === 0) {
      setError('Nenhum tópico selecionado. Adicione e preencha os tópicos antes de gerar o dispositivo.');
      return;
    }

    // Verificar se há tópicos decididos sem resultado selecionado (exceto RELATÓRIO, DISPOSITIVO e complementares)
    const topicsWithoutResult = selectedTopics.filter(t =>
      isTopicDecidido(t) &&
      !t.resultado &&
      t.title.toUpperCase() !== 'RELATÓRIO' &&
      t.title.toUpperCase() !== 'DISPOSITIVO' &&
      !t.isComplementar
    );

    if (topicsWithoutResult.length > 0) {
      const titulosFaltando = topicsWithoutResult.map(t => `"${t.title}"`).join(', ');
      setError(`Os seguintes tópicos estão decididos mas sem resultado selecionado: ${titulosFaltando}. Por favor, selecione o resultado (Procedente/Improcedente/etc) antes de gerar o dispositivo.`);
      return;
    }

    aiIntegration.setGeneratingDispositivo(true);
    setError('');

    try {
      // Preparar resumo de cada tópico com sua decisão
      const topicsSummary = topicsParaDispositivo.map(topic => {
        const relatorio = topic.editedRelatorio ? htmlToFormattedText(topic.editedRelatorio) : (topic.relatorio || '');

        const isDispositivo = topic.title.toUpperCase() === 'DISPOSITIVO';
        const decisao = isDispositivo
          ? (topic.editedContent ? htmlToFormattedText(topic.editedContent) : '')
          : (topic.editedFundamentacao ? htmlToFormattedText(topic.editedFundamentacao) : '');

        const temDecisao = decisao && decisao.trim() !== '' && decisao.trim() !== 'Sem decisão preenchida';
        const resultadoSelecionado = topic.resultado || 'NÃO DEFINIDO';

        return {
          titulo: topic.title,
          categoria: topic.category,
          relatorio: relatorio || '',
          decisao: temDecisao ? (decisao || '') : 'SEM DECISÃO PREENCHIDA',
          resultado: resultadoSelecionado,
          temDecisao: temDecisao
        };
      });

      const topicosComDecisao = topicsSummary.filter(t => t.temDecisao);
      const topicosSemDecisao = topicsSummary.filter(t => !t.temDecisao);

      const topicoRelatorio = selectedTopics.find(isRelatorio);
      let primeiroParagrafoRelatorio = '';

      if (topicoRelatorio) {
        const relatorioCompleto = topicoRelatorio.editedRelatorio
          ? htmlToFormattedText(topicoRelatorio.editedRelatorio)
          : (topicoRelatorio.relatorio || '');

        const linhas = relatorioCompleto.split('\n').map(l => l.trim()).filter(l => l.length > 0);

        let paragrafoEncontrado = '';
        for (const linha of linhas) {
          const ehTitulo = linha.length < 50 || (!linha.includes(',') && !linha.includes('. '));
          if (!ehTitulo) {
            paragrafoEncontrado = linha;
            break;
          }
        }

        primeiroParagrafoRelatorio = paragrafoEncontrado || (linhas[0] || '');

        if (!primeiroParagrafoRelatorio) {
          setError('Aviso: Primeiro parágrafo do RELATÓRIO está vazio. Os placeholders podem não funcionar corretamente.');
        }
      } else {
        setError('Erro: Tópico RELATÓRIO não encontrado. Crie um tópico chamado "RELATÓRIO" com os nomes das partes no primeiro parágrafo.');
      }

      // Preparar prompt com contexto dos tópicos
      // v1.53.14: fonte única do prompt (buildDispositivoPromptText) — antes duplicado
      // verbatim com regenerateDispositivoWithInstruction
      // v1.53.16: estilo SÓ no system (semFormatoNarrativo:true carrega a variante certa,
      // inclusive customPrompt do magistrado) — cópia na mensagem removida
      const promptText = buildDispositivoPromptText({
        primeiroParagrafoRelatorio,
        anonymizationEnabled: !!aiIntegration.aiSettings.anonymization?.enabled,
        topicosComDecisao,
        topicosSemDecisao,
        modeloDispositivo: aiIntegration.aiSettings.modeloDispositivo,
      });

      const contentArray: AIMessageContent[] = [{
        type: 'text' as const,
        text: promptText
      }];

      // v1.39.09: Suporte a streaming para evitar timeout
      let textContent: string;

      if (useStreaming && aiIntegration.callAIStream) {
        textContent = await aiIntegration.callAIStream([{
          role: 'user',
          content: contentArray
        }], {
          maxTokens: 8000,
          useInstructions: true,
          semFormatoNarrativo: true,
          semRevisaoFinal: true,
          onChunk
        });
      } else {
        textContent = await aiIntegration.callAI([{
          role: 'user',
          content: contentArray
        }], {
          maxTokens: 8000,
          useInstructions: true,
          semFormatoNarrativo: true,
          semRevisaoFinal: true,
          logMetrics: true,
          temperature: 0.3,
          topP: 0.9,
          topK: 50
        });
      }

      let dispositivoFinal = normalizeHTMLSpacing(textContent.trim());

      // Double Check do Dispositivo
      if (aiIntegration.aiSettings.doubleCheck?.enabled &&
          aiIntegration.aiSettings.doubleCheck?.operations.dispositivo) {

        // v1.37.68: Usar promptText completo (contém todas as regras e modelo personalizado)
        // promptText inclui: buildPartesDoProcesso, buildTopicosSection,
        // regraFundamentalDispositivo, modeloDispositivo (se configurado)
        try {
          const { verified, corrections, summary, confidence, failed } = await aiIntegration.performDoubleCheck(
            'dispositivo',
            dispositivoFinal,
            [{ type: 'text' as const, text: promptText }]  // Array com prompt completo
          );

          if (corrections.length > 0) {
            // v1.37.59: Abrir modal para revisão de correções
            setAnalysisProgress('Aguardando revisão das correções...');

            // Criar Promise para aguardar decisão do usuário
            const waitForDecision = new Promise<DoubleCheckReviewResult>(resolve => {
              pendingDoubleCheckResolve.current = resolve;
            });

            // Abrir modal de revisão
            openDoubleCheckReview({
              operation: 'dispositivo',
              originalResult: dispositivoFinal,
              verifiedResult: verified,
              corrections,
              summary,
              confidence: Math.round((confidence ?? 0.85) * 100)
            });

            // Aguardar decisão do usuário
            const result = await waitForDecision;

            // Aplicar resultado da decisão
            if (result.selected.length > 0) {
              dispositivoFinal = result.finalResult;
              showToast(`🔄 Double Check: ${result.selected.length} correção(ões) aplicada(s)`, 'info');
              console.log('[DoubleCheck Dispositivo] Correções aplicadas pelo usuário:', result.selected);
            } else {
              console.log('[DoubleCheck Dispositivo] Usuário descartou todas as correções');
              showToast('Double Check: correções descartadas', 'info');
            }
          } else if (failed) {
            console.warn('[DoubleCheck Dispositivo] Verificação falhou - resultado não verificado');
            showToast('Double Check: verificação falhou, resultado não verificado', 'warning');
          } else {
            console.log('[DoubleCheck Dispositivo] Nenhuma correção necessária');
          }
        } catch (dcError) {
          console.error('[DoubleCheck Dispositivo] Erro:', dcError);
        }
      }

      aiIntegration.setDispositivoText(dispositivoFinal);
      openModal('dispositivo');
      aiIntegration.setGeneratingDispositivo(false);
    } catch (err) {
      setError('Erro ao gerar dispositivo: ' + (err as Error).message);
      aiIntegration.setGeneratingDispositivo(false);
    }
  }, [
    selectedTopics,
    topicsParaDispositivo,
    aiIntegration,
    setError,
    setAnalysisProgress,
    openModal,
    openDoubleCheckReview,
    showToast,
    isTopicDecidido,
    htmlToFormattedText
  ]);

  /**
   * Regenera o DISPOSITIVO com instrução customizada do usuário
   * v1.39.09: Suporte a streaming para evitar timeout no Render
   */
  const regenerateDispositivoWithInstruction = useCallback(async (options: GenerateDispositivoOptions = {}) => {
    const { useStreaming = false, onChunk } = options;
    if (!editingTopic || editingTopic.title.toUpperCase() !== 'DISPOSITIVO') {
      setError('Esta função só pode ser usada para o tópico DISPOSITIVO');
      return;
    }

    if (selectedTopics.length === 0) {
      setError('Nenhum tópico selecionado. Adicione e preencha os tópicos antes de regenerar o dispositivo.');
      return;
    }

    const topicsWithoutResult = selectedTopics.filter(t =>
      isTopicDecidido(t) &&
      !t.resultado &&
      t.title.toUpperCase() !== 'RELATÓRIO' &&
      t.title.toUpperCase() !== 'DISPOSITIVO' &&
      !t.isComplementar
    );

    if (topicsWithoutResult.length > 0) {
      const titulosFaltando = topicsWithoutResult.map(t => `"${t.title}"`).join(', ');
      setError(`Os seguintes tópicos estão decididos mas sem resultado selecionado: ${titulosFaltando}. Por favor, selecione o resultado (Procedente/Improcedente/etc) antes de regenerar o dispositivo.`);
      return;
    }

    aiIntegration.setRegeneratingDispositivo(true);
    setAnalysisProgress('🔄 Regenerando DISPOSITIVO...');

    try {
      const topicsSummary = topicsParaDispositivo.map(topic => {
        const relatorio = topic.editedRelatorio ? htmlToFormattedText(topic.editedRelatorio) : (topic.relatorio || '');
        const decisao = topic.editedFundamentacao ? htmlToFormattedText(topic.editedFundamentacao) : '';
        const temDecisao = decisao && decisao.trim() !== '' && decisao.trim() !== 'Sem decisão preenchida';

        return {
          titulo: topic.title,
          categoria: topic.category,
          relatorio: relatorio || '',
          decisao: temDecisao ? (decisao || '') : 'SEM DECISÃO PREENCHIDA',
          resultado: topic.resultado || 'NÃO DEFINIDO',
          temDecisao: temDecisao
        };
      });

      const topicoRelatorio = selectedTopics.find(isRelatorio);
      let primeiroParagrafoRelatorio = '';
      if (topicoRelatorio) {
        const relatorioCompleto = htmlToFormattedText(topicoRelatorio.editedRelatorio || topicoRelatorio.relatorio || '');
        const linhas = relatorioCompleto.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        for (const linha of linhas) {
          const ehTitulo = linha.length < 50 || (!linha.includes(',') && !linha.includes('. '));
          if (!ehTitulo) {
            primeiroParagrafoRelatorio = linha;
            break;
          }
        }
        primeiroParagrafoRelatorio = primeiroParagrafoRelatorio || (linhas[0] || '');
      }

      const topicosComDecisao = topicsSummary.filter(t => t.temDecisao);
      const topicosSemDecisao = topicsSummary.filter(t => !t.temDecisao);

      const instrucaoCustomizada = aiIntegration.dispositivoInstruction?.trim() || '';

      // v1.53.14: fonte única do prompt (buildDispositivoPromptText); instrucaoCustomizada
      // definida (mesmo vazia) marca a REGENERAÇÃO — injeta os blocos de instrução do usuário
      const promptText = buildDispositivoPromptText({
        primeiroParagrafoRelatorio,
        anonymizationEnabled: !!aiIntegration.aiSettings.anonymization?.enabled,
        topicosComDecisao,
        topicosSemDecisao,
        modeloDispositivo: aiIntegration.aiSettings.modeloDispositivo,
        instrucaoCustomizada,
      });

      const contentArray: AIMessageContent[] = [{
        type: 'text' as const,
        text: promptText
      }];

      // v1.39.09: Suporte a streaming para evitar timeout
      let textContent: string;

      if (useStreaming && aiIntegration.callAIStream) {
        textContent = await aiIntegration.callAIStream([{
          role: 'user',
          content: contentArray
        }], {
          maxTokens: 8000,
          useInstructions: true,
          semFormatoNarrativo: true,
          semRevisaoFinal: true,
          onChunk
        });
      } else {
        textContent = await aiIntegration.callAI([{
          role: 'user',
          content: contentArray
        }], {
          maxTokens: 8000,
          useInstructions: true,
          semFormatoNarrativo: true,
          semRevisaoFinal: true,
          logMetrics: true,
          temperature: 0.3,
          topP: 0.9,
          topK: 50
        });
      }

      if (!textContent || textContent.trim() === '') {
        throw new Error('Dispositivo gerado está vazio');
      }

      const htmlContent = normalizeHTMLSpacing(textContent.trim());

      const updatedTopic = {
        ...editingTopic,
        editedContent: htmlContent
      };
      setEditingTopic(updatedTopic);

      if (editorRef.current) {
        editorRef.current.root.innerHTML = sanitizeHTML(htmlContent);
      }

      setSelectedTopics(selectedTopics.map(t =>
        t.title === editingTopic.title ? updatedTopic : t
      ));
      setExtractedTopics(extractedTopics.map(t =>
        t.title === editingTopic.title ? updatedTopic : t
      ));

      setAnalysisProgress('');
      aiIntegration.setDispositivoInstruction('');
      showToast('✅ DISPOSITIVO regenerado com sucesso!', 'success');

    } catch (err) {
      setError('Erro ao regenerar DISPOSITIVO: ' + (err as Error).message);
      setAnalysisProgress('');
    } finally {
      aiIntegration.setRegeneratingDispositivo(false);
    }
  }, [
    editingTopic,
    setEditingTopic,
    selectedTopics,
    setSelectedTopics,
    extractedTopics,
    setExtractedTopics,
    topicsParaDispositivo,
    aiIntegration,
    editorRef,
    setError,
    setAnalysisProgress,
    showToast,
    sanitizeHTML,
    isTopicDecidido,
    htmlToFormattedText
  ]);

  return {
    generateDispositivo,
    regenerateDispositivoWithInstruction,
  };
}
