/**
 * @file useExportImport.test.ts
 * @description Testes para o hook de exportação/importação
 * @version 1.37.57
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useExportImport } from './useExportImport';
import type { Model, AISettings } from '../types';

// Mock AIModelService
vi.mock('../services/AIModelService', () => ({
  default: {
    getEmbedding: vi.fn().mockResolvedValue(new Array(768).fill(0.1))
  }
}));

// Mock clipboard API
let mockClipboardWriteText: ReturnType<typeof vi.fn>;

// Mock URL
const mockCreateObjectURL = vi.fn().mockReturnValue('blob:test-url');
const mockRevokeObjectURL = vi.fn();

describe('useExportImport', () => {
  // Mock model factory
  const createMockModel = (overrides: Partial<Model> = {}): Model => ({
    id: `model-${Date.now()}-${Math.random()}`,
    title: 'Test Model',
    content: '<p>Test content</p>',
    keywords: 'test, keywords',
    category: 'MÉRITO',
    createdAt: new Date().toISOString(),
    ...overrides
  });

  // Mock AI settings
  const createMockAISettings = (overrides: Partial<AISettings> = {}): AISettings => ({
    model: 'claude-sonnet-4-20250514',
    useExtendedThinking: false,
    customPrompt: '',
    modeloRelatorio: '',
    modeloDispositivo: '',
    modeloTopicoRelatorio: '',
    topicosComplementares: [],
    ...overrides
  } as AISettings);

  // Mock props
  const mockSetModels = vi.fn();
  const mockSetHasUnsavedChanges = vi.fn();
  const mockSetAiSettings = vi.fn();
  const mockTrackChangeBatch = vi.fn();
  const mockShowToast = vi.fn();
  const mockSetError = vi.fn();
  const mockGenerateModelId = vi.fn().mockReturnValue('generated-id');

  const createDefaultProps = (overrides: any = {}) => ({
    modelLibrary: {
      models: overrides.models || [],
      selectedCategory: overrides.selectedCategory || 'all',
      setModels: mockSetModels,
      setHasUnsavedChanges: mockSetHasUnsavedChanges
    },
    aiIntegration: {
      aiSettings: overrides.aiSettings || createMockAISettings(),
      setAiSettings: mockSetAiSettings
    },
    cloudSync: overrides.cloudSync === null ? null : {
      trackChangeBatch: mockTrackChangeBatch,
      ...overrides.cloudSync
    },
    searchModelReady: overrides.searchModelReady ?? true,
    showToast: mockShowToast,
    setError: mockSetError,
    generateModelId: mockGenerateModelId
  });

  // Mock DOM elements
  let mockAnchor: HTMLAnchorElement;
  let originalCreateElement: typeof document.createElement;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup clipboard mock
    mockClipboardWriteText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockClipboardWriteText },
      writable: true,
      configurable: true
    });

    // Setup URL mock
    global.URL.createObjectURL = mockCreateObjectURL;
    global.URL.revokeObjectURL = mockRevokeObjectURL;

    // Don't mock Blob - jsdom has a native implementation

    // Setup DOM mock for anchor only - preserve other createElement calls
    originalCreateElement = document.createElement.bind(document);
    mockAnchor = originalCreateElement('a');
    mockAnchor.click = vi.fn();

    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'a') return mockAnchor;
      return originalCreateElement(tagName);
    });

    vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
    vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // HOOK RETURN TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Hook Return', () => {
    it('should return all export/import functions', () => {
      const { result } = renderHook(() => useExportImport(createDefaultProps()));

      expect(result.current.exportAiSettings).toBeInstanceOf(Function);
      expect(result.current.importAiSettings).toBeInstanceOf(Function);
      expect(result.current.exportModels).toBeInstanceOf(Function);
      expect(result.current.importModels).toBeInstanceOf(Function);
      expect(result.current.checkDuplicate).toBeInstanceOf(Function);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CHECK DUPLICATE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('checkDuplicate', () => {
    it('should detect duplicate by title and category', () => {
      const existingModels = [
        createMockModel({ id: 'existing-1', title: 'Test Model', category: 'MÉRITO' })
      ];
      const { result } = renderHook(() => useExportImport(createDefaultProps({ models: existingModels })));

      const dupCheck = result.current.checkDuplicate(
        { title: 'Test Model', content: 'Different content', category: 'MÉRITO' },
        existingModels
      );

      expect(dupCheck.isDuplicate).toBe(true);
      expect(dupCheck.reason).toBe('Mesmo título e categoria');
      expect(dupCheck.existingId).toBe('existing-1');
    });

    it('should detect duplicate by content', () => {
      const existingModels = [
        createMockModel({ id: 'existing-1', title: 'Original Title', content: '<p>Same content</p>' })
      ];
      const { result } = renderHook(() => useExportImport(createDefaultProps({ models: existingModels })));

      const dupCheck = result.current.checkDuplicate(
        { title: 'Different Title', content: '<p>Same content</p>', category: 'OUTRO' },
        existingModels
      );

      expect(dupCheck.isDuplicate).toBe(true);
      expect(dupCheck.reason).toBe('Conteúdo idêntico (título diferente)');
    });

    it('should not flag non-duplicate', () => {
      const existingModels = [
        createMockModel({ id: 'existing-1', title: 'Existing', content: '<p>Content A</p>' })
      ];
      const { result } = renderHook(() => useExportImport(createDefaultProps({ models: existingModels })));

      const dupCheck = result.current.checkDuplicate(
        { title: 'New Model', content: '<p>Content B</p>' },
        existingModels
      );

      expect(dupCheck.isDuplicate).toBe(false);
    });

    it('should normalize content for comparison', () => {
      const existingModels = [
        createMockModel({ id: 'existing-1', content: '  SAME   CONTENT  ' })
      ];
      const { result } = renderHook(() => useExportImport(createDefaultProps({ models: existingModels })));

      const dupCheck = result.current.checkDuplicate(
        { title: 'New', content: 'same content' },
        existingModels
      );

      expect(dupCheck.isDuplicate).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPORT AI SETTINGS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('exportAiSettings', () => {
    it('should export settings to clipboard and download', async () => {
      const aiSettings = createMockAISettings({ customPrompt: 'My custom prompt' });
      const { result } = renderHook(() => useExportImport(createDefaultProps({ aiSettings })));

      await act(async () => {
        await result.current.exportAiSettings();
      });

      expect(mockClipboardWriteText).toHaveBeenCalledWith(
        expect.stringContaining('customPrompt')
      );
      expect(mockAnchor.click).toHaveBeenCalled();
      expect(mockAnchor.download).toMatch(/sentencify-configuracoes-.*\.json/);
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringContaining('Configurações exportadas'),
        'success'
      );
    });

    it('should handle export errors', async () => {
      mockClipboardWriteText.mockRejectedValueOnce(new Error('Clipboard error'));
      const { result } = renderHook(() => useExportImport(createDefaultProps()));

      await act(async () => {
        await result.current.exportAiSettings();
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringContaining('Erro ao exportar'),
        'error'
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // IMPORT AI SETTINGS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('importAiSettings', () => {
    it('should import valid settings', async () => {
      const importedSettings = { customPrompt: 'Imported prompt', useExtendedThinking: true };
      const mockFile = {
        text: vi.fn().mockResolvedValue(JSON.stringify(importedSettings))
      };
      const mockEvent = {
        target: { files: [mockFile], value: 'file.json' }
      } as any;

      const { result } = renderHook(() => useExportImport(createDefaultProps()));

      await act(async () => {
        await result.current.importAiSettings(mockEvent);
      });

      expect(mockSetAiSettings).toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledWith(
        'Configurações importadas com sucesso!',
        'success'
      );
    });

    it('should reject non-object files', async () => {
      const mockFile = {
        text: vi.fn().mockResolvedValue('"not an object"')
      };
      const mockEvent = {
        target: { files: [mockFile], value: 'file.json' }
      } as any;

      const { result } = renderHook(() => useExportImport(createDefaultProps()));

      await act(async () => {
        await result.current.importAiSettings(mockEvent);
      });

      expect(mockShowToast).toHaveBeenCalledWith('Arquivo inválido.', 'error');
    });

    it('should handle missing file gracefully', async () => {
      const mockEvent = {
        target: { files: null, value: '' }
      } as any;

      const { result } = renderHook(() => useExportImport(createDefaultProps()));

      await act(async () => {
        await result.current.importAiSettings(mockEvent);
      });

      expect(mockSetAiSettings).not.toHaveBeenCalled();
    });

    it('should handle parse errors', async () => {
      const mockFile = {
        text: vi.fn().mockResolvedValue('invalid json')
      };
      const mockEvent = {
        target: { files: [mockFile], value: 'file.json' }
      } as any;

      const { result } = renderHook(() => useExportImport(createDefaultProps()));

      await act(async () => {
        await result.current.importAiSettings(mockEvent);
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringContaining('Erro ao importar'),
        'error'
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPORT MODELS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('exportModels', () => {
    it('should export all models when category is "all"', async () => {
      const models = [
        createMockModel({ title: 'Model 1', category: 'MÉRITO' }),
        createMockModel({ title: 'Model 2', category: 'PRELIMINAR' })
      ];
      const { result } = renderHook(() => useExportImport(createDefaultProps({
        models,
        selectedCategory: 'all'
      })));

      await act(async () => {
        await result.current.exportModels();
      });

      expect(mockClipboardWriteText).toHaveBeenCalledWith(
        expect.stringContaining('Model 1')
      );
      expect(mockClipboardWriteText).toHaveBeenCalledWith(
        expect.stringContaining('Model 2')
      );
      expect(mockSetHasUnsavedChanges).toHaveBeenCalledWith(false);
    });

    it('should export filtered models by category', async () => {
      const models = [
        createMockModel({ title: 'Merit Model', category: 'MÉRITO' }),
        createMockModel({ title: 'Prelim Model', category: 'PRELIMINAR' })
      ];
      const { result } = renderHook(() => useExportImport(createDefaultProps({
        models,
        selectedCategory: 'MÉRITO'
      })));

      await act(async () => {
        await result.current.exportModels();
      });

      const exportedData = mockClipboardWriteText.mock.calls[0][0];
      expect(exportedData).toContain('Merit Model');
      expect(exportedData).not.toContain('Prelim Model');
    });

    it('should show success toast with count', async () => {
      const models = [createMockModel(), createMockModel(), createMockModel()];
      const { result } = renderHook(() => useExportImport(createDefaultProps({ models })));

      await act(async () => {
        await result.current.exportModels();
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringContaining('3 modelo(s) exportado(s)'),
        'success'
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // IMPORT MODELS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('importModels', () => {
    it('should import valid models', async () => {
      const importedModels = [
        { title: 'New Model 1', content: '<p>Content 1</p>' },
        { title: 'New Model 2', content: '<p>Content 2</p>' }
      ];
      const mockFile = {
        text: vi.fn().mockResolvedValue(JSON.stringify(importedModels))
      };
      const mockEvent = {
        target: { files: [mockFile], value: 'file.json' }
      } as any;

      const { result } = renderHook(() => useExportImport(createDefaultProps()));

      await act(async () => {
        await result.current.importModels(mockEvent);
      });

      expect(mockSetModels).toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringContaining('2 modelo(s) importado(s)'),
        'success'
      );
    });

    it('should skip duplicate models', async () => {
      const existingModels = [
        createMockModel({ title: 'Existing', content: '<p>Existing content</p>', category: 'MÉRITO' })
      ];
      const importedModels = [
        { title: 'Existing', content: '<p>Different</p>', category: 'MÉRITO' }, // Duplicate by title/category
        { title: 'New', content: '<p>New content</p>' }
      ];
      const mockFile = {
        text: vi.fn().mockResolvedValue(JSON.stringify(importedModels))
      };
      const mockEvent = {
        target: { files: [mockFile], value: 'file.json' }
      } as any;

      const { result } = renderHook(() => useExportImport(createDefaultProps({ models: existingModels })));

      await act(async () => {
        await result.current.importModels(mockEvent);
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringContaining('1 modelo(s) importado(s)'),
        expect.any(String)
      );
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringContaining('1 duplicata(s) ignorada(s)'),
        expect.any(String)
      );
    });

    it('should reject non-array files', async () => {
      const mockFile = {
        text: vi.fn().mockResolvedValue('{"not": "an array"}')
      };
      const mockEvent = {
        target: { files: [mockFile], value: 'file.json' }
      } as any;

      const { result } = renderHook(() => useExportImport(createDefaultProps()));

      await act(async () => {
        await result.current.importModels(mockEvent);
      });

      expect(mockSetError).toHaveBeenCalledWith(
        expect.stringContaining('Deve conter um array')
      );
    });

    it('should track changes for cloud sync', async () => {
      const importedModels = [
        { title: 'New Model', content: '<p>Content</p>' }
      ];
      const mockFile = {
        text: vi.fn().mockResolvedValue(JSON.stringify(importedModels))
      };
      const mockEvent = {
        target: { files: [mockFile], value: 'file.json' }
      } as any;

      const { result } = renderHook(() => useExportImport(createDefaultProps()));

      await act(async () => {
        await result.current.importModels(mockEvent);
      });

      expect(mockTrackChangeBatch).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ operation: 'create' })
        ])
      );
    });

    it('should handle missing file gracefully', async () => {
      const mockEvent = {
        target: { files: null, value: '' }
      } as any;

      const { result } = renderHook(() => useExportImport(createDefaultProps()));

      await act(async () => {
        await result.current.importModels(mockEvent);
      });

      expect(mockSetModels).not.toHaveBeenCalled();
    });

    it('should skip models without title or content', async () => {
      const importedModels = [
        { title: 'Valid', content: '<p>Content</p>' },
        { title: '', content: '<p>No title</p>' },
        { title: 'No content', content: '' }
      ];
      const mockFile = {
        text: vi.fn().mockResolvedValue(JSON.stringify(importedModels))
      };
      const mockEvent = {
        target: { files: [mockFile], value: 'file.json' }
      } as any;

      const { result } = renderHook(() => useExportImport(createDefaultProps()));

      await act(async () => {
        await result.current.importModels(mockEvent);
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringContaining('1 modelo(s) importado(s)'),
        'success'
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CALLBACK STABILITY TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Callback Stability', () => {
    it('checkDuplicate should be stable', () => {
      const props = createDefaultProps();
      const { result, rerender } = renderHook(
        (p) => useExportImport(p),
        { initialProps: props }
      );

      const first = result.current.checkDuplicate;
      rerender(props);
      const second = result.current.checkDuplicate;

      expect(first).toBe(second);
    });
  });
});
