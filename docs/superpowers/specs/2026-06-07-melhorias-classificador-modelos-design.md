# Design — Melhorias no classificador de modelos + seletor de LLM

**Data:** 2026-06-07
**Versão alvo:** v1.52.40
**Status:** aprovado (aguardando revisão do spec)

## Problema

Dois subsistemas de sugestão de modelos jurídicos apresentam deficiências:

1. **Sugestão via embeddings (IA Local ligada)** — `useModelSuggestions.ts:231-257` — produz
   sugestões "estranhas" (mistura de baixa precisão e baixo recall) e **ignora completamente
   a estrela (`favorite`)**. Causas-raiz:
   - Query fraca: usa só `topic.title`.
   - Embedding do modelo diluído por 2000 chars de conteúdo (`useModelSave.ts:116`) →
     boilerplate jurídico genérico casa com tudo (mata precisão) e dilui o sinal do título
     (mata recall do modelo óbvio).
   - Threshold de 40% é quase inócuo: o E5 multilingual tem baseline de cosseno alto
     (~0.75+ até para pares vagamente relacionados), então 0.40 deixa quase tudo passar e a
     ordenação por cosseno cru não discrimina.
   - A função lexical `scoreModel` (título exato +50, categoria +30, keywords +10) **já existe**
     mas só roda no caminho LLM, nunca no de embeddings.

2. **Sugestão via LLM (IA Local desligada)** — `refineWithAI` — chama `callAI` **sem
   especificar modelo**, caindo no provider/modelo padrão do app. Não há seletor dedicado para
   escolher um modelo mais barato, como existe na Melhoria de Voz (`VOICE_MODEL_CONFIG`).

## Decisões tomadas (brainstorming)

- **Estrela:** pin no topo — favoritos que passam o threshold aparecem sempre primeiro.
- **Sintoma:** misto de precisão (irrelevantes entram) + recall (óbvio não aparece).
- **Seletor LLM:** reusar `VOICE_MODEL_CONFIG`/`VoiceImprovementModel` + dropdown igual ao da Voz.
- **Abordagem:** A+B — re-ranking híbrido **e** re-embed limpo.
- **Texto do novo embedding:** título + keywords + lead curto (~400 chars).
- **Trigger do re-embed:** botão manual "Reindexar modelos".

## Design

### 1. Helper único de texto de embedding (consolidação)

A construção do texto do embedding está **duplicada em 4 lugares** com a mesma string
`título + keywords + 2000 chars`:
- `useModelSave.ts:116`
- `useEmbeddingsManagement.ts:566`
- `useModelEditing.ts` (~169 e ~265)
- `useExportImport.ts:268`

Criar `buildModelEmbeddingText(model)` em `src/utils/models.ts` (fonte única) e trocar os 4
call-sites. Nova construção:

```ts
[title, keywordsNormalizadas, stripHTML(content).slice(0, 400)].filter(Boolean).join(' ')
```

- `keywordsNormalizadas`: `typeof keywords === 'string' ? keywords : (keywords || []).join(' ')`.
- Lead de 400 chars (em vez de 2000) tira o ruído do boilerplate sem perder contexto.
- `stripHTML` também é duplicado — consolidar junto se conveniente (mesmo util).

### 2. Re-embed manual ("Reindexar modelos")

- `generateModelEmbeddings()` ganha parâmetro `force` (default `false`):
  - `force=false` (atual): processa só modelos sem embedding válido (`!m.embedding || length !== 768`).
  - `force=true`: reprocessa **todos** os modelos usando `buildModelEmbeddingText`.
  - Reusa o fluxo existente: progresso (`modelEmbeddingsProgress`), `embeddingsMap`,
    `indexedDB.saveModels`, `setModels`.
- Novo botão **"Reindexar modelos"** em Busca & Dados → seção Modelos, ao lado de
  "Gerar embeddings", reaproveitando a barra de progresso. Confirmação antes (reprocessa tudo).
- Embeddings continuam locais + sincronizados pela fila em memória (`pendingChangesRef`),
  como hoje (v1.52.36). Nenhuma mudança no contrato de sync.

### 3. Classificador híbrido (lexical + semântico) + pin de favoritos

Reescrever o bloco local de `findSuggestions` (`useModelSuggestions.ts:231-257`) extraindo uma
função pura testável, ex. `rankModelsLocal(models, topic, qEmb, opts)`:

- **Query enriquecida:** `[topic.title, topic.category].filter(Boolean).join(' ')` (lowercased),
  embedding tipo `'query'`.
