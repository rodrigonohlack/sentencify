/**
 * @file sourceTracing.ts
 * @description Helpers puros do segundo passe de rastreabilidade: montagem das
 * fontes rotuladas, construção do prompt e mapeamento da resposta da IA com
 * verificação local. Sem dependências de React/API.
 */

import { normalizeForMatch, verifyTrechoInSources, type NormalizedSource } from './sourceMatching';
import type { ReportParagraph } from './reportParagraphs';
import type { RelatorioBlocoFonte } from '../types';

/** Tamanho máximo do resumo do parágrafo exibido na UI de rastreabilidade. */
const BLOCO_RESUMO_MAX_LEN = 120;

/**
 * Subconjunto estrutural de AnalyzedDocuments usado aqui. Propositalmente mais
 * frouxo (campos opcionais) para facilitar testes; compatível estruturalmente
 * com o `docs` real do hook de geração.
 */
export interface TracingDocs {
  peticoesText?: { name?: string; text: string }[];
  contestacoesText?: { text: string }[];
  complementaresText?: { text: string }[];
}

export interface TracingSource {
  peca: string;
  text: string;
}

/** Bloco da resposta da IA já parseado/validado pelo schema Zod. */
export interface ParsedTracingBloco {
  blocoIndex: number;
  trechos: { peca: string; trecho: string }[];
}

/**
 * Monta as fontes de TEXTO rotuladas (PDFs sem texto extraído não entram —
 * não há como verificá-los localmente).
 */
export function buildTracingSources(
  docs: TracingDocs,
  partes: { reclamadas?: string[] } | null
): TracingSource[] {
  const out: TracingSource[] = [];

  (docs.peticoesText || []).forEach((d, i) => {
    out.push({ peca: d.name || (i === 0 ? 'Petição inicial' : `Petição ${i + 1}`), text: d.text || '' });
  });

  // Contestações e complementares são rotuladas por índice (+ reclamada quando houver),
  // não por d.name — diferente das petições, onde o nome do arquivo é um rótulo útil.
  (docs.contestacoesText || []).forEach((d, i) => {
    const reclamada = partes?.reclamadas?.[i];
    out.push({ peca: `Contestação ${i + 1}${reclamada ? ` — ${reclamada}` : ''}`, text: d.text || '' });
  });

  (docs.complementaresText || []).forEach((d, i) => {
    out.push({ peca: `Documento complementar ${i + 1}`, text: d.text || '' });
  });

  return out.filter(s => s.text.trim().length > 0);
}

/** Constrói o prompt do segundo passe (instruções positivas, exige JSON). */
export function buildSourceTracingPrompt(paragraphs: ReportParagraph[]): string {
  const numbered = paragraphs.map(p => `[${p.index}] ${p.text}`).join('\n\n');
  return `Sua tarefa é RASTREAR FONTES. Os documentos processuais (petição inicial e contestações) estão acima.

Abaixo estão os parágrafos de um mini-relatório, cada um com seu índice entre colchetes.
Para CADA parágrafo, identifique os trechos das peças acima que embasam o que ele afirma.

REGRAS:
- Copie cada trecho de forma LITERAL e exata, como aparece na peça (mesmas palavras, sem reescrever, resumir ou parafrasear).
- Cada trecho deve ser curto (uma a três frases) e suficiente para comprovar a afirmação.
- Indique em "peca" de qual peça o trecho veio (ex.: "Petição inicial", "Contestação 1").
- Se um parágrafo não tiver respaldo em nenhuma peça, devolva "trechos": [] para ele.

PARÁGRAFOS DO MINI-RELATÓRIO:
${numbered}

Responda APENAS com JSON válido neste formato, sem markdown e sem texto antes ou depois:
{"blocos":[{"blocoIndex":0,"trechos":[{"peca":"Petição inicial","trecho":"..."}]}]}`;
}

/**
 * Mapeia a resposta da IA para blocos por parágrafo, com verificação local de
 * cada trecho. O parágrafo é a fonte da verdade da ordem; blocos órfãos (índice
 * inexistente) são descartados.
 */
export function mapTracingResponse(
  parsedBlocos: ParsedTracingBloco[],
  paragraphs: ReportParagraph[],
  sources: TracingSource[]
): RelatorioBlocoFonte[] {
  const normSources: NormalizedSource[] = sources.map(s => ({ peca: s.peca, normalized: normalizeForMatch(s.text) }));
  return paragraphs.map(p => {
    const aiBloco = parsedBlocos.find(b => Number(b.blocoIndex) === p.index);
    const trechos = (aiBloco?.trechos || []).map(t => {
      const res = verifyTrechoInSources(t.trecho, normSources, t.peca || '');
      return { trecho: t.trecho, peca: res.peca, status: res.status, matchScore: res.matchScore };
    });
    return { blocoIndex: p.index, blocoResumo: p.text.slice(0, BLOCO_RESUMO_MAX_LEN), trechos };
  });
}
