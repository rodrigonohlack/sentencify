/**
 * @file useProofModalHandlers.test.ts
 * @description Testes para o hook useProofModalHandlers
 * @version 1.38.39
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProofModalHandlers } from './useProofModalHandlers';
import type { Proof, ProofFile, ProofText } from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// MOCKS
// ═══════════════════════════════════════════════════════════════════════════

const mockCloseModal = vi.fn();
const mockOpenModal = vi.fn();
const mockSetProofToDelete = vi.fn();
const mockSetProofFiles = vi.fn();
const mockSetProofTexts = vi.fn();
const mockSetProofToLink = vi.fn();
const mockSetProofToAnalyze = vi.fn();
const mockSetNewProofTextData = vi.fn();

let mockProofToDelete: Proof | null = null;
let mockProofFiles: ProofFile[] = [];
let mockProofTexts: ProofText[] = [];

vi.mock('../stores/useUIStore', () => ({
  useUIStore: vi.fn((selector) => {
    const state = {
      closeModal: mockCloseModal,
      openModal: mockOpenModal,
    };
    return selector(state);
  }),
}));

vi.mock('../stores/useProofsStore', () => ({
  useProofsStore: vi.fn((selector) => {
    const state = {
      proofFiles: mockProofFiles,
      setProofFiles: mockSetProofFiles,
      proofTexts: mockProofTexts,
      setProofTexts: mockSetProofTexts,
    };
    return selector(state);
  }),
}));

vi.mock('../stores/useProofUIStore', () => ({
  useProofUIStore: vi.fn((selector) => {
    const state = {
      proofToDelete: mockProofToDelete,
      setProofToDelete: mockSetProofToDelete,
      setProofToLink: mockSetProofToLink,
      setProofToAnalyze: mockSetProofToAnalyze,
      setNewProofTextData: mockSetNewProofTextData,
    };
    return selector(state);
  }),
}));

describe('useProofModalHandlers', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // MOCK FACTORIES
  // ═══════════════════════════════════════════════════════════════════════════

  const createMockProofFile = (id: string, name: string): ProofFile => ({
    id,
    name,
    type: 'pdf',
    file: new File([''], 'test.pdf', { type: 'application/pdf' }),
    uploadDate: new Date().toISOString(),
  });

  const createMockProofText = (id: string, name: string): ProofText => ({
    id,
    name,
    text: 'Texto da prova',
    type: 'text',
    uploadDate: new Date().toISOString(),
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockProofToDelete = null;
    mockProofFiles = [];
    mockProofTexts = [];
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // BASIC FUNCTIONALITY TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Basic Functionality', () => {
    it('should return all expected handlers', () => {
      const { result } = renderHook(() => useProofModalHandlers());

      expect(result.current.confirmDeleteProof).toBeDefined();
      expect(result.current.cancelDeleteProof).toBeDefined();
      expect(result.current.cancelLinkProof).toBeDefined();
      expect(result.current.cancelProofAnalysis).toBeDefined();
      expect(result.current.cancelAddProofText).toBeDefined();
      expect(result.current.openDeleteProofModal).toBeDefined();
      expect(result.current.openLinkProofModal).toBeDefined();
      expect(result.current.openProofAnalysisModal).toBeDefined();
      expect(result.current.openAddProofTextModal).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DELETE PROOF TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Delete Proof', () => {
    it('should not delete when proofToDelete is null', () => {
      mockProofToDelete = null;
      const { result } = renderHook(() => useProofModalHandlers());

      act(() => {
        result.current.confirmDeleteProof();
      });

      expect(mockSetProofFiles).not.toHaveBeenCalled();
      expect(mockSetProofTexts).not.toHaveBeenCalled();
    });

    it('should delete ProofFile from proofFiles', () => {
      const proofFile = createMockProofFile('1', 'Prova PDF');
      mockProofToDelete = proofFile;
      mockProofFiles = [proofFile, createMockProofFile('2', 'Outra Prova')];

      const { result } = renderHook(() => useProofModalHandlers());

      act(() => {
        result.current.confirmDeleteProof();
      });

      expect(mockSetProofFiles).toHaveBeenCalled();
      expect(mockSetProofToDelete).toHaveBeenCalledWith(null);
      expect(mockCloseModal).toHaveBeenCalledWith('deleteProof');
    });

    it('should delete ProofText from proofTexts', () => {
      // Nota: O hook usa 'file' in proofToDelete || 'type' in proofToDelete
      // Como ProofText tem 'type', vai para o branch de ProofFiles
      // Criamos um ProofText sem 'type' explícito para testar o branch correto
      const proofText: ProofText = {
        id: '1',
        name: 'Prova Texto',
        text: 'Texto da prova',
        type: 'text',
        uploadDate: new Date().toISOString(),
      };
      // Remove 'type' e 'file' para forçar o branch de ProofText
      const proofCopy = { ...proofText } as Record<string, unknown>;
      delete proofCopy.type;
      delete proofCopy.file;
      const proofWithoutType = proofCopy as unknown as ProofText;

      mockProofToDelete = proofWithoutType;
      mockProofTexts = [proofText, createMockProofText('2', 'Outro Texto')];

      const { result } = renderHook(() => useProofModalHandlers());

      act(() => {
        result.current.confirmDeleteProof();
      });

      expect(mockSetProofTexts).toHaveBeenCalled();
      expect(mockSetProofToDelete).toHaveBeenCalledWith(null);
      expect(mockCloseModal).toHaveBeenCalledWith('deleteProof');
    });

    it('should cancel delete and close modal', () => {
      const { result } = renderHook(() => useProofModalHandlers());

      act(() => {
        result.current.cancelDeleteProof();
      });

      expect(mockSetProofToDelete).toHaveBeenCalledWith(null);
      expect(mockCloseModal).toHaveBeenCalledWith('deleteProof');
    });

    it('should open delete modal with proof', () => {
      const proof = createMockProofFile('1', 'Prova');
      const { result } = renderHook(() => useProofModalHandlers());

      act(() => {
        result.current.openDeleteProofModal(proof);
      });

      expect(mockSetProofToDelete).toHaveBeenCalledWith(proof);
      expect(mockOpenModal).toHaveBeenCalledWith('deleteProof');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // LINK PROOF TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Link Proof', () => {
    it('should cancel link and close modal', () => {
      const { result } = renderHook(() => useProofModalHandlers());

      act(() => {
        result.current.cancelLinkProof();
      });

      expect(mockSetProofToLink).toHaveBeenCalledWith(null);
      expect(mockCloseModal).toHaveBeenCalledWith('linkProof');
    });

    it('should open link modal with proof', () => {
      const proof = createMockProofFile('1', 'Prova');
      const { result } = renderHook(() => useProofModalHandlers());

      act(() => {
        result.current.openLinkProofModal(proof);
      });

      expect(mockSetProofToLink).toHaveBeenCalledWith(proof);
      expect(mockOpenModal).toHaveBeenCalledWith('linkProof');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PROOF ANALYSIS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Proof Analysis', () => {
    it('should cancel analysis and close modal', () => {
      const { result } = renderHook(() => useProofModalHandlers());

      act(() => {
        result.current.cancelProofAnalysis();
      });

      expect(mockSetProofToAnalyze).toHaveBeenCalledWith(null);
      expect(mockCloseModal).toHaveBeenCalledWith('proofAnalysis');
    });

    it('should open analysis modal with proof', () => {
      const proof = createMockProofFile('1', 'Prova');
      const { result } = renderHook(() => useProofModalHandlers());

      act(() => {
        result.current.openProofAnalysisModal(proof);
      });

      expect(mockSetProofToAnalyze).toHaveBeenCalledWith(proof);
      expect(mockOpenModal).toHaveBeenCalledWith('proofAnalysis');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ADD PROOF TEXT TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Add Proof Text', () => {
    it('should cancel add text and reset state', () => {
      const { result } = renderHook(() => useProofModalHandlers());

      act(() => {
        result.current.cancelAddProofText();
      });

      expect(mockSetNewProofTextData).toHaveBeenCalledWith({ name: '', text: '' });
      expect(mockCloseModal).toHaveBeenCalledWith('addProofText');
    });

    it('should open add text modal', () => {
      const { result } = renderHook(() => useProofModalHandlers());

      act(() => {
        result.current.openAddProofTextModal();
      });

      expect(mockSetNewProofTextData).toHaveBeenCalledWith({ name: '', text: '' });
      expect(mockOpenModal).toHaveBeenCalledWith('addProofText');
    });
  });
});
