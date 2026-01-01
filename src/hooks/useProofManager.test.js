// Testes para useProofManager
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useProofManager from './useProofManager';

// Mock de arquivo PDF
const createMockFile = (name = 'test.pdf', size = 1024) => ({
  name,
  size,
  type: 'application/pdf',
  lastModified: Date.now()
});

describe('useProofManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Estado Inicial', () => {
    it('deve iniciar com proofFiles vazio', () => {
      const { result } = renderHook(() => useProofManager());
      expect(result.current.proofFiles).toEqual([]);
    });

    it('deve iniciar com proofTexts vazio', () => {
      const { result } = renderHook(() => useProofManager());
      expect(result.current.proofTexts).toEqual([]);
    });

    it('deve iniciar com totalProofs = 0', () => {
      const { result } = renderHook(() => useProofManager());
      expect(result.current.totalProofs).toBe(0);
    });

    it('deve iniciar com hasProofs = false', () => {
      const { result } = renderHook(() => useProofManager());
      expect(result.current.hasProofs).toBe(false);
    });

    it('deve iniciar com showProofPanel = true', () => {
      const { result } = renderHook(() => useProofManager());
      expect(result.current.showProofPanel).toBe(true);
    });

    it('deve iniciar com newProofTextData vazio', () => {
      const { result } = renderHook(() => useProofManager());
      expect(result.current.newProofTextData).toEqual({ name: '', text: '' });
    });

    it('deve iniciar com analyzingProofIds como Set vazio', () => {
      const { result } = renderHook(() => useProofManager());
      expect(result.current.analyzingProofIds.size).toBe(0);
    });
  });

  describe('Upload de Provas PDF', () => {
    it('deve adicionar prova PDF via handleUploadProofPdf', async () => {
      const { result } = renderHook(() => useProofManager());
      const mockFile = createMockFile('documento.pdf');

      await act(async () => {
        await result.current.handleUploadProofPdf([mockFile]);
      });

      expect(result.current.proofFiles).toHaveLength(1);
      expect(result.current.proofFiles[0].name).toBe('documento.pdf');
      expect(result.current.proofFiles[0].type).toBe('pdf');
    });

    it('deve definir proofUsePdfMode como true por padrão', async () => {
      const { result } = renderHook(() => useProofManager());

      await act(async () => {
        await result.current.handleUploadProofPdf([createMockFile()]);
      });

      const proofId = result.current.proofFiles[0].id;
      expect(result.current.proofUsePdfMode[proofId]).toBe(true);
    });

    it('deve definir proofProcessingModes como pdfjs por padrão', async () => {
      const { result } = renderHook(() => useProofManager());

      await act(async () => {
        await result.current.handleUploadProofPdf([createMockFile()]);
      });

      const proofId = result.current.proofFiles[0].id;
      expect(result.current.proofProcessingModes[proofId]).toBe('pdfjs');
    });

    it('deve atualizar totalProofs e hasProofs', async () => {
      const { result } = renderHook(() => useProofManager());

      await act(async () => {
        await result.current.handleUploadProofPdf([createMockFile()]);
      });

      expect(result.current.totalProofs).toBe(1);
      expect(result.current.hasProofs).toBe(true);
    });

    it('deve suportar múltiplos uploads', async () => {
      const { result } = renderHook(() => useProofManager());

      await act(async () => {
        await result.current.handleUploadProofPdf([
          createMockFile('doc1.pdf'),
          createMockFile('doc2.pdf')
        ]);
      });

      expect(result.current.proofFiles).toHaveLength(2);
    });
  });

  describe('Provas de Texto', () => {
    it('deve adicionar prova de texto via handleAddProofText', () => {
      const { result } = renderHook(() => useProofManager());

      act(() => {
        result.current.setNewProofTextData({ name: 'Testemunho', text: 'Conteúdo do testemunho' });
      });

      act(() => {
        result.current.handleAddProofText();
      });

      expect(result.current.proofTexts).toHaveLength(1);
      expect(result.current.proofTexts[0].name).toBe('Testemunho');
    });

    it('deve limpar formulário após adicionar', () => {
      const { result } = renderHook(() => useProofManager());

      act(() => {
        result.current.setNewProofTextData({ name: 'Teste', text: 'Conteúdo' });
      });

      act(() => {
        result.current.handleAddProofText();
      });

      expect(result.current.newProofTextData).toEqual({ name: '', text: '' });
    });

    it('não deve adicionar com nome vazio', () => {
      const { result } = renderHook(() => useProofManager());

      act(() => {
        result.current.setNewProofTextData({ name: '', text: 'Conteúdo' });
        result.current.handleAddProofText();
      });

      expect(result.current.proofTexts).toHaveLength(0);
    });

    it('não deve adicionar com texto vazio', () => {
      const { result } = renderHook(() => useProofManager());

      act(() => {
        result.current.setNewProofTextData({ name: 'Nome', text: '' });
        result.current.handleAddProofText();
      });

      expect(result.current.proofTexts).toHaveLength(0);
    });
  });

  describe('Deletar Provas', () => {
    it('deve deletar prova PDF', async () => {
      const { result } = renderHook(() => useProofManager());

      await act(async () => {
        await result.current.handleUploadProofPdf([createMockFile()]);
      });

      const proof = result.current.proofFiles[0];

      act(() => {
        result.current.handleDeleteProof(proof);
      });

      expect(result.current.proofFiles).toHaveLength(0);
    });

    it('deve deletar prova de texto', () => {
      const { result } = renderHook(() => useProofManager());

      act(() => {
        result.current.setNewProofTextData({ name: 'Teste', text: 'Conteúdo' });
      });

      act(() => {
        result.current.handleAddProofText();
      });

      const proof = result.current.proofTexts[0];

      act(() => {
        result.current.handleDeleteProof(proof);
      });

      expect(result.current.proofTexts).toHaveLength(0);
    });

    it('deve limpar dados relacionados ao deletar', async () => {
      const { result } = renderHook(() => useProofManager());

      await act(async () => {
        await result.current.handleUploadProofPdf([createMockFile()]);
      });

      const proof = result.current.proofFiles[0];
      const proofId = proof.id;

      act(() => {
        result.current.handleLinkProof(proofId, ['Tópico 1']);
        result.current.handleSaveProofConclusion(proofId, 'Conclusão');
      });

      act(() => {
        result.current.handleDeleteProof(proof);
      });

      expect(result.current.proofTopicLinks[proofId]).toBeUndefined();
      expect(result.current.proofConclusions[proofId]).toBeUndefined();
    });
  });

  describe('Vinculação de Provas a Tópicos', () => {
    it('deve vincular prova a tópicos via handleLinkProof', async () => {
      const { result } = renderHook(() => useProofManager());

      await act(async () => {
        await result.current.handleUploadProofPdf([createMockFile()]);
      });

      const proofId = result.current.proofFiles[0].id;

      act(() => {
        result.current.handleLinkProof(proofId, ['Danos Morais', 'Horas Extras']);
      });

      expect(result.current.proofTopicLinks[proofId]).toEqual(['Danos Morais', 'Horas Extras']);
    });

    it('deve desvincular tópico específico via handleUnlinkProof', async () => {
      const { result } = renderHook(() => useProofManager());

      await act(async () => {
        await result.current.handleUploadProofPdf([createMockFile()]);
      });

      const proofId = result.current.proofFiles[0].id;

      act(() => {
        result.current.handleLinkProof(proofId, ['Tópico A', 'Tópico B']);
      });

      act(() => {
        result.current.handleUnlinkProof(proofId, 'Tópico A');
      });

      expect(result.current.proofTopicLinks[proofId]).toEqual(['Tópico B']);
    });

    it('deve remover chave quando não sobrar vínculo', async () => {
      const { result } = renderHook(() => useProofManager());

      await act(async () => {
        await result.current.handleUploadProofPdf([createMockFile()]);
      });

      const proofId = result.current.proofFiles[0].id;

      act(() => {
        result.current.handleLinkProof(proofId, ['Único Tópico']);
        result.current.handleUnlinkProof(proofId, 'Único Tópico');
      });

      expect(result.current.proofTopicLinks[proofId]).toBeUndefined();
    });
  });

  describe('Conclusões de Provas', () => {
    it('deve salvar conclusão via handleSaveProofConclusion', async () => {
      const { result } = renderHook(() => useProofManager());

      await act(async () => {
        await result.current.handleUploadProofPdf([createMockFile()]);
      });

      const proofId = result.current.proofFiles[0].id;

      act(() => {
        result.current.handleSaveProofConclusion(proofId, 'Prova convincente');
      });

      expect(result.current.proofConclusions[proofId]).toBe('Prova convincente');
    });

    it('deve remover conclusão quando vazia', async () => {
      const { result } = renderHook(() => useProofManager());

      await act(async () => {
        await result.current.handleUploadProofPdf([createMockFile()]);
      });

      const proofId = result.current.proofFiles[0].id;

      act(() => {
        result.current.handleSaveProofConclusion(proofId, 'Conclusão');
        result.current.handleSaveProofConclusion(proofId, '');
      });

      expect(result.current.proofConclusions[proofId]).toBeUndefined();
    });
  });

  describe('Controle de Análise', () => {
    it('deve adicionar prova em análise via addAnalyzingProof', () => {
      const { result } = renderHook(() => useProofManager());

      act(() => {
        result.current.addAnalyzingProof('proof-1');
      });

      expect(result.current.isAnalyzingProof('proof-1')).toBe(true);
    });

    it('deve remover prova de análise via removeAnalyzingProof', () => {
      const { result } = renderHook(() => useProofManager());

      act(() => {
        result.current.addAnalyzingProof('proof-1');
        result.current.removeAnalyzingProof('proof-1');
      });

      expect(result.current.isAnalyzingProof('proof-1')).toBe(false);
    });

    it('deve suportar múltiplas análises simultâneas', () => {
      const { result } = renderHook(() => useProofManager());

      act(() => {
        result.current.addAnalyzingProof('proof-1');
        result.current.addAnalyzingProof('proof-2');
      });

      expect(result.current.isAnalyzingProof('proof-1')).toBe(true);
      expect(result.current.isAnalyzingProof('proof-2')).toBe(true);
    });

    it('deve limpar todas análises via clearAnalyzingProofs', () => {
      const { result } = renderHook(() => useProofManager());

      act(() => {
        result.current.addAnalyzingProof('proof-1');
        result.current.addAnalyzingProof('proof-2');
        result.current.clearAnalyzingProofs();
      });

      expect(result.current.analyzingProofIds.size).toBe(0);
    });
  });

  describe('Toggle Modo PDF', () => {
    it('deve alternar modo PDF via handleToggleProofMode', async () => {
      const { result } = renderHook(() => useProofManager());

      await act(async () => {
        await result.current.handleUploadProofPdf([createMockFile()]);
      });

      const proofId = result.current.proofFiles[0].id;

      act(() => {
        result.current.handleToggleProofMode(proofId, false);
      });

      expect(result.current.proofUsePdfMode[proofId]).toBe(false);
    });
  });

  describe('Persistência', () => {
    it('deve serializar estado via serializeForPersistence', async () => {
      const { result } = renderHook(() => useProofManager());

      await act(async () => {
        await result.current.handleUploadProofPdf([createMockFile()]);
      });

      act(() => {
        result.current.setNewProofTextData({ name: 'Texto', text: 'Conteúdo' });
      });

      act(() => {
        result.current.handleAddProofText();
      });

      const serialized = result.current.serializeForPersistence();

      expect(serialized.proofFiles).toHaveLength(1);
      expect(serialized.proofTexts).toHaveLength(1);
    });

    it('deve restaurar estado via restoreFromPersistence', () => {
      const { result } = renderHook(() => useProofManager());

      const savedData = {
        proofTexts: [{ id: 1, name: 'Prova', text: 'Conteúdo' }],
        proofTopicLinks: { 1: ['Tópico A'] },
        proofConclusions: { 1: 'Conclusão' }
      };

      act(() => {
        result.current.restoreFromPersistence(savedData);
      });

      expect(result.current.proofTexts).toHaveLength(1);
      expect(result.current.proofTopicLinks[1]).toEqual(['Tópico A']);
      expect(result.current.proofConclusions[1]).toBe('Conclusão');
    });

    it('deve ignorar dados nulos no restore', () => {
      const { result } = renderHook(() => useProofManager());

      act(() => {
        result.current.restoreFromPersistence(null);
      });

      expect(result.current.proofFiles).toEqual([]);
    });
  });

  describe('Reset', () => {
    it('deve resetar todo estado via resetAll', async () => {
      const { result } = renderHook(() => useProofManager());

      await act(async () => {
        await result.current.handleUploadProofPdf([createMockFile()]);
      });

      act(() => {
        result.current.setNewProofTextData({ name: 'Texto', text: 'Conteúdo' });
        result.current.handleAddProofText();
        result.current.addAnalyzingProof('proof-1');
        result.current.setShowProofPanel(false);
      });

      act(() => {
        result.current.resetAll();
      });

      expect(result.current.proofFiles).toEqual([]);
      expect(result.current.proofTexts).toEqual([]);
      expect(result.current.analyzingProofIds.size).toBe(0);
      expect(result.current.showProofPanel).toBe(true);
    });
  });

  describe('Estabilidade de Referências', () => {
    it('handleUploadProofPdf deve ser estável', () => {
      const { result, rerender } = renderHook(() => useProofManager());
      const firstRef = result.current.handleUploadProofPdf;

      rerender();

      expect(result.current.handleUploadProofPdf).toBe(firstRef);
    });

    it('handleDeleteProof deve ser estável', () => {
      const { result, rerender } = renderHook(() => useProofManager());
      const firstRef = result.current.handleDeleteProof;

      rerender();

      expect(result.current.handleDeleteProof).toBe(firstRef);
    });

    it('resetAll deve ser estável', () => {
      const { result, rerender } = renderHook(() => useProofManager());
      const firstRef = result.current.resetAll;

      rerender();

      expect(result.current.resetAll).toBe(firstRef);
    });
  });
});
