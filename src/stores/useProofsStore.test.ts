/**
 * @file useProofsStore.test.ts
 * @description Testes completos para o store de provas (CRUD, vinculação, análise, anexos, persistência)
 * @version 1.38.49
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  useProofsStore,
  selectProofFiles,
  selectProofTexts,
  selectProofTopicLinks,
  selectProofAnalysisResults
} from './useProofsStore';
import type { ProofFile, ProofText, ProofAttachment, ProcessingMode } from '../types';

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

  // Helper to create mock attachment
  const createMockAttachment = (overrides: Partial<ProofAttachment> = {}): ProofAttachment => ({
    id: `attach-${Date.now()}-${Math.random()}`,
    name: 'attachment.pdf',
    type: 'pdf',
    uploadDate: new Date().toISOString(),
    ...overrides
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PROOF FILES TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Proof Files', () => {
    it('should start with empty proof files', () => {
      expect(useProofsStore.getState().proofFiles).toEqual([]);
    });

    it('should set proof files with direct value', () => {
      const store = useProofsStore.getState();
      const files = [createMockProofFile({ id: '1' }), createMockProofFile({ id: '2' })];

      store.setProofFiles(files);

      expect(useProofsStore.getState().proofFiles).toHaveLength(2);
      expect(useProofsStore.getState().proofFiles[0].id).toBe('1');
      expect(useProofsStore.getState().proofFiles[1].id).toBe('2');
    });

    it('should set proof files with updater function', () => {
      const store = useProofsStore.getState();
      store.setProofFiles([createMockProofFile({ id: '1' })]);

      store.setProofFiles((prev) => [...prev, createMockProofFile({ id: '2' })]);

      expect(useProofsStore.getState().proofFiles).toHaveLength(2);
    });

    it('should clear proof files with empty array', () => {
      const store = useProofsStore.getState();
      store.setProofFiles([createMockProofFile()]);

      store.setProofFiles([]);

      expect(useProofsStore.getState().proofFiles).toHaveLength(0);
    });

    it('should remove proof files with updater function', () => {
      const store = useProofsStore.getState();
      store.setProofFiles([
        createMockProofFile({ id: '1' }),
        createMockProofFile({ id: '2' }),
        createMockProofFile({ id: '3' })
      ]);

      store.setProofFiles((prev) => prev.filter((f) => f.id !== '2'));

      const state = useProofsStore.getState();
      expect(state.proofFiles).toHaveLength(2);
      expect(state.proofFiles[0].id).toBe('1');
      expect(state.proofFiles[1].id).toBe('3');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PROOF TEXTS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Proof Texts', () => {
    it('should start with empty proof texts', () => {
      expect(useProofsStore.getState().proofTexts).toEqual([]);
    });

    it('should set proof texts with direct value', () => {
      const store = useProofsStore.getState();
      const texts = [createMockProofText({ id: '1' }), createMockProofText({ id: '2' })];

      store.setProofTexts(texts);

      expect(useProofsStore.getState().proofTexts).toHaveLength(2);
    });

    it('should set proof texts with updater function', () => {
      const store = useProofsStore.getState();
      store.setProofTexts([createMockProofText({ id: '1' })]);

      store.setProofTexts((prev) => [...prev, createMockProofText({ id: '2' })]);

      expect(useProofsStore.getState().proofTexts).toHaveLength(2);
    });

    it('should filter proof texts with updater function', () => {
      const store = useProofsStore.getState();
      store.setProofTexts([createMockProofText({ id: '1' }), createMockProofText({ id: '2' })]);

      store.setProofTexts((prev) => prev.filter((t) => t.id !== '1'));

      expect(useProofsStore.getState().proofTexts).toHaveLength(1);
      expect(useProofsStore.getState().proofTexts[0].id).toBe('2');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PROOF MODE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Proof Use PDF Mode', () => {
    it('should set proof use pdf mode with direct value', () => {
      const store = useProofsStore.getState();

      store.setProofUsePdfMode({ 'proof-1': true, 'proof-2': false });

      const state = useProofsStore.getState();
      expect(state.proofUsePdfMode['proof-1']).toBe(true);
      expect(state.proofUsePdfMode['proof-2']).toBe(false);
    });

    it('should set proof use pdf mode with updater function', () => {
      const store = useProofsStore.getState();
      store.setProofUsePdfMode({ 'proof-1': true });

      store.setProofUsePdfMode((prev) => ({ ...prev, 'proof-2': false }));

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

    it('should handle numeric proofId in handleToggleProofMode', () => {
      const store = useProofsStore.getState();

      store.handleToggleProofMode(42, true);

      expect(useProofsStore.getState().proofUsePdfMode['42']).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EXTRACTED TEXTS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Extracted Proof Texts', () => {
    it('should set extracted proof texts with direct value', () => {
      const store = useProofsStore.getState();

      store.setExtractedProofTexts({
        'proof-1': 'Extracted text from PDF 1',
        'proof-2': 'Extracted text from PDF 2'
      });

      const state = useProofsStore.getState();
      expect(state.extractedProofTexts['proof-1']).toBe('Extracted text from PDF 1');
      expect(state.extractedProofTexts['proof-2']).toBe('Extracted text from PDF 2');
    });

    it('should set extracted proof texts with updater function', () => {
      const store = useProofsStore.getState();
      store.setExtractedProofTexts({ 'proof-1': 'Text 1' });

      store.setExtractedProofTexts((prev) => ({ ...prev, 'proof-2': 'Text 2' }));

      const state = useProofsStore.getState();
      expect(state.extractedProofTexts['proof-1']).toBe('Text 1');
      expect(state.extractedProofTexts['proof-2']).toBe('Text 2');
    });

    it('should set extraction failed status with direct value', () => {
      const store = useProofsStore.getState();

      store.setProofExtractionFailed({ 'proof-1': true, 'proof-2': false });

      const state = useProofsStore.getState();
      expect(state.proofExtractionFailed['proof-1']).toBe(true);
      expect(state.proofExtractionFailed['proof-2']).toBe(false);
    });

    it('should set extraction failed status with updater function', () => {
      const store = useProofsStore.getState();
      store.setProofExtractionFailed({ 'proof-1': true });

      store.setProofExtractionFailed((prev) => ({ ...prev, 'proof-2': true }));

      const state = useProofsStore.getState();
      expect(state.proofExtractionFailed['proof-1']).toBe(true);
      expect(state.proofExtractionFailed['proof-2']).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PROOF TOPIC LINKS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Proof Topic Links', () => {
    it('should set proof topic links with direct value', () => {
      const store = useProofsStore.getState();

      store.setProofTopicLinks({
        'proof-1': ['Topic A', 'Topic B'],
        'proof-2': ['Topic C']
      });

      const state = useProofsStore.getState();
      expect(state.proofTopicLinks['proof-1']).toEqual(['Topic A', 'Topic B']);
      expect(state.proofTopicLinks['proof-2']).toEqual(['Topic C']);
    });

    it('should set proof topic links with updater function', () => {
      const store = useProofsStore.getState();
      store.setProofTopicLinks({ 'proof-1': ['Topic A'] });

      store.setProofTopicLinks((prev) => ({ ...prev, 'proof-2': ['Topic B'] }));

      const state = useProofsStore.getState();
      expect(state.proofTopicLinks['proof-1']).toEqual(['Topic A']);
      expect(state.proofTopicLinks['proof-2']).toEqual(['Topic B']);
    });

    it('should link proof to topics via handler', () => {
      const store = useProofsStore.getState();

      store.handleLinkProof('proof-1', ['Topic 1', 'Topic 2']);

      expect(useProofsStore.getState().proofTopicLinks['proof-1']).toEqual(['Topic 1', 'Topic 2']);
    });

    it('should handle numeric proofId in handleLinkProof', () => {
      const store = useProofsStore.getState();

      store.handleLinkProof(99, ['Topic X']);

      expect(useProofsStore.getState().proofTopicLinks['99']).toEqual(['Topic X']);
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

    it('should handle unlinking from non-existent proof gracefully', () => {
      const store = useProofsStore.getState();

      store.handleUnlinkProof('nonexistent', 'Topic');

      expect(useProofsStore.getState().proofTopicLinks['nonexistent']).toBeUndefined();
    });

    it('should handle numeric proofId in handleUnlinkProof', () => {
      const store = useProofsStore.getState();
      store.handleLinkProof(55, ['Topic A', 'Topic B']);

      store.handleUnlinkProof(55, 'Topic A');

      expect(useProofsStore.getState().proofTopicLinks['55']).toEqual(['Topic B']);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PROOF ANALYSIS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Proof Analysis', () => {
    it('should add proof analysis with auto-generated id and timestamp', () => {
      const store = useProofsStore.getState();

      store.addProofAnalysis('proof-1', { type: 'contextual', result: 'Analysis result' });

      const analyses = useProofsStore.getState().proofAnalysisResults['proof-1'];
      expect(analyses).toHaveLength(1);
      expect(analyses[0].result).toBe('Analysis result');
      expect(analyses[0].type).toBe('contextual');
      expect(analyses[0].id).toBeDefined();
      expect(analyses[0].timestamp).toBeDefined();
    });

    it('should add multiple analyses to same proof', () => {
      const store = useProofsStore.getState();

      store.addProofAnalysis('proof-1', { type: 'contextual', result: 'Analysis 1' });
      store.addProofAnalysis('proof-1', { type: 'livre', result: 'Analysis 2' });
      store.addProofAnalysis('proof-1', { type: 'contextual', result: 'Analysis 3' });

      const analyses = useProofsStore.getState().proofAnalysisResults['proof-1'];
      expect(analyses).toHaveLength(3);
      expect(analyses[0].result).toBe('Analysis 1');
      expect(analyses[1].result).toBe('Analysis 2');
      expect(analyses[2].result).toBe('Analysis 3');
    });

    it('should enforce FIFO when exceeding MAX_PROOF_ANALYSES (5)', () => {
      const store = useProofsStore.getState();

      // Add 5 analyses
      store.addProofAnalysis('proof-1', { type: 'contextual', result: 'Analysis 1' });
      store.addProofAnalysis('proof-1', { type: 'contextual', result: 'Analysis 2' });
      store.addProofAnalysis('proof-1', { type: 'contextual', result: 'Analysis 3' });
      store.addProofAnalysis('proof-1', { type: 'contextual', result: 'Analysis 4' });
      store.addProofAnalysis('proof-1', { type: 'contextual', result: 'Analysis 5' });

      let analyses = useProofsStore.getState().proofAnalysisResults['proof-1'];
      expect(analyses).toHaveLength(5);
      expect(analyses[0].result).toBe('Analysis 1');

      // Add 6th analysis - should remove the oldest (Analysis 1)
      store.addProofAnalysis('proof-1', { type: 'livre', result: 'Analysis 6' });

      analyses = useProofsStore.getState().proofAnalysisResults['proof-1'];
      expect(analyses).toHaveLength(5);
      expect(analyses[0].result).toBe('Analysis 2'); // First one removed
      expect(analyses[4].result).toBe('Analysis 6'); // New one at the end
    });

    it('should generate unique id for each analysis', () => {
      const store = useProofsStore.getState();

      store.addProofAnalysis('proof-1', { type: 'contextual', result: 'Analysis 1' });
      store.addProofAnalysis('proof-1', { type: 'contextual', result: 'Analysis 2' });

      const analyses = useProofsStore.getState().proofAnalysisResults['proof-1'];
      expect(analyses[0].id).not.toBe(analyses[1].id);
    });

    it('should remove specific analysis by id', () => {
      const store = useProofsStore.getState();

      store.addProofAnalysis('proof-1', { type: 'contextual', result: 'Analysis 1' });
      store.addProofAnalysis('proof-1', { type: 'livre', result: 'Analysis 2' });
      store.addProofAnalysis('proof-1', { type: 'contextual', result: 'Analysis 3' });

      const analyses = useProofsStore.getState().proofAnalysisResults['proof-1'];
      const idToRemove = analyses[1].id;

      store.removeProofAnalysis('proof-1', idToRemove);

      const updatedAnalyses = useProofsStore.getState().proofAnalysisResults['proof-1'];
      expect(updatedAnalyses).toHaveLength(2);
      expect(updatedAnalyses[0].result).toBe('Analysis 1');
      expect(updatedAnalyses[1].result).toBe('Analysis 3');
    });

    it('should remove proof key when last analysis is deleted', () => {
      const store = useProofsStore.getState();

      store.addProofAnalysis('proof-1', { type: 'contextual', result: 'Only analysis' });

      const analyses = useProofsStore.getState().proofAnalysisResults['proof-1'];
      const idToRemove = analyses[0].id;

      store.removeProofAnalysis('proof-1', idToRemove);

      expect(useProofsStore.getState().proofAnalysisResults['proof-1']).toBeUndefined();
    });

    it('should handle removeProofAnalysis on non-existent proof gracefully', () => {
      const store = useProofsStore.getState();

      store.removeProofAnalysis('nonexistent', 'fake-id');

      expect(useProofsStore.getState().proofAnalysisResults['nonexistent']).toBeUndefined();
    });

    it('should handle analyses for multiple proofs independently', () => {
      const store = useProofsStore.getState();

      store.addProofAnalysis('proof-1', { type: 'contextual', result: 'Proof 1 Analysis' });
      store.addProofAnalysis('proof-2', { type: 'livre', result: 'Proof 2 Analysis' });

      const state = useProofsStore.getState();
      expect(state.proofAnalysisResults['proof-1']).toHaveLength(1);
      expect(state.proofAnalysisResults['proof-2']).toHaveLength(1);
      expect(state.proofAnalysisResults['proof-1'][0].result).toBe('Proof 1 Analysis');
      expect(state.proofAnalysisResults['proof-2'][0].result).toBe('Proof 2 Analysis');
    });

    it('should preserve topicTitle when provided', () => {
      const store = useProofsStore.getState();

      store.addProofAnalysis('proof-1', { type: 'contextual', result: 'Analysis', topicTitle: 'Horas Extras' });

      const analyses = useProofsStore.getState().proofAnalysisResults['proof-1'];
      expect(analyses[0].topicTitle).toBe('Horas Extras');
    });

    it('should set proof analysis results with direct value (non-updater)', () => {
      const store = useProofsStore.getState();

      const directResults = {
        'proof-1': [
          { id: 'a1', type: 'contextual' as const, result: 'Result 1', timestamp: '2024-01-01T00:00:00Z' },
          { id: 'a2', type: 'livre' as const, result: 'Result 2', timestamp: '2024-01-02T00:00:00Z' }
        ]
      };

      store.setProofAnalysisResults(directResults);

      const state = useProofsStore.getState();
      expect(state.proofAnalysisResults['proof-1']).toHaveLength(2);
      expect(state.proofAnalysisResults['proof-1'][0].id).toBe('a1');
      expect(state.proofAnalysisResults['proof-1'][1].id).toBe('a2');
    });

    it('should set proof analysis results with updater function', () => {
      const store = useProofsStore.getState();
      store.addProofAnalysis('proof-1', { type: 'contextual', result: 'Initial' });

      store.setProofAnalysisResults((prev) => {
        const updated = { ...prev };
        updated['proof-2'] = [{ id: 'new-id', type: 'livre', result: 'New', timestamp: '2024-01-01T00:00:00Z' }];
        return updated;
      });

      const state = useProofsStore.getState();
      expect(state.proofAnalysisResults['proof-1']).toHaveLength(1);
      expect(state.proofAnalysisResults['proof-2']).toHaveLength(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PROOF CONCLUSIONS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Proof Conclusions', () => {
    it('should set proof conclusions with direct value', () => {
      const store = useProofsStore.getState();

      store.setProofConclusions({
        'proof-1': 'Judge conclusion for proof 1'
      });

      expect(useProofsStore.getState().proofConclusions['proof-1']).toBe('Judge conclusion for proof 1');
    });

    it('should set proof conclusions with updater function', () => {
      const store = useProofsStore.getState();
      store.setProofConclusions({ 'proof-1': 'Conclusion 1' });

      store.setProofConclusions((prev) => ({ ...prev, 'proof-2': 'Conclusion 2' }));

      const state = useProofsStore.getState();
      expect(state.proofConclusions['proof-1']).toBe('Conclusion 1');
      expect(state.proofConclusions['proof-2']).toBe('Conclusion 2');
    });

    it('should save proof conclusion via handler', () => {
      const store = useProofsStore.getState();

      store.handleSaveProofConclusion('proof-1', 'New conclusion');

      expect(useProofsStore.getState().proofConclusions['proof-1']).toBe('New conclusion');
    });

    it('should handle numeric proofId in handleSaveProofConclusion', () => {
      const store = useProofsStore.getState();

      store.handleSaveProofConclusion(123, 'Numeric id conclusion');

      expect(useProofsStore.getState().proofConclusions['123']).toBe('Numeric id conclusion');
    });

    it('should delete conclusion when empty string', () => {
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

    it('should overwrite existing conclusion', () => {
      const store = useProofsStore.getState();
      store.handleSaveProofConclusion('proof-1', 'First conclusion');

      store.handleSaveProofConclusion('proof-1', 'Updated conclusion');

      expect(useProofsStore.getState().proofConclusions['proof-1']).toBe('Updated conclusion');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCESSING MODES TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Processing Modes', () => {
    it('should set proof processing modes with direct value', () => {
      const store = useProofsStore.getState();

      store.setProofProcessingModes({
        'proof-1': 'pdfjs' as ProcessingMode,
        'proof-2': 'tesseract' as ProcessingMode
      });

      const state = useProofsStore.getState();
      expect(state.proofProcessingModes['proof-1']).toBe('pdfjs');
      expect(state.proofProcessingModes['proof-2']).toBe('tesseract');
    });

    it('should set proof processing modes with updater function', () => {
      const store = useProofsStore.getState();
      store.setProofProcessingModes({ 'proof-1': 'pdfjs' as ProcessingMode });

      store.setProofProcessingModes((prev) => ({ ...prev, 'proof-2': 'claude-vision' as ProcessingMode }));

      const state = useProofsStore.getState();
      expect(state.proofProcessingModes['proof-1']).toBe('pdfjs');
      expect(state.proofProcessingModes['proof-2']).toBe('claude-vision');
    });

    it('should set proof send full content with direct value', () => {
      const store = useProofsStore.getState();

      store.setProofSendFullContent({ 'proof-1': true, 'proof-2': false });

      const state = useProofsStore.getState();
      expect(state.proofSendFullContent['proof-1']).toBe(true);
      expect(state.proofSendFullContent['proof-2']).toBe(false);
    });

    it('should set proof send full content with updater function', () => {
      const store = useProofsStore.getState();
      store.setProofSendFullContent({ 'proof-1': true });

      store.setProofSendFullContent((prev) => ({ ...prev, 'proof-2': true }));

      const state = useProofsStore.getState();
      expect(state.proofSendFullContent['proof-1']).toBe(true);
      expect(state.proofSendFullContent['proof-2']).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ATTACHMENT TESTS (v1.38.8)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Attachments - ProofFile', () => {
    it('should add attachment to a proof file', () => {
      const store = useProofsStore.getState();
      store.setProofFiles([createMockProofFile({ id: 'file-1' })]);

      const attachment = createMockAttachment({ id: 'att-1', name: 'impugnacao.pdf' });
      store.addAttachment('file-1', attachment);

      const state = useProofsStore.getState();
      expect(state.proofFiles[0].attachments).toHaveLength(1);
      expect(state.proofFiles[0].attachments![0].id).toBe('att-1');
      expect(state.proofFiles[0].attachments![0].name).toBe('impugnacao.pdf');
    });

    it('should add multiple attachments to same proof file', () => {
      const store = useProofsStore.getState();
      store.setProofFiles([createMockProofFile({ id: 'file-1' })]);

      store.addAttachment('file-1', createMockAttachment({ id: 'att-1' }));
      store.addAttachment('file-1', createMockAttachment({ id: 'att-2' }));
      store.addAttachment('file-1', createMockAttachment({ id: 'att-3' }));

      const state = useProofsStore.getState();
      expect(state.proofFiles[0].attachments).toHaveLength(3);
    });

    it('should initialize attachments array if not present on proof file', () => {
      const store = useProofsStore.getState();
      // Create a proof file without attachments property
      const file = createMockProofFile({ id: 'file-1' });
      delete (file as unknown as Record<string, unknown>).attachments;
      store.setProofFiles([file]);

      store.addAttachment('file-1', createMockAttachment({ id: 'att-1' }));

      const state = useProofsStore.getState();
      expect(state.proofFiles[0].attachments).toBeDefined();
      expect(state.proofFiles[0].attachments).toHaveLength(1);
    });

    it('should handle numeric proofId when adding attachment to file', () => {
      const store = useProofsStore.getState();
      store.setProofFiles([createMockProofFile({ id: 77 as unknown as string })]);

      store.addAttachment(77, createMockAttachment({ id: 'att-1' }));

      const state = useProofsStore.getState();
      expect(state.proofFiles[0].attachments).toHaveLength(1);
    });

    it('should remove attachment from proof file', () => {
      const store = useProofsStore.getState();
      const file = createMockProofFile({ id: 'file-1', attachments: [
        createMockAttachment({ id: 'att-1' }),
        createMockAttachment({ id: 'att-2' }),
        createMockAttachment({ id: 'att-3' })
      ]});
      store.setProofFiles([file]);

      store.removeAttachment('file-1', 'att-2');

      const state = useProofsStore.getState();
      expect(state.proofFiles[0].attachments).toHaveLength(2);
      expect(state.proofFiles[0].attachments![0].id).toBe('att-1');
      expect(state.proofFiles[0].attachments![1].id).toBe('att-3');
    });

    it('should update attachment extracted text on proof file', () => {
      const store = useProofsStore.getState();
      const file = createMockProofFile({ id: 'file-1', attachments: [
        createMockAttachment({ id: 'att-1' })
      ]});
      store.setProofFiles([file]);

      store.updateAttachmentExtractedText('file-1', 'att-1', 'Extracted content here');

      const state = useProofsStore.getState();
      expect(state.proofFiles[0].attachments![0].extractedText).toBe('Extracted content here');
    });

    it('should update attachment processing mode on proof file', () => {
      const store = useProofsStore.getState();
      const file = createMockProofFile({ id: 'file-1', attachments: [
        createMockAttachment({ id: 'att-1' })
      ]});
      store.setProofFiles([file]);

      store.updateAttachmentProcessingMode('file-1', 'att-1', 'tesseract');

      const state = useProofsStore.getState();
      expect(state.proofFiles[0].attachments![0].processingMode).toBe('tesseract');
    });

    it('should not modify state when removing non-existent attachment from file', () => {
      const store = useProofsStore.getState();
      const file = createMockProofFile({ id: 'file-1', attachments: [
        createMockAttachment({ id: 'att-1' })
      ]});
      store.setProofFiles([file]);

      store.removeAttachment('file-1', 'nonexistent');

      const state = useProofsStore.getState();
      expect(state.proofFiles[0].attachments).toHaveLength(1);
    });

    it('should not crash when updating text of non-existent attachment on file', () => {
      const store = useProofsStore.getState();
      const file = createMockProofFile({ id: 'file-1', attachments: [
        createMockAttachment({ id: 'att-1' })
      ]});
      store.setProofFiles([file]);

      // Should not throw
      store.updateAttachmentExtractedText('file-1', 'nonexistent', 'text');

      const state = useProofsStore.getState();
      expect(state.proofFiles[0].attachments![0].extractedText).toBeUndefined();
    });

    it('should not crash when updating mode of non-existent attachment on file', () => {
      const store = useProofsStore.getState();
      const file = createMockProofFile({ id: 'file-1', attachments: [
        createMockAttachment({ id: 'att-1' })
      ]});
      store.setProofFiles([file]);

      // Should not throw
      store.updateAttachmentProcessingMode('file-1', 'nonexistent', 'pdfjs');

      const state = useProofsStore.getState();
      expect(state.proofFiles[0].attachments![0].processingMode).toBeUndefined();
    });
  });

  describe('Attachments - ProofText', () => {
    it('should add attachment to a proof text', () => {
      const store = useProofsStore.getState();
      store.setProofTexts([createMockProofText({ id: 'text-1' })]);

      const attachment = createMockAttachment({ id: 'att-1', name: 'esclarecimento.pdf' });
      store.addAttachment('text-1', attachment);

      const state = useProofsStore.getState();
      expect(state.proofTexts[0].attachments).toHaveLength(1);
      expect(state.proofTexts[0].attachments![0].id).toBe('att-1');
    });

    it('should initialize attachments array if not present on proof text', () => {
      const store = useProofsStore.getState();
      const text = createMockProofText({ id: 'text-1' });
      delete (text as unknown as Record<string, unknown>).attachments;
      store.setProofTexts([text]);

      store.addAttachment('text-1', createMockAttachment({ id: 'att-1' }));

      const state = useProofsStore.getState();
      expect(state.proofTexts[0].attachments).toBeDefined();
      expect(state.proofTexts[0].attachments).toHaveLength(1);
    });

    it('should remove attachment from proof text', () => {
      const store = useProofsStore.getState();
      const text = createMockProofText({ id: 'text-1', attachments: [
        createMockAttachment({ id: 'att-1' }),
        createMockAttachment({ id: 'att-2' })
      ]});
      store.setProofTexts([text]);

      store.removeAttachment('text-1', 'att-1');

      const state = useProofsStore.getState();
      expect(state.proofTexts[0].attachments).toHaveLength(1);
      expect(state.proofTexts[0].attachments![0].id).toBe('att-2');
    });

    it('should update attachment extracted text on proof text', () => {
      const store = useProofsStore.getState();
      const text = createMockProofText({ id: 'text-1', attachments: [
        createMockAttachment({ id: 'att-1' })
      ]});
      store.setProofTexts([text]);

      store.updateAttachmentExtractedText('text-1', 'att-1', 'Extracted from text proof attachment');

      const state = useProofsStore.getState();
      expect(state.proofTexts[0].attachments![0].extractedText).toBe('Extracted from text proof attachment');
    });

    it('should update attachment processing mode on proof text', () => {
      const store = useProofsStore.getState();
      const text = createMockProofText({ id: 'text-1', attachments: [
        createMockAttachment({ id: 'att-1' })
      ]});
      store.setProofTexts([text]);

      store.updateAttachmentProcessingMode('text-1', 'att-1', 'claude-vision');

      const state = useProofsStore.getState();
      expect(state.proofTexts[0].attachments![0].processingMode).toBe('claude-vision');
    });

    it('should not modify state when removing non-existent attachment from text', () => {
      const store = useProofsStore.getState();
      const text = createMockProofText({ id: 'text-1', attachments: [
        createMockAttachment({ id: 'att-1' })
      ]});
      store.setProofTexts([text]);

      store.removeAttachment('text-1', 'nonexistent');

      const state = useProofsStore.getState();
      expect(state.proofTexts[0].attachments).toHaveLength(1);
    });

    it('should not crash when updating text of non-existent attachment on text proof', () => {
      const store = useProofsStore.getState();
      const text = createMockProofText({ id: 'text-1', attachments: [
        createMockAttachment({ id: 'att-1' })
      ]});
      store.setProofTexts([text]);

      store.updateAttachmentExtractedText('text-1', 'nonexistent', 'text');

      const state = useProofsStore.getState();
      expect(state.proofTexts[0].attachments![0].extractedText).toBeUndefined();
    });

    it('should not crash when updating mode of non-existent attachment on text proof', () => {
      const store = useProofsStore.getState();
      const text = createMockProofText({ id: 'text-1', attachments: [
        createMockAttachment({ id: 'att-1' })
      ]});
      store.setProofTexts([text]);

      store.updateAttachmentProcessingMode('text-1', 'nonexistent', 'pdfjs');

      const state = useProofsStore.getState();
      expect(state.proofTexts[0].attachments![0].processingMode).toBeUndefined();
    });
  });

  describe('Attachments - Priority (file over text)', () => {
    it('should add attachment to file when both file and text have same id', () => {
      const store = useProofsStore.getState();
      store.setProofFiles([createMockProofFile({ id: 'shared-id' })]);
      store.setProofTexts([createMockProofText({ id: 'shared-id' })]);

      store.addAttachment('shared-id', createMockAttachment({ id: 'att-1' }));

      const state = useProofsStore.getState();
      // File should get the attachment (searched first)
      expect(state.proofFiles[0].attachments).toHaveLength(1);
      expect(state.proofTexts[0].attachments).toBeUndefined();
    });

    it('should remove attachment from file when both file and text have same id', () => {
      const store = useProofsStore.getState();
      store.setProofFiles([createMockProofFile({ id: 'shared-id', attachments: [createMockAttachment({ id: 'att-1' })] })]);
      store.setProofTexts([createMockProofText({ id: 'shared-id', attachments: [createMockAttachment({ id: 'att-1' })] })]);

      store.removeAttachment('shared-id', 'att-1');

      const state = useProofsStore.getState();
      // File attachment removed (searched first), text attachment untouched
      expect(state.proofFiles[0].attachments).toHaveLength(0);
      expect(state.proofTexts[0].attachments).toHaveLength(1);
    });

    it('should update extracted text on file attachment when both have same id', () => {
      const store = useProofsStore.getState();
      store.setProofFiles([createMockProofFile({ id: 'shared-id', attachments: [createMockAttachment({ id: 'att-1' })] })]);
      store.setProofTexts([createMockProofText({ id: 'shared-id', attachments: [createMockAttachment({ id: 'att-1' })] })]);

      store.updateAttachmentExtractedText('shared-id', 'att-1', 'Updated text');

      const state = useProofsStore.getState();
      expect(state.proofFiles[0].attachments![0].extractedText).toBe('Updated text');
      expect(state.proofTexts[0].attachments![0].extractedText).toBeUndefined();
    });

    it('should update processing mode on file attachment when both have same id', () => {
      const store = useProofsStore.getState();
      store.setProofFiles([createMockProofFile({ id: 'shared-id', attachments: [createMockAttachment({ id: 'att-1' })] })]);
      store.setProofTexts([createMockProofText({ id: 'shared-id', attachments: [createMockAttachment({ id: 'att-1' })] })]);

      store.updateAttachmentProcessingMode('shared-id', 'att-1', 'pdf-puro');

      const state = useProofsStore.getState();
      expect(state.proofFiles[0].attachments![0].processingMode).toBe('pdf-puro');
      expect(state.proofTexts[0].attachments![0].processingMode).toBeUndefined();
    });

    it('should fall through to text when proofId not found in files', () => {
      const store = useProofsStore.getState();
      store.setProofFiles([createMockProofFile({ id: 'file-only' })]);
      store.setProofTexts([createMockProofText({ id: 'text-only' })]);

      store.addAttachment('text-only', createMockAttachment({ id: 'att-1' }));

      const state = useProofsStore.getState();
      expect(state.proofTexts[0].attachments).toHaveLength(1);
      expect(state.proofFiles[0].attachments).toBeUndefined();
    });

    it('should do nothing when proofId not found in either files or texts', () => {
      const store = useProofsStore.getState();
      store.setProofFiles([createMockProofFile({ id: 'file-1' })]);
      store.setProofTexts([createMockProofText({ id: 'text-1' })]);

      // Should not throw
      store.addAttachment('nonexistent', createMockAttachment({ id: 'att-1' }));
      store.removeAttachment('nonexistent', 'att-1');
      store.updateAttachmentExtractedText('nonexistent', 'att-1', 'text');
      store.updateAttachmentProcessingMode('nonexistent', 'att-1', 'pdfjs');

      // State unchanged
      const state = useProofsStore.getState();
      expect(state.proofFiles[0].attachments).toBeUndefined();
      expect(state.proofTexts[0].attachments).toBeUndefined();
    });
  });

  describe('Attachments - Edge Cases', () => {
    it('should handle removeAttachment when proof has no attachments array', () => {
      const store = useProofsStore.getState();
      const file = createMockProofFile({ id: 'file-1' });
      delete (file as unknown as Record<string, unknown>).attachments;
      store.setProofFiles([file]);

      // Should not throw
      store.removeAttachment('file-1', 'att-1');

      expect(useProofsStore.getState().proofFiles[0].attachments).toBeUndefined();
    });

    it('should handle updateAttachmentExtractedText when proof has no attachments array', () => {
      const store = useProofsStore.getState();
      const file = createMockProofFile({ id: 'file-1' });
      delete (file as unknown as Record<string, unknown>).attachments;
      store.setProofFiles([file]);

      // Should not throw
      store.updateAttachmentExtractedText('file-1', 'att-1', 'text');

      expect(useProofsStore.getState().proofFiles[0].attachments).toBeUndefined();
    });

    it('should handle updateAttachmentProcessingMode when proof has no attachments array', () => {
      const store = useProofsStore.getState();
      const file = createMockProofFile({ id: 'file-1' });
      delete (file as unknown as Record<string, unknown>).attachments;
      store.setProofFiles([file]);

      // Should not throw
      store.updateAttachmentProcessingMode('file-1', 'att-1', 'tesseract');

      expect(useProofsStore.getState().proofFiles[0].attachments).toBeUndefined();
    });

    it('should handle removeAttachment when text proof has no attachments array', () => {
      const store = useProofsStore.getState();
      const text = createMockProofText({ id: 'text-1' });
      delete (text as unknown as Record<string, unknown>).attachments;
      store.setProofTexts([text]);

      store.removeAttachment('text-1', 'att-1');

      expect(useProofsStore.getState().proofTexts[0].attachments).toBeUndefined();
    });

    it('should handle updateAttachmentExtractedText when text proof has no attachments', () => {
      const store = useProofsStore.getState();
      const text = createMockProofText({ id: 'text-1' });
      delete (text as unknown as Record<string, unknown>).attachments;
      store.setProofTexts([text]);

      store.updateAttachmentExtractedText('text-1', 'att-1', 'text');

      expect(useProofsStore.getState().proofTexts[0].attachments).toBeUndefined();
    });

    it('should handle updateAttachmentProcessingMode when text proof has no attachments', () => {
      const store = useProofsStore.getState();
      const text = createMockProofText({ id: 'text-1' });
      delete (text as unknown as Record<string, unknown>).attachments;
      store.setProofTexts([text]);

      store.updateAttachmentProcessingMode('text-1', 'att-1', 'tesseract');

      expect(useProofsStore.getState().proofTexts[0].attachments).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PERSISTENCE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Persistence', () => {
    it('should serialize all state for persistence', () => {
      const store = useProofsStore.getState();
      const files = [createMockProofFile({ id: 'file-1' })];
      const texts = [createMockProofText({ id: 'text-1' })];

      store.setProofFiles(files);
      store.setProofTexts(texts);
      store.setProofUsePdfMode({ 'file-1': true });
      store.setExtractedProofTexts({ 'file-1': 'Extracted' });
      store.setProofExtractionFailed({ 'file-1': false });
      store.setProofTopicLinks({ 'file-1': ['Topic A'] });
      store.addProofAnalysis('file-1', { type: 'contextual', result: 'Analysis' });
      store.setProofConclusions({ 'file-1': 'Conclusion' });
      store.setProofProcessingModes({ 'file-1': 'pdfjs' });
      store.setProofSendFullContent({ 'file-1': true });

      const serialized = store.serializeForPersistence();

      expect(serialized.proofFiles).toHaveLength(1);
      expect(serialized.proofTexts).toHaveLength(1);
      expect(serialized.proofUsePdfMode['file-1']).toBe(true);
      expect(serialized.extractedProofTexts['file-1']).toBe('Extracted');
      expect(serialized.proofExtractionFailed['file-1']).toBe(false);
      expect(serialized.proofTopicLinks['file-1']).toEqual(['Topic A']);
      expect(serialized.proofAnalysisResults['file-1']).toHaveLength(1);
      expect(serialized.proofConclusions['file-1']).toBe('Conclusion');
      expect(serialized.proofProcessingModes['file-1']).toBe('pdfjs');
      expect(serialized.proofSendFullContent['file-1']).toBe(true);
    });

    it('should serialize empty state correctly', () => {
      const store = useProofsStore.getState();

      const serialized = store.serializeForPersistence();

      expect(serialized.proofFiles).toEqual([]);
      expect(serialized.proofTexts).toEqual([]);
      expect(serialized.proofUsePdfMode).toEqual({});
      expect(serialized.extractedProofTexts).toEqual({});
      expect(serialized.proofExtractionFailed).toEqual({});
      expect(serialized.proofTopicLinks).toEqual({});
      expect(serialized.proofAnalysisResults).toEqual({});
      expect(serialized.proofConclusions).toEqual({});
      expect(serialized.proofProcessingModes).toEqual({});
      expect(serialized.proofSendFullContent).toEqual({});
    });

    it('should restore all fields from persistence', () => {
      const store = useProofsStore.getState();
      const data = {
        proofFiles: [createMockProofFile({ id: 'restored-file' })],
        proofTexts: [createMockProofText({ id: 'restored-text' })],
        proofUsePdfMode: { 'restored-file': false },
        extractedProofTexts: { 'restored-file': 'Restored text' },
        proofExtractionFailed: { 'restored-file': true },
        proofTopicLinks: { 'restored-file': ['Restored Topic'] },
        proofAnalysisResults: {
          'restored-file': [{ id: 'a1', type: 'livre', result: 'Restored analysis', timestamp: '2024-01-01T00:00:00Z' }]
        },
        proofConclusions: { 'restored-file': 'Restored conclusion' },
        proofProcessingModes: { 'restored-file': 'tesseract' },
        proofSendFullContent: { 'restored-file': true }
      };

      store.restoreFromPersistence(data);

      const state = useProofsStore.getState();
      expect(state.proofFiles[0].id).toBe('restored-file');
      expect(state.proofTexts[0].id).toBe('restored-text');
      expect(state.proofUsePdfMode['restored-file']).toBe(false);
      expect(state.extractedProofTexts['restored-file']).toBe('Restored text');
      expect(state.proofExtractionFailed['restored-file']).toBe(true);
      expect(state.proofTopicLinks['restored-file']).toEqual(['Restored Topic']);
      expect(state.proofAnalysisResults['restored-file']).toHaveLength(1);
      expect(state.proofConclusions['restored-file']).toBe('Restored conclusion');
      expect(state.proofProcessingModes['restored-file']).toBe('tesseract');
      expect(state.proofSendFullContent['restored-file']).toBe(true);
    });

    it('should handle null data in restore (no-op)', () => {
      const store = useProofsStore.getState();
      store.setProofFiles([createMockProofFile({ id: 'existing' })]);

      store.restoreFromPersistence(null);

      expect(useProofsStore.getState().proofFiles).toHaveLength(1);
      expect(useProofsStore.getState().proofFiles[0].id).toBe('existing');
    });

    it('should handle partial data in restore (only override provided fields)', () => {
      const store = useProofsStore.getState();
      store.setProofFiles([createMockProofFile({ id: 'old' })]);
      store.setProofTexts([createMockProofText({ id: 'old-text' })]);
      store.setProofConclusions({ 'old': 'Old conclusion' });

      store.restoreFromPersistence({
        proofFiles: [createMockProofFile({ id: 'new' })]
      });

      const state = useProofsStore.getState();
      expect(state.proofFiles[0].id).toBe('new');
      // Texts and conclusions should remain from before (not overwritten)
      expect(state.proofTexts[0].id).toBe('old-text');
      expect(state.proofConclusions['old']).toBe('Old conclusion');
    });

    it('should handle empty object in restore (no-op for missing fields)', () => {
      const store = useProofsStore.getState();
      store.setProofFiles([createMockProofFile({ id: 'existing' })]);

      store.restoreFromPersistence({});

      expect(useProofsStore.getState().proofFiles).toHaveLength(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // MIGRATION TESTS (v1.38.27: old single object -> new array format)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Migration - Old Format to Array', () => {
    it('should migrate old single-object analysis to array format', () => {
      const store = useProofsStore.getState();

      const oldFormatData = {
        proofAnalysisResults: {
          'proof-1': {
            type: 'contextual',
            result: 'Old analysis result',
            topicTitle: 'Horas Extras',
            timestamp: '2024-01-01T00:00:00Z'
          }
        }
      };

      store.restoreFromPersistence(oldFormatData);

      const state = useProofsStore.getState();
      const analyses = state.proofAnalysisResults['proof-1'];

      expect(Array.isArray(analyses)).toBe(true);
      expect(analyses).toHaveLength(1);
      expect(analyses[0].type).toBe('contextual');
      expect(analyses[0].result).toBe('Old analysis result');
      expect(analyses[0].topicTitle).toBe('Horas Extras');
      expect(analyses[0].timestamp).toBe('2024-01-01T00:00:00Z');
      expect(analyses[0].id).toBeDefined();
    });

    it('should handle new array format correctly (no migration needed)', () => {
      const store = useProofsStore.getState();

      const newFormatData = {
        proofAnalysisResults: {
          'proof-1': [
            {
              id: 'existing-id-1',
              type: 'contextual',
              result: 'Analysis 1',
              timestamp: '2024-01-01T00:00:00Z'
            },
            {
              id: 'existing-id-2',
              type: 'livre',
              result: 'Analysis 2',
              timestamp: '2024-01-02T00:00:00Z'
            }
          ]
        }
      };

      store.restoreFromPersistence(newFormatData);

      const state = useProofsStore.getState();
      const analyses = state.proofAnalysisResults['proof-1'];

      expect(analyses).toHaveLength(2);
      expect(analyses[0].id).toBe('existing-id-1');
      expect(analyses[1].id).toBe('existing-id-2');
    });

    it('should migrate multiple proofs with old format', () => {
      const store = useProofsStore.getState();

      const oldFormatData = {
        proofAnalysisResults: {
          'proof-1': {
            type: 'contextual',
            result: 'Analysis for proof 1'
          },
          'proof-2': {
            type: 'livre',
            result: 'Analysis for proof 2'
          }
        }
      };

      store.restoreFromPersistence(oldFormatData);

      const state = useProofsStore.getState();

      expect(state.proofAnalysisResults['proof-1']).toHaveLength(1);
      expect(state.proofAnalysisResults['proof-2']).toHaveLength(1);
      expect(state.proofAnalysisResults['proof-1'][0].result).toBe('Analysis for proof 1');
      expect(state.proofAnalysisResults['proof-2'][0].result).toBe('Analysis for proof 2');
    });

    it('should generate timestamp if missing in old format', () => {
      const store = useProofsStore.getState();

      const oldFormatData = {
        proofAnalysisResults: {
          'proof-1': {
            type: 'livre',
            result: 'Old analysis without timestamp'
          }
        }
      };

      store.restoreFromPersistence(oldFormatData);

      const state = useProofsStore.getState();
      const analysis = state.proofAnalysisResults['proof-1'][0];

      expect(analysis.timestamp).toBeDefined();
      expect(new Date(analysis.timestamp).toISOString()).toBe(analysis.timestamp);
    });

    it('should skip null/non-object analysis entries', () => {
      const store = useProofsStore.getState();

      const invalidData = {
        proofAnalysisResults: {
          'proof-1': null,
          'proof-2': 'string value',
          'proof-3': {
            type: 'contextual',
            result: 'Valid analysis'
          }
        }
      };

      store.restoreFromPersistence(invalidData);

      const state = useProofsStore.getState();
      // null and string entries should not produce entries
      expect(state.proofAnalysisResults['proof-1']).toBeUndefined();
      expect(state.proofAnalysisResults['proof-2']).toBeUndefined();
      // Valid entry should work
      expect(state.proofAnalysisResults['proof-3']).toBeDefined();
      expect(state.proofAnalysisResults['proof-3']).toHaveLength(1);
    });

    it('should handle mixed old and new format gracefully', () => {
      const store = useProofsStore.getState();

      const mixedData = {
        proofAnalysisResults: {
          'proof-1': {
            type: 'contextual',
            result: 'Old format'
          },
          'proof-2': [
            {
              id: 'new-id',
              type: 'livre',
              result: 'New format',
              timestamp: '2024-01-01T00:00:00Z'
            }
          ]
        }
      };

      store.restoreFromPersistence(mixedData);

      const state = useProofsStore.getState();
      expect(state.proofAnalysisResults['proof-1']).toHaveLength(1);
      expect(state.proofAnalysisResults['proof-2']).toHaveLength(1);
      expect(state.proofAnalysisResults['proof-1'][0].id).toBeDefined();
      expect(state.proofAnalysisResults['proof-2'][0].id).toBe('new-id');
    });

    it('should handle old format object with empty fields', () => {
      const store = useProofsStore.getState();

      const data = {
        proofAnalysisResults: {
          'proof-1': {
            type: 'contextual',
            result: ''
          }
        }
      };

      store.restoreFromPersistence(data);

      const state = useProofsStore.getState();
      // Empty result is still an object, so migration should proceed
      expect(state.proofAnalysisResults['proof-1']).toHaveLength(1);
      expect(state.proofAnalysisResults['proof-1'][0].result).toBe('');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RESET ALL TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Reset All', () => {
    it('should reset all data state to initial values', () => {
      const store = useProofsStore.getState();

      // Set various data state
      store.setProofFiles([createMockProofFile()]);
      store.setProofTexts([createMockProofText()]);
      store.setProofUsePdfMode({ 'proof-1': true });
      store.setExtractedProofTexts({ 'proof-1': 'Text' });
      store.setProofExtractionFailed({ 'proof-1': true });
      store.setProofTopicLinks({ 'proof-1': ['Topic'] });
      store.addProofAnalysis('proof-1', { type: 'contextual', result: 'Result' });
      store.setProofConclusions({ 'proof-1': 'Conclusion' });
      store.setProofProcessingModes({ 'proof-1': 'pdfjs' });
      store.setProofSendFullContent({ 'proof-1': true });

      store.resetAll();

      const state = useProofsStore.getState();
      expect(state.proofFiles).toEqual([]);
      expect(state.proofTexts).toEqual([]);
      expect(state.proofUsePdfMode).toEqual({});
      expect(state.extractedProofTexts).toEqual({});
      expect(state.proofExtractionFailed).toEqual({});
      expect(state.proofTopicLinks).toEqual({});
      expect(state.proofAnalysisResults).toEqual({});
      expect(state.proofConclusions).toEqual({});
      expect(state.proofProcessingModes).toEqual({});
      expect(state.proofSendFullContent).toEqual({});
    });

    it('should allow adding data after reset', () => {
      const store = useProofsStore.getState();
      store.setProofFiles([createMockProofFile({ id: 'before-reset' })]);

      store.resetAll();
      store.setProofFiles([createMockProofFile({ id: 'after-reset' })]);

      const state = useProofsStore.getState();
      expect(state.proofFiles).toHaveLength(1);
      expect(state.proofFiles[0].id).toBe('after-reset');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SELECTORS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Selectors', () => {
    it('selectProofFiles should return proof files', () => {
      const store = useProofsStore.getState();
      const files = [createMockProofFile({ id: 'sel-1' })];
      store.setProofFiles(files);

      const result = selectProofFiles(useProofsStore.getState());
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('sel-1');
    });

    it('selectProofTexts should return proof texts', () => {
      const store = useProofsStore.getState();
      const texts = [createMockProofText({ id: 'sel-text-1' })];
      store.setProofTexts(texts);

      const result = selectProofTexts(useProofsStore.getState());
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('sel-text-1');
    });

    it('selectProofTopicLinks should return topic links', () => {
      const store = useProofsStore.getState();
      store.setProofTopicLinks({ 'proof-1': ['Topic A'] });

      expect(selectProofTopicLinks(useProofsStore.getState())).toEqual({
        'proof-1': ['Topic A']
      });
    });

    it('selectProofAnalysisResults should return analysis results', () => {
      const store = useProofsStore.getState();
      store.addProofAnalysis('proof-1', { type: 'contextual', result: 'Result' });

      const results = selectProofAnalysisResults(useProofsStore.getState());
      expect(results['proof-1']).toHaveLength(1);
      expect(results['proof-1'][0].type).toBe('contextual');
      expect(results['proof-1'][0].result).toBe('Result');
    });

    it('selectors should return empty state when store is empty', () => {
      const state = useProofsStore.getState();
      expect(selectProofFiles(state)).toEqual([]);
      expect(selectProofTexts(state)).toEqual([]);
      expect(selectProofTopicLinks(state)).toEqual({});
      expect(selectProofAnalysisResults(state)).toEqual({});
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EDGE CASES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Edge Cases', () => {
    it('should handle empty proofFiles array in setProofFiles updater', () => {
      const store = useProofsStore.getState();

      store.setProofFiles((prev) => {
        expect(prev).toEqual([]);
        return [createMockProofFile({ id: 'first' })];
      });

      expect(useProofsStore.getState().proofFiles).toHaveLength(1);
    });

    it('should handle empty proofTexts array in setProofTexts updater', () => {
      const store = useProofsStore.getState();

      store.setProofTexts((prev) => {
        expect(prev).toEqual([]);
        return [createMockProofText({ id: 'first' })];
      });

      expect(useProofsStore.getState().proofTexts).toHaveLength(1);
    });

    it('should handle setting same value multiple times', () => {
      const store = useProofsStore.getState();
      const file = createMockProofFile({ id: 'dup' });

      store.setProofFiles([file]);
      store.setProofFiles([file]);

      expect(useProofsStore.getState().proofFiles).toHaveLength(1);
    });

    it('should handle concurrent operations on different proofs', () => {
      const store = useProofsStore.getState();

      store.handleLinkProof('proof-1', ['Topic A']);
      store.handleLinkProof('proof-2', ['Topic B']);
      store.handleSaveProofConclusion('proof-1', 'Conclusion 1');
      store.handleSaveProofConclusion('proof-2', 'Conclusion 2');
      store.handleToggleProofMode('proof-1', true);
      store.handleToggleProofMode('proof-2', false);

      const state = useProofsStore.getState();
      expect(state.proofTopicLinks['proof-1']).toEqual(['Topic A']);
      expect(state.proofTopicLinks['proof-2']).toEqual(['Topic B']);
      expect(state.proofConclusions['proof-1']).toBe('Conclusion 1');
      expect(state.proofConclusions['proof-2']).toBe('Conclusion 2');
      expect(state.proofUsePdfMode['proof-1']).toBe(true);
      expect(state.proofUsePdfMode['proof-2']).toBe(false);
    });

    it('should handle serialize/restore round-trip correctly', () => {
      const store = useProofsStore.getState();
      const file = createMockProofFile({ id: 'rt-file' });
      const text = createMockProofText({ id: 'rt-text' });

      store.setProofFiles([file]);
      store.setProofTexts([text]);
      store.handleLinkProof('rt-file', ['Topic RT']);
      store.handleSaveProofConclusion('rt-file', 'RT Conclusion');
      store.setProofProcessingModes({ 'rt-file': 'claude-vision' });
      store.setProofSendFullContent({ 'rt-file': true });

      const serialized = store.serializeForPersistence();

      // Reset and restore
      store.resetAll();
      store.restoreFromPersistence(serialized);

      const state = useProofsStore.getState();
      expect(state.proofFiles[0].id).toBe('rt-file');
      expect(state.proofTexts[0].id).toBe('rt-text');
      expect(state.proofTopicLinks['rt-file']).toEqual(['Topic RT']);
      expect(state.proofConclusions['rt-file']).toBe('RT Conclusion');
      expect(state.proofProcessingModes['rt-file']).toBe('claude-vision');
      expect(state.proofSendFullContent['rt-file']).toBe(true);
    });
  });
});
