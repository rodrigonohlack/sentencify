/**
 * 🎣 CUSTOM HOOK: useLocalStorage - Funções de persistência e cache
 * Versão simplificada extraída do App.jsx para testes
 *
 * @version 1.35.76 - Migrado para TypeScript
 */
import { useState, useCallback, useRef } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════

export const STORAGE_KEY = 'sentencifySession';
export const PDF_CACHE_MAX_SIZE = 5;

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

/** Valor armazenado no cache de PDFs (texto extraído) */
export type PdfCacheValue = string;

/** Dados de sessão (estrutura flexível, tipagem refinada no App.tsx) */
export interface SessionData {
  [key: string]: unknown;
}

/** Retorno do hook useLocalStorage */
export interface UseLocalStorageReturn {
  sessionLastSaved: Date | null;
  addToPdfCache: (key: string, value: PdfCacheValue) => void;
  getFromPdfCache: (key: string) => PdfCacheValue | undefined;
  clearPdfCache: () => void;
  getPdfCacheSize: () => number;
  saveSession: (data: SessionData) => boolean;
  loadSession: () => SessionData | null;
  clearSession: () => void;
  hasSession: () => boolean;
  base64ToFile: (base64: string, fileName: string, mimeType?: string) => File;
  PDF_CACHE_MAX_SIZE: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook para gerenciar localStorage e cache de PDFs
 */
const useLocalStorage = (): UseLocalStorageReturn => {
  const [sessionLastSaved, setSessionLastSaved] = useState<Date | null>(null);

  // Cache LRU para PDFs
  const pdfCacheRef = useRef<Map<string, PdfCacheValue>>(new Map());
  const pdfCacheOrderRef = useRef<string[]>([]);

  // Adiciona ao cache com eviction LRU
  const addToPdfCache = useCallback((key: string, value: PdfCacheValue): void => {
    if (pdfCacheRef.current.has(key)) {
      pdfCacheRef.current.set(key, value);
      return;
    }
    // Eviction: remove mais antigo se cache cheio
    while (pdfCacheRef.current.size >= PDF_CACHE_MAX_SIZE) {
      const oldestKey = pdfCacheOrderRef.current.shift();
      if (oldestKey) pdfCacheRef.current.delete(oldestKey);
    }
    pdfCacheRef.current.set(key, value);
    pdfCacheOrderRef.current.push(key);
  }, []);

  // Limpa cache
  const clearPdfCache = useCallback((): void => {
    pdfCacheRef.current.clear();
    pdfCacheOrderRef.current = [];
  }, []);

  // Obtém do cache
  const getFromPdfCache = useCallback((key: string): PdfCacheValue | undefined => {
    return pdfCacheRef.current.get(key);
  }, []);

  // Tamanho do cache
  const getPdfCacheSize = useCallback((): number => {
    return pdfCacheRef.current.size;
  }, []);

  // Salva sessão no localStorage
  const saveSession = useCallback((data: SessionData): boolean => {
    try {
      const serialized = JSON.stringify(data);
      localStorage.setItem(STORAGE_KEY, serialized);
      setSessionLastSaved(new Date());
      return true;
    } catch (e) {
      console.error('Erro ao salvar sessão:', e);
      return false;
    }
  }, []);

  // Carrega sessão do localStorage
  const loadSession = useCallback((): SessionData | null => {
    try {
      const serialized = localStorage.getItem(STORAGE_KEY);
      if (!serialized) return null;
      return JSON.parse(serialized) as SessionData;
    } catch (e) {
      console.error('Erro ao carregar sessão:', e);
      return null;
    }
  }, []);

  // Limpa sessão
  const clearSession = useCallback((): void => {
    localStorage.removeItem(STORAGE_KEY);
    clearPdfCache();
    setSessionLastSaved(null);
  }, [clearPdfCache]);

  // Verifica se existe sessão salva
  const hasSession = useCallback((): boolean => {
    return localStorage.getItem(STORAGE_KEY) !== null;
  }, []);

  // Converte base64 para File
  const base64ToFile = useCallback(
    (base64: string, fileName: string, mimeType: string = 'application/pdf'): File => {
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });
      return new File([blob], fileName, { type: mimeType });
    },
    []
  );

  return {
    sessionLastSaved,
    addToPdfCache,
    getFromPdfCache,
    clearPdfCache,
    getPdfCacheSize,
    saveSession,
    loadSession,
    clearSession,
    hasSession,
    base64ToFile,
    PDF_CACHE_MAX_SIZE
  };
};

export default useLocalStorage;
