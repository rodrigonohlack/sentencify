# Provider "Claude Local (CLI)" — Design

> **Status:** spec aprovado para escrita de plano (brainstorming concluído em 2026-05-25)
> **Versão alvo:** 1.45.0 (feat) — bump em CLAUDE.md, App.tsx (`APP_VERSION`), changelog.js, package.json

## Objetivo

Adicionar um provider de IA novo ao SentencifyAI — **"Claude Local (CLI)"** — que, em vez de chamar a API paga da Anthropic, executa o binário `claude` (Claude Code) instalado na máquina do usuário, usando o **login OAuth da assinatura** (custo de API = $0). Uso exclusivo do autor, em uma única máquina. Funciona inclusive com o frontend servido em produção (Render), apontando para um daemon local.

## Viabilidade — verificada empiricamente (2026-05-25)

Todos os pontos abaixo foram testados com o `claude` CLI v2.1.150 real:

| Fato verificado | Resultado |
|---|---|
| `document` block (PDF base64) via `stream-json` input | ✅ leu o conteúdo do PDF corretamente |
| Texto longo | ✅ |
| Multi-turn (histórico `user` + `assistant`) | ✅ contexto preservado |
| Roda na assinatura OAuth (sem `--bare`) | ✅ `apiKeySource: none`, `total_cost_usd: 0` |
| Isolamento de hooks/auto-memory/CLAUDE.md | ✅ via `--setting-sources ""` (mantém OAuth) |

**Descoberta crítica:** sem `--setting-sources ""`, o auto-memory e settings de nível usuário **contaminam** a resposta (o modelo se comporta como agente Claude Code, fala em "memória persistente" etc.). `--bare` limparia isso, mas força `ANTHROPIC_API_KEY` e **ignora o OAuth** — inviável para uso na assinatura. A combinação correta é `--setting-sources ""` (isola settings) **sem** `--bare` (preserva OAuth).

### Invocação canônica do CLI

```bash
claude -p --verbose \
  --input-format stream-json --output-format stream-json \
  --tools "" --setting-sources "" \
  --model <sonnet|opus> --system-prompt "<system do Sentencify>"
```

- `body` (mensagens) entra via **stdin** como JSON-lines `stream-json` (sem interpolação de shell → sem injeção de comando).
- Executado com **cwd neutro** (`os.tmpdir()`) como reforço contra descoberta de CLAUDE.md/skills do projeto.

## Arquitetura

```
┌──────────────────────────┐         ┌─────────────────────────────────┐
│ Sentencify (frontend)    │  POST   │ claude-bridge (daemon Node)     │
│ Render OU local          │ ──────► │ http://127.0.0.1:8787           │
│ provider = "claude-cli"  │  JSON   │ /api/claude-cli/messages        │
│ body = Messages API      │ ◄────── │  1. traduz body → stream-json   │
│ (buildApiRequest)        │         │  2. spawn `claude` (OAuth)      │
└──────────────────────────┘         │  3. result → resposta Messages  │
                                      └─────────────────────────────────┘
                                                    │ assinatura
                                                    ▼  (custo $0)
                                              Anthropic
```

Dois componentes independentes:

1. **`claude-bridge/` (daemon Node, novo)** — processo standalone, ligado sob demanda (`npm run claude-bridge`).
2. **Provider no frontend (`claude-cli`)** — nova opção que roteia para o daemon.

---

## Componente 1: o daemon `claude-bridge/`

### Stack e arquivos

| Arquivo | Responsabilidade |
|---|---|
| `claude-bridge/server.js` | Servidor `node:http` zero-dependência: rotas, CORS/PNA, spawn |
| `claude-bridge/translate.js` | Funções puras de tradução (entrada e saída) — testáveis sem spawn |
| `claude-bridge/translate.test.js` | Testes unitários das traduções |
| `claude-bridge/README.md` | Como subir, requisitos (`claude` logado), troubleshooting |
| `package.json` (modificar) | Script `"claude-bridge": "node claude-bridge/server.js"` |

Zero dependências externas (usa `node:http`, `node:child_process`, `node:os`). Não depende de subir o servidor Sentencify completo.

### Rotas

