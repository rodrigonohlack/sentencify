/**
 * @file retry.test.ts
 * @description Testes para utilitarios de retry
 * @version v1.39.03
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  withRetry,
  withStorageRetry,
  RETRYABLE_STATUS_CODES,
  RETRYABLE_ERROR_MESSAGES,
  AI_RETRY_DEFAULTS,
  STORAGE_RETRY_DEFAULTS
} from './retry';

describe('retry utilities', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('constants', () => {
    it('should export RETRYABLE_STATUS_CODES', () => {
      expect(RETRYABLE_STATUS_CODES).toContain(429);
      expect(RETRYABLE_STATUS_CODES).toContain(500);
      expect(RETRYABLE_STATUS_CODES).toContain(502);
      expect(RETRYABLE_STATUS_CODES).toContain(503);
    });

    it('should export RETRYABLE_ERROR_MESSAGES', () => {
      expect(RETRYABLE_ERROR_MESSAGES).toContain('Timeout');
      expect(RETRYABLE_ERROR_MESSAGES).toContain('rate limit');
      expect(RETRYABLE_ERROR_MESSAGES).toContain('Overloaded');
    });

    it('should export AI_RETRY_DEFAULTS with correct values', () => {
      expect(AI_RETRY_DEFAULTS.maxRetries).toBe(3);
      expect(AI_RETRY_DEFAULTS.initialDelayMs).toBe(5000);
      expect(AI_RETRY_DEFAULTS.backoffType).toBe('exponential');
      expect(AI_RETRY_DEFAULTS.backoffMultiplier).toBe(2);
    });

    it('should export STORAGE_RETRY_DEFAULTS with correct values', () => {
      expect(STORAGE_RETRY_DEFAULTS.maxRetries).toBe(3);
      expect(STORAGE_RETRY_DEFAULTS.initialDelayMs).toBe(1000);
      expect(STORAGE_RETRY_DEFAULTS.backoffType).toBe('exponential');
    });
  });

  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      const fn = vi.fn().mockResolvedValue('success');

      const result = await withRetry(fn, { maxRetries: 3 });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable error and succeed', async () => {
      vi.useRealTimers(); // Use real timers for this test

      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('HTTP 429'))
        .mockResolvedValueOnce('success');

      const result = await withRetry(fn, {
        maxRetries: 3,
        initialDelayMs: 10, // Short delay for test
        backoffType: 'exponential',
        backoffMultiplier: 2
      });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should throw after max retries exceeded', async () => {
      vi.useRealTimers(); // Use real timers for this test

      const fn = vi.fn().mockRejectedValue(new Error('HTTP 429'));

      await expect(
        withRetry(fn, {
          maxRetries: 3,
          initialDelayMs: 10 // Short delay for test
        })
      ).rejects.toThrow('Falha apos 3 tentativas');

      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should not retry non-retryable errors', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Invalid API key'));

      await expect(
        withRetry(fn, { maxRetries: 3 })
      ).rejects.toThrow('Invalid API key');

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should detect retryable status code in error object', async () => {
      vi.useRealTimers();

      const error = new Error('Rate limited') as Error & { status: number };
      error.status = 429;

      const fn = vi.fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce('success');

      const result = await withRetry(fn, {
        maxRetries: 3,
        initialDelayMs: 10,
        retryableStatusCodes: [429]
      });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should detect retryable status code in error message', async () => {
      vi.useRealTimers();

      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('Error: HTTP 503'))
        .mockResolvedValueOnce('success');

      const result = await withRetry(fn, {
        maxRetries: 3,
        initialDelayMs: 10,
        retryableStatusCodes: [503]
      });

      expect(result).toBe('success');
    });

    it('should use exponential backoff', async () => {
      vi.useRealTimers();

      const startTime = Date.now();
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('HTTP 429'))
        .mockRejectedValueOnce(new Error('HTTP 429'))
        .mockResolvedValueOnce('success');

      const result = await withRetry(fn, {
        maxRetries: 3,
        initialDelayMs: 50, // 50ms base
        backoffType: 'exponential',
        backoffMultiplier: 2
      });

      const elapsed = Date.now() - startTime;

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
      // Total delay: 50ms (first) + 100ms (second) = 150ms minimum
      expect(elapsed).toBeGreaterThanOrEqual(130); // Some tolerance
    });

    it('should use linear backoff when specified', async () => {
      vi.useRealTimers();

      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('HTTP 429'))
        .mockRejectedValueOnce(new Error('HTTP 429'))
        .mockResolvedValueOnce('success');

      const result = await withRetry(fn, {
        maxRetries: 3,
        initialDelayMs: 10,
        backoffType: 'linear'
      });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should call onRetry callback', async () => {
      vi.useRealTimers();

      const onRetry = vi.fn();
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('HTTP 429'))
        .mockResolvedValueOnce('success');

      await withRetry(fn, {
        maxRetries: 3,
        initialDelayMs: 10,
        onRetry
      });

      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error), 10);
    });

    it('should respect abort signal before first attempt', async () => {
      const controller = new AbortController();
      controller.abort();

      const fn = vi.fn().mockResolvedValue('success');

      await expect(
        withRetry(fn, { abortSignal: controller.signal })
      ).rejects.toThrow('Operacao cancelada pelo usuario');

      expect(fn).not.toHaveBeenCalled();
    });

    it('should respect abort signal during execution', async () => {
      vi.useRealTimers();

      const controller = new AbortController();

      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('HTTP 429'))
        .mockResolvedValueOnce('success');

      // Start the retry
      const resultPromise = withRetry(fn, {
        maxRetries: 3,
        initialDelayMs: 50,
        abortSignal: controller.signal
      });

      // Abort after a short delay (before retry completes)
      setTimeout(() => controller.abort(), 20);

      await expect(resultPromise).rejects.toThrow('Operacao cancelada pelo usuario');
    });

    it('should timeout with timeoutMs option', async () => {
      vi.useRealTimers();

      const fn = vi.fn().mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve('slow'), 200))
      );

      await expect(
        withRetry(fn, {
          maxRetries: 1,
          timeoutMs: 50
        })
      ).rejects.toThrow('Timeout');
    });

    it('should detect retryable error messages (case insensitive)', async () => {
      vi.useRealTimers();

      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('Server is OVERLOADED'))
        .mockResolvedValueOnce('success');

      const result = await withRetry(fn, {
        maxRetries: 3,
        initialDelayMs: 10,
        retryableMessages: ['overloaded']
      });

      expect(result).toBe('success');
    });
  });

  describe('withStorageRetry', () => {
    it('should succeed on first attempt', async () => {
      const fn = vi.fn().mockResolvedValue('data');

      const result = await withStorageRetry(fn);

      expect(result).toBe('data');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on any error', async () => {
      vi.useRealTimers();

      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('IndexedDB error'))
        .mockResolvedValueOnce('data');

      const result = await withStorageRetry(fn, 3);

      expect(result).toBe('data');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should throw after max retries', async () => {
      vi.useRealTimers();

      const fn = vi.fn().mockRejectedValue(new Error('IndexedDB error'));

      await expect(withStorageRetry(fn, 2)).rejects.toThrow('IndexedDB error');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should respect custom maxRetries', async () => {
      vi.useRealTimers();

      const fn = vi.fn().mockRejectedValue(new Error('Error'));

      await expect(withStorageRetry(fn, 2)).rejects.toThrow('Error');
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });
});
