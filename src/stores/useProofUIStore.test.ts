/**
 * @file useProofUIStore.test.ts
 * @description Testes para o store de UI de provas (estado efêmero)
 * @version 1.38.40
 *
 * Extraído de useProofsStore.test.ts na FASE 3 (split do store).
 * Testa: modal staging, form state, analysis state, pending states.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useProofUIStore } from './useProofUIStore';
import type { ProofFile, Proof } from '../types';

describe('useProofUIStore', () => {
  // Reset store before each test
  beforeEach(() => {
    const store = useProofUIStore.getState();
    // Reset to initial state
    store.setProofToDelete(null);
    store.setProofToLink(null);
    store.setProofToAnalyze(null);
    store.setNewProofTextData({ name: '', text: '' });
    store.setPendingProofText(null);
    store.setPendingExtraction(null);
    store.setPendingChatMessage(null);
    store.clearAnalyzingProofs();
    store.setProofAnalysisCustomInstructions('');
    store.setUseOnlyMiniRelatorios(false);
    store.setIncludeLinkedTopicsInFree(false);
    store.setShowProofPanel(true);
  });

  // Helper to create mock proof file
  const createMockProofFile = (overrides: Partial<ProofFile> = {}): ProofFile => ({
    id: `proof-${Date.now()}-${Math.random()}`,
    name: 'test.pdf',
    file: new Blob(['test'], { type: 'application/pdf' }) as unknown as File,
    type: 'pdf',
    uploadDate: new Date().toISOString(),
    ...overrides,
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ANALYZING PROOFS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Analyzing Proofs', () => {
    it('should add analyzing proof', () => {
      const store = useProofUIStore.getState();

      store.addAnalyzingProof('proof-1');

      expect(useProofUIStore.getState().analyzingProofIds.has('proof-1')).toBe(true);
    });

    it('should remove analyzing proof', () => {
      const store = useProofUIStore.getState();
      store.addAnalyzingProof('proof-1');
      store.addAnalyzingProof('proof-2');

      store.removeAnalyzingProof('proof-1');

      const state = useProofUIStore.getState();
      expect(state.analyzingProofIds.has('proof-1')).toBe(false);
      expect(state.analyzingProofIds.has('proof-2')).toBe(true);
    });

    it('should check if proof is analyzing', () => {
      const store = useProofUIStore.getState();
      store.addAnalyzingProof('proof-1');

      expect(store.isAnalyzingProof('proof-1')).toBe(true);
      expect(store.isAnalyzingProof('proof-2')).toBe(false);
    });

    it('should clear all analyzing proofs', () => {
      const store = useProofUIStore.getState();
      store.addAnalyzingProof('proof-1');
      store.addAnalyzingProof('proof-2');

      store.clearAnalyzingProofs();

      expect(useProofUIStore.getState().analyzingProofIds.size).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // UI STATE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('UI State', () => {
    it('should toggle show proof panel', () => {
      const store = useProofUIStore.getState();

      store.setShowProofPanel(false);
      expect(useProofUIStore.getState().showProofPanel).toBe(false);

      store.setShowProofPanel(true);
      expect(useProofUIStore.getState().showProofPanel).toBe(true);
    });

    it('should set new proof text data', () => {
      const store = useProofUIStore.getState();

      store.setNewProofTextData({ name: 'New Proof', text: 'Content' });

      const state = useProofUIStore.getState();
      expect(state.newProofTextData.name).toBe('New Proof');
      expect(state.newProofTextData.text).toBe('Content');
    });

    it('should set new proof text data with updater', () => {
      const store = useProofUIStore.getState();
      store.setNewProofTextData({ name: 'Initial', text: '' });

      store.setNewProofTextData((prev) => ({ ...prev, text: 'Updated' }));

      expect(useProofUIStore.getState().newProofTextData.text).toBe('Updated');
    });

    it('should set proof to delete', () => {
      const store = useProofUIStore.getState();
      const proof = createMockProofFile() as Proof;

      store.setProofToDelete(proof);

      expect(useProofUIStore.getState().proofToDelete).toEqual(proof);
    });

    it('should clear proof to delete', () => {
      const store = useProofUIStore.getState();
      store.setProofToDelete(createMockProofFile() as Proof);

      store.setProofToDelete(null);

      expect(useProofUIStore.getState().proofToDelete).toBeNull();
    });

    it('should set proof to link', () => {
      const store = useProofUIStore.getState();
      const proof = createMockProofFile() as Proof;

      store.setProofToLink(proof);

      expect(useProofUIStore.getState().proofToLink).toEqual(proof);
    });

    it('should set proof to analyze', () => {
      const store = useProofUIStore.getState();
      const proof = createMockProofFile() as Proof;

      store.setProofToAnalyze(proof);

      expect(useProofUIStore.getState().proofToAnalyze).toEqual(proof);
    });

    it('should set proof analysis custom instructions', () => {
      const store = useProofUIStore.getState();

      store.setProofAnalysisCustomInstructions('Analyze for damages');

      expect(useProofUIStore.getState().proofAnalysisCustomInstructions).toBe('Analyze for damages');
    });

    it('should set use only mini relatorios', () => {
      const store = useProofUIStore.getState();

      store.setUseOnlyMiniRelatorios(true);
      expect(useProofUIStore.getState().useOnlyMiniRelatorios).toBe(true);

      store.setUseOnlyMiniRelatorios(false);
      expect(useProofUIStore.getState().useOnlyMiniRelatorios).toBe(false);
    });

    it('should set include linked topics in free', () => {
      const store = useProofUIStore.getState();

      store.setIncludeLinkedTopicsInFree(true);
      expect(useProofUIStore.getState().includeLinkedTopicsInFree).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PENDING STATES TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Pending States', () => {
    it('should set pending proof text', () => {
      const store = useProofUIStore.getState();
      const pending = { name: 'Pending', text: 'Content' };

      store.setPendingProofText(pending);

      expect(useProofUIStore.getState().pendingProofText).toEqual(pending);
    });

    it('should clear pending proof text', () => {
      const store = useProofUIStore.getState();
      store.setPendingProofText({ name: 'Pending', text: '' });

      store.setPendingProofText(null);

      expect(useProofUIStore.getState().pendingProofText).toBeNull();
    });

    it('should set pending extraction', () => {
      const store = useProofUIStore.getState();
      const pending = {
        proofId: 'proof-1',
        proof: createMockProofFile() as Proof
      };

      store.setPendingExtraction(pending);

      expect(useProofUIStore.getState().pendingExtraction?.proofId).toBe('proof-1');
    });

    it('should set pending chat message', () => {
      const store = useProofUIStore.getState();
      const pending = {
        message: 'Test message',
        options: {},
        isGlobal: true,
        topicTitle: 'Topic 1'
      };

      store.setPendingChatMessage(pending);

      expect(useProofUIStore.getState().pendingChatMessage?.message).toBe('Test message');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RESET TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Reset', () => {
    it('should have correct initial state', () => {
      const state = useProofUIStore.getState();

      expect(state.proofToDelete).toBeNull();
      expect(state.proofToLink).toBeNull();
      expect(state.proofToAnalyze).toBeNull();
      expect(state.newProofTextData).toEqual({ name: '', text: '' });
      expect(state.pendingProofText).toBeNull();
      expect(state.pendingExtraction).toBeNull();
      expect(state.pendingChatMessage).toBeNull();
      expect(state.analyzingProofIds.size).toBe(0);
      expect(state.proofAnalysisCustomInstructions).toBe('');
      expect(state.useOnlyMiniRelatorios).toBe(false);
      expect(state.includeLinkedTopicsInFree).toBe(false);
      expect(state.showProofPanel).toBe(true);
    });
  });
});
