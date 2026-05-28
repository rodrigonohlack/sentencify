import { describe, it, expect, beforeEach } from 'vitest';
import { getCodexCliBridgeUrl, CODEX_CLI_MESSAGES_PATH } from './codex-cli-bridge';

describe('codex-cli-bridge', () => {
  beforeEach(() => { localStorage.clear(); });

  it('usa a URL default quando não há override', () => {
    expect(getCodexCliBridgeUrl()).toBe('http://localhost:8787');
  });

  it('respeita override em localStorage', () => {
    localStorage.setItem('sentencify-codex-cli-bridge-url', 'http://localhost:9999');
    expect(getCodexCliBridgeUrl()).toBe('http://localhost:9999');
  });

  it('expõe o path do endpoint de mensagens', () => {
    expect(CODEX_CLI_MESSAGES_PATH).toBe('/api/codex-cli/messages');
  });
});
