/**
 * @file useTabbedInterface.test.ts
 * @description Testes para o hook de gerenciamento de abas
 * @version 1.37.57
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTabbedInterface, TABS, READONLY_TABS, type TabId } from './useTabbedInterface';

describe('useTabbedInterface', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // INITIAL STATE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Initial State', () => {
    it('should start with upload tab by default', () => {
      const { result } = renderHook(() => useTabbedInterface());

      expect(result.current.activeTab).toBe('upload');
    });

    it('should start with custom initial tab', () => {
      const { result } = renderHook(() => useTabbedInterface('topics'));

      expect(result.current.activeTab).toBe('topics');
    });

    it('should start with editor tab', () => {
      const { result } = renderHook(() => useTabbedInterface('editor'));

      expect(result.current.activeTab).toBe('editor');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SET ACTIVE TAB TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('setActiveTab', () => {
    it('should change active tab to topics', () => {
      const { result } = renderHook(() => useTabbedInterface());

      act(() => {
        result.current.setActiveTab('topics');
      });

      expect(result.current.activeTab).toBe('topics');
    });

    it('should change active tab to editor', () => {
      const { result } = renderHook(() => useTabbedInterface());

      act(() => {
        result.current.setActiveTab('editor');
      });

      expect(result.current.activeTab).toBe('editor');
    });

    it('should accept string for compatibility', () => {
      const { result } = renderHook(() => useTabbedInterface());

      act(() => {
        result.current.setActiveTab('models' as string);
      });

      expect(result.current.activeTab).toBe('models');
    });

    it('should change to all available tabs', () => {
      const { result } = renderHook(() => useTabbedInterface());
      const tabIds: TabId[] = ['upload', 'topics', 'proofs', 'jurisprudencia', 'legislacao', 'editor', 'models'];

      tabIds.forEach((tabId) => {
        act(() => {
          result.current.setActiveTab(tabId);
        });
        expect(result.current.activeTab).toBe(tabId);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // NAVIGATION HELPERS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Navigation Helpers', () => {
    it('should navigate to upload with goToUpload', () => {
      const { result } = renderHook(() => useTabbedInterface('topics'));

      act(() => {
        result.current.goToUpload();
      });

      expect(result.current.activeTab).toBe('upload');
    });

    it('should navigate to topics with goToTopics', () => {
      const { result } = renderHook(() => useTabbedInterface());

      act(() => {
        result.current.goToTopics();
      });

      expect(result.current.activeTab).toBe('topics');
    });

    it('should navigate to editor with goToEditor', () => {
      const { result } = renderHook(() => useTabbedInterface());

      act(() => {
        result.current.goToEditor();
      });

      expect(result.current.activeTab).toBe('editor');
    });

    it('should navigate to models with goToModels', () => {
      const { result } = renderHook(() => useTabbedInterface());

      act(() => {
        result.current.goToModels();
      });

      expect(result.current.activeTab).toBe('models');
    });

    it('should navigate to proofs with goToProofs', () => {
      const { result } = renderHook(() => useTabbedInterface());

      act(() => {
        result.current.goToProofs();
      });

      expect(result.current.activeTab).toBe('proofs');
    });

    it('should navigate to jurisprudencia with goToJurisprudencia', () => {
      const { result } = renderHook(() => useTabbedInterface());

      act(() => {
        result.current.goToJurisprudencia();
      });

      expect(result.current.activeTab).toBe('jurisprudencia');
    });

    it('should navigate to legislacao with goToLegislacao', () => {
      const { result } = renderHook(() => useTabbedInterface());

      act(() => {
        result.current.goToLegislacao();
      });

      expect(result.current.activeTab).toBe('legislacao');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // READ-ONLY TAB TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('isReadOnlyTab', () => {
    it('should return false for upload tab', () => {
      const { result } = renderHook(() => useTabbedInterface('upload'));

      expect(result.current.isReadOnlyTab).toBe(false);
    });

    it('should return false for topics tab', () => {
      const { result } = renderHook(() => useTabbedInterface('topics'));

      expect(result.current.isReadOnlyTab).toBe(false);
    });

    it('should return false for editor tab', () => {
      const { result } = renderHook(() => useTabbedInterface('editor'));

      expect(result.current.isReadOnlyTab).toBe(false);
    });

    it('should return true for models tab', () => {
      const { result } = renderHook(() => useTabbedInterface('models'));

      expect(result.current.isReadOnlyTab).toBe(true);
    });

    it('should return true for jurisprudencia tab', () => {
      const { result } = renderHook(() => useTabbedInterface('jurisprudencia'));

      expect(result.current.isReadOnlyTab).toBe(true);
    });

    it('should return true for legislacao tab', () => {
      const { result } = renderHook(() => useTabbedInterface('legislacao'));

      expect(result.current.isReadOnlyTab).toBe(true);
    });

    it('should update isReadOnlyTab when changing tabs', () => {
      const { result } = renderHook(() => useTabbedInterface());

      expect(result.current.isReadOnlyTab).toBe(false); // upload

      act(() => {
        result.current.goToModels();
      });

      expect(result.current.isReadOnlyTab).toBe(true); // models

      act(() => {
        result.current.goToTopics();
      });

      expect(result.current.isReadOnlyTab).toBe(false); // topics
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CONSTANTS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Constants', () => {
    it('TABS should have all 7 tabs defined', () => {
      expect(TABS).toHaveLength(7);
    });

    it('TABS should include upload tab', () => {
      const uploadTab = TABS.find((t) => t.id === 'upload');
      expect(uploadTab).toBeDefined();
      expect(uploadTab?.label).toBe('Upload & Análise');
      expect(uploadTab?.iconName).toBe('Upload');
    });

    it('TABS should include topics tab', () => {
      const topicsTab = TABS.find((t) => t.id === 'topics');
      expect(topicsTab).toBeDefined();
      expect(topicsTab?.label).toBe('Tópicos');
    });

    it('TABS should include proofs tab', () => {
      const proofsTab = TABS.find((t) => t.id === 'proofs');
      expect(proofsTab).toBeDefined();
      expect(proofsTab?.label).toBe('Provas');
    });

    it('READONLY_TABS should have 3 entries', () => {
      expect(READONLY_TABS).toHaveLength(3);
    });

    it('READONLY_TABS should include models, jurisprudencia, and legislacao', () => {
      expect(READONLY_TABS).toContain('models');
      expect(READONLY_TABS).toContain('jurisprudencia');
      expect(READONLY_TABS).toContain('legislacao');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EDGE CASES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Edge Cases', () => {
    it('should handle multiple rapid tab changes', () => {
      const { result } = renderHook(() => useTabbedInterface());

      act(() => {
        result.current.goToTopics();
        result.current.goToEditor();
        result.current.goToModels();
        result.current.goToUpload();
      });

      expect(result.current.activeTab).toBe('upload');
    });

    it('should handle setting same tab multiple times', () => {
      const { result } = renderHook(() => useTabbedInterface());

      act(() => {
        result.current.setActiveTab('topics');
      });

      act(() => {
        result.current.setActiveTab('topics');
      });

      expect(result.current.activeTab).toBe('topics');
    });
  });
});
