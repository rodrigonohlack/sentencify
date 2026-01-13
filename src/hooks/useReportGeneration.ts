/**
 * @file useReportGeneration.ts
 * @description Hook para geração de relatórios processuais e mini-relatórios
 * @version 1.36.73
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
import { AI_PROMPTS } from '../prompts';
import type {
  Topic,
  AnalyzedDocuments,
  PartesProcesso,
  AITextContent,
  AIDocumentContent,
  AIMessageContent,
  AIMessage,
  AISettings,
  AIProvider
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
}

/** Opções para geração de múltiplos mini-relatórios */
export interface MultipleReportsOptions {
  includeComplementares?: boolean;
  isInitialGeneration?: boolean;
  documentsOverride?: AnalyzedDocuments | null;
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

/** Interface mínima de AI Integration necessária para geração de relatórios */
export interface AIIntegrationForReports {
  callAI: (messages: AIMessage[], options?: {
    maxTokens?: number;
    useInstructions?: boolean;
    temperature?: number;
    topP?: number;
    topK?: number;
    extractText?: boolean;
    logMetrics?: boolean;
  }) => Promise<string>;
  extractResponseText: (data: Record<string, unknown>, provider: AIProvider) => string;
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
      if (docsToUse.peticoes?.length > 0) {
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
      if (docsToUse.contestacoes?.length > 0) {
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
      if (docsToUse.complementares?.length > 0) {
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
  }, [docs]);

  /**
   * Função base que retorna componentes reutilizáveis para prompts de mini-relatório
   */
  const buildMiniReportPromptCore = React.useCallback((options: { isInitialGeneration?: boolean } = {}) => {
    const { isInitialGeneration = false } = options;

    const totalContestacoes = (docs.contestacoes?.length || 0) +
                              (docs.contestacoesText?.length || 0);

    const modeloPersonalizado = aiIntegration.aiSettings?.modeloRelatorio?.trim();

    const modeloBase = modeloPersonalizado || `PRIMEIRO PARÁGRAFO (alegações do autor):
"O reclamante narra [resumo]. Sustenta [argumentos]. Indica que [situação]. Em decorrência, postula [pedido]."

SEGUNDO PARÁGRAFO (primeira defesa):
${totalContestacoes > 0 ? '"A primeira reclamada, em defesa, alega [argumentos]. Sustenta que [posição]."' : '"Não houve apresentação de contestação."'}

${totalContestacoes > 1 ? `TERCEIRO PARÁGRAFO (segunda defesa):
"A segunda ré, por sua vez, nega [posição]. Aduz [argumentos]."` : ''}

${totalContestacoes > 2 ? `QUARTO PARÁGRAFO (terceira defesa):
"A terceira reclamada também contesta [argumentos]. Sustenta [posição]."` : ''}`;

    const numeracaoPrompt = isInitialGeneration
      ? AI_PROMPTS.numeracaoReclamadasInicial
      : AI_PROMPTS.numeracaoReclamadas;

    let partesInfo = '';
    if (partesProcesso?.reclamadas?.length && partesProcesso.reclamadas.length > 0) {
      partesInfo = `\nPARTES DO PROCESSO:
- Reclamante: ${partesProcesso.reclamante || 'Não identificado'}
${partesProcesso.reclamadas.map((r, i: number) => `- ${i + 1}ª Reclamada: ${r}`).join('\n')}
`;
    }

    return {
      totalContestacoes,
      modeloBase,
      modeloPersonalizado,
      numeracaoPrompt,
      partesInfo,
      formatacaoHTML: AI_PROMPTS.formatacaoHTML("O <strong>reclamante</strong> narra que..."),
      formatacaoParagrafos: AI_PROMPTS.formatacaoParagrafos("<p>O reclamante narra...</p><p>A primeira reclamada, em defesa...</p>"),
      nivelDetalhe: aiIntegration.aiSettings?.detailedMiniReports ? `⚠️ NÍVEL DE DETALHE - FATOS:
Gere com alto nível de detalhe em relação aos FATOS alegados pelas partes.
A descrição fática (postulatória e defensiva) deve ter alto nível de detalhe.
` : '',
      estiloRedacao: AI_PROMPTS.estiloRedacao,
      preservarAnonimizacao: AI_PROMPTS.preservarAnonimizacao,
      proibicaoMetaComentarios: AI_PROMPTS.proibicaoMetaComentarios
    };
  }, [docs, aiIntegration.aiSettings, partesProcesso]);

  /**
   * Helper para prompt de mini-relatório INDIVIDUAL
   */
  const buildMiniReportPrompt = React.useCallback((options: {
    title?: string;
    context?: string;
    instruction?: string;
    currentRelatorio?: string;
    isInitialGeneration?: boolean;
  } = {}) => {
    const {
      title,
      context = '',
      instruction = '',
      currentRelatorio = '',
      isInitialGeneration = false
    } = options;

    const core = buildMiniReportPromptCore({ isInitialGeneration });

    return `Com base nos documentos processuais fornecidos acima${core.totalContestacoes > 0 ? ` (petição inicial e ${core.totalContestacoes} contestação${core.totalContestacoes > 1 ? 'ões' : ''})` : ' (petição inicial)'}, gere um mini-relatório narrativo para o tópico "${title}".

${instruction ? `INSTRUÇÃO DO USUÁRIO:\n${instruction}\n` : ''}

${context ? `CONTEXTO:\n${context}\n` : ''}

${currentRelatorio ? `MINI-RELATÓRIO ATUAL:\n${currentRelatorio}\n` : ''}

${core.modeloPersonalizado ? `MODELO PERSONALIZADO:\n${core.modeloBase}` : `FORMATO PADRÃO:\n${core.modeloBase}`}
${core.partesInfo}
${core.numeracaoPrompt}

${core.formatacaoHTML}

${core.formatacaoParagrafos}

${core.nivelDetalhe}

${core.estiloRedacao}

${core.preservarAnonimizacao}

${core.proibicaoMetaComentarios}

Responda APENAS com o texto do mini-relatório formatado em HTML, sem JSON, sem markdown, sem prefixo.`;
  }, [buildMiniReportPromptCore]);

  /**
   * Helper para prompt de mini-relatórios BATCH
   */
  const buildBatchMiniReportPrompt = React.useCallback((topics: Topic[], options: { isInitialGeneration?: boolean } = {}) => {
    const { isInitialGeneration = false } = options;

    const core = buildMiniReportPromptCore({ isInitialGeneration });
    const topicsList = topics.map((t: Topic, i: number) => `${i + 1}. "${t.title}"`).join('\n');

    return `Com base nos documentos processuais fornecidos acima${core.totalContestacoes > 0 ? ` (petição inicial e ${core.totalContestacoes} contestação${core.totalContestacoes > 1 ? 'ões' : ''})` : ' (petição inicial)'}, gere mini-relatórios narrativos para os seguintes ${topics.length} tópicos:

${topicsList}

FORMATO DE CADA MINI-RELATÓRIO:
${core.modeloBase}
${core.partesInfo}
${core.numeracaoPrompt}

${core.formatacaoHTML}

${core.formatacaoParagrafos}

${core.nivelDetalhe}

${core.estiloRedacao}

${core.preservarAnonimizacao}

${core.proibicaoMetaComentarios}

IMPORTANTE: Responda APENAS com um JSON válido no formato:
{
  "reports": [
    { "title": "TÍTULO DO TÓPICO 1", "relatorio": "<p>Mini-relatório HTML...</p>" },
    { "title": "TÍTULO DO TÓPICO 2", "relatorio": "<p>Mini-relatório HTML...</p>" }
  ]
}

Gere EXATAMENTE ${topics.length} mini-relatórios, um para cada tópico listado, na mesma ordem.`;
  }, [buildMiniReportPromptCore]);

  /**
   * Chama função com retry para rate limit
   */
  const callWithRetry = React.useCallback(async <T,>(
    fn: () => Promise<T>,
    maxRetries = 3,
    fileName = '',
    abortSignal: AbortSignal | null = null,
    timeoutMs = 180000
  ): Promise<T> => {
    const TIMEOUT_MS = timeoutMs;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      if (abortSignal?.aborted) {
        throw new Error('Processamento cancelado pelo usuário');
      }

      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout: API não respondeu em ${Math.round(TIMEOUT_MS/1000)}s`)), TIMEOUT_MS)
        );
        return await Promise.race([fn(), timeoutPromise]);
      } catch (err) {
        const errWithStatus = err as Error & { status?: number };
        const isRetryable = errWithStatus.message?.includes('Timeout') ||
          errWithStatus.status === 429 ||
          errWithStatus.status === 529 ||
          errWithStatus.status === 520 ||
          errWithStatus.status === 502 ||
          errWithStatus.message?.includes('rate limit') ||
          errWithStatus.message?.includes('429') ||
          errWithStatus.message?.includes('529') ||
          errWithStatus.message?.includes('520') ||
          errWithStatus.message?.includes('502') ||
          errWithStatus.message?.includes('Overloaded') ||
          errWithStatus.message?.includes('Failed to fetch') ||
          errWithStatus.message?.includes('parsear resposta');
        const isLastAttempt = attempt === maxRetries - 1;
        const attemptNum = attempt + 1;

        console.warn(`[callWithRetry] ❌ Erro na tentativa ${attemptNum}/${maxRetries}${fileName ? ` (${fileName})` : ''}:`, (err as Error).message || err);

        if (isRetryable) {
          if (!isLastAttempt) {
            const delay = Math.pow(2, attempt + 2) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));

            if (abortSignal?.aborted) {
              throw new Error('Processamento cancelado pelo usuário');
            }
            continue;
          } else {
            console.error(`[callWithRetry] 💀 FALHA FINAL: Todas as ${maxRetries} tentativas esgotadas${fileName ? ` (${fileName})` : ''}`);
            throw new Error(`Rate limit excedido após ${maxRetries} tentativas. O sistema de lotes está ativo, mas a API ainda atingiu o limite. Aguarde alguns minutos antes de tentar novamente.`);
          }
        }

        console.error(`[callWithRetry] ⚠️ Erro não-retryable${fileName ? ` (${fileName})` : ''}:`, (err as Error).message || err);
        throw err;
      }
    }
    throw new Error(`Todas as ${maxRetries} tentativas falharam`);
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════════
  // FUNÇÕES PRINCIPAIS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Gera um mini-relatório individual
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
      documentsOverride = null
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

    // 3. Chamar API
    const result = await aiIntegration.callAI([{
      role: 'user',
      content: contentArray
    }], {
      maxTokens,
      useInstructions: true,
      temperature: 0.4,
      topP: 0.9,
      topK: 60
    });

    // 4. Normalizar e retornar
    return removeMetaComments(normalizeHTMLSpacing(result));
  }, [aiIntegration, buildDocumentContentArray, buildMiniReportPrompt]);

  /**
   * Gera múltiplos mini-relatórios em UMA requisição
   */
  const generateMultipleMiniReports = React.useCallback(async (
    topics: Topic[],
    options: MultipleReportsOptions = {}
  ): Promise<Array<{ title: string; relatorio: string }>> => {
    const {
      includeComplementares = false,
      isInitialGeneration = false,
      documentsOverride = null
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
    const result = await aiIntegration.callAI([{
      role: 'user',
      content: contentArray
    }], {
      maxTokens,
      useInstructions: true,
      extractText: false,
      temperature: 0.4,
      topP: 0.9,
      topK: 60
    });

    // 4. Parsear resposta JSON
    // Nota: quando extractText: false, callAI retorna o objeto raw da API
    const provider = aiIntegration.aiSettings.provider || 'claude';
    const textContent = aiIntegration.extractResponseText(result as unknown as Record<string, unknown>, provider);
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
              const result = await callWithRetry(
                () => generateMiniReport({
                  title: topic.title,
                  context: topic.context || '',
                  instruction: topic.instruction || '',
                  includeComplementares: topic.includeComplementares || false,
                  isInitialGeneration: topic.isInitialGeneration || false,
                  documentsOverride: (topic.documentsOverride && Object.keys(topic.documentsOverride as object).length > 0) ? topic.documentsOverride as AnalyzedDocuments : null
                }),
                3,
                topic.title,
                null,
                timeoutMs
              );
              groupResults = [{ title: topic.title, relatorio: result, status: 'success' }];
            } else {
              const multiResults = await callWithRetry(
                () => generateMultipleMiniReports(group, {
                  includeComplementares: group[0]?.includeComplementares || false,
                  isInitialGeneration: group[0]?.isInitialGeneration || false,
                  documentsOverride: (group[0]?.documentsOverride && Object.keys(group[0].documentsOverride as object).length > 0) ? group[0].documentsOverride as AnalyzedDocuments : null
                }),
                2,
                group.map((t: Topic) => t.title).join(', '),
                null,
                timeoutMs
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
  }, [aiIntegration.aiSettings, generateMiniReport, generateMultipleMiniReports, callWithRetry]);

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

${AI_PROMPTS.estiloRedacao}

${AI_PROMPTS.preservarAnonimizacao}

Responda APENAS com o texto do relatório formatado em HTML, pronto para ser inserido na sentença. Não adicione explicações ou comentários.`
      });

      const textContent = await aiIntegration.callAI([{
        role: 'user',
        content: contentArray
      }], {
        maxTokens: 8000,
        useInstructions: true,
        logMetrics: true,
        temperature: 0.4,
        topP: 0.9,
        topK: 60
      });

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
    isGeneratingReport
  };
};
