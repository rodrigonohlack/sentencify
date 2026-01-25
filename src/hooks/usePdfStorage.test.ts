/**
 * @file usePdfStorage.test.ts
 * @description Testes para o hook usePdfStorage (IndexedDB operations)
 * @version 1.38.52
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import {
  savePdfToIndexedDB,
  getPdfFromIndexedDB,
  removePdfFromIndexedDB,
  clearAllPdfsFromIndexedDB,
  getAttachmentIndexedDBKey,
  saveAttachmentToIndexedDB,
  getAttachmentFromIndexedDB,
  removeAttachmentFromIndexedDB,
  removeAllAttachmentsFromIndexedDB,
  PDF_DB_NAME,
} from './usePdfStorage';

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Creates a mock File object for testing
 * In Node.js test environment, File doesn't have arrayBuffer method,
 * so we add it manually
 */
const createMockFile = (name: string, content: string, type = 'application/pdf'): File => {
  const blob = new Blob([content], { type });
  const file = new File([blob], name, { type });

  // Add arrayBuffer method for Node.js test environment
  if (!file.arrayBuffer) {
    (file as File & { arrayBuffer: () => Promise<ArrayBuffer> }).arrayBuffer = async () => {
      const reader = new FileReader();
      return new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = reject;
        reader.readAsArrayBuffer(blob);
      });
    };
  }

  return file;
};

/**
 * Clears the IndexedDB database between tests
 */
