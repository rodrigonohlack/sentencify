/**
 * @file context-helpers.test.ts
 * @description Testes completos para funções de preparação de contexto para IA
 * @version 1.38.49
 *
 * Cobre: prepareDocumentsContext, prepareProofsContext, prepareOralProofsContext, fastHashUtil
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prepareDocumentsContext, prepareProofsContext, prepareOralProofsContext, fastHashUtil } from './context-helpers';
import type { ProofFile, ProofText, ProofAnalysisResult, AnonymizationSettings, AIDocumentContent, AITextContent } from '../types';

// Mock isOralProof from components (React module - needs mock)
vi.mock('../components', () => ({
  isOralProof: (name: string | undefined): boolean => {
    const keywords = ['audiência', 'audiencia', 'depoimento', 'testemunha', 'transcrição', 'transcricao', 'ata', 'oral', 'oitiva'];
    const nameLower = (name || '').toLowerCase();
    return keywords.some(kw => nameLower.includes(kw));
  }
}));

// Mock function for fileToBase64
const mockFileToBase64 = vi.fn(async (_file: File): Promise<string> => 'mock-base64-data');

// Large base64 string (> 100000 chars) for cache_control testing
const largePdfBase64 = 'A'.repeat(100001);
// Small base64 string (< 100000 chars)
const smallPdfBase64 = 'B'.repeat(50000);

// Helper factories
const createMockProofFile = (overrides: Partial<ProofFile> = {}): ProofFile => ({
  id: `proof-file-${Math.random().toString(36).slice(2)}`,
  name: 'test.pdf',
  file: new File(['test-content'], 'test.pdf', { type: 'application/pdf' }),
  type: 'pdf',
  uploadDate: new Date().toISOString(),
  ...overrides
});

const createMockProofText = (overrides: Partial<ProofText> = {}): ProofText => ({
  id: `proof-text-${Math.random().toString(36).slice(2)}`,
  name: 'Text Proof',
  text: 'This is the proof content',
  type: 'text',
  uploadDate: new Date().toISOString(),
  ...overrides
});

const createAnonConfig = (overrides: Partial<AnonymizationSettings> = {}): AnonymizationSettings => ({
  enabled: true,
  nomesUsuario: ['João Silva', 'Maria Santos'],
  cpf: true,
  cnpj: true,
  ...overrides
});

describe('context-helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FAST HASH UTIL TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('fastHashUtil', () => {
    it('should return consistent hash for same input', () => {
      const input = 'test string';
      const hash1 = fastHashUtil(input);
      const hash2 = fastHashUtil(input);
      expect(hash1).toBe(hash2);
    });

    it('should return different hashes for different inputs', () => {
      const hash1 = fastHashUtil('input1');
      const hash2 = fastHashUtil('input2');
      expect(hash1).not.toBe(hash2);
    });

    it('should return "empty" for empty string', () => {
      const hash = fastHashUtil('');
      expect(hash).toBe('empty');
    });

    it('should return "empty" for null-like values', () => {
      expect(fastHashUtil(undefined as unknown as string)).toBe('empty');
      expect(fastHashUtil(null as unknown as string)).toBe('empty');
    });

    it('should handle long strings', () => {
      const longString = 'A'.repeat(100000);
      const hash = fastHashUtil(longString);
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash).not.toBe('empty');
    });

    it('should produce base36 output', () => {
      const hash = fastHashUtil('hello world');
      // base36 uses chars: 0-9, a-z, and optionally a leading minus
      expect(hash).toMatch(/^-?[0-9a-z]+$/);
    });

    it('should handle single character strings', () => {
      const hash = fastHashUtil('a');
      expect(hash).toBeDefined();
      expect(hash).not.toBe('empty');
    });

    it('should handle strings with special characters', () => {
      const hash = fastHashUtil('!@#$%^&*()_+-={}[]|;:,.<>?');
      expect(hash).toBeDefined();
      expect(hash).not.toBe('empty');
    });

    it('should handle unicode/accented characters', () => {
      const hash = fastHashUtil('áéíóú ção ñ');
      expect(hash).toBeDefined();
      expect(hash).not.toBe('empty');
    });

    it('should produce different hashes for similar strings', () => {
      const hash1 = fastHashUtil('abc');
      const hash2 = fastHashUtil('abd');
      expect(hash1).not.toBe(hash2);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PREPARE DOCUMENTS CONTEXT TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('prepareDocumentsContext', () => {
    it('should return empty result for empty docs', () => {
      const result = prepareDocumentsContext({});
      expect(result.contentArray).toHaveLength(0);
      expect(result.flags.hasPeticao).toBe(false);
      expect(result.flags.hasContestacoes).toBe(false);
      expect(result.flags.hasComplementares).toBe(false);
    });

    // --- peticoes (array of base64 PDFs) ---

    it('should handle peticoes array with small PDF', () => {
      const result = prepareDocumentsContext({
        peticoes: [smallPdfBase64]
      });
      expect(result.contentArray).toHaveLength(1);
      expect(result.contentArray[0]).toEqual({
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: smallPdfBase64 },
        cache_control: undefined
      });
      expect(result.flags.hasPeticao).toBe(true);
    });

    it('should handle peticoes array with large PDF (cache_control)', () => {
      const result = prepareDocumentsContext({
        peticoes: [largePdfBase64]
      });
      expect(result.contentArray).toHaveLength(1);
      expect(result.contentArray[0]).toEqual({
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: largePdfBase64 },
        cache_control: { type: 'ephemeral' }
      });
      expect(result.flags.hasPeticao).toBe(true);
    });

    it('should handle multiple peticoes', () => {
      const result = prepareDocumentsContext({
        peticoes: [smallPdfBase64, largePdfBase64]
      });
      expect(result.contentArray).toHaveLength(2);
      expect(result.flags.hasPeticao).toBe(true);
    });

    // --- peticoesText (array of text objects) ---

    it('should handle peticoesText with name', () => {
      const result = prepareDocumentsContext({
        peticoesText: [{ name: 'Petição Trabalhista', text: 'Conteúdo da petição' }]
      });
      expect(result.contentArray).toHaveLength(1);
      expect((result.contentArray[0] as AITextContent | AIDocumentContent).type).toBe('text');
      expect((result.contentArray[0] as { text: string }).text).toContain('Petição Trabalhista');
      expect((result.contentArray[0] as { text: string }).text).toContain('Conteúdo da petição');
      expect(result.flags.hasPeticao).toBe(true);
    });

    it('should handle peticoesText without name (uses default label)', () => {
      const result = prepareDocumentsContext({
        peticoesText: [{ text: 'Conteúdo sem nome' }]
      });
      expect(result.contentArray).toHaveLength(1);
      expect((result.contentArray[0] as { text: string }).text).toContain('PETIÇÃO INICIAL 1');
      expect(result.flags.hasPeticao).toBe(true);
    });

    it('should compute correct index for peticoesText when peticoes also exist', () => {
      const result = prepareDocumentsContext({
        peticoes: [smallPdfBase64, smallPdfBase64],
        peticoesText: [{ text: 'Texto da terceira petição' }]
      });
      // 2 peticoes PDFs + 1 peticoesText
      expect(result.contentArray).toHaveLength(3);
      // The text petição label should be "PETIÇÃO INICIAL 3" (index 0 + peticoes.length 2 + 1 = 3)
      expect((result.contentArray[2] as { text: string }).text).toContain('PETIÇÃO INICIAL 3');
    });

    it('should add cache_control for peticoesText with long text (> 2000 chars)', () => {
      const longText = 'X'.repeat(2001);
      const result = prepareDocumentsContext({
        peticoesText: [{ text: longText }]
      });
      expect((result.contentArray[0] as { cache_control?: object }).cache_control).toEqual({ type: 'ephemeral' });
    });

    it('should not add cache_control for peticoesText with short text (<= 2000 chars)', () => {
      const shortText = 'X'.repeat(2000);
      const result = prepareDocumentsContext({
        peticoesText: [{ text: shortText }]
      });
      expect((result.contentArray[0] as { cache_control?: object }).cache_control).toBeUndefined();
    });

    // --- peticao (legacy singular format) ---

    it('should handle legacy peticao as PDF', () => {
      const result = prepareDocumentsContext({
        peticao: largePdfBase64,
        peticaoType: 'pdf'
      });
      expect(result.contentArray).toHaveLength(1);
      expect(result.contentArray[0]).toEqual({
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: largePdfBase64 },
        cache_control: { type: 'ephemeral' }
      });
      expect(result.flags.hasPeticao).toBe(true);
    });

    it('should handle legacy peticao as text', () => {
      const result = prepareDocumentsContext({
        peticao: 'Texto da petição inicial',
        peticaoType: 'text'
      });
      expect(result.contentArray).toHaveLength(1);
      expect((result.contentArray[0] as AITextContent | AIDocumentContent).type).toBe('text');
      expect((result.contentArray[0] as { text: string }).text).toContain('PETIÇÃO INICIAL');
      expect((result.contentArray[0] as { text: string }).text).toContain('Texto da petição inicial');
      expect(result.flags.hasPeticao).toBe(true);
    });

    it('should handle legacy peticao text with cache_control for long text', () => {
      const longText = 'Y'.repeat(2001);
      const result = prepareDocumentsContext({
        peticao: longText,
        peticaoType: 'text'
      });
      expect((result.contentArray[0] as { cache_control?: object }).cache_control).toEqual({ type: 'ephemeral' });
    });

    it('should not add cache_control for legacy peticao short text', () => {
      const shortText = 'Y'.repeat(1000);
      const result = prepareDocumentsContext({
        peticao: shortText,
        peticaoType: 'text'
      });
      expect((result.contentArray[0] as { cache_control?: object }).cache_control).toBeUndefined();
    });

    it('should handle legacy peticao PDF with small data (no cache_control)', () => {
      const result = prepareDocumentsContext({
        peticao: smallPdfBase64,
        peticaoType: 'pdf'
      });
      expect((result.contentArray[0] as { cache_control?: object }).cache_control).toBeUndefined();
    });

    // --- contestacoes ---

    it('should handle contestacoes array (PDF base64)', () => {
      const result = prepareDocumentsContext({
        contestacoes: [smallPdfBase64]
      });
      expect(result.contentArray).toHaveLength(1);
      expect((result.contentArray[0] as AITextContent | AIDocumentContent).type).toBe('document');
      expect(result.flags.hasContestacoes).toBe(true);
    });

    it('should add cache_control for large contestacao PDF', () => {
      const result = prepareDocumentsContext({
        contestacoes: [largePdfBase64]
      });
      expect((result.contentArray[0] as { cache_control?: object }).cache_control).toEqual({ type: 'ephemeral' });
    });

    it('should handle contestacoesText array', () => {
      const result = prepareDocumentsContext({
        contestacoesText: [{ text: 'Contestação texto' }]
      });
      expect(result.contentArray).toHaveLength(1);
      expect((result.contentArray[0] as { text: string }).text).toContain('CONTESTAÇÃO 1');
      expect((result.contentArray[0] as { text: string }).text).toContain('Contestação texto');
      expect(result.flags.hasContestacoes).toBe(true);
    });

    it('should compute correct index for contestacoesText when contestacoes also exist', () => {
      const result = prepareDocumentsContext({
        contestacoes: [smallPdfBase64, smallPdfBase64],
        contestacoesText: [{ text: 'Texto da terceira contestação' }]
      });
      expect(result.contentArray).toHaveLength(3);
      // The text contestação label should be "CONTESTAÇÃO 3"
      expect((result.contentArray[2] as { text: string }).text).toContain('CONTESTAÇÃO 3');
    });

    it('should add cache_control for long contestacoesText', () => {
      const longText = 'Z'.repeat(2001);
      const result = prepareDocumentsContext({
        contestacoesText: [{ text: longText }]
      });
      expect((result.contentArray[0] as { cache_control?: object }).cache_control).toEqual({ type: 'ephemeral' });
    });

    // --- complementares ---

    it('should handle complementares array (PDF base64)', () => {
      const result = prepareDocumentsContext({
        complementares: [smallPdfBase64]
      });
      expect(result.contentArray).toHaveLength(1);
      expect((result.contentArray[0] as AITextContent | AIDocumentContent).type).toBe('document');
      expect(result.flags.hasComplementares).toBe(true);
    });

    it('should add cache_control for large complementar PDF', () => {
      const result = prepareDocumentsContext({
        complementares: [largePdfBase64]
      });
      expect((result.contentArray[0] as { cache_control?: object }).cache_control).toEqual({ type: 'ephemeral' });
    });

    it('should handle complementaresText array', () => {
      const result = prepareDocumentsContext({
        complementaresText: [{ text: 'Documento complementar' }]
      });
      expect(result.contentArray).toHaveLength(1);
      expect((result.contentArray[0] as { text: string }).text).toContain('DOCUMENTO COMPLEMENTAR 1');
      expect((result.contentArray[0] as { text: string }).text).toContain('Documento complementar');
      expect(result.flags.hasComplementares).toBe(true);
    });

    it('should compute correct index for complementaresText when complementares also exist', () => {
      const result = prepareDocumentsContext({
        complementares: [smallPdfBase64],
        complementaresText: [{ text: 'Texto complementar extra' }]
      });
      expect(result.contentArray).toHaveLength(2);
      expect((result.contentArray[1] as { text: string }).text).toContain('DOCUMENTO COMPLEMENTAR 2');
    });

    it('should add cache_control for long complementaresText', () => {
      const longText = 'W'.repeat(2001);
      const result = prepareDocumentsContext({
        complementaresText: [{ text: longText }]
      });
      expect((result.contentArray[0] as { cache_control?: object }).cache_control).toEqual({ type: 'ephemeral' });
    });

    // --- combined documents ---

    it('should handle all document types together', () => {
      const result = prepareDocumentsContext({
        peticoes: [smallPdfBase64],
        peticoesText: [{ name: 'Petição 2', text: 'Text petição' }],
        peticao: 'Legacy text',
        peticaoType: 'text',
        contestacoes: [smallPdfBase64],
        contestacoesText: [{ text: 'Contestação' }],
        complementares: [smallPdfBase64],
        complementaresText: [{ text: 'Complementar' }]
      });
      // 1 peticoes + 1 peticoesText + 1 peticao + 1 contestacoes + 1 contestacoesText + 1 complementares + 1 complementaresText = 7
      expect(result.contentArray).toHaveLength(7);
      expect(result.flags.hasPeticao).toBe(true);
      expect(result.flags.hasContestacoes).toBe(true);
      expect(result.flags.hasComplementares).toBe(true);
    });

    it('should set flags correctly when only contestacoes exist', () => {
      const result = prepareDocumentsContext({
        contestacoes: [smallPdfBase64]
      });
      expect(result.flags.hasPeticao).toBe(false);
      expect(result.flags.hasContestacoes).toBe(true);
      expect(result.flags.hasComplementares).toBe(false);
    });

    it('should set flags correctly when only complementares exist', () => {
      const result = prepareDocumentsContext({
        complementares: [smallPdfBase64]
      });
      expect(result.flags.hasPeticao).toBe(false);
      expect(result.flags.hasContestacoes).toBe(false);
      expect(result.flags.hasComplementares).toBe(true);
    });

    it('should handle empty arrays', () => {
      const result = prepareDocumentsContext({
        peticoes: [],
        peticoesText: [],
        contestacoes: [],
        contestacoesText: [],
        complementares: [],
        complementaresText: []
      });
      expect(result.contentArray).toHaveLength(0);
      expect(result.flags.hasPeticao).toBe(false);
      expect(result.flags.hasContestacoes).toBe(false);
      expect(result.flags.hasComplementares).toBe(false);
    });

    it('should handle undefined arrays (no crash)', () => {
      const result = prepareDocumentsContext({
        peticoes: undefined,
        peticoesText: undefined,
        contestacoes: undefined,
        contestacoesText: undefined,
        complementares: undefined,
        complementaresText: undefined
      });
      expect(result.contentArray).toHaveLength(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PREPARE PROOFS CONTEXT TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('prepareProofsContext', () => {
    it('should return empty result when proofManager is null', async () => {
      const result = await prepareProofsContext(null, 'Topic', mockFileToBase64, false, null);
      expect(result.proofDocuments).toEqual([]);
      expect(result.proofsContext).toBe('');
      expect(result.hasProofs).toBe(false);
    });

    it('should return empty result when no proofs are linked to topic', async () => {
      const result = await prepareProofsContext(
        { proofFiles: [createMockProofFile({ id: 'p1' })], proofTexts: [], proofTopicLinks: { 'p1': ['Other Topic'] } },
        'Requested Topic',
        mockFileToBase64,
        false,
        null
      );
      expect(result.hasProofs).toBe(false);
      expect(result.proofsContext).toBe('');
    });

    it('should return empty result when proofTopicLinks is undefined', async () => {
      const result = await prepareProofsContext(
        { proofFiles: [createMockProofFile({ id: 'p1' })], proofTexts: [] },
        'Topic',
        mockFileToBase64,
        false,
        null
      );
      expect(result.hasProofs).toBe(false);
    });

    it('should include linked PDF proofs in context', async () => {
      const proofId = 'proof-1';
      const result = await prepareProofsContext(
        {
          proofFiles: [createMockProofFile({ id: proofId, name: 'contrato.pdf' })],
          proofTexts: [],
          proofTopicLinks: { [proofId]: ['Horas Extras'] }
        },
        'Horas Extras',
        mockFileToBase64,
        false,
        null
      );
      expect(result.hasProofs).toBe(true);
      expect(result.proofsContext).toContain('PROVA 1: contrato.pdf');
      expect(result.proofsContext).toContain('PROVAS VINCULADAS A ESTE TÓPICO');
    });

    it('should include linked text proofs in context', async () => {
      const proofId = 'text-1';
      const result = await prepareProofsContext(
        {
          proofFiles: [],
          proofTexts: [createMockProofText({ id: proofId, name: 'Testemunha A' })],
          proofTopicLinks: { [proofId]: ['Adicional Noturno'] }
        },
        'Adicional Noturno',
        mockFileToBase64,
        false,
        null
      );
      expect(result.hasProofs).toBe(true);
      expect(result.proofsContext).toContain('PROVA 1: Testemunha A');
    });

    // --- Analyses ---

    it('should include all analyses in context (multiple analyses)', async () => {
      const proofId = 'proof-1';
      const proofManager = {
        proofFiles: [createMockProofFile({ id: proofId, name: 'doc.pdf' })],
        proofTexts: [],
        proofTopicLinks: { [proofId]: ['Test Topic'] },
        proofAnalysisResults: {
          [proofId]: [
            { id: 'a1', type: 'contextual' as const, result: 'First analysis result', timestamp: '2024-01-01T10:00:00Z' },
            { id: 'a2', type: 'livre' as const, result: 'Second analysis result', timestamp: '2024-01-02T14:30:00Z' }
          ]
        }
      };

      const result = await prepareProofsContext(proofManager, 'Test Topic', mockFileToBase64, false, null);
      expect(result.proofsContext).toContain('ANÁLISES DA PROVA (2)');
      expect(result.proofsContext).toContain('First analysis result');
      expect(result.proofsContext).toContain('Second analysis result');
      expect(result.proofsContext).toContain('Contextual');
      expect(result.proofsContext).toContain('Livre');
      expect(result.proofsContext).toContain('Análise 1');
      expect(result.proofsContext).toContain('Análise 2');
    });

    it('should handle analysis without timestamp', async () => {
      const proofId = 'proof-1';
      const proofManager = {
        proofFiles: [createMockProofFile({ id: proofId })],
        proofTexts: [],
        proofTopicLinks: { [proofId]: ['Topic'] },
        proofAnalysisResults: {
          [proofId]: [
            { id: 'a1', type: 'contextual' as const, result: 'Analysis no date', timestamp: '' }
          ]
        }
      };

      const result = await prepareProofsContext(proofManager, 'Topic', mockFileToBase64, false, null);
      expect(result.proofsContext).toContain('Análise 1 (Contextual)');
      expect(result.proofsContext).not.toContain(' - )');
    });

    it('should handle empty analyses array', async () => {
      const proofId = 'proof-1';
      const proofManager = {
        proofFiles: [createMockProofFile({ id: proofId })],
        proofTexts: [],
        proofTopicLinks: { [proofId]: ['Topic'] },
        proofAnalysisResults: { [proofId]: [] }
      };

      const result = await prepareProofsContext(proofManager, 'Topic', mockFileToBase64, false, null);
      expect(result.proofsContext).not.toContain('ANÁLISES DA PROVA');
    });

    it('should handle undefined proofAnalysisResults', async () => {
      const proofId = 'proof-1';
      const proofManager = {
        proofFiles: [createMockProofFile({ id: proofId })],
        proofTexts: [],
        proofTopicLinks: { [proofId]: ['Topic'] }
      };

      const result = await prepareProofsContext(proofManager, 'Topic', mockFileToBase64, false, null);
      expect(result.proofsContext).not.toContain('ANÁLISES DA PROVA');
      expect(result.hasProofs).toBe(true);
    });

    // --- Conclusions ---

    it('should include proof conclusions', async () => {
      const proofId = 'proof-1';
      const proofManager = {
        proofFiles: [createMockProofFile({ id: proofId })],
        proofTexts: [],
        proofTopicLinks: { [proofId]: ['Topic'] },
        proofConclusions: { [proofId]: 'Conclusão do juiz sobre a prova' }
      };

      const result = await prepareProofsContext(proofManager, 'Topic', mockFileToBase64, false, null);
      expect(result.proofsContext).toContain('Conclusões do Juiz:');
      expect(result.proofsContext).toContain('Conclusão do juiz sobre a prova');
    });

    it('should not include conclusions section when no conclusions exist', async () => {
      const proofId = 'proof-1';
      const proofManager = {
        proofFiles: [createMockProofFile({ id: proofId })],
        proofTexts: [],
        proofTopicLinks: { [proofId]: ['Topic'] }
      };

      const result = await prepareProofsContext(proofManager, 'Topic', mockFileToBase64, false, null);
      expect(result.proofsContext).not.toContain('Conclusões do Juiz');
    });

    // --- proofSendFullContent: PDF mode ---

    it('should send PDF binary when usePdfMode=true and anonymization disabled', async () => {
      const proofId = 'proof-1';
      const proofFile = createMockProofFile({ id: proofId, name: 'evidence.pdf' });
      const proofManager = {
        proofFiles: [proofFile],
        proofTexts: [],
        proofTopicLinks: { [proofId]: ['Topic'] },
        proofSendFullContent: { [proofId]: true },
        proofUsePdfMode: { [proofId]: true }
      };

      const result = await prepareProofsContext(proofManager, 'Topic', mockFileToBase64, false, null);
      expect(mockFileToBase64).toHaveBeenCalledWith(proofFile.file);
      expect(result.proofDocuments).toHaveLength(1);
      expect((result.proofDocuments[0] as AIDocumentContent).type).toBe('document');
      expect(result.proofsContext).toContain('[PDF "evidence.pdf" anexado como documento]');
    });

    it('should send PDF binary when no extracted text and anonymization disabled', async () => {
      const proofId = 'proof-1';
      const proofFile = createMockProofFile({ id: proofId, name: 'scan.pdf' });
      const proofManager = {
        proofFiles: [proofFile],
        proofTexts: [],
        proofTopicLinks: { [proofId]: ['Topic'] },
        proofSendFullContent: { [proofId]: true },
        proofUsePdfMode: { [proofId]: false }
        // No extractedProofTexts
      };

      const result = await prepareProofsContext(proofManager, 'Topic', mockFileToBase64, false, null);
      expect(mockFileToBase64).toHaveBeenCalled();
      expect(result.proofDocuments).toHaveLength(1);
      expect(result.proofsContext).toContain('[PDF "scan.pdf" anexado como documento]');
    });

    it('should add cache_control for large PDF binary', async () => {
      const proofId = 'proof-1';
      mockFileToBase64.mockResolvedValueOnce(largePdfBase64);
      const proofFile = createMockProofFile({ id: proofId });
      const proofManager = {
        proofFiles: [proofFile],
        proofTexts: [],
        proofTopicLinks: { [proofId]: ['Topic'] },
        proofSendFullContent: { [proofId]: true },
        proofUsePdfMode: { [proofId]: true }
      };

      const result = await prepareProofsContext(proofManager, 'Topic', mockFileToBase64, false, null);
      expect(result.proofDocuments[0]).toHaveProperty('cache_control', { type: 'ephemeral' });
    });

    it('should not add cache_control for small PDF binary', async () => {
      const proofId = 'proof-1';
      mockFileToBase64.mockResolvedValueOnce('small-data');
      const proofFile = createMockProofFile({ id: proofId });
      const proofManager = {
        proofFiles: [proofFile],
        proofTexts: [],
        proofTopicLinks: { [proofId]: ['Topic'] },
        proofSendFullContent: { [proofId]: true },
        proofUsePdfMode: { [proofId]: true }
      };

      const result = await prepareProofsContext(proofManager, 'Topic', mockFileToBase64, false, null);
      expect((result.proofDocuments[0] as AIDocumentContent).cache_control).toBeUndefined();
    });

    // --- proofSendFullContent: PDF mode + anonymization ---

    it('should filter out proof entirely when usePdfMode=true and anonymization enabled (conflict)', async () => {
      const proofId = 'proof-1';
      const proofManager = {
        proofFiles: [createMockProofFile({ id: proofId, name: 'doc.pdf' })],
        proofTexts: [],
        proofTopicLinks: { [proofId]: ['Topic'] },
        proofSendFullContent: { [proofId]: true },
        proofUsePdfMode: { [proofId]: true },
        extractedProofTexts: { [proofId]: 'Texto extraído do PDF com CPF 123.456.789-00' }
      };

      const anonConfig = createAnonConfig();
      const result = await prepareProofsContext(proofManager, 'Topic', mockFileToBase64, true, anonConfig);
      // Proof is filtered out entirely due to conflict (usePdfMode + anon)
      expect(result.proofDocuments).toHaveLength(0);
      expect(mockFileToBase64).not.toHaveBeenCalled();
      expect(result.hasProofs).toBe(false);
      expect(result.proofsContext).toBe('');
    });

    it('should filter out proof entirely when usePdfMode=true and anonymization enabled without extracted text', async () => {
      const proofId = 'proof-1';
      const proofManager = {
        proofFiles: [createMockProofFile({ id: proofId, name: 'scan.pdf' })],
        proofTexts: [],
        proofTopicLinks: { [proofId]: ['Topic'] },
        proofSendFullContent: { [proofId]: true },
        proofUsePdfMode: { [proofId]: true }
        // No extractedProofTexts
      };

      const anonConfig = createAnonConfig();
      const result = await prepareProofsContext(proofManager, 'Topic', mockFileToBase64, true, anonConfig);
      // Proof is filtered out entirely due to conflict
      expect(result.proofDocuments).toHaveLength(0);
      expect(result.hasProofs).toBe(false);
      expect(result.proofsContext).toBe('');
    });

    // --- proofSendFullContent: Text mode (usePdfMode=false with extracted text) ---

    it('should send extracted text when usePdfMode=false and text available (no anonymization)', async () => {
      const proofId = 'proof-1';
      const proofManager = {
        proofFiles: [createMockProofFile({ id: proofId })],
        proofTexts: [],
        proofTopicLinks: { [proofId]: ['Topic'] },
        proofSendFullContent: { [proofId]: true },
        proofUsePdfMode: { [proofId]: false },
        extractedProofTexts: { [proofId]: 'Texto completo da prova' }
      };

      const result = await prepareProofsContext(proofManager, 'Topic', mockFileToBase64, false, null);
      expect(result.proofsContext).toContain('Conteúdo Completo da Prova:');
      expect(result.proofsContext).toContain('Texto completo da prova');
      expect(mockFileToBase64).not.toHaveBeenCalled();
    });

    it('should send anonymized extracted text when usePdfMode=false and anonymization enabled', async () => {
      const proofId = 'proof-1';
      const proofManager = {
        proofFiles: [createMockProofFile({ id: proofId })],
        proofTexts: [],
        proofTopicLinks: { [proofId]: ['Topic'] },
        proofSendFullContent: { [proofId]: true },
        proofUsePdfMode: { [proofId]: false },
        extractedProofTexts: { [proofId]: 'Texto com CPF 123.456.789-00 do João' }
      };

      const anonConfig = createAnonConfig();
      const result = await prepareProofsContext(proofManager, 'Topic', mockFileToBase64, true, anonConfig);
      expect(result.proofsContext).toContain('Conteúdo Completo da Prova:');
      // CPF should be anonymized
      expect(result.proofsContext).toContain('[CPF]');
    });

    // --- proofSendFullContent: ProofText ---

    it('should send text proof content when proofSendFullContent is true', async () => {
      const proofId = 'text-1';
      const proofManager = {
        proofFiles: [],
        proofTexts: [createMockProofText({ id: proofId, name: 'Declaração', text: 'Conteúdo da declaração' })],
        proofTopicLinks: { [proofId]: ['Topic'] },
        proofSendFullContent: { [proofId]: true }
      };

      const result = await prepareProofsContext(proofManager, 'Topic', mockFileToBase64, false, null);
      expect(result.proofsContext).toContain('Conteúdo Completo da Prova:');
      expect(result.proofsContext).toContain('Conteúdo da declaração');
    });

    it('should anonymize text proof content when anonymization enabled', async () => {
      const proofId = 'text-1';
      const proofManager = {
        proofFiles: [],
        proofTexts: [createMockProofText({ id: proofId, name: 'Declaração', text: 'CPF do reclamante: 123.456.789-00' })],
        proofTopicLinks: { [proofId]: ['Topic'] },
        proofSendFullContent: { [proofId]: true }
      };

      const anonConfig = createAnonConfig();
      const result = await prepareProofsContext(proofManager, 'Topic', mockFileToBase64, true, anonConfig);
      expect(result.proofsContext).toContain('[CPF]');
      expect(result.proofsContext).not.toContain('123.456.789-00');
    });

    it('should not anonymize text proof when anonymization disabled', async () => {
      const proofId = 'text-1';
      const proofManager = {
        proofFiles: [],
        proofTexts: [createMockProofText({ id: proofId, name: 'Declaração', text: 'CPF: 123.456.789-00' })],
        proofTopicLinks: { [proofId]: ['Topic'] },
        proofSendFullContent: { [proofId]: true }
      };

      const result = await prepareProofsContext(proofManager, 'Topic', mockFileToBase64, false, null);
      expect(result.proofsContext).toContain('123.456.789-00');
    });

    // --- Anonymization filtering ---

    it('should filter out PDF proofs in usePdfMode when anonymization enabled', async () => {
      const proofId = 'proof-1';
      const proofManager = {
        proofFiles: [createMockProofFile({ id: proofId })],
        proofTexts: [],
        proofTopicLinks: { [proofId]: ['Topic'] },
        proofUsePdfMode: { [proofId]: true }
      };

      const result = await prepareProofsContext(proofManager, 'Topic', mockFileToBase64, true, createAnonConfig());
      expect(result.hasProofs).toBe(false);
      expect(result.proofsContext).toBe('');
    });

    it('should filter out PDF proofs without extracted text when anonymization enabled', async () => {
      const proofId = 'proof-1';
      const proofManager = {
        proofFiles: [createMockProofFile({ id: proofId })],
        proofTexts: [],
        proofTopicLinks: { [proofId]: ['Topic'] },
        proofUsePdfMode: { [proofId]: false }
        // No extractedProofTexts
      };

      const result = await prepareProofsContext(proofManager, 'Topic', mockFileToBase64, true, createAnonConfig());
      expect(result.hasProofs).toBe(false);
    });

    it('should allow PDF proofs with extracted text when anonymization enabled', async () => {
      const proofId = 'proof-1';
      const proofManager = {
        proofFiles: [createMockProofFile({ id: proofId })],
        proofTexts: [],
        proofTopicLinks: { [proofId]: ['Topic'] },
        proofUsePdfMode: { [proofId]: false },
        extractedProofTexts: { [proofId]: 'Extracted text' }
      };

      const result = await prepareProofsContext(proofManager, 'Topic', mockFileToBase64, true, createAnonConfig());
      expect(result.hasProofs).toBe(true);
    });

    it('should not filter text proofs regardless of anonymization', async () => {
      const proofId = 'text-1';
      const proofManager = {
        proofFiles: [],
        proofTexts: [createMockProofText({ id: proofId })],
        proofTopicLinks: { [proofId]: ['Topic'] }
      };

      const result = await prepareProofsContext(proofManager, 'Topic', mockFileToBase64, true, createAnonConfig());
      expect(result.hasProofs).toBe(true);
    });

    // --- Multiple proofs ---

    it('should handle multiple proofs with their own analyses and conclusions', async () => {
      const proof1 = createMockProofFile({ id: 'proof-1', name: 'doc1.pdf' });
      const proof2 = createMockProofText({ id: 'proof-2', name: 'testimony.txt' });

      const proofManager = {
        proofFiles: [proof1],
        proofTexts: [proof2],
        proofTopicLinks: {
          'proof-1': ['Topic'],
          'proof-2': ['Topic']
        },
        proofAnalysisResults: {
          'proof-1': [{ id: 'a1', type: 'contextual' as const, result: 'Analysis 1', timestamp: '2024-01-01T10:00:00Z' }],
          'proof-2': [
            { id: 'a2', type: 'livre' as const, result: 'Analysis 2a', timestamp: '2024-01-02T10:00:00Z' },
            { id: 'a3', type: 'contextual' as const, result: 'Analysis 2b', timestamp: '2024-01-03T10:00:00Z' }
          ]
        },
        proofConclusions: {
          'proof-1': 'Conclusão prova 1',
          'proof-2': 'Conclusão prova 2'
        }
      };

      const result = await prepareProofsContext(proofManager, 'Topic', mockFileToBase64, false, null);
      expect(result.proofsContext).toContain('PROVA 1: doc1.pdf');
      expect(result.proofsContext).toContain('PROVA 2: testimony.txt');
      expect(result.proofsContext).toContain('Analysis 1');
      expect(result.proofsContext).toContain('Analysis 2a');
      expect(result.proofsContext).toContain('Analysis 2b');
      expect(result.proofsContext).toContain('Conclusão prova 1');
      expect(result.proofsContext).toContain('Conclusão prova 2');
      expect(result.proofsContext).toContain('ANÁLISES DA PROVA (1)');
      expect(result.proofsContext).toContain('ANÁLISES DA PROVA (2)');
    });

    it('should handle 5 analyses (max limit)', async () => {
      const proofId = 'proof-1';
      const analyses: ProofAnalysisResult[] = [];
      for (let i = 1; i <= 5; i++) {
        analyses.push({
          id: `a${i}`,
          type: i % 2 === 0 ? 'livre' : 'contextual',
          result: `Analysis number ${i}`,
          timestamp: `2024-01-0${i}T10:00:00Z`
        });
      }

      const proofManager = {
        proofFiles: [createMockProofFile({ id: proofId })],
        proofTexts: [],
        proofTopicLinks: { [proofId]: ['Topic'] },
        proofAnalysisResults: { [proofId]: analyses }
      };

      const result = await prepareProofsContext(proofManager, 'Topic', mockFileToBase64, false, null);
      expect(result.proofsContext).toContain('ANÁLISES DA PROVA (5)');
      for (let i = 1; i <= 5; i++) {
        expect(result.proofsContext).toContain(`Analysis number ${i}`);
        expect(result.proofsContext).toContain(`Análise ${i}`);
      }
    });

    it('should not send full content when proofSendFullContent is false', async () => {
      const proofId = 'proof-1';
      const proofManager = {
        proofFiles: [createMockProofFile({ id: proofId })],
        proofTexts: [],
        proofTopicLinks: { [proofId]: ['Topic'] },
        proofSendFullContent: { [proofId]: false },
        extractedProofTexts: { [proofId]: 'Full text' }
      };

      const result = await prepareProofsContext(proofManager, 'Topic', mockFileToBase64, false, null);
      expect(result.proofsContext).not.toContain('Conteúdo Completo da Prova');
      expect(result.proofsContext).not.toContain('Full text');
    });

    it('should not call fileToBase64 when proof file is undefined', async () => {
      const proofId = 'proof-1';
      const proofManager = {
        proofFiles: [createMockProofFile({ id: proofId, file: undefined })],
        proofTexts: [],
        proofTopicLinks: { [proofId]: ['Topic'] },
        proofSendFullContent: { [proofId]: true },
        proofUsePdfMode: { [proofId]: true }
      };

      const result = await prepareProofsContext(proofManager, 'Topic', mockFileToBase64, false, null);
      expect(mockFileToBase64).not.toHaveBeenCalled();
      expect(result.proofDocuments).toHaveLength(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PREPARE ORAL PROOFS CONTEXT TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('prepareOralProofsContext', () => {
    it('should return empty result with noOralProofFound when proofManager is null', async () => {
      const result = await prepareOralProofsContext(null, 'Topic', mockFileToBase64, false, null);
      expect(result.proofDocuments).toEqual([]);
      expect(result.proofsContext).toBe('');
      expect(result.hasProofs).toBe(false);
      expect(result.noOralProofFound).toBe(true);
    });

    it('should return noOralProofFound when no linked proofs', async () => {
      const proofManager = {
        proofFiles: [],
        proofTexts: [createMockProofText({ id: 'p1', name: 'Depoimento' })],
        proofTopicLinks: { 'p1': ['Different Topic'] }
      };

      const result = await prepareOralProofsContext(proofManager, 'Requested Topic', mockFileToBase64, false, null);
      expect(result.hasProofs).toBe(false);
      expect(result.noOralProofFound).toBe(true);
    });

    it('should return noOralProofFound when linked proofs are not oral', async () => {
      const proofId = 'p1';
      const proofManager = {
        proofFiles: [createMockProofFile({ id: proofId, name: 'contrato.pdf' })],
        proofTexts: [],
        proofTopicLinks: { [proofId]: ['Topic'] }
      };

      const result = await prepareOralProofsContext(proofManager, 'Topic', mockFileToBase64, false, null);
      expect(result.hasProofs).toBe(false);
      expect(result.noOralProofFound).toBe(true);
    });

    it('should detect oral proofs by keyword "depoimento"', async () => {
      const proofId = 'p1';
      const proofManager = {
        proofFiles: [],
        proofTexts: [createMockProofText({ id: proofId, name: 'Depoimento do Reclamante' })],
        proofTopicLinks: { [proofId]: ['Topic'] }
      };

      const result = await prepareOralProofsContext(proofManager, 'Topic', mockFileToBase64, false, null);
      expect(result.hasProofs).toBe(true);
      expect(result.noOralProofFound).toBe(false);
      expect(result.proofsContext).toContain('PROVAS ORAIS VINCULADAS');
      expect(result.proofsContext).toContain('PROVA ORAL 1: Depoimento do Reclamante');
    });

    it('should detect oral proofs by keyword "audiência"', async () => {
      const proofId = 'p1';
      const proofManager = {
        proofFiles: [],
        proofTexts: [createMockProofText({ id: proofId, name: 'Ata de Audiência' })],
        proofTopicLinks: { [proofId]: ['Topic'] }
      };

      const result = await prepareOralProofsContext(proofManager, 'Topic', mockFileToBase64, false, null);
      expect(result.hasProofs).toBe(true);
    });

    it('should detect oral proofs by keyword "testemunha"', async () => {
      const proofId = 'p1';
      const proofManager = {
        proofFiles: [],
        proofTexts: [createMockProofText({ id: proofId, name: 'Testemunha Fulano' })],
        proofTopicLinks: { [proofId]: ['Topic'] }
      };

      const result = await prepareOralProofsContext(proofManager, 'Topic', mockFileToBase64, false, null);
      expect(result.hasProofs).toBe(true);
    });

    it('should detect oral proofs by keyword "transcrição"', async () => {
      const proofId = 'p1';
      const proofManager = {
        proofFiles: [],
        proofTexts: [createMockProofText({ id: proofId, name: 'Transcrição da audiência' })],
        proofTopicLinks: { [proofId]: ['Topic'] }
      };

      const result = await prepareOralProofsContext(proofManager, 'Topic', mockFileToBase64, false, null);
      expect(result.hasProofs).toBe(true);
    });

    it('should detect oral proofs by keyword "oitiva"', async () => {
      const proofId = 'p1';
      const proofManager = {
        proofFiles: [],
        proofTexts: [createMockProofText({ id: proofId, name: 'Oitiva do réu' })],
        proofTopicLinks: { [proofId]: ['Topic'] }
      };

      const result = await prepareOralProofsContext(proofManager, 'Topic', mockFileToBase64, false, null);
      expect(result.hasProofs).toBe(true);
    });

    // --- Analyses in oral proofs ---

    it('should include analyses in oral proof context', async () => {
      const proofId = 'p1';
      const proofManager = {
        proofFiles: [],
        proofTexts: [createMockProofText({ id: proofId, name: 'Depoimento testemunha' })],
        proofTopicLinks: { [proofId]: ['Topic'] },
        proofAnalysisResults: {
          [proofId]: [
            { id: 'a1', type: 'contextual' as const, result: 'Oral analysis 1', timestamp: '2024-06-01T08:00:00Z' },
            { id: 'a2', type: 'livre' as const, result: 'Oral analysis 2', timestamp: '' }
          ]
        }
      };

      const result = await prepareOralProofsContext(proofManager, 'Topic', mockFileToBase64, false, null);
      expect(result.proofsContext).toContain('ANÁLISES DA PROVA (2)');
      expect(result.proofsContext).toContain('Oral analysis 1');
      expect(result.proofsContext).toContain('Oral analysis 2');
      expect(result.proofsContext).toContain('Contextual');
      expect(result.proofsContext).toContain('Livre');
      // One with timestamp, one without
      expect(result.proofsContext).toContain('Análise 2 (Livre)');
    });

    // --- Conclusions in oral proofs ---

    it('should include conclusions for oral proofs', async () => {
      const proofId = 'p1';
      const proofManager = {
        proofFiles: [],
        proofTexts: [createMockProofText({ id: proofId, name: 'Depoimento' })],
        proofTopicLinks: { [proofId]: ['Topic'] },
        proofConclusions: { [proofId]: 'O depoente confirmou as horas extras' }
      };

      const result = await prepareOralProofsContext(proofManager, 'Topic', mockFileToBase64, false, null);
      expect(result.proofsContext).toContain('Conclusões do Juiz:');
      expect(result.proofsContext).toContain('O depoente confirmou as horas extras');
    });

    // --- proofSendFullContent: PDF oral proof ---

    it('should send oral PDF binary when usePdfMode=true and anonymization disabled', async () => {
      const proofId = 'p1';
      const proofFile = createMockProofFile({ id: proofId, name: 'Audiencia.pdf' });
      const proofManager = {
        proofFiles: [proofFile],
        proofTexts: [],
        proofTopicLinks: { [proofId]: ['Topic'] },
        proofSendFullContent: { [proofId]: true },
        proofUsePdfMode: { [proofId]: true }
      };

      const result = await prepareOralProofsContext(proofManager, 'Topic', mockFileToBase64, false, null);
      expect(mockFileToBase64).toHaveBeenCalledWith(proofFile.file);
      expect(result.proofDocuments).toHaveLength(1);
      expect((result.proofDocuments[0] as AIDocumentContent).type).toBe('document');
      expect(result.proofsContext).toContain('[PDF "Audiencia.pdf" anexado como documento]');
    });

    it('should send oral PDF binary when no extracted text and anonymization disabled', async () => {
      const proofId = 'p1';
      const proofFile = createMockProofFile({ id: proofId, name: 'Transcricao.pdf' });
      const proofManager = {
        proofFiles: [proofFile],
        proofTexts: [],
        proofTopicLinks: { [proofId]: ['Topic'] },
        proofSendFullContent: { [proofId]: true },
        proofUsePdfMode: { [proofId]: false }
        // No extractedProofTexts
      };

      const result = await prepareOralProofsContext(proofManager, 'Topic', mockFileToBase64, false, null);
      expect(mockFileToBase64).toHaveBeenCalled();
      expect(result.proofDocuments).toHaveLength(1);
      expect(result.proofsContext).toContain('[PDF "Transcricao.pdf" anexado como documento]');
    });

    it('should add cache_control for large oral PDF binary', async () => {
      const proofId = 'p1';
      mockFileToBase64.mockResolvedValueOnce(largePdfBase64);
      const proofFile = createMockProofFile({ id: proofId, name: 'Oitiva.pdf' });
      const proofManager = {
        proofFiles: [proofFile],
        proofTexts: [],
        proofTopicLinks: { [proofId]: ['Topic'] },
        proofSendFullContent: { [proofId]: true },
        proofUsePdfMode: { [proofId]: true }
      };

      const result = await prepareOralProofsContext(proofManager, 'Topic', mockFileToBase64, false, null);
      expect(result.proofDocuments[0]).toHaveProperty('cache_control', { type: 'ephemeral' });
    });

    it('should not add cache_control for small oral PDF binary', async () => {
      const proofId = 'p1';
      mockFileToBase64.mockResolvedValueOnce('small-data');
      const proofFile = createMockProofFile({ id: proofId, name: 'Ata oral.pdf' });
      const proofManager = {
        proofFiles: [proofFile],
        proofTexts: [],
        proofTopicLinks: { [proofId]: ['Topic'] },
        proofSendFullContent: { [proofId]: true },
        proofUsePdfMode: { [proofId]: true }
      };

      const result = await prepareOralProofsContext(proofManager, 'Topic', mockFileToBase64, false, null);
      expect((result.proofDocuments[0] as AIDocumentContent).cache_control).toBeUndefined();
    });

    // --- proofSendFullContent: PDF oral proof + anonymization enabled ---

    it('should filter out oral proof entirely when usePdfMode=true and anonymization enabled (conflict)', async () => {
      const proofId = 'p1';
      const proofManager = {
        proofFiles: [createMockProofFile({ id: proofId, name: 'Depoimento.pdf' })],
        proofTexts: [],
        proofTopicLinks: { [proofId]: ['Topic'] },
        proofSendFullContent: { [proofId]: true },
        proofUsePdfMode: { [proofId]: true },
        extractedProofTexts: { [proofId]: 'Depoente João Silva, CPF 123.456.789-00, declarou...' }
      };

      const anonConfig = createAnonConfig();
      const result = await prepareOralProofsContext(proofManager, 'Topic', mockFileToBase64, true, anonConfig);
      // Proof is filtered out entirely due to conflict (usePdfMode + anon)
      expect(result.proofDocuments).toHaveLength(0);
      expect(mockFileToBase64).not.toHaveBeenCalled();
      expect(result.hasProofs).toBe(false);
      expect(result.noOralProofFound).toBe(true);
    });

    it('should filter out oral proof entirely when usePdfMode=true, anonymization enabled, no extracted text', async () => {
      const proofId = 'p1';
      const proofManager = {
        proofFiles: [createMockProofFile({ id: proofId, name: 'Audiencia.pdf' })],
        proofTexts: [],
        proofTopicLinks: { [proofId]: ['Topic'] },
        proofSendFullContent: { [proofId]: true },
        proofUsePdfMode: { [proofId]: true }
        // No extractedProofTexts
      };

      const anonConfig = createAnonConfig();
      const result = await prepareOralProofsContext(proofManager, 'Topic', mockFileToBase64, true, anonConfig);
      // Proof is filtered out entirely due to conflict
      expect(result.proofDocuments).toHaveLength(0);
      expect(result.hasProofs).toBe(false);
      expect(result.noOralProofFound).toBe(true);
    });

    // --- proofSendFullContent: Text mode for oral PDF (usePdfMode=false, fullText available) ---

    it('should send extracted text for oral PDF when usePdfMode=false (no anonymization)', async () => {
      const proofId = 'p1';
      const proofManager = {
        proofFiles: [createMockProofFile({ id: proofId, name: 'Depoimento oral.pdf' })],
        proofTexts: [],
        proofTopicLinks: { [proofId]: ['Topic'] },
        proofSendFullContent: { [proofId]: true },
        proofUsePdfMode: { [proofId]: false },
        extractedProofTexts: { [proofId]: 'Texto completo do depoimento oral' }
      };

      const result = await prepareOralProofsContext(proofManager, 'Topic', mockFileToBase64, false, null);
      expect(result.proofsContext).toContain('Conteúdo Completo da Prova:');
      expect(result.proofsContext).toContain('Texto completo do depoimento oral');
      expect(mockFileToBase64).not.toHaveBeenCalled();
    });

    it('should send anonymized extracted text for oral PDF when anonymization enabled', async () => {
      const proofId = 'p1';
      const proofManager = {
        proofFiles: [createMockProofFile({ id: proofId, name: 'Testemunha X.pdf' })],
        proofTexts: [],
        proofTopicLinks: { [proofId]: ['Topic'] },
        proofSendFullContent: { [proofId]: true },
        proofUsePdfMode: { [proofId]: false },
        extractedProofTexts: { [proofId]: 'Testemunha CPF 999.888.777-66 declarou' }
      };

      const anonConfig = createAnonConfig();
      const result = await prepareOralProofsContext(proofManager, 'Topic', mockFileToBase64, true, anonConfig);
      expect(result.proofsContext).toContain('Conteúdo Completo da Prova:');
      expect(result.proofsContext).toContain('[CPF]');
      expect(result.proofsContext).not.toContain('999.888.777-66');
    });

    // --- proofSendFullContent: ProofText oral ---

    it('should send oral text proof content when proofSendFullContent is true', async () => {
      const proofId = 'p1';
      const proofManager = {
        proofFiles: [],
        proofTexts: [createMockProofText({ id: proofId, name: 'Depoimento testemunha', text: 'O depoente informou que...' })],
        proofTopicLinks: { [proofId]: ['Topic'] },
        proofSendFullContent: { [proofId]: true }
      };

      const result = await prepareOralProofsContext(proofManager, 'Topic', mockFileToBase64, false, null);
      expect(result.proofsContext).toContain('Conteúdo Completo da Prova:');
      expect(result.proofsContext).toContain('O depoente informou que...');
    });

    it('should anonymize oral text proof content when anonymization enabled', async () => {
      const proofId = 'p1';
      const proofManager = {
        proofFiles: [],
        proofTexts: [createMockProofText({ id: proofId, name: 'Oitiva do réu', text: 'O réu CPF 111.222.333-44 declarou...' })],
        proofTopicLinks: { [proofId]: ['Topic'] },
        proofSendFullContent: { [proofId]: true }
      };

      const anonConfig = createAnonConfig();
      const result = await prepareOralProofsContext(proofManager, 'Topic', mockFileToBase64, true, anonConfig);
      expect(result.proofsContext).toContain('[CPF]');
      expect(result.proofsContext).not.toContain('111.222.333-44');
    });

    it('should not anonymize oral text proof when anonymization disabled', async () => {
      const proofId = 'p1';
      const proofManager = {
        proofFiles: [],
        proofTexts: [createMockProofText({ id: proofId, name: 'Audiencia da testemunha', text: 'CPF 555.666.777-88' })],
        proofTopicLinks: { [proofId]: ['Topic'] },
        proofSendFullContent: { [proofId]: true }
      };

      const result = await prepareOralProofsContext(proofManager, 'Topic', mockFileToBase64, false, null);
      expect(result.proofsContext).toContain('555.666.777-88');
    });

    it('should not anonymize oral text when anonConfig is null even if enabled=true', async () => {
      const proofId = 'p1';
      const proofManager = {
        proofFiles: [],
        proofTexts: [createMockProofText({ id: proofId, name: 'Depoimento', text: 'CPF 555.666.777-88' })],
        proofTopicLinks: { [proofId]: ['Topic'] },
        proofSendFullContent: { [proofId]: true }
      };

      // anonymizationEnabled=true but anonConfig=null: condition is (anonymizationEnabled && anonConfig)
      const result = await prepareOralProofsContext(proofManager, 'Topic', mockFileToBase64, true, null);
      expect(result.proofsContext).toContain('555.666.777-88');
    });

    // --- Anonymization filtering for oral proofs ---

    it('should filter out oral PDF proofs in usePdfMode when anonymization enabled', async () => {
      const proofId = 'p1';
      const proofManager = {
        proofFiles: [createMockProofFile({ id: proofId, name: 'Audiência.pdf' })],
        proofTexts: [],
        proofTopicLinks: { [proofId]: ['Topic'] },
        proofUsePdfMode: { [proofId]: true }
      };

      const result = await prepareOralProofsContext(proofManager, 'Topic', mockFileToBase64, true, createAnonConfig());
      expect(result.hasProofs).toBe(false);
      expect(result.noOralProofFound).toBe(true);
    });

    it('should filter out oral PDF proofs without extracted text when anonymization enabled', async () => {
      const proofId = 'p1';
      const proofManager = {
        proofFiles: [createMockProofFile({ id: proofId, name: 'Depoimento.pdf' })],
        proofTexts: [],
        proofTopicLinks: { [proofId]: ['Topic'] },
        proofUsePdfMode: { [proofId]: false }
        // No extractedProofTexts
      };

      const result = await prepareOralProofsContext(proofManager, 'Topic', mockFileToBase64, true, createAnonConfig());
      expect(result.hasProofs).toBe(false);
      expect(result.noOralProofFound).toBe(true);
    });

    it('should allow oral PDF proofs with extracted text when anonymization enabled', async () => {
      const proofId = 'p1';
      const proofManager = {
        proofFiles: [createMockProofFile({ id: proofId, name: 'Transcrição.pdf' })],
        proofTexts: [],
        proofTopicLinks: { [proofId]: ['Topic'] },
        proofUsePdfMode: { [proofId]: false },
        extractedProofTexts: { [proofId]: 'Extracted oral text' }
      };

      const result = await prepareOralProofsContext(proofManager, 'Topic', mockFileToBase64, true, createAnonConfig());
      expect(result.hasProofs).toBe(true);
      expect(result.noOralProofFound).toBe(false);
    });

    // --- proofTopicLinks edge cases ---

    it('should handle empty proofTopicLinks', async () => {
      const proofManager = {
        proofFiles: [],
        proofTexts: [createMockProofText({ id: 'p1', name: 'Depoimento' })],
        proofTopicLinks: {}
      };

      const result = await prepareOralProofsContext(proofManager, 'Topic', mockFileToBase64, false, null);
      expect(result.hasProofs).toBe(false);
      expect(result.noOralProofFound).toBe(true);
    });

    it('should handle undefined proofTopicLinks', async () => {
      const proofManager = {
        proofFiles: [],
        proofTexts: [createMockProofText({ id: 'p1', name: 'Depoimento' })]
      };

      const result = await prepareOralProofsContext(proofManager, 'Topic', mockFileToBase64, false, null);
      expect(result.hasProofs).toBe(false);
      expect(result.noOralProofFound).toBe(true);
    });

    // --- Multiple oral proofs ---

    it('should handle multiple oral proofs with different types', async () => {
      const proofManager = {
        proofFiles: [createMockProofFile({ id: 'p1', name: 'Audiência reclamante.pdf' })],
        proofTexts: [createMockProofText({ id: 'p2', name: 'Depoimento testemunha', text: 'Conteúdo testemunha' })],
        proofTopicLinks: {
          'p1': ['Topic'],
          'p2': ['Topic']
        },
        proofSendFullContent: { 'p2': true }
      };

      const result = await prepareOralProofsContext(proofManager, 'Topic', mockFileToBase64, false, null);
      expect(result.hasProofs).toBe(true);
      expect(result.proofsContext).toContain('PROVA ORAL 1');
      expect(result.proofsContext).toContain('PROVA ORAL 2');
      expect(result.proofsContext).toContain('Conteúdo testemunha');
    });

    it('should not call fileToBase64 when proof file is undefined', async () => {
      const proofId = 'p1';
      const proofManager = {
        proofFiles: [createMockProofFile({ id: proofId, name: 'Audiência.pdf', file: undefined })],
        proofTexts: [],
        proofTopicLinks: { [proofId]: ['Topic'] },
        proofSendFullContent: { [proofId]: true },
        proofUsePdfMode: { [proofId]: true }
      };

      const result = await prepareOralProofsContext(proofManager, 'Topic', mockFileToBase64, false, null);
      expect(mockFileToBase64).not.toHaveBeenCalled();
      expect(result.proofDocuments).toHaveLength(0);
    });

    it('should not send full content when proofSendFullContent is not set for the proof', async () => {
      const proofId = 'p1';
      const proofManager = {
        proofFiles: [],
        proofTexts: [createMockProofText({ id: proofId, name: 'Depoimento', text: 'Secret content' })],
        proofTopicLinks: { [proofId]: ['Topic'] }
        // proofSendFullContent not set
      };

      const result = await prepareOralProofsContext(proofManager, 'Topic', mockFileToBase64, false, null);
      expect(result.proofsContext).not.toContain('Conteúdo Completo da Prova');
      expect(result.proofsContext).not.toContain('Secret content');
    });

    it('should include separator between proofs', async () => {
      const proofManager = {
        proofFiles: [],
        proofTexts: [
          createMockProofText({ id: 'p1', name: 'Depoimento 1' }),
          createMockProofText({ id: 'p2', name: 'Testemunha 2' })
        ],
        proofTopicLinks: {
          'p1': ['Topic'],
          'p2': ['Topic']
        }
      };

      const result = await prepareOralProofsContext(proofManager, 'Topic', mockFileToBase64, false, null);
      // Each proof should end with separator
      expect(result.proofsContext).toContain('---');
    });
  });
});
