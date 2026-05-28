# Provider "Codex Local (CLI)" + Web Search nos providers CLI — Design

> **Status:** spec aprovado para escrita de plano (brainstorming concluído em 2026-05-28; revisado no mesmo dia para incluir escopo do daemon e web search)
> **Versão alvo:** 1.50.0 (feat) — bump em CLAUDE.md, App.tsx (`APP_VERSION`), changelog.js, package.json

## Objetivo

1. **Adicionar o sétimo provider de IA** ao SentencifyAI — **"Codex Local (CLI)"** — análogo ao `claude-cli` mas usando OAuth ChatGPT (Plus/Pro). Roda via daemon `claude-bridge` local em endpoint novo `/api/codex-cli/messages`, executando `codex exec --json -m gpt-5.5`.
2. **Habilitar Web Search no chat do assistente** para os dois providers CLI (`claude-cli` e `codex-cli`), com extração de **grounding metadata** (footer "Fontes" igual ao do Gemini).

Uso exclusivo do autor, em uma única máquina. Custo = $0 (assinaturas).

## Pré-requisitos do usuário

| Item | Estado |
|---|---|
| `codex` CLI ≥ 0.134.0 instalado | ✅ (confirmado) |
| `codex login` executado (OAuth ChatGPT) | ✅ (confirmado — `~/.codex/auth.json` existe) |
| `claude` CLI ≥ 2.1.150 instalado e logado | ✅ (já era pré-req do claude-cli) |
| Daemon `claude-bridge` rodando localmente | ✅ (`npm run claude-bridge`) |

## Arquitetura

```
┌──────────────────────────┐         ┌────────────────────────────────────────┐
│ Sentencify (frontend)    │  POST   │ claude-bridge (daemon Node)            │
│ Render OU local          │ ──────► │ http://127.0.0.1:8787                  │
│                          │         │                                        │
│ provider = "claude-cli"  │         │ POST /api/claude-cli/messages          │
│ body = Messages API      │ ──────► │  spawn `claude` (+ WebSearch opcional) │
│                          │ ◄────── │  parse stream-json + grounding         │
│                          │         │                                        │
│ provider = "codex-cli"   │         │ POST /api/codex-cli/messages           │
│ body = Chat Completions  │ ──────► │  spawn `codex exec --json` (+ --search)│
│                          │ ◄────── │  parse JSONL + citations               │
└──────────────────────────┘         └────────────────────────────────────────┘
                                                    │
                                                    ▼ OAuth (assinatura)
                                            Anthropic    OpenAI
                                            (Claude)     (Codex)
```

Três componentes envolvidos, todos no escopo deste plano:

1. **Daemon `claude-bridge/`** (já existe em `/home/nohlack/sentencify/claude-bridge/`)
   - Novo endpoint `/api/codex-cli/messages` (formato Chat Completions, traduz para `codex exec --json`)
   - Endpoint existente `/api/claude-cli/messages` ganha suporte ao campo `web_search: true` (passa `--tools WebSearch --permission-mode bypassPermissions`)
   - Ambos endpoints extraem grounding metadata e devolvem no campo `grounding`
2. **Provider `codex-cli` no frontend** — nova opção que roteia `callOpenAIAPI` com flag `localBridge: true` para `/api/codex-cli/messages`.
3. **Web Search adapters no frontend** — `WEB_SEARCH_REGISTRY` em `src/utils/ai-tools/webSearch.ts` ganha adapters reais para `claude-cli` e `codex-cli`.

---

## Componente 1: daemon `claude-bridge/` (Node)

### 1.1 Novo arquivo `claude-bridge/translate.codex.js`

Espelha `translate.js` (que serve o claude-cli), mas para Codex CLI.

