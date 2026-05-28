# Provider "Codex Local (CLI)" + Web Search nos providers CLI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** (1) Adicionar provider `'codex-cli'` (Codex Local) ao SentencifyAI — simétrico ao `'claude-cli'`, usando OAuth ChatGPT via `codex exec --json` (gpt-5.5). (2) Habilitar **Web Search com grounding metadata** em `claude-cli` e `codex-cli` (hoje só Gemini suporta).

**Architecture:** Daemon `claude-bridge` (em `/claude-bridge/`) ganha endpoint `/api/codex-cli/messages` (Chat Completions in/out, traduz para `codex exec --json -m gpt-5.5 -s read-only -a never -c model_reasoning_effort=…`) e suporte a `body.web_search` em ambos endpoints (claude usa `--tools WebSearch --permission-mode bypassPermissions`; codex usa `--search`). Frontend reusa `callOpenAIAPI` com `localBridge: true`. Adapters de webSearch viram reais (não-noop) para os dois providers CLI. Resposta inclui campo `grounding` com URLs consultadas.

**Tech Stack:** Node 18+, TypeScript, React, Zustand, Vitest, node:test (daemon).

**Spec de referência:** `docs/superpowers/specs/2026-05-28-codex-cli-provider-design.md`

---

# Parte 1 — Daemon `claude-bridge/`

## Task D1: `translate.codex.js` — módulo de tradução (TDD)

**Files:**
- Create: `claude-bridge/translate.codex.js`
- Create: `claude-bridge/translate.codex.test.js`

### Step 1: Escrever testes falhando

- [ ] **1** — Criar `claude-bridge/translate.codex.test.js`:

```js
// claude-bridge/translate.codex.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mapModel,
  buildCodexArgs,
  buildStdin,
  translateResponse,
} from './translate.codex.js';

test('mapModel: sempre gpt-5.5 (único modelo suportado nesta versão)', () => {
  assert.equal(mapModel('gpt-5.5'), 'gpt-5.5');
  assert.equal(mapModel('gpt-5'), 'gpt-5.5');
  assert.equal(mapModel(undefined), 'gpt-5.5');
  assert.equal(mapModel('qualquer-coisa'), 'gpt-5.5');
});

test('buildCodexArgs: flags básicas + modelo + reasoning_effort default medium', () => {
  const args = buildCodexArgs({ model: 'gpt-5.5' });
  assert.ok(args.includes('exec'));
  assert.ok(args.includes('--json'));
  assert.ok(args.includes('--skip-git-repo-check'));
  assert.ok(args.includes('--ephemeral'));
  assert.equal(args[args.indexOf('-s') + 1], 'read-only');
  assert.equal(args[args.indexOf('-a') + 1], 'never');
  assert.equal(args[args.indexOf('-m') + 1], 'gpt-5.5');
  assert.equal(args[args.indexOf('-c') + 1], 'model_reasoning_effort=medium');
});

test('buildCodexArgs: reasoning_effort válido aceito', () => {
  for (const level of ['minimal', 'low', 'medium', 'high']) {
    const args = buildCodexArgs({ model: 'gpt-5.5', reasoning_effort: level });
    assert.equal(args[args.indexOf('-c') + 1], `model_reasoning_effort=${level}`);
  }
});

test('buildCodexArgs: reasoning_effort inválido cai em medium', () => {
  const args = buildCodexArgs({ model: 'gpt-5.5', reasoning_effort: 'extreme' });
  assert.equal(args[args.indexOf('-c') + 1], 'model_reasoning_effort=medium');
});

test('buildCodexArgs: web_search=true adiciona --search', () => {
  const args = buildCodexArgs({ model: 'gpt-5.5', web_search: true });
  assert.ok(args.includes('--search'));
});

test('buildCodexArgs: web_search=false (ou ausente) NÃO adiciona --search', () => {
  const a1 = buildCodexArgs({ model: 'gpt-5.5' });
  const a2 = buildCodexArgs({ model: 'gpt-5.5', web_search: false });
  assert.ok(!a1.includes('--search'));
  assert.ok(!a2.includes('--search'));
});

test('buildStdin: turno único concatena role label', () => {
  const stdin = buildStdin({
    messages: [{ role: 'user', content: 'Oi' }],
  });
  assert.match(stdin, /Usuário: Oi/);
});

test('buildStdin: extrai system do messages[role=system] para prefixar', () => {
  const stdin = buildStdin({
    messages: [
      { role: 'system', content: 'Você é um juiz.' },
      { role: 'user', content: 'Analise X' },
    ],
  });
  assert.match(stdin, /Instruções do sistema:.*juiz/s);
  assert.match(stdin, /Usuário: Analise X/);
});

test('buildStdin: multi-turn colapsa user+assistant+user em texto rotulado', () => {
  const stdin = buildStdin({
    messages: [
      { role: 'user', content: 'A' },
      { role: 'assistant', content: 'B' },
      { role: 'user', content: 'C' },
    ],
  });
  assert.match(stdin, /Usuário: A/);
  assert.match(stdin, /Assistente: B/);
  assert.match(stdin, /Usuário: C/);
});

test('buildStdin: aceita content como array de blocos {type:text,text}', () => {
  const stdin = buildStdin({
    messages: [{ role: 'user', content: [{ type: 'text', text: 'Bloco 1' }] }],
  });
  assert.match(stdin, /Usuário: Bloco 1/);
});

// translateResponse — sucesso simples (sem citations)
const EVENT_TEXT_OK = JSON.stringify({
  type: 'task_completed',
  last_agent_message: 'BATATA-FRITA-7392',
  session_id: 'sess-codex-1',
  usage: { input_tokens: 12, output_tokens: 5 },
});

test('translateResponse: sucesso vira Chat Completions', () => {
  const out = translateResponse(EVENT_TEXT_OK + '\n', 'gpt-5.5');
  assert.equal(out.status, 200);
  assert.equal(out.body.object, 'chat.completion');
  assert.equal(out.body.choices[0].message.content, 'BATATA-FRITA-7392');
  assert.equal(out.body.choices[0].message.role, 'assistant');
  assert.equal(out.body.choices[0].finish_reason, 'stop');
  assert.equal(out.body.usage.prompt_tokens, 12);
  assert.equal(out.body.usage.completion_tokens, 5);
  assert.equal(out.body.usage.total_tokens, 17);
});

test('translateResponse: sem evento terminal → 500', () => {
  const out = translateResponse('{"type":"agent_message_delta","delta":"hi"}\n', 'gpt-5.5');
  assert.equal(out.status, 500);
  assert.equal(out.body.error.type, 'server_error');
});

test('translateResponse: erro do codex (ex: not logged in) → 401', () => {
  const ERR = JSON.stringify({
    type: 'error',
    message: 'Not logged in. Please run `codex login` first.',
  });
  const out = translateResponse(ERR + '\n', 'gpt-5.5');
  assert.equal(out.status, 401);
  assert.equal(out.body.error.type, 'authentication_error');
});

// Citation parsing — testado via shape SINTETIZADO (real shape descoberto na Task D3)
test('translateResponse: agrega grounding quando citations presentes', () => {
  // Shape assumido — ajustado na Task D3 contra saída real.
  const EVENT_CITATIONS = JSON.stringify({
    type: 'task_completed',
    last_agent_message: 'Conforme [STF](https://stf.jus.br/x), …',
    citations: [
      { url: 'https://stf.jus.br/x', title: 'STF — decisão X' },
      { url: 'https://stj.jus.br/y', title: 'STJ — decisão Y' },
    ],
    web_search_queries: ['STF decisão X 2026'],
    session_id: 'sess-codex-2',
    usage: { input_tokens: 5, output_tokens: 50 },
  });
  const out = translateResponse(EVENT_CITATIONS + '\n', 'gpt-5.5');
  assert.equal(out.status, 200);
  assert.ok(out.body.grounding);
  assert.deepEqual(out.body.grounding.webSearchQueries, ['STF decisão X 2026']);
  assert.equal(out.body.grounding.groundingChunks.length, 2);
  assert.equal(out.body.grounding.groundingChunks[0].web.uri, 'https://stf.jus.br/x');
});
```

### Step 2: Rodar e ver falhar

- [ ] **2** — Rodar:

```bash
cd /home/nohlack/sentencify
node --test claude-bridge/translate.codex.test.js
```

Expected: FAIL — módulo não existe ainda.

### Step 3: Implementar `translate.codex.js`

- [ ] **3** — Criar `claude-bridge/translate.codex.js`:

