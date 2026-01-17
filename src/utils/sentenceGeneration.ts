/**
 * Utilitário para geração de sentenças
 * Funções auxiliares para validação e formatação
 * v1.33.38
 *
 * @version 1.35.80 - Migrado para TypeScript
 */

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

/** Tópico para geração */
export interface TopicForGeneration {
  title?: string;
  category?: string;
  miniRelatorio?: string;
  decision?: 'procedente' | 'improcedente' | string;
  fundamentacao?: string;
}

/** Reclamada */
export interface Reclamada {
  nome: string;
  tipo?: string;
}

/** Resultado de validação de tópico */
export interface TopicValidationResult {
  valid: boolean;
  warnings: string[];
}

/** Resultado de verificação de decisões de mérito */
export interface MeritDecisionsResult {
  ready: boolean;
  pending: string[];
}

/** Resultado de consistência do dispositivo */
export interface DispositivoConsistencyResult {
  consistent: boolean;
  inconsistencies: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════

/** Ordinais femininos */
const ORDINAIS_FEM: Record<number, string> = {
  1: 'primeira',
  2: 'segunda',
  3: 'terceira',
  4: 'quarta',
  5: 'quinta',
  6: 'sexta',
  7: 'sétima',
  8: 'oitava',
  9: 'nona',
  10: 'décima'
};

/** Ordinais masculinos */
const ORDINAIS_MASC: Record<number, string> = {
  1: 'primeiro',
  2: 'segundo',
  3: 'terceiro',
  4: 'quarto',
  5: 'quinto',
  6: 'sexto',
  7: 'sétimo',
  8: 'oitavo',
  9: 'nono',
  10: 'décimo'
};

// ═══════════════════════════════════════════════════════════════════════════
// FUNÇÕES AUXILIARES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Retorna o ordinal feminino ou masculino
 */
const getOrdinal = (n: number, masculino: boolean = false): string => {
  const ordinals = masculino ? ORDINAIS_MASC : ORDINAIS_FEM;
  const sufixo = masculino ? 'º' : 'ª';
  return ordinals[n] || `${n}${sufixo}`;
};

// ═══════════════════════════════════════════════════════════════════════════
// FUNÇÕES PÚBLICAS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Valida se um tópico está pronto para geração de fundamentação
 */
export const validateTopicForGeneration = (
  topic: TopicForGeneration | null | undefined
): TopicValidationResult => {
  const warnings: string[] = [];

  if (!topic) {
    return { valid: false, warnings: ['Tópico não fornecido'] };
  }

  if (!topic.title) {
    warnings.push('Tópico sem título');
  }

  if (!topic.category) {
    warnings.push('Tópico sem categoria');
  }

  if (!topic.miniRelatorio || topic.miniRelatorio.length < 50) {
    warnings.push('Mini-relatório ausente ou muito curto (mínimo 50 caracteres)');
  }

  // Tópicos especiais não precisam de decisão
  const specialTopics = ['RELATÓRIO', 'DISPOSITIVO'];
  if (!specialTopics.includes(topic.title?.toUpperCase() || '') && !topic.decision) {
    warnings.push('Decisão (procedente/improcedente) não definida');
  }

  return {
    valid: warnings.length === 0,
    warnings
  };
};

/**
 * Formata a lista de reclamadas com numeração correta
 */
export const formatReclamadas = (
  reclamadas: Reclamada[] | null | undefined,
  inicial: boolean = false
): string => {
  if (!reclamadas || reclamadas.length === 0) return '';

  const termo = inicial ? 'reclamado' : 'ré';
  const useMasculino = inicial; // reclamado é masculino, ré é feminino

  if (reclamadas.length === 1) {
    return reclamadas[0].nome;
  }

  return reclamadas.map((r, i) => {
    const ordinal = getOrdinal(i + 1, useMasculino);
    return `${ordinal} ${termo}: ${r.nome}`;
  }).join('\n');
};

/**
 * Extrai o primeiro parágrafo do relatório (contém partes do processo)
 */
export const extractPartesFromRelatorio = (
  relatorio: string | null | undefined
): string => {
  if (!relatorio) return '';

  // Remove tags HTML
  const text = relatorio.replace(/<[^>]*>/g, '');

  // Primeiro parágrafo (até primeiro ponto final seguido de quebra)
  const match = text.match(/^(.+?\.)\s*(?:\n|<|$)/s);
  if (match) {
    return match[1].trim();
  }

  // Fallback: primeiros 500 caracteres
  return text.substring(0, 500).trim();
};

/**
 * Formata a seção de tópicos para o prompt de dispositivo
 */
export const formatTopicosSection = (
  topicosComDecisao: TopicForGeneration[],
  topicosSemDecisao: TopicForGeneration[]
): string => {
  let section = '';

  if (topicosComDecisao.length > 0) {
    section += '✅ TÓPICOS COM DECISÃO:\n';
    for (const t of topicosComDecisao) {
      const decisao = t.decision === 'procedente' ? '✓ PROCEDENTE' : '✗ IMPROCEDENTE';
      section += `- ${t.title}: ${decisao}\n`;
      if (t.fundamentacao) {
        // v1.37.79: Enviar fundamentação completa (antes: truncava em 200 chars)
        section += `  Fundamentação: ${t.fundamentacao}\n`;
      }
    }
  }

  if (topicosSemDecisao.length > 0) {
    section += '\n⚠️ TÓPICOS SEM DECISÃO (aguardando definição):\n';
    for (const t of topicosSemDecisao) {
      section += `- ${t.title}\n`;
    }
  }

  return section;
};

/**
 * Valida se todos os tópicos de mérito têm decisão definida
 */
export const checkMeritDecisions = (
  topics: TopicForGeneration[] | null | undefined
): MeritDecisionsResult => {
  if (!topics || topics.length === 0) {
    return { ready: false, pending: [] };
  }

  const meritoTopics = topics.filter(t =>
    t.category === 'Mérito' &&
    !['RELATÓRIO', 'DISPOSITIVO'].includes(t.title?.toUpperCase() || '')
  );

  const pending = meritoTopics
    .filter(t => !t.decision)
    .map(t => t.title || 'Sem título');

  return {
    ready: pending.length === 0,
    pending
  };
};

/**
 * Gera HTML estruturado para a fundamentação
 */
export const formatFundamentacaoHTML = (
  content: string | null | undefined,
  title: string
): string => {
  if (!content) return '';

  // Garantir que começa com parágrafo
  let html = content.trim();

  // Adicionar título se não começar com <h ou <p contendo título
  if (!html.startsWith('<h') && !html.match(/^<p[^>]*>\s*<strong>/)) {
    html = `<p><strong>${title}</strong></p>\n${html}`;
  }

  // Garantir parágrafos fechados
  html = html.replace(/(<p[^>]*>)([^<]+)(?!<\/p>)/g, '$1$2</p>');

  return html;
};

/**
 * Verifica consistência entre decisões e dispositivo
 */
export const checkDispositivoConsistency = (
  topics: TopicForGeneration[],
  dispositivo: string | null | undefined
): DispositivoConsistencyResult => {
  const inconsistencies: string[] = [];

  if (!dispositivo) {
    return { consistent: false, inconsistencies: ['Dispositivo vazio'] };
  }

  const dispositivoUpper = dispositivo.toUpperCase();

  for (const topic of topics) {
    if (topic.decision === 'procedente') {
      // Verificar se há menção de procedência ou condenação
      const hasProcedencia = dispositivoUpper.includes('PROCEDENTE') ||
        dispositivoUpper.includes('CONDENO') ||
        dispositivoUpper.includes('DEFIRO');

      if (!hasProcedencia) {
        inconsistencies.push(`${topic.title}: marcado como procedente mas não há condenação no dispositivo`);
      }
    }
  }

  return {
    consistent: inconsistencies.length === 0,
    inconsistencies
  };
};
