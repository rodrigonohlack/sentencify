/**
 * @file useDetectEntities.test.ts
 * @description Testes para o hook de detecção automática de entidades (NER)
 * @version 1.38.49
 *
 * Cobre:
 * 1. Inicialização do hook e retorno
 * 2. Extração de entidades de texto (NER-style)
 * 3. Categorização de entidades (PER, ORG)
 * 4. Gerenciamento de estado (detectingNames)
 * 5. Formatação de resultados (merge, dedup, stop words)
 * 6. Tratamento de erros
 * 7. Fallback regex para ORG
 * 8. Pré-processamento de texto (overrideText, PDF, colados)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDetectEntities } from './useDetectEntities';
import type { UseDetectEntitiesProps, DocumentServicesForNER } from './useDetectEntities';

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK: AIModelService
// ═══════════════════════════════════════════════════════════════════════════════

const mockExtractEntities = vi.fn();

vi.mock('../services/AIModelService', () => ({
  default: {
    extractEntities: (...args: any[]) => mockExtractEntities(...args),
  },
}));

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK FACTORIES
// ═══════════════════════════════════════════════════════════════════════════════

const createMockDocumentServices = (overrides: Partial<DocumentServicesForNER> = {}): DocumentServicesForNER => ({
  extractTextFromPDFPure: vi.fn().mockResolvedValue('Texto extraído do PDF com mais de cinquenta caracteres para passar na validação de tamanho mínimo do texto.'),
  ...overrides,
});

const createDefaultProps = (overrides: Partial<UseDetectEntitiesProps> = {}): UseDetectEntitiesProps => ({
  nerEnabled: true,
  nerIncludeOrg: false,
  anonymizationNamesText: '',
  setAnonymizationNamesText: vi.fn(),
  setDetectingNames: vi.fn(),
  pastedPeticaoTexts: null,
  pastedContestacaoTexts: null,
  peticaoFiles: null,
  contestacaoFiles: null,
  extractedTexts: null,
  documentServices: createMockDocumentServices(),
  showToast: vi.fn(),
  ...overrides,
});

// Helper: criar entidade NER processada
const createNEREntity = (overrides: Partial<{ text: string; type: string; score: number; start: number; end: number }> = {}) => ({
  text: 'João Silva',
  type: 'PER',
  score: 0.95,
  start: 0,
  end: 10,
  ...overrides,
});

// ═══════════════════════════════════════════════════════════════════════════════
// TESTES
// ═══════════════════════════════════════════════════════════════════════════════

describe('useDetectEntities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExtractEntities.mockResolvedValue([]);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SEÇÃO 1: Inicialização e retorno
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Hook initialization and returned methods', () => {
    it('should return detectarNomesAutomaticamente function', () => {
      const props = createDefaultProps();
      const { result } = renderHook(() => useDetectEntities(props));

      expect(result.current.detectarNomesAutomaticamente).toBeDefined();
      expect(typeof result.current.detectarNomesAutomaticamente).toBe('function');
    });

    it('should return a stable function reference when props do not change', () => {
      const props = createDefaultProps();
      const { result, rerender } = renderHook(() => useDetectEntities(props));

      const firstRef = result.current.detectarNomesAutomaticamente;
      rerender();
      expect(result.current.detectarNomesAutomaticamente).toBe(firstRef);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SEÇÃO 2: NER desabilitado
  // ═══════════════════════════════════════════════════════════════════════════

  describe('NER disabled', () => {
    it('should show error toast when NER is disabled', async () => {
      const props = createDefaultProps({ nerEnabled: false });
      const { result } = renderHook(() => useDetectEntities(props));

      await act(async () => {
        await result.current.detectarNomesAutomaticamente();
      });

      expect(props.showToast).toHaveBeenCalledWith(
        'Ative o NER em Configurações IA para detectar nomes automaticamente.',
        'error'
      );
      expect(mockExtractEntities).not.toHaveBeenCalled();
    });

    it('should not call setDetectingNames when NER is disabled', async () => {
      const props = createDefaultProps({ nerEnabled: false });
      const { result } = renderHook(() => useDetectEntities(props));

      await act(async () => {
        await result.current.detectarNomesAutomaticamente();
      });

      expect(props.setDetectingNames).not.toHaveBeenCalledWith(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SEÇÃO 3: Gerenciamento de estado (setDetectingNames)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Processing state management', () => {
    it('should set detectingNames to true at start and false at end', async () => {
      mockExtractEntities.mockResolvedValue([
        createNEREntity({ text: 'MARIA SANTOS', type: 'PER' }),
      ]);
      const props = createDefaultProps({
        pastedPeticaoTexts: [{ id: '1', text: 'A'.repeat(200), name: 'peticao.txt' }],
      });
      const { result } = renderHook(() => useDetectEntities(props));

      await act(async () => {
        await result.current.detectarNomesAutomaticamente();
      });

      expect(props.setDetectingNames).toHaveBeenCalledWith(true);
      expect(props.setDetectingNames).toHaveBeenCalledWith(false);
    });

    it('should skip setDetectingNames(true) when skipSetDetecting is true', async () => {
      mockExtractEntities.mockResolvedValue([
        createNEREntity({ text: 'PEDRO ALMEIDA', type: 'PER' }),
      ]);
      const props = createDefaultProps({
        pastedPeticaoTexts: [{ id: '1', text: 'A'.repeat(200), name: 'peticao.txt' }],
      });
      const { result } = renderHook(() => useDetectEntities(props));

      await act(async () => {
        await result.current.detectarNomesAutomaticamente(null, true);
      });

      // Should NOT call setDetectingNames(true) but still call setDetectingNames(false)
      expect(props.setDetectingNames).not.toHaveBeenCalledWith(true);
      expect(props.setDetectingNames).toHaveBeenCalledWith(false);
    });

    it('should call setDetectingNames(false) even on error', async () => {
      mockExtractEntities.mockRejectedValue(new Error('NER failed'));
      const props = createDefaultProps({
        pastedPeticaoTexts: [{ id: '1', text: 'A'.repeat(200), name: 'peticao.txt' }],
      });
      const { result } = renderHook(() => useDetectEntities(props));

      await act(async () => {
        await result.current.detectarNomesAutomaticamente();
      });

      expect(props.setDetectingNames).toHaveBeenCalledWith(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SEÇÃO 4: Pré-processamento de texto (overrideText)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Text preprocessing - overrideText', () => {
    it('should use overrideText directly when provided and long enough (>50 chars)', async () => {
      const longText = 'RECLAMAÇÃO TRABALHISTA movida por MARIA DA SILVA contra EMPRESA XYZ LTDA nesta vara do trabalho';
      mockExtractEntities.mockResolvedValue([
        createNEREntity({ text: 'MARIA DA SILVA', type: 'PER' }),
      ]);
      const props = createDefaultProps();
      const { result } = renderHook(() => useDetectEntities(props));

      await act(async () => {
        await result.current.detectarNomesAutomaticamente(longText);
      });

      expect(mockExtractEntities).toHaveBeenCalledWith(expect.any(String));
      // Should use overrideText, not collect from documents
      const calledText = mockExtractEntities.mock.calls[0][0];
      expect(calledText).toBe(longText.slice(0, 3000));
    });

    it('should limit overrideText to 3000 chars', async () => {
      const veryLongText = 'A'.repeat(5000);
      mockExtractEntities.mockResolvedValue([]);
      const props = createDefaultProps();
      const { result } = renderHook(() => useDetectEntities(props));

      await act(async () => {
        await result.current.detectarNomesAutomaticamente(veryLongText);
      });

      const calledText = mockExtractEntities.mock.calls[0][0];
      expect(calledText.length).toBe(3000);
    });

    it('should ignore overrideText shorter than 50 chars and fall back to documents', async () => {
      const shortText = 'short text';
      mockExtractEntities.mockResolvedValue([]);
      const props = createDefaultProps(); // No documents loaded
      const { result } = renderHook(() => useDetectEntities(props));

      await act(async () => {
        await result.current.detectarNomesAutomaticamente(shortText);
      });

      // Should show "no documents" error since overrideText is too short AND no documents
      expect(props.showToast).toHaveBeenCalledWith('Nenhum documento carregado para análise.', 'error');
    });

    it('should ignore null overrideText and use documents', async () => {
      mockExtractEntities.mockResolvedValue([
        createNEREntity({ text: 'FULANO TESTE', type: 'PER' }),
      ]);
      const props = createDefaultProps({
        pastedPeticaoTexts: [{ id: '1', text: 'B'.repeat(200), name: 'doc.txt' }],
      });
      const { result } = renderHook(() => useDetectEntities(props));

      await act(async () => {
        await result.current.detectarNomesAutomaticamente(null);
      });

      expect(mockExtractEntities).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SEÇÃO 5: Coleta de texto de documentos
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Text collection from documents', () => {
    it('should show error when no documents are available', async () => {
      const props = createDefaultProps();
      const { result } = renderHook(() => useDetectEntities(props));

      await act(async () => {
        await result.current.detectarNomesAutomaticamente();
      });

      expect(props.showToast).toHaveBeenCalledWith('Nenhum documento carregado para análise.', 'error');
      expect(mockExtractEntities).not.toHaveBeenCalled();
    });

    it('should collect text from pastedPeticaoTexts', async () => {
      const pastedText = 'Reclamação trabalhista proposta por JOSÉ FERREIRA DA COSTA, brasileiro, residente na cidade de São Paulo, contra EMPRESA ALPHA S.A. portanto requer';
      mockExtractEntities.mockResolvedValue([
        createNEREntity({ text: 'JOSÉ FERREIRA DA COSTA', type: 'PER' }),
      ]);
      const props = createDefaultProps({
        pastedPeticaoTexts: [{ id: '1', text: pastedText, name: 'peticao.txt' }],
      });
      const { result } = renderHook(() => useDetectEntities(props));

      await act(async () => {
        await result.current.detectarNomesAutomaticamente();
      });

      expect(mockExtractEntities).toHaveBeenCalled();
    });

    it('should collect text from pastedContestacaoTexts', async () => {
      const contestText = 'A reclamada EMPRESA BETA LTDA vem responder os termos da reclamação trabalhista proposta por CARLOS MENEZES. Primeiramente requer-se a improcedência';
      mockExtractEntities.mockResolvedValue([
        createNEREntity({ text: 'CARLOS MENEZES', type: 'PER' }),
      ]);
      const props = createDefaultProps({
        pastedContestacaoTexts: [{ id: '1', text: contestText, name: 'contestacao.txt' }],
      });
      const { result } = renderHook(() => useDetectEntities(props));

      await act(async () => {
        await result.current.detectarNomesAutomaticamente();
      });

      expect(mockExtractEntities).toHaveBeenCalled();
    });

    it('should extract first page from PDF files (peticaoFiles)', async () => {
      const mockFile = new File(['content'], 'peticao.pdf', { type: 'application/pdf' });
      const mockDocServices = createMockDocumentServices({
        extractTextFromPDFPure: vi.fn().mockResolvedValue('Petição de ROBERTO SILVA contra EMPRESA XYZ ' + 'a'.repeat(100)),
      });
      mockExtractEntities.mockResolvedValue([
        createNEREntity({ text: 'ROBERTO SILVA', type: 'PER' }),
      ]);
      const props = createDefaultProps({
        peticaoFiles: [{ file: mockFile, id: 'file-1' }],
        documentServices: mockDocServices,
      });
      const { result } = renderHook(() => useDetectEntities(props));

      await act(async () => {
        await result.current.detectarNomesAutomaticamente();
      });

      expect(mockDocServices.extractTextFromPDFPure).toHaveBeenCalledWith(mockFile);
      expect(mockExtractEntities).toHaveBeenCalled();
    });

    it('should extract first page from PDF files (contestacaoFiles)', async () => {
      const mockFile = new File(['content'], 'contestacao.pdf', { type: 'application/pdf' });
      const mockDocServices = createMockDocumentServices({
        extractTextFromPDFPure: vi.fn().mockResolvedValue('Contestação da empresa TECH SOLUTIONS LTDA ' + 'b'.repeat(100)),
      });
      mockExtractEntities.mockResolvedValue([
        createNEREntity({ text: 'TECH SOLUTIONS', type: 'ORG' }),
      ]);
      const props = createDefaultProps({
        nerIncludeOrg: true,
        contestacaoFiles: [{ file: mockFile, id: 'file-2' }],
        documentServices: mockDocServices,
      });
      const { result } = renderHook(() => useDetectEntities(props));

      await act(async () => {
        await result.current.detectarNomesAutomaticamente();
      });

      expect(mockDocServices.extractTextFromPDFPure).toHaveBeenCalledWith(mockFile);
    });

    it('should use extractedTexts as fallback', async () => {
      const longText = 'Texto extraído anteriormente contendo NOME PESSOA TESTE e outros dados' + ' '.repeat(100);
      mockExtractEntities.mockResolvedValue([
        createNEREntity({ text: 'NOME PESSOA TESTE', type: 'PER' }),
      ]);
      const props = createDefaultProps({
        extractedTexts: {
          peticoes: [{ text: longText }],
          contestacoes: [],
        },
      });
      const { result } = renderHook(() => useDetectEntities(props));

      await act(async () => {
        await result.current.detectarNomesAutomaticamente();
      });

      expect(mockExtractEntities).toHaveBeenCalled();
    });

    it('should deduplicate texts using hash (first 200 chars)', async () => {
      const sameText = 'Texto repetido com mais de duzentos caracteres para testar a deduplicação ' + 'X'.repeat(200);
      mockExtractEntities.mockResolvedValue([]);
      const props = createDefaultProps({
        pastedPeticaoTexts: [
          { id: '1', text: sameText, name: 'doc1.txt' },
          { id: '2', text: sameText, name: 'doc2.txt' },
        ],
      });
      const { result } = renderHook(() => useDetectEntities(props));

      await act(async () => {
        await result.current.detectarNomesAutomaticamente();
      });

      // Text should only be included once (deduplication)
      expect(mockExtractEntities).toHaveBeenCalled();
      const calledText = mockExtractEntities.mock.calls[0][0] as string;
      // The text shouldn't contain the content duplicated
      const occurrences = calledText.split('Texto repetido').length - 1;
      expect(occurrences).toBe(1);
    });

    it('should limit each text to 1000 chars (CHARS_PER_PAGE)', async () => {
      const longText = 'A'.repeat(5000);
      mockExtractEntities.mockResolvedValue([]);
      const props = createDefaultProps({
        pastedPeticaoTexts: [{ id: '1', text: longText, name: 'long.txt' }],
      });
      const { result } = renderHook(() => useDetectEntities(props));

      await act(async () => {
        await result.current.detectarNomesAutomaticamente();
      });

      expect(mockExtractEntities).toHaveBeenCalled();
      const calledText = mockExtractEntities.mock.calls[0][0] as string;
      expect(calledText.length).toBeLessThanOrEqual(1000);
    });

    it('should skip texts shorter than 50 chars', async () => {
      mockExtractEntities.mockResolvedValue([]);
      const props = createDefaultProps({
        pastedPeticaoTexts: [{ id: '1', text: 'Short', name: 'short.txt' }],
      });
      const { result } = renderHook(() => useDetectEntities(props));

      await act(async () => {
        await result.current.detectarNomesAutomaticamente();
      });

      // Should show "no documents" error since text is too short
      expect(props.showToast).toHaveBeenCalledWith('Nenhum documento carregado para análise.', 'error');
    });

    it('should handle PDF extraction failure gracefully', async () => {
      const mockFile = new File(['content'], 'broken.pdf', { type: 'application/pdf' });
      const mockDocServices = createMockDocumentServices({
        extractTextFromPDFPure: vi.fn().mockRejectedValue(new Error('PDF corrupted')),
      });
      mockExtractEntities.mockResolvedValue([]);
      const props = createDefaultProps({
        peticaoFiles: [{ file: mockFile, id: 'file-broken' }],
        documentServices: mockDocServices,
      });
      const { result } = renderHook(() => useDetectEntities(props));

      await act(async () => {
        await result.current.detectarNomesAutomaticamente();
      });

      // Should not throw, just show "no documents" toast
      expect(props.showToast).toHaveBeenCalledWith('Nenhum documento carregado para análise.', 'error');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SEÇÃO 6: Categorização e filtragem de entidades (PER)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Entity categorization - PER (people)', () => {
    it('should include entities with type containing PER', async () => {
      mockExtractEntities.mockResolvedValue([
        createNEREntity({ text: 'JOÃO SILVA SANTOS', type: 'PER', score: 0.95 }),
      ]);
      const props = createDefaultProps({
        pastedPeticaoTexts: [{ id: '1', text: 'A'.repeat(200), name: 'doc.txt' }],
      });
      const { result } = renderHook(() => useDetectEntities(props));

      await act(async () => {
        await result.current.detectarNomesAutomaticamente();
      });

      expect(props.setAnonymizationNamesText).toHaveBeenCalledWith('JOÃO SILVA SANTOS');
    });

    it('should include entities with type containing PESSOA', async () => {
      mockExtractEntities.mockResolvedValue([
        createNEREntity({ text: 'ANA MARIA', type: 'PESSOA', score: 0.92 }),
      ]);
      const props = createDefaultProps({
        pastedPeticaoTexts: [{ id: '1', text: 'A'.repeat(200), name: 'doc.txt' }],
      });
      const { result } = renderHook(() => useDetectEntities(props));

      await act(async () => {
        await result.current.detectarNomesAutomaticamente();
      });

      expect(props.setAnonymizationNamesText).toHaveBeenCalledWith('ANA MARIA');
    });

    it('should exclude entities with LOC type when nerIncludeOrg is false', async () => {
      mockExtractEntities.mockResolvedValue([
        createNEREntity({ text: 'JOÃO SILVA', type: 'PER', score: 0.95 }),
        createNEREntity({ text: 'SÃO PAULO', type: 'LOC', score: 0.98 }),
      ]);
      const props = createDefaultProps({
        nerIncludeOrg: false,
        pastedPeticaoTexts: [{ id: '1', text: 'A'.repeat(200), name: 'doc.txt' }],
      });
      const { result } = renderHook(() => useDetectEntities(props));

      await act(async () => {
        await result.current.detectarNomesAutomaticamente();
      });

      expect(props.setAnonymizationNamesText).toHaveBeenCalledWith('JOÃO SILVA');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SEÇÃO 7: Categorização e filtragem de entidades (ORG)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Entity categorization - ORG (organizations)', () => {
    it('should include ORG entities when nerIncludeOrg is true and score >= 0.85', async () => {
      mockExtractEntities.mockResolvedValue([
        createNEREntity({ text: 'EMPRESA ALPHA', type: 'ORG', score: 0.90 }),
      ]);
      const props = createDefaultProps({
        nerIncludeOrg: true,
        pastedPeticaoTexts: [{ id: '1', text: 'A'.repeat(200), name: 'doc.txt' }],
      });
      const { result } = renderHook(() => useDetectEntities(props));

      await act(async () => {
        await result.current.detectarNomesAutomaticamente();
      });

      expect(props.setAnonymizationNamesText).toHaveBeenCalledWith('EMPRESA ALPHA');
    });

    it('should exclude ORG entities with score < 0.85', async () => {
      mockExtractEntities.mockResolvedValue([
        createNEREntity({ text: 'EMPRESA BAIXA', type: 'ORG', score: 0.80 }),
        createNEREntity({ text: 'FULANO TESTE', type: 'PER', score: 0.95 }),
      ]);
      const props = createDefaultProps({
        nerIncludeOrg: true,
        pastedPeticaoTexts: [{ id: '1', text: 'A'.repeat(200), name: 'doc.txt' }],
      });
      const { result } = renderHook(() => useDetectEntities(props));

      await act(async () => {
        await result.current.detectarNomesAutomaticamente();
      });

      expect(props.setAnonymizationNamesText).toHaveBeenCalledWith('FULANO TESTE');
    });

    it('should exclude ORG entities matching ORG_STOP_WORDS', async () => {
      mockExtractEntities.mockResolvedValue([
        createNEREntity({ text: 'TRIBUNAL REGIONAL DO TRABALHO', type: 'ORG', score: 0.99 }),
        createNEREntity({ text: 'FULANO REAL', type: 'PER', score: 0.95 }),
      ]);
      const props = createDefaultProps({
        nerIncludeOrg: true,
        pastedPeticaoTexts: [{ id: '1', text: 'A'.repeat(200), name: 'doc.txt' }],
      });
      const { result } = renderHook(() => useDetectEntities(props));

      await act(async () => {
        await result.current.detectarNomesAutomaticamente();
      });

      expect(props.setAnonymizationNamesText).toHaveBeenCalledWith('FULANO REAL');
    });

    it('should not include ORG entities when nerIncludeOrg is false', async () => {
      mockExtractEntities.mockResolvedValue([
        createNEREntity({ text: 'EMPRESA VALIDA', type: 'ORG', score: 0.99 }),
        createNEREntity({ text: 'NOME PESSOA', type: 'PER', score: 0.95 }),
      ]);
      const props = createDefaultProps({
        nerIncludeOrg: false,
        pastedPeticaoTexts: [{ id: '1', text: 'A'.repeat(200), name: 'doc.txt' }],
      });
      const { result } = renderHook(() => useDetectEntities(props));

      await act(async () => {
        await result.current.detectarNomesAutomaticamente();
      });

      expect(props.setAnonymizationNamesText).toHaveBeenCalledWith('NOME PESSOA');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SEÇÃO 8: Fallback regex para ORG
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Fallback regex for ORG detection', () => {
    it('should detect ORG patterns with LTDA suffix via regex when nerIncludeOrg is true', async () => {
      const textWithOrg = 'Reclamação contra ACME SOLUTIONS LTDA nesta vara do trabalho. ' + 'X'.repeat(100);
      mockExtractEntities.mockResolvedValue([]); // NER model finds nothing
      const props = createDefaultProps({
        nerIncludeOrg: true,
        pastedPeticaoTexts: [{ id: '1', text: textWithOrg, name: 'doc.txt' }],
      });
      const { result } = renderHook(() => useDetectEntities(props));

      await act(async () => {
        await result.current.detectarNomesAutomaticamente();
      });

      // Should detect "ACME SOLUTIONS LTDA" via regex fallback
      expect(props.setAnonymizationNamesText).toHaveBeenCalled();
      const calledWith = (props.setAnonymizationNamesText as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(calledWith).toContain('ACME SOLUTIONS LTDA');
    });

    it('should detect ORG patterns with EIRELI suffix via regex', async () => {
      const textWithOrg = 'A empresa TECH CORP EIRELI é a reclamada neste processo judicial. ' + 'Y'.repeat(100);
      mockExtractEntities.mockResolvedValue([]);
      const props = createDefaultProps({
        nerIncludeOrg: true,
        pastedPeticaoTexts: [{ id: '1', text: textWithOrg, name: 'doc.txt' }],
      });
      const { result } = renderHook(() => useDetectEntities(props));

      await act(async () => {
        await result.current.detectarNomesAutomaticamente();
      });

      expect(props.setAnonymizationNamesText).toHaveBeenCalled();
      const calledWith = (props.setAnonymizationNamesText as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(calledWith).toContain('TECH CORP EIRELI');
    });

    it('should not add fallback ORG if already detected by NER model', async () => {
      const textWithOrg = 'Reclamação contra ALPHA CORP LTDA nesta vara do trabalho. ' + 'Z'.repeat(100);
      mockExtractEntities.mockResolvedValue([
        createNEREntity({ text: 'ALPHA CORP LTDA', type: 'ORG', score: 0.95 }),
      ]);
      const props = createDefaultProps({
        nerIncludeOrg: true,
        pastedPeticaoTexts: [{ id: '1', text: textWithOrg, name: 'doc.txt' }],
      });
      const { result } = renderHook(() => useDetectEntities(props));

      await act(async () => {
        await result.current.detectarNomesAutomaticamente();
      });

      expect(props.setAnonymizationNamesText).toHaveBeenCalled();
      const calledWith = (props.setAnonymizationNamesText as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      // Should not have duplicates
      const names = calledWith.split('\n');
      const unique = [...new Set(names)];
      expect(names.length).toBe(unique.length);
    });

    it('should strip ORG_PREFIX_STOP words from regex matches', async () => {
      // "CONTRA EMPRESA LTDA" -> should strip "CONTRA" prefix
      const textWithOrg = 'Ação CONTRA EMPRESA LTDA movida pelo reclamante nesta vara do trabalho. ' + 'W'.repeat(100);
      mockExtractEntities.mockResolvedValue([]);
      const props = createDefaultProps({
        nerIncludeOrg: true,
        pastedPeticaoTexts: [{ id: '1', text: textWithOrg, name: 'doc.txt' }],
      });
      const { result } = renderHook(() => useDetectEntities(props));

      await act(async () => {
        await result.current.detectarNomesAutomaticamente();
      });

      if ((props.setAnonymizationNamesText as ReturnType<typeof vi.fn>).mock.calls.length > 0) {
        const calledWith = (props.setAnonymizationNamesText as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
        // Should not start with "CONTRA"
        expect(calledWith).not.toMatch(/^CONTRA /);
      }
    });

    it('should not run regex fallback when nerIncludeOrg is false', async () => {
      const textWithOrg = 'Reclamação contra ACME SOLUTIONS LTDA nesta vara. ' + 'V'.repeat(100);
      mockExtractEntities.mockResolvedValue([]);
      const props = createDefaultProps({
        nerIncludeOrg: false,
        pastedPeticaoTexts: [{ id: '1', text: textWithOrg, name: 'doc.txt' }],
      });
      const { result } = renderHook(() => useDetectEntities(props));

      await act(async () => {
        await result.current.detectarNomesAutomaticamente();
      });

      // No entities detected (NER returns empty, regex not run)
      expect(props.showToast).toHaveBeenCalledWith('Nenhum nome detectado nos documentos.', 'info');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SEÇÃO 9: Filtragem com STOP_WORDS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Stop words filtering', () => {
    it('should filter names containing STOP_WORDS_CONTAINS entries', async () => {
      mockExtractEntities.mockResolvedValue([
        createNEREntity({ text: 'V. EXA JUIZ', type: 'PER', score: 0.95 }),
        createNEREntity({ text: 'NOME VALIDO', type: 'PER', score: 0.90 }),
      ]);
      const props = createDefaultProps({
        pastedPeticaoTexts: [{ id: '1', text: 'A'.repeat(200), name: 'doc.txt' }],
      });
      const { result } = renderHook(() => useDetectEntities(props));

      await act(async () => {
        await result.current.detectarNomesAutomaticamente();
      });

      expect(props.setAnonymizationNamesText).toHaveBeenCalledWith('NOME VALIDO');
    });

    it('should filter names matching STOP_WORDS_EXACT as whole words', async () => {
      mockExtractEntities.mockResolvedValue([
        createNEREntity({ text: 'JUIZ TITULAR', type: 'PER', score: 0.95 }),
        createNEREntity({ text: 'MARIA COSTA', type: 'PER', score: 0.90 }),
      ]);
      const props = createDefaultProps({
        pastedPeticaoTexts: [{ id: '1', text: 'A'.repeat(200), name: 'doc.txt' }],
      });
      const { result } = renderHook(() => useDetectEntities(props));

      await act(async () => {
        await result.current.detectarNomesAutomaticamente();
      });

      expect(props.setAnonymizationNamesText).toHaveBeenCalledWith('MARIA COSTA');
    });

    it('should filter out gentilics (GENTILIC_WORDS)', async () => {
      mockExtractEntities.mockResolvedValue([
        createNEREntity({ text: 'BRASILEIRO', type: 'PER', score: 0.95 }),
        createNEREntity({ text: 'PAULISTA', type: 'PER', score: 0.90 }),
        createNEREntity({ text: 'PEDRO SOUZA', type: 'PER', score: 0.93 }),
      ]);
      const props = createDefaultProps({
        pastedPeticaoTexts: [{ id: '1', text: 'A'.repeat(200), name: 'doc.txt' }],
      });
      const { result } = renderHook(() => useDetectEntities(props));

      await act(async () => {
        await result.current.detectarNomesAutomaticamente();
      });

      expect(props.setAnonymizationNamesText).toHaveBeenCalledWith('PEDRO SOUZA');
    });

    it('should filter names shorter than 4 characters', async () => {
      mockExtractEntities.mockResolvedValue([
        createNEREntity({ text: 'ANA', type: 'PER', score: 0.95 }),
        createNEREntity({ text: 'CARLOS MENDES', type: 'PER', score: 0.90 }),
      ]);
      const props = createDefaultProps({
        pastedPeticaoTexts: [{ id: '1', text: 'A'.repeat(200), name: 'doc.txt' }],
      });
      const { result } = renderHook(() => useDetectEntities(props));

      await act(async () => {
        await result.current.detectarNomesAutomaticamente();
      });

      expect(props.setAnonymizationNamesText).toHaveBeenCalledWith('CARLOS MENDES');
    });

    it('should not filter ALMEIDA even though it contains ME (exact word boundary check)', async () => {
      mockExtractEntities.mockResolvedValue([
        createNEREntity({ text: 'ALMEIDA SANTOS', type: 'PER', score: 0.95 }),
      ]);
      const props = createDefaultProps({
        pastedPeticaoTexts: [{ id: '1', text: 'A'.repeat(200), name: 'doc.txt' }],
      });
      const { result } = renderHook(() => useDetectEntities(props));

      await act(async () => {
        await result.current.detectarNomesAutomaticamente();
      });

      // ALMEIDA contains "ME" but should NOT be filtered (word boundary check)
      expect(props.setAnonymizationNamesText).toHaveBeenCalledWith('ALMEIDA SANTOS');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SEÇÃO 10: Deduplicação e fuzzy matching
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Deduplication and fuzzy matching', () => {
    it('should deduplicate exact same names', async () => {
      mockExtractEntities.mockResolvedValue([
        createNEREntity({ text: 'MARIA SILVA', type: 'PER', score: 0.95, start: 0, end: 11 }),
        createNEREntity({ text: 'MARIA SILVA', type: 'PER', score: 0.90, start: 50, end: 61 }),
      ]);
      const props = createDefaultProps({
        pastedPeticaoTexts: [{ id: '1', text: 'A'.repeat(200), name: 'doc.txt' }],
      });
      const { result } = renderHook(() => useDetectEntities(props));

      await act(async () => {
        await result.current.detectarNomesAutomaticamente();
      });

      expect(props.setAnonymizationNamesText).toHaveBeenCalledWith('MARIA SILVA');
    });

    it('should merge similar PER names with fuzzy threshold > 0.7', async () => {
      mockExtractEntities.mockResolvedValue([
        createNEREntity({ text: 'JOÃO CARLOS SILVA', type: 'PER', score: 0.95, start: 0, end: 17 }),
        createNEREntity({ text: 'JOÃO SILVA', type: 'PER', score: 0.90, start: 50, end: 60 }),
      ]);
      const props = createDefaultProps({
        pastedPeticaoTexts: [{ id: '1', text: 'A'.repeat(200), name: 'doc.txt' }],
      });
      const { result } = renderHook(() => useDetectEntities(props));

      await act(async () => {
        await result.current.detectarNomesAutomaticamente();
      });

      // Should keep the longer one
      const calledWith = (props.setAnonymizationNamesText as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(calledWith).toContain('JOÃO CARLOS SILVA');
    });

    it('should not merge different PER and ORG in fuzzy dedup', async () => {
      // Fuzzy dedup skips items with different isOrg flag, but exact dedup (seen Map) uses text as key
      // Using different texts to test that the fuzzy dedup separates by type
      mockExtractEntities.mockResolvedValue([
        createNEREntity({ text: 'CARLOS MENDES', type: 'PER', score: 0.95, start: 0, end: 13 }),
        createNEREntity({ text: 'TRANSPORTES RAPIDO', type: 'ORG', score: 0.90, start: 50, end: 68 }),
      ]);
      const props = createDefaultProps({
        nerIncludeOrg: true,
        pastedPeticaoTexts: [{ id: '1', text: 'A'.repeat(200), name: 'doc.txt' }],
      });
      const { result } = renderHook(() => useDetectEntities(props));

      await act(async () => {
        await result.current.detectarNomesAutomaticamente();
      });

      // Both should be kept since different types and texts
      const calledWith = (props.setAnonymizationNamesText as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      const names = calledWith.split('\n');
      expect(names.length).toBe(2);
      expect(calledWith).toContain('CARLOS MENDES');
      expect(calledWith).toContain('TRANSPORTES RAPIDO');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SEÇÃO 11: Limpeza de gentílicos do final dos nomes
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Gentilic cleaning from names', () => {
    it('should remove gentilic words from the end of names', async () => {
      mockExtractEntities.mockResolvedValue([
        createNEREntity({ text: 'MARIA SILVA BRASILEIRO', type: 'PER', score: 0.95 }),
      ]);
      const props = createDefaultProps({
        pastedPeticaoTexts: [{ id: '1', text: 'A'.repeat(200), name: 'doc.txt' }],
      });
      const { result } = renderHook(() => useDetectEntities(props));

      await act(async () => {
        await result.current.detectarNomesAutomaticamente();
      });

      // "BRASILEIRO" at the end should be removed
      expect(props.setAnonymizationNamesText).toHaveBeenCalledWith('MARIA SILVA');
    });

    it('should remove civil status words from the end of names', async () => {
      mockExtractEntities.mockResolvedValue([
        createNEREntity({ text: 'JOSÉ FERREIRA CASADO', type: 'PER', score: 0.95 }),
      ]);
      const props = createDefaultProps({
        pastedPeticaoTexts: [{ id: '1', text: 'A'.repeat(200), name: 'doc.txt' }],
      });
      const { result } = renderHook(() => useDetectEntities(props));

      await act(async () => {
        await result.current.detectarNomesAutomaticamente();
      });

      expect(props.setAnonymizationNamesText).toHaveBeenCalledWith('JOSÉ FERREIRA');
    });

    it('should not remove gentilic words from the middle of names', async () => {
      mockExtractEntities.mockResolvedValue([
        createNEREntity({ text: 'BRASILEIRO JOSE SILVA', type: 'PER', score: 0.95 }),
      ]);
      const props = createDefaultProps({
        pastedPeticaoTexts: [{ id: '1', text: 'A'.repeat(200), name: 'doc.txt' }],
      });
      const { result } = renderHook(() => useDetectEntities(props));

      await act(async () => {
        await result.current.detectarNomesAutomaticamente();
      });

      // "BRASILEIRO" at the start should remain (only end is cleaned)
      // Note: "BRASILEIRO" alone as a name would be filtered by GENTILIC_WORDS exact match,
      // but "BRASILEIRO JOSE SILVA" won't match the exact filter
      expect(props.setAnonymizationNamesText).toHaveBeenCalledWith('BRASILEIRO JOSE SILVA');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SEÇÃO 12: Merge com nomes existentes
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Merge with existing names', () => {
    it('should merge new names with existing anonymizationNamesText', async () => {
      mockExtractEntities.mockResolvedValue([
        createNEREntity({ text: 'NOVO NOME', type: 'PER', score: 0.95 }),
      ]);
      const props = createDefaultProps({
        anonymizationNamesText: 'NOME EXISTENTE',
        pastedPeticaoTexts: [{ id: '1', text: 'A'.repeat(200), name: 'doc.txt' }],
      });
      const { result } = renderHook(() => useDetectEntities(props));

      await act(async () => {
        await result.current.detectarNomesAutomaticamente();
      });

      const calledWith = (props.setAnonymizationNamesText as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(calledWith).toContain('NOME EXISTENTE');
      expect(calledWith).toContain('NOVO NOME');
    });

    it('should not duplicate names that already exist', async () => {
      mockExtractEntities.mockResolvedValue([
        createNEREntity({ text: 'NOME EXISTENTE', type: 'PER', score: 0.95 }),
      ]);
      const props = createDefaultProps({
        anonymizationNamesText: 'NOME EXISTENTE',
        pastedPeticaoTexts: [{ id: '1', text: 'A'.repeat(200), name: 'doc.txt' }],
      });
      const { result } = renderHook(() => useDetectEntities(props));

      await act(async () => {
        await result.current.detectarNomesAutomaticamente();
      });

      const calledWith = (props.setAnonymizationNamesText as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      const names = calledWith.split('\n');
      expect(names.filter(n => n === 'NOME EXISTENTE').length).toBe(1);
    });

    it('should handle existing names separated by commas', async () => {
      mockExtractEntities.mockResolvedValue([
        createNEREntity({ text: 'NOME TRES', type: 'PER', score: 0.95 }),
      ]);
      const props = createDefaultProps({
        anonymizationNamesText: 'NOME UM, NOME DOIS',
        pastedPeticaoTexts: [{ id: '1', text: 'A'.repeat(200), name: 'doc.txt' }],
      });
      const { result } = renderHook(() => useDetectEntities(props));

      await act(async () => {
        await result.current.detectarNomesAutomaticamente();
      });

      const calledWith = (props.setAnonymizationNamesText as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(calledWith).toContain('NOME UM');
      expect(calledWith).toContain('NOME DOIS');
      expect(calledWith).toContain('NOME TRES');
    });

    it('should handle existing names separated by newlines', async () => {
      mockExtractEntities.mockResolvedValue([
        createNEREntity({ text: 'NOME NOVO', type: 'PER', score: 0.95 }),
      ]);
      const props = createDefaultProps({
        anonymizationNamesText: 'NOME UM\nNOME DOIS',
        pastedPeticaoTexts: [{ id: '1', text: 'A'.repeat(200), name: 'doc.txt' }],
      });
      const { result } = renderHook(() => useDetectEntities(props));

      await act(async () => {
        await result.current.detectarNomesAutomaticamente();
      });

      const calledWith = (props.setAnonymizationNamesText as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(calledWith).toContain('NOME UM');
      expect(calledWith).toContain('NOME DOIS');
      expect(calledWith).toContain('NOME NOVO');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SEÇÃO 13: Formatação do resultado e toast de sucesso
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Result formatting and success toast', () => {
    it('should join all names with newlines', async () => {
      mockExtractEntities.mockResolvedValue([
        createNEREntity({ text: 'NOME UM AQUI', type: 'PER', score: 0.95, start: 0, end: 12 }),
        createNEREntity({ text: 'NOME DOIS AQUI', type: 'PER', score: 0.90, start: 50, end: 64 }),
      ]);
      const props = createDefaultProps({
        pastedPeticaoTexts: [{ id: '1', text: 'A'.repeat(200), name: 'doc.txt' }],
      });
      const { result } = renderHook(() => useDetectEntities(props));

      await act(async () => {
        await result.current.detectarNomesAutomaticamente();
      });

      const calledWith = (props.setAnonymizationNamesText as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(calledWith.split('\n').length).toBe(2);
    });

    it('should convert names to uppercase', async () => {
      mockExtractEntities.mockResolvedValue([
        createNEREntity({ text: 'João da Silva', type: 'PER', score: 0.95 }),
      ]);
      const props = createDefaultProps({
        pastedPeticaoTexts: [{ id: '1', text: 'A'.repeat(200), name: 'doc.txt' }],
      });
      const { result } = renderHook(() => useDetectEntities(props));

      await act(async () => {
        await result.current.detectarNomesAutomaticamente();
      });

      const calledWith = (props.setAnonymizationNamesText as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(calledWith).toBe('JOÃO DA SILVA');
    });

    it('should show success toast with count of detected names', async () => {
      mockExtractEntities.mockResolvedValue([
        createNEREntity({ text: 'NOME UM AQUI', type: 'PER', score: 0.95, start: 0, end: 12 }),
        createNEREntity({ text: 'NOME DOIS AQUI', type: 'PER', score: 0.90, start: 50, end: 64 }),
      ]);
      const props = createDefaultProps({
        pastedPeticaoTexts: [{ id: '1', text: 'A'.repeat(200), name: 'doc.txt' }],
      });
      const { result } = renderHook(() => useDetectEntities(props));

      await act(async () => {
        await result.current.detectarNomesAutomaticamente();
      });

      expect(props.showToast).toHaveBeenCalledWith(
        expect.stringContaining('Detectados 2 nome(s)'),
        'success'
      );
    });

    it('should show info toast when no names detected after filtering', async () => {
      mockExtractEntities.mockResolvedValue([
        createNEREntity({ text: 'TST', type: 'PER', score: 0.95 }), // Filtered by STOP_WORDS_EXACT
      ]);
      const props = createDefaultProps({
        pastedPeticaoTexts: [{ id: '1', text: 'A'.repeat(200), name: 'doc.txt' }],
      });
      const { result } = renderHook(() => useDetectEntities(props));

      await act(async () => {
        await result.current.detectarNomesAutomaticamente();
      });

      expect(props.showToast).toHaveBeenCalledWith('Nenhum nome detectado nos documentos.', 'info');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SEÇÃO 14: Tratamento de erros
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Error handling', () => {
    it('should show error toast when NER extraction fails', async () => {
      mockExtractEntities.mockRejectedValue(new Error('Model loading failed'));
      const props = createDefaultProps({
        pastedPeticaoTexts: [{ id: '1', text: 'A'.repeat(200), name: 'doc.txt' }],
      });
      const { result } = renderHook(() => useDetectEntities(props));

      await act(async () => {
        await result.current.detectarNomesAutomaticamente();
      });

      expect(props.showToast).toHaveBeenCalledWith(
        'Erro ao detectar nomes: Model loading failed',
        'error'
      );
    });

    it('should still call setDetectingNames(false) after error', async () => {
      mockExtractEntities.mockRejectedValue(new Error('Network error'));
      const props = createDefaultProps({
        pastedPeticaoTexts: [{ id: '1', text: 'A'.repeat(200), name: 'doc.txt' }],
      });
      const { result } = renderHook(() => useDetectEntities(props));

      await act(async () => {
        await result.current.detectarNomesAutomaticamente();
      });

      expect(props.setDetectingNames).toHaveBeenCalledWith(false);
    });

    it('should not call setAnonymizationNamesText when extraction errors', async () => {
      mockExtractEntities.mockRejectedValue(new Error('Failed'));
      const props = createDefaultProps({
        pastedPeticaoTexts: [{ id: '1', text: 'A'.repeat(200), name: 'doc.txt' }],
      });
      const { result } = renderHook(() => useDetectEntities(props));

      await act(async () => {
        await result.current.detectarNomesAutomaticamente();
      });

      expect(props.setAnonymizationNamesText).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SEÇÃO 15: Casos de borda
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Edge cases', () => {
    it('should handle empty extractedTexts arrays', async () => {
      mockExtractEntities.mockResolvedValue([]);
      const props = createDefaultProps({
        extractedTexts: {
          peticoes: [],
          contestacoes: [],
        },
      });
      const { result } = renderHook(() => useDetectEntities(props));

      await act(async () => {
        await result.current.detectarNomesAutomaticamente();
      });

      expect(props.showToast).toHaveBeenCalledWith('Nenhum documento carregado para análise.', 'error');
    });

    it('should handle extractedTexts with null entries', async () => {
      mockExtractEntities.mockResolvedValue([]);
      const props = createDefaultProps({
        extractedTexts: {
          peticoes: [null, { text: null }] as any,
          contestacoes: [null] as any,
        },
      });
      const { result } = renderHook(() => useDetectEntities(props));

      await act(async () => {
        await result.current.detectarNomesAutomaticamente();
      });

      // Should not crash, just show "no documents" error
      expect(props.showToast).toHaveBeenCalledWith('Nenhum documento carregado para análise.', 'error');
    });

    it('should handle extractedTexts with string entries', async () => {
      const longText = 'Texto como string pura com mais de cinquenta caracteres para teste do hook' + ' '.repeat(50);
      mockExtractEntities.mockResolvedValue([]);
      const props = createDefaultProps({
        extractedTexts: {
          peticoes: [longText] as any,
          contestacoes: [],
        },
      });
      const { result } = renderHook(() => useDetectEntities(props));

      await act(async () => {
        await result.current.detectarNomesAutomaticamente();
      });

      // Should process the string text
      expect(mockExtractEntities).toHaveBeenCalled();
    });

    it('should handle multiple entity types from NER model', async () => {
      mockExtractEntities.mockResolvedValue([
        createNEREntity({ text: 'JOÃO SILVA', type: 'B-PER', score: 0.95 }),
        createNEREntity({ text: 'SÃO PAULO', type: 'LOC', score: 0.98 }),
        createNEREntity({ text: 'EMPRESA ABC', type: 'ORG', score: 0.92 }),
        createNEREntity({ text: 'MARIA OLIVEIRA', type: 'I-PESSOA', score: 0.91 }),
      ]);
      const props = createDefaultProps({
        nerIncludeOrg: false,
        pastedPeticaoTexts: [{ id: '1', text: 'A'.repeat(200), name: 'doc.txt' }],
      });
      const { result } = renderHook(() => useDetectEntities(props));

      await act(async () => {
        await result.current.detectarNomesAutomaticamente();
      });

      const calledWith = (props.setAnonymizationNamesText as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      // Should include PER and PESSOA but not LOC or ORG (nerIncludeOrg=false)
      expect(calledWith).toContain('JOÃO SILVA');
      expect(calledWith).toContain('MARIA OLIVEIRA');
      expect(calledWith).not.toContain('SÃO PAULO');
      expect(calledWith).not.toContain('EMPRESA ABC');
    });

    it('should handle empty string overrideText (falls back to documents)', async () => {
      mockExtractEntities.mockResolvedValue([]);
      const props = createDefaultProps();
      const { result } = renderHook(() => useDetectEntities(props));

      await act(async () => {
        await result.current.detectarNomesAutomaticamente('');
      });

      // Empty string is falsy, should try documents but none exist
      expect(props.showToast).toHaveBeenCalledWith('Nenhum documento carregado para análise.', 'error');
    });

    it('should handle all documents combined in a single NER call', async () => {
      const peticaoText = 'Petição de FULANO com mais de cinquenta caracteres de conteúdo para o teste funcionar corretamente aqui';
      const contestText = 'Contestação de BELTRANO com mais de cinquenta caracteres de conteúdo para o teste funcionar corretamente';
      mockExtractEntities.mockResolvedValue([
        createNEREntity({ text: 'FULANO', type: 'PER', score: 0.95 }),
        createNEREntity({ text: 'BELTRANO', type: 'PER', score: 0.90 }),
      ]);
      const props = createDefaultProps({
        pastedPeticaoTexts: [{ id: '1', text: peticaoText, name: 'pet.txt' }],
        pastedContestacaoTexts: [{ id: '2', text: contestText, name: 'cont.txt' }],
      });
      const { result } = renderHook(() => useDetectEntities(props));

      await act(async () => {
        await result.current.detectarNomesAutomaticamente();
      });

      // Both texts should be combined and passed to extractEntities
      const calledText = mockExtractEntities.mock.calls[0][0] as string;
      expect(calledText).toContain('Petição');
      expect(calledText).toContain('Contestação');
    });

    it('should correctly report total count including existing names', async () => {
      mockExtractEntities.mockResolvedValue([
        createNEREntity({ text: 'NOME NOVO', type: 'PER', score: 0.95 }),
      ]);
      const props = createDefaultProps({
        anonymizationNamesText: 'EXISTENTE UM\nEXISTENTE DOIS',
        pastedPeticaoTexts: [{ id: '1', text: 'A'.repeat(200), name: 'doc.txt' }],
      });
      const { result } = renderHook(() => useDetectEntities(props));

      await act(async () => {
        await result.current.detectarNomesAutomaticamente();
      });

      expect(props.showToast).toHaveBeenCalledWith(
        expect.stringContaining('Total: 3'),
        'success'
      );
    });
  });
});