```js
// claude-bridge/translate.codex.js
//
// Tradução entre formato Chat Completions (in/out) e `codex exec --json`.
// Espelha translate.js (claude-cli) na estrutura, mas para Codex CLI.

const SUPPORTED_MODELS = new Set(['gpt-5.5']);
const VALID_REASONING = new Set(['minimal', 'low', 'medium', 'high']);
const DEFAULT_REASONING = 'medium';

/**
 * Mapeia model id para o suportado. Nesta versão, sempre gpt-5.5.
 * @param {string|undefined} model
 * @returns {string}
 */
export function mapModel(model) {
  if (SUPPORTED_MODELS.has(String(model))) return String(model);
  return 'gpt-5.5';
}

/**
 * Monta args para `codex exec --json` a partir do body Chat Completions.
 * @param {{model?: string, reasoning_effort?: string, web_search?: boolean}} body
 * @returns {string[]}
 */
export function buildCodexArgs(body) {
  const reasoning = VALID_REASONING.has(body?.reasoning_effort)
    ? body.reasoning_effort
    : DEFAULT_REASONING;
  const args = [
    'exec',
    '--json',
    '--skip-git-repo-check',
    '--ephemeral',
    '-s', 'read-only',
    '-a', 'never',
    '-m', mapModel(body?.model),
    '-c', `model_reasoning_effort=${reasoning}`,
  ];
  if (body?.web_search === true) {
    args.push('--search');
  }
  return args;
}

/**
 * Extrai o texto plano de um content (string ou array de blocos).
 */
function blockToText(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((b) => (typeof b === 'string' ? b : b?.text || ''))
      .filter(Boolean)
      .join('\n');
  }
  return '';
}

/**
 * Monta o stdin do codex exec a partir das messages. Codex exec aceita o prompt
 * via stdin quando o prompt argument é '-'; aqui passamos o prompt construído
 * com marcadores de role. System messages viram prefixo "Instruções do sistema:".
 *
 * @param {{messages: Array<{role:string, content:any}>}} body
 * @returns {string}
 */
export function buildStdin(body) {
  const messages = Array.isArray(body?.messages) ? body.messages : [];
  const sysTexts = [];
  const turnLines = [];
  for (const msg of messages) {
    const text = blockToText(msg?.content);
    if (!text) continue;
    if (msg.role === 'system') {
      sysTexts.push(text);
    } else if (msg.role === 'assistant') {
      turnLines.push(`Assistente: ${text}`);
    } else {
      // user (ou qualquer outro) cai aqui
      turnLines.push(`Usuário: ${text}`);
    }
  }
  const parts = [];
  if (sysTexts.length) {
    parts.push('Instruções do sistema:\n' + sysTexts.join('\n\n'));
  }
  parts.push(turnLines.join('\n\n'));
  return parts.join('\n\n');
}

/**
 * Parseia o JSONL emitido por `codex exec --json` e devolve {status, body}
 * no formato Chat Completions OpenAI.
 *
 * Eventos relevantes (descobertos via smoke test — Task D3):
 *   - task_completed: evento terminal com last_agent_message (resposta final)
 *   - error: erro do CLI (auth, rede, etc.)
 *   - citations / web_search_queries: opcional, quando --search está ativo
 *
 * @param {string} stdout - Saída JSONL do codex exec
 * @param {string} model
 * @returns {{status: number, body: object}}
 */
export function translateResponse(stdout, model) {
  let terminal = null;
  let errorEvent = null;
  for (const line of stdout.split('\n')) {
    const t = line.trim();
    if (!t.startsWith('{')) continue;
    let obj;
    try { obj = JSON.parse(t); } catch { continue; }
    if (obj.type === 'task_completed') terminal = obj;
    if (obj.type === 'error') errorEvent = obj;
  }

  if (errorEvent) {
    const msg = String(errorEvent.message || '');
    if (/not logged in|login/i.test(msg)) {
      return { status: 401, body: { error: { type: 'authentication_error', message: 'Codex CLI não está logado. Rode `codex login` no terminal.' } } };
    }
    return { status: 500, body: { error: { type: 'server_error', message: msg || 'Erro desconhecido do codex CLI.' } } };
  }

  if (!terminal) {
    return { status: 500, body: { error: { type: 'server_error', message: 'Nenhum evento `task_completed` recebido do codex CLI.' } } };
  }

  const text = String(terminal.last_agent_message || '');
  const usage = terminal.usage || {};
  const input = usage.input_tokens || 0;
  const output = usage.output_tokens || 0;

  const out = {
    id: `chatcmpl-codex-${terminal.session_id || 'unknown'}`,
    object: 'chat.completion',
    model,
    choices: [{
      index: 0,
      message: { role: 'assistant', content: text },
      finish_reason: 'stop',
    }],
    usage: {
      prompt_tokens: input,
      completion_tokens: output,
      total_tokens: input + output,
    },
  };

  // Grounding (citations + queries) quando --search foi acionado
  const citations = Array.isArray(terminal.citations) ? terminal.citations : [];
  const queries = Array.isArray(terminal.web_search_queries) ? terminal.web_search_queries : [];
  if (citations.length || queries.length) {
    out.grounding = {
      webSearchQueries: queries,
      groundingChunks: citations
        .filter((c) => c && c.url)
        .map((c) => ({ web: { uri: c.url, title: c.title || c.url } })),
    };
  }

  return { status: 200, body: out };
}
```

### Step 4: Rodar testes e verificar passam

- [ ] **4** — Rodar:

```bash
node --test claude-bridge/translate.codex.test.js
```

Expected: PASS (todos os testes).

### Step 5: Commit

- [ ] **5** — Commit:

```bash
git add claude-bridge/translate.codex.js claude-bridge/translate.codex.test.js
git commit -m "feat(claude-bridge): translate.codex.js — Chat Completions ↔ codex exec"
```

---

## Task D2: `server.js` — nova rota `/api/codex-cli/messages`

**Files:**
- Modify: `claude-bridge/server.js`

### Step 1: Importar módulo codex

- [ ] **1** — No topo de `claude-bridge/server.js:5`, estender o import:

```js
import { buildClaudeArgs, buildStdin, translateResponse } from './translate.js';
import {
  buildCodexArgs,
  buildStdin as buildCodexStdin,
  translateResponse as translateCodexResponse,
} from './translate.codex.js';
```

### Step 2: Adicionar rota dentro do server handler

- [ ] **2** — Após o bloco `if (req.method === 'POST' && req.url === '/api/claude-cli/messages')` (linha 47–93), inserir:

```js
  if (req.method === 'POST' && req.url === '/api/codex-cli/messages') {
    let body;
    try { body = await readBody(req); }
    catch { sendJson(res, 400, { error: { type: 'invalid_request', message: 'JSON inválido.' } }); return; }

    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      sendJson(res, 400, { error: { type: 'invalid_request', message: 'Campo `messages` ausente ou vazio.' } });
      return;
    }

    try {
      const args = buildCodexArgs(body);
      const child = spawn('codex', args, { cwd: os.tmpdir() });
      child.stdin.on('error', () => {});
      let stdout = '', stderr = '';
      child.stdout.on('data', (d) => { stdout += d.toString(); });
      child.stderr.on('data', (d) => { stderr += d.toString(); });
      req.on('close', () => { if (!child.killed) child.kill(); });
      child.on('error', (err) => {
        if (res.writableEnded) return;
        sendJson(res, 500, { error: { type: 'server_error', message: `Falha ao executar 'codex': ${err.message}. O binário está no PATH?` } });
      });
      child.on('close', () => {
        if (res.writableEnded) return;
        if (!stdout.trim()) {
          sendJson(res, 500, { error: { type: 'server_error', message: `codex CLI sem saída. stderr: ${stderr.slice(0, 500)}` } });
          return;
        }
        let out;
        try {
          out = translateCodexResponse(stdout, body.model || 'gpt-5.5');
        } catch (err) {
          sendJson(res, 500, { error: { type: 'server_error', message: `Erro ao traduzir resposta: ${err.message}` } });
          return;
        }
        sendJson(res, out.status, out.body);
      });
      child.stdin.write(buildCodexStdin(body));
      child.stdin.end();
    } catch (err) {
      if (!res.writableEnded) sendJson(res, 500, { error: { type: 'server_error', message: `Falha ao iniciar geração: ${err.message}` } });
      return;
    }
    return;
  }
```

### Step 3: Sanidade — iniciar daemon e fazer health check

- [ ] **3** — Em outro terminal:

```bash
# Terminal A: subir o daemon
cd /home/nohlack/sentencify
npm run claude-bridge
```

