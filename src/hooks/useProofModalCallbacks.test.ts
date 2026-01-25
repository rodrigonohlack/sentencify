/**
 * @file useProofModalCallbacks.test.ts
 * @description Testes para o hook useProofModalCallbacks
 * @version 1.38.52
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProofModalCallbacks } from './useProofModalCallbacks';

// ═══════════════════════════════════════════════════════════════════════════
// MOCKS
// ═══════════════════════════════════════════════════════════════════════════

const mockSetNewProofTextData = vi.fn();
const mockSetPendingProofText = vi.fn();
const mockSetPendingExtraction = vi.fn();
const mockSetProofToAnalyze = vi.fn();
const mockSetProofAnalysisCustomInstructions = vi.fn();
const mockSetUseOnlyMiniRelatorios = vi.fn();
const mockSetIncludeLinkedTopicsInFree = vi.fn();
const mockSetProofToDelete = vi.fn();
const mockSetProofTexts = vi.fn();
const mockHandleDeleteProof = vi.fn();
const mockSetAiSettings = vi.fn();
const mockExtractTextFromPDFWithMode = vi.fn();
const mockOpenModal = vi.fn();
const mockCloseModal = vi.fn();
const mockShowToast = vi.fn();
const mockSetDetectingNames = vi.fn();
const mockDetectarNomesAutomaticamente = vi.fn();
const mockAnalyzeProof = vi.fn();

// Mock removePdfFromIndexedDB
vi.mock('./usePdfStorage', () => ({
  removePdfFromIndexedDB: vi.fn().mockResolvedValue(undefined),
}));

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

const createDefaultProps = () => ({
  proofManager: {
    newProofTextData: { name: '', text: '' },
    setNewProofTextData: mockSetNewProofTextData,
    pendingProofText: null as { name: string; text: string } | null,
    setPendingProofText: mockSetPendingProofText,
    pendingExtraction: null as never,
    setPendingExtraction: mockSetPendingExtraction,
    proofToAnalyze: null,
    setProofToAnalyze: mockSetProofToAnalyze,
    proofAnalysisCustomInstructions: '',
    setProofAnalysisCustomInstructions: mockSetProofAnalysisCustomInstructions,
    useOnlyMiniRelatorios: false,
    setUseOnlyMiniRelatorios: mockSetUseOnlyMiniRelatorios,
    includeLinkedTopicsInFree: false,
    setIncludeLinkedTopicsInFree: mockSetIncludeLinkedTopicsInFree,
    proofToDelete: null,
    setProofToDelete: mockSetProofToDelete,
    proofProcessingModes: {},
    setProofTexts: mockSetProofTexts,
    handleDeleteProof: mockHandleDeleteProof,
  },
  aiIntegration: {
    aiSettings: { anonymization: { enabled: false } } as never,
    setAiSettings: mockSetAiSettings,
  },
  documentServices: {
    extractTextFromPDFWithMode: mockExtractTextFromPDFWithMode,
  },
  openModal: mockOpenModal,
  closeModal: mockCloseModal,
  showToast: mockShowToast,
  setDetectingNames: mockSetDetectingNames,
  detectarNomesAutomaticamente: mockDetectarNomesAutomaticamente,
  analyzeProof: mockAnalyzeProof,
});

// ═══════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('useProofModalCallbacks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // BASIC FUNCTIONALITY
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Basic Functionality', () => {
    it('should return all expected handlers', () => {
      const { result } = renderHook(() => useProofModalCallbacks(createDefaultProps()));

      expect(result.current.handleAddProofText).toBeDefined();
      expect(result.current.handleProofTextAnonymizationClose).toBeDefined();
      expect(result.current.handleProofTextAnonymizationConfirm).toBeDefined();
      expect(result.current.handleProofTextAnonymizationDetect).toBeDefined();
      expect(result.current.handleProofExtractionAnonymizationClose).toBeDefined();
      expect(result.current.handleProofExtractionAnonymizationConfirm).toBeDefined();
      expect(result.current.handleProofExtractionAnonymizationDetect).toBeDefined();
      expect(result.current.handleProofAnalysisClose).toBeDefined();
      expect(result.current.handleAnalyzeContextual).toBeDefined();
      expect(result.current.handleAnalyzeFree).toBeDefined();
      expect(result.current.handleDeleteProofClose).toBeDefined();
      expect(result.current.handleDeleteProofConfirm).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // handleAddProofText
  // ═══════════════════════════════════════════════════════════════════════════

  describe('handleAddProofText', () => {
    it('should not add proof if text is empty', () => {
      const props = createDefaultProps();
      props.proofManager.newProofTextData = { name: 'Test', text: '' };

      const { result } = renderHook(() => useProofModalCallbacks(props));

      act(() => {
        result.current.handleAddProofText();
      });

      expect(mockSetProofTexts).not.toHaveBeenCalled();
      expect(mockCloseModal).not.toHaveBeenCalled();
    });

    it('should add proof directly when anonymization is disabled', () => {
      const props = createDefaultProps();
      props.proofManager.newProofTextData = { name: 'My Proof', text: 'Proof content here' };

      const { result } = renderHook(() => useProofModalCallbacks(props));

      act(() => {
        result.current.handleAddProofText();
      });

      expect(mockSetProofTexts).toHaveBeenCalled();
      expect(mockCloseModal).toHaveBeenCalledWith('addProofText');
      expect(mockSetNewProofTextData).toHaveBeenCalledWith({ name: '', text: '' });
    });

    it('should use default name when name is empty', () => {
      const props = createDefaultProps();
      props.proofManager.newProofTextData = { name: '', text: 'Some content' };

      const { result } = renderHook(() => useProofModalCallbacks(props));

      act(() => {
        result.current.handleAddProofText();
      });

      const setProofTextsCall = mockSetProofTexts.mock.calls[0][0];
      // Call the function to get the new state
      const newState = setProofTextsCall([]);
      expect(newState[0].name).toBe('Prova (texto)');
    });

    it('should open anonymization modal when anonymization is enabled', () => {
      const props = createDefaultProps();
      props.proofManager.newProofTextData = { name: 'Test', text: 'Content' };
      props.aiIntegration.aiSettings = { anonymization: { enabled: true } } as never;

      const { result } = renderHook(() => useProofModalCallbacks(props));

      act(() => {
        result.current.handleAddProofText();
      });

      expect(mockSetPendingProofText).toHaveBeenCalledWith({
        name: 'Test',
        text: 'Content',
      });
      expect(mockCloseModal).toHaveBeenCalledWith('addProofText');
      expect(mockOpenModal).toHaveBeenCalledWith('proofTextAnonymization');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // handleProofTextAnonymizationClose
  // ═══════════════════════════════════════════════════════════════════════════

  describe('handleProofTextAnonymizationClose', () => {
    it('should close modal and reset state', () => {
      const { result } = renderHook(() => useProofModalCallbacks(createDefaultProps()));

      act(() => {
        result.current.handleProofTextAnonymizationClose();
      });

      expect(mockCloseModal).toHaveBeenCalledWith('proofTextAnonymization');
      expect(mockSetPendingProofText).toHaveBeenCalledWith(null);
      expect(mockSetNewProofTextData).toHaveBeenCalledWith({ name: '', text: '' });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // handleProofTextAnonymizationConfirm
  // ═══════════════════════════════════════════════════════════════════════════

  describe('handleProofTextAnonymizationConfirm', () => {
    it('should do nothing if no pending proof', () => {
      const { result } = renderHook(() => useProofModalCallbacks(createDefaultProps()));

      act(() => {
        result.current.handleProofTextAnonymizationConfirm(['João']);
      });

      expect(mockSetAiSettings).not.toHaveBeenCalled();
    });

    it('should save proof with anonymization when pending proof exists', () => {
      const props = createDefaultProps();
      props.proofManager.pendingProofText = { name: 'Test Proof', text: 'Text with João name' };

      const { result } = renderHook(() => useProofModalCallbacks(props));

      act(() => {
        result.current.handleProofTextAnonymizationConfirm(['João']);
      });

      expect(mockSetAiSettings).toHaveBeenCalled();
      expect(mockSetProofTexts).toHaveBeenCalled();
      expect(mockCloseModal).toHaveBeenCalledWith('proofTextAnonymization');
      expect(mockSetPendingProofText).toHaveBeenCalledWith(null);
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringContaining('anonimização'),
        'success'
      );
    });

    it('should persist names in AI settings', () => {
      const props = createDefaultProps();
      props.proofManager.pendingProofText = { name: 'Test', text: 'Content' };

      const { result } = renderHook(() => useProofModalCallbacks(props));

      act(() => {
        result.current.handleProofTextAnonymizationConfirm(['Maria', 'José']);
      });

      // Verify setAiSettings was called with function that sets names
      const setSettingsFn = mockSetAiSettings.mock.calls[0][0];
      const prevSettings = { anonymization: { enabled: true, nomesUsuario: [] } };
      const newSettings = setSettingsFn(prevSettings);
      expect(newSettings.anonymization.nomesUsuario).toEqual(['Maria', 'José']);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // handleProofExtractionAnonymizationClose
  // ═══════════════════════════════════════════════════════════════════════════

  describe('handleProofExtractionAnonymizationClose', () => {
    it('should close modal and reset pending extraction', () => {
      const { result } = renderHook(() => useProofModalCallbacks(createDefaultProps()));

      act(() => {
        result.current.handleProofExtractionAnonymizationClose();
      });

      expect(mockCloseModal).toHaveBeenCalledWith('proofExtractionAnonymization');
      expect(mockSetPendingExtraction).toHaveBeenCalledWith(null);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // handleProofExtractionAnonymizationConfirm
  // ═══════════════════════════════════════════════════════════════════════════

  describe('handleProofExtractionAnonymizationConfirm', () => {
    it('should do nothing if no pending extraction', () => {
      const { result } = renderHook(() => useProofModalCallbacks(createDefaultProps()));

      act(() => {
        result.current.handleProofExtractionAnonymizationConfirm(['João']);
      });

      expect(mockSetAiSettings).not.toHaveBeenCalled();
    });

    it('should execute extraction with names when pending', () => {
      const mockExecuteExtraction = vi.fn();
      const props = createDefaultProps();
      (props.proofManager as { pendingExtraction: unknown }).pendingExtraction = {
        proofId: 'proof-1',
        proof: { id: 1, name: 'test.pdf' },
        executeExtraction: mockExecuteExtraction,
      };

      const { result } = renderHook(() => useProofModalCallbacks(props));

      act(() => {
        result.current.handleProofExtractionAnonymizationConfirm(['João', 'Maria']);
      });

      expect(mockExecuteExtraction).toHaveBeenCalledWith(['João', 'Maria']);
      expect(mockCloseModal).toHaveBeenCalledWith('proofExtractionAnonymization');
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringContaining('Extraindo'),
        'info'
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // handleProofAnalysisClose
  // ═══════════════════════════════════════════════════════════════════════════

  describe('handleProofAnalysisClose', () => {
    it('should close modal and reset all analysis state', () => {
      const { result } = renderHook(() => useProofModalCallbacks(createDefaultProps()));

      act(() => {
        result.current.handleProofAnalysisClose();
      });

      expect(mockCloseModal).toHaveBeenCalledWith('proofAnalysis');
      expect(mockSetProofToAnalyze).toHaveBeenCalledWith(null);
      expect(mockSetProofAnalysisCustomInstructions).toHaveBeenCalledWith('');
      expect(mockSetUseOnlyMiniRelatorios).toHaveBeenCalledWith(false);
      expect(mockSetIncludeLinkedTopicsInFree).toHaveBeenCalledWith(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // handleAnalyzeContextual
  // ═══════════════════════════════════════════════════════════════════════════

  describe('handleAnalyzeContextual', () => {
    it('should do nothing if no proof to analyze', async () => {
      const { result } = renderHook(() => useProofModalCallbacks(createDefaultProps()));

      await act(async () => {
        await result.current.handleAnalyzeContextual();
      });

      expect(mockAnalyzeProof).not.toHaveBeenCalled();
    });

    it('should call analyzeProof with contextual type', async () => {
      const props = createDefaultProps();
      props.proofManager.proofToAnalyze = { id: 1, name: 'test.pdf', type: 'pdf' } as never;
      props.proofManager.proofAnalysisCustomInstructions = 'Custom instructions';
      props.proofManager.useOnlyMiniRelatorios = true;

      const { result } = renderHook(() => useProofModalCallbacks(props));

      await act(async () => {
        await result.current.handleAnalyzeContextual();
      });

      expect(mockCloseModal).toHaveBeenCalledWith('proofAnalysis');
      expect(mockAnalyzeProof).toHaveBeenCalledWith(
        { id: 1, name: 'test.pdf', type: 'pdf' },
        'contextual',
        'Custom instructions',
        true,
        false
      );
      expect(mockSetProofToAnalyze).toHaveBeenCalledWith(null);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // handleAnalyzeFree
  // ═══════════════════════════════════════════════════════════════════════════

  describe('handleAnalyzeFree', () => {
    it('should call analyzeProof with livre type', async () => {
      const props = createDefaultProps();
      props.proofManager.proofToAnalyze = { id: 1, name: 'test.pdf', type: 'pdf' } as never;
      props.proofManager.includeLinkedTopicsInFree = true;

      const { result } = renderHook(() => useProofModalCallbacks(props));

      await act(async () => {
        await result.current.handleAnalyzeFree();
      });

      expect(mockAnalyzeProof).toHaveBeenCalledWith(
        { id: 1, name: 'test.pdf', type: 'pdf' },
        'livre',
        '',
        false,
        true
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // handleDeleteProofClose
  // ═══════════════════════════════════════════════════════════════════════════

  describe('handleDeleteProofClose', () => {
    it('should close modal and reset proof to delete', () => {
      const { result } = renderHook(() => useProofModalCallbacks(createDefaultProps()));

      act(() => {
        result.current.handleDeleteProofClose();
      });

      expect(mockCloseModal).toHaveBeenCalledWith('deleteProof');
      expect(mockSetProofToDelete).toHaveBeenCalledWith(null);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // handleDeleteProofConfirm
  // ═══════════════════════════════════════════════════════════════════════════

  describe('handleDeleteProofConfirm', () => {
    it('should do nothing if no proof to delete', async () => {
      const { result } = renderHook(() => useProofModalCallbacks(createDefaultProps()));

      await act(async () => {
        await result.current.handleDeleteProofConfirm();
      });

      expect(mockHandleDeleteProof).not.toHaveBeenCalled();
    });

    it('should delete proof and close modal', async () => {
      const props = createDefaultProps();
      props.proofManager.proofToDelete = { id: 1, name: 'delete-me.pdf', type: 'text' } as never;

      const { result } = renderHook(() => useProofModalCallbacks(props));

      await act(async () => {
        await result.current.handleDeleteProofConfirm();
      });

      expect(mockHandleDeleteProof).toHaveBeenCalledWith({ id: 1, name: 'delete-me.pdf', type: 'text' });
      expect(mockCloseModal).toHaveBeenCalledWith('deleteProof');
      expect(mockSetProofToDelete).toHaveBeenCalledWith(null);
    });

    it('should clean up IndexedDB for PDF proofs', async () => {
      const { removePdfFromIndexedDB } = await import('./usePdfStorage');
      const props = createDefaultProps();
      props.proofManager.proofToDelete = { id: 123, name: 'test.pdf', isPdf: true } as never;

      const { result } = renderHook(() => useProofModalCallbacks(props));

      await act(async () => {
        await result.current.handleDeleteProofConfirm();
      });

      expect(removePdfFromIndexedDB).toHaveBeenCalledWith('proof-123');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // handleProofTextAnonymizationDetect
  // ═══════════════════════════════════════════════════════════════════════════

  describe('handleProofTextAnonymizationDetect', () => {
    it('should detect names from pending proof text', async () => {
      const props = createDefaultProps();
      props.proofManager.pendingProofText = { name: 'Test', text: 'João works here' };
      mockDetectarNomesAutomaticamente.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useProofModalCallbacks(props));

      await act(async () => {
        await result.current.handleProofTextAnonymizationDetect();
      });

      expect(mockSetDetectingNames).toHaveBeenCalledWith(true);
      expect(mockDetectarNomesAutomaticamente).toHaveBeenCalledWith('João works here', true);
    });
  });
});
