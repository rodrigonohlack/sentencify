# Provider "Codex Local (CLI)" — Design

> **Status:** spec aprovado para escrita de plano (brainstorming concluído em 2026-05-28)
> **Versão alvo:** 1.49.0 (feat) — bump em CLAUDE.md, App.tsx (`APP_VERSION`), changelog.js, package.json

## Objetivo

Adicionar um sétimo provider de IA ao SentencifyAI — **"Codex Local (CLI)"** — simétrico ao `claude-cli` já existente. Em vez de chamar a API paga da OpenAI, executa o binário `codex` (Codex CLI) instalado na máquina do usuário usando o **login OAuth do ChatGPT** (Plus/Pro/Business). Uso exclusivo do autor, em uma única máquina. Funciona inclusive com o frontend servido em produção (Render), apontando para o mesmo daemon local que já hospeda o `claude-cli`.

## Pré-requisitos do usuário (já satisfeitos)

- `codex` CLI instalado e `codex login` executado (token OAuth salvo em `~/.codex/auth.json`).
- Daemon `claude-bridge` rodando localmente em `http://localhost:8787`.

## Arquitetura

```
┌──────────────────────────┐         ┌──────────────────────────────────┐
│ Sentencify (frontend)    │  POST   │ claude-bridge (daemon Node)      │
│ Render OU local          │ ──────► │ http://127.0.0.1:8787            │
│ provider = "codex-cli"   │  JSON   │ /api/codex-cli/messages          │
│ body = Chat Completions  │ ◄────── │  1. traduz body → prompt único   │
│ (callOpenAIAPI)          │         │  2. spawn `codex exec --json`    │
└──────────────────────────┘         │  3. eventos NDJSON → resposta CC │
                                      └──────────────────────────────────┘
                                                    │ assinatura ChatGPT
                                                    ▼  (custo $0)
                                                  OpenAI
```

Dois componentes envolvidos:

1. **Daemon `claude-bridge`** — já existe; ganha um endpoint novo `/api/codex-cli/messages`. **Não faz parte deste plano de implementação** (vive em repositório separado). Este spec define apenas o **contrato** que o daemon deve respeitar.
2. **Provider no frontend (`codex-cli`)** — nova opção que roteia para o daemon. Foco deste plano.

---

## Componente 1: contrato do endpoint (lado daemon, fora do escopo de código deste repo)

### Request

```
POST http://localhost:8787/api/codex-cli/messages
Content-Type: application/json

{
  "model": "gpt-5",                    // ou "gpt-5-codex"
  "messages": [
    {"role": "system",    "content": "<system prompt do Sentencify>"},
    {"role": "user",      "content": "<turno 1>"},
    {"role": "assistant", "content": "<resposta 1>"},
    {"role": "user",      "content": "<turno 2 — atual>"}
  ],
  "max_tokens": 8192,
  "reasoning_effort": "medium"         // minimal | low | medium | high
}
```

### O daemon deve

1. Concatenar `messages[]` em **um único prompt** com marcadores de role (ou usar `--instructions` para system se preferível) — array recebido contém o histórico completo (padrão stateless idêntico ao claude-cli).
2. Executar `codex exec --json --skip-git-repo-check --model <model> [--reasoning-effort <reasoning_effort>] -- "<prompt>"`.
3. Parsear o NDJSON de eventos do Codex CLI, extrair o texto final da resposta e contagens de tokens.
4. Retornar JSON no **formato Chat Completions OpenAI**.

### Response

```json
{
  "id": "chatcmpl-codex-<uuid>",
  "object": "chat.completion",
  "model": "gpt-5",
  "choices": [{
    "index": 0,
    "message": {"role": "assistant", "content": "<resposta>"},
    "finish_reason": "stop"
  }],
  "usage": {"prompt_tokens": N, "completion_tokens": N, "total_tokens": N}
}
```

Em caso de falha do CLI, devolver `{ "error": { "message": "...", "type": "codex_cli_error" } }` com status HTTP ≥ 400.

---

## Componente 2: provider `codex-cli` no frontend (escopo deste plano)

### 2.1 Tipos

**`src/types/ai.ts`** e **`src/types/index.ts`** (manter espelhamento):

```ts
export type AIProvider =
  | 'claude' | 'gemini' | 'openai' | 'grok' | 'deepseek'
  | 'claude-cli' | 'codex-cli';

/** Reasoning effort do codex-cli (--reasoning-effort flag do CLI) */
export type CodexCliReasoning = 'minimal' | 'low' | 'medium' | 'high';

export interface APIKeys {
  claude: string;
  gemini: string;
  openai: string;
  grok: string;
  deepseek: string;
  'claude-cli'?: string;
  'codex-cli'?: string;   // Sem API key — usa OAuth ChatGPT local
}

export interface AISettings {
  // ...existing...
  codexCliModel?: string;                  // default 'gpt-5'
  codexCliReasoning?: CodexCliReasoning;   // default 'medium'
}
```

