/**
 * @file useLegislacao.ts
 * @description Hook para gestão de artigos de legislação (CLT, CPC, CF88, etc.)
 * @tier 0 (sem dependências de outros hooks)
 * @extractedFrom App.tsx linhas 5410-5587, 2652-2746
 * @usedBy App (aba Legislação)
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import type { Artigo } from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════

const LEGIS_DB_NAME = 'sentencify-legislacao';
const LEGIS_STORE_NAME = 'artigos';

/**
 * Metadata das leis disponíveis no sistema
 */
export const LEIS_METADATA: Record<string, { nome: string; nomeCompleto: string; numero: string }> = {
  'clt': { nome: 'CLT', nomeCompleto: 'Consolidação das Leis do Trabalho', numero: 'Decreto-Lei 5.452/1943' },
  'cpc': { nome: 'CPC', nomeCompleto: 'Código de Processo Civil', numero: 'Lei 13.105/2015' },
  'cf88': { nome: 'CF/88', nomeCompleto: 'Constituição Federal de 1988', numero: 'Constituição Federal' },
  'cc': { nome: 'CC', nomeCompleto: 'Código Civil', numero: 'Lei 10.406/2002' },
  'cdc': { nome: 'CDC', nomeCompleto: 'Código de Defesa do Consumidor', numero: 'Lei 8.078/1990' },
  'l605': { nome: 'Lei 605', nomeCompleto: 'Repouso Semanal Remunerado', numero: 'Lei 605/1949' },
  'l6019': { nome: 'Lei 6.019', nomeCompleto: 'Trabalho Temporário', numero: 'Lei 6.019/1974' },
  'l9029': { nome: 'Lei 9.029', nomeCompleto: 'Práticas Discriminatórias', numero: 'Lei 9.029/1995' }
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Obtém metadata de uma lei a partir do ID do artigo
 */
export const getLeiFromId = (id: string): { nome: string; nomeCompleto: string; numero: string } => {
  const prefix = id?.split('-art-')[0] || id?.split('-')[0];
  return LEIS_METADATA[prefix] || { nome: prefix?.toUpperCase() || '?', nomeCompleto: prefix || '', numero: '' };
};

/**
 * Abre conexão com o IndexedDB de legislação
 */
const openLegisDB = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  const request = indexedDB.open(LEGIS_DB_NAME, 1);
  request.onerror = () => reject(request.error);
  request.onsuccess = () => resolve(request.result);
  request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
    const db = (event.target as IDBOpenDBRequest).result;
    if (!db.objectStoreNames.contains(LEGIS_STORE_NAME)) {
      const store = db.createObjectStore(LEGIS_STORE_NAME, { keyPath: 'id' });
      store.createIndex('byLei', 'lei', { unique: false });
      store.createIndex('byNumero', 'numero', { unique: false });
    }
  };
});

/**
 * Salva artigos no IndexedDB
 */
