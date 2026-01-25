/**
 * @file useUIStore.test.ts
 * @description Testes completos para o store de UI (Modal Registry Pattern v1.37.56)
 * Cobre: modais, text preview, toast, drive, feedback, formulario, exportacao,
 * double check review, modais diversos, e selectors.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  useUIStore,
  selectIsAnyModalOpen,
  selectModal,
  selectTextPreview,
  selectIsTextPreviewOpen,
  selectToast,
  selectIsToastVisible,
  selectDoubleCheckReview,
  selectIsDoubleCheckReviewOpen,
  selectDoubleCheckResult,
} from './useUIStore';
import type { DoubleCheckReviewData, DoubleCheckReviewResult, DriveFile } from '../types';

describe('useUIStore', () => {
  // Reset store before each test
  beforeEach(() => {
    const store = useUIStore.getState();
    store.closeAllModals();
    store.clearToast();
    store.setError(null);
    store.setTextPreview({ isOpen: false, title: '', text: '' });
    store.setDriveFilesList([]);
    store.setModelGeneratorTargetField(null);
    store.setAutoSaveDirty(false);
    store.setCopySuccess(false);
    store.setAnonymizationNamesText('');
    store.setPartesProcesso({ reclamante: '', reclamadas: [] });
    store.setProcessoNumero('');
    store.setExportedText('');
    store.setExportedHtml('');
    store.closeDoubleCheckReview();
    store.setDoubleCheckResult(null);
    store.setShowAnonymizationModal(false);
    store.setShowDataDownloadModal(false);
    store.setShowEmbeddingsDownloadModal(false);
    store.setDataDownloadStatus('idle');
    store.setEmbeddingsDownloadStatus('idle');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // MODAL REGISTRY - SYNC TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Modal Registry Sync', () => {
    it('should keep openModals array and modals object in sync on open', () => {
      useUIStore.getState().openModal('settings');

      const state = useUIStore.getState();
      expect(state.openModals).toContain('settings');
      expect(state.modals.settings).toBe(true);
    });

    it('should keep openModals array and modals object in sync on close', () => {
      useUIStore.getState().openModal('settings');
      useUIStore.getState().closeModal('settings');

      const state = useUIStore.getState();
      expect(state.openModals).not.toContain('settings');
      expect(state.modals.settings).toBe(false);
    });

    it('should handle opening multiple modals', () => {
      useUIStore.getState().openModal('settings');
      useUIStore.getState().openModal('export');
      useUIStore.getState().openModal('analysis');

      const state = useUIStore.getState();
      expect(state.openModals).toHaveLength(3);
      expect(state.openModals).toContain('settings');
      expect(state.openModals).toContain('export');
      expect(state.openModals).toContain('analysis');
      expect(state.modals.settings).toBe(true);
      expect(state.modals.export).toBe(true);
      expect(state.modals.analysis).toBe(true);
    });

    it('should handle closing multiple modals individually', () => {
      useUIStore.getState().openModal('settings');
      useUIStore.getState().openModal('export');
      useUIStore.getState().openModal('analysis');
      useUIStore.getState().closeModal('export');
      useUIStore.getState().closeModal('settings');

      const state = useUIStore.getState();
      expect(state.openModals).toHaveLength(1);
      expect(state.openModals).toContain('analysis');
      expect(state.modals.settings).toBe(false);
      expect(state.modals.export).toBe(false);
      expect(state.modals.analysis).toBe(true);
    });

    it('should open various modal keys correctly', () => {
      const keysToTest = [
        'modelForm', 'import', 'rename', 'merge', 'split',
        'newTopic', 'deleteTopic', 'aiAssistant', 'changelog',
      ] as const;

      for (const key of keysToTest) {
        useUIStore.getState().openModal(key);
        expect(useUIStore.getState().modals[key]).toBe(true);
      }

      expect(useUIStore.getState().openModals).toHaveLength(keysToTest.length);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DUPLICATE PREVENTION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Duplicate Prevention', () => {
    it('should not add duplicate modals to array', () => {
      useUIStore.getState().openModal('settings');
      useUIStore.getState().openModal('settings');
      useUIStore.getState().openModal('settings');

      const state = useUIStore.getState();
      expect(state.openModals.filter(m => m === 'settings')).toHaveLength(1);
    });

    it('should handle closing non-existent modal gracefully', () => {
      expect(() => useUIStore.getState().closeModal('settings')).not.toThrow();

      const state = useUIStore.getState();
      expect(state.openModals).toHaveLength(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CLOSE ALL MODALS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('closeAllModals', () => {
    it('should close all modals and reset array', () => {
      useUIStore.getState().openModal('settings');
      useUIStore.getState().openModal('export');
      useUIStore.getState().openModal('analysis');
      useUIStore.getState().closeAllModals();

      const state = useUIStore.getState();
      expect(state.openModals).toHaveLength(0);
    });

    it('should set all modals object values to false', () => {
      useUIStore.getState().openModal('settings');
      useUIStore.getState().openModal('export');
      useUIStore.getState().closeAllModals();

      const state = useUIStore.getState();
      expect(state.modals.settings).toBe(false);
      expect(state.modals.export).toBe(false);
      expect(state.modals.analysis).toBe(false);
      expect(state.modals.modelForm).toBe(false);
    });

    it('should work when no modals are open', () => {
      expect(() => useUIStore.getState().closeAllModals()).not.toThrow();
      expect(useUIStore.getState().openModals).toHaveLength(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TOGGLE MODAL
  // ═══════════════════════════════════════════════════════════════════════════

  describe('toggleModal', () => {
    it('should open modal if closed', () => {
      useUIStore.getState().toggleModal('settings');

      const state = useUIStore.getState();
      expect(state.openModals).toContain('settings');
      expect(state.modals.settings).toBe(true);
    });

    it('should close modal if open', () => {
      useUIStore.getState().openModal('settings');
      useUIStore.getState().toggleModal('settings');

      const state = useUIStore.getState();
      expect(state.openModals).not.toContain('settings');
      expect(state.modals.settings).toBe(false);
    });

    it('should toggle back and forth correctly', () => {
      useUIStore.getState().toggleModal('analysis');
      expect(useUIStore.getState().modals.analysis).toBe(true);

      useUIStore.getState().toggleModal('analysis');
      expect(useUIStore.getState().modals.analysis).toBe(false);

      useUIStore.getState().toggleModal('analysis');
      expect(useUIStore.getState().modals.analysis).toBe(true);
    });

    it('should not affect other modals when toggling', () => {
      useUIStore.getState().openModal('settings');
      useUIStore.getState().toggleModal('export');

      const state = useUIStore.getState();
      expect(state.modals.settings).toBe(true);
      expect(state.modals.export).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // IS MODAL OPEN
  // ═══════════════════════════════════════════════════════════════════════════

  describe('isModalOpen', () => {
    it('should return true for open modal', () => {
      useUIStore.getState().openModal('settings');
      expect(useUIStore.getState().isModalOpen('settings')).toBe(true);
    });

    it('should return false for closed modal', () => {
      expect(useUIStore.getState().isModalOpen('settings')).toBe(false);
    });

    it('should return false after modal is closed', () => {
      useUIStore.getState().openModal('settings');
      useUIStore.getState().closeModal('settings');
      expect(useUIStore.getState().isModalOpen('settings')).toBe(false);
    });

    it('should return correct state for multiple modals', () => {
      useUIStore.getState().openModal('settings');
      useUIStore.getState().openModal('export');

      expect(useUIStore.getState().isModalOpen('settings')).toBe(true);
      expect(useUIStore.getState().isModalOpen('export')).toBe(true);
      expect(useUIStore.getState().isModalOpen('analysis')).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEXT PREVIEW
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Text Preview', () => {
    it('should open text preview with title and text', () => {
      useUIStore.getState().openTextPreview('Test Title', 'Test content');

      const state = useUIStore.getState();
      expect(state.textPreview.isOpen).toBe(true);
      expect(state.textPreview.title).toBe('Test Title');
      expect(state.textPreview.text).toBe('Test content');
    });

    it('should close text preview and reset state', () => {
      useUIStore.getState().openTextPreview('Test Title', 'Test content');
      useUIStore.getState().closeTextPreview();

      const state = useUIStore.getState();
      expect(state.textPreview.isOpen).toBe(false);
      expect(state.textPreview.title).toBe('');
      expect(state.textPreview.text).toBe('');
    });

    it('should set text preview directly with setTextPreview', () => {
      const preview = { isOpen: true, title: 'Direct', text: 'Direct content' };
      useUIStore.getState().setTextPreview(preview);

      const state = useUIStore.getState();
      expect(state.textPreview).toEqual(preview);
    });

    it('should overwrite previous text preview on new open', () => {
      useUIStore.getState().openTextPreview('First', 'First content');
      useUIStore.getState().openTextPreview('Second', 'Second content');

      const state = useUIStore.getState();
      expect(state.textPreview.title).toBe('Second');
      expect(state.textPreview.text).toBe('Second content');
    });

    it('should handle empty strings for title and text', () => {
      useUIStore.getState().openTextPreview('', '');

      const state = useUIStore.getState();
      expect(state.textPreview.isOpen).toBe(true);
      expect(state.textPreview.title).toBe('');
      expect(state.textPreview.text).toBe('');
    });

    it('should handle long text content', () => {
      const longText = 'a'.repeat(10000);
      useUIStore.getState().openTextPreview('Long', longText);

      expect(useUIStore.getState().textPreview.text).toBe(longText);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TOAST
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Toast', () => {
    it('should show toast with message and default success type', () => {
      vi.useFakeTimers();
      useUIStore.getState().showToast('Test message');

      const state = useUIStore.getState();
      expect(state.toast.show).toBe(true);
      expect(state.toast.message).toBe('Test message');
      expect(state.toast.type).toBe('success');
    });

    it('should show toast with error type', () => {
      vi.useFakeTimers();
      useUIStore.getState().showToast('Error occurred', 'error');

      const state = useUIStore.getState();
      expect(state.toast.show).toBe(true);
      expect(state.toast.type).toBe('error');
    });

    it('should show toast with info type', () => {
      vi.useFakeTimers();
      useUIStore.getState().showToast('Info message', 'info');

      const state = useUIStore.getState();
      expect(state.toast.type).toBe('info');
    });

    it('should show toast with warning type', () => {
      vi.useFakeTimers();
      useUIStore.getState().showToast('Warning message', 'warning');

      const state = useUIStore.getState();
      expect(state.toast.type).toBe('warning');
    });

    it('should auto-hide toast after 4 seconds', () => {
      vi.useFakeTimers();
      useUIStore.getState().showToast('Test message');
      expect(useUIStore.getState().toast.show).toBe(true);

      vi.advanceTimersByTime(3999);
      expect(useUIStore.getState().toast.show).toBe(true);

      vi.advanceTimersByTime(1);
      expect(useUIStore.getState().toast.show).toBe(false);
    });

    it('should clear toast on clearToast', () => {
      vi.useFakeTimers();
      useUIStore.getState().showToast('Test message');
      useUIStore.getState().clearToast();

      const state = useUIStore.getState();
      expect(state.toast.show).toBe(false);
      expect(state.toast.message).toBe('');
      expect(state.toast.type).toBe('success');
    });

    it('should set toast directly with setToast', () => {
      const toastState = { show: true, message: 'Direct toast', type: 'warning' as const };
      useUIStore.getState().setToast(toastState);

      const state = useUIStore.getState();
      expect(state.toast).toEqual(toastState);
    });

    it('should replace existing toast when showing new one', () => {
      vi.useFakeTimers();
      useUIStore.getState().showToast('First', 'info');
      useUIStore.getState().showToast('Second', 'error');

      const state = useUIStore.getState();
      expect(state.toast.message).toBe('Second');
      expect(state.toast.type).toBe('error');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DRIVE STATE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Drive State', () => {
    it('should set drive files list', () => {
      const files: DriveFile[] = [
        { id: '1', name: 'file1.pdf', modifiedTime: '2024-01-01T00:00:00Z' },
        { id: '2', name: 'file2.pdf', modifiedTime: '2024-01-02T00:00:00Z' },
      ];
      useUIStore.getState().setDriveFilesList(files);

      expect(useUIStore.getState().driveFilesList).toEqual(files);
    });

    it('should replace drive files list on subsequent calls', () => {
      const files1: DriveFile[] = [
        { id: '1', name: 'file1.pdf', modifiedTime: '2024-01-01T00:00:00Z' },
      ];
      const files2: DriveFile[] = [
        { id: '2', name: 'file2.pdf', modifiedTime: '2024-01-02T00:00:00Z' },
      ];

      useUIStore.getState().setDriveFilesList(files1);
      useUIStore.getState().setDriveFilesList(files2);

      expect(useUIStore.getState().driveFilesList).toEqual(files2);
    });

    it('should set drive files list to empty array', () => {
      const files: DriveFile[] = [
        { id: '1', name: 'file1.pdf', modifiedTime: '2024-01-01T00:00:00Z' },
      ];
      useUIStore.getState().setDriveFilesList(files);
      useUIStore.getState().setDriveFilesList([]);

      expect(useUIStore.getState().driveFilesList).toEqual([]);
    });

    it('should set model generator target field', () => {
      useUIStore.getState().setModelGeneratorTargetField('ementa');

      expect(useUIStore.getState().modelGeneratorTargetField).toBe('ementa');
    });

    it('should set model generator target field to null', () => {
      useUIStore.getState().setModelGeneratorTargetField('ementa');
      useUIStore.getState().setModelGeneratorTargetField(null);

      expect(useUIStore.getState().modelGeneratorTargetField).toBeNull();
    });

    it('should open model generator with target field', () => {
      useUIStore.getState().openModelGenerator('dispositivo');

      const state = useUIStore.getState();
      expect(state.modals.modelGenerator).toBe(true);
      expect(state.modelGeneratorTargetField).toBe('dispositivo');
    });

    it('should close model generator and clear target field', () => {
      useUIStore.getState().openModelGenerator('dispositivo');
      useUIStore.getState().closeModelGenerator();

      const state = useUIStore.getState();
      expect(state.modals.modelGenerator).toBe(false);
      expect(state.modelGeneratorTargetField).toBeNull();
    });

    it('should overwrite target field when opening with different field', () => {
      useUIStore.getState().openModelGenerator('ementa');
      useUIStore.getState().openModelGenerator('fundamentacao');

      expect(useUIStore.getState().modelGeneratorTargetField).toBe('fundamentacao');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FEEDBACK STATE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Feedback State', () => {
    it('should set autoSaveDirty to true', () => {
      useUIStore.getState().setAutoSaveDirty(true);
      expect(useUIStore.getState().autoSaveDirty).toBe(true);
    });

    it('should set autoSaveDirty to false', () => {
      useUIStore.getState().setAutoSaveDirty(true);
      useUIStore.getState().setAutoSaveDirty(false);
      expect(useUIStore.getState().autoSaveDirty).toBe(false);
    });

    it('should set copySuccess to true', () => {
      useUIStore.getState().setCopySuccess(true);
      expect(useUIStore.getState().copySuccess).toBe(true);
    });

    it('should set copySuccess to false', () => {
      useUIStore.getState().setCopySuccess(true);
      useUIStore.getState().setCopySuccess(false);
      expect(useUIStore.getState().copySuccess).toBe(false);
    });

    it('should set error as string', () => {
      useUIStore.getState().setError('Something went wrong');
      expect(useUIStore.getState().error).toBe('Something went wrong');
    });

    it('should set error as object with type and message', () => {
      const errorObj = { type: 'network', message: 'Connection failed' };
      useUIStore.getState().setError(errorObj);
      expect(useUIStore.getState().error).toEqual(errorObj);
    });

    it('should clear error by setting to null', () => {
      useUIStore.getState().setError('Some error');
      useUIStore.getState().setError(null);
      expect(useUIStore.getState().error).toBeNull();
    });

    it('should replace existing error with new one', () => {
      useUIStore.getState().setError('First error');
      useUIStore.getState().setError('Second error');
      expect(useUIStore.getState().error).toBe('Second error');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FORM STATE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Form State', () => {
    it('should set anonymization names text', () => {
      useUIStore.getState().setAnonymizationNamesText('John Doe, Jane Smith');
      expect(useUIStore.getState().anonymizationNamesText).toBe('John Doe, Jane Smith');
    });

    it('should set anonymization names text to empty string', () => {
      useUIStore.getState().setAnonymizationNamesText('Some names');
      useUIStore.getState().setAnonymizationNamesText('');
      expect(useUIStore.getState().anonymizationNamesText).toBe('');
    });

    it('should set partes do processo', () => {
      const partes = { reclamante: 'Fulano de Tal', reclamadas: ['Empresa A', 'Empresa B'] };
      useUIStore.getState().setPartesProcesso(partes);
      expect(useUIStore.getState().partesProcesso).toEqual(partes);
    });

    it('should set partes do processo with empty reclamadas', () => {
      const partes = { reclamante: 'Fulano', reclamadas: [] as string[] };
      useUIStore.getState().setPartesProcesso(partes);
      expect(useUIStore.getState().partesProcesso).toEqual(partes);
    });

    it('should replace partes do processo on subsequent calls', () => {
      useUIStore.getState().setPartesProcesso({ reclamante: 'A', reclamadas: ['B'] });
      useUIStore.getState().setPartesProcesso({ reclamante: 'C', reclamadas: ['D', 'E'] });

      expect(useUIStore.getState().partesProcesso).toEqual({
        reclamante: 'C',
        reclamadas: ['D', 'E'],
      });
    });

    it('should set processo numero', () => {
      useUIStore.getState().setProcessoNumero('0001234-56.2024.5.01.0001');
      expect(useUIStore.getState().processoNumero).toBe('0001234-56.2024.5.01.0001');
    });

    it('should set processo numero to empty string', () => {
      useUIStore.getState().setProcessoNumero('12345');
      useUIStore.getState().setProcessoNumero('');
      expect(useUIStore.getState().processoNumero).toBe('');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPORT STATE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Export State', () => {
    it('should set exported text', () => {
      useUIStore.getState().setExportedText('Exported content here');
      expect(useUIStore.getState().exportedText).toBe('Exported content here');
    });

    it('should set exported text to empty string', () => {
      useUIStore.getState().setExportedText('Some text');
      useUIStore.getState().setExportedText('');
      expect(useUIStore.getState().exportedText).toBe('');
    });

    it('should set exported html', () => {
      const html = '<div><p>Exported HTML</p></div>';
      useUIStore.getState().setExportedHtml(html);
      expect(useUIStore.getState().exportedHtml).toBe(html);
    });

    it('should set exported html to empty string', () => {
      useUIStore.getState().setExportedHtml('<p>old</p>');
      useUIStore.getState().setExportedHtml('');
      expect(useUIStore.getState().exportedHtml).toBe('');
    });

    it('should handle long exported text', () => {
      const longText = 'paragraph '.repeat(5000);
      useUIStore.getState().setExportedText(longText);
      expect(useUIStore.getState().exportedText).toBe(longText);
    });

    it('should handle complex html content', () => {
      const complexHtml = '<html><head><title>Test</title></head><body><h1>Sentenca</h1><p>Conteudo</p></body></html>';
      useUIStore.getState().setExportedHtml(complexHtml);
      expect(useUIStore.getState().exportedHtml).toBe(complexHtml);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DOUBLE CHECK REVIEW
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Double Check Review', () => {
    const mockReviewData: DoubleCheckReviewData = {
      operation: 'topicExtraction',
      originalResult: 'Original text result',
      verifiedResult: 'Verified text result',
      corrections: [
        { type: 'add', reason: 'Missing topic', topic: 'Horas extras' },
        { type: 'remove', reason: 'Incorrect topic', topic: 'Ferias' },
      ],
      summary: 'Found 2 corrections',
      confidence: 0.85,
    };

    const mockReviewResult: DoubleCheckReviewResult = {
      selected: [{ type: 'add', reason: 'Missing topic', topic: 'Horas extras' }],
      finalResult: 'Final corrected result',
      operation: 'topicExtraction',
    };

    it('should open double check review with data', () => {
      useUIStore.getState().openDoubleCheckReview(mockReviewData);

      const state = useUIStore.getState();
      expect(state.doubleCheckReview).toEqual(mockReviewData);
    });

    it('should clear previous result when opening new review', () => {
      useUIStore.getState().setDoubleCheckResult(mockReviewResult);
      useUIStore.getState().openDoubleCheckReview(mockReviewData);

      expect(useUIStore.getState().doubleCheckResult).toBeNull();
    });

    it('should close double check review', () => {
      useUIStore.getState().openDoubleCheckReview(mockReviewData);
      useUIStore.getState().closeDoubleCheckReview();

      expect(useUIStore.getState().doubleCheckReview).toBeNull();
    });

    it('should set double check result', () => {
      useUIStore.getState().setDoubleCheckResult(mockReviewResult);

      expect(useUIStore.getState().doubleCheckResult).toEqual(mockReviewResult);
    });

    it('should clear double check result by setting null', () => {
      useUIStore.getState().setDoubleCheckResult(mockReviewResult);
      useUIStore.getState().setDoubleCheckResult(null);

      expect(useUIStore.getState().doubleCheckResult).toBeNull();
    });

    it('should handle dispositivo operation', () => {
      const dispositivoData: DoubleCheckReviewData = {
        ...mockReviewData,
        operation: 'dispositivo',
        corrections: [{ type: 'modify', reason: 'Wrong value', item: 'item1' }],
      };
      useUIStore.getState().openDoubleCheckReview(dispositivoData);

      expect(useUIStore.getState().doubleCheckReview?.operation).toBe('dispositivo');
    });

    it('should handle sentenceReview operation', () => {
      const sentenceData: DoubleCheckReviewData = {
        ...mockReviewData,
        operation: 'sentenceReview',
      };
      useUIStore.getState().openDoubleCheckReview(sentenceData);

      expect(useUIStore.getState().doubleCheckReview?.operation).toBe('sentenceReview');
    });

    it('should handle factsComparison operation', () => {
      const factsData: DoubleCheckReviewData = {
        ...mockReviewData,
        operation: 'factsComparison',
      };
      useUIStore.getState().openDoubleCheckReview(factsData);

      expect(useUIStore.getState().doubleCheckReview?.operation).toBe('factsComparison');
    });

    it('should handle proofAnalysis operation', () => {
      const proofData: DoubleCheckReviewData = {
        ...mockReviewData,
        operation: 'proofAnalysis',
      };
      useUIStore.getState().openDoubleCheckReview(proofData);

      expect(useUIStore.getState().doubleCheckReview?.operation).toBe('proofAnalysis');
    });

    it('should handle quickPrompt operation', () => {
      const quickData: DoubleCheckReviewData = {
        ...mockReviewData,
        operation: 'quickPrompt',
      };
      useUIStore.getState().openDoubleCheckReview(quickData);

      expect(useUIStore.getState().doubleCheckReview?.operation).toBe('quickPrompt');
    });

    it('should preserve review data when setting result', () => {
      useUIStore.getState().openDoubleCheckReview(mockReviewData);
      useUIStore.getState().setDoubleCheckResult(mockReviewResult);

      const state = useUIStore.getState();
      expect(state.doubleCheckReview).toEqual(mockReviewData);
      expect(state.doubleCheckResult).toEqual(mockReviewResult);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // MODALS DIVERSOS (ModalRoot v1.37.73)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Modais Diversos (ModalRoot)', () => {
    describe('Anonymization Modal', () => {
      it('should show anonymization modal', () => {
        useUIStore.getState().setShowAnonymizationModal(true);
        expect(useUIStore.getState().showAnonymizationModal).toBe(true);
      });

      it('should hide anonymization modal', () => {
        useUIStore.getState().setShowAnonymizationModal(true);
        useUIStore.getState().setShowAnonymizationModal(false);
        expect(useUIStore.getState().showAnonymizationModal).toBe(false);
      });
    });

    describe('Data Download Modal', () => {
      it('should show data download modal', () => {
        useUIStore.getState().setShowDataDownloadModal(true);
        expect(useUIStore.getState().showDataDownloadModal).toBe(true);
      });

      it('should hide data download modal', () => {
        useUIStore.getState().setShowDataDownloadModal(true);
        useUIStore.getState().setShowDataDownloadModal(false);
        expect(useUIStore.getState().showDataDownloadModal).toBe(false);
      });
    });

    describe('Embeddings Download Modal', () => {
      it('should show embeddings download modal', () => {
        useUIStore.getState().setShowEmbeddingsDownloadModal(true);
        expect(useUIStore.getState().showEmbeddingsDownloadModal).toBe(true);
      });

      it('should hide embeddings download modal', () => {
        useUIStore.getState().setShowEmbeddingsDownloadModal(true);
        useUIStore.getState().setShowEmbeddingsDownloadModal(false);
        expect(useUIStore.getState().showEmbeddingsDownloadModal).toBe(false);
      });
    });

    describe('Data Download Status', () => {
      it('should set data download status to downloading', () => {
        useUIStore.getState().setDataDownloadStatus('downloading');
        expect(useUIStore.getState().dataDownloadStatus).toBe('downloading');
      });

      it('should set data download status to done', () => {
        useUIStore.getState().setDataDownloadStatus('done');
        expect(useUIStore.getState().dataDownloadStatus).toBe('done');
      });

      it('should set data download status to error', () => {
        useUIStore.getState().setDataDownloadStatus('error');
        expect(useUIStore.getState().dataDownloadStatus).toBe('error');
      });

      it('should reset data download status to idle', () => {
        useUIStore.getState().setDataDownloadStatus('downloading');
        useUIStore.getState().setDataDownloadStatus('idle');
        expect(useUIStore.getState().dataDownloadStatus).toBe('idle');
      });

      it('should transition through all download states', () => {
        useUIStore.getState().setDataDownloadStatus('idle');
        expect(useUIStore.getState().dataDownloadStatus).toBe('idle');

        useUIStore.getState().setDataDownloadStatus('downloading');
        expect(useUIStore.getState().dataDownloadStatus).toBe('downloading');

        useUIStore.getState().setDataDownloadStatus('done');
        expect(useUIStore.getState().dataDownloadStatus).toBe('done');
      });
    });

    describe('Embeddings Download Status', () => {
      it('should set embeddings download status to downloading', () => {
        useUIStore.getState().setEmbeddingsDownloadStatus('downloading');
        expect(useUIStore.getState().embeddingsDownloadStatus).toBe('downloading');
      });

      it('should set embeddings download status to done', () => {
        useUIStore.getState().setEmbeddingsDownloadStatus('done');
        expect(useUIStore.getState().embeddingsDownloadStatus).toBe('done');
      });

      it('should set embeddings download status to error', () => {
        useUIStore.getState().setEmbeddingsDownloadStatus('error');
        expect(useUIStore.getState().embeddingsDownloadStatus).toBe('error');
      });

      it('should reset embeddings download status to idle', () => {
        useUIStore.getState().setEmbeddingsDownloadStatus('downloading');
        useUIStore.getState().setEmbeddingsDownloadStatus('idle');
        expect(useUIStore.getState().embeddingsDownloadStatus).toBe('idle');
      });

      it('should handle error then retry flow', () => {
        useUIStore.getState().setEmbeddingsDownloadStatus('downloading');
        useUIStore.getState().setEmbeddingsDownloadStatus('error');
        expect(useUIStore.getState().embeddingsDownloadStatus).toBe('error');

        // Retry
        useUIStore.getState().setEmbeddingsDownloadStatus('downloading');
        expect(useUIStore.getState().embeddingsDownloadStatus).toBe('downloading');

        useUIStore.getState().setEmbeddingsDownloadStatus('done');
        expect(useUIStore.getState().embeddingsDownloadStatus).toBe('done');
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SELECTORS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Selectors', () => {
    describe('selectIsAnyModalOpen', () => {
      it('should return false when no modals are open', () => {
        expect(selectIsAnyModalOpen(useUIStore.getState())).toBe(false);
      });

      it('should return true when a modal is open', () => {
        useUIStore.getState().openModal('settings');
        expect(selectIsAnyModalOpen(useUIStore.getState())).toBe(true);
      });

      it('should return false after all modals are closed', () => {
        useUIStore.getState().openModal('settings');
        useUIStore.getState().closeModal('settings');
        expect(selectIsAnyModalOpen(useUIStore.getState())).toBe(false);
      });

      it('should return true with multiple modals open', () => {
        useUIStore.getState().openModal('settings');
        useUIStore.getState().openModal('export');
        expect(selectIsAnyModalOpen(useUIStore.getState())).toBe(true);
      });

      it('should return false after closeAllModals', () => {
        useUIStore.getState().openModal('settings');
        useUIStore.getState().openModal('export');
        useUIStore.getState().closeAllModals();
        expect(selectIsAnyModalOpen(useUIStore.getState())).toBe(false);
      });
    });

    describe('selectModal', () => {
      it('should return false for closed modal', () => {
        expect(selectModal('settings')(useUIStore.getState())).toBe(false);
      });

      it('should return true for open modal', () => {
        useUIStore.getState().openModal('settings');
        expect(selectModal('settings')(useUIStore.getState())).toBe(true);
      });

      it('should differentiate between different modals', () => {
        useUIStore.getState().openModal('settings');
        expect(selectModal('settings')(useUIStore.getState())).toBe(true);
        expect(selectModal('export')(useUIStore.getState())).toBe(false);
      });
    });

    describe('selectTextPreview', () => {
      it('should return initial text preview state', () => {
        const preview = selectTextPreview(useUIStore.getState());
        expect(preview).toEqual({ isOpen: false, title: '', text: '' });
      });

      it('should return updated text preview state', () => {
        useUIStore.getState().openTextPreview('Title', 'Content');
        const preview = selectTextPreview(useUIStore.getState());
        expect(preview).toEqual({ isOpen: true, title: 'Title', text: 'Content' });
      });
    });

    describe('selectIsTextPreviewOpen', () => {
      it('should return false when text preview is closed', () => {
        expect(selectIsTextPreviewOpen(useUIStore.getState())).toBe(false);
      });

      it('should return true when text preview is open', () => {
        useUIStore.getState().openTextPreview('Title', 'Text');
        expect(selectIsTextPreviewOpen(useUIStore.getState())).toBe(true);
      });

      it('should return false after closing text preview', () => {
        useUIStore.getState().openTextPreview('Title', 'Text');
        useUIStore.getState().closeTextPreview();
        expect(selectIsTextPreviewOpen(useUIStore.getState())).toBe(false);
      });
    });

    describe('selectToast', () => {
      it('should return initial toast state', () => {
        const toast = selectToast(useUIStore.getState());
        expect(toast).toEqual({ show: false, message: '', type: 'success' });
      });

      it('should return updated toast state', () => {
        vi.useFakeTimers();
        useUIStore.getState().showToast('Hello', 'info');
        const toast = selectToast(useUIStore.getState());
        expect(toast).toEqual({ show: true, message: 'Hello', type: 'info' });
      });
    });

    describe('selectIsToastVisible', () => {
      it('should return false when toast is not visible', () => {
        expect(selectIsToastVisible(useUIStore.getState())).toBe(false);
      });

      it('should return true when toast is visible', () => {
        vi.useFakeTimers();
        useUIStore.getState().showToast('Test');
        expect(selectIsToastVisible(useUIStore.getState())).toBe(true);
      });

      it('should return false after clearToast', () => {
        vi.useFakeTimers();
        useUIStore.getState().showToast('Test');
        useUIStore.getState().clearToast();
        expect(selectIsToastVisible(useUIStore.getState())).toBe(false);
      });
    });

    describe('selectDoubleCheckReview', () => {
      it('should return null when no review is open', () => {
        expect(selectDoubleCheckReview(useUIStore.getState())).toBeNull();
      });

      it('should return review data when open', () => {
        const data: DoubleCheckReviewData = {
          operation: 'topicExtraction',
          originalResult: 'Original',
          verifiedResult: 'Verified',
          corrections: [],
          summary: 'Summary',
          confidence: 0.9,
        };
        useUIStore.getState().openDoubleCheckReview(data);
        expect(selectDoubleCheckReview(useUIStore.getState())).toEqual(data);
      });

      it('should return null after closing review', () => {
        const data: DoubleCheckReviewData = {
          operation: 'topicExtraction',
          originalResult: 'Original',
          verifiedResult: 'Verified',
          corrections: [],
          summary: 'Summary',
          confidence: 0.9,
        };
        useUIStore.getState().openDoubleCheckReview(data);
        useUIStore.getState().closeDoubleCheckReview();
        expect(selectDoubleCheckReview(useUIStore.getState())).toBeNull();
      });
    });

    describe('selectIsDoubleCheckReviewOpen', () => {
      it('should return false when no review is open', () => {
        expect(selectIsDoubleCheckReviewOpen(useUIStore.getState())).toBe(false);
      });

      it('should return true when review is open', () => {
        const data: DoubleCheckReviewData = {
          operation: 'dispositivo',
          originalResult: 'Original',
          verifiedResult: 'Verified',
          corrections: [],
          summary: 'Summary',
          confidence: 0.95,
        };
        useUIStore.getState().openDoubleCheckReview(data);
        expect(selectIsDoubleCheckReviewOpen(useUIStore.getState())).toBe(true);
      });

      it('should return false after closing review', () => {
        const data: DoubleCheckReviewData = {
          operation: 'dispositivo',
          originalResult: 'Original',
          verifiedResult: 'Verified',
          corrections: [],
          summary: 'Summary',
          confidence: 0.95,
        };
        useUIStore.getState().openDoubleCheckReview(data);
        useUIStore.getState().closeDoubleCheckReview();
        expect(selectIsDoubleCheckReviewOpen(useUIStore.getState())).toBe(false);
      });
    });

    describe('selectDoubleCheckResult', () => {
      it('should return null when no result exists', () => {
        expect(selectDoubleCheckResult(useUIStore.getState())).toBeNull();
      });

      it('should return result when set', () => {
        const result: DoubleCheckReviewResult = {
          selected: [],
          finalResult: 'Final',
          operation: 'topicExtraction',
        };
        useUIStore.getState().setDoubleCheckResult(result);
        expect(selectDoubleCheckResult(useUIStore.getState())).toEqual(result);
      });

      it('should return null after clearing result', () => {
        const result: DoubleCheckReviewResult = {
          selected: [],
          finalResult: 'Final',
          operation: 'topicExtraction',
        };
        useUIStore.getState().setDoubleCheckResult(result);
        useUIStore.getState().setDoubleCheckResult(null);
        expect(selectDoubleCheckResult(useUIStore.getState())).toBeNull();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIAL STATE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Initial State', () => {
    it('should have empty openModals array', () => {
      expect(useUIStore.getState().openModals).toEqual([]);
    });

    it('should have closed text preview', () => {
      expect(useUIStore.getState().textPreview.isOpen).toBe(false);
    });

    it('should have hidden toast', () => {
      expect(useUIStore.getState().toast.show).toBe(false);
    });

    it('should have empty drive files list', () => {
      expect(useUIStore.getState().driveFilesList).toEqual([]);
    });

    it('should have null model generator target field', () => {
      expect(useUIStore.getState().modelGeneratorTargetField).toBeNull();
    });

    it('should have false autoSaveDirty', () => {
      expect(useUIStore.getState().autoSaveDirty).toBe(false);
    });

    it('should have false copySuccess', () => {
      expect(useUIStore.getState().copySuccess).toBe(false);
    });

    it('should have null error', () => {
      expect(useUIStore.getState().error).toBeNull();
    });

    it('should have empty anonymizationNamesText', () => {
      expect(useUIStore.getState().anonymizationNamesText).toBe('');
    });

    it('should have empty partesProcesso', () => {
      expect(useUIStore.getState().partesProcesso).toEqual({ reclamante: '', reclamadas: [] });
    });

    it('should have empty processoNumero', () => {
      expect(useUIStore.getState().processoNumero).toBe('');
    });

    it('should have empty exportedText', () => {
      expect(useUIStore.getState().exportedText).toBe('');
    });

    it('should have empty exportedHtml', () => {
      expect(useUIStore.getState().exportedHtml).toBe('');
    });

    it('should have null doubleCheckReview', () => {
      expect(useUIStore.getState().doubleCheckReview).toBeNull();
    });

    it('should have null doubleCheckResult', () => {
      expect(useUIStore.getState().doubleCheckResult).toBeNull();
    });

    it('should have showAnonymizationModal as false', () => {
      expect(useUIStore.getState().showAnonymizationModal).toBe(false);
    });

    it('should have showDataDownloadModal as false', () => {
      expect(useUIStore.getState().showDataDownloadModal).toBe(false);
    });

    it('should have showEmbeddingsDownloadModal as false', () => {
      expect(useUIStore.getState().showEmbeddingsDownloadModal).toBe(false);
    });

    it('should have idle dataDownloadStatus', () => {
      expect(useUIStore.getState().dataDownloadStatus).toBe('idle');
    });

    it('should have idle embeddingsDownloadStatus', () => {
      expect(useUIStore.getState().embeddingsDownloadStatus).toBe('idle');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INTEGRATION / COMBINED ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Integration - Combined Actions', () => {
    it('should handle opening modal and toast simultaneously', () => {
      vi.useFakeTimers();
      useUIStore.getState().openModal('settings');
      useUIStore.getState().showToast('Settings opened', 'info');

      const state = useUIStore.getState();
      expect(state.modals.settings).toBe(true);
      expect(state.toast.show).toBe(true);
      expect(state.toast.message).toBe('Settings opened');
    });

    it('should handle text preview alongside modal', () => {
      useUIStore.getState().openModal('analysis');
      useUIStore.getState().openTextPreview('Analysis Preview', 'Preview content');

      const state = useUIStore.getState();
      expect(state.modals.analysis).toBe(true);
      expect(state.textPreview.isOpen).toBe(true);
    });

    it('should handle export workflow', () => {
      useUIStore.getState().setExportedText('Plain text content');
      useUIStore.getState().setExportedHtml('<p>HTML content</p>');
      useUIStore.getState().openModal('export');

      const state = useUIStore.getState();
      expect(state.exportedText).toBe('Plain text content');
      expect(state.exportedHtml).toBe('<p>HTML content</p>');
      expect(state.modals.export).toBe(true);
    });

    it('should handle download flow: open modal then start download', () => {
      useUIStore.getState().setShowDataDownloadModal(true);
      useUIStore.getState().setDataDownloadStatus('downloading');

      const state = useUIStore.getState();
      expect(state.showDataDownloadModal).toBe(true);
      expect(state.dataDownloadStatus).toBe('downloading');
    });

    it('should handle download completion and modal close', () => {
      useUIStore.getState().setShowEmbeddingsDownloadModal(true);
      useUIStore.getState().setEmbeddingsDownloadStatus('downloading');
      useUIStore.getState().setEmbeddingsDownloadStatus('done');
      useUIStore.getState().setShowEmbeddingsDownloadModal(false);

      const state = useUIStore.getState();
      expect(state.showEmbeddingsDownloadModal).toBe(false);
      expect(state.embeddingsDownloadStatus).toBe('done');
    });

    it('should handle error flow with toast notification', () => {
      vi.useFakeTimers();
      useUIStore.getState().setError({ type: 'api', message: 'API failure' });
      useUIStore.getState().showToast('API failure', 'error');

      const state = useUIStore.getState();
      expect(state.error).toEqual({ type: 'api', message: 'API failure' });
      expect(state.toast.show).toBe(true);
      expect(state.toast.type).toBe('error');
    });

    it('should handle form filling workflow', () => {
      useUIStore.getState().setProcessoNumero('0001234-56.2024.5.01.0001');
      useUIStore.getState().setPartesProcesso({
        reclamante: 'Joao Silva',
        reclamadas: ['Empresa ABC Ltda', 'Empresa XYZ S.A.'],
      });
      useUIStore.getState().setAnonymizationNamesText('Joao Silva, Maria Santos');

      const state = useUIStore.getState();
      expect(state.processoNumero).toBe('0001234-56.2024.5.01.0001');
      expect(state.partesProcesso.reclamante).toBe('Joao Silva');
      expect(state.partesProcesso.reclamadas).toHaveLength(2);
      expect(state.anonymizationNamesText).toBe('Joao Silva, Maria Santos');
    });

    it('should handle double check review complete workflow', () => {
      const reviewData: DoubleCheckReviewData = {
        operation: 'topicExtraction',
        originalResult: 'Original',
        verifiedResult: 'Verified',
        corrections: [{ type: 'add', reason: 'Missing', topic: 'Topic' }],
        summary: '1 correction',
        confidence: 0.9,
      };
      const reviewResult: DoubleCheckReviewResult = {
        selected: [{ type: 'add', reason: 'Missing', topic: 'Topic' }],
        finalResult: 'Corrected result',
        operation: 'topicExtraction',
      };

      // Open review
      useUIStore.getState().openDoubleCheckReview(reviewData);
      expect(useUIStore.getState().doubleCheckReview).toEqual(reviewData);

      // Set result
      useUIStore.getState().setDoubleCheckResult(reviewResult);
      expect(useUIStore.getState().doubleCheckResult).toEqual(reviewResult);

      // Close review
      useUIStore.getState().closeDoubleCheckReview();
      expect(useUIStore.getState().doubleCheckReview).toBeNull();
      // Result persists after close
      expect(useUIStore.getState().doubleCheckResult).toEqual(reviewResult);
    });

    it('should handle model generator workflow', () => {
      // Open model generator targeting a field
      useUIStore.getState().openModelGenerator('fundamentacao');
      expect(useUIStore.getState().modals.modelGenerator).toBe(true);
      expect(useUIStore.getState().modelGeneratorTargetField).toBe('fundamentacao');

      // Set drive files
      const files: DriveFile[] = [
        { id: '1', name: 'modelo.pdf', modifiedTime: '2024-01-01T00:00:00Z' },
      ];
      useUIStore.getState().setDriveFilesList(files);
      expect(useUIStore.getState().driveFilesList).toEqual(files);

      // Close model generator
      useUIStore.getState().closeModelGenerator();
      expect(useUIStore.getState().modals.modelGenerator).toBe(false);
      expect(useUIStore.getState().modelGeneratorTargetField).toBeNull();
    });

    it('should handle copy success flow', () => {
      vi.useFakeTimers();
      useUIStore.getState().setCopySuccess(true);
      useUIStore.getState().showToast('Copied!', 'success');

      expect(useUIStore.getState().copySuccess).toBe(true);
      expect(useUIStore.getState().toast.show).toBe(true);

      // Reset after timeout
      vi.advanceTimersByTime(4000);
      useUIStore.getState().setCopySuccess(false);

      expect(useUIStore.getState().copySuccess).toBe(false);
      expect(useUIStore.getState().toast.show).toBe(false);
    });

    it('should handle auto-save dirty flag with modal', () => {
      useUIStore.getState().setAutoSaveDirty(true);
      useUIStore.getState().openModal('clearProject');

      expect(useUIStore.getState().autoSaveDirty).toBe(true);
      expect(useUIStore.getState().modals.clearProject).toBe(true);

      // After saving
      useUIStore.getState().setAutoSaveDirty(false);
      useUIStore.getState().closeModal('clearProject');

      expect(useUIStore.getState().autoSaveDirty).toBe(false);
      expect(useUIStore.getState().modals.clearProject).toBe(false);
    });
  });
});
