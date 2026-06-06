# Skill `extrair-modelos-de-sentencas` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir a skill `extrair-modelos-de-sentencas` que lê uma pasta de sentenças (Google Docs no Drive) e produz um `modelos.json` importável no Sentencify — fragmentos por tema, com placeholders, sem repetidos.

**Architecture:** Pipeline de 5 estágios. Subagentes (batched) baixam o texto bruto de cada Doc isoladamente e gravam em disco; scripts Node determinísticos fazem segmentação por cabeçalho, placeholders e clustering TF-IDF (nunca no contexto do pai); o LLM do pai entra só no rótulo final dos clusters. O pai orquestra e nunca lê texto bruto.

**Tech Stack:** Node.js (ESM `.mjs`, `node --test`), MCP `google-drive-mcp` (acesso ao Drive), Skill tool + Agent tool (subagentes). A skill vive em `~/.claude/skills/extrair-modelos-de-sentencas/` (fora do repo sentencify, seguindo a convenção das demais skills).

**Spec:** `docs/superpowers/specs/2026-06-06-extracao-modelos-de-sentencas-design.md`

---

## Convenção deste plano

- A skill **não fica no repo `sentencify`** (igual às outras skills custom). Logo,
  os passos de "commit" se aplicam ao **plano/spec no repo**; para os scripts da
  skill, o **checkpoint de verificação é a suíte de testes verde** (`node --test`).
  Se `~/.claude` for um repositório git, commitar lá é opcional.
- Todos os scripts são ESM (`.mjs`). Rodar testes: `node --test caminho/arquivo.test.mjs`.
- **NUNCA** editar arquivos com `sed`/`echo`/heredoc — só `Write`/`Edit` (UTF-8).

## File Structure

```
~/.claude/skills/extrair-modelos-de-sentencas/
  SKILL.md                       # orquestração (Task 8)
  scripts/
    lib.mjs                      # helpers puros: normalize, isHeader, tokenize, cosine (Task 1)
    extract-fragments.mjs        # rawText → fragments[] (segmentação + placeholders) (Tasks 2-4)
    cluster.mjs                  # fragments/*.json → clusters.json + labeling-input.json (Task 5)
    build-models.mjs             # clusters.json + labels.json → modelos.json (Task 6)
    lib.test.mjs                 # (Task 1)
    extract-fragments.test.mjs   # (Tasks 2-4)
    cluster.test.mjs             # (Task 5)
    build-models.test.mjs        # (Task 6)
    fixtures/
      sentenca-exemplo.txt       # 1 sentença real, texto plano (Task 0)
      fragments-sample/          # fragments sintéticos p/ teste de cluster (Task 5)
  references/
    subagent-prompt.md           # template do subagente de download (Task 7)
```

### Diretório de trabalho de runtime (criado pela skill em execução, não agora)

```
{OUTPUT_DIR}/                    # default ~/Downloads/modelos-sentencify/
  raw/{processo}.txt             # texto plano de cada Doc (gravado pelos subagentes)
  fragments/{processo}.json      # fragmentos por doc (gerado por extract-fragments.mjs)
  clusters.json                  # clusters + canônico (gerado por cluster.mjs)
  labeling-input.json            # snippets capados p/ o LLM rotular (gerado por cluster.mjs)
  labels.json                    # rótulos gerados pelo LLM do pai
  modelos.json                   # SAÍDA FINAL importável (gerado por build-models.mjs)
```

### Estruturas de dados (contrato entre estágios)

**Fragment** (item de `fragments/{processo}.json`):
```json
{
  "processo": "0000031-34.2024.5.08.0130",
  "section": "MÉRITO",
  "header": "JUSTIÇA GRATUITA",
  "theme": "justica gratuita",
  "content": "…texto do capítulo com placeholders…",
  "outcomeKey": "deferid",
  "partyKey": "pessoa_fisica"
}
```

**Cluster** (item de `clusters.json`):
```json
{
  "id": "justica-gratuita__1",
  "theme": "justica gratuita",
  "headerSample": "JUSTIÇA GRATUITA",
  "memberCount": 73,
  "members": ["0000031-34.2024.5.08.0130", "…"],
  "canonicalProcesso": "0000792-46.2024.5.08.0201",
  "canonicalContent": "…texto completo do canônico…",
  "outcomeKey": "deferid",
  "partyKey": "pessoa_fisica",
  "topKeywords": ["gratuidade", "hipossuficiencia", "790"]
}
```

**Label** (item de `labels.json`, produzido pelo LLM):
```json
{ "id": "justica-gratuita__1", "title": "Justiça gratuita — pessoa física (deferida)", "category": "Justiça gratuita", "keywords": "gratuidade, art. 790 §3º CLT, hipossuficiência" }
```

**Modelo final** (item de `modelos.json`):
```json
{ "title": "…", "content": "…(=canonicalContent)…", "keywords": "…", "category": "…" }
```

---

## Task 0: Scaffold + fixture real

**Files:**
- Create: `~/.claude/skills/extrair-modelos-de-sentencas/scripts/fixtures/sentenca-exemplo.txt`
- Create dirs: `scripts/`, `scripts/fixtures/`, `references/`

- [ ] **Step 1: Criar a árvore de diretórios**

Run:
```bash
mkdir -p ~/.claude/skills/extrair-modelos-de-sentencas/scripts/fixtures/fragments-sample \
         ~/.claude/skills/extrair-modelos-de-sentencas/references
```

- [ ] **Step 2: Baixar 1 sentença real como fixture (texto plano)**

Usar a MCP do Drive para obter o texto plano do Doc conhecido
(`1hwUTgNd0n1OME5ugCF92v2u5jmDVjoLWSKD1SmS98O0` — sentença VALE/doença ocupacional)
e salvá-lo via `Write` em `scripts/fixtures/sentenca-exemplo.txt`.

Preferir uma extração **texto-plano com um parágrafo por linha** (ex.: `readGoogleDoc`
ou `downloadFile` exportando `text/plain`). Se só houver `getGoogleDocContent` (com
índices), o agente deve reconstruir o texto plano concatenando os spans na ordem,
inserindo `\n` nas fronteiras de parágrafo (cabeçalhos como `RELATÓRIO`,
`FUNDAMENTAÇÃO`, `INÉPCIA DA INICIAL`, etc. DEVEM ficar cada um em sua própria linha).

**Verificação manual:** o arquivo contém, cada um em sua linha, os cabeçalhos
`FUNDAMENTAÇÃO`, `PRELIMINAR`, `INÉPCIA DA INICIAL`, `PREJUDICIAL`,
`PRESCRIÇÃO QUINQUENAL`, `MÉRITO`, `DANOS MORAIS. DANOS MATERIAIS. DANOS ESTÉTICOS`,
`JUSTIÇA GRATUITA`, `HONORÁRIOS ADVOCATÍCIOS`, `JUROS E CORREÇÃO MONETÁRIA`,
`DEDUÇÕES DE NATUREZA PREVIDENCIÁRIA E FISCAL`, `DISPOSITIVO`.

