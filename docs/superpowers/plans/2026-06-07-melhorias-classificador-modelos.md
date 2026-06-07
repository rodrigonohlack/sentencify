# Melhorias no Classificador de Modelos + Seletor de LLM — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tornar a sugestão de modelos via embeddings precisa e sensível a favoritos (re-ranking híbrido lexical+semântico, pin de estrela, re-embed limpo) e permitir escolher um modelo LLM barato para a sugestão quando a IA Local está desligada.

**Architecture:** (1) Consolida a construção do texto de embedding num util puro `buildModelEmbeddingText`. (2) Re-embeda com `título + keywords + lead 400` via botão "Reindexar" e via script node local. (3) Reescreve o bloco local de `findSuggestions` para combinar similaridade de cosseno rescalada (E5 tem baseline alto) com a função lexical `scoreModel` já existente, com pin de favoritos. (4) Adiciona `aiSettings.suggestionModel` (reusa `VOICE_MODEL_CONFIG`) e o passa para `callAI` no `refineWithAI`, com dropdown no ConfigModal.

**Tech Stack:** React + TypeScript, Zustand, vitest, transformers.js (`@xenova/transformers` v2.17.2, `Xenova/multilingual-e5-base`), tsx para o script.

---

## File Structure

- **Create** `src/utils/modelEmbeddingText.ts` — `stripHtmlToText`, `buildModelEmbeddingText`, `MODEL_EMBED_CONTENT_LEAD`. Dependency-light (sem imports pesados) p/ uso no app e no script node.
- **Create** `src/utils/modelEmbeddingText.test.ts` — testes do util.
- **Create** `src/hooks/rankModelsLocal.test.ts` — testes da função pura de ranking híbrido (cosine mockado por valor controlado).
- **Create** `scripts/reembed-modelos.ts` — script node local de re-embed do JSON.
- **Modify** `src/hooks/useModelSuggestions.ts` — exporta `scoreModel`, `LOCAL_RANK_CONFIG`, `rankModelsLocal`; reescreve bloco local; wiring de `suggestionModel` em `refineWithAI`.
- **Modify** `src/hooks/useModelSuggestions.test.ts` — teste do provider/model no refine.
- **Modify** `src/hooks/useModelSave.ts` — usa `buildModelEmbeddingText`.
- **Modify** `src/hooks/useModelEditing.ts` — usa `buildModelEmbeddingText`.
- **Modify** `src/hooks/useExportImport.ts` — usa `buildModelEmbeddingText`.
- **Modify** `src/hooks/useEmbeddingsManagement.ts` — `generateModelEmbeddings(force?)` + usa helper.
- **Modify** `src/types/index.ts` — `AISettings.suggestionModel`.
- **Modify** `src/stores/useAIStore.ts` — default de `suggestionModel`.
- **Modify** `src/components/modals/ConfigModal.tsx` — botão "Reindexar", dropdown do LLM, fix do onClick de Gerar Embeddings.
- **Modify** versão: `CLAUDE.md`, `package.json`, `src/constants/app-version.ts`, `src/constants/changelog.js`.

---

## Task 1: Util `buildModelEmbeddingText` (fonte única do texto de embedding)

**Files:**
- Create: `src/utils/modelEmbeddingText.ts`
- Test: `src/utils/modelEmbeddingText.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/utils/modelEmbeddingText.test.ts
import { describe, it, expect } from 'vitest';
import { buildModelEmbeddingText, stripHtmlToText, MODEL_EMBED_CONTENT_LEAD } from './modelEmbeddingText';

describe('stripHtmlToText', () => {
  it('remove tags e colapsa espaços', () => {
    expect(stripHtmlToText('<p>Olá   <b>mundo</b></p>')).toBe('Olá mundo');
  });
  it('decodifica entidades comuns', () => {
    expect(stripHtmlToText('a &amp; b &nbsp;c')).toBe('a & b c');
  });
  it('trata vazio/nulo', () => {
    expect(stripHtmlToText('')).toBe('');
    expect(stripHtmlToText(null)).toBe('');
  });
});

describe('buildModelEmbeddingText', () => {
  it('junta título + keywords (string) + lead do conteúdo', () => {
    const txt = buildModelEmbeddingText({ title: 'Horas extras', keywords: 'overtime, jornada', content: '<p>Conteúdo do modelo</p>' });
    expect(txt).toBe('Horas extras overtime, jornada Conteúdo do modelo');
  });
  it('aceita keywords como array', () => {
    const txt = buildModelEmbeddingText({ title: 'T', keywords: ['a', 'b'], content: '' });
    expect(txt).toBe('T a b');
  });
  it('corta o conteúdo no lead configurado', () => {
    const longContent = '<p>' + 'x'.repeat(1000) + '</p>';
    const txt = buildModelEmbeddingText({ title: 'T', content: longContent });
    // 'T ' + 400 x's
    expect(txt.length).toBe(2 + MODEL_EMBED_CONTENT_LEAD);
    expect(MODEL_EMBED_CONTENT_LEAD).toBe(400);
  });
  it('omite campos vazios (filter Boolean)', () => {
    expect(buildModelEmbeddingText({ title: 'Só título', keywords: '', content: '' })).toBe('Só título');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/modelEmbeddingText.test.ts`
Expected: FAIL — "Failed to resolve import './modelEmbeddingText'".

- [ ] **Step 3: Write minimal implementation**

