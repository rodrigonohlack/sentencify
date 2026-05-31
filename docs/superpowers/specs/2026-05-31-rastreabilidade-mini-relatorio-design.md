# Rastreabilidade de fontes do mini-relatório

**Data:** 2026-05-31
**Status:** Aprovado (design) — pendente plano de implementação
**Escopo:** App principal de sentença (`src/App.tsx` + `src/hooks/useReportGeneration.ts`). **NÃO** abrange os subapps prova-oral/embargos/analisador (autônomos por design).

---

## 1. Problema

Hoje, quando a IA gera um mini-relatório (resumo narrativo dos fatos por tópico), o retorno é
**texto HTML puro, sem nenhum rastro** de quais peças/trechos embasaram cada afirmação. Não há campo
de fontes, citações ou metadados no objeto `Topic`. O usuário (juiz) não tem como auditar se a IA
não alucinou, nem de onde veio cada fato.

### Objetivo (em ordem de prioridade)
- **A) Auditoria / anti-alucinação (prioridade):** confirmar que cada fato do mini-relatório está
  de fato na petição/contestação, e não foi inventado ou distorcido.
- **B) Navegação (futuro):** ancorar o trecho na posição da peça (offset/página). O design já
  captura os offsets; a UI de "pular para o PDF" fica para iteração posterior.
- **C) Atribuição de parte:** saber *quem* alegou o quê (reclamante × qual reclamada).

---

## 2. Decisões de arquitetura (e por quê)

### 2.1 Por que prompt-based + verificação local (e não citation nativo)

Pesquisa de mai/2026 sobre citation/grounding nativo de **documento enviado inline**:

| Provedor | Citation nativo de doc inline? | Observação |
|---|---|---|
| Claude API cru | ✅ Sim | mas **incompatível com Structured Outputs** (erro 400); mata o JSON por bloco |
| claude-cli / bridge (provedor $0 atual) | ❌ Não | harness agêntico, não é passthrough da Messages API |
| OpenAI inline (`input_file`) | ❌ Não | citação só via `file_search` sobre vector store gerenciado (upload server-side) |
| OpenAI via Codex | ❌ Não existe | Codex é agente de código, não expõe anotações de citação |
| Gemini inline | ❌ Não | grounding só via Google Search ou File Search tool (store gerenciado) |

Conclusão: citation nativo só funcionaria num único provedor (Claude API cru), custaria a saída
estruturada e deixaria de fora o claude-cli (provedor principal hoje). Além disso, subir peças
sigilosas de processos trabalhistas para vector stores de terceiros é indesejável.

**Escolha:** abordagem **prompt-based, multi-provedor**, com **verificação local determinística**
dos trechos contra o texto das peças que o app **já tem no cliente** (`peticoesText`,
`contestacoesText`). Isso fecha o buraco da alucinação sem depender da boa-fé do modelo e sem
mandar nada extra para a nuvem.

### 2.2 Por que segundo passe sob demanda (e não pass único nem automático)

- **Não desestabiliza** a geração do mini-relatório, que já é estável e iterada/editada com frequência.
- **Audita o texto que está na tela agora**, inclusive edições manuais do juiz — que é literalmente
  o que ele quer conferir.
- **Opt-in / sob demanda** = zero custo extra de API no dia a dia (respeita a quota).
- Funciona em relatórios **já existentes**.

### 2.3 Por que persistir junto do tópico

Decisão do usuário: o resultado da rastreabilidade persiste no `Topic` (via o mesmo mecanismo de
sessão que salva `selectedTopics`), para reabrir sem re-rodar. Staleness é tratada por snapshot
(ver §3.3 e §5).

---

## 3. Design técnico

### 3.1 Modelo de dados

Novos tipos em `src/types/index.ts`:

