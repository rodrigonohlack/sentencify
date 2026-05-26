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
