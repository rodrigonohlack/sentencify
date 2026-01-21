/**
 * @file ModelsTab.test.tsx
 * @description Testes de regressão para o componente ModelsTab
 * @version 1.38.39
 *
 * Cobre todas as ações do usuário:
 * 1. Header com botões (Novo, Importar, Exportar, etc)
 * 2. Busca e filtros (textual/semântica, categorias, favoritos)
 * 3. Alternância de visualização (cards/lista)
 * 4. Banner de mudanças não exportadas
 * 5. Filtro de propriedade (todos/meus/compartilhados)
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ModelsTab } from './ModelsTab';
import type { ModelsTabProps, Model, ModalState } from '../../types';

// Mock child components
vi.mock('../', () => ({
  SyncStatusIndicator: ({ status, onSync }: { status: string; onSync: () => void }) => (
    <div data-testid="sync-status-indicator" data-status={status}>
      <button onClick={onSync}>Sync</button>
    </div>
  ),
  ModelFormModal: ({ isOpen }: { isOpen: boolean }) => (
    isOpen ? <div data-testid="model-form-modal">Model Form Modal</div> : null
  ),
  ModelCard: ({ model, viewMode, onEdit, onToggleFavorite, onDuplicate, onDelete }: {
    model: Model;
    viewMode: string;
    onEdit: (m: Model) => void;
    onToggleFavorite: (id: string) => void;
    onDuplicate: (m: Model) => void;
    onDelete: (id: string) => void;
  }) => (
    <div data-testid={`model-card-${model.id}`} data-viewmode={viewMode}>
      <span>{model.title}</span>
      <button onClick={() => onEdit(model)}>Edit</button>
      <button onClick={() => onToggleFavorite(model.id)}>Fav</button>
      <button onClick={() => onDuplicate(model)}>Dup</button>
      <button onClick={() => onDelete(model.id)}>Del</button>
    </div>
  ),
  VirtualList: ({ items, renderItem }: { items: Model[]; renderItem: (m: Model) => React.ReactNode }) => (
    <div data-testid="virtual-list">
      {items.map(item => renderItem(item))}
    </div>
  ),
}));

// Mock CSS
vi.mock('../../constants/styles', () => ({
  CSS: {
    flexGap2: 'flex gap-2',
    textMuted: 'text-muted',
  },
}));

describe('ModelsTab', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // DEFAULT PROPS FACTORY
  // ═══════════════════════════════════════════════════════════════════════════

  const createMockModel = (id: string, title: string, overrides: Partial<Model> = {}): Model => ({
    id,
    title,
    content: `<p>Content for ${title}</p>`,
    keywords: 'keyword1, keyword2',
    category: 'Geral',
    favorite: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  });

  const createMockProps = (overrides: Partial<ModelsTabProps> = {}): ModelsTabProps => ({
    modals: { modelForm: false } as ModalState,
    openModal: vi.fn(),
    closeModal: vi.fn(),
    modelLibrary: {
      models: [],
      hasUnsavedChanges: false,
      searchTerm: '',
      setSearchTerm: vi.fn(),
      selectedCategory: 'all',
      setSelectedCategory: vi.fn(),
      showFavoritesOnly: false,
      setShowFavoritesOnly: vi.fn(),
      ownershipFilter: 'all',
      setOwnershipFilter: vi.fn(),
      modelViewMode: 'cards',
      setModelViewMode: vi.fn(),
      currentModelPage: 1,
      setCurrentModelPage: vi.fn(),
      modelsPerPage: 10,
      setNewModel: vi.fn(),
      setEditingModel: vi.fn(),
      editingModel: null,
      newModel: { title: '', content: '', keywords: '', category: '' },
    },
    cloudSync: {
      isAuthenticated: false,
      syncStatus: 'idle',
      pendingCount: 0,
      lastSyncAt: null,
      sync: vi.fn(),
      pushAllModels: vi.fn(),
      user: null,
    },
    aiIntegration: {
      generatingKeywords: false,
      generatingTitle: false,
    },
    useModelSemanticSearch: false,
    setUseModelSemanticSearch: vi.fn(),
    modelSemanticResults: null,
    setModelSemanticResults: vi.fn(),
    searchingModelSemantics: false,
    modelSemanticAvailable: false,
    filteredModels: [],
    currentModels: [],
    totalModelPages: 1,
    indexOfFirstModel: 0,
    indexOfLastModel: 0,
    categories: [],
    categoryCounts: { counts: {}, withoutCategory: 0, favorites: 0 },
    exportModels: vi.fn(),
    importModels: vi.fn(),
    saveModel: vi.fn(),
    saveModelWithoutClosing: vi.fn(),
    generateKeywordsWithAI: vi.fn(),
    generateTitleWithAI: vi.fn(),
    startEditingModel: vi.fn(),
    toggleFavorite: vi.fn(),
    duplicateModel: vi.fn(),
    confirmDeleteModel: vi.fn(),
    sanitizeHTML: vi.fn((html: string | null | undefined) => html ?? ''),
    fileInputRef: { current: null },
    modelFormRef: { current: null },
    modelEditorRef: { current: null },
    quillReady: true,
    quillError: null,
    editorTheme: 'dark',
    toggleEditorTheme: vi.fn(),
    modelSaved: false,
    savingModel: false,
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERING TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Rendering', () => {
    it('should render "Banco de Modelos" title', () => {
      const props = createMockProps();
      render(<ModelsTab {...props} />);

      expect(screen.getByText('Banco de Modelos')).toBeInTheDocument();
    });

    it('should render all action buttons', () => {
      const props = createMockProps();
      render(<ModelsTab {...props} />);

      expect(screen.getByText('Criar de Arquivos')).toBeInTheDocument();
      expect(screen.getByText('Importar')).toBeInTheDocument();
      expect(screen.getByText('Exportar')).toBeInTheDocument();
      expect(screen.getByText('Novo Modelo')).toBeInTheDocument();
    });

    it('should render search input', () => {
      const props = createMockProps();
      render(<ModelsTab {...props} />);

      expect(screen.getByPlaceholderText(/Buscar modelos/i)).toBeInTheDocument();
    });

    it('should render category select', () => {
      const props = createMockProps();
      render(<ModelsTab {...props} />);

      expect(screen.getByText(/Todas as categorias/i)).toBeInTheDocument();
    });

    it('should render view mode buttons', () => {
      const props = createMockProps();
      render(<ModelsTab {...props} />);

      expect(screen.getByTitle('Visualização em cards')).toBeInTheDocument();
      expect(screen.getByTitle('Visualização em lista')).toBeInTheDocument();
    });

    it('should show empty state when no models', () => {
      const props = createMockProps({ filteredModels: [] });
      render(<ModelsTab {...props} />);

      expect(screen.getByText(/Nenhum modelo cadastrado ainda/i)).toBeInTheDocument();
    });

    it('should NOT render delete all button when no models', () => {
      const props = createMockProps({
        modelLibrary: {
          ...createMockProps().modelLibrary,
          models: [],
        },
      });
      render(<ModelsTab {...props} />);

      expect(screen.queryByTitle('Excluir todos os modelos')).not.toBeInTheDocument();
    });

    it('should render delete all button when models exist', () => {
      const models = [createMockModel('1', 'Test Model')];
      const props = createMockProps({
        modelLibrary: {
          ...createMockProps().modelLibrary,
          models,
        },
      });
      render(<ModelsTab {...props} />);

      expect(screen.getByTitle('Excluir todos os modelos')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // WARNING BANNER TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Warning Banner', () => {
    it('should NOT show warning when no unsaved changes', () => {
      const props = createMockProps({
        modelLibrary: {
          ...createMockProps().modelLibrary,
          hasUnsavedChanges: false,
          models: [createMockModel('1', 'Test')],
        },
      });
      render(<ModelsTab {...props} />);

      expect(screen.queryByText(/mudanças não exportadas/i)).not.toBeInTheDocument();
    });

    it('should show warning when has unsaved changes', () => {
      const props = createMockProps({
        modelLibrary: {
          ...createMockProps().modelLibrary,
          hasUnsavedChanges: true,
          models: [createMockModel('1', 'Test')],
        },
      });
      render(<ModelsTab {...props} />);

      expect(screen.getByText(/mudanças não exportadas/i)).toBeInTheDocument();
    });

    it('should have export button in warning banner', () => {
      const exportModels = vi.fn();
      const props = createMockProps({
        modelLibrary: {
          ...createMockProps().modelLibrary,
          hasUnsavedChanges: true,
          models: [createMockModel('1', 'Test')],
        },
        exportModels,
      });
      render(<ModelsTab {...props} />);

      const exportButton = screen.getByText('Exportar Modelos Agora');
      fireEvent.click(exportButton);

      expect(exportModels).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SEARCH AND FILTER TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Search and Filters', () => {
    it('should call setSearchTerm when typing in search', () => {
      const setSearchTerm = vi.fn();
      const props = createMockProps({
        modelLibrary: {
          ...createMockProps().modelLibrary,
          setSearchTerm,
        },
      });
      render(<ModelsTab {...props} />);

      const searchInput = screen.getByPlaceholderText(/Buscar modelos/i);
      fireEvent.change(searchInput, { target: { value: 'test query' } });

      expect(setSearchTerm).toHaveBeenCalledWith('test query');
    });

    it('should clear search on Escape key', () => {
      const setSearchTerm = vi.fn();
      const props = createMockProps({
        modelLibrary: {
          ...createMockProps().modelLibrary,
          searchTerm: 'test',
          setSearchTerm,
        },
      });
      render(<ModelsTab {...props} />);

      const searchInput = screen.getByPlaceholderText(/Buscar modelos/i);
      fireEvent.keyDown(searchInput, { key: 'Escape' });

      expect(setSearchTerm).toHaveBeenCalledWith('');
    });

    it('should show clear button when search has value', () => {
      const props = createMockProps({
        modelLibrary: {
          ...createMockProps().modelLibrary,
          searchTerm: 'test query',
        },
      });
      render(<ModelsTab {...props} />);

      expect(screen.getByTitle('Limpar (Esc)')).toBeInTheDocument();
    });

    it('should call setSelectedCategory when category changes', () => {
      const setSelectedCategory = vi.fn();
      const props = createMockProps({
        modelLibrary: {
          ...createMockProps().modelLibrary,
          setSelectedCategory,
        },
        categories: ['Trabalhista', 'Civil'],
        categoryCounts: { counts: { Trabalhista: 5, Civil: 3 }, withoutCategory: 2, favorites: 1 },
      });
      render(<ModelsTab {...props} />);

      const categorySelect = screen.getByText(/Todas as categorias/i).closest('select');
      fireEvent.change(categorySelect!, { target: { value: 'Trabalhista' } });

      expect(setSelectedCategory).toHaveBeenCalledWith('Trabalhista');
    });

    it('should toggle favorites filter', () => {
      const setShowFavoritesOnly = vi.fn();
      const props = createMockProps({
        modelLibrary: {
          ...createMockProps().modelLibrary,
          setShowFavoritesOnly,
        },
      });
      render(<ModelsTab {...props} />);

      const favoritesButton = screen.getByTitle('Mostrar apenas favoritos');
      fireEvent.click(favoritesButton);

      expect(setShowFavoritesOnly).toHaveBeenCalledWith(true);
    });

    it('should show favorites count when filter is active', () => {
      const props = createMockProps({
        modelLibrary: {
          ...createMockProps().modelLibrary,
          showFavoritesOnly: true,
        },
        categoryCounts: { counts: {}, withoutCategory: 0, favorites: 5 },
      });
      render(<ModelsTab {...props} />);

      expect(screen.getByText(/Favoritos \(5\)/i)).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SEMANTIC SEARCH TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Semantic Search', () => {
    it('should show semantic toggle when available', () => {
      const props = createMockProps({
        modelSemanticAvailable: true,
      });
      render(<ModelsTab {...props} />);

      expect(screen.getByTitle(/Busca textual/i)).toBeInTheDocument();
    });

    it('should NOT show semantic toggle when not available', () => {
      const props = createMockProps({
        modelSemanticAvailable: false,
      });
      render(<ModelsTab {...props} />);

      expect(screen.queryByTitle(/Busca textual/i)).not.toBeInTheDocument();
    });

    it('should toggle semantic search', () => {
      const setUseModelSemanticSearch = vi.fn();
      const props = createMockProps({
        modelSemanticAvailable: true,
        setUseModelSemanticSearch,
      });
      render(<ModelsTab {...props} />);

      const toggleButton = screen.getByTitle(/Busca textual/i);
      fireEvent.click(toggleButton);

      expect(setUseModelSemanticSearch).toHaveBeenCalled();
    });

    it('should show semantic search placeholder when enabled', () => {
      const props = createMockProps({
        useModelSemanticSearch: true,
        modelSemanticAvailable: true,
      });
      render(<ModelsTab {...props} />);

      expect(screen.getByPlaceholderText(/Buscar por significado/i)).toBeInTheDocument();
    });

    it('should show semantic results count', () => {
      const models = [createMockModel('1', 'Test Model')];
      const props = createMockProps({
        useModelSemanticSearch: true,
        modelSemanticResults: models,
        filteredModels: models,
        currentModels: models,
      });
      render(<ModelsTab {...props} />);

      expect(screen.getByText(/1 resultado\(s\) semantico\(s\)/i)).toBeInTheDocument();
    });

    it('should show no semantic results message', () => {
      const props = createMockProps({
        useModelSemanticSearch: true,
        modelSemanticResults: [],
      });
      render(<ModelsTab {...props} />);

      expect(screen.getByText(/Nenhum resultado semantico encontrado/i)).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // VIEW MODE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('View Mode', () => {
    it('should render cards view by default', () => {
      const models = [createMockModel('1', 'Test Model')];
      const props = createMockProps({
        modelLibrary: {
          ...createMockProps().modelLibrary,
          modelViewMode: 'cards',
        },
        filteredModels: models,
        currentModels: models,
      });
      render(<ModelsTab {...props} />);

      const card = screen.getByTestId('model-card-1');
      expect(card).toHaveAttribute('data-viewmode', 'cards');
    });

    it('should render list view when selected', () => {
      const models = [createMockModel('1', 'Test Model')];
      const props = createMockProps({
        modelLibrary: {
          ...createMockProps().modelLibrary,
          modelViewMode: 'list',
        },
        filteredModels: models,
      });
      render(<ModelsTab {...props} />);

      expect(screen.getByTestId('virtual-list')).toBeInTheDocument();
    });

    it('should call setModelViewMode when switching to list', () => {
      const setModelViewMode = vi.fn();
      const props = createMockProps({
        modelLibrary: {
          ...createMockProps().modelLibrary,
          setModelViewMode,
        },
      });
      render(<ModelsTab {...props} />);

      const listButton = screen.getByTitle('Visualização em lista');
      fireEvent.click(listButton);

      expect(setModelViewMode).toHaveBeenCalledWith('list');
    });

    it('should call setModelViewMode when switching to cards', () => {
      const setModelViewMode = vi.fn();
      const props = createMockProps({
        modelLibrary: {
          ...createMockProps().modelLibrary,
          modelViewMode: 'list',
          setModelViewMode,
        },
      });
      render(<ModelsTab {...props} />);

      const cardsButton = screen.getByTitle('Visualização em cards');
      fireEvent.click(cardsButton);

      expect(setModelViewMode).toHaveBeenCalledWith('cards');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTION BUTTONS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Action Buttons', () => {
    it('should call openModal for bulk modal', () => {
      const openModal = vi.fn();
      const props = createMockProps({ openModal });
      render(<ModelsTab {...props} />);

      const bulkButton = screen.getByText('Criar de Arquivos');
      fireEvent.click(bulkButton);

      expect(openModal).toHaveBeenCalledWith('bulkModal');
    });

    it('should have import button that can trigger file input', () => {
      const props = createMockProps();
      const { container } = render(<ModelsTab {...props} />);

      // Verify import button exists
      const importButton = screen.getByText('Importar');
      expect(importButton).toBeInTheDocument();

      // Verify hidden file input exists for import
      const fileInput = container.querySelector('input[type="file"][accept=".json"]');
      expect(fileInput).toBeInTheDocument();
    });

    it('should call exportModels when export clicked', () => {
      const exportModels = vi.fn();
      const props = createMockProps({ exportModels });
      render(<ModelsTab {...props} />);

      const exportButton = screen.getByText('Exportar');
      fireEvent.click(exportButton);

      expect(exportModels).toHaveBeenCalled();
    });

    it('should open model form for new model', () => {
      const openModal = vi.fn();
      const setNewModel = vi.fn();
      const setEditingModel = vi.fn();
      const props = createMockProps({
        openModal,
        modelLibrary: {
          ...createMockProps().modelLibrary,
          setNewModel,
          setEditingModel,
        },
      });
      render(<ModelsTab {...props} />);

      const newButton = screen.getByText('Novo Modelo');
      fireEvent.click(newButton);

      expect(setNewModel).toHaveBeenCalledWith({ title: '', content: '', keywords: '', category: '' });
      expect(setEditingModel).toHaveBeenCalledWith(null);
      expect(openModal).toHaveBeenCalledWith('modelForm');
    });

    it('should call openModal for deleteAllModels', () => {
      const openModal = vi.fn();
      const props = createMockProps({
        openModal,
        modelLibrary: {
          ...createMockProps().modelLibrary,
          models: [createMockModel('1', 'Test')],
        },
      });
      render(<ModelsTab {...props} />);

      const deleteAllButton = screen.getByTitle('Excluir todos os modelos');
      fireEvent.click(deleteAllButton);

      expect(openModal).toHaveBeenCalledWith('deleteAllModels');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // OWNERSHIP FILTER TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Ownership Filter', () => {
    it('should call setOwnershipFilter for "all"', () => {
      const setOwnershipFilter = vi.fn();
      const props = createMockProps({
        modelLibrary: {
          ...createMockProps().modelLibrary,
          ownershipFilter: 'mine',
          setOwnershipFilter,
        },
      });
      render(<ModelsTab {...props} />);

      const allButton = screen.getByTitle('Mostrar todos os modelos');
      fireEvent.click(allButton);

      expect(setOwnershipFilter).toHaveBeenCalledWith('all');
    });

    it('should call setOwnershipFilter for "mine"', () => {
      const setOwnershipFilter = vi.fn();
      const props = createMockProps({
        modelLibrary: {
          ...createMockProps().modelLibrary,
          setOwnershipFilter,
        },
      });
      render(<ModelsTab {...props} />);

      const mineButton = screen.getByTitle('Mostrar apenas meus modelos');
      fireEvent.click(mineButton);

      expect(setOwnershipFilter).toHaveBeenCalledWith('mine');
    });

    it('should call setOwnershipFilter for "shared"', () => {
      const setOwnershipFilter = vi.fn();
      const props = createMockProps({
        modelLibrary: {
          ...createMockProps().modelLibrary,
          setOwnershipFilter,
        },
      });
      render(<ModelsTab {...props} />);

      const sharedButton = screen.getByTitle('Mostrar apenas modelos compartilhados');
      fireEvent.click(sharedButton);

      expect(setOwnershipFilter).toHaveBeenCalledWith('shared');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CLOUD SYNC TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Cloud Sync', () => {
    it('should show share button when authenticated', () => {
      const props = createMockProps({
        cloudSync: {
          ...createMockProps().cloudSync,
          isAuthenticated: true,
        },
      });
      render(<ModelsTab {...props} />);

      expect(screen.getByText('Compartilhar')).toBeInTheDocument();
    });

    it('should NOT show share button when not authenticated', () => {
      const props = createMockProps({
        cloudSync: {
          ...createMockProps().cloudSync,
          isAuthenticated: false,
        },
      });
      render(<ModelsTab {...props} />);

      expect(screen.queryByText('Compartilhar')).not.toBeInTheDocument();
    });

    it('should show sync indicator when authenticated', () => {
      const props = createMockProps({
        cloudSync: {
          ...createMockProps().cloudSync,
          isAuthenticated: true,
          syncStatus: 'synced',
        },
      });
      render(<ModelsTab {...props} />);

      expect(screen.getByTestId('sync-status-indicator')).toBeInTheDocument();
    });

    it('should show user email when authenticated', () => {
      const props = createMockProps({
        cloudSync: {
          ...createMockProps().cloudSync,
          isAuthenticated: true,
          user: { email: 'user@example.com' },
        },
      });
      render(<ModelsTab {...props} />);

      expect(screen.getByText('user@example.com')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // MODEL CARD ACTIONS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Model Card Actions', () => {
    const setupModelTest = () => {
      const models = [createMockModel('test-1', 'Test Model')];
      const startEditingModel = vi.fn();
      const toggleFavorite = vi.fn();
      const duplicateModel = vi.fn();
      const confirmDeleteModel = vi.fn();

      const props = createMockProps({
        filteredModels: models,
        currentModels: models,
        startEditingModel,
        toggleFavorite,
        duplicateModel,
        confirmDeleteModel,
      });

      render(<ModelsTab {...props} />);

      return { startEditingModel, toggleFavorite, duplicateModel, confirmDeleteModel };
    };

    it('should call startEditingModel when edit clicked', () => {
      const { startEditingModel } = setupModelTest();

      const editButton = screen.getByText('Edit');
      fireEvent.click(editButton);

      expect(startEditingModel).toHaveBeenCalled();
    });

    it('should call toggleFavorite when fav clicked', () => {
      const { toggleFavorite } = setupModelTest();

      const favButton = screen.getByText('Fav');
      fireEvent.click(favButton);

      expect(toggleFavorite).toHaveBeenCalledWith('test-1');
    });

    it('should call duplicateModel when dup clicked', () => {
      const { duplicateModel } = setupModelTest();

      const dupButton = screen.getByText('Dup');
      fireEvent.click(dupButton);

      expect(duplicateModel).toHaveBeenCalled();
    });

    it('should call confirmDeleteModel when del clicked', () => {
      const { confirmDeleteModel } = setupModelTest();

      const delButton = screen.getByText('Del');
      fireEvent.click(delButton);

      expect(confirmDeleteModel).toHaveBeenCalledWith('test-1');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGINATION TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Pagination', () => {
    it('should show pagination info when multiple pages', () => {
      const models = Array.from({ length: 15 }, (_, i) => createMockModel(`m${i}`, `Model ${i}`));
      const props = createMockProps({
        filteredModels: models,
        currentModels: models.slice(0, 10),
        totalModelPages: 2,
        indexOfFirstModel: 0,
        indexOfLastModel: 10,
        modelLibrary: {
          ...createMockProps().modelLibrary,
          modelsPerPage: 10,
        },
      });
      render(<ModelsTab {...props} />);

      expect(screen.getByText(/Mostrando 1-10 de 15 modelos/i)).toBeInTheDocument();
    });

    it('should call setCurrentModelPage for next page', () => {
      const setCurrentModelPage = vi.fn();
      const models = Array.from({ length: 15 }, (_, i) => createMockModel(`m${i}`, `Model ${i}`));
      const props = createMockProps({
        filteredModels: models,
        currentModels: models.slice(0, 10),
        totalModelPages: 2,
        indexOfFirstModel: 0,
        indexOfLastModel: 10,
        modelLibrary: {
          ...createMockProps().modelLibrary,
          modelsPerPage: 10,
          setCurrentModelPage,
        },
      });
      render(<ModelsTab {...props} />);

      const nextButton = screen.getByTitle('Proxima pagina');
      fireEvent.click(nextButton);

      expect(setCurrentModelPage).toHaveBeenCalled();
    });

    it('should disable prev button on first page', () => {
      const models = Array.from({ length: 15 }, (_, i) => createMockModel(`m${i}`, `Model ${i}`));
      const props = createMockProps({
        filteredModels: models,
        currentModels: models.slice(0, 10),
        totalModelPages: 2,
        indexOfFirstModel: 0,
        indexOfLastModel: 10,
        modelLibrary: {
          ...createMockProps().modelLibrary,
          currentModelPage: 1,
          modelsPerPage: 10,
        },
      });
      render(<ModelsTab {...props} />);

      const prevButton = screen.getByTitle('Pagina anterior');
      expect(prevButton).toBeDisabled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // MODEL COUNT DISPLAY TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Model Count Display', () => {
    it('should show singular "modelo" for 1 model', () => {
      const models = [createMockModel('1', 'Test')];
      const props = createMockProps({
        filteredModels: models,
        currentModels: models,
      });
      render(<ModelsTab {...props} />);

      expect(screen.getByText(/1 modelo$/i)).toBeInTheDocument();
    });

    it('should show plural "modelos" for multiple models', () => {
      const models = [createMockModel('1', 'Test 1'), createMockModel('2', 'Test 2')];
      const props = createMockProps({
        filteredModels: models,
        currentModels: models,
      });
      render(<ModelsTab {...props} />);

      expect(screen.getByText(/2 modelos/i)).toBeInTheDocument();
    });
  });
});
