# Provider "Claude Local (CLI)" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar um provider de IA "Claude Local (CLI)" que executa o binário `claude` local (login OAuth da assinatura, custo $0) via um daemon bridge, em vez de chamar a API paga da Anthropic.

**Architecture:** Um daemon Node standalone (`claude-bridge/`) recebe requisições no formato Messages API, traduz para uma invocação `claude -p` (stream-json via stdin, isolado com `--setting-sources ""`), e devolve a resposta de volta no formato Messages API. No frontend, um flag `localBridge` nas funções Claude existentes (`callLLM`/`callClaudeAPI`) apenas troca URL+headers — reaproveitando montagem de body, retry e parse. Um novo provider `claude-cli` no dispatcher `callAI` ativa esse caminho.

**Tech Stack:** Node.js (`node:http`, `node:child_process` — zero deps), React 19, TypeScript 5.9 strict, Vitest 4, `node --test` para o daemon.

**Spec:** `docs/superpowers/specs/2026-05-25-claude-cli-local-provider-design.md`

---

## Mapa de Arquivos

### Criar
| Arquivo | Responsabilidade |
|---------|-----------------|
| `claude-bridge/translate.js` | Funções puras: body Messages API → args/stdin do `claude`; stream-json do `claude` → resposta Messages API |
| `claude-bridge/translate.test.js` | Testes unitários das traduções (`node --test`) |
| `claude-bridge/server.js` | Daemon `node:http`: rotas, CORS/PNA, spawn do `claude` |
| `claude-bridge/README.md` | Como subir, requisitos, troubleshooting |
| `src/utils/claude-cli-bridge.ts` | Constante `CLAUDE_CLI_BRIDGE_URL` + helper de URL/headers do bridge |
| `src/utils/claude-cli-bridge.test.ts` | Testes do helper |

### Modificar
| Arquivo | Mudança |
|---------|---------|
| `src/types/ai.ts:11` | `AIProvider` += `'claude-cli'` |
| `src/types/index.ts:195` | `AIProvider` += `'claude-cli'` (cópia) |
| `src/types/index.ts` (`AICallOptions`) | += `localBridge?: boolean` |
| `src/hooks/useAIIntegration.ts:193` | union inline de `options.provider` += `'claude-cli'` |
| `src/hooks/useAIIntegration.ts` (`callLLM` ~408-415) | usar URL/headers do bridge quando `localBridge` |
| `src/hooks/useAIIntegration.ts` (`callAI` ~1394) | branch `provider === 'claude-cli'` |
| `src/apps/{analisador,embargos,prova-oral,noticias}/hooks/useAIIntegration.ts` | `callClaudeAPI` aceita `localBridge`; `case 'claude-cli'` no `callAI` (e fallback no `callAIStream` onde existir) |
| `src/components/ui/ProviderIcon.tsx` | `case 'claude-cli'` |
| `src/components/modals/ConfigModal.tsx` (~378) | grid `grid-cols-5`→`grid-cols-3` + botão "Claude Local" + select de modelo reusando `claudeModel` |
| `src/apps/{analisador,embargos,prova-oral,noticias}/components/settings/SettingsModal.tsx` | opção "Claude Local" no seletor + custo 0 |
| `CLAUDE.md:7`, `src/App.tsx` (`APP_VERSION`), `src/constants/changelog.js`, `package.json` | bump `1.44.0`→`1.45.0` |
| `package.json` (scripts) | `"claude-bridge": "node claude-bridge/server.js"` |

---

## FASE A — Daemon `claude-bridge/`

### Task 1: Tradução de entrada (body → invocação `claude`)

**Files:**
- Create: `claude-bridge/translate.js`
- Test: `claude-bridge/translate.test.js`

- [ ] **Step 1: Escrever os testes que falham**

