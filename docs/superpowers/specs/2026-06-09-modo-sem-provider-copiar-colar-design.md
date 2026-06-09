# Design — Modo "Sem Provider (copiar/colar)"

**Data**: 2026-06-09
**Versão alvo**: a partir de v1.52.49 (bump no commit de implementação)
**Motivação**: fallback de custo. Permitir continuar usando o SentencifyAI (e subapps) a custo $0, roteando manualmente os prompts pelo Claude Max / Claude web / Claude Code / qualquer outro LLM, sem depender de API paga nem do daemon `llm-bridge` (que passa a ser pago em 15/jun/2026).

## Resumo

Adicionar um provider `'manual'` ao app. Quando selecionado, toda chamada LLM elegível, em vez de fazer fetch, abre um **modal único** com o prompt pronto para copiar e um campo para colar a resposta. Ao confirmar, o fluxo segue exatamente como se a resposta tivesse vindo de uma API. A chamada `async` profunda no hook é transformada numa ida-e-volta de UI via um **broker baseado em Zustand**.

## Princípios de escopo (decididos no brainstorming)

No modo `'manual'`:

- **Somente chamadas únicas, text-only, sem streaming, sem double-check, sem multiagente.**
- **Voz** (mic + melhoria de voz): desabilitada/escondida.
- **Streaming**: chamadas que normalmente fazem streaming caem no caminho não-stream (resposta inteira de uma vez); `onChunk` é ignorado.
- **Double-check**: forçado off / oculto.
- **Multi-call** (análise multiagente, geração paralela de tópicos, qualquer fluxo que dispare N chamadas): desabilitado.
- **Refinamento de sugestão de modelo, legislação e jurisprudência**: seguem **apenas em IA local** (E5/embeddings); nunca abrem o modal manual.
- **Chamadas com PDF/imagem binária no contexto** (OCR por visão, double-check multimodal, etc.): **indisponíveis** no modo manual (o app quase sempre já tem o texto extraído, mas as chamadas que dependem do binário ficam fora).

## Arquitetura

### Contexto do código existente

- O despacho de provider é centralizado em **dois pontos** por cópia do hook:
  - `callAI` (não-stream) — `src/hooks/useAIIntegration.ts:1473`
  - `callAIStream` (streaming) — `src/hooks/useAIIntegration.ts:2160`
  - ambos resolvem `const provider = options.provider || aiSettings.provider`.
- `AIProvider` é um enum de strings em `src/types/index.ts:250`.
- Há **5 cópias** de `useAIIntegration` (subapps são autônomos por design — duplicação intencional, NÃO consolidar):
  - `src/hooks/useAIIntegration.ts` (principal)
  - `src/apps/prova-oral/hooks/useAIIntegration.ts`
  - `src/apps/embargos/hooks/useAIIntegration.ts`
  - `src/apps/noticias/hooks/useAIIntegration.ts`
  - `src/apps/analisador/hooks/useAIIntegration.ts`
- Modais novos usam `BaseModal` (`src/components/modals/BaseModal.tsx`).
- Stores são Zustand + immer.

### Componentes a criar

**1. Tipo `'manual'` no enum** — `src/types/index.ts`
- Adicionar `'manual'` a `AIProvider`.
- `selectCurrentModel` (useAIStore) retorna `'manual'`; sem API key, sem modelo.

**2. Util compartilhado** — `src/utils/manualCall.ts`
- `serializeForManual(messages, options, getAiInstructions): string`
  - Junta as **instruções de sistema** (mesma origem usada pelos providers reais) + os blocos de **texto** de cada mensagem num único prompt copiável e autossuficiente.
  - Se encontrar qualquer bloco binário (`type === 'document'` / imagem) → lança `ManualUnsupportedError`.
- `normalizeManualResponse(raw): string`
  - Remove cercas markdown (` ```json `, ` ``` `) e faz trim, para a resposta colada do Claude web alimentar os parsers downstream sem ruído.
- Erros tipados: `ManualUnsupportedError`, `ManualCancelledError`.

