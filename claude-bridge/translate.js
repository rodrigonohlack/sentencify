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
    '--tools',
    '',
    '--setting-sources',
    ''
  ];

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
 * Converte messages[] em linhas stream-json (JSONL) para o stdin do claude.
 * @param {Object} body - Request body com campo messages
 * @returns {string} - JSONL string (uma linha por mensagem)
 */
export function buildStdin(body) {
  const messages = Array.isArray(body.messages) ? body.messages : [];
  return (
    messages
      .map((msg) => {
        const role = msg.role === 'assistant' ? 'assistant' : 'user';
        return JSON.stringify({
          type: role,
          message: { role, content: normalizeContent(msg.content) }
        });
      })
      .join('\n') + '\n'
  );
}

/**
 * Parseia o stream-json do claude e devolve {status, body} no formato Messages API.
 * @param {string} stdout - Saída stdout do claude CLI (linhas JSON)
 * @param {string} model - Model ID a usar na resposta
 * @returns {Object} - {status: number, body: Object} no formato Messages API
 */
export function translateResponse(stdout, model) {
  let result = null;
  for (const line of stdout.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('{')) continue;
    let obj;
    try { obj = JSON.parse(trimmed); } catch { continue; }
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
  return {
    status: 200,
    body: {
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
    },
  };
}
