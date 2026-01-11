/**
 * @file useJurisprudencia.ts
 * @description Hook para gestão de precedentes de jurisprudência (Súmulas, OJs, IRRs, etc.)
 * @tier 0 (sem dependências de outros hooks)
 * @extractedFrom App.tsx linhas 5163-5308, 2587-2646, 3897-3898
 * @usedBy App (aba Jurisprudência, JurisprudenciaModal)
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { Precedente, FiltrosJuris } from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════

const JURIS_DB_NAME = 'sentencify-jurisprudencia';
const JURIS_STORE_NAME = 'precedentes';

/**
 * Tipos de IRR (Incidentes de Recursos Repetitivos) para filtro unificado
 */
export const IRR_TYPES = new Set(['IRR', 'RR', 'RRAG', 'INCJULGRREMBREP', 'INCJULGRREPETITIVO']);

/**
 * Tipos de precedentes disponíveis para filtro
 */
export const JURIS_TIPOS_DISPONIVEIS = ['IRR', 'IAC', 'IRDR', 'Súmula', 'OJ', 'RG', 'ADI/ADC/ADPF', 'Informativo'];

/**
 * Tribunais disponíveis para filtro
 */
export const JURIS_TRIBUNAIS_DISPONIVEIS = ['TST', 'STF', 'STJ', 'TRT8'];

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Verifica se o tipo de processo é um IRR (qualquer variante)
 */
export const isIRRType = (tipo: string | null | undefined): boolean =>
  IRR_TYPES.has((tipo || '').toUpperCase().replace(/-/g, ''));

/**
 * Abre conexão com o IndexedDB de jurisprudência
 */
const openJurisDB = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  const request = indexedDB.open(JURIS_DB_NAME, 2);
  request.onerror = () => reject(request.error);
  request.onsuccess = () => resolve(request.result);
  request.onupgradeneeded = (e: IDBVersionChangeEvent) => {
    const db = (e.target as IDBOpenDBRequest).result;
    if (!db.objectStoreNames.contains(JURIS_STORE_NAME)) {
      const store = db.createObjectStore(JURIS_STORE_NAME, { keyPath: 'id' });
      store.createIndex('byCategory', 'category', { unique: false });
      store.createIndex('byTipo', 'tipoProcesso', { unique: false });
      store.createIndex('byTribunal', 'tribunal', { unique: false });
    } else if (e.oldVersion < 2) {
      const store = ((e.target as IDBOpenDBRequest).transaction as IDBTransaction).objectStore(JURIS_STORE_NAME);
      if (!store.indexNames.contains('byTribunal')) {
        store.createIndex('byTribunal', 'tribunal', { unique: false });
      }
    }
  };
});

/**
 * Salva precedentes no IndexedDB
 */
export const savePrecedentesToIndexedDB = async (precedentes: Precedente[]): Promise<void> => {
  const db = await openJurisDB();
  const tx = db.transaction([JURIS_STORE_NAME], 'readwrite');
  const store = tx.objectStore(JURIS_STORE_NAME);
  for (const p of precedentes) store.put(p);
  db.close();
};

/**
 * Carrega todos os precedentes do IndexedDB
 */
