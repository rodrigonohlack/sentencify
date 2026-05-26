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

test("buildClaudeArgs: effort 'off' desliga mesmo com thinking presente", () => {
  const args = buildClaudeArgs({ model: 'm', effort: 'off', thinking: { budget_tokens: 40000 } });
  assert.ok(!args.includes('--effort'));
});

test('buildStdin: turno único passa como está (content normalizado)', () => {
  const body = { messages: [{ role: 'user', content: [{ type: 'text', text: 'oi' }] }] };
  const lines = buildStdin(body).trim().split('\n');
  assert.equal(lines.length, 1);
  const o = JSON.parse(lines[0]);
  assert.equal(o.type, 'user');
  assert.equal(o.message.content[0].text, 'oi');
});

test('buildStdin: remove cache_control dos blocos de conteúdo', () => {
  const body = {
    messages: [
      {
        role: 'user',
        content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: 'AAAA' }, cache_control: { type: 'ephemeral' } },
          { type: 'text', text: 'oi', cache_control: { type: 'ephemeral' } },
        ]
      }
    ]
  };
  const line = JSON.parse(buildStdin(body).trim());
  for (const block of line.message.content) {
    assert.ok(!('cache_control' in block), 'cache_control deveria ter sido removido');
  }
  // garante que o resto do bloco foi preservado
  assert.equal(line.message.content[0].type, 'document');
  assert.equal(line.message.content[0].source.media_type, 'application/pdf');
  assert.equal(line.message.content[1].text, 'oi');
});

test('buildStdin: content string vira array [{type:text,text}]', () => {
  const body = { messages: [{ role: 'user', content: 'oi mundo' }] };
  const line = JSON.parse(buildStdin(body).trim());
  assert.ok(Array.isArray(line.message.content), 'content deve ser array');
  assert.equal(line.message.content[0].type, 'text');
  assert.equal(line.message.content[0].text, 'oi mundo');
});

test('buildStdin: multi-turn colapsa em 1 turno de usuário com rótulos', () => {
  const body = { messages: [
    { role: 'user', content: 'Pergunta A' },
    { role: 'assistant', content: 'Resposta B' },
    { role: 'user', content: 'Pergunta C' },
  ] };
  const lines = buildStdin(body).trim().split('\n');
  assert.equal(lines.length, 1, 'multi-turn deve virar 1 linha');
  const o = JSON.parse(lines[0]);
  assert.equal(o.type, 'user');
  const text = o.message.content.map(b => b.text || '').join('\n');
  assert.match(text, /Usuário: Pergunta A/);
  assert.match(text, /Assistente: Resposta B/);
  assert.match(text, /Usuário: Pergunta C/);
});

test('buildStdin: multi-turn preserva blocos de documento (não-texto)', () => {
  const body = { messages: [
    { role: 'user', content: [
      { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: 'AAAA' } },
      { type: 'text', text: 'analise' },
    ] },
    { role: 'assistant', content: 'ok' },
    { role: 'user', content: 'continue' },
  ] };
  const o = JSON.parse(buildStdin(body).trim());
  const hasDoc = o.message.content.some(b => b.type === 'document');
  assert.ok(hasDoc, 'bloco document deve ser preservado');
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
