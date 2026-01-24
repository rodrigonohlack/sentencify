import { describe, it, expect, beforeEach, vi } from 'vitest';
import { encryptString, decryptString, encryptApiKeys, decryptApiKeys, isEncrypted } from './crypto';

// Web Crypto API mock
const mockEncrypt = vi.fn();
const mockDecrypt = vi.fn();
const mockGenerateKey = vi.fn();

const mockCryptoKey = { type: 'secret', algorithm: { name: 'AES-GCM' } } as unknown as CryptoKey;

beforeEach(() => {
  vi.clearAllMocks();

  // Reset module-level cached key by reimporting
  mockGenerateKey.mockResolvedValue(mockCryptoKey);

  // Mock crypto.subtle
  Object.defineProperty(globalThis, 'crypto', {
    value: {
      subtle: {
        generateKey: mockGenerateKey,
        encrypt: mockEncrypt,
        decrypt: mockDecrypt,
      },
      getRandomValues: (arr: Uint8Array) => {
        // Fill with predictable values for testing
        for (let i = 0; i < arr.length; i++) {
          arr[i] = i;
        }
        return arr;
      },
    },
    writable: true,
    configurable: true,
  });
});

describe('isEncrypted', () => {
  it('should return false for empty/null values', () => {
    expect(isEncrypted('')).toBe(false);
  });

  it('should return false for short strings (< 20 chars)', () => {
    expect(isEncrypted('short')).toBe(false);
    expect(isEncrypted('sk-abc123')).toBe(false);
  });

  it('should return false for non-base64 strings', () => {
    expect(isEncrypted('this is not base64 encoded at all!!')).toBe(false);
  });

  it('should return true for valid base64 with sufficient length', () => {
    // Create a base64 string that decodes to >= 29 bytes
    const bytes = new Uint8Array(30);
    const base64 = btoa(String.fromCharCode(...bytes));
    expect(isEncrypted(base64)).toBe(true);
  });

  it('should return false for valid base64 with insufficient decoded length', () => {
    // Create a base64 string that decodes to < 29 bytes but is >= 20 chars in base64
    const bytes = new Uint8Array(15);
    const base64 = btoa(String.fromCharCode(...bytes));
    // base64 of 15 bytes = 20 chars, decoded length = 15 < 29
    expect(isEncrypted(base64)).toBe(false);
  });
});

describe('encryptString', () => {
  it('should return empty string for empty input', async () => {
    const result = await encryptString('');
    expect(result).toBe('');
  });

  it('should call crypto.subtle.encrypt with AES-GCM', async () => {
    const encrypted = new ArrayBuffer(16);
    mockEncrypt.mockResolvedValue(encrypted);

    await encryptString('test data');

    expect(mockEncrypt).toHaveBeenCalled();
    const [algo] = mockEncrypt.mock.calls[0];
    expect(algo.name).toBe('AES-GCM');
    expect(algo.iv).toBeInstanceOf(Uint8Array);
    expect(algo.iv.length).toBe(12);
  });

  it('should return base64 string', async () => {
    const encrypted = new ArrayBuffer(16);
    mockEncrypt.mockResolvedValue(encrypted);

    const result = await encryptString('hello');
    // Result should be base64 (IV + ciphertext)
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    // Verify it's valid base64
    expect(() => atob(result)).not.toThrow();
  });
});

describe('decryptString', () => {
  it('should return empty string for empty input', async () => {
    const result = await decryptString('');
    expect(result).toBe('');
  });

  it('should call crypto.subtle.decrypt with AES-GCM', async () => {
    const decrypted = new TextEncoder().encode('hello').buffer;
    mockDecrypt.mockResolvedValue(decrypted);

    // Create valid base64 ciphertext (12 bytes IV + data)
    const fakeData = new Uint8Array(30);
    const fakeCiphertext = btoa(String.fromCharCode(...fakeData));

    await decryptString(fakeCiphertext);

    expect(mockDecrypt).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'AES-GCM' }),
      expect.anything(),
      expect.any(Uint8Array)
    );
  });

  it('should return empty string on decrypt failure', async () => {
    mockDecrypt.mockRejectedValue(new Error('Decrypt failed'));

    const fakeData = new Uint8Array(30);
    const fakeCiphertext = btoa(String.fromCharCode(...fakeData));

    const result = await decryptString(fakeCiphertext);
    expect(result).toBe('');
  });
});

describe('encryptApiKeys', () => {
  it('should encrypt all non-empty keys', async () => {
    const encrypted = new ArrayBuffer(16);
    mockEncrypt.mockResolvedValue(encrypted);

    const keys = {
      claude: 'sk-ant-123',
      openai: 'sk-456',
      gemini: '',
    };

    const result = await encryptApiKeys(keys);
    expect(result.gemini).toBe('');
    expect(result.claude).not.toBe('');
    expect(result.openai).not.toBe('');
  });

  it('should handle empty keys object', async () => {
    const result = await encryptApiKeys({});
    expect(result).toEqual({});
  });
});

describe('decryptApiKeys', () => {
  it('should decrypt encrypted keys', async () => {
    const decrypted = new TextEncoder().encode('sk-test').buffer;
    mockDecrypt.mockResolvedValue(decrypted);

    // Create valid encrypted value (base64 of >= 29 bytes)
    const bytes = new Uint8Array(30);
    const encryptedValue = btoa(String.fromCharCode(...bytes));

    const result = await decryptApiKeys({ claude: encryptedValue });
    expect(result.claude).toBe('sk-test');
  });

  it('should pass through empty values', async () => {
    const result = await decryptApiKeys({ claude: '' });
    expect(result.claude).toBe('');
  });

  it('should pass through plain text keys (pre-encryption migration)', async () => {
    // Short strings that fail isEncrypted check are returned as-is
    const result = await decryptApiKeys({ claude: 'sk-ant-short' });
    expect(result.claude).toBe('sk-ant-short');
  });
});
