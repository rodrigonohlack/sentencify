/**
 * @file useFieldVersioning.ts
 * @description Hook para versionamento de campos (histórico de edições)
 * @tier 0 (sem dependências)
 * @extractedFrom App.tsx linhas 3407-3464
 * @usedBy VersionSelect, GlobalEditorModal
 */

import { useCallback, useMemo } from 'react';
import type { FieldVersion } from '../types';

// === VERSIONAMENTO DE CAMPOS ===
export const VERSION_DB = 'sentencify-versions';
export const VERSION_STORE = 'versions';

export const openVersionDB = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  const req = indexedDB.open(VERSION_DB, 1);
  req.onerror = () => reject(req.error);
  req.onsuccess = () => resolve(req.result);
  req.onupgradeneeded = (e: IDBVersionChangeEvent) => {
    const db = (e.target as IDBOpenDBRequest).result;
    if (!db.objectStoreNames.contains(VERSION_STORE)) {
      db.createObjectStore(VERSION_STORE, { keyPath: 'id', autoIncrement: true })
        .createIndex('topicTitle', 'topicTitle');
    }
  };
});

export interface UseFieldVersioningReturn {
  saveVersion: (topicTitle: string, content: string) => Promise<void>;
  getVersions: (topicTitle: string) => Promise<FieldVersion[]>;
  restoreVersion: (id: number, currentContent: string, topicTitle: string) => Promise<string | null>;
}

/**
 * Hook para gerenciamento de versões de campos de texto
 * Salva automaticamente versões anteriores e permite restaurar
 *
 * @returns Objeto com saveVersion, getVersions e restoreVersion
 */
export function useFieldVersioning(): UseFieldVersioningReturn {
  const stripHtml = (html: string | null | undefined): string =>
    (html || '').replace(/<[^>]*>/g, '').substring(0, 100);

  const saveVersion = useCallback(async (topicTitle: string, content: string): Promise<void> => {
    if (!topicTitle || !content) return;
    try {
      const db = await openVersionDB();
      const tx = db.transaction(VERSION_STORE, 'readwrite');
      const store = tx.objectStore(VERSION_STORE);
      const index = store.index('topicTitle');
      const existing = await new Promise<FieldVersion[]>(r => {
        const req = index.getAll(topicTitle);
        req.onsuccess = () => r(req.result || []);
      });
      if (existing.length > 0 && existing[existing.length - 1].content === content) {
        db.close(); return;
      }
      store.add({ topicTitle, content, timestamp: Date.now(), preview: stripHtml(content) });
      if (existing.length >= 10) {
        existing.slice(0, existing.length - 9).forEach((v: FieldVersion) => store.delete(v.id));
      }
      db.close();
    } catch (e) { console.warn('Erro ao salvar versão:', e); }
  }, []);

  const getVersions = useCallback(async (topicTitle: string): Promise<FieldVersion[]> => {
    if (!topicTitle) return [];
    try {
      const db = await openVersionDB();
      const store = db.transaction(VERSION_STORE).objectStore(VERSION_STORE);
      const versions = await new Promise(r => {
        const req = store.index('topicTitle').getAll(topicTitle);
        req.onsuccess = () => r(req.result || []);
      });
      db.close();
      return (versions as FieldVersion[]).sort((a: FieldVersion, b: FieldVersion) => b.timestamp - a.timestamp);
    } catch { return []; }
  }, []);

  const restoreVersion = useCallback(async (id: number, currentContent: string, topicTitle: string): Promise<string | null> => {
    await saveVersion(topicTitle, currentContent);
    try {
      const db = await openVersionDB();
      const version = await new Promise<FieldVersion | undefined>(r => {
        const req = db.transaction(VERSION_STORE).objectStore(VERSION_STORE).get(id);
        req.onsuccess = () => r(req.result as FieldVersion | undefined);
      });
      db.close();
      return version?.content ?? null;
    } catch { return null; }
  }, [saveVersion]);

  // v1.33.22: useMemo para evitar novo objeto a cada render (causa infinite loop em VersionSelect)
  return useMemo(
    () => ({ saveVersion, getVersions, restoreVersion }),
    [saveVersion, getVersions, restoreVersion]
  );
}
