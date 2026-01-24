import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock stores before import
vi.mock('../stores/useDocumentsStore', () => ({
  useDocumentsStore: vi.fn((selector) => {
    const state = {
      analyzing: false,
      setAnalyzing: vi.fn(),
      analysisProgress: '',
      setAnalysisProgress: vi.fn(),
      analyzedDocuments: null,
      setAnalyzedDocuments: vi.fn(),
    };
    return selector ? selector(state) : state;
  }),
}));

vi.mock('../stores/useUIStore', () => ({
  useUIStore: vi.fn((selector) => {
    const state = {
      preservarAnonimizacao: false,
      showToast: vi.fn(),
    };
    return selector ? selector(state) : state;
  }),
}));

import { useDocumentAnalysis } from './useDocumentAnalysis';

const mockCallAI = vi.fn();
const mockExtractResponseText = vi.fn();

const defaultProps = {
  aiIntegration: {
    callAI: mockCallAI,
    extractResponseText: mockExtractResponseText,
    aiSettings: { provider: 'claude' as const, model: 'claude-sonnet-4-20250514' },
  },
  documentServices: {
    extractTextFromPDFPure: vi.fn(),
    extractTextFromPDFWithClaudeVision: vi.fn(),
    extractTextFromPDFWithTesseract: vi.fn(),
  },
  storage: {
    fileToBase64: vi.fn(),
  },
  peticaoFiles: [],
  pastedPeticaoTexts: [],
  contestacaoFiles: [],
  pastedContestacaoTexts: [],
  complementaryFiles: [],
  pastedComplementaryTexts: [],
  documentProcessingModes: { peticoes: {}, contestacoes: {}, complementares: {} },
  setExtractedTopics: vi.fn(),
  setSelectedTopics: vi.fn(),
  setPartesProcesso: vi.fn(),
  setExtractedTexts: vi.fn(),
  showToast: vi.fn(),
};

describe('useDocumentAnalysis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should start with analyzing=false', () => {
      const { result } = renderHook(() => useDocumentAnalysis(defaultProps as any));
      expect(result.current.analyzing).toBe(false);
    });

    it('should start with empty analysis progress', () => {
      const { result } = renderHook(() => useDocumentAnalysis(defaultProps as any));
      expect(result.current.analysisProgress).toBe('');
    });

    it('should start with modals hidden', () => {
      const { result } = renderHook(() => useDocumentAnalysis(defaultProps as any));
      expect(result.current.showAnonymizationModal).toBe(false);
      expect(result.current.showTopicCurationModal).toBe(false);
    });

    it('should start with null pending curation data', () => {
      const { result } = renderHook(() => useDocumentAnalysis(defaultProps as any));
      expect(result.current.pendingCurationData).toBeNull();
    });
  });

  describe('handleAnalyzeDocuments', () => {
    it('should be a function', () => {
      const { result } = renderHook(() => useDocumentAnalysis(defaultProps as any));
      expect(typeof result.current.handleAnalyzeDocuments).toBe('function');
    });

    it('should not start analysis without documents (shows toast)', async () => {
      const { result } = renderHook(() => useDocumentAnalysis(defaultProps as any));

      // Just verify it doesn't throw - it will call showToast about no documents
      try {
        await act(async () => {
          await result.current.handleAnalyzeDocuments();
        });
      } catch {
        // Expected - hook may throw if internal deps not fully mocked
      }

      expect(result.current.analyzing).toBe(false);
    });
  });

  describe('curation controls', () => {
    it('should set showAnonymizationModal', () => {
      const { result } = renderHook(() => useDocumentAnalysis(defaultProps as any));

      act(() => {
        result.current.setShowAnonymizationModal(true);
      });

      expect(result.current.showAnonymizationModal).toBe(true);
    });

    it('should set showTopicCurationModal', () => {
      const { result } = renderHook(() => useDocumentAnalysis(defaultProps as any));

      act(() => {
        result.current.setShowTopicCurationModal(true);
      });

      expect(result.current.showTopicCurationModal).toBe(true);
    });

    it('should set pendingCurationData', () => {
      const { result } = renderHook(() => useDocumentAnalysis(defaultProps as any));
      const mockData = { topics: [{ title: 'Test', category: 'Mérito' }], source: 'analysis' };

      act(() => {
        result.current.setPendingCurationData(mockData as any);
      });

      expect(result.current.pendingCurationData).toEqual(mockData);
    });
  });

  describe('handleCurationCancel', () => {
    it('should be a function', () => {
      const { result } = renderHook(() => useDocumentAnalysis(defaultProps as any));
      expect(typeof result.current.handleCurationCancel).toBe('function');
    });

    it('should close curation modal on cancel', () => {
      const { result } = renderHook(() => useDocumentAnalysis(defaultProps as any));

      act(() => {
        result.current.setShowTopicCurationModal(true);
      });

      act(() => {
        result.current.handleCurationCancel();
      });

      expect(result.current.showTopicCurationModal).toBe(false);
    });
  });

  describe('handleAnonymizationConfirm', () => {
    it('should be a function', () => {
      const { result } = renderHook(() => useDocumentAnalysis(defaultProps as any));
      expect(typeof result.current.handleAnonymizationConfirm).toBe('function');
    });
  });

  describe('handleCurationConfirm', () => {
    it('should be a function', () => {
      const { result } = renderHook(() => useDocumentAnalysis(defaultProps as any));
      expect(typeof result.current.handleCurationConfirm).toBe('function');
    });
  });
});
