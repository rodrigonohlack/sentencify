# Design — Modo "Sem Provider (copiar/colar)"

**Data**: 2026-06-09
**Versão alvo**: a partir de v1.52.49 (bump no commit de implementação)
**Motivação**: fallback de custo. Permitir continuar usando o SentencifyAI (e subapps) a custo $0, roteando manualmente os prompts pelo Claude Max / Claude web / Claude Code / qualquer outro LLM, sem depender de API paga nem do daemon `llm-bridge` (que passa a ser pago em 15/jun/2026).

## Resumo

Adicionar um provider `'manual'` ao app. Quando selecionado, toda chamada LLM elegível, em vez de fazer fetch, abre um **modal único** com o prompt pronto para copiar e um campo para colar a resposta. Ao confirmar, o fluxo segue exatamente como se a resposta tivesse vindo de uma API. A chamada `async` profunda no hook é transformada numa ida-e-volta de UI via um **broker baseado em Zustand**.

## Princípios de escopo (decididos no brainstorming)

No modo `'manual'`:

- **Somente chamadas únicas (ou sequenciais), text-only, sem streaming, sem double-check, sem multiagente.**
- **Voz** (mic + melhoria de voz): desabilitada/escondida.
- **Streaming**: chamadas que normalmente fazem streaming caem no caminho não-stream (resposta inteira de uma vez); `onChunk` é ignorado.
- **Double-check**: forçado off / oculto (inclui o "auditor de fatos", que é o double-check da comparação de fatos).
- **Multi-call paralelo** (análise multiagente, geração paralela de tópicos): desabilitado. Fluxos **sequenciais dependentes** (ex.: prova oral em 3 fases) são permitidos — o modal abre uma vez por etapa ("fase X de N").
- **Refinamento de sugestão de modelo, legislação e jurisprudência**: seguem **apenas em IA local** (E5/embeddings); nunca abrem o modal manual.
- **PDF binário**: o modo manual NÃO aceita PDF puro — exatamente como o Grok. O usuário tem que extrair o texto antes (pdf.js / tesseract / vision). As features de documento então funcionam no manual usando o **texto extraído**.

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
  - Se encontrar qualquer bloco binário (`type === 'document'` / imagem) → lança `ManualUnsupportedError`. **Rede de segurança**: no modo manual o binário já é prevenido na origem (ver "Bloqueio de PDF puro" abaixo); o guard só dispara se algo escapar.
- `normalizeManualResponse(raw): string`
  - Remove cercas markdown (` ```json `, ` ``` `) e faz trim, para a resposta colada do Claude web alimentar os parsers downstream sem ruído.
- `isPdfBinaryAllowed(provider): boolean` → `false` para `'manual'` (e já `'grok'`). Helper único reusado pelos hooks de documento.
- Erros tipados: `ManualUnsupportedError`, `ManualCancelledError`.

**2b. Bloqueio de PDF puro no modo manual**
- Os hooks de documento decidem binário×texto por modo (`getEffectiveMode`, `useDocumentAnalysis.ts:277`), que **já rebaixa** `pdf-puro` → `pdfjs` quando a anonimização está ligada (lista `blockedModes`).
- Estender esse mesmo mecanismo: quando `provider === 'manual'`, `pdf-puro` é tratado como bloqueado e cai para o modo de extração (global OCR engine ou `pdfjs`). Aplicar nos 4 hooks que constroem bloco `type: 'document'` (`useDocumentAnalysis`, `useReportGeneration`, `useProofAnalysis`, `useFactsComparison`) e nos anexos em `src/utils/context-helpers.ts:272,474` (`usePdfPuro`).
- Extração por **vision** (claude-vision/gemini-vision) chama API/bridge própria e tem custo — fica disponível, mas para $0 real o usuário deve usar `pdfjs`/`tesseract` (local). Decisão por documento; não bloqueada.

**3. Broker** — `src/stores/useManualCallStore.ts`
```
state:
  pending: { id: string, prompt: string, meta?: { title?: string }, resolve: (t: string) => void, reject: (e: Error) => void } | null

actions:
  enqueue(prompt: string, meta?: { title?: string }): Promise<string>
    // cria a Promise, guarda resolve/reject, seta pending.
    // se já houver pending, rejeita a NOVA com ManualUnsupportedError
    //   (só ocorre em multi-call PARALELO, que está off).
  resolveCurrent(text: string): void   // resolve a Promise e limpa pending
  rejectCurrent(reason?: Error): void  // rejeita (default ManualCancelledError) e limpa pending
```
- Acessado fora de React via `useManualCallStore.getState()` dentro dos hooks.
- **Sequencial funciona naturalmente**: cada fase da prova oral faz `await` da anterior, então cada `enqueue` ocorre sozinho. `meta.title` (ex.: "Prova oral — fase 2 de 3") só enriquece o cabeçalho do modal.
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

### Mapeamento completo dos call-sites (varredura realizada)

