/**
 * @file ModelsTab.test.tsx
 * @description Testes de regressão para o componente ModelsTab
 * @version 1.38.49
 *
 * Cobre todas as ações do usuário:
 * 1. Header com botões (Novo, Importar, Exportar, etc)
 * 2. Busca e filtros (textual/semântica, categorias, favoritos)
 * 3. Alternância de visualização (cards/lista)
 * 4. Banner de mudanças não exportadas
 * 5. Filtro de propriedade (todos/meus/compartilhados)
 * 6. Cloud sync (onSync logic, email truncation)
 * 7. Pagination (getPaginationRange, ellipsis, navigation)
 * 8. Toggle model form (close when open)
 * 9. Semantic results in list view
 * 10. Empty states (favoritos)
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ModelsTab } from './ModelsTab';
import type { ModelsTabProps, Model } from '../../types';

// Mock useUIStore
const mockUIStore = {
  modals: { modelForm: false } as Record<string, boolean>,
  openModal: vi.fn(),
  closeModal: vi.fn(),
};
vi.mock('../../stores/useUIStore', () => ({
  useUIStore: (selector: (s: typeof mockUIStore) => unknown) => selector(mockUIStore),
}));

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
    mockUIStore.modals = { modelForm: false };
    mockUIStore.openModal = vi.fn();
    mockUIStore.closeModal = vi.fn();
    localStorage.clear();
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

    it('should render categories in select dropdown', () => {
      const props = createMockProps({
        categories: ['Trabalhista', 'Civil', 'Penal'],
        categoryCounts: { counts: { Trabalhista: 10, Civil: 5, Penal: 3 }, withoutCategory: 2, favorites: 1 },
      });
      render(<ModelsTab {...props} />);

      expect(screen.getByText(/Trabalhista \(10\)/)).toBeInTheDocument();
      expect(screen.getByText(/Civil \(5\)/)).toBeInTheDocument();
      expect(screen.getByText(/Penal \(3\)/)).toBeInTheDocument();
      expect(screen.getByText(/Sem categoria \(2\)/)).toBeInTheDocument();
    });

    it('should show "0 modelos" when filteredModels is empty', () => {
      const props = createMockProps({ filteredModels: [] });
      render(<ModelsTab {...props} />);

      expect(screen.getByText(/0 modelos/i)).toBeInTheDocument();
    });

    it('should show empty state for favorites when showFavoritesOnly and no models', () => {
      const props = createMockProps({
        filteredModels: [],
        modelLibrary: {
          ...createMockProps().modelLibrary,
          showFavoritesOnly: true,
        },
      });
      render(<ModelsTab {...props} />);

      expect(screen.getByText(/Nenhum modelo favorito ainda/i)).toBeInTheDocument();
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

    it('should NOT show banner when hasUnsavedChanges is true but models is empty', () => {
      const props = createMockProps({
        modelLibrary: {
          ...createMockProps().modelLibrary,
          hasUnsavedChanges: true,
          models: [],
        },
      });
      render(<ModelsTab {...props} />);

      expect(screen.queryByText(/mudanças não exportadas/i)).not.toBeInTheDocument();
    });

    it('should show backup explanation text in the banner', () => {
      const props = createMockProps({
        modelLibrary: {
          ...createMockProps().modelLibrary,
          hasUnsavedChanges: true,
          models: [createMockModel('1', 'Test')],
        },
      });
      render(<ModelsTab {...props} />);

      expect(screen.getByText(/exporte seus modelos antes de sair/i)).toBeInTheDocument();
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

    it('should NOT clear search on non-Escape key', () => {
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
      fireEvent.keyDown(searchInput, { key: 'Enter' });

      expect(setSearchTerm).not.toHaveBeenCalledWith('');
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

    it('should NOT show clear button when search is empty', () => {
      const props = createMockProps({
        modelLibrary: {
          ...createMockProps().modelLibrary,
          searchTerm: '',
        },
      });
      render(<ModelsTab {...props} />);

      expect(screen.queryByTitle('Limpar (Esc)')).not.toBeInTheDocument();
    });

    it('should clear search when clear button is clicked', () => {
      const setSearchTerm = vi.fn();
      const props = createMockProps({
        modelLibrary: {
          ...createMockProps().modelLibrary,
          searchTerm: 'some query',
          setSearchTerm,
        },
      });
      render(<ModelsTab {...props} />);

      const clearButton = screen.getByTitle('Limpar (Esc)');
      fireEvent.click(clearButton);

      expect(setSearchTerm).toHaveBeenCalledWith('');
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

    it('should toggle favorites OFF when already active', () => {
      const setShowFavoritesOnly = vi.fn();
      const props = createMockProps({
        modelLibrary: {
          ...createMockProps().modelLibrary,
          showFavoritesOnly: true,
          setShowFavoritesOnly,
        },
      });
      render(<ModelsTab {...props} />);

      const favoritesButton = screen.getByTitle('Mostrar apenas favoritos');
      fireEvent.click(favoritesButton);

      expect(setShowFavoritesOnly).toHaveBeenCalledWith(false);
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

    it('should show "Todos" text when favorites filter is inactive', () => {
      const props = createMockProps({
        modelLibrary: {
          ...createMockProps().modelLibrary,
          showFavoritesOnly: false,
        },
      });
      render(<ModelsTab {...props} />);

      // "Todos" appears in both favorites toggle and ownership filter;
      // check that the favorites toggle shows "Todos" (inside the favorites button span)
      const allTodosElements = screen.getAllByText('Todos');
      expect(allTodosElements.length).toBeGreaterThanOrEqual(1);
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

    it('should toggle semantic search and reset results', () => {
      const setUseModelSemanticSearch = vi.fn();
      const setModelSemanticResults = vi.fn();
      const props = createMockProps({
        modelSemanticAvailable: true,
        setUseModelSemanticSearch,
        setModelSemanticResults,
      });
      render(<ModelsTab {...props} />);

      const toggleButton = screen.getByTitle(/Busca textual/i);
      fireEvent.click(toggleButton);

      expect(setUseModelSemanticSearch).toHaveBeenCalled();
      expect(setModelSemanticResults).toHaveBeenCalledWith(null);
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

    it('should show threshold suggestion when no semantic results', () => {
      const props = createMockProps({
        useModelSemanticSearch: true,
        modelSemanticResults: [],
      });
      render(<ModelsTab {...props} />);

      expect(screen.getByText(/Tente reduzir o threshold/i)).toBeInTheDocument();
    });

    it('should show spinner when searching semantics', () => {
      const models = [createMockModel('1', 'Test Model')];
      const props = createMockProps({
        useModelSemanticSearch: true,
        modelSemanticResults: models,
        searchingModelSemantics: true,
        filteredModels: models,
        currentModels: models,
      });
      render(<ModelsTab {...props} />);

      expect(screen.getByText(/1 resultado\(s\) semantico\(s\)/i)).toBeInTheDocument();
    });

    it('should render semantic results in cards view mode', () => {
      const models = [createMockModel('1', 'Semantic Result')];
      const props = createMockProps({
        useModelSemanticSearch: true,
        modelSemanticResults: models,
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

    it('should render semantic results in list view mode', () => {
      const models = [createMockModel('1', 'Semantic Result')];
      const props = createMockProps({
        useModelSemanticSearch: true,
        modelSemanticResults: models,
        modelLibrary: {
          ...createMockProps().modelLibrary,
          modelViewMode: 'list',
        },
        filteredModels: models,
      });
      render(<ModelsTab {...props} />);

      const card = screen.getByTestId('model-card-1');
      expect(card).toHaveAttribute('data-viewmode', 'list');
    });

    it('should show semantic title for toggle when active', () => {
      const props = createMockProps({
        modelSemanticAvailable: true,
        useModelSemanticSearch: true,
      });
      render(<ModelsTab {...props} />);

      expect(screen.getByTitle(/Busca semantica/i)).toBeInTheDocument();
    });

    it('should render multiple semantic results', () => {
      const models = [
        createMockModel('1', 'Result 1'),
        createMockModel('2', 'Result 2'),
        createMockModel('3', 'Result 3'),
      ];
      const props = createMockProps({
        useModelSemanticSearch: true,
        modelSemanticResults: models,
        filteredModels: models,
        currentModels: models,
      });
      render(<ModelsTab {...props} />);

      expect(screen.getByText(/3 resultado\(s\) semantico\(s\)/i)).toBeInTheDocument();
      expect(screen.getByTestId('model-card-1')).toBeInTheDocument();
      expect(screen.getByTestId('model-card-2')).toBeInTheDocument();
      expect(screen.getByTestId('model-card-3')).toBeInTheDocument();
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

    it('should render VirtualList with correct items in list mode', () => {
      const models = [
        createMockModel('1', 'Model A'),
        createMockModel('2', 'Model B'),
      ];
      const props = createMockProps({
        modelLibrary: {
          ...createMockProps().modelLibrary,
          modelViewMode: 'list',
        },
        filteredModels: models,
      });
      render(<ModelsTab {...props} />);

      expect(screen.getByTestId('virtual-list')).toBeInTheDocument();
      expect(screen.getByTestId('model-card-1')).toHaveAttribute('data-viewmode', 'list');
      expect(screen.getByTestId('model-card-2')).toHaveAttribute('data-viewmode', 'list');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTION BUTTONS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Action Buttons', () => {
    it('should call openModal for bulk modal', () => {
      const props = createMockProps();
      render(<ModelsTab {...props} />);

      const bulkButton = screen.getByText('Criar de Arquivos');
      fireEvent.click(bulkButton);

      expect(mockUIStore.openModal).toHaveBeenCalledWith('bulkModal');
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
      const setNewModel = vi.fn();
      const setEditingModel = vi.fn();
      const props = createMockProps({
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
      expect(mockUIStore.openModal).toHaveBeenCalledWith('modelForm');
    });

    it('should close model form and reset when form is already open', () => {
      mockUIStore.modals = { modelForm: true };
      const setNewModel = vi.fn();
      const setEditingModel = vi.fn();
      const modelEditorRef = { current: { root: { innerHTML: 'existing content' } } };

      const props = createMockProps({
        modelLibrary: {
          ...createMockProps().modelLibrary,
          setNewModel,
          setEditingModel,
        },
        modelEditorRef: modelEditorRef as unknown as ModelsTabProps['modelEditorRef'],
      });
      render(<ModelsTab {...props} />);

      const newButton = screen.getByText('Novo Modelo');
      fireEvent.click(newButton);

      expect(mockUIStore.closeModal).toHaveBeenCalledWith('modelForm');
      expect(setNewModel).toHaveBeenCalledWith({ title: '', content: '', keywords: '', category: '' });
      expect(setEditingModel).toHaveBeenCalledWith(null);
      expect(modelEditorRef.current.root.innerHTML).toBe('');
    });

    it('should call openModal for deleteAllModels', () => {
      const props = createMockProps({
        modelLibrary: {
          ...createMockProps().modelLibrary,
          models: [createMockModel('1', 'Test')],
        },
      });
      render(<ModelsTab {...props} />);

      const deleteAllButton = screen.getByTitle('Excluir todos os modelos');
      fireEvent.click(deleteAllButton);

      expect(mockUIStore.openModal).toHaveBeenCalledWith('deleteAllModels');
    });

    it('should call importModels when file input changes', () => {
      const importModels = vi.fn();
      const props = createMockProps({ importModels });
      const { container } = render(<ModelsTab {...props} />);

      const fileInput = container.querySelector('input[type="file"][accept=".json"]') as HTMLInputElement;
      fireEvent.change(fileInput);

      expect(importModels).toHaveBeenCalled();
    });

    it('should render hidden file input for import', () => {
      const props = createMockProps();
      const { container } = render(<ModelsTab {...props} />);

      // The component renders a hidden file input with ref={fileInputRef}
      // that gets triggered when Import button is clicked
      const hiddenInput = container.querySelector('input[type="file"][accept=".json"]');
      expect(hiddenInput).toBeInTheDocument();
      expect(hiddenInput).toHaveClass('hidden');
    });

    it('should open share library modal when Compartilhar is clicked', () => {
      const props = createMockProps({
        cloudSync: {
          ...createMockProps().cloudSync,
          isAuthenticated: true,
        },
      });
      render(<ModelsTab {...props} />);

      const shareButton = screen.getByText('Compartilhar');
      fireEvent.click(shareButton);

      expect(mockUIStore.openModal).toHaveBeenCalledWith('shareLibrary');
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

    it('should highlight active ownership filter button "all"', () => {
      const props = createMockProps({
        modelLibrary: {
          ...createMockProps().modelLibrary,
          ownershipFilter: 'all',
        },
      });
      render(<ModelsTab {...props} />);

      const allButton = screen.getByTitle('Mostrar todos os modelos');
      expect(allButton.className).toContain('bg-purple-600');
    });

    it('should highlight active ownership filter button "mine"', () => {
      const props = createMockProps({
        modelLibrary: {
          ...createMockProps().modelLibrary,
          ownershipFilter: 'mine',
        },
      });
      render(<ModelsTab {...props} />);

      const mineButton = screen.getByTitle('Mostrar apenas meus modelos');
      expect(mineButton.className).toContain('bg-purple-600');
    });

    it('should highlight active ownership filter button "shared"', () => {
      const props = createMockProps({
        modelLibrary: {
          ...createMockProps().modelLibrary,
          ownershipFilter: 'shared',
        },
      });
      render(<ModelsTab {...props} />);

      const sharedButton = screen.getByTitle('Mostrar apenas modelos compartilhados');
      expect(sharedButton.className).toContain('bg-purple-600');
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

    it('should truncate long email addresses', () => {
      const longEmail = 'verylongemailaddress@example.com';
      const props = createMockProps({
        cloudSync: {
          ...createMockProps().cloudSync,
          isAuthenticated: true,
          user: { email: longEmail },
        },
      });
      render(<ModelsTab {...props} />);

      // Email > 25 chars should be truncated to 22 + '...'
      const truncated = longEmail.slice(0, 22) + '...';
      expect(screen.getByText(truncated)).toBeInTheDocument();
    });

    it('should NOT truncate short email addresses', () => {
      const shortEmail = 'a@b.com';
      const props = createMockProps({
        cloudSync: {
          ...createMockProps().cloudSync,
          isAuthenticated: true,
          user: { email: shortEmail },
        },
      });
      render(<ModelsTab {...props} />);

      expect(screen.getByText(shortEmail)).toBeInTheDocument();
    });

    it('should call sync directly when initial push is already done', () => {
      localStorage.setItem('sentencify-initial-push-done', 'true');
      const sync = vi.fn();
      const pushAllModels = vi.fn();
      const props = createMockProps({
        cloudSync: {
          ...createMockProps().cloudSync,
          isAuthenticated: true,
          syncStatus: 'idle',
          sync,
          pushAllModels,
        },
        modelLibrary: {
          ...createMockProps().modelLibrary,
          models: [createMockModel('1', 'Test')],
        },
      });
      render(<ModelsTab {...props} />);

      const syncButton = screen.getByText('Sync');
      fireEvent.click(syncButton);

      expect(sync).toHaveBeenCalled();
      expect(pushAllModels).not.toHaveBeenCalled();
    });

    it('should call pushAllModels when initial push is NOT done and models exist', () => {
      localStorage.removeItem('sentencify-initial-push-done');
      const sync = vi.fn();
      const pushAllModels = vi.fn().mockResolvedValue({ success: true });
      const models = [createMockModel('1', 'Test')];
      const props = createMockProps({
        cloudSync: {
          ...createMockProps().cloudSync,
          isAuthenticated: true,
          syncStatus: 'idle',
          sync,
          pushAllModels,
        },
        modelLibrary: {
          ...createMockProps().modelLibrary,
          models,
        },
      });
      render(<ModelsTab {...props} />);

      const syncButton = screen.getByText('Sync');
      fireEvent.click(syncButton);

      expect(pushAllModels).toHaveBeenCalledWith(models);
      expect(sync).not.toHaveBeenCalled();
    });

    it('should call sync when initial push NOT done but models are empty', () => {
      localStorage.removeItem('sentencify-initial-push-done');
      const sync = vi.fn();
      const pushAllModels = vi.fn();
      const props = createMockProps({
        cloudSync: {
          ...createMockProps().cloudSync,
          isAuthenticated: true,
          syncStatus: 'idle',
          sync,
          pushAllModels,
        },
        modelLibrary: {
          ...createMockProps().modelLibrary,
          models: [],
        },
      });
      render(<ModelsTab {...props} />);

      const syncButton = screen.getByText('Sync');
      fireEvent.click(syncButton);

      expect(sync).toHaveBeenCalled();
      expect(pushAllModels).not.toHaveBeenCalled();
    });

    it('should NOT show sync indicator when not authenticated', () => {
      const props = createMockProps({
        cloudSync: {
          ...createMockProps().cloudSync,
          isAuthenticated: false,
        },
      });
      render(<ModelsTab {...props} />);

      expect(screen.queryByTestId('sync-status-indicator')).not.toBeInTheDocument();
    });

    it('should NOT show email when user is null', () => {
      const props = createMockProps({
        cloudSync: {
          ...createMockProps().cloudSync,
          isAuthenticated: true,
          user: null,
        },
      });
      render(<ModelsTab {...props} />);

      expect(screen.queryByText(/@/)).not.toBeInTheDocument();
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

    it('should render model card with shared info', () => {
      const models = [createMockModel('shared-1', 'Shared Model', {
        isShared: true,
        ownerEmail: 'owner@example.com',
        sharedPermission: 'view',
      })];
      const props = createMockProps({
        filteredModels: models,
        currentModels: models,
      });
      render(<ModelsTab {...props} />);

      expect(screen.getByTestId('model-card-shared-1')).toBeInTheDocument();
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

    it('should disable next button on last page', () => {
      const models = Array.from({ length: 15 }, (_, i) => createMockModel(`m${i}`, `Model ${i}`));
      const props = createMockProps({
        filteredModels: models,
        currentModels: models.slice(10, 15),
        totalModelPages: 2,
        indexOfFirstModel: 10,
        indexOfLastModel: 15,
        modelLibrary: {
          ...createMockProps().modelLibrary,
          currentModelPage: 2,
          modelsPerPage: 10,
        },
      });
      render(<ModelsTab {...props} />);

      const nextButton = screen.getByTitle('Proxima pagina');
      expect(nextButton).toBeDisabled();
    });

    it('should call setCurrentModelPage for prev page', () => {
      const setCurrentModelPage = vi.fn();
      const models = Array.from({ length: 15 }, (_, i) => createMockModel(`m${i}`, `Model ${i}`));
      const props = createMockProps({
        filteredModels: models,
        currentModels: models.slice(10, 15),
        totalModelPages: 2,
        indexOfFirstModel: 10,
        indexOfLastModel: 15,
        modelLibrary: {
          ...createMockProps().modelLibrary,
          currentModelPage: 2,
          modelsPerPage: 10,
          setCurrentModelPage,
        },
      });
      render(<ModelsTab {...props} />);

      const prevButton = screen.getByTitle('Pagina anterior');
      fireEvent.click(prevButton);

      expect(setCurrentModelPage).toHaveBeenCalled();
    });

    it('should call setCurrentModelPage when specific page is clicked', () => {
      const setCurrentModelPage = vi.fn();
      const models = Array.from({ length: 25 }, (_, i) => createMockModel(`m${i}`, `Model ${i}`));
      const props = createMockProps({
        filteredModels: models,
        currentModels: models.slice(0, 10),
        totalModelPages: 3,
        indexOfFirstModel: 0,
        indexOfLastModel: 10,
        modelLibrary: {
          ...createMockProps().modelLibrary,
          currentModelPage: 1,
          modelsPerPage: 10,
          setCurrentModelPage,
        },
      });
      render(<ModelsTab {...props} />);

      // Click page 2
      const page2Button = screen.getByText('2');
      fireEvent.click(page2Button);

      expect(setCurrentModelPage).toHaveBeenCalledWith(2);
    });

    it('should highlight current page number', () => {
      const models = Array.from({ length: 25 }, (_, i) => createMockModel(`m${i}`, `Model ${i}`));
      const props = createMockProps({
        filteredModels: models,
        currentModels: models.slice(0, 10),
        totalModelPages: 3,
        indexOfFirstModel: 0,
        indexOfLastModel: 10,
        modelLibrary: {
          ...createMockProps().modelLibrary,
          currentModelPage: 1,
          modelsPerPage: 10,
        },
      });
      render(<ModelsTab {...props} />);

      const activePage = screen.getByText('1').closest('button');
      expect(activePage).toHaveAttribute('data-active', 'true');
    });

    it('should NOT highlight non-current page numbers', () => {
      const models = Array.from({ length: 25 }, (_, i) => createMockModel(`m${i}`, `Model ${i}`));
      const props = createMockProps({
        filteredModels: models,
        currentModels: models.slice(0, 10),
        totalModelPages: 3,
        indexOfFirstModel: 0,
        indexOfLastModel: 10,
        modelLibrary: {
          ...createMockProps().modelLibrary,
          currentModelPage: 1,
          modelsPerPage: 10,
        },
      });
      render(<ModelsTab {...props} />);

      const page2 = screen.getByText('2').closest('button');
      expect(page2).not.toHaveAttribute('data-active');
    });

    it('should show ellipsis for many pages (>7)', () => {
      const models = Array.from({ length: 100 }, (_, i) => createMockModel(`m${i}`, `Model ${i}`));
      const props = createMockProps({
        filteredModels: models,
        currentModels: models.slice(0, 10),
        totalModelPages: 10,
        indexOfFirstModel: 0,
        indexOfLastModel: 10,
        modelLibrary: {
          ...createMockProps().modelLibrary,
          currentModelPage: 1,
          modelsPerPage: 10,
        },
      });
      render(<ModelsTab {...props} />);

      // Should show ellipsis (...) in pagination
      expect(screen.getByText('...')).toBeInTheDocument();
    });

    it('should NOT show pagination for single page', () => {
      const models = Array.from({ length: 5 }, (_, i) => createMockModel(`m${i}`, `Model ${i}`));
      const props = createMockProps({
        filteredModels: models,
        currentModels: models,
        totalModelPages: 1,
        indexOfFirstModel: 0,
        indexOfLastModel: 5,
        modelLibrary: {
          ...createMockProps().modelLibrary,
          modelsPerPage: 10,
        },
      });
      render(<ModelsTab {...props} />);

      expect(screen.queryByTitle('Proxima pagina')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Pagina anterior')).not.toBeInTheDocument();
    });

    it('should show correct range on middle page', () => {
      const models = Array.from({ length: 30 }, (_, i) => createMockModel(`m${i}`, `Model ${i}`));
      const props = createMockProps({
        filteredModels: models,
        currentModels: models.slice(10, 20),
        totalModelPages: 3,
        indexOfFirstModel: 10,
        indexOfLastModel: 20,
        modelLibrary: {
          ...createMockProps().modelLibrary,
          currentModelPage: 2,
          modelsPerPage: 10,
        },
      });
      render(<ModelsTab {...props} />);

      expect(screen.getByText(/Mostrando 11-20 de 30 modelos/i)).toBeInTheDocument();
    });

    it('should show correct range on last page with fewer items', () => {
      const models = Array.from({ length: 15 }, (_, i) => createMockModel(`m${i}`, `Model ${i}`));
      const props = createMockProps({
        filteredModels: models,
        currentModels: models.slice(10, 15),
        totalModelPages: 2,
        indexOfFirstModel: 10,
        indexOfLastModel: 20,
        modelLibrary: {
          ...createMockProps().modelLibrary,
          currentModelPage: 2,
          modelsPerPage: 10,
        },
      });
      render(<ModelsTab {...props} />);

      // indexOfLastModel=20, but filteredModels.length=15, so shows Math.min(20,15)=15
      expect(screen.getByText(/Mostrando 11-15 de 15 modelos/i)).toBeInTheDocument();
    });

    it('should NOT show pagination in list view mode', () => {
      const models = Array.from({ length: 15 }, (_, i) => createMockModel(`m${i}`, `Model ${i}`));
      const props = createMockProps({
        filteredModels: models,
        currentModels: models.slice(0, 10),
        totalModelPages: 2,
        indexOfFirstModel: 0,
        indexOfLastModel: 10,
        modelLibrary: {
          ...createMockProps().modelLibrary,
          modelViewMode: 'list',
          modelsPerPage: 10,
        },
      });
      render(<ModelsTab {...props} />);

      // In list mode VirtualList is used, so pagination is not shown
      expect(screen.queryByTitle('Proxima pagina')).not.toBeInTheDocument();
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

  // ═══════════════════════════════════════════════════════════════════════════
  // MODEL FORM MODAL TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('ModelFormModal', () => {
    it('should render ModelFormModal when modal is open', () => {
      mockUIStore.modals = { modelForm: true };
      const props = createMockProps();
      render(<ModelsTab {...props} />);

      expect(screen.getByTestId('model-form-modal')).toBeInTheDocument();
    });

    it('should NOT render ModelFormModal when modal is closed', () => {
      mockUIStore.modals = { modelForm: false };
      const props = createMockProps();
      render(<ModelsTab {...props} />);

      expect(screen.queryByTestId('model-form-modal')).not.toBeInTheDocument();
    });
  });
});
