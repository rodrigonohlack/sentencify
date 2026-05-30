// llm-bridge/translate.codex.test.js
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
  assert.equal(args[args.indexOf('-m') + 1], 'gpt-5.5');
  // -c aparece 2x (model_reasoning_effort e approval_policy); verificamos o primeiro
  const firstC = args.indexOf('-c');
  assert.equal(args[firstC + 1], 'model_reasoning_effort=medium');
});

test('buildCodexArgs: inclui -c approval_policy="never" (constrained execution)', () => {
  const args = buildCodexArgs({ model: 'gpt-5.5' });
  assert.ok(args.includes('approval_policy="never"'));
});

test('buildCodexArgs: NÃO inclui -a / --ask-for-approval (não suportado por codex exec 0.134.0)', () => {
  const args = buildCodexArgs({ model: 'gpt-5.5' });
  assert.ok(!args.includes('-a'));
  assert.ok(!args.includes('--ask-for-approval'));
});

test('buildCodexArgs: reasoning_effort válido aceito', () => {
  for (const level of ['minimal', 'low', 'medium', 'high']) {
    const args = buildCodexArgs({ model: 'gpt-5.5', reasoning_effort: level });
    assert.ok(args.includes(`model_reasoning_effort=${level}`));
  }
});

test('buildCodexArgs: reasoning_effort inválido cai em medium', () => {
  const args = buildCodexArgs({ model: 'gpt-5.5', reasoning_effort: 'extreme' });
  assert.ok(args.includes('model_reasoning_effort=medium'));
});

test('buildCodexArgs: minimal + web_search vira low (auto-bump)', () => {
  const args = buildCodexArgs({ model: 'gpt-5.5', reasoning_effort: 'minimal', web_search: true });
  assert.equal(args[args.indexOf('-c') + 1], 'model_reasoning_effort=low');
});

test('buildCodexArgs: minimal SEM web_search permanece minimal', () => {
  const args = buildCodexArgs({ model: 'gpt-5.5', reasoning_effort: 'minimal' });
  assert.equal(args[args.indexOf('-c') + 1], 'model_reasoning_effort=minimal');
});

test('buildCodexArgs: web_search=true adiciona --search ANTES de exec (top-level flag)', () => {
  const args = buildCodexArgs({ model: 'gpt-5.5', web_search: true });
  const searchIdx = args.indexOf('--search');
  const execIdx = args.indexOf('exec');
  assert.notEqual(searchIdx, -1, '--search deve estar presente');
  assert.notEqual(execIdx, -1, 'exec deve estar presente');
  assert.ok(searchIdx < execIdx, `--search (${searchIdx}) deve vir antes de exec (${execIdx})`);
});

test('buildCodexArgs: web_search=false (ou ausente) NÃO adiciona --search', () => {
  const a1 = buildCodexArgs({ model: 'gpt-5.5' });
  const a2 = buildCodexArgs({ model: 'gpt-5.5', web_search: false });
  assert.ok(!a1.includes('--search'));
  assert.ok(!a2.includes('--search'));
});

test('buildCodexArgs: último argumento é "-" (stdin como prompt)', () => {
  const args = buildCodexArgs({ model: 'gpt-5.5' });
  assert.equal(args[args.length - 1], '-');
});

