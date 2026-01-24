import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useChatHistoryCache from './useChatHistoryCache';
import type { ChatMessage } from '../types';

// fake-indexeddb is configured in setup.js

const makeChatMessage = (role: 'user' | 'assistant', content: string): ChatMessage => ({
  role,
  content,
  timestamp: Date.now(),
});

describe('useChatHistoryCache', () => {
  beforeEach(async () => {
    // Clear all databases between tests
    const databases = await indexedDB.databases();
    for (const db of databases) {
      if (db.name) indexedDB.deleteDatabase(db.name);
    }
  });

  describe('saveChat and getChat', () => {
    it('should save and retrieve chat messages', async () => {
      const { result } = renderHook(() => useChatHistoryCache());

      const messages: ChatMessage[] = [
        makeChatMessage('user', 'Hello'),
        makeChatMessage('assistant', 'Hi there!'),
      ];

      await act(async () => {
        await result.current.saveChat('Horas Extras', messages);
      });

      let retrieved: ChatMessage[] = [];
      await act(async () => {
        retrieved = await result.current.getChat('Horas Extras');
      });

      expect(retrieved).toHaveLength(2);
      expect(retrieved[0].content).toBe('Hello');
      expect(retrieved[1].content).toBe('Hi there!');
    });

    it('should return empty array for non-existent topic', async () => {
      const { result } = renderHook(() => useChatHistoryCache());

      let retrieved: ChatMessage[] = [];
      await act(async () => {
        retrieved = await result.current.getChat('Non-existent');
      });

      expect(retrieved).toEqual([]);
    });

    it('should return empty array for empty topic title', async () => {
      const { result } = renderHook(() => useChatHistoryCache());

      let retrieved: ChatMessage[] = [];
      await act(async () => {
        retrieved = await result.current.getChat('');
      });

      expect(retrieved).toEqual([]);
    });

    it('should overwrite existing chat for same topic', async () => {
      const { result } = renderHook(() => useChatHistoryCache());

      const messages1: ChatMessage[] = [makeChatMessage('user', 'First')];
      const messages2: ChatMessage[] = [makeChatMessage('user', 'Second')];

      await act(async () => {
        await result.current.saveChat('Topic A', messages1);
        await result.current.saveChat('Topic A', messages2);
      });

      let retrieved: ChatMessage[] = [];
      await act(async () => {
        retrieved = await result.current.getChat('Topic A');
      });

      expect(retrieved).toHaveLength(1);
      expect(retrieved[0].content).toBe('Second');
    });

    it('should not save empty messages array', async () => {
      const { result } = renderHook(() => useChatHistoryCache());

      await act(async () => {
        await result.current.saveChat('Topic', []);
      });

      let retrieved: ChatMessage[] = [];
      await act(async () => {
        retrieved = await result.current.getChat('Topic');
      });

      expect(retrieved).toEqual([]);
    });
  });

  describe('deleteChat', () => {
    it('should delete a chat by topic title', async () => {
      const { result } = renderHook(() => useChatHistoryCache());
      const messages = [makeChatMessage('user', 'Test')];

      await act(async () => {
        await result.current.saveChat('To Delete', messages);
      });

      await act(async () => {
        await result.current.deleteChat('To Delete');
      });

      let retrieved: ChatMessage[] = [];
      await act(async () => {
        retrieved = await result.current.getChat('To Delete');
      });

      expect(retrieved).toEqual([]);
    });

    it('should not throw for non-existent topic', async () => {
      const { result } = renderHook(() => useChatHistoryCache());

      await act(async () => {
        await result.current.deleteChat('Non-existent');
      });
      // No error thrown
    });
  });

  describe('clearAllChats', () => {
    it('should clear all stored chats', async () => {
      const { result } = renderHook(() => useChatHistoryCache());

      await act(async () => {
        await result.current.saveChat('Topic A', [makeChatMessage('user', 'A')]);
        await result.current.saveChat('Topic B', [makeChatMessage('user', 'B')]);
      });

      await act(async () => {
        await result.current.clearAllChats();
      });

      let retrievedA: ChatMessage[] = [];
      let retrievedB: ChatMessage[] = [];
      await act(async () => {
        retrievedA = await result.current.getChat('Topic A');
        retrievedB = await result.current.getChat('Topic B');
      });

      expect(retrievedA).toEqual([]);
      expect(retrievedB).toEqual([]);
    });
  });

  describe('exportAll and importAll', () => {
    it('should export all chats', async () => {
      const { result } = renderHook(() => useChatHistoryCache());

      await act(async () => {
        await result.current.saveChat('Topic A', [makeChatMessage('user', 'Hello A')]);
        await result.current.saveChat('Topic B', [makeChatMessage('user', 'Hello B')]);
      });

      let exported: Record<string, unknown> = {};
      await act(async () => {
        exported = await result.current.exportAll();
      });

      expect(Object.keys(exported)).toContain('Topic A');
      expect(Object.keys(exported)).toContain('Topic B');
    });

    it('should import chats in new format (with includeMainDocs)', async () => {
      const { result } = renderHook(() => useChatHistoryCache());

      const importData = {
        'Topic Imported': {
          messages: [makeChatMessage('user', 'Imported msg')],
          includeMainDocs: true,
        },
      };

      await act(async () => {
        await result.current.importAll(importData);
      });

      let retrieved: ChatMessage[] = [];
      await act(async () => {
        retrieved = await result.current.getChat('Topic Imported');
      });

      expect(retrieved).toHaveLength(1);
      expect(retrieved[0].content).toBe('Imported msg');
    });

    it('should import chats in legacy format (array of messages)', async () => {
      const { result } = renderHook(() => useChatHistoryCache());

      const importData = {
        'Legacy Topic': [makeChatMessage('user', 'Legacy msg')],
      };

      await act(async () => {
        await result.current.importAll(importData);
      });

      let retrieved: ChatMessage[] = [];
      await act(async () => {
        retrieved = await result.current.getChat('Legacy Topic');
      });

      expect(retrieved).toHaveLength(1);
      expect(retrieved[0].content).toBe('Legacy msg');
    });

    it('should handle null/invalid import data', async () => {
      const { result } = renderHook(() => useChatHistoryCache());

      await act(async () => {
        await result.current.importAll(null as unknown as Record<string, never>);
      });
      // Should not throw
    });
  });

  describe('includeMainDocs', () => {
    it('should return false by default (no entry)', async () => {
      const { result } = renderHook(() => useChatHistoryCache());

      let value = true;
      await act(async () => {
        value = await result.current.getIncludeMainDocs('New Topic');
      });

      expect(value).toBe(false);
    });

    it('should set and get includeMainDocs', async () => {
      const { result } = renderHook(() => useChatHistoryCache());

      await act(async () => {
        await result.current.setIncludeMainDocs('My Topic', true);
      });

      let value = false;
      await act(async () => {
        value = await result.current.getIncludeMainDocs('My Topic');
      });

      expect(value).toBe(true);
    });

    it('should preserve messages when setting includeMainDocs', async () => {
      const { result } = renderHook(() => useChatHistoryCache());
      const messages = [makeChatMessage('user', 'Keep me')];

      await act(async () => {
        await result.current.saveChat('Topic', messages);
        await result.current.setIncludeMainDocs('Topic', true);
      });

      let retrieved: ChatMessage[] = [];
      await act(async () => {
        retrieved = await result.current.getChat('Topic');
      });

      expect(retrieved[0].content).toBe('Keep me');
    });

    it('should preserve includeMainDocs when saving new messages', async () => {
      const { result } = renderHook(() => useChatHistoryCache());

      await act(async () => {
        await result.current.setIncludeMainDocs('Topic', true);
        await result.current.saveChat('Topic', [makeChatMessage('user', 'New msg')]);
      });

      let value = false;
      await act(async () => {
        value = await result.current.getIncludeMainDocs('Topic');
      });

      expect(value).toBe(true);
    });
  });
});