- Por modelo (com embedding 768-dim):
  - `sem = cosineSimilarity(qEmb, m.embedding)`.
  - **Rescale do E5:** `semScaled = clamp((sem - SEM_FLOOR) / (SEM_CEIL - SEM_FLOOR), 0, 1)`
    com `SEM_FLOOR = 0.72`, `SEM_CEIL = 0.88` (valores iniciais, tunáveis).
  - `lex = scoreModel(model, topic.title, topic.category, topic.relatorio)` (função existente,
    reaproveitada). `lexNorm = min(lex / LEX_CAP, 1)`, `LEX_CAP = 80`.
  - **Score final:** `final = W_SEM * semScaled + W_LEX * lexNorm`,
    com `W_SEM = 0.65`, `W_LEX = 0.35` (escala 0–1 com significado real).
- **Corte:** `final >= modelSemanticThreshold / 100` (reaproveita o slider existente, que passa
  a significar "limiar de relevância combinada"). Top 5.
- **Pin de favoritos:** entre os que passam o corte, ordenar `favorite === true` primeiro
  (ordenados por `final` entre si), depois os não-favoritos (por `final`).

Constantes (`SEM_FLOOR`, `SEM_CEIL`, `LEX_CAP`, `W_SEM`, `W_LEX`) num objeto nomeado tunável no
topo do arquivo (ex. `LOCAL_RANK_CONFIG`).

> Nota de calibração: pesos e faixa do E5 são valores iniciais; ajuste fino é empírico. O slider
> de threshold permanece como controle do usuário.

### 4. Seletor de modelo para a busca via LLM

- Novo campo `aiSettings.suggestionModel?: VoiceImprovementModel`, default `'haiku'`
  (reusa o tipo e `VOICE_MODEL_CONFIG` de `useVoiceImprovement.ts`).
- `refineWithAI` lê o config do modelo escolhido e passa `{ provider, model }` para `callAI`
  (hoje não passa → cai no padrão). Estender a interface `AIIntegrationForSuggestions` e o tipo
  das `options` de `callAI` para incluir `provider`/`model`.
- **Dropdown** na seção Modelos de Busca & Dados, espelhando o da Voz
  (`ConfigModal.tsx:1902-1937`): filtrado por `isFastModelAvailable(config, apiKeys)`, com o
  effect de auto-reset quando a key some (`ConfigModal.tsx:341-362`). Label deixando claro que
  vale "quando IA Local de sugestões está desligada".
- Inicializar `suggestionModel` em `initialAISettings` (`useAIStore.ts`).

### 5. Erros e bordas

- Re-embed sem `searchModelReady` → toast de erro (já existe). 0 modelos → toast info.
- Falha do E5 na query do classificador → manter `try/catch` que faz fallback para o caminho
  LLM (comportamento atual preservado).
- LLM selector com modelo indisponível → fallback `'haiku'` (igual à Voz).

### 6. Testes (importando código de produção — regra CLAUDE.md 10)

- `buildModelEmbeddingText`: composição (título+keywords+lead), slice de 400, keywords array vs string.
- `rankModelsLocal`:
  - precisão: modelo irrelevante (sem lexical, semântico baixo) cai abaixo do corte;
  - recall: match de título exato com embedding semântico diluído sobrevive via lexical;
  - pin de favoritos: favorito que passa o corte vem antes de não-favorito com score maior;
  - corte por threshold; rescale (clamp nas bordas).
- `refineWithAI`: passa o `provider`/`model` do `suggestionModel` selecionado para `callAI`.
- `generateModelEmbeddings({ force })`: `force=true` reprocessa todos; `force=false` só faltantes.

### 7. Versionamento

Bump nos 5 arquivos: `CLAUDE.md` (linha 7), `src/App.tsx` (`APP_VERSION`), `src/constants/changelog.js`,
`package.json` → `v1.52.40`. Changelog deve mencionar o repropósito do slider de threshold.

## Arquivos afetados

- `src/utils/models.ts` — novo `buildModelEmbeddingText` (+ possível `stripHTML` compartilhado).
- `src/hooks/useModelSuggestions.ts` — `rankModelsLocal`, query enriquecida, híbrido, pin, wiring do `suggestionModel` em `refineWithAI`.
- `src/hooks/useModelSave.ts` — usar helper.
- `src/hooks/useModelEditing.ts` — usar helper.
- `src/hooks/useExportImport.ts` — usar helper.
- `src/hooks/useEmbeddingsManagement.ts` — `generateModelEmbeddings(force)` + usar helper.
- `src/stores/useAIStore.ts` — campo `suggestionModel` + default.
- `src/types/index.ts` — `AISettings.suggestionModel`.
- `src/components/modals/ConfigModal.tsx` — botão "Reindexar modelos" + dropdown do modelo LLM + auto-reset effect.
- Testes correspondentes.
- 5 arquivos de versão.

## Fora de escopo (YAGNI)

- Auto-migração por versão de schema de embedding (decidido: só botão manual).
- Mudança no contrato de sync de embeddings.
- Refatoração não relacionada.