test('buildCodexArgs: "-" continua sendo o último mesmo com --search', () => {
  const args = buildCodexArgs({ model: 'gpt-5.5', web_search: true });
  assert.equal(args[args.length - 1], '-');
  assert.ok(args.includes('--search'));
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

// ════════════════════════════════════════════════════════════════════════════
// translateResponse — fixtures baseadas no shape REAL do codex-cli 0.134.0
// (capturado via smoke test em Task D3)
// ════════════════════════════════════════════════════════════════════════════

// Shape real de sucesso simples (sem web_search): thread.started → turn.started
// → item.completed{agent_message} → turn.completed{usage}
const EVENT_TEXT_OK = [
  JSON.stringify({ type: 'thread.started', thread_id: 'sess-codex-1' }),
  JSON.stringify({ type: 'turn.started' }),
  JSON.stringify({ type: 'item.completed', item: { id: 'item_0', type: 'agent_message', text: 'BATATA-FRITA-7392' } }),
  JSON.stringify({ type: 'turn.completed', usage: { input_tokens: 12, output_tokens: 5, cached_input_tokens: 0, reasoning_output_tokens: 0 } }),
].join('\n');

test('translateResponse: sucesso (shape real do codex 0.134.0) vira Chat Completions', () => {
  const out = translateResponse(EVENT_TEXT_OK + '\n', 'gpt-5.5');
  assert.equal(out.status, 200);
  assert.equal(out.body.object, 'chat.completion');
  assert.equal(out.body.choices[0].message.content, 'BATATA-FRITA-7392');
  assert.equal(out.body.choices[0].message.role, 'assistant');
  assert.equal(out.body.choices[0].finish_reason, 'stop');
  assert.equal(out.body.usage.prompt_tokens, 12);
  assert.equal(out.body.usage.completion_tokens, 5);
  assert.equal(out.body.usage.total_tokens, 17);
  assert.equal(out.body.id, 'chatcmpl-codex-sess-codex-1');
});

test('translateResponse: sem eventos terminais nem agent_message → 500', () => {
  const out = translateResponse('{"type":"thread.started","thread_id":"x"}\n', 'gpt-5.5');
  assert.equal(out.status, 500);
  assert.equal(out.body.error.type, 'server_error');
});

test('translateResponse: turn.failed (auth) → 401', () => {
  const ERR = [
    JSON.stringify({ type: 'thread.started', thread_id: 'x' }),
    JSON.stringify({ type: 'turn.failed', error: { message: 'Not logged in. Please run `codex login` first.' } }),
  ].join('\n');
  const out = translateResponse(ERR + '\n', 'gpt-5.5');
  assert.equal(out.status, 401);
  assert.equal(out.body.error.type, 'authentication_error');
});

test('translateResponse: error event com 401 Unauthorized → 401', () => {
  const ERR = [
    JSON.stringify({ type: 'thread.started', thread_id: 'x' }),
    JSON.stringify({ type: 'turn.started' }),
    JSON.stringify({ type: 'error', message: 'Reconnecting... 5/5 (unexpected status 401 Unauthorized: Missing bearer or basic authentication in header...)' }),
  ].join('\n');
  const out = translateResponse(ERR + '\n', 'gpt-5.5');
  assert.equal(out.status, 401);
  assert.equal(out.body.error.type, 'authentication_error');
});

test('translateResponse: turn.failed (quota usage limit) → 402', () => {
  const ERR = [
    JSON.stringify({ type: 'thread.started', thread_id: 'x' }),
    JSON.stringify({ type: 'turn.failed', error: { message: "You've hit your usage limit. Upgrade to Plus to continue using Codex (https://chatgpt.com/explore/plus), or try again at Jun 4th, 2026 9:53 AM." } }),
  ].join('\n');
  const out = translateResponse(ERR + '\n', 'gpt-5.5');
  // 402 Payment Required: NÃO está em OPENAI_RETRY_CODES do React,
  // então o assistente não retenta 3x à toa em erro que precisa esperar reset.
  assert.equal(out.status, 402);
  assert.equal(out.body.error.type, 'quota_exhausted');
  assert.match(out.body.error.message, /Quota Codex Pro esgotada/);
  // Preserva a data/hora do reset na msg original pro juiz saber quando volta
  assert.match(out.body.error.message, /Jun 4th/);
});

test('translateResponse: error event com usage limit → 402', () => {
  const ERR = [
    JSON.stringify({ type: 'thread.started', thread_id: 'x' }),
    JSON.stringify({ type: 'turn.started' }),
    JSON.stringify({ type: 'error', message: "You've hit your usage limit. Upgrade to Plus to continue using Codex, or try again later." }),
  ].join('\n');
  const out = translateResponse(ERR + '\n', 'gpt-5.5');
  assert.equal(out.status, 402);
  assert.equal(out.body.error.type, 'quota_exhausted');
});

test('translateResponse: turn.failed genérico → 500', () => {
  const ERR = [
    JSON.stringify({ type: 'thread.started', thread_id: 'x' }),
    JSON.stringify({ type: 'turn.failed', error: { message: 'Some other failure' } }),
  ].join('\n');
  const out = translateResponse(ERR + '\n', 'gpt-5.5');
  assert.equal(out.status, 500);
  assert.equal(out.body.error.type, 'server_error');
  assert.match(out.body.error.message, /Some other failure/);
});

// Citation parsing — shape real: queries via item.completed{web_search} +
// citations inline como links markdown no texto da agent_message.
const EVENT_CITATIONS = [
  JSON.stringify({ type: 'thread.started', thread_id: 'sess-codex-2' }),
  JSON.stringify({ type: 'turn.started' }),
  JSON.stringify({
    type: 'item.completed',
    item: {
      id: 'item_0',
      type: 'web_search',
      action: { type: 'search', query: 'STF decisão X 2026', queries: ['STF decisão X 2026'] },
    },
  }),
  JSON.stringify({
    type: 'item.completed',
    item: {
      id: 'item_1',
      type: 'agent_message',
      text: 'Conforme [STF — decisão X](https://stf.jus.br/x) e [STJ — decisão Y](https://stj.jus.br/y), …',
    },
  }),
  JSON.stringify({ type: 'turn.completed', usage: { input_tokens: 5, output_tokens: 50 } }),
].join('\n');

test('translateResponse: agrega grounding quando web_search + links markdown presentes', () => {
  const out = translateResponse(EVENT_CITATIONS + '\n', 'gpt-5.5');
  assert.equal(out.status, 200);
  assert.ok(out.body.grounding, 'grounding deve existir');
  assert.deepEqual(out.body.grounding.webSearchQueries, ['STF decisão X 2026']);
  assert.equal(out.body.grounding.groundingChunks.length, 2);
  assert.equal(out.body.grounding.groundingChunks[0].web.uri, 'https://stf.jus.br/x');
  assert.equal(out.body.grounding.groundingChunks[0].web.title, 'STF — decisão X');
  assert.equal(out.body.grounding.groundingChunks[1].web.uri, 'https://stj.jus.br/y');
});

test('translateResponse: sem citations nem queries → grounding ausente', () => {
  const out = translateResponse(EVENT_TEXT_OK + '\n', 'gpt-5.5');
  assert.equal(out.status, 200);
  assert.equal(out.body.grounding, undefined);
});

test('translateResponse: múltiplos agent_message são concatenados', () => {
  const MULTI = [
    JSON.stringify({ type: 'thread.started', thread_id: 'x' }),
    JSON.stringify({ type: 'item.completed', item: { id: 'a', type: 'agent_message', text: 'Parte 1' } }),
    JSON.stringify({ type: 'item.completed', item: { id: 'b', type: 'agent_message', text: 'Parte 2' } }),
    JSON.stringify({ type: 'turn.completed', usage: { input_tokens: 1, output_tokens: 2 } }),
  ].join('\n');
  const out = translateResponse(MULTI + '\n', 'gpt-5.5');
  assert.equal(out.status, 200);
  assert.match(out.body.choices[0].message.content, /Parte 1/);
  assert.match(out.body.choices[0].message.content, /Parte 2/);
});
