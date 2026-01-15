/**
 * @file useDecisionExport.test.ts
 * @description Testes para o hook de exportação de decisão
 * @version 1.37.57
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDecisionExport } from './useDecisionExport';
import type { Topic, TopicCategory } from '../types';

// Mock clipboard API - declare at module level
let mockClipboardWrite: ReturnType<typeof vi.fn>;
let mockClipboardWriteText: ReturnType<typeof vi.fn>;

describe('useDecisionExport', () => {
  // Mock topic factory
  const createMockTopic = (overrides: Partial<Topic> = {}): Topic => ({
    id: `topic-${Date.now()}-${Math.random()}`,
    title: 'TEST TOPIC',
    content: '',
    category: 'MÉRITO' as TopicCategory,
    relatorio: '',
    fundamentacao: '',
    dispositivo: '',
    ...overrides
  });

  // Mock props
  const mockSetError = vi.fn();
  const mockOpenModal = vi.fn();
  const mockSetExportedText = vi.fn();
  const mockSetExportedHtml = vi.fn();
  const mockSetCopySuccess = vi.fn();
  const mockCopyTimeoutRef = { current: null };

  const createDefaultProps = (selectedTopics: Topic[] = []) => ({
    selectedTopics,
    setError: mockSetError,
    openModal: mockOpenModal,
    setExportedText: mockSetExportedText,
    setExportedHtml: mockSetExportedHtml,
    setCopySuccess: mockSetCopySuccess,
    copyTimeoutRef: mockCopyTimeoutRef as any
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Create fresh mocks
    mockClipboardWrite = vi.fn().mockResolvedValue(undefined);
    mockClipboardWriteText = vi.fn().mockResolvedValue(undefined);

    // Set up navigator.clipboard
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        write: mockClipboardWrite,
        writeText: mockClipboardWriteText
      },
      writable: true,
      configurable: true
    });

    // Mock ClipboardItem
    global.ClipboardItem = vi.fn().mockImplementation((items) => items) as any;

    // Mock Blob (jsdom doesn't have a proper implementation)
    global.Blob = vi.fn().mockImplementation((content, options) => ({
      content,
      type: options?.type
    })) as any;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // HOOK RETURN TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Hook Return', () => {
    it('should return exportDecision function', () => {
      const { result } = renderHook(() =>
        useDecisionExport(createDefaultProps())
      );

      expect(result.current.exportDecision).toBeInstanceOf(Function);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPORT DECISION TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('exportDecision', () => {
    it('should set error when no topics selected', async () => {
      const { result } = renderHook(() =>
        useDecisionExport(createDefaultProps([]))
      );

      await act(async () => {
        await result.current.exportDecision();
      });

      expect(mockSetError).toHaveBeenCalledWith('Nenhum tópico selecionado para exportar');
      expect(mockOpenModal).not.toHaveBeenCalled();
    });

    it('should clear error before processing', async () => {
      const topics = [createMockTopic({ title: 'TOPIC 1', editedFundamentacao: 'Content' })];
      const { result } = renderHook(() =>
        useDecisionExport(createDefaultProps(topics))
      );

      await act(async () => {
        await result.current.exportDecision();
      });

      expect(mockSetError).toHaveBeenCalledWith('');
    });

    it('should set exported text and html', async () => {
      const topics = [
        createMockTopic({
          title: 'RELATÓRIO',
          editedRelatorio: '<p>Test relatorio</p>'
        })
      ];
      const { result } = renderHook(() =>
        useDecisionExport(createDefaultProps(topics))
      );

      await act(async () => {
        await result.current.exportDecision();
      });

      expect(mockSetExportedText).toHaveBeenCalled();
      expect(mockSetExportedHtml).toHaveBeenCalled();
    });

    it('should open export modal', async () => {
      const topics = [createMockTopic({ title: 'TOPIC', editedFundamentacao: 'Content' })];
      const { result } = renderHook(() =>
        useDecisionExport(createDefaultProps(topics))
      );

      await act(async () => {
        await result.current.exportDecision();
      });

      expect(mockOpenModal).toHaveBeenCalledWith('export');
    });

    it('should copy to clipboard and set success', async () => {
      const topics = [createMockTopic({ title: 'TOPIC', editedFundamentacao: 'Content' })];
      const { result } = renderHook(() =>
        useDecisionExport(createDefaultProps(topics))
      );

      await act(async () => {
        await result.current.exportDecision();
      });

      // Check that copy succeeded (either via write or writeText fallback)
      expect(mockSetCopySuccess).toHaveBeenCalledWith(true);
      // At least one clipboard method should have been attempted
      const clipboardAttempted = mockClipboardWrite.mock.calls.length > 0 ||
                                  mockClipboardWriteText.mock.calls.length > 0;
      expect(clipboardAttempted).toBe(true);
    });

    it('should fallback to writeText if clipboard.write fails', async () => {
      mockClipboardWrite.mockRejectedValueOnce(new Error('Not supported'));

      const topics = [createMockTopic({ title: 'TOPIC', editedFundamentacao: 'Content' })];
      const { result } = renderHook(() =>
        useDecisionExport(createDefaultProps(topics))
      );

      await act(async () => {
        await result.current.exportDecision();
      });

      expect(mockClipboardWriteText).toHaveBeenCalled();
      expect(mockSetCopySuccess).toHaveBeenCalledWith(true);
    });

    it('should set error if both clipboard methods fail', async () => {
      mockClipboardWrite.mockRejectedValueOnce(new Error('Not supported'));
      mockClipboardWriteText.mockRejectedValueOnce(new Error('Not supported'));

      const topics = [createMockTopic({ title: 'TOPIC', editedFundamentacao: 'Content' })];
      const { result } = renderHook(() =>
        useDecisionExport(createDefaultProps(topics))
      );

      await act(async () => {
        await result.current.exportDecision();
      });

      expect(mockSetError).toHaveBeenCalledWith('Não foi possível copiar automaticamente. Use o botão "Copiar Novamente" no modal.');
    });

    it('should reset copy success after timeout', async () => {
      const topics = [createMockTopic({ title: 'TOPIC', editedFundamentacao: 'Content' })];
      const { result } = renderHook(() =>
        useDecisionExport(createDefaultProps(topics))
      );

      await act(async () => {
        await result.current.exportDecision();
      });

      expect(mockSetCopySuccess).toHaveBeenCalledWith(true);

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(mockSetCopySuccess).toHaveBeenCalledWith(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TOPIC PROCESSING TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Topic Processing', () => {
    it('should handle RELATÓRIO topic with editedRelatorio', async () => {
      const topics = [
        createMockTopic({
          title: 'RELATÓRIO',
          editedRelatorio: '<p>Test relatorio content</p>'
        })
      ];
      const { result } = renderHook(() =>
        useDecisionExport(createDefaultProps(topics))
      );

      await act(async () => {
        await result.current.exportDecision();
      });

      const htmlCall = mockSetExportedHtml.mock.calls[0][0];
      expect(htmlCall).toContain('RELATÓRIO');
    });

    it('should handle RELATÓRIO topic with relatorio fallback', async () => {
      const topics = [
        createMockTopic({
          title: 'RELATÓRIO',
          relatorio: '<p>Fallback relatorio</p>',
          editedRelatorio: undefined
        })
      ];
      const { result } = renderHook(() =>
        useDecisionExport(createDefaultProps(topics))
      );

      await act(async () => {
        await result.current.exportDecision();
      });

      expect(mockSetExportedHtml).toHaveBeenCalled();
    });

    it('should handle DISPOSITIVO topic with editedContent', async () => {
      const topics = [
        createMockTopic({
          title: 'DISPOSITIVO',
          editedContent: '<p>Dispositivo content</p>'
        })
      ];
      const { result } = renderHook(() =>
        useDecisionExport(createDefaultProps(topics))
      );

      await act(async () => {
        await result.current.exportDecision();
      });

      const htmlCall = mockSetExportedHtml.mock.calls[0][0];
      expect(htmlCall).toContain('DISPOSITIVO');
    });

    it('should handle normal topic with mini-relatório and fundamentação', async () => {
      const topics = [
        createMockTopic({
          title: 'HORAS EXTRAS',
          editedRelatorio: '<p>Mini relatorio</p>',
          editedFundamentacao: '<p>Fundamentação</p>'
        })
      ];
      const { result } = renderHook(() =>
        useDecisionExport(createDefaultProps(topics))
      );

      await act(async () => {
        await result.current.exportDecision();
      });

      const htmlCall = mockSetExportedHtml.mock.calls[0][0];
      expect(htmlCall).toContain('HORAS EXTRAS');
    });

    it('should remove roman numerals from topic titles', async () => {
      const topics = [
        createMockTopic({
          title: 'I - PRELIMINAR',
          editedFundamentacao: '<p>Content</p>'
        })
      ];
      const { result } = renderHook(() =>
        useDecisionExport(createDefaultProps(topics))
      );

      await act(async () => {
        await result.current.exportDecision();
      });

      const htmlCall = mockSetExportedHtml.mock.calls[0][0];
      expect(htmlCall).toContain('PRELIMINAR');
      expect(htmlCall).not.toContain('I - PRELIMINAR');
    });

    it('should add FUNDAMENTAÇÃO header after first topic', async () => {
      const topics = [
        createMockTopic({ title: 'RELATÓRIO', editedRelatorio: '<p>R</p>' }),
        createMockTopic({ title: 'TOPIC 2', editedFundamentacao: '<p>F</p>' })
      ];
      const { result } = renderHook(() =>
        useDecisionExport(createDefaultProps(topics))
      );

      await act(async () => {
        await result.current.exportDecision();
      });

      const textCall = mockSetExportedText.mock.calls[0][0];
      expect(textCall).toContain('FUNDAMENTAÇÃO');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // HTML STRUCTURE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('HTML Structure', () => {
    it('should include DOCTYPE and html structure', async () => {
      const topics = [createMockTopic({ title: 'TOPIC', editedFundamentacao: 'C' })];
      const { result } = renderHook(() =>
        useDecisionExport(createDefaultProps(topics))
      );

      await act(async () => {
        await result.current.exportDecision();
      });

      const htmlCall = mockSetExportedHtml.mock.calls[0][0];
      expect(htmlCall).toContain('<!DOCTYPE html>');
      expect(htmlCall).toContain('<html>');
      expect(htmlCall).toContain('</html>');
    });

    it('should include SENTENÇA title in h1', async () => {
      const topics = [createMockTopic({ title: 'TOPIC', editedFundamentacao: 'C' })];
      const { result } = renderHook(() =>
        useDecisionExport(createDefaultProps(topics))
      );

      await act(async () => {
        await result.current.exportDecision();
      });

      const htmlCall = mockSetExportedHtml.mock.calls[0][0];
      expect(htmlCall).toContain('<h1');
      expect(htmlCall).toContain('SENTENÇA');
    });

    it('should include CSS styles for proper formatting', async () => {
      const topics = [createMockTopic({ title: 'TOPIC', editedFundamentacao: 'C' })];
      const { result } = renderHook(() =>
        useDecisionExport(createDefaultProps(topics))
      );

      await act(async () => {
        await result.current.exportDecision();
      });

      const htmlCall = mockSetExportedHtml.mock.calls[0][0];
      expect(htmlCall).toContain('<style>');
      expect(htmlCall).toContain('font-family');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PLAIN TEXT TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Plain Text Output', () => {
    it('should start with SENTENÇA header', async () => {
      const topics = [createMockTopic({ title: 'TOPIC', editedFundamentacao: 'C' })];
      const { result } = renderHook(() =>
        useDecisionExport(createDefaultProps(topics))
      );

      await act(async () => {
        await result.current.exportDecision();
      });

      const textCall = mockSetExportedText.mock.calls[0][0];
      expect(textCall).toMatch(/^SENTENÇA/);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CALLBACK STABILITY TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Callback Stability', () => {
    it('exportDecision should be stable when dependencies unchanged', () => {
      const props = createDefaultProps([]);
      const { result, rerender } = renderHook(
        (p) => useDecisionExport(p),
        { initialProps: props }
      );

      const first = result.current.exportDecision;
      rerender(props);
      const second = result.current.exportDecision;

      expect(first).toBe(second);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ERROR HANDLING TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Error Handling', () => {
    it('should handle general errors gracefully', async () => {
      // Force an error by making selectedTopics.forEach throw
      const badTopics = {
        length: 1,
        forEach: () => { throw new Error('Test error'); }
      } as any;

      const { result } = renderHook(() =>
        useDecisionExport(createDefaultProps(badTopics))
      );

      await act(async () => {
        await result.current.exportDecision();
      });

      expect(mockSetError).toHaveBeenCalledWith(expect.stringContaining('Erro ao exportar decisão'));
    });
  });
});
