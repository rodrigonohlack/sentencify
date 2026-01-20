/**
 * @file context-helpers.test.ts
 * @description Testes para funções de preparação de contexto para IA
 * @version 1.38.27
 */

import { describe, it, expect } from 'vitest';
import { prepareProofsContext, prepareOralProofsContext, fastHashUtil } from './context-helpers';
import type { ProofFile, ProofText, ProofAnalysisResult } from '../types';

describe('context-helpers', () => {
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

    it('should handle empty string', () => {
      const hash = fastHashUtil('');
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
    });

    it('should handle long strings', () => {
      const longString = 'A'.repeat(100000);
      const hash = fastHashUtil(longString);
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PREPARE PROOFS CONTEXT - MULTIPLE ANALYSES (v1.38.27)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('prepareProofsContext - Multiple Analyses', () => {
    // Helper factories
    const createMockProofFile = (overrides: Partial<ProofFile> = {}): ProofFile => ({
      id: `proof-${Date.now()}-${Math.random()}`,
      name: 'test.pdf',
      file: new Blob(['test'], { type: 'application/pdf' }) as unknown as File,
      type: 'pdf',
      uploadDate: new Date().toISOString(),
      ...overrides
    });

    const createMockProofText = (overrides: Partial<ProofText> = {}): ProofText => ({
      id: `text-${Date.now()}-${Math.random()}`,
      name: 'Text Proof',
      text: 'This is the proof content',
      type: 'text',
      uploadDate: new Date().toISOString(),
      ...overrides
    });

    it('should include all analyses in context (v1.38.27: array format)', async () => {
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

      const result = await prepareProofsContext(
        proofManager,
        'Test Topic',
        undefined,
        false,
        undefined
      );

      // Should contain count
      expect(result.proofsContext).toContain('ANÁLISES DA PROVA (2)');
      // Should contain both analyses
      expect(result.proofsContext).toContain('First analysis result');
      expect(result.proofsContext).toContain('Second analysis result');
      // Should contain type labels
      expect(result.proofsContext).toContain('Contextual');
      expect(result.proofsContext).toContain('Livre');
      // Should contain numbering
      expect(result.proofsContext).toContain('Análise 1');
      expect(result.proofsContext).toContain('Análise 2');
    });

    it('should format dates in analyses correctly', async () => {
      const proofId = 'proof-1';
      const proofManager = {
        proofFiles: [createMockProofFile({ id: proofId })],
        proofTexts: [],
        proofTopicLinks: { [proofId]: ['Topic'] },
        proofAnalysisResults: {
          [proofId]: [
            { id: 'a1', type: 'contextual' as const, result: 'Analysis', timestamp: '2024-03-15T09:30:00Z' }
          ]
        }
      };

      const result = await prepareProofsContext(
        proofManager,
        'Topic',
        undefined,
        false,
        undefined
      );

      // Date should be formatted in pt-BR format (day/month hour:minute)
      // Note: actual format depends on locale and timezone, but it should contain numbers
      expect(result.proofsContext).toMatch(/Análise 1 \(Contextual - \d/);
    });

    it('should handle empty analyses array', async () => {
      const proofId = 'proof-1';
      const proofManager = {
        proofFiles: [createMockProofFile({ id: proofId })],
        proofTexts: [],
        proofTopicLinks: { [proofId]: ['Topic'] },
        proofAnalysisResults: {
          [proofId]: [] // Empty array
        }
      };

      const result = await prepareProofsContext(
        proofManager,
        'Topic',
        undefined,
        false,
        undefined
      );

      // Should not contain analysis section header when empty
      expect(result.proofsContext).not.toContain('ANÁLISES DA PROVA');
    });

    it('should handle undefined proofAnalysisResults', async () => {
      const proofId = 'proof-1';
      const proofManager = {
        proofFiles: [createMockProofFile({ id: proofId })],
        proofTexts: [],
        proofTopicLinks: { [proofId]: ['Topic'] }
        // proofAnalysisResults is undefined
      };

      const result = await prepareProofsContext(
        proofManager,
        'Topic',
        undefined,
        false,
        undefined
      );

      // Should not throw, should not contain analysis section
      expect(result.proofsContext).not.toContain('ANÁLISES DA PROVA');
      expect(result.hasProofs).toBe(true);
    });

    it('should include multiple proofs with their analyses', async () => {
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
          'proof-1': [
            { id: 'a1', type: 'contextual' as const, result: 'Analysis of doc1', timestamp: '2024-01-01T10:00:00Z' }
          ],
          'proof-2': [
            { id: 'a2', type: 'livre' as const, result: 'Analysis of testimony', timestamp: '2024-01-02T10:00:00Z' },
            { id: 'a3', type: 'contextual' as const, result: 'Second analysis of testimony', timestamp: '2024-01-03T10:00:00Z' }
          ]
        }
      };

      const result = await prepareProofsContext(
        proofManager,
        'Topic',
        undefined,
        false,
        undefined
      );

      // Both proofs should be included
      expect(result.proofsContext).toContain('doc1.pdf');
      expect(result.proofsContext).toContain('testimony.txt');
      // All analyses should be included
      expect(result.proofsContext).toContain('Analysis of doc1');
      expect(result.proofsContext).toContain('Analysis of testimony');
      expect(result.proofsContext).toContain('Second analysis of testimony');
      // Count for each proof
      expect(result.proofsContext).toContain('ANÁLISES DA PROVA (1)');
      expect(result.proofsContext).toContain('ANÁLISES DA PROVA (2)');
    });

    it('should handle analysis without timestamp', async () => {
      const proofId = 'proof-1';
      const proofManager = {
        proofFiles: [createMockProofFile({ id: proofId })],
        proofTexts: [],
        proofTopicLinks: { [proofId]: ['Topic'] },
        proofAnalysisResults: {
          [proofId]: [
            { id: 'a1', type: 'contextual' as const, result: 'Analysis without date', timestamp: '' }
          ]
        }
      };

      const result = await prepareProofsContext(
        proofManager,
        'Topic',
        undefined,
        false,
        undefined
      );

      // Should not include empty date string, just the type
      expect(result.proofsContext).toContain('Análise 1 (Contextual)');
      expect(result.proofsContext).toContain('Analysis without date');
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

      const result = await prepareProofsContext(
        proofManager,
        'Topic',
        undefined,
        false,
        undefined
      );

      // Should contain all 5 analyses
      expect(result.proofsContext).toContain('ANÁLISES DA PROVA (5)');
      for (let i = 1; i <= 5; i++) {
        expect(result.proofsContext).toContain(`Analysis number ${i}`);
        expect(result.proofsContext).toContain(`Análise ${i}`);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PREPARE ORAL PROOFS CONTEXT - MULTIPLE ANALYSES (v1.38.27)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('prepareOralProofsContext - Multiple Analyses', () => {
    const createMockProofText = (overrides: Partial<ProofText> = {}): ProofText => ({
      id: `text-${Date.now()}-${Math.random()}`,
      name: 'Text Proof',
      text: 'This is the proof content',
      type: 'text',
      uploadDate: new Date().toISOString(),
      ...overrides
    });

    it('should include all analyses in oral proof context', async () => {
      const proofId = 'proof-1';
      const proofManager = {
        proofFiles: [],
        proofTexts: [createMockProofText({ id: proofId, name: 'Depoimento' })],
        proofTopicLinks: { [proofId]: ['Horas Extras'] },
        proofAnalysisResults: {
          [proofId]: [
            { id: 'a1', type: 'contextual' as const, result: 'Oral proof analysis 1', timestamp: '2024-01-01T10:00:00Z' },
            { id: 'a2', type: 'livre' as const, result: 'Oral proof analysis 2', timestamp: '2024-01-02T10:00:00Z' }
          ]
        }
      };

      const result = await prepareOralProofsContext(
        proofManager,
        'Horas Extras',
        false,
        undefined
      );

      expect(result.proofsContext).toContain('ANÁLISES DA PROVA (2)');
      expect(result.proofsContext).toContain('Oral proof analysis 1');
      expect(result.proofsContext).toContain('Oral proof analysis 2');
    });

    it('should return empty context when no linked proofs', async () => {
      const proofManager = {
        proofFiles: [],
        proofTexts: [createMockProofText({ id: 'proof-1' })],
        proofTopicLinks: { 'proof-1': ['Different Topic'] } // Not linked to requested topic
      };

      const result = await prepareOralProofsContext(
        proofManager,
        'Requested Topic',
        false,
        undefined
      );

      expect(result.hasProofs).toBe(false);
      expect(result.proofsContext).toBe('');
    });
  });
});
