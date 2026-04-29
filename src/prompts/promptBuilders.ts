/**
 * @file promptBuilders.ts
 * @description Funções para construção de prompts de mini-relatório e documentos
 * @version 1.37.18
 *
 * Funções extraídas do App.tsx (FASE 13):
 * - buildDocumentContentArray: Constrói array de conteúdo com documentos processuais
 * - buildMiniReportPromptCore: Retorna componentes reutilizáveis para prompts
 * - buildMiniReportPrompt: Helper para prompt de mini-relatório individual
 * - buildBatchMiniReportPrompt: Helper para prompt de mini-relatórios em batch
 */

import type { Topic, AITextContent, AIDocumentContent } from '../types';
import { AI_PROMPTS } from './ai-prompts';
import { wrapUserContent } from '../utils/prompt-safety';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface AnalyzedDocumentsForPrompt {
  peticoes?: string[];
  peticoesText?: Array<{ name?: string; text: string }>;
  contestacoes?: string[];
  contestacoesText?: Array<{ text: string }>;
  complementares?: string[];
  complementaresText?: Array<{ text: string }>;
}

export interface BuildDocumentOptions {
  includePeticao?: boolean;
  includeContestacoes?: boolean;
  includeComplementares?: boolean;
  documentsOverride?: AnalyzedDocumentsForPrompt | null;
}

export interface AISettingsForPrompt {
  modeloRelatorio?: string;
  detailedMiniReports?: boolean;
  anonymization?: { enabled?: boolean };
}

export interface PartesProcesso {
  reclamante?: string;
  reclamadas?: string[];
}

export interface MiniReportPromptCore {
  totalContestacoes: number;
  modeloBase: string;
  modeloPersonalizado: string | undefined;
  numeracaoPrompt: string;
  partesInfo: string;
  formatacaoHTML: string;
  formatacaoParagrafos: string;
  nivelDetalhe: string;
  estiloRedacao: string;
  preservarAnonimizacao: string;
  proibicaoMetaComentarios: string;
}

