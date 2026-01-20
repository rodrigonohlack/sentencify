/**
 * @file useProofsStore.test.ts
 * @description Testes para o store de provas (upload, vinculação, análise)
 * @version 1.37.57
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  useProofsStore,
  selectProofFiles,
  selectProofTexts,
  selectProofTopicLinks,
  selectProofAnalysisResults
} from './useProofsStore';
import type { ProofFile, ProofText, Proof, ProcessingMode } from '../types';

describe('useProofsStore', () => {
  // Reset store before each test
  beforeEach(() => {
    const store = useProofsStore.getState();
    store.resetAll();
  });

  // Helper to create mock proof file
  const createMockProofFile = (overrides: Partial<ProofFile> = {}): ProofFile => ({
    id: `proof-${Date.now()}-${Math.random()}`,
    name: 'test.pdf',
    file: new Blob(['test'], { type: 'application/pdf' }) as unknown as File,
    type: 'pdf',
    uploadDate: new Date().toISOString(),
    ...overrides
  });

  // Helper to create mock proof text
  const createMockProofText = (overrides: Partial<ProofText> = {}): ProofText => ({
    id: `text-${Date.now()}-${Math.random()}`,
    name: 'Text Proof',
    text: 'This is the proof content',
    type: 'text',
    uploadDate: new Date().toISOString(),
    ...overrides
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PROOF FILES TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Proof Files', () => {
    it('should set proof files', () => {
      const store = useProofsStore.getState();
      const files = [createMockProofFile({ id: '1' }), createMockProofFile({ id: '2' })];

      store.setProofFiles(files);

      expect(useProofsStore.getState().proofFiles).toHaveLength(2);
    });

    it('should set proof files with updater function', () => {
      const store = useProofsStore.getState();
      store.setProofFiles([createMockProofFile({ id: '1' })]);

      store.setProofFiles((prev) => [...prev, createMockProofFile({ id: '2' })]);

      expect(useProofsStore.getState().proofFiles).toHaveLength(2);
    });

    it('should clear proof files', () => {
      const store = useProofsStore.getState();
      store.setProofFiles([createMockProofFile()]);

      store.setProofFiles([]);

      expect(useProofsStore.getState().proofFiles).toHaveLength(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PROOF TEXTS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Proof Texts', () => {
    it('should set proof texts', () => {
      const store = useProofsStore.getState();
      const texts = [createMockProofText({ id: '1' }), createMockProofText({ id: '2' })];

      store.setProofTexts(texts);

      expect(useProofsStore.getState().proofTexts).toHaveLength(2);
    });

    it('should set proof texts with updater function', () => {
      const store = useProofsStore.getState();
      store.setProofTexts([createMockProofText({ id: '1' })]);

      store.setProofTexts((prev) => prev.filter((t) => t.id !== '1'));

      expect(useProofsStore.getState().proofTexts).toHaveLength(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PROOF MODE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Proof Use PDF Mode', () => {
    it('should set proof use pdf mode', () => {
      const store = useProofsStore.getState();

      store.setProofUsePdfMode({ 'proof-1': true, 'proof-2': false });

      const state = useProofsStore.getState();
      expect(state.proofUsePdfMode['proof-1']).toBe(true);
      expect(state.proofUsePdfMode['proof-2']).toBe(false);
    });

    it('should toggle proof mode via handler', () => {
      const store = useProofsStore.getState();

      store.handleToggleProofMode('proof-1', true);
      expect(useProofsStore.getState().proofUsePdfMode['proof-1']).toBe(true);

      store.handleToggleProofMode('proof-1', false);
      expect(useProofsStore.getState().proofUsePdfMode['proof-1']).toBe(false);
    });

    it('should set proof use pdf mode with updater', () => {
      const store = useProofsStore.getState();
      store.setProofUsePdfMode({ 'proof-1': true });

      store.setProofUsePdfMode((prev) => ({ ...prev, 'proof-2': false }));

      const state = useProofsStore.getState();
      expect(state.proofUsePdfMode['proof-1']).toBe(true);
      expect(state.proofUsePdfMode['proof-2']).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EXTRACTED TEXTS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Extracted Proof Texts', () => {
    it('should set extracted proof texts', () => {
      const store = useProofsStore.getState();

      store.setExtractedProofTexts({
        'proof-1': 'Extracted text from PDF 1',
        'proof-2': 'Extracted text from PDF 2'
      });

      const state = useProofsStore.getState();
      expect(state.extractedProofTexts['proof-1']).toBe('Extracted text from PDF 1');
    });

    it('should set extraction failed status', () => {
      const store = useProofsStore.getState();

      store.setProofExtractionFailed({ 'proof-1': true, 'proof-2': false });

      const state = useProofsStore.getState();
      expect(state.proofExtractionFailed['proof-1']).toBe(true);
      expect(state.proofExtractionFailed['proof-2']).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PROOF TOPIC LINKS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Proof Topic Links', () => {
    it('should set proof topic links', () => {
      const store = useProofsStore.getState();

      store.setProofTopicLinks({
        'proof-1': ['Topic A', 'Topic B'],
        'proof-2': ['Topic C']
      });

      const state = useProofsStore.getState();
      expect(state.proofTopicLinks['proof-1']).toEqual(['Topic A', 'Topic B']);
    });

    it('should link proof to topics via handler', () => {
      const store = useProofsStore.getState();

      store.handleLinkProof('proof-1', ['Topic 1', 'Topic 2']);

      expect(useProofsStore.getState().proofTopicLinks['proof-1']).toEqual(['Topic 1', 'Topic 2']);
    });

    it('should replace existing links when linking', () => {
      const store = useProofsStore.getState();
      store.handleLinkProof('proof-1', ['Old Topic']);

      store.handleLinkProof('proof-1', ['New Topic 1', 'New Topic 2']);

      expect(useProofsStore.getState().proofTopicLinks['proof-1']).toEqual(['New Topic 1', 'New Topic 2']);
    });

    it('should unlink proof from topic', () => {
      const store = useProofsStore.getState();
      store.handleLinkProof('proof-1', ['Topic A', 'Topic B', 'Topic C']);

      store.handleUnlinkProof('proof-1', 'Topic B');

      expect(useProofsStore.getState().proofTopicLinks['proof-1']).toEqual(['Topic A', 'Topic C']);
    });

    it('should remove proof key when unlinking last topic', () => {
      const store = useProofsStore.getState();
      store.handleLinkProof('proof-1', ['Topic A']);

      store.handleUnlinkProof('proof-1', 'Topic A');

      expect(useProofsStore.getState().proofTopicLinks['proof-1']).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PROOF ANALYSIS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Proof Analysis', () => {
    it('should add proof analysis (v1.38.27: array format)', () => {
      const store = useProofsStore.getState();

      store.addProofAnalysis('proof-1', { type: 'contextual', result: 'Analysis result' });

      const analyses = useProofsStore.getState().proofAnalysisResults['proof-1'];
      expect(analyses).toHaveLength(1);
      expect(analyses[0].result).toBe('Analysis result');
      expect(analyses[0].type).toBe('contextual');
      expect(analyses[0].id).toBeDefined();
      expect(analyses[0].timestamp).toBeDefined();
    });

    it('should add analyzing proof', () => {
      const store = useProofsStore.getState();

      store.addAnalyzingProof('proof-1');

      expect(useProofsStore.getState().analyzingProofIds.has('proof-1')).toBe(true);
    });

    it('should remove analyzing proof', () => {
      const store = useProofsStore.getState();
      store.addAnalyzingProof('proof-1');
      store.addAnalyzingProof('proof-2');

      store.removeAnalyzingProof('proof-1');

      const state = useProofsStore.getState();
      expect(state.analyzingProofIds.has('proof-1')).toBe(false);
      expect(state.analyzingProofIds.has('proof-2')).toBe(true);
    });

    it('should check if proof is analyzing', () => {
      const store = useProofsStore.getState();
      store.addAnalyzingProof('proof-1');

      expect(store.isAnalyzingProof('proof-1')).toBe(true);
      expect(store.isAnalyzingProof('proof-2')).toBe(false);
    });

    it('should clear all analyzing proofs', () => {
      const store = useProofsStore.getState();
      store.addAnalyzingProof('proof-1');
      store.addAnalyzingProof('proof-2');

      store.clearAnalyzingProofs();

      expect(useProofsStore.getState().analyzingProofIds.size).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PROOF CONCLUSIONS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Proof Conclusions', () => {
    it('should set proof conclusions', () => {
      const store = useProofsStore.getState();

      store.setProofConclusions({
        'proof-1': 'Judge conclusion for proof 1'
      });

      expect(useProofsStore.getState().proofConclusions['proof-1']).toBe('Judge conclusion for proof 1');
    });

    it('should save proof conclusion via handler', () => {
      const store = useProofsStore.getState();

      store.handleSaveProofConclusion('proof-1', 'New conclusion');

      expect(useProofsStore.getState().proofConclusions['proof-1']).toBe('New conclusion');
    });

    it('should delete conclusion when empty', () => {
      const store = useProofsStore.getState();
      store.handleSaveProofConclusion('proof-1', 'Some conclusion');

      store.handleSaveProofConclusion('proof-1', '');

      expect(useProofsStore.getState().proofConclusions['proof-1']).toBeUndefined();
    });

    it('should delete conclusion when whitespace only', () => {
      const store = useProofsStore.getState();
      store.handleSaveProofConclusion('proof-1', 'Some conclusion');

      store.handleSaveProofConclusion('proof-1', '   ');

      expect(useProofsStore.getState().proofConclusions['proof-1']).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCESSING MODES TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Processing Modes', () => {
    it('should set proof processing modes', () => {
      const store = useProofsStore.getState();

      store.setProofProcessingModes({
        'proof-1': 'pdfjs' as ProcessingMode,
        'proof-2': 'tesseract' as ProcessingMode
      });

      const state = useProofsStore.getState();
      expect(state.proofProcessingModes['proof-1']).toBe('pdfjs');
      expect(state.proofProcessingModes['proof-2']).toBe('tesseract');
    });

    it('should set proof send full content', () => {
      const store = useProofsStore.getState();

      store.setProofSendFullContent({ 'proof-1': true, 'proof-2': false });

      const state = useProofsStore.getState();
      expect(state.proofSendFullContent['proof-1']).toBe(true);
      expect(state.proofSendFullContent['proof-2']).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // UI STATE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('UI State', () => {
    it('should toggle show proof panel', () => {
      const store = useProofsStore.getState();

      store.setShowProofPanel(false);
      expect(useProofsStore.getState().showProofPanel).toBe(false);

      store.setShowProofPanel(true);
      expect(useProofsStore.getState().showProofPanel).toBe(true);
    });

    it('should set new proof text data', () => {
      const store = useProofsStore.getState();

      store.setNewProofTextData({ name: 'New Proof', text: 'Content' });

      const state = useProofsStore.getState();
      expect(state.newProofTextData.name).toBe('New Proof');
      expect(state.newProofTextData.text).toBe('Content');
    });

    it('should set new proof text data with updater', () => {
      const store = useProofsStore.getState();
      store.setNewProofTextData({ name: 'Initial', text: '' });

      store.setNewProofTextData((prev) => ({ ...prev, text: 'Updated' }));

      expect(useProofsStore.getState().newProofTextData.text).toBe('Updated');
    });

    it('should set proof to delete', () => {
      const store = useProofsStore.getState();
      const proof = createMockProofFile() as Proof;

      store.setProofToDelete(proof);

      expect(useProofsStore.getState().proofToDelete).toEqual(proof);
    });

    it('should clear proof to delete', () => {
      const store = useProofsStore.getState();
      store.setProofToDelete(createMockProofFile() as Proof);

      store.setProofToDelete(null);

      expect(useProofsStore.getState().proofToDelete).toBeNull();
    });

    it('should set proof to link', () => {
      const store = useProofsStore.getState();
      const proof = createMockProofFile() as Proof;

      store.setProofToLink(proof);

      expect(useProofsStore.getState().proofToLink).toEqual(proof);
    });

    it('should set proof to analyze', () => {
      const store = useProofsStore.getState();
      const proof = createMockProofFile() as Proof;

      store.setProofToAnalyze(proof);

      expect(useProofsStore.getState().proofToAnalyze).toEqual(proof);
    });

    it('should set proof analysis custom instructions', () => {
      const store = useProofsStore.getState();

      store.setProofAnalysisCustomInstructions('Analyze for damages');

      expect(useProofsStore.getState().proofAnalysisCustomInstructions).toBe('Analyze for damages');
    });

    it('should set use only mini relatorios', () => {
      const store = useProofsStore.getState();

      store.setUseOnlyMiniRelatorios(true);
      expect(useProofsStore.getState().useOnlyMiniRelatorios).toBe(true);

      store.setUseOnlyMiniRelatorios(false);
      expect(useProofsStore.getState().useOnlyMiniRelatorios).toBe(false);
    });

    it('should set include linked topics in free', () => {
      const store = useProofsStore.getState();

      store.setIncludeLinkedTopicsInFree(true);
      expect(useProofsStore.getState().includeLinkedTopicsInFree).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PENDING STATES TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Pending States', () => {
    it('should set pending proof text', () => {
      const store = useProofsStore.getState();
      const pending = { name: 'Pending', text: 'Content' };

      store.setPendingProofText(pending);

      expect(useProofsStore.getState().pendingProofText).toEqual(pending);
    });

    it('should clear pending proof text', () => {
      const store = useProofsStore.getState();
      store.setPendingProofText({ name: 'Pending', text: '' });

      store.setPendingProofText(null);

      expect(useProofsStore.getState().pendingProofText).toBeNull();
    });

    it('should set pending extraction', () => {
      const store = useProofsStore.getState();
      const pending = {
        proofId: 'proof-1',
        proof: createMockProofFile() as Proof
      };

      store.setPendingExtraction(pending);

      expect(useProofsStore.getState().pendingExtraction?.proofId).toBe('proof-1');
    });

    it('should set pending chat message', () => {
      const store = useProofsStore.getState();
      const pending = {
        message: 'Test message',
        options: {},
        isGlobal: true,
        topicTitle: 'Topic 1'
      };

      store.setPendingChatMessage(pending);

      expect(useProofsStore.getState().pendingChatMessage?.message).toBe('Test message');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PERSISTENCE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Persistence', () => {
    it('should serialize for persistence', () => {
      const store = useProofsStore.getState();
      const files = [createMockProofFile({ id: 'file-1' })];
      const texts = [createMockProofText({ id: 'text-1' })];

      store.setProofFiles(files);
      store.setProofTexts(texts);
      store.setProofUsePdfMode({ 'file-1': true });
      store.setExtractedProofTexts({ 'file-1': 'Extracted' });
      store.setProofTopicLinks({ 'file-1': ['Topic A'] });
      store.setProofConclusions({ 'file-1': 'Conclusion' });

      const serialized = store.serializeForPersistence();

      expect(serialized.proofFiles).toHaveLength(1);
      expect(serialized.proofTexts).toHaveLength(1);
      expect(serialized.proofUsePdfMode['file-1']).toBe(true);
      expect(serialized.extractedProofTexts['file-1']).toBe('Extracted');
      expect(serialized.proofTopicLinks['file-1']).toEqual(['Topic A']);
      expect(serialized.proofConclusions['file-1']).toBe('Conclusion');
    });

    it('should restore from persistence', () => {
      const store = useProofsStore.getState();
      const data = {
        proofFiles: [createMockProofFile({ id: 'restored-file' })],
        proofTexts: [createMockProofText({ id: 'restored-text' })],
        proofUsePdfMode: { 'restored-file': false },
        extractedProofTexts: { 'restored-file': 'Restored text' },
        proofTopicLinks: { 'restored-file': ['Restored Topic'] },
        proofConclusions: { 'restored-file': 'Restored conclusion' }
      };

      store.restoreFromPersistence(data);

      const state = useProofsStore.getState();
      expect(state.proofFiles[0].id).toBe('restored-file');
      expect(state.proofTexts[0].id).toBe('restored-text');
      expect(state.proofUsePdfMode['restored-file']).toBe(false);
    });

    it('should handle null data in restore', () => {
      const store = useProofsStore.getState();
      store.setProofFiles([createMockProofFile()]);

      store.restoreFromPersistence(null);

      expect(useProofsStore.getState().proofFiles).toHaveLength(1);
    });

    it('should handle partial data in restore', () => {
      const store = useProofsStore.getState();
      store.setProofFiles([createMockProofFile({ id: 'old' })]);
      store.setProofTexts([createMockProofText({ id: 'old-text' })]);

      store.restoreFromPersistence({
        proofFiles: [createMockProofFile({ id: 'new' })]
      });

      const state = useProofsStore.getState();
      expect(state.proofFiles[0].id).toBe('new');
      expect(state.proofTexts[0].id).toBe('old-text');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RESET ALL TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Reset All', () => {
    it('should reset all state', () => {
      const store = useProofsStore.getState();

      // Set various state
      store.setProofFiles([createMockProofFile()]);
      store.setProofTexts([createMockProofText()]);
      store.setProofUsePdfMode({ 'proof-1': true });
      store.setExtractedProofTexts({ 'proof-1': 'Text' });
      store.setProofExtractionFailed({ 'proof-1': true });
      store.setProofTopicLinks({ 'proof-1': ['Topic'] });
      store.addProofAnalysis('proof-1', { type: 'contextual', result: 'Result' });
      store.setProofConclusions({ 'proof-1': 'Conclusion' });
      store.addAnalyzingProof('proof-1');
      store.setShowProofPanel(false);
      store.setNewProofTextData({ name: 'Test', text: 'Content' });
      store.setProofToDelete(createMockProofFile() as Proof);
      store.setProofToLink(createMockProofFile() as Proof);
      store.setProofToAnalyze(createMockProofFile() as Proof);
      store.setProofAnalysisCustomInstructions('Custom');
      store.setUseOnlyMiniRelatorios(true);
      store.setIncludeLinkedTopicsInFree(true);

      store.resetAll();

      const state = useProofsStore.getState();
      expect(state.proofFiles).toHaveLength(0);
      expect(state.proofTexts).toHaveLength(0);
      expect(Object.keys(state.proofUsePdfMode)).toHaveLength(0);
      expect(Object.keys(state.extractedProofTexts)).toHaveLength(0);
      expect(Object.keys(state.proofExtractionFailed)).toHaveLength(0);
      expect(Object.keys(state.proofTopicLinks)).toHaveLength(0);
      expect(Object.keys(state.proofAnalysisResults)).toHaveLength(0);
      expect(Object.keys(state.proofConclusions)).toHaveLength(0);
      expect(state.analyzingProofIds.size).toBe(0);
      expect(state.showProofPanel).toBe(true);
      expect(state.newProofTextData).toEqual({ name: '', text: '' });
      expect(state.proofToDelete).toBeNull();
      expect(state.proofToLink).toBeNull();
      expect(state.proofToAnalyze).toBeNull();
      expect(state.proofAnalysisCustomInstructions).toBe('');
      expect(state.useOnlyMiniRelatorios).toBe(false);
      expect(state.includeLinkedTopicsInFree).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SELECTORS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Selectors', () => {
    it('selectProofFiles should return proof files', () => {
      const store = useProofsStore.getState();
      const files = [createMockProofFile()];
      store.setProofFiles(files);

      expect(selectProofFiles(useProofsStore.getState())).toEqual(files);
    });

    it('selectProofTexts should return proof texts', () => {
      const store = useProofsStore.getState();
      const texts = [createMockProofText()];
      store.setProofTexts(texts);

      expect(selectProofTexts(useProofsStore.getState())).toEqual(texts);
    });

    it('selectProofTopicLinks should return topic links', () => {
      const store = useProofsStore.getState();
      store.setProofTopicLinks({ 'proof-1': ['Topic A'] });

      expect(selectProofTopicLinks(useProofsStore.getState())).toEqual({
        'proof-1': ['Topic A']
      });
    });

    it('selectProofAnalysisResults should return analysis results (v1.38.27: array format)', () => {
      const store = useProofsStore.getState();
      store.addProofAnalysis('proof-1', { type: 'contextual', result: 'Result' });

      const results = selectProofAnalysisResults(useProofsStore.getState());
      expect(results['proof-1']).toHaveLength(1);
      expect(results['proof-1'][0].type).toBe('contextual');
      expect(results['proof-1'][0].result).toBe('Result');
    });
  });

});