```ts
// src/utils/modelEmbeddingText.ts
/**
 * @file modelEmbeddingText.ts
 * @description Fonte ÚNICA do texto usado para gerar o embedding de um modelo.
 * Dependency-light (sem imports pesados nem DOM) para poder ser usado tanto no
 * app quanto no script local de re-embed (node via tsx). Garante que app e script
 * produzam exatamente o mesmo texto → embeddings compatíveis.
 * @version 1.52.40
 */

/** Comprimento do "lead" do conteúdo incluído no texto de embedding. */
export const MODEL_EMBED_CONTENT_LEAD = 400;

/**
 * Remove tags HTML e devolve texto puro, SEM depender do DOM (funciona em node).
 * Decodifica as entidades mais comuns e colapsa espaços em branco.
 */
export function stripHtmlToText(html: string | null | undefined): string {
  if (!html) return '';
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

interface ModelEmbedInput {
  title?: string;
  keywords?: string | string[];
  content?: string;
}

/**
 * Monta o texto canônico do embedding de um modelo:
 * título + keywords + lead curto do conteúdo (sem ruído de boilerplate de 2000 chars).
 */
export function buildModelEmbeddingText(model: ModelEmbedInput): string {
  const keywords = typeof model.keywords === 'string'
    ? model.keywords
    : (model.keywords || []).join(' ');
  const lead = stripHtmlToText(model.content).slice(0, MODEL_EMBED_CONTENT_LEAD);
  return [model.title, keywords, lead].filter(Boolean).join(' ');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/modelEmbeddingText.test.ts`
Expected: PASS (todos).

- [ ] **Step 5: Commit**

```bash
git add src/utils/modelEmbeddingText.ts src/utils/modelEmbeddingText.test.ts
git commit -m "feat(modelos): util único buildModelEmbeddingText (título+keywords+lead 400)"
```

---

## Task 2: Trocar os 4 call-sites para usar o helper

Os 4 locais hoje montam o texto inline com `[title, keywords, stripHTML(content).slice(0, 2000)]`. Trocar todos por `buildModelEmbeddingText(...)`.

**Files:**
- Modify: `src/hooks/useModelSave.ts:106-126` (função `generateModelEmbedding`)
- Modify: `src/hooks/useModelEditing.ts` (~linhas 160-172 e ~260-266)
- Modify: `src/hooks/useExportImport.ts:260-268`

- [ ] **Step 1: `useModelSave.ts` — importar helper e simplificar `generateModelEmbedding`**

No topo do arquivo, adicionar import:

```ts
import { buildModelEmbeddingText } from '../utils/modelEmbeddingText';
```

Substituir o corpo de `generateModelEmbedding` (linhas 106-126) por:

```ts
const generateModelEmbedding = async (
  modelData: { title: string; keywords?: string | string[]; content: string; embedding?: number[] },
  modelSemanticEnabled: boolean,
  searchModelReady: boolean
): Promise<number[] | undefined> => {
  if (!modelSemanticEnabled || !searchModelReady || modelData.embedding) {
    return modelData.embedding;
  }
  try {
    return await AIModelService.getEmbedding(buildModelEmbeddingText(modelData), 'passage');
  } catch (err) {
    console.warn('[MODEL-EMBED] Erro ao gerar embedding:', err);
    return undefined;
  }
};
```

Se a função `stripHTML` local (linhas 95-101) ficar sem uso após isso, removê-la. Conferir com: `grep -n "stripHTML" src/hooks/useModelSave.ts` — se só sobrar a definição, remover.

- [ ] **Step 2: `useModelEditing.ts` — usar helper nas 2 ocorrências**

Adicionar import no topo:

```ts
import { buildModelEmbeddingText } from '../utils/modelEmbeddingText';
```

Localizar as 2 montagens de `text` que precedem `await AIModelService.getEmbedding(text, 'passage')` (linhas ~169 e ~265). Cada uma é algo como:

```ts
const text = [modelData.title, modelData.keywords, stripHTML(modelData.content).slice(0, 2000)].filter(Boolean).join(' ');
updatedModel.embedding = await AIModelService.getEmbedding(text, 'passage');
```

Trocar a montagem de `text` por:

```ts
const text = buildModelEmbeddingText(modelData);
```

(repetir nas duas ocorrências; o objeto pode chamar-se `modelData` ou `updatedModel`/`model` — usar o objeto local que tem title/keywords/content). Remover `stripHTML` local se ficar órfão (`grep -n stripHTML src/hooks/useModelEditing.ts`).

- [ ] **Step 3: `useExportImport.ts` — usar helper**

Adicionar import no topo:

```ts
import { buildModelEmbeddingText } from '../utils/modelEmbeddingText';
```

Na linha ~268, trocar a montagem do texto antes de `getEmbedding(text, 'passage')` por:

```ts
const text = buildModelEmbeddingText(model);
model.embedding = await AIModelService.getEmbedding(text, 'passage');
```

(adaptar ao nome da variável `model`/`m` local; remover `stripHTML` órfão se houver).

- [ ] **Step 4: Verificar build de tipos**

Run: `npx tsc --noEmit`
Expected: sem novos erros.

- [ ] **Step 5: Rodar testes dos hooks afetados**

