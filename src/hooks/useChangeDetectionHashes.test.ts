/**
 * @file useChangeDetectionHashes.test.ts
 * @description Testes para o hook de detecção de mudanças via hashes
 * @version 1.37.57
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useChangeDetectionHashes, type ProofManagerData } from './useChangeDetectionHashes';
import type { Topic, TopicCategory, ProofFile, ProofText } from '../types';

describe('useChangeDetectionHashes', () => {
  // Mock topic factory
  const createMockTopic = (overrides: Partial<Topic> = {}): Topic => ({
    id: `topic-${Date.now()}-${Math.random()}`,
    title: 'Test Topic',
    content: '',
    category: 'MÉRITO' as TopicCategory,
    relatorio: '',
    fundamentacao: '',
    dispositivo: '',
    ...overrides
  });

  // Mock proof file factory
  const createMockProofFile = (overrides: Partial<ProofFile> = {}): ProofFile => ({
    id: `proof-${Date.now()}-${Math.random()}`,
    name: 'test.pdf',
    file: new Blob(['test']) as unknown as File,
    type: 'pdf',
    size: 1024,
    uploadDate: new Date().toISOString(),
    ...overrides
  });

  // Mock proof text factory
  const createMockProofText = (overrides: Partial<ProofText> = {}): ProofText => ({
    id: `proof-text-${Date.now()}-${Math.random()}`,
    name: 'Text Proof',
    text: 'This is test text content',
    type: 'text',
    uploadDate: new Date().toISOString(),
    ...overrides
  });

  // Empty proof manager
  const emptyProofManager: ProofManagerData = {};

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EXTRACTED TOPICS HASH TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('extractedTopicsHash', () => {
    it('should return "empty" for undefined topics', () => {
      const { result } = renderHook(() =>
        useChangeDetectionHashes(undefined, [], emptyProofManager)
      );

      expect(result.current.extractedTopicsHash).toBe('empty');
    });

    it('should return "empty" for empty topics array', () => {
      const { result } = renderHook(() =>
        useChangeDetectionHashes([], [], emptyProofManager)
      );

      expect(result.current.extractedTopicsHash).toBe('empty');
    });

    it('should return consistent hash for same topics', () => {
      const topics = [createMockTopic({ id: '1', title: 'Topic 1', content: 'Content' })];

      const { result: result1 } = renderHook(() =>
        useChangeDetectionHashes(topics, [], emptyProofManager)
      );

      const { result: result2 } = renderHook(() =>
        useChangeDetectionHashes(topics, [], emptyProofManager)
      );

      expect(result1.current.extractedTopicsHash).toBe(result2.current.extractedTopicsHash);
    });

    it('should return different hash for different topics', () => {
      const topics1 = [createMockTopic({ id: '1', title: 'Topic 1', content: 'Content A' })];
      const topics2 = [createMockTopic({ id: '1', title: 'Topic 1', content: 'Content B' })];

      const { result: result1 } = renderHook(() =>
        useChangeDetectionHashes(topics1, [], emptyProofManager)
      );

      const { result: result2 } = renderHook(() =>
        useChangeDetectionHashes(topics2, [], emptyProofManager)
      );

      expect(result1.current.extractedTopicsHash).not.toBe(result2.current.extractedTopicsHash);
    });

    it('should detect changes in fundamentacao', () => {
      const topicsV1 = [createMockTopic({ id: '1', fundamentacao: 'Version 1' })];
      const topicsV2 = [createMockTopic({ id: '1', fundamentacao: 'Version 2' })];

      const { result: result1 } = renderHook(() =>
        useChangeDetectionHashes(topicsV1, [], emptyProofManager)
      );

      const { result: result2 } = renderHook(() =>
        useChangeDetectionHashes(topicsV2, [], emptyProofManager)
      );

      expect(result1.current.extractedTopicsHash).not.toBe(result2.current.extractedTopicsHash);
    });

    it('should detect changes in editedFundamentacao', () => {
      const topicsV1 = [createMockTopic({ id: '1', editedFundamentacao: 'Edit 1' })];
      const topicsV2 = [createMockTopic({ id: '1', editedFundamentacao: 'Edit 2' })];

      const { result: result1 } = renderHook(() =>
        useChangeDetectionHashes(topicsV1, [], emptyProofManager)
      );

      const { result: result2 } = renderHook(() =>
        useChangeDetectionHashes(topicsV2, [], emptyProofManager)
      );

      expect(result1.current.extractedTopicsHash).not.toBe(result2.current.extractedTopicsHash);
    });

    it('should detect changes in category', () => {
      const topicsV1 = [createMockTopic({ id: '1', category: 'MÉRITO' as TopicCategory })];
      const topicsV2 = [createMockTopic({ id: '1', category: 'PRELIMINAR' as TopicCategory })];

      const { result: result1 } = renderHook(() =>
        useChangeDetectionHashes(topicsV1, [], emptyProofManager)
      );

      const { result: result2 } = renderHook(() =>
        useChangeDetectionHashes(topicsV2, [], emptyProofManager)
      );

      expect(result1.current.extractedTopicsHash).not.toBe(result2.current.extractedTopicsHash);
    });

    it('should detect changes in resultado', () => {
      const topicsV1 = [createMockTopic({ id: '1', resultado: 'PROCEDENTE' })];
      const topicsV2 = [createMockTopic({ id: '1', resultado: 'IMPROCEDENTE' })];

      const { result: result1 } = renderHook(() =>
        useChangeDetectionHashes(topicsV1, [], emptyProofManager)
      );

      const { result: result2 } = renderHook(() =>
        useChangeDetectionHashes(topicsV2, [], emptyProofManager)
      );

      expect(result1.current.extractedTopicsHash).not.toBe(result2.current.extractedTopicsHash);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SELECTED TOPICS HASH TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('selectedTopicsHash', () => {
    it('should return "empty" for empty selected topics', () => {
      const { result } = renderHook(() =>
        useChangeDetectionHashes([], [], emptyProofManager)
      );

      expect(result.current.selectedTopicsHash).toBe('empty');
    });

    it('should compute hash for selected topics', () => {
      const selectedTopics = [createMockTopic({ id: '1', title: 'Selected' })];

      const { result } = renderHook(() =>
        useChangeDetectionHashes([], selectedTopics, emptyProofManager)
      );

      expect(result.current.selectedTopicsHash).not.toBe('empty');
    });

    it('should be independent from extractedTopicsHash', () => {
      const extractedTopics = [createMockTopic({ id: '1', title: 'Extracted' })];
      const selectedTopics = [createMockTopic({ id: '2', title: 'Selected' })];

      const { result } = renderHook(() =>
        useChangeDetectionHashes(extractedTopics, selectedTopics, emptyProofManager)
      );

      expect(result.current.extractedTopicsHash).not.toBe(result.current.selectedTopicsHash);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PROOFS HASH TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('proofsHash', () => {
    it('should compute hash for empty proof manager', () => {
      const { result } = renderHook(() =>
        useChangeDetectionHashes([], [], emptyProofManager)
      );

      expect(result.current.proofsHash).toBeDefined();
    });

    it('should detect changes in proofFiles', () => {
      const proofManager1: ProofManagerData = {
        proofFiles: [createMockProofFile({ id: '1', name: 'file1.pdf' })]
      };

      const proofManager2: ProofManagerData = {
        proofFiles: [createMockProofFile({ id: '2', name: 'file2.pdf' })]
      };

      const { result: result1 } = renderHook(() =>
        useChangeDetectionHashes([], [], proofManager1)
      );

      const { result: result2 } = renderHook(() =>
        useChangeDetectionHashes([], [], proofManager2)
      );

      expect(result1.current.proofsHash).not.toBe(result2.current.proofsHash);
    });

    it('should detect changes in proofTexts', () => {
      const proofManager1: ProofManagerData = {
        proofTexts: [createMockProofText({ id: '1', text: 'Text A' })]
      };

      const proofManager2: ProofManagerData = {
        proofTexts: [createMockProofText({ id: '1', text: 'Text B' })]
      };

      const { result: result1 } = renderHook(() =>
        useChangeDetectionHashes([], [], proofManager1)
      );

      const { result: result2 } = renderHook(() =>
        useChangeDetectionHashes([], [], proofManager2)
      );

      expect(result1.current.proofsHash).not.toBe(result2.current.proofsHash);
    });

    it('should detect changes in extractedProofTexts', () => {
      const proofManager1: ProofManagerData = {
        extractedProofTexts: { 'proof-1': 'Extracted text v1' }
      };

      const proofManager2: ProofManagerData = {
        extractedProofTexts: { 'proof-1': 'Extracted text v2' }
      };

      const { result: result1 } = renderHook(() =>
        useChangeDetectionHashes([], [], proofManager1)
      );

      const { result: result2 } = renderHook(() =>
        useChangeDetectionHashes([], [], proofManager2)
      );

      expect(result1.current.proofsHash).not.toBe(result2.current.proofsHash);
    });

    it('should detect changes in proofConclusions', () => {
      const proofManager1: ProofManagerData = {
        proofConclusions: { 'proof-1': 'Conclusion A' }
      };

      const proofManager2: ProofManagerData = {
        proofConclusions: { 'proof-1': 'Conclusion B' }
      };

      const { result: result1 } = renderHook(() =>
        useChangeDetectionHashes([], [], proofManager1)
      );

      const { result: result2 } = renderHook(() =>
        useChangeDetectionHashes([], [], proofManager2)
      );

      expect(result1.current.proofsHash).not.toBe(result2.current.proofsHash);
    });

    it('should detect changes in proofTopicLinks', () => {
      const proofManager1: ProofManagerData = {
        proofTopicLinks: { 'proof-1': ['topic-1'] }
      };

      const proofManager2: ProofManagerData = {
        proofTopicLinks: { 'proof-1': ['topic-1', 'topic-2'] }
      };

      const { result: result1 } = renderHook(() =>
        useChangeDetectionHashes([], [], proofManager1)
      );

      const { result: result2 } = renderHook(() =>
        useChangeDetectionHashes([], [], proofManager2)
      );

      expect(result1.current.proofsHash).not.toBe(result2.current.proofsHash);
    });

    it('should detect changes in proofAnalysisResults', () => {
      const proofManager1: ProofManagerData = {
        proofAnalysisResults: { 'proof-1': { type: 'contextual', result: 'Analysis A' } }
      };

      const proofManager2: ProofManagerData = {
        proofAnalysisResults: { 'proof-1': { type: 'contextual', result: 'Analysis B' } }
      };

      const { result: result1 } = renderHook(() =>
        useChangeDetectionHashes([], [], proofManager1)
      );

      const { result: result2 } = renderHook(() =>
        useChangeDetectionHashes([], [], proofManager2)
      );

      expect(result1.current.proofsHash).not.toBe(result2.current.proofsHash);
    });

    it('should detect changes in proofUsePdfMode', () => {
      const proofManager1: ProofManagerData = {
        proofUsePdfMode: { 'proof-1': true }
      };

      const proofManager2: ProofManagerData = {
        proofUsePdfMode: { 'proof-1': false }
      };

      const { result: result1 } = renderHook(() =>
        useChangeDetectionHashes([], [], proofManager1)
      );

      const { result: result2 } = renderHook(() =>
        useChangeDetectionHashes([], [], proofManager2)
      );

      expect(result1.current.proofsHash).not.toBe(result2.current.proofsHash);
    });

    it('should detect changes in proofSendFullContent', () => {
      const proofManager1: ProofManagerData = {
        proofSendFullContent: { 'proof-1': true }
      };

      const proofManager2: ProofManagerData = {
        proofSendFullContent: { 'proof-1': false }
      };

      const { result: result1 } = renderHook(() =>
        useChangeDetectionHashes([], [], proofManager1)
      );

      const { result: result2 } = renderHook(() =>
        useChangeDetectionHashes([], [], proofManager2)
      );

      expect(result1.current.proofsHash).not.toBe(result2.current.proofsHash);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // MEMOIZATION TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Memoization', () => {
    it('should not recalculate when dependencies unchanged', () => {
      const topics: Topic[] = [];
      const proofManager: ProofManagerData = {};

      const { result, rerender } = renderHook(
        ({ ext, sel, pm }) => useChangeDetectionHashes(ext, sel, pm),
        { initialProps: { ext: topics, sel: topics, pm: proofManager } }
      );

      const hash1 = result.current.extractedTopicsHash;
      rerender({ ext: topics, sel: topics, pm: proofManager });
      const hash2 = result.current.extractedTopicsHash;

      expect(hash1).toBe(hash2);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EDGE CASES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Edge Cases', () => {
    it('should handle topics with null/undefined fields', () => {
      const topics = [createMockTopic({
        id: undefined as any,
        title: undefined as any,
        content: null as any,
        fundamentacao: null as any
      })];

      const { result } = renderHook(() =>
        useChangeDetectionHashes(topics, [], emptyProofManager)
      );

      expect(result.current.extractedTopicsHash).toBeDefined();
      expect(result.current.extractedTopicsHash).not.toBe('error');
    });

    it('should handle proof manager with undefined arrays', () => {
      const proofManager: ProofManagerData = {
        proofFiles: undefined,
        proofTexts: undefined
      };

      const { result } = renderHook(() =>
        useChangeDetectionHashes([], [], proofManager)
      );

      expect(result.current.proofsHash).toBeDefined();
    });

    it('should handle very long content', () => {
      const longContent = 'A'.repeat(100000);
      const topics = [createMockTopic({ content: longContent })];

      const { result } = renderHook(() =>
        useChangeDetectionHashes(topics, [], emptyProofManager)
      );

      expect(result.current.extractedTopicsHash).toBeDefined();
    });
  });
});