### 2.2 Utilitário de URL: `src/utils/codex-cli-bridge.ts`

Espelha `src/utils/claude-cli-bridge.ts`:

```ts
const DEFAULT_BRIDGE_URL = 'http://localhost:8787';
const OVERRIDE_KEY = 'sentencify-codex-cli-bridge-url';

export const CODEX_CLI_MESSAGES_PATH = '/api/codex-cli/messages';

export function getCodexCliBridgeUrl(): string {
  try {
    return localStorage.getItem(OVERRIDE_KEY) || DEFAULT_BRIDGE_URL;
  } catch {
    return DEFAULT_BRIDGE_URL;
  }
}
```

URL default é a mesma do `claude-cli` (mesmo daemon, mesma porta), mas mantém **override independente** via localStorage para permitir apontar para daemons diferentes no futuro sem regressão.

### 2.3 Chamada — `callOpenAIAPI` ganha branch `localBridge`

No `src/hooks/useAIIntegration.ts` (core) e nos 4 hooks dos subapps que têm sua própria versão de `callOpenAIAPI`:

```ts
const callOpenAIAPI = React.useCallback(async (messages, options = {}) => {
  // ...preâmbulo existente...

  const { localBridge } = options;
  const url = localBridge
    ? `${getCodexCliBridgeUrl()}${CODEX_CLI_MESSAGES_PATH}`
    : `${API_BASE}/api/openai/messages`;
  const headers = localBridge
    ? { 'Content-Type': 'application/json' }
    : { ...getApiHeaders(), 'Authorization': `Bearer ${aiSettings.apiKeys?.openai || ''}` };

  // body montado pelo helper que `callOpenAIAPI` já usa (formato Chat Completions)
  const requestBody = /* …builder existente… */;
  if (localBridge) {
    (requestBody as Record<string, unknown>).reasoning_effort = aiSettings.codexCliReasoning || 'medium';
  }

  // resto do fluxo (fetch, retry, parse de choices[0].message.content) inalterado
}, [/* deps + aiSettings.codexCliReasoning */]);
```

E nos switches de roteamento por provider (em `useAIIntegration` core + 4 subapps):

```ts
case 'codex-cli':
  return callOpenAIAPI(messages, {
    ...options,
    localBridge: true,
    model: options.model || aiSettings.codexCliModel || 'gpt-5'
  });
```

### 2.4 Store factory: `src/stores/shared/createAIStore.ts`

- `DEFAULT_AI_SETTINGS`: adicionar `codexCliModel: 'gpt-5'`, `codexCliReasoning: 'medium' as const`.
- `setModel`: branch para `'codex-cli'` → grava em `codexCliModel` (em vez da chave padrão `<provider>Model`).
- `selectCurrentModel`: `case 'codex-cli': return codexCliModel || 'gpt-5';`.

### 2.5 Store core: `src/stores/useAIStore.ts`

Espelhar as mesmas adições da factory no store core (que tem sua própria versão extendida).

### 2.6 Constants — `AI_PROVIDERS` (4 subapps)

Em `src/apps/{analisador,noticias,prova-oral,embargos}/constants/models.ts`:

```ts
'codex-cli': {
  name: 'Codex Local (CLI)',
  icon: 'message-circle',
  models: [
    { id: 'gpt-5',       name: 'GPT-5',       recommended: true,
      description: 'Generalista — recomendado para análise jurídica' },
    { id: 'gpt-5-codex', name: 'GPT-5 Codex',
      description: 'Variante tuned para coding (uso alternativo)' }
  ]
}
```

### 2.7 PDF binário

**Não incluir** em `PROVIDERS_WITH_PDF_BINARY` (`src/apps/analisador/constants/providers.ts` e `src/apps/embargos/constants/providers.ts`). Codex CLI é text-only nesta entrega.

### 2.8 UI

#### `src/components/ui/ProviderIcon.tsx`
Adicionar `case 'codex-cli': return <MessageCircle … />` (mesmo ícone do `openai`, espelhando como `claude-cli` espelha `claude` com `Brain`).

#### `AIProviderSelector.tsx` (4 subapps)
Adicionar `'codex-cli': <MessageCircle className="w-5 h-5" />` no map `providerIcons` e o subtítulo:

```tsx
{key === 'claude-cli' || key === 'codex-cli'
  ? 'Sem chave — usa OAuth local'
  : hasApiKey ? 'API Key configurada' : 'API Key não configurada'}
```

#### `ModelSelector.tsx` (4 subapps)
Render do `<select>` quando `provider === 'codex-cli'` listando os dois modelos definidos em `AI_PROVIDERS['codex-cli']`. Padrão: ler/gravar em `aiSettings.codexCliModel`.

#### `ConfigModal.tsx` (core)
Três adições espelhando o que existe para `claude-cli`:

