/**
 * 🎣 CUSTOM HOOK: useFieldVersioning - Versionamento de campos
 * Extraído do App.jsx para facilitar testes unitários
 *
 * @version 1.35.76 - Migrado para TypeScript
 */
import { useCallback, useMemo } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════

export const VERSION_DB = 'sentencify-versions';
export const VERSION_STORE = 'versions';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

/** Versão armazenada no IndexedDB */
export interface StoredVersion {
  id?: number;
  topicTitle: string;
  content: string;
  timestamp: number;
  preview: string;
}

/** Retorno do hook useFieldVersioning */
export interface UseFieldVersioningReturn {
  saveVersion: (topicTitle: string, content: string) => Promise<void>;
  getVersions: (topicTitle: string) => Promise<StoredVersion[]>;
  restoreVersion: (id: number, currentContent: string, topicTitle: string) => Promise<string | null>;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: Abrir IndexedDB
// ═══════════════════════════════════════════════════════════════════════════

export const openVersionDB = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(VERSION_DB, 1);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(VERSION_STORE)) {
        const store = db.createObjectStore(VERSION_STORE, { keyPath: 'id', autoIncrement: true });
        store.createIndex('topicTitle', 'topicTitle', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

const useFieldVersioning = (): UseFieldVersioningReturn => {
  const stripHtml = (html: string | undefined | null): string =>
    (html || '').replace(/<[^>]*>/g, '').substring(0, 100);

  const saveVersion = useCallback(async (topicTitle: string, content: string): Promise<void> => {
    if (!topicTitle || !content) return;
    try {
      const db = await openVersionDB();
      const tx = db.transaction(VERSION_STORE, 'readwrite');
      const store = tx.objectStore(VERSION_STORE);
      const index = store.index('topicTitle');
      const existing = await new Promise<StoredVersion[]>((r) => {
        const req = index.getAll(topicTitle);
        req.onsuccess = () => r((req.result as StoredVersion[]) || []);
      });
      if (existing.length > 0 && existing[existing.length - 1].content === content) {
        db.close();
        return;
      }
      store.add({
        topicTitle,
        content,
        timestamp: Date.now(),
        preview: stripHtml(content)
      } as StoredVersion);
      if (existing.length >= 10) {
        existing.slice(0, existing.length - 9).forEach((v) => {
          if (v.id !== undefined) store.delete(v.id);
        });
      }
      db.close();
    } catch (e) {
      console.warn('Erro ao salvar versão:', e);
    }
  }, []);

  const getVersions = useCallback(async (topicTitle: string): Promise<StoredVersion[]> => {
    if (!topicTitle) return [];
    try {
      const db = await openVersionDB();
      const store = db.transaction(VERSION_STORE).objectStore(VERSION_STORE);
      const versions = await new Promise<StoredVersion[]>((r) => {
        const req = store.index('topicTitle').getAll(topicTitle);
        req.onsuccess = () => r((req.result as StoredVersion[]) || []);
      });
      db.close();
      return versions.sort((a, b) => b.timestamp - a.timestamp);
    } catch {
      return [];
    }
  }, []);

  const restoreVersion = useCallback(
    async (id: number, currentContent: string, topicTitle: string): Promise<string | null> => {
      await saveVersion(topicTitle, currentContent);
      try {
        const db = await openVersionDB();
        const version = await new Promise<StoredVersion | undefined>((r) => {
          const req = db.transaction(VERSION_STORE).objectStore(VERSION_STORE).get(id);
          req.onsuccess = () => r(req.result as StoredVersion | undefined);
        });
        db.close();
        return version?.content ?? null;
      } catch {
        return null;
      }
    },
    [saveVersion]
  );

  // v1.33.22: useMemo para evitar novo objeto a cada render
  return useMemo(
    () => ({ saveVersion, getVersions, restoreVersion }),
    [saveVersion, getVersions, restoreVersion]
  );
};

export default useFieldVersioning;
