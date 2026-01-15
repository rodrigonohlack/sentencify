/**
 * @file double-check-utils.ts
 * @description Utilitários para o modal de revisão do Double Check
 * @version 1.37.59
 *
 * Funções para formatar, exibir e aplicar correções do Double Check.
 */

import type {
  DoubleCheckCorrection,
  DoubleCheckCorrectionWithSelection,
  DoubleCheckOperation
} from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════════

/** Ícones por tipo de correção - Extração de Tópicos */
export const TOPIC_CORRECTION_ICONS: Record<string, string> = {
  remove: '❌',
  add: '➕',
  merge: '🔗',
  reclassify: '🏷️'
};

/** Ícones por tipo de correção - Dispositivo */
export const DISPOSITIVO_CORRECTION_ICONS: Record<string, string> = {
  add: '➕',
  modify: '✏️',
  remove: '❌'
};

/** Ícones por tipo de correção - Revisão de Sentença */
export const REVIEW_CORRECTION_ICONS: Record<string, string> = {
  false_positive: '⚠️',
  missed: '🔍',
  improve: '💡'
};

/** Ícones por tipo de correção - Confronto de Fatos */
export const FACTS_CORRECTION_ICONS: Record<string, string> = {
  add_row: '➕',
  fix_row: '✏️',
  remove_row: '❌',
  add_fato: '📝'
};

/** Nomes legíveis das operações */
export const OPERATION_LABELS: Record<DoubleCheckOperation, string> = {
  topicExtraction: 'Extração de Tópicos',
  dispositivo: 'Dispositivo',
  sentenceReview: 'Revisão de Sentença',
  factsComparison: 'Confronto de Fatos'
};

// ═══════════════════════════════════════════════════════════════════════════════
// FUNÇÕES DE FORMATAÇÃO
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Retorna o ícone apropriado para uma correção
 * @param operation - Tipo de operação
 * @param correctionType - Tipo da correção
 * @returns Emoji do ícone
 */
export function getCorrectionIcon(operation: DoubleCheckOperation, correctionType: string): string {
  switch (operation) {
    case 'topicExtraction':
      return TOPIC_CORRECTION_ICONS[correctionType] || '📋';
    case 'dispositivo':
      return DISPOSITIVO_CORRECTION_ICONS[correctionType] || '📋';
    case 'sentenceReview':
      return REVIEW_CORRECTION_ICONS[correctionType] || '📋';
    case 'factsComparison':
      return FACTS_CORRECTION_ICONS[correctionType] || '📋';
    default:
      return '📋';
  }
}

/**
 * Gera descrição legível para uma correção de Extração de Tópicos
 * @param correction - Correção a descrever
 * @returns Descrição legível
 */
function describeTopicCorrection(correction: DoubleCheckCorrection): string {
  switch (correction.type) {
    case 'remove':
      const topicName = typeof correction.topic === 'string'
        ? correction.topic
        : correction.topic?.title || 'tópico';
      return `Remover tópico "${topicName}"`;
    case 'add':
      if (typeof correction.topic === 'object' && correction.topic?.title) {
        return `Adicionar tópico "${correction.topic.title}" em ${correction.topic.category || 'MÉRITO'}`;
      }
      return `Adicionar novo tópico`;
    case 'merge':
      return `Mesclar "${correction.topics?.join('" + "')}" → "${correction.into}"`;
    case 'reclassify':
      const reclassifyTopic = typeof correction.topic === 'string'
        ? correction.topic
        : correction.topic?.title || 'tópico';
      return `Reclassificar "${reclassifyTopic}" de ${correction.from} para ${correction.to}`;
    default:
      return `Correção: ${correction.type}`;
  }
}

/**
 * Gera descrição legível para uma correção de Dispositivo
 * @param correction - Correção a descrever
 * @returns Descrição legível
 */
function describeDispositivoCorrection(correction: DoubleCheckCorrection): string {
  const item = correction.item || '';
  const suggestion = correction.suggestion || '';

  switch (correction.type) {
    case 'add':
      return `Adicionar: "${item}"`;
    case 'modify':
      return `Modificar: "${item}" → "${suggestion}"`;
    case 'remove':
      return `Remover: "${item}"`;
    default:
      return `Correção: ${correction.type}`;
  }
}

/**
 * Gera descrição legível para uma correção de Revisão de Sentença
 * @param correction - Correção a descrever
 * @returns Descrição legível
 */
function describeReviewCorrection(correction: DoubleCheckCorrection): string {
  const item = correction.item || '';
  const suggestion = correction.suggestion || '';

  switch (correction.type) {
    case 'false_positive':
      return `Falso positivo: "${item}" não é problema real`;
    case 'missed':
      return `Omissão detectada: "${item}"`;
    case 'improve':
      return `Melhorar: "${item}" → "${suggestion}"`;
    default:
      return `Correção: ${correction.type}`;
  }
}

/**
 * Gera descrição legível para uma correção de Confronto de Fatos
 * @param correction - Correção a descrever
 * @returns Descrição legível
 */
