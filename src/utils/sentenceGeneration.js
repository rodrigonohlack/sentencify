/**
 * Utilitário para geração de sentenças
 * Funções auxiliares para validação e formatação
 * v1.33.38
 */

/**
 * Valida se um tópico está pronto para geração de fundamentação
 * @param {object} topic - Tópico com {title, category, miniRelatorio, decision}
 * @returns {{valid: boolean, warnings: string[]}}
 */
export const validateTopicForGeneration = (topic) => {
  const warnings = [];

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
  if (!specialTopics.includes(topic.title?.toUpperCase()) && !topic.decision) {
    warnings.push('Decisão (procedente/improcedente) não definida');
  }

  return {
    valid: warnings.length === 0,
    warnings
  };
};

/**
 * Formata a lista de reclamadas com numeração correta
 * @param {Array} reclamadas - Lista de reclamadas [{nome, tipo}]
 * @param {boolean} inicial - Se é para petição inicial (reclamados) ou sentença (rés)
 * @returns {string} - Lista formatada
 */
export const formatReclamadas = (reclamadas, inicial = false) => {
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
 * Retorna o ordinal feminino ou masculino
 * @param {number} n - Número
 * @param {boolean} masculino - Se true, retorna masculino (primeiro), senão feminino (primeira)
 */
const getOrdinal = (n, masculino = false) => {
  const ordinaisFem = {
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

  const ordinaisMasc = {
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

  const ordinals = masculino ? ordinaisMasc : ordinaisFem;
  const sufixo = masculino ? 'º' : 'ª';
  return ordinals[n] || `${n}${sufixo}`;
};

/**
 * Extrai o primeiro parágrafo do relatório (contém partes do processo)
 * @param {string} relatorio - Texto do relatório
 * @returns {string} - Primeiro parágrafo
 */
export const extractPartesFromRelatorio = (relatorio) => {
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
 * @param {Array} topicosComDecisao - Tópicos com decisão definida
 * @param {Array} topicosSemDecisao - Tópicos sem decisão
 * @returns {string} - Seção formatada
 */
export const formatTopicosSection = (topicosComDecisao, topicosSemDecisao) => {
  let section = '';

  if (topicosComDecisao.length > 0) {
    section += '✅ TÓPICOS COM DECISÃO:\n';
    for (const t of topicosComDecisao) {
      const decisao = t.decision === 'procedente' ? '✓ PROCEDENTE' : '✗ IMPROCEDENTE';
      section += `- ${t.title}: ${decisao}\n`;
      if (t.fundamentacao) {
        section += `  Fundamentação: ${t.fundamentacao.substring(0, 200)}...\n`;
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
 * @param {Array} topics - Lista de tópicos
 * @returns {{ready: boolean, pending: string[]}}
 */
export const checkMeritDecisions = (topics) => {
  if (!topics || topics.length === 0) {
    return { ready: false, pending: [] };
  }

  const meritoTopics = topics.filter(t =>
    t.category === 'Mérito' &&
    !['RELATÓRIO', 'DISPOSITIVO'].includes(t.title?.toUpperCase())
  );

  const pending = meritoTopics
    .filter(t => !t.decision)
    .map(t => t.title);

  return {
    ready: pending.length === 0,
    pending
  };
};

/**
 * Gera HTML estruturado para a fundamentação
 * @param {string} content - Conteúdo da fundamentação
 * @param {string} title - Título do tópico
 * @returns {string} - HTML formatado
 */
export const formatFundamentacaoHTML = (content, title) => {
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
 * @param {Array} topics - Tópicos com decisões
 * @param {string} dispositivo - Texto do dispositivo
 * @returns {{consistent: boolean, inconsistencies: string[]}}
 */
export const checkDispositivoConsistency = (topics, dispositivo) => {
  const inconsistencies = [];

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
