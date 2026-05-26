// claude-bridge/translate.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapModel, extractSystem, buildClaudeArgs, buildStdin, translateResponse } from './translate.js';

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
  const sys = [
    { type: 'text', text: 'A', cache_control: { type: 'ephemeral' } },
    { type: 'text', text: 'B' }
  ];
  assert.equal(extractSystem(sys), 'A\nB');
});

test('extractSystem: string passa direto; vazio → ""', () => {
  assert.equal(extractSystem('oi'), 'oi');
  assert.equal(extractSystem(undefined), '');
});

test('buildClaudeArgs: flags de isolamento + modelo + system', () => {
  const args = buildClaudeArgs({
    model: 'claude-opus-4-5-20251101',
    system: 'SYS',
    thinking: { budget_tokens: 10000 }
  });
  assert.ok(args.includes('--setting-sources'));
  assert.equal(args[args.indexOf('--setting-sources') + 1], '');
  assert.ok(args.includes('--tools'));
  assert.equal(args[args.indexOf('--model') + 1], 'opus');
  assert.equal(args[args.indexOf('--system-prompt') + 1], 'SYS');
  assert.ok(args.includes('--effort'));
});

test('buildClaudeArgs: sem thinking não inclui --effort', () => {
  const args = buildClaudeArgs({
    model: 'claude-sonnet-4-20250514',
    system: ''
  });
  assert.ok(!args.includes('--effort'));
  assert.ok(!args.includes('--system-prompt'));
});

test('buildClaudeArgs: body.effort válido → --effort <nível>', () => {
  const args = buildClaudeArgs({ model: 'claude-sonnet-4-6', effort: 'xhigh' });
  assert.equal(args[args.indexOf('--effort') + 1], 'xhigh');
});
test('buildClaudeArgs: body.effort inválido/ausente cai no fallback de thinking', () => {
  const withThinking = buildClaudeArgs({ model: 'm', thinking: { budget_tokens: 10000 } });
  assert.equal(withThinking[withThinking.indexOf('--effort') + 1], 'high');
  const none = buildClaudeArgs({ model: 'm', effort: 'off' });
  assert.ok(!none.includes('--effort'));
});

test('buildStdin: mensagens viram stream-json por linha com role correto', () => {
  const body = {
    messages: [
      { role: 'user', content: [{ type: 'text', text: 'oi' }] },
      { role: 'assistant', content: [{ type: 'text', text: 'olá' }] }
    ]
  };
  const lines = buildStdin(body)
    .trim()
    .split('\n')
    .map(JSON.parse);
  assert.equal(lines[0].type, 'user');
  assert.equal(lines[0].message.role, 'user');
  assert.equal(lines[1].type, 'assistant');
  assert.deepEqual(lines[0].message.content, [{ type: 'text', text: 'oi' }]);
});

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
test('translateResponse: is_error genérico (não-auth) → 500 com a mensagem do CLI', () => {
  const RESULT_ERR = JSON.stringify({
    type: 'result', is_error: true, result: 'API Error: 429 rate_limit_exceeded',
    session_id: 'sess-3', usage: {},
  });
  const out = translateResponse(`${RESULT_ERR}\n`, 'm');
  assert.equal(out.status, 500);
  assert.equal(out.body.error.type, 'server_error');
  assert.match(out.body.error.message, /rate_limit_exceeded/);
});
