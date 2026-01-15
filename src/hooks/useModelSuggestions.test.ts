/**
 * @file useModelSuggestions.test.ts
 * @description Testes para o hook de sugestões de modelos
 * @version 1.37.57
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useModelSuggestions } from './useModelSuggestions';
import { useModelsStore } from '../stores/useModelsStore';
import type { Model, Topic, TopicCategory } from '../types';

// Mock useModelsStore
vi.mock('../stores/useModelsStore', () => ({
  useModelsStore: {
    getState: vi.fn()
  }
}));

// Mock AIModelService
vi.mock('../services/AIModelService', () => ({
  default: {
    getEmbedding: vi.fn().mockResolvedValue(new Array(768).fill(0.1)),
    cosineSimilarity: vi.fn().mockReturnValue(0.8)
  }
}));

// Mock isSpecialTopic
vi.mock('../utils/text', () => ({
  isSpecialTopic: vi.fn((topic) => {
    const title = topic?.title?.toUpperCase() || '';
    return title === 'RELATÓRIO' || title === 'DISPOSITIVO';
  })
}));

describe('useModelSuggestions', () => {
  // Mock model factory
  const createMockModel = (overrides: Partial<Model> = {}): Model => ({
    id: `model-${Date.now()}-${Math.random()}`,
    title: 'Test Model',
    content: '<p>Test content</p>',
    keywords: 'test, keywords',
    category: 'MÉRITO',
    createdAt: new Date().toISOString(),
    ...overrides
  });

  // Mock topic factory
  const createMockTopic = (overrides: Partial<Topic> = {}): Topic => ({
    id: `topic-${Date.now()}-${Math.random()}`,
    title: 'HORAS EXTRAS',
    content: '',
    category: 'MÉRITO' as TopicCategory,
    relatorio: '',
    fundamentacao: '',
    dispositivo: '',
    ...overrides
  });

  // Mock AI integration
  const mockCallAI = vi.fn();
  const mockBuildApiRequest = vi.fn();

  const createMockAIIntegration = (overrides: any = {}) => ({
    aiSettings: {
      useLocalAIForSuggestions: overrides.useLocalAIForSuggestions ?? false,
      modelSemanticThreshold: overrides.modelSemanticThreshold ?? 60
    },
    buildApiRequest: mockBuildApiRequest,
    callAI: mockCallAI
  });

  // Mock API cache
  const mockCacheGet = vi.fn();
  const mockCacheSet = vi.fn();

  const createMockAPICache = () => ({
    get: mockCacheGet,
    set: mockCacheSet
  });

  // Mock models in store
  const mockModels: Model[] = [];

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup Zustand store mock
    (useModelsStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({
      models: mockModels
    });

    // Default AI response
    mockCallAI.mockResolvedValue('["model-1", "model-2"]');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // HOOK RETURN TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Hook Return', () => {
    it('should return findSuggestions function', () => {
      const { result } = renderHook(() =>
        useModelSuggestions({
          aiIntegration: createMockAIIntegration() as any,
          apiCache: createMockAPICache(),
          searchModelReady: false
        })
      );

      expect(result.current.findSuggestions).toBeInstanceOf(Function);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SPECIAL TOPIC TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Special Topics', () => {
    it('should return empty for RELATÓRIO topic', async () => {
      const { result } = renderHook(() =>
        useModelSuggestions({
          aiIntegration: createMockAIIntegration() as any,
          apiCache: createMockAPICache(),
          searchModelReady: false
        })
      );

      let suggestions: any;
      await act(async () => {
        suggestions = await result.current.findSuggestions(
          createMockTopic({ title: 'RELATÓRIO' })
        );
      });

      expect(suggestions.suggestions).toEqual([]);
      expect(suggestions.source).toBeNull();
    });

    it('should return empty for DISPOSITIVO topic', async () => {
      const { result } = renderHook(() =>
        useModelSuggestions({
          aiIntegration: createMockAIIntegration() as any,
          apiCache: createMockAPICache(),
          searchModelReady: false
        })
      );

      let suggestions: any;
      await act(async () => {
        suggestions = await result.current.findSuggestions(
          createMockTopic({ title: 'DISPOSITIVO' })
        );
      });

      expect(suggestions.suggestions).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EMPTY/INVALID TOPIC TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Empty/Invalid Topics', () => {
    it('should return empty for null topic', async () => {
      const { result } = renderHook(() =>
        useModelSuggestions({
          aiIntegration: createMockAIIntegration() as any,
          apiCache: createMockAPICache(),
          searchModelReady: false
        })
      );

      let suggestions: any;
      await act(async () => {
        suggestions = await result.current.findSuggestions(null as any);
      });

      expect(suggestions.suggestions).toEqual([]);
    });

    it('should return empty for topic with short title', async () => {
      const { result } = renderHook(() =>
        useModelSuggestions({
          aiIntegration: createMockAIIntegration() as any,
          apiCache: createMockAPICache(),
          searchModelReady: false
        })
      );

      let suggestions: any;
      await act(async () => {
        suggestions = await result.current.findSuggestions(
          createMockTopic({ title: 'AB' }) // Less than 3 chars
        );
      });

      expect(suggestions.suggestions).toEqual([]);
    });

    it('should return empty when no models exist', async () => {
      (useModelsStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({
        models: []
      });

      const { result } = renderHook(() =>
        useModelSuggestions({
          aiIntegration: createMockAIIntegration() as any,
          apiCache: createMockAPICache(),
          searchModelReady: false
        })
      );

      let suggestions: any;
      await act(async () => {
        suggestions = await result.current.findSuggestions(
          createMockTopic({ title: 'HORAS EXTRAS' })
        );
      });

      expect(suggestions.suggestions).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CACHE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Cache', () => {
    it('should return cached result if available', async () => {
      const cachedResult = { suggestions: [createMockModel()], source: 'api' };
      mockCacheGet.mockReturnValue(JSON.stringify(cachedResult));

      (useModelsStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({
        models: [createMockModel()]
      });

      const { result } = renderHook(() =>
        useModelSuggestions({
          aiIntegration: createMockAIIntegration() as any,
          apiCache: createMockAPICache(),
          searchModelReady: false
        })
      );

      let suggestions: any;
      await act(async () => {
        suggestions = await result.current.findSuggestions(
          createMockTopic({ title: 'HORAS EXTRAS' })
        );
      });

      expect(mockCallAI).not.toHaveBeenCalled();
      expect(suggestions.source).toBe('api');
    });

    it('should cache results after finding suggestions', async () => {
      const models = [
        createMockModel({ id: 'model-1', title: 'Horas Extras Model', category: 'MÉRITO' })
      ];
      (useModelsStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({ models });

      mockCacheGet.mockReturnValue(null);
      mockCallAI.mockResolvedValue('["model-1"]');

      const { result } = renderHook(() =>
        useModelSuggestions({
          aiIntegration: createMockAIIntegration() as any,
          apiCache: createMockAPICache(),
          searchModelReady: false
        })
      );

      await act(async () => {
        await result.current.findSuggestions(
          createMockTopic({ title: 'HORAS EXTRAS', category: 'MÉRITO' })
        );
      });

      expect(mockCacheSet).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // LOCAL AI TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Local AI', () => {
    it('should use local AI when enabled and model ready', async () => {
      const modelsWithEmbedding = [
        createMockModel({ id: 'model-1', embedding: new Array(768).fill(0.1) })
      ];
      (useModelsStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({
        models: modelsWithEmbedding
      });

      const AIModelService = await import('../services/AIModelService');
      (AIModelService.default.cosineSimilarity as ReturnType<typeof vi.fn>).mockReturnValue(0.8);

      mockCacheGet.mockReturnValue(null);

      const { result } = renderHook(() =>
        useModelSuggestions({
          aiIntegration: createMockAIIntegration({ useLocalAIForSuggestions: true }) as any,
          apiCache: createMockAPICache(),
          searchModelReady: true
        })
      );

      let suggestions: any;
      await act(async () => {
        suggestions = await result.current.findSuggestions(
          createMockTopic({ title: 'HORAS EXTRAS' })
        );
      });

      expect(suggestions.source).toBe('local');
      expect(mockCallAI).not.toHaveBeenCalled();
    });

    it('should fallback to API when local AI fails', async () => {
      const models = [
        createMockModel({ id: 'model-1', title: 'Horas', embedding: new Array(768).fill(0.1) })
      ];
      (useModelsStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({ models });

      const AIModelService = await import('../services/AIModelService');
      (AIModelService.default.getEmbedding as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Failed'));

      mockCacheGet.mockReturnValue(null);
      mockCallAI.mockResolvedValue('["model-1"]');

      const { result } = renderHook(() =>
        useModelSuggestions({
          aiIntegration: createMockAIIntegration({ useLocalAIForSuggestions: true }) as any,
          apiCache: createMockAPICache(),
          searchModelReady: true
        })
      );

      let suggestions: any;
      await act(async () => {
        suggestions = await result.current.findSuggestions(
          createMockTopic({ title: 'HORAS EXTRAS' })
        );
      });

      // Should have fallen back to API
      expect(suggestions.source).toBe('api');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // API REFINEMENT TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('API Refinement', () => {
    it('should refine candidates with AI', async () => {
      const models = [
        createMockModel({ id: 'model-1', title: 'Horas Extras', category: 'MÉRITO' }),
        createMockModel({ id: 'model-2', title: 'Horas', category: 'MÉRITO' })
      ];
      (useModelsStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({ models });

      mockCacheGet.mockReturnValue(null);
      mockCallAI.mockResolvedValue('["model-2", "model-1"]');

      const { result } = renderHook(() =>
        useModelSuggestions({
          aiIntegration: createMockAIIntegration() as any,
          apiCache: createMockAPICache(),
          searchModelReady: false
        })
      );

      let suggestions: any;
      await act(async () => {
        suggestions = await result.current.findSuggestions(
          createMockTopic({ title: 'HORAS EXTRAS', category: 'MÉRITO' })
        );
      });

      expect(mockCallAI).toHaveBeenCalled();
      expect(suggestions.source).toBe('api');
      // AI ranked model-2 first
      expect(suggestions.suggestions[0].id).toBe('model-2');
    });

    it('should return original candidates when AI fails', async () => {
      const models = [
        createMockModel({ id: 'model-1', title: 'Horas Extras', category: 'MÉRITO' })
      ];
      (useModelsStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({ models });

      mockCacheGet.mockReturnValue(null);
      mockCallAI.mockRejectedValue(new Error('API Error'));

      const { result } = renderHook(() =>
        useModelSuggestions({
          aiIntegration: createMockAIIntegration() as any,
          apiCache: createMockAPICache(),
          searchModelReady: false
        })
      );

      let suggestions: any;
      await act(async () => {
        suggestions = await result.current.findSuggestions(
          createMockTopic({ title: 'HORAS EXTRAS' })
        );
      });

      expect(suggestions.suggestions).toHaveLength(1);
    });

    it('should handle invalid JSON from AI', async () => {
      const models = [
        createMockModel({ id: 'model-1', title: 'Horas Extras', category: 'MÉRITO' })
      ];
      (useModelsStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({ models });

      mockCacheGet.mockReturnValue(null);
      mockCallAI.mockResolvedValue('Not valid JSON');

      const { result } = renderHook(() =>
        useModelSuggestions({
          aiIntegration: createMockAIIntegration() as any,
          apiCache: createMockAPICache(),
          searchModelReady: false
        })
      );

      let suggestions: any;
      await act(async () => {
        suggestions = await result.current.findSuggestions(
          createMockTopic({ title: 'HORAS EXTRAS' })
        );
      });

      // Should still return candidates
      expect(suggestions.suggestions).toHaveLength(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SCORING TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Scoring', () => {
    it('should score higher for matching titles', async () => {
      const models = [
        createMockModel({ id: 'match', title: 'Horas Extras', category: 'MÉRITO' }),
        createMockModel({ id: 'nomatch', title: 'Férias', category: 'MÉRITO' })
      ];
      (useModelsStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({ models });

      mockCacheGet.mockReturnValue(null);
      // Return both models
      mockCallAI.mockResolvedValue('["match", "nomatch"]');

      const { result } = renderHook(() =>
        useModelSuggestions({
          aiIntegration: createMockAIIntegration() as any,
          apiCache: createMockAPICache(),
          searchModelReady: false
        })
      );

      let suggestions: any;
      await act(async () => {
        suggestions = await result.current.findSuggestions(
          createMockTopic({ title: 'HORAS EXTRAS' })
        );
      });

      // Only 'match' model should have score > 0 from local scoring
      expect(suggestions.suggestions.some((s: Model) => s.id === 'match')).toBe(true);
    });

    it('should score higher for matching categories', async () => {
      const models = [
        createMockModel({ id: 'merito', title: 'Test', category: 'MÉRITO' }),
        createMockModel({ id: 'prelim', title: 'Test', category: 'PRELIMINAR' })
      ];
      (useModelsStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({ models });

      mockCacheGet.mockReturnValue(null);
      mockCallAI.mockResolvedValue('["merito", "prelim"]');

      const { result } = renderHook(() =>
        useModelSuggestions({
          aiIntegration: createMockAIIntegration() as any,
          apiCache: createMockAPICache(),
          searchModelReady: false
        })
      );

      await act(async () => {
        await result.current.findSuggestions(
          createMockTopic({ title: 'Test Topic', category: 'MÉRITO' })
        );
      });

      // Both should be in candidates as they match title
      expect(mockCallAI).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CALLBACK STABILITY TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Callback Stability', () => {
    it('findSuggestions should be stable when deps unchanged', () => {
      const aiIntegration = createMockAIIntegration();
      const apiCache = createMockAPICache();

      const { result, rerender } = renderHook(
        (props) => useModelSuggestions(props),
        {
          initialProps: {
            aiIntegration: aiIntegration as any,
            apiCache,
            searchModelReady: false
          }
        }
      );

      const first = result.current.findSuggestions;
      rerender({
        aiIntegration: aiIntegration as any,
        apiCache,
        searchModelReady: false
      });
      const second = result.current.findSuggestions;

      expect(first).toBe(second);
    });
  });
});