Run: `npx vitest run src/hooks/useModelSave.test.ts`
Expected: PASS (a troca é equivalente em comportamento, exceto o lead 2000→400; se algum teste verificar o texto exato com 2000 chars, atualizar a expectativa para 400 — buscar com `grep -n "2000\|slice" src/hooks/useModelSave.test.ts`).

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useModelSave.ts src/hooks/useModelEditing.ts src/hooks/useExportImport.ts
git commit -m "refactor(modelos): 4 call-sites usam buildModelEmbeddingText (DRY + lead 400)"
```

---

## Task 3: `generateModelEmbeddings(force?)` reindexa todos + usa helper

**Files:**
- Modify: `src/hooks/useEmbeddingsManagement.ts:535-590` (função) e a assinatura na interface (`generateModelEmbeddings: () => Promise<void>` → `(force?: boolean) => Promise<void>`)

- [ ] **Step 1: Atualizar a assinatura na interface de retorno**

Localizar na interface `UseEmbeddingsManagementReturn` (perto da linha 93) a linha:

```ts
generateModelEmbeddings: () => Promise<void>;
```

Trocar por:

```ts
generateModelEmbeddings: (force?: boolean) => Promise<void>;
```

- [ ] **Step 2: Importar helper e reescrever `generateModelEmbeddings`**

Adicionar import no topo:

```ts
import { buildModelEmbeddingText } from '../utils/modelEmbeddingText';
```

Substituir a função inteira (linhas 535-590) por:

```ts
const generateModelEmbeddings = useCallback(async (force = false) => {
  if (!searchModelReady) {
    showToast('Modelo de busca não está pronto', 'error');
    return;
  }
  if (generatingModelEmbeddings) return;

  // force=true: reindexa TODOS (recalcula). force=false: só os que faltam.
  const targets = force
    ? modelLibrary.models
    : modelLibrary.models.filter(m => !m.embedding || m.embedding.length !== 768);

  if (!targets.length) {
    showToast(force ? 'Nenhum modelo para reindexar' : 'Todos os modelos já têm embeddings', 'info');
    return;
  }

  setGeneratingModelEmbeddings(true);
  setModelEmbeddingsProgress({ current: 0, total: targets.length });

  // Yield para React renderizar estado de loading
  await new Promise(resolve => setTimeout(resolve, 50));

  try {
    // v1.37.57: Coletar embeddings em um Map (evita mutação de objetos frozen do Zustand/Immer)
    const embeddingsMap = new Map<string, number[]>();

    for (let i = 0; i < targets.length; i++) {
      const model = targets[i];
      const embedding = await AIModelService.getEmbedding(buildModelEmbeddingText(model), 'passage');
      embeddingsMap.set(model.id, embedding);
      setModelEmbeddingsProgress({ current: i + 1, total: targets.length });
      // Yield to event loop para permitir que React renderize o progresso
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    // Criar novos objetos com embeddings (respeitando imutabilidade do Zustand/Immer)
    const updatedModels = modelLibrary.models.map(m => {
      const embedding = embeddingsMap.get(m.id);
      return embedding ? { ...m, embedding } : m;
    });

    await indexedDB.saveModels(updatedModels);
    modelLibrary.setModels(updatedModels);
    showToast(`${targets.length} embeddings de modelos ${force ? 'reindexados' : 'gerados'}`, 'success');
  } catch (err) {
    showToast('Erro ao gerar embeddings: ' + (err as Error).message, 'error');
    console.error('[MODEL-SEARCH] Erro:', err);
  } finally {
    setGeneratingModelEmbeddings(false);
    setModelEmbeddingsProgress({ current: 0, total: 0 });
  }
}, [searchModelReady, generatingModelEmbeddings, modelLibrary, indexedDB, showToast]);
```

Isto remove a `stripHTML` local da função (linhas 555-559) — ela some junto na substituição.

- [ ] **Step 3: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros. (Possível erro em ConfigModal por causa do onClick — será corrigido na Task 4; se o tsc reclamar agora do call de `generateModelEmbeddings` sem args, é esperado e some na Task 4.)

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useEmbeddingsManagement.ts
git commit -m "feat(modelos): generateModelEmbeddings(force) reindexa todos + usa helper"
```

---

## Task 4: Botão "Reindexar" no ConfigModal + fix do onClick

**Files:**
- Modify: `src/components/modals/ConfigModal.tsx:2757-2763`

⚠️ **Bug pré-existente que vira problema:** com a nova assinatura `(force = false)`, `onClick={generateModelEmbeddings}` passaria o **evento de clique** como primeiro arg (truthy → `force=true` acidental). Tem que trocar para `() => generateModelEmbeddings(false)`.

- [ ] **Step 1: Substituir o bloco de botões (linhas 2757-2763)**

Trocar:

```tsx
<div className="flex items-center gap-2 flex-wrap">
  <button onClick={generateModelEmbeddings} disabled={generatingModelEmbeddings}
    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${!generatingModelEmbeddings ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-400 dark:bg-gray-600 text-gray-600 dark:text-gray-400 cursor-not-allowed'}`}>
    {generatingModelEmbeddings ? (<><RefreshCw className="w-3 h-3 animate-spin" /> Gerando... {modelEmbeddingsProgress.current}/{modelEmbeddingsProgress.total}</>) : (<><Sparkles className="w-3 h-3" /> Gerar Embeddings</>)}
  </button>
  {modelEmbeddingsCount > 0 && (<button onClick={clearModelEmbeddings} className="px-2 py-1.5 text-red-500 dark:text-red-400 text-xs"><Trash2 className="w-3 h-3" /></button>)}
