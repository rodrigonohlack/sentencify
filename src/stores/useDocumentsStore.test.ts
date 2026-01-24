import { describe, it, expect, beforeEach } from 'vitest';
import { useDocumentsStore } from './useDocumentsStore';
import type { UploadedFile, PastedText } from '../types';

const mockFile = (name: string): UploadedFile => ({
  id: `file-${name}`,
  name,
  size: 1024,
  file: new File([], name),
});

const mockPastedText = (text: string, name: string): PastedText => ({
  id: `pasted-${name}`,
  text,
  name,
});

describe('useDocumentsStore', () => {
  beforeEach(() => {
    useDocumentsStore.getState().clearAll();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SETTERS DE ARQUIVOS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('setPeticaoFiles', () => {
    it('should set peticao files directly', () => {
      const files = [mockFile('peticao.pdf')];
      useDocumentsStore.getState().setPeticaoFiles(files);
      expect(useDocumentsStore.getState().peticaoFiles).toEqual(files);
    });

    it('should set peticao files via updater function', () => {
      const file1 = mockFile('doc1.pdf');
      const file2 = mockFile('doc2.pdf');
      useDocumentsStore.getState().setPeticaoFiles([file1]);
      useDocumentsStore.getState().setPeticaoFiles((prev) => [...prev, file2]);
      expect(useDocumentsStore.getState().peticaoFiles).toHaveLength(2);
    });
  });

  describe('setContestacaoFiles', () => {
    it('should set contestacao files', () => {
      const files = [mockFile('contestacao.pdf')];
      useDocumentsStore.getState().setContestacaoFiles(files);
      expect(useDocumentsStore.getState().contestacaoFiles).toEqual(files);
    });
  });

  describe('setComplementaryFiles', () => {
    it('should set complementary files', () => {
      const files = [mockFile('complementar.pdf')];
      useDocumentsStore.getState().setComplementaryFiles(files);
      expect(useDocumentsStore.getState().complementaryFiles).toEqual(files);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SETTERS DE TEXTOS COLADOS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('setPastedPeticaoTexts', () => {
    it('should set pasted peticao texts', () => {
      const texts = [mockPastedText('Conteúdo', 'Petição')];
      useDocumentsStore.getState().setPastedPeticaoTexts(texts);
      expect(useDocumentsStore.getState().pastedPeticaoTexts).toEqual(texts);
    });

    it('should support updater function', () => {
      const text1 = mockPastedText('T1', 'P1');
      useDocumentsStore.getState().setPastedPeticaoTexts([text1]);
      useDocumentsStore.getState().setPastedPeticaoTexts((prev) => [...prev, mockPastedText('T2', 'P2')]);
      expect(useDocumentsStore.getState().pastedPeticaoTexts).toHaveLength(2);
    });
  });

  describe('setPastedContestacaoTexts', () => {
    it('should set pasted contestacao texts', () => {
      const texts = [mockPastedText('Contestação', 'C1')];
      useDocumentsStore.getState().setPastedContestacaoTexts(texts);
      expect(useDocumentsStore.getState().pastedContestacaoTexts).toEqual(texts);
    });
  });

  describe('setPastedComplementaryTexts', () => {
    it('should set pasted complementary texts', () => {
      const texts = [mockPastedText('Complementar', 'Comp1')];
      useDocumentsStore.getState().setPastedComplementaryTexts(texts);
      expect(useDocumentsStore.getState().pastedComplementaryTexts).toEqual(texts);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SETTERS DE UI
  // ═══════════════════════════════════════════════════════════════════════════

  describe('setAnalyzing', () => {
    it('should set analyzing flag', () => {
      useDocumentsStore.getState().setAnalyzing(true);
      expect(useDocumentsStore.getState().analyzing).toBe(true);
    });
  });

  describe('setAnalysisProgress', () => {
    it('should set progress message', () => {
      useDocumentsStore.getState().setAnalysisProgress('Processando documentos...');
      expect(useDocumentsStore.getState().analysisProgress).toBe('Processando documentos...');
    });
  });

  describe('setExtractingText', () => {
    it('should set extracting flag', () => {
      useDocumentsStore.getState().setExtractingText(true);
      expect(useDocumentsStore.getState().extractingText).toBe(true);
    });
  });

  describe('setShowPasteArea', () => {
    it('should set paste area visibility', () => {
      useDocumentsStore.getState().setShowPasteArea({ peticao: true, contestacao: false, complementary: false });
      expect(useDocumentsStore.getState().showPasteArea.peticao).toBe(true);
    });

    it('should support updater function', () => {
      useDocumentsStore.getState().setShowPasteArea((prev) => ({ ...prev, peticao: true }));
      expect(useDocumentsStore.getState().showPasteArea.peticao).toBe(true);
    });
  });

  describe('setShowTextPreview', () => {
    it('should set text preview visibility', () => {
      useDocumentsStore.getState().setShowTextPreview(true);
      expect(useDocumentsStore.getState().showTextPreview).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SETTERS DE PROCESSAMENTO
  // ═══════════════════════════════════════════════════════════════════════════

  describe('setPeticaoMode', () => {
    it('should set processing mode for specific petition index', () => {
      useDocumentsStore.getState().setPeticaoMode(0, 'pdfjs');
      expect(useDocumentsStore.getState().documentProcessingModes.peticoes[0]).toBe('pdfjs');
    });

    it('should set mode at arbitrary index', () => {
      useDocumentsStore.getState().setPeticaoMode(2, 'claude-vision');
      expect(useDocumentsStore.getState().documentProcessingModes.peticoes[2]).toBe('claude-vision');
    });
  });

  describe('setContestacaoMode', () => {
    it('should set processing mode for contestação', () => {
      useDocumentsStore.getState().setContestacaoMode(0, 'pdf-puro');
      expect(useDocumentsStore.getState().documentProcessingModes.contestacoes[0]).toBe('pdf-puro');
    });
  });

  describe('setComplementarMode', () => {
    it('should set processing mode for complementar', () => {
      useDocumentsStore.getState().setComplementarMode(1, 'pdfjs');
      expect(useDocumentsStore.getState().documentProcessingModes.complementares[1]).toBe('pdfjs');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTIONS COMPLEXAS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('handlePastedText', () => {
    it('should return false for empty text', () => {
      const result = useDocumentsStore.getState().handlePastedText('', 'peticao');
      expect(result).toBe(false);
    });

    it('should return false for whitespace-only text', () => {
      const result = useDocumentsStore.getState().handlePastedText('   ', 'peticao');
      expect(result).toBe(false);
    });

    it('should add peticao text with correct name', () => {
      useDocumentsStore.getState().handlePastedText('Conteúdo da petição', 'peticao');
      const texts = useDocumentsStore.getState().pastedPeticaoTexts;
      expect(texts).toHaveLength(1);
      expect(texts[0].name).toBe('Petição Inicial');
      expect(texts[0].text).toBe('Conteúdo da petição');
    });

    it('should name second peticao as Emenda', () => {
      useDocumentsStore.getState().handlePastedText('Primeira', 'peticao');
      useDocumentsStore.getState().handlePastedText('Segunda', 'peticao');
      const texts = useDocumentsStore.getState().pastedPeticaoTexts;
      expect(texts[1].name).toBe('Emenda/Doc Autor 2');
    });

    it('should add contestacao text', () => {
      useDocumentsStore.getState().handlePastedText('Contestação text', 'contestacao');
      const texts = useDocumentsStore.getState().pastedContestacaoTexts;
      expect(texts).toHaveLength(1);
      expect(texts[0].name).toBe('Contestação 1');
    });

    it('should add complementary text', () => {
      useDocumentsStore.getState().handlePastedText('Doc complementar', 'complementary');
      const texts = useDocumentsStore.getState().pastedComplementaryTexts;
      expect(texts).toHaveLength(1);
      expect(texts[0].name).toBe('Documento Complementar 1');
    });

    it('should hide paste area after adding text', () => {
      useDocumentsStore.getState().setShowPasteArea({ peticao: true, contestacao: true, complementary: true });
      useDocumentsStore.getState().handlePastedText('Text', 'peticao');
      expect(useDocumentsStore.getState().showPasteArea.peticao).toBe(false);
    });

    it('should return true on success', () => {
      const result = useDocumentsStore.getState().handlePastedText('Text', 'peticao');
      expect(result).toBe(true);
    });
  });

  describe('removePastedText', () => {
    it('should do nothing for null index', () => {
      useDocumentsStore.getState().handlePastedText('Text', 'peticao');
      useDocumentsStore.getState().removePastedText('peticao', null);
      expect(useDocumentsStore.getState().pastedPeticaoTexts).toHaveLength(1);
    });

    it('should remove peticao text by index', () => {
      useDocumentsStore.getState().handlePastedText('First', 'peticao');
      useDocumentsStore.getState().handlePastedText('Second', 'peticao');
      useDocumentsStore.getState().removePastedText('peticao', 0);
      expect(useDocumentsStore.getState().pastedPeticaoTexts).toHaveLength(1);
      expect(useDocumentsStore.getState().pastedPeticaoTexts[0].text).toBe('Second');
    });

    it('should remove contestacao text by index', () => {
      useDocumentsStore.getState().handlePastedText('Text', 'contestacao');
      useDocumentsStore.getState().removePastedText('contestacao', 0);
      expect(useDocumentsStore.getState().pastedContestacaoTexts).toHaveLength(0);
    });

    it('should remove complementary text by index', () => {
      useDocumentsStore.getState().handlePastedText('Text', 'complementary');
      useDocumentsStore.getState().removePastedText('complementary', 0);
      expect(useDocumentsStore.getState().pastedComplementaryTexts).toHaveLength(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PERSISTÊNCIA
  // ═══════════════════════════════════════════════════════════════════════════

  describe('serializeForPersistence', () => {
    it('should serialize relevant state fields', () => {
      useDocumentsStore.getState().handlePastedText('Text', 'peticao');
      const serialized = useDocumentsStore.getState().serializeForPersistence();
      expect(serialized).toHaveProperty('peticaoFiles');
      expect(serialized).toHaveProperty('contestacaoFiles');
      expect(serialized).toHaveProperty('pastedPeticaoTexts');
      expect(serialized).toHaveProperty('analyzedDocuments');
      expect(serialized).toHaveProperty('documentProcessingModes');
    });

    it('should not include UI-only state like analyzing', () => {
      const serialized = useDocumentsStore.getState().serializeForPersistence();
      expect(serialized).not.toHaveProperty('analyzing');
      expect(serialized).not.toHaveProperty('analysisProgress');
      expect(serialized).not.toHaveProperty('extractingText');
    });
  });

  describe('restoreFromPersistence', () => {
    it('should restore state from data', () => {
      const data = {
        pastedPeticaoTexts: [{ id: 'p1', text: 'Restored', name: 'Petição' }],
        analyzing: true, // should not be in restore but won't break
      };
      useDocumentsStore.getState().restoreFromPersistence(data);
      expect(useDocumentsStore.getState().pastedPeticaoTexts).toHaveLength(1);
      expect(useDocumentsStore.getState().pastedPeticaoTexts[0].text).toBe('Restored');
    });

    it('should handle null data gracefully', () => {
      useDocumentsStore.getState().handlePastedText('Original', 'peticao');
      useDocumentsStore.getState().restoreFromPersistence(null);
      // State should remain unchanged
      expect(useDocumentsStore.getState().pastedPeticaoTexts).toHaveLength(1);
    });

    it('should restore partial data without clearing other fields', () => {
      useDocumentsStore.getState().handlePastedText('Keep', 'contestacao');
      useDocumentsStore.getState().restoreFromPersistence({
        pastedPeticaoTexts: [{ id: 'p1', text: 'New', name: 'P1' }],
      });
      expect(useDocumentsStore.getState().pastedPeticaoTexts).toHaveLength(1);
      expect(useDocumentsStore.getState().pastedContestacaoTexts).toHaveLength(1);
    });
  });

  describe('clearAll', () => {
    it('should reset all state to initial values', () => {
      useDocumentsStore.getState().setPeticaoFiles([mockFile('test.pdf')]);
      useDocumentsStore.getState().handlePastedText('Text', 'peticao');
      useDocumentsStore.getState().setAnalyzing(true);
      useDocumentsStore.getState().setAnalysisProgress('50%');
      useDocumentsStore.getState().setShowTextPreview(true);

      useDocumentsStore.getState().clearAll();

      expect(useDocumentsStore.getState().peticaoFiles).toHaveLength(0);
      expect(useDocumentsStore.getState().contestacaoFiles).toHaveLength(0);
      expect(useDocumentsStore.getState().complementaryFiles).toHaveLength(0);
      expect(useDocumentsStore.getState().pastedPeticaoTexts).toHaveLength(0);
      expect(useDocumentsStore.getState().analyzing).toBe(false);
      expect(useDocumentsStore.getState().analysisProgress).toBe('');
      expect(useDocumentsStore.getState().extractingText).toBe(false);
      expect(useDocumentsStore.getState().showTextPreview).toBe(false);
    });
  });
});
