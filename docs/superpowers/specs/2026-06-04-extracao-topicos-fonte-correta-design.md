# Extração de tópicos: fonte correta por categoria + sinalização de divergências

**Data:** 2026-06-04
**Versão alvo:** v1.52.16
**Escopo:** App principal (extração inicial de tópicos). Subapps não são afetados.

## Problema

A extração de tópicos do app principal trata petição inicial e contestação como
fontes de tópico de peso igual. O prompt (`document-analysis-prompts.ts`, linha
~28) instrui apenas: *"Extraia e classifique todos os tópicos/pedidos"*, sem
ancorar o objeto litigioso na inicial.

Consequência observada em caso real: o autor **não** postulou verbas rescisórias
nem intervalo térmico, mas a contestação, por erro (defesa genérica / peça de
outro processo), abriu defesa sobre essas parcelas. O sistema então gerou
tópicos de mérito de verbas rescisórias e intervalo térmico, induzido pela
contestação.

Isso não é apenas ruído de UI: gerar capítulo de mérito sobre parcela não pedida
é o caminho para sentença **extra petita** (arts. 141 e 492 do CPC — a sentença
é adstrita ao pedido).

## Regra de extração (núcleo do design)

A fonte legítima de cada tópico depende da **categoria**, não da peça:

| Categoria | Fonte legítima | Observação |
|---|---|---|
| **MÉRITO** (pedidos do autor) | Petição inicial | Só vira tópico se o pedido constar da inicial. |
| **Pedido contraposto / reconvenção** (pretensão da ré) | Contestação | Única via pela qual a defesa formula pedido próprio → vira tópico de mérito. |
| **PRELIMINARES, PREJUDICIAIS, QUESTÕES PROCESSUAIS** | Contestação (por natureza) | Inalterado. |

**Critério de distinção que o prompt deve ensinar:** a ré *pede* algo (requer a
condenação do autor, devolução de valores, indenização) → pretensão → tópico. A
ré apenas *impugna/nega* uma parcela → defesa → **não** é pedido novo.

**Tratamento da divergência:** quando a defesa impugna uma parcela de mérito que
(a) não consta da inicial e (b) não é pedido contraposto/reconvenção, o sistema
**não cria o tópico** e registra uma entrada em `divergencias`, exibida como
aviso informativo no fluxo de curadoria. Decisão de produto: **sinalizar, não
criar tópico** — evita extra petita sem esconder do magistrado o falso-negativo
(o caso em que o pedido existia na inicial e o modelo não o captou).

## Abordagem

Espelhar integralmente o padrão já existente de `promptInjections`, que é um
canal informativo, não-bloqueante, exibido no `TopicCurationModal`. O trajeto de
dados é idêntico em cinco camadas.

### 1. Prompt — `src/prompts/document-analysis-prompts.ts`

Substituir a instrução genérica (~linha 28) por uma regra de fonte por
categoria, redigida em forma **positiva** (sem nomear parcelas concretas a
evitar — negative prompts com a frase exata a evitar contaminam o contexto):

- Os pedidos de mérito são os formulados pelo reclamante na petição inicial.
- A contestação só origina tópico de mérito quando a ré formula pretensão própria
  (pedido contraposto ou reconvenção — a ré requer a condenação do autor).
- Preliminares, prejudiciais e questões processuais continuam saindo da
  contestação (inalterado).
- Se a defesa impugna uma parcela de mérito sem pedido correspondente na inicial
  e sem ser contraposto/reconvenção, **não criar tópico**; registrar entrada em
  `divergencias`.

Acrescentar `divergencias` ao formato JSON de resposta documentado no prompt,
ao lado de `promptInjections`.

### 2. Schema + tipo — `src/schemas/ai-responses.ts`

Espelhando `PromptInjectionDetectionSchema`:

```ts
export const DivergenciaPedidoSchema = z.object({
  parcela: z.string().nullable().default('').transform(v => v ?? ''),
  documento: z.string().nullable().default('').transform(v => v ?? ''),
  descricao: z.string().nullable().default('').transform(v => v ?? ''),
}).passthrough();

export type DivergenciaPedido = z.infer<typeof DivergenciaPedidoSchema>;
```

E em `TopicExtractionSchema`:

```ts
divergencias: z.array(DivergenciaPedidoSchema).optional().default([]),
```

Sem campo `gravidade` — toda divergência tem o mesmo peso informativo.

### 3. Hook — `src/hooks/useDocumentAnalysis.ts`

Logo após o bloco que processa `promptInjections` (~linha 712), ler
`parsed.divergencias` e chamar uma nova prop opcional `setDetectedDivergencias`,
idêntica em assinatura a `setDetectedInjections`.

### 4. Store — `src/stores/useTopicsStore.ts`

Novo estado `detectedDivergencias: DivergenciaPedido[]` (default `[]`) e ação
`setDetectedDivergencias`, espelhando o par de `detectedInjections`. Resetado
junto com `detectedInjections` quando o projeto é zerado.

### 5. UI — `src/components/TopicCurationModal.tsx`

Novo componente `DivergenciaBanner`, irmão de `PromptInjectionBanner`,
renderizado no mesmo ponto do corpo do modal.

- Tom **âmbar/atenção** (não vermelho — é "confira", não ameaça), theme-aware
  (claro/escuro via `dark:`).
- Cabeçalho: *"N parcela(s) impugnada(s) na defesa sem pedido correspondente na
  inicial — verifique se não houve omissão da inicial ou erro da contestação."*
- Cada item lista `parcela`, `documento` e `descricao`.
- Retorna `null` quando a lista está vazia.

## Versionamento

Bump para **v1.52.16** nos 4 arquivos: `CLAUDE.md` (linha 7), `src/App.tsx`
(`APP_VERSION`), `src/constants/changelog.js`, `package.json`.

## Testes (importando código de produção)

- `src/schemas/ai-responses.test.ts`: `TopicExtractionSchema` aceita
  `divergencias`; default vazio quando ausente; `DivergenciaPedidoSchema`
  normaliza nulls para string vazia.
- Teste do prompt (`document-analysis-prompts.test.ts` ou equivalente): o prompt
  gerado contém a regra de fonte por categoria e documenta `divergencias` no
  formato de resposta.

## Riscos e mitigações

- **Falso-negativo (pedido existia na inicial, modelo não captou):** mitigado
  pela escolha de sinalizar em vez de descartar — o aviso leva o magistrado a
  conferir a inicial.
- **Falso-positivo de divergência (modelo classifica contraposto legítimo como
  divergência):** o critério "a ré *pede* vs. a ré *impugna*" é explicitado no
  prompt; o banner é informativo, não exclui nada que o juiz queira manter.
- **Regressão na detecção de preliminares/processuais:** a regra mantém
  explicitamente essas categorias saindo da contestação; cobrir no teste do
  prompt.

## Rollback

Mudança isolada e aditiva (campo opcional com default vazio). Reverter o commit
restaura o comportamento anterior sem migração de dados — `divergencias` ausente
é tratado como `[]` pelo schema.

## Fora de escopo

- Subapps (prova-oral, embargos, analisador) — autônomos, não fazem esta extração.
- Exclusão automática de tópicos; o magistrado decide na curadoria.
