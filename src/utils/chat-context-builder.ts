/**
 * @file chat-context-builder.ts
 * @description Função centralizada para construção de contexto do chat do Assistente IA
 * @version 1.38.22
 *
 * Centraliza a lógica de buildContextForChat (editor individual) e buildContextForChatGlobal (editor global)
 * para eliminar ~280 linhas de código duplicado.
 *
 * Suporta toda a granularidade de contexto:
 * - Escopo de tópicos: current, selected, all
 * - Toggle de documentos: includeMainDocs
 * - Filtro de prova oral: proofFilter
 */

import { AI_PROMPTS, SOCRATIC_INTERN_LOGIC } from '../prompts/ai-prompts';
import { INSTRUCAO_NAO_PRESUMIR } from '../prompts/instrucoes';
import { prepareDocumentsContext, prepareProofsContext, prepareOralProofsContext } from './context-helpers';
import type { AIMessageContent, AnonymizationSettings } from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

/** Opções de contexto para o chat */
export interface ChatContextOptions {
  proofFilter?: string;
  includeMainDocs?: boolean;
  includeComplementaryDocs?: boolean;  // v1.39.06: Toggle "Incluir documentos complementares" no chat
  selectedContextTopics?: string[];
}

/** Tópico mínimo necessário para construção de contexto */
export interface ChatContextTopic {
  title: string;
  category?: string;
  relatorio?: string;
  editedRelatorio?: string;
  fundamentacao?: string;
  editedFundamentacao?: string;
  editedContent?: string;
}

/** Documentos analisados - tipo flexível para aceitar parciais */
export interface ChatContextDocuments {
  peticoes?: string[];
  peticoesText?: Array<{ name?: string; text: string }>;
  contestacoes?: string[];
  contestacoesText?: Array<{ text: string }>;
  complementares?: string[];
  complementaresText?: Array<{ text: string }>;
}