const clearDatabase = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(PDF_DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// ═══════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('usePdfStorage', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // savePdfToIndexedDB
  // ═══════════════════════════════════════════════════════════════════════════

  describe('savePdfToIndexedDB', () => {
    it('should save a PDF file to IndexedDB', async () => {
      const file = createMockFile('test.pdf', 'PDF content here');
      const id = 'upload-1';

      await savePdfToIndexedDB(id, file, 'upload');

      // Verify file was saved by retrieving it
      const retrieved = await getPdfFromIndexedDB(id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.name).toBe('test.pdf');
    });

    it('should save a file with correct metadata', async () => {
      const file = createMockFile('document.pdf', 'Test content', 'application/pdf');
      const id = 'proof-123';

      await savePdfToIndexedDB(id, file, 'proof');

      const retrieved = await getPdfFromIndexedDB(id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.type).toBe('application/pdf');
      expect(retrieved?.name).toBe('document.pdf');
    });

    it('should overwrite existing file with same id', async () => {
      const file1 = createMockFile('first.pdf', 'First content');
      const file2 = createMockFile('second.pdf', 'Second content');
      const id = 'upload-1';

      await savePdfToIndexedDB(id, file1, 'upload');
      await savePdfToIndexedDB(id, file2, 'upload');

      const retrieved = await getPdfFromIndexedDB(id);
      expect(retrieved?.name).toBe('second.pdf');
    });

    it('should handle multiple files with different ids', async () => {
      const file1 = createMockFile('doc1.pdf', 'Content 1');
      const file2 = createMockFile('doc2.pdf', 'Content 2');

      await savePdfToIndexedDB('id-1', file1, 'upload');
      await savePdfToIndexedDB('id-2', file2, 'upload');

      const retrieved1 = await getPdfFromIndexedDB('id-1');
      const retrieved2 = await getPdfFromIndexedDB('id-2');

      expect(retrieved1?.name).toBe('doc1.pdf');
      expect(retrieved2?.name).toBe('doc2.pdf');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // getPdfFromIndexedDB
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getPdfFromIndexedDB', () => {
    it('should retrieve a saved PDF file', async () => {
      const file = createMockFile('test.pdf', 'PDF content');
      const id = 'upload-1';

      await savePdfToIndexedDB(id, file, 'upload');
      const retrieved = await getPdfFromIndexedDB(id);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.name).toBe('test.pdf');
      expect(retrieved?.type).toBe('application/pdf');
    });

    it('should return null if file does not exist', async () => {
      const retrieved = await getPdfFromIndexedDB('non-existent-id');
      expect(retrieved).toBeNull();
    });

    it('should reconstruct File with correct properties', async () => {
      const content = 'Test PDF content for size verification';
      const file = createMockFile('size-test.pdf', content);
      const id = 'size-test-id';

      await savePdfToIndexedDB(id, file, 'upload');
      const retrieved = await getPdfFromIndexedDB(id);

      expect(retrieved).not.toBeNull();
      expect(retrieved!.size).toBeGreaterThan(0);
      expect(retrieved!.name).toBe('size-test.pdf');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // removePdfFromIndexedDB
  // ═══════════════════════════════════════════════════════════════════════════

  describe('removePdfFromIndexedDB', () => {
    it('should remove a specific PDF file', async () => {
      const file = createMockFile('to-delete.pdf', 'Content');
      const id = 'delete-me';

      await savePdfToIndexedDB(id, file, 'upload');

      // Verify it exists
      let retrieved = await getPdfFromIndexedDB(id);
      expect(retrieved).not.toBeNull();

      // Remove it
      await removePdfFromIndexedDB(id);

      // Verify it's gone
      retrieved = await getPdfFromIndexedDB(id);
      expect(retrieved).toBeNull();
    });

    it('should not throw when removing non-existent file', async () => {
      // Should not throw
      await expect(removePdfFromIndexedDB('non-existent')).resolves.toBeUndefined();
    });

    it('should only remove specified file, not others', async () => {
      const file1 = createMockFile('keep.pdf', 'Keep this');
      const file2 = createMockFile('delete.pdf', 'Delete this');

      await savePdfToIndexedDB('keep-id', file1, 'upload');
      await savePdfToIndexedDB('delete-id', file2, 'upload');

      await removePdfFromIndexedDB('delete-id');

      const kept = await getPdfFromIndexedDB('keep-id');
      const deleted = await getPdfFromIndexedDB('delete-id');

      expect(kept).not.toBeNull();
      expect(deleted).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // clearAllPdfsFromIndexedDB
  // ═══════════════════════════════════════════════════════════════════════════

  describe('clearAllPdfsFromIndexedDB', () => {
    it('should remove all PDF files', async () => {
      const file1 = createMockFile('doc1.pdf', 'Content 1');
      const file2 = createMockFile('doc2.pdf', 'Content 2');
      const file3 = createMockFile('doc3.pdf', 'Content 3');

      await savePdfToIndexedDB('id-1', file1, 'upload');
      await savePdfToIndexedDB('id-2', file2, 'proof');
      await savePdfToIndexedDB('id-3', file3, 'attachment');

      await clearAllPdfsFromIndexedDB();

      const retrieved1 = await getPdfFromIndexedDB('id-1');
      const retrieved2 = await getPdfFromIndexedDB('id-2');
      const retrieved3 = await getPdfFromIndexedDB('id-3');

      expect(retrieved1).toBeNull();
      expect(retrieved2).toBeNull();
      expect(retrieved3).toBeNull();
    });

    it('should not throw when database is empty', async () => {
      await expect(clearAllPdfsFromIndexedDB()).resolves.toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // getAttachmentIndexedDBKey
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getAttachmentIndexedDBKey', () => {
    it('should generate correct key format with string proofId', () => {
      const key = getAttachmentIndexedDBKey('proof-123', 'attach-456');
      expect(key).toBe('attachment-proof-123-attach-456');
    });

    it('should generate correct key format with number proofId', () => {
      const key = getAttachmentIndexedDBKey(123, 'attach-456');
      expect(key).toBe('attachment-123-attach-456');
    });

    it('should handle special characters in ids', () => {
      const key = getAttachmentIndexedDBKey('proof_123', 'attach.pdf');
      expect(key).toBe('attachment-proof_123-attach.pdf');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // saveAttachmentToIndexedDB
  // ═══════════════════════════════════════════════════════════════════════════

  describe('saveAttachmentToIndexedDB', () => {
    it('should save an attachment using the correct key', async () => {
      const file = createMockFile('attachment.pdf', 'Attachment content');
      const proofId = 'proof-123';
      const attachmentId = 'attach-456';

      await saveAttachmentToIndexedDB(proofId, attachmentId, file);

      const expectedKey = getAttachmentIndexedDBKey(proofId, attachmentId);
      const retrieved = await getPdfFromIndexedDB(expectedKey);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.name).toBe('attachment.pdf');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // getAttachmentFromIndexedDB
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getAttachmentFromIndexedDB', () => {
    it('should retrieve a saved attachment', async () => {
      const file = createMockFile('get-attachment.pdf', 'Content');
      const proofId = 'proof-1';
      const attachmentId = 'attach-1';

      await saveAttachmentToIndexedDB(proofId, attachmentId, file);
      const retrieved = await getAttachmentFromIndexedDB(proofId, attachmentId);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.name).toBe('get-attachment.pdf');
    });

    it('should return null if attachment does not exist', async () => {
      const retrieved = await getAttachmentFromIndexedDB('no-proof', 'no-attach');
      expect(retrieved).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // removeAttachmentFromIndexedDB
  // ═══════════════════════════════════════════════════════════════════════════

  describe('removeAttachmentFromIndexedDB', () => {
    it('should remove a specific attachment', async () => {
      const file = createMockFile('remove-me.pdf', 'Content');
      const proofId = 'proof-1';
      const attachmentId = 'attach-1';

      await saveAttachmentToIndexedDB(proofId, attachmentId, file);

      let retrieved = await getAttachmentFromIndexedDB(proofId, attachmentId);
      expect(retrieved).not.toBeNull();

      await removeAttachmentFromIndexedDB(proofId, attachmentId);

      retrieved = await getAttachmentFromIndexedDB(proofId, attachmentId);
      expect(retrieved).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // removeAllAttachmentsFromIndexedDB
  // ═══════════════════════════════════════════════════════════════════════════

  describe('removeAllAttachmentsFromIndexedDB', () => {
    it('should remove all attachments for a specific proof', async () => {
      const file1 = createMockFile('attach1.pdf', 'Content 1');
      const file2 = createMockFile('attach2.pdf', 'Content 2');
      const file3 = createMockFile('other.pdf', 'Other proof');

      // Save attachments for proof-1
      await saveAttachmentToIndexedDB('proof-1', 'a1', file1);
      await saveAttachmentToIndexedDB('proof-1', 'a2', file2);
      // Save attachment for different proof
      await saveAttachmentToIndexedDB('proof-2', 'a1', file3);

      await removeAllAttachmentsFromIndexedDB('proof-1');

      // Proof-1 attachments should be gone
      const attach1 = await getAttachmentFromIndexedDB('proof-1', 'a1');
      const attach2 = await getAttachmentFromIndexedDB('proof-1', 'a2');
      // Proof-2 attachment should still exist
      const otherAttach = await getAttachmentFromIndexedDB('proof-2', 'a1');

      expect(attach1).toBeNull();
      expect(attach2).toBeNull();
      expect(otherAttach).not.toBeNull();
    });

    it('should not throw when proof has no attachments', async () => {
      await expect(removeAllAttachmentsFromIndexedDB('non-existent')).resolves.toBeUndefined();
    });
  });
});
