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
 * Monta args para `codex [--search] exec --json` a partir do body Chat Completions.
 *
 * NOTA (codex-cli 0.134.0):
 *   - `--search` é flag DO TOP-LEVEL `codex`, não de `codex exec`.
 *   - `codex exec` não aceita `-a`/`--ask-for-approval`. Approval policy vai
 *     via `-c approval_policy="never"` quando necessário. Com `-s read-only`,
 *     o sandbox já bloqueia escritas/shell sem precisar de approval explícito.
 *
 * @param {{model?: string, reasoning_effort?: string, web_search?: boolean}} body
 * @returns {string[]}
 */
export function buildCodexArgs(body) {
  const reasoning = VALID_REASONING.has(body?.reasoning_effort)
    ? body.reasoning_effort
    : DEFAULT_REASONING;
  // codex Responses API rejeita reasoning='minimal' quando há web_search tool ativa.
  // Auto-bump para 'low' nesse caso (mantém UX e evita 500 do CLI).
  let effectiveReasoning = reasoning;
  if (body?.web_search === true && reasoning === 'minimal') {
    effectiveReasoning = 'low';
    console.warn('[claude-bridge] reasoning_effort=minimal incompatível com web_search; usando low.');
  }
  const args = [];
  // Top-level flags ANTES do subcomando `exec`:
  if (body?.web_search === true) {
    args.push('--search');
  }
  args.push(
    'exec',
    '--json',
    '--skip-git-repo-check',
    '--ephemeral',
    '-s', 'read-only',
    '-m', mapModel(body?.model),
    '-c', `model_reasoning_effort=${effectiveReasoning}`,
    '-c', 'approval_policy="never"',
  );
  // `-` é o sinal explícito para o codex ler o prompt do stdin
  // (ver `codex exec --help`: "If not provided as an argument (or if `-` is used)...").
  args.push('-');
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
 * Detecta se uma mensagem de erro do codex indica problema de autenticação.
 *
 * Aplicar APENAS em mensagens do tipo `error` ou `turn.failed.error.message` do CLI.
 * NUNCA em texto de agent_message — usuário pode falar legitimamente sobre
 * "missing authentication header" no conteúdo dele, e isso não é erro do daemon.
 *
 * @param {string} msg
 * @returns {boolean}
 */
function isAuthError(msg) {
  return /not logged in|please run `?codex login`?|401 unauthorized|missing bearer|missing.*authentication/i.test(String(msg));
}

/**
 * Parseia o JSONL emitido por `codex exec --json` e devolve {status, body}
 * no formato Chat Completions OpenAI.
 *
 * Shape real do codex-cli 0.134.0 (descoberto via smoke test — Task D3):
 *   - `thread.started`     { thread_id }
 *   - `turn.started`       {}
 *   - `item.started`       { item: { id, type: 'web_search'|'agent_message', ... } }
 *   - `item.completed`     { item: { id, type, text?, action? } }
 *     · type='agent_message' → item.text contém a resposta final do modelo
 *     · type='web_search'    → item.action.queries (array) contém as queries usadas
 *   - `turn.completed`     { usage: { input_tokens, output_tokens, ... } }
 *   - `turn.failed`        { error: { message } }
 *   - `error`              { message } (errors de transporte/auth — pode haver vários durante retry)
 *
 * Citations: nesta versão do codex, citações vêm INLINE no texto da agent_message
 * como links markdown `[título](url?utm_source=openai)`. Extraímos heuristicamente
 * quando `--search` está ativo (web_search item presente).
 *
 * @param {string} stdout - Saída JSONL do codex exec
 * @param {string} model
 * @returns {{status: number, body: object}}
 */
export function translateResponse(stdout, model) {
  let threadId = null;
  let agentText = '';
  let usage = null;
  let turnFailedError = null;
  let lastErrorMsg = null;
  let webSearchQueries = [];
  let sawTurnCompleted = false;
  let sawAgentMessage = false;

  for (const line of stdout.split('\n')) {
    const t = line.trim();
    if (!t.startsWith('{')) continue;
    let obj;
    try { obj = JSON.parse(t); } catch { continue; }

    switch (obj.type) {
      case 'thread.started':
        if (obj.thread_id) threadId = obj.thread_id;
        break;
      case 'item.completed': {
        const item = obj.item || {};
        if (item.type === 'agent_message' && typeof item.text === 'string') {
          // Pode haver múltiplos agent_message — concatenamos por segurança.
          agentText += (agentText ? '\n' : '') + item.text;
          sawAgentMessage = true;
        } else if (item.type === 'web_search') {
          const action = item.action || {};
          const qs = Array.isArray(action.queries) ? action.queries : (action.query ? [action.query] : []);
          for (const q of qs) {
            if (q && !webSearchQueries.includes(q)) webSearchQueries.push(q);
          }
        }
        break;
      }
      case 'turn.completed':
        sawTurnCompleted = true;
        if (obj.usage) usage = obj.usage;
        break;
      case 'turn.failed':
        turnFailedError = obj.error?.message || JSON.stringify(obj.error || {});
        break;
      case 'error':
        // Errors de transporte/retry — podem aparecer várias vezes; guardamos a última
        if (obj.message) lastErrorMsg = obj.message;
        break;
      default:
        // Eventos não reconhecidos são ignorados (forward-compat).
        break;
    }
  }

  // Caso de falha: turn.failed OU error sem turn.completed nem agent_message
  if (turnFailedError) {
    if (isAuthError(turnFailedError)) {
      return { status: 401, body: { error: { type: 'authentication_error', message: 'Codex CLI não está logado. Rode `codex login` no terminal.' } } };
    }
    return { status: 500, body: { error: { type: 'server_error', message: turnFailedError } } };
  }
  if (!sawAgentMessage && !sawTurnCompleted) {
    if (lastErrorMsg) {
      if (isAuthError(lastErrorMsg)) {
        return { status: 401, body: { error: { type: 'authentication_error', message: 'Codex CLI não está logado. Rode `codex login` no terminal.' } } };
      }
      return { status: 500, body: { error: { type: 'server_error', message: lastErrorMsg } } };
    }
    return { status: 500, body: { error: { type: 'server_error', message: 'Nenhum evento `turn.completed` recebido do codex CLI.' } } };
  }

  const input = usage?.input_tokens || 0;
  const output = usage?.output_tokens || 0;

  const out = {
    id: `chatcmpl-codex-${threadId || 'unknown'}`,
    object: 'chat.completion',
    model,
    choices: [{
      index: 0,
      message: { role: 'assistant', content: agentText },
      finish_reason: 'stop',
    }],
    usage: {
      prompt_tokens: input,
      completion_tokens: output,
      total_tokens: input + output,
    },
  };

  // Grounding: extrair links markdown da resposta + queries de web_search items.
  const groundingChunks = extractMarkdownLinks(agentText);
  if (webSearchQueries.length || groundingChunks.length) {
    out.grounding = {
      webSearchQueries,
      groundingChunks,
    };
  }

  return { status: 200, body: out };
}

/**
 * Extrai links markdown `[título](url)` do texto, devolvendo objetos no formato
 * Gemini-grounding `{ web: { uri, title } }`. Ignora links cuja URL não tem
 * scheme http(s).
 * @param {string} text
 * @returns {Array<{web: {uri: string, title: string}}>}
 */
function extractMarkdownLinks(text) {
  if (!text) return [];
  const out = [];
  const seen = new Set();
  const re = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const title = m[1].trim();
    const uri = m[2].trim();
    if (seen.has(uri)) continue;
    seen.add(uri);
    out.push({ web: { uri, title: title || uri } });
  }
  return out;
}
