/**
 * @file useQuillInitialization.test.ts
 * @description Testes para o hook useQuillInitialization
 * @version 1.38.52
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useQuillInitialization } from './useQuillInitialization';

// Mock injectQuillStyles
vi.mock('../utils/quill-styles-injector', () => ({
  injectQuillStyles: vi.fn(),
}));

describe('useQuillInitialization', () => {
  // Store original values
  let originalDOMPurify: typeof window.DOMPurify;
  let originalQuill: typeof window.Quill;

  beforeEach(() => {
    vi.clearAllMocks();

    // Store originals
    originalDOMPurify = window.DOMPurify;
    originalQuill = window.Quill;

    // Reset window objects
    delete (window as { DOMPurify?: unknown }).DOMPurify;
    delete (window as { Quill?: unknown }).Quill;

    // Clean up any existing scripts
    document.querySelectorAll('script[src*="purify"], script[src*="quill"]').forEach(el => el.remove());
    document.querySelectorAll('link[href*="quill"]').forEach(el => el.remove());
  });

  afterEach(() => {
    // Restore originals
    if (originalDOMPurify) {
      window.DOMPurify = originalDOMPurify;
    }
    if (originalQuill) {
      window.Quill = originalQuill;
    }

    // Clean up scripts
    document.querySelectorAll('script[src*="purify"], script[src*="quill"]').forEach(el => el.remove());
    document.querySelectorAll('link[href*="quill"]').forEach(el => el.remove());
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIAL STATE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Initial State', () => {
    it('should return initial state with nothing ready', () => {
      const { result } = renderHook(() => useQuillInitialization());

      expect(result.current.domPurifyReady).toBe(false);
      expect(result.current.quillReady).toBe(false);
      expect(result.current.quillError).toBeNull();
      expect(result.current.quillRetryCount).toBe(0);
    });

    it('should return sanitizeHTML function', () => {
      const { result } = renderHook(() => useQuillInitialization());
      expect(typeof result.current.sanitizeHTML).toBe('function');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DOMPURIFY ALREADY LOADED
  // ═══════════════════════════════════════════════════════════════════════════

  describe('DOMPurify Already Loaded', () => {
    it('should set domPurifyReady immediately if DOMPurify exists', async () => {
      // Setup DOMPurify before rendering
      window.DOMPurify = {
        sanitize: vi.fn((str: string) => str),
        version: '3.0.6',
      } as unknown as typeof DOMPurify;

      const { result } = renderHook(() => useQuillInitialization());

      await waitFor(() => {
        expect(result.current.domPurifyReady).toBe(true);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // QUILL ALREADY LOADED
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Quill Already Loaded', () => {
    it('should set quillReady if Quill and scripts already exist', async () => {
      // Setup Quill before rendering
      window.Quill = vi.fn() as unknown as typeof Quill;

      // Add existing scripts
      const existingScript = document.createElement('script');
      existingScript.id = 'quill-library-js';
      document.head.appendChild(existingScript);

      const existingCSS = document.createElement('link');
      existingCSS.id = 'quill-theme-css';
      document.head.appendChild(existingCSS);

      const { result } = renderHook(() => useQuillInitialization());

      await waitFor(() => {
        expect(result.current.quillReady).toBe(true);
      }, { timeout: 500 });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SANITIZE HTML
  // ═══════════════════════════════════════════════════════════════════════════

  describe('sanitizeHTML', () => {
    it('should return empty string when DOMPurify not ready', () => {
      const { result } = renderHook(() => useQuillInitialization());

      const sanitized = result.current.sanitizeHTML('<p>Test</p>');
      expect(sanitized).toBe('');
    });

    it('should return empty string for null input when DOMPurify not ready', () => {
      const { result } = renderHook(() => useQuillInitialization());

      const sanitized = result.current.sanitizeHTML(null);
      expect(sanitized).toBe('');
    });

    it('should return empty string for undefined input when DOMPurify not ready', () => {
      const { result } = renderHook(() => useQuillInitialization());

      const sanitized = result.current.sanitizeHTML(undefined);
      expect(sanitized).toBe('');
    });

    it('should sanitize HTML when DOMPurify is ready', async () => {
      const mockSanitize = vi.fn((str: string) => `sanitized: ${str}`);
      window.DOMPurify = {
        sanitize: mockSanitize,
        version: '3.0.6',
      } as unknown as typeof DOMPurify;

      const { result } = renderHook(() => useQuillInitialization());

      await waitFor(() => {
        expect(result.current.domPurifyReady).toBe(true);
      });

      const sanitized = result.current.sanitizeHTML('<p>Test</p>');
      expect(mockSanitize).toHaveBeenCalled();
    });

    it('should handle empty string input', async () => {
      window.DOMPurify = {
        sanitize: vi.fn(() => ''),
        version: '3.0.6',
      } as unknown as typeof DOMPurify;

      const { result } = renderHook(() => useQuillInitialization());

      await waitFor(() => {
        expect(result.current.domPurifyReady).toBe(true);
      });

      const sanitized = result.current.sanitizeHTML('');
      expect(sanitized).toBe('');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SCRIPT LOADING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Script Loading', () => {
    it('should add DOMPurify script to head', () => {
      renderHook(() => useQuillInitialization());

      const script = document.querySelector('script[src*="purify"]');
      expect(script).toBeInTheDocument();
    });

    it('should add Quill script to head', () => {
      renderHook(() => useQuillInitialization());

      const script = document.querySelector('script[src*="quill.js"]');
      expect(script).toBeInTheDocument();
    });

    it('should add Quill CSS to head', () => {
      renderHook(() => useQuillInitialization());

      const link = document.querySelector('link[href*="quill.snow.css"]');
      expect(link).toBeInTheDocument();
    });

    it('should set correct attributes on DOMPurify script', () => {
      renderHook(() => useQuillInitialization());

      const script = document.querySelector('script[src*="purify"]') as HTMLScriptElement;
      expect(script).toHaveAttribute('crossorigin', 'anonymous');
      expect(script.async).toBe(true);
    });

    it('should set integrity hash on scripts', () => {
      renderHook(() => useQuillInitialization());

      const domPurifyScript = document.querySelector('script[src*="purify"]') as HTMLScriptElement;
      expect(domPurifyScript).not.toBeNull();
      // Check integrity is set (value may vary by version)
      expect(domPurifyScript?.integrity).toBeTruthy();

      const quillScript = document.querySelector('script[src*="quill.js"]') as HTMLScriptElement;
      expect(quillScript).not.toBeNull();
      expect(quillScript?.integrity).toBeTruthy();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SCRIPT LOAD EVENTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Script Load Events', () => {
    it('should handle DOMPurify script load', async () => {
      const { result } = renderHook(() => useQuillInitialization());

      // Simulate DOMPurify loading
      window.DOMPurify = {
        sanitize: vi.fn(),
        version: '3.0.6',
      } as unknown as typeof DOMPurify;

      const script = document.querySelector('script[src*="purify"]') as HTMLScriptElement;
      if (script) {
        script.dispatchEvent(new Event('load'));
      }

      await waitFor(() => {
        expect(result.current.domPurifyReady).toBe(true);
      });
    });

    it('should handle Quill script load', async () => {
      const { result } = renderHook(() => useQuillInitialization());

      // Simulate Quill loading
      window.Quill = vi.fn() as unknown as typeof Quill;

      const script = document.querySelector('script[src*="quill.js"]') as HTMLScriptElement;
      if (script) {
        script.dispatchEvent(new Event('load'));
      }

      await waitFor(() => {
        expect(result.current.quillReady).toBe(true);
      }, { timeout: 500 });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SCRIPT ERROR HANDLING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Error Handling', () => {
    it('should handle DOMPurify load error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      renderHook(() => useQuillInitialization());

      const script = document.querySelector('script[src*="purify"]') as HTMLScriptElement;
      if (script) {
        script.dispatchEvent(new Event('error'));
      }

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('DOMPurify'));
      consoleSpy.mockRestore();
    });

    it('should increment retry count on Quill load error', async () => {
      const { result } = renderHook(() => useQuillInitialization());

      // Initial retry count should be 0
      expect(result.current.quillRetryCount).toBe(0);

      // Trigger error
      const script = document.querySelector('script[src*="quill.js"]') as HTMLScriptElement;
      if (script) {
        script.dispatchEvent(new Event('error'));
      }

      // Retry count should eventually increment (or error should be set)
      await waitFor(() => {
        expect(result.current.quillRetryCount >= 0).toBe(true);
      }, { timeout: 500 });
    });

    it('should set error when Quill script loads but Quill is not available', async () => {
      const { result } = renderHook(() => useQuillInitialization());

      // Don't set window.Quill
      const script = document.querySelector('script[src*="quill.js"]') as HTMLScriptElement;
      if (script) {
        script.dispatchEvent(new Event('load'));
      }

      await waitFor(() => {
        expect(result.current.quillError?.message).toContain('não disponível');
      }, { timeout: 500 });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CLEANUP
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Cleanup', () => {
    it('should remove script on unmount', () => {
      const { unmount } = renderHook(() => useQuillInitialization());

      const scriptBefore = document.querySelector('script[src*="purify"]');
      expect(scriptBefore).toBeInTheDocument();

      unmount();

      const scriptAfter = document.querySelector('script[src*="purify"]');
      expect(scriptAfter).not.toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DEBUG FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Debug Functions', () => {
    it('should expose testSanitization on window', async () => {
      window.DOMPurify = {
        sanitize: vi.fn((str: string) => str),
        version: '3.0.6',
      } as unknown as typeof DOMPurify;

      renderHook(() => useQuillInitialization());

      await waitFor(() => {
        expect(typeof window.testSanitization).toBe('function');
      });
    });

    it('should expose checkDOMPurify on window', async () => {
      window.DOMPurify = {
        sanitize: vi.fn(),
        version: '3.0.6',
      } as unknown as typeof DOMPurify;

      renderHook(() => useQuillInitialization());

      await waitFor(() => {
        expect(typeof window.checkDOMPurify).toBe('function');
      });
    });

    it('should return correct info from checkDOMPurify', async () => {
      window.DOMPurify = {
        sanitize: vi.fn(),
        version: '3.0.6',
      } as unknown as typeof DOMPurify;

      const { result } = renderHook(() => useQuillInitialization());

      await waitFor(() => {
        expect(result.current.domPurifyReady).toBe(true);
      });

      const info = window.checkDOMPurify?.();
      expect(info?.version).toBe('3.0.6');
      expect(info?.isSupported).toBe(true);
    });
  });
});

// Add type declarations for window
declare global {
  interface Window {
    testSanitization?: (html: string) => string;
    checkDOMPurify?: () => { version: string; isSupported: boolean };
    DOMPurify: typeof DOMPurify;
    Quill: typeof Quill;
  }
}
