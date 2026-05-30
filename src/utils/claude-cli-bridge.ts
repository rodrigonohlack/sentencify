/**
 * @file claude-cli-bridge.ts
 * @description URL e path do daemon local llm-bridge (provider "Claude Local (CLI)").
 */

const DEFAULT_BRIDGE_URL = 'http://localhost:8787';
const OVERRIDE_KEY = 'sentencify-claude-cli-bridge-url';

/** Path do endpoint de mensagens no daemon. */
export const CLAUDE_CLI_MESSAGES_PATH = '/api/claude-cli/messages';

/** Retorna a URL base do bridge, com override opcional via localStorage. */
export function getClaudeCliBridgeUrl(): string {
  try {
    return localStorage.getItem(OVERRIDE_KEY) || DEFAULT_BRIDGE_URL;
  } catch {
    return DEFAULT_BRIDGE_URL;
  }
}
