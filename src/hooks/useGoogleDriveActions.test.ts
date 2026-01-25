/**
 * @file useGoogleDriveActions.test.ts
 * @description Testes para o hook useGoogleDriveActions
 * @version 1.38.52
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGoogleDriveActions } from './useGoogleDriveActions';
import type { UseGoogleDriveActionsProps } from './useGoogleDriveActions';
import type { GoogleDriveFile } from './useGoogleDrive';

// ═══════════════════════════════════════════════════════════════════════════
// MOCKS
// ═══════════════════════════════════════════════════════════════════════════

const mockSaveFile = vi.fn();
const mockListFiles = vi.fn();
const mockBuildProjectJson = vi.fn();
const mockExportProject = vi.fn();
const mockImportProject = vi.fn();
const mockAutoSaveSession = vi.fn();
const mockSetError = vi.fn();
const mockShowToast = vi.fn();
const mockSetDriveFiles = vi.fn();
const mockSetDriveFilesModalOpen = vi.fn();
const mockOpenModal = vi.fn();
const mockSetAiSettings = vi.fn();
const mockSetTokenMetrics = vi.fn();
const mockSetPastedPeticaoTexts = vi.fn();
const mockSetPastedContestacaoTexts = vi.fn();
const mockSetPastedComplementaryTexts = vi.fn();
const mockSetExtractedTopics = vi.fn();
const mockSetSelectedTopics = vi.fn();
const mockSetPartesProcesso = vi.fn();
const mockSetAnalyzedDocuments = vi.fn();
const mockSetActiveTab = vi.fn();
const mockSetProcessoNumero = vi.fn();
const mockSetPeticaoFiles = vi.fn();
const mockSetContestacaoFiles = vi.fn();
const mockSetComplementaryFiles = vi.fn();
const mockSetExtractedTexts = vi.fn();
const mockSetDocumentProcessingModes = vi.fn();
const mockSetProofFiles = vi.fn();
const mockSetProofTexts = vi.fn();
const mockSetProofUsePdfMode = vi.fn();
const mockSetExtractedProofTexts = vi.fn();
const mockSetProofExtractionFailed = vi.fn();
const mockSetProofTopicLinks = vi.fn();
const mockSetProofAnalysisResults = vi.fn();
const mockSetProofConclusions = vi.fn();
const mockSetProofSendFullContent = vi.fn();

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

const createDefaultProps = (): UseGoogleDriveActionsProps => ({
  googleDrive: {
    saveFile: mockSaveFile,
    listFiles: mockListFiles,
  },
  storage: {
    buildProjectJson: mockBuildProjectJson,
    exportProject: mockExportProject,
    importProject: mockImportProject,
    autoSaveSession: mockAutoSaveSession,
  },
  proofManager: {
    proofFiles: [],
    proofTexts: [],
    proofUsePdfMode: {},
    extractedProofTexts: {},
    proofExtractionFailed: {},
    proofTopicLinks: {},
    proofAnalysisResults: {},
    proofConclusions: {},
    setProofFiles: mockSetProofFiles,
    setProofTexts: mockSetProofTexts,
    setProofUsePdfMode: mockSetProofUsePdfMode,
    setExtractedProofTexts: mockSetExtractedProofTexts,
    setProofExtractionFailed: mockSetProofExtractionFailed,
    setProofTopicLinks: mockSetProofTopicLinks,
    setProofAnalysisResults: mockSetProofAnalysisResults,
    setProofConclusions: mockSetProofConclusions,
    setProofSendFullContent: mockSetProofSendFullContent,
  },
  aiIntegration: {
    aiSettings: { provider: 'anthropic' } as never,
    tokenMetrics: { totalInputTokens: 0, totalOutputTokens: 0 } as never,
    setAiSettings: mockSetAiSettings,
    setTokenMetrics: mockSetTokenMetrics,
  },
  documentState: {
    processoNumero: '0001234-56.2025.5.08.0110',
    pastedPeticaoTexts: [],
    pastedContestacaoTexts: [],
    pastedComplementaryTexts: [],
    extractedTopics: [],
    selectedTopics: [],
    partesProcesso: { reclamante: '', reclamadas: [] },
    activeTab: 'topics',
    analyzedDocuments: { peticoes: [], peticoesText: [], contestacoes: [], contestacoesText: [], complementares: [], complementaresText: [] },
    peticaoFiles: [],
    contestacaoFiles: [],
    complementaryFiles: [],
    extractedTexts: { peticoes: [], contestacoes: [], complementares: [] },
    documentProcessingModes: { peticoes: [], contestacoes: [], complementares: [] },
  },
  documentSetters: {
    setPastedPeticaoTexts: mockSetPastedPeticaoTexts,
    setPastedContestacaoTexts: mockSetPastedContestacaoTexts,
    setPastedComplementaryTexts: mockSetPastedComplementaryTexts,
    setExtractedTopics: mockSetExtractedTopics,
    setSelectedTopics: mockSetSelectedTopics,
    setPartesProcesso: mockSetPartesProcesso,
    setAnalyzedDocuments: mockSetAnalyzedDocuments,
    setActiveTab: mockSetActiveTab,
    setProcessoNumero: mockSetProcessoNumero,
    setPeticaoFiles: mockSetPeticaoFiles,
    setContestacaoFiles: mockSetContestacaoFiles,
    setComplementaryFiles: mockSetComplementaryFiles,
    setExtractedTexts: mockSetExtractedTexts,
    setDocumentProcessingModes: mockSetDocumentProcessingModes,
  },
  setError: mockSetError,
  showToast: mockShowToast,
  setDriveFiles: mockSetDriveFiles,
  setDriveFilesModalOpen: mockSetDriveFilesModalOpen,
  openModal: mockOpenModal,
});

// ═══════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('useGoogleDriveActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // BASIC FUNCTIONALITY
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Basic Functionality', () => {
    it('should return all expected handlers', () => {
      const { result } = renderHook(() => useGoogleDriveActions(createDefaultProps()));

      expect(result.current.handleDriveSave).toBeDefined();
      expect(result.current.handleDriveLoadClick).toBeDefined();
      expect(result.current.handleLocalSave).toBeDefined();
      expect(result.current.handleLocalLoad).toBeDefined();
      expect(result.current.handleClear).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // handleDriveSave
  // ═══════════════════════════════════════════════════════════════════════════

  describe('handleDriveSave', () => {
    it('should save project to Google Drive successfully', async () => {
      const projectJson = { version: '1.0', data: {} };
      mockBuildProjectJson.mockResolvedValueOnce(projectJson);
      mockSaveFile.mockResolvedValueOnce({ id: 'saved-file-id' });

      const { result } = renderHook(() => useGoogleDriveActions(createDefaultProps()));

      await act(async () => {
        await result.current.handleDriveSave();
      });

      expect(mockBuildProjectJson).toHaveBeenCalled();
      expect(mockSaveFile).toHaveBeenCalledWith(
        expect.stringContaining('sentencify-'),
        projectJson
      );
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringContaining('Projeto salvo'),
        'success'
      );
    });

    it('should include process number in filename', async () => {
      mockBuildProjectJson.mockResolvedValueOnce({});
      mockSaveFile.mockResolvedValueOnce({ id: 'saved-file-id' });

      const { result } = renderHook(() => useGoogleDriveActions(createDefaultProps()));

      await act(async () => {
        await result.current.handleDriveSave();
      });

      expect(mockSaveFile).toHaveBeenCalledWith(
        expect.stringContaining('0001234-56.2025.5.08.0110'),
        expect.anything()
      );
    });

    it('should use default name when process number is empty', async () => {
      mockBuildProjectJson.mockResolvedValueOnce({});
      mockSaveFile.mockResolvedValueOnce({ id: 'saved-file-id' });

      const props = createDefaultProps();
      props.documentState.processoNumero = '';

      const { result } = renderHook(() => useGoogleDriveActions(props));

      await act(async () => {
        await result.current.handleDriveSave();
      });

      expect(mockSaveFile).toHaveBeenCalledWith(
        expect.stringContaining('projeto'),
        expect.anything()
      );
    });

    it('should handle save error', async () => {
      mockBuildProjectJson.mockResolvedValueOnce({});
      mockSaveFile.mockRejectedValueOnce(new Error('Save failed'));

      const { result } = renderHook(() => useGoogleDriveActions(createDefaultProps()));

      await act(async () => {
        await result.current.handleDriveSave();
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringContaining('Save failed'),
        'error'
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // handleDriveLoadClick
  // ═══════════════════════════════════════════════════════════════════════════

  describe('handleDriveLoadClick', () => {
    it('should list files and open modal', async () => {
      const files: GoogleDriveFile[] = [
        { id: 'file-1', name: 'Project 1.json', createdTime: '', modifiedTime: '' },
        { id: 'file-2', name: 'Project 2.json', createdTime: '', modifiedTime: '' },
      ];
      mockListFiles.mockResolvedValueOnce(files);

      const { result } = renderHook(() => useGoogleDriveActions(createDefaultProps()));

      await act(async () => {
        await result.current.handleDriveLoadClick();
      });

      expect(mockListFiles).toHaveBeenCalledTimes(1);
      expect(mockSetDriveFiles).toHaveBeenCalledWith(files);
      expect(mockSetDriveFilesModalOpen).toHaveBeenCalledWith(true);
    });

    it('should handle list error', async () => {
      mockListFiles.mockRejectedValueOnce(new Error('List failed'));

      const { result } = renderHook(() => useGoogleDriveActions(createDefaultProps()));

      await act(async () => {
        await result.current.handleDriveLoadClick();
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringContaining('List failed'),
        'error'
      );
      expect(mockSetDriveFilesModalOpen).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // handleLocalSave
  // ═══════════════════════════════════════════════════════════════════════════

  describe('handleLocalSave', () => {
    it('should call exportProject with all states', () => {
      const { result } = renderHook(() => useGoogleDriveActions(createDefaultProps()));

      act(() => {
        result.current.handleLocalSave();
      });

      expect(mockExportProject).toHaveBeenCalledWith(
        expect.objectContaining({
          processoNumero: '0001234-56.2025.5.08.0110',
          proofFiles: [],
          proofTexts: [],
          aiSettings: { provider: 'anthropic' },
        }),
        expect.any(Function)
      );
    });

    it('should handle export error through callback', () => {
      mockExportProject.mockImplementation((_states, onError) => {
        onError('Export failed');
      });

      const { result } = renderHook(() => useGoogleDriveActions(createDefaultProps()));

      act(() => {
        result.current.handleLocalSave();
      });

      expect(mockSetError).toHaveBeenCalledWith('Export failed');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // handleLocalLoad
  // ═══════════════════════════════════════════════════════════════════════════

  describe('handleLocalLoad', () => {
    it('should call importProject with callbacks', () => {
      const { result } = renderHook(() => useGoogleDriveActions(createDefaultProps()));
      const mockEvent = { target: { files: [{ name: 'project.json' }] } } as unknown as React.ChangeEvent<HTMLInputElement>;

      act(() => {
        result.current.handleLocalLoad(mockEvent);
      });

      expect(mockImportProject).toHaveBeenCalledWith(
        mockEvent,
        expect.objectContaining({
          setPastedPeticaoTexts: mockSetPastedPeticaoTexts,
          setExtractedTopics: mockSetExtractedTopics,
          setProofFiles: mockSetProofFiles,
          setAiSettings: mockSetAiSettings,
        }),
        expect.any(Function)
      );
    });

    it('should pass autoSaveSession function', () => {
      const { result } = renderHook(() => useGoogleDriveActions(createDefaultProps()));
      const mockEvent = { target: { files: [] } } as unknown as React.ChangeEvent<HTMLInputElement>;

      act(() => {
        result.current.handleLocalLoad(mockEvent);
      });

      // Get the third argument (autoSaveFn)
      const autoSaveFn = mockImportProject.mock.calls[0][2];
      expect(typeof autoSaveFn).toBe('function');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // handleClear
  // ═══════════════════════════════════════════════════════════════════════════

  describe('handleClear', () => {
    it('should open clearProject modal', () => {
      const { result } = renderHook(() => useGoogleDriveActions(createDefaultProps()));

      act(() => {
        result.current.handleClear();
      });

      expect(mockOpenModal).toHaveBeenCalledWith('clearProject');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // STATE AGGREGATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('State Aggregation', () => {
    it('should include all document state in buildAllStates', async () => {
      mockBuildProjectJson.mockResolvedValueOnce({});
      mockSaveFile.mockResolvedValueOnce({ id: 'saved' });

      const props = createDefaultProps();
      props.documentState.processoNumero = 'PROC-123';
      props.documentState.activeTab = 'editor';
      props.proofManager.proofFiles = [{ id: 1, name: 'prova.pdf' }] as never[];

      const { result } = renderHook(() => useGoogleDriveActions(props));

      await act(async () => {
        await result.current.handleDriveSave();
      });

      expect(mockBuildProjectJson).toHaveBeenCalledWith(
        expect.objectContaining({
          processoNumero: 'PROC-123',
          activeTab: 'editor',
          proofFiles: [{ id: 1, name: 'prova.pdf' }],
        })
      );
    });

    it('should include AI settings and token metrics', async () => {
      mockBuildProjectJson.mockResolvedValueOnce({});
      mockSaveFile.mockResolvedValueOnce({ id: 'saved' });

      const props = createDefaultProps();
      props.aiIntegration.aiSettings = { provider: 'openai' } as never;
      props.aiIntegration.tokenMetrics = { totalInputTokens: 1000, totalOutputTokens: 500 } as never;

      const { result } = renderHook(() => useGoogleDriveActions(props));

      await act(async () => {
        await result.current.handleDriveSave();
      });

      expect(mockBuildProjectJson).toHaveBeenCalledWith(
        expect.objectContaining({
          aiSettings: { provider: 'openai' },
          tokenMetrics: { totalInputTokens: 1000, totalOutputTokens: 500 },
        })
      );
    });
  });
});
