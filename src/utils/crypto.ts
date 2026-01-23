/**
 * @file crypto.ts
 * @description Encriptacao de API keys usando Web Crypto API (AES-256-GCM)
 * Protege contra: acesso fisico ao dispositivo, extensoes lendo localStorage,
 * sync de browser vazando keys.
 * NAO protege contra: XSS (atacante pode chamar decrypt no mesmo contexto)
 */

const DB_NAME = 'sentencify-keystore';
const DB_VERSION = 1;
const STORE_NAME = 'encryption-keys';
const KEY_ID = 'master-key';

// ═══════════════════════════════════════════════════════════════════
// IndexedDB para armazenar a chave de encriptacao (nao exportavel)
// ═══════════════════════════════════════════════════════════════════

function openKeyDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getStoredKey(): Promise<CryptoKey | null> {
  try {
    const db = await openKeyDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(KEY_ID);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function storeKey(key: CryptoKey): Promise<void> {
  const db = await openKeyDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(key, KEY_ID);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ═══════════════════════════════════════════════════════════════════
// Gerenciamento da chave mestra
// ═══════════════════════════════════════════════════════════════════

let cachedKey: CryptoKey | null = null;

async function getOrCreateKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;

  const stored = await getStoredKey();
  if (stored) {
    cachedKey = stored;
    return stored;
  }

  // Gerar nova chave AES-256-GCM (nao exportavel)
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    false, // extractable = false (nao pode ser exportada)
    ['encrypt', 'decrypt']
  );

  await storeKey(key);
  cachedKey = key;
  return key;
}

// ═══════════════════════════════════════════════════════════════════
// Funcoes publicas de encrypt/decrypt
// ═══════════════════════════════════════════════════════════════════

/**
 * Encripta uma string usando AES-256-GCM
 * @returns String base64 contendo IV (12 bytes) + ciphertext
 */
export async function encryptString(plaintext: string): Promise<string> {
  if (!plaintext) return '';

  const key = await getOrCreateKey();
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV
  const encoded = new TextEncoder().encode(plaintext);

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  );

  // Concatenar IV + ciphertext e converter para base64
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);

  return btoa(String.fromCharCode(...combined));
}

/**
 * Decripta uma string encriptada com encryptString
 * @returns String original ou string vazia se falhar
 */
export async function decryptString(ciphertext: string): Promise<string> {
  if (!ciphertext) return '';

  try {
    const key = await getOrCreateKey();
    const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));

    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    );

    return new TextDecoder().decode(decrypted);
  } catch (err) {
    console.warn('[Crypto] Falha ao decriptar (chave pode ter mudado):', err);
    return '';
  }
}

/**
 * Encripta um objeto de API keys
 */
export async function encryptApiKeys(
  keys: Record<string, string>
): Promise<Record<string, string>> {
  const encrypted: Record<string, string> = {};
  for (const [provider, key] of Object.entries(keys)) {
    encrypted[provider] = key ? await encryptString(key) : '';
  }
  return encrypted;
}

/**
 * Decripta um objeto de API keys
 */
export async function decryptApiKeys(
  encrypted: Record<string, string>
): Promise<Record<string, string>> {
  const decrypted: Record<string, string> = {};
  for (const [provider, cipher] of Object.entries(encrypted)) {
    if (!cipher) {
      decrypted[provider] = '';
    } else if (isEncrypted(cipher)) {
      decrypted[provider] = await decryptString(cipher);
    } else {
      // Plain text key (pre-encryption migration) - return as-is
      decrypted[provider] = cipher;
    }
  }
  return decrypted;
}

/**
 * Detecta se um valor ja esta encriptado (base64 com tamanho minimo)
 */
export function isEncrypted(value: string): boolean {
  if (!value || value.length < 20) return false;
  try {
    const decoded = atob(value);
    // Encriptado tem no minimo 12 bytes IV + 1 byte dado + 16 bytes tag = 29 bytes
    return decoded.length >= 29;
  } catch {
    return false;
  }
}
