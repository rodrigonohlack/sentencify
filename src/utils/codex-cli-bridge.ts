/**
 * @file codex-cli-bridge.ts
 * @description URL e path do daemon local (provider "Codex Local (CLI)").
 *              Default aponta para o mesmo daemon llm-bridge (porta 8787),
 *              mas override próprio permite separar se necessário.
 */

const DEFAULT_BRIDGE_URL = 'http://localhost:8787';
const OVERRIDE_KEY = 'sentencify-codex-cli-bridge-url';

/** Path do endpoint de mensagens no daemon. */
export const CODEX_CLI_MESSAGES_PATH = '/api/codex-cli/messages';

/** Retorna a URL base do bridge, com override opcional via localStorage. */
export function getCodexCliBridgeUrl(): string {
  try {
    return localStorage.getItem(OVERRIDE_KEY) || DEFAULT_BRIDGE_URL;
  } catch {
    return DEFAULT_BRIDGE_URL;
  }
}