**Responsabilidades**:
- `mapModel(model)` → sempre devolve `'gpt-5.5'` (único modelo suportado nesta versão)
- `extractSystemAndPrompt(body)` → concatena system + messages num único prompt textual com marcadores de role (Codex `exec` não tem `--system`; usamos `--instructions` para system e prompt como argumento principal)
- `buildCodexArgs(body)` → monta args para `codex exec`:
  ```js
  [
    'exec',
    '--json',
    '--skip-git-repo-check',
    '--ephemeral',
    '-s', 'read-only',
    '-a', 'never',
    '-m', mapModel(body.model),
    '-c', `model_reasoning_effort=${VALID_EFFORT.has(body.reasoning_effort) ? body.reasoning_effort : 'medium'}`,
    ...(body.web_search === true ? ['--search'] : []),
    ...(body.instructions ? ['--instructions', body.instructions] : []),
  ]
  ```
- `buildStdin(body)` → o prompt é passado via stdin (codex aceita `-` como prompt). Concatena messages em texto rotulado por role, igual ao `collapseMessages` do claude-bridge.
- `translateResponse(stdout, model)` → parseia o JSONL emitido pelo `codex exec --json`, identifica o evento terminal `task_completed` (ou equivalente), extrai o texto da resposta + citations, devolve `{status, body}` no formato Chat Completions:
  ```json
  {
    "id": "chatcmpl-codex-<session_id>",
    "object": "chat.completion",
    "model": "gpt-5.5",
    "choices": [{
      "index": 0,
      "message": {"role": "assistant", "content": "..."},
      "finish_reason": "stop"
    }],
    "usage": {"prompt_tokens": N, "completion_tokens": N, "total_tokens": N},
    "grounding": {
      "webSearchQueries": [...],
      "groundingChunks": [{"web": {"uri": "...", "title": "..."}}]
    }
  }
  ```

> **Discovery durante implementação**: o formato exato dos eventos JSONL e dos blocos de citation do Codex CLI 0.134.0 é descoberto via smoke test (Task D3 do plano). O parser é escrito contra a saída real, não contra suposições.

### 1.2 Modificação em `claude-bridge/translate.js` (claude-cli) — Web Search

`buildClaudeArgs(body)` ganha tratamento para `body.web_search`:

```js
// Tools: por default --tools "" (zera). Se web_search=true, passa --tools WebSearch
//        e --permission-mode bypassPermissions (auto-aprova WebSearch).
if (body.web_search === true) {
  args.push('--tools', 'WebSearch');
  args.push('--permission-mode', 'bypassPermissions');
} else {
  args.push('--tools', '');
}
```

`translateResponse(stdout, model)` ganha parser de grounding:
- Coleta `tool_use` blocks com `name === 'WebSearch'` → cada um vira uma entrada em `webSearchQueries[]` (campo `input.query`).
- Coleta URLs/títulos citados no texto final do `result` (markdown links `[title](uri)`) → cada um vira um `groundingChunks[i].web`.
- O campo `grounding` é anexado ao body devolvido (formato `GroundingMetadata` do Sentencify).

> Se `permission_denials` aparecer no result e contiver `WebSearch`, devolve 503 com mensagem clara ("WebSearch foi bloqueado pelo CLI — verifique `--allowed-tools` ou permission-mode").

### 1.3 Modificação em `claude-bridge/server.js`

- Nova rota `POST /api/codex-cli/messages`:
  - Lê body JSON, valida `messages[]` não-vazio
  - Importa `buildCodexArgs`, `buildStdin`, `translateResponse` de `translate.codex.js`
  - Spawna `codex` com os args, alimenta stdin, parseia stdout
  - Mesmo padrão de handling de erros do endpoint claude-cli (cliente desistiu → kill, sem stdout → 500, etc.)
- Rota existente `/api/claude-cli/messages` herda automaticamente o suporte a `web_search` (passou para o `translate.js`).
- ALLOWED_ORIGINS: sem mudança (já cobre prod + dev).

### 1.4 Testes do daemon