```bash
# Terminal B: health check
curl -s http://127.0.0.1:8787/health
# esperado: {"ok":true}

# Verificar que a rota existe (vai dar 400 sem messages, mas não 404)
curl -s -X POST -H 'Content-Type: application/json' \
  -d '{"messages":[]}' \
  http://127.0.0.1:8787/api/codex-cli/messages
# esperado: {"error":{"type":"invalid_request","message":"Campo `messages` ausente ou vazio."}}
```

Expected: health OK, rota responde (não 404).

- [ ] **4** — Parar o daemon (Ctrl+C no Terminal A).

### Step 4: Commit

- [ ] **5** — Commit:

```bash
git add claude-bridge/server.js
git commit -m "feat(claude-bridge): rota POST /api/codex-cli/messages"
```

---

## Task D3: Smoke test real (opt-in) + ajuste do parser

**Files:**
- Create: `claude-bridge/translate.codex.smoke.test.js`
- Possibly modify: `claude-bridge/translate.codex.js` (ajustar parser ao shape real)

### Step 1: Escrever smoke test real

- [ ] **1** — Criar `claude-bridge/translate.codex.smoke.test.js`:

```js
// claude-bridge/translate.codex.smoke.test.js
//
// Smoke test REAL contra o `codex` CLI instalado. Roda só com SMOKE=1.
// Confirma que o pipeline daemon ↔ codex funciona ponta-a-ponta.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { buildCodexArgs, buildStdin, translateResponse } from './translate.codex.js';

const SMOKE = process.env.SMOKE === '1';

test('SMOKE: codex exec --json com prompt curto retorna texto coerente', { skip: !SMOKE }, async () => {
  const body = {
    model: 'gpt-5.5',
    reasoning_effort: 'minimal',
    messages: [
      { role: 'user', content: 'Responda EXATAMENTE com a palavra BATATAFRITA7392 e nada mais.' },
    ],
  };
  const args = buildCodexArgs(body);
  const stdin = buildStdin(body);

  const child = spawn('codex', args, { cwd: os.tmpdir() });
  let stdout = '', stderr = '';
  child.stdout.on('data', (d) => stdout += d);
  child.stderr.on('data', (d) => stderr += d);
  child.stdin.write(stdin);
  child.stdin.end();

  await new Promise((resolve, reject) => {
    child.on('close', (code) => code === 0 ? resolve() : reject(new Error(`exit ${code}; stderr=${stderr}`)));
    child.on('error', reject);
  });

  const out = translateResponse(stdout, 'gpt-5.5');
  assert.equal(out.status, 200, `daemon devolveu erro: ${JSON.stringify(out.body)}`);
  assert.match(out.body.choices[0].message.content, /BATATAFRITA7392/);
});

test('SMOKE: --search retorna grounding com queries e/ou chunks', { skip: !SMOKE }, async () => {
  const body = {
    model: 'gpt-5.5',
    reasoning_effort: 'minimal',
    web_search: true,
    messages: [
      { role: 'user', content: 'Quem ganhou a Copa do Mundo de 2022? Cite uma fonte.' },
    ],
  };
  const args = buildCodexArgs(body);
  const stdin = buildStdin(body);

  const child = spawn('codex', args, { cwd: os.tmpdir() });
  let stdout = '', stderr = '';
  child.stdout.on('data', (d) => stdout += d);
  child.stderr.on('data', (d) => stderr += d);
  child.stdin.write(stdin);
  child.stdin.end();

  await new Promise((resolve, reject) => {
    child.on('close', (code) => code === 0 ? resolve() : reject(new Error(`exit ${code}; stderr=${stderr}`)));
    child.on('error', reject);
  });

  // Diagnóstico — antes de afirmar, imprime o JSONL para descoberta do shape
  console.log('=== STDOUT DO CODEX (JSONL) ===');
  console.log(stdout);
  console.log('=== STDOUT END ===');

  const out = translateResponse(stdout, 'gpt-5.5');
  assert.equal(out.status, 200);
  assert.match(out.body.choices[0].message.content, /Argentina|2022/i);
  // Asserções fracas — se o shape não casar, o console.log acima guia o ajuste:
  if (out.body.grounding) {
    assert.ok(
      (out.body.grounding.webSearchQueries?.length ?? 0) > 0
      || (out.body.grounding.groundingChunks?.length ?? 0) > 0,
      'grounding existe mas está vazio'
    );
  }
});
```

### Step 2: Rodar smoke tests

- [ ] **2** — Rodar:

```bash
SMOKE=1 node --test claude-bridge/translate.codex.smoke.test.js
```

Expected:
- Primeiro teste: PASS (resposta contém BATATAFRITA7392).
- Segundo teste: PASS (resposta menciona Argentina/2022), e o `console.log` do JSONL mostra o shape REAL dos eventos de citation do codex.

### Step 3: Ajustar parser ao shape real

- [ ] **3** — Inspecionar o JSONL impresso. Em `translate.codex.js`, ajustar `translateResponse` para reconhecer os campos reais (provavelmente eventos `agent_message_delta` para texto streaming + `task_completed` final + algum evento específico para citations como `tool_call_completed` com `tool_name: 'web_search'`).

> **Nota crítica:** se o shape difere significativamente das suposições do Task D1 (ex: o texto vem em deltas e não num único `task_completed`), reescrever a parte de extração de texto para concatenar todos os `agent_message_delta` com mesmo `parent_id`.

### Step 4: Re-rodar testes unitários + smoke

- [ ] **4** — Rodar:

```bash
node --test claude-bridge/translate.codex.test.js
SMOKE=1 node --test claude-bridge/translate.codex.smoke.test.js
```

Expected: ambos PASS. Atualizar os fixtures dos unit tests (`EVENT_TEXT_OK`, `EVENT_CITATIONS`) se o shape mudou.

### Step 5: Commit

- [ ] **5** — Commit:

```bash
git add claude-bridge/translate.codex.smoke.test.js claude-bridge/translate.codex.js claude-bridge/translate.codex.test.js
git commit -m "test(claude-bridge): smoke real do codex exec; parser ajustado ao shape real"
```

---

## Task D4: `translate.js` (claude-cli) — suporte a `body.web_search`

**Files:**
- Modify: `claude-bridge/translate.js`
- Modify: `claude-bridge/translate.test.js`

### Step 1: Adicionar testes

- [ ] **1** — Em `claude-bridge/translate.test.js`, adicionar (no fim do arquivo):

```js
test('buildClaudeArgs: web_search=true ativa --tools WebSearch + bypassPermissions', () => {
  const args = buildClaudeArgs({ model: 'sonnet', web_search: true });
  const toolsIdx = args.indexOf('--tools');
  assert.notEqual(toolsIdx, -1);
  assert.equal(args[toolsIdx + 1], 'WebSearch');
  const permIdx = args.indexOf('--permission-mode');
  assert.notEqual(permIdx, -1);
  assert.equal(args[permIdx + 1], 'bypassPermissions');
});

test('buildClaudeArgs: sem web_search mantém --tools "" (default seguro)', () => {
  const args = buildClaudeArgs({ model: 'sonnet' });
  const toolsIdx = args.indexOf('--tools');
  assert.equal(args[toolsIdx + 1], '');
  assert.equal(args.indexOf('--permission-mode'), -1);
});

test('translateResponse: extrai grounding de tool_use blocks WebSearch', () => {
  // Shape inspirado no smoke test feito manualmente — task_completed result text com sources
  const RESULT_WITH_TOOLS = JSON.stringify({
    type: 'result',
    subtype: 'success',
    is_error: false,
    result: 'A capital da França é Paris. Sources:\n- [Wikipedia](https://pt.wikipedia.org/wiki/Paris)',
    session_id: 'sess-ws-1',
    usage: { input_tokens: 10, output_tokens: 30 },
  });
  // Simular tool_use no stream: na realidade vêm como blocks separados nos assistant messages;
  // o translateResponse atual só olha o evento result. Estendemos para coletar tool_use anteriores.
  const stdout = [
    '{"type":"assistant","message":{"content":[{"type":"tool_use","name":"WebSearch","input":{"query":"capital França"}}]}}',
    RESULT_WITH_TOOLS,
  ].join('\n') + '\n';

  const out = translateResponse(stdout, 'sonnet');
  assert.equal(out.status, 200);
  assert.ok(out.body.grounding, 'grounding deveria estar presente');
  assert.deepEqual(out.body.grounding.webSearchQueries, ['capital França']);
  assert.ok(out.body.grounding.groundingChunks.length >= 1);
  assert.match(out.body.grounding.groundingChunks[0].web.uri, /wikipedia/);
});
```