Run (sanidade):
```bash
grep -nE '^(FUNDAMENTAÇÃO|DISPOSITIVO|JUSTIÇA GRATUITA)$' \
  ~/.claude/skills/extrair-modelos-de-sentencas/scripts/fixtures/sentenca-exemplo.txt
```
Expected: 3 linhas casando (uma de cada).

---

## Task 1: `lib.mjs` — helpers puros (normalize, isHeader, tokenize, cosine)

**Files:**
- Create: `scripts/lib.mjs`
- Test: `scripts/lib.test.mjs`

- [ ] **Step 1: Escrever os testes (falhando)**

`scripts/lib.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTheme, isHeader, tokenize, cosine } from './lib.mjs';

test('normalizeTheme: minúsculas, sem acento, espaços colapsados', () => {
  assert.equal(normalizeTheme('  JUSTIÇA   GRATUITA '), 'justica gratuita');
  assert.equal(normalizeTheme('PRESCRIÇÃO QUINQUENAL'), 'prescricao quinquenal');
});

test('isHeader: linha curta em caixa alta é cabeçalho', () => {
  assert.equal(isHeader('JUSTIÇA GRATUITA', 'texto anterior qualquer.'), true);
  assert.equal(isHeader('DANOS MORAIS. DANOS MATERIAIS. DANOS ESTÉTICOS', 'fim de parágrafo.'), true);
});

test('isHeader: parágrafo normal não é cabeçalho', () => {
  assert.equal(isHeader('A demandada alega a inépcia da inicial, porquanto...', 'x'), false);
});

test('isHeader: título de enunciado citado (prev termina com ":") é bloqueado', () => {
  assert.equal(isHeader('SUCUMBÊNCIA RECÍPROCA', 'O JUÍZO ARBITRARÁ... que estabelece:'), false);
  assert.equal(isHeader('CONCAUSALIDADE. MULTIPLICIDADE DE CAUSAS.', 'enunciado 10... que dispõe:'), false);
});

test('isHeader: linha em caps muito longa (ementa) não é cabeçalho', () => {
  const ementa = 'AGRAVO. AGRAVO DE INSTRUMENTO EM RECURSO DE REVISTA INTERPOSTO NA VIGÊNCIA DA LEI';
  assert.equal(isHeader(ementa, 'x'), false);
});

test('tokenize: remove acentos, stopwords e placeholders', () => {
  const toks = tokenize('A indenização por danos [VALOR] em [DATA] foi deferida');
  assert.ok(toks.includes('indenizacao'));
  assert.ok(toks.includes('danos'));
  assert.ok(toks.includes('deferida'));
  assert.ok(!toks.includes('a'));        // stopword
  assert.ok(!toks.includes('por'));      // stopword
  assert.ok(!toks.includes('valor'));    // placeholder removido
  assert.ok(!toks.includes('data'));     // placeholder removido
});

test('cosine: idêntico=1, ortogonal=0', () => {
  assert.equal(Math.round(cosine(['a','b','c'], ['a','b','c'])), 1);
  assert.equal(cosine(['a','b'], ['c','d']), 0);
});
```

- [ ] **Step 2: Rodar testes p/ confirmar que falham**

Run: `node --test ~/.claude/skills/extrair-modelos-de-sentencas/scripts/lib.test.mjs`
Expected: FAIL (`Cannot find module './lib.mjs'`).

- [ ] **Step 3: Implementar `lib.mjs`**

```js
// Helpers puros e determinísticos compartilhados pelo pipeline.

const ACCENTS = /[̀-ͯ]/g;
export const deaccent = (s) => s.normalize('NFD').replace(ACCENTS, '');

/** tema normalizado p/ agrupamento: minúsculas, sem acento, espaços colapsados */
export function normalizeTheme(s) {
  return deaccent(String(s || '')).toLowerCase().replace(/\s+/g, ' ').trim();
}

const UPPER = /[A-ZÀ-ÖØ-Þ]/;          // maiúsculas latinas (inclui acentuadas)
const LOWER = /[a-zà-öø-ÿ]/;          // minúsculas latinas (inclui acentuadas)
const LETTER = /[A-Za-zÀ-ÖØ-öø-ÿ]/;

/**
 * Heurística de cabeçalho: linha curta, em CAIXA ALTA, que NÃO seja título de
 * enunciado citado (parágrafo anterior termina em ":") nem início de citação.
 */
export function isHeader(line, prevNonEmptyLine) {
  const s = String(line || '').trim();
  if (s.length === 0 || s.length > 80) return false;
  if (/^["“]/.test(s)) return false;             // início de citação
  if (s.endsWith(':')) return false;             // a própria linha introduz algo
  const prev = String(prevNonEmptyLine || '').trim();
  if (prev.endsWith(':')) return false;          // enunciado/ementa citada
  let up = 0, lo = 0, letters = 0;
  for (const ch of s) {
    if (LETTER.test(ch)) { letters++; if (UPPER.test(ch)) up++; else if (LOWER.test(ch)) lo++; }
  }
  if (letters === 0) return false;
  return up / letters >= 0.9;                     // ≥90% das letras em maiúscula
}

const STOPWORDS = new Set((
  'a o e de da do das dos que com para por em no na nos nas um uma uns umas ' +
  'ao aos as os se sua seu suas seus ou nao sim ja sobre entre sem sob ate ' +
  'art arts inciso § lei clt cf tst stf cpc cc'
).split(/\s+/));
const PLACEHOLDERS = new Set(['valor', 'data', 'id', 'processo', 'fls']);

/** tokens p/ TF-IDF: minúsculas, sem acento, sem stopwords/placeholders, len≥3 */
export function tokenize(text) {
  return deaccent(String(text || '')).toLowerCase()
    .split(/[^a-z0-9§]+/)
    .filter(t => t.length >= 3 && !STOPWORDS.has(t) && !PLACEHOLDERS.has(t));
}

/** cosseno entre dois bags-of-words (arrays de tokens), com TF simples */
export function cosine(tokensA, tokensB) {
  const tf = (toks) => { const m = new Map(); for (const t of toks) m.set(t, (m.get(t) || 0) + 1); return m; };
  const A = tf(tokensA), B = tf(tokensB);
  let dot = 0; for (const [t, v] of A) if (B.has(t)) dot += v * B.get(t);
  const mag = (m) => Math.sqrt([...m.values()].reduce((s, v) => s + v * v, 0));
  const d = mag(A) * mag(B);
  return d === 0 ? 0 : dot / d;
}
```