Arquivo novo `claude-bridge/translate.codex.test.js`:
- `mapModel`: sempre `'gpt-5.5'`
- `buildCodexArgs`: flags corretas; `--search` só quando `web_search=true`; `model_reasoning_effort` correto para cada nível; default `medium` se ausente
- `buildStdin`: turno único + multi-turn (igual claude-bridge: colapsa em texto rotulado)
- `translateResponse`: success normal, success com citations, erro de auth, erro genérico

Arquivo modificado `claude-bridge/translate.test.js` (testes existentes do claude):
- Novos testes: `buildClaudeArgs` com `web_search=true` adiciona `--tools WebSearch --permission-mode bypassPermissions`
- `translateResponse` com tool_use blocks `WebSearch` extrai grounding

**1 smoke test real** (separado, opt-in via env `SMOKE=1`):
- `claude-bridge/translate.codex.smoke.test.js` — invoca `codex exec --json` real com prompt curto. Roda quando `SMOKE=1 npm test`. Pula caso contrário.

---

## Componente 2: provider `codex-cli` no frontend

### 2.1 Tipos (`src/types/ai.ts` + `src/types/index.ts`)

```ts
export type AIProvider =
  | 'claude' | 'gemini' | 'openai' | 'grok' | 'deepseek'
  | 'claude-cli' | 'codex-cli';

/** Reasoning effort do codex-cli (mapeado para `model_reasoning_effort` do config Codex) */
export type CodexCliReasoning = 'minimal' | 'low' | 'medium' | 'high';

export interface APIKeys {
  // ...
  'codex-cli'?: string; // Sem API key — usa OAuth ChatGPT local
}

export interface AISettings {
  // ...
  codexCliModel?: string;            // default 'gpt-5.5'
  codexCliReasoning?: CodexCliReasoning;  // default 'medium'
}
```

### 2.2 Util `src/utils/codex-cli-bridge.ts`

Espelha `claude-cli-bridge.ts`: URL default `http://localhost:8787`, override em `localStorage` chave `sentencify-codex-cli-bridge-url`, exporta `CODEX_CLI_MESSAGES_PATH = '/api/codex-cli/messages'`.

### 2.3 `callOpenAIAPI` ganha branch `localBridge`

No `src/hooks/useAIIntegration.ts` (core) e nos 4 hooks dos subapps:

```ts
const { localBridge = false } = options;
// ... montagem do body OpenAI Chat Completions ...

if (localBridge) {
  requestBody.reasoning_effort = aiSettings.codexCliReasoning || 'medium';
  if (options.webSearchEnabled) requestBody.web_search = true;
}

const url = localBridge
  ? `${getCodexCliBridgeUrl()}${CODEX_CLI_MESSAGES_PATH}`
  : `${API_BASE}/api/openai/chat`;
const headers = localBridge
  ? { 'Content-Type': 'application/json' }
  : { 'Content-Type': 'application/json', 'x-api-key': aiSettings.apiKeys?.openai };

// fetch normal, parse choices[0].message.content
// adicional: if (data.grounding) → propagar para o callsite via onGrounding callback
```

### 2.4 Switches de roteamento (core + 4 subapps)

Em `callAI`, `callAIStream`, `callDoubleCheckAPIStream`: `case 'codex-cli'` → `callOpenAIAPI(..., { localBridge: true, model: codexCliModel || 'gpt-5.5' })`.

### 2.5 Store factory + store core

- `DEFAULT_AI_SETTINGS`: `codexCliModel: 'gpt-5.5'`, `codexCliReasoning: 'medium'`
- `setModel('codex-cli', id)` → grava em `codexCliModel`
- `selectCurrentModel`: case 'codex-cli' → `codexCliModel || 'gpt-5.5'`

### 2.6 Constants `AI_PROVIDERS` (4 subapps)

```ts
'codex-cli': {
  name: 'Codex Local (CLI)',
  icon: 'message-circle',
  models: [
    { id: 'gpt-5.5', name: 'GPT-5.5', recommended: true,
      description: 'Generalista — usado via codex CLI sob assinatura ChatGPT' }
  ]
}
```