export const saveArtigosToIndexedDB = async (artigos: Artigo[]): Promise<void> => {
  try {
    const db = await openLegisDB();
    const tx = db.transaction([LEGIS_STORE_NAME], 'readwrite');
    const store = tx.objectStore(LEGIS_STORE_NAME);
    for (const artigo of artigos) {
      const lei = artigo.id?.split('-art-')[0] || artigo.id?.split('-')[0];
      store.put({ ...artigo, lei });
    }
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (err) {
    console.error('Erro ao salvar artigos:', err);
  }
};

/**
 * Carrega todos os artigos do IndexedDB
 */
export const loadArtigosFromIndexedDB = async (): Promise<Artigo[]> => {
  try {
    const db = await openLegisDB();
    const tx = db.transaction([LEGIS_STORE_NAME], 'readonly');
    const store = tx.objectStore(LEGIS_STORE_NAME);
    const result = await new Promise<Artigo[]>((resolve, reject) => {
      const req = store.getAll() as IDBRequest<Artigo[]>;
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return result;
  } catch {
    return [];
  }
};

/**
 * Limpa todos os artigos do IndexedDB
 */
export const clearArtigosFromIndexedDB = async (): Promise<void> => {
  try {
    const db = await openLegisDB();
    const tx = db.transaction([LEGIS_STORE_NAME], 'readwrite');
    const store = tx.objectStore(LEGIS_STORE_NAME);
    await new Promise<void>((resolve, reject) => {
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    db.close();
  } catch {
    /* silenciado */
  }
};

/**
 * Ordena artigos em ordem natural (lei, número, sufixo)
 */
export const sortArtigosNatural = (artigos: Artigo[]): Artigo[] => {
  return [...artigos].sort((a, b) => {
    const parseId = (id: string) => {
      const match = id.match(/^(.+)-art-(\d+)(?:-([a-z]))?$/i);
      if (!match) return { lei: id, num: 0, suffix: '' };
      return { lei: match[1], num: parseInt(match[2]), suffix: match[3] || '' };
    };
    const pa = parseId(a.id);
    const pb = parseId(b.id);
    if (pa.lei !== pb.lei) return pa.lei.localeCompare(pb.lei);
    if (pa.num !== pb.num) return pa.num - pb.num;
    return pa.suffix.localeCompare(pb.suffix);
  });
};

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

export interface UseLegislacaoReturn {
  artigos: Artigo[];
  leisDisponiveis: string[];
  leiAtiva: string | null;
  setLeiAtiva: (lei: string | null) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  totalPages: number;
  isLoading: boolean;
  filteredArtigos: Artigo[];
  paginatedArtigos: Artigo[];
  filteredCount: number;
  deleteConfirmText: string;
  setDeleteConfirmText: (text: string) => void;
  copiedId: string | null;
  handleImportJSON: (file: File) => Promise<{ success: boolean; count?: number; error?: string }>;
  handleCopyArtigo: (artigo: Artigo) => Promise<boolean>;
  handleClearAll: () => Promise<void>;
  reloadArtigos: () => Promise<number>;
}

/**
 * Hook para gestão de artigos de legislação
 * Gerencia busca, paginação, importação e persistência no IndexedDB
 */
export function useLegislacao(): UseLegislacaoReturn {
  const [artigos, setArtigos] = useState<Artigo[]>([]);
  const [leisDisponiveis, setLeisDisponiveis] = useState<string[]>([]);
  const [leiAtiva, setLeiAtiva] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const ITEMS_PER_PAGE = 15;

  const removeAccents = useCallback((str: string) => {
    return str?.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() || '';
  }, []);

  const searchArtigos = useCallback((term: string, lista: Artigo[]) => {
    if (!term?.trim()) return lista;
    const termNorm = removeAccents(term.trim());
    const terms = termNorm.split(/\s+/).filter(t => t.length > 1);
    const numeroMatch = term.match(/\d+[º°]?(?:-[a-z])?/i);

    return lista.map((artigo: Artigo) => {
      let score = 0;
      const caputNorm = removeAccents(artigo.caput || '');
      const numeroNorm = removeAccents(artigo.numero || '');
      const keywordsArr = Array.isArray(artigo.keywords) ? artigo.keywords : (artigo.keywords ? [artigo.keywords] : []);
      const keywordsNorm = keywordsArr.map((k: string) => removeAccents(k));
      // v1.21.1: Buscar também em parágrafos, incisos e alíneas
      const paragrafosText = (artigo.paragrafos || []).map((p: { texto?: string }) => p.texto || '').join(' ');
      const incisosText = (artigo.incisos || []).map((i: { texto?: string }) => i.texto || '').join(' ');
      const alineasText = (artigo.alineas || []).map((a: { texto?: string }) => a.texto || '').join(' ');
      const subTextoNorm = removeAccents(paragrafosText + ' ' + incisosText + ' ' + alineasText);

      if (numeroMatch && numeroNorm.includes(removeAccents(numeroMatch[0]))) {
        score += 50;
      }

      for (const t of terms) {
        if (keywordsNorm.some((k: string) => k.includes(t))) score += 15;
        if (caputNorm.includes(t)) score += 10;
        if (subTextoNorm.includes(t)) score += 8; // parágrafos, incisos, alíneas
        if (numeroNorm === t) score += 30;
      }

      return { artigo, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a: { score: number }, b: { score: number }) => b.score - a.score)
    .map(({ artigo }) => artigo);
  }, [removeAccents]);

  const filteredArtigos = useMemo(() => {
    let result = artigos;
    if (leiAtiva) {
      result = result.filter(a => a.lei === leiAtiva || a.id?.startsWith(leiAtiva + '-'));
    }
    if (searchTerm?.trim()) {
      result = searchArtigos(searchTerm, result);
    }
    return result;
  }, [artigos, leiAtiva, searchTerm, searchArtigos]);

  const totalPages = Math.ceil(filteredArtigos.length / ITEMS_PER_PAGE);

  const paginatedArtigos = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredArtigos.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredArtigos, currentPage]);

  const handleImportJSON = useCallback(async (file: File) => {
    setIsLoading(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const items = Array.isArray(data) ? data : (data.artigos || []);

      if (items.length === 0) {
        throw new Error('Arquivo não contém artigos válidos');
      }

      await saveArtigosToIndexedDB(items);
      const allArtigos = await loadArtigosFromIndexedDB();
      setArtigos(sortArtigosNatural(allArtigos));

      const leis = [...new Set(allArtigos.map(a => a.lei || a.id?.split('-art-')[0] || a.id?.split('-')[0]))].filter(Boolean) as string[];
      setLeisDisponiveis(leis.sort());
      setCurrentPage(1);

      return { success: true, count: items.length };
    } catch (err) {
      console.error('Erro ao importar JSON:', err);
      return { success: false, error: (err as Error).message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleCopyArtigo = useCallback(async (artigo: Artigo) => {
    try {
      const lei = getLeiFromId(artigo.id);
      let texto = `Art. ${artigo.numero} - ${lei.nome}\n${artigo.caput}`;

      if (artigo.paragrafos && artigo.paragrafos.length > 0) {
        texto += '\n';
        for (const p of artigo.paragrafos) {
          texto += `\n§ ${p.numero}º ${p.texto}`;
        }
      }

      if (artigo.incisos && artigo.incisos.length > 0) {
        texto += '\n';
        for (const inc of artigo.incisos) {
          texto += `\n${inc.numero} - ${inc.texto}`;
        }
      }

      await navigator.clipboard.writeText(texto);
      setCopiedId(artigo.id);
      setTimeout(() => setCopiedId(null), 2000);
      return true;
    } catch (err) {
      console.error('Erro ao copiar:', err);
      return false;
    }
  }, []);

  const handleClearAll = useCallback(async () => {
    setArtigos([]);
    setLeisDisponiveis([]);
    setDeleteConfirmText('');
    await clearArtigosFromIndexedDB();
  }, []);

  // v1.33.61: Recarregar artigos do IndexedDB (usado após download automático)
  const reloadArtigos = useCallback(async () => {
    const data = await loadArtigosFromIndexedDB();
    setArtigos(sortArtigosNatural(data));
    const leis = [...new Set(data.map(a => a.lei || a.id?.split('-art-')[0] || a.id?.split('-')[0]))].filter(Boolean) as string[];
    setLeisDisponiveis(leis.sort());
    return data.length;
  }, []);

  // Carregar artigos na inicialização
  useEffect(() => {
    loadArtigosFromIndexedDB().then(data => {
      setArtigos(sortArtigosNatural(data));
      const leis = [...new Set(data.map(a => a.lei || a.id?.split('-art-')[0] || a.id?.split('-')[0]))].filter(Boolean) as string[];
      setLeisDisponiveis(leis.sort());
    });
  }, []);

  // Reset página ao mudar filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, leiAtiva]);

  return {
    artigos,
    leisDisponiveis,
    leiAtiva,
    setLeiAtiva,
    searchTerm,
    setSearchTerm,
    currentPage,
    setCurrentPage,
    totalPages,
    isLoading,
    filteredArtigos,
    paginatedArtigos,
    filteredCount: filteredArtigos.length,
    deleteConfirmText,
    setDeleteConfirmText,
    copiedId,
    handleImportJSON,
    handleCopyArtigo,
    handleClearAll,
    reloadArtigos
  };
}