### Step 2: Rodar testes e ver falhar

- [ ] **2** — Rodar:

```bash
node --test claude-bridge/translate.test.js
```

Expected: FAIL nos 3 testes novos (build não aceita web_search, response não tem grounding).

### Step 3: Modificar `buildClaudeArgs`

- [ ] **3** — Em `claude-bridge/translate.js:36-68`, substituir o array inicial de args (linhas 37-48) por:

```js
export function buildClaudeArgs(body) {
  const args = [
    '-p',
    '--verbose',
    '--input-format',
    'stream-json',
    '--output-format',
    'stream-json',
    '--setting-sources',
    ''
  ];

  // Tools: por default zera; se body.web_search=true ativa WebSearch + bypassPermissions
  if (body?.web_search === true) {
    args.push('--tools', 'WebSearch');
    args.push('--permission-mode', 'bypassPermissions');
  } else {
    args.push('--tools', '');
  }
  // ... resto inalterado (model, system, effort)
```

### Step 4: Modificar `translateResponse` para extrair grounding

- [ ] **4** — Em `claude-bridge/translate.js:149-190`, expandir `translateResponse`:

```js
export function translateResponse(stdout, model) {
  let result = null;
  const webSearchQueries = [];

  for (const line of stdout.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('{')) continue;
    let obj;
    try { obj = JSON.parse(trimmed); } catch { continue; }

    // Coletar tool_use blocks WebSearch (vêm em assistant messages)
    if (obj.type === 'assistant' && Array.isArray(obj.message?.content)) {
      for (const block of obj.message.content) {
        if (block?.type === 'tool_use' && block.name === 'WebSearch' && block.input?.query) {
          webSearchQueries.push(block.input.query);
        }
      }
    }
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
  const body = {
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
  };

  // Grounding: extrair URLs do markdown do result + queries dos tool_use anteriores
  const urlRegex = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;
  const groundingChunks = [];
  const seen = new Set();
  for (const m of String(result.result || '').matchAll(urlRegex)) {
    const uri = m[2];
    if (seen.has(uri)) continue;
    seen.add(uri);
    groundingChunks.push({ web: { uri, title: m[1] || uri } });
  }
  if (webSearchQueries.length || groundingChunks.length) {
    body.grounding = { webSearchQueries, groundingChunks };
  }

  return { status: 200, body };
}
```

### Step 5: Rodar testes e verificar passam

- [ ] **5** — Rodar:

```bash
node --test claude-bridge/translate.test.js
```

Expected: PASS (todos os testes — antigos + 3 novos).

### Step 6: Commit

- [ ] **6** — Commit:

```bash
git add claude-bridge/translate.js claude-bridge/translate.test.js
git commit -m "feat(claude-bridge): web_search no claude-cli — WebSearch + grounding"
```

---

# Parte 2 — Frontend (provider codex-cli + web search wiring)

## Task 1: Tipos `AIProvider`, `CodexCliReasoning`, `AISettings`, `APIKeys`

**Files:**
- Modify: `src/types/ai.ts`
- Modify: `src/types/index.ts`

### Step 1: Editar `src/types/ai.ts`

- [ ] **1.1** — Substituir linha 11 do `AIProvider`:

```ts
export type AIProvider = 'claude' | 'gemini' | 'openai' | 'grok' | 'deepseek' | 'claude-cli' | 'codex-cli';
```

- [ ] **1.2** — Após `ClaudeCliEffort` (linha ~26), adicionar:

```ts
/** Reasoning effort do codex-cli (mapeado para `model_reasoning_effort` do config Codex) */
export type CodexCliReasoning = 'minimal' | 'low' | 'medium' | 'high';
```

- [ ] **1.3** — Em `APIKeys` (após `'claude-cli'?: string;` linha ~34), adicionar:

```ts
  'codex-cli'?: string; // Sem API key — usa OAuth ChatGPT local
```

- [ ] **1.4** — Em `AISettings` (após `claudeCliEffort?: ClaudeCliEffort;` linha ~41), adicionar:

```ts
  codexCliModel?: string;
  codexCliReasoning?: CodexCliReasoning;
```

### Step 2: Editar `src/types/index.ts` (espelhar)

- [ ] **2.1** — Substituir linha 195 do `AIProvider` para incluir `'codex-cli'`.
- [ ] **2.2** — Após `ClaudeCliEffort` (linha ~202), adicionar `CodexCliReasoning` (mesma definição da Step 1.2).
- [ ] **2.3** — Após `claudeCliEffort?:` (linha ~280), adicionar os mesmos campos da Step 1.4.
- [ ] **2.4** — Atualizar a tipagem inline de `apiKeys` na linha ~289:

```ts
  apiKeys: { claude: string; gemini: string; openai: string; grok: string; deepseek: string; 'claude-cli'?: string; 'codex-cli'?: string };
```

### Step 3: tsc check + commit

- [ ] **3** — Rodar e commitar:

```bash
npx tsc --noEmit
git add src/types/ai.ts src/types/index.ts
git commit -m "types(codex-cli): add provider, reasoning, settings, apiKeys"
```

Expected: zero erros de TS novos.

---

## Task 2: Util `src/utils/codex-cli-bridge.ts` (TDD)

**Files:**
- Create: `src/utils/codex-cli-bridge.ts`
- Create: `src/utils/codex-cli-bridge.test.ts`

### Step 1: Teste falhando

- [ ] **1** — Criar `src/utils/codex-cli-bridge.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { getCodexCliBridgeUrl, CODEX_CLI_MESSAGES_PATH } from './codex-cli-bridge';

describe('codex-cli-bridge', () => {
  beforeEach(() => { localStorage.clear(); });

  it('usa a URL default quando não há override', () => {
    expect(getCodexCliBridgeUrl()).toBe('http://localhost:8787');
  });

  it('respeita override em localStorage', () => {
    localStorage.setItem('sentencify-codex-cli-bridge-url', 'http://localhost:9999');
    expect(getCodexCliBridgeUrl()).toBe('http://localhost:9999');
  });

  it('expõe o path do endpoint de mensagens', () => {
    expect(CODEX_CLI_MESSAGES_PATH).toBe('/api/codex-cli/messages');
  });
});
```

### Step 2: Falha

- [ ] **2** — Rodar `npx vitest run src/utils/codex-cli-bridge.test.ts` — esperado FAIL.

### Step 3: Implementar

- [ ] **3** — Criar `src/utils/codex-cli-bridge.ts`:

