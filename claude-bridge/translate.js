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

  if (body.thinking && body.thinking.budget_tokens > 0) {
    args.push('--effort', 'high');
  }

  return args;
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
          message: { role, content: msg.content }
        });
      })
      .join('\n') + '\n'
  );
}