- [ ] **Step 4: Rodar testes p/ confirmar verde**

Run: `node --test ~/.claude/skills/extrair-modelos-de-sentencas/scripts/lib.test.mjs`
Expected: PASS (todos os testes).

---

## Task 2: `extract-fragments.mjs` — segmentação por cabeçalho

**Files:**
- Create: `scripts/extract-fragments.mjs`
- Test: `scripts/extract-fragments.test.mjs`

- [ ] **Step 1: Escrever o teste de segmentação (falhando)** usando a fixture real

`scripts/extract-fragments.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { segment } from './extract-fragments.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const raw = readFileSync(join(__dir, 'fixtures', 'sentenca-exemplo.txt'), 'utf8');

test('segment: extrai capítulos só entre FUNDAMENTAÇÃO e DISPOSITIVO', () => {
  const chs = segment(raw);
  const headers = chs.map(c => c.header);
  assert.ok(headers.includes('INÉPCIA DA INICIAL'));
  assert.ok(headers.includes('PRESCRIÇÃO QUINQUENAL'));
  assert.ok(headers.includes('JUSTIÇA GRATUITA'));
  assert.ok(headers.includes('HONORÁRIOS ADVOCATÍCIOS'));
  assert.ok(headers.includes('JUROS E CORREÇÃO MONETÁRIA'));
  // RELATÓRIO fica de fora (antes de FUNDAMENTAÇÃO)
  assert.ok(!headers.includes('RELATÓRIO'));
  // marcadores estruturais não viram capítulo
  assert.ok(!headers.includes('PRELIMINAR'));
  assert.ok(!headers.includes('MÉRITO'));
  // título de enunciado citado NÃO vira capítulo
  assert.ok(!headers.includes('SUCUMBÊNCIA RECÍPROCA'));
  assert.ok(!headers.includes('CONCAUSALIDADE. MULTIPLICIDADE DE CAUSAS.'));
});

test('segment: marca a seção estrutural de cada capítulo', () => {
  const chs = segment(raw);
  const inepcia = chs.find(c => c.header === 'INÉPCIA DA INICIAL');
  assert.equal(inepcia.section, 'PRELIMINAR');
  const prescricao = chs.find(c => c.header === 'PRESCRIÇÃO QUINQUENAL');
  assert.equal(prescricao.section, 'PREJUDICIAL');
});

test('segment: corpo do capítulo é não-trivial', () => {
  const chs = segment(raw);
  for (const c of chs) assert.ok(c.body.length > 120, `corpo curto: ${c.header}`);
});
```

- [ ] **Step 2: Rodar p/ confirmar que falha**

Run: `node --test ~/.claude/skills/extrair-modelos-de-sentencas/scripts/extract-fragments.test.mjs`
Expected: FAIL (`segment` não exportado).

- [ ] **Step 3: Implementar `segment()` em `extract-fragments.mjs`**

```js
import { isHeader, normalizeTheme } from './lib.mjs';

const SECTION_MARKERS = new Set(['PRELIMINAR', 'PREJUDICIAL', 'MÉRITO', 'MERITO', 'PRELIMINARES']);
const START = 'FUNDAMENTAÇÃO';
const END = 'DISPOSITIVO';

/**
 * Recorta a faixa entre FUNDAMENTAÇÃO e DISPOSITIVO e a fatia em capítulos
 * por cabeçalho. Marcadores estruturais (PRELIMINAR/PREJUDICIAL/MÉRITO) viram
 * contexto (`section`), não capítulos. Retorna [{section, header, body}].
 */
export function segment(rawText) {
  const lines = String(rawText).replace(/\r\n?/g, '\n').split('\n').map(l => l.trim());
  const eq = (l) => l.normalize('NFC');
  let startIdx = lines.findIndex(l => eq(l) === START);
  let endIdx = lines.findIndex(l => eq(l) === END);
  if (startIdx === -1) startIdx = 0;
  if (endIdx === -1 || endIdx < startIdx) endIdx = lines.length;

  const chapters = [];
  let section = null;
  let current = null;
  let prevNonEmpty = '';

  for (let i = startIdx + 1; i < endIdx; i++) {
    const line = lines[i];
    if (line.length === 0) continue;
    if (isHeader(line, prevNonEmpty)) {
      const up = line.normalize('NFC');
      if (SECTION_MARKERS.has(up)) {
        section = up === 'MERITO' ? 'MÉRITO' : (up === 'PRELIMINARES' ? 'PRELIMINAR' : up);
      } else {
        if (current) chapters.push(current);
        current = { section, header: line, bodyLines: [] };
      }
    } else if (current) {
      current.bodyLines.push(line);
    }
    prevNonEmpty = line;
  }
  if (current) chapters.push(current);

  return chapters
    .map(c => ({ section: c.section, header: c.header, body: c.bodyLines.join('\n\n').trim() }))
    .filter(c => c.body.length > 120);
}
```

- [ ] **Step 4: Rodar p/ confirmar verde**

Run: `node --test ~/.claude/skills/extrair-modelos-de-sentencas/scripts/extract-fragments.test.mjs`
Expected: PASS.

---

## Task 3: `extract-fragments.mjs` — placeholders + sinais de variante

**Files:**
- Modify: `scripts/extract-fragments.mjs`
- Test: `scripts/extract-fragments.test.mjs` (adicionar casos)

- [ ] **Step 1: Adicionar testes (falhando)** ao final de `extract-fragments.test.mjs`

```js
import { applyPlaceholders, detectSignals } from './extract-fragments.mjs';

test('applyPlaceholders: troca IDs, datas, valores, processo, fls', () => {
  const out = applyPlaceholders(
    'Juntou documentos (ID 4a8ddd4), em 03/11/2010, valor de R$ 570.000,00, ' +
    'fls. 1.808, autos 0000792-31.2021.5.13.0001.'
  );
  assert.ok(out.includes('[ID]'));
  assert.ok(out.includes('[DATA]'));
  assert.ok(out.includes('[VALOR]'));
  assert.ok(out.includes('[FLS]'));
  assert.ok(out.includes('[PROCESSO]'));
  assert.ok(!/4a8ddd4|03\/11\/2010|570\.000|0000792-31/.test(out));
});

test('applyPlaceholders: percentuais NÃO são tocados (ex. honorários 10%)', () => {
  assert.ok(applyPlaceholders('arbitram-se honorários de 10% sobre o valor').includes('10%'));
});

test('detectSignals: desfecho e tipo de parte', () => {
  assert.equal(detectSignals('julgo improcedente o pedido').outcomeKey, 'improcedente');
  assert.equal(detectSignals('rejeito a preliminar').outcomeKey, 'rejeit');
  assert.equal(detectSignals('defere-se os benefícios da gratuidade').outcomeKey, 'deferid');
  assert.equal(detectSignals('a reclamada, ora massa falida, ...').partyKey, 'massa_falida');
  assert.equal(detectSignals('sendo a ré fazenda pública municipal').partyKey, 'fazenda_publica');
  assert.equal(detectSignals('texto neutro qualquer').partyKey, 'padrao');
});
```

