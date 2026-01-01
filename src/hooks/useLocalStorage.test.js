// Testes para useLocalStorage
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useLocalStorage, { STORAGE_KEY, PDF_CACHE_MAX_SIZE } from './useLocalStorage';

describe('useLocalStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('Sessão (localStorage)', () => {
    it('deve salvar sessão no localStorage', () => {
      const { result } = renderHook(() => useLocalStorage());
      const data = { topics: ['DANOS MORAIS'], version: '1.0' };

      act(() => {
        result.current.saveSession(data);
      });

      const saved = localStorage.getItem(STORAGE_KEY);
      expect(saved).toBe(JSON.stringify(data));
    });

    it('deve carregar sessão do localStorage', () => {
      const data = { topics: ['HORAS EXTRAS'], config: { theme: 'dark' } };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

      const { result } = renderHook(() => useLocalStorage());
      const loaded = result.current.loadSession();

      expect(loaded).toEqual(data);
    });

    it('deve retornar null se não houver sessão', () => {
      const { result } = renderHook(() => useLocalStorage());
      const loaded = result.current.loadSession();

      expect(loaded).toBeNull();
    });

    it('deve verificar se existe sessão (hasSession)', () => {
      const { result } = renderHook(() => useLocalStorage());
      
      expect(result.current.hasSession()).toBe(false);
      
      localStorage.setItem(STORAGE_KEY, '{}');
      expect(result.current.hasSession()).toBe(true);
    });

    it('deve limpar sessão (clearSession)', () => {
      localStorage.setItem(STORAGE_KEY, '{"test": true}');
      const { result } = renderHook(() => useLocalStorage());

      act(() => {
        result.current.clearSession();
      });

      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it('deve atualizar sessionLastSaved ao salvar', () => {
      const { result } = renderHook(() => useLocalStorage());
      
      expect(result.current.sessionLastSaved).toBeNull();

      act(() => {
        result.current.saveSession({ test: true });
      });

      expect(result.current.sessionLastSaved).toBeInstanceOf(Date);
    });

    it('deve retornar null se JSON inválido', () => {
      localStorage.setItem(STORAGE_KEY, 'invalid json {{{');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const { result } = renderHook(() => useLocalStorage());
      const loaded = result.current.loadSession();

      expect(loaded).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Cache LRU de PDFs', () => {
    it('deve adicionar item ao cache', () => {
      const { result } = renderHook(() => useLocalStorage());

      act(() => {
        result.current.addToPdfCache('pdf-1', 'base64data1');
      });

      expect(result.current.getFromPdfCache('pdf-1')).toBe('base64data1');
      expect(result.current.getPdfCacheSize()).toBe(1);
    });

    it('deve atualizar item existente no cache', () => {
      const { result } = renderHook(() => useLocalStorage());

      act(() => {
        result.current.addToPdfCache('pdf-1', 'original');
        result.current.addToPdfCache('pdf-1', 'updated');
      });

      expect(result.current.getFromPdfCache('pdf-1')).toBe('updated');
      expect(result.current.getPdfCacheSize()).toBe(1);
    });

    it('deve limitar cache ao tamanho máximo (LRU eviction)', () => {
      const { result } = renderHook(() => useLocalStorage());

      act(() => {
        for (let i = 1; i <= PDF_CACHE_MAX_SIZE + 2; i++) {
          result.current.addToPdfCache('pdf-' + i, 'data-' + i);
        }
      });

      expect(result.current.getPdfCacheSize()).toBe(PDF_CACHE_MAX_SIZE);
      expect(result.current.getFromPdfCache('pdf-1')).toBeUndefined();
      expect(result.current.getFromPdfCache('pdf-2')).toBeUndefined();
      expect(result.current.getFromPdfCache('pdf-' + (PDF_CACHE_MAX_SIZE + 2))).toBeDefined();
    });

    it('deve limpar cache completamente', () => {
      const { result } = renderHook(() => useLocalStorage());

      act(() => {
        result.current.addToPdfCache('pdf-1', 'data1');
        result.current.addToPdfCache('pdf-2', 'data2');
        result.current.clearPdfCache();
      });

      expect(result.current.getPdfCacheSize()).toBe(0);
    });

    it('clearSession deve limpar cache de PDFs também', () => {
      const { result } = renderHook(() => useLocalStorage());

      act(() => {
        result.current.addToPdfCache('pdf-1', 'data1');
        result.current.clearSession();
      });

      expect(result.current.getPdfCacheSize()).toBe(0);
    });
  });

  describe('Conversão base64', () => {
    it('deve converter base64 para File', () => {
      const { result } = renderHook(() => useLocalStorage());
      const base64 = btoa('Hello World');
      
      const file = result.current.base64ToFile(base64, 'test.pdf', 'application/pdf');
      
      expect(file).toBeInstanceOf(File);
      expect(file.name).toBe('test.pdf');
      expect(file.type).toBe('application/pdf');
    });

    it('deve usar mime type padrão application/pdf', () => {
      const { result } = renderHook(() => useLocalStorage());
      const base64 = btoa('Test');
      
      const file = result.current.base64ToFile(base64, 'doc.pdf');
      
      expect(file.type).toBe('application/pdf');
    });
  });

  describe('Constantes exportadas', () => {
    it('deve exportar STORAGE_KEY correto', () => {
      expect(STORAGE_KEY).toBe('sentencifySession');
    });

    it('deve exportar PDF_CACHE_MAX_SIZE correto', () => {
      expect(PDF_CACHE_MAX_SIZE).toBe(5);
    });
  });
});
