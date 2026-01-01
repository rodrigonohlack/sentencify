// 🎣 CUSTOM HOOK: useLocalStorage - Funções de persistência e cache
// Versão simplificada extraída do App.jsx para testes
import React from 'react';

const STORAGE_KEY = 'sentencifySession';
const PDF_CACHE_MAX_SIZE = 5;

/**
 * Hook para gerenciar localStorage e cache de PDFs
 */
const useLocalStorage = () => {
  const [sessionLastSaved, setSessionLastSaved] = React.useState(null);
  
  // Cache LRU para PDFs
  const pdfCacheRef = React.useRef(new Map());
  const pdfCacheOrderRef = React.useRef([]);

  // Adiciona ao cache com eviction LRU
  const addToPdfCache = React.useCallback((key, value) => {
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
  const clearPdfCache = React.useCallback(() => {
    pdfCacheRef.current.clear();
    pdfCacheOrderRef.current = [];
  }, []);

  // Obtém do cache
  const getFromPdfCache = React.useCallback((key) => {
    return pdfCacheRef.current.get(key);
  }, []);

  // Tamanho do cache
  const getPdfCacheSize = React.useCallback(() => {
    return pdfCacheRef.current.size;
  }, []);

  // Salva sessão no localStorage
  const saveSession = React.useCallback((data) => {
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
  const loadSession = React.useCallback(() => {
    try {
      const serialized = localStorage.getItem(STORAGE_KEY);
      if (!serialized) return null;
      return JSON.parse(serialized);
    } catch (e) {
      console.error('Erro ao carregar sessão:', e);
      return null;
    }
  }, []);

  // Limpa sessão
  const clearSession = React.useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    clearPdfCache();
    setSessionLastSaved(null);
  }, [clearPdfCache]);

  // Verifica se existe sessão salva
  const hasSession = React.useCallback(() => {
    return localStorage.getItem(STORAGE_KEY) !== null;
  }, []);

  // Converte base64 para File
  const base64ToFile = React.useCallback((base64, fileName, mimeType = 'application/pdf') => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    return new File([blob], fileName, { type: mimeType });
  }, []);

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
    PDF_CACHE_MAX_SIZE,
  };
};

export { STORAGE_KEY, PDF_CACHE_MAX_SIZE };
export default useLocalStorage;