- [ ] **Step 2: Rodar p/ confirmar que falha**

Run: `node --test ~/.claude/skills/extrair-modelos-de-sentencas/scripts/extract-fragments.test.mjs`
Expected: FAIL (`applyPlaceholders`/`detectSignals` não exportados).

- [ ] **Step 3: Adicionar `applyPlaceholders()` e `detectSignals()` em `extract-fragments.mjs`**

```js
/** Substitui especificidades do caso por placeholders. Ordem importa. */
export function applyPlaceholders(text) {
  return String(text)
    .replace(/\b\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}\b/g, '[PROCESSO]')
    .replace(/\bID\s+[0-9a-f]{6,}\b/gi, '[ID]')
    .replace(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/g, '[DATA]')
    .replace(/R\$\s?\d[\d.]*(?:,\d{2})?/g, '[VALOR]')
    .replace(/\bfls?\.\s?\d+(?:\.\d+)?/gi, '[FLS]');
}

import { deaccent } from './lib.mjs';

/**
 * Sinais que FORÇAM separação de variantes no clustering (além da similaridade):
 * desfecho (procedente/improcedente/...) e tipo de parte (massa falida/fazenda/PJ).
 */
export function detectSignals(text) {
  const t = deaccent(String(text)).toLowerCase();
  const outcomeOrder = ['improcedente', 'procedente', 'indeferid', 'deferid', 'acolh', 'rejeit', 'sem nexo', 'concausa', 'nexo direto'];
  let outcomeKey = null;
  for (const k of outcomeOrder) { if (t.includes(k)) { outcomeKey = k; break; } }
  let partyKey = 'padrao';
  if (t.includes('massa falida')) partyKey = 'massa_falida';
  else if (t.includes('fazenda publica')) partyKey = 'fazenda_publica';
  else if (t.includes('pessoa juridica')) partyKey = 'pessoa_juridica';
  return { outcomeKey, partyKey };
}
```

- [ ] **Step 4: Rodar p/ confirmar verde**

Run: `node --test ~/.claude/skills/extrair-modelos-de-sentencas/scripts/extract-fragments.test.mjs`
Expected: PASS (todos).

---

## Task 4: `extract-fragments.mjs` — CLI (rawText em disco → fragments JSON)

**Files:**
- Modify: `scripts/extract-fragments.mjs` (adicionar `buildFragments()` + bloco CLI)
- Test: `scripts/extract-fragments.test.mjs` (adicionar caso de `buildFragments`)

- [ ] **Step 1: Adicionar teste (falhando)**

```js
import { buildFragments } from './extract-fragments.mjs';

test('buildFragments: monta fragmentos completos a partir do texto bruto', () => {
  const frags = buildFragments(raw, '0000031-34.2024.5.08.0130');
  assert.ok(frags.length >= 5);
  const f = frags.find(x => x.header === 'JUSTIÇA GRATUITA');
  assert.equal(f.processo, '0000031-34.2024.5.08.0130');
  assert.equal(f.theme, 'justica gratuita');
  assert.ok(typeof f.content === 'string' && f.content.length > 120);
  assert.ok('outcomeKey' in f && 'partyKey' in f);
});
```

- [ ] **Step 2: Rodar p/ confirmar que falha**

Run: `node --test ~/.claude/skills/extrair-modelos-de-sentencas/scripts/extract-fragments.test.mjs`
Expected: FAIL (`buildFragments` não exportado).

- [ ] **Step 3: Adicionar `buildFragments()` + CLI em `extract-fragments.mjs`**

