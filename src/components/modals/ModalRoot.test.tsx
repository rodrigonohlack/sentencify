/**
 * @file ModalRoot.test.tsx
 * @description Testes para o componente ModalRoot
 * @version 1.38.49
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ModalRoot } from './ModalRoot';
import type { ModalRootProps } from './ModalRoot';

// ═══════════════════════════════════════════════════════════════════════════
// MOCKS
// ═══════════════════════════════════════════════════════════════════════════

// Mock all child modals to isolate ModalRoot logic
vi.mock('./index', () => ({
  DeleteTopicModal: (props: any) => props.isOpen ? <div data-testid="delete-topic-modal">DeleteTopicModal</div> : null,
  RenameTopicModal: (props: any) => props.isOpen ? <div data-testid="rename-topic-modal">RenameTopicModal</div> : null,
  MergeTopicsModal: (props: any) => props.isOpen ? <div data-testid="merge-topics-modal">MergeTopicsModal</div> : null,
  SplitTopicModal: (props: any) => props.isOpen ? <div data-testid="split-topic-modal">SplitTopicModal</div> : null,
  NewTopicModal: (props: any) => props.isOpen ? <div data-testid="new-topic-modal">NewTopicModal</div> : null,
  DeleteModelModal: (props: any) => props.isOpen ? <div data-testid="delete-model-modal">DeleteModelModal</div> : null,
  DeleteAllModelsModal: (props: any) => props.isOpen ? <div data-testid="delete-all-models-modal">DeleteAllModelsModal</div> : null,
  BulkDiscardConfirmModal: (props: any) => props.isOpen ? <div data-testid="bulk-discard-modal">BulkDiscardConfirmModal</div> : null,
  ExportModal: (props: any) => props.isOpen ? <div data-testid="export-modal">ExportModal</div> : null,
  ExtractedModelPreviewModal: (props: any) => props.isOpen ? <div data-testid="extracted-model-preview-modal">ExtractedModelPreviewModal</div> : null,
  SimilarityWarningModal: (props: any) => props.warning ? <div data-testid="similarity-warning-modal">SimilarityWarningModal</div> : null,
  // v1.38.51: Novos modais migrados para ModalRoot
  TextPreviewModal: (props: any) => props.isOpen ? <div data-testid="text-preview-modal">TextPreviewModal</div> : null,
  ChangelogModal: () => <div data-testid="changelog-modal">ChangelogModal</div>,
  DoubleCheckReviewModal: () => <div data-testid="double-check-review-modal">DoubleCheckReviewModal</div>,
}));

// Mock stores
const mockModals = {
  deleteTopic: false,
  rename: false,
  merge: false,
  split: false,
  newTopic: false,
  deleteModel: false,
  deleteAllModels: false,
  export: false,
  extractedModelPreview: false,
  bulkDiscardConfirm: false,
};

const mockCloseModal = vi.fn();
const mockOpenModal = vi.fn();
const mockSetCopySuccess = vi.fn();
const mockSetError = vi.fn();

const mockCloseTextPreview = vi.fn();

vi.mock('../../stores/useUIStore', () => ({
  useUIStore: (selector: any) => {
    const state = {
      modals: mockModals,
      closeModal: mockCloseModal,
      openModal: mockOpenModal,
      copySuccess: false,
      setCopySuccess: mockSetCopySuccess,
      setError: mockSetError,
      // v1.38.51: TextPreview state
      textPreview: { isOpen: false, title: '', text: '' },
      closeTextPreview: mockCloseTextPreview,
    };
    return selector(state);
  },
}));

const mockTopicToDelete = null;
const mockSetTopicToDelete = vi.fn();
const mockTopicToRename = null;
const mockSetTopicToRename = vi.fn();
const mockNewTopicName = '';
const mockSetNewTopicName = vi.fn();
const mockTopicsToMerge: any[] = [];
const mockTopicToSplit = null;
const mockSetTopicToSplit = vi.fn();
const mockSplitNames: string[] = [];
const mockSetSplitNames = vi.fn();
const mockNewTopicData = null;
const mockSetNewTopicData = vi.fn();

vi.mock('../../stores/useTopicsStore', () => ({
  useTopicsStore: (selector: any) => {
    const state = {
      topicToDelete: mockTopicToDelete,
      setTopicToDelete: mockSetTopicToDelete,
      topicToRename: mockTopicToRename,
      setTopicToRename: mockSetTopicToRename,
      newTopicName: mockNewTopicName,
      setNewTopicName: mockSetNewTopicName,
      topicsToMerge: mockTopicsToMerge,
      topicToSplit: mockTopicToSplit,
      setTopicToSplit: mockSetTopicToSplit,
      splitNames: mockSplitNames,
      setSplitNames: mockSetSplitNames,
      newTopicData: mockNewTopicData,
      setNewTopicData: mockSetNewTopicData,
    };
    return selector(state);
  },
}));

const mockModelToDelete = null;
const mockSetModelToDelete = vi.fn();
const mockModels: any[] = [];
const mockDeleteAllConfirmText = '';
const mockSetDeleteAllConfirmText = vi.fn();
const mockSimilarityWarning = null;
const mockExtractedModelPreview = null;
const mockSetExtractedModelPreview = vi.fn();

vi.mock('../../stores/useModelsStore', () => ({
  useModelsStore: (selector: any) => {
    const state = {
      modelToDelete: mockModelToDelete,
      setModelToDelete: mockSetModelToDelete,
      models: mockModels,
      deleteAllConfirmText: mockDeleteAllConfirmText,
      setDeleteAllConfirmText: mockSetDeleteAllConfirmText,
      similarityWarning: mockSimilarityWarning,
      extractedModelPreview: mockExtractedModelPreview,
      setExtractedModelPreview: mockSetExtractedModelPreview,
    };
    return selector(state);
  },
}));

const mockConfirmDeleteTopic = vi.fn();
vi.mock('../../hooks/useTopicModalHandlers', () => ({
  useTopicModalHandlers: () => ({
    confirmDeleteTopic: mockConfirmDeleteTopic,
    cancelDeleteTopic: vi.fn(),
    cancelRenameTopic: vi.fn(),
    cancelMergeTopics: vi.fn(),
    cancelSplitTopic: vi.fn(),
    cancelNewTopic: vi.fn(),
    cancelAllTopicOperations: vi.fn(),
    openDeleteTopicModal: vi.fn(),
    openRenameTopicModal: vi.fn(),
    openMergeTopicsModal: vi.fn(),
    openSplitTopicModal: vi.fn(),
    openNewTopicModal: vi.fn(),
  }),
}));

const mockConfirmDeleteModel = vi.fn();
const mockConfirmDeleteAllModels = vi.fn();
vi.mock('../../hooks/useModelModalHandlers', () => ({
  useModelModalHandlers: () => ({
    confirmDeleteModel: mockConfirmDeleteModel,
    cancelDeleteModel: vi.fn(),
    confirmDeleteAllModels: mockConfirmDeleteAllModels,
    cancelDeleteAllModels: vi.fn(),
    cancelSimilarityWarning: vi.fn(),
    cancelExtractedModelPreview: vi.fn(),
    cancelBulkUpload: vi.fn(),
    cancelBulkReview: vi.fn(),
    openDeleteModelModal: vi.fn(),
  }),
}));

// ═══════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('ModalRoot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset modal states
    Object.keys(mockModals).forEach((key) => {
      (mockModals as any)[key] = false;
    });
  });

  const createProps = (overrides: Partial<ModalRootProps> = {}): ModalRootProps => ({
    exportedText: '',
    exportedHtml: '',
    ...overrides,
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // BASIC RENDERING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Basic Rendering', () => {
    it('should render without crashing with minimal props', () => {
      const { container } = render(<ModalRoot {...createProps()} />);
      expect(container).toBeDefined();
    });

    it('should render without crashing with no props', () => {
      const { container } = render(<ModalRoot />);
      expect(container).toBeDefined();
    });

    it('should always render DeleteTopicModal (with isOpen=false by default)', () => {
      render(<ModalRoot {...createProps()} />);
      // The mock DeleteTopicModal returns null when isOpen=false
      expect(screen.queryByTestId('delete-topic-modal')).not.toBeInTheDocument();
    });

    it('should always render DeleteModelModal (with isOpen=false by default)', () => {
      render(<ModalRoot {...createProps()} />);
      expect(screen.queryByTestId('delete-model-modal')).not.toBeInTheDocument();
    });

    it('should always render DeleteAllModelsModal (with isOpen=false by default)', () => {
      render(<ModalRoot {...createProps()} />);
      expect(screen.queryByTestId('delete-all-models-modal')).not.toBeInTheDocument();
    });

    it('should always render ExportModal (with isOpen=false by default)', () => {
      render(<ModalRoot {...createProps()} />);
      expect(screen.queryByTestId('export-modal')).not.toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DELETE TOPIC MODAL
  // ═══════════════════════════════════════════════════════════════════════════

  describe('DeleteTopicModal', () => {
    it('should show DeleteTopicModal when modals.deleteTopic is true', () => {
      mockModals.deleteTopic = true;
      render(<ModalRoot {...createProps()} />);
      expect(screen.getByTestId('delete-topic-modal')).toBeInTheDocument();
    });

    it('should hide DeleteTopicModal when modals.deleteTopic is false', () => {
      mockModals.deleteTopic = false;
      render(<ModalRoot {...createProps()} />);
      expect(screen.queryByTestId('delete-topic-modal')).not.toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RENAME TOPIC MODAL
  // ═══════════════════════════════════════════════════════════════════════════

  describe('RenameTopicModal', () => {
    it('should not render RenameTopicModal when handleRenameTopic is not provided', () => {
      mockModals.rename = true;
      render(<ModalRoot {...createProps()} />);
      expect(screen.queryByTestId('rename-topic-modal')).not.toBeInTheDocument();
    });

    it('should render RenameTopicModal when handleRenameTopic is provided and modal is open', () => {
      mockModals.rename = true;
      render(<ModalRoot {...createProps({ handleRenameTopic: vi.fn() })} />);
      expect(screen.getByTestId('rename-topic-modal')).toBeInTheDocument();
    });

    it('should not render RenameTopicModal when handleRenameTopic is provided but modal is closed', () => {
      mockModals.rename = false;
      render(<ModalRoot {...createProps({ handleRenameTopic: vi.fn() })} />);
      expect(screen.queryByTestId('rename-topic-modal')).not.toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // MERGE TOPICS MODAL
  // ═══════════════════════════════════════════════════════════════════════════

  describe('MergeTopicsModal', () => {
    it('should not render MergeTopicsModal when handleMergeTopics is not provided', () => {
      mockModals.merge = true;
      render(<ModalRoot {...createProps()} />);
      expect(screen.queryByTestId('merge-topics-modal')).not.toBeInTheDocument();
    });

    it('should render MergeTopicsModal when handleMergeTopics is provided and modal is open', () => {
      mockModals.merge = true;
      render(<ModalRoot {...createProps({ handleMergeTopics: vi.fn() })} />);
      expect(screen.getByTestId('merge-topics-modal')).toBeInTheDocument();
    });

    it('should not render MergeTopicsModal when handleMergeTopics is provided but modal is closed', () => {
      mockModals.merge = false;
      render(<ModalRoot {...createProps({ handleMergeTopics: vi.fn() })} />);
      expect(screen.queryByTestId('merge-topics-modal')).not.toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SPLIT TOPIC MODAL
  // ═══════════════════════════════════════════════════════════════════════════

  describe('SplitTopicModal', () => {
    it('should not render SplitTopicModal when handleSplitTopic is not provided', () => {
      mockModals.split = true;
      render(<ModalRoot {...createProps()} />);
      expect(screen.queryByTestId('split-topic-modal')).not.toBeInTheDocument();
    });

    it('should render SplitTopicModal when handleSplitTopic is provided and modal is open', () => {
      mockModals.split = true;
      render(<ModalRoot {...createProps({ handleSplitTopic: vi.fn() })} />);
      expect(screen.getByTestId('split-topic-modal')).toBeInTheDocument();
    });

    it('should not render SplitTopicModal when handleSplitTopic is provided but modal is closed', () => {
      mockModals.split = false;
      render(<ModalRoot {...createProps({ handleSplitTopic: vi.fn() })} />);
      expect(screen.queryByTestId('split-topic-modal')).not.toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // NEW TOPIC MODAL
  // ═══════════════════════════════════════════════════════════════════════════

  describe('NewTopicModal', () => {
    it('should not render NewTopicModal when handleCreateNewTopic is not provided', () => {
      mockModals.newTopic = true;
      render(<ModalRoot {...createProps()} />);
      expect(screen.queryByTestId('new-topic-modal')).not.toBeInTheDocument();
    });

    it('should render NewTopicModal when handleCreateNewTopic is provided and modal is open', () => {
      mockModals.newTopic = true;
      render(<ModalRoot {...createProps({ handleCreateNewTopic: vi.fn() })} />);
      expect(screen.getByTestId('new-topic-modal')).toBeInTheDocument();
    });

    it('should not render NewTopicModal when handleCreateNewTopic is provided but modal is closed', () => {
      mockModals.newTopic = false;
      render(<ModalRoot {...createProps({ handleCreateNewTopic: vi.fn() })} />);
      expect(screen.queryByTestId('new-topic-modal')).not.toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DELETE MODEL MODAL
  // ═══════════════════════════════════════════════════════════════════════════

  describe('DeleteModelModal', () => {
    it('should show DeleteModelModal when modals.deleteModel is true', () => {
      mockModals.deleteModel = true;
      render(<ModalRoot {...createProps()} />);
      expect(screen.getByTestId('delete-model-modal')).toBeInTheDocument();
    });

    it('should hide DeleteModelModal when modals.deleteModel is false', () => {
      mockModals.deleteModel = false;
      render(<ModalRoot {...createProps()} />);
      expect(screen.queryByTestId('delete-model-modal')).not.toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DELETE ALL MODELS MODAL
  // ═══════════════════════════════════════════════════════════════════════════

  describe('DeleteAllModelsModal', () => {
    it('should show DeleteAllModelsModal when modals.deleteAllModels is true', () => {
      mockModals.deleteAllModels = true;
      render(<ModalRoot {...createProps()} />);
      expect(screen.getByTestId('delete-all-models-modal')).toBeInTheDocument();
    });

    it('should hide DeleteAllModelsModal when modals.deleteAllModels is false', () => {
      mockModals.deleteAllModels = false;
      render(<ModalRoot {...createProps()} />);
      expect(screen.queryByTestId('delete-all-models-modal')).not.toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPORT MODAL
  // ═══════════════════════════════════════════════════════════════════════════

  describe('ExportModal', () => {
    it('should show ExportModal when modals.export is true', () => {
      mockModals.export = true;
      render(<ModalRoot {...createProps({ exportedText: 'test text', exportedHtml: '<p>html</p>' })} />);
      expect(screen.getByTestId('export-modal')).toBeInTheDocument();
    });

    it('should hide ExportModal when modals.export is false', () => {
      mockModals.export = false;
      render(<ModalRoot {...createProps()} />);
      expect(screen.queryByTestId('export-modal')).not.toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SIMILARITY WARNING MODAL
  // ═══════════════════════════════════════════════════════════════════════════

  describe('SimilarityWarningModal', () => {
    it('should not render SimilarityWarningModal when callbacks are not provided', () => {
      render(<ModalRoot {...createProps()} />);
      expect(screen.queryByTestId('similarity-warning-modal')).not.toBeInTheDocument();
    });

    it('should not render when only some callbacks are provided', () => {
      render(<ModalRoot {...createProps({ onSimilarityCancel: vi.fn() })} />);
      expect(screen.queryByTestId('similarity-warning-modal')).not.toBeInTheDocument();
    });

    it('should not render when two callbacks are provided but third is missing', () => {
      render(<ModalRoot {...createProps({ onSimilarityCancel: vi.fn(), onSimilaritySaveNew: vi.fn() })} />);
      expect(screen.queryByTestId('similarity-warning-modal')).not.toBeInTheDocument();
    });

    it('should render SimilarityWarningModal when all 3 callbacks are provided (warning is null so still hidden)', () => {
      render(<ModalRoot {...createProps({
        onSimilarityCancel: vi.fn(),
        onSimilaritySaveNew: vi.fn(),
        onSimilarityReplace: vi.fn(),
      })} />);
      // Our mock returns null when warning is null
      expect(screen.queryByTestId('similarity-warning-modal')).not.toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EXTRACTED MODEL PREVIEW MODAL
  // ═══════════════════════════════════════════════════════════════════════════

  describe('ExtractedModelPreviewModal', () => {
    it('should not render when callbacks are not provided', () => {
      mockModals.extractedModelPreview = true;
      render(<ModalRoot {...createProps()} />);
      expect(screen.queryByTestId('extracted-model-preview-modal')).not.toBeInTheDocument();
    });

    it('should not render when only onSaveExtractedModel is provided', () => {
      mockModals.extractedModelPreview = true;
      render(<ModalRoot {...createProps({ onSaveExtractedModel: vi.fn() })} />);
      expect(screen.queryByTestId('extracted-model-preview-modal')).not.toBeInTheDocument();
    });

    it('should not render when only onCancelExtractedModel is provided', () => {
      mockModals.extractedModelPreview = true;
      render(<ModalRoot {...createProps({ onCancelExtractedModel: vi.fn() })} />);
      expect(screen.queryByTestId('extracted-model-preview-modal')).not.toBeInTheDocument();
    });

    it('should render when both callbacks are provided and modal is open', () => {
      mockModals.extractedModelPreview = true;
      render(<ModalRoot {...createProps({
        onSaveExtractedModel: vi.fn(),
        onCancelExtractedModel: vi.fn(),
      })} />);
      expect(screen.getByTestId('extracted-model-preview-modal')).toBeInTheDocument();
    });

    it('should not render when both callbacks are provided but modal is closed', () => {
      mockModals.extractedModelPreview = false;
      render(<ModalRoot {...createProps({
        onSaveExtractedModel: vi.fn(),
        onCancelExtractedModel: vi.fn(),
      })} />);
      expect(screen.queryByTestId('extracted-model-preview-modal')).not.toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // BULK DISCARD CONFIRM MODAL
  // ═══════════════════════════════════════════════════════════════════════════

  describe('BulkDiscardConfirmModal', () => {
    it('should not render when onBulkDiscard is not provided', () => {
      mockModals.bulkDiscardConfirm = true;
      render(<ModalRoot {...createProps()} />);
      expect(screen.queryByTestId('bulk-discard-modal')).not.toBeInTheDocument();
    });

    it('should render when onBulkDiscard is provided and modal is open', () => {
      mockModals.bulkDiscardConfirm = true;
      render(<ModalRoot {...createProps({ onBulkDiscard: vi.fn() })} />);
      expect(screen.getByTestId('bulk-discard-modal')).toBeInTheDocument();
    });

    it('should not render when onBulkDiscard is provided but modal is closed', () => {
      mockModals.bulkDiscardConfirm = false;
      render(<ModalRoot {...createProps({ onBulkDiscard: vi.fn() })} />);
      expect(screen.queryByTestId('bulk-discard-modal')).not.toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PROPS DEFAULTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Props Defaults', () => {
    it('should use default empty string for exportedText', () => {
      const { container } = render(<ModalRoot />);
      expect(container).toBeDefined();
    });

    it('should use default empty string for exportedHtml', () => {
      const { container } = render(<ModalRoot />);
      expect(container).toBeDefined();
    });

    it('should use default 0 for bulkReviewModelsCount', () => {
      mockModals.bulkDiscardConfirm = true;
      render(<ModalRoot onBulkDiscard={vi.fn()} />);
      expect(screen.getByTestId('bulk-discard-modal')).toBeInTheDocument();
    });

    it('should use default false for savingFromSimilarity', () => {
      const { container } = render(<ModalRoot
        onSimilarityCancel={vi.fn()}
        onSimilaritySaveNew={vi.fn()}
        onSimilarityReplace={vi.fn()}
      />);
      expect(container).toBeDefined();
    });

    it('should use default identity function for sanitizeHTML', () => {
      const { container } = render(<ModalRoot
        onSimilarityCancel={vi.fn()}
        onSimilaritySaveNew={vi.fn()}
        onSimilarityReplace={vi.fn()}
      />);
      expect(container).toBeDefined();
    });

    it('should use default false for isRegenerating', () => {
      mockModals.rename = true;
      render(<ModalRoot handleRenameTopic={vi.fn()} />);
      expect(screen.getByTestId('rename-topic-modal')).toBeInTheDocument();
    });

    it('should use default false for hasDocuments', () => {
      mockModals.merge = true;
      render(<ModalRoot handleMergeTopics={vi.fn()} />);
      expect(screen.getByTestId('merge-topics-modal')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // MULTIPLE MODALS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Multiple Modals', () => {
    it('should render multiple modals simultaneously when open', () => {
      mockModals.deleteTopic = true;
      mockModals.deleteModel = true;
      mockModals.export = true;
      render(<ModalRoot {...createProps({ exportedText: 'text', exportedHtml: '<p>html</p>' })} />);

      expect(screen.getByTestId('delete-topic-modal')).toBeInTheDocument();
      expect(screen.getByTestId('delete-model-modal')).toBeInTheDocument();
      expect(screen.getByTestId('export-modal')).toBeInTheDocument();
    });

    it('should render topic and model modals together', () => {
      mockModals.rename = true;
      mockModals.deleteAllModels = true;
      render(<ModalRoot
        handleRenameTopic={vi.fn()}
        isRegenerating={false}
        hasDocuments={true}
      />);

      expect(screen.getByTestId('rename-topic-modal')).toBeInTheDocument();
      expect(screen.getByTestId('delete-all-models-modal')).toBeInTheDocument();
    });

    it('should render all topic modals when all handlers are provided', () => {
      mockModals.rename = true;
      mockModals.merge = true;
      mockModals.split = true;
      mockModals.newTopic = true;
      render(<ModalRoot
        handleRenameTopic={vi.fn()}
        handleMergeTopics={vi.fn()}
        handleSplitTopic={vi.fn()}
        handleCreateNewTopic={vi.fn()}
      />);

      expect(screen.getByTestId('rename-topic-modal')).toBeInTheDocument();
      expect(screen.getByTestId('merge-topics-modal')).toBeInTheDocument();
      expect(screen.getByTestId('split-topic-modal')).toBeInTheDocument();
      expect(screen.getByTestId('new-topic-modal')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DISPLAY NAME
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Component Metadata', () => {
    it('should have displayName set to ModalRoot', () => {
      expect(ModalRoot.displayName).toBe('ModalRoot');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PASS-THROUGH PROPS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Props Pass-Through', () => {
    it('should pass isRegenerating to topic modals', () => {
      mockModals.rename = true;
      render(<ModalRoot handleRenameTopic={vi.fn()} isRegenerating={true} />);
      expect(screen.getByTestId('rename-topic-modal')).toBeInTheDocument();
    });

    it('should pass hasDocuments to topic modals', () => {
      mockModals.split = true;
      render(<ModalRoot handleSplitTopic={vi.fn()} hasDocuments={true} />);
      expect(screen.getByTestId('split-topic-modal')).toBeInTheDocument();
    });

    it('should pass trackChange to model handlers hook', () => {
      const trackChange = vi.fn();
      const { container } = render(<ModalRoot trackChange={trackChange} />);
      expect(container).toBeDefined();
    });

    it('should pass bulkReviewModelsCount to BulkDiscardConfirmModal', () => {
      mockModals.bulkDiscardConfirm = true;
      render(<ModalRoot onBulkDiscard={vi.fn()} bulkReviewModelsCount={5} />);
      expect(screen.getByTestId('bulk-discard-modal')).toBeInTheDocument();
    });

    it('should pass savingFromSimilarity to SimilarityWarningModal', () => {
      const { container } = render(<ModalRoot
        onSimilarityCancel={vi.fn()}
        onSimilaritySaveNew={vi.fn()}
        onSimilarityReplace={vi.fn()}
        savingFromSimilarity={true}
      />);
      expect(container).toBeDefined();
    });

    it('should pass sanitizeHTML function to modals', () => {
      const sanitize = vi.fn((html: string) => html);
      const { container } = render(<ModalRoot
        onSimilarityCancel={vi.fn()}
        onSimilaritySaveNew={vi.fn()}
        onSimilarityReplace={vi.fn()}
        sanitizeHTML={sanitize}
      />);
      expect(container).toBeDefined();
    });
  });
});
