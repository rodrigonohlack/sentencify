import { describe, it, expect, beforeEach, vi } from 'vitest';

// Need to re-import fresh module for each test to reset module-level state
let fetchCSRFToken: typeof import('./csrf').fetchCSRFToken;
let getCSRFToken: typeof import('./csrf').getCSRFToken;
let withCSRF: typeof import('./csrf').withCSRF;

beforeEach(async () => {
  vi.resetModules();
  const mod = await import('./csrf');
  fetchCSRFToken = mod.fetchCSRFToken;
  getCSRFToken = mod.getCSRFToken;
  withCSRF = mod.withCSRF;
});

describe('fetchCSRFToken', () => {
  it('should fetch token from /api/auth/csrf-token', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ csrfToken: 'test-token-123' }),
    });
    global.fetch = mockFetch;

    const token = await fetchCSRFToken();

    expect(mockFetch).toHaveBeenCalledWith('/api/auth/csrf-token', {
      credentials: 'include',
    });
    expect(token).toBe('test-token-123');
  });

  it('should store the fetched token for later retrieval', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ csrfToken: 'stored-token' }),
    });
    global.fetch = mockFetch;

    await fetchCSRFToken();
    expect(getCSRFToken()).toBe('stored-token');
  });
});

describe('getCSRFToken', () => {
  it('should return null when no token has been fetched', () => {
    expect(getCSRFToken()).toBeNull();
  });

  it('should return the token after fetchCSRFToken is called', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ csrfToken: 'my-token' }),
    });
    global.fetch = mockFetch;

    await fetchCSRFToken();
    expect(getCSRFToken()).toBe('my-token');
  });
});

describe('withCSRF', () => {
  it('should return headers unchanged when no token exists', () => {
    const headers = { 'Content-Type': 'application/json' };
    const result = withCSRF(headers);
    expect(result).toEqual({ 'Content-Type': 'application/json' });
    expect(result).not.toHaveProperty('x-csrf-token');
  });

  it('should add x-csrf-token header when token exists', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ csrfToken: 'csrf-abc' }),
    });
    global.fetch = mockFetch;

    await fetchCSRFToken();

    const headers = { 'Content-Type': 'application/json' };
    const result = withCSRF(headers);
    expect(result['x-csrf-token']).toBe('csrf-abc');
    expect(result['Content-Type']).toBe('application/json');
  });

  it('should work with empty headers object', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ csrfToken: 'token-xyz' }),
    });
    global.fetch = mockFetch;

    await fetchCSRFToken();
    const result = withCSRF();
    expect(result['x-csrf-token']).toBe('token-xyz');
  });

  it('should work with no arguments (default empty headers)', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ csrfToken: 'no-arg-token' }),
    });
    global.fetch = mockFetch;

    await fetchCSRFToken();
    const result = withCSRF();
    expect(result['x-csrf-token']).toBe('no-arg-token');
  });
});
