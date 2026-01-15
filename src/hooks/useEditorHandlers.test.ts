/**
 * @file useEditorHandlers.test.ts
 * @description Testes para o hook de handlers de edição
 * @version 1.37.57
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEditorHandlers } from './useEditorHandlers';
import type { Topic, TopicCategory } from '../types';

describe('useEditorHandlers', () => {
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

  // Mock setters
  const mockSetEditingTopic = vi.fn();
  const mockSetSelectedTopics = vi.fn();
  const mockSetExtractedTopics = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // HOOK RETURN TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Hook Return', () => {
    it('should return all handler functions', () => {
      const { result } = renderHook(() =>
        useEditorHandlers({
          editingTopicTitle: 'TEST',
          setEditingTopic: mockSetEditingTopic,
          setSelectedTopics: mockSetSelectedTopics,
          setExtractedTopics: mockSetExtractedTopics
        })
      );

      expect(result.current.handleFundamentacaoChange).toBeInstanceOf(Function);
      expect(result.current.handleRelatorioChange).toBeInstanceOf(Function);
      expect(result.current.handleCategoryChange).toBeInstanceOf(Function);
      expect(result.current.getTopicEditorConfig).toBeInstanceOf(Function);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLE FUNDAMENTACAO CHANGE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('handleFundamentacaoChange', () => {
    it('should update editedFundamentacao', () => {
      const { result } = renderHook(() =>
        useEditorHandlers({
          editingTopicTitle: 'TEST',
          setEditingTopic: mockSetEditingTopic,
          setSelectedTopics: mockSetSelectedTopics,
          setExtractedTopics: mockSetExtractedTopics
        })
      );

      act(() => {
        result.current.handleFundamentacaoChange('<p>New fundamentacao</p>');
      });

      expect(mockSetEditingTopic).toHaveBeenCalled();

      // Verify the updater function
      const updater = mockSetEditingTopic.mock.calls[0][0];
      const prevTopic = createMockTopic();
      const newTopic = updater(prevTopic);

      expect(newTopic.editedFundamentacao).toBe('<p>New fundamentacao</p>');
    });

    it('should return prev if null', () => {
      const { result } = renderHook(() =>
        useEditorHandlers({
          editingTopicTitle: 'TEST',
          setEditingTopic: mockSetEditingTopic,
          setSelectedTopics: mockSetSelectedTopics,
          setExtractedTopics: mockSetExtractedTopics
        })
      );

      act(() => {
        result.current.handleFundamentacaoChange('<p>Content</p>');
      });

      const updater = mockSetEditingTopic.mock.calls[0][0];
      expect(updater(null)).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLE RELATORIO CHANGE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('handleRelatorioChange', () => {
    it('should update editedRelatorio', () => {
      const { result } = renderHook(() =>
        useEditorHandlers({
          editingTopicTitle: 'TEST',
          setEditingTopic: mockSetEditingTopic,
          setSelectedTopics: mockSetSelectedTopics,
          setExtractedTopics: mockSetExtractedTopics
        })
      );

      act(() => {
        result.current.handleRelatorioChange('<p>New relatorio</p>');
      });

      expect(mockSetEditingTopic).toHaveBeenCalled();

      const updater = mockSetEditingTopic.mock.calls[0][0];
      const prevTopic = createMockTopic();
      const newTopic = updater(prevTopic);

      expect(newTopic.editedRelatorio).toBe('<p>New relatorio</p>');
    });

    it('should return prev if null', () => {
      const { result } = renderHook(() =>
        useEditorHandlers({
          editingTopicTitle: 'TEST',
          setEditingTopic: mockSetEditingTopic,
          setSelectedTopics: mockSetSelectedTopics,
          setExtractedTopics: mockSetExtractedTopics
        })
      );

      act(() => {
        result.current.handleRelatorioChange('<p>Content</p>');
      });

      const updater = mockSetEditingTopic.mock.calls[0][0];
      expect(updater(null)).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLE CATEGORY CHANGE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('handleCategoryChange', () => {
    it('should update category in editingTopic', () => {
      const { result } = renderHook(() =>
        useEditorHandlers({
          editingTopicTitle: 'HORAS EXTRAS',
          setEditingTopic: mockSetEditingTopic,
          setSelectedTopics: mockSetSelectedTopics,
          setExtractedTopics: mockSetExtractedTopics
        })
      );

      act(() => {
        result.current.handleCategoryChange('PRELIMINAR');
      });

      // Should update editingTopic
      const editingUpdater = mockSetEditingTopic.mock.calls[0][0];
      const prevTopic = createMockTopic({ category: 'MÉRITO' });
      const newTopic = editingUpdater(prevTopic);

      expect(newTopic.category).toBe('PRELIMINAR');
    });

    it('should update category in selectedTopics', () => {
      const { result } = renderHook(() =>
        useEditorHandlers({
          editingTopicTitle: 'HORAS EXTRAS',
          setEditingTopic: mockSetEditingTopic,
          setSelectedTopics: mockSetSelectedTopics,
          setExtractedTopics: mockSetExtractedTopics
        })
      );

      act(() => {
        result.current.handleCategoryChange('PRELIMINAR');
      });

      // Should update selectedTopics
      const selectedUpdater = mockSetSelectedTopics.mock.calls[0][0];
      const prevSelected = [
        createMockTopic({ title: 'HORAS EXTRAS', category: 'MÉRITO' }),
        createMockTopic({ title: 'FÉRIAS', category: 'MÉRITO' })
      ];
      const newSelected = selectedUpdater(prevSelected);

      expect(newSelected[0].category).toBe('PRELIMINAR');
      expect(newSelected[1].category).toBe('MÉRITO'); // Unchanged
    });

    it('should update category in extractedTopics', () => {
      const { result } = renderHook(() =>
        useEditorHandlers({
          editingTopicTitle: 'HORAS EXTRAS',
          setEditingTopic: mockSetEditingTopic,
          setSelectedTopics: mockSetSelectedTopics,
          setExtractedTopics: mockSetExtractedTopics
        })
      );

      act(() => {
        result.current.handleCategoryChange('PRELIMINAR');
      });

      // Should update extractedTopics
      const extractedUpdater = mockSetExtractedTopics.mock.calls[0][0];
      const prevExtracted = [
        createMockTopic({ title: 'HORAS EXTRAS', category: 'MÉRITO' })
      ];
      const newExtracted = extractedUpdater(prevExtracted);

      expect(newExtracted[0].category).toBe('PRELIMINAR');
    });

    it('should not update if topic not found in selected', () => {
      const { result } = renderHook(() =>
        useEditorHandlers({
          editingTopicTitle: 'NOT FOUND',
          setEditingTopic: mockSetEditingTopic,
          setSelectedTopics: mockSetSelectedTopics,
          setExtractedTopics: mockSetExtractedTopics
        })
      );

      act(() => {
        result.current.handleCategoryChange('PRELIMINAR');
      });

      const selectedUpdater = mockSetSelectedTopics.mock.calls[0][0];
      const prevSelected = [createMockTopic({ title: 'HORAS EXTRAS' })];
      const newSelected = selectedUpdater(prevSelected);

      expect(newSelected).toBe(prevSelected); // No change
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET TOPIC EDITOR CONFIG TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getTopicEditorConfig', () => {
    it('should return RELATÓRIO config', () => {
      const { result } = renderHook(() =>
        useEditorHandlers({
          editingTopicTitle: 'TEST',
          setEditingTopic: mockSetEditingTopic,
          setSelectedTopics: mockSetSelectedTopics,
          setExtractedTopics: mockSetExtractedTopics
        })
      );

      const config = result.current.getTopicEditorConfig('RELATÓRIO');

      expect(config.showCategory).toBe(false);
      expect(config.showMiniRelatorio).toBe(true);
      expect(config.showDecisionEditor).toBe(false);
      expect(config.relatorioConfig.label).toBe('📄 Relatório:');
      expect(config.relatorioConfig.showRegenerateSection).toBe(true);
    });

    it('should return DISPOSITIVO config', () => {
      const { result } = renderHook(() =>
        useEditorHandlers({
          editingTopicTitle: 'TEST',
          setEditingTopic: mockSetEditingTopic,
          setSelectedTopics: mockSetSelectedTopics,
          setExtractedTopics: mockSetExtractedTopics
        })
      );

      const config = result.current.getTopicEditorConfig('DISPOSITIVO');

      expect(config.showCategory).toBe(false);
      expect(config.showMiniRelatorio).toBe(false);
      expect(config.showDecisionEditor).toBe(true);
      expect(config.editorConfig.label).toBe('📋 Dispositivo:');
      expect(config.editorConfig.showRegenerateSection).toBe(true);
    });

    it('should return default config for normal topics', () => {
      const { result } = renderHook(() =>
        useEditorHandlers({
          editingTopicTitle: 'TEST',
          setEditingTopic: mockSetEditingTopic,
          setSelectedTopics: mockSetSelectedTopics,
          setExtractedTopics: mockSetExtractedTopics
        })
      );

      const config = result.current.getTopicEditorConfig('HORAS EXTRAS');

      expect(config.showCategory).toBe(true);
      expect(config.showMiniRelatorio).toBe(true);
      expect(config.showDecisionEditor).toBe(true);
    });

    it('should handle case-insensitive titles', () => {
      const { result } = renderHook(() =>
        useEditorHandlers({
          editingTopicTitle: 'TEST',
          setEditingTopic: mockSetEditingTopic,
          setSelectedTopics: mockSetSelectedTopics,
          setExtractedTopics: mockSetExtractedTopics
        })
      );

      const config1 = result.current.getTopicEditorConfig('relatório');
      const config2 = result.current.getTopicEditorConfig('RELATÓRIO');
      const config3 = result.current.getTopicEditorConfig('Relatório');

      expect(config1.showCategory).toBe(config2.showCategory);
      expect(config2.showCategory).toBe(config3.showCategory);
    });

    it('should handle null/undefined title', () => {
      const { result } = renderHook(() =>
        useEditorHandlers({
          editingTopicTitle: 'TEST',
          setEditingTopic: mockSetEditingTopic,
          setSelectedTopics: mockSetSelectedTopics,
          setExtractedTopics: mockSetExtractedTopics
        })
      );

      const config1 = result.current.getTopicEditorConfig(null as any);
      const config2 = result.current.getTopicEditorConfig(undefined as any);

      // Should return default config
      expect(config1.showCategory).toBe(true);
      expect(config2.showCategory).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CALLBACK STABILITY TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Callback Stability', () => {
    it('handlers should be stable when deps unchanged', () => {
      const { result, rerender } = renderHook(
        (props) => useEditorHandlers(props),
        {
          initialProps: {
            editingTopicTitle: 'TEST',
            setEditingTopic: mockSetEditingTopic,
            setSelectedTopics: mockSetSelectedTopics,
            setExtractedTopics: mockSetExtractedTopics
          }
        }
      );

      const first = result.current.handleFundamentacaoChange;
      rerender({
        editingTopicTitle: 'TEST',
        setEditingTopic: mockSetEditingTopic,
        setSelectedTopics: mockSetSelectedTopics,
        setExtractedTopics: mockSetExtractedTopics
      });
      const second = result.current.handleFundamentacaoChange;

      expect(first).toBe(second);
    });

    it('getTopicEditorConfig should be stable', () => {
      const { result, rerender } = renderHook(
        (props) => useEditorHandlers(props),
        {
          initialProps: {
            editingTopicTitle: 'TEST',
            setEditingTopic: mockSetEditingTopic,
            setSelectedTopics: mockSetSelectedTopics,
            setExtractedTopics: mockSetExtractedTopics
          }
        }
      );

      const first = result.current.getTopicEditorConfig;
      rerender({
        editingTopicTitle: 'TEST',
        setEditingTopic: mockSetEditingTopic,
        setSelectedTopics: mockSetSelectedTopics,
        setExtractedTopics: mockSetExtractedTopics
      });
      const second = result.current.getTopicEditorConfig;

      expect(first).toBe(second);
    });
  });
});
