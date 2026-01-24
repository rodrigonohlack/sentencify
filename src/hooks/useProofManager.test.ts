import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProofManager } from './useProofManager';
import { useProofsStore } from '../stores/useProofsStore';
import { useProofUIStore } from '../stores/useProofUIStore';

// Reset stores before each test
beforeEach(() => {
  useProofsStore.getState().resetAll();
  useProofUIStore.setState({
    pendingProofText: null,
    pendingExtraction: null,
    pendingChatMessage: null,
    analyzingProofIds: new Set(),
    showProofPanel: false,
    newProofTextData: { name: '', text: '' },
    proofToDelete: null,
    proofToLink: null,
    proofToAnalyze: null,
    proofAnalysisCustomInstructions: '',
    useOnlyMiniRelatorios: false,
    includeLinkedTopicsInFree: true,
  });
});

describe('useProofManager', () => {
  describe('computed helpers', () => {
    it('should return totalProofs = 0 initially', () => {
      const { result } = renderHook(() => useProofManager());
      expect(result.current.totalProofs).toBe(0);
      expect(result.current.hasProofs).toBe(false);
    });

    it('should count proof files', () => {
      useProofsStore.getState().setProofFiles([
        { id: 1, file: new File([], 'a.pdf'), name: 'a.pdf', type: 'pdf', size: 100, uploadDate: '' },
      ] as any);

      const { result } = renderHook(() => useProofManager());
      expect(result.current.totalProofs).toBe(1);
      expect(result.current.hasProofs).toBe(true);
    });

    it('should count proof texts', () => {
      useProofsStore.getState().setProofTexts([
        { id: 2, text: 'Test text', name: 'Prova 1', type: 'text', uploadDate: '' },
      ] as any);

      const { result } = renderHook(() => useProofManager());
      expect(result.current.totalProofs).toBe(1);
    });

    it('should count files + texts together', () => {
      useProofsStore.getState().setProofFiles([
        { id: 1, file: new File([], 'a.pdf'), name: 'a.pdf', type: 'pdf', size: 100, uploadDate: '' },
      ] as any);
      useProofsStore.getState().setProofTexts([
        { id: 2, text: 'Test', name: 'T1', type: 'text', uploadDate: '' },
        { id: 3, text: 'Test2', name: 'T2', type: 'text', uploadDate: '' },
      ] as any);

      const { result } = renderHook(() => useProofManager());
      expect(result.current.totalProofs).toBe(3);
    });
  });

  describe('handleAddProofText', () => {
    it('should not add proof with empty name', () => {
      useProofUIStore.setState({ newProofTextData: { name: '', text: 'content' } });
      const { result } = renderHook(() => useProofManager());

      act(() => {
        result.current.handleAddProofText();
      });

      expect(result.current.proofTexts).toHaveLength(0);
    });

    it('should not add proof with empty text', () => {
      useProofUIStore.setState({ newProofTextData: { name: 'Prova 1', text: '' } });
      const { result } = renderHook(() => useProofManager());

      act(() => {
        result.current.handleAddProofText();
      });

      expect(result.current.proofTexts).toHaveLength(0);
    });

    it('should add proof text with valid data', () => {
      useProofUIStore.setState({ newProofTextData: { name: 'Prova Testemunhal', text: 'Depoimento do fulano...' } });
      const { result } = renderHook(() => useProofManager());

      act(() => {
        result.current.handleAddProofText();
      });

      expect(result.current.proofTexts).toHaveLength(1);
      expect(result.current.proofTexts[0].name).toBe('Prova Testemunhal');
      expect(result.current.proofTexts[0].text).toBe('Depoimento do fulano...');
    });

    it('should clear newProofTextData after adding', () => {
      useProofUIStore.setState({ newProofTextData: { name: 'Test', text: 'Content' } });
      const { result } = renderHook(() => useProofManager());

      act(() => {
        result.current.handleAddProofText();
      });

      expect(result.current.newProofTextData).toEqual({ name: '', text: '' });
    });
  });

  describe('handleDeleteProof', () => {
    it('should delete a proof text by id', () => {
      useProofsStore.getState().setProofTexts([
        { id: 10, text: 'Keep', name: 'K', type: 'text', uploadDate: '' },
        { id: 20, text: 'Delete', name: 'D', type: 'text', uploadDate: '' },
      ] as any);

      const { result } = renderHook(() => useProofManager());

      act(() => {
        result.current.handleDeleteProof({ id: 20, type: 'text', name: 'D' } as any);
      });

      expect(result.current.proofTexts).toHaveLength(1);
      expect(result.current.proofTexts[0].name).toBe('K');
    });

    it('should delete a proof PDF by id', () => {
      useProofsStore.getState().setProofFiles([
        { id: 100, file: new File([], 'doc.pdf'), name: 'doc.pdf', type: 'pdf', size: 50, uploadDate: '', isPdf: true },
      ] as any);

      const { result } = renderHook(() => useProofManager());

      act(() => {
        result.current.handleDeleteProof({ id: 100, type: 'pdf', isPdf: true, name: 'doc.pdf' } as any);
      });

      expect(result.current.proofFiles).toHaveLength(0);
    });

    it('should clean up related data when deleting', () => {
      const proofId = 50;
      useProofsStore.getState().setProofTexts([
        { id: proofId, text: 'X', name: 'X', type: 'text', uploadDate: '' },
      ] as any);
      useProofsStore.getState().setProofTopicLinks({ [proofId]: ['Topic A'] });
      useProofsStore.getState().setProofConclusions({ [proofId]: 'Conclusion' });

      const { result } = renderHook(() => useProofManager());

      act(() => {
        result.current.handleDeleteProof({ id: proofId, type: 'text', name: 'X' } as any);
      });

      expect(result.current.proofTopicLinks[proofId]).toBeUndefined();
      expect(result.current.proofConclusions[proofId]).toBeUndefined();
    });
  });

  describe('handleUploadProofPdf', () => {
    it('should add PDF files to proofFiles', async () => {
      const { result } = renderHook(() => useProofManager());
      const file = new File(['pdf content'], 'evidence.pdf', { type: 'application/pdf' });

      await act(async () => {
        await result.current.handleUploadProofPdf([file]);
      });

      expect(result.current.proofFiles).toHaveLength(1);
      expect(result.current.proofFiles[0].name).toBe('evidence.pdf');
    });

    it('should set default processing mode for uploaded PDFs', async () => {
      const { result } = renderHook(() => useProofManager());
      const file = new File(['pdf'], 'doc.pdf', { type: 'application/pdf' });

      await act(async () => {
        await result.current.handleUploadProofPdf([file]);
      });

      const id = result.current.proofFiles[0].id;
      expect(result.current.proofProcessingModes[id]).toBe('pdfjs');
      expect(result.current.proofUsePdfMode[id]).toBe(true);
    });

    it('should handle multiple files', async () => {
      const { result } = renderHook(() => useProofManager());
      const files = [
        new File(['1'], 'a.pdf', { type: 'application/pdf' }),
        new File(['2'], 'b.pdf', { type: 'application/pdf' }),
      ];

      await act(async () => {
        await result.current.handleUploadProofPdf(files);
      });

      expect(result.current.proofFiles).toHaveLength(2);
    });
  });

  describe('store actions delegation', () => {
    it('should expose handleLinkProof from store', () => {
      const { result } = renderHook(() => useProofManager());
      expect(typeof result.current.handleLinkProof).toBe('function');
    });

    it('should expose handleUnlinkProof from store', () => {
      const { result } = renderHook(() => useProofManager());
      expect(typeof result.current.handleUnlinkProof).toBe('function');
    });

    it('should expose handleSaveProofConclusion from store', () => {
      const { result } = renderHook(() => useProofManager());
      expect(typeof result.current.handleSaveProofConclusion).toBe('function');
    });

    it('should expose serializeForPersistence from store', () => {
      const { result } = renderHook(() => useProofManager());
      expect(typeof result.current.serializeForPersistence).toBe('function');
    });
  });
});