- `POST /api/claude-cli/messages` — recebe o body Messages API, devolve resposta Messages API.
- `GET /health` — `{ ok: true }`, para o frontend checar disponibilidade.
- `OPTIONS *` — preflight CORS/PNA.

### Tradução de **entrada** (`buildApiRequest` body → invocação `claude`)

| Campo do body | Tradução |
|---|---|
| `messages[]` (`{role, content[]}`) | cada mensagem vira linha `stream-json`: `{"type":"user"\|"assistant","message":{role,content}}`. Blocos `document`/`text`/`image` passam direto (PDF base64 incluso) |
| `system` (array `[{type:"text",text,...}]` ou string) | concatena os `.text` → flag `--system-prompt` |
| `model` (`claude-sonnet-4-...` / `claude-opus-...`) | mapeia por família: contém `opus`→`opus`, `haiku`→`haiku`, senão `sonnet` → `--model <alias>` |
| `thinking.budget_tokens` | mapeia para `--effort` (ausente→omite; `>0`→`high`) |
| `cache_control` | **ignorado** (CLI não tem prompt caching) |
| `temperature`, `top_p`, `top_k`, `max_tokens` | **descartados** (CLI não expõe) |

### Tradução de **saída** (`result` do `claude` → formato Messages API)

O frontend (`extractResponseText`/`extractTokenMetrics`) trata `claude-cli` no **branch default = Claude**, então o daemon devolve a forma Messages API:

```json
{
  "id": "<session_id>",
  "type": "message",
  "role": "assistant",
  "model": "<modelo>",
  "content": [{ "type": "text", "text": "<result>" }],
  "stop_reason": "end_turn",
  "usage": { "input_tokens": N, "output_tokens": M,
             "cache_read_input_tokens": 0, "cache_creation_input_tokens": 0 }
}
```

O daemon parseia o `stream-json` do `claude`, pega o evento final `{"type":"result"}` (`result` = texto, `usage` = tokens).

### Erros (mapeamento)

| Condição do `claude` | Resposta do daemon |
|---|---|
| `is_error` + "Not logged in" | `401` `{ error: { type: "authentication_error", message: "Claude Code não está logado. Rode `claude` no terminal e faça /login." } }` |
| `is_error` (overloaded/outros) | `529` / `500` com a mensagem original |
| processo `claude` não encontrado | `500` "binário `claude` não encontrado no PATH" |

### Robustez

- **Abort**: se o cliente desconectar, **matar o processo filho** (`child.kill()`) — evita gerações órfãs.
- **Gerações longas**: conexão fica aberta enquanto o `claude` roda (sem timeout — é localhost). Aceitável para análises de minutos.
- **Concorrência**: 1 usuário; sem fila/limite (fora de escopo).

### Segurança

- Bind **somente em `127.0.0.1`** (nunca `0.0.0.0`).
- CORS allowlist: `https://sentencify.ia.br`, `http://localhost:5173`, `http://localhost:4173`, `http://localhost:3001`. Origem ecoada só se na lista.
- **PNA**: responder `Access-Control-Allow-Private-Network: true` quando o preflight trouxer `Access-Control-Request-Private-Network: true`.
- Body via **stdin** (não argv) → sem injeção de shell.
- Sem API key trafegando (usa OAuth da máquina).

---

## Componente 2: integração no frontend

### Superfície de mudança (mapeada no código atual)

