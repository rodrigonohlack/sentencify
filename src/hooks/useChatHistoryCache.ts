/**
 * @file useChatHistoryCache.ts
 * @description Cache de histórico de chat do Assistente IA por tópico
 * Armazena conversas em IndexedDB com TTL infinito
 *
 * @version 1.38.16 - Adiciona persistência de includeMainDocs por tópico
 */
import { useCallback, useMemo } from 'react';
import type { ChatMessage, ChatHistoryCacheEntry } from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════

export const CHAT_DB_NAME = 'sentencify-chat-history';
export const CHAT_STORE_NAME = 'chats';
export const CHAT_DB_VERSION = 1;

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

/** Dados exportados de um tópico (v1.38.16, v1.39.06) */
export interface ChatExportEntry {
  messages: ChatMessage[];
  includeMainDocs?: boolean;
  includeComplementaryDocs?: boolean;  // v1.39.06: Toggle "Incluir documentos complementares" no chat
}

/** Retorno do hook useChatHistoryCache */
export interface UseChatHistoryCacheReturn {
  saveChat: (topicTitle: string, messages: ChatMessage[]) => Promise<void>;
  getChat: (topicTitle: string) => Promise<ChatMessage[]>;
  deleteChat: (topicTitle: string) => Promise<void>;
  clearAllChats: () => Promise<void>;
  exportAll: () => Promise<Record<string, ChatExportEntry>>;
  importAll: (data: Record<string, ChatExportEntry | ChatMessage[]>) => Promise<void>;
  // v1.38.16: Funções para includeMainDocs
  getIncludeMainDocs: (topicTitle: string) => Promise<boolean>;
  setIncludeMainDocs: (topicTitle: string, value: boolean) => Promise<void>;
  // v1.39.06: Funções para includeComplementaryDocs
  getIncludeComplementaryDocs: (topicTitle: string) => Promise<boolean>;
  setIncludeComplementaryDocs: (topicTitle: string, value: boolean) => Promise<void>;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: Abrir IndexedDB
// ═══════════════════════════════════════════════════════════════════════════

export const openChatDB = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(CHAT_DB_NAME, CHAT_DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(CHAT_STORE_NAME)) {
        const store = db.createObjectStore(CHAT_STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('topicTitle', 'topicTitle', { unique: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

const useChatHistoryCache = (): UseChatHistoryCacheReturn => {
  /**
   * Salva histórico de chat (substitui se já existir)
   */
  const saveChat = useCallback(async (
    topicTitle: string,
    messages: ChatMessage[]
  ): Promise<void> => {
    if (!topicTitle || !messages || messages.length === 0) return;
    try {
      const db = await openChatDB();
      const tx = db.transaction(CHAT_STORE_NAME, 'readwrite');
      const store = tx.objectStore(CHAT_STORE_NAME);
      const index = store.index('topicTitle');

      // Verificar se já existe entrada para este tópico
      const existing = await new Promise<ChatHistoryCacheEntry | undefined>((resolve) => {
        const req = index.get(topicTitle);
        req.onsuccess = () => resolve(req.result as ChatHistoryCacheEntry | undefined);
        req.onerror = () => resolve(undefined);
      });

      const now = Date.now();
      const entry: ChatHistoryCacheEntry = {
        topicTitle,
        messages,
        includeMainDocs: existing?.includeMainDocs,  // v1.38.16: Preservar configuração existente
        includeComplementaryDocs: existing?.includeComplementaryDocs,  // v1.39.06: Preservar configuração existente
        createdAt: existing?.createdAt || now,
        updatedAt: now
      };

      if (existing?.id) {
        // Atualizar existente
        entry.id = existing.id;
        store.put(entry);
      } else {
        // Criar novo
        store.add(entry);
      }

      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });

      db.close();
    } catch (e) {
      console.warn('[ChatHistoryCache] Erro ao salvar:', e);
    }
  }, []);

  /**
   * Recupera histórico de chat de um tópico
   */
  const getChat = useCallback(async (
    topicTitle: string
  ): Promise<ChatMessage[]> => {
    if (!topicTitle) return [];
    try {
      const db = await openChatDB();
      const store = db.transaction(CHAT_STORE_NAME).objectStore(CHAT_STORE_NAME);
      const index = store.index('topicTitle');

      const entry = await new Promise<ChatHistoryCacheEntry | undefined>((resolve) => {
        const req = index.get(topicTitle);
        req.onsuccess = () => resolve(req.result as ChatHistoryCacheEntry | undefined);
        req.onerror = () => resolve(undefined);
      });

      db.close();
      return entry?.messages || [];
    } catch (e) {
      console.warn('[ChatHistoryCache] Erro ao recuperar:', e);
      return [];
    }
  }, []);

  /**
   * Deleta histórico de chat de um tópico
   */
  const deleteChat = useCallback(async (
    topicTitle: string
  ): Promise<void> => {
    if (!topicTitle) return;
    try {
      const db = await openChatDB();
      const tx = db.transaction(CHAT_STORE_NAME, 'readwrite');
      const store = tx.objectStore(CHAT_STORE_NAME);
      const index = store.index('topicTitle');

      const entry = await new Promise<ChatHistoryCacheEntry | undefined>((resolve) => {
        const req = index.get(topicTitle);
        req.onsuccess = () => resolve(req.result as ChatHistoryCacheEntry | undefined);
        req.onerror = () => resolve(undefined);
      });

      if (entry?.id !== undefined) {
        store.delete(entry.id);
      }

      await new Promise<void>((resolve) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });

      db.close();
    } catch (e) {
      console.warn('[ChatHistoryCache] Erro ao deletar:', e);
    }
  }, []);

  /**
   * Limpa todo o cache de chat
   */
  const clearAllChats = useCallback(async (): Promise<void> => {
    try {
      const db = await openChatDB();
      const tx = db.transaction(CHAT_STORE_NAME, 'readwrite');
      tx.objectStore(CHAT_STORE_NAME).clear();

      await new Promise<void>((resolve) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });

      db.close();
    } catch (e) {
      console.warn('[ChatHistoryCache] Erro ao limpar:', e);
    }
  }, []);

  /**
   * Exporta todos os chats para inclusão no projeto JSON
   * v1.38.16: Inclui includeMainDocs junto com messages
   */
  const exportAll = useCallback(async (): Promise<Record<string, ChatExportEntry>> => {
    try {
      const db = await openChatDB();
      const store = db.transaction(CHAT_STORE_NAME).objectStore(CHAT_STORE_NAME);

      const entries = await new Promise<ChatHistoryCacheEntry[]>((resolve) => {
        const req = store.getAll();
        req.onsuccess = () => resolve((req.result as ChatHistoryCacheEntry[]) || []);
        req.onerror = () => resolve([]);
      });

      db.close();

      const result: Record<string, ChatExportEntry> = {};
      for (const entry of entries) {
        result[entry.topicTitle] = {
          messages: entry.messages,
          includeMainDocs: entry.includeMainDocs,
          includeComplementaryDocs: entry.includeComplementaryDocs  // v1.39.06
        };
      }

      return result;
    } catch (e) {
      console.warn('[ChatHistoryCache] Erro ao exportar:', e);
      return {};
    }
  }, []);

  /**
   * Importa chats de um projeto JSON
   * v1.38.16: Suporta novo formato com includeMainDocs e formato legado (só messages)
   */
  const importAll = useCallback(async (
    data: Record<string, ChatExportEntry | ChatMessage[]>
  ): Promise<void> => {
    if (!data || typeof data !== 'object') return;
    try {
      const db = await openChatDB();

      for (const [topicTitle, value] of Object.entries(data)) {
        if (!topicTitle) continue;

        // v1.38.16: Suportar novo formato (objeto com messages) e legado (array direto)
        // v1.39.06: Inclui includeComplementaryDocs
        const isNewFormat = value && typeof value === 'object' && !Array.isArray(value) && 'messages' in value;
        const messages = isNewFormat ? (value as ChatExportEntry).messages : (value as ChatMessage[]);
        const includeMainDocs = isNewFormat ? (value as ChatExportEntry).includeMainDocs : undefined;
        const includeComplementaryDocs = isNewFormat ? (value as ChatExportEntry).includeComplementaryDocs : undefined;

        if (!Array.isArray(messages) || messages.length === 0) continue;

        const tx = db.transaction(CHAT_STORE_NAME, 'readwrite');
        const store = tx.objectStore(CHAT_STORE_NAME);
        const index = store.index('topicTitle');

        // Verificar se já existe
        const existing = await new Promise<ChatHistoryCacheEntry | undefined>((resolve) => {
          const req = index.get(topicTitle);
          req.onsuccess = () => resolve(req.result as ChatHistoryCacheEntry | undefined);
          req.onerror = () => resolve(undefined);
        });

        const now = Date.now();
        const entry: ChatHistoryCacheEntry = {
          topicTitle,
          messages,
          includeMainDocs,
          includeComplementaryDocs,  // v1.39.06
          createdAt: existing?.createdAt || now,
          updatedAt: now
        };

        if (existing?.id) {
          entry.id = existing.id;
          store.put(entry);
        } else {
          store.add(entry);
        }

        await new Promise<void>((resolve) => {
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        });
      }

      db.close();
    } catch (e) {
      console.warn('[ChatHistoryCache] Erro ao importar:', e);
    }
  }, []);

  /**
   * v1.38.16: Obtém configuração includeMainDocs de um tópico
   * @returns true (default) se não existir configuração salva
   */
  const getIncludeMainDocs = useCallback(async (
    topicTitle: string
  ): Promise<boolean> => {
    if (!topicTitle) return true;
    try {
      const db = await openChatDB();
      const store = db.transaction(CHAT_STORE_NAME).objectStore(CHAT_STORE_NAME);
      const index = store.index('topicTitle');

      const entry = await new Promise<ChatHistoryCacheEntry | undefined>((resolve) => {
        const req = index.get(topicTitle);
        req.onsuccess = () => resolve(req.result as ChatHistoryCacheEntry | undefined);
        req.onerror = () => resolve(undefined);
      });

      db.close();
      return entry?.includeMainDocs ?? false;  // Default: false (economizar tokens)
    } catch (e) {
      console.warn('[ChatHistoryCache] Erro ao obter includeMainDocs:', e);
      return true;
    }
  }, []);

  /**
   * v1.38.16: Salva configuração includeMainDocs de um tópico
   * Cria entrada se não existir (sem mensagens)
   */
  const setIncludeMainDocs = useCallback(async (
    topicTitle: string,
    value: boolean
  ): Promise<void> => {
    if (!topicTitle) return;
    try {
      const db = await openChatDB();
      const tx = db.transaction(CHAT_STORE_NAME, 'readwrite');
      const store = tx.objectStore(CHAT_STORE_NAME);
      const index = store.index('topicTitle');

      // Verificar se já existe entrada para este tópico
      const existing = await new Promise<ChatHistoryCacheEntry | undefined>((resolve) => {
        const req = index.get(topicTitle);
        req.onsuccess = () => resolve(req.result as ChatHistoryCacheEntry | undefined);
        req.onerror = () => resolve(undefined);
      });

      const now = Date.now();
      const entry: ChatHistoryCacheEntry = {
        topicTitle,
        messages: existing?.messages || [],
        includeMainDocs: value,
        createdAt: existing?.createdAt || now,
        updatedAt: now
      };

      if (existing?.id) {
        entry.id = existing.id;
        store.put(entry);
      } else {
        store.add(entry);
      }

      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });

      db.close();
    } catch (e) {
      console.warn('[ChatHistoryCache] Erro ao salvar includeMainDocs:', e);
    }
  }, []);

  /**
   * v1.39.06: Obtém configuração includeComplementaryDocs de um tópico
   * @returns false (default) se não existir configuração salva
   */
  const getIncludeComplementaryDocs = useCallback(async (
    topicTitle: string
  ): Promise<boolean> => {
    if (!topicTitle) return false;
    try {
      const db = await openChatDB();
      const store = db.transaction(CHAT_STORE_NAME).objectStore(CHAT_STORE_NAME);
      const index = store.index('topicTitle');

      const entry = await new Promise<ChatHistoryCacheEntry | undefined>((resolve) => {
        const req = index.get(topicTitle);
        req.onsuccess = () => resolve(req.result as ChatHistoryCacheEntry | undefined);
        req.onerror = () => resolve(undefined);
      });

      db.close();
      return entry?.includeComplementaryDocs ?? false;  // Default: false (economizar tokens)
    } catch (e) {
      console.warn('[ChatHistoryCache] Erro ao obter includeComplementaryDocs:', e);
      return false;
    }
  }, []);

  /**
   * v1.39.06: Salva configuração includeComplementaryDocs de um tópico
   * Cria entrada se não existir (sem mensagens)
   */
  const setIncludeComplementaryDocs = useCallback(async (
    topicTitle: string,
    value: boolean
  ): Promise<void> => {
    if (!topicTitle) return;
    try {
      const db = await openChatDB();
      const tx = db.transaction(CHAT_STORE_NAME, 'readwrite');
      const store = tx.objectStore(CHAT_STORE_NAME);
      const index = store.index('topicTitle');

      // Verificar se já existe entrada para este tópico
      const existing = await new Promise<ChatHistoryCacheEntry | undefined>((resolve) => {
        const req = index.get(topicTitle);
        req.onsuccess = () => resolve(req.result as ChatHistoryCacheEntry | undefined);
        req.onerror = () => resolve(undefined);
      });

      const now = Date.now();
      const entry: ChatHistoryCacheEntry = {
        topicTitle,
        messages: existing?.messages || [],
        includeMainDocs: existing?.includeMainDocs,
        includeComplementaryDocs: value,
        createdAt: existing?.createdAt || now,
        updatedAt: now
      };

      if (existing?.id) {
        entry.id = existing.id;
        store.put(entry);
      } else {
        store.add(entry);
      }

      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });

      db.close();
    } catch (e) {
      console.warn('[ChatHistoryCache] Erro ao salvar includeComplementaryDocs:', e);
    }
  }, []);

  return useMemo(() => ({
    saveChat,
    getChat,
    deleteChat,
    clearAllChats,
    exportAll,
    importAll,
    getIncludeMainDocs,
    setIncludeMainDocs,
    getIncludeComplementaryDocs,
    setIncludeComplementaryDocs
  }), [saveChat, getChat, deleteChat, clearAllChats, exportAll, importAll, getIncludeMainDocs, setIncludeMainDocs, getIncludeComplementaryDocs, setIncludeComplementaryDocs]);
};

export default useChatHistoryCache;
