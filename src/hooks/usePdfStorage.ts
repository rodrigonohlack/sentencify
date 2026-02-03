/**
 * @file usePdfStorage.ts
 * @description IndexedDB helpers for PDF and attachment storage
 * @version 1.38.52
 * @tier 0 (no dependencies on other project hooks)
 *
 * Extracted from useLocalStorage.ts to reduce file size.
 * Provides functions for storing and retrieving PDF files in IndexedDB.
 */

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const PDF_DB_NAME = 'sentencify-pdfs';
const PDF_STORE_NAME = 'pdfs';
const PDF_DB_VERSION = 1;

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Record structure for PDF storage in IndexedDB
 */
interface PdfRecord {
  id: string;
  data: ArrayBuffer;
  mimeType: string;
  fileName: string;
  savedAt: number;
  type?: string;
  fileSize?: number;
}

/**
 * Record structure for proof text storage in IndexedDB
 */
interface ProofTextRecord {
  id: string;
  data: string;
  name: string;
  savedAt: number;
  uploadDate?: string;
}

/**
 * Record structure for upload text storage in IndexedDB
 * Used for: pastedTexts, analyzedDocuments texts, extractedTexts
 */
interface UploadTextRecord {
  id: string;
  data: string;
  name: string;
  savedAt: number;
}

/**
 * Upload text category types
 */
export type UploadTextCategory =
  | 'pasted-peticao'
  | 'pasted-contestacao'
  | 'pasted-complementar'
  | 'analyzed-peticao'
  | 'analyzed-contestacao'
  | 'analyzed-complementar'
  | 'extracted-peticao'
  | 'extracted-contestacao'
  | 'extracted-complementar';

// ═══════════════════════════════════════════════════════════════════════════
// DATABASE HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Opens the PDF IndexedDB database
 */
const openPdfDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(PDF_DB_NAME, PDF_DB_VERSION);

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(PDF_STORE_NAME)) {
        // Store with key 'id' (format: 'upload-{index}' or 'proof-{id}')
        db.createObjectStore(PDF_STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

// ═══════════════════════════════════════════════════════════════════════════
// PDF CRUD OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Saves a PDF to IndexedDB
 * @param id - Unique identifier for the PDF
 * @param file - The File object to save
 * @param type - Type of PDF (e.g., 'upload', 'proof', 'attachment')
 */
export const savePdfToIndexedDB = async (id: string, file: File, type: string): Promise<void> => {
  try {
    // Convert File to ArrayBuffer BEFORE opening transaction
    // (avoids TransactionInactiveError when called in parallel)
    const arrayBuffer = await file.arrayBuffer();

    const db = await openPdfDB();
    const transaction = db.transaction([PDF_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(PDF_STORE_NAME);

    const pdfRecord: PdfRecord = {
      id,
      type,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      data: arrayBuffer,
      savedAt: Date.now()
    };

    await new Promise<void>((resolve, reject) => {
      const request = store.put(pdfRecord);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    db.close();
  } catch (error) {
    throw error;
  }
};

/**
 * Retrieves a PDF from IndexedDB
 * @param id - The identifier of the PDF to retrieve
 * @returns The File object, or null if not found
 */
export const getPdfFromIndexedDB = async (id: string): Promise<File | null> => {
  try {
    const db = await openPdfDB();
    const transaction = db.transaction([PDF_STORE_NAME], 'readonly');
    const store = transaction.objectStore(PDF_STORE_NAME);

    const record = await new Promise<PdfRecord | undefined>((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result as PdfRecord | undefined);
      request.onerror = () => reject(request.error);
    });

    db.close();

    if (!record) {
      return null;
    }

    // Reconstruct File from ArrayBuffer
    const blob = new Blob([record.data], { type: record.mimeType });
    const file = new File([blob], record.fileName, {
      type: record.mimeType,
      lastModified: record.savedAt
    });

    return file;
  } catch (error) {
    return null;
  }
};

/**
 * Removes a specific PDF from IndexedDB
 * @param id - The identifier of the PDF to remove
 */
export const removePdfFromIndexedDB = async (id: string): Promise<void> => {
  try {
    const db = await openPdfDB();
    const transaction = db.transaction([PDF_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(PDF_STORE_NAME);

    await new Promise<void>((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    db.close();
  } catch (error) {
    throw error;
  }
};

/**
 * Removes all PDFs from IndexedDB
 */
export const clearAllPdfsFromIndexedDB = async (): Promise<void> => {
  try {
    const db = await openPdfDB();
    const transaction = db.transaction([PDF_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(PDF_STORE_NAME);

    await new Promise<void>((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    db.close();
  } catch (error) {
    throw error;
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// ATTACHMENT HELPERS (v1.38.8)
// Reuses the same 'sentencify-pdfs' database with different prefix
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generates the IndexedDB key for an attachment
 * Format: attachment-{proofId}-{attachmentId}
 */
export const getAttachmentIndexedDBKey = (proofId: string | number, attachmentId: string): string => {
  return `attachment-${proofId}-${attachmentId}`;
};

/**
 * Saves an attachment PDF to IndexedDB
 * @param proofId - The proof ID the attachment belongs to
 * @param attachmentId - The attachment's unique ID
 * @param file - The File object to save
 */
export const saveAttachmentToIndexedDB = async (
  proofId: string | number,
  attachmentId: string,
  file: File
): Promise<void> => {
  const id = getAttachmentIndexedDBKey(proofId, attachmentId);
  await savePdfToIndexedDB(id, file, 'attachment');
};

/**
 * Retrieves an attachment PDF from IndexedDB
 * @param proofId - The proof ID the attachment belongs to
 * @param attachmentId - The attachment's unique ID
 * @returns The File object, or null if not found
 */
export const getAttachmentFromIndexedDB = async (
  proofId: string | number,
  attachmentId: string
): Promise<File | null> => {
  const id = getAttachmentIndexedDBKey(proofId, attachmentId);
  return await getPdfFromIndexedDB(id);
};

/**
 * Removes a specific attachment from IndexedDB
 * @param proofId - The proof ID the attachment belongs to
 * @param attachmentId - The attachment's unique ID
 */
export const removeAttachmentFromIndexedDB = async (
  proofId: string | number,
  attachmentId: string
): Promise<void> => {
  const id = getAttachmentIndexedDBKey(proofId, attachmentId);
  await removePdfFromIndexedDB(id);
};

/**
 * Removes all attachments for a specific proof from IndexedDB
 * @param proofId - The proof ID whose attachments should be removed
 */
export const removeAllAttachmentsFromIndexedDB = async (proofId: string | number): Promise<void> => {
  try {
    const db = await openPdfDB();
    const transaction = db.transaction([PDF_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(PDF_STORE_NAME);
    const prefix = `attachment-${proofId}-`;

    // Get all keys
    const keys = await new Promise<IDBValidKey[]>((resolve, reject) => {
      const request = store.getAllKeys();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    // Filter and delete keys with the prefix
    const deletePromises = keys
      .filter((key) => typeof key === 'string' && key.startsWith(prefix))
      .map((key) => new Promise<void>((resolve, reject) => {
        const request = store.delete(key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }));

    await Promise.all(deletePromises);
    db.close();
  } catch (error) {
    console.error('[Attachments] Error removing attachments:', error);
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// PROOF TEXT HELPERS (v1.40.17)
// Stores large proof texts in IndexedDB to avoid localStorage limits
// Uses same 'sentencify-pdfs' database with prefix 'proof-text-{id}'
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generates the IndexedDB key for a proof text
 * Format: proof-text-{id}
 */
export const getProofTextIndexedDBKey = (id: string): string => {
  return `proof-text-${id}`;
};

/**
 * Saves a proof text to IndexedDB
 * @param id - The proof text unique ID
 * @param text - The text content
 * @param name - The display name
 * @param uploadDate - Optional upload date (ISO string)
 */
export const saveProofTextToIndexedDB = async (
  id: string,
  text: string,
  name: string,
  uploadDate?: string
): Promise<void> => {
  try {
    const db = await openPdfDB();
    const transaction = db.transaction([PDF_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(PDF_STORE_NAME);

    const record: ProofTextRecord = {
      id: getProofTextIndexedDBKey(id),
      data: text,
      name,
      savedAt: Date.now(),
      uploadDate: uploadDate || new Date().toISOString()
    };

    await new Promise<void>((resolve, reject) => {
      const request = store.put(record);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    db.close();
  } catch (error) {
    throw error;
  }
};

/**
 * Retrieves a proof text from IndexedDB
 * @param id - The proof text unique ID
 * @returns Object with id, text, name, and uploadDate, or null if not found
 */
export const getProofTextFromIndexedDB = async (
  id: string
): Promise<{ id: string; text: string; name: string; uploadDate: string } | null> => {
  try {
    const db = await openPdfDB();
    const transaction = db.transaction([PDF_STORE_NAME], 'readonly');
    const store = transaction.objectStore(PDF_STORE_NAME);

    const record = await new Promise<ProofTextRecord | undefined>((resolve, reject) => {
      const request = store.get(getProofTextIndexedDBKey(id));
      request.onsuccess = () => resolve(request.result as ProofTextRecord | undefined);
      request.onerror = () => reject(request.error);
    });

    db.close();

    if (!record) {
      return null;
    }

    return {
      id,
      text: record.data,
      name: record.name,
      uploadDate: record.uploadDate || new Date(record.savedAt).toISOString()
    };
  } catch (error) {
    return null;
  }
};

/**
 * Removes a specific proof text from IndexedDB
 * @param id - The proof text unique ID
 */
export const removeProofTextFromIndexedDB = async (id: string): Promise<void> => {
  try {
    const db = await openPdfDB();
    const transaction = db.transaction([PDF_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(PDF_STORE_NAME);

    await new Promise<void>((resolve, reject) => {
      const request = store.delete(getProofTextIndexedDBKey(id));
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    db.close();
  } catch (error) {
    throw error;
  }
};

/**
 * Removes all proof texts from IndexedDB
 */
export const clearAllProofTextsFromIndexedDB = async (): Promise<void> => {
  try {
    const db = await openPdfDB();
    const transaction = db.transaction([PDF_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(PDF_STORE_NAME);
    const prefix = 'proof-text-';

    // Get all keys
    const keys = await new Promise<IDBValidKey[]>((resolve, reject) => {
      const request = store.getAllKeys();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    // Filter and delete keys with the prefix
    const deletePromises = keys
      .filter((key) => typeof key === 'string' && key.startsWith(prefix))
      .map((key) => new Promise<void>((resolve, reject) => {
        const request = store.delete(key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }));

    await Promise.all(deletePromises);
    db.close();
  } catch (error) {
    console.error('[ProofText] Error clearing proof texts:', error);
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// UPLOAD TEXT HELPERS (v1.40.17)
// Stores large upload texts in IndexedDB to avoid localStorage limits
// Categories: pasted-peticao, pasted-contestacao, pasted-complementar,
//             analyzed-peticao, analyzed-contestacao, analyzed-complementar,
//             extracted-peticao, extracted-contestacao, extracted-complementar
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generates the IndexedDB key for an upload text
 * Format: upload-text-{category}-{id}
 */
export const getUploadTextIndexedDBKey = (category: UploadTextCategory, id: string): string => {
  return `upload-text-${category}-${id}`;
};

/**
 * Saves an upload text to IndexedDB
 * @param category - The category of text (pasted-peticao, analyzed-contestacao, etc.)
 * @param id - Unique identifier for the text
 * @param text - The text content
 * @param name - Display name
 */
export const saveUploadTextToIndexedDB = async (
  category: UploadTextCategory,
  id: string,
  text: string,
  name: string
): Promise<void> => {
  try {
    const db = await openPdfDB();
    const transaction = db.transaction([PDF_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(PDF_STORE_NAME);

    const record: UploadTextRecord = {
      id: getUploadTextIndexedDBKey(category, id),
      data: text,
      name,
      savedAt: Date.now()
    };

    await new Promise<void>((resolve, reject) => {
      const request = store.put(record);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    db.close();
  } catch (error) {
    throw error;
  }
};

/**
 * Retrieves an upload text from IndexedDB
 * @param category - The category of text
 * @param id - The text unique ID
 * @returns Object with id, text, and name, or null if not found
 */
export const getUploadTextFromIndexedDB = async (
  category: UploadTextCategory,
  id: string
): Promise<{ id: string; text: string; name: string } | null> => {
  try {
    const db = await openPdfDB();
    const transaction = db.transaction([PDF_STORE_NAME], 'readonly');
    const store = transaction.objectStore(PDF_STORE_NAME);

    const record = await new Promise<UploadTextRecord | undefined>((resolve, reject) => {
      const request = store.get(getUploadTextIndexedDBKey(category, id));
      request.onsuccess = () => resolve(request.result as UploadTextRecord | undefined);
      request.onerror = () => reject(request.error);
    });

    db.close();

    if (!record) {
      return null;
    }

    return {
      id,
      text: record.data,
      name: record.name
    };
  } catch (error) {
    return null;
  }
};

/**
 * Retrieves all upload texts for a category from IndexedDB
 * @param category - The category of texts to retrieve
 * @returns Array of objects with id, text, and name
 */
export const getAllUploadTextsByCategoryFromIndexedDB = async (
  category: UploadTextCategory
): Promise<Array<{ id: string; text: string; name: string }>> => {
  try {
    const db = await openPdfDB();
    const transaction = db.transaction([PDF_STORE_NAME], 'readonly');
    const store = transaction.objectStore(PDF_STORE_NAME);
    const prefix = `upload-text-${category}-`;

    // Get all records
    const records = await new Promise<UploadTextRecord[]>((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });

    db.close();

    // Filter by category prefix and map to return format
    return records
      .filter((record) => record.id.startsWith(prefix))
      .map((record) => ({
        id: record.id.replace(prefix, ''),
        text: record.data,
        name: record.name
      }));
  } catch (error) {
    return [];
  }
};

/**
 * Removes a specific upload text from IndexedDB
 * @param category - The category of text
 * @param id - The text unique ID
 */
export const removeUploadTextFromIndexedDB = async (
  category: UploadTextCategory,
  id: string
): Promise<void> => {
  try {
    const db = await openPdfDB();
    const transaction = db.transaction([PDF_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(PDF_STORE_NAME);

    await new Promise<void>((resolve, reject) => {
      const request = store.delete(getUploadTextIndexedDBKey(category, id));
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    db.close();
  } catch (error) {
    throw error;
  }
};

/**
 * Removes all upload texts for a specific category from IndexedDB
 * @param category - The category of texts to remove
 */
export const clearUploadTextsByCategoryFromIndexedDB = async (
  category: UploadTextCategory
): Promise<void> => {
  try {
    const db = await openPdfDB();
    const transaction = db.transaction([PDF_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(PDF_STORE_NAME);
    const prefix = `upload-text-${category}-`;

    // Get all keys
    const keys = await new Promise<IDBValidKey[]>((resolve, reject) => {
      const request = store.getAllKeys();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    // Filter and delete keys with the prefix
    const deletePromises = keys
      .filter((key) => typeof key === 'string' && key.startsWith(prefix))
      .map((key) => new Promise<void>((resolve, reject) => {
        const request = store.delete(key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }));

    await Promise.all(deletePromises);
    db.close();
  } catch (error) {
    console.error('[UploadText] Error clearing upload texts by category:', error);
  }
};

/**
 * Removes all upload texts from IndexedDB (all categories)
 */
export const clearAllUploadTextsFromIndexedDB = async (): Promise<void> => {
  try {
    const db = await openPdfDB();
    const transaction = db.transaction([PDF_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(PDF_STORE_NAME);
    const prefix = 'upload-text-';

    // Get all keys
    const keys = await new Promise<IDBValidKey[]>((resolve, reject) => {
      const request = store.getAllKeys();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    // Filter and delete keys with the prefix
    const deletePromises = keys
      .filter((key) => typeof key === 'string' && key.startsWith(prefix))
      .map((key) => new Promise<void>((resolve, reject) => {
        const request = store.delete(key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }));

    await Promise.all(deletePromises);
    db.close();
  } catch (error) {
    console.error('[UploadText] Error clearing all upload texts:', error);
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

// Export for internal use by useLocalStorage
export { openPdfDB, PDF_DB_NAME, PDF_STORE_NAME };
export type { PdfRecord, ProofTextRecord, UploadTextRecord };