```js
/** Pipeline por documento: texto bruto → fragmentos com placeholders + sinais. */
export function buildFragments(rawText, processo) {
  return segment(rawText).map(ch => {
    const content = applyPlaceholders(ch.body);
    const { outcomeKey, partyKey } = detectSignals(ch.body);
    return { processo, section: ch.section, header: ch.header, theme: normalizeTheme(ch.header), content, outcomeKey, partyKey };
  });
}

// CLI: node extract-fragments.mjs <rawDir> <fragmentsDir>
// Lê cada <rawDir>/<processo>.txt e grava <fragmentsDir>/<processo>.json
if (import.meta.url === `file://${process.argv[1]}`) {
  const { readdirSync, readFileSync, writeFileSync, mkdirSync } = await import('node:fs');
  const { join, basename } = await import('node:path');
  const [rawDir, outDir] = process.argv.slice(2);
  if (!rawDir || !outDir) { console.error('uso: extract-fragments.mjs <rawDir> <fragmentsDir>'); process.exit(1); }
  mkdirSync(outDir, { recursive: true });
  const files = readdirSync(rawDir).filter(f => f.endsWith('.txt'));
  let total = 0;
  for (const f of files) {
    const processo = basename(f, '.txt');
    const frags = buildFragments(readFileSync(join(rawDir, f), 'utf8'), processo);
    writeFileSync(join(outDir, `${processo}.json`), JSON.stringify(frags, null, 2));
    total += frags.length;
    console.log(`${processo}: ${frags.length} fragmentos`);
  }
  console.log(`\nTotal: ${total} fragmentos de ${files.length} sentenças`);
}
```

- [ ] **Step 4: Rodar testes + smoke da CLI**

Run: `node --test ~/.claude/skills/extrair-modelos-de-sentencas/scripts/extract-fragments.test.mjs`
Expected: PASS.

Smoke CLI (usa a fixture como se fosse 1 doc baixado):
```bash
cd ~/.claude/skills/extrair-modelos-de-sentencas/scripts && \
mkdir -p /tmp/efs-smoke/raw && cp fixtures/sentenca-exemplo.txt /tmp/efs-smoke/raw/0000031-34.2024.5.08.0130.txt && \
node extract-fragments.mjs /tmp/efs-smoke/raw /tmp/efs-smoke/fragments && \
node -e "const a=require('/tmp/efs-smoke/fragments/0000031-34.2024.5.08.0130.json'); console.log('OK', a.length, 'fragmentos')"
```
Expected: imprime `OK <n> fragmentos` com n ≥ 5.

---

## Task 5: `cluster.mjs` — agrupar por tema + variantes (TF-IDF)

**Files:**
- Create: `scripts/cluster.mjs`
- Test: `scripts/cluster.test.mjs`
- Create fixtures: `scripts/fixtures/fragments-sample/*.json`

- [ ] **Step 1: Criar fragmentos sintéticos de teste** (via `Write`)

`scripts/fixtures/fragments-sample/proc-a.json`:
```json
[
  {"processo":"proc-a","section":"MÉRITO","header":"JUSTIÇA GRATUITA","theme":"justica gratuita","content":"À luz do art. 790 da CLT, defere-se ao reclamante pessoa física os benefícios da gratuidade da justiça mediante simples declaração de hipossuficiência em [DATA].","outcomeKey":"deferid","partyKey":"padrao"},
  {"processo":"proc-a","section":"MÉRITO","header":"DANOS MORAIS","theme":"danos morais","content":"Comprovado o nexo de concausa pela prova pericial, julgo procedente o pedido de indenização por danos morais no valor de [VALOR].","outcomeKey":"procedente","partyKey":"padrao"}
]
```

`scripts/fixtures/fragments-sample/proc-b.json`:
```json
[
  {"processo":"proc-b","section":"MÉRITO","header":"JUSTIÇA GRATUITA","theme":"justica gratuita","content":"Nos termos do art. 790 da CLT, defere-se ao reclamante pessoa física os benefícios da gratuidade da justiça mediante simples declaração de hipossuficiência em [DATA].","outcomeKey":"deferid","partyKey":"padrao"},
  {"processo":"proc-b","section":"MÉRITO","header":"DANOS MORAIS","theme":"danos morais","content":"Ausente prova do nexo causal entre a doença e o trabalho, julgo improcedente o pedido de indenização por danos morais formulado pelo autor.","outcomeKey":"improcedente","partyKey":"padrao"}
]
```

`scripts/fixtures/fragments-sample/proc-c.json`:
```json
[
  {"processo":"proc-c","section":"MÉRITO","header":"JUSTIÇA GRATUITA","theme":"justica gratuita","content":"Tratando-se de reclamada em estado de massa falida, defere-se a gratuidade à massa nos termos da Súmula 86 do TST e do art. 790 da CLT.","outcomeKey":"deferid","partyKey":"massa_falida"}
]
```

- [ ] **Step 2: Escrever o teste de clustering (falhando)**

`scripts/cluster.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { clusterFragments } from './cluster.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const dir = join(__dir, 'fixtures', 'fragments-sample');
const frags = readdirSync(dir).flatMap(f => JSON.parse(readFileSync(join(dir, f), 'utf8')));

test('justiça gratuita: pessoa física quase-idêntica funde; massa falida separa', () => {
  const clusters = clusterFragments(frags, { threshold: 0.6 }).filter(c => c.theme === 'justica gratuita');
  // proc-a e proc-b (pessoa física, quase idênticos) → 1 cluster; proc-c (massa falida) → outro
  assert.equal(clusters.length, 2);
  const pf = clusters.find(c => c.partyKey === 'padrao');
  const mf = clusters.find(c => c.partyKey === 'massa_falida');
  assert.equal(pf.memberCount, 2);
  assert.equal(mf.memberCount, 1);
});

test('danos morais: procedente e improcedente NÃO fundem (sinal de desfecho)', () => {
  const clusters = clusterFragments(frags, { threshold: 0.3 }).filter(c => c.theme === 'danos morais');
  assert.equal(clusters.length, 2);
  const keys = clusters.map(c => c.outcomeKey).sort();
  assert.deepEqual(keys, ['improcedente', 'procedente']);
});

test('cada cluster tem canônico (mais longo), id, topKeywords', () => {
  const clusters = clusterFragments(frags, { threshold: 0.6 });
  for (const c of clusters) {
    assert.ok(typeof c.id === 'string' && c.id.length > 0);
    assert.ok(typeof c.canonicalContent === 'string' && c.canonicalContent.length > 0);
    assert.ok(Array.isArray(c.topKeywords));
    // canônico = membro de maior conteúdo
    assert.ok(c.canonicalContent.length >= 1);
  }
});
```

- [ ] **Step 3: Rodar p/ confirmar que falha**

Run: `node --test ~/.claude/skills/extrair-modelos-de-sentencas/scripts/cluster.test.mjs`
Expected: FAIL (`clusterFragments` não exportado).

- [ ] **Step 4: Implementar `cluster.mjs`**

```js
import { tokenize, cosine } from './lib.mjs';

/** slug ASCII p/ ids de cluster */
const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/**
 * Agrupa fragmentos por tema; dentro do tema, separa por (outcomeKey, partyKey)
 * e por similaridade TF-IDF (greedy). Membros só fundem se mesmos sinais E
 * cosseno ≥ threshold. Canônico = membro de maior conteúdo.
 */
export function clusterFragments(fragments, { threshold = 0.82 } = {}) {
  const byTheme = new Map();
  for (const f of fragments) {
    if (!byTheme.has(f.theme)) byTheme.set(f.theme, []);
    byTheme.get(f.theme).push({ ...f, _tokens: tokenize(f.content) });
  }
  const out = [];
  for (const [theme, items] of byTheme) {
    const buckets = []; // {members:[item], outcomeKey, partyKey}
    for (const it of items) {
      let placed = null;
      for (const b of buckets) {
        if (b.outcomeKey !== (it.outcomeKey ?? null)) continue;
        if (b.partyKey !== it.partyKey) continue;
        // compara com o representante atual (mais longo) do bucket
        const rep = b.members.reduce((a, c) => (c.content.length > a.content.length ? c : a));
        if (cosine(rep._tokens, it._tokens) >= threshold) { placed = b; break; }
      }
      if (placed) placed.members.push(it);
      else buckets.push({ members: [it], outcomeKey: it.outcomeKey ?? null, partyKey: it.partyKey });
    }
    buckets.forEach((b, i) => {
      const canon = b.members.reduce((a, c) => (c.content.length > a.content.length ? c : a));
      // topKeywords: termos mais frequentes no canônico
      const freq = new Map();
      for (const t of canon._tokens) freq.set(t, (freq.get(t) || 0) + 1);
      const topKeywords = [...freq.entries()].sort((a, c) => c[1] - a[1]).slice(0, 8).map(e => e[0]);
      out.push({
        id: `${slug(theme)}__${i + 1}`,
        theme,
        headerSample: canon.header,
        memberCount: b.members.length,
        members: b.members.map(m => m.processo),
        canonicalProcesso: canon.processo,
        canonicalContent: canon.content,
        outcomeKey: b.outcomeKey,
        partyKey: b.partyKey,
        topKeywords,
      });
    });
  }
  return out;
}