/** Parâmetros para construção do contexto do chat */
export interface BuildChatContextParams {
  userMessage: string;
  options: ChatContextOptions;
  currentTopic: ChatContextTopic;
  currentContent: string;
  allTopics: ChatContextTopic[];
  contextScope: 'current' | 'selected' | 'all';
  analyzedDocuments: ChatContextDocuments;
  proofManager: {
    proofFiles?: Array<{ id: number | string; name: string; file?: File; extractedText?: string; analysisResult?: string; myConclusions?: string }>;
    proofTexts?: Array<{ id: number | string; name: string; text?: string; analysisResult?: string; myConclusions?: string }>;
    proofTopicLinks?: Record<string, string[]>;
  };
  fileToBase64: (file: File) => Promise<string>;
  anonymizationEnabled?: boolean;
  anonymizationSettings?: AnonymizationSettings;
  /** Pacote de conhecimento selecionado pelo usuário (instruções + arquivos de texto) */
  knowledgePackage?: {
    name: string;
    instructions: string;
    files: { name: string; content: string }[];
  } | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNÇÃO PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Constrói o contexto completo para o chat do Assistente IA
 * @param params - Parâmetros de construção
 * @returns Array de conteúdo para enviar à API
 */
export async function buildChatContext(params: BuildChatContextParams): Promise<AIMessageContent[]> {
  const {
    userMessage,
    options,
    currentTopic,
    currentContent,
    allTopics,
    contextScope,
    analyzedDocuments,
    proofManager,
    fileToBase64,
    anonymizationEnabled,
    anonymizationSettings,
  } = params;

  const { proofFilter, includeMainDocs = true, includeComplementaryDocs = false, selectedContextTopics } = options;

  // 1. Filtrar documentos baseado nos toggles includeMainDocs e includeComplementaryDocs
  // v1.39.06: includeComplementaryDocs controla se complementares são enviados (default: false)
  const docsToSend = includeMainDocs
    ? {
        peticoes: analyzedDocuments.peticoes || [],
        peticoesText: analyzedDocuments.peticoesText || [],
        contestacoes: analyzedDocuments.contestacoes || [],
        contestacoesText: analyzedDocuments.contestacoesText || [],
        complementares: includeComplementaryDocs ? (analyzedDocuments.complementares || []) : [],
        complementaresText: includeComplementaryDocs ? (analyzedDocuments.complementaresText || []) : [],
      }
    : {
        peticoes: [],
        peticoesText: [],
        contestacoes: [],
        contestacoesText: [],
        complementares: includeComplementaryDocs ? (analyzedDocuments.complementares || []) : [],
        complementaresText: includeComplementaryDocs ? (analyzedDocuments.complementaresText || []) : [],
      };

  // 2. Preparar documentos usando helper
  const { contentArray, flags } = prepareDocumentsContext(docsToSend);
  const { hasPeticao, hasContestacoes, hasComplementares } = flags;

  // 3. Preparar provas (normal ou oral)
  const prepareFunction = proofFilter === 'oral' ? prepareOralProofsContext : prepareProofsContext;
  const { proofDocuments, proofsContext, hasProofs } = fileToBase64
    ? await prepareFunction(
        proofManager as Parameters<typeof prepareProofsContext>[0],
        currentTopic.title,
        fileToBase64,
        anonymizationEnabled,
        anonymizationSettings
      )
    : { proofDocuments: [] as AIMessageContent[], proofsContext: '', hasProofs: false };
  contentArray.push(...proofDocuments);

  // 4. Determinar escopo efetivo
  const effectiveScope = selectedContextTopics && selectedContextTopics.length > 0 ? 'selected' : contextScope;

  // 5. Construir contexto da decisão baseado no escopo
  let decisionContext = '';

  if (effectiveScope === 'current') {
    // Apenas o tópico atual
    decisionContext = `📋 CONTEXTO DO TÓPICO:
Título: ${currentTopic.title || 'Não especificado'}
Categoria: ${currentTopic.category || 'Não especificada'}

📝 MINI-RELATÓRIO DO TÓPICO:
${currentTopic.editedRelatorio || currentTopic.relatorio || 'Não disponível'}

✍️ CONTEÚDO JÁ ESCRITO DA DECISÃO:
${currentContent || 'Ainda não foi escrito nada'}`;

  } else if (effectiveScope === 'selected' && selectedContextTopics) {
    // Tópicos selecionados
    decisionContext = '📋 CONTEXTO DOS TÓPICOS SELECIONADOS:\n\n';
    const topicsToInclude = allTopics.filter(t => selectedContextTopics.includes(t.title));

    topicsToInclude.forEach((t, index) => {
      decisionContext += `📋 TÓPICO ${index + 1}: ${t.title} (${t.category || 'Sem categoria'})
Mini-relatório: ${t.editedRelatorio || t.relatorio || 'Não disponível'}
Decisão: ${t.editedFundamentacao || t.fundamentacao || 'Não escrita'}

---

`;
    });

    decisionContext += `\n🎯 TÓPICO SENDO EDITADO: ${currentTopic.title}
✍️ CONTEÚDO JÁ ESCRITO:
${currentContent || 'Ainda não foi escrito nada'}`;

  } else {
    // Escopo 'all' - Toda a decisão
    decisionContext = '📋 CONTEXTO COMPLETO DA DECISÃO:\n\n';

    allTopics.forEach((t, index) => {
      const titleUpper = t.title.toUpperCase();
      if (titleUpper === 'RELATÓRIO') {
        decisionContext += `📄 RELATÓRIO GERAL:\n${t.editedRelatorio || t.relatorio || 'Não disponível'}\n\n---\n\n`;
      } else if (titleUpper === 'DISPOSITIVO') {
        decisionContext += `⚖️ DISPOSITIVO:\n${t.editedContent || ''}\n\n---\n\n`;
      } else {
        decisionContext += `📋 TÓPICO ${index}: ${t.title} (${t.category || 'Sem categoria'})
Mini-relatório: ${t.editedRelatorio || t.relatorio || 'Não disponível'}
Decisão: ${t.editedFundamentacao || t.fundamentacao || 'Não escrita'}

---

`;
      }
    });

    decisionContext += `\n🎯 TÓPICO SENDO EDITADO: ${currentTopic.title}
✍️ CONTEÚDO JÁ ESCRITO NESTE TÓPICO:
${currentContent || 'Ainda não foi escrito nada'}`;
  }

  // 6. Injetar pacote de conhecimento (se selecionado)
  if (params.knowledgePackage) {
    const { name, instructions, files } = params.knowledgePackage;
    let pkgText = `📚 PACOTE DE CONHECIMENTO: ${name}\n`;
    if (instructions?.trim()) pkgText += `\n${instructions.trim()}\n`;
    for (const f of files) {
      if (f.content?.trim()) {
        pkgText += `\n--- ${f.name} ---\n${f.content.trim()}\n`;
      }
    }
    contentArray.push({ type: 'text', text: pkgText });
  }

  // 7. Montar prompt completo
  contentArray.push({
    type: 'text',
    text: `Você está auxiliando na redação de uma DECISÃO JUDICIAL TRABALHISTA.

${decisionContext}

${hasPeticao || hasContestacoes || hasComplementares || hasProofs ? `
📚 DOCUMENTOS DISPONÍVEIS PARA CONSULTA:
${hasPeticao ? '✓ Petição inicial' : ''}
${hasContestacoes ? '✓ Contestação(ões)' : ''}
${hasComplementares ? '✓ Documento(s) complementar(es)' : ''}
${hasProofs ? '✓ Prova(s) vinculada(s) a este tópico' : ''}

Os documentos foram anexados acima. Você pode e DEVE consultá-los para fundamentar sua decisão.
${hasProofs ? '- Analise as provas vinculadas e suas respectivas análises/conclusões' : ''}
` : ''}
${proofsContext}

${INSTRUCAO_NAO_PRESUMIR}

${SOCRATIC_INTERN_LOGIC}

${AI_PROMPTS.estiloRedacao}
${AI_PROMPTS.numeracaoReclamadas}
${anonymizationEnabled ? AI_PROMPTS.preservarAnonimizacao : ''}

⚠️ NÃO INCLUIR MINI-RELATÓRIO no texto gerado.

🎯 INSTRUÇÃO DO USUÁRIO:
${userMessage}

Quando faltar informação expressa necessária à redação, PERGUNTE ao usuário antes de redigir. Prefira perguntar a presumir.

⚠️ ANTES DE REDIGIR QUALQUER TEXTO DE DECISÃO:
Liste as informações/conclusões que você precisa confirmar com o usuário.
Só prossiga com a redação APÓS receber as respostas.
Se não houver nada a confirmar, indique "Nenhuma informação pendente" e prossiga.

Quando gerar texto para a decisão, responda em HTML.
${AI_PROMPTS.formatacaoHTML("A <strong>CLT</strong> estabelece...")}
${AI_PROMPTS.formatacaoParagrafos("<p>Primeiro parágrafo.</p><p>Segundo parágrafo.</p>")}`
  });

  return contentArray;
}
