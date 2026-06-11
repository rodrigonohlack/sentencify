/**
 * @file useReportGeneration.ts
 * @description Hook para geracao de relatorios processuais e mini-relatorios
 * @version 1.39.03
 *
 * Extraído do App.tsx
 * Funções:
 * - generateMiniReport: gera mini-relatório para um tópico
 * - generateMultipleMiniReports: gera múltiplos mini-relatórios em uma requisição
 * - generateMiniReportsBatch: gera em batches com progresso
 * - generateRelatorioProcessual: gera relatório processual completo
 * - regenerateRelatorioProcessual: regenera relatório existente
 */

import React from 'react';
import { normalizeHTMLSpacing, removeMetaComments } from '../utils/text';
import { withRetry, AI_RETRY_DEFAULTS } from '../utils/retry';
import { isPdfBinaryAllowed } from '../utils/manualCall';
import {
  AI_PROMPTS,
  resolveStyleBlock,
  buildMiniReportPrompt as buildMiniReportPromptShared,
  buildBatchMiniReportPrompt as buildBatchMiniReportPromptShared
} from '../prompts';
import { parseAIResponse, RastreabilidadeResponseSchema } from '../schemas/ai-responses';
import { splitReportIntoParagraphs } from '../utils/reportParagraphs';
import { buildTracingSources, buildSourceTracingPrompt, mapTracingResponse } from '../utils/sourceTracing';
import type {
  Topic,
  AnalyzedDocuments,
  PartesProcesso,
  AITextContent,
  AIDocumentContent,
  AIMessageContent,
  AIMessage,
  AISettings,
  AIProvider,
  RelatorioRastreabilidade
} from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

/** Opções para geração de mini-relatório individual */
export interface GenerateMiniReportOptions {
  title?: string;
  context?: string;
  instruction?: string;
  currentRelatorio?: string;
  includeComplementares?: boolean;
  isInitialGeneration?: boolean;
  maxTokens?: number;
  documentsOverride?: AnalyzedDocuments | null;
  /** v1.39.09: Usar streaming para evitar timeout */
  useStreaming?: boolean;
  /** v1.39.09: Callback para receber texto conforme chega */
  onChunk?: StreamChunkCallback;
}

/** Opções para geração de múltiplos mini-relatórios */
export interface MultipleReportsOptions {
  includeComplementares?: boolean;
  isInitialGeneration?: boolean;
  documentsOverride?: AnalyzedDocuments | null;
  /** v1.39.09: Usar streaming para evitar timeout */
  useStreaming?: boolean;
  /** v1.39.09: Callback para receber texto conforme chega */
  onChunk?: StreamChunkCallback;
}

/** Opções para geração em batch */
export interface BatchOptions {
  batchSize?: number;
  delayBetweenBatches?: number;
  onProgress?: ((current: number, total: number, batchNum: number, totalBatches: number) => void) | null;
}

/** Resultado da geração em batch */
export interface BatchResult {
  results: Array<{ title: string; relatorio?: string; status?: string }>;
  errors: Array<{ title: string; error?: string; status?: string }>;
}

/** Callback para receber chunks de texto durante streaming */
export type StreamChunkCallback = (fullText: string) => void;

/** Interface mínima de AI Integration necessária para geração de relatórios */
export interface AIIntegrationForReports {
  callAI: (messages: AIMessage[], options?: {
    maxTokens?: number;
    useInstructions?: boolean;
    /** v1.53.10: safety sem auto-revisão final (saída vai direto pro editor) */
    semRevisaoFinal?: boolean;
    temperature?: number;
    topP?: number;
    topK?: number;
    extractText?: boolean;
    logMetrics?: boolean;
  }) => Promise<string>;
  callAIStream?: (messages: AIMessage[], options?: {
    maxTokens?: number;
    useInstructions?: boolean;
    /** v1.53.10: safety sem auto-revisão final (saída vai direto pro editor) */
    semRevisaoFinal?: boolean;
    temperature?: number;
    topP?: number;
    topK?: number;
    onChunk?: StreamChunkCallback;
  }) => Promise<string>;
  extractResponseText: (data: Record<string, unknown>, provider: AIProvider) => string;
  getModelDisplayName: (model: string) => string;
  aiSettings: AISettings;
  relatorioInstruction?: string;
  setRegeneratingRelatorio: (value: boolean) => void;
}

