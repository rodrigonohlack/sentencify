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

  // v1.39.06: Testes para includeComplementaryDocs
  describe('includeComplementaryDocs', () => {
    it('should return false by default (no entry)', async () => {
      const { result } = renderHook(() => useChatHistoryCache());

      let value = true;
      await act(async () => {
        value = await result.current.getIncludeComplementaryDocs('New Topic');
      });

      expect(value).toBe(false);
    });

    it('should set and get includeComplementaryDocs', async () => {
      const { result } = renderHook(() => useChatHistoryCache());

      await act(async () => {
        await result.current.setIncludeComplementaryDocs('My Topic', true);
      });

      let value = false;
      await act(async () => {
        value = await result.current.getIncludeComplementaryDocs('My Topic');
      });

      expect(value).toBe(true);
    });

    it('should preserve messages when setting includeComplementaryDocs', async () => {
      const { result } = renderHook(() => useChatHistoryCache());
      const messages = [makeChatMessage('user', 'Keep me')];

      await act(async () => {
        await result.current.saveChat('Topic', messages);
        await result.current.setIncludeComplementaryDocs('Topic', true);
      });

      let retrieved: ChatMessage[] = [];
      await act(async () => {
        retrieved = await result.current.getChat('Topic');
      });

      expect(retrieved[0].content).toBe('Keep me');
    });

    it('should preserve includeComplementaryDocs when saving new messages', async () => {
      const { result } = renderHook(() => useChatHistoryCache());

      await act(async () => {
        await result.current.setIncludeComplementaryDocs('Topic', true);
        await result.current.saveChat('Topic', [makeChatMessage('user', 'New msg')]);
      });

      let value = false;
      await act(async () => {
        value = await result.current.getIncludeComplementaryDocs('Topic');
      });

      expect(value).toBe(true);
    });

    it('should preserve includeMainDocs when setting includeComplementaryDocs', async () => {
      const { result } = renderHook(() => useChatHistoryCache());

      await act(async () => {
        await result.current.setIncludeMainDocs('Topic', true);
        await result.current.setIncludeComplementaryDocs('Topic', true);
      });

      let mainDocs = false;
      let complementaryDocs = false;
      await act(async () => {
        mainDocs = await result.current.getIncludeMainDocs('Topic');
        complementaryDocs = await result.current.getIncludeComplementaryDocs('Topic');
      });

      expect(mainDocs).toBe(true);
      expect(complementaryDocs).toBe(true);
    });

    it('should export includeComplementaryDocs', async () => {
      const { result } = renderHook(() => useChatHistoryCache());

      await act(async () => {
        await result.current.saveChat('Topic A', [makeChatMessage('user', 'Test')]);
        await result.current.setIncludeComplementaryDocs('Topic A', true);
      });

      let exported: Record<string, { messages: ChatMessage[]; includeMainDocs?: boolean; includeComplementaryDocs?: boolean }> = {};
      await act(async () => {
        exported = await result.current.exportAll();
      });

      expect(exported['Topic A'].includeComplementaryDocs).toBe(true);
    });

    it('should import includeComplementaryDocs', async () => {
      const { result } = renderHook(() => useChatHistoryCache());

      const importData = {
        'Topic Imported': {
          messages: [makeChatMessage('user', 'Imported msg')],
          includeMainDocs: true,
          includeComplementaryDocs: true,
        },
      };

      await act(async () => {
        await result.current.importAll(importData);
      });

      let mainDocs = false;
      let complementaryDocs = false;
      await act(async () => {
        mainDocs = await result.current.getIncludeMainDocs('Topic Imported');
        complementaryDocs = await result.current.getIncludeComplementaryDocs('Topic Imported');
      });

      expect(mainDocs).toBe(true);
      expect(complementaryDocs).toBe(true);
    });
  });

  // v1.51.0: novas configs de contexto por tópico
  describe('contextScope', () => {
    it("should return 'current' by default (no entry)", async () => {
      const { result } = renderHook(() => useChatHistoryCache());
      let value: string = 'all';
      await act(async () => { value = await result.current.getContextScope('New Topic'); });
      expect(value).toBe('current');
    });

    it('should set and get contextScope', async () => {
      const { result } = renderHook(() => useChatHistoryCache());
      await act(async () => { await result.current.setContextScope('My Topic', 'all'); });
      let value: string = 'current';
      await act(async () => { value = await result.current.getContextScope('My Topic'); });
      expect(value).toBe('all');
    });
  });

  describe('selectedContextTopics', () => {
    it('should return [] by default (no entry)', async () => {
      const { result } = renderHook(() => useChatHistoryCache());
      let value: string[] = ['x'];
      await act(async () => { value = await result.current.getSelectedContextTopics('New Topic'); });
      expect(value).toEqual([]);
    });

    it('should set and get selectedContextTopics', async () => {
      const { result } = renderHook(() => useChatHistoryCache());
      await act(async () => { await result.current.setSelectedContextTopics('My Topic', ['A', 'B']); });
      let value: string[] = [];
      await act(async () => { value = await result.current.getSelectedContextTopics('My Topic'); });
      expect(value).toEqual(['A', 'B']);
    });
  });

  // v1.51.0: writers preservam todos os campos (corrige bug do includeComplementaryDocs apagado)
  describe('field preservation across setters', () => {
    it('setIncludeMainDocs should NOT wipe includeComplementaryDocs', async () => {
      const { result } = renderHook(() => useChatHistoryCache());
      await act(async () => {
        await result.current.setIncludeComplementaryDocs('T', true);
        await result.current.setIncludeMainDocs('T', true);
      });
      let comp = false;
      await act(async () => { comp = await result.current.getIncludeComplementaryDocs('T'); });
      expect(comp).toBe(true);
    });

    it('setContextScope preserves includeMainDocs and selectedContextTopics', async () => {
      const { result } = renderHook(() => useChatHistoryCache());
      await act(async () => {
        await result.current.setIncludeMainDocs('T', true);
        await result.current.setSelectedContextTopics('T', ['X']);
        await result.current.setContextScope('T', 'selected');
      });
      let main = false; let sel: string[] = []; let scope = 'current';
      await act(async () => {
        main = await result.current.getIncludeMainDocs('T');
        sel = await result.current.getSelectedContextTopics('T');
        scope = await result.current.getContextScope('T');
      });
      expect(main).toBe(true);
      expect(sel).toEqual(['X']);
      expect(scope).toBe('selected');
    });
  });
});
