/**
 * @file localHistoryService.ts
 * @description CRUD de minutas no IndexedDB local (sem libs externas).
 */

import type { SavedEmbargos } from '../types';

const DB_NAME = 'sentencify-embargos';
const STORE_NAME = 'minutas';
const VERSION = 1;

const openDB = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  const req = indexedDB.open(DB_NAME, VERSION);
  req.onupgradeneeded = () => {
    const db = req.result;
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      store.createIndex('updatedAt', 'updatedAt', { unique: false });
      store.createIndex('titulo', 'titulo', { unique: false });
    }
  };
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error ?? new Error('Falha ao abrir IndexedDB'));
});

const promisify = <T>(req: IDBRequest<T>): Promise<T> => new Promise((resolve, reject) => {
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error ?? new Error('IDBRequest error'));
});

export async function listMinutas(): Promise<SavedEmbargos[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const all = await promisify(store.getAll() as IDBRequest<SavedEmbargos[]>);
    db.close();
    return all.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (err) {
    console.warn('[embargos] listMinutas falhou:', err);
    return [];
  }
}

export async function getMinuta(id: string): Promise<SavedEmbargos | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const item = await promisify(store.get(id) as IDBRequest<SavedEmbargos | undefined>);
    db.close();
    return item ?? null;
  } catch (err) {
    console.warn('[embargos] getMinuta falhou:', err);
    return null;
  }
}

export async function saveMinuta(record: SavedEmbargos): Promise<void> {
  const db = await openDB();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('saveMinuta tx error'));
      tx.onabort = () => reject(tx.error ?? new Error('saveMinuta tx aborted'));
      tx.objectStore(STORE_NAME).put(record);
    });
  } catch (err) {
    console.warn('[embargos] saveMinuta falhou:', err);
    throw err;
  } finally {
    db.close();
  }
}

export async function deleteMinuta(id: string): Promise<void> {
  const db = await openDB();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('deleteMinuta tx error'));
      tx.onabort = () => reject(tx.error ?? new Error('deleteMinuta tx aborted'));
      tx.objectStore(STORE_NAME).delete(id);
    });
  } catch (err) {
    console.warn('[embargos] deleteMinuta falhou:', err);
    throw err;
  } finally {
    db.close();
  }
}