| Local | Mudança |
|---|---|
| `src/types/ai.ts:11` e `src/types/index.ts:195` | adicionar `'claude-cli'` ao union `AIProvider` (DOIS lugares) |
| `src/hooks/useAIIntegration.ts:193` | union inline de `options.provider` — adicionar `'claude-cli'` |
| `src/constants/api.ts` (ou novo) | constante `CLAUDE_CLI_BRIDGE_URL` (default `http://localhost:8787`), com override opcional via localStorage |
| **novo** `src/utils/claude-cli-bridge.ts` | helper `callClaudeCLIBridge(requestBody, { signal })` — `fetch` POST para o bridge, **sem** `x-api-key`, **sem** `API_BASE`; parse igual ao Claude. Compartilhado pelos 5 hooks para evitar duplicação |
| `src/hooks/useAIIntegration.ts` (callAI ~1394) | branch `if (provider === 'claude-cli')` → usa `buildApiRequest` + `callClaudeCLIBridge`, model = `options.model \|\| aiSettings.claudeModel \|\| default` |
| `src/apps/{analisador,embargos,prova-oral,noticias}/hooks/useAIIntegration.ts` | mesmo branch no `callAI` (`switch (provider)`) de cada um |
| `src/apps/prova-oral/hooks/useAIIntegration.ts` (`callAIStream`) | quando `provider === 'claude-cli'`, **fallback para o caminho não-stream** (v1 não faz streaming) |
| `src/components/ui/ProviderIcon.tsx:99` | `case 'claude-cli'` → ícone (reusar o do Claude com um badge/variação) |
| `src/components/modals/ConfigModal.tsx` (ProviderSection ~370–493) | adicionar botão "Claude Local (CLI)" na grade de providers |
| `src/apps/{analisador,embargos,prova-oral,noticias}/components/settings/*` | adicionar a opção nos seletores de provider/modelo de cada sub-app |

> **Sem colisão com o refactor do ConfigModal** — confirmado abandonado (só restou o doc do plano, não aplicado). Trabalhamos sobre o ConfigModal monolítico atual e as 4 cópias de `SettingsModal`.

### Reuso de configuração

- O provider `claude-cli` **reusa `aiSettings.claudeModel`** (mesmas famílias sonnet/opus). Não cria setting de modelo novo.
- Não usa/exibe campo de API key (é OAuth local). A seção de API keys ignora `claude-cli`.

### Disponibilidade do daemon

- Se o `fetch` ao bridge falhar (connection refused = daemon desligado), erro claro: *"Bridge local não está rodando. Suba com `npm run claude-bridge`."* Opcional: ping em `/health` ao selecionar o provider, com indicador visual.

### Tracking de tokens

- `addTokenUsage` com `provider: 'claude-cli'` (rótulo distinto no painel de uso). Custo monetário = 0 (assinatura) — o cálculo de preço deve tratar `claude-cli` como custo zero.

---

## Testes

- **Daemon** (`translate.test.js`): funções puras de tradução entrada/saída — body Messages API → args/stdin; `result` do claude → resposta Messages API; mapeamento de modelo e de erros. Teste de integração com spawn real **gated** (requer login, pulado em CI).
- **Frontend**: `callClaudeCLIBridge` (mock `fetch`, valida URL do bridge, ausência de `x-api-key`, parse da resposta); dispatch do `callAI` para `claude-cli` nos 5 hooks; `ProviderIcon` com `claude-cli`; UI de seleção do provider (ambos os temas, claro/escuro).
- **Convenções do projeto**: testes importam código de produção (nunca duplicam constantes); UI validada em tema claro e escuro.

## Limitações conhecidas (aceitas para v1)

1. **ToS** — área cinzenta: usar a assinatura do Claude Code como backend de outra aplicação não é o uso pretendido. Decisão consciente do autor; uso pessoal.
2. **Sem `temperature`/`top_p`/`top_k`/`max_tokens`** finos (CLI não expõe).
3. **Sem prompt caching** — docs grandes repetidos reprocessam (latência maior; custo $0 na assinatura).
4. **Sem streaming** na v1 — gerações longas esperam o bloco inteiro. Prova-oral cai para não-stream. Streaming fica para v2 (traduzir `stream-json` do claude → SSE existente).
5. **Latência** — overhead de spawn de processo por request (centenas de ms).
6. **Firefox** — o truque HTTPS→`http://localhost` é instável; **Chrome/Chromium recomendado**.
7. **Mapeamento de modelo grosso** — IDs datados da API viram aliases `sonnet`/`opus`; a assinatura resolve para o modelo corrente dela.

## Fora de escopo

- Streaming (v2).
- Multiusuário / autenticação do bridge / fila de concorrência.
- Empacotar o daemon como serviço de sistema (systemd). Por ora, `npm run claude-bridge` manual.
- Roteamento de outros providers (OpenAI/Gemini/etc.) para CLIs locais.