// CLI: node cluster.mjs <fragmentsDir> <outDir> [threshold]
if (import.meta.url === `file://${process.argv[1]}`) {
  const { readdirSync, readFileSync, writeFileSync, mkdirSync } = await import('node:fs');
  const { join } = await import('node:path');
  const [fragDir, outDir, thrArg] = process.argv.slice(2);
  if (!fragDir || !outDir) { console.error('uso: cluster.mjs <fragmentsDir> <outDir> [threshold]'); process.exit(1); }
  mkdirSync(outDir, { recursive: true });
  const frags = readdirSync(fragDir).filter(f => f.endsWith('.json'))
    .flatMap(f => JSON.parse(readFileSync(join(fragDir, f), 'utf8')));
  const clusters = clusterFragments(frags, { threshold: thrArg ? Number(thrArg) : 0.82 });
  writeFileSync(join(outDir, 'clusters.json'), JSON.stringify(clusters, null, 2));
  // labeling-input: snippet capado p/ o LLM rotular sem ler tudo
  const labelingInput = clusters.map(c => ({
    id: c.id, header: c.headerSample, theme: c.theme, memberCount: c.memberCount,
    outcomeKey: c.outcomeKey, partyKey: c.partyKey, topKeywords: c.topKeywords,
    snippet: c.canonicalContent.slice(0, 600),
  }));
  writeFileSync(join(outDir, 'labeling-input.json'), JSON.stringify(labelingInput, null, 2));
  console.log(`${clusters.length} clusters de ${frags.length} fragmentos → clusters.json + labeling-input.json`);
}
```

- [ ] **Step 5: Rodar p/ confirmar verde**

Run: `node --test ~/.claude/skills/extrair-modelos-de-sentencas/scripts/cluster.test.mjs`
Expected: PASS.

---

## Task 6: `build-models.mjs` — clusters + labels → `modelos.json`

**Files:**
- Create: `scripts/build-models.mjs`
- Test: `scripts/build-models.test.mjs`

- [ ] **Step 1: Escrever o teste (falhando)**

`scripts/build-models.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildModels } from './build-models.mjs';

const clusters = [
  { id: 'justica-gratuita__1', theme: 'justica gratuita', headerSample: 'JUSTIÇA GRATUITA', canonicalContent: 'corpo gratuidade', topKeywords: ['gratuidade', '790'] },
  { id: 'danos-morais__1', theme: 'danos morais', headerSample: 'DANOS MORAIS', canonicalContent: 'corpo danos', topKeywords: ['danos', 'concausa'] },
];
const labels = [
  { id: 'justica-gratuita__1', title: 'Justiça gratuita — pessoa física (deferida)', category: 'Justiça gratuita', keywords: 'gratuidade, art. 790 CLT' },
  // danos-morais__1 SEM label → usa fallback
];

test('buildModels: junta label ao canônico; usa fallback quando falta label', () => {
  const models = buildModels(clusters, labels);
  assert.equal(models.length, 2);
  const m1 = models.find(m => m.content === 'corpo gratuidade');
  assert.equal(m1.title, 'Justiça gratuita — pessoa física (deferida)');
  assert.equal(m1.category, 'Justiça gratuita');
  assert.equal(m1.keywords, 'gratuidade, art. 790 CLT');
  const m2 = models.find(m => m.content === 'corpo danos');
  // fallback: title do headerSample, keywords das topKeywords, category do tema capitalizado
  assert.equal(m2.title, 'DANOS MORAIS');
  assert.equal(m2.keywords, 'danos, concausa');
  assert.ok(typeof m2.category === 'string' && m2.category.length > 0);
});

test('buildModels: saída só tem os 4 campos do schema importável', () => {
  const models = buildModels(clusters, labels);
  for (const m of models) {
    assert.deepEqual(Object.keys(m).sort(), ['category', 'content', 'keywords', 'title']);
  }
});
```

- [ ] **Step 2: Rodar p/ confirmar que falha**

Run: `node --test ~/.claude/skills/extrair-modelos-de-sentencas/scripts/build-models.test.mjs`
Expected: FAIL (`buildModels` não exportado).

- [ ] **Step 3: Implementar `build-models.mjs`**

```js
const cap = (s) => s.replace(/\b\w/, c => c.toUpperCase());

/** Junta cada cluster ao seu label (por id). Faltando label, usa fallback determinístico. */
export function buildModels(clusters, labels) {
  const byId = new Map(labels.map(l => [l.id, l]));
  return clusters.map(c => {
    const l = byId.get(c.id) || {};
    return {
      title: l.title || c.headerSample,
      content: c.canonicalContent,
      keywords: l.keywords || (c.topKeywords || []).join(', '),
      category: l.category || cap(c.theme),
    };
  });
}

// CLI: node build-models.mjs <clusters.json> <labels.json> <modelos.json>
if (import.meta.url === `file://${process.argv[1]}`) {
  const { readFileSync, writeFileSync, existsSync } = await import('node:fs');
  const [clustersPath, labelsPath, outPath] = process.argv.slice(2);
  if (!clustersPath || !outPath) { console.error('uso: build-models.mjs <clusters.json> <labels.json> <modelos.json>'); process.exit(1); }
  const clusters = JSON.parse(readFileSync(clustersPath, 'utf8'));
  const labels = labelsPath && existsSync(labelsPath) ? JSON.parse(readFileSync(labelsPath, 'utf8')) : [];
  const models = buildModels(clusters, labels);
  writeFileSync(outPath, JSON.stringify(models, null, 2));
  console.log(`${models.length} modelos → ${outPath}`);
}
```

- [ ] **Step 4: Rodar p/ confirmar verde + smoke do pipeline completo**

Run: `node --test ~/.claude/skills/extrair-modelos-de-sentencas/scripts/build-models.test.mjs`
Expected: PASS.

Smoke pipeline (fragments-sample → modelos.json, sem labels):
```bash
cd ~/.claude/skills/extrair-modelos-de-sentencas/scripts && \
node cluster.mjs fixtures/fragments-sample /tmp/efs-smoke 0.6 && \
node build-models.mjs /tmp/efs-smoke/clusters.json /tmp/efs-smoke/labels.json /tmp/efs-smoke/modelos.json && \
node -e "const m=require('/tmp/efs-smoke/modelos.json'); console.log('modelos:', m.length); console.log(m.map(x=>x.title))"
```
Expected: imprime a lista de modelos (≥ 3: justiça gratuita ×1 pessoa física, ×1 massa falida, danos morais procedente/improcedente).

- [ ] **Step 5: Rodar a suíte inteira (checkpoint final dos scripts)**

Run: `node --test ~/.claude/skills/extrair-modelos-de-sentencas/scripts/`
Expected: todos os arquivos `*.test.mjs` PASS.

---

## Task 7: `references/subagent-prompt.md` — template do subagente de download

**Files:**
- Create: `references/subagent-prompt.md`

- [ ] **Step 1: Escrever o template** (via `Write`)

Conteúdo:
```markdown
# Template do subagente — download de sentenças (Google Docs → texto plano)

