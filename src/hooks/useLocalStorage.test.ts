import { describe, it, expect, beforeEach } from 'vitest';
import { savePdfToIndexedDB, convertFileWithFallback } from './useLocalStorage';

// fake-indexeddb is configured in setup.js

/**
 * Helper: creates a File with a working arrayBuffer() method for jsdom
 */
function createMockFile(content: string, name: string, type = 'application/pdf'): File {
  const encoder = new TextEncoder();
  const buffer = encoder.encode(content).buffer;
  const file = new File([content], name, { type });
  // jsdom File doesn't implement arrayBuffer, so we override
  file.arrayBuffer = () => Promise.resolve(buffer);
  return file;
}

beforeEach(async () => {
  // Clear IndexedDB databases
  const databases = await indexedDB.databases();
  for (const db of databases) {
    if (db.name) indexedDB.deleteDatabase(db.name);
  }
});

describe('savePdfToIndexedDB', () => {
  it('should save a PDF file to IndexedDB', async () => {
    const file = createMockFile('pdf content here', 'test.pdf');

    await savePdfToIndexedDB('upload-0', file, 'peticao');

    // Verify by reading from IndexedDB directly
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('sentencify-pdfs', 1);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    const tx = db.transaction('pdfs', 'readonly');
    const store = tx.objectStore('pdfs');
    const record = await new Promise<unknown>((resolve) => {
      const req = store.get('upload-0');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });

    expect(record).not.toBeNull();
    expect((record as { fileName: string }).fileName).toBe('test.pdf');
    expect((record as { type: string }).type).toBe('peticao');
    db.close();
  });

  it('should store file metadata correctly', async () => {
    const file = createMockFile('abc', 'doc.pdf');

    await savePdfToIndexedDB('proof-123', file, 'proof');

    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('sentencify-pdfs', 1);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    const tx = db.transaction('pdfs', 'readonly');
    const store = tx.objectStore('pdfs');
    const record = await new Promise<unknown>((resolve) => {
      const req = store.get('proof-123');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });

    const rec = record as { id: string; fileName: string; fileSize: number; mimeType: string; savedAt: number };
    expect(rec.id).toBe('proof-123');
    expect(rec.fileName).toBe('doc.pdf');
    expect(rec.mimeType).toBe('application/pdf');
    expect(rec.savedAt).toBeGreaterThan(0);
    db.close();
  });

  it('should not throw when saving multiple files sequentially', async () => {
    const file1 = createMockFile('a', 'a.pdf');
    const file2 = createMockFile('b', 'b.pdf');

    // Both should resolve without throwing
    await expect(savePdfToIndexedDB('id-1', file1, 'peticao')).resolves.not.toThrow();
    await expect(savePdfToIndexedDB('id-2', file2, 'contestacao')).resolves.not.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// convertFileWithFallback (v1.52.28)
// ═══════════════════════════════════════════════════════════════════════════
//
// Regression: ao salvar no Drive, um File lastreado no disco (anexado via
// <input>/drag-drop) cujo arquivo no disco foi movido/alterado torna a leitura
// (FileReader) impossível. Antes, isso quebrava o save inteiro e exigia refresh.
// Esta função tenta o File primário e, se a leitura falhar, faz fallback para a
// cópia estável persistida no IndexedDB.
describe('convertFileWithFallback', () => {
  const primaryFile = createMockFile('primary', 'primary.pdf');
  const fallbackFile = createMockFile('fallback', 'fallback.pdf');

  it('usa o File primário quando a leitura funciona (sem tocar no fallback)', async () => {
    let fallbackCalled = false;
    const fetchFallback = async () => {
      fallbackCalled = true;
      return fallbackFile;
    };
    const toBase64 = async (f: File) => (f === primaryFile ? 'PRIMARY' : 'OTHER');

    const result = await convertFileWithFallback(primaryFile, fetchFallback, toBase64);

    expect(result).toBe('PRIMARY');
    expect(fallbackCalled).toBe(false);
  });

  it('faz fallback para o IndexedDB quando a leitura do File primário falha', async () => {
    const fetchFallback = async () => fallbackFile;
    const toBase64 = async (f: File) => {
      if (f === primaryFile) throw new Error('disco stale');
      return 'FALLBACK';
    };

    const result = await convertFileWithFallback(primaryFile, fetchFallback, toBase64);

    expect(result).toBe('FALLBACK');
  });

  it('propaga o erro original quando não há cópia no IndexedDB', async () => {
    const original = new Error('Falha ao ler o arquivo "primary.pdf".');
    const fetchFallback = async () => null;
    const toBase64 = async () => {
      throw original;
    };

    await expect(
      convertFileWithFallback(primaryFile, fetchFallback, toBase64)
    ).rejects.toBe(original);
  });

  it('propaga o erro original (não o do fallback) quando a busca no IndexedDB também falha', async () => {
    const original = new Error('erro de leitura do disco');
    const fetchFallback = async () => {
      throw new Error('IndexedDB indisponível');
    };
    const toBase64 = async () => {
      throw original;
    };

    await expect(
      convertFileWithFallback(primaryFile, fetchFallback, toBase64)
    ).rejects.toBe(original);
  });
});