```js
// claude-bridge/translate.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapModel, extractSystem, buildClaudeArgs, buildStdin } from './translate.js';

test('mapModel: família opus → opus', () => {
  assert.equal(mapModel('claude-opus-4-5-20251101'), 'opus');
});
test('mapModel: família haiku → haiku', () => {
  assert.equal(mapModel('claude-haiku-4-5-20251001'), 'haiku');
});
test('mapModel: default → sonnet', () => {
  assert.equal(mapModel('claude-sonnet-4-20250514'), 'sonnet');
  assert.equal(mapModel(undefined), 'sonnet');
});
test('extractSystem: array de blocos concatena .text', () => {
  const sys = [{ type: 'text', text: 'A', cache_control: { type: 'ephemeral' } }, { type: 'text', text: 'B' }];
  assert.equal(extractSystem(sys), 'A\nB');
});
test('extractSystem: string passa direto; vazio → ""', () => {
  assert.equal(extractSystem('oi'), 'oi');
  assert.equal(extractSystem(undefined), '');
});
test('buildClaudeArgs: flags de isolamento + modelo + system', () => {
  const args = buildClaudeArgs({ model: 'claude-opus-4-5-20251101', system: 'SYS', thinking: { budget_tokens: 10000 } });
  assert.ok(args.includes('--setting-sources'));
  assert.equal(args[args.indexOf('--setting-sources') + 1], '');
  assert.ok(args.includes('--tools'));
  assert.equal(args[args.indexOf('--model') + 1], 'opus');
  assert.equal(args[args.indexOf('--system-prompt') + 1], 'SYS');
  assert.ok(args.includes('--effort'));
});
test('buildClaudeArgs: sem thinking não inclui --effort', () => {
  const args = buildClaudeArgs({ model: 'claude-sonnet-4-20250514', system: '' });
  assert.ok(!args.includes('--effort'));
  assert.ok(!args.includes('--system-prompt'));
});
test('buildStdin: mensagens viram stream-json por linha com role correto', () => {
  const body = { messages: [
    { role: 'user', content: [{ type: 'text', text: 'oi' }] },
    { role: 'assistant', content: [{ type: 'text', text: 'olá' }] },
  ] };
  const lines = buildStdin(body).trim().split('\n').map(JSON.parse);
  assert.equal(lines[0].type, 'user');
  assert.equal(lines[0].message.role, 'user');
  assert.equal(lines[1].type, 'assistant');
  assert.deepEqual(lines[0].message.content, [{ type: 'text', text: 'oi' }]);
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `node --test claude-bridge/translate.test.js`
Expected: FAIL — "Cannot find module './translate.js'"

- [ ] **Step 3: Implementar as funções de entrada**

```js
// claude-bridge/translate.js

/** Mapeia um model id (datado ou alias) para o alias aceito pelo CLI. */
export function mapModel(model) {
  const m = String(model || '').toLowerCase();
  if (m.includes('opus')) return 'opus';
  if (m.includes('haiku')) return 'haiku';
  return 'sonnet';
}

/** Extrai o texto do system (string ou array de blocos {type:'text',text}). */
export function extractSystem(system) {
  if (!system) return '';
  if (typeof system === 'string') return system;
  if (Array.isArray(system)) {
    return system.map((b) => (typeof b === 'string' ? b : b.text || '')).join('\n');
  }
  return '';
}

/** Monta os argumentos do `claude` a partir do body Messages API. */
export function buildClaudeArgs(body) {
  const args = [
    '-p', '--verbose',
    '--input-format', 'stream-json',
    '--output-format', 'stream-json',
    '--tools', '',
    '--setting-sources', '',
    '--model', mapModel(body.model),
  ];
  const system = extractSystem(body.system);
  if (system) args.push('--system-prompt', system);
  if (body.thinking && body.thinking.budget_tokens > 0) args.push('--effort', 'high');
  return args;
}

