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
  AnaliseTemaPedido,
  Qualificacao,
  Depoente
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
  { key: 'analises', label: 'Análises Probatórias' },
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
 * @param avaliacoes - Array de avaliações de credibilidade
 * @param depoentes - Array de depoentes para lookup de nomes
 */
function formatCredibilidade(avaliacoes: AvaliacaoCredibilidade[], depoentes: Depoente[] = []): string {
  if (!avaliacoes.length) return '';

  return avaliacoes.map(a => {
    const parts: string[] = [];

    // Nome do depoente (lookup em depoentes[] ou fallback para deponenteNome/deponenteId)
    const dep = depoentes.find(d => d.id === a.deponenteId);
    const nome = a.deponenteNome || dep?.nome || a.deponenteId;
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

/**
 * Formata status da análise para exibição
 */
function formatStatusAnalise(status: string): string {
  const labels: Record<string, string> = {
    'favoravel-autor': '✅ Favorável ao Autor',
    'favoravel-re': '❌ Favorável à Ré',
    'parcial': '⚖️ Prova Dividida',
    'inconclusivo': '❓ Inconclusivo'
  };
  return labels[status] || status;
}

/**
 * Formata análises probatórias (Fase 3)
 */
function formatAnalises(analises: AnaliseTemaPedido[]): string {
  if (!analises.length) return '';

  return analises.map((a, index) => {
    const parts: string[] = [];

    // Título e status
    const titulo = a.titulo || a.tema || `Tema ${index + 1}`;
    const status = a.status || (a.conclusao as string);
    parts.push(`### ${titulo}`);
    parts.push(`**Status**: ${formatStatusAnalise(status)}`);

    // Alegação do autor
    if (a.alegacaoAutor) {
      parts.push(`\n**Alegação do Autor**\n${a.alegacaoAutor}`);
    }

    // Defesa da ré
    if (a.defesaRe) {
      parts.push(`\n**Defesa da Ré**\n${a.defesaRe}`);
    }

    // Prova oral
    if (a.provaOral && a.provaOral.length > 0) {
      const provas = a.provaOral.map(p => {
        const texto = p.textoCorrente || p.conteudo || '';
        return `- **${p.deponente}**: ${texto}`;
      }).join('\n');
      parts.push(`\n**Prova Oral**\n${provas}`);
    }

    // Fundamentação
    if (a.fundamentacao) {
      parts.push(`\n**Fundamentação**\n${a.fundamentacao}`);
    }

    // Conclusão (se for texto, não apenas o status)
    if (a.conclusao && typeof a.conclusao === 'string' && a.conclusao.length > 20) {
      parts.push(`\n**Conclusão**\n${a.conclusao}`);
    }

    return parts.join('\n');
  }).join('\n\n---\n\n');
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
    const content = formatCredibilidade(resultado.credibilidade, resultado.depoentes || []);
    if (content) {
      parts.push(`## Avaliação de Credibilidade\n\n${content}`);
    }
  }

  if (sections.includes('analises') && resultado.analises?.length) {
    const content = formatAnalises(resultado.analises);
    if (content) {
      parts.push(`## Análises Probatórias\n\n${content}`);
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
  if (resultado.analises?.length) available.push('analises');

  return available;
}