```ts
/**
 * @file codex-cli-bridge.ts
 * @description URL e path do daemon local (provider "Codex Local (CLI)").
 *              Default aponta para o mesmo daemon claude-bridge (porta 8787),
 *              mas override próprio permite separar se necessário.
 */

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

### Step 4: Passa + commit

- [ ] **4** — Rodar `npx vitest run src/utils/codex-cli-bridge.test.ts` — esperado PASS.

```bash
git add src/utils/codex-cli-bridge.ts src/utils/codex-cli-bridge.test.ts
git commit -m "feat(codex-cli): util getCodexCliBridgeUrl + MESSAGES_PATH"
```

---

## Task 3: Store factory `createAIStore.ts` + testes

**Files:**
- Modify: `src/stores/shared/createAIStore.ts`
- Modify: `src/stores/shared/createAIStore.test.ts`

### Step 1: Adicionar testes

- [ ] **1** — Em `src/stores/shared/createAIStore.test.ts`, adicionar (depois dos testes existentes):

```ts
describe('codex-cli provider support', () => {
  const { useStore } = createAIStore({
    persistName: 'test-codex-cli',
    apiKeyStorageKey: 'test-codex-cli-keys'
  });

  beforeEach(() => {
    useStore.getState().resetSettings();
  });

  it('tem defaults codexCliModel e codexCliReasoning', () => {
    const s = useStore.getState().aiSettings;
    expect(s.codexCliModel).toBe('gpt-5.5');
    expect(s.codexCliReasoning).toBe('medium');
  });

  it('setModel("codex-cli", id) grava em codexCliModel', () => {
    useStore.getState().setModel('codex-cli', 'gpt-5.5');
    expect(useStore.getState().aiSettings.codexCliModel).toBe('gpt-5.5');
  });

  it('selectCurrentModel devolve codexCliModel quando provider=codex-cli', () => {
    useStore.getState().setProvider('codex-cli');
    useStore.getState().setModel('codex-cli', 'gpt-5.5');
    expect(selectCurrentModel(useStore.getState())).toBe('gpt-5.5');
  });

  it('selectCurrentModel cai em "gpt-5.5" se codexCliModel for vazio', () => {
    useStore.getState().setProvider('codex-cli');
    useStore.setState((s) => ({
      ...s,
      aiSettings: { ...s.aiSettings, codexCliModel: '' }
    }));
    expect(selectCurrentModel(useStore.getState())).toBe('gpt-5.5');
  });
});
```

### Step 2: Ver falhar, implementar, ver passar

- [ ] **2** — Rodar testes (FAIL esperado).
- [ ] **3** — Em `src/stores/shared/createAIStore.ts`:
  - Linha 48-64 (defaults): adicionar `codexCliModel: 'gpt-5.5'` e `codexCliReasoning: 'medium' as const` após o `claudeCliEffort`.
  - Linha 112-117 (`setModel`): substituir corpo por:

    ```ts
            setModel: (provider, model) =>
              set((state) => {
                const specialKeys: Partial<Record<AIProvider, keyof AISettings>> = {
                  'claude-cli': 'claudeCliModel',
                  'codex-cli': 'codexCliModel'
                };
                const key = (specialKeys[provider] ?? `${provider}Model`) as keyof AISettings;
                return { aiSettings: { ...state.aiSettings, [key]: model } };
              }),
    ```

  - Linha 202-220 (`selectCurrentModel`): adicionar destruturação de `codexCliModel` e branch:

    ```ts
        case 'codex-cli':
          return codexCliModel || 'gpt-5.5';
    ```

### Step 3: Testes + tsc + commit

- [ ] **4** — Rodar `npx vitest run src/stores/shared/createAIStore.test.ts` (PASS) + `npx tsc --noEmit`.

```bash
git add src/stores/shared/createAIStore.ts src/stores/shared/createAIStore.test.ts
git commit -m "feat(codex-cli): defaults, setModel branch, selectCurrentModel"
```

---

## Task 4: Store core `useAIStore.ts` (espelhar)

**Files:**
- Modify: `src/stores/useAIStore.ts`

### Step 1: Localizar pontos

- [ ] **1** — Rodar:

```bash
grep -n "claudeCliModel\|claudeCliEffort\|claude-cli" src/stores/useAIStore.ts
```

Anotar linhas dos defaults, `setModel` (se existir versão própria), `selectCurrentModel` (se existir).

### Step 2: Aplicar mudanças

- [ ] **2** — Adicionar nos defaults: `codexCliModel: 'gpt-5.5'`, `codexCliReasoning: 'medium' as const`.
- [ ] **3** — Se houver `setModel` próprio, aplicar mesma lógica da Task 3 (branch `'codex-cli'` → `codexCliModel`).
- [ ] **4** — Se houver `selectCurrentModel` próprio, adicionar `case 'codex-cli': return codexCliModel || 'gpt-5.5';`.

### Step 3: tsc + commit

- [ ] **5** — Rodar `npx tsc --noEmit` e commitar:

```bash
git add src/stores/useAIStore.ts
git commit -m "feat(codex-cli): core store defaults + setModel/select"
```

---

## Task 5: Constants `AI_PROVIDERS` — 4 subapps

**Files:**
- Modify: `src/apps/analisador/constants/models.ts`
- Modify: `src/apps/embargos/constants/models.ts`
- Modify: `src/apps/noticias/constants/models.ts`
- Modify: `src/apps/prova-oral/constants/models.ts`

### Step 1: Adicionar entrada (4 vezes)

- [ ] **1** — Em cada um dos 4 arquivos, após a entrada `'claude-cli'`, adicionar:

```ts
'codex-cli': {
  name: 'Codex Local (CLI)',
  icon: 'message-circle',
  models: [
    {
      id: 'gpt-5.5',
      name: 'GPT-5.5',
      recommended: true,
      description: 'Generalista — usado via codex CLI sob assinatura ChatGPT (custo $0)'
    }
  ]
},
```

### Step 2: tsc + commit

- [ ] **2** — Rodar `npx tsc --noEmit` + commit:

```bash
git add src/apps/{analisador,embargos,noticias,prova-oral}/constants/models.ts
git commit -m "feat(codex-cli): registra provider e modelo gpt-5.5 nos 4 subapps"
```

---

## Task 6: `ProviderIcon.tsx` (TDD)

**Files:**
- Modify: `src/components/ui/ProviderIcon.tsx:99-115`
- Modify: `src/components/ui/ProviderIcon.test.tsx`

### Step 1: Teste

- [ ] **1** — Em `src/components/ui/ProviderIcon.test.tsx`, após o bloco `describe('ClaudeCLI', …)` (linha ~198), adicionar:

```tsx
  // ═══════════════════════════════════════════════════════════════════════════
  // CODEX-CLI PROVIDER TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('CodexCLI', () => {
    it('deve renderizar um SVG para o provider codex-cli', () => {
      const { container } = render(<ProviderIcon provider="codex-cli" />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('usa o mesmo path do OpenAIIcon (família OpenAI)', () => {
      const { container: codexContainer } = render(<ProviderIcon provider="codex-cli" />);
      const { container: openaiContainer } = render(<ProviderIcon provider="openai" />);
      const codexPath = codexContainer.querySelector('svg path')?.getAttribute('d');
      const openaiPath = openaiContainer.querySelector('svg path')?.getAttribute('d');
      expect(codexPath).toBe(openaiPath);
    });
  });
```

### Step 2: Falha → implementação → passa → commit

- [ ] **2** — Rodar teste, FAIL.

- [ ] **3** — Em `src/components/ui/ProviderIcon.tsx:111` (antes de `default:`), adicionar:

```tsx
    case 'codex-cli':
      return <OpenAIIcon size={size} className={className} />;
```

- [ ] **4** — Rodar teste, PASS. Commit:

```bash
git add src/components/ui/ProviderIcon.tsx src/components/ui/ProviderIcon.test.tsx
git commit -m "feat(codex-cli): ProviderIcon usa OpenAIIcon"
```

---

## Task 7: `callOpenAIAPI` core — branch `localBridge` + propagação webSearch/grounding

**Files:**
- Modify: `src/hooks/useAIIntegration.ts` (callOpenAIAPI ~1043-1156)

### Step 1: Import do util

- [ ] **1** — No topo, junto do import existente do `claude-cli-bridge`:

```ts
import { getClaudeCliBridgeUrl, CLAUDE_CLI_MESSAGES_PATH } from '../utils/claude-cli-bridge';
import { getCodexCliBridgeUrl, CODEX_CLI_MESSAGES_PATH } from '../utils/codex-cli-bridge';
```

### Step 2: Adicionar `localBridge` ao destructuring

- [ ] **2** — Em `callOpenAIAPI` (linha ~1043), no destructuring:

```ts
    const {
      maxTokens = OPENAI_CONFIG.MAX_TOKENS_DEFAULT,
      systemPrompt = null,
      useInstructions = false,
      model = aiSettings.openaiModel || 'gpt-5.2-chat-latest',
      timeout = null,
      abortSignal = null,
      logMetrics = true,
      extractText = true,
      disableThinking = false,
      localBridge = false,
      webSearch = false,
      onGrounding
    } = options;
```

### Step 3: Substituir bloco do fetch

- [ ] **3** — Em `callOpenAIAPI`, substituir o bloco que monta requestBody + fetch (linhas ~1080-1101):

```ts
        const openaiMessages = convertToOpenAIFormat(messages, finalSystemPrompt);

        const requestBody: Record<string, unknown> = {
          model,
          messages: openaiMessages,
          max_tokens: maxTokens
        };

        if (model === 'gpt-5.2' && !disableThinking) {
          requestBody.reasoning = { effort: reasoningLevel };
        }

        if (localBridge) {
          requestBody.reasoning_effort = aiSettings.codexCliReasoning || 'medium';
          if (webSearch) requestBody.web_search = true;
        }

        const url = localBridge
          ? `${getCodexCliBridgeUrl()}${CODEX_CLI_MESSAGES_PATH}`
          : `${API_BASE}/api/openai/chat`;
        const headers: Record<string, string> = localBridge
          ? { 'Content-Type': 'application/json' }
          : { 'Content-Type': 'application/json', 'x-api-key': aiSettings.apiKeys?.openai || '' };

        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(requestBody),
          signal
        });
```

### Step 4: Propagar grounding após response

- [ ] **4** — Logo após o parse de `data` (após o `if (!response.ok)` block, antes do `logMetrics`), inserir:

```ts
        // Propagar grounding metadata se daemon devolveu (codex-cli com web search)
        if (localBridge && data?.grounding && onGrounding) {
          onGrounding(data.grounding);
        }
