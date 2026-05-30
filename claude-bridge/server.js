// claude-bridge/server.js
import http from 'node:http';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { buildClaudeArgs, buildStdin, translateResponse } from './translate.js';
import {
  buildCodexArgs,
  buildStdin as buildCodexStdin,
  translateResponse as translateCodexResponse,
} from './translate.codex.js';

const PORT = Number(process.env.CLAUDE_BRIDGE_PORT || 8787);
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  throw new Error(`CLAUDE_BRIDGE_PORT inválido: "${process.env.CLAUDE_BRIDGE_PORT}"`);
}

/**
 * CODEX_HOME isolado anti-skill-leak.
 *
 * codex-cli 0.134.0 descobre e auto-ativa skills de `$CODEX_HOME/skills/`
 * (user-level e .system/) em modo headless `exec --json`, mesmo com
 * `--ephemeral`, `-s read-only`, `--disable plugins/apps`, `--ignore-user-config`.
 * Smoke test (29/mai/2026) provou: canary skill em ~/.codex/skills/
 * disparou em "quanto é 2+2?" e ainda fez `bash sed SKILL.md` (sandbox
 * read-only permite cat/sed). Input subiu de 10K → 21K tokens.
 *
 * Solução: spawnar codex com CODEX_HOME apontando pra dir limpa contendo
 * só `auth.json` symlinkado pro real. codex não acha skills, mas auth
 * continua funcionando. Smoke confirmou: canary não dispara, input baseline.
 *
 * Setup é idempotente — recria symlink em cada boot do daemon pra cobrir
 * cenário de re-login (~/.codex/auth.json muda).
 */
const ISOLATED_CODEX_HOME = path.join(os.tmpdir(), 'sentencify-codex-runtime');
function setupIsolatedCodexHome() {
  try {
    fs.mkdirSync(ISOLATED_CODEX_HOME, { recursive: true });
    const realAuth = path.join(os.homedir(), '.codex', 'auth.json');
    const isolatedAuth = path.join(ISOLATED_CODEX_HOME, 'auth.json');
    // Remove qualquer auth.json antigo (file/symlink quebrado) e recria symlink
    try { fs.unlinkSync(isolatedAuth); } catch { /* ok se não existir */ }
    if (fs.existsSync(realAuth)) {
      fs.symlinkSync(realAuth, isolatedAuth);
    } else {
      console.warn(`[claude-bridge] aviso: ${realAuth} não existe; rode \`codex login\` antes de usar provider codex-cli.`);
    }
  } catch (err) {
    console.error(`[claude-bridge] falha ao montar CODEX_HOME isolado em ${ISOLATED_CODEX_HOME}: ${err.message}`);
    // Sem isolamento, codex spawn vai usar ~/.codex/ default e skills podem vazar.
    // Não derruba o daemon — bridge claude continua funcional independente.
  }
}
setupIsolatedCodexHome();
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
  if (req.method === 'OPTIONS' && req.headers['access-control-request-private-network']) {
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

// ── Logging de requisições ──────────────────────────────────────────────
// Sempre loga uma linha de início (→) e uma de fim (←) por chamada, com id
// correlacionável (#N). BRIDGE_LOG=verbose também despeja o stderr do CLI em
// chamadas bem-sucedidas (útil pra ver progresso/avisos do claude/codex).
const VERBOSE_LOG = /^(1|true|verbose|debug)$/i.test(process.env.BRIDGE_LOG || '');
let reqCounter = 0;

function logStart(id, provider, body) {
  const model = body.model || (provider === 'codex-cli' ? 'gpt-5.5' : 'default');
  const effort = body.effort || body.reasoning_effort || '-';
  const msgs = Array.isArray(body.messages) ? body.messages.length : 0;
  const inChars = JSON.stringify(body.messages ?? '').length;
  console.log(`[claude-bridge] #${id} → ${provider} model=${model} effort=${effort} msgs=${msgs} in=${inChars}c`);
}

function logEnd(id, provider, started, status, info) {
  const secs = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`[claude-bridge] #${id} ← ${status} ${provider} (${secs}s)${info ? ' ' + info : ''}`);
}

function usageInfo(out) {
  const u = out?.body?.usage;
  const text = Array.isArray(out?.body?.content)
    ? (out.body.content.find((c) => c?.type === 'text')?.text || '')
    : '';
  const parts = [];
  if (text) parts.push(`out=${text.length}c`);
  if (u) parts.push(`tok in=${u.input_tokens ?? '?'}/out=${u.output_tokens ?? '?'}`);
  return parts.join(' ');
}