/** Opções de construção de array de documentos */
interface BuildDocumentOptions {
  includePeticao?: boolean;
  includeContestacoes?: boolean;
  includeComplementares?: boolean;
  documentsOverride?: AnalyzedDocuments | null;
}

/** Props do hook */
export interface UseReportGenerationProps {
  aiIntegration: AIIntegrationForReports;
  analyzedDocuments: AnalyzedDocuments | null;
  partesProcesso: PartesProcesso | null;
}

/** Retorno do hook */
export interface UseReportGenerationReturn {
  generateMiniReport: (options?: GenerateMiniReportOptions) => Promise<string>;
  generateMultipleMiniReports: (topics: Topic[], options?: MultipleReportsOptions) => Promise<Array<{ title: string; relatorio: string }>>;
  generateMiniReportsBatch: (topics: Topic[], options?: BatchOptions) => Promise<BatchResult>;
  generateRelatorioProcessual: (contentArray: AIMessageContent[]) => Promise<string>;
  traceReportSources: (topic: Topic) => Promise<RelatorioRastreabilidade>;
  isGeneratingReport: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export const useReportGeneration = ({
  aiIntegration,
  analyzedDocuments,
  partesProcesso
}: UseReportGenerationProps): UseReportGenerationReturn => {
  const [isGeneratingReport, setIsGeneratingReport] = React.useState(false);

  // Documentos analisados com fallback para evitar null
  const docs = React.useMemo(() => analyzedDocuments || {
    peticoes: [],
    peticoesText: [],
    contestacoes: [],
    contestacoesText: [],
    complementares: [],
    complementaresText: []
  }, [analyzedDocuments]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // HELPERS INTERNOS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Constrói array de documentos para enviar à API
   */
  const buildDocumentContentArray = React.useCallback((options: BuildDocumentOptions = {}) => {
    const {
      includePeticao = true,
      includeContestacoes = true,
      includeComplementares = false,
      documentsOverride = null
    } = options;

    const docsToUse = documentsOverride || docs;
    const contentArray: (AITextContent | AIDocumentContent)[] = [];

    // 1. Petições (múltiplas)
    if (includePeticao) {
      if (docsToUse.peticoesText?.length > 0) {
        docsToUse.peticoesText.forEach((doc: { name?: string; text: string }, idx: number) => {
          contentArray.push({
            type: 'text',
            text: `${doc.name?.toUpperCase() || `PETIÇÃO ${idx + 1}`}:\n\n${doc.text}`,
            cache_control: doc.text.length > 2000 ? { type: "ephemeral" } : undefined
          });
        });
      }
      if (docsToUse.peticoes?.length > 0 && isPdfBinaryAllowed(aiIntegration.aiSettings.provider)) {
        const textCount = docsToUse.peticoesText?.length || 0;
        docsToUse.peticoes.forEach((base64: string, index: number) => {
          const label = index === 0 && textCount === 0 ? 'PETIÇÃO INICIAL' : `PETIÇÃO ${textCount + index + 1}`;
          contentArray.push({ type: 'text', text: `${label} (documento PDF a seguir):` });
          contentArray.push({
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: base64 },
            cache_control: base64.length > 100000 ? { type: "ephemeral" } : undefined
          });
        });
      }
    }

    // 2. Contestações
    if (includeContestacoes) {
      if (docsToUse.contestacoesText?.length > 0) {
        docsToUse.contestacoesText.forEach((contestacao: { text: string }, index: number) => {
          contentArray.push({
            type: 'text',
            text: `CONTESTAÇÃO ${index + 1}:\n\n${contestacao.text}`,
            cache_control: contestacao.text.length > 2000 ? { type: "ephemeral" } : undefined
          });
        });
      }
      if (docsToUse.contestacoes?.length > 0 && isPdfBinaryAllowed(aiIntegration.aiSettings.provider)) {
        const textCount = docsToUse.contestacoesText?.length || 0;
        docsToUse.contestacoes.forEach((base64: string, index: number) => {
          contentArray.push({ type: 'text', text: `CONTESTAÇÃO ${textCount + index + 1} (documento PDF a seguir):` });
          contentArray.push({
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: base64 },
            cache_control: base64.length > 100000 ? { type: "ephemeral" } : undefined
          });
        });
      }
    }

    // 3. Documentos Complementares
    if (includeComplementares) {
      if (docsToUse.complementaresText?.length > 0) {
        docsToUse.complementaresText.forEach((doc: { text: string }, index: number) => {
          contentArray.push({
            type: 'text',
            text: `DOCUMENTO COMPLEMENTAR ${index + 1}:\n\n${doc.text}`,
            cache_control: doc.text.length > 2000 ? { type: "ephemeral" } : undefined
          });
        });
      }
      if (docsToUse.complementares?.length > 0 && isPdfBinaryAllowed(aiIntegration.aiSettings.provider)) {
        const textCount = docsToUse.complementaresText?.length || 0;
        docsToUse.complementares.forEach((base64: string, index: number) => {
          contentArray.push({ type: 'text', text: `DOCUMENTO COMPLEMENTAR ${textCount + index + 1} (documento PDF a seguir):` });
          contentArray.push({
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: base64 },
            cache_control: base64.length > 100000 ? { type: "ephemeral" } : undefined
          });
        });
      }
    }

    return contentArray;
  }, [docs, aiIntegration]);

  /**
   * Helper para prompt de mini-relatório INDIVIDUAL
   * v1.53.15: delega à fonte única em promptBuilders.ts — a cópia local idêntica
   * (core + builders) foi removida; espelhos duplicados já divergiram antes
   * (a regra do customPrompt chegou só no chat em v1.53.5)
   */
  const buildMiniReportPrompt = React.useCallback((options: {
    title?: string;
    context?: string;
    instruction?: string;
    currentRelatorio?: string;
    isInitialGeneration?: boolean;
  } = {}) => buildMiniReportPromptShared(docs, aiIntegration.aiSettings, partesProcesso, options),
  [docs, aiIntegration.aiSettings, partesProcesso]);

  /**
   * Helper para prompt de mini-relatórios BATCH
   * v1.53.15: delega à fonte única em promptBuilders.ts
   */
  const buildBatchMiniReportPrompt = React.useCallback((topics: Topic[], options: { isInitialGeneration?: boolean } = {}) =>
    buildBatchMiniReportPromptShared(topics, docs, aiIntegration.aiSettings, partesProcesso, options),
  [docs, aiIntegration.aiSettings, partesProcesso]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // FUNÇÕES PRINCIPAIS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Gera um mini-relatório individual
   * v1.39.09: Suporte a streaming para evitar timeout no Render
   */
  const generateMiniReport = React.useCallback(async (options: GenerateMiniReportOptions = {}) => {
    const {
      title,
      context = '',
      instruction = '',
      currentRelatorio = '',
      includeComplementares = false,
      isInitialGeneration = false,
      maxTokens = 4000,
      documentsOverride = null,
      useStreaming = false,
      onChunk
    } = options;

    // 1. Construir array de documentos
    const contentArray = buildDocumentContentArray({
      includePeticao: true,
      includeContestacoes: true,
      includeComplementares,
      documentsOverride
    });

    // 2. Construir e adicionar prompt
    const prompt = buildMiniReportPrompt({
      title,
      context,
      instruction,
      currentRelatorio,
      isInitialGeneration
    });

    contentArray.push({ type: 'text', text: prompt });

    // 3. Chamar API (com ou sem streaming)
    let result: string;

    if (useStreaming && aiIntegration.callAIStream) {
      result = await aiIntegration.callAIStream([{
        role: 'user',
        content: contentArray
      }], {
        maxTokens,
        useInstructions: true,
        semRevisaoFinal: true,
        onChunk
      });
    } else {
      result = await aiIntegration.callAI([{
        role: 'user',
        content: contentArray
      }], {
        maxTokens,
        useInstructions: true,
        semRevisaoFinal: true,
        temperature: 0.4,
        topP: 0.9,
        topK: 60
      });
    }

    // 4. Normalizar e retornar
    return removeMetaComments(normalizeHTMLSpacing(result));
  }, [aiIntegration, buildDocumentContentArray, buildMiniReportPrompt]);

  /**
   * Segundo passe sob demanda: rastreia de quais trechos das peças cada parágrafo
   * do mini-relatório foi extraído. Verifica cada trecho localmente (anti-alucinação).
   */
  const traceReportSources = React.useCallback(async (topic: Topic): Promise<RelatorioRastreabilidade> => {
    const reportText = topic.editedRelatorio || topic.relatorio || '';
    if (!reportText.trim()) {
      throw new Error('Gere o mini-relatório antes de rastrear as fontes.');
    }

    const paragraphs = splitReportIntoParagraphs(reportText);
    // Defence-in-depth: reportText já é não-vazio aqui, mas garantimos parágrafos antes de chamar a IA.
    if (paragraphs.length === 0) {
      throw new Error('Não foi possível identificar parágrafos no mini-relatório.');
    }

    // Respeita a escolha explícita do tópico; senão, infere pelo título (tópico RELATÓRIO).
    const includeComplementares = topic.includeComplementares ?? topic.title.toUpperCase().includes('RELATÓRIO');
    const sources = buildTracingSources(docs, partesProcesso);

    const contentArray = buildDocumentContentArray({
      includePeticao: true,
      includeContestacoes: true,
      includeComplementares
    });
    contentArray.push({ type: 'text', text: buildSourceTracingPrompt(paragraphs) });

    const raw = await aiIntegration.callAI([{ role: 'user', content: contentArray }], {
      // v1.50.39: 6000 (era 4000) — além dos trechos, a resposta agora traz o
      // juízo de fidelidade por parágrafo (veredito + divergências).
      maxTokens: 6000,
      useInstructions: false,
      temperature: 0.1
    });

    const parsed = parseAIResponse(raw, RastreabilidadeResponseSchema);
    if (!parsed.success) {
      throw new Error('Resposta de rastreabilidade inválida: ' + parsed.error);
    }

    const blocos = mapTracingResponse(parsed.data.blocos, paragraphs, sources);

    // Resolve o nome amigável do modelo ativo (por provider), p.ex. "Claude Opus 4.8"
    // em vez do id cru do provider ("claude-cli").
    const settings = aiIntegration.aiSettings;
    const activeProvider = settings?.provider;
    const activeModelId =
      activeProvider === 'gemini' ? settings?.geminiModel
        : activeProvider === 'openai' ? settings?.openaiModel
          : activeProvider === 'grok' ? settings?.grokModel
            : activeProvider === 'deepseek' ? settings?.deepseekModel
              : activeProvider === 'claude-cli' ? (settings?.claudeCliModel || 'claude-sonnet-4-6')
                : settings?.claudeModel;
    const modelo = activeModelId
      ? aiIntegration.getModelDisplayName(activeModelId)
      : activeProvider;

    return {
      geradoEm: new Date().toISOString(),
      baseSnapshot: reportText,
      modelo,
      blocos
    };
  }, [docs, partesProcesso, buildDocumentContentArray, aiIntegration]);

  /**
   * Gera múltiplos mini-relatórios em UMA requisição
   * v1.39.09: Suporte a streaming para evitar timeout no Render
   */
  const generateMultipleMiniReports = React.useCallback(async (
    topics: Topic[],
    options: MultipleReportsOptions = {}
  ): Promise<Array<{ title: string; relatorio: string }>> => {
    const {
      includeComplementares = false,
      isInitialGeneration = false,
      documentsOverride = null,
      useStreaming = false,
      onChunk
    } = options;

    // 1. Construir array de documentos
    const contentArray = buildDocumentContentArray({
      includePeticao: true,
      includeContestacoes: true,
      includeComplementares,
      documentsOverride
    });

    // 2. Usar builder centralizado
    const prompt = buildBatchMiniReportPrompt(topics, { isInitialGeneration });
    contentArray.push({ type: 'text', text: prompt });

    // 3. Chamar API com maxTokens escalado
    const isAllInOne = aiIntegration.aiSettings?.topicsPerRequest === 'all';
    const tokenCap = isAllInOne ? 48000 : 24000;
    const maxTokens = Math.min(4000 * topics.length, tokenCap);

    let textContent: string;

    if (useStreaming && aiIntegration.callAIStream) {
      // Streaming: recebe texto diretamente
      textContent = await aiIntegration.callAIStream([{
        role: 'user',
        content: contentArray
      }], {
        maxTokens,
        useInstructions: true,
        semRevisaoFinal: true,
        onChunk
      });
    } else {
      // Sem streaming: usa extractText: false para parsear JSON
      const result = await aiIntegration.callAI([{
        role: 'user',
        content: contentArray
      }], {
        maxTokens,
        useInstructions: true,
        semRevisaoFinal: true,
        extractText: false,
        temperature: 0.4,
        topP: 0.9,
        topK: 60
      });

      // Nota: quando extractText: false, callAI retorna o objeto raw da API
      const provider = aiIntegration.aiSettings.provider || 'claude';
      textContent = aiIntegration.extractResponseText(result as unknown as Record<string, unknown>, provider);
    }

    // 4. Parsear resposta JSON
    let cleanText = textContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    try {
      const parsed = JSON.parse(cleanText);
      if (parsed.reports && Array.isArray(parsed.reports)) {
        return parsed.reports.map((r: { title: string; relatorio?: string }) => ({
          title: r.title,
          relatorio: removeMetaComments(normalizeHTMLSpacing(r.relatorio || ''))
        }));
      }
      throw new Error('Formato de resposta inválido');
    } catch (parseError) {
      const jsonMatch = cleanText.match(/\{[\s\S]*"reports"[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.reports && Array.isArray(parsed.reports)) {
            return parsed.reports.map((r: { title: string; relatorio?: string }) => ({
              title: r.title,
              relatorio: removeMetaComments(normalizeHTMLSpacing(r.relatorio || ''))
            }));
          }
        } catch {
          // JSON extraído também é inválido
        }
      }
      throw new Error(`Erro ao parsear resposta de múltiplos tópicos: ${(parseError as Error).message}`);
    }
  }, [aiIntegration, buildDocumentContentArray, buildBatchMiniReportPrompt]);

  /**
   * Gera múltiplos mini-relatórios em batches com progresso
   */
  const generateMiniReportsBatch = React.useCallback(async (
    topics: Topic[],
    options: BatchOptions = {}
  ): Promise<BatchResult> => {
    const {
      batchSize = 3,
      delayBetweenBatches = 1000,
      onProgress = null
    } = options;

    setIsGeneratingReport(true);

    try {
      const topicsPerRequestSetting = aiIntegration.aiSettings?.topicsPerRequest || 1;

      const results: Array<{ title: string; relatorio?: string; status?: string }> = [];
      const errors: Array<{ title: string; error?: string; status?: string }> = [];
      const totalTopics = topics.length;

      // Agrupar tópicos conforme topicsPerRequest
      const topicGroups: Topic[][] = [];
      if (topicsPerRequestSetting === 'all') {
        topicGroups.push(topics);
      } else {
        const perReq = topicsPerRequestSetting;
        for (let i = 0; i < totalTopics; i += perReq) {
          topicGroups.push(topics.slice(i, i + perReq));
        }
      }

      const totalGroups = topicGroups.length;
      const totalBatches = Math.ceil(totalGroups / batchSize);
      let processedTopics = 0;

      const timeoutMs = topicsPerRequestSetting === 'all' ? 600000 : 360000;

      for (let i = 0; i < totalGroups; i += batchSize) {
        const batch = topicGroups.slice(i, i + batchSize);
        const batchNum = Math.floor(i / batchSize) + 1;

        if (onProgress) {
          onProgress(processedTopics, totalTopics, batchNum, totalBatches);
        }

        const promises = batch.map(async (group) => {
          try {
            let groupResults: Array<{ title: string; relatorio?: string; status?: string }>;
            if (group.length === 1) {
              const topic = group[0];
              const result = await withRetry(
                () => generateMiniReport({
                  title: topic.title,
                  context: topic.context || '',
                  instruction: topic.instruction || '',
                  includeComplementares: topic.includeComplementares || false,
                  isInitialGeneration: topic.isInitialGeneration || false,
                  documentsOverride: (topic.documentsOverride && Object.keys(topic.documentsOverride as object).length > 0) ? topic.documentsOverride as AnalyzedDocuments : null,
                  useStreaming: true  // v1.40.00: Streaming silencioso para evitar timeout
                }),
                {
                  ...AI_RETRY_DEFAULTS,
                  timeoutMs,
                  onRetry: (attempt, err, delay) => {
                    console.warn(`[MiniReport] Retry ${attempt} (${topic.title}), aguardando ${delay}ms:`, err.message);
                  }
                }
              );
              groupResults = [{ title: topic.title, relatorio: result, status: 'success' }];
            } else {
              const multiResults = await withRetry(
                () => generateMultipleMiniReports(group, {
                  includeComplementares: group[0]?.includeComplementares || false,
                  isInitialGeneration: group[0]?.isInitialGeneration || false,
                  documentsOverride: (group[0]?.documentsOverride && Object.keys(group[0].documentsOverride as object).length > 0) ? group[0].documentsOverride as AnalyzedDocuments : null,
                  useStreaming: true  // v1.40.00: Streaming silencioso para evitar timeout
                }),
                {
                  ...AI_RETRY_DEFAULTS,
                  maxRetries: 2,
                  timeoutMs,
                  onRetry: (attempt, err, delay) => {
                    console.warn(`[MultiReport] Retry ${attempt}, aguardando ${delay}ms:`, err.message);
                  }
                }
              );
              groupResults = multiResults.map((r: { title: string; relatorio?: string }) => ({ ...r, status: 'success' }));
            }
            groupResults.forEach((r: { title: string; relatorio?: string; status?: string }) => {
              processedTopics++;
              if (r.status === 'success') {
                results.push(r);
              } else {
                errors.push(r);
              }
              if (onProgress) {
                onProgress(processedTopics, totalTopics, batchNum, totalBatches);
              }
            });
            return groupResults;
          } catch (err) {
            const errorResults = group.map((t: Topic) => ({ title: t.title, error: (err as Error).message, status: 'error' }));
            errorResults.forEach((r: { title: string; error?: string; status: string }) => {
              processedTopics++;
              errors.push(r);
              if (onProgress) {
                onProgress(processedTopics, totalTopics, batchNum, totalBatches);
              }
            });
            return errorResults;
          }
        });

        await Promise.all(promises);

        if (i + batchSize < totalGroups) {
          await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
        }
      }

      if (onProgress) {
        onProgress(totalTopics, totalTopics, totalBatches, totalBatches);
      }

      return { results, errors };
    } finally {
      setIsGeneratingReport(false);
    }
  }, [aiIntegration.aiSettings, generateMiniReport, generateMultipleMiniReports]);

  /**
   * Gera relatório processual completo
   */
  const generateRelatorioProcessual = React.useCallback(async (
    contentArray: AIMessageContent[]
  ): Promise<string> => {
    try {
      const modeloPersonalizado = aiIntegration.aiSettings?.modeloTopicoRelatorio?.trim();
      const modeloBase = modeloPersonalizado || AI_PROMPTS.instrucoesRelatorioPadrao;

      contentArray.push({
        type: 'text' as const,
        text: `Analise todos os documentos fornecidos (petição inicial, contestações e documentos complementares, se houver) e gere um RELATÓRIO PROCESSUAL completo seguindo o modelo abaixo.

${modeloPersonalizado ? 'MODELO PERSONALIZADO DO USUÁRIO:' : 'MODELO BASE:'}
${modeloBase}

INSTRUÇÕES IMPORTANTES:

1. ADAPTE o modelo conforme as informações REAIS encontradas nos documentos
2. Se uma informação NÃO existir nos documentos, NÃO a inclua no relatório
3. Se houver informações nos documentos que não estão no modelo, adicione-as de forma apropriada
4. Mantenha a estrutura e formatação do modelo
5. Use primeira pessoa quando apropriado
6. Seja objetivo e factual
7. Extraia informações precisas:
   - Nomes completos das partes
   - Período de trabalho (datas)
   - Função exercida
   - Remuneração
   - Valor da causa
   - Pedidos principais
   - Defesas apresentadas
   - Provas produzidas (perícias, testemunhas, documentos)
   - Audiências realizadas
   - Tentativas de conciliação

8. Se houver múltiplas reclamadas, adapte o texto (primeira reclamada, segunda reclamada, etc.)
9. Se não houver contestação, adapte o texto correspondente
10. Se não houver prova pericial, omita esse parágrafo
11. Se não houver testemunhas, adapte o texto
12. Mantenha sempre "DECIDE-SE." no final

${AI_PROMPTS.numeracaoReclamadas}

${AI_PROMPTS.formatacaoHTML("<strong>JOÃO DA SILVA</strong>, qualificado na inicial...")}

${AI_PROMPTS.formatacaoParagrafos("<p>JOÃO DA SILVA, qualificado na inicial...</p><p>Em defesa, a reclamada...</p>")}

${resolveStyleBlock(aiIntegration.aiSettings?.customPrompt, AI_PROMPTS.estiloRedacao)}

${aiIntegration.aiSettings?.anonymization?.enabled ? AI_PROMPTS.preservarAnonimizacao : ''}

Responda APENAS com o texto do relatório formatado em HTML, pronto para ser inserido na sentença. Não adicione explicações ou comentários.`
      });

      // v1.40.03: Usar streaming silencioso para evitar timeout
      const messages: AIMessage[] = [{
        role: 'user',
        content: contentArray
      }];
      const options = {
        maxTokens: 8000,
        useInstructions: true,
        semRevisaoFinal: true,
        logMetrics: true,
        temperature: 0.4,
        topP: 0.9,
        topK: 60
      };

      const textContent = aiIntegration.callAIStream
        ? await aiIntegration.callAIStream(messages, options)
        : await aiIntegration.callAI(messages, options);

      return normalizeHTMLSpacing(textContent.trim());
    } catch {
      return `SENTENÇA

I - RELATÓRIO

Relatório processual não pôde ser gerado automaticamente. Por favor, edite este tópico manualmente.

DECIDE-SE.`;
    }
  }, [aiIntegration]);

  return {
    generateMiniReport,
    generateMultipleMiniReports,
    generateMiniReportsBatch,
    generateRelatorioProcessual,
    traceReportSources,
    isGeneratingReport
  };
};