Cada subagente baixa um LOTE de sentenças (Google Docs) e grava o texto plano de
cada uma em disco. O subagente NÃO interpreta nem resume — só extrai texto fiel.
O isolamento de contexto é o ponto: o texto bruto fica no subagente, não no pai.

## Variáveis
- `{{DOCS}}` — lista de `{ processo, documentId }` deste lote
- `{{RAW_DIR}}` — diretório onde gravar (`{OUTPUT_DIR}/raw`)

## Configurações do Agent call
```
subagent_type: "general-purpose"
run_in_background: true
description: "Download lote {{N}} ({{QTD}} sentenças)"
```

## Corpo do prompt
```
Você é um subagente de EXTRAÇÃO DE TEXTO. Sua tarefa é baixar o texto plano de
cada Google Doc abaixo e gravá-lo em disco, fielmente, sem resumir nem alterar.

Documentos (processo → documentId):
{{LISTA_DOCS}}

Diretório de saída: {{RAW_DIR}}

Para CADA documento:
1. Obtenha o texto plano do Doc via a MCP do Google Drive. Prefira uma extração
   texto-plano com UM PARÁGRAFO POR LINHA (ex.: readGoogleDoc; ou downloadFile
   exportando text/plain). Se só houver getGoogleDocContent (com índices),
   reconstrua o texto plano concatenando os spans na ordem e inserindo \n nas
   fronteiras de parágrafo — cabeçalhos (RELATÓRIO, FUNDAMENTAÇÃO, MÉRITO,
   DISPOSITIVO, e os títulos de capítulo) DEVEM ficar cada um em sua própria linha.
2. VALIDE que é uma sentença: o texto contém "FUNDAMENTAÇÃO" e "DISPOSITIVO".
   Se NÃO contiver (é prova oral/análise/outro), PULE o documento e registre no retorno.
3. Grave o texto em {{RAW_DIR}}/<processo>.txt usando a ferramenta Write (UTF-8).
   NÃO use sed/echo/heredoc.

NÃO cole o conteúdo dos documentos no seu retorno.

Retorno (curto): para cada documento, uma linha "<processo>: OK <n_chars>" ou
"<processo>: PULADO (não é sentença)".
```
```

- [ ] **Step 2: Verificação**

Run: `test -f ~/.claude/skills/extrair-modelos-de-sentencas/references/subagent-prompt.md && echo OK`
Expected: `OK`.

---

## Task 8: `SKILL.md` — orquestração

**Files:**
- Create: `SKILL.md`

- [ ] **Step 1: Escrever `SKILL.md`** (via `Write`)

Conteúdo:
```markdown
---
name: extrair-modelos-de-sentencas
description: Use when o usuário quiser transformar uma pasta de sentenças finalizadas (Google Docs no Drive, ex. SENTENÇAS_NOHLACK_TRT8) em uma base de MODELOS importáveis no Sentencify — fragmentos reutilizáveis por tema, com placeholders, sem repetidos. Aplica-se a pedidos como "lê minhas últimas N sentenças e cria modelos", "gera modelos importáveis a partir das sentenças da pasta X", "extrai modelos das minhas decisões". NÃO usar para analisar inicial/contestação (use analise-inicial-contestacao) nem prova oral.
---

# Extrair modelos de sentenças (Google Docs → modelos.json importável)

## Visão geral

Pipeline de 5 estágios que transforma uma pasta de sentenças (uma subpasta por
processo, cada uma com 1 Google Doc) em um `modelos.json` importável pela tela de
modelos do Sentencify: fragmentos por tema/capítulo, com placeholders
(`[DATA]`, `[VALOR]`, `[ID]`, `[PROCESSO]`, `[FLS]`), deduplicados por similaridade
mantendo variantes legítimas (desfecho, tipo de parte).

**Princípio central:** o agente pai NUNCA lê o texto bruto das sentenças.
Subagentes (em lote) baixam o texto e gravam em disco; scripts Node determinísticos
(`scripts/`) fazem segmentação, placeholders e clustering; o LLM do pai só entra
para rotular os clusters (título/keywords/categoria).

## Pré-requisitos
- MCP `google-drive-mcp` autenticado (conta com acesso à pasta de sentenças).
- Node.js disponível (`node --version`).
- App Sentencify para o import final (tela de modelos → importar JSON).

## Parâmetros (perguntar ao usuário se não informados)
- Pasta-alvo (default: `SENTENÇAS_NOHLACK_TRT8`)
- N — quantidade de sentenças mais recentes (default: 100)
- OUTPUT_DIR (default: `~/Downloads/modelos-sentencify`)
- Limiar de similaridade do clustering (default: 0.82)
- Tamanho do lote por subagente (default: 10)

## Metodologia

### Etapa 1 — Inventário (pai, via MCP — SEM ler conteúdo)
1. `search`/`listFolder` para achar a pasta-alvo e paginar TODAS as subpastas.
2. Em cada subpasta, listar os Google Docs (mimeType `application/vnd.google-apps.document`)
   com `createdTime`. Caso comum: 1 doc por subpasta (= a sentença).
   - Se a subpasta tiver vários docs, incluir todos como candidatos — o subagente
     descarta os que não forem sentença (Etapa 3).
3. Ordenar os docs por `createdTime` (desc) e pegar os N mais recentes.
   Montar a lista `{ processo (nome da subpasta), documentId }`.
   - **Não** abrir o conteúdo dos docs no pai.

### Etapa 2 — Preparar diretórios e tasks
```bash
mkdir -p {OUTPUT_DIR}/raw {OUTPUT_DIR}/fragments
```
Criar tasks (`TaskCreate`): uma por LOTE de download + uma de processamento final.

### Etapa 3 — Despachar subagentes de download (PARALELO, em lotes)
- Particionar os N docs em lotes de `batchSize` (default 10).
- Para cada lote, despachar UM `Agent` (todos numa ÚNICA mensagem, vários tool uses,
  `run_in_background: true`) usando o template `references/subagent-prompt.md`.
- Cada subagente grava `{OUTPUT_DIR}/raw/<processo>.txt` e retorna 1 linha por doc.
- Aguardar as notificações do harness. **NÃO** fazer polling/sleep. **NÃO** ler os
  arquivos `raw/*.txt` no pai.

