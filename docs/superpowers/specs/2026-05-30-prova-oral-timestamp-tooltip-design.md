# Prova Oral — tooltip de fala no hover dos timestamps

**Data**: 2026-05-30
**Subapp**: `src/apps/prova-oral`

## Objetivo
Ao passar o mouse sobre um **pill de timestamp** (badge com ícone de relógio, ex.: "0m 31s"),
mostrar um tooltip com **o depoente + a fala** correspondente àquele momento. Resolve a perda
de contexto: hoje os timestamps em Contradições/Confissões aparecem soltos, sem a fala.

## Decisões (confirmadas)
- **Escopo:** só os **pills** (`TimestampBadge`) — Contradições, Confissões, Sínteses (detalhada).
  Os `(0m 31s)` inline no texto corrido ficam de fora (evita mexer no `HighlightedText`).
- **Conteúdo:** depoente (negrito) + a fala.
- **Estilo:** tooltip estilizado próprio (tema claro/escuro, max-width, wrap), via `createPortal`.

## Arquitetura (4 unidades)

### 1. Índice timestamp → fala (`utils/analysis-helpers.ts`)
- `parseTimestampToSeconds(ts: string): number | null` — converte "7m 06s", "7m 6s",
  "1h 02m 03s" em segundos totais; `null` se não casar o padrão. Robustez a zero-padding.
- `buildTimestampIndex(sinteses: Sintese[], depoentes: Depoente[]): Map<number, { deponente: string; texto: string }>` —
  varre `sinteses[].conteudo[]`, mapeia segundos → { nome do depoente (via depoentes/deponenteId), texto }.
  Em colisão de segundos (raríssimo — um instante = uma fala), o primeiro vence.

### 2. Hook `useTimestampFala()` (`hooks/useTimestampFala.ts`)
- Lê `result` do `useProvaOralStore`.
- `useMemo` na identidade de `result.sinteses`/`result.depoentes` → monta o índice 1×.
- Retorna `lookup(ts: string) => { deponente, texto } | null`.
- Sem `result`/`sinteses` → lookup sempre `null`.

### 3. Componente compartilhado `TimestampBadge` (`components/results/TimestampBadge.tsx`)
- Renderiza o pill (mesma UI/classes de hoje). Props: `{ timestamp: string }` (API inalterada).
- `useTimestampFala()` → `lookup(timestamp)`. Se houver fala:
  - `onMouseEnter`: calcula posição (getBoundingClientRect) e mostra tooltip via `createPortal`;
    `onMouseLeave`: esconde. Cursor `help`.
  - Tooltip: card com `position: fixed`, max-width ~360px, depoente em negrito + fala; ajuste de
    viewport (mesma lógica do `HighlightTooltip`: clampa X, abre acima se não couber abaixo).
- Sem fala casável → pill normal, sem tooltip, sem cursor especial.
- Exportado no barrel `components/results/index.ts`.

### 4. Dedup
- Remover as 3 definições locais idênticas de `TimestampBadge` (ContradicoesTab, ConfissoesTab,
  SintesesTab) e importar o compartilhado. Call sites (`<TimestampBadge timestamp={t} />`) não mudam.
- Onde o `Clock` só era usado pelo badge, remover o import órfão.

## Fluxo
`result` (store) → `useTimestampFala` monta índice 1× → `TimestampBadge` consulta no hover → tooltip via portal.

## Erros / edge
- Sem `result`/`sinteses`, ou timestamp não encontrado → pill normal, sem tooltip.
- Fala longa → `max-width` + wrap. Borda da viewport → reposiciona (clamp X, abre acima).
- Formato divergente do timestamp → `parseTimestampToSeconds` devolve `null` → sem tooltip (não quebra).

## Testes (vitest, `utils/analysis-helpers.test.ts`, importando produção)
- `parseTimestampToSeconds`: "7m 06s"→426, "7m 6s"→426, "1h 02m 03s"→3723, "0m 31s"→31, lixo→null.
- `buildTimestampIndex`: casa "7m 6s" com pill "7m 06s" (mesmos segundos); retorna depoente certo
  (resolve nome via `depoentes`), e fala certa; timestamp inexistente → `undefined`.

## Arquivos
**Novos:** `hooks/useTimestampFala.ts`, `components/results/TimestampBadge.tsx`.
**Modificados:** `utils/analysis-helpers.ts` (+2 funções), `utils/analysis-helpers.test.ts` (+testes),
`hooks/index.ts`, `components/results/index.ts`, `components/results/ContradicoesTab.tsx`,
`components/results/ConfissoesTab.tsx`, `components/results/SintesesTab.tsx`. Versão (4 arquivos).