**✅ Funcionam no modo manual (texto puro, chamada única):**
| Recurso | Arquivo |
|---|---|
| Ctrl+K / assistente IA no editor | `components/modals/GlobalEditorModal.tsx` |
| Assistente IA (chat) | `hooks/useChatAssistant.ts` |
| Geração de texto da decisão | `hooks/useDecisionTextGeneration.ts` |
| Gerador de dispositivo | `hooks/useDispositivoGeneration.ts` |
| Revisor de sentença | `hooks/useReviewSentence.ts` |
| Extrator de modelo | `hooks/useModelExtraction.ts` |
| Gerador de modelo (palavras-chave + corpo) | `hooks/useModelGeneration.ts`, `components/ModelGeneratorModal.tsx` |
| Renomear / unir / dividir tópicos | `hooks/useTopicEditing.ts` |
| Reordenar tópicos | `hooks/useTopicOrdering.ts` |
| Análise em massa de texto colado | `hooks/useFileHandling.ts` |
| Embargos: rascunho, refino de seção, síntese | `apps/embargos/hooks/{useDraftGeneration,useSectionRefine,useSynthesisAnalysis}.ts` |
| Analisador: análise, síntese, refino de pedido (já usam texto extraído) | `apps/analisador/hooks/{useAnalysis,useSynthesis,useRefinePedido}.ts` |
| Notícias: resumo | `apps/noticias/NoticiasApp.tsx` |

**✅ Funcionam no manual, MAS exigem extração de texto (hoje mandam PDF puro):** o modo `pdf-puro` é rebaixado para extração (ver "Bloqueio de PDF puro").
| Recurso | Arquivo |
|---|---|
| Análise inicial dos documentos | `hooks/useDocumentAnalysis.ts` |
| Mini-relatório / relatório | `hooks/useReportGeneration.ts` |
| Confronto de fatos | `hooks/useFactsComparison.ts` |
| Análise de provas | `hooks/useProofAnalysis.ts` |

**✅ Funciona no manual via fila SEQUENCIAL ("fase X de 3"):**
| Recurso | Arquivo |
|---|---|
| Prova oral (3 fases encadeadas) | `apps/prova-oral/hooks/useProvaOralAnalysis.ts` |

**🚫 Desligados no modo manual:**
| Recurso | Arquivo | Comportamento |
|---|---|---|
| Voz (mic + melhoria de voz) | `hooks/useVoiceImprovement.ts` | Botões desabilitados/escondidos |
| Double-check (inclui "auditor de fatos") | `useFactsComparison.ts:292`, `useAIIntegration.performDoubleCheck` | Forçado off / oculto |
| Multiagente (paralelo) | skill/fluxo multiagente | Desabilitado |

**🧠 Só IA local no modo manual (nunca abrem modal):**
| Recurso | Arquivo |
|---|---|
| Refinamento de sugestão de modelo | `hooks/useModelSuggestions.ts:232` |
| Jurisprudência | `utils/jurisprudencia.ts:170` |
| Legislação (já não chama LLM) | — |

> As 5 cópias de `useAIIntegration` recebem a interceptação `'manual'`. Os desligamentos acima são checagens de `provider === 'manual'` nos respectivos hooks/UI.

### Tratamento de erro / cancelamento

- **Cancelar** o modal → `rejectCurrent(new ManualCancelledError())`. Os call-sites já têm try/catch de abort; tratam como operação cancelada, **sem toast de erro**.
- **`ManualUnsupportedError`** → toast claro. Em uso normal não deve aparecer (PDF puro é rebaixado para extração antes); é rede de segurança caso um bloco binário escape ao serializer.

### Token tracking

- Chamadas manuais registram custo **$0**. Opcionalmente contam caracteres do prompt/resposta apenas para estatística (sem custo).

## Testes

- `manualCall.test.ts`: `serializeForManual` (junta system + texto; lança em binário), `normalizeManualResponse` (remove cercas/trim), `isPdfBinaryAllowed('manual') === false`.
- `useManualCallStore.test.ts`: enqueue resolve/reject; segunda chamada **concorrente** rejeita; duas chamadas **sequenciais** (await) resolvem ambas.
- `getEffectiveMode`: com `provider==='manual'`, `pdf-puro` é rebaixado para extração (mesma asserção do caminho de anonimização).
- `ManualCallModal.test.tsx`: render só com pending; Copiar; Confirmar resolve; Cancelar rejeita; Confirmar desabilitado com textarea vazia.
- Teste de despacho: `callAI`/`callAIStream` com `provider='manual'` chamam o broker e retornam a resposta normalizada (importando o código de produção, conforme guideline 10 do CLAUDE.md).

## Versionamento

Bump nos 4 arquivos no mesmo commit de implementação: `CLAUDE.md` (linha 7), `src/App.tsx` (`APP_VERSION`), `src/constants/changelog.js`, `package.json`. Formato `v1.XX.YY`.

## Fora de escopo (YAGNI)

- Anexar PDFs no modal (decidido: PDF puro é proibido; usa-se texto extraído, como no Grok).
- Fila visível de múltiplos prompts paralelos (multi-call paralelo está desligado; sequencial usa um modal por vez).
- Histórico de prompts manuais.
- Streaming simulado / parsing incremental no modo manual.