### Etapa 4 — Extrair fragmentos (pai, via SCRIPT — sem contexto)
```bash
node ~/.claude/skills/extrair-modelos-de-sentencas/scripts/extract-fragments.mjs \
  {OUTPUT_DIR}/raw {OUTPUT_DIR}/fragments
```
Gera `{OUTPUT_DIR}/fragments/<processo>.json`. O pai só lê o resumo no stdout.

### Etapa 5 — Clusterizar (pai, via SCRIPT)
```bash
node ~/.claude/skills/extrair-modelos-de-sentencas/scripts/cluster.mjs \
  {OUTPUT_DIR}/fragments {OUTPUT_DIR} {THRESHOLD}
```
Gera `{OUTPUT_DIR}/clusters.json` e `{OUTPUT_DIR}/labeling-input.json`.

### Etapa 6 — Rotular clusters (LLM do pai — único passo de juízo)
1. Ler `{OUTPUT_DIR}/labeling-input.json` (só snippets capados — leve).
2. Para CADA cluster, gerar `{ id, title, category, keywords }`:
   - `category` = nome do TEMA (ex.: "Danos morais", "Prescrição", "Justiça gratuita").
   - `title` = tema + variante quando houver (use `outcomeKey`/`partyKey`/`snippet`):
     ex. "Danos morais — procedente (concausa)", "Justiça gratuita — massa falida",
     "Juros e correção — Fazenda Pública", "Prescrição — rejeitada (actio nata)".
   - `keywords` = 4-8 termos jurídicos (parta de `topKeywords`, refine).
3. Gravar o array em `{OUTPUT_DIR}/labels.json` via `Write` (JSON válido, UTF-8).

### Etapa 7 — Montar `modelos.json` (pai, via SCRIPT)
```bash
node ~/.claude/skills/extrair-modelos-de-sentencas/scripts/build-models.mjs \
  {OUTPUT_DIR}/clusters.json {OUTPUT_DIR}/labels.json {OUTPUT_DIR}/modelos.json
```

### Etapa 8 — Reportar ao usuário
- Caminho do `modelos.json` e quantos modelos foram gerados.
- Quebra por tema/variante (quantos modelos por tema).
- Instrução de import: app Sentencify → tela de Modelos → Importar → selecionar
  `modelos.json`. O app gera `id` e regenera `embedding`; como a saída já vem
  deduplicada, o dedup do import não atrapalha.

## Saída (schema importável)
Array `[{ title, content, keywords, category }]` — sem `id`/`embedding`
(o app gera no import: `useExportImport.importModels`).

## Cuidados / red flags
- **Não ler texto bruto nem fragments no pai.** Só stdout dos scripts e o
  `labeling-input.json` (capado).
- **Não despachar subagentes em sequência.** Uma mensagem, N tool uses paralelos.
- **JSON estritamente válido** em `labels.json` (sem trailing comma, sem comentário).
- **Editar arquivos só com Write/Edit** (UTF-8); nunca sed/echo/heredoc.
- O `outcomeKey`/`partyKey` é o que separa variantes — confira no rótulo se o
  título reflete a variante real do `snippet`.

## Quick reference
| Etapa | Quem | O quê |
|-------|------|-------|
| Inventário | pai (MCP) | listar subpastas, achar Docs, ordenar por createdTime, top-N |
| Download | subagentes (paralelo) | gravar raw/<processo>.txt (texto plano) |
| Fragmentos | pai (script) | extract-fragments.mjs → fragments/*.json |
| Clusters | pai (script) | cluster.mjs → clusters.json + labeling-input.json |
| Rótulos | pai (LLM) | labeling-input.json → labels.json |
| Modelos | pai (script) | build-models.mjs → modelos.json |
| Reportar | pai | instruir import no app |
```

- [ ] **Step 2: Verificação**

Run: `head -5 ~/.claude/skills/extrair-modelos-de-sentencas/SKILL.md`
Expected: frontmatter com `name: extrair-modelos-de-sentencas`.

---

## Task 9: Validação ponta-a-ponta com dados reais (3 sentenças)

**Files:** nenhum (execução real da skill em escala reduzida)

- [ ] **Step 1: Rodar a skill com N=3** na pasta real `SENTENÇAS_NOHLACK_TRT8`,
  OUTPUT_DIR=`/tmp/efs-e2e`, batchSize=3 (1 subagente baixa as 3).

- [ ] **Step 2: Conferir os artefatos**

Run:
```bash
ls -1 /tmp/efs-e2e/raw /tmp/efs-e2e/fragments && \
node -e "const m=require('/tmp/efs-e2e/modelos.json'); console.log('modelos:', m.length); console.log(m.map(x=>({t:x.title,c:x.category}))); console.log('amostra content:', m[0].content.slice(0,200))"
```
Expected:
- `raw/` com 3 `.txt`, `fragments/` com 3 `.json`.
- `modelos.json` com modelos coerentes: `category` = nome do tema, `title`
  descritivo (com variante quando houver), `content` com placeholders visíveis
  (`[DATA]`/`[VALOR]`/`[ID]`), sem IDs/datas/valores crus vazando.

- [ ] **Step 3: Conferência de qualidade (leitura humana de 2-3 modelos)**
  Abrir 2-3 itens do `modelos.json` e confirmar: capítulo íntegro (raciocínio
  completo), placeholders nos lugares certos, nenhum cabeçalho falso virou modelo,
  nenhum trecho de RELATÓRIO/DISPOSITIVO presente.

- [ ] **Step 4 (opcional, com o usuário): import real** de um `modelos.json` pequeno
  no app para confirmar que a tela de modelos aceita o schema.

---

## Self-Review (preenchido pelo autor do plano)

**Cobertura do spec:**
- Seleção/últimas N → Task 8 Etapa 1. ✓
- Segmentação por cabeçalho (faixa FUNDAMENTAÇÃO→DISPOSITIVO, marcadores como
  contexto) → Tasks 2. ✓
- Placeholders (regex; desfecho preservado) → Task 3. ✓
- Clustering TF-IDF + variantes por desfecho/tipo de parte → Task 5. ✓
- Categoria = nome do tema; sem regra especial p/ boilerplate → Tasks 5/6/8. ✓
- Saída `{title, content, keywords, category}` sem id/embedding → Task 6. ✓
- Subagentes por doc (em lote) + pai não lê bruto → Tasks 7/8. ✓
- Empacotamento como skill (SKILL.md + scripts + references) → Tasks 0/7/8. ✓

**Placeholders/TODO:** nenhum — todo passo tem código/comando concreto.

**Consistência de tipos:** `Fragment`/`Cluster`/`Label`/`Modelo` definidos no topo
e usados igualmente em `extract-fragments`→`cluster`→`build-models`. Campos
`outcomeKey`/`partyKey`/`canonicalContent`/`topKeywords`/`theme` batem entre tasks.
```