```ts
export interface RelatorioFonteTrecho {
  trecho: string;                              // citação verbatim devolvida pela IA
  peca: string;                                // rótulo da peça → caso C
  status: 'verificado' | 'nao_localizado';     // resultado do match local → caso A
  matchScore?: number;                         // 0–1 (fuzzy)
  offsetInicio?: number;                        // posição na string original da peça → habilita caso B
  offsetFim?: number;
}

export interface RelatorioBlocoFonte {
  blocoIndex: number;                          // = índice do parágrafo do relatório
  blocoResumo: string;                         // 1ª linha/início do parágrafo (identificação na UI)
  trechos: RelatorioFonteTrecho[];
}

export interface RelatorioRastreabilidade {
  geradoEm: string;                            // ISO timestamp
  baseSnapshot: string;                        // texto do relatório auditado (detecção de staleness)
  modelo?: string;                             // provedor/modelo usado
  blocos: RelatorioBlocoFonte[];
}
```

Campo novo em `Topic` (`src/types/index.ts`):

```ts
relatorioFontes?: RelatorioRastreabilidade;
```

Persistência: nenhuma mudança de mecanismo — `relatorioFontes` viaja junto do `Topic` no
`useTopicsStore` / `sentencifySession`.

### 3.2 Geração (segundo passe)

Função nova `traceReportSources(topic): Promise<RelatorioRastreabilidade>` em
`src/hooks/useReportGeneration.ts`, ao lado de `generateMiniReport`.

Fluxo:
1. **Texto-alvo:** `editedRelatorio ?? relatorio`. Abortar com mensagem clara se vazio.
2. **Split em parágrafos no cliente:** dividir o HTML em parágrafos (`<p>`/blocos), extrair texto
   limpo de cada um, **numerar** (1..N). O bloco é o parágrafo — fronteira determinística; o modelo
   não inventa divisões.
3. **Contexto:** reusar `buildDocumentContentArray({ includePeticao:true, includeContestacoes:true,
   includeComplementares })` — mesmas peças da geração.
4. **Prompt** (instruções positivas, evitando proibições que citam a frase a evitar): instruir a IA a, para
   cada parágrafo numerado, devolver os **trechos LITERAIS** (cópia exata, sem reescrever) das peças
   que o embasam, rotulando a peça de origem, em **JSON** com shape conhecido.