</div>
```

Por:

```tsx
<div className="flex items-center gap-2 flex-wrap">
  <button onClick={() => generateModelEmbeddings(false)} disabled={generatingModelEmbeddings}
    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${!generatingModelEmbeddings ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-400 dark:bg-gray-600 text-gray-600 dark:text-gray-400 cursor-not-allowed'}`}>
    {generatingModelEmbeddings ? (<><RefreshCw className="w-3 h-3 animate-spin" /> Gerando... {modelEmbeddingsProgress.current}/{modelEmbeddingsProgress.total}</>) : (<><Sparkles className="w-3 h-3" /> Gerar Embeddings</>)}
  </button>
  {modelEmbeddingsCount > 0 && (
    <button
      onClick={() => { if (window.confirm('Reindexar recalcula o embedding de TODOS os modelos com a nova fórmula. Pode levar um tempo. Continuar?')) generateModelEmbeddings(true); }}
      disabled={generatingModelEmbeddings}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium theme-bg-secondary-50 theme-text-tertiary border theme-border-input hover:theme-bg-secondary-30 transition-colors disabled:opacity-50">
      <RefreshCw className="w-3 h-3" /> Reindexar
    </button>
  )}
  {modelEmbeddingsCount > 0 && (<button onClick={clearModelEmbeddings} className="px-2 py-1.5 text-red-500 dark:text-red-400 text-xs"><Trash2 className="w-3 h-3" /></button>)}
</div>
```

`RefreshCw` já está importado (usado no botão de Gerar). Confirmar com `grep -n "RefreshCw" src/components/modals/ConfigModal.tsx`.

- [ ] **Step 2: Verificar tipos + build**

Run: `npx tsc --noEmit`
Expected: sem erros (o onClick agora bate com a assinatura).

- [ ] **Step 3: Commit**

```bash
git add src/components/modals/ConfigModal.tsx
git commit -m "feat(modelos): botão Reindexar modelos + fix onClick de Gerar Embeddings"
```

---

## Task 5: Ranking híbrido `rankModelsLocal` (função pura testável)

**Files:**
- Modify: `src/hooks/useModelSuggestions.ts` (exporta `scoreModel`, adiciona `LOCAL_RANK_CONFIG` e `rankModelsLocal`)
- Test: `src/hooks/rankModelsLocal.test.ts`

- [ ] **Step 1: Escrever os testes (falhando)**

```ts
// src/hooks/rankModelsLocal.test.ts
import { describe, it, expect, vi } from 'vitest';

// cosineSimilarity controlada: usa embedding[0] como "cosseno" do modelo
vi.mock('../services/AIModelService', () => ({
  default: { cosineSimilarity: (_q: number[], b: number[]) => b[0] }
}));

import { rankModelsLocal, LOCAL_RANK_CONFIG } from './useModelSuggestions';
import type { Model } from '../types';

const emb = (cos: number): number[] => { const a = new Array(768).fill(0); a[0] = cos; return a; };
const mk = (o: Partial<Model>): Model => ({ id: 'x', title: '', content: '', ...o } as Model);
const qEmb = new Array(768).fill(0);
const TH = 0.40;

describe('rankModelsLocal', () => {
  it('descarta semântico fraco sem casamento lexical (ganho de precisão)', () => {
    // cos 0.75 → semScaled (0.75-0.72)/0.16=0.1875 → *0.65=0.122 ; lex 0 → final 0.122 < 0.40
    const m = mk({ id: 'a', title: 'Adicional noturno', category: 'MÉRITO', keywords: '', content: '', embedding: emb(0.75) });
    const out = rankModelsLocal([m], { title: 'Horas extras', category: 'PRELIMINAR' }, qEmb, TH);
    expect(out).toHaveLength(0);
  });

  it('inclui match de título+categoria mesmo com semântico fraco (recall via lexical)', () => {
    // mesmo cos 0.75 (0.122) + lex 80→1.0*0.35=0.35 → final 0.472 ≥ 0.40
    const m = mk({ id: 'b', title: 'Horas extras', category: 'MÉRITO', keywords: '', content: '', embedding: emb(0.75) });
    const out = rankModelsLocal([m], { title: 'Horas extras', category: 'MÉRITO' }, qEmb, TH);
    expect(out.map(x => x.id)).toEqual(['b']);
  });

  it('fixa favoritos no topo mesmo com score menor', () => {
    const fav = mk({ id: 'fav', title: 'A', category: 'MÉRITO', keywords: '', content: '', favorite: true, embedding: emb(0.86) }); // 0.569
    const reg = mk({ id: 'reg', title: 'B', category: 'MÉRITO', keywords: '', content: '', embedding: emb(0.88) }); // 0.65
    const out = rankModelsLocal([reg, fav], { title: 'Z', category: 'OUTRO' }, qEmb, TH);
    expect(out.map(x => x.id)).toEqual(['fav', 'reg']);
  });

  it('faz clamp do rescale semântico em 1 para cosseno alto', () => {
    const m = mk({ id: 'c', title: 'A', category: 'X', keywords: '', content: '', embedding: emb(0.95) });
    const out = rankModelsLocal([m], { title: 'Z', category: 'Y' }, qEmb, TH);
    expect(out[0].similarity).toBeCloseTo(LOCAL_RANK_CONFIG.W_SEM, 5); // semScaled=1 → final=W_SEM
  });

  it('ignora modelos sem embedding 768 e limita ao TOP_N', () => {
    const many = Array.from({ length: 8 }, (_, i) => mk({ id: `m${i}`, title: `T${i}`, category: 'X', embedding: emb(0.90) }));
    const semEmb = mk({ id: 'no', title: 'T', category: 'X', embedding: [1, 2, 3] });
    const out = rankModelsLocal([...many, semEmb], { title: 'Z', category: 'Y' }, qEmb, TH);
    expect(out.length).toBe(LOCAL_RANK_CONFIG.TOP_N);
    expect(out.find(x => x.id === 'no')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Rodar para confirmar falha**

Run: `npx vitest run src/hooks/rankModelsLocal.test.ts`
Expected: FAIL — `rankModelsLocal`/`LOCAL_RANK_CONFIG` não exportados.

- [ ] **Step 3: Implementar em `useModelSuggestions.ts`**

(a) Exportar `scoreModel`: na linha 76 trocar `function scoreModel(` por `export function scoreModel(`.

(b) Logo após a função `scoreModel` (depois da linha 114), adicionar:

```ts
// ═══════════════════════════════════════════════════════════════════════════════
// RANKING LOCAL HÍBRIDO (lexical + semântico) — v1.52.40
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parâmetros do ranking local. SEM_FLOOR/SEM_CEIL recalibram o cosseno do E5
 * (que tem baseline alto ~0.75) para uma faixa útil 0–1. Pesos combinam o sinal
 * semântico com o lexical (scoreModel). Valores iniciais — ajuste fino é empírico.
 */
export const LOCAL_RANK_CONFIG = {
  SEM_FLOOR: 0.72,
  SEM_CEIL: 0.88,
  LEX_CAP: 80,
  W_SEM: 0.65,
  W_LEX: 0.35,
  TOP_N: 5,
} as const;

const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));

/**
 * Ranqueia modelos para um tópico combinando similaridade semântica (cosseno
 * rescalado do E5) com pontuação lexical (scoreModel), aplicando corte por
 * threshold e pin de favoritos (estrela primeiro). Função pura e testável.
 *
 * @param models Biblioteca de modelos (só os com embedding 768 entram).
 * @param topic title/category/relatorio do tópico (lexical usa os três).
 * @param qEmb Embedding da query (já gerado pelo chamador).
 * @param threshold Corte 0–1 sobre o score combinado (slider/100).
 */
export function rankModelsLocal(
  models: Model[],
  topic: { title: string; category?: string; relatorio?: string },
  qEmb: number[],
  threshold: number
): Model[] {
  const cfg = LOCAL_RANK_CONFIG;
  const scored = models
    .filter(m => m.embedding?.length === 768)
    .map(m => {
      const sem = AIModelService.cosineSimilarity(qEmb, m.embedding || []);
      const semScaled = clamp01((sem - cfg.SEM_FLOOR) / (cfg.SEM_CEIL - cfg.SEM_FLOOR));
      const lex = scoreModel(m, topic.title, topic.category || '', topic.relatorio || '');
      const lexNorm = Math.min(lex / cfg.LEX_CAP, 1);
      const final = cfg.W_SEM * semScaled + cfg.W_LEX * lexNorm;
      return { ...m, similarity: final };
    })
    .filter(m => (m.similarity || 0) >= threshold);

  // Pin de favoritos: estrela primeiro (entre si por score), depois os demais por score.
  scored.sort((a, b) => {
    const favDiff = (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0);
    if (favDiff !== 0) return favDiff;
    return (b.similarity || 0) - (a.similarity || 0);
  });

  return scored.slice(0, cfg.TOP_N);
}
```

- [ ] **Step 4: Rodar testes**

Run: `npx vitest run src/hooks/rankModelsLocal.test.ts`
Expected: PASS (todos).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useModelSuggestions.ts src/hooks/rankModelsLocal.test.ts
git commit -m "feat(modelos): ranking local híbrido (lexical+semântico) com pin de favoritos"
```

---

## Task 6: Ligar `findSuggestions` ao `rankModelsLocal` + query enriquecida

**Files:**
- Modify: `src/hooks/useModelSuggestions.ts:231-257` (bloco local dentro de `findSuggestions`)

- [ ] **Step 1: Substituir o bloco local**

Trocar o bloco (linhas 231-257) por:

```ts
    // v1.28.02 / v1.52.40: IA Local para sugestões (sem API). Ranking híbrido + pin de favoritos.
    if (aiIntegration.aiSettings.useLocalAIForSuggestions && searchModelReady && models.some(m => m.embedding?.length === 768)) {
      if (!topic?.title || topic.title.length < 3) return { suggestions: [], source: null };
      const topicCategory = topic.category || '';
      // v1.52.40: query enriquecida (título + categoria) em vez de só o título
      const queryText = [topic.title, topicCategory].filter(Boolean).join(' ');
      const cacheKey = `suggestions_local_${queryText}`;
      const cached = apiCache.get(cacheKey);
      if (cached && typeof cached === 'string') {
        try {
          return JSON.parse(cached) as SuggestionsResult;
        } catch { /* ignore parse error */ }
      }
      try {
        await new Promise(r => setTimeout(r, 0)); // Yield para UI não congelar
        // v1.32.20: toLowerCase para E5 case-sensitive
        const qEmb = await AIModelService.getEmbedding(queryText.toLowerCase(), 'query');
        const threshold = (aiIntegration.aiSettings.modelSemanticThreshold || 40) / 100;
        const results = rankModelsLocal(
          models,
          { title: topic.title, category: topicCategory, relatorio: topic.relatorio || topic.editedRelatorio || '' },
          qEmb,
          threshold
        );
        const result: SuggestionsResult = { suggestions: results, source: 'local' };
        apiCache.set(cacheKey, JSON.stringify(result));
        return result;
      } catch { /* fallback para sistema atual */ }
    }
```

(Mudanças: query = título+categoria; fallback do threshold `|| 60` → `|| 40` p/ casar com o default do store; ranking via `rankModelsLocal`.)

- [ ] **Step 2: Verificar tipos + suite de suggestions**

Run: `npx tsc --noEmit && npx vitest run src/hooks/useModelSuggestions.test.ts`
Expected: PASS. Se algum teste do caminho local checava a ordenação antiga (cosseno puro) ou o cacheKey `suggestions_local_<título>`, atualizar para o novo cacheKey (`<título categoria>`) e para a presença de `similarity` combinada. Buscar: `grep -n "suggestions_local\|source: 'local'\|useLocalAIForSuggestions" src/hooks/useModelSuggestions.test.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useModelSuggestions.ts
git commit -m "feat(modelos): findSuggestions local usa rankModelsLocal + query enriquecida"
```

---

## Task 7: Campo `suggestionModel` em AISettings + default no store

**Files:**
- Modify: `src/types/index.ts:373` (dentro de `AISettings`)
- Modify: `src/stores/useAIStore.ts:276` (em `initialAISettings`)

- [ ] **Step 1: Adicionar o campo no tipo**

Em `AISettings`, logo após a linha 373 (`useLocalAIForSuggestions?: boolean;`), adicionar:

```ts
  /** v1.52.40: Modelo LLM para sugestão de modelos quando IA Local está desligada (reusa a lista da Voz). Default 'haiku'. */
  suggestionModel?: VoiceImprovementModel;
```

`VoiceImprovementModel` já é declarado neste arquivo (linha 393), então não precisa de import.

- [ ] **Step 2: Default no store**

Em `src/stores/useAIStore.ts`, em `initialAISettings`, logo após `useLocalAIForSuggestions: false,` (linha 276), adicionar:

```ts
  suggestionModel: 'haiku',
```

- [ ] **Step 3: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts src/stores/useAIStore.ts
git commit -m "feat(modelos): aiSettings.suggestionModel (default haiku)"
```

---

## Task 8: `refineWithAI` passa provider/model do modelo escolhido

**Files:**
- Modify: `src/hooks/useModelSuggestions.ts` (interface `AIIntegrationForSuggestions` + função `refineWithAI`)
- Test: `src/hooks/useModelSuggestions.test.ts`

- [ ] **Step 1: Escrever o teste (falhando)**

Adicionar ao `describe('useModelSuggestions', ...)` em `src/hooks/useModelSuggestions.test.ts` (usar os helpers já existentes no arquivo — `createMockModel`, `createMockTopic`, `createMockAIIntegration`, `mockCallAI` e o mock de `apiCache`; conferir o nome exato do mock de cache com `grep -n "apiCache\|createMockAIIntegration\|mockCallAI" src/hooks/useModelSuggestions.test.ts`):

```ts
it('refineWithAI envia provider/model do suggestionModel selecionado para callAI', async () => {
  (useModelsStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({
    models: [createMockModel({ id: 'm1', title: 'HORAS EXTRAS', category: 'MÉRITO' })],
  });
  mockCallAI.mockResolvedValue('["m1"]');

  const ai = createMockAIIntegration({ useLocalAIForSuggestions: false });
  ai.aiSettings.suggestionModel = 'gpt-4o-mini';

  const { result } = renderHook(() => useModelSuggestions({
    aiIntegration: ai,
    apiCache: { get: () => null, set: vi.fn() },
    searchModelReady: false,
  }));

  await act(async () => {
    await result.current.findSuggestions(createMockTopic({ title: 'HORAS EXTRAS', category: 'MÉRITO' }));
  });

  expect(mockCallAI).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({ provider: 'openai', model: 'gpt-4o-mini' })
  );
});
```

- [ ] **Step 2: Rodar para confirmar falha**

Run: `npx vitest run src/hooks/useModelSuggestions.test.ts -t "suggestionModel selecionado"`
Expected: FAIL — `callAI` chamado sem `provider/model`.

- [ ] **Step 3: Implementar**

(a) No topo de `useModelSuggestions.ts`, importar a config dos modelos rápidos:

```ts
import { VOICE_MODEL_CONFIG } from './useVoiceImprovement';
```

(b) Na interface `AIIntegrationForSuggestions` (linhas 28-43): adicionar `suggestionModel` ao `aiSettings` e `provider`/`model` às options de `callAI`:

```ts
export interface AIIntegrationForSuggestions {
  aiSettings: {
    useLocalAIForSuggestions?: boolean;
    modelSemanticThreshold?: number;
    suggestionModel?: import('../types').VoiceImprovementModel;
  };
  buildApiRequest: (messages: AIMessage[], optionsOrMaxTokens?: AICallOptions | number) => Record<string, unknown>;
  callAI: (messages: AIMessage[], options?: {
    provider?: string;
    model?: string;
    maxTokens?: number;
    useInstructions?: boolean;
    disableThinking?: boolean;
    logMetrics?: boolean;
    temperature?: number;
    topP?: number;
    topK?: number;
  }) => Promise<string>;
}
```

(c) Dentro de `refineWithAI`, antes do `try { textContent = await aiIntegration.callAI(...)` (linha ~176), resolver o config e passar provider/model:

```ts
      // v1.52.40: modelo LLM escolhido p/ sugestão (fallback haiku)
      const modelKey = aiIntegration.aiSettings.suggestionModel || 'haiku';
      const modelCfg = VOICE_MODEL_CONFIG[modelKey] || VOICE_MODEL_CONFIG['haiku'];

      let textContent;
      try {
        textContent = await aiIntegration.callAI(messages, {
          provider: modelCfg.provider,
          model: modelCfg.model,
          maxTokens: 300,
          useInstructions: false,
          disableThinking: true,
          logMetrics: true,
          temperature: 0.0,
          topP: 0.9,
          topK: 40
        });
      } catch {
        return topCandidates;
      }
```

(d) Atualizar o array de deps do `useCallback` de `refineWithAI` (linha 217): de `[aiIntegration]` para `[aiIntegration]` (continua só `aiIntegration` — `suggestionModel` é lido via `aiIntegration.aiSettings`, ok). Também garantir que `findSuggestions` (deps na linha 302) inclua o que precisa — não precisa adicionar `suggestionModel` lá porque o refine lê via closure de `aiIntegration` que já está nas deps via `refineWithAI`.

- [ ] **Step 4: Rodar testes**

Run: `npx vitest run src/hooks/useModelSuggestions.test.ts`
Expected: PASS (incluindo o novo). Remover/atualizar o comentário "Usar Sonnet 4.5 (modelo padrão)" da linha 169, que ficou desatualizado.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useModelSuggestions.ts src/hooks/useModelSuggestions.test.ts
git commit -m "feat(modelos): refineWithAI usa provider/model do suggestionModel"
```

---

## Task 9: Dropdown do modelo LLM no ConfigModal

**Files:**
- Modify: `src/components/modals/ConfigModal.tsx` (seção Modelos, após o toggle "Sugestões via IA Local" — após a linha 2782)

`VOICE_MODEL_CONFIG`, `isFastModelAvailable` e o tipo `VoiceImprovementModel` já estão importados no arquivo (linhas 51-52; conferir o tipo com `grep -n "VoiceImprovementModel" src/components/modals/ConfigModal.tsx`).

- [ ] **Step 1: Inserir o dropdown**

Dentro do bloco `{aiSettings.modelSemanticEnabled && (...)}`, logo **após** o bloco do toggle "Sugestões via IA Local" (depois da linha 2782, ainda dentro do `<div className="space-y-3 ...">`), adicionar:

```tsx
                      {modelEmbeddingsCount > 0 && !aiSettings.useLocalAIForSuggestions && (
                        <div className="mt-2 pt-3 border-t theme-border-subtle">
                          <label className="block text-xs theme-text-muted mb-2">
                            Modelo para sugestões via LLM
                            <span className="block opacity-70">Usado quando "Sugestões via IA Local" está desligado</span>
                          </label>
                          <select
                            value={aiSettings.suggestionModel || 'haiku'}
                            onChange={(e) => setAiSettings({ ...aiSettings, suggestionModel: e.target.value as VoiceImprovementModel })}
                            className="w-full px-3 py-2 rounded-lg theme-bg-primary theme-text-primary theme-border-input border text-sm"
                          >
                            {(Object.entries(VOICE_MODEL_CONFIG) as [VoiceImprovementModel, typeof VOICE_MODEL_CONFIG['haiku']][])
                              .filter(([, config]) => isFastModelAvailable(config, aiSettings.apiKeys))
                              .map(([key, config]) => (
                                <option key={key} value={key}>{config.displayName}</option>
                              ))
                            }
                          </select>
                          {(Object.entries(VOICE_MODEL_CONFIG) as [VoiceImprovementModel, typeof VOICE_MODEL_CONFIG['haiku']][])
                            .filter(([, config]) => isFastModelAvailable(config, aiSettings.apiKeys)).length === 0 && (
                            <p className="text-xs text-red-400 mt-2">Configure pelo menos uma API key para usar este recurso.</p>
                          )}
                        </div>
                      )}
```

- [ ] **Step 2: Auto-reset quando a key do modelo selecionado some**

Localizar o `useEffect` de auto-reset da Voz (linhas ~343-362, identificado por `firstAvailable` e `voiceImprovement`). Logo após ele, adicionar um effect análogo para `suggestionModel`:

```tsx
  // v1.52.40: auto-reset do modelo de sugestão se a key sumir
  React.useEffect(() => {
    const selected = aiSettings.suggestionModel || 'haiku';
    const cfg = VOICE_MODEL_CONFIG[selected];
    if (cfg && isFastModelAvailable(cfg, aiSettings.apiKeys)) return;
    const firstAvailable = (Object.entries(VOICE_MODEL_CONFIG) as [VoiceImprovementModel, typeof VOICE_MODEL_CONFIG['haiku']][])
      .find(([, c]) => isFastModelAvailable(c, aiSettings.apiKeys));
    if (firstAvailable && firstAvailable[0] !== selected) {
      setAiSettings({ ...aiSettings, suggestionModel: firstAvailable[0] });
    }
  }, [aiSettings, setAiSettings]);
```

- [ ] **Step 3: Verificar tipos + build**

Run: `npx tsc --noEmit && npm run build`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/components/modals/ConfigModal.tsx
git commit -m "feat(modelos): dropdown de modelo LLM p/ sugestões em Busca & Dados"
```

---

## Task 10: Script node local de re-embed do JSON

**Files:**
- Create: `scripts/reembed-modelos.ts`

- [ ] **Step 1: Conferir as opções exatas do pipeline no worker do app**

Run: `sed -n '40,60p' src/ai-worker.js`
Expected: ver a chamada `pipeline('feature-extraction', 'Xenova/multilingual-e5-base', ...)`. Anotar se há opção `quantized`/`dtype`. Se o worker **não** passa nada além do nome do modelo, o script também não deve passar (defaults idênticos = embeddings compatíveis). Se passar (ex.: `{ quantized: true }`), replicar igual no script.

- [ ] **Step 2: Escrever o script**

```ts
// scripts/reembed-modelos.ts
/**
 * Re-embeda modelos-sentencas-100recentes.json LOCALMENTE (E5-base via transformers.js),
 * usando a MESMA construção de texto do app (buildModelEmbeddingText) e as MESMAS opções
 * do worker (ai-worker.js). Bem mais rápido que reindexar no browser. Reimporte o JSON
 * resultante manualmente no Sentencify.
 *
 * Uso:
 *   npx tsx scripts/reembed-modelos.ts [entrada.json] [saida.json]
 * Defaults:
 *   entrada: ~/Downloads/modelos-sentencas-100recentes.json
 *   saída:   ~/Downloads/modelos-sentencas-100recentes.reembed.json
 */
import { pipeline, env } from '@xenova/transformers';
import { readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { buildModelEmbeddingText } from '../src/utils/modelEmbeddingText';

env.allowRemoteModels = true; // baixa o modelo do HF hub na 1ª execução

const HOME = homedir();
const inPath = process.argv[2] || join(HOME, 'Downloads', 'modelos-sentencas-100recentes.json');
const outPath = process.argv[3] || join(HOME, 'Downloads', 'modelos-sentencas-100recentes.reembed.json');

interface JsonModel { title?: string; keywords?: string | string[]; content?: string; embedding?: number[]; }

async function main(): Promise<void> {
  const models: JsonModel[] = JSON.parse(readFileSync(inPath, 'utf-8'));
  if (!Array.isArray(models)) throw new Error('JSON de entrada deve ser um array de modelos');
  console.log(`Carregados ${models.length} modelos de ${inPath}`);

  // MESMAS opções do worker (conferir Step 1; adicionar quantized/dtype aqui se o worker usar)
  const extractor = await pipeline('feature-extraction', 'Xenova/multilingual-e5-base');

  for (let i = 0; i < models.length; i++) {
    const text = 'passage: ' + buildModelEmbeddingText(models[i]); // prefixo igual ao getEmbedding('passage')
    const output = await extractor(text, { pooling: 'mean', normalize: true });
    models[i].embedding = Array.from(output.data as Float32Array);
    if ((i + 1) % 25 === 0 || i === models.length - 1) console.log(`  ${i + 1}/${models.length}`);
  }

  writeFileSync(outPath, JSON.stringify(models));
  console.log(`Salvo em ${outPath} — dim do 1º embedding: ${models[0]?.embedding?.length}`);
}

main().catch(err => { console.error(err); process.exit(1); });
```

- [ ] **Step 3: Rodar o script (re-embeda o JSON de verdade)**

Run: `npx tsx scripts/reembed-modelos.ts`
Expected: baixa o modelo na 1ª vez, imprime progresso `25/437 ... 437/437` e `dim do 1º embedding: 768`. Confirmar 768.

- [ ] **Step 4: Sanity-check de compatibilidade (cosseno entre dois itens deve ser plausível)**

Run:
```bash
node -e "const m=require(require('os').homedir()+'/Downloads/modelos-sentencas-100recentes.reembed.json');const a=m[0].embedding,b=m[1].embedding;let d=0,na=0,nb=0;for(let i=0;i<a.length;i++){d+=a[i]*b[i];na+=a[i]*a[i];nb+=b[i]*b[i]}console.log('len',a.length,'cos[0,1]',(d/(Math.sqrt(na)*Math.sqrt(nb))).toFixed(3))"
```
Expected: `len 768` e um cosseno na faixa típica do E5 (~0.7–0.9). Se `len !== 768` ou cosseno fora de faixa, revisar Step 1 (opções do pipeline).

- [ ] **Step 5: Commit (só o script; o JSON fica em Downloads, fora do repo)**

```bash
git add scripts/reembed-modelos.ts
git commit -m "chore(scripts): re-embed local de modelos JSON (E5-base, paridade com o app)"
```

> O usuário reimporta `~/Downloads/modelos-sentencas-100recentes.reembed.json` manualmente no Sentencify.

---

## Task 11: Bump de versão (4 arquivos) + changelog

**Files:**
- Modify: `CLAUDE.md:7`, `package.json:3`, `src/constants/app-version.ts:6`, `src/constants/changelog.js`

- [ ] **Step 1: `package.json:3`** — `"version": "1.52.39"` → `"version": "1.52.40"`.

- [ ] **Step 2: `src/constants/app-version.ts:6`** — `export const APP_VERSION = '1.52.39';` → `'1.52.40'`.

- [ ] **Step 3: `CLAUDE.md:7`** — `**Version**: 1.52.39` → `**Version**: 1.52.40`.

- [ ] **Step 4: `src/constants/changelog.js`** — inserir como primeiro item do array `CHANGELOG` (logo após `export const CHANGELOG = [`):

```js
  {
    version: '1.52.40',
    date: '2026-06-07',
    feature: 'feat(modelos): classificador de sugestões via IA Local reescrito para ranking híbrido — combina similaridade semântica (cosseno do E5 rescalado para faixa útil, já que o E5 tem baseline alto) com a pontuação lexical de título/categoria/keywords, e FIXA os modelos favoritos (estrela) no topo. A query agora usa título + categoria (antes só o título). O texto do embedding de cada modelo passou a ser título + keywords + lead de 400 chars do conteúdo (antes 2000 chars, que diluíam o sinal e puxavam irrelevantes) — consolidado num único util buildModelEmbeddingText. Novo botão "Reindexar modelos" em Busca & Dados recalcula todos os embeddings com a nova fórmula. O slider de threshold passou a operar sobre o score combinado (escala 0–1 calibrada). Quando a IA Local de sugestões está desligada (busca via LLM), agora dá para escolher um modelo barato dedicado (mesma lista da Melhoria de Voz) em Busca & Dados, em vez de cair sempre no modelo padrão.',
  },
```

- [ ] **Step 5: Verificar build e commit**

Run: `npx tsc --noEmit && npm run build`
Expected: sem erros.

```bash
git add CLAUDE.md package.json src/constants/app-version.ts src/constants/changelog.js
git commit -m "chore: bump v1.52.40 (classificador híbrido + seletor LLM de sugestões)"
```

---

## Task 12: Verificação final

- [ ] **Step 1: Suite completa de testes**

Run: `npx vitest run`
Expected: tudo verde. Atenção a testes pré-existentes que assumiam o texto de embedding com 2000 chars, o cacheKey local antigo (`suggestions_local_<título>`), ou ordenação por cosseno puro — ajustar para o novo comportamento (lead 400, cacheKey `<título categoria>`, score combinado).

- [ ] **Step 2: Type-check + build de produção**

Run: `npx tsc --noEmit && npm run build`
Expected: sem erros.

- [ ] **Step 3: Smoke manual (opcional, recomendado)**

Subir o app, abrir Config → Busca & Dados → Modelos: confirmar botão "Reindexar"; com "Sugestões via IA Local" desligado, confirmar o dropdown de modelo LLM; ligar a IA Local e verificar que favoritos aparecem no topo das sugestões de um tópico.

---

## Self-Review (autor do plano)

**Spec coverage:**
- §1 helper único → Task 1+2 ✓
- §2 re-embed manual → Task 3 (force) + Task 4 (botão) ✓
- §3 híbrido + pin favoritos → Task 5 + Task 6 ✓
- §4 seletor LLM → Task 7 (campo/default) + Task 8 (wiring) + Task 9 (UI) ✓
- §5 erros/bordas → coberto em Task 3 (toasts), Task 6 (try/catch fallback), Task 8 (fallback haiku), Task 9 (auto-reset) ✓
- §6 testes → Task 1, 5, 8 ✓
- §7 versionamento → Task 11 ✓
- Extra do usuário: script local de re-embed → Task 10 ✓

**Placeholder scan:** sem TBD/TODO; todo passo de código mostra o código.

**Type consistency:** `buildModelEmbeddingText`/`stripHtmlToText`/`MODEL_EMBED_CONTENT_LEAD` (Task 1) usados em Tasks 2,3,10. `generateModelEmbeddings(force?)` (Task 3) consumido em Task 4. `rankModelsLocal`/`LOCAL_RANK_CONFIG`/`scoreModel` (Task 5) usados em Task 6 e testes. `suggestionModel: VoiceImprovementModel` (Task 7) lido em Task 8 e Task 9. `VOICE_MODEL_CONFIG`/`isFastModelAvailable` reusados de `useVoiceImprovement`.
