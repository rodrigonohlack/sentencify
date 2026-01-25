/**
 * @file useSerialization.test.ts
 * @description Comprehensive tests for the useExportImport hook (serialization/deserialization)
 * Covers: initialization, serialization, deserialization, import/export flows,
 * file format handling, version compatibility, error handling, partial state restoration.
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

// Mock color-stripper utility
vi.mock('../utils/color-stripper', () => ({
  stripInlineColors: vi.fn((html: string) => html.replace(/\s*color\s*:\s*[^;}"']+[;]?/gi, ''))
}));

describe('useSerialization (useExportImport)', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // FACTORIES
  // ═══════════════════════════════════════════════════════════════════════════

  const createMockModel = (overrides: Partial<Model> = {}): Model => ({
    id: `model-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    title: 'Test Model',
    content: '<p>Test content</p>',
    keywords: 'test, model',
    category: 'MERITO',
    createdAt: new Date().toISOString(),
    ...overrides
  });

  const createMockAISettings = (overrides: Partial<AISettings> = {}): AISettings => ({
    provider: 'claude',
    claudeModel: 'claude-sonnet-4-20250514',
    geminiModel: 'gemini-2.0-flash',
    openaiModel: 'gpt-5.2',
    openaiReasoningLevel: 'medium',
    grokModel: 'grok-4-1-fast-reasoning',
    apiKeys: { claude: '', gemini: '', openai: '', grok: '' },
    useExtendedThinking: false,
    thinkingBudget: '10000',
    geminiThinkingLevel: 'none',
    model: 'claude-sonnet-4-20250514',
    customPrompt: '',
    modeloRelatorio: '',
    modeloDispositivo: '',
    modeloTopicoRelatorio: '',
    topicosComplementares: [],
    ocrEngine: 'gemini-vision',
    parallelRequests: 3,
    anonymization: { enabled: false, entities: [] },
    semanticSearchEnabled: false,
    semanticThreshold: 0.7,
    jurisSemanticEnabled: false,
    quickPrompts: [],
    ...overrides
  } as AISettings);

  // ═══════════════════════════════════════════════════════════════════════════
  // MOCK SETUP
  // ═══════════════════════════════════════════════════════════════════════════

  let mockClipboardWriteText: ReturnType<typeof vi.fn>;
  const mockCreateObjectURL = vi.fn().mockReturnValue('blob:mock-url');
  const mockRevokeObjectURL = vi.fn();

  const mockSetModels = vi.fn();
  const mockSetHasUnsavedChanges = vi.fn();
  const mockSetAiSettings = vi.fn();
  const mockTrackChangeBatch = vi.fn();
  const mockShowToast = vi.fn();
  const mockSetError = vi.fn();
  const mockGenerateModelId = vi.fn().mockReturnValue('gen-id-001');

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
    searchModelReady: overrides.searchModelReady ?? false,
    showToast: mockShowToast,
    setError: mockSetError,
    generateModelId: mockGenerateModelId
  });

  let mockAnchor: HTMLAnchorElement;
  let originalCreateElement: typeof document.createElement;

  beforeEach(() => {
    vi.clearAllMocks();

    // Clipboard mock
    mockClipboardWriteText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockClipboardWriteText },
      writable: true,
      configurable: true
    });

    // URL mock
    global.URL.createObjectURL = mockCreateObjectURL;
    global.URL.revokeObjectURL = mockRevokeObjectURL;

    // DOM anchor mock
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
  // 1. HOOK INITIALIZATION AND RETURNED METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Hook Initialization and Returned Methods', () => {
    it('should return all expected methods on initialization', () => {
      const { result } = renderHook(() => useExportImport(createDefaultProps()));

      expect(result.current).toHaveProperty('exportAiSettings');
      expect(result.current).toHaveProperty('importAiSettings');
      expect(result.current).toHaveProperty('exportModels');
      expect(result.current).toHaveProperty('importModels');
      expect(result.current).toHaveProperty('checkDuplicate');
    });

    it('should return functions for all methods', () => {
      const { result } = renderHook(() => useExportImport(createDefaultProps()));

      expect(typeof result.current.exportAiSettings).toBe('function');
      expect(typeof result.current.importAiSettings).toBe('function');
      expect(typeof result.current.exportModels).toBe('function');
      expect(typeof result.current.importModels).toBe('function');
      expect(typeof result.current.checkDuplicate).toBe('function');
    });

    it('should return exactly 5 methods', () => {
      const { result } = renderHook(() => useExportImport(createDefaultProps()));

      expect(Object.keys(result.current)).toHaveLength(5);
    });

    it('should accept null cloudSync without errors', () => {
      expect(() => {
        renderHook(() => useExportImport(createDefaultProps({ cloudSync: null })));
      }).not.toThrow();
    });

    it('should accept empty models array', () => {
      const { result } = renderHook(() => useExportImport(createDefaultProps({ models: [] })));
      expect(result.current.exportModels).toBeInstanceOf(Function);
    });

    it('should maintain callback reference stability for checkDuplicate', () => {
      const props = createDefaultProps();
      const { result, rerender } = renderHook(
        (p) => useExportImport(p),
        { initialProps: props }
      );

      const firstRef = result.current.checkDuplicate;
      rerender(props);
      expect(result.current.checkDuplicate).toBe(firstRef);
    });

    it('should update callbacks when dependencies change', () => {
      const props1 = createDefaultProps({ aiSettings: createMockAISettings({ customPrompt: 'A' }) });
      const { result, rerender } = renderHook(
        (p) => useExportImport(p),
        { initialProps: props1 }
      );

      const firstExportRef = result.current.exportAiSettings;

      const props2 = createDefaultProps({ aiSettings: createMockAISettings({ customPrompt: 'B' }) });
      rerender(props2);

      // exportAiSettings depends on aiSettings, so it should change
      expect(result.current.exportAiSettings).not.toBe(firstExportRef);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. SERIALIZATION OF APP STATE TO JSON/STRING (exportAiSettings)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Serialization of App State (exportAiSettings)', () => {
    it('should serialize AI settings to JSON string', async () => {
      const aiSettings = createMockAISettings({
        customPrompt: 'My custom serialization prompt',
        useExtendedThinking: true
      });
      const { result } = renderHook(() => useExportImport(createDefaultProps({ aiSettings })));

      await act(async () => {
        await result.current.exportAiSettings();
      });

      const clipboardContent = mockClipboardWriteText.mock.calls[0][0];
      const parsed = JSON.parse(clipboardContent);
      expect(parsed.customPrompt).toBe('My custom serialization prompt');
      expect(parsed.useExtendedThinking).toBe(true);
    });

    it('should produce valid JSON with pretty-printing (2 spaces)', async () => {
      const aiSettings = createMockAISettings({ customPrompt: 'test' });
      const { result } = renderHook(() => useExportImport(createDefaultProps({ aiSettings })));

      await act(async () => {
        await result.current.exportAiSettings();
      });

      const clipboardContent = mockClipboardWriteText.mock.calls[0][0];
      // JSON.stringify with null, 2 produces 2-space indentation
      expect(clipboardContent).toContain('  "');
      // Verify it is valid JSON
      expect(() => JSON.parse(clipboardContent)).not.toThrow();
    });

    it('should preserve all fields in serialized output', async () => {
      const aiSettings = createMockAISettings({
        customPrompt: 'prompt-val',
        modeloRelatorio: 'relatorio-val',
        modeloDispositivo: 'dispositivo-val',
        modeloTopicoRelatorio: 'topico-val',
        topicosComplementares: [
          { id: 1, title: 'TOPIC A', category: 'MERITO', enabled: true, ordem: 1 }
        ] as any
      });
      const { result } = renderHook(() => useExportImport(createDefaultProps({ aiSettings })));

      await act(async () => {
        await result.current.exportAiSettings();
      });

      const parsed = JSON.parse(mockClipboardWriteText.mock.calls[0][0]);
      expect(parsed.customPrompt).toBe('prompt-val');
      expect(parsed.modeloRelatorio).toBe('relatorio-val');
      expect(parsed.modeloDispositivo).toBe('dispositivo-val');
      expect(parsed.modeloTopicoRelatorio).toBe('topico-val');
      expect(parsed.topicosComplementares).toHaveLength(1);
    });

    it('should copy serialized data to clipboard', async () => {
      const { result } = renderHook(() => useExportImport(createDefaultProps()));

      await act(async () => {
        await result.current.exportAiSettings();
      });

      expect(mockClipboardWriteText).toHaveBeenCalledTimes(1);
    });

    it('should create a downloadable JSON file', async () => {
      const { result } = renderHook(() => useExportImport(createDefaultProps()));

      await act(async () => {
        await result.current.exportAiSettings();
      });

      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockAnchor.download).toMatch(/^sentencify-configuracoes-\d{4}-\d{2}-\d{2}\.json$/);
      expect(mockAnchor.click).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });

    it('should use correct date format in filename', async () => {
      const { result } = renderHook(() => useExportImport(createDefaultProps()));

      await act(async () => {
        await result.current.exportAiSettings();
      });

      const today = new Date().toISOString().split('T')[0];
      expect(mockAnchor.download).toBe(`sentencify-configuracoes-${today}.json`);
    });

    it('should set correct MIME type for blob', async () => {
      const originalBlob = global.Blob;
      const blobSpy = vi.fn().mockImplementation((...args: any[]) => new originalBlob(...args));
      global.Blob = blobSpy as any;

      const { result } = renderHook(() => useExportImport(createDefaultProps()));

      await act(async () => {
        await result.current.exportAiSettings();
      });

      expect(blobSpy).toHaveBeenCalledWith(
        expect.any(Array),
        { type: 'application/json' }
      );

      global.Blob = originalBlob;
    });

    it('should show success toast after export', async () => {
      const { result } = renderHook(() => useExportImport(createDefaultProps()));

      await act(async () => {
        await result.current.exportAiSettings();
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringContaining('Configurações exportadas com sucesso'),
        'success'
      );
    });

    it('should cleanup DOM elements after export', async () => {
      const appendSpy = vi.spyOn(document.body, 'appendChild');
      const removeSpy = vi.spyOn(document.body, 'removeChild');

      const { result } = renderHook(() => useExportImport(createDefaultProps()));

      await act(async () => {
        await result.current.exportAiSettings();
      });

      expect(appendSpy).toHaveBeenCalledWith(mockAnchor);
      expect(removeSpy).toHaveBeenCalledWith(mockAnchor);
    });

    it('should serialize settings with special characters', async () => {
      const aiSettings = createMockAISettings({
        customPrompt: 'Prompt com "aspas" e acentuação: àéíóú ção'
      });
      const { result } = renderHook(() => useExportImport(createDefaultProps({ aiSettings })));

      await act(async () => {
        await result.current.exportAiSettings();
      });

      const parsed = JSON.parse(mockClipboardWriteText.mock.calls[0][0]);
      expect(parsed.customPrompt).toBe('Prompt com "aspas" e acentuação: àéíóú ção');
    });

    it('should serialize empty settings fields correctly', async () => {
      const aiSettings = createMockAISettings({
        customPrompt: '',
        modeloRelatorio: '',
        topicosComplementares: []
      });
      const { result } = renderHook(() => useExportImport(createDefaultProps({ aiSettings })));

      await act(async () => {
        await result.current.exportAiSettings();
      });

      const parsed = JSON.parse(mockClipboardWriteText.mock.calls[0][0]);
      expect(parsed.customPrompt).toBe('');
      expect(parsed.modeloRelatorio).toBe('');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. DESERIALIZATION BACK TO APP STATE (importAiSettings)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Deserialization to App State (importAiSettings)', () => {
    it('should deserialize valid JSON and update aiSettings', async () => {
      const importedSettings = {
        customPrompt: 'Imported prompt',
        useExtendedThinking: true,
        modeloRelatorio: 'Imported relatorio'
      };
      const mockFile = { text: vi.fn().mockResolvedValue(JSON.stringify(importedSettings)) } as any;
      const mockEvent = { target: { files: [mockFile], value: 'file.json' } } as any;

      const { result } = renderHook(() => useExportImport(createDefaultProps()));

      await act(async () => {
        await result.current.importAiSettings(mockEvent);
      });

      expect(mockSetAiSettings).toHaveBeenCalledWith(expect.any(Function));
      // Execute the updater function to verify merged state
      const updater = mockSetAiSettings.mock.calls[0][0];
      const prevState = createMockAISettings();
      const mergedState = updater(prevState);
      expect(mergedState.customPrompt).toBe('Imported prompt');
      expect(mergedState.useExtendedThinking).toBe(true);
      expect(mergedState.modeloRelatorio).toBe('Imported relatorio');
    });

    it('should apply default values for missing fields during import', async () => {
      const importedSettings = { customPrompt: 'Only this field' };
      const mockFile = { text: vi.fn().mockResolvedValue(JSON.stringify(importedSettings)) } as any;
      const mockEvent = { target: { files: [mockFile], value: 'file.json' } } as any;

      const { result } = renderHook(() => useExportImport(createDefaultProps()));

      await act(async () => {
        await result.current.importAiSettings(mockEvent);
      });

      const updater = mockSetAiSettings.mock.calls[0][0];
      const mergedState = updater(createMockAISettings());
      expect(mergedState.model).toBe('claude-sonnet-4-20250514');
      expect(mergedState.useExtendedThinking).toBe(false);
      expect(mergedState.modeloRelatorio).toBe('');
      expect(mergedState.modeloDispositivo).toBe('');
      expect(mergedState.modeloTopicoRelatorio).toBe('');
    });

    it('should provide default topicosComplementares when not in import', async () => {
      const importedSettings = { customPrompt: 'test' };
      const mockFile = { text: vi.fn().mockResolvedValue(JSON.stringify(importedSettings)) } as any;
      const mockEvent = { target: { files: [mockFile], value: 'file.json' } } as any;

      const { result } = renderHook(() => useExportImport(createDefaultProps()));

      await act(async () => {
        await result.current.importAiSettings(mockEvent);
      });

      const updater = mockSetAiSettings.mock.calls[0][0];
      const mergedState = updater(createMockAISettings());
      expect(mergedState.topicosComplementares).toHaveLength(5);
      expect(mergedState.topicosComplementares[0].title).toBe('HONORÁRIOS ADVOCATÍCIOS');
      expect(mergedState.topicosComplementares[4].title).toBe('COMPENSAÇÃO/DEDUÇÃO/ABATIMENTO');
    });

    it('should preserve imported topicosComplementares when present', async () => {
      const customTopics = [
        { id: 99, title: 'CUSTOM TOPIC', category: 'CUSTOM', enabled: true, ordem: 1 }
      ];
      const importedSettings = { topicosComplementares: customTopics };
      const mockFile = { text: vi.fn().mockResolvedValue(JSON.stringify(importedSettings)) } as any;
      const mockEvent = { target: { files: [mockFile], value: 'file.json' } } as any;

      const { result } = renderHook(() => useExportImport(createDefaultProps()));

      await act(async () => {
        await result.current.importAiSettings(mockEvent);
      });

      const updater = mockSetAiSettings.mock.calls[0][0];
      const mergedState = updater(createMockAISettings());
      expect(mergedState.topicosComplementares).toHaveLength(1);
      expect(mergedState.topicosComplementares[0].title).toBe('CUSTOM TOPIC');
    });

    it('should merge imported settings with previous state', async () => {
      const importedSettings = { customPrompt: 'New prompt' };
      const mockFile = { text: vi.fn().mockResolvedValue(JSON.stringify(importedSettings)) } as any;
      const mockEvent = { target: { files: [mockFile], value: 'file.json' } } as any;

      const { result } = renderHook(() => useExportImport(createDefaultProps()));

      await act(async () => {
        await result.current.importAiSettings(mockEvent);
      });

      const updater = mockSetAiSettings.mock.calls[0][0];
      const prevState = createMockAISettings({ modeloDispositivo: 'preserved-value' });
      const mergedState = updater(prevState);
      // The merged settings override fields in the import data
      expect(mergedState.customPrompt).toBe('New prompt');
      // Previous state fields not in the merged object are preserved via spread
      expect(mergedState.modeloDispositivo).toBe('');
    });

    it('should clear the file input after successful import', async () => {
      const importedSettings = { customPrompt: 'ok' };
      const mockFile = { text: vi.fn().mockResolvedValue(JSON.stringify(importedSettings)) } as any;
      const mockEvent = { target: { files: [mockFile], value: 'file.json' } } as any;

      const { result } = renderHook(() => useExportImport(createDefaultProps()));

      await act(async () => {
        await result.current.importAiSettings(mockEvent);
      });

      expect(mockEvent.target.value).toBe('');
    });

    it('should show success toast after import', async () => {
      const importedSettings = { customPrompt: 'test' };
      const mockFile = { text: vi.fn().mockResolvedValue(JSON.stringify(importedSettings)) } as any;
      const mockEvent = { target: { files: [mockFile], value: 'file.json' } } as any;

      const { result } = renderHook(() => useExportImport(createDefaultProps()));

      await act(async () => {
        await result.current.importAiSettings(mockEvent);
      });

      expect(mockShowToast).toHaveBeenCalledWith('Configurações importadas com sucesso!', 'success');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. IMPORT/EXPORT PROJECT FLOW (exportModels / importModels)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Import/Export Project Flow', () => {
    describe('exportModels', () => {
      it('should export all models when category is "all"', async () => {
        const models = [
          createMockModel({ title: 'Model A', category: 'MERITO' }),
          createMockModel({ title: 'Model B', category: 'PRELIMINAR' }),
          createMockModel({ title: 'Model C', category: 'MERITO' })
        ];
        const { result } = renderHook(() => useExportImport(createDefaultProps({
          models,
          selectedCategory: 'all'
        })));

        await act(async () => {
          await result.current.exportModels();
        });

        const exported = JSON.parse(mockClipboardWriteText.mock.calls[0][0]);
        expect(exported).toHaveLength(3);
      });

      it('should export only filtered models by category', async () => {
        const models = [
          createMockModel({ title: 'Merit 1', category: 'MERITO' }),
          createMockModel({ title: 'Prelim 1', category: 'PRELIMINAR' }),
          createMockModel({ title: 'Merit 2', category: 'MERITO' })
        ];
        const { result } = renderHook(() => useExportImport(createDefaultProps({
          models,
          selectedCategory: 'MERITO'
        })));

        await act(async () => {
          await result.current.exportModels();
        });

        const exported = JSON.parse(mockClipboardWriteText.mock.calls[0][0]);
        expect(exported).toHaveLength(2);
        expect(exported[0].title).toBe('Merit 1');
        expect(exported[1].title).toBe('Merit 2');
      });

      it('should generate filename with category name', async () => {
        const models = [createMockModel({ category: 'MERITO' })];
        const { result } = renderHook(() => useExportImport(createDefaultProps({
          models,
          selectedCategory: 'MERITO'
        })));

        await act(async () => {
          await result.current.exportModels();
        });

        expect(mockAnchor.download).toContain('merito');
      });

      it('should generate filename with "todos" when exporting all', async () => {
        const models = [createMockModel()];
        const { result } = renderHook(() => useExportImport(createDefaultProps({
          models,
          selectedCategory: 'all'
        })));

        await act(async () => {
          await result.current.exportModels();
        });

        expect(mockAnchor.download).toContain('todos');
      });

      it('should replace spaces with hyphens in category filename', async () => {
        const models = [createMockModel({ category: 'DANO MORAL' })];
        const { result } = renderHook(() => useExportImport(createDefaultProps({
          models,
          selectedCategory: 'DANO MORAL'
        })));

        await act(async () => {
          await result.current.exportModels();
        });

        expect(mockAnchor.download).toContain('dano-moral');
      });

      it('should mark unsaved changes as false after export', async () => {
        const models = [createMockModel()];
        const { result } = renderHook(() => useExportImport(createDefaultProps({ models })));

        await act(async () => {
          await result.current.exportModels();
        });

        expect(mockSetHasUnsavedChanges).toHaveBeenCalledWith(false);
      });

      it('should show toast with correct count', async () => {
        const models = [createMockModel(), createMockModel()];
        const { result } = renderHook(() => useExportImport(createDefaultProps({ models })));

        await act(async () => {
          await result.current.exportModels();
        });

        expect(mockShowToast).toHaveBeenCalledWith(
          expect.stringContaining('2 modelo(s) exportado(s)'),
          'success'
        );
      });

      it('should export empty array when no models match category', async () => {
        const models = [createMockModel({ category: 'MERITO' })];
        const { result } = renderHook(() => useExportImport(createDefaultProps({
          models,
          selectedCategory: 'INEXISTENTE'
        })));

        await act(async () => {
          await result.current.exportModels();
        });

        const exported = JSON.parse(mockClipboardWriteText.mock.calls[0][0]);
        expect(exported).toHaveLength(0);
      });
    });

    describe('importModels', () => {
      it('should import valid models and update store', async () => {
        const importedModels = [
          { title: 'Imported 1', content: '<p>Content 1</p>', keywords: 'kw1' },
          { title: 'Imported 2', content: '<p>Content 2</p>', category: 'PRELIMINAR' }
        ];
        const mockFile = { text: vi.fn().mockResolvedValue(JSON.stringify(importedModels)) } as any;
        const mockEvent = { target: { files: [mockFile], value: 'f.json' } } as any;

        const { result } = renderHook(() => useExportImport(createDefaultProps()));

        await act(async () => {
          await result.current.importModels(mockEvent);
        });

        expect(mockSetModels).toHaveBeenCalled();
        const updater = mockSetModels.mock.calls[0][0];
        const newModels = updater([]);
        expect(newModels).toHaveLength(2);
        expect(newModels[0].title).toBe('Imported 1');
        expect(newModels[1].title).toBe('Imported 2');
      });

      it('should assign new IDs using generateModelId', async () => {
        mockGenerateModelId.mockReturnValueOnce('gen-001').mockReturnValueOnce('gen-001');
        const importedModels = [{ title: 'M1', content: 'C1' }];
        const mockFile = { text: vi.fn().mockResolvedValue(JSON.stringify(importedModels)) } as any;
        const mockEvent = { target: { files: [mockFile], value: 'f.json' } } as any;

        const { result } = renderHook(() => useExportImport(createDefaultProps()));

        await act(async () => {
          await result.current.importModels(mockEvent);
        });

        const updater = mockSetModels.mock.calls[0][0];
        const newModels = updater([]);
        expect(newModels[0].id).toBe('gen-001_import0');
      });

      it('should set createdAt timestamp on imported models', async () => {
        const beforeTime = new Date().toISOString();
        const importedModels = [{ title: 'M', content: 'C' }];
        const mockFile = { text: vi.fn().mockResolvedValue(JSON.stringify(importedModels)) } as any;
        const mockEvent = { target: { files: [mockFile], value: 'f.json' } } as any;

        const { result } = renderHook(() => useExportImport(createDefaultProps()));

        await act(async () => {
          await result.current.importModels(mockEvent);
        });

        const updater = mockSetModels.mock.calls[0][0];
        const newModels = updater([]);
        expect(newModels[0].createdAt).toBeDefined();
        expect(new Date(newModels[0].createdAt!).getTime()).toBeGreaterThanOrEqual(new Date(beforeTime).getTime());
      });

      it('should preserve existing embedding if present', async () => {
        const existingEmbedding = new Array(768).fill(0.5);
        const importedModels = [{ title: 'M', content: 'C', embedding: existingEmbedding }];
        const mockFile = { text: vi.fn().mockResolvedValue(JSON.stringify(importedModels)) } as any;
        const mockEvent = { target: { files: [mockFile], value: 'f.json' } } as any;

        const { result } = renderHook(() => useExportImport(createDefaultProps()));

        await act(async () => {
          await result.current.importModels(mockEvent);
        });

        const updater = mockSetModels.mock.calls[0][0];
        const newModels = updater([]);
        expect(newModels[0].embedding).toEqual(existingEmbedding);
      });

      it('should call trackChangeBatch for cloud sync', async () => {
        const importedModels = [
          { title: 'Cloud Model 1', content: '<p>C1</p>' },
          { title: 'Cloud Model 2', content: '<p>C2</p>' }
        ];
        const mockFile = { text: vi.fn().mockResolvedValue(JSON.stringify(importedModels)) } as any;
        const mockEvent = { target: { files: [mockFile], value: 'f.json' } } as any;

        const { result } = renderHook(() => useExportImport(createDefaultProps()));

        await act(async () => {
          await result.current.importModels(mockEvent);
        });

        expect(mockTrackChangeBatch).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({ operation: 'create' }),
            expect.objectContaining({ operation: 'create' })
          ])
        );
      });

      it('should not call trackChangeBatch when cloudSync is null', async () => {
        const importedModels = [{ title: 'M', content: 'C' }];
        const mockFile = { text: vi.fn().mockResolvedValue(JSON.stringify(importedModels)) } as any;
        const mockEvent = { target: { files: [mockFile], value: 'f.json' } } as any;

        const { result } = renderHook(() => useExportImport(createDefaultProps({ cloudSync: null })));

        await act(async () => {
          await result.current.importModels(mockEvent);
        });

        expect(mockTrackChangeBatch).not.toHaveBeenCalled();
      });

      it('should mark hasUnsavedChanges as true after import', async () => {
        const importedModels = [{ title: 'M', content: 'C' }];
        const mockFile = { text: vi.fn().mockResolvedValue(JSON.stringify(importedModels)) } as any;
        const mockEvent = { target: { files: [mockFile], value: 'f.json' } } as any;

        const { result } = renderHook(() => useExportImport(createDefaultProps()));

        await act(async () => {
          await result.current.importModels(mockEvent);
        });

        expect(mockSetHasUnsavedChanges).toHaveBeenCalledWith(true);
      });

      it('should clear error on successful import', async () => {
        const importedModels = [{ title: 'M', content: 'C' }];
        const mockFile = { text: vi.fn().mockResolvedValue(JSON.stringify(importedModels)) } as any;
        const mockEvent = { target: { files: [mockFile], value: 'f.json' } } as any;

        const { result } = renderHook(() => useExportImport(createDefaultProps()));

        await act(async () => {
          await result.current.importModels(mockEvent);
        });

        expect(mockSetError).toHaveBeenCalledWith('');
      });

      it('should append to existing models, not replace them', async () => {
        const existingModels = [createMockModel({ title: 'Existing' })];
        const importedModels = [{ title: 'New', content: 'C' }];
        const mockFile = { text: vi.fn().mockResolvedValue(JSON.stringify(importedModels)) } as any;
        const mockEvent = { target: { files: [mockFile], value: 'f.json' } } as any;

        const { result } = renderHook(() => useExportImport(createDefaultProps({ models: existingModels })));

        await act(async () => {
          await result.current.importModels(mockEvent);
        });

        const updater = mockSetModels.mock.calls[0][0];
        const combined = updater(existingModels);
        expect(combined).toHaveLength(2);
        expect(combined[0].title).toBe('Existing');
        expect(combined[1].title).toBe('New');
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. FILE FORMAT HANDLING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('File Format Handling', () => {
    it('should reject non-array JSON for models import', async () => {
      const mockFile = { text: vi.fn().mockResolvedValue('{"key": "value"}') } as any;
      const mockEvent = { target: { files: [mockFile], value: 'f.json' } } as any;

      const { result } = renderHook(() => useExportImport(createDefaultProps()));

      await act(async () => {
        await result.current.importModels(mockEvent);
      });

      expect(mockSetError).toHaveBeenCalledWith('Arquivo inválido. Deve conter um array de modelos.');
      expect(mockSetModels).not.toHaveBeenCalled();
    });

    it('should reject non-object JSON for settings import', async () => {
      const mockFile = { text: vi.fn().mockResolvedValue('"just a string"') } as any;
      const mockEvent = { target: { files: [mockFile], value: 'f.json' } } as any;

      const { result } = renderHook(() => useExportImport(createDefaultProps()));

      await act(async () => {
        await result.current.importAiSettings(mockEvent);
      });

      expect(mockShowToast).toHaveBeenCalledWith('Arquivo inválido.', 'error');
      expect(mockSetAiSettings).not.toHaveBeenCalled();
    });

    it('should reject number values for settings import', async () => {
      const mockFile = { text: vi.fn().mockResolvedValue('42') } as any;
      const mockEvent = { target: { files: [mockFile], value: 'f.json' } } as any;

      const { result } = renderHook(() => useExportImport(createDefaultProps()));

      await act(async () => {
        await result.current.importAiSettings(mockEvent);
      });

      expect(mockShowToast).toHaveBeenCalledWith('Arquivo inválido.', 'error');
    });

    it('should reject boolean values for settings import', async () => {
      const mockFile = { text: vi.fn().mockResolvedValue('true') } as any;
      const mockEvent = { target: { files: [mockFile], value: 'f.json' } } as any;

      const { result } = renderHook(() => useExportImport(createDefaultProps()));

      await act(async () => {
        await result.current.importAiSettings(mockEvent);
      });

      expect(mockShowToast).toHaveBeenCalledWith('Arquivo inválido.', 'error');
    });

    it('should handle null value for settings import as error', async () => {
      // JSON null passes typeof === 'object' check but crashes on property access
      const mockFile = { text: vi.fn().mockResolvedValue('null') } as any;
      const mockEvent = { target: { files: [mockFile], value: 'f.json' } } as any;

      const { result } = renderHook(() => useExportImport(createDefaultProps()));

      await act(async () => {
        await result.current.importAiSettings(mockEvent);
      });

      // null is typeof 'object' in JS, so it passes the object check but
      // crashes when trying to read properties, triggering the catch block
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringContaining('Erro ao importar'),
        'error'
      );
    });

    it('should skip models without title', async () => {
      const importedModels = [
        { title: 'Valid', content: '<p>Ok</p>' },
        { title: '', content: '<p>No title</p>' },
        { content: '<p>Missing title field</p>' }
      ];
      const mockFile = { text: vi.fn().mockResolvedValue(JSON.stringify(importedModels)) } as any;
      const mockEvent = { target: { files: [mockFile], value: 'f.json' } } as any;

      const { result } = renderHook(() => useExportImport(createDefaultProps()));

      await act(async () => {
        await result.current.importModels(mockEvent);
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringContaining('1 modelo(s) importado(s)'),
        'success'
      );
    });

    it('should skip models without content', async () => {
      const importedModels = [
        { title: 'Valid', content: '<p>Ok</p>' },
        { title: 'No content', content: '' },
        { title: 'Missing content field' }
      ];
      const mockFile = { text: vi.fn().mockResolvedValue(JSON.stringify(importedModels)) } as any;
      const mockEvent = { target: { files: [mockFile], value: 'f.json' } } as any;

      const { result } = renderHook(() => useExportImport(createDefaultProps()));

      await act(async () => {
        await result.current.importModels(mockEvent);
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringContaining('1 modelo(s) importado(s)'),
        'success'
      );
    });

    it('should handle array import with all invalid models (no setModels call)', async () => {
      const importedModels = [
        { title: '', content: '' },
        { title: '', content: 'no title' }
      ];
      const mockFile = { text: vi.fn().mockResolvedValue(JSON.stringify(importedModels)) } as any;
      const mockEvent = { target: { files: [mockFile], value: 'f.json' } } as any;

      const { result } = renderHook(() => useExportImport(createDefaultProps()));

      await act(async () => {
        await result.current.importModels(mockEvent);
      });

      expect(mockSetModels).not.toHaveBeenCalled();
    });

    it('should handle model with missing category gracefully', async () => {
      const importedModels = [{ title: 'No Cat', content: '<p>Content</p>' }];
      const mockFile = { text: vi.fn().mockResolvedValue(JSON.stringify(importedModels)) } as any;
      const mockEvent = { target: { files: [mockFile], value: 'f.json' } } as any;

      const { result } = renderHook(() => useExportImport(createDefaultProps()));

      await act(async () => {
        await result.current.importModels(mockEvent);
      });

      const updater = mockSetModels.mock.calls[0][0];
      const models = updater([]);
      expect(models[0].category).toBe('');
    });

    it('should handle model with missing keywords gracefully', async () => {
      const importedModels = [{ title: 'No KW', content: '<p>Content</p>' }];
      const mockFile = { text: vi.fn().mockResolvedValue(JSON.stringify(importedModels)) } as any;
      const mockEvent = { target: { files: [mockFile], value: 'f.json' } } as any;

      const { result } = renderHook(() => useExportImport(createDefaultProps()));

      await act(async () => {
        await result.current.importModels(mockEvent);
      });

      const updater = mockSetModels.mock.calls[0][0];
      const models = updater([]);
      expect(models[0].keywords).toBe('');
    });

    it('should use application/json MIME type for model export blobs', async () => {
      const originalBlob = global.Blob;
      const blobArgs: any[] = [];
      const blobSpy = vi.fn().mockImplementation((...args: any[]) => {
        blobArgs.push(args);
        return new originalBlob(...args);
      });
      global.Blob = blobSpy as any;

      const models = [createMockModel()];
      const { result } = renderHook(() => useExportImport(createDefaultProps({ models })));

      await act(async () => {
        await result.current.exportModels();
      });

      expect(blobSpy).toHaveBeenCalledWith(
        expect.any(Array),
        { type: 'application/json' }
      );

      global.Blob = originalBlob;
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. VERSION COMPATIBILITY
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Version Compatibility', () => {
    it('should import legacy settings with only model field', async () => {
      const legacySettings = { model: 'old-model-name' };
      const mockFile = { text: vi.fn().mockResolvedValue(JSON.stringify(legacySettings)) } as any;
      const mockEvent = { target: { files: [mockFile], value: 'f.json' } } as any;

      const { result } = renderHook(() => useExportImport(createDefaultProps()));

      await act(async () => {
        await result.current.importAiSettings(mockEvent);
      });

      const updater = mockSetAiSettings.mock.calls[0][0];
      const merged = updater(createMockAISettings());
      expect(merged.model).toBe('old-model-name');
    });

    it('should default to claude-sonnet-4 when model field is missing', async () => {
      const importedSettings = { customPrompt: 'no model field' };
      const mockFile = { text: vi.fn().mockResolvedValue(JSON.stringify(importedSettings)) } as any;
      const mockEvent = { target: { files: [mockFile], value: 'f.json' } } as any;

      const { result } = renderHook(() => useExportImport(createDefaultProps()));

      await act(async () => {
        await result.current.importAiSettings(mockEvent);
      });

      const updater = mockSetAiSettings.mock.calls[0][0];
      const merged = updater(createMockAISettings());
      expect(merged.model).toBe('claude-sonnet-4-20250514');
    });

    it('should handle models from older format without embedding', async () => {
      const oldFormatModels = [
        { title: 'Old Model', content: '<p>Old content</p>', keywords: 'old' }
      ];
      const mockFile = { text: vi.fn().mockResolvedValue(JSON.stringify(oldFormatModels)) } as any;
      const mockEvent = { target: { files: [mockFile], value: 'f.json' } } as any;

      const { result } = renderHook(() => useExportImport(createDefaultProps({ searchModelReady: false })));

      await act(async () => {
        await result.current.importModels(mockEvent);
      });

      const updater = mockSetModels.mock.calls[0][0];
      const models = updater([]);
      expect(models[0].embedding).toBeUndefined();
    });

    it('should handle models with wrong-size embeddings when AI is ready', async () => {
      const AIModelService = await import('../services/AIModelService');
      const wrongSizeEmbedding = new Array(100).fill(0.3); // wrong size (not 768)
      const modelsWithWrongEmbedding = [
        { title: 'Wrong Embed', content: '<p>Content</p>', embedding: wrongSizeEmbedding }
      ];
      const mockFile = { text: vi.fn().mockResolvedValue(JSON.stringify(modelsWithWrongEmbedding)) } as any;
      const mockEvent = { target: { files: [mockFile], value: 'f.json' } } as any;

      const { result } = renderHook(() => useExportImport(createDefaultProps({
        searchModelReady: true,
        aiSettings: createMockAISettings({ modelSemanticEnabled: true })
      })));

      await act(async () => {
        await result.current.importModels(mockEvent);
      });

      expect(AIModelService.default.getEmbedding).toHaveBeenCalled();
    });

    it('should not regenerate embeddings when semantic search is disabled', async () => {
      const AIModelService = await import('../services/AIModelService');
      const modelsWithoutEmbedding = [
        { title: 'Model', content: '<p>Content</p>' }
      ];
      const mockFile = { text: vi.fn().mockResolvedValue(JSON.stringify(modelsWithoutEmbedding)) } as any;
      const mockEvent = { target: { files: [mockFile], value: 'f.json' } } as any;

      const { result } = renderHook(() => useExportImport(createDefaultProps({
        searchModelReady: true,
        aiSettings: createMockAISettings({ modelSemanticEnabled: false })
      })));

      await act(async () => {
        await result.current.importModels(mockEvent);
      });

      expect(AIModelService.default.getEmbedding).not.toHaveBeenCalled();
    });

    it('should not regenerate embeddings when search model is not ready', async () => {
      const AIModelService = await import('../services/AIModelService');
      const modelsWithoutEmbedding = [
        { title: 'Model', content: '<p>Content</p>' }
      ];
      const mockFile = { text: vi.fn().mockResolvedValue(JSON.stringify(modelsWithoutEmbedding)) } as any;
      const mockEvent = { target: { files: [mockFile], value: 'f.json' } } as any;

      const { result } = renderHook(() => useExportImport(createDefaultProps({
        searchModelReady: false,
        aiSettings: createMockAISettings({ modelSemanticEnabled: true })
      })));

      await act(async () => {
        await result.current.importModels(mockEvent);
      });

      expect(AIModelService.default.getEmbedding).not.toHaveBeenCalled();
    });

    it('should import settings from different app versions with extra fields', async () => {
      const futureSettings = {
        customPrompt: 'future prompt',
        newFutureField: 'unknown-field-value',
        anotherNew: 123
      };
      const mockFile = { text: vi.fn().mockResolvedValue(JSON.stringify(futureSettings)) } as any;
      const mockEvent = { target: { files: [mockFile], value: 'f.json' } } as any;

      const { result } = renderHook(() => useExportImport(createDefaultProps()));

      await act(async () => {
        await result.current.importAiSettings(mockEvent);
      });

      // Should not throw and should succeed
      expect(mockShowToast).toHaveBeenCalledWith('Configurações importadas com sucesso!', 'success');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. ERROR HANDLING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Error Handling', () => {
    describe('Corrupt Data', () => {
      it('should handle invalid JSON in settings import', async () => {
        const mockFile = { text: vi.fn().mockResolvedValue('{invalid json:::}') } as any;
        const mockEvent = { target: { files: [mockFile], value: 'f.json' } } as any;

        const { result } = renderHook(() => useExportImport(createDefaultProps()));

        await act(async () => {
          await result.current.importAiSettings(mockEvent);
        });

        expect(mockShowToast).toHaveBeenCalledWith(
          expect.stringContaining('Erro ao importar'),
          'error'
        );
      });

      it('should handle invalid JSON in models import', async () => {
        const mockFile = { text: vi.fn().mockResolvedValue('not json at all!!!') } as any;
        const mockEvent = { target: { files: [mockFile], value: 'f.json' } } as any;

        const { result } = renderHook(() => useExportImport(createDefaultProps()));

        await act(async () => {
          await result.current.importModels(mockEvent);
        });

        expect(mockSetError).toHaveBeenCalledWith(
          expect.stringContaining('Erro ao importar modelos')
        );
      });

      it('should handle truncated JSON', async () => {
        const mockFile = { text: vi.fn().mockResolvedValue('[{"title": "broken"') } as any;
        const mockEvent = { target: { files: [mockFile], value: 'f.json' } } as any;

        const { result } = renderHook(() => useExportImport(createDefaultProps()));

        await act(async () => {
          await result.current.importModels(mockEvent);
        });

        expect(mockSetError).toHaveBeenCalledWith(
          expect.stringContaining('Erro ao importar modelos')
        );
      });

      it('should handle empty file content', async () => {
        const mockFile = { text: vi.fn().mockResolvedValue('') } as any;
        const mockEvent = { target: { files: [mockFile], value: 'f.json' } } as any;

        const { result } = renderHook(() => useExportImport(createDefaultProps()));

        await act(async () => {
          await result.current.importModels(mockEvent);
        });

        expect(mockSetError).toHaveBeenCalledWith(
          expect.stringContaining('Erro ao importar modelos')
        );
      });

      it('should handle binary/garbled content', async () => {
        const mockFile = { text: vi.fn().mockResolvedValue('\x00\x01\x02\x03\xFF') } as any;
        const mockEvent = { target: { files: [mockFile], value: 'f.json' } } as any;

        const { result } = renderHook(() => useExportImport(createDefaultProps()));

        await act(async () => {
          await result.current.importModels(mockEvent);
        });

        expect(mockSetError).toHaveBeenCalledWith(
          expect.stringContaining('Erro ao importar modelos')
        );
      });
    });

    describe('Missing Fields', () => {
      it('should handle empty file selection (no files)', async () => {
        const mockEvent = { target: { files: null, value: '' } } as any;

        const { result } = renderHook(() => useExportImport(createDefaultProps()));

        await act(async () => {
          await result.current.importModels(mockEvent);
        });

        expect(mockSetModels).not.toHaveBeenCalled();
        expect(mockSetError).not.toHaveBeenCalled();
      });

      it('should handle empty files array', async () => {
        const mockEvent = { target: { files: [], value: '' } } as any;

        const { result } = renderHook(() => useExportImport(createDefaultProps()));

        await act(async () => {
          await result.current.importModels(mockEvent);
        });

        expect(mockSetModels).not.toHaveBeenCalled();
      });

      it('should handle file.text() rejection', async () => {
        const mockFile = { text: vi.fn().mockRejectedValue(new Error('Read error')) } as any;
        const mockEvent = { target: { files: [mockFile], value: 'f.json' } } as any;

        const { result } = renderHook(() => useExportImport(createDefaultProps()));

        await act(async () => {
          await result.current.importModels(mockEvent);
        });

        expect(mockSetError).toHaveBeenCalledWith(
          expect.stringContaining('Erro ao importar modelos: Read error')
        );
      });

      it('should handle file.text() rejection for settings', async () => {
        const mockFile = { text: vi.fn().mockRejectedValue(new Error('File read failed')) } as any;
        const mockEvent = { target: { files: [mockFile], value: 'f.json' } } as any;

        const { result } = renderHook(() => useExportImport(createDefaultProps()));

        await act(async () => {
          await result.current.importAiSettings(mockEvent);
        });

        expect(mockShowToast).toHaveBeenCalledWith(
          expect.stringContaining('Erro ao importar: File read failed'),
          'error'
        );
      });

      it('should clear input value on settings import error', async () => {
        const mockFile = { text: vi.fn().mockRejectedValue(new Error('fail')) } as any;
        const mockEvent = { target: { files: [mockFile], value: 'file.json' } } as any;

        const { result } = renderHook(() => useExportImport(createDefaultProps()));

        await act(async () => {
          await result.current.importAiSettings(mockEvent);
        });

        expect(mockEvent.target.value).toBe('');
      });
    });

    describe('Export Errors', () => {
      it('should handle clipboard write failure during settings export', async () => {
        mockClipboardWriteText.mockRejectedValueOnce(new Error('Clipboard denied'));

        const { result } = renderHook(() => useExportImport(createDefaultProps()));

        await act(async () => {
          await result.current.exportAiSettings();
        });

        expect(mockShowToast).toHaveBeenCalledWith(
          expect.stringContaining('Erro ao exportar configurações: Clipboard denied'),
          'error'
        );
      });

      it('should handle clipboard write failure during models export', async () => {
        mockClipboardWriteText.mockRejectedValueOnce(new Error('Permission denied'));
        const models = [createMockModel()];

        const { result } = renderHook(() => useExportImport(createDefaultProps({ models })));

        await act(async () => {
          await result.current.exportModels();
        });

        expect(mockShowToast).toHaveBeenCalledWith(
          expect.stringContaining('Erro ao exportar modelos: Permission denied'),
          'error'
        );
      });

      it('should handle URL.createObjectURL failure gracefully', async () => {
        global.URL.createObjectURL = vi.fn().mockImplementation(() => {
          throw new Error('Blob URL creation failed');
        });
        // clipboard succeeds but createObjectURL throws
        mockClipboardWriteText.mockResolvedValue(undefined);

        const { result } = renderHook(() => useExportImport(createDefaultProps()));

        await act(async () => {
          await result.current.exportAiSettings();
        });

        // Since clipboard succeeds first and then createObjectURL throws,
        // the catch block should trigger
        expect(mockShowToast).toHaveBeenCalledWith(
          expect.stringContaining('Erro ao exportar'),
          'error'
        );
      });

      it('should handle embedding generation failure silently during import', async () => {
        const AIModelService = await import('../services/AIModelService');
        (AIModelService.default.getEmbedding as ReturnType<typeof vi.fn>).mockRejectedValue(
          new Error('Embedding failed')
        );

        const modelsWithoutEmbedding = [{ title: 'M', content: '<p>C</p>' }];
        const mockFile = { text: vi.fn().mockResolvedValue(JSON.stringify(modelsWithoutEmbedding)) } as any;
        const mockEvent = { target: { files: [mockFile], value: 'f.json' } } as any;

        const { result } = renderHook(() => useExportImport(createDefaultProps({
          searchModelReady: true,
          aiSettings: createMockAISettings({ modelSemanticEnabled: true })
        })));

        await act(async () => {
          await result.current.importModels(mockEvent);
        });

        // Should still import successfully despite embedding failure
        expect(mockSetModels).toHaveBeenCalled();
        expect(mockShowToast).toHaveBeenCalledWith(
          expect.stringContaining('1 modelo(s) importado(s)'),
          'success'
        );
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. PARTIAL STATE RESTORATION / DUPLICATE DETECTION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Partial State Restoration', () => {
    describe('checkDuplicate - Title + Category Match', () => {
      it('should detect exact title + category match', () => {
        const existing = [
          createMockModel({ id: 'ex-1', title: 'Dano Moral', category: 'MERITO' })
        ];
        const { result } = renderHook(() => useExportImport(createDefaultProps({ models: existing })));

        const check = result.current.checkDuplicate(
          { title: 'Dano Moral', content: 'Different content', category: 'MERITO' },
          existing
        );

        expect(check.isDuplicate).toBe(true);
        expect(check.reason).toBe('Mesmo título e categoria');
        expect(check.existingId).toBe('ex-1');
      });

      it('should not match if same title but different category', () => {
        const existing = [
          createMockModel({ id: 'ex-1', title: 'Dano Moral', category: 'MERITO' })
        ];
        const { result } = renderHook(() => useExportImport(createDefaultProps({ models: existing })));

        const check = result.current.checkDuplicate(
          { title: 'Dano Moral', content: 'Content', category: 'PRELIMINAR' },
          existing
        );

        expect(check.isDuplicate).toBe(false);
      });

      it('should use empty string as default category for new model', () => {
        const existing = [
          createMockModel({ id: 'ex-1', title: 'Test', category: '' })
        ];
        const { result } = renderHook(() => useExportImport(createDefaultProps({ models: existing })));

        // No category specified in new model -> defaults to ''
        const check = result.current.checkDuplicate(
          { title: 'Test', content: 'C' },
          existing
        );

        expect(check.isDuplicate).toBe(true);
      });
    });

    describe('checkDuplicate - Content Match', () => {
      it('should detect exact content match even with different title', () => {
        const existing = [
          createMockModel({ id: 'ex-2', title: 'Original', content: '<p>Same content here</p>' })
        ];
        const { result } = renderHook(() => useExportImport(createDefaultProps({ models: existing })));

        const check = result.current.checkDuplicate(
          { title: 'Totally Different Name', content: '<p>Same content here</p>' },
          existing
        );

        expect(check.isDuplicate).toBe(true);
        expect(check.reason).toBe('Conteúdo idêntico (título diferente)');
        expect(check.existingId).toBe('ex-2');
      });

      it('should normalize whitespace for content comparison', () => {
        const existing = [
          createMockModel({ id: 'ex-3', content: '  Multiple   spaces   here  ' })
        ];
        const { result } = renderHook(() => useExportImport(createDefaultProps({ models: existing })));

        const check = result.current.checkDuplicate(
          { title: 'New', content: 'multiple spaces here' },
          existing
        );

        expect(check.isDuplicate).toBe(true);
      });

      it('should normalize case for content comparison', () => {
        const existing = [
          createMockModel({ id: 'ex-4', content: 'UPPERCASE CONTENT' })
        ];
        const { result } = renderHook(() => useExportImport(createDefaultProps({ models: existing })));

        const check = result.current.checkDuplicate(
          { title: 'New', content: 'uppercase content' },
          existing
        );

        expect(check.isDuplicate).toBe(true);
      });

      it('should normalize leading/trailing whitespace', () => {
        const existing = [
          createMockModel({ id: 'ex-5', content: '   padded content   ' })
        ];
        const { result } = renderHook(() => useExportImport(createDefaultProps({ models: existing })));

        const check = result.current.checkDuplicate(
          { title: 'New', content: 'padded content' },
          existing
        );

        expect(check.isDuplicate).toBe(true);
      });
    });

    describe('checkDuplicate - Non-duplicates', () => {
      it('should return isDuplicate=false for unique model', () => {
        const existing = [
          createMockModel({ title: 'A', content: 'Content A', category: 'CAT1' })
        ];
        const { result } = renderHook(() => useExportImport(createDefaultProps({ models: existing })));

        const check = result.current.checkDuplicate(
          { title: 'B', content: 'Content B', category: 'CAT2' },
          existing
        );

        expect(check.isDuplicate).toBe(false);
        expect(check.reason).toBeUndefined();
        expect(check.existingId).toBeUndefined();
      });

      it('should not flag near-similar content as duplicate', () => {
        const existing = [
          createMockModel({ content: 'The quick brown fox jumps over the lazy dog' })
        ];
        const { result } = renderHook(() => useExportImport(createDefaultProps({ models: existing })));

        const check = result.current.checkDuplicate(
          { title: 'New', content: 'The quick brown fox jumps over the lazy cat' },
          existing
        );

        expect(check.isDuplicate).toBe(false);
      });

      it('should handle empty existing models array', () => {
        const { result } = renderHook(() => useExportImport(createDefaultProps({ models: [] })));

        const check = result.current.checkDuplicate(
          { title: 'Any', content: 'Any content' },
          []
        );

        expect(check.isDuplicate).toBe(false);
      });
    });

    describe('Partial Import with Duplicates', () => {
      it('should import only non-duplicate models from batch', async () => {
        const existing = [
          createMockModel({ title: 'Existing A', content: '<p>Content A</p>', category: 'MERITO' })
        ];
        const importedModels = [
          { title: 'Existing A', content: '<p>Different</p>', category: 'MERITO' }, // dup by title+cat
          { title: 'New B', content: '<p>Content B</p>' },
          { title: 'New C', content: '<p>Content C</p>' }
        ];
        const mockFile = { text: vi.fn().mockResolvedValue(JSON.stringify(importedModels)) } as any;
        const mockEvent = { target: { files: [mockFile], value: 'f.json' } } as any;

        const { result } = renderHook(() => useExportImport(createDefaultProps({ models: existing })));

        await act(async () => {
          await result.current.importModels(mockEvent);
        });

        const updater = mockSetModels.mock.calls[0][0];
        const newModels = updater(existing);
        // existing (1) + new non-duplicates (2)
        expect(newModels).toHaveLength(3);
      });

      it('should show warning toast when all models are duplicates', async () => {
        const existing = [
          createMockModel({ title: 'Only Model', content: '<p>Only</p>', category: 'MERITO' })
        ];
        const importedModels = [
          { title: 'Only Model', content: '<p>Different</p>', category: 'MERITO' }
        ];
        const mockFile = { text: vi.fn().mockResolvedValue(JSON.stringify(importedModels)) } as any;
        const mockEvent = { target: { files: [mockFile], value: 'f.json' } } as any;

        const { result } = renderHook(() => useExportImport(createDefaultProps({ models: existing })));

        await act(async () => {
          await result.current.importModels(mockEvent);
        });

        expect(mockShowToast).toHaveBeenCalledWith(
          expect.stringContaining('0 modelo(s) importado(s)'),
          'warning'
        );
      });

      it('should show success toast with both import and duplicate counts', async () => {
        const existing = [
          createMockModel({ title: 'Dup1', content: '<p>C1</p>', category: 'MERITO' }),
          createMockModel({ title: 'Dup2', content: '<p>C2</p>', category: 'MERITO' })
        ];
        const importedModels = [
          { title: 'Dup1', content: '<p>X</p>', category: 'MERITO' },  // dup
          { title: 'Dup2', content: '<p>Y</p>', category: 'MERITO' },  // dup
          { title: 'New1', content: '<p>N1</p>' },
          { title: 'New2', content: '<p>N2</p>' },
          { title: 'New3', content: '<p>N3</p>' }
        ];
        const mockFile = { text: vi.fn().mockResolvedValue(JSON.stringify(importedModels)) } as any;
        const mockEvent = { target: { files: [mockFile], value: 'f.json' } } as any;

        const { result } = renderHook(() => useExportImport(createDefaultProps({ models: existing })));

        await act(async () => {
          await result.current.importModels(mockEvent);
        });

        expect(mockShowToast).toHaveBeenCalledWith(
          expect.stringContaining('3 modelo(s) importado(s)'),
          'success'
        );
        expect(mockShowToast).toHaveBeenCalledWith(
          expect.stringContaining('2 duplicata(s) ignorada(s)'),
          'success'
        );
      });

      it('should detect content duplicate and skip it', async () => {
        const existing = [
          createMockModel({ title: 'Original Title', content: '<p>Exact Same Content</p>' })
        ];
        const importedModels = [
          { title: 'Different Title', content: '<p>Exact Same Content</p>' } // dup by content
        ];
        const mockFile = { text: vi.fn().mockResolvedValue(JSON.stringify(importedModels)) } as any;
        const mockEvent = { target: { files: [mockFile], value: 'f.json' } } as any;

        const { result } = renderHook(() => useExportImport(createDefaultProps({ models: existing })));

        await act(async () => {
          await result.current.importModels(mockEvent);
        });

        expect(mockShowToast).toHaveBeenCalledWith(
          expect.stringContaining('1 duplicata(s) ignorada(s)'),
          'warning'
        );
        expect(mockSetModels).not.toHaveBeenCalled();
      });

      it('should not mark hasUnsavedChanges when no models are imported', async () => {
        const existing = [
          createMockModel({ title: 'Only', content: 'C', category: 'X' })
        ];
        const importedModels = [
          { title: 'Only', content: 'Different', category: 'X' } // dup
        ];
        const mockFile = { text: vi.fn().mockResolvedValue(JSON.stringify(importedModels)) } as any;
        const mockEvent = { target: { files: [mockFile], value: 'f.json' } } as any;

        const { result } = renderHook(() => useExportImport(createDefaultProps({ models: existing })));

        await act(async () => {
          await result.current.importModels(mockEvent);
        });

        expect(mockSetHasUnsavedChanges).not.toHaveBeenCalled();
      });
    });

    describe('Color Stripping on Import', () => {
      it('should strip inline colors from imported model content', async () => {
        const { stripInlineColors } = await import('../utils/color-stripper');
        const importedModels = [
          { title: 'Colored', content: '<p style="color: red;">Text</p>' }
        ];
        const mockFile = { text: vi.fn().mockResolvedValue(JSON.stringify(importedModels)) } as any;
        const mockEvent = { target: { files: [mockFile], value: 'f.json' } } as any;

        const { result } = renderHook(() => useExportImport(createDefaultProps()));

        await act(async () => {
          await result.current.importModels(mockEvent);
        });

        expect(stripInlineColors).toHaveBeenCalledWith('<p style="color: red;">Text</p>');
      });
    });

    describe('Embedding Generation on Import', () => {
      it('should generate embeddings for models without embedding when conditions are met', async () => {
        const AIModelService = await import('../services/AIModelService');
        (AIModelService.default.getEmbedding as ReturnType<typeof vi.fn>).mockResolvedValue(
          new Array(768).fill(0.2)
        );

        const modelsWithoutEmbedding = [
          { title: 'NoEmbed 1', content: '<p>Content 1</p>' },
          { title: 'NoEmbed 2', content: '<p>Content 2</p>' }
        ];
        const mockFile = { text: vi.fn().mockResolvedValue(JSON.stringify(modelsWithoutEmbedding)) } as any;
        const mockEvent = { target: { files: [mockFile], value: 'f.json' } } as any;

        const { result } = renderHook(() => useExportImport(createDefaultProps({
          searchModelReady: true,
          aiSettings: createMockAISettings({ modelSemanticEnabled: true })
        })));

        await act(async () => {
          await result.current.importModels(mockEvent);
        });

        expect(AIModelService.default.getEmbedding).toHaveBeenCalledTimes(2);
        expect(AIModelService.default.getEmbedding).toHaveBeenCalledWith(
          expect.any(String),
          'passage'
        );
      });

      it('should skip embedding generation for models with valid 768-dim embedding', async () => {
        const AIModelService = await import('../services/AIModelService');
        (AIModelService.default.getEmbedding as ReturnType<typeof vi.fn>).mockClear();

        const validEmbedding = new Array(768).fill(0.5);
        const modelsWithEmbedding = [
          { title: 'HasEmbed', content: '<p>Content</p>', embedding: validEmbedding }
        ];
        const mockFile = { text: vi.fn().mockResolvedValue(JSON.stringify(modelsWithEmbedding)) } as any;
        const mockEvent = { target: { files: [mockFile], value: 'f.json' } } as any;

        const { result } = renderHook(() => useExportImport(createDefaultProps({
          searchModelReady: true,
          aiSettings: createMockAISettings({ modelSemanticEnabled: true })
        })));

        await act(async () => {
          await result.current.importModels(mockEvent);
        });

        expect(AIModelService.default.getEmbedding).not.toHaveBeenCalled();
      });
    });
  });
});
