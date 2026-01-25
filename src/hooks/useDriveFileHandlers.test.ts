/**
 * @file useDriveFileHandlers.test.ts
 * @description Testes para o hook useDriveFileHandlers
 * @version 1.38.52
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDriveFileHandlers } from './useDriveFileHandlers';
import type { GoogleDriveFile } from './useGoogleDrive';

// ═══════════════════════════════════════════════════════════════════════════
// MOCKS
// ═══════════════════════════════════════════════════════════════════════════

const mockLoadFile = vi.fn();
const mockDeleteFile = vi.fn();
const mockShareFile = vi.fn();
const mockListFiles = vi.fn();
const mockGetPermissions = vi.fn();
const mockRemovePermission = vi.fn();
const mockImportProjectFromJson = vi.fn();
const mockAutoSaveSession = vi.fn();
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
const mockSetError = vi.fn();
const mockSetProcessoNumero = vi.fn();
const mockSetPeticaoFiles = vi.fn();
const mockSetContestacaoFiles = vi.fn();
const mockSetComplementaryFiles = vi.fn();
const mockSetExtractedTexts = vi.fn();
const mockSetDocumentProcessingModes = vi.fn();
const mockSetDriveFilesModalOpen = vi.fn();
const mockSetDriveFiles = vi.fn();
const mockSetProofFiles = vi.fn();
const mockSetProofTexts = vi.fn();
const mockSetProofUsePdfMode = vi.fn();
const mockSetExtractedProofTexts = vi.fn();
const mockSetProofExtractionFailed = vi.fn();
const mockSetProofTopicLinks = vi.fn();
const mockSetProofAnalysisResults = vi.fn();
const mockSetProofConclusions = vi.fn();
const mockSetProofSendFullContent = vi.fn();

// Mock the useUIStore
vi.mock('../stores/useUIStore', () => ({
  useUIStore: {
    getState: () => ({
      driveFilesList: [
        { id: 'file-1', name: 'Project 1.json' },
        { id: 'file-2', name: 'Project 2.json' },
      ],
    }),
  },
}));

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

const createMockFile = (id: string, name: string) => ({
  id,
  name,
  mimeType: 'application/json',
  createdTime: new Date().toISOString(),
  modifiedTime: new Date().toISOString(),
}) as GoogleDriveFile;

const createDefaultProps = () => ({
  googleDrive: {
    loadFile: mockLoadFile,
    deleteFile: mockDeleteFile,
    shareFile: mockShareFile,
    listFiles: mockListFiles,
    getPermissions: mockGetPermissions,
    removePermission: mockRemovePermission,
  },
  storage: {
    importProjectFromJson: mockImportProjectFromJson,
    autoSaveSession: mockAutoSaveSession,
  },
  proofManager: {
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
    setAiSettings: mockSetAiSettings,
    setTokenMetrics: mockSetTokenMetrics,
  },
  setPastedPeticaoTexts: mockSetPastedPeticaoTexts,
  setPastedContestacaoTexts: mockSetPastedContestacaoTexts,
  setPastedComplementaryTexts: mockSetPastedComplementaryTexts,
  setExtractedTopics: mockSetExtractedTopics,
  setSelectedTopics: mockSetSelectedTopics,
  setPartesProcesso: mockSetPartesProcesso,
  setAnalyzedDocuments: mockSetAnalyzedDocuments,
  setActiveTab: mockSetActiveTab,
  setError: mockSetError,
  setProcessoNumero: mockSetProcessoNumero,
  setPeticaoFiles: mockSetPeticaoFiles,
  setContestacaoFiles: mockSetContestacaoFiles,
  setComplementaryFiles: mockSetComplementaryFiles,
  setExtractedTexts: mockSetExtractedTexts,
  setDocumentProcessingModes: mockSetDocumentProcessingModes,
  setDriveFilesModalOpen: mockSetDriveFilesModalOpen,
  setDriveFiles: mockSetDriveFiles,
});

// ═══════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('useDriveFileHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // BASIC FUNCTIONALITY
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Basic Functionality', () => {
    it('should return all expected handlers', () => {
      const { result } = renderHook(() => useDriveFileHandlers(createDefaultProps()));

      expect(result.current.handleDriveLoad).toBeDefined();
      expect(result.current.handleDriveDelete).toBeDefined();
      expect(result.current.handleDriveShare).toBeDefined();
      expect(result.current.handleDriveRefresh).toBeDefined();
      expect(result.current.handleDriveGetPermissions).toBeDefined();
      expect(result.current.handleDriveRemovePermission).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // handleDriveLoad
  // ═══════════════════════════════════════════════════════════════════════════

  describe('handleDriveLoad', () => {
    it('should load file from Google Drive successfully', async () => {
      const projectData = { processoNumero: '12345', topics: [] };
      mockLoadFile.mockResolvedValueOnce(projectData);
      mockImportProjectFromJson.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useDriveFileHandlers(createDefaultProps()));
      const file = createMockFile('file-1', 'Test Project.json');

      await act(async () => {
        await result.current.handleDriveLoad(file);
      });

      expect(mockLoadFile).toHaveBeenCalledWith('file-1');
      expect(mockImportProjectFromJson).toHaveBeenCalled();
      expect(mockSetDriveFilesModalOpen).toHaveBeenCalledWith(false);
      expect(mockSetError).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'success',
          message: expect.stringContaining('Test Project.json'),
        })
      );
    });

    it('should handle load error', async () => {
      mockLoadFile.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useDriveFileHandlers(createDefaultProps()));
      const file = createMockFile('file-1', 'Test Project.json');

      await act(async () => {
        await result.current.handleDriveLoad(file);
      });

      expect(mockSetError).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          message: expect.stringContaining('Network error'),
        })
      );
    });

    it('should call importProjectFromJson with correct callbacks', async () => {
      mockLoadFile.mockResolvedValueOnce({ processoNumero: '12345' });
      mockImportProjectFromJson.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useDriveFileHandlers(createDefaultProps()));
      const file = createMockFile('file-1', 'Test.json');

      await act(async () => {
        await result.current.handleDriveLoad(file);
      });

      expect(mockImportProjectFromJson).toHaveBeenCalledWith(
        { processoNumero: '12345' },
        expect.objectContaining({
          setPastedPeticaoTexts: mockSetPastedPeticaoTexts,
          setExtractedTopics: mockSetExtractedTopics,
          setProofFiles: mockSetProofFiles,
        }),
        expect.any(Function)
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // handleDriveDelete
  // ═══════════════════════════════════════════════════════════════════════════

  describe('handleDriveDelete', () => {
    it('should delete file from Google Drive successfully', async () => {
      mockDeleteFile.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useDriveFileHandlers(createDefaultProps()));
      const file = createMockFile('file-1', 'Delete Me.json');

      await act(async () => {
        await result.current.handleDriveDelete(file);
      });

      expect(mockDeleteFile).toHaveBeenCalledWith('file-1');
      expect(mockSetDriveFiles).toHaveBeenCalled();
      expect(mockSetError).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'success',
          message: expect.stringContaining('Delete Me.json'),
        })
      );
    });

    it('should filter out deleted file from list', async () => {
      mockDeleteFile.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useDriveFileHandlers(createDefaultProps()));
      const file = createMockFile('file-1', 'Delete Me.json');

      await act(async () => {
        await result.current.handleDriveDelete(file);
      });

      // setDriveFiles should be called with files filtered (excluding file-1)
      const setFilesCall = mockSetDriveFiles.mock.calls[0][0];
      expect(setFilesCall).toHaveLength(1);
      expect(setFilesCall[0].id).toBe('file-2');
    });

    it('should handle delete error', async () => {
      mockDeleteFile.mockRejectedValueOnce(new Error('Delete failed'));

      const { result } = renderHook(() => useDriveFileHandlers(createDefaultProps()));
      const file = createMockFile('file-1', 'Test.json');

      await act(async () => {
        await result.current.handleDriveDelete(file);
      });

      expect(mockSetError).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          message: expect.stringContaining('Delete failed'),
        })
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // handleDriveShare
  // ═══════════════════════════════════════════════════════════════════════════

  describe('handleDriveShare', () => {
    it('should share file with writer role', async () => {
      mockShareFile.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useDriveFileHandlers(createDefaultProps()));

      await act(async () => {
        await result.current.handleDriveShare('file-1', 'user@example.com', 'writer');
      });

      expect(mockShareFile).toHaveBeenCalledWith('file-1', 'user@example.com', 'writer');
      expect(mockSetError).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'success',
          message: expect.stringContaining('edição'),
        })
      );
    });

    it('should share file with reader role', async () => {
      mockShareFile.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useDriveFileHandlers(createDefaultProps()));

      await act(async () => {
        await result.current.handleDriveShare('file-1', 'reader@example.com', 'reader');
      });

      expect(mockShareFile).toHaveBeenCalledWith('file-1', 'reader@example.com', 'reader');
      expect(mockSetError).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'success',
          message: expect.stringContaining('visualização'),
        })
      );
    });

    it('should handle share error', async () => {
      mockShareFile.mockRejectedValueOnce(new Error('Share failed'));

      const { result } = renderHook(() => useDriveFileHandlers(createDefaultProps()));

      await act(async () => {
        await result.current.handleDriveShare('file-1', 'user@example.com', 'writer');
      });

      expect(mockSetError).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          message: expect.stringContaining('Share failed'),
        })
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // handleDriveRefresh
  // ═══════════════════════════════════════════════════════════════════════════

  describe('handleDriveRefresh', () => {
    it('should refresh file list from Google Drive', async () => {
      const files: GoogleDriveFile[] = [
        createMockFile('new-1', 'New File 1.json'),
        createMockFile('new-2', 'New File 2.json'),
      ];
      mockListFiles.mockResolvedValueOnce(files);

      const { result } = renderHook(() => useDriveFileHandlers(createDefaultProps()));

      await act(async () => {
        await result.current.handleDriveRefresh();
      });

      expect(mockListFiles).toHaveBeenCalledTimes(1);
      expect(mockSetDriveFiles).toHaveBeenCalledWith(files);
    });

    it('should handle refresh error', async () => {
      mockListFiles.mockRejectedValueOnce(new Error('List failed'));

      const { result } = renderHook(() => useDriveFileHandlers(createDefaultProps()));

      await act(async () => {
        await result.current.handleDriveRefresh();
      });

      expect(mockSetError).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          message: expect.stringContaining('List failed'),
        })
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PASSTHROUGH HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Passthrough Handlers', () => {
    it('should pass through getPermissions from googleDrive', () => {
      const { result } = renderHook(() => useDriveFileHandlers(createDefaultProps()));

      expect(result.current.handleDriveGetPermissions).toBe(mockGetPermissions);
    });

    it('should pass through removePermission from googleDrive', () => {
      const { result } = renderHook(() => useDriveFileHandlers(createDefaultProps()));

      expect(result.current.handleDriveRemovePermission).toBe(mockRemovePermission);
    });
  });
});