export interface BuildMiniReportPromptOptions {
  title?: string;
  context?: string;
  instruction?: string;
  currentRelatorio?: string;
  isInitialGeneration?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// BUILD DOCUMENT CONTENT ARRAY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Constrói array de conteúdo com documentos processuais para envio à IA
 * @param analyzedDocuments - Documentos analisados (petições, contestações, complementares)
 * @param options - Opções de inclusão de documentos
 * @returns Array de conteúdo formatado para API
 */
export function buildDocumentContentArray(
  analyzedDocuments: AnalyzedDocumentsForPrompt,
  options: BuildDocumentOptions = {}
): (AITextContent | AIDocumentContent)[] {
  const {
    includePeticao = true,
    includeContestacoes = true,
    includeComplementares = false,
    documentsOverride = null
  } = options;

  // Usar documentsOverride se fornecido, senão usar analyzedDocuments
  const docs = documentsOverride || analyzedDocuments;
  const contentArray: (AITextContent | AIDocumentContent)[] = [];

  // 1. Petições (múltiplas) - suporte a petição inicial + emendas
  if (includePeticao) {
    // Primeiro: textos extraídos (PDF.JS ou Claude Vision)
    if (docs.peticoesText?.length && docs.peticoesText.length > 0) {
      docs.peticoesText.forEach((doc: { name?: string; text: string }, idx: number) => {
        const label = doc.name?.toUpperCase() || `PETIÇÃO ${idx + 1}`;
        contentArray.push({
          type: 'text',
          text: wrapUserContent(doc.text, label),
          cache_control: doc.text.length > 2000 ? { type: "ephemeral" } : undefined
        });
      });
    }
    // Depois: PDFs binários (modo pdf-puro ou fallback)
    if (docs.peticoes?.length && docs.peticoes.length > 0) {
      const textCount = docs.peticoesText?.length || 0;
      docs.peticoes.forEach((base64: string, index: number) => {
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

  // 2. Contestações - suporte a modos mistos (envia textos E PDFs)
  if (includeContestacoes) {
    // Primeiro: textos extraídos (PDF.JS ou Claude Vision)
    if (docs.contestacoesText?.length && docs.contestacoesText.length > 0) {
      docs.contestacoesText.forEach((contestacao: { text: string }, index: number) => {
        const label = `CONTESTAÇÃO ${index + 1}`;
        contentArray.push({
          type: 'text',
          text: wrapUserContent(contestacao.text, label),
          cache_control: contestacao.text.length > 2000 ? { type: "ephemeral" } : undefined
        });
      });
    }
    // Depois: PDFs não extraídos (modo PDF Puro ou fallback)
    if (docs.contestacoes?.length && docs.contestacoes.length > 0) {
      const textCount = docs.contestacoesText?.length || 0;
      docs.contestacoes.forEach((base64: string, index: number) => {
        contentArray.push({ type: 'text', text: `CONTESTAÇÃO ${textCount + index + 1} (documento PDF a seguir):` });
        contentArray.push({
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: base64 },
          cache_control: base64.length > 100000 ? { type: "ephemeral" } : undefined
        });
      });
    }
  }

  // 3. Documentos Complementares - suporte a modos mistos (envia textos E PDFs)
  if (includeComplementares) {
    // Primeiro: textos extraídos (PDF.JS ou Claude Vision)
    if (docs.complementaresText?.length && docs.complementaresText.length > 0) {
      docs.complementaresText.forEach((doc: { text: string }, index: number) => {
        const label = `DOCUMENTO COMPLEMENTAR ${index + 1}`;
        contentArray.push({
          type: 'text',
          text: wrapUserContent(doc.text, label),
          cache_control: doc.text.length > 2000 ? { type: "ephemeral" } : undefined
        });
      });
    }
    // Depois: PDFs não extraídos (modo PDF Puro ou fallback)
    if (docs.complementares?.length && docs.complementares.length > 0) {
      const textCount = docs.complementaresText?.length || 0;
      docs.complementares.forEach((base64: string, index: number) => {
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
}

// ═══════════════════════════════════════════════════════════════════════════
// BUILD MINI REPORT PROMPT CORE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Retorna componentes reutilizáveis para prompts de mini-relatório
 * @param analyzedDocuments - Documentos analisados
 * @param aiSettings - Configurações da IA
 * @param partesProcesso - Partes do processo
 * @param options - Opções adicionais
 * @returns Componentes do prompt
 */
export function buildMiniReportPromptCore(
  analyzedDocuments: AnalyzedDocumentsForPrompt,
  aiSettings: AISettingsForPrompt | undefined,
  partesProcesso: PartesProcesso | null,
  options: { isInitialGeneration?: boolean } = {}
): MiniReportPromptCore {
  const { isInitialGeneration = false } = options;

  const totalContestacoes = (analyzedDocuments.contestacoes?.length || 0) +
                            (analyzedDocuments.contestacoesText?.length || 0);

  const modeloPersonalizado = aiSettings?.modeloRelatorio?.trim();

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
    nivelDetalhe: aiSettings?.detailedMiniReports ? `⚠️ NÍVEL DE DETALHE - FATOS:
Gere com alto nível de detalhe em relação aos FATOS alegados pelas partes.
A descrição fática (postulatória e defensiva) deve ter alto nível de detalhe.
` : '',
    estiloRedacao: AI_PROMPTS.estiloRedacao,
    preservarAnonimizacao: aiSettings?.anonymization?.enabled ? AI_PROMPTS.preservarAnonimizacao : '',
    proibicaoMetaComentarios: AI_PROMPTS.proibicaoMetaComentarios
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// BUILD MINI REPORT PROMPT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Helper para prompt de mini-relatório INDIVIDUAL
 * @param analyzedDocuments - Documentos analisados
 * @param aiSettings - Configurações da IA
 * @param partesProcesso - Partes do processo
 * @param options - Opções do prompt
 * @returns Prompt formatado
 */
export function buildMiniReportPrompt(
  analyzedDocuments: AnalyzedDocumentsForPrompt,
  aiSettings: AISettingsForPrompt | undefined,
  partesProcesso: PartesProcesso | null,
  options: BuildMiniReportPromptOptions = {}
): string {
  const {
    title,
    context = '',
    instruction = '',
    currentRelatorio = '',
    isInitialGeneration = false
  } = options;

  const core = buildMiniReportPromptCore(analyzedDocuments, aiSettings, partesProcesso, { isInitialGeneration });

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
}

// ═══════════════════════════════════════════════════════════════════════════
// BUILD BATCH MINI REPORT PROMPT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Helper para prompt de mini-relatórios BATCH
 * @param topics - Tópicos para gerar relatórios
 * @param analyzedDocuments - Documentos analisados
 * @param aiSettings - Configurações da IA
 * @param partesProcesso - Partes do processo
 * @param options - Opções do prompt
 * @returns Prompt formatado
 */
export function buildBatchMiniReportPrompt(
  topics: Topic[],
  analyzedDocuments: AnalyzedDocumentsForPrompt,
  aiSettings: AISettingsForPrompt | undefined,
  partesProcesso: PartesProcesso | null,
  options: { isInitialGeneration?: boolean } = {}
): string {
  const { isInitialGeneration = false } = options;

  const core = buildMiniReportPromptCore(analyzedDocuments, aiSettings, partesProcesso, { isInitialGeneration });
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
}