/** Converte messages[] em linhas stream-json (JSONL) para o stdin do claude. */
export function buildStdin(body) {
  const messages = Array.isArray(body.messages) ? body.messages : [];
  return messages
    .map((msg) => {
      const role = msg.role === 'assistant' ? 'assistant' : 'user';
      return JSON.stringify({ type: role, message: { role, content: msg.content } });
    })
    .join('\n') + '\n';
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `node --test claude-bridge/translate.test.js`
Expected: PASS (8 testes)

- [ ] **Step 5: Commit**

```bash
git add claude-bridge/translate.js claude-bridge/translate.test.js
git commit -m "feat(claude-bridge): tradução de entrada body→args/stdin do claude CLI"
```

---

### Task 2: Tradução de saída (stream-json do `claude` → resposta Messages API)

**Files:**
- Modify: `claude-bridge/translate.js`
- Test: `claude-bridge/translate.test.js`

- [ ] **Step 1: Adicionar os testes que falham**

```js
// claude-bridge/translate.test.js — adicionar ao final
import { translateResponse } from './translate.js';

const RESULT_OK = JSON.stringify({
  type: 'result', subtype: 'success', is_error: false,
  result: 'BATATA-FRITA-7392', session_id: 'sess-1',
  usage: { input_tokens: 10, output_tokens: 5, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
});
const RESULT_NOAUTH = JSON.stringify({
  type: 'result', is_error: true, result: 'Not logged in · Please run /login',
  session_id: 'sess-2', usage: {},
});

test('translateResponse: result de sucesso vira Messages API', () => {
  const out = translateResponse(`{"type":"system"}\n${RESULT_OK}\n`, 'claude-sonnet-4-20250514');
  assert.equal(out.status, 200);
  assert.equal(out.body.content[0].text, 'BATATA-FRITA-7392');
  assert.equal(out.body.role, 'assistant');
  assert.equal(out.body.usage.input_tokens, 10);
  assert.equal(out.body.usage.output_tokens, 5);
});
test('translateResponse: "Not logged in" → 401 auth error', () => {
  const out = translateResponse(`${RESULT_NOAUTH}\n`, 'm');
  assert.equal(out.status, 401);
  assert.equal(out.body.error.type, 'authentication_error');
  assert.match(out.body.error.message, /logado/i);
});
test('translateResponse: sem evento result → 500', () => {
  const out = translateResponse('{"type":"system"}\n', 'm');
  assert.equal(out.status, 500);
  assert.equal(out.body.error.type, 'server_error');
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `node --test claude-bridge/translate.test.js`
Expected: FAIL — "translateResponse is not a function"

- [ ] **Step 3: Implementar `translateResponse`**

```js
// claude-bridge/translate.js — adicionar

/** Parseia o stream-json do claude e devolve {status, body} no formato Messages API. */
export function translateResponse(stdout, model) {
  let result = null;
  for (const line of stdout.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('{')) continue;
    let obj;
    try { obj = JSON.parse(trimmed); } catch { continue; }
    if (obj.type === 'result') { result = obj; break; }
  }

  if (!result) {
    return { status: 500, body: { error: { type: 'server_error', message: 'Nenhum evento `result` retornado pelo claude CLI.' } } };
  }

  if (result.is_error) {
    if (/not logged in/i.test(result.result || '')) {
      return { status: 401, body: { error: { type: 'authentication_error', message: 'Claude Code não está logado. Rode `claude` no terminal e faça /login.' } } };
    }
    return { status: 500, body: { error: { type: 'server_error', message: result.result || 'Erro desconhecido do claude CLI.' } } };
  }

  const u = result.usage || {};
  return {
    status: 200,
    body: {
      id: result.session_id || 'claude-cli',
      type: 'message',
      role: 'assistant',
      model,
      content: [{ type: 'text', text: result.result || '' }],
      stop_reason: 'end_turn',
      usage: {
        input_tokens: u.input_tokens || 0,
        output_tokens: u.output_tokens || 0,
        cache_read_input_tokens: u.cache_read_input_tokens || 0,
        cache_creation_input_tokens: u.cache_creation_input_tokens || 0,
      },
    },
  };
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `node --test claude-bridge/translate.test.js`
Expected: PASS (11 testes)

- [ ] **Step 5: Commit**

```bash
git add claude-bridge/translate.js claude-bridge/translate.test.js
git commit -m "feat(claude-bridge): tradução de saída result→Messages API + mapeamento de erros"
```

---

### Task 3: Daemon HTTP (`server.js`)

**Files:**
- Create: `claude-bridge/server.js`

- [ ] **Step 1: Implementar o servidor**

```js
// claude-bridge/server.js
import http from 'node:http';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { buildClaudeArgs, buildStdin, translateResponse } from './translate.js';

const PORT = Number(process.env.CLAUDE_BRIDGE_PORT || 8787);
const ALLOWED_ORIGINS = new Set([
  'https://sentencify.ia.br',
  'http://localhost:3000', // vite (npm run client)
  'http://localhost:3001', // server proxy
]);

function applyCors(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  // Private Network Access (Chrome): página pública → localhost
  if (req.headers['access-control-request-private-network']) {
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
  }
}

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

const server = http.createServer(async (req, res) => {
  applyCors(req, res);

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  if (req.method === 'GET' && req.url === '/health') { sendJson(res, 200, { ok: true }); return; }

  if (req.method === 'POST' && req.url === '/api/claude-cli/messages') {
    let body;
    try { body = await readBody(req); }
    catch { sendJson(res, 400, { error: { type: 'invalid_request', message: 'JSON inválido.' } }); return; }

    const args = buildClaudeArgs(body);
    const child = spawn('claude', args, { cwd: os.tmpdir() });
    let stdout = '', stderr = '';
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    // Cliente desistiu → mata o processo filho (evita gerações órfãs)
    req.on('close', () => { if (!child.killed) child.kill(); });
    child.on('error', (err) => {
      sendJson(res, 500, { error: { type: 'server_error', message: `Falha ao executar 'claude': ${err.message}. O binário está no PATH?` } });
    });
    child.on('close', () => {
      if (res.writableEnded) return;
      if (!stdout.trim()) {
        sendJson(res, 500, { error: { type: 'server_error', message: `claude CLI sem saída. stderr: ${stderr.slice(0, 500)}` } });
        return;
      }
      const out = translateResponse(stdout, body.model);
      sendJson(res, out.status, out.body);
    });
    child.stdin.write(buildStdin(body));
    child.stdin.end();
    return;
  }

  sendJson(res, 404, { error: { type: 'not_found', message: 'Rota não encontrada.' } });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[claude-bridge] ouvindo em http://127.0.0.1:${PORT}`);
  console.log('[claude-bridge] requer `claude` logado (rode `claude` e /login se necessário).');
});
```

- [ ] **Step 2: Smoke test manual — health**

Run (com o daemon rodando via `node claude-bridge/server.js` em outro terminal):
```bash
curl -s http://127.0.0.1:8787/health
```
Expected: `{"ok":true}`

- [ ] **Step 3: Smoke test manual — geração real (requer claude logado)**

Run:
```bash
curl -s -X POST http://127.0.0.1:8787/api/claude-cli/messages \
  -H 'Content-Type: application/json' \
  -d '{"model":"claude-sonnet-4-20250514","messages":[{"role":"user","content":[{"type":"text","text":"Responda apenas: PONG"}]}]}'