**3. Broker** — `src/stores/useManualCallStore.ts`
```
state:
  pending: { id: string, prompt: string, resolve: (t: string) => void, reject: (e: Error) => void } | null

actions:
  enqueue(prompt: string): Promise<string>
    // cria a Promise, guarda resolve/reject, seta pending.
    // se já houver pending, rejeita a NOVA com ManualUnsupportedError (multi-call está off; não deveria acontecer).
  resolveCurrent(text: string): void   // resolve a Promise e limpa pending
  rejectCurrent(reason?: Error): void  // rejeita (default ManualCancelledError) e limpa pending
```
- Acessado fora de React via `useManualCallStore.getState()` dentro dos hooks.
- Não persiste (callbacks não são serializáveis).

**4. Interceptação nos dispatchers** — nas 5 cópias, no topo de `callAI` e `callAIStream`:
```
if (provider === 'manual') {
  const promptText = serializeForManual(messages, options, getAiInstructions);
  const raw = await useManualCallStore.getState().enqueue(promptText);
  return normalizeManualResponse(raw);
}
```
- Em `callAIStream`, `onChunk` é ignorado (sem streaming).

**5. Modal global** — `src/components/modals/ManualCallModal.tsx`
- Montado **uma vez** na raiz do app; lê `useManualCallStore`. Renderiza só quando `pending !== null`.
- Usa `BaseModal`. Layout (modal único, 2 seções):
  - **PROMPT** (read-only) + botão **Copiar** (clipboard).
  - **RESPOSTA** (textarea) + **Confirmar** (`resolveCurrent`) / **Cancelar** (`rejectCurrent`).
- Confirmar desabilitado enquanto a textarea estiver vazia.
- Funciona em tema claro e escuro (`dark:`).
- Botões seguem `src/components/ui/Button.tsx` (azul primário no Confirmar, neutro no Cancelar).

### Fluxo de dados

```
feature (ex.: gerar sentença)
  → callAI(messages, options)   [provider = 'manual']
      → serializeForManual() → promptText
      → useManualCallStore.enqueue(promptText)  [retorna Promise pendente]
          → <ManualCallModal> renderiza pending
          → usuário copia prompt, cola no Claude web, cola a resposta de volta
          → Confirmar → resolveCurrent(texto)
      ← Promise resolve com texto
      → normalizeManualResponse(texto)
  ← feature recebe a string como se viesse da API e segue o fluxo normal (parse JSON, etc.)
```

### Desligamento de recursos quando `provider === 'manual'`

Cada item abaixo verifica o provider atual e ajusta UI/comportamento:

| Recurso | Comportamento no modo manual |
|---|---|
| Voz (mic, melhoria de voz) | Botões desabilitados/escondidos |
| Double-check | Forçado off / oculto nas settings e no fluxo |
| Multi-call (multiagente, tópicos em paralelo) | Desabilitado |
| Refinamento de modelo / legislação / jurisprudência | Só IA local (E5); não abrem modal |
| Chamadas com PDF/imagem binária | `ManualUnsupportedError` → toast explicativo |

### Tratamento de erro / cancelamento

- **Cancelar** o modal → `rejectCurrent(new ManualCancelledError())`. Os call-sites já têm try/catch de abort; tratam como operação cancelada, **sem toast de erro**.
- **`ManualUnsupportedError`** → toast claro: recurso precisa de provider real.

### Token tracking

- Chamadas manuais registram custo **$0**. Opcionalmente contam caracteres do prompt/resposta apenas para estatística (sem custo).

## Testes

- `manualCall.test.ts`: `serializeForManual` (junta system + texto; lança em binário), `normalizeManualResponse` (remove cercas/trim).
- `useManualCallStore.test.ts`: enqueue resolve/reject; segunda chamada concorrente rejeita.
- `ManualCallModal.test.tsx`: render só com pending; Copiar; Confirmar resolve; Cancelar rejeita; Confirmar desabilitado com textarea vazia.
- Teste de despacho: `callAI`/`callAIStream` com `provider='manual'` chamam o broker e retornam a resposta normalizada (importando o código de produção, conforme guideline 10 do CLAUDE.md).

## Versionamento

Bump nos 4 arquivos no mesmo commit de implementação: `CLAUDE.md` (linha 7), `src/App.tsx` (`APP_VERSION`), `src/constants/changelog.js`, `package.json`. Formato `v1.XX.YY`.

## Fora de escopo (YAGNI)

- Anexar PDFs no modal (decidido: chamadas binárias ficam indisponíveis).
- Fila visível de múltiplos prompts (multi-call está desligado).
- Histórico de prompts manuais.
- Streaming simulado / parsing incremental no modo manual.