const server = http.createServer(async (req, res) => {
  applyCors(req, res);

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  if (req.method === 'GET' && req.url === '/health') { sendJson(res, 200, { ok: true }); return; }

  if (req.method === 'POST' && req.url === '/api/claude-cli/messages') {
    let body;
    try { body = await readBody(req); }
    catch { sendJson(res, 400, { error: { type: 'invalid_request', message: 'JSON inválido.' } }); return; }

    // GUARD OBRIGATÓRIO: body precisa de pelo menos uma mensagem
    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      sendJson(res, 400, { error: { type: 'invalid_request', message: 'Campo `messages` ausente ou vazio.' } });
      return;
    }

    const id = ++reqCounter;
    const started = Date.now();
    logStart(id, 'claude-cli', body);

    try {
      const args = buildClaudeArgs(body);
      const child = spawn('claude', args, { cwd: os.tmpdir() });
      child.stdin.on('error', () => {});
      let stdout = '', stderr = '';
      child.stdout.on('data', (d) => { stdout += d.toString(); });
      child.stderr.on('data', (d) => { stderr += d.toString(); });
      // Cliente desistiu → mata o processo filho (evita gerações órfãs)
      req.on('close', () => {
        if (!child.killed) child.kill();
        if (!res.writableEnded) logEnd(id, 'claude-cli', started, 'abort', 'cliente desconectou');
      });
      child.on('error', (err) => {
        if (res.writableEnded) return;
        logEnd(id, 'claude-cli', started, 500, `erro spawn: ${err.message}`);
        sendJson(res, 500, { error: { type: 'server_error', message: `Falha ao executar 'claude': ${err.message}. O binário está no PATH?` } });
      });
      child.on('close', () => {
        if (res.writableEnded) return;
        if (!stdout.trim()) {
          logEnd(id, 'claude-cli', started, 500, `sem saída; stderr=${stderr.trim().slice(0, 200) || '(vazio)'}`);
          sendJson(res, 500, { error: { type: 'server_error', message: `claude CLI sem saída. stderr: ${stderr.slice(0, 500)}` } });
          return;
        }
        let out;
        try {
          out = translateResponse(stdout, body.model);
        } catch (err) {
          logEnd(id, 'claude-cli', started, 500, `erro tradução: ${err.message}`);
          sendJson(res, 500, { error: { type: 'server_error', message: `Erro ao traduzir resposta: ${err.message}` } });
          return;
        }
        logEnd(id, 'claude-cli', started, out.status, usageInfo(out));
        if (VERBOSE_LOG && stderr.trim()) console.log(`[claude-bridge] #${id} stderr: ${stderr.trim().slice(0, 500)}`);
        sendJson(res, out.status, out.body);
      });
      child.stdin.write(buildStdin(body));
      child.stdin.end();
    } catch (err) {
      logEnd(id, 'claude-cli', started, 500, `falha init: ${err.message}`);
      if (!res.writableEnded) sendJson(res, 500, { error: { type: 'server_error', message: `Falha ao iniciar geração: ${err.message}` } });
      return;
    }
    return;
  }

  if (req.method === 'POST' && req.url === '/api/codex-cli/messages') {
    let body;
    try { body = await readBody(req); }
    catch { sendJson(res, 400, { error: { type: 'invalid_request', message: 'JSON inválido.' } }); return; }

    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      sendJson(res, 400, { error: { type: 'invalid_request', message: 'Campo `messages` ausente ou vazio.' } });
      return;
    }

    const id = ++reqCounter;
    const started = Date.now();
    logStart(id, 'codex-cli', body);

    try {
      const args = buildCodexArgs(body);
      // CODEX_HOME isolado: codex não enxerga ~/.codex/skills/ (anti-leak).
      // Auth continua funcionando via symlink criado em setupIsolatedCodexHome().
      const child = spawn('codex', args, {
        cwd: os.tmpdir(),
        env: { ...process.env, CODEX_HOME: ISOLATED_CODEX_HOME },
      });
      child.stdin.on('error', () => {});
      let stdout = '', stderr = '';
      child.stdout.on('data', (d) => { stdout += d.toString(); });
      child.stderr.on('data', (d) => { stderr += d.toString(); });
      req.on('close', () => {
        if (!child.killed) child.kill();
        if (!res.writableEnded) logEnd(id, 'codex-cli', started, 'abort', 'cliente desconectou');
      });
      child.on('error', (err) => {
        if (res.writableEnded) return;
        logEnd(id, 'codex-cli', started, 500, `erro spawn: ${err.message}`);
        sendJson(res, 500, { error: { type: 'server_error', message: `Falha ao executar 'codex': ${err.message}. O binário está no PATH?` } });
      });
      child.on('close', () => {
        if (res.writableEnded) return;
        if (!stdout.trim()) {
          logEnd(id, 'codex-cli', started, 500, `sem saída; stderr=${stderr.trim().slice(0, 200) || '(vazio)'}`);
          sendJson(res, 500, { error: { type: 'server_error', message: `codex CLI sem saída. stderr: ${stderr.slice(0, 500)}` } });
          return;
        }
        let out;
        try {
          out = translateCodexResponse(stdout, body.model || 'gpt-5.5');
        } catch (err) {
          logEnd(id, 'codex-cli', started, 500, `erro tradução: ${err.message}`);
          sendJson(res, 500, { error: { type: 'server_error', message: `Erro ao traduzir resposta: ${err.message}` } });
          return;
        }
        logEnd(id, 'codex-cli', started, out.status, usageInfo(out));
        if (VERBOSE_LOG && stderr.trim()) console.log(`[claude-bridge] #${id} stderr: ${stderr.trim().slice(0, 500)}`);
        sendJson(res, out.status, out.body);
      });
      child.stdin.write(buildCodexStdin(body));
      child.stdin.end();
    } catch (err) {
      logEnd(id, 'codex-cli', started, 500, `falha init: ${err.message}`);
      if (!res.writableEnded) sendJson(res, 500, { error: { type: 'server_error', message: `Falha ao iniciar geração: ${err.message}` } });
      return;
    }
    return;
  }

  sendJson(res, 404, { error: { type: 'not_found', message: 'Rota não encontrada.' } });
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[claude-bridge] porta ${PORT} já está em uso. ` +
      `Outro daemon já está rodando, ou defina CLAUDE_BRIDGE_PORT=<outra porta>.`);
  } else {
    console.error(`[claude-bridge] erro no servidor: ${err.message}`);
  }
  process.exit(1);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[claude-bridge] ouvindo em http://127.0.0.1:${PORT}`);
  console.log('[claude-bridge] requer `claude` logado (rode `claude` e /login se necessário).');
});
