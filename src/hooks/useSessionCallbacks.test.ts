/**
 * @file useSessionCallbacks.test.ts
 * @description Testes para o hook useSessionCallbacks
 * @version 1.38.52
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSessionCallbacks } from './useSessionCallbacks';

// ═══════════════════════════════════════════════════════════════════════════
// MOCKS
// ═══════════════════════════════════════════════════════════════════════════

const mockRestoreSession = vi.fn();
const mockClearProject = vi.fn();
const mockSetAiSettings = vi.fn();
const mockSetTokenMetrics = vi.fn();
const mockOpenModal = vi.fn();
const mockCloseModal = vi.fn();
const mockSetProofFiles = vi.fn();
const mockSetProofTexts = vi.fn();
const mockSetProofUsePdfMode = vi.fn();
const mockSetExtractedProofTexts = vi.fn();
const mockSetProofExtractionFailed = vi.fn();
const mockSetProofTopicLinks = vi.fn();
const mockSetProofAnalysisResults = vi.fn();
const mockSetProofConclusions = vi.fn();
const mockSetProofSendFullContent = vi.fn();
const mockSetProofToDelete = vi.fn();
const mockSetProofToLink = vi.fn();
const mockSetProofToAnalyze = vi.fn();
const mockClearAnalyzingProofs = vi.fn();
const mockSetShowProofPanel = vi.fn();
const mockSetNewProofTextData = vi.fn();
const mockSetPastedPeticaoTexts = vi.fn();
const mockSetPastedContestacaoTexts = vi.fn();
const mockSetPastedComplementaryTexts = vi.fn();
const mockSetExtractedTopics = vi.fn();
const mockSetSelectedTopics = vi.fn();
const mockSetPartesProcesso = vi.fn();
const mockSetAnalyzedDocuments = vi.fn();
const mockSetActiveTab = vi.fn();
const mockSetError = vi.fn();
const mockSetProcessoNumero = vi.fn();
const mockSetPeticaoFiles = vi.fn();
const mockSetContestacaoFiles = vi.fn();
const mockSetComplementaryFiles = vi.fn();
const mockSetExtractedTexts = vi.fn();
const mockSetDocumentProcessingModes = vi.fn();
const mockSetAnonymizationNamesText = vi.fn();
const mockOnLogout = vi.fn();

// Mock window.location.reload
const mockReload = vi.fn();
Object.defineProperty(window, 'location', {
  value: { reload: mockReload },
  writable: true,
});

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

const createDefaultProps = () => ({
  storage: {
    restoreSession: mockRestoreSession,
    clearProject: mockClearProject,
  },
  aiIntegration: {
    setAiSettings: mockSetAiSettings,
    setTokenMetrics: mockSetTokenMetrics,
  },
  openModal: mockOpenModal,
  closeModal: mockCloseModal,
  proofManager: {
    setProofFiles: mockSetProofFiles,
    setProofTexts: mockSetProofTexts,
    setProofUsePdfMode: mockSetProofUsePdfMode,
    setExtractedProofTexts: mockSetExtractedProofTexts,
    setProofExtractionFailed: mockSetProofExtractionFailed,
    setProofTopicLinks: mockSetProofTopicLinks,
    setProofAnalysisResults: mockSetProofAnalysisResults,
    setProofConclusions: mockSetProofConclusions,
    setProofSendFullContent: mockSetProofSendFullContent,
    setProofToDelete: mockSetProofToDelete,
    setProofToLink: mockSetProofToLink,
    setProofToAnalyze: mockSetProofToAnalyze,
    clearAnalyzingProofs: mockClearAnalyzingProofs,
    setShowProofPanel: mockSetShowProofPanel,
    setNewProofTextData: mockSetNewProofTextData,
  },
  setPastedPeticaoTexts: mockSetPastedPeticaoTexts,
  setPastedContestacaoTexts: mockSetPastedContestacaoTexts,
  setPastedComplementaryTexts: mockSetPastedComplementaryTexts,
  setExtractedTopics: mockSetExtractedTopics,
  setSelectedTopics: mockSetSelectedTopics,
  setPartesProcesso: mockSetPartesProcesso,
  setAnalyzedDocuments: mockSetAnalyzedDocuments,
  setActiveTab: mockSetActiveTab,
  setError: mockSetError,
  setProcessoNumero: mockSetProcessoNumero,
  setPeticaoFiles: mockSetPeticaoFiles,
  setContestacaoFiles: mockSetContestacaoFiles,
  setComplementaryFiles: mockSetComplementaryFiles,
  setExtractedTexts: mockSetExtractedTexts,
  setDocumentProcessingModes: mockSetDocumentProcessingModes,
  setAnonymizationNamesText: mockSetAnonymizationNamesText,
  onLogout: mockOnLogout,
});

// ═══════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('useSessionCallbacks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // BASIC FUNCTIONALITY
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Basic Functionality', () => {
    it('should return all expected handlers', () => {
      const { result } = renderHook(() => useSessionCallbacks(createDefaultProps()));

      expect(result.current.handleRestoreSession).toBeDefined();
      expect(result.current.handleStartNew).toBeDefined();
      expect(result.current.handleCloseClearProject).toBeDefined();
      expect(result.current.handleConfirmClear).toBeDefined();
      expect(result.current.handleCloseLogout).toBeDefined();
      expect(result.current.handleConfirmLogout).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RESTORE SESSION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('handleRestoreSession', () => {
    it('should call storage.restoreSession with correct callbacks', () => {
      const { result } = renderHook(() => useSessionCallbacks(createDefaultProps()));

      act(() => {
        result.current.handleRestoreSession();
      });

      expect(mockRestoreSession).toHaveBeenCalledTimes(1);
      expect(mockRestoreSession).toHaveBeenCalledWith(
        expect.objectContaining({
          setPastedPeticaoTexts: mockSetPastedPeticaoTexts,
          setPastedContestacaoTexts: mockSetPastedContestacaoTexts,
          setExtractedTopics: mockSetExtractedTopics,
          setSelectedTopics: mockSetSelectedTopics,
          setPartesProcesso: mockSetPartesProcesso,
          setActiveTab: mockSetActiveTab,
          closeModal: mockCloseModal,
          setError: mockSetError,
          setProcessoNumero: mockSetProcessoNumero,
          setTokenMetrics: mockSetTokenMetrics,
        })
      );
    });

    it('should include proof manager callbacks', () => {
      const { result } = renderHook(() => useSessionCallbacks(createDefaultProps()));

      act(() => {
        result.current.handleRestoreSession();
      });

      const callbacksArg = mockRestoreSession.mock.calls[0][0];
      expect(callbacksArg.setProofFiles).toBe(mockSetProofFiles);
      expect(callbacksArg.setProofTexts).toBe(mockSetProofTexts);
      expect(callbacksArg.setProofTopicLinks).toBe(mockSetProofTopicLinks);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // START NEW (CLEAR PROJECT)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('handleStartNew', () => {
    it('should close restore session modal and open clear project modal', () => {
      const { result } = renderHook(() => useSessionCallbacks(createDefaultProps()));

      act(() => {
        result.current.handleStartNew();
      });

      expect(mockCloseModal).toHaveBeenCalledWith('restoreSession');
      expect(mockOpenModal).toHaveBeenCalledWith('clearProject');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CLOSE CLEAR PROJECT
  // ═══════════════════════════════════════════════════════════════════════════

  describe('handleCloseClearProject', () => {
    it('should close clear project modal and reopen restore session modal', () => {
      const { result } = renderHook(() => useSessionCallbacks(createDefaultProps()));

      act(() => {
        result.current.handleCloseClearProject();
      });

      expect(mockCloseModal).toHaveBeenCalledWith('clearProject');
      expect(mockOpenModal).toHaveBeenCalledWith('restoreSession');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CONFIRM CLEAR
  // ═══════════════════════════════════════════════════════════════════════════

  describe('handleConfirmClear', () => {
    it('should call storage.clearProject with correct callbacks', () => {
      const { result } = renderHook(() => useSessionCallbacks(createDefaultProps()));

      act(() => {
        result.current.handleConfirmClear();
      });

      expect(mockClearProject).toHaveBeenCalledTimes(1);
      expect(mockClearProject).toHaveBeenCalledWith(
        expect.objectContaining({
          setPastedPeticaoTexts: mockSetPastedPeticaoTexts,
          setExtractedTopics: mockSetExtractedTopics,
          setSelectedTopics: mockSetSelectedTopics,
          setActiveTab: mockSetActiveTab,
          closeModal: mockCloseModal,
        })
      );
    });

    it('should clear anonymization names', () => {
      const { result } = renderHook(() => useSessionCallbacks(createDefaultProps()));

      act(() => {
        result.current.handleConfirmClear();
      });

      expect(mockSetAiSettings).toHaveBeenCalledTimes(1);
      expect(mockSetAnonymizationNamesText).toHaveBeenCalledWith('');
    });

    it('should include all proof manager callbacks', () => {
      const { result } = renderHook(() => useSessionCallbacks(createDefaultProps()));

      act(() => {
        result.current.handleConfirmClear();
      });

      const callbacksArg = mockClearProject.mock.calls[0][0];
      expect(callbacksArg.setProofToDelete).toBe(mockSetProofToDelete);
      expect(callbacksArg.setProofToLink).toBe(mockSetProofToLink);
      expect(callbacksArg.setProofToAnalyze).toBe(mockSetProofToAnalyze);
      expect(callbacksArg.clearAnalyzingProofs).toBe(mockClearAnalyzingProofs);
      expect(callbacksArg.setShowProofPanel).toBe(mockSetShowProofPanel);
      expect(callbacksArg.setNewProofTextData).toBe(mockSetNewProofTextData);
    });

    it('should update AI settings to clear anonymization names', () => {
      const { result } = renderHook(() => useSessionCallbacks(createDefaultProps()));

      act(() => {
        result.current.handleConfirmClear();
      });

      // Verify setAiSettings was called with a function
      expect(mockSetAiSettings).toHaveBeenCalled();

      // Call the function passed to setAiSettings to verify it clears names
      const setAiSettingsFn = mockSetAiSettings.mock.calls[0][0];
      const prevSettings = {
        anonymization: { enabled: true, nomesUsuario: ['João', 'Maria'] }
      };
      const newSettings = setAiSettingsFn(prevSettings);

      expect(newSettings.anonymization.nomesUsuario).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // LOGOUT HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('handleCloseLogout', () => {
    it('should close logout modal', () => {
      const { result } = renderHook(() => useSessionCallbacks(createDefaultProps()));

      act(() => {
        result.current.handleCloseLogout();
      });

      expect(mockCloseModal).toHaveBeenCalledWith('logout');
    });
  });

  describe('handleConfirmLogout', () => {
    it('should close modal, call onLogout and reload page', () => {
      const { result } = renderHook(() => useSessionCallbacks(createDefaultProps()));

      act(() => {
        result.current.handleConfirmLogout();
      });

      expect(mockCloseModal).toHaveBeenCalledWith('logout');
      expect(mockOnLogout).toHaveBeenCalledTimes(1);
      expect(mockReload).toHaveBeenCalledTimes(1);
    });

    it('should not call onLogout or reload if onLogout is not provided', () => {
      const propsWithoutLogout = {
        ...createDefaultProps(),
        onLogout: undefined,
      };
      const { result } = renderHook(() => useSessionCallbacks(propsWithoutLogout));

      act(() => {
        result.current.handleConfirmLogout();
      });

      expect(mockCloseModal).toHaveBeenCalledWith('logout');
      expect(mockOnLogout).not.toHaveBeenCalled();
      expect(mockReload).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EDGE CASES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Edge Cases', () => {
    it('should work when called multiple times', () => {
      const { result } = renderHook(() => useSessionCallbacks(createDefaultProps()));

      act(() => {
        result.current.handleRestoreSession();
        result.current.handleRestoreSession();
      });

      expect(mockRestoreSession).toHaveBeenCalledTimes(2);
    });

    it('should handle multiple different operations in sequence', () => {
      const { result } = renderHook(() => useSessionCallbacks(createDefaultProps()));

      act(() => {
        result.current.handleStartNew();
        result.current.handleCloseClearProject();
        result.current.handleCloseLogout();
      });

      expect(mockCloseModal).toHaveBeenCalledWith('restoreSession');
      expect(mockOpenModal).toHaveBeenCalledWith('clearProject');
      expect(mockCloseModal).toHaveBeenCalledWith('clearProject');
      expect(mockOpenModal).toHaveBeenCalledWith('restoreSession');
      expect(mockCloseModal).toHaveBeenCalledWith('logout');
    });
  });
});