```

### Step 5: tsc + commit

- [ ] **5** — Rodar `npx tsc --noEmit`. Commit:

```bash
git add src/hooks/useAIIntegration.ts
git commit -m "feat(codex-cli): callOpenAIAPI core — localBridge + webSearch + grounding"
```

---

## Task 8: `callClaudeAPI` core — webSearch + grounding (claude-cli)

**Files:**
- Modify: `src/hooks/useAIIntegration.ts` (callLLM/callClaudeAPI ~384-500)

### Step 1: Destructuring

- [ ] **1** — Em `callLLM` (linha ~384), adicionar ao destructuring (se ainda não tiver `webSearch` e `onGrounding`):

```ts
    const {
      // ...campos existentes...
      localBridge = false,
      webSearch = false,
      onGrounding,
      // ...
    } = options;
```

### Step 2: Propagar `web_search` no body

- [ ] **2** — Em `callLLM`, logo após o bloco `if (localBridge)` que adiciona `effort` ao body (linha ~428-430), adicionar:

```ts
        if (localBridge && webSearch) {
          (requestBody as Record<string, unknown>).web_search = true;
        }
```

### Step 3: Propagar grounding após parse

- [ ] **3** — Após o `const data = await response.json();` (linha ~452), adicionar:

```ts
        // Propagar grounding metadata (claude-cli com WebSearch)
        if (localBridge && data?.grounding && onGrounding) {
          onGrounding(data.grounding);
        }
```

### Step 4: tsc + commit

- [ ] **4** — `npx tsc --noEmit`. Commit:

```bash
git add src/hooks/useAIIntegration.ts
git commit -m "feat(claude-cli): callLLM — webSearch + grounding"
```

---

## Task 9: Switches do core — `case 'codex-cli'`

**Files:**
- Modify: `src/hooks/useAIIntegration.ts` (callAI ~1404, callAIStream ~2079, callDoubleCheckAPIStream ~2108)

### Step 1: Branches

- [ ] **1** — Em `callAI` (após `if (provider === 'claude-cli')` na linha ~1441), inserir:

```ts
    // Provider codex-cli: roteia para o daemon claude-bridge (assinatura ChatGPT)
    if (provider === 'codex-cli') {
      return await callOpenAIAPI(messages, {
        ...options,
        localBridge: true,
        model: options.model || aiSettings.codexCliModel || 'gpt-5.5'
      });
    }
```

- [ ] **2** — Em `callAIStream` (após `case 'claude-cli'` na linha ~2097), inserir:

```ts
      case 'codex-cli':
        return callOpenAIAPI(messages, { ...options, localBridge: true, model: options.model || aiSettings.codexCliModel || 'gpt-5.5' });
```

Atualizar deps do useCallback (linha ~2102):
```ts
  }, [aiSettings.provider, aiSettings.claudeCliModel, aiSettings.codexCliModel, callClaudeAPIStream, callGeminiAPIStream, callOpenAIAPIStream, callGrokAPIStream, callDeepseekAPIStream, callLLM, callOpenAIAPI]);
```

- [ ] **3** — Em `callDoubleCheckAPIStream` (após `if (provider === 'claude-cli')` na linha ~2169), inserir:

```ts
    if (provider === 'codex-cli') {
      return await callOpenAIAPI(messages, { ...options, localBridge: true, model: options.model || aiSettings.codexCliModel || 'gpt-5.5' });
    }
```

Atualizar deps (linha ~2174):
```ts
  }, [callClaudeAPIStream, callGeminiAPIStream, callOpenAIAPIStream, callGrokAPIStream, callDeepseekAPIStream, callLLM, callOpenAIAPI, aiSettings.doubleCheck, aiSettings.claudeCliModel, aiSettings.codexCliModel]);
```

### Step 2: tsc + commit

- [ ] **4** — `npx tsc --noEmit`. Commit:

```bash
git add src/hooks/useAIIntegration.ts
git commit -m "feat(codex-cli): switches callAI/Stream/DoubleCheck — case codex-cli"
```

---

## Tasks 10-13: Subapp hooks — `callOpenAIAPI` branch + switches

**Files:** 4 arquivos (idêntico padrão em cada):
- `src/apps/analisador/hooks/useAIIntegration.ts` — Task 10
- `src/apps/embargos/hooks/useAIIntegration.ts` — Task 11
- `src/apps/noticias/hooks/useAIIntegration.ts` — Task 12
- `src/apps/prova-oral/hooks/useAIIntegration.ts` — Task 13

### Padrão de cada Task

Para cada arquivo, aplicar:

- [ ] **1** — Adicionar import (junto do `claude-cli-bridge`):

```ts
import { getCodexCliBridgeUrl, CODEX_CLI_MESSAGES_PATH } from '../../../utils/codex-cli-bridge';
```

- [ ] **2** — Em `callOpenAIAPI`, adicionar `localBridge = false` ao destructuring.

- [ ] **3** — Substituir o bloco `requestBody + fetch` para incluir branch `localBridge` (mesmo padrão da Task 7 Step 3, adaptado ao código local — note que subapps usam `reasoning_effort` (string) em vez de `reasoning: { effort }`):

```ts
        if (isReasoningModel) {
          requestBody.reasoning_effort = reasoningLevel;
        }
        if (localBridge) {
          requestBody.reasoning_effort = aiSettings.codexCliReasoning || 'medium';
        }

        const url = localBridge
          ? `${getCodexCliBridgeUrl()}${CODEX_CLI_MESSAGES_PATH}`
          : `${API_BASE}/api/openai/chat`;
        const headers: Record<string, string> = localBridge
          ? { 'Content-Type': 'application/json' }
          : { 'Content-Type': 'application/json', 'x-api-key': aiSettings.apiKeys.openai };

        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(requestBody)
        });
```

- [ ] **4** — Em cada switch (`callAI` e `callAIStream` se presente), adicionar `case 'codex-cli':` que chama `callOpenAIAPI(messages, { ...options, localBridge: true, model: options.model || aiSettings.codexCliModel || 'gpt-5.5' })`.

- [ ] **5** — Atualizar deps dos `useCallback` para incluir `aiSettings.codexCliModel` e `callOpenAIAPI`.

- [ ] **6** — `npx tsc --noEmit`. Commit:

```bash
git add src/apps/<subapp>/hooks/useAIIntegration.ts
git commit -m "feat(codex-cli): <subapp> hook — callOpenAIAPI bridge + switches"
```

> **Atenção `noticias`**: não tem `callAIStream` (só `callAI`). Em `prova-oral` e `analisador` e `embargos`, ambos existem.

---

## Task 14: `AIProviderSelector` — 4 subapps

**Files:** 4 arquivos:
- `src/apps/{analisador,embargos,noticias,prova-oral}/components/settings/AIProviderSelector.tsx`

### Step 1: Em cada arquivo

- [ ] **1** — Garantir import de `MessageCircle` (já está; checar).

- [ ] **2** — Estender `providerIcons` (linha ~12-19) — adicionar entrada `'codex-cli'`:

```tsx
const providerIcons: Record<AIProvider, React.ReactNode> = {
  claude: <Brain className="w-5 h-5" />,
  'claude-cli': <Brain className="w-5 h-5" />,
  gemini: <Sparkles className="w-5 h-5" />,
  openai: <MessageCircle className="w-5 h-5" />,
  'codex-cli': <MessageCircle className="w-5 h-5" />,
  grok: <Zap className="w-5 h-5" />,
  deepseek: <Zap className="w-5 h-5" />
};
```

- [ ] **3** — Estender subtitle (linha ~68 — varia):

```tsx
{key === 'claude-cli' || key === 'codex-cli'
  ? 'Sem chave — usa OAuth local'
  : hasApiKey ? 'API Key configurada' : 'API Key não configurada'}