### 2.7 UI

- `ProviderIcon.tsx`: `case 'codex-cli'` → `<OpenAIIcon …>` (família OpenAI)
- `AIProviderSelector.tsx` (4 subapps): tile `MessageCircle`, subtítulo "Sem chave — usa OAuth local"
- `ConfigModal.tsx` (core): botão, select de modelo (só gpt-5.5), select de reasoning, doubleCheck, providerColors (`text-emerald-400`), display de "modelo atual"

---

## Componente 3: Web Search nos providers CLI

### 3.1 `src/utils/ai-tools/webSearch.ts` — adapters reais

Substituir `claude-cli: noopAdapter` e adicionar `codex-cli`:

```ts
const claudeCliAdapter: WebSearchProviderAdapter = {
  supportsWebSearch: true,
  applyToRequest: (req) => ({ ...(req as object), web_search: true }),
  extractGrounding: (resp) => {
    const grounding = (resp as { grounding?: GroundingMetadata } | null)?.grounding;
    return grounding ?? null;
  }
};

const codexCliAdapter: WebSearchProviderAdapter = {
  supportsWebSearch: true,
  applyToRequest: (req) => ({ ...(req as object), web_search: true }),
  extractGrounding: (resp) => {
    const grounding = (resp as { grounding?: GroundingMetadata } | null)?.grounding;
    return grounding ?? null;
  }
};

// no registry:
export const WEB_SEARCH_REGISTRY: Record<AIProvider, WebSearchProviderAdapter> = {
  gemini: geminiAdapter,
  claude: noopAdapter,
  'claude-cli': claudeCliAdapter,   // ← era noop
  openai: noopAdapter,
  'codex-cli': codexCliAdapter,     // ← novo
  grok: noopAdapter,
  deepseek: noopAdapter,
};
```

Também: estender o `AIProvider` exportado neste arquivo para incluir `'codex-cli'`.

### 3.2 `WebSearchToggle.tsx` — tooltip multi-provider

Substituir tooltips hardcoded para "(Gemini)" por neutros, ou aceitar prop `providerName?: string` que injeta o nome correto. Decisão simples: parametrizar com `providerName`, callers passam o nome.

### 3.3 Propagação `webSearchEnabled` no fluxo de chamada

O chat do assistente já tem um state `webSearchEnabled` (controlado pelo toggle). Hoje ele é propagado para `applyWebSearchTool` somente para Gemini. Vamos garantir que ele chegue até `callClaudeAPI` (com flag `localBridge: true`) e `callOpenAIAPI` (com flag `localBridge: true`) via `options.webSearchEnabled`, que adiciona `web_search: true` no body do request.

> A 3-camadas de defesa permanece: `enabled && !anonymizationEnabled && supportsWebSearch`.

### 3.4 Extração de grounding na response

Onde hoje há código tipo:
```ts
const grounding = extractGrounding(provider, data);
if (grounding) onGrounding(grounding);
```
(busca por callsites; replicar para o caminho `localBridge: true` quando a response contém `data.grounding`).

---

## Versionamento (5 arquivos — guideline 8 do CLAUDE.md)

Bump para **v1.50.0** em:
- `CLAUDE.md` (linha 7)
- `src/App.tsx` (`APP_VERSION` ~linha 209)
- `src/constants/changelog.js` (nova entrada no topo)
- `package.json`

Changelog (entrada principal):
> feat: provider "Codex Local (CLI)" usando assinatura ChatGPT via daemon (gpt-5.5, reasoning effort minimal/low/medium/high). Web search habilitado em Claude Local (CLI) e Codex Local (CLI) — toggle Web no assistente de redação agora funciona nos três providers que suportam (Gemini + dois CLIs locais), com footer "Fontes" exibindo URLs consultadas.

