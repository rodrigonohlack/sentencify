/**
 * @file indexedDB.ts
 * @description Mock do IndexedDB para testes unitários
 * @usage import 'src/test/mocks/indexedDB' no setup.js
 */

import { vi } from 'vitest';

interface MockStore {
  [key: string]: unknown;
}

interface MockDatabase {
  stores: Record<string, MockStore>;
  name: string;
  version: number;
}

const databases: Record<string, MockDatabase> = {};

class MockIDBRequest<T = unknown> {
  result: T | null = null;
  error: DOMException | null = null;
  onsuccess: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onupgradeneeded: ((event: IDBVersionChangeEvent) => void) | null = null;

  _resolve(result: T): void {
    this.result = result;
    if (this.onsuccess) {
      this.onsuccess(new Event('success'));
    }
  }

  _reject(error: DOMException): void {
    this.error = error;
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }
}

class MockIDBObjectStore {
  private data: MockStore = {};
  name: string;
  keyPath: string | null;

  constructor(name: string, keyPath?: string) {
    this.name = name;
    this.keyPath = keyPath || null;
  }

  put(value: unknown, key?: IDBValidKey): MockIDBRequest {
    const request = new MockIDBRequest();
    const effectiveKey = key || (this.keyPath ? (value as Record<string, unknown>)[this.keyPath] : Date.now());
    this.data[String(effectiveKey)] = value;
    setTimeout(() => request._resolve(effectiveKey), 0);
    return request;
  }

  get(key: IDBValidKey): MockIDBRequest {
    const request = new MockIDBRequest();
    setTimeout(() => request._resolve(this.data[String(key)] || undefined), 0);
    return request;
  }

  getAll(): MockIDBRequest<unknown[]> {
    const request = new MockIDBRequest<unknown[]>();
    setTimeout(() => request._resolve(Object.values(this.data)), 0);
    return request;
  }

  delete(key: IDBValidKey): MockIDBRequest {
    const request = new MockIDBRequest();
    delete this.data[String(key)];
    setTimeout(() => request._resolve(undefined), 0);
    return request;
  }

  clear(): MockIDBRequest {
    const request = new MockIDBRequest();
    this.data = {};
    setTimeout(() => request._resolve(undefined), 0);
    return request;
  }

  count(): MockIDBRequest<number> {
    const request = new MockIDBRequest<number>();
    setTimeout(() => request._resolve(Object.keys(this.data).length), 0);
    return request;
  }

  createIndex(_name: string, _keyPath: string): void {
    // Mock - não implementado
  }
}

class MockIDBTransaction {
  private stores: Record<string, MockIDBObjectStore>;
  oncomplete: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onabort: ((event: Event) => void) | null = null;

  constructor(stores: Record<string, MockIDBObjectStore>) {
    this.stores = stores;
  }

  objectStore(name: string): MockIDBObjectStore {
    if (!this.stores[name]) {
      this.stores[name] = new MockIDBObjectStore(name);
    }
    return this.stores[name];
  }
}

class MockIDBDatabase {
  private stores: Record<string, MockIDBObjectStore> = {};
  name: string;
  version: number;
  objectStoreNames: DOMStringList;

  constructor(name: string, version: number) {
    this.name = name;
    this.version = version;
    const stores = this.stores;
    this.objectStoreNames = {
      length: 0,
      contains: (name: string) => !!stores[name],
      item: (index: number) => Object.keys(stores)[index] || null,
      [Symbol.iterator]: function* () {
        yield* Object.keys(stores);
      },
    } as unknown as DOMStringList;
  }

  createObjectStore(name: string, options?: IDBObjectStoreParameters): MockIDBObjectStore {
    const store = new MockIDBObjectStore(name, options?.keyPath as string);
    this.stores[name] = store;
    return store;
  }

  transaction(storeNames: string | string[], _mode?: IDBTransactionMode): MockIDBTransaction {
    const names = Array.isArray(storeNames) ? storeNames : [storeNames];
    const txStores: Record<string, MockIDBObjectStore> = {};
    names.forEach(name => {
      if (!this.stores[name]) {
        this.stores[name] = new MockIDBObjectStore(name);
      }
      txStores[name] = this.stores[name];
    });
    return new MockIDBTransaction(txStores);
  }

  close(): void {
    // Mock - não implementado
  }
}

export const mockIndexedDB = {
  open: (name: string, version?: number): MockIDBRequest<MockIDBDatabase> => {
    const request = new MockIDBRequest<MockIDBDatabase>();
    const db = new MockIDBDatabase(name, version || 1);

    if (!databases[name] || (databases[name].version < (version || 1))) {
      databases[name] = { stores: {}, name, version: version || 1 };
      setTimeout(() => {
        if (request.onupgradeneeded) {
          request.onupgradeneeded({
            target: { result: db },
            oldVersion: databases[name]?.version || 0,
            newVersion: version || 1,
          } as unknown as IDBVersionChangeEvent);
        }
        request._resolve(db);
      }, 0);
    } else {
      setTimeout(() => request._resolve(db), 0);
    }

    return request;
  },

  deleteDatabase: (name: string): MockIDBRequest => {
    const request = new MockIDBRequest();
    delete databases[name];
    setTimeout(() => request._resolve(undefined), 0);
    return request;
  },
};

// Exportar para uso em testes
export const clearAllMockDatabases = (): void => {
  Object.keys(databases).forEach(key => delete databases[key]);
};

// Setup global para vitest
export const setupIndexedDBMock = (): void => {
  vi.stubGlobal('indexedDB', mockIndexedDB);
};
