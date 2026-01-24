import { describe, it, expect, beforeEach } from 'vitest';
import { useReviewStore, selectGeneratingReview, selectHasReviewResult, selectGeneratingFactsComparison, selectHasFactsComparisonError } from './useReviewStore';
import type { ReviewResult, FactsComparisonResult } from './useReviewStore';

describe('useReviewStore', () => {
  beforeEach(() => {
    useReviewStore.setState({
      reviewScope: 'decisionOnly',
      reviewResult: null,
      reviewFromCache: false,
      generatingReview: false,
      factsComparisonResultIndividual: null,
      generatingFactsComparisonIndividual: false,
      factsComparisonErrorIndividual: null,
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // REVISÃO DE SENTENÇA
  // ═══════════════════════════════════════════════════════════════════════════

  describe('setReviewScope', () => {
    it('should set review scope to decisionOnly', () => {
      useReviewStore.getState().setReviewScope('decisionOnly');
      expect(useReviewStore.getState().reviewScope).toBe('decisionOnly');
    });

    it('should set review scope to decisionWithDocs', () => {
      useReviewStore.getState().setReviewScope('decisionWithDocs');
      expect(useReviewStore.getState().reviewScope).toBe('decisionWithDocs');
    });
  });

  describe('setReviewResult', () => {
    it('should set review result', () => {
      const result: ReviewResult = {
        content: 'Revisão completa',
        timestamp: '2024-01-01T00:00:00Z',
        scope: 'decisionOnly',
        topicTitles: ['Horas Extras'],
      };
      useReviewStore.getState().setReviewResult(result);
      expect(useReviewStore.getState().reviewResult).toEqual(result);
    });

    it('should clear review result with null', () => {
      useReviewStore.getState().setReviewResult({
        content: 'test',
        timestamp: 'now',
        scope: 'decisionOnly',
      });
      useReviewStore.getState().setReviewResult(null);
      expect(useReviewStore.getState().reviewResult).toBeNull();
    });
  });

  describe('setReviewFromCache', () => {
    it('should set reviewFromCache to true', () => {
      useReviewStore.getState().setReviewFromCache(true);
      expect(useReviewStore.getState().reviewFromCache).toBe(true);
    });

    it('should set reviewFromCache to false', () => {
      useReviewStore.getState().setReviewFromCache(true);
      useReviewStore.getState().setReviewFromCache(false);
      expect(useReviewStore.getState().reviewFromCache).toBe(false);
    });
  });

  describe('setGeneratingReview', () => {
    it('should set generatingReview flag', () => {
      useReviewStore.getState().setGeneratingReview(true);
      expect(useReviewStore.getState().generatingReview).toBe(true);
    });
  });

  describe('clearReviewState', () => {
    it('should clear review result, cache flag, and generating flag', () => {
      useReviewStore.getState().setReviewResult({
        content: 'test',
        timestamp: 'now',
        scope: 'decisionOnly',
      });
      useReviewStore.getState().setReviewFromCache(true);
      useReviewStore.getState().setGeneratingReview(true);

      useReviewStore.getState().clearReviewState();

      expect(useReviewStore.getState().reviewResult).toBeNull();
      expect(useReviewStore.getState().reviewFromCache).toBe(false);
      expect(useReviewStore.getState().generatingReview).toBe(false);
    });

    it('should preserve reviewScope after clear', () => {
      useReviewStore.getState().setReviewScope('decisionWithDocs');
      useReviewStore.getState().clearReviewState();
      expect(useReviewStore.getState().reviewScope).toBe('decisionWithDocs');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CONFRONTO DE FATOS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('setFactsComparisonResultIndividual', () => {
    it('should set facts comparison result', () => {
      const result: FactsComparisonResult = {
        content: 'Análise de confronto',
        timestamp: '2024-01-01T00:00:00Z',
        topicTitle: 'Horas Extras',
      };
      useReviewStore.getState().setFactsComparisonResultIndividual(result);
      expect(useReviewStore.getState().factsComparisonResultIndividual).toEqual(result);
    });

    it('should clear with null', () => {
      useReviewStore.getState().setFactsComparisonResultIndividual(null);
      expect(useReviewStore.getState().factsComparisonResultIndividual).toBeNull();
    });
  });

  describe('setGeneratingFactsComparisonIndividual', () => {
    it('should set generating flag', () => {
      useReviewStore.getState().setGeneratingFactsComparisonIndividual(true);
      expect(useReviewStore.getState().generatingFactsComparisonIndividual).toBe(true);
    });
  });

  describe('setFactsComparisonErrorIndividual', () => {
    it('should set error message', () => {
      useReviewStore.getState().setFactsComparisonErrorIndividual('API timeout');
      expect(useReviewStore.getState().factsComparisonErrorIndividual).toBe('API timeout');
    });

    it('should clear error with null', () => {
      useReviewStore.getState().setFactsComparisonErrorIndividual('Error');
      useReviewStore.getState().setFactsComparisonErrorIndividual(null);
      expect(useReviewStore.getState().factsComparisonErrorIndividual).toBeNull();
    });
  });

  describe('clearFactsComparisonState', () => {
    it('should clear all facts comparison state', () => {
      useReviewStore.getState().setFactsComparisonResultIndividual({
        content: 'test',
        timestamp: 'now',
        topicTitle: 'Test',
      });
      useReviewStore.getState().setGeneratingFactsComparisonIndividual(true);
      useReviewStore.getState().setFactsComparisonErrorIndividual('error');

      useReviewStore.getState().clearFactsComparisonState();

      expect(useReviewStore.getState().factsComparisonResultIndividual).toBeNull();
      expect(useReviewStore.getState().generatingFactsComparisonIndividual).toBe(false);
      expect(useReviewStore.getState().factsComparisonErrorIndividual).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SELECTORS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('selectors', () => {
    it('selectGeneratingReview should return generatingReview', () => {
      useReviewStore.getState().setGeneratingReview(true);
      expect(selectGeneratingReview(useReviewStore.getState())).toBe(true);
    });

    it('selectHasReviewResult should return true when result exists', () => {
      useReviewStore.getState().setReviewResult({
        content: 'test',
        timestamp: 'now',
        scope: 'decisionOnly',
      });
      expect(selectHasReviewResult(useReviewStore.getState())).toBe(true);
    });

    it('selectHasReviewResult should return false when no result', () => {
      expect(selectHasReviewResult(useReviewStore.getState())).toBe(false);
    });

    it('selectGeneratingFactsComparison should return generating flag', () => {
      useReviewStore.getState().setGeneratingFactsComparisonIndividual(true);
      expect(selectGeneratingFactsComparison(useReviewStore.getState())).toBe(true);
    });

    it('selectHasFactsComparisonError should return true when error exists', () => {
      useReviewStore.getState().setFactsComparisonErrorIndividual('error');
      expect(selectHasFactsComparisonError(useReviewStore.getState())).toBe(true);
    });

    it('selectHasFactsComparisonError should return false when no error', () => {
      expect(selectHasFactsComparisonError(useReviewStore.getState())).toBe(false);
    });
  });
});
