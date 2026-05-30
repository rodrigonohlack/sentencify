/**
 * @file analysis-helpers.ts
 * @description Funções utilitárias para análise de prova oral
 */

import type {
  SintesePorTema,
  Confissao,
  Contradicao,
  AnaliseTemaPedido,
  DeclaracaoPorTema,
  ProvaOralItem,
  Sintese,
  Depoente,
} from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// ÍNDICE TIMESTAMP → FALA (para tooltip de hover nos pills de timestamp)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Converte um timestamp ("7m 06s", "7m 6s", "1h 02m 03s", "0m 31s") em segundos
 * totais. Robusto a zero-padding. Devolve null se não casar o padrão.
 */
export function parseTimestampToSeconds(ts: string): number | null {
  if (typeof ts !== 'string') return null;
  const m = ts.trim().match(/^(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?\s*(?:(\d+)\s*s)?$/i);
  if (!m || (m[1] === undefined && m[2] === undefined && m[3] === undefined)) return null;
  const h = parseInt(m[1] ?? '0', 10);
  const min = parseInt(m[2] ?? '0', 10);
  const sec = parseInt(m[3] ?? '0', 10);
  return h * 3600 + min * 60 + sec;
}

/**
 * Extrai timestamps individuais de uma string que pode conter vários separados
 * por ";" ou "," (ex.: "2m 44s; 2m 51s; 2m 59s" → ["2m 44s","2m 51s","2m 59s"]).
 * Mantém só os tokens que casam um timestamp válido. Para uma string com um único
 * timestamp, devolve um array de 1 elemento.
 */
export function extractTimestamps(str: string): string[] {
  if (typeof str !== 'string') return [];
  return str
    .split(/[;,]/)
    .map((s) => s.trim())
    .filter((s) => parseTimestampToSeconds(s) !== null);
}

/** Entrada do índice timestamp → fala. */
export interface FalaPorTimestamp {
  deponente: string;
  texto: string;
}

/**
 * Constrói um índice `segundos → { deponente, texto }` a partir das sínteses
 * detalhadas (Fase 1). A chave em segundos torna o casamento robusto a variações
 * de formatação ("7m 6s" vs "7m 06s"). Em colisão (um instante = uma fala), o
 * primeiro item vence. O nome do depoente é resolvido via `depoentes[]` (por
 * deponenteId), com fallback para `deponenteNome`/`deponenteId`.
 */
export function buildTimestampIndex(
  sinteses: Sintese[] | undefined,
  depoentes: Depoente[] | undefined
): Map<number, FalaPorTimestamp> {
  const index = new Map<number, FalaPorTimestamp>();
  if (!Array.isArray(sinteses)) return index;

  const nomePorId = new Map<string, string>();
  for (const d of depoentes ?? []) {
    if (d?.id) nomePorId.set(d.id, d.nome || d.id);
  }

  for (const sintese of sinteses) {
    const deponente =
      nomePorId.get(sintese.deponenteId) || sintese.deponenteNome || sintese.deponenteId || '';
    for (const item of sintese.conteudo ?? []) {
      const secs = parseTimestampToSeconds(item.timestamp);
      if (secs === null) continue;
      if (!index.has(secs)) index.set(secs, { deponente, texto: item.texto });
    }
  }

  return index;
}

// ═══════════════════════════════════════════════════════════════════════════
// VALIDAÇÃO DE COMPLETUDE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Verifica se as análises cobrem todos os temas de sintesesPorTema
 */
export function validateAnalysesCoverage(
  analises: AnaliseTemaPedido[],
  sintesesPorTema: SintesePorTema[]
): { isComplete: boolean; missingTemas: string[] } {
  const analisesTitles = new Set(analises.map(a => normalizeThemeName(a.titulo)));
  const missingTemas: string[] = [];

  for (const sintese of sintesesPorTema) {
    const normalizedTema = normalizeThemeName(sintese.tema);
    if (!analisesTitles.has(normalizedTema)) {
      missingTemas.push(sintese.tema);
    }
  }

  return {
    isComplete: missingTemas.length === 0,
    missingTemas,
  };
}

/**
 * Normaliza nome de tema para comparação
 */
export function normalizeThemeName(tema: string): string {
  return tema
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9\s]/g, '') // Remove caracteres especiais
    .trim();
}

// ═══════════════════════════════════════════════════════════════════════════
// EXTRAÇÃO DE DADOS PARA FUNDAMENTAÇÃO
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Encontra confissões relacionadas a um tema específico
 */
export function findConfissoesForTema(
  confissoes: Confissao[],
  tema: string
): Confissao[] {
  const normalizedTema = normalizeThemeName(tema);

  return confissoes.filter(c => {
    const confissaoTema = normalizeThemeName(c.tema);
    // Verifica se o tema da confissão está contido no tema da análise ou vice-versa
    return confissaoTema.includes(normalizedTema) ||
           normalizedTema.includes(confissaoTema);
  });
}

/**
 * Encontra contradições relacionadas a um tema específico
 */
