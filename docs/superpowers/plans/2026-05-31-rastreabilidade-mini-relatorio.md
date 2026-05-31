# Rastreabilidade de fontes do mini-relatório — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar um recurso sob demanda que mostra, por parágrafo do mini-relatório, os trechos literais das peças que o embasaram, verificando cada trecho localmente contra o texto já disponível no cliente.

**Architecture:** Segundo passe sob demanda (botão "Rastrear fontes") que reusa o contexto de documentos da geração, pede à IA um JSON `bloco→trechos` (multi-provedor, prompt-based), e verifica cada trecho com match determinístico local (exato normalizado + fuzzy). Lógica pesada em funções puras testáveis (`src/utils/sourceMatching.ts`, `reportParagraphs.ts`, `sourceTracing.ts`); o hook `useReportGeneration` orquestra; o resultado persiste em `Topic.relatorioFontes`; a UI é um painel lateral + modal (`BaseModal`).

**Tech Stack:** React + TypeScript, Vitest (jsdom), Zustand, Zod, Tailwind (temas claro/escuro).

**Spec:** `docs/superpowers/specs/2026-05-31-rastreabilidade-mini-relatorio-design.md`

**Comandos:**
- Teste único: `npx vitest run <arquivo>`
- Todos os testes: `npm run test:run`
- Type-check: `npx tsc --noEmit`

---

## File Structure

| Arquivo | Responsabilidade | Ação |
|---|---|---|
| `src/types/index.ts` | Tipos de domínio | Modificar (+3 interfaces, +campo em `Topic`) |
| `src/utils/sourceMatching.ts` | Normalização + verificação local (exato/fuzzy) — puro | Criar |
| `src/utils/reportParagraphs.ts` | Split de HTML do relatório em parágrafos — puro | Criar |
| `src/utils/sourceTracing.ts` | Montagem de fontes rotuladas, prompt e mapeamento da resposta — puro | Criar |
| `src/schemas/ai-responses.ts` | Schema Zod da resposta de rastreabilidade | Modificar (+schema) |
| `src/hooks/useReportGeneration.ts` | Orquestração `traceReportSources` | Modificar |
| `src/components/modals/RastreabilidadeModal.tsx` | Modal de exibição (BaseModal) | Criar |
| `src/components/index.ts` | Barrel de componentes | Modificar (+export) |
| `src/components/tabs/EditorTabContent.tsx` | Botão no painel lateral + render do modal | Modificar |
| `src/App.tsx` | Handler `handleTraceReportSources` + estado + fiação de props | Modificar |
| `src/constants/app-version.ts`, `package.json`, `CLAUDE.md`, `src/constants/changelog.js` | Versão | Modificar (bump → 1.50.34) |

**Princípio de design:** o hook fica fino (orquestra I/O); toda a lógica determinística vive em funções puras exportadas → fácil de testar sem mockar API.

---

## Task 1: Tipos de domínio

**Files:**
- Modify: `src/types/index.ts` (após a interface `Topic`, ~linha 60)

- [ ] **Step 1: Adicionar os 3 tipos novos após o bloco `Topic` (logo antes do comentário `KNOWLEDGE PACKAGE TYPES`, linha 62)**

```ts
// ═══════════════════════════════════════════════════════════════════════════
// RASTREABILIDADE DE FONTES DO MINI-RELATÓRIO
// ═══════════════════════════════════════════════════════════════════════════

/** Um trecho-fonte de uma peça que embasa um parágrafo do mini-relatório. */
export interface RelatorioFonteTrecho {
  /** Citação devolvida pela IA (deve ser cópia literal da peça). */
  trecho: string;
  /** Rótulo da peça de origem (caso C). Definido pela verificação local quando encontrado. */
  peca: string;
  /** Resultado do match local determinístico (caso A — anti-alucinação). */
  status: 'verificado' | 'nao_localizado';
  /** Similaridade 0–1 do match fuzzy (ausente quando match exato). */
  matchScore?: number;
  /** Reservado para o caso B (navegação ao PDF). NÃO populado na v1. */
  offsetInicio?: number;
  /** Reservado para o caso B (navegação ao PDF). NÃO populado na v1. */
  offsetFim?: number;
}

/** Trechos-fonte agrupados por parágrafo do mini-relatório (granularidade B). */
export interface RelatorioBlocoFonte {
  /** Índice do parágrafo do relatório (alinhamento determinístico). */
  blocoIndex: number;
  /** Início do parágrafo, para identificação na UI. */
  blocoResumo: string;
  trechos: RelatorioFonteTrecho[];
}

/** Resultado completo da rastreabilidade, persistido no tópico. */
export interface RelatorioRastreabilidade {
  /** ISO timestamp da geração. */
  geradoEm: string;
  /** Texto do relatório auditado (detecção de staleness). */
  baseSnapshot: string;
  /** Provedor/modelo usado. */
  modelo?: string;
  blocos: RelatorioBlocoFonte[];
}
```

- [ ] **Step 2: Adicionar o campo em `Topic` (dentro da interface, após `editedFundamentacao?` na linha 40)**