```

- [ ] **4** — No `noticias` (que tem variação de cor — linha ~67), aplicar `||`:

```tsx
<p className={`text-xs ${key === 'claude-cli' || key === 'codex-cli' ? 'theme-text-muted' : hasApiKey ? 'text-green-400' : 'theme-text-muted'}`}>
```

### Step 2: tsc + commit

- [ ] **5** — `npx tsc --noEmit`. Commit:

```bash
git add src/apps/{analisador,embargos,noticias,prova-oral}/components/settings/AIProviderSelector.tsx
git commit -m "feat(codex-cli): AIProviderSelector — tile MessageCircle"
```

---

## Task 15: `ConfigModal` core — botão, selects, doubleCheck, cores

**Files:**
- Modify: `src/components/modals/ConfigModal.tsx`

### Step 1: Imports

- [ ] **1** — Garantir `CodexCliReasoning` importado de `src/types`:

```bash
grep -n "ClaudeCliEffort\|CodexCliReasoning" src/components/modals/ConfigModal.tsx | head -3
```

Se não estiver, adicionar à mesma linha do `ClaudeCliEffort`.

### Step 2: Botão do provider

- [ ] **2** — Após o `</button>` do tile Claude Local (linha ~478), inserir:

```tsx
              <button
                onClick={() => setAiSettings({ ...aiSettings, provider: 'codex-cli' })}
                className={`p-3 rounded-lg border-2 transition-all text-left ${
                  aiSettings.provider === 'codex-cli'
                    ? 'bg-emerald-600/20 border-emerald-500'
                    : 'theme-bg-secondary-30 theme-border-input hover-theme-border'
                }`}
              >
                <div className="flex items-center gap-2">
                  <ProviderIcon provider="codex-cli" size={20} className="text-emerald-400" />
                  <div>
                    <div className="font-semibold theme-text-primary text-sm">Codex Local</div>
                    <div className="text-xs theme-text-muted">CLI · assinatura</div>
                  </div>
                </div>
              </button>
```

### Step 3: Label "Modelo X"

- [ ] **3** — Linha ~484, substituir:

```tsx
                Modelo {aiSettings.provider === 'claude' || aiSettings.provider === 'claude-cli' ? 'Claude' :
                       aiSettings.provider === 'gemini' ? 'Gemini' :
                       aiSettings.provider === 'openai' ? 'OpenAI' :
                       aiSettings.provider === 'codex-cli' ? 'Codex' :
                       aiSettings.provider === 'grok' ? 'Grok' : 'DeepSeek'}:
```

### Step 4: Select de modelo Codex (após claude-cli)

- [ ] **4** — Após o `</select>` do bloco `provider === 'claude-cli'` (linha ~508), inserir:

```tsx
              {aiSettings.provider === 'codex-cli' && (
                <select
                  value={aiSettings.codexCliModel || 'gpt-5.5'}
                  onChange={(e) => setAiSettings({ ...aiSettings, codexCliModel: e.target.value })}
                  className="w-full px-3 py-2 theme-bg-secondary border theme-border-input rounded text-sm theme-text-secondary"
                >
                  <option value="gpt-5.5">GPT-5.5 (assinatura · $0)</option>
                </select>
              )}
```

### Step 5: Select de reasoning effort

- [ ] **5** — Após o bloco de `claudeCliEffort` (linha ~883), inserir:

```tsx
            {/* CODEX-CLI: Dropdown de reasoning effort */}
            {aiSettings.provider === 'codex-cli' && (
              <div>
                <label className="block text-xs theme-text-muted mb-1">Nível de raciocínio (reasoning):</label>
                <select
                  value={aiSettings.codexCliReasoning || 'medium'}
                  onChange={(e) => setAiSettings({ ...aiSettings, codexCliReasoning: e.target.value as CodexCliReasoning })}
                  className="w-full px-3 py-2 theme-bg-secondary border theme-border-input rounded text-sm theme-text-secondary"
                >
                  <option value="minimal">Minimal</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
                <p className="text-xs theme-text-muted mt-1">
                  Controla o esforço de raciocínio do Codex CLI local (<code>model_reasoning_effort</code>). Maior = mais lento e mais a fundo.
                </p>
              </div>
            )}
```

### Step 6: doubleCheck — defaultModels

- [ ] **6** — Linha ~1196-1203, substituir o map por:

```tsx
                      const defaultModels: Record<AIProvider, string> = {
                        claude: 'claude-sonnet-4-20250514',
                        'claude-cli': 'claude-sonnet-4-20250514',
                        gemini: 'gemini-3-flash-preview',
                        openai: 'gpt-5.2-chat-latest',
                        grok: 'grok-4-1-fast-reasoning',
                        deepseek: 'deepseek-v4-flash',
                        'codex-cli': 'gpt-5.5'
                      };
```

### Step 7: doubleCheck — `<option>` no select de provider

- [ ] **7** — Após `<option value="claude-cli">…</option>` (linha ~1216), inserir:

```tsx
                    <option value="codex-cli">Codex Local (CLI · assinatura)</option>
```

### Step 8: doubleCheck — modelos do codex no select de modelo

- [ ] **8** — Após o bloco de options do `openai` (linha ~1254-1259), inserir:

```tsx
                    {aiSettings.doubleCheck?.provider === 'codex-cli' && (
                      <option value="gpt-5.5">GPT-5.5 (assinatura · $0)</option>
                    )}
```

### Step 9: providerColors

- [ ] **9** — Linha ~3030-3037, substituir:

```tsx
                              const providerColors = {
                                claude: 'text-orange-400',
                                'claude-cli': 'text-amber-400',
                                gemini: 'text-blue-400',
                                openai: 'text-green-400',
                                'codex-cli': 'text-emerald-400',
                                grok: 'text-gray-400',
                                deepseek: 'text-indigo-400'
                              };
```

### Step 10: "Modelo atual" display

- [ ] **10** — Linha ~3253-3263, adicionar branch `codex-cli` (antes do final `: getModelDisplayName(claudeModel)`):

```tsx
                    : aiSettings.provider === 'codex-cli'
                    ? getModelDisplayName(aiSettings.codexCliModel || 'gpt-5.5')
```

### Step 11: tsc + commit

- [ ] **11** — `npx tsc --noEmit`. Commit:

```bash
git add src/components/modals/ConfigModal.tsx
git commit -m "feat(codex-cli): ConfigModal — provider, modelo, reasoning, doubleCheck"
```

---

# Parte 3 — Web search adapters + UI

## Task W1: `webSearch.ts` — adapters reais para claude-cli e codex-cli

**Files:**
- Modify: `src/utils/ai-tools/webSearch.ts`
- Modify: `src/utils/ai-tools/webSearch.test.ts`

### Step 1: Atualizar testes

- [ ] **1** — Em `src/utils/ai-tools/webSearch.test.ts`, adicionar:

```ts
describe('claude-cli adapter', () => {
  it('marca supportsWebSearch=true', () => {
    expect(providerSupportsWebSearch('claude-cli')).toBe(true);
  });
  it('aplica web_search: true no request', () => {
    const result = applyWebSearchTool('claude-cli', { foo: 'bar' }, { enabled: true });
    expect((result as { web_search?: boolean }).web_search).toBe(true);
  });
  it('extrai grounding do campo data.grounding', () => {
    const g = extractGrounding('claude-cli', {
      grounding: {
        webSearchQueries: ['q1'],
        groundingChunks: [{ web: { uri: 'https://x', title: 't' } }]
      }
    });
    expect(g?.webSearchQueries).toEqual(['q1']);
    expect(g?.groundingChunks?.length).toBe(1);
  });
});

describe('codex-cli adapter', () => {
  it('marca supportsWebSearch=true', () => {
    expect(providerSupportsWebSearch('codex-cli')).toBe(true);
  });
  it('aplica web_search: true no request', () => {
    const result = applyWebSearchTool('codex-cli', { foo: 'bar' }, { enabled: true });
    expect((result as { web_search?: boolean }).web_search).toBe(true);
  });
  it('extrai grounding do campo data.grounding', () => {
    const g = extractGrounding('codex-cli', {
      grounding: {
        webSearchQueries: ['q1'],
        groundingChunks: [{ web: { uri: 'https://x', title: 't' } }]
      }
    });
    expect(g?.webSearchQueries).toEqual(['q1']);
  });
});
```

### Step 2: Falha esperada → implementação

- [ ] **2** — Rodar `npx vitest run src/utils/ai-tools/webSearch.test.ts` — FAIL.

- [ ] **3** — Em `src/utils/ai-tools/webSearch.ts`:

**3.1** Estender o `AIProvider` exportado para incluir `'codex-cli'`:

```ts
export type AIProvider = 'claude' | 'gemini' | 'openai' | 'grok' | 'deepseek' | 'claude-cli' | 'codex-cli';
```

**3.2** Adicionar adapters após `geminiAdapter`:

```ts
// Adapter local-bridge: tanto claude-cli quanto codex-cli usam o mesmo shape
// (request precisa de web_search=true; response carrega grounding pronto).
const localBridgeAdapter: WebSearchProviderAdapter = {
  supportsWebSearch: true,
  applyToRequest: (req) => ({ ...(req as object), web_search: true }),
  extractGrounding: (resp) => {
    const grounding = (resp as { grounding?: GroundingMetadata } | null)?.grounding;
    return grounding ?? null;
  }
};
```

**3.3** Atualizar `WEB_SEARCH_REGISTRY`:

```ts
export const WEB_SEARCH_REGISTRY: Record<AIProvider, WebSearchProviderAdapter> = {
  gemini: geminiAdapter,
  claude: noopAdapter,
  'claude-cli': localBridgeAdapter,   // ← era noop
  openai: noopAdapter,
  'codex-cli': localBridgeAdapter,    // ← novo
  grok: noopAdapter,
  deepseek: noopAdapter,
};
```

### Step 3: Passa + tsc + commit

- [ ] **4** — Rodar testes (PASS) + `npx tsc --noEmit`. Commit:

```bash
git add src/utils/ai-tools/webSearch.ts src/utils/ai-tools/webSearch.test.ts
git commit -m "feat(webSearch): adapter real para claude-cli e codex-cli"
```

---

## Task W2: `WebSearchToggle.tsx` — tooltip multi-provider

**Files:**
- Modify: `src/components/ai/WebSearchToggle.tsx`

### Step 1: Parametrizar tooltip

- [ ] **1** — Em `src/components/ai/WebSearchToggle.tsx`, atualizar para aceitar prop `providerName?: string`:

```tsx
export interface WebSearchToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  disabled?: boolean;
  /** Nome amigável do provider em uso, exibido nos tooltips. Default: "Provider atual". */
  providerName?: string;
}

