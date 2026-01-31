/**
 * @file formatProvaOralImport.ts
 * @description Formata seções do ProvaOralResult para texto legível
 * @version 1.39.08
 */

import type {
  ProvaOralResult,
  SinteseCondensada,
  SintesePorTema,
  Contradicao,
  Confissao,
  AvaliacaoCredibilidade,
  Qualificacao
} from '../apps/prova-oral/types';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════

/** Seções disponíveis para importação */
export const PROVA_ORAL_SECTIONS = [
  { key: 'sintesesCondensadas', label: 'Sínteses Condensadas' },
  { key: 'sintesesPorTema', label: 'Sínteses por Tema' },
  { key: 'contradicoes', label: 'Contradições' },
  { key: 'confissoes', label: 'Confissões' },
  { key: 'credibilidade', label: 'Credibilidade' },
] as const;

export type ProvaOralSectionKey = typeof PROVA_ORAL_SECTIONS[number]['key'];

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Formata qualificação do depoente para exibição
 */
function formatQualificacao(qualificacao: Qualificacao): string {
  const labels: Record<Qualificacao, string> = {
    'autor': 'Autor',
    'preposto': 'Preposto',
    'testemunha-autor': 'Testemunha do Autor',
    'testemunha-re': 'Testemunha da Ré'
  };
  return labels[qualificacao] || qualificacao;
}

/**
 * Formata relevância para exibição
 */
function formatRelevancia(relevancia: 'alta' | 'media' | 'baixa'): string {
  const labels = {
    'alta': 'Alta',
    'media': 'Média',
    'baixa': 'Baixa'
  };
  return labels[relevancia] || relevancia;
}

// ═══════════════════════════════════════════════════════════════════════════
// FORMATADORES DE SEÇÃO
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Formata sínteses condensadas
 */
function formatSintesesCondensadas(sinteses: SinteseCondensada[]): string {
  if (!sinteses.length) return '';

  return sinteses.map(s =>
    `**${s.deponente} (${formatQualificacao(s.qualificacao)})**\n${s.textoCorrente}`
  ).join('\n\n');
}

/**
 * Formata sínteses por tema
 */
function formatSintesesPorTema(sinteses: SintesePorTema[]): string {
  if (!sinteses.length) return '';

  return sinteses.map(tema => {
    const declaracoes = tema.declaracoes.map(d =>
      `- **${d.deponente} (${formatQualificacao(d.qualificacao)})**: ${d.textoCorrente}`
    ).join('\n');
    return `### ${tema.tema}\n\n${declaracoes}`;
  }).join('\n\n');
}

/**
 * Formata contradições
 */
function formatContradicoes(contradicoes: Contradicao[]): string {
  if (!contradicoes.length) return '';

  return contradicoes.map(c => {
    const tipoLabel = c.tipo === 'interna' ? 'Interna' : 'Externa';
    const relevancia = formatRelevancia(c.relevancia);
    let text = `**${c.depoente}** (${tipoLabel} - Relevância: ${relevancia})\n${c.descricao}`;
    if (c.analise) {
      text += `\n_Análise: ${c.analise}_`;
    }
    return text;
  }).join('\n\n');
}

/**
 * Formata confissões
 */
function formatConfissoes(confissoes: Confissao[]): string {
  if (!confissoes.length) return '';

  return confissoes.map(c => {
    const tipoLabel = c.tipo === 'autor' ? 'Autor' : 'Preposto';
    let text = `**${tipoLabel}** - Tema: ${c.tema}\n> "${c.trecho}"`;
    if (c.implicacao) {
      text += `\n_Implicação: ${c.implicacao}_`;
    }
    return text;
  }).join('\n\n');
}

/**
 * Formata avaliações de credibilidade
 */
function formatCredibilidade(avaliacoes: AvaliacaoCredibilidade[]): string {
  if (!avaliacoes.length) return '';

  return avaliacoes.map(a => {
    const parts: string[] = [];

    // Nome do depoente (pode vir de deponenteNome retrocompat ou depoentes[deponenteId])
    const nome = a.deponenteNome || a.deponenteId;
    parts.push(`**${nome}**`);

    if (a.pontuacao) {
      parts.push(`Pontuação: ${a.pontuacao}/5`);
    }

    if (a.avaliacaoGeral) {
      parts.push(a.avaliacaoGeral);
    }

    if (a.criterios) {
      const criteriosText = [
        `- Conhecimento direto: ${a.criterios.conhecimentoDireto ? 'Sim' : 'Não'}`,
        `- Contemporaneidade: ${formatRelevancia(a.criterios.contemporaneidade)}`,
        `- Coerência interna: ${a.criterios.coerenciaInterna}`,
        `- Interesse no litígio: ${a.criterios.interesseLitigio}`
      ].join('\n');
      parts.push(`\n${criteriosText}`);
    }

    return parts.join('\n');
  }).join('\n\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNÇÃO PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Formata seções selecionadas do ProvaOralResult para texto legível
 * @param resultado - Resultado completo da análise de prova oral
 * @param sections - Array de chaves de seções a incluir
 * @returns Texto formatado em Markdown
 */
export function formatProvaOralSections(
  resultado: ProvaOralResult,
  sections: ProvaOralSectionKey[]
): string {
  const parts: string[] = [];

  if (sections.includes('sintesesCondensadas') && resultado.sintesesCondensadas?.length) {
    const content = formatSintesesCondensadas(resultado.sintesesCondensadas);
    if (content) {
      parts.push(`## Sínteses Condensadas\n\n${content}`);
    }
  }

  if (sections.includes('sintesesPorTema') && resultado.sintesesPorTema?.length) {
    const content = formatSintesesPorTema(resultado.sintesesPorTema);
    if (content) {
      parts.push(`## Sínteses por Tema\n\n${content}`);
    }
  }

  if (sections.includes('contradicoes') && resultado.contradicoes?.length) {
    const content = formatContradicoes(resultado.contradicoes);
    if (content) {
      parts.push(`## Contradições\n\n${content}`);
    }
  }

  if (sections.includes('confissoes') && resultado.confissoes?.length) {
    const content = formatConfissoes(resultado.confissoes);
    if (content) {
      parts.push(`## Confissões\n\n${content}`);
    }
  }

  if (sections.includes('credibilidade') && resultado.credibilidade?.length) {
    const content = formatCredibilidade(resultado.credibilidade);
    if (content) {
      parts.push(`## Avaliação de Credibilidade\n\n${content}`);
    }
  }

  return parts.join('\n\n---\n\n');
}

/**
 * Verifica quais seções da análise têm conteúdo
 * @param resultado - Resultado da análise de prova oral
 * @returns Array de chaves de seções que têm conteúdo
 */
export function getAvailableSections(resultado: ProvaOralResult): ProvaOralSectionKey[] {
  const available: ProvaOralSectionKey[] = [];

  if (resultado.sintesesCondensadas?.length) available.push('sintesesCondensadas');
  if (resultado.sintesesPorTema?.length) available.push('sintesesPorTema');
  if (resultado.contradicoes?.length) available.push('contradicoes');
  if (resultado.confissoes?.length) available.push('confissoes');
  if (resultado.credibilidade?.length) available.push('credibilidade');

  return available;
}
