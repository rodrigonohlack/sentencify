/**
 * @file useChatHistoryCache.ts
 * @description Cache de histórico de chat do Assistente IA por tópico
 * Armazena conversas em IndexedDB com TTL infinito
 *
 * @version 1.38.16 - Adiciona persistência de includeMainDocs por tópico
 */
import { useCallback, useMemo } from 'react';
import type { ChatMessage, ChatHistoryCacheEntry, ContextScope } from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════

export const CHAT_DB_NAME = 'sentencify-chat-history';
export const CHAT_STORE_NAME = 'chats';
export const CHAT_DB_VERSION = 1;

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

/** Dados exportados de um tópico (v1.38.16, v1.39.06, v1.51.0) */
export interface ChatExportEntry {
  messages: ChatMessage[];
  includeMainDocs?: boolean;
  includeComplementaryDocs?: boolean;  // v1.39.06: Toggle "Incluir documentos complementares" no chat
  contextScope?: ContextScope;  // v1.51.0: Escopo do contexto por tópico
  selectedContextTopics?: string[];  // v1.51.0: Tópicos selecionados para contexto, por tópico
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
  // v1.51.0: Escopo do contexto e tópicos selecionados, por tópico
  getContextScope: (topicTitle: string) => Promise<ContextScope>;
  setContextScope: (topicTitle: string, value: ContextScope) => Promise<void>;
  getSelectedContextTopics: (topicTitle: string) => Promise<string[]>;
  setSelectedContextTopics: (topicTitle: string, value: string[]) => Promise<void>;
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
      // v1.51.0: spread de existing preserva TODAS as configs (main/complementary/scope/selected)
      const entry: ChatHistoryCacheEntry = {
        ...existing,
        topicTitle,
        messages,
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
          includeComplementaryDocs: entry.includeComplementaryDocs,  // v1.39.06
          contextScope: entry.contextScope,  // v1.51.0
          selectedContextTopics: entry.selectedContextTopics  // v1.51.0
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
        const exp = isNewFormat ? (value as ChatExportEntry) : null;
        const includeMainDocs = exp?.includeMainDocs;
        const includeComplementaryDocs = exp?.includeComplementaryDocs;
        const contextScope = exp?.contextScope;  // v1.51.0
        const selectedContextTopics = exp?.selectedContextTopics;  // v1.51.0

        const safeMessages = Array.isArray(messages) ? messages : [];
        const hasConfig = includeMainDocs !== undefined || includeComplementaryDocs !== undefined ||
          contextScope !== undefined || (selectedContextTopics && selectedContextTopics.length > 0);
        // v1.51.0: grava se tem mensagens OU config (antes descartava tópicos só-config)
        if (safeMessages.length === 0 && !hasConfig) continue;

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
          ...existing,
          topicTitle,
          messages: safeMessages,
          includeMainDocs,
          includeComplementaryDocs,  // v1.39.06
          contextScope,  // v1.51.0
          selectedContextTopics,  // v1.51.0
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
      // v1.51.0: spread preserva os demais campos (antes este setter apagava includeComplementaryDocs)
      const entry: ChatHistoryCacheEntry = {
        ...existing,
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
      // v1.51.0: spread preserva os demais campos (scope/selected/main)
      const entry: ChatHistoryCacheEntry = {
        ...existing,
        topicTitle,
        messages: existing?.messages || [],
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

  // ─────────────────────────────────────────────────────────────────────────
  // v1.51.0: Escopo do contexto (current/selected/all) por tópico
  // ─────────────────────────────────────────────────────────────────────────
  const getContextScope = useCallback(async (topicTitle: string): Promise<ContextScope> => {
    if (!topicTitle) return 'current';
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
      return entry?.contextScope ?? 'current';  // Default: 'current'
    } catch (e) {
      console.warn('[ChatHistoryCache] Erro ao obter contextScope:', e);
      return 'current';
    }
  }, []);

  const setContextScope = useCallback(async (topicTitle: string, value: ContextScope): Promise<void> => {
    if (!topicTitle) return;
    try {
      const db = await openChatDB();
      const tx = db.transaction(CHAT_STORE_NAME, 'readwrite');
      const store = tx.objectStore(CHAT_STORE_NAME);
      const index = store.index('topicTitle');
      const existing = await new Promise<ChatHistoryCacheEntry | undefined>((resolve) => {
        const req = index.get(topicTitle);
        req.onsuccess = () => resolve(req.result as ChatHistoryCacheEntry | undefined);
        req.onerror = () => resolve(undefined);
      });
      const now = Date.now();
      const entry: ChatHistoryCacheEntry = {
        ...existing,
        topicTitle,
        messages: existing?.messages || [],
        contextScope: value,
        createdAt: existing?.createdAt || now,
        updatedAt: now
      };
      if (existing?.id) { entry.id = existing.id; store.put(entry); } else { store.add(entry); }
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    } catch (e) {
      console.warn('[ChatHistoryCache] Erro ao salvar contextScope:', e);
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // v1.51.0: Tópicos selecionados para contexto, por tópico
  // ─────────────────────────────────────────────────────────────────────────
  const getSelectedContextTopics = useCallback(async (topicTitle: string): Promise<string[]> => {
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
      return entry?.selectedContextTopics ?? [];  // Default: []
    } catch (e) {
      console.warn('[ChatHistoryCache] Erro ao obter selectedContextTopics:', e);
      return [];
    }
  }, []);

  const setSelectedContextTopics = useCallback(async (topicTitle: string, value: string[]): Promise<void> => {
    if (!topicTitle) return;
    try {
      const db = await openChatDB();
      const tx = db.transaction(CHAT_STORE_NAME, 'readwrite');
      const store = tx.objectStore(CHAT_STORE_NAME);
      const index = store.index('topicTitle');
      const existing = await new Promise<ChatHistoryCacheEntry | undefined>((resolve) => {
        const req = index.get(topicTitle);
        req.onsuccess = () => resolve(req.result as ChatHistoryCacheEntry | undefined);
        req.onerror = () => resolve(undefined);
      });
      const now = Date.now();
      const entry: ChatHistoryCacheEntry = {
        ...existing,
        topicTitle,
        messages: existing?.messages || [],
        selectedContextTopics: value,
        createdAt: existing?.createdAt || now,
        updatedAt: now
      };
      if (existing?.id) { entry.id = existing.id; store.put(entry); } else { store.add(entry); }
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    } catch (e) {
      console.warn('[ChatHistoryCache] Erro ao salvar selectedContextTopics:', e);
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
    setIncludeComplementaryDocs,
    getContextScope,
    setContextScope,
    getSelectedContextTopics,
    setSelectedContextTopics
  }), [saveChat, getChat, deleteChat, clearAllChats, exportAll, importAll, getIncludeMainDocs, setIncludeMainDocs, getIncludeComplementaryDocs, setIncludeComplementaryDocs, getContextScope, setContextScope, getSelectedContextTopics, setSelectedContextTopics]);
};

export default useChatHistoryCache;
