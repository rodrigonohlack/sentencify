# Juízo de fidelidade do mini-relatório (extensão da rastreabilidade)

**Data:** 2026-05-31 · **Branch:** `feat/rastreabilidade-fontes` (PR #10) · **Versão alvo:** 1.50.39

## Objetivo
Além de verificar se as **citações existem** nas peças (anti-alucinação das citações — já feito), avaliar se **cada parágrafo do mini-relatório é FIEL às peças** — pegando distorções factuais (datas, valores, nomes, prazos, qualificações). Caso-teste: relatório diz "admitida em 01/04/2024", peça diz "01/03/2024" → deve sinalizar divergência.

## Decisões (aprovadas)
- Roda **junto com "Rastrear fontes"**, em **uma única chamada de IA** (estende o prompt/JSON existentes — não adiciona 2ª chamada).
- Compara **contra as peças completas** (já no contexto enviado).

## Design

### Dados (`src/types/index.ts`)
```ts
export interface RelatorioBlocoFidelidade {
  veredito: 'fiel' | 'divergente' | 'indeterminado';
  divergencias: string[]; // ex.: "Admissão — relatório: 01/04/2024 · peça: 01/03/2024"
}
// em RelatorioBlocoFonte:
fidelidade?: RelatorioBlocoFidelidade;
```

### Schema Zod (`src/schemas/ai-responses.ts`)
`RastreabilidadeBlocoSchema` ganha `fidelidade` opcional e tolerante:
```ts
fidelidade: z.object({
  veredito: z.string().nullable().optional(),
  divergencias: z.array(z.string()).default([]),
}).passthrough().optional()
```
(A normalização de `veredito` para a union estrita acontece em `mapTracingResponse`, não no Zod.)

### Prompt (`src/utils/sourceTracing.ts` → `buildSourceTracingPrompt`)
Mesma chamada, JSON estendido. Para CADA parágrafo, além dos `trechos`, pedir um bloco `fidelidade`:
- Instrução de **conferência** (anti-rubber-stamp): "compare cada afirmação factual do parágrafo (datas, valores, nomes, prazos, qualificações jurídicas) com o que as peças efetivamente dizem. Liste TODA divergência no formato 'campo — relatório: X · peça: Y'. Se tudo confere, veredito 'fiel'. Se não há base nas peças para conferir, 'indeterminado'."
- Formato: `{"blocos":[{"blocoIndex":0,"trechos":[...],"fidelidade":{"veredito":"divergente","divergencias":["..."]}}]}`

### Mapeamento (`src/utils/sourceTracing.ts` → `mapTracingResponse`)
Anexar `fidelidade` a cada `RelatorioBlocoFonte`:
- Normaliza `veredito`: contém "diverg" → 'divergente'; "fiel" → 'fiel'; senão 'indeterminado'.
- `divergencias`: array de strings (default []).
- Sem `fidelidade` no JSON → `{ veredito: 'indeterminado', divergencias: [] }`.

### Hook (`useReportGeneration.traceReportSources`)
**Sem mudança** — já passa `parsed.data.blocos` a `mapTracingResponse`; a fidelidade vem no mesmo retorno (uma chamada só). `maxTokens` pode subir (4000 → 6000) para acomodar as divergências.

### UI (`RastreabilidadeModal.tsx`)
- Resumo no topo: + contagem "N divergente(s)".
- Cada parágrafo: selo de fidelidade ao lado do ¶N — **✓ Fiel** (verde) / **⚠ Divergente** (vermelho) / **— Indeterminado** (muted).
- Se divergente: listar `divergencias` num bloco destacado (vermelho/âmbar) acima dos trechos.
- Claro/escuro; conteúdo jurídico em `font-serif` como o resto.

## Tarefas (TDD)
1. Tipos (`RelatorioBlocoFidelidade` + campo).
2. Schema Zod (+ teste: parseia `fidelidade`, tolera ausência).
3. `mapTracingResponse` (+ testes: normaliza veredito, divergências, ausência → indeterminado) e `buildSourceTracingPrompt` (+ teste: pede fidelidade/divergências no prompt).
4. Modal: selo + lista de divergências + contagem (+ testes de render).
5. Hook: maxTokens 6000 (ajuste pontual).
6. Bump 1.50.39 + suíte completa + push (atualiza PR #10).

## Fora de escopo
- Cross-check determinístico de datas/valores (era a opção 2.a — adiada).
- Reenquadramento textual do selo de citação (decisão separada).