```
Expected: JSON com `content[0].text` contendo "PONG", `usage.output_tokens > 0`.

- [ ] **Step 4: Commit**

```bash
git add claude-bridge/server.js
git commit -m "feat(claude-bridge): daemon HTTP com CORS/PNA, /health e spawn do claude"
```

---

### Task 4: Script npm + README do daemon

**Files:**
- Modify: `package.json`
- Create: `claude-bridge/README.md`

- [ ] **Step 1: Adicionar o script ao `package.json`**

Em `"scripts"`, adicionar após `"start"`:
```json
    "claude-bridge": "node claude-bridge/server.js",
```

- [ ] **Step 2: Escrever o README**

```markdown
# claude-bridge

Daemon local que expõe o `claude` CLI (Claude Code) como endpoint HTTP no formato
Messages API da Anthropic. Permite ao SentencifyAI usar o provider **"Claude Local (CLI)"**,
rodando inferência na assinatura do Claude Code (custo de API = $0).

## Requisitos
- Node 18+
- `claude` (Claude Code) instalado e **logado** (`claude` → `/login`)

## Uso
```bash
npm run claude-bridge          # sobe em http://127.0.0.1:8787
CLAUDE_BRIDGE_PORT=9999 npm run claude-bridge   # porta custom
```

No SentencifyAI, selecione o provider "Claude Local (CLI)". Funciona com o frontend
local (http://localhost:3000) ou em produção (https://sentencify.ia.br) — neste caso
use **Chrome** (Firefox bloqueia HTTPS→localhost).

## Limitações
- Sem streaming (resposta vem completa).
- `temperature`/`top_p`/`top_k`/`max_tokens` são ignorados (CLI não expõe).
- Sem prompt caching.

## Troubleshooting
- **401 "não está logado"**: rode `claude` no terminal e `/login`.
- **"binário claude não encontrado"**: verifique `which claude`.
- **CORS bloqueado**: confirme que a origem está na allowlist em `server.js`.
```

- [ ] **Step 3: Verificar o script**

Run: `npm run claude-bridge` (em background) e `curl -s http://127.0.0.1:8787/health`
Expected: `{"ok":true}`. Encerrar o daemon depois.

- [ ] **Step 4: Commit**

```bash
git add package.json claude-bridge/README.md
git commit -m "chore(claude-bridge): script npm run claude-bridge + README"
```

---

## FASE B — Integração no frontend

### Task 5: Tipo `AIProvider` + `AICallOptions.localBridge` + `ProviderIcon`

**Files:**
- Modify: `src/types/ai.ts:11`, `src/types/index.ts:195`, `src/types/index.ts` (AICallOptions), `src/components/ui/ProviderIcon.tsx`
- Test: `src/components/ui/ProviderIcon.test.tsx`

- [ ] **Step 1: Escrever o teste que falha**

```tsx
// src/components/ui/ProviderIcon.test.tsx — adicionar dentro do describe existente
it('deve renderizar um SVG para o provider claude-cli', () => {
  const { container } = render(<ProviderIcon provider="claude-cli" />);
  expect(container.querySelector('svg')).toBeInTheDocument();
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx vitest run src/components/ui/ProviderIcon.test.tsx`
Expected: FAIL — `claude-cli` não atribuível a `AIProvider` (tsc) / svg null

- [ ] **Step 3: Atualizar os tipos e o ícone**

Em `src/types/ai.ts:11`:
```ts
export type AIProvider = 'claude' | 'gemini' | 'openai' | 'grok' | 'deepseek' | 'claude-cli';
```

Em `src/types/index.ts:195` (mesma alteração):
```ts
export type AIProvider = 'claude' | 'gemini' | 'openai' | 'grok' | 'deepseek' | 'claude-cli';
```

Em `src/types/index.ts`, na interface `AICallOptions`, adicionar a propriedade:
```ts
  /** Quando true, roteia a chamada Claude para o daemon local (claude-bridge) em vez da API. */
  localBridge?: boolean;
```

Em `src/components/ui/ProviderIcon.tsx`, adicionar o `case` antes do `default` (reusa o ícone do Claude):
```tsx
    case 'claude-cli':
      return <ClaudeIcon size={size} className={className} />;
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx vitest run src/components/ui/ProviderIcon.test.tsx && npx tsc --noEmit`
Expected: PASS + 0 erros TypeScript

- [ ] **Step 5: Commit**

```bash
git add src/types/ai.ts src/types/index.ts src/components/ui/ProviderIcon.tsx src/components/ui/ProviderIcon.test.tsx
git commit -m "feat(types): provider claude-cli + AICallOptions.localBridge + ícone"
```

---

### Task 6: Helper de URL do bridge (`src/utils/claude-cli-bridge.ts`)

**Files:**
- Create: `src/utils/claude-cli-bridge.ts`
- Test: `src/utils/claude-cli-bridge.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

```ts
// src/utils/claude-cli-bridge.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { getClaudeCliBridgeUrl, CLAUDE_CLI_MESSAGES_PATH } from './claude-cli-bridge';

describe('claude-cli-bridge', () => {
  beforeEach(() => { localStorage.clear(); });

  it('usa a URL default quando não há override', () => {
    expect(getClaudeCliBridgeUrl()).toBe('http://localhost:8787');
  });

  it('respeita override em localStorage', () => {
    localStorage.setItem('sentencify-claude-cli-bridge-url', 'http://localhost:9999');
    expect(getClaudeCliBridgeUrl()).toBe('http://localhost:9999');
  });

  it('expõe o path do endpoint de mensagens', () => {
    expect(CLAUDE_CLI_MESSAGES_PATH).toBe('/api/claude-cli/messages');
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx vitest run src/utils/claude-cli-bridge.test.ts`
Expected: FAIL — "Cannot find module './claude-cli-bridge'"

- [ ] **Step 3: Implementar o helper**

```ts
// src/utils/claude-cli-bridge.ts
/**
 * @file claude-cli-bridge.ts
 * @description URL e path do daemon local claude-bridge (provider "Claude Local (CLI)").
 */

const DEFAULT_BRIDGE_URL = 'http://localhost:8787';
const OVERRIDE_KEY = 'sentencify-claude-cli-bridge-url';

/** Path do endpoint de mensagens no daemon. */
export const CLAUDE_CLI_MESSAGES_PATH = '/api/claude-cli/messages';

/** Retorna a URL base do bridge, com override opcional via localStorage. */
export function getClaudeCliBridgeUrl(): string {
  try {
    return localStorage.getItem(OVERRIDE_KEY) || DEFAULT_BRIDGE_URL;
  } catch {
    return DEFAULT_BRIDGE_URL;
  }
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx vitest run src/utils/claude-cli-bridge.test.ts && npx tsc --noEmit`
Expected: PASS (3 testes) + 0 erros

- [ ] **Step 5: Commit**

```bash
git add src/utils/claude-cli-bridge.ts src/utils/claude-cli-bridge.test.ts
git commit -m "feat(utils): helper de URL do claude-bridge"
```

---

### Task 7: Rotear `callLLM` para o bridge + branch no `callAI` (hook principal)

**Files:**
- Modify: `src/hooks/useAIIntegration.ts`
- Test: `src/hooks/useAIIntegration.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

```tsx
// src/hooks/useAIIntegration.test.ts — adicionar
it('callAI com provider claude-cli faz fetch para o bridge local sem x-api-key', async () => {
  const fetchMock = vi.fn(async () => ({
    ok: true, status: 200,
    json: async () => ({ content: [{ type: 'text', text: 'PONG' }], usage: { input_tokens: 1, output_tokens: 1 } }),
    text: async () => '',
  }));
  global.fetch = fetchMock as unknown as typeof fetch;

  const { result } = renderHook(() => useAIIntegration());
  const text = await result.current.callAI(
    [{ role: 'user', content: [{ type: 'text', text: 'oi' }] }],
    { provider: 'claude-cli' }
  );

  expect(text).toBe('PONG');
  const calledUrl = fetchMock.mock.calls[0][0] as string;
  expect(calledUrl).toContain('http://localhost:8787/api/claude-cli/messages');
  const opts = fetchMock.mock.calls[0][1] as RequestInit;
  expect((opts.headers as Record<string, string>)['x-api-key']).toBeUndefined();
});
```

> **Nota:** seguir o padrão de `renderHook`/mocks já usado no arquivo de teste existente. Se o teste já mocka `fetch` num `beforeEach`, ajustar para este caso específico.

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx vitest run src/hooks/useAIIntegration.test.ts -t "claude-cli"`
Expected: FAIL — URL aponta para `/api/claude/messages`, não o bridge

- [ ] **Step 3: Implementar — URL/headers condicionais em `callLLM`**

Adicionar o import no topo do arquivo (junto aos demais):
```ts
import { getClaudeCliBridgeUrl, CLAUDE_CLI_MESSAGES_PATH } from '../utils/claude-cli-bridge';
```

Em `callLLM`, desestruturar `localBridge` das options (junto a `extractText`, etc.):
```ts
      localBridge = false,
```

Substituir o bloco do `fetch` (linhas ~410-424) por:
```ts
        const claudeUrl = localBridge
          ? `${getClaudeCliBridgeUrl()}${CLAUDE_CLI_MESSAGES_PATH}`
          : `${API_BASE}/api/claude/messages`;
        const claudeHeaders = localBridge
          ? { 'Content-Type': 'application/json' }
          : { ...getApiHeaders(), 'x-api-key': aiSettings.apiKeys?.claude || '' };

        const response = await fetch(claudeUrl, {
          method: 'POST',
          headers: claudeHeaders,
          body: JSON.stringify(buildApiRequest(messages, {
            maxTokens,
            useInstructions,
            systemPrompt: systemPrompt ?? undefined,
            model: model ?? undefined,
            disableThinking
          })),
          signal
        });
```

No `callAI` (~1394), adicionar o branch antes do `// Default: Claude`:
```ts
    // Provider local: roteia para o daemon claude-bridge (assinatura, custo $0)
    if (provider === 'claude-cli') {
      return await callLLM(messages, {
        ...options,
        localBridge: true,
        model: options.model || aiSettings.claudeModel || 'claude-sonnet-4-20250514'
      });
    }
```

Atualizar o union inline em `src/hooks/useAIIntegration.ts:193`:
```ts
    provider?: 'claude' | 'gemini' | 'openai' | 'grok' | 'claude-cli'
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx vitest run src/hooks/useAIIntegration.test.ts -t "claude-cli" && npx tsc --noEmit`
Expected: PASS + 0 erros

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useAIIntegration.ts src/hooks/useAIIntegration.test.ts
git commit -m "feat(ai): callLLM roteia para claude-bridge quando localBridge; branch claude-cli no callAI"
```

---

### Task 8: Wire nos 4 sub-apps (callAI + callAIStream fallback)

> Aplicar o **mesmo padrão** em cada sub-app. Os arquivos são análogos. Repetido aqui por completude — não pular nenhum.

**Files:**
- Modify: `src/apps/analisador/hooks/useAIIntegration.ts`
- Modify: `src/apps/embargos/hooks/useAIIntegration.ts`
- Modify: `src/apps/prova-oral/hooks/useAIIntegration.ts`
- Modify: `src/apps/noticias/hooks/useAIIntegration.ts`

- [ ] **Step 1: Localizar como cada `callClaudeAPI` monta a URL/headers**

Run:
```bash
grep -n "api/claude/messages\|x-api-key\|const callClaudeAPI" src/apps/analisador/hooks/useAIIntegration.ts src/apps/embargos/hooks/useAIIntegration.ts src/apps/prova-oral/hooks/useAIIntegration.ts src/apps/noticias/hooks/useAIIntegration.ts
```
Expected: cada arquivo tem um `callClaudeAPI` com `fetch(\`${API_BASE}/api/claude/messages\`, ...)` e header `x-api-key`.

- [ ] **Step 2: Em CADA um dos 4 arquivos, importar o helper e tornar `callClaudeAPI` ciente de `localBridge`**

Import no topo:
```ts
import { getClaudeCliBridgeUrl, CLAUDE_CLI_MESSAGES_PATH } from '../../../utils/claude-cli-bridge';
```

Em `callClaudeAPI`, desestruturar `localBridge = false` das options e trocar o `fetch` para usar URL/headers condicionais (mesmo padrão da Task 7):
```ts
    const claudeUrl = localBridge
      ? `${getClaudeCliBridgeUrl()}${CLAUDE_CLI_MESSAGES_PATH}`
      : `${API_BASE}/api/claude/messages`;
    const claudeHeaders = localBridge
      ? { 'Content-Type': 'application/json' }
      : { 'Content-Type': 'application/json', 'x-api-key': aiSettings.apiKeys?.claude || '' };
```
(usar `claudeUrl`/`claudeHeaders` no `fetch` existente; preservar quaisquer outros headers que já existam).

- [ ] **Step 3: Em CADA `callAI`, adicionar o `case 'claude-cli'`**

No `switch (provider)` do `callAI`, antes do `default`:
```ts
      case 'claude-cli':
        return callClaudeAPI(messages, { ...options, localBridge: true });
```

- [ ] **Step 4: Em `callAIStream` (apenas analisador e prova-oral), adicionar fallback não-stream**

No `switch (provider)` do `callAIStream`, antes do `default`:
```ts
      case 'claude-cli':
        // v1 sem streaming: cai para o caminho não-stream via bridge local
        return callClaudeAPI(messages, { ...options, localBridge: true });
```

- [ ] **Step 5: Verificar TypeScript**

Run: `npx tsc --noEmit`
Expected: 0 erros

- [ ] **Step 6: Rodar testes dos sub-apps**

Run: `npx vitest run src/apps/analisador src/apps/embargos src/apps/prova-oral src/apps/noticias`
Expected: testes existentes continuam passando

- [ ] **Step 7: Commit**

```bash
git add src/apps/analisador/hooks/useAIIntegration.ts src/apps/embargos/hooks/useAIIntegration.ts src/apps/prova-oral/hooks/useAIIntegration.ts src/apps/noticias/hooks/useAIIntegration.ts
git commit -m "feat(ai): provider claude-cli nos sub-apps (callAI + fallback no callAIStream)"
```

---

### Task 9: UI — botão do provider no ConfigModal principal

**Files:**
- Modify: `src/components/modals/ConfigModal.tsx`

- [ ] **Step 1: Mudar a grade para comportar 6 providers**

Em `src/components/modals/ConfigModal.tsx:378`, trocar:
```tsx
            <div className="grid grid-cols-5 gap-2">
```
por:
```tsx
            <div className="grid grid-cols-3 gap-2">
```

- [ ] **Step 2: Adicionar o botão "Claude Local" após o botão do DeepSeek**

Após o fechamento do `</button>` do DeepSeek (linha ~458), adicionar:
```tsx
              <button
                onClick={() => setAiSettings({ ...aiSettings, provider: 'claude-cli' })}
                className={`p-3 rounded-lg border-2 transition-all text-left ${
                  aiSettings.provider === 'claude-cli'
                    ? 'bg-amber-600/20 border-amber-500'
                    : 'theme-bg-secondary-30 theme-border-input hover-theme-border'
                }`}
              >
                <div className="flex items-center gap-2">
                  <ProviderIcon provider="claude-cli" size={20} className="text-amber-400" />
                  <div>
                    <div className="font-semibold theme-text-primary text-sm">Claude Local</div>
                    <div className="text-xs theme-text-muted">CLI · assinatura</div>
                  </div>
                </div>
              </button>
```

- [ ] **Step 3: Reusar o select de modelo do Claude para claude-cli**

No label do modelo (~464-467), incluir o caso `claude-cli`:
```tsx
                Modelo {aiSettings.provider === 'claude' || aiSettings.provider === 'claude-cli' ? 'Claude' :
                       aiSettings.provider === 'gemini' ? 'Gemini' :
                       aiSettings.provider === 'openai' ? 'OpenAI' :
                       aiSettings.provider === 'grok' ? 'Grok' : 'DeepSeek'}:
```

E na condição do `<select>` do Claude (~469), aceitar ambos:
```tsx
              {(aiSettings.provider === 'claude' || aiSettings.provider === 'claude-cli') && (
```

- [ ] **Step 4: Verificar TypeScript e build**

Run: `npx tsc --noEmit`
Expected: 0 erros

- [ ] **Step 5: Verificação visual manual (ambos os temas)**

Run: `npm run dev` e abrir Configurações de IA.
Expected: botão "Claude Local" aparece na grade (3 colunas, 2 linhas), selecionável, mostra o select de modelo Claude. Conferir em tema claro E escuro.

- [ ] **Step 6: Commit**

```bash
git add src/components/modals/ConfigModal.tsx
git commit -m "feat(ui): botão do provider Claude Local no ConfigModal"
```

---

### Task 10: UI — seletor do provider nos 4 sub-apps + custo zero

**Files:**
- Modify: `src/apps/{analisador,embargos,prova-oral,noticias}/components/settings/SettingsModal.tsx`

- [ ] **Step 1: Inspecionar o seletor de provider de cada sub-app**

Run:
```bash
grep -n "provider:\|provider ===\|MODEL_PRICES\|calculateCost" src/apps/analisador/components/settings/SettingsModal.tsx | head -40
```
Expected: identificar (a) a lista/grade de providers e (b) onde o custo é calculado por provider.

- [ ] **Step 2: Adicionar a opção "Claude Local" no seletor de cada sub-app**

Seguir o padrão existente do sub-app (botão ou `<option>`), adicionando o provider `'claude-cli'` com rótulo "Claude Local" e `ProviderIcon provider="claude-cli"`. Reusar o seletor de modelo Claude (`claudeModel`), como na Task 9.

- [ ] **Step 3: Tratar custo zero para claude-cli**

Onde o sub-app calcula custo a partir de `MODEL_PRICES`/`provider`, retornar `0` quando `provider === 'claude-cli'` (assinatura, sem custo de API). Exemplo de guarda no início da função de custo:
```ts
  if (provider === 'claude-cli') return 0;
```

- [ ] **Step 4: Verificar TypeScript**

Run: `npx tsc --noEmit`
Expected: 0 erros

- [ ] **Step 5: Rodar testes dos sub-apps**

Run: `npx vitest run src/apps/analisador src/apps/embargos src/apps/prova-oral src/apps/noticias`
Expected: PASS

- [ ] **Step 6: Verificação visual manual (ambos os temas)**

Abrir as configurações de cada sub-app e confirmar o provider "Claude Local" selecionável, em tema claro e escuro.

- [ ] **Step 7: Commit**

```bash
git add src/apps/analisador/components/settings/SettingsModal.tsx src/apps/embargos/components/settings/SettingsModal.tsx src/apps/prova-oral/components/settings/SettingsModal.tsx src/apps/noticias/components/settings/SettingsModal.tsx
git commit -m "feat(ui): provider Claude Local nos seletores dos sub-apps + custo zero"
```

---

### Task 11: Teste E2E manual integrado + bump de versão

**Files:**
- Modify: `CLAUDE.md`, `src/App.tsx`, `src/constants/changelog.js`, `package.json`

- [ ] **Step 1: Teste integrado manual (frontend local → bridge)**

Em terminais separados: `npm run claude-bridge` e `npm run dev`. No app, selecionar "Claude Local" e rodar uma análise com PDF.
Expected: resposta gerada via CLI; sem erro de CORS; tracking mostra custo $0; nenhuma poluição de "memória persistente" na resposta.

- [ ] **Step 2: Teste integrado manual (produção → bridge), opcional**

Com o bridge rodando, abrir `https://sentencify.ia.br` no **Chrome**, selecionar "Claude Local", rodar uma chamada.
Expected: funciona (HTTPS→localhost via exceção do Chrome + PNA).

- [ ] **Step 3: Bump de versão (4 arquivos)**

- `CLAUDE.md:7`: `**Version**: 1.45.0`
- `src/App.tsx` (`APP_VERSION`): `1.45.0`
- `package.json`: `"version": "1.45.0"`
- `src/constants/changelog.js`: adicionar entrada no topo:
```js
  { version: '1.45.0', feature: 'feat(provider): Claude Local (CLI) — novo provider que executa o `claude` Code local via daemon claude-bridge, usando o login OAuth da assinatura (custo de API $0). Funciona com PDFs (base64), multi-turn e isolamento via --setting-sources "". Sem streaming nesta versão. Daemon: `npm run claude-bridge`.' },
```

- [ ] **Step 4: Suite completa de testes + tsc**

Run: `npx tsc --noEmit && npx vitest run && node --test claude-bridge/translate.test.js`
Expected: tudo passando, 0 erros

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md src/App.tsx src/constants/changelog.js package.json
git commit -m "chore: bump v1.45.0 — provider Claude Local (CLI)"
```

---

## Checklist de Verificação Pós-Plano

- [ ] `node --test claude-bridge/translate.test.js` — verde (11 testes)
- [ ] Daemon: `/health` responde, geração real funciona, mata processo no disconnect
- [ ] `AIProvider` tem `claude-cli` nos DOIS arquivos de tipo
- [ ] `callAI` (principal + 4 sub-apps) roteia `claude-cli` → bridge
- [ ] `callAIStream` (analisador + prova-oral) cai para não-stream em `claude-cli`
- [ ] `localBridge` troca URL/headers sem mexer em body/retry/parse
- [ ] UI: provider "Claude Local" visível e funcional em ambos os temas (principal + 4 sub-apps)
- [ ] Custo $0 no tracking para `claude-cli`
- [ ] Versão 1.45.0 nos 4 arquivos
- [ ] `npx tsc --noEmit` e `npx vitest run` limpos
- [ ] CORS allowlist usa `http://localhost:3000` (porta real do vite)
```