```ts
  /** Rastreabilidade de fontes do mini-relatório (sob demanda). */
  relatorioFontes?: RelatorioRastreabilidade;
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS (sem erros novos)

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts
git commit -m "feat(types): tipos de rastreabilidade de fontes do mini-relatório

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Verificação local (match exato + fuzzy)

**Files:**
- Create: `src/utils/sourceMatching.ts`
- Test: `src/utils/sourceMatching.test.ts`

- [ ] **Step 1: Escrever o teste falho**

```ts
// src/utils/sourceMatching.test.ts
import { describe, it, expect } from 'vitest';
import { normalizeForMatch, verifyTrechoInSources, type NormalizedSource } from './sourceMatching';

const norm = (peca: string, text: string): NormalizedSource => ({ peca, normalized: normalizeForMatch(text) });

describe('normalizeForMatch', () => {
  it('remove acentos, baixa caixa e colapsa espaços', () => {
    expect(normalizeForMatch('  Demissão  SEM   justa\nCausa ')).toBe('demissao sem justa causa');
  });
});

describe('verifyTrechoInSources', () => {
  const sources = [
    norm('Petição inicial', 'O reclamante alega que trabalhou de segunda a sábado, das 8h às 18h, sem intervalo.'),
    norm('Contestação 1', 'A ré sustenta que o autor sempre usufruiu de uma hora de intervalo intrajornada.'),
  ];

  it('match exato (ignorando acento/espaço) → verificado com a peça correta', () => {
    const r = verifyTrechoInSources('trabalhou de segunda a sábado, das 8h às 18h', sources, 'Petição inicial');
    expect(r.status).toBe('verificado');
    expect(r.peca).toBe('Petição inicial');
    expect(r.matchScore).toBe(1);
  });

  it('atribui a peça onde o trecho realmente está (caso C), não a etiqueta da IA', () => {
    const r = verifyTrechoInSources('usufruiu de uma hora de intervalo intrajornada', sources, 'Petição inicial');
    expect(r.status).toBe('verificado');
    expect(r.peca).toBe('Contestação 1');
  });

  it('match fuzzy acima do limiar → verificado', () => {
    const r = verifyTrechoInSources('o reclamante alega que trabalhou de segunda a sabado das 8 as 18h sem intervalo', sources, 'Petição inicial');
    expect(r.status).toBe('verificado');
    expect(r.matchScore).toBeGreaterThanOrEqual(0.85);
  });

  it('trecho inventado → nao_localizado', () => {
    const r = verifyTrechoInSources('o autor pilotava um helicóptero da empresa todas as manhãs', sources, 'Petição inicial');
    expect(r.status).toBe('nao_localizado');
  });

  it('trecho vazio → nao_localizado com a etiqueta da IA', () => {
    const r = verifyTrechoInSources('   ', sources, 'Contestação 1');
    expect(r.status).toBe('nao_localizado');
    expect(r.peca).toBe('Contestação 1');
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest run src/utils/sourceMatching.test.ts`
Expected: FAIL ("Failed to resolve import './sourceMatching'")

- [ ] **Step 3: Implementar `src/utils/sourceMatching.ts`**

```ts
/**
 * @file sourceMatching.ts
 * @description Verificação local determinística de trechos-fonte contra o texto
 * das peças (anti-alucinação). Funções puras, sem dependências de React/API.
 */

/** Normaliza texto para comparação: sem acento, minúsculo, espaços colapsados. */
export function normalizeForMatch(s: string): string {
  return (s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[“”"']/g, ' ')
    .replace(/[‐-―]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Fonte já normalizada (normaliza-se uma vez, reusa por trecho). */
export interface NormalizedSource {
  peca: string;
  normalized: string;
}

export interface MatchResult {
  status: 'verificado' | 'nao_localizado';
  peca: string;
  matchScore?: number;
}

const FUZZY_THRESHOLD = 0.85;

function tokenize(s: string): string[] {
  return s.split(' ').filter(Boolean);
}

/** Coeficiente de Dice entre dois multisets de tokens (0–1). */
function diceCoefficient(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const counts = new Map<string, number>();
  for (const t of b) counts.set(t, (counts.get(t) || 0) + 1);
  let inter = 0;
  for (const t of a) {
    const c = counts.get(t);
    if (c && c > 0) { inter++; counts.set(t, c - 1); }
  }
  return (2 * inter) / (a.length + b.length);
}

/**
 * Verifica se `trecho` aparece em alguma das `sources`.
 * 1) substring exata normalizada → verificado (peça onde foi achado);
 * 2) fuzzy por janela deslizante de tokens ≥ threshold → verificado;
 * 3) senão → nao_localizado (mantém a etiqueta da IA).
 */
export function verifyTrechoInSources(
  trecho: string,
  sources: NormalizedSource[],
  aiLabel: string,
  threshold: number = FUZZY_THRESHOLD
): MatchResult {
  const nt = normalizeForMatch(trecho);
  if (!nt) return { status: 'nao_localizado', peca: aiLabel };

  for (const src of sources) {
    if (src.normalized.includes(nt)) {
      return { status: 'verificado', peca: src.peca, matchScore: 1 };
    }
  }

  const tt = tokenize(nt);
  let best = 0;
  let bestPeca = aiLabel;
  for (const src of sources) {
    const st = tokenize(src.normalized);
    const w = tt.length;
    if (st.length < w) {
      const score = diceCoefficient(tt, st);
      if (score > best) { best = score; bestPeca = src.peca; }
      continue;
    }
    for (let i = 0; i + w <= st.length; i++) {
      const score = diceCoefficient(tt, st.slice(i, i + w));
      if (score > best) { best = score; bestPeca = src.peca; }
      if (best >= 1) break;
    }
  }

  const rounded = Number(best.toFixed(3));
  if (best >= threshold) return { status: 'verificado', peca: bestPeca, matchScore: rounded };
  return { status: 'nao_localizado', peca: aiLabel, matchScore: rounded };
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx vitest run src/utils/sourceMatching.test.ts`
Expected: PASS (6 testes)

- [ ] **Step 5: Commit**

```bash
git add src/utils/sourceMatching.ts src/utils/sourceMatching.test.ts
git commit -m "feat(utils): verificação local de trechos-fonte (exato + fuzzy)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Split do relatório em parágrafos

**Files:**
- Create: `src/utils/reportParagraphs.ts`
- Test: `src/utils/reportParagraphs.test.ts`

- [ ] **Step 1: Escrever o teste falho**

```ts
// src/utils/reportParagraphs.test.ts
import { describe, it, expect } from 'vitest';
import { splitReportIntoParagraphs } from './reportParagraphs';

describe('splitReportIntoParagraphs', () => {
  it('divide N <p> em N parágrafos numerados a partir de 0', () => {
    const html = '<p>O reclamante narra os fatos.</p><p>A primeira reclamada contesta.</p>';
    const r = splitReportIntoParagraphs(html);
    expect(r).toEqual([
      { index: 0, text: 'O reclamante narra os fatos.' },
      { index: 1, text: 'A primeira reclamada contesta.' },
    ]);
  });

  it('trata <br>, &nbsp; e tags inline, descartando blocos vazios', () => {
    const html = '<p>Primeira&nbsp;linha<br>continua</p><p></p><p><strong>Segunda</strong> parte.</p>';
    const r = splitReportIntoParagraphs(html);
    expect(r.map(p => p.text)).toEqual(['Primeira linha', 'continua', 'Segunda parte.']);
  });

  it('retorna [] para html vazio', () => {
    expect(splitReportIntoParagraphs('')).toEqual([]);
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest run src/utils/reportParagraphs.test.ts`
Expected: FAIL ("Failed to resolve import './reportParagraphs'")

- [ ] **Step 3: Implementar `src/utils/reportParagraphs.ts`**

```ts
/**
 * @file reportParagraphs.ts
 * @description Divide o HTML do mini-relatório em parágrafos de texto puro,
 * numerados. Alinhamento determinístico para a rastreabilidade (bloco = parágrafo).
 */

export interface ReportParagraph {
  index: number;
  text: string;
}

export function splitReportIntoParagraphs(html: string): ReportParagraph[] {
  if (!html) return [];
  const blocks = html
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .split('\n')
    .map(s => s.replace(/\s+/g, ' ').trim())
    .filter(s => s.length > 0);
  return blocks.map((text, index) => ({ index, text }));
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx vitest run src/utils/reportParagraphs.test.ts`
Expected: PASS (3 testes)

- [ ] **Step 5: Commit**

```bash
git add src/utils/reportParagraphs.ts src/utils/reportParagraphs.test.ts
git commit -m "feat(utils): split do mini-relatório em parágrafos numerados

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Schema Zod da resposta de rastreabilidade

**Files:**
- Modify: `src/schemas/ai-responses.ts` (adicionar após o bloco "Double Check", ~linha 203)
- Test: `src/schemas/ai-responses.rastreabilidade.test.ts`

- [ ] **Step 1: Escrever o teste falho**

```ts
// src/schemas/ai-responses.rastreabilidade.test.ts
import { describe, it, expect } from 'vitest';
import { parseAIResponse, RastreabilidadeResponseSchema } from './ai-responses';

describe('RastreabilidadeResponseSchema', () => {
  it('parseia JSON em code block e coage blocoIndex string→number', () => {
    const raw = '```json\n{"blocos":[{"blocoIndex":"0","trechos":[{"peca":"Petição inicial","trecho":"trabalhou aos sábados"}]}]}\n```';
    const r = parseAIResponse(raw, RastreabilidadeResponseSchema);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.blocos[0].blocoIndex).toBe(0);
      expect(r.data.blocos[0].trechos[0].peca).toBe('Petição inicial');
    }
  });

  it('aceita blocos ausentes (default [])', () => {
    const r = parseAIResponse('{}', RastreabilidadeResponseSchema);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.blocos).toEqual([]);
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest run src/schemas/ai-responses.rastreabilidade.test.ts`
Expected: FAIL ("RastreabilidadeResponseSchema is not exported" / undefined)

- [ ] **Step 3: Adicionar o schema em `src/schemas/ai-responses.ts` (após `parseAIResponse`, antes do bloco "SCHEMA: Embargos de Declaração" na linha 205)**

```ts
// ═══════════════════════════════════════════════════════════════════
// SCHEMA: Rastreabilidade de fontes do mini-relatório
// ═══════════════════════════════════════════════════════════════════

export const RastreabilidadeTrechoSchema = z.object({
  peca: z.string().nullable().default('').transform(v => v ?? ''),
  trecho: z.string().nullable().default('').transform(v => v ?? ''),
}).passthrough();

export const RastreabilidadeBlocoSchema = z.object({
  blocoIndex: z.number().or(z.string().transform(Number)),
  trechos: z.array(RastreabilidadeTrechoSchema).default([]),
}).passthrough();

export const RastreabilidadeResponseSchema = z.object({
  blocos: z.array(RastreabilidadeBlocoSchema).default([]),
}).passthrough();
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx vitest run src/schemas/ai-responses.rastreabilidade.test.ts`
Expected: PASS (2 testes)

- [ ] **Step 5: Commit**

```bash
git add src/schemas/ai-responses.ts src/schemas/ai-responses.rastreabilidade.test.ts
git commit -m "feat(schemas): schema Zod da resposta de rastreabilidade

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Helpers puros de rastreabilidade (fontes, prompt, mapeamento)

**Files:**
- Create: `src/utils/sourceTracing.ts`
- Test: `src/utils/sourceTracing.test.ts`

- [ ] **Step 1: Escrever o teste falho**

```ts
// src/utils/sourceTracing.test.ts
import { describe, it, expect } from 'vitest';
import { buildTracingSources, buildSourceTracingPrompt, mapTracingResponse } from './sourceTracing';

describe('buildTracingSources', () => {
  it('rotula petição inicial, contestações (com reclamada) e descarta vazias', () => {
    const docs = {
      peticoesText: [{ text: 'fatos do autor' }],
      contestacoesText: [{ text: 'defesa da acme' }, { text: '   ' }],
      complementaresText: [],
    };
    const partes = { reclamadas: ['ACME LTDA'] };
    const sources = buildTracingSources(docs, partes);
    expect(sources).toEqual([
      { peca: 'Petição inicial', text: 'fatos do autor' },
      { peca: 'Contestação 1 — ACME LTDA', text: 'defesa da acme' },
    ]);
  });
});

describe('buildSourceTracingPrompt', () => {
  it('numera os parágrafos e pede JSON', () => {
    const prompt = buildSourceTracingPrompt([
      { index: 0, text: 'Parágrafo A.' },
      { index: 1, text: 'Parágrafo B.' },
    ]);
    expect(prompt).toContain('[0] Parágrafo A.');
    expect(prompt).toContain('[1] Parágrafo B.');
    expect(prompt).toContain('blocoIndex');
    expect(prompt).toContain('JSON');
  });
});

describe('mapTracingResponse', () => {
  const paragraphs = [
    { index: 0, text: 'O reclamante alega horas extras habituais.' },
    { index: 1, text: 'A ré nega a jornada alegada.' },
  ];
  const sources = [
    { peca: 'Petição inicial', text: 'O reclamante alega horas extras habituais e reflexos.' },
    { peca: 'Contestação 1', text: 'A ré nega a jornada alegada na inicial.' },
  ];

  it('alinha por blocoIndex, verifica e atribui a peça correta', () => {
    const parsed = [
      { blocoIndex: 0, trechos: [{ peca: 'Petição inicial', trecho: 'horas extras habituais' }] },
      { blocoIndex: 1, trechos: [{ peca: 'Petição inicial', trecho: 'nega a jornada alegada' }] },
    ];
    const blocos = mapTracingResponse(parsed, paragraphs, sources);
    expect(blocos).toHaveLength(2);
    expect(blocos[0].blocoResumo).toContain('O reclamante alega');
    expect(blocos[0].trechos[0].status).toBe('verificado');
    expect(blocos[1].trechos[0].peca).toBe('Contestação 1'); // corrige etiqueta errada da IA
  });

  it('marca trecho inventado como nao_localizado', () => {
    const parsed = [{ blocoIndex: 0, trechos: [{ peca: 'Petição inicial', trecho: 'o autor viajou para a lua' }] }];
    const blocos = mapTracingResponse(parsed, paragraphs, sources);
    expect(blocos[0].trechos[0].status).toBe('nao_localizado');
  });

  it('parágrafo sem bloco correspondente → trechos vazios; bloco órfão é ignorado', () => {
    const parsed = [{ blocoIndex: 99, trechos: [{ peca: 'X', trecho: 'qualquer' }] }];
    const blocos = mapTracingResponse(parsed, paragraphs, sources);
    expect(blocos).toHaveLength(2);
    expect(blocos[0].trechos).toEqual([]);
    expect(blocos[1].trechos).toEqual([]);
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest run src/utils/sourceTracing.test.ts`
Expected: FAIL ("Failed to resolve import './sourceTracing'")

- [ ] **Step 3: Implementar `src/utils/sourceTracing.ts`**

```ts
/**
 * @file sourceTracing.ts
 * @description Helpers puros do segundo passe de rastreabilidade: montagem das
 * fontes rotuladas, construção do prompt e mapeamento da resposta da IA com
 * verificação local. Sem dependências de React/API.
 */

import { normalizeForMatch, verifyTrechoInSources, type NormalizedSource } from './sourceMatching';
import type { ReportParagraph } from './reportParagraphs';
import type { RelatorioBlocoFonte } from '../types';

/** Subconjunto estrutural de AnalyzedDocuments usado aqui. */
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
    return { blocoIndex: p.index, blocoResumo: p.text.slice(0, 120), trechos };
  });
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx vitest run src/utils/sourceTracing.test.ts`
Expected: PASS (5 testes)

- [ ] **Step 5: Commit**

```bash
git add src/utils/sourceTracing.ts src/utils/sourceTracing.test.ts
git commit -m "feat(utils): helpers puros de rastreabilidade (fontes, prompt, mapeamento)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: Orquestração `traceReportSources` no hook

**Files:**
- Modify: `src/hooks/useReportGeneration.ts`

- [ ] **Step 1: Adicionar imports (após a linha 18, junto aos imports de utils/prompts)**

```ts
import { extractJSON, parseAIResponse, RastreabilidadeResponseSchema } from '../schemas/ai-responses';
import { splitReportIntoParagraphs } from '../utils/reportParagraphs';
import { buildTracingSources, buildSourceTracingPrompt, mapTracingResponse } from '../utils/sourceTracing';
```

> `extractJSON` pode não ser usado diretamente; remova-o do import se o `tsc`/lint reclamar de import não usado. `parseAIResponse` e o schema são os necessários.

- [ ] **Step 2: Adicionar `RelatorioRastreabilidade` ao import de tipos (no bloco `import type { ... } from '../types'`, linhas 19-29)**

```ts
  AIProvider,
  RelatorioRastreabilidade
```

(adicione `RelatorioRastreabilidade` como último item da lista de tipos importados)

- [ ] **Step 3: Declarar o retorno na interface `UseReportGenerationReturn` (após `generateRelatorioProcessual`, linha 123)**

```ts
  traceReportSources: (topic: Topic) => Promise<RelatorioRastreabilidade>;
```

- [ ] **Step 4: Implementar a função dentro do hook (logo após `generateMiniReport`, depois da linha 451)**

```ts
  /**
   * Segundo passe sob demanda: rastreia de quais trechos das peças cada parágrafo
   * do mini-relatório foi extraído. Verifica cada trecho localmente (anti-alucinação).
   */
  const traceReportSources = React.useCallback(async (topic: Topic): Promise<RelatorioRastreabilidade> => {
    const reportText = topic.editedRelatorio || topic.relatorio || '';
    if (!reportText.trim()) {
      throw new Error('Gere o mini-relatório antes de rastrear as fontes.');
    }

    const paragraphs = splitReportIntoParagraphs(reportText);
    if (paragraphs.length === 0) {
      throw new Error('Não foi possível identificar parágrafos no mini-relatório.');
    }

    const includeComplementares = topic.title.toUpperCase().includes('RELATÓRIO');
    const sources = buildTracingSources(docs, partesProcesso);

    const contentArray = buildDocumentContentArray({
      includePeticao: true,
      includeContestacoes: true,
      includeComplementares
    });
    contentArray.push({ type: 'text', text: buildSourceTracingPrompt(paragraphs) });

    const raw = await aiIntegration.callAI([{ role: 'user', content: contentArray }], {
      maxTokens: 4000,
      useInstructions: false,
      temperature: 0.1
    });

    const parsed = parseAIResponse(raw, RastreabilidadeResponseSchema);
    if (!parsed.success) {
      throw new Error('Resposta de rastreabilidade inválida: ' + parsed.error);
    }

    const blocos = mapTracingResponse(parsed.data.blocos, paragraphs, sources);

    return {
      geradoEm: new Date().toISOString(),
      baseSnapshot: reportText,
      modelo: aiIntegration.aiSettings?.provider,
      blocos
    };
  }, [docs, partesProcesso, buildDocumentContentArray, aiIntegration]);
```

- [ ] **Step 5: Expor no objeto de retorno do hook**

Localize o `return { ... }` final do hook (que já expõe `generateMiniReport`, `generateMultipleMiniReports`, etc.) e adicione:

```ts
    traceReportSources,
```

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS (sem erros novos)

- [ ] **Step 7: Commit**

```bash
git add src/hooks/useReportGeneration.ts
git commit -m "feat(hook): traceReportSources — segundo passe de rastreabilidade

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: Modal de rastreabilidade

**Files:**
- Create: `src/components/modals/RastreabilidadeModal.tsx`
- Test: `src/components/modals/RastreabilidadeModal.test.tsx`

- [ ] **Step 1: Escrever o teste falho**

```tsx
// src/components/modals/RastreabilidadeModal.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RastreabilidadeModal } from './RastreabilidadeModal';
import type { Topic } from '../../types';

const baseTopic = (over: Partial<Topic> = {}): Topic => ({
  title: 'HORAS EXTRAS', category: 'MÉRITO', relatorio: '<p>texto</p>', ...over,
});

describe('RastreabilidadeModal', () => {
  it('estado vazio: mostra CTA "Rastrear fontes"', () => {
    render(<RastreabilidadeModal isOpen topic={baseTopic()} tracing={false} onClose={vi.fn()} onRunTrace={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Rastrear fontes/i })).toBeTruthy();
  });

  it('com dados: mostra resumo de verificados/não localizados', () => {
    const topic = baseTopic({
      relatorio: '<p>texto</p>',
      relatorioFontes: {
        geradoEm: '2026-05-31T10:00:00.000Z',
        baseSnapshot: '<p>texto</p>',
        blocos: [{ blocoIndex: 0, blocoResumo: 'texto', trechos: [
          { trecho: 'a', peca: 'Petição inicial', status: 'verificado' },
          { trecho: 'b', peca: 'Petição inicial', status: 'nao_localizado' },
        ] }],
      },
    });
    render(<RastreabilidadeModal isOpen topic={topic} tracing={false} onClose={vi.fn()} onRunTrace={vi.fn()} />);
    expect(screen.getByText(/1 verificado/i)).toBeTruthy();
    expect(screen.getByText(/1 não localizado/i)).toBeTruthy();
  });

  it('staleness: relatório mudou desde a rastreabilidade → faixa de aviso', () => {
    const topic = baseTopic({
      relatorio: '<p>NOVO texto</p>',
      relatorioFontes: { geradoEm: '2026-05-31T10:00:00.000Z', baseSnapshot: '<p>texto antigo</p>', blocos: [] },
    });
    render(<RastreabilidadeModal isOpen topic={topic} tracing={false} onClose={vi.fn()} onRunTrace={vi.fn()} />);
    expect(screen.getByText(/desatualizada/i)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest run src/components/modals/RastreabilidadeModal.test.tsx`
Expected: FAIL ("Failed to resolve import './RastreabilidadeModal'")

- [ ] **Step 3: Implementar `src/components/modals/RastreabilidadeModal.tsx`**

```tsx
/**
 * @file RastreabilidadeModal.tsx
 * @description Exibe a rastreabilidade de fontes do mini-relatório por parágrafo,
 * com selo de verificação por trecho. Sob demanda; resultado persiste no tópico.
 */

import React from 'react';
import { Search, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { BaseModal, CSS } from './BaseModal';
import type { Topic } from '../../types';

interface RastreabilidadeModalProps {
  isOpen: boolean;
  onClose: () => void;
  topic: Topic | null;
  tracing: boolean;
  onRunTrace: () => void;
}

export const RastreabilidadeModal: React.FC<RastreabilidadeModalProps> = ({
  isOpen, onClose, topic, tracing, onRunTrace
}) => {
  const currentText = topic?.editedRelatorio || topic?.relatorio || '';
  const rast = topic?.relatorioFontes;
  const stale = !!rast && rast.baseSnapshot !== currentText;

  const allTrechos = (rast?.blocos || []).flatMap(b => b.trechos);
  const verificados = allTrechos.filter(t => t.status === 'verificado').length;
  const naoLocalizados = allTrechos.length - verificados;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Rastreabilidade do mini-relatório"
      subtitle={topic?.title}
      icon={<Search />}
      iconColor="blue"
      size="xl"
    >
      {tracing ? (
        <div className="flex flex-col items-center justify-center py-12 theme-text-secondary">
          <div className={CSS.spinner + ' !w-8 !h-8 !border-blue-500 !border-t-transparent'} />
          <p className="mt-4 text-sm">Rastreando fontes nas peças…</p>
        </div>
      ) : !rast ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Search className="w-10 h-10 theme-text-muted mb-3" />
          <p className="theme-text-secondary text-sm max-w-md mb-5">
            Audite de quais trechos das peças (petição inicial e contestações) a IA extraiu cada
            parágrafo deste mini-relatório. Cada trecho é verificado localmente contra o texto das peças.
          </p>
          <button onClick={onRunTrace} className={CSS.btnBlue}>Rastrear fontes</button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Resumo */}
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="theme-text-secondary">{allTrechos.length} trecho(s)</span>
            <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
              <CheckCircle2 className="w-4 h-4" /> {verificados} verificado(s)
            </span>
            <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4" /> {naoLocalizados} não localizado(s)
            </span>
          </div>

          {/* Staleness */}
          {stale && (
            <div className="flex items-center justify-between gap-3 theme-warning-box p-3 rounded-lg">
              <div className="flex items-center gap-2 text-xs theme-text-primary">
                <RefreshCw className="w-4 h-4 flex-shrink-0" />
                <span>Fontes desatualizadas — o relatório foi editado desde a última rastreabilidade.</span>
              </div>
              <button onClick={onRunTrace} className={CSS.btnSecondary + ' whitespace-nowrap text-xs !py-1.5'}>
                Regerar
              </button>
            </div>
          )}

          {/* Blocos */}
          <div className="space-y-3">
            {(rast.blocos || []).map(bloco => (
              <div key={bloco.blocoIndex} className="rounded-lg border theme-border-secondary theme-bg-app p-3">
                <p className="text-sm font-medium theme-text-primary mb-2">
                  <span className="theme-text-muted mr-1">¶{bloco.blocoIndex + 1}</span>
                  {bloco.blocoResumo}…
                </p>
                {bloco.trechos.length === 0 ? (
                  <p className="text-xs theme-text-muted italic">Sem trechos identificados para este parágrafo.</p>
                ) : (
                  <ul className="space-y-2">
                    {bloco.trechos.map((t, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs">
                        {t.status === 'verificado' ? (
                          <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-green-600 dark:text-green-400" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                        )}
                        <div className="flex-1">
                          <span className="theme-text-primary">“{t.trecho}”</span>
                          <span className="theme-text-muted ml-1">— {t.peca}</span>
                          {t.status === 'nao_localizado' && (
                            <span className="ml-1 text-amber-600 dark:text-amber-400">(não localizado na peça)</span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>

          {rast.geradoEm && (
            <p className="text-[11px] theme-text-muted pt-1">
              Gerado em {new Date(rast.geradoEm).toLocaleString('pt-BR')}
              {rast.modelo ? ` · ${rast.modelo}` : ''}
            </p>
          )}
        </div>
      )}
    </BaseModal>
  );
};

export default RastreabilidadeModal;
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx vitest run src/components/modals/RastreabilidadeModal.test.tsx`
Expected: PASS (3 testes)

- [ ] **Step 5: Exportar no barrel `src/components/index.ts`**

Adicione (junto aos demais exports de modais):

```ts
export { RastreabilidadeModal } from './modals/RastreabilidadeModal';
```

> Confirme o padrão exato do barrel com `grep -n "BaseModal\|export.*Modal" src/components/index.ts` e siga o mesmo estilo (named export from path).

- [ ] **Step 6: Type-check + commit**

Run: `npx tsc --noEmit`
Expected: PASS

```bash
git add src/components/modals/RastreabilidadeModal.tsx src/components/modals/RastreabilidadeModal.test.tsx src/components/index.ts
git commit -m "feat(ui): RastreabilidadeModal (BaseModal) com selos de verificação

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8: Botão no painel lateral + render do modal (EditorTabContent)

**Files:**
- Modify: `src/components/tabs/EditorTabContent.tsx`

- [ ] **Step 1: Importar o modal e o ícone**

No topo do arquivo, adicione `Search` ao import de `lucide-react` (localize o import existente com `FileText`, `Scale`, etc.) e importe o modal:

```ts
import { RastreabilidadeModal } from '../modals/RastreabilidadeModal';
```

(Adicione `Search` à lista de ícones já importada de `lucide-react`.)

- [ ] **Step 2: Declarar as novas props na interface de props do componente (junto a `regenerateRelatorioProcessual`, ~linha 104)**

```ts
  onTraceReportSources: () => void;
  tracingFontes: boolean;
```

- [ ] **Step 3: Destructurar as novas props (junto a `regenerateRelatorioProcessual`, ~linha 172)**

```ts
  onTraceReportSources,
  tracingFontes,
```

- [ ] **Step 4: Adicionar estado local de abertura do modal (junto aos demais hooks de estado do componente, perto do topo do corpo do componente)**

```ts
  const [showFontesModal, setShowFontesModal] = React.useState(false);
```

- [ ] **Step 5: Adicionar o painel-botão no painel lateral (dentro do `<div className="space-y-4">` do painel lateral, logo após o bloco de "Provas Vinculadas", ~linha 318, ainda dentro desse container)**

```tsx
            {/* Painel: Fontes do mini-relatório */}
            {(editingTopic.editedRelatorio || editingTopic.relatorio) &&
             editingTopic.title?.toUpperCase() !== 'DISPOSITIVO' && (
              <div className="theme-bg-secondary rounded-lg border theme-border-secondary p-4">
                <div className={CSS.flexGap2}>
                  <Search className="w-5 h-5 theme-text-blue" />
                  <h4 className="font-bold theme-text-primary">Fontes do mini-relatório</h4>
                </div>
                <p className="text-xs theme-text-muted mt-1 mb-3">
                  Audite de quais trechos das peças a IA extraiu cada parágrafo.
                </p>
                <button
                  onClick={() => setShowFontesModal(true)}
                  className={CSS.btnSecondary + ' w-full'}
                >
                  {editingTopic.relatorioFontes ? 'Ver rastreabilidade' : 'Rastrear fontes'}
                </button>
              </div>
            )}
```

> `CSS` já está importado em EditorTabContent (`import { CSS } from '../../constants/styles'`). Se `CSS.btnSecondary` não existir nesse módulo de `styles`, use a classe equivalente já usada no arquivo, ou importe `CSS` de `'../modals/BaseModal'`. Verifique com `grep -n "CSS\." src/components/tabs/EditorTabContent.tsx`.

- [ ] **Step 6: Renderizar o modal (antes do fechamento do return do componente, junto aos demais elementos de nível superior do JSX)**

```tsx
      <RastreabilidadeModal
        isOpen={showFontesModal}
        onClose={() => setShowFontesModal(false)}
        topic={editingTopic}
        tracing={tracingFontes}
        onRunTrace={onTraceReportSources}
      />
```

- [ ] **Step 7: Type-check**

Run: `npx tsc --noEmit`
Expected: FAIL — App.tsx ainda não passa `onTraceReportSources`/`tracingFontes` (será corrigido na Task 9). Erros restritos a essas props em App.tsx são esperados aqui.

- [ ] **Step 8: Commit**

```bash
git add src/components/tabs/EditorTabContent.tsx
git commit -m "feat(ui): painel 'Fontes do mini-relatório' + modal no editor

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 9: Handler e fiação no App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Destructurar `traceReportSources` do hook**

Localize onde `reportGeneration` é consumido. O App já chama `generateMiniReport(...)` diretamente (linha 1854), logo essas funções são desestruturadas do retorno de `useReportGeneration`. Adicione `traceReportSources` à desestruturação correspondente (junto a `generateMiniReport`, `generateMiniReportsBatch`, etc.).

Confirme o ponto exato com:
```bash
grep -n "generateMiniReport," src/App.tsx
```
e adicione `traceReportSources,` na mesma lista de desestruturação.

- [ ] **Step 2: Adicionar estado de loading (junto aos demais `useState` de UI do App)**

```ts
  const [tracingFontes, setTracingFontes] = React.useState(false);
```

- [ ] **Step 3: Adicionar o handler (logo após `regenerateRelatorioWithInstruction`, ~linha 1874)**

```ts
  const handleTraceReportSources = async () => {
    if (!editingTopic) {
      setError('Nenhum tópico selecionado para rastrear fontes');
      return;
    }
    setTracingFontes(true);
    setError('');
    try {
      const rastreabilidade = await traceReportSources(editingTopic);
      const updatedTopic = { ...editingTopic, relatorioFontes: rastreabilidade };
      setEditingTopic(updatedTopic);
      setSelectedTopics(selectedTopics.map(t => t.title === editingTopic.title ? updatedTopic : t));
      setExtractedTopics(extractedTopics.map(t => t.title === editingTopic.title ? updatedTopic : t));
    } catch (err) {
      setError('Erro ao rastrear fontes: ' + (err as Error).message);
    } finally {
      setTracingFontes(false);
    }
  };
```

> Os símbolos `editingTopic`, `setEditingTopic`, `selectedTopics`, `setSelectedTopics`, `extractedTopics`, `setExtractedTopics` e `setError` já estão em escopo nesse trecho (usados por `regenerateRelatorioWithInstruction` logo acima).

- [ ] **Step 4: Passar as props ao `EditorTabContent`**

Localize onde `<EditorTabContent ... />` é renderizado em App.tsx (procure `regenerateRelatorioWithInstruction={` ou `<EditorTabContent`):
```bash
grep -n "regenerateRelatorioWithInstruction={\|<EditorTabContent" src/App.tsx
```
Adicione ao JSX, junto às demais props:

```tsx
        onTraceReportSources={handleTraceReportSources}
        tracingFontes={tracingFontes}
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS (sem erros)

- [ ] **Step 6: Rodar todos os testes**

Run: `npm run test:run`
Expected: PASS (incluindo os novos testes das Tasks 2–7; nenhum teste existente quebrado)

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx
git commit -m "feat(app): fiação do handler de rastreabilidade de fontes

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 10: Bump de versão (1.50.33 → 1.50.34)

**Files:**
- Modify: `src/constants/app-version.ts`, `package.json`, `CLAUDE.md`, `src/constants/changelog.js`

- [ ] **Step 1: `src/constants/app-version.ts`**

```ts
export const APP_VERSION = '1.50.34';
```

- [ ] **Step 2: `package.json` (campo `version`, linha 3)**

```json
  "version": "1.50.34",
```

- [ ] **Step 3: `CLAUDE.md` (linha 7)**

Trocar `**Version**: 1.50.33` por `**Version**: 1.50.34`.

- [ ] **Step 4: `src/constants/changelog.js` (nova entrada no topo do array `CHANGELOG`)**

```js
  {
    version: '1.50.34',
    date: '2026-05-31',
    feature: 'feat(ai): rastreabilidade de fontes do mini-relatório — botão "Rastrear fontes" gera, por parágrafo, os trechos literais das peças que o embasaram, verificados localmente (✓ verificado / ⚠ não localizado), multi-provedor e persistidos no tópico.',
  },
```

- [ ] **Step 5: Type-check + suíte completa**

Run: `npx tsc --noEmit && npm run test:run`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/constants/app-version.ts package.json CLAUDE.md src/constants/changelog.js
git commit -m "chore(release): v1.50.34 — rastreabilidade de fontes do mini-relatório

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Riscos, mitigações e rollback

- **Risco:** `CSS.btnSecondary`/`theme-warning-box` inexistentes no módulo esperado → quebra visual. **Mitigação:** Steps 5/6 da Task 8 incluem verificação por `grep`; `theme-warning-box` já é usado por `ModalAmberBox` em BaseModal.
- **Risco:** desestruturação de `traceReportSources` no ponto errado do App. **Mitigação:** Task 9 Step 1 usa `grep` para achar a lista exata onde `generateMiniReport` é desestruturado.
- **Risco:** fuzzy lento em peças muito grandes. **Mitigação:** janela de tokens é curta (tamanho do trecho) e roda só sob demanda; aceitável. Se necessário, limitar busca aos N primeiros caracteres por fonte numa iteração futura.
- **Rollback:** cada task é um commit isolado; `git revert` do range reverte sem efeitos colaterais (campo `relatorioFontes` é opcional e ignorado por código antigo).

---

## Self-Review (preenchido)

**Cobertura do spec:**
- §3.1 modelo de dados → Task 1 ✓
- §3.2 segundo passe → Tasks 5 (prompt/fontes) + 6 (orquestração) ✓
- §3.3 verificação local (exato/fuzzy/limiar 0.85) → Task 2 ✓
- §3.4 UI (botão + modal BaseModal + staleness + temas) → Tasks 7 e 8 ✓
- Persistência no Topic → Task 9 (grava `relatorioFontes`) ✓
- §6 tratamento de erros (relatório vazio, JSON inválido, bloco órfão, peça ausente) → Tasks 6 (vazio/JSON), 5 (bloco órfão/peças filtradas), testes em 5 ✓
- §7 testes (todos importam código de produção real) → Tasks 2,3,4,5,7 ✓
- §8 fora de escopo (offsets não populados; só mini-relatório; sem subapps) → respeitado ✓

**Placeholder scan:** nenhum TBD/TODO; todo passo de código traz o código completo.

**Consistência de tipos/nomes:** `RelatorioRastreabilidade`/`RelatorioBlocoFonte`/`RelatorioFonteTrecho` consistentes entre Task 1, hook (Task 6), utils (Task 5) e modal (Task 7). `traceReportSources` idêntico em hook (6) e App (9). `onTraceReportSources`/`tracingFontes` idênticos entre EditorTabContent (8) e App (9). `verifyTrechoInSources`, `buildTracingSources`, `buildSourceTracingPrompt`, `mapTracingResponse`, `splitReportIntoParagraphs`, `RastreabilidadeResponseSchema` consistentes entre definição e uso.
