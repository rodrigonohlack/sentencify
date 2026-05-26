import { describe, it, expect, beforeEach } from 'vitest';
import { getClaudeCliBridgeUrl, CLAUDE_CLI_MESSAGES_PATH } from './claude-cli-bridge';

describe('claude-cli-bridge', () => {
  beforeEach(() => { localStorage.clear(); });

  it('usa a URL default quando não há override', () => {
    expect(getClaudeCliBridgeUrl()).toBe('http://localhost:8787');
  });

  it('respeita override em localStorage', () => {
    localStorage.setItem('sentencify-claude-cli-bridge-url', 'http://localhost:9999');
    expect(getClaudeCliBridgeUrl()).toBe('http://localhost:9999');
  });

  it('expõe o path do endpoint de mensagens', () => {
    expect(CLAUDE_CLI_MESSAGES_PATH).toBe('/api/claude-cli/messages');
  });
});
