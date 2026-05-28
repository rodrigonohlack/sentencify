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
  // NOTA: codex-cli 0.134.0 expõe web_search como tool implícita; reasoning_effort='minimal'
  // é incompatível com web_search ("The following tools cannot be used with reasoning.effort
  // 'minimal': web_search."). Usamos 'low' como mínimo viável neste smoke test.
  const body = {
    model: 'gpt-5.5',
    reasoning_effort: 'low',
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
    reasoning_effort: 'low',
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