export function findContradicoesForTema(
  contradicoes: Contradicao[],
  tema: string
): Contradicao[] {
  const normalizedTema = normalizeThemeName(tema);

  return contradicoes.filter(c => {
    // Verifica no campo tema (se existir)
    if (c.tema) {
      const contradicaoTema = normalizeThemeName(c.tema);
      if (contradicaoTema.includes(normalizedTema) ||
          normalizedTema.includes(contradicaoTema)) {
        return true;
      }
    }

    // Verifica na descrição
    const descricaoNorm = normalizeThemeName(c.descricao);
    return descricaoNorm.includes(normalizedTema);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// CONVERSÃO DE FORMATOS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Converte declarações de sintesesPorTema para formato de provaOral
 */
export function convertDeclaracoesToProvaOral(
  declaracoes: DeclaracaoPorTema[]
): ProvaOralItem[] {
  return declaracoes.map(d => ({
    deponente: d.deponente,
    textoCorrente: d.textoCorrente,
  }));
}

/**
 * Extrai temas únicos das análises
 */
export function extractUniqueTemas(analises: AnaliseTemaPedido[]): string[] {
  const temas = new Set<string>();

  for (const analise of analises) {
    const titulo = analise.titulo || analise.tema;
    if (titulo) {
      temas.add(titulo);
    }
  }

  return Array.from(temas);
}

// ═══════════════════════════════════════════════════════════════════════════
// VALIDAÇÃO DE QUALIDADE DA FUNDAMENTAÇÃO
// ═══════════════════════════════════════════════════════════════════════════

export interface FundamentacaoQuality {
  isValid: boolean;
  hasTimestamps: boolean;
  hasLegalBasis: boolean;
  hasConclusion: boolean;
  minLength: boolean;
  issues: string[];
}

/**
 * Valida a qualidade da fundamentação de uma análise
 */
export function validateFundamentacao(
  fundamentacao: string | undefined,
  minLength = 200
): FundamentacaoQuality {
  const issues: string[] = [];

  if (!fundamentacao) {
    return {
      isValid: false,
      hasTimestamps: false,
      hasLegalBasis: false,
      hasConclusion: false,
      minLength: false,
      issues: ['Fundamentação ausente'],
    };
  }

  // Verifica timestamps no formato (Xm Ys) ou (Xh Ym Zs)
  const timestampPattern = /\(\d+[hm]\s*\d*[ms]?\s*\d*s?\)/i;
  const hasTimestamps = timestampPattern.test(fundamentacao);
  if (!hasTimestamps) {
    issues.push('Ausência de timestamps nas citações');
  }

  // Verifica base legal (art., artigo, CPC, CLT, etc.)
  const legalPattern = /\b(art\.?|artigo|CPC|CLT|lei|súmula)\b/i;
  const hasLegalBasis = legalPattern.test(fundamentacao);
  if (!hasLegalBasis) {
    issues.push('Ausência de fundamentação legal');
  }

  // Verifica se tem conclusão
  const conclusionPattern = /\b(conclus[aã]o|portanto|assim|dessa forma|diante|favorável|desfavorável)\b/i;
  const hasConclusion = conclusionPattern.test(fundamentacao);
  if (!hasConclusion) {
    issues.push('Ausência de conclusão clara');
  }

  // Verifica tamanho mínimo
  const minLengthOk = fundamentacao.length >= minLength;
  if (!minLengthOk) {
    issues.push(`Fundamentação muito curta (${fundamentacao.length}/${minLength} caracteres)`);
  }

  return {
    isValid: issues.length === 0,
    hasTimestamps,
    hasLegalBasis,
    hasConclusion,
    minLength: minLengthOk,
    issues,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// MERGE DE RESULTADOS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Faz merge dos resultados das três fases
 * Fase 1: depoentes, sinteses
 * Fase 2: sintesesPorTema, contradicoes, confissoes, credibilidade
 * Fase 3: analises
 */
export function mergePhaseResults<T extends Record<string, unknown>>(
  phase1: T,
  phase2: T,
  phase3: T
): T {
  return {
    ...phase1,
    ...phase2,
    ...phase3,
  };
}

/**
 * Verifica consistência entre sintesesPorTema e analises
 */
export function checkConsistency(
  sintesesPorTema: SintesePorTema[],
  analises: AnaliseTemaPedido[]
): { isConsistent: boolean; warnings: string[] } {
  const warnings: string[] = [];

  // Verifica se todos os temas têm análise
  const { isComplete, missingTemas } = validateAnalysesCoverage(analises, sintesesPorTema);
  if (!isComplete) {
    warnings.push(`Temas sem análise: ${missingTemas.join(', ')}`);
  }

  // Verifica se análises têm fundamentação válida
  for (const analise of analises) {
    const quality = validateFundamentacao(analise.fundamentacao);
    if (!quality.isValid) {
      warnings.push(`Análise "${analise.titulo}": ${quality.issues.join('; ')}`);
    }
  }

  return {
    isConsistent: warnings.length === 0,
    warnings,
  };
}
