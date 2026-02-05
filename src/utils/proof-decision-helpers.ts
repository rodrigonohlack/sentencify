/**
 * @file proof-decision-helpers.ts
 * @description Helpers para o quickprompt "Decidir com Provas"
 * @version 1.40.XX
 *
 * Funções auxiliares para coletar dados de provas vinculadas
 * e construir prompts para assistência na redação de decisões.
 */

import type { ProofFile, ProofText, ProofAnalysisResult } from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// SEÇÃO 1: TIPOS
// ═══════════════════════════════════════════════════════════════════════════

/** Interface para dados de provas necessários para coleta */
export interface ProofDataSource {
  proofTopicLinks?: Record<string, string[]>;
  proofFiles: ProofFile[];
  proofTexts: ProofText[];
  proofAnalysisResults: Record<string, ProofAnalysisResult[]>;
  proofConclusions: Record<string, string>;
}

/** Resultado da coleta de dados de provas */
export interface ProofDecisionDataResult {
  /** XML formatado com dados das provas */
  data: string;
  /** Quantidade de provas vinculadas */
  proofCount: number;
  /** Flag indicando se há dados relevantes */
  hasData: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// SEÇÃO 2: COLETA DE DADOS DE PROVAS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Coleta análises e conclusões de provas vinculadas a um tópico
 * @param proofData - Dados do store de provas
 * @param topicTitle - Título do tópico para filtrar provas vinculadas
 * @param mode - 'all' (análises + conclusões) ou 'conclusions_only'
 * @returns Objeto com XML formatado, contagem e flag de dados
 */
export const collectProofDecisionData = (
  proofData: ProofDataSource | null,
  topicTitle: string,
  mode: 'all' | 'conclusions_only'
): ProofDecisionDataResult => {
  // Sem dados de provas
  if (!proofData || !topicTitle) {
    return { data: '', proofCount: 0, hasData: false };
  }

  const { proofTopicLinks, proofFiles, proofTexts, proofAnalysisResults, proofConclusions } = proofData;

  // Encontrar IDs das provas vinculadas ao tópico
  const linkedProofIds = Object.keys(proofTopicLinks || {}).filter(proofId =>
    proofTopicLinks?.[proofId]?.includes(topicTitle)
  );

  if (linkedProofIds.length === 0) {
    return { data: '', proofCount: 0, hasData: false };
  }

  // Mapear provas por ID para acesso rápido
  const allProofs: Array<ProofFile | ProofText> = [
    ...(proofFiles || []),
    ...(proofTexts || [])
  ];
  const proofMap = new Map<string, ProofFile | ProofText>();
  for (const proof of allProofs) {
    proofMap.set(String(proof.id), proof);
  }

  // Construir XML
  const xmlParts: string[] = [];
  let hasAnyData = false;

  for (const proofId of linkedProofIds) {
    const proof = proofMap.get(proofId);
    if (!proof) continue;

    const analyses = proofAnalysisResults?.[proofId] || [];
    const conclusion = proofConclusions?.[proofId] || '';

    // No modo "conclusions_only", apenas incluir se houver conclusão
    if (mode === 'conclusions_only' && !conclusion.trim()) {
      continue;
    }

    // No modo "all", incluir se houver análises OU conclusão
    if (mode === 'all' && analyses.length === 0 && !conclusion.trim()) {
      continue;
    }

    // Há dados relevantes
    hasAnyData = true;

    const proofXml: string[] = [];
    proofXml.push(`<prova nome="${escapeXml(proof.name)}">`);

    // Incluir análises apenas no modo "all"
    if (mode === 'all' && analyses.length > 0) {
      proofXml.push('  <analises_ia>');
      for (const analysis of analyses) {
        const tipoLabel = getAnalysisTypeLabel(analysis.type);
        proofXml.push(`    <analise tipo="${tipoLabel}">`);
        proofXml.push(`      ${escapeXml(analysis.result)}`);
        proofXml.push('    </analise>');
      }
      proofXml.push('  </analises_ia>');
    }

    // Incluir conclusão se existir
    if (conclusion.trim()) {
      proofXml.push('  <conclusao_juiz>');
      proofXml.push(`    ${escapeXml(conclusion)}`);
      proofXml.push('  </conclusao_juiz>');
    }

    proofXml.push('</prova>');
    xmlParts.push(proofXml.join('\n'));
  }

  if (!hasAnyData) {
    return { data: '', proofCount: linkedProofIds.length, hasData: false };
  }

  const fullXml = [
    `<provas_vinculadas topico="${escapeXml(topicTitle)}">`,
    '',
    xmlParts.join('\n\n'),
    '',
    '</provas_vinculadas>'
  ].join('\n');

  return {
    data: fullXml,
    proofCount: linkedProofIds.length,
    hasData: true
  };
};

// ═══════════════════════════════════════════════════════════════════════════
// SEÇÃO 3: GERAÇÃO DE PROMPT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Constrói prompt para assistência na redação de decisão
 * @param topicTitle - Título do tópico
 * @param proofData - XML com dados das provas
 * @param mode - Modo de dados utilizado
 * @returns Prompt formatado para a IA
 */
export const buildProofDecisionPrompt = (
  topicTitle: string,
  proofData: string,
  mode: 'all' | 'conclusions_only'
): string => {
  const modeDescription = mode === 'all'
    ? 'análises da IA e conclusões do juiz'
    : 'conclusões do juiz';

  return `**INSTRUÇÃO**: Auxilie na redação da fundamentação para o tópico "${topicTitle}" com base nas ${modeDescription} das provas vinculadas.

${proofData}

**TAREFA**:
1. Analise as provas vinculadas acima
2. Identifique os pontos relevantes para a decisão do tópico "${topicTitle}"
3. Sugira uma fundamentação estruturada que:
   - Apresente os fatos relevantes das provas
   - Conecte as provas aos argumentos jurídicos
   - Mantenha coerência com as conclusões já registradas

**FORMATO**: Escreva em linguagem jurídica formal, adequada para uma sentença trabalhista.`;
};

// ═══════════════════════════════════════════════════════════════════════════
// SEÇÃO 4: HELPERS INTERNOS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Escapa caracteres especiais para XML
 */
const escapeXml = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

/**
 * Retorna label legível para tipo de análise
 */
const getAnalysisTypeLabel = (type: ProofAnalysisResult['type']): string => {
  switch (type) {
    case 'contextual': return 'Contextual';
    case 'livre': return 'Livre';
    case 'importada': return 'Importada';
    default: return type;
  }
};
