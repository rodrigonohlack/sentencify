// claude-bridge/translate.js

/**
 * Mapeia um model id (datado ou alias) para o alias aceito pelo CLI.
 * @param {string|undefined} model - Model ID da Messages API
 * @returns {string} - 'opus', 'haiku', ou 'sonnet'
 */
export function mapModel(model) {
  const m = String(model || '').toLowerCase();
  if (m.includes('opus')) return 'opus';
  if (m.includes('haiku')) return 'haiku';
  return 'sonnet';
}

/**
 * Extrai o texto do system (string ou array de blocos {type:'text',text}).
 * @param {string|Array|undefined} system - System prompt da Messages API
 * @returns {string} - Texto concatenado, vazio se undefined/null
 */
export function extractSystem(system) {
  if (!system) return '';
  if (typeof system === 'string') return system;
  if (Array.isArray(system)) {
    return system
      .map((b) => (typeof b === 'string' ? b : b.text || ''))
      .join('\n');
  }
  return '';
}

/**
 * Monta os argumentos do `claude` a partir do body Messages API.
 * @param {Object} body - Request body (model, system, thinking, etc.)
 * @returns {Array<string>} - Argumentos para execução do CLI
 */
export function buildClaudeArgs(body) {
  const args = [
    '-p',
    '--verbose',
    '--input-format',
    'stream-json',
    '--output-format',
    'stream-json',
    '--setting-sources',
    '',
    // Hardening contra vazamento de tools/skills/MCPs no headless:
    //   --strict-mcp-config (sem --mcp-config) → zera MCP servers user-level
    //     (Gmail/Drive/Calendar etc. vazavam pro whitelist mesmo com --tools 'WebSearch')
    //   --disable-slash-commands → zera skills carregadas (apesar do nome,
    //     a flag desabilita skills + slash commands)
    //   --disallowed-tools 'Skill' → belt-and-suspenders explícito contra a
    //     meta-tool Skill (redundante hoje, defensivo contra regressão futura)
    // Smoke testado contra claude-cli 2.1.154 em 2026-05-28; sem essas três flags,
    // o init message vinha com 2 MCP tools de Gmail no array `tools`.
    '--strict-mcp-config',
    '--disable-slash-commands',
    '--disallowed-tools',
    'Skill',
  ];

  // Tools: por default zera; se body.web_search=true ativa WebSearch + bypassPermissions
  if (body?.web_search === true) {
    args.push('--tools', 'WebSearch');
    args.push('--permission-mode', 'bypassPermissions');
  } else {
    args.push('--tools', '');
  }

  args.push('--model', mapModel(body.model));

  const system = extractSystem(body.system);
  if (system) {
    args.push('--system-prompt', system);
  }

  const VALID_EFFORT = ['low', 'medium', 'high', 'xhigh', 'max'];
  if (body.effort === 'off') {
    // effort explicitamente desligado: nenhum --effort
  } else if (VALID_EFFORT.includes(body.effort)) {
    args.push('--effort', body.effort);
  } else if (body.thinking && body.thinking.budget_tokens > 0) {
    // fallback legado (sem campo effort): budget>0 → high
    args.push('--effort', 'high');
  }

  return args;
}

/**
 * Normaliza o content para o formato array que o claude CLI espera,
 * e remove cache_control (o CLI não suporta prompt caching).
 * @param {string|Array|*} content - Content string, array, ou outro
 * @returns {Array|*} - Content normalizado (string → [{type:'text',text}]), sem cache_control
 */
function normalizeContent(content) {
  if (typeof content === 'string') {
    return [{ type: 'text', text: content }];
  }
  if (Array.isArray(content)) {
    return content.map((block) => {
      if (block && typeof block === 'object' && 'cache_control' in block) {
        const { cache_control, ...rest } = block;
        return rest;
      }
      return block;
    });
  }
  return content;
}

/**
 * Colapsa uma conversa multi-turn num único array de content (1 turno de usuário).
 * Texto vira transcript rotulado por papel; blocos não-texto (document/image)
 * são preservados e intercalados na ordem.
 * @param {Array} messages - Array de mensagens {role, content}
 * @returns {Array} - Array de blocos de content para um único turno de usuário
 */
function collapseMessages(messages) {
  const out = [];
  let textBuf = [];
  const flush = () => {
    if (textBuf.length) { out.push({ type: 'text', text: textBuf.join('\n\n') }); textBuf = []; }
  };
  for (const msg of messages) {
    const label = msg.role === 'assistant' ? 'Assistente' : 'Usuário';
    const blocks = normalizeContent(msg.content);
    for (const b of blocks) {
      if (b && typeof b === 'object' && b.type === 'text') {
        textBuf.push(`${label}: ${b.text}`);
      } else {
        flush();
        out.push(b);
      }
    }
  }
  flush();
  return out;
}

/**
 * Converte messages[] em stdin stream-json para o claude CLI.
 * - Turno único (≤1 mensagem): envia como está (content normalizado).
 * - Multi-turn: colapsa em 1 turno de usuário com o histórico como transcript
 *   rotulado, pois o stream-json input do CLI não mantém histórico de forma
 *   confiável (responde a turnos user intermediários, ignora assistant fornecidos).
 * @param {Object} body - Request body com campo messages
 * @returns {string} - JSONL string (1 linha)
 */
export function buildStdin(body) {
  const messages = Array.isArray(body.messages) ? body.messages : [];
  // Turno único (ex.: análise com PDFs) → enviar como está.
  if (messages.length <= 1) {
    const msg = messages[0] || { role: 'user', content: [] };
    const role = msg.role === 'assistant' ? 'assistant' : 'user';
    return JSON.stringify({ type: role, message: { role, content: normalizeContent(msg.content) } }) + '\n';
  }
  // Multi-turn: colapsa a conversa em UM único turno de usuário com o histórico como contexto.
  const content = collapseMessages(messages);
  return JSON.stringify({ type: 'user', message: { role: 'user', content } }) + '\n';
}

/**
 * Parseia o stream-json do claude e devolve {status, body} no formato Messages API.
 * @param {string} stdout - Saída stdout do claude CLI (linhas JSON)
 * @param {string} model - Model ID a usar na resposta
 * @returns {Object} - {status: number, body: Object} no formato Messages API
 */
export function translateResponse(stdout, model) {
  let result = null;
  const webSearchQueries = [];

  for (const line of stdout.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('{')) continue;
    let obj;
    try { obj = JSON.parse(trimmed); } catch { continue; }

    // Coletar tool_use blocks WebSearch (vêm em assistant messages antes do result)
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
    // NOTE: casado contra a string literal do CLI; atualizar se o CLI mudar o texto.
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
    // CLI não expõe stop_reason; 'end_turn' é o default correto.
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
