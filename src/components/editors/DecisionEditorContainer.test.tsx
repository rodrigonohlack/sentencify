/**
 * @file DecisionEditorContainer.test.tsx
 * @description Testes de regressão para o componente DecisionEditorContainer
 * @version 1.38.39
 *
 * Cobre todas as ações do usuário:
 * 1. Renderização do header com título e categoria
 * 2. Seleção de categoria (dropdown)
 * 3. Botões Salvar e Cancelar
 * 4. Estados de loading
 * 5. Integração com editores Quill (mocked)
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DecisionEditorContainer } from './DecisionEditorContainer';
import type { DecisionEditorContainerProps, Topic } from '../../types';

// Mock QuillEditors
vi.mock('./QuillEditors', () => ({
  QuillDecisionEditor: React.forwardRef(({ content, topicTitle, onChange }: {
    content: string;
    topicTitle: string;
    onChange: (html: string) => void;
  }, ref) => (
    <div data-testid="quill-decision-editor" ref={ref as React.Ref<HTMLDivElement>}>
      <span>Decision Editor: {topicTitle}</span>
      <textarea
        data-testid="decision-textarea"
        value={content}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )),
  QuillMiniRelatorioEditor: React.forwardRef(({ content, topicTitle, onChange }: {
    content: string;
    topicTitle: string;
    onChange: (html: string) => void;
  }, ref) => (
    <div data-testid="quill-mini-relatorio-editor" ref={ref as React.Ref<HTMLDivElement>}>
      <span>Mini-Relatório: {topicTitle}</span>
      <textarea
        data-testid="relatorio-textarea"
        value={content}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )),
}));

// Mock CSS
vi.mock('../../constants/styles', () => ({
  CSS: {
    spinner: 'spinner-class',
  },
}));

describe('DecisionEditorContainer', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // DEFAULT PROPS FACTORY
  // ═══════════════════════════════════════════════════════════════════════════

  const createMockTopic = (overrides: Partial<Topic> = {}): Topic => ({
    id: '1',
    title: 'Horas Extras',
    category: 'MÉRITO',
    relatorio: 'Relatório do tópico',
    fundamentacao: 'Fundamentação do tópico',
    ...overrides,
  });

  const createMockProps = (overrides: Partial<DecisionEditorContainerProps> = {}): DecisionEditorContainerProps => ({
    editorRef: { current: null },
    relatorioRef: { current: null },
    toolbarRef: { current: null },
    topic: createMockTopic(),
    onSave: vi.fn(),
    onCancel: vi.fn(),
    onSaveWithoutClosing: vi.fn(),
    onCategoryChange: vi.fn(),
    onFundamentacaoChange: vi.fn(),
    onRelatorioChange: vi.fn(),
    onOpenAIAssistant: vi.fn(),
    onOpenJurisModal: vi.fn(),
    onExtractModel: vi.fn(),
    onSaveAsModel: vi.fn(),
    onRegenerateRelatorio: vi.fn(),
    savingTopic: false,
    extractingModel: false,
    showExtractButton: true,
    regeneratingRelatorio: false,
    relatorioInstruction: '',
    onInstructionChange: vi.fn(),
    sanitizeHTML: vi.fn((html: string) => html),
    onTextSelection: vi.fn(),
    selectedTopics: [],
    setSelectedTopics: vi.fn(),
    extractedTopics: [],
    setExtractedTopics: vi.fn(),
    getTopicEditorConfig: vi.fn(() => ({
      showCategory: true,
      showMiniRelatorio: true,
      showDecisionEditor: true,
      showRelatorio: true,
      showFundamentacao: true,
      relatorioConfig: { label: 'Mini-Relatório', minHeight: '200px', showRegenerateSection: true },
      editorConfig: { label: 'Fundamentação', placeholder: 'Digite aqui...', showRegenerateSection: false },
    })),
    quillReady: true,
    quillError: null,
    onRegenerateDispositivo: vi.fn(),
    dispositivoInstruction: '',
    onDispositivoInstructionChange: vi.fn(),
    regeneratingDispositivo: false,
    editorTheme: 'dark',
    toggleEditorTheme: vi.fn(),
    models: [],
    onInsertModel: vi.fn(),
    onPreviewModel: vi.fn(),
    findSuggestions: vi.fn(),
    onSlashCommand: vi.fn(),
    isDirty: false,
    versioning: null,
    onOpenFactsComparison: vi.fn(),
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERING TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Rendering', () => {
    it('should render topic title in uppercase', () => {
      const props = createMockProps({
        topic: createMockTopic({ title: 'Horas Extras' }),
      });
      render(<DecisionEditorContainer {...props} />);

      expect(screen.getByText('HORAS EXTRAS')).toBeInTheDocument();
    });

    it('should render category selector when showCategory is true', () => {
      const props = createMockProps();
      render(<DecisionEditorContainer {...props} />);

      const categorySelect = screen.getByTitle('Clique para alterar a categoria');
      expect(categorySelect).toBeInTheDocument();
    });

    it('should NOT render category selector when showCategory is false', () => {
      const props = createMockProps({
        getTopicEditorConfig: vi.fn(() => ({
          showCategory: false,
          showMiniRelatorio: true,
          showDecisionEditor: true,
        })),
      });
      render(<DecisionEditorContainer {...props} />);

      expect(screen.queryByTitle('Clique para alterar a categoria')).not.toBeInTheDocument();
    });

    it('should render Mini-Relatório editor when showMiniRelatorio is true', () => {
      const props = createMockProps();
      render(<DecisionEditorContainer {...props} />);

      expect(screen.getByTestId('quill-mini-relatorio-editor')).toBeInTheDocument();
    });

    it('should NOT render Mini-Relatório editor when showMiniRelatorio is false', () => {
      const props = createMockProps({
        getTopicEditorConfig: vi.fn(() => ({
          showCategory: true,
          showMiniRelatorio: false,
          showDecisionEditor: true,
        })),
      });
      render(<DecisionEditorContainer {...props} />);

      expect(screen.queryByTestId('quill-mini-relatorio-editor')).not.toBeInTheDocument();
    });

    it('should render Decision editor when showDecisionEditor is true', () => {
      const props = createMockProps();
      render(<DecisionEditorContainer {...props} />);

      expect(screen.getByTestId('quill-decision-editor')).toBeInTheDocument();
    });

    it('should NOT render Decision editor when showDecisionEditor is false', () => {
      const props = createMockProps({
        getTopicEditorConfig: vi.fn(() => ({
          showCategory: true,
          showMiniRelatorio: true,
          showDecisionEditor: false,
        })),
      });
      render(<DecisionEditorContainer {...props} />);

      expect(screen.queryByTestId('quill-decision-editor')).not.toBeInTheDocument();
    });

    it('should render Cancelar and Salvar buttons', () => {
      const props = createMockProps();
      render(<DecisionEditorContainer {...props} />);

      expect(screen.getByText('Cancelar')).toBeInTheDocument();
      expect(screen.getByText('Salvar e Fechar')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORY SELECTION TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Category Selection', () => {
    it('should show current category as selected', () => {
      const props = createMockProps({
        topic: createMockTopic({ category: 'PRELIMINAR' }),
      });
      render(<DecisionEditorContainer {...props} />);

      const categorySelect = screen.getByTitle('Clique para alterar a categoria') as HTMLSelectElement;
      expect(categorySelect.value).toBe('PRELIMINAR');
    });

    it('should call onCategoryChange when category is changed', () => {
      const onCategoryChange = vi.fn();
      const props = createMockProps({ onCategoryChange });
      render(<DecisionEditorContainer {...props} />);

      const categorySelect = screen.getByTitle('Clique para alterar a categoria');
      fireEvent.change(categorySelect, { target: { value: 'PREJUDICIAL' } });

      expect(onCategoryChange).toHaveBeenCalledWith('PREJUDICIAL');
    });

    it('should update selectedTopics when category changes', () => {
      const setSelectedTopics = vi.fn();
      const topic = createMockTopic({ title: 'Horas Extras', category: 'MÉRITO' });
      const props = createMockProps({
        topic,
        selectedTopics: [topic],
        setSelectedTopics,
      });
      render(<DecisionEditorContainer {...props} />);

      const categorySelect = screen.getByTitle('Clique para alterar a categoria');
      fireEvent.change(categorySelect, { target: { value: 'PROCESSUAL' } });

      expect(setSelectedTopics).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ category: 'PROCESSUAL' }),
        ])
      );
    });

    it('should update extractedTopics when category changes', () => {
      const setExtractedTopics = vi.fn();
      const topic = createMockTopic({ title: 'Horas Extras', category: 'MÉRITO' });
      const props = createMockProps({
        topic,
        extractedTopics: [topic],
        setExtractedTopics,
      });
      render(<DecisionEditorContainer {...props} />);

      const categorySelect = screen.getByTitle('Clique para alterar a categoria');
      fireEvent.change(categorySelect, { target: { value: 'PRELIMINAR' } });

      expect(setExtractedTopics).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ category: 'PRELIMINAR' }),
        ])
      );
    });

    it('should have all 4 category options', () => {
      const props = createMockProps();
      render(<DecisionEditorContainer {...props} />);

      const categorySelect = screen.getByTitle('Clique para alterar a categoria');
      const options = categorySelect.querySelectorAll('option');

      expect(options).toHaveLength(4);
      expect(options[0]).toHaveValue('PRELIMINAR');
      expect(options[1]).toHaveValue('PREJUDICIAL');
      expect(options[2]).toHaveValue('MÉRITO');
      expect(options[3]).toHaveValue('PROCESSUAL');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SAVE/CANCEL BUTTON TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Save/Cancel Buttons', () => {
    it('should call onSave when Salvar button is clicked', () => {
      const onSave = vi.fn();
      const props = createMockProps({ onSave });
      render(<DecisionEditorContainer {...props} />);

      const saveButton = screen.getByText('Salvar e Fechar');
      fireEvent.click(saveButton);

      expect(onSave).toHaveBeenCalled();
    });

    it('should call onCancel when Cancelar button is clicked', () => {
      const onCancel = vi.fn();
      const props = createMockProps({ onCancel });
      render(<DecisionEditorContainer {...props} />);

      const cancelButton = screen.getByText('Cancelar');
      fireEvent.click(cancelButton);

      expect(onCancel).toHaveBeenCalled();
    });

    it('should disable both buttons when savingTopic is true', () => {
      const props = createMockProps({ savingTopic: true });
      render(<DecisionEditorContainer {...props} />);

      const cancelButton = screen.getByText('Cancelar');
      const saveButton = screen.getByText('Salvando...');

      expect(cancelButton).toBeDisabled();
      expect(saveButton.closest('button')).toBeDisabled();
    });

    it('should show "Salvando..." text when savingTopic is true', () => {
      const props = createMockProps({ savingTopic: true });
      render(<DecisionEditorContainer {...props} />);

      expect(screen.getByText('Salvando...')).toBeInTheDocument();
    });

    it('should show spinner when savingTopic is true', () => {
      const props = createMockProps({ savingTopic: true });
      const { container } = render(<DecisionEditorContainer {...props} />);

      const spinner = container.querySelector('.spinner-class');
      expect(spinner).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EDITOR CONTENT TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Editor Content', () => {
    it('should pass relatorio content to Mini-Relatório editor', () => {
      const props = createMockProps({
        topic: createMockTopic({
          relatorio: 'Conteúdo do relatório',
          editedRelatorio: undefined,
        }),
      });
      render(<DecisionEditorContainer {...props} />);

      const relatorioTextarea = screen.getByTestId('relatorio-textarea') as HTMLTextAreaElement;
      expect(relatorioTextarea.value).toBe('Conteúdo do relatório');
    });

    it('should prefer editedRelatorio over relatorio', () => {
      const props = createMockProps({
        topic: createMockTopic({
          relatorio: 'Original',
          editedRelatorio: 'Editado',
        }),
      });
      render(<DecisionEditorContainer {...props} />);

      const relatorioTextarea = screen.getByTestId('relatorio-textarea') as HTMLTextAreaElement;
      expect(relatorioTextarea.value).toBe('Editado');
    });

    it('should pass fundamentacao content to Decision editor for regular topics', () => {
      const props = createMockProps({
        topic: createMockTopic({
          title: 'Horas Extras',
          fundamentacao: 'Fundamentação aqui',
        }),
      });
      render(<DecisionEditorContainer {...props} />);

      const decisionTextarea = screen.getByTestId('decision-textarea') as HTMLTextAreaElement;
      expect(decisionTextarea.value).toBe('Fundamentação aqui');
    });

    it('should pass editedContent for DISPOSITIVO topic', () => {
      const props = createMockProps({
        topic: createMockTopic({
          title: 'DISPOSITIVO',
          editedContent: 'Conteúdo do dispositivo',
          fundamentacao: 'Fundamentação',
        }),
      });
      render(<DecisionEditorContainer {...props} />);

      const decisionTextarea = screen.getByTestId('decision-textarea') as HTMLTextAreaElement;
      expect(decisionTextarea.value).toBe('Conteúdo do dispositivo');
    });

    it('should call onRelatorioChange when Mini-Relatório content changes', () => {
      const onRelatorioChange = vi.fn();
      const props = createMockProps({ onRelatorioChange });
      render(<DecisionEditorContainer {...props} />);

      const relatorioTextarea = screen.getByTestId('relatorio-textarea');
      fireEvent.change(relatorioTextarea, { target: { value: 'Novo conteúdo' } });

      expect(onRelatorioChange).toHaveBeenCalledWith('Novo conteúdo');
    });

    it('should call onFundamentacaoChange when Decision editor content changes', () => {
      const onFundamentacaoChange = vi.fn();
      const props = createMockProps({ onFundamentacaoChange });
      render(<DecisionEditorContainer {...props} />);

      const decisionTextarea = screen.getByTestId('decision-textarea');
      fireEvent.change(decisionTextarea, { target: { value: 'Nova fundamentação' } });

      expect(onFundamentacaoChange).toHaveBeenCalledWith('Nova fundamentação');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SPECIAL TOPICS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Special Topics', () => {
    it('should handle RELATÓRIO topic correctly', () => {
      const props = createMockProps({
        topic: createMockTopic({ title: 'RELATÓRIO' }),
        getTopicEditorConfig: vi.fn(() => ({
          showCategory: false,
          showMiniRelatorio: false,
          showDecisionEditor: true,
        })),
      });
      render(<DecisionEditorContainer {...props} />);

      expect(screen.getByText('RELATÓRIO')).toBeInTheDocument();
      expect(screen.queryByTitle('Clique para alterar a categoria')).not.toBeInTheDocument();
    });

    it('should handle DISPOSITIVO topic correctly', () => {
      const props = createMockProps({
        topic: createMockTopic({ title: 'DISPOSITIVO' }),
        getTopicEditorConfig: vi.fn(() => ({
          showCategory: false,
          showMiniRelatorio: false,
          showDecisionEditor: true,
        })),
      });
      render(<DecisionEditorContainer {...props} />);

      expect(screen.getByText('DISPOSITIVO')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EDITOR CONFIG TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Editor Config', () => {
    it('should call getTopicEditorConfig with topic title', () => {
      const getTopicEditorConfig = vi.fn(() => ({
        showCategory: true,
        showMiniRelatorio: true,
        showDecisionEditor: true,
      }));
      const props = createMockProps({
        topic: createMockTopic({ title: 'Dano Moral' }),
        getTopicEditorConfig,
      });
      render(<DecisionEditorContainer {...props} />);

      expect(getTopicEditorConfig).toHaveBeenCalledWith('Dano Moral');
    });

    it('should render only Decision editor for topics without Mini-Relatório', () => {
      const props = createMockProps({
        getTopicEditorConfig: vi.fn(() => ({
          showCategory: true,
          showMiniRelatorio: false,
          showDecisionEditor: true,
        })),
      });
      render(<DecisionEditorContainer {...props} />);

      expect(screen.queryByTestId('quill-mini-relatorio-editor')).not.toBeInTheDocument();
      expect(screen.getByTestId('quill-decision-editor')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // REF TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Refs', () => {
    it('should accept containerRef via forwardRef', () => {
      const containerRef = React.createRef<HTMLDivElement>();
      const props = createMockProps();

      render(<DecisionEditorContainer {...props} ref={containerRef} />);

      expect(containerRef.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DEFAULT VALUES TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Default Values', () => {
    it('should default category to MÉRITO when not specified', () => {
      const props = createMockProps({
        topic: createMockTopic({ category: undefined }),
      });
      render(<DecisionEditorContainer {...props} />);

      const categorySelect = screen.getByTitle('Clique para alterar a categoria') as HTMLSelectElement;
      expect(categorySelect.value).toBe('MÉRITO');
    });

    it('should handle empty relatorio gracefully', () => {
      const props = createMockProps({
        topic: createMockTopic({ relatorio: '', editedRelatorio: '' }),
      });
      render(<DecisionEditorContainer {...props} />);

      const relatorioTextarea = screen.getByTestId('relatorio-textarea') as HTMLTextAreaElement;
      expect(relatorioTextarea.value).toBe('');
    });

    it('should handle empty fundamentacao gracefully', () => {
      const props = createMockProps({
        topic: createMockTopic({ fundamentacao: '', editedFundamentacao: '' }),
      });
      render(<DecisionEditorContainer {...props} />);

      const decisionTextarea = screen.getByTestId('decision-textarea') as HTMLTextAreaElement;
      expect(decisionTextarea.value).toBe('');
    });
  });
});
