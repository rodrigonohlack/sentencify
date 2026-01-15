/**
 * @file useReviewSentence.test.ts
 * @description Testes para o hook de revisão de sentença
 * @version 1.37.57
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useReviewSentence } from './useReviewSentence';

// Mock useSentenceReviewCache
const mockGetReview = vi.fn();
const mockSaveReview = vi.fn();
const mockDeleteReview = vi.fn();

vi.mock('./useSentenceReviewCache', () => ({
  default: () => ({
    getReview: mockGetReview,
    saveReview: mockSaveReview,
    deleteReview: mockDeleteReview
  })
}));

// Mock text utils
vi.mock('../utils/text', () => ({
  normalizeHTMLSpacing: vi.fn((text) => text)
}));

// Mock prompts
vi.mock('../prompts', () => ({
  AI_PROMPTS: {
    revisaoSentenca: vi.fn(() => 'System prompt for review')
  }
}));

// Mock useUIStore for Double Check Review modal
const mockUIStoreState = {
  openDoubleCheckReview: vi.fn(),
  doubleCheckResult: null as { selected: unknown[]; finalResult: string; operation: string } | null,
  setDoubleCheckResult: vi.fn()
};

vi.mock('../stores/useUIStore', () => ({
  useUIStore: (selector: (state: typeof mockUIStoreState) => unknown) => {
    return selector(mockUIStoreState);
  }
}));

describe('useReviewSentence', () => {
  // Mock callbacks
  const mockSetError = vi.fn();
  const mockBuildDecisionText = vi.fn();
  const mockBuildDocumentContentArray = vi.fn();
  const mockCallAI = vi.fn();
  const mockPerformDoubleCheck = vi.fn();
  const mockShowToast = vi.fn();
  const mockCloseModal = vi.fn();
  const mockOpenModal = vi.fn();

  const createDefaultProps = (overrides: any = {}) => ({
    canGenerateDispositivo: overrides.canGenerateDispositivo ?? { enabled: true, reason: '' },
    setError: mockSetError,
    buildDecisionText: mockBuildDecisionText,
    buildDocumentContentArray: mockBuildDocumentContentArray,
    analyzedDocuments: overrides.analyzedDocuments ?? null,
    aiIntegration: {
      callAI: mockCallAI,
      aiSettings: overrides.aiSettings ?? {},
      performDoubleCheck: mockPerformDoubleCheck,
      ...overrides.aiIntegration
    },
    showToast: mockShowToast,
    closeModal: mockCloseModal,
    openModal: mockOpenModal
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockBuildDecisionText.mockReturnValue('<p>Decision text</p>');
    mockBuildDocumentContentArray.mockReturnValue([]);
    mockCallAI.mockResolvedValue('Review result');
    mockGetReview.mockResolvedValue(null);
    mockSaveReview.mockResolvedValue(undefined);
    // Reset UIStore mock state
    mockUIStoreState.doubleCheckResult = null;
    mockUIStoreState.openDoubleCheckReview.mockClear();
    mockUIStoreState.setDoubleCheckResult.mockClear();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // HOOK RETURN TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Hook Return', () => {
    it('should return all expected values', () => {
      const { result } = renderHook(() =>
        useReviewSentence(createDefaultProps())
      );

      expect(result.current.reviewScope).toBe('decisionOnly');
      expect(result.current.setReviewScope).toBeInstanceOf(Function);
      expect(result.current.reviewResult).toBe('');
      expect(result.current.setReviewResult).toBeInstanceOf(Function);
      expect(result.current.generatingReview).toBe(false);
      expect(result.current.reviewFromCache).toBe(false);
      expect(result.current.reviewSentence).toBeInstanceOf(Function);
      expect(result.current.clearReviewCache).toBeInstanceOf(Function);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // REVIEW SCOPE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Review Scope', () => {
    it('should default to decisionOnly', () => {
      const { result } = renderHook(() =>
        useReviewSentence(createDefaultProps())
      );

      expect(result.current.reviewScope).toBe('decisionOnly');
    });

    it('should update reviewScope', () => {
      const { result } = renderHook(() =>
        useReviewSentence(createDefaultProps())
      );

      act(() => {
        result.current.setReviewScope('decisionWithDocs');
      });

      expect(result.current.reviewScope).toBe('decisionWithDocs');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // REVIEW SENTENCE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('reviewSentence', () => {
    it('should set error when canGenerateDispositivo is disabled', async () => {
      const { result } = renderHook(() =>
        useReviewSentence(createDefaultProps({
          canGenerateDispositivo: { enabled: false, reason: 'Missing topics' }
        }))
      );

      await act(async () => {
        await result.current.reviewSentence();
      });

      expect(mockSetError).toHaveBeenCalledWith(
        expect.stringContaining('Complete todos os tópicos')
      );
      expect(mockCallAI).not.toHaveBeenCalled();
    });

    it('should use cached result if available', async () => {
      mockGetReview.mockResolvedValueOnce('Cached review');

      const { result } = renderHook(() =>
        useReviewSentence(createDefaultProps())
      );

      await act(async () => {
        await result.current.reviewSentence();
      });

      expect(result.current.reviewResult).toBe('Cached review');
      expect(result.current.reviewFromCache).toBe(true);
      expect(mockCallAI).not.toHaveBeenCalled();
    });

    it('should call AI when no cache', async () => {
      mockGetReview.mockResolvedValueOnce(null);
      mockCallAI.mockResolvedValueOnce('AI Review Result');

      const { result } = renderHook(() =>
        useReviewSentence(createDefaultProps())
      );

      await act(async () => {
        await result.current.reviewSentence();
      });

      expect(mockCallAI).toHaveBeenCalled();
      expect(result.current.reviewResult).toBe('AI Review Result');
      expect(result.current.reviewFromCache).toBe(false);
    });

    it('should save result to cache after AI call', async () => {
      mockGetReview.mockResolvedValueOnce(null);
      mockCallAI.mockResolvedValueOnce('New Review');

      const { result } = renderHook(() =>
        useReviewSentence(createDefaultProps())
      );

      await act(async () => {
        await result.current.reviewSentence();
      });

      expect(mockSaveReview).toHaveBeenCalledWith('decisionOnly', 'New Review');
    });

    it('should include documents when scope is decisionWithDocs', async () => {
      mockGetReview.mockResolvedValueOnce(null);
      mockBuildDocumentContentArray.mockReturnValue([{ type: 'text', text: 'Doc content' }]);

      const { result } = renderHook(() =>
        useReviewSentence(createDefaultProps({
          analyzedDocuments: { peticao: { text: 'Petição' } }
        }))
      );

      act(() => {
        result.current.setReviewScope('decisionWithDocs');
      });

      await act(async () => {
        await result.current.reviewSentence();
      });

      expect(mockBuildDocumentContentArray).toHaveBeenCalled();
    });

    it('should open result modal and close review modal', async () => {
      mockGetReview.mockResolvedValueOnce(null);

      const { result } = renderHook(() =>
        useReviewSentence(createDefaultProps())
      );

      await act(async () => {
        await result.current.reviewSentence();
      });

      expect(mockCloseModal).toHaveBeenCalledWith('sentenceReview');
      expect(mockOpenModal).toHaveBeenCalledWith('sentenceReviewResult');
    });

    it('should set generatingReview during processing', async () => {
      let resolveAI: (value: string) => void;
      mockCallAI.mockReturnValue(new Promise<string>((resolve) => {
        resolveAI = resolve;
      }));
      mockGetReview.mockResolvedValueOnce(null);

      const { result } = renderHook(() =>
        useReviewSentence(createDefaultProps())
      );

      // Start review
      act(() => {
        result.current.reviewSentence();
      });

      // Should be generating
      expect(result.current.generatingReview).toBe(true);

      // Resolve AI call
      await act(async () => {
        resolveAI!('Result');
      });

      // Should be done
      expect(result.current.generatingReview).toBe(false);
    });

    it('should handle AI errors', async () => {
      mockGetReview.mockResolvedValueOnce(null);
      mockCallAI.mockRejectedValueOnce(new Error('AI Error'));

      const { result } = renderHook(() =>
        useReviewSentence(createDefaultProps())
      );

      await act(async () => {
        await result.current.reviewSentence();
      });

      expect(mockSetError).toHaveBeenCalledWith(
        expect.stringContaining('Erro ao revisar sentença')
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DOUBLE CHECK TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Double Check', () => {
    it('should skip double check when disabled', async () => {
      mockGetReview.mockResolvedValueOnce(null);
      mockCallAI.mockResolvedValueOnce('Review');

      const { result } = renderHook(() =>
        useReviewSentence(createDefaultProps({
          aiSettings: {
            doubleCheck: {
              enabled: false,
              operations: { sentenceReview: true }
            }
          }
        }))
      );

      await act(async () => {
        await result.current.reviewSentence();
      });

      expect(mockPerformDoubleCheck).not.toHaveBeenCalled();
      expect(result.current.reviewResult).toBe('Review');
    });

    it('should skip double check when operation not enabled', async () => {
      mockGetReview.mockResolvedValueOnce(null);
      mockCallAI.mockResolvedValueOnce('Review');

      const { result } = renderHook(() =>
        useReviewSentence(createDefaultProps({
          aiSettings: {
            doubleCheck: {
              enabled: true,
              operations: { sentenceReview: false }
            }
          }
        }))
      );

      await act(async () => {
        await result.current.reviewSentence();
      });

      expect(mockPerformDoubleCheck).not.toHaveBeenCalled();
      expect(result.current.reviewResult).toBe('Review');
    });

    it('should continue with original review on double check error', async () => {
      mockGetReview.mockResolvedValueOnce(null);
      mockCallAI.mockResolvedValueOnce('Original review');
      mockPerformDoubleCheck.mockRejectedValueOnce(new Error('Double check failed'));

      const { result } = renderHook(() =>
        useReviewSentence(createDefaultProps({
          aiSettings: {
            doubleCheck: {
              enabled: true,
              operations: { sentenceReview: true }
            }
          }
        }))
      );

      await act(async () => {
        await result.current.reviewSentence();
      });

      // When double check fails, it should use original review
      expect(result.current.reviewResult).toBe('Original review');
    });

    // NOTE: Testing the full Double Check modal flow (performDoubleCheck + modal approval)
    // requires complex async coordination that's difficult to test in isolation.
    // The DoubleCheckReviewModal.test.tsx covers the modal interaction itself.
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CLEAR CACHE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('clearReviewCache', () => {
    it('should delete review from cache', async () => {
      const { result } = renderHook(() =>
        useReviewSentence(createDefaultProps())
      );

      await act(async () => {
        await result.current.clearReviewCache();
      });

      expect(mockDeleteReview).toHaveBeenCalledWith('decisionOnly');
    });

    it('should reset reviewFromCache flag', async () => {
      mockGetReview.mockResolvedValueOnce('Cached');

      const { result } = renderHook(() =>
        useReviewSentence(createDefaultProps())
      );

      // First get from cache
      await act(async () => {
        await result.current.reviewSentence();
      });

      expect(result.current.reviewFromCache).toBe(true);

      // Clear cache
      await act(async () => {
        await result.current.clearReviewCache();
      });

      expect(result.current.reviewFromCache).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SET REVIEW RESULT TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('setReviewResult', () => {
    it('should update reviewResult', () => {
      const { result } = renderHook(() =>
        useReviewSentence(createDefaultProps())
      );

      act(() => {
        result.current.setReviewResult('Manual result');
      });

      expect(result.current.reviewResult).toBe('Manual result');
    });
  });
});