5. **Chamada:** `aiIntegration.callAI(...)` (multi-provedor, como hoje), `maxTokens` adequado.
6. **Parse do JSON** robusto (tolerar cercas ```json, texto antes/depois — seguir o padrão de parse
   já usado no app).
7. **Verificação local** (§3.3) preenche `status`/`matchScore`/offsets de cada trecho.
8. Retorna `RelatorioRastreabilidade` com `geradoEm`, `baseSnapshot` = texto-alvo, `modelo`.

### 3.3 Verificação local (garantia anti-alucinação — caso A)

Para cada `trecho`, comparar contra a concatenação rotulada de `peticoesText` + `contestacoesText`
(e complementares, se incluídos):

1. **Normalização** de ambos os lados: minúsculas, remoção de acentos/diacríticos, colapso de
   espaços/quebras de linha, normalização de aspas/hífens. (Lida com o lixo de extração de PDF.)
2. **Match exato normalizado:** se o trecho normalizado é substring do texto normalizado da peça →
   `verificado`; mapear de volta para os offsets na **string original** (`offsetInicio`/`offsetFim`).
3. **Fuzzy** (fallback): janela deslizante do tamanho do trecho, similaridade por sobreposição de
   tokens; se `score ≥ 0.85` → `verificado` + `matchScore`.
4. Senão → `nao_localizado`.

Tudo determinístico, no cliente, sem chamada de rede. Trecho inventado pela IA não bate e é marcado.

> **Limiar 0.85** é o ponto de partida aprovado; ajustável após teste com peças reais.

### 3.4 UI

- **Botão "Rastrear fontes"** junto ao mini-relatório, na área do `QuillMiniRelatorioEditor` /
  `DecisionEditorContainer`. **Não** alterar o editor Quill em si (evita poluir o conteúdo editável).
  Estados: idle → carregando (spinner) → concluído.
- **Modal de resultado** usando `BaseModal` (diretriz #6), título "Rastreabilidade do
  mini-relatório":
  - Lista cada **parágrafo** do relatório (na ordem) e, sob/junto dele, seus **trechos-fonte**.
  - Cada trecho: texto citado + **rótulo da peça** (caso C) + selo **✓ verificado** (verde) /
    **⚠ não localizado** (âmbar).
  - Cabeçalho com contagem resumo (ex.: "12 trechos · 11 verificados · 1 não localizado") e
    `geradoEm`.
- **Cache + staleness:** reabrir o modal mostra o resultado persistido **sem re-rodar**. Se o texto
  atual do relatório difere de `baseSnapshot`, exibir faixa **"⟳ fontes desatualizadas — o
  relatório foi editado desde a última rastreabilidade"** com botão **Regerar**.
- **Temas claro e escuro** (diretriz #9), com `dark:` do Tailwind.

---

## 4. Componentes / arquivos afetados

| Arquivo | Mudança |
|---|---|
| `src/types/index.ts` | + tipos `RelatorioFonteTrecho`, `RelatorioBlocoFonte`, `RelatorioRastreabilidade`; + campo `relatorioFontes` em `Topic` |
| `src/hooks/useReportGeneration.ts` | + `traceReportSources()`; + `buildSourceTracingPrompt()`; reuso de `buildDocumentContentArray()` |
| `src/utils/` (novo) | + util de verificação local (`verifyTrechoInSource`/normalização/fuzzy); + util de split de parágrafos do HTML |
| `src/components/.../` (novo modal) | + `RastreabilidadeModal` (via `BaseModal`) |
| `src/components/editors/DecisionEditorContainer.tsx` (ou onde o mini-relatório é exibido) | + botão "Rastrear fontes" + estado de abertura do modal |
| `src/App.tsx` | fiação: handler que chama `traceReportSources`, grava `relatorioFontes` no tópico, abre o modal |
| Versão (4–5 arquivos) | `CLAUDE.md`, `package.json`, `APP_VERSION`, `changelog.js` |

---

## 5. Fluxo de dados

```
[Botão "Rastrear fontes"] (DecisionEditorContainer)
   → App.tsx handler
      → traceReportSources(topic)            (useReportGeneration)
         1. texto-alvo = editedRelatorio ?? relatorio
         2. split parágrafos numerados (util)
         3. buildDocumentContentArray()       (peças)
         4. buildSourceTracingPrompt()
         5. aiIntegration.callAI()            (multi-provedor)
         6. parse JSON
         7. verifyTrechoInSource() por trecho (util — match local)
         8. → RelatorioRastreabilidade
      → grava topic.relatorioFontes (useTopicsStore / sessão)
      → abre RastreabilidadeModal
[Reabrir depois] → lê topic.relatorioFontes (cache); compara com baseSnapshot → faixa staleness
```

---

## 6. Tratamento de erros

- **Relatório vazio:** abortar antes da chamada, mensagem clara ("gere o mini-relatório primeiro").
- **Falha da API / provedor:** propagar erro com toast; não persistir resultado parcial.
- **JSON inválido:** parse tolerante; se irreparável, erro amigável e não persiste.
- **`blocoIndex` fora do range** devolvido pela IA: descartar bloco órfão (log), manter os válidos.
- **Nenhum trecho para um parágrafo:** bloco aparece com "sem trechos identificados" (não é erro).
- **Peças ausentes** (sem `peticoesText`/`contestacoesText`): a verificação marca tudo
  `nao_localizado`; avisar que não há texto-fonte para auditar.

---

## 7. Testes

Seguindo a diretriz #10 (testes importam código de produção real):
- **Verificação local (unit):** trecho idêntico → `verificado` (offsets corretos); trecho com
  variação de espaços/acentos → `verificado` via normalização; trecho parcial ≥0.85 → `verificado`
  fuzzy; trecho inventado → `nao_localizado`.
- **Split de parágrafos:** HTML com N `<p>` → N blocos numerados; entidades/aninhamento tratados.
- **Parse JSON:** entrada com cercas ```json e ruído → objeto correto; JSON inválido → erro tratado.
- **Staleness:** `baseSnapshot` ≠ texto atual → faixa de desatualização.

---

## 8. Fora de escopo (YAGNI)

- "Pular para a página do PDF" (caso B): offsets são capturados, mas a navegação visual fica para
  iteração futura.
- Rastreabilidade de fundamentação/dispositivo (só mini-relatório nesta entrega).
- Subapps prova-oral/embargos/analisador.
- Rastreabilidade automática a cada geração (decisão: sob demanda).
- Histórico de versões da rastreabilidade (guarda-se apenas a última).
