/**
 * @file ContextScopeSelector.test.tsx
 * @description Testes para o componente ContextScopeSelector
 * @version 1.38.49
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ContextScopeSelector } from './ContextScopeSelector';
import type { Topic } from '../../types';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  ChevronDown: ({ className }: { className?: string }) => <svg data-testid="chevron-down" className={className} />,
  ChevronUp: ({ className }: { className?: string }) => <svg data-testid="chevron-up" className={className} />,
  Check: ({ className }: { className?: string }) => <svg data-testid="check-icon" className={className} />,
}));

describe('ContextScopeSelector', () => {
  const mockSetContextScope = vi.fn();
  const mockSetSelectedContextTopics = vi.fn();
  const mockSetIncludeMainDocs = vi.fn();
  const mockSetIncludeComplementaryDocs = vi.fn();  // v1.39.06

  const mockTopics = [
    { title: 'Horas Extras', category: 'Jornada', content: '' },
    { title: 'Danos Morais', category: 'Indenizacao', content: '' },
    { title: 'Adicional Noturno', category: 'Jornada', content: '' },
    { title: 'RELATÓRIO', category: 'Geral', content: '' },
    { title: 'DISPOSITIVO', category: 'Geral', content: '' },
  ] as unknown as Topic[];

  const defaultProps = {
    contextScope: 'current' as const,
    setContextScope: mockSetContextScope,
    allTopics: mockTopics,
    currentTopicTitle: 'Horas Extras',
    selectedContextTopics: [] as string[],
    setSelectedContextTopics: mockSetSelectedContextTopics,
    includeMainDocs: false,
    setIncludeMainDocs: mockSetIncludeMainDocs,
    includeComplementaryDocs: false,  // v1.39.06
    setIncludeComplementaryDocs: mockSetIncludeComplementaryDocs,  // v1.39.06
    chatHistoryLength: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERING TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Rendering', () => {
    it('should render the label "Escopo do Contexto"', () => {
      render(<ContextScopeSelector {...defaultProps} />);

      expect(screen.getByText('Escopo do Contexto')).toBeInTheDocument();
    });

    it('should render three radio options', () => {
      render(<ContextScopeSelector {...defaultProps} />);

      expect(screen.getByText('Apenas este tópico')).toBeInTheDocument();
      expect(screen.getByText('Tópicos selecionados')).toBeInTheDocument();
      expect(screen.getByText('Toda a decisão')).toBeInTheDocument();
    });

    it('should render description for "Apenas este topico"', () => {
      render(<ContextScopeSelector {...defaultProps} />);

      expect(screen.getByText('Mini-relatório + decisão do tópico atual')).toBeInTheDocument();
    });

    it('should render description for "Topicos selecionados"', () => {
      render(<ContextScopeSelector {...defaultProps} />);

      expect(screen.getByText('Escolha quais tópicos incluir')).toBeInTheDocument();
    });

    it('should render description for "Toda a decisao"', () => {
      render(<ContextScopeSelector {...defaultProps} />);

      expect(screen.getByText('RELATÓRIO + todos os tópicos')).toBeInTheDocument();
    });

    it('should render include documents toggle', () => {
      render(<ContextScopeSelector {...defaultProps} />);

      expect(screen.getByText('Petições e contestações')).toBeInTheDocument();
      expect(screen.getByText('Documentos complementares')).toBeInTheDocument();
    });

    it('should render hint text when toggle is unlocked', () => {
      render(<ContextScopeSelector {...defaultProps} />);

      expect(screen.getByText(/Documentos principais/)).toBeInTheDocument();
      expect(screen.getByText(/Arquivos extras/)).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SCOPE SELECTION TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Scope Selection', () => {
    it('should have "current" radio checked when contextScope is current', () => {
      render(<ContextScopeSelector {...defaultProps} contextScope="current" />);

      const radios = screen.getAllByRole('radio');
      const currentRadio = radios.find(r => (r as HTMLInputElement).value === 'current');
      expect(currentRadio).toBeChecked();
    });

    it('should have "selected" radio checked when contextScope is selected', () => {
      render(<ContextScopeSelector {...defaultProps} contextScope="selected" />);

      const radios = screen.getAllByRole('radio');
      const selectedRadio = radios.find(r => (r as HTMLInputElement).value === 'selected');
      expect(selectedRadio).toBeChecked();
    });

    it('should have "all" radio checked when contextScope is all', () => {
      render(<ContextScopeSelector {...defaultProps} contextScope="all" />);

      const radios = screen.getAllByRole('radio');
      const allRadio = radios.find(r => (r as HTMLInputElement).value === 'all');
      expect(allRadio).toBeChecked();
    });

    it('should call setContextScope with "current" when clicking first option', () => {
      render(<ContextScopeSelector {...defaultProps} contextScope="all" />);

      const radios = screen.getAllByRole('radio');
      const currentRadio = radios.find(r => (r as HTMLInputElement).value === 'current');
      fireEvent.click(currentRadio!);

      expect(mockSetContextScope).toHaveBeenCalledWith('current');
    });

    it('should call setContextScope with "selected" when clicking second option', () => {
      render(<ContextScopeSelector {...defaultProps} contextScope="current" />);

      const radios = screen.getAllByRole('radio');
      const selectedRadio = radios.find(r => (r as HTMLInputElement).value === 'selected');
      fireEvent.click(selectedRadio!);

      expect(mockSetContextScope).toHaveBeenCalledWith('selected');
    });

    it('should call setContextScope with "all" when clicking third option', () => {
      render(<ContextScopeSelector {...defaultProps} contextScope="current" />);

      const radios = screen.getAllByRole('radio');
      const allRadio = radios.find(r => (r as HTMLInputElement).value === 'all');
      fireEvent.click(allRadio!);

      expect(mockSetContextScope).toHaveBeenCalledWith('all');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TOPIC DROPDOWN TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Topic Dropdown', () => {
    it('should not show topic dropdown when scope is current', () => {
      render(<ContextScopeSelector {...defaultProps} contextScope="current" />);

      expect(screen.queryByText('Selecione os tópicos...')).not.toBeInTheDocument();
    });

    it('should not show topic dropdown when scope is all', () => {
      render(<ContextScopeSelector {...defaultProps} contextScope="all" />);

      expect(screen.queryByText('Selecione os tópicos...')).not.toBeInTheDocument();
    });

    it('should show topic dropdown button when scope is selected', () => {
      render(<ContextScopeSelector {...defaultProps} contextScope="selected" />);

      expect(screen.getByText('Selecione os tópicos...')).toBeInTheDocument();
    });

    it('should show count when topics are selected', () => {
      render(
        <ContextScopeSelector
          {...defaultProps}
          contextScope="selected"
          selectedContextTopics={['Horas Extras', 'Danos Morais']}
        />
      );

      expect(screen.getByText('2 tópico(s) selecionado(s)')).toBeInTheDocument();
    });

    it('should show topic list when dropdown button is clicked', () => {
      render(<ContextScopeSelector {...defaultProps} contextScope="selected" />);

      const button = screen.getByText('Selecione os tópicos...');
      fireEvent.click(button);

      // Should show selectable topics (not RELATORIO/DISPOSITIVO)
      expect(screen.getByText('Horas Extras')).toBeInTheDocument();
      expect(screen.getByText('Danos Morais')).toBeInTheDocument();
      expect(screen.getByText('Adicional Noturno')).toBeInTheDocument();
    });

    it('should filter out RELATORIO and DISPOSITIVO from selectable topics', () => {
      render(<ContextScopeSelector {...defaultProps} contextScope="selected" />);

      const button = screen.getByText('Selecione os tópicos...');
      fireEvent.click(button);

      // These should not be in the dropdown list (filtered by component)
      expect(screen.queryByText('RELATÓRIO')).not.toBeInTheDocument();
      expect(screen.queryByText('DISPOSITIVO')).not.toBeInTheDocument();
    });

    it('should show "Selecionar todos" and "Limpar selecao" buttons in dropdown', () => {
      render(<ContextScopeSelector {...defaultProps} contextScope="selected" />);

      const button = screen.getByText('Selecione os tópicos...');
      fireEvent.click(button);

      expect(screen.getByText('Selecionar todos')).toBeInTheDocument();
      expect(screen.getByText('Limpar seleção')).toBeInTheDocument();
    });

    it('should show category for each topic in dropdown', () => {
      render(<ContextScopeSelector {...defaultProps} contextScope="selected" />);

      const button = screen.getByText('Selecione os tópicos...');
      fireEvent.click(button);

      expect(screen.getAllByText('Jornada').length).toBe(2); // Horas Extras and Adicional Noturno
      expect(screen.getByText('Indenizacao')).toBeInTheDocument();
    });

    it('should mark current topic with "(atual)" label', () => {
      render(<ContextScopeSelector {...defaultProps} contextScope="selected" />);

      const button = screen.getByText('Selecione os tópicos...');
      fireEvent.click(button);

      expect(screen.getByText('(atual)')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TOPIC SELECTION TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Topic Selection', () => {
    it('should call setSelectedContextTopics when toggling a topic', () => {
      render(<ContextScopeSelector {...defaultProps} contextScope="selected" />);

      const button = screen.getByText('Selecione os tópicos...');
      fireEvent.click(button);

      // Click on "Danos Morais" to select it
      const topicButton = screen.getByText('Danos Morais').closest('button');
      fireEvent.click(topicButton!);

      expect(mockSetSelectedContextTopics).toHaveBeenCalledWith(['Danos Morais']);
    });

    it('should remove topic when clicking already selected topic', () => {
      render(
        <ContextScopeSelector
          {...defaultProps}
          contextScope="selected"
          selectedContextTopics={['Horas Extras', 'Danos Morais']}
        />
      );

      const button = screen.getByText('2 tópico(s) selecionado(s)');
      fireEvent.click(button);

      const topicButton = screen.getByText('Danos Morais').closest('button');
      fireEvent.click(topicButton!);

      expect(mockSetSelectedContextTopics).toHaveBeenCalledWith(['Horas Extras']);
    });

    it('should call setSelectedContextTopics with all selectable topics when clicking "Selecionar todos"', () => {
      render(<ContextScopeSelector {...defaultProps} contextScope="selected" />);

      const button = screen.getByText('Selecione os tópicos...');
      fireEvent.click(button);

      fireEvent.click(screen.getByText('Selecionar todos'));

      // Should include all topics except RELATÓRIO and DISPOSITIVO
      const calledWith = mockSetSelectedContextTopics.mock.calls[0][0];
      expect(calledWith).toContain('Horas Extras');
      expect(calledWith).toContain('Danos Morais');
      expect(calledWith).toContain('Adicional Noturno');
      expect(calledWith).not.toContain('RELATÓRIO');
      expect(calledWith).not.toContain('DISPOSITIVO');
    });

    it('should clear all topics when clicking "Limpar selecao"', () => {
      render(
        <ContextScopeSelector
          {...defaultProps}
          contextScope="selected"
          selectedContextTopics={['Horas Extras']}
        />
      );

      const button = screen.getByText('1 tópico(s) selecionado(s)');
      fireEvent.click(button);

      fireEvent.click(screen.getByText('Limpar seleção'));

      expect(mockSetSelectedContextTopics).toHaveBeenCalledWith([]);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INCLUDE MAIN DOCS TOGGLE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Include Main Docs Toggle', () => {
    it('should render checkbox unchecked when includeMainDocs is false', () => {
      render(<ContextScopeSelector {...defaultProps} includeMainDocs={false} />);

      // First checkbox is includeMainDocs, second is includeComplementaryDocs
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes[0]).not.toBeChecked();
    });

    it('should render checkbox checked when includeMainDocs is true', () => {
      render(<ContextScopeSelector {...defaultProps} includeMainDocs={true} />);

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes[0]).toBeChecked();
    });

    it('should call setIncludeMainDocs when checkbox is toggled', () => {
      render(<ContextScopeSelector {...defaultProps} includeMainDocs={false} />);

      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);

      expect(mockSetIncludeMainDocs).toHaveBeenCalledWith(true);
    });

    it('should not call setIncludeMainDocs when toggle is locked', () => {
      render(<ContextScopeSelector {...defaultProps} chatHistoryLength={5} />);

      // First checkbox is includeMainDocs, second is includeComplementaryDocs
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);

      expect(mockSetIncludeMainDocs).not.toHaveBeenCalled();
    });

    it('should show disabled state when chat has history', () => {
      render(<ContextScopeSelector {...defaultProps} chatHistoryLength={3} />);

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes[0]).toBeDisabled();
      expect(checkboxes[1]).toBeDisabled();  // v1.39.06: both should be disabled
    });

    it('should show lock warning when chat has history', () => {
      render(<ContextScopeSelector {...defaultProps} chatHistoryLength={2} />);

      // v1.39.06: Now there are 2 messages (one for each toggle)
      const warnings = screen.getAllByText('Limpe o chat para alterar');
      expect(warnings).toHaveLength(2);
    });

    it('should show hint text when toggle is unlocked', () => {
      render(<ContextScopeSelector {...defaultProps} chatHistoryLength={0} />);

      expect(screen.getByText(/Documentos principais/)).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INCLUDE COMPLEMENTARY DOCS TOGGLE TESTS (v1.39.06)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Include Complementary Docs Toggle', () => {
    it('should render checkbox unchecked when includeComplementaryDocs is false', () => {
      render(<ContextScopeSelector {...defaultProps} includeComplementaryDocs={false} />);

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes[1]).not.toBeChecked();
    });

    it('should render checkbox checked when includeComplementaryDocs is true', () => {
      render(<ContextScopeSelector {...defaultProps} includeComplementaryDocs={true} />);

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes[1]).toBeChecked();
    });

    it('should call setIncludeComplementaryDocs when checkbox is toggled', () => {
      render(<ContextScopeSelector {...defaultProps} includeComplementaryDocs={false} />);

      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[1]);

      expect(mockSetIncludeComplementaryDocs).toHaveBeenCalledWith(true);
    });

    it('should not call setIncludeComplementaryDocs when toggle is locked', () => {
      render(<ContextScopeSelector {...defaultProps} chatHistoryLength={5} />);

      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[1]);

      expect(mockSetIncludeComplementaryDocs).not.toHaveBeenCalled();
    });

    it('should show hint text when toggle is unlocked', () => {
      render(<ContextScopeSelector {...defaultProps} chatHistoryLength={0} />);

      expect(screen.getByText(/Arquivos extras/)).toBeInTheDocument();
    });

    it('should render both toggles independently', () => {
      render(<ContextScopeSelector {...defaultProps} includeMainDocs={true} includeComplementaryDocs={false} />);

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes[0]).toBeChecked();  // includeMainDocs
      expect(checkboxes[1]).not.toBeChecked();  // includeComplementaryDocs
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EMPTY STATE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Empty State', () => {
    it('should show empty message when no selectable topics exist', () => {
      const onlySpecialTopics = [
        { title: 'RELATÓRIO', category: 'Geral', content: '' },
        { title: 'DISPOSITIVO', category: 'Geral', content: '' },
      ] as unknown as Topic[];

      render(
        <ContextScopeSelector
          {...defaultProps}
          contextScope="selected"
          allTopics={onlySpecialTopics}
        />
      );

      const button = screen.getByText('Selecione os tópicos...');
      fireEvent.click(button);

      expect(screen.getByText('Nenhum tópico disponível')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CHEVRON ICON TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Chevron Icons', () => {
    it('should show ChevronDown when dropdown is closed', () => {
      render(<ContextScopeSelector {...defaultProps} contextScope="selected" />);

      expect(screen.getByTestId('chevron-down')).toBeInTheDocument();
    });

    it('should show ChevronUp when dropdown is open', () => {
      render(<ContextScopeSelector {...defaultProps} contextScope="selected" />);

      const button = screen.getByText('Selecione os tópicos...');
      fireEvent.click(button);

      expect(screen.getByTestId('chevron-up')).toBeInTheDocument();
    });
  });
});
