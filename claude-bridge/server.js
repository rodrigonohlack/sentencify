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

    // GUARD OBRIGATÓRIO: body precisa de pelo menos uma mensagem
    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      sendJson(res, 400, { error: { type: 'invalid_request', message: 'Campo `messages` ausente ou vazio.' } });
      return;
    }

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
