/**
 * @file aiKeyPersistence.ts
 * @description Utilidades para persistência segura de API keys, extraídas dos
 *              stores de IA dos apps. Reusa encryptApiKeys/decryptApiKeys de
 *              src/utils/crypto e suporta chain de fallback entre chaves de
 *              localStorage (ex.: app próprio → analisador → sentencify).
 *
 * Formatos de localStorage suportados na leitura:
 *   - plano:     JSON.stringify({ claude, gemini, openai, grok }) — encriptado ou não
 *   - aninhado:  JSON.stringify({ ...outros, apiKeys: { claude, gemini, ... } })
 *                (usado pelo Core em 'sentencify-ai-settings')
 */

import { encryptApiKeys, decryptApiKeys } from '../../utils/crypto';
import type { APIKeys } from '../../types/ai';

/** Extrai um Record<provider, string> encriptado a partir de um valor de localStorage. */
function extractRawKeys(raw: string | null): Record<string, string> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    // Formato plano: { claude, gemini, openai, grok }
    if (parsed && typeof parsed === 'object' && 'claude' in parsed && 'gemini' in parsed) {
      return parsed as Record<string, string>;
    }
    // Formato aninhado: { apiKeys: { ... } }
    if (parsed && typeof parsed === 'object' && parsed.apiKeys && typeof parsed.apiKeys === 'object') {
      return parsed.apiKeys as Record<string, string>;
    }
    return null;
  } catch {
    return null;
  }
}

/** `true` se pelo menos uma key é não-vazia. */
function hasAnyKey(keys: Record<string, string> | null): boolean {
  if (!keys) return false;
  return Object.values(keys).some((k) => typeof k === 'string' && k.length > 0);
}

/**
 * Lê apiKeys do localStorage seguindo a cadeia de fallback. A primeira chave
 * com ao menos uma key não-vazia vence.
 */
export function loadApiKeysFromStorage(
  primaryKey: string,
  fallbackKeys: string[] = []
): Record<string, string> | null {
  const all = [primaryKey, ...fallbackKeys];
  for (const key of all) {
    const raw = extractRawKeys(localStorage.getItem(key));
    if (hasAnyKey(raw)) return raw;
  }
  return null;
}

/**
 * Decripta raw keys (que podem vir encriptadas ou em texto — fallback gradual).
 * Em caso de erro de decriptação, usa o valor original como-está.
 */
export async function resolveApiKeys(rawKeys: Record<string, string>): Promise<APIKeys> {
  try {
    const decrypted = await decryptApiKeys(rawKeys);
    const finalKeys: Record<string, string> = {};
    for (const [provider, value] of Object.entries(rawKeys)) {
      finalKeys[provider] = decrypted[provider] || value;
    }
    return finalKeys as unknown as APIKeys;
  } catch {
    return rawKeys as unknown as APIKeys;
  }
}

/**
 * Encripta e persiste apiKeys no localStorage na chave primária do store.
 * Fire-and-forget — logs erro em caso de falha mas não rejeita.
 */
export function persistApiKeys(storageKey: string, apiKeys: APIKeys): void {
  const copy = { ...apiKeys } as Record<string, string>;
  encryptApiKeys(copy)
    .then((encrypted) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(encrypted));
      } catch (err) {
        console.warn(`[aiKeyPersistence] Falha ao persistir em ${storageKey}:`, err);
      }
    })
    .catch((err) => {
      console.warn(`[aiKeyPersistence] Falha ao encriptar para ${storageKey}:`, err);
    });
}