---

## Fora do escopo (YAGNI explícito)

| Item | Por quê |
|---|---|
| Streaming de eventos do Codex/Claude no chat | Paridade com claude-cli inicial; bridge devolve resposta completa. |
| PDF binário no codex-cli | Codex CLI não tem suporte direto a PDF; modelos GPT-5 aceitam imagens via Responses API mas requer fluxo separado. |
| Reuso de sessões nativas do Codex | Cada call do daemon é um `codex exec --ephemeral` independente. Histórico do chat é preservado via `messages[]` (stateless, igual a todos os outros providers). |
| Variantes `gpt-5-codex`/`gpt-5-codex-mini` | Uso do usuário não é coding; só `gpt-5.5` faz sentido. |
| Web search no Claude (API) / OpenAI / Grok | Fora deste plano. Esses providers continuam noopAdapter (a estrutura está pronta para adicioná-los depois). |
| Citations estruturadas dentro de `tool_use` no Claude | claude CLI hoje devolve markdown links inline no texto. O parser do daemon extrai esses URLs via regex; uma extração mais rica (citations API da Anthropic) é trabalho futuro. |

---

## Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Formato JSONL do Codex CLI muda entre versões | Smoke test no daemon (`SMOKE=1`) detecta quebra cedo. Pin de versão mínima documentado (0.134.0). |
| `--permission-mode bypassPermissions` no claude permite outros tools acidentalmente | Combinado com `--tools WebSearch` explícito que limita o conjunto a só WebSearch — bypassPermissions só remove o prompt, não amplia o tool set. |
| Quebra acidental do `claude-cli` ao mexer no daemon | Mitigação: testes do `translate.js` cobrem o caminho atual (`--tools ""`) e o novo (`--tools WebSearch`); regressão no path padrão pega no test suite. |
| Codex CLI cobra créditos da assinatura ChatGPT | Esperado (mesma lógica do claude-cli usar créditos da assinatura Claude). Sem cobrança de API. |
| Token OAuth ChatGPT expira | Daemon devolve 401; UI exibe mensagem orientando `codex login`. Manter consistência com mensagem do claude-cli. |
| Citations no Codex CLI sem URLs (modelo respondeu da memória) | Aceitável — `groundingChunks` vazio, `webSearchQueries: []`. UI lida com `grounding: null` (já lida hoje em Gemini quando nada foi consultado). |

---

## Checklist de paridade

**Codex-cli (provider novo):**
- [x] `AIProvider`, `APIKeys`, `AISettings`, `CodexCliReasoning` tipados
- [x] Util `codex-cli-bridge.ts` (com testes)
- [x] `callOpenAIAPI` ganha branch `localBridge` (core + 4 subapps)
- [x] Switches `case 'codex-cli'` (core + 4 subapps)
- [x] Defaults nos stores (factory + core)
- [x] `AI_PROVIDERS` em 4 subapps
- [x] UI: `AIProviderSelector`, `ModelSelector`, `ConfigModal`, `ProviderIcon`
- [x] doubleCheck com codex-cli
- [x] Bump v1.50.0 nos 5 arquivos

**Daemon `claude-bridge/`:**
- [x] `translate.codex.js` novo
- [x] `server.js` ganha rota `/api/codex-cli/messages`
- [x] `translate.js` aceita `body.web_search` para claude-cli
- [x] Testes unitários (translate.codex.test.js novo + translate.test.js update)
- [x] Smoke test real opt-in

**Web search (claude-cli + codex-cli):**
- [x] `webSearch.ts`: adapters reais (não-noop) com `applyToRequest` e `extractGrounding`
- [x] `WebSearchToggle.tsx` parametrizado por providerName
- [x] Toggle visível e funcional nos 3 providers (Gemini, claude-cli, codex-cli)
- [x] Footer "Fontes" exibe URLs nos providers CLI
- [x] Daemon devolve `grounding` no response body
