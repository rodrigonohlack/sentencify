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

    it('should add multiple analyses to same proof (up to 5)', () => {
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

    it('should generate unique id and timestamp for each analysis', () => {
      const store = useProofsStore.getState();

      store.addProofAnalysis('proof-1', { type: 'contextual', result: 'Analysis 1' });
      store.addProofAnalysis('proof-1', { type: 'contextual', result: 'Analysis 2' });

      const analyses = useProofsStore.getState().proofAnalysisResults['proof-1'];
      expect(analyses[0].id).not.toBe(analyses[1].id);
      expect(analyses[0].timestamp).toBeDefined();
      expect(analyses[1].timestamp).toBeDefined();
    });

    it('should remove specific analysis by id', () => {
      const store = useProofsStore.getState();

      store.addProofAnalysis('proof-1', { type: 'contextual', result: 'Analysis 1' });
      store.addProofAnalysis('proof-1', { type: 'livre', result: 'Analysis 2' });
      store.addProofAnalysis('proof-1', { type: 'contextual', result: 'Analysis 3' });

      const analyses = useProofsStore.getState().proofAnalysisResults['proof-1'];
      const idToRemove = analyses[1].id; // Remove the middle one

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

      const state = useProofsStore.getState();
      expect(state.proofAnalysisResults['proof-1']).toBeUndefined();
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
    it('should reset all data state', () => {
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

  // ═══════════════════════════════════════════════════════════════════════════
  // MIGRATION TESTS (v1.38.27: old single object → new array format)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Migration - Old Format to Array', () => {
    it('should migrate old single-object analysis to array format', () => {
      const store = useProofsStore.getState();

      // Simulate old format (single object per proof)
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

      // Should be converted to array
      expect(Array.isArray(analyses)).toBe(true);
      expect(analyses).toHaveLength(1);
      expect(analyses[0].type).toBe('contextual');
      expect(analyses[0].result).toBe('Old analysis result');
      expect(analyses[0].topicTitle).toBe('Horas Extras');
      expect(analyses[0].id).toBeDefined(); // Should have generated ID
    });

    it('should handle new array format correctly (no migration needed)', () => {
      const store = useProofsStore.getState();

      // New format (already array)
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
            // No timestamp in old data
          }
        }
      };

      store.restoreFromPersistence(oldFormatData);

      const state = useProofsStore.getState();
      const analysis = state.proofAnalysisResults['proof-1'][0];

      expect(analysis.timestamp).toBeDefined();
      // Should be a valid ISO date
      expect(new Date(analysis.timestamp).toISOString()).toBe(analysis.timestamp);
    });

    it('should skip invalid analysis entries', () => {
      const store = useProofsStore.getState();

      const invalidData = {
        proofAnalysisResults: {
          'proof-1': {
            // Missing type and result - invalid
          },
          'proof-2': {
            type: 'contextual',
            result: 'Valid analysis'
          },
          'proof-3': null, // Invalid
          'proof-4': 'string value' // Invalid
        }
      };

      store.restoreFromPersistence(invalidData);

      const state = useProofsStore.getState();

      // Only proof-2 should have valid analysis
      expect(state.proofAnalysisResults['proof-2']).toBeDefined();
      expect(state.proofAnalysisResults['proof-2']).toHaveLength(1);
    });

    it('should handle mixed old and new format gracefully', () => {
      const store = useProofsStore.getState();

      const mixedData = {
        proofAnalysisResults: {
          'proof-1': {
            // Old format
            type: 'contextual',
            result: 'Old format'
          },
          'proof-2': [
            // New format
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

      // Both should work
      expect(state.proofAnalysisResults['proof-1']).toHaveLength(1);
      expect(state.proofAnalysisResults['proof-2']).toHaveLength(1);
      expect(state.proofAnalysisResults['proof-1'][0].id).toBeDefined(); // Generated
      expect(state.proofAnalysisResults['proof-2'][0].id).toBe('new-id'); // Preserved
    });
  });

});