const buildOnTooltip = (providerName: string) =>
  `Buscar na web ativado (${providerName}). Clique para desligar.`;

const buildOffTooltip = (providerName: string) =>
  `Ativar busca na web (${providerName}) — permite consulta a informações atualizadas durante esta conversa.`;

const DISABLED_TOOLTIP = 'Busca na web indisponível enquanto a anonimização estiver ativa. As queries enviadas ao provider poderiam expor dados sensíveis do processo.';

export const WebSearchToggle: React.FC<WebSearchToggleProps> = ({
  enabled,
  onToggle,
  disabled = false,
  providerName = 'Provider atual',
}) => {
  const tooltip = disabled
    ? DISABLED_TOOLTIP
    : enabled
      ? buildOnTooltip(providerName)
      : buildOffTooltip(providerName);
  // ... resto inalterado ...
};
```

### Step 2: Atualizar callsites em `AIAssistantComponents.tsx`

- [ ] **2** — Em `src/components/ai/AIAssistantComponents.tsx`, nos dois lugares onde `<WebSearchToggle ... />` é renderizado (linhas ~725 e ~957), adicionar `providerName={getProviderName(webSearchProvider)}`. Importar `getProviderName` se ainda não estiver importado (ou inline o switch). Exemplo inline:

```tsx
const providerLabel = webSearchProvider === 'gemini' ? 'Gemini'
  : webSearchProvider === 'claude-cli' ? 'Claude Local (CLI)'
  : webSearchProvider === 'codex-cli' ? 'Codex Local (CLI)'
  : 'Provider atual';

<WebSearchToggle enabled={webSearchEnabled} onToggle={setWebSearchEnabled} disabled={...} providerName={providerLabel} />
```

### Step 3: tsc + commit

- [ ] **3** — `npx tsc --noEmit`. Commit:

```bash
git add src/components/ai/WebSearchToggle.tsx src/components/ai/AIAssistantComponents.tsx
git commit -m "feat(webSearch): tooltip parametrizado por providerName"
```

---

## Task W3: Smoke manual no chat com web search (sanity)

> Esta task é um checklist manual; não é despachada para subagente.

- [ ] **1** — Subir o daemon: `npm run claude-bridge`
- [ ] **2** — Subir o frontend: `npm run dev` (outro terminal)
- [ ] **3** — Abrir o assistente de redação no app, selecionar provider Claude Local (CLI).
- [ ] **4** — Confirmar que o toggle "Web" aparece (antes era escondido para claude-cli).
- [ ] **5** — Ativar o toggle, perguntar algo que precise de busca atual (ex: "Qual a cotação do dólar hoje?"). Confirmar:
  - A resposta menciona valores
  - O footer "Fontes" aparece com URLs (mesmo padrão do Gemini)
- [ ] **6** — Mudar para Codex Local (CLI), repetir o teste.
- [ ] **7** — Mudar para Gemini, confirmar que nada regrediu.

> Se algum dos itens falhar, anotar o erro específico (UI/console) e abrir nova task de correção.

---

# Parte 4 — Versionamento e fechamento

## Task 16: Bump v1.50.0 (5 arquivos)

**Files:**
- Modify: `CLAUDE.md` (linha 7)
- Modify: `src/App.tsx` (`APP_VERSION` ~linha 209)
- Modify: `src/constants/changelog.js`
- Modify: `package.json`

### Steps

- [ ] **1** — `CLAUDE.md:7`: trocar `1.48.0` por `1.50.0`.

- [ ] **2** — `src/App.tsx`: localizar via grep e trocar `'1.48.0'` → `'1.50.0'`:

```bash
grep -n "APP_VERSION" src/App.tsx | head -3
```

- [ ] **3** — `package.json`: `"version": "1.48.0"` → `"version": "1.50.0"`.

- [ ] **4** — `src/constants/changelog.js` — adicionar no topo:

```js
  {
    version: '1.50.0',
    date: '2026-05-28',
    changes: [
      {
        type: 'feat',
        title: 'Provider Codex Local (CLI) — assinatura ChatGPT, custo $0',
        description:
          'Sétimo provider, simétrico ao Claude Local: executa Codex CLI (gpt-5.5) ' +
          'via daemon claude-bridge (endpoint /api/codex-cli/messages) sob OAuth ChatGPT. ' +
          'Reasoning effort minimal/low/medium/high. Disponível em todos os apps. ' +
          'Requer codex CLI instalado, codex login executado, e daemon claude-bridge rodando.'
      },
      {
        type: 'feat',
        title: 'Web Search no Claude Local e Codex Local (com fontes)',
        description:
          'Toggle "Web" no assistente de redação agora funciona em três providers ' +
          '(Gemini + Claude Local + Codex Local). Daemon claude-bridge invoca ' +
          'WebSearch (claude) ou --search (codex) e devolve grounding metadata; ' +
          'footer "Fontes" exibe URLs consultadas como no Gemini.'
      }
    ]
  },
```

- [ ] **5** — Commit:

```bash
git add CLAUDE.md src/App.tsx src/constants/changelog.js package.json
git commit -m "chore(release): v1.50.0 — provider Codex Local (CLI) + web search nos CLIs"
```

---

## Task 17: Verificação final — tsc + tests + sanity

- [ ] **1** — `npx tsc --noEmit` → zero erros.
- [ ] **2** — `npx vitest run` → todos passam (incluindo os novos: `codex-cli-bridge.test.ts`, `createAIStore.test.ts` codex-cli block, `ProviderIcon.test.tsx` CodexCLI block, `webSearch.test.ts` cli adapters).
- [ ] **3** — `node --test claude-bridge/*.test.js` (sem SMOKE=1) → todos passam.
- [ ] **4** — Opcional: `SMOKE=1 node --test claude-bridge/translate.codex.smoke.test.js` → passa contra codex real.
- [ ] **5** — Sanity manual: subir daemon + dev, exercitar UI conforme Task W3 (e revisitar codex-cli também — perguntar algo + verificar resposta).

Se alguma verificação falhar, anotar e voltar à task relevante.

---

## Self-review checklist (referência durante execução)

- [ ] Daemon `translate.codex.js` criado e testado
- [ ] Daemon `server.js` ganha rota `/api/codex-cli/messages`
- [ ] Daemon `translate.js` aceita `body.web_search` (claude-cli)
- [ ] Smoke test real do codex passa (`SMOKE=1`)
- [ ] `'codex-cli'` cobre TODOS os Record<AIProvider, …> (TS força)
- [ ] `callOpenAIAPI` (core + 4 subapps): branch `localBridge` + propagação webSearch + grounding
- [ ] `callLLM`/`callClaudeAPI` (core + subapps): propaga web_search no body + grounding callback
- [ ] Switches `callAI`/`callAIStream`/`callDoubleCheckAPIStream`: `case 'codex-cli'` em todo lugar
- [ ] `webSearch.ts`: `claude-cli` e `codex-cli` saem do `noopAdapter`
- [ ] `WebSearchToggle.tsx`: tooltip parametrizado por providerName
- [ ] UI: ConfigModal, AIProviderSelector (4 subapps), ProviderIcon
- [ ] Bump v1.50.0 em 5 arquivos
- [ ] `tsc --noEmit` zero erros
- [ ] Test suite full passa (frontend + daemon)
- [ ] Sanity manual web search ✅ nos 3 providers