function describeFactsCorrection(correction: DoubleCheckCorrection): string {
  switch (correction.type) {
    case 'add_row': {
      const rowTema = (correction.row as { tema?: string })?.tema || 'Nova linha';
      return `Adicionar linha: "${rowTema}"`;
    }
    case 'fix_row': {
      const tema = correction.tema || '(tema não especificado)';
      const field = correction.field || 'campo';
      const newValue = correction.newValue;

      // Se field é genérico ("tabela") ou newValue está vazio, usar descrição simplificada
      if (field === 'tabela' || !newValue) {
        return `Corrigir "${tema}" - ver detalhes no motivo`;
      }

      // Traduzir nomes de campos para português
      const fieldLabels: Record<string, string> = {
        alegacaoReclamante: 'alegação do reclamante',
        alegacaoReclamada: 'alegação da reclamada',
        status: 'status',
        relevancia: 'relevância',
        observacoes: 'observações'
      };
      const fieldLabel = fieldLabels[field] || field;

      return `Alterar ${fieldLabel} em "${tema}": "${newValue}"`;
    }
    case 'remove_row':
      return `Remover linha: "${correction.tema}"`;
    case 'add_fato': {
      const listLabel = correction.list === 'fatosIncontroversos' ? 'incontroverso' : 'controverso';
      return `Adicionar fato ${listLabel}: "${correction.fato}"`;
    }
    default:
      return `Correção: ${correction.type}`;
  }
}

/**
 * Gera descrição legível para uma correção
 * @param operation - Tipo de operação
 * @param correction - Correção a descrever
 * @returns Descrição legível
 */
export function getCorrectionDescription(
  operation: DoubleCheckOperation,
  correction: DoubleCheckCorrection
): string {
  switch (operation) {
    case 'topicExtraction':
      return describeTopicCorrection(correction);
    case 'dispositivo':
      return describeDispositivoCorrection(correction);
    case 'sentenceReview':
      return describeReviewCorrection(correction);
    case 'factsComparison':
      return describeFactsCorrection(correction);
    default:
      return `Correção: ${correction.type}`;
  }
}

/**
 * Converte array de correções para formato com seleção
 * @param operation - Tipo de operação
 * @param corrections - Array de correções
 * @param initialSelected - Estado inicial de seleção (default: true)
 * @returns Array de correções com seleção
 */
export function correctionsToSelectable(
  operation: DoubleCheckOperation,
  corrections: DoubleCheckCorrection[],
  initialSelected = true
): DoubleCheckCorrectionWithSelection[] {
  return corrections.map((correction, index) => ({
    ...correction,
    id: `${operation}-${index}-${correction.type}`,
    selected: initialSelected,
    description: getCorrectionDescription(operation, correction)
  }));
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNÇÕES DE APLICAÇÃO DE CORREÇÕES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Aplica correções selecionadas ao resultado original
 *
 * NOTA: Esta é uma implementação simplificada. Para aplicação parcial de correções,
 * seria necessário implementar lógica específica para cada tipo de operação.
 * Por ora, se todas as correções estão selecionadas, usa o resultado verificado.
 * Se nenhuma está selecionada, usa o resultado original.
 * Para seleção parcial, usa o resultado verificado (comportamento conservador).
 *
 * @param operation - Tipo de operação
 * @param originalResult - Resultado original (JSON string)
 * @param verifiedResult - Resultado verificado (JSON string)
 * @param selectedCorrections - Correções selecionadas pelo usuário
 * @param allCorrections - Todas as correções disponíveis
 * @returns Resultado final (JSON string)
 */
export function applySelectedCorrections(
  operation: DoubleCheckOperation,
  originalResult: string,
  verifiedResult: string,
  selectedCorrections: DoubleCheckCorrection[],
  allCorrections: DoubleCheckCorrection[]
): string {
  // Se nenhuma correção selecionada, retorna original
  if (selectedCorrections.length === 0) {
    return originalResult;
  }

  // Se todas as correções selecionadas, retorna verificado
  if (selectedCorrections.length === allCorrections.length) {
    return verifiedResult;
  }

  // Para seleção parcial, implementar lógica específica por operação
  // Por ora, usa o resultado verificado como fallback conservador
  // TODO: Implementar aplicação parcial de correções

  // Comportamento atual: usa verificado se há qualquer correção selecionada
  // Isso é conservador mas garante consistência
  console.log(
    `[DoubleCheck] Aplicação parcial (${selectedCorrections.length}/${allCorrections.length}) - usando resultado verificado`
  );

  return verifiedResult;
}

/**
 * Filtra correções selecionadas de um array com seleção
 * @param corrections - Array de correções com seleção
 * @returns Array de correções selecionadas (sem flag de seleção)
 */
export function getSelectedCorrections(
  corrections: DoubleCheckCorrectionWithSelection[]
): DoubleCheckCorrection[] {
  return corrections
    .filter(c => c.selected)
    .map(({ id, selected, description, ...rest }) => rest as DoubleCheckCorrection);
}
