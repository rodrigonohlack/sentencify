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
  Depoente,
  TextHighlight
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

/**
 * Extrai apenas os trechos marcados de um texto
 * @param text - Texto completo
 * @param highlights - Marcações que se aplicam a este texto
 * @returns Trechos marcados concatenados ou string vazia se não houver
 */
function extractHighlightedParts(text: string, highlights: TextHighlight[]): string {
  if (!highlights.length) return '';

  // Ordena por posição e extrai os trechos
  const sortedHighlights = [...highlights].sort((a, b) => a.startOffset - b.startOffset);

  const parts = sortedHighlights.map(h => {
    const start = Math.max(0, Math.min(h.startOffset, text.length));
    const end = Math.max(start, Math.min(h.endOffset, text.length));
    const excerpt = text.slice(start, end);
    // Adiciona comentário se houver
    if (h.comment) {
      return `${excerpt} [💬 ${h.comment}]`;
    }
    return excerpt;
  });

  return parts.join(' [...] ');
}

/**
 * Filtra highlights relevantes para síntese condensada
 */
function getCondensadaHighlights(
  highlights: TextHighlight[],
  deponenteId: string,
  itemIndex: number
): TextHighlight[] {
  return highlights.filter(h =>
    h.viewMode === 'condensada' &&
    h.deponenteId === deponenteId &&
    h.itemIndex === itemIndex
  );
}

/**
 * Filtra highlights relevantes para síntese por tema
 */
function getTemaHighlights(
  highlights: TextHighlight[],
  deponenteId: string,
  itemIndex: number,
  temaIndex: number
): TextHighlight[] {
  return highlights.filter(h =>
    h.viewMode === 'tema' &&
    h.deponenteId === deponenteId &&
    h.itemIndex === itemIndex &&
    h.temaIndex === temaIndex
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// FORMATADORES DE SEÇÃO
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Formata sínteses condensadas
 * @param sinteses - Array de sínteses condensadas
 * @param highlights - Marcações (opcional)
 * @param onlyHighlighted - Se true, inclui apenas texto com marcações
 */
function formatSintesesCondensadas(
  sinteses: SinteseCondensada[],
  highlights: TextHighlight[] = [],
  onlyHighlighted: boolean = false
): string {
  if (!sinteses.length) return '';

  const formatted = sinteses.map((s, index) => {
    const deponenteId = `condensada-${s.deponente.replace(/\s+/g, '-').toLowerCase()}`;
    const relevantHighlights = getCondensadaHighlights(highlights, deponenteId, index);

    let texto: string;
    if (onlyHighlighted) {
      texto = extractHighlightedParts(s.textoCorrente, relevantHighlights);
      if (!texto) return null; // Pula se não houver marcações
    } else {
      texto = s.textoCorrente;
    }

    return `**${s.deponente} (${formatQualificacao(s.qualificacao)})**\n${texto}`;
  }).filter(Boolean);

  return formatted.join('\n\n');
}

/**
 * Formata sínteses por tema
 * @param sinteses - Array de sínteses por tema
 * @param highlights - Marcações (opcional)
 * @param onlyHighlighted - Se true, inclui apenas texto com marcações
 */
function formatSintesesPorTema(
  sinteses: SintesePorTema[],
  highlights: TextHighlight[] = [],
  onlyHighlighted: boolean = false
): string {
  if (!sinteses.length) return '';

  const formatted = sinteses.map((tema, temaIndex) => {
    const declaracoes = tema.declaracoes.map((d, declIndex) => {
      const deponenteId = `tema-${d.deponente.replace(/\s+/g, '-').toLowerCase()}`;
      const relevantHighlights = getTemaHighlights(highlights, deponenteId, declIndex, temaIndex);

      let texto: string;
      if (onlyHighlighted) {
        texto = extractHighlightedParts(d.textoCorrente, relevantHighlights);
        if (!texto) return null; // Pula se não houver marcações
      } else {
        texto = d.textoCorrente;
      }

      return `- **${d.deponente} (${formatQualificacao(d.qualificacao)})**: ${texto}`;
    }).filter(Boolean);

    if (declaracoes.length === 0) return null; // Pula tema se não houver declarações

    return `### ${tema.tema}\n\n${declaracoes.join('\n')}`;
  }).filter(Boolean);

  return formatted.join('\n\n');
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

/** Opções para formatação de seções */
export interface FormatProvaOralOptions {
  /** Se true, inclui apenas texto com marcações nas sínteses */
  onlyHighlighted?: boolean;
}

/**
 * Formata seções selecionadas do ProvaOralResult para texto legível
 * @param resultado - Resultado completo da análise de prova oral
 * @param sections - Array de chaves de seções a incluir
 * @param options - Opções de formatação
 * @returns Texto formatado em Markdown
 */
export function formatProvaOralSections(
  resultado: ProvaOralResult,
  sections: ProvaOralSectionKey[],
  options: FormatProvaOralOptions = {}
): string {
  const { onlyHighlighted = false } = options;
  const highlights = resultado.highlights || [];
  const parts: string[] = [];

  if (sections.includes('sintesesCondensadas') && resultado.sintesesCondensadas?.length) {
    const content = formatSintesesCondensadas(
      resultado.sintesesCondensadas,
      highlights,
      onlyHighlighted
    );
    if (content) {
      parts.push(`## Sínteses Condensadas\n\n${content}`);
    }
  }

  if (sections.includes('sintesesPorTema') && resultado.sintesesPorTema?.length) {
    const content = formatSintesesPorTema(
      resultado.sintesesPorTema,
      highlights,
      onlyHighlighted
    );
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

/**
 * Verifica se a análise possui marcações (highlights)
 * @param resultado - Resultado da análise de prova oral
 * @returns true se há marcações
 */
export function hasHighlights(resultado: ProvaOralResult): boolean {
  return (resultado.highlights?.length || 0) > 0;
}

/**
 * Conta quantas marcações existem para sínteses (condensadas + por tema)
 * @param resultado - Resultado da análise de prova oral
 * @returns Número de marcações em sínteses
 */
export function countSinteseHighlights(resultado: ProvaOralResult): number {
  if (!resultado.highlights?.length) return 0;

  return resultado.highlights.filter(h =>
    h.viewMode === 'condensada' || h.viewMode === 'tema'
  ).length;
}