export const loadPrecedentesFromIndexedDB = async (): Promise<Precedente[]> => {
  try {
    const db = await openJurisDB();
    const tx = db.transaction([JURIS_STORE_NAME], 'readonly');
    const store = tx.objectStore(JURIS_STORE_NAME);
    const result = await new Promise<Precedente[]>((resolve, reject) => {
      const req = store.getAll() as IDBRequest<Precedente[]>;
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return result;
  } catch { return []; }
};

/**
 * Limpa todos os precedentes do IndexedDB
 */
export const clearPrecedentesFromIndexedDB = async (): Promise<void> => {
  try {
    const db = await openJurisDB();
    const tx = db.transaction([JURIS_STORE_NAME], 'readwrite');
    const store = tx.objectStore(JURIS_STORE_NAME);
    await new Promise<void>((resolve, reject) => {
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    db.close();
  } catch { /* silenciado */ }
};

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

export interface UseJurisprudenciaReturn {
  precedentes: Precedente[];
  searchTerm: string;
  filtros: FiltrosJuris;
  currentPage: number;
  totalPages: number;
  isLoading: boolean;
  paginatedPrecedentes: Precedente[];
  filteredCount: number;
  deleteAllConfirmText: string;
  setDeleteAllConfirmText: (text: string) => void;
  setFiltros: React.Dispatch<React.SetStateAction<FiltrosJuris>>;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  handleSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleImportJSON: (file: File) => Promise<{ success: boolean; count?: number; error?: string }>;
  handleCopyTese: (precedente: Precedente) => Promise<void>;
  handleClearAll: () => Promise<void>;
  reloadPrecedentes: () => Promise<number>;
  copiedId: string | null;
}

/**
 * Hook para gestão de precedentes de jurisprudência
 * Gerencia busca, filtros, paginação, importação e persistência no IndexedDB
 */
export function useJurisprudencia(): UseJurisprudenciaReturn {
  const [precedentes, setPrecedentes] = useState<Precedente[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtros, setFiltros] = useState<FiltrosJuris>({ fonte: [], tipo: [] });
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteAllConfirmText, setDeleteAllConfirmText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const itemsPerPage = 10;
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const removeAccents = useCallback((str: string) =>
    str.normalize('NFD').replace(/[\u0300-\u036f]/g, ''), []);

  const searchPrecedentes = useCallback((term: string) => {
    if (!term?.trim()) return precedentes;
    const normalizedTerm = removeAccents(term.toLowerCase());
    const terms = normalizedTerm.split(/\s+/).filter(t => t.length > 2);
    return precedentes
      .map(p => {
        const teseNorm = removeAccents((p.tese || p.enunciado || '').toLowerCase());
        const keywordsNorm = removeAccents(Array.isArray(p.keywords) ? p.keywords.join(' ').toLowerCase() : (p.keywords || '').toLowerCase());
        const numeroNorm = (p.numeroProcesso || String(p.numero || '') || '').toLowerCase();
        let score = 0;
        for (const t of terms) {
          if (keywordsNorm.includes(t)) score += 10;
          if (teseNorm.includes(t)) score += 5;
          if (numeroNorm.includes(t)) score += 15;
        }
        return { precedente: p, score };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ precedente }) => precedente);
  }, [precedentes, removeAccents]);

  const filteredPrecedentes = useMemo(() => {
    let result = searchTerm ? searchPrecedentes(searchTerm) : precedentes;
    if (filtros.fonte.length > 0) {
      result = result.filter(p => p.category && filtros.fonte.includes(p.category));
    }
    if (filtros.tipo.length > 0) {
      result = result.filter(p => {
        if (!p.tipoProcesso) return false;
        if (filtros.tipo.includes('IRR') && isIRRType(p.tipoProcesso)) return true;
        return filtros.tipo.includes(p.tipoProcesso);
      });
    }
    if (filtros.tribunal && filtros.tribunal.length > 0) {
      const tribunalFilter = filtros.tribunal;
      result = result.filter(p => p.tribunal && tribunalFilter.includes(p.tribunal));
    }
    return result;
  }, [precedentes, searchTerm, filtros, searchPrecedentes]);

  const paginatedPrecedentes = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredPrecedentes.slice(start, start + itemsPerPage);
  }, [filteredPrecedentes, currentPage]);

  const totalPages = Math.ceil(filteredPrecedentes.length / itemsPerPage);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    setCurrentPage(1);
  }, []);

  const handleImportJSON = useCallback(async (file: File) => {
    setIsLoading(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const items = Array.isArray(data) ? data : (data.precedentes || []);
      setPrecedentes(prev => {
        const existingMap = new Map(prev.map(p => [p.id, p]));
        for (const item of items) {
          existingMap.set(item.id, item);
        }
        return Array.from(existingMap.values());
      });
      await savePrecedentesToIndexedDB(items);
      return { success: true, count: items.length };
    } catch (err) {
      return { success: false, error: 'JSON inválido' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleCopyTese = useCallback(async (precedente: Precedente) => {
    const tipo = precedente.tipoProcesso || '';
    const identificador = precedente.tema ? `Tema ${precedente.tema}` : (precedente.numero ? `nº ${precedente.numero}` : '');
    const titulo = precedente.titulo ? `\n${precedente.titulo}` : '';
    // v1.36.52: Adiciona fallback para fullText/texto (embeddings semânticos não têm tese/enunciado)
    const conteudo = precedente.tese || precedente.enunciado || precedente.fullText || precedente.texto || '';
    const texto = `${tipo}${identificador ? ` - ${identificador}` : ''}${titulo}\n${conteudo}`;
    await navigator.clipboard.writeText(texto);
    // v1.36.54: Feedback visual
    setCopiedId(precedente.id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const handleClearAll = useCallback(async () => {
    setPrecedentes([]);
    await clearPrecedentesFromIndexedDB();
  }, []);

  // v1.33.61: Recarregar precedentes do IndexedDB (usado após download automático)
  const reloadPrecedentes = useCallback(async () => {
    const data = await loadPrecedentesFromIndexedDB();
    setPrecedentes(data);
    return data.length;
  }, []);

  // Carregar precedentes na inicialização
  useEffect(() => {
    loadPrecedentesFromIndexedDB().then(setPrecedentes);
  }, []);

  // Cleanup do timeout de busca
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  return {
    precedentes,
    searchTerm,
    filtros,
    currentPage,
    totalPages,
    isLoading,
    paginatedPrecedentes,
    filteredCount: filteredPrecedentes.length,
    deleteAllConfirmText,
    setDeleteAllConfirmText,
    setFiltros,
    setCurrentPage,
    handleSearchChange,
    handleImportJSON,
    handleCopyTese,
    handleClearAll,
    reloadPrecedentes,
    copiedId
  };
}