1. **Botão do provider** ao lado de "Claude Local (CLI)":
   ```tsx
   <button onClick={() => setAiSettings({ ...aiSettings, provider: 'codex-cli' })}>
     <ProviderIcon provider="codex-cli" size={20} className="text-emerald-400" />
     Codex Local (CLI · assinatura)
   </button>
   ```
2. **Select de modelo** quando `provider === 'codex-cli'`:
   - lê/grava em `codexCliModel`
   - opções: `gpt-5` (recomendado), `gpt-5-codex`
3. **Select de reasoning effort** quando `provider === 'codex-cli'`:
   - lê/grava em `codexCliReasoning`
   - opções: `minimal` | `low` | `medium` (default) | `high`
4. **doubleCheck**: incluir `'codex-cli': 'gpt-5'` no fallback de modelo e adicionar a opção `<option value="codex-cli">Codex Local (CLI · assinatura)</option>` no select de provider do doubleCheck.

### 2.9 Testes

| Arquivo | Cobertura |
|---|---|
| `src/utils/codex-cli-bridge.test.ts` (novo) | URL default, override via localStorage, fallback em ambiente sem localStorage — espelha `claude-cli-bridge.test.ts` |
| `src/stores/shared/createAIStore.test.ts` (update) | Defaults novos (`codexCliModel`, `codexCliReasoning`); `setModel('codex-cli', 'gpt-5-codex')` grava em `codexCliModel` |
| `src/hooks/useAIIntegration.test.ts` (update) | Branch `provider === 'codex-cli'` chama `callOpenAIAPI` com `localBridge: true` e o modelo do `codexCliModel` |
| `src/components/ui/ProviderIcon.test.tsx` (update) | Renderiza ícone correto para `codex-cli` |

---

## Versionamento (5 arquivos — guideline 8 do CLAUDE.md)

Bump para **v1.49.0** em:
- `CLAUDE.md` (linha 7)
- `src/App.tsx` (`APP_VERSION` ~linha 209)
- `src/constants/changelog.js` (nova entrada no topo)
- `package.json`

---

## Fora do escopo (YAGNI explícito)

| Item | Por quê |
|---|---|
| Streaming de eventos do Codex | Paridade com claude-cli inicial; daemon devolve resposta completa. Adicionar depois se necessário. |
| PDF binário / multimodal | Codex CLI não suporta PDF nativo; modelos GPT-5 aceitam imagens via Responses API, mas via `codex exec` é fluxo separado. |
| Reuso de sessões nativas do Codex | Cada call do daemon é um `codex exec` independente. O histórico do chat é preservado normalmente via `messages[]` enviado pelo frontend (mesmo padrão stateless do claude-cli e dos demais providers). |
| Modificações no daemon `claude-bridge` | Vive em outro repositório; este spec só define o contrato. |
| Suporte a tools/function-calling do Codex | Não é usado pelo Sentencify. |
| `o4-mini` ou outros modelos OpenAI via CLI | Início com `gpt-5` e `gpt-5-codex` apenas. Modelos a mais entram no `AI_PROVIDERS['codex-cli'].models` sem mais ajustes estruturais. |

---

## Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Daemon ainda não implementa `/api/codex-cli/messages` quando o frontend for ao ar | Endpoint retorna 404; UI já lida com erros HTTP. Aceitável: feature flag implícita pelo provider só funcionar quando daemon estiver pronto. |
| `codex` CLI atualiza e muda formato de saída NDJSON | Risco do daemon, não do frontend. Frontend só consome o JSON Chat-Completions estabilizado pelo daemon. |
| Usuário sem `codex login` ativo | Daemon retorna erro 401/500; UI exibe a mensagem. Documentar como pré-requisito no changelog. |
| Quebra acidental do `claude-cli` ao tocar nos mesmos arquivos | Mitigação: adições puramente aditivas (novos casos no switch, novos campos opcionais); testes existentes do `claude-cli` rodam inalterados. |

---

## Checklist de paridade com `claude-cli`

- [x] Tipo `AIProvider` estendido
- [x] `APIKeys` com chave opcional
- [x] `AISettings` com campos próprios de modelo + effort
- [x] Util de URL (`codex-cli-bridge.ts`) com override em localStorage
- [x] Branch `localBridge: true` em `callOpenAIAPI`
- [x] Switch de roteamento por provider em `useAIIntegration` (core + 4 subapps)
- [x] Defaults na factory + store core
- [x] `selectCurrentModel` cobre o novo provider
- [x] `setModel` grava na chave certa
- [x] `AI_PROVIDERS` em todos os 4 subapps
- [x] UI: `AIProviderSelector`, `ModelSelector`, `ConfigModal` (4 subapps + core)
- [x] `ProviderIcon` cobre o novo provider
- [x] doubleCheck no ConfigModal aceita o novo provider
- [x] Testes (`codex-cli-bridge`, `createAIStore`, `useAIIntegration`, `ProviderIcon`)
- [x] Bump de versão nos 5 arquivos
