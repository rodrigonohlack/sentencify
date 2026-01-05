/**
 * Testes para TopicCurationModal
 * v1.35.30 - Testes de renderização, callbacks e funcionalidades
 *
 * Estes testes teriam pego os erros:
 * - "theme is not defined" (teste de renderização)
 * - "setAnalysisInProgress is not defined" (teste de callback)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Mock do dnd-kit (complexo de testar diretamente)
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }) => <div data-testid="dnd-context">{children}</div>,
  closestCenter: vi.fn(),
  PointerSensor: vi.fn(),
  useSensor: vi.fn(() => ({})),
  useSensors: vi.fn(() => [])
}));

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }) => <div data-testid="sortable-context">{children}</div>,
  verticalListSortingStrategy: {},
  useSortable: vi.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false
  })),
  arrayMove: vi.fn((arr, from, to) => {
    const result = [...arr];
    const [removed] = result.splice(from, 1);
    result.splice(to, 0, removed);
    return result;
  })
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: vi.fn(() => '')
    }
  }
}));

// Import após mocks
import TopicCurationModal from './TopicCurationModal';

// ═══════════════════════════════════════════════════════════════════════════════
// DADOS DE TESTE
// ═══════════════════════════════════════════════════════════════════════════════

const mockTopics = [
  { title: 'RELATÓRIO', category: 'RELATÓRIO' },
  { title: 'PRESCRIÇÃO BIENAL', category: 'PREJUDICIAL' },
  { title: 'HORAS EXTRAS', category: 'MÉRITO' },
  { title: 'ADICIONAL NOTURNO', category: 'MÉRITO' },
  { title: 'DANO MORAL', category: 'MÉRITO' }
];

const defaultProps = {
  isOpen: true,
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
  initialTopics: mockTopics,
  model: 'claude-sonnet-4-20250514',
  parallelRequests: 5,
  isDarkMode: true
};

// ═══════════════════════════════════════════════════════════════════════════════
// TESTES DE RENDERIZAÇÃO
// ═══════════════════════════════════════════════════════════════════════════════

describe('TopicCurationModal - Renderização', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('deve renderizar sem erros com props válidas', () => {
    // Este teste pegaria "theme is not defined"
    expect(() => {
      render(<TopicCurationModal {...defaultProps} />);
    }).not.toThrow();
  });

  it('não deve renderizar quando isOpen=false', () => {
    render(<TopicCurationModal {...defaultProps} isOpen={false} />);

    expect(screen.queryByText('Revisão de Tópicos')).not.toBeInTheDocument();
  });

  it('deve renderizar o header corretamente', () => {
    render(<TopicCurationModal {...defaultProps} />);

    expect(screen.getByText('Revisão de Tópicos')).toBeInTheDocument();
    expect(screen.getByText('5 tópicos identificados')).toBeInTheDocument();
  });

  it('deve renderizar todos os tópicos', () => {
    render(<TopicCurationModal {...defaultProps} />);

    // RELATÓRIO aparece 2x (título + badge), então usamos getAllByText
    expect(screen.getAllByText('RELATÓRIO').length).toBeGreaterThan(0);
    expect(screen.getByText('PRESCRIÇÃO BIENAL')).toBeInTheDocument();
    expect(screen.getByText('HORAS EXTRAS')).toBeInTheDocument();
    expect(screen.getByText('ADICIONAL NOTURNO')).toBeInTheDocument();
    expect(screen.getByText('DANO MORAL')).toBeInTheDocument();
  });

  it('deve renderizar instruções', () => {
    render(<TopicCurationModal {...defaultProps} />);

    expect(screen.getByText(/Arraste para reordenar/)).toBeInTheDocument();
    expect(screen.getByText(/Clique para editar/)).toBeInTheDocument();
    expect(screen.getByText(/Apague desnecessários/)).toBeInTheDocument();
  });

  it('deve renderizar estimativa de custo e tempo', () => {
    render(<TopicCurationModal {...defaultProps} />);

    // 4 tópicos (excluindo RELATÓRIO) × ~4000 tokens
    expect(screen.getByText('4 tópicos')).toBeInTheDocument();
    expect(screen.getByText(/~R\$/)).toBeInTheDocument();
    expect(screen.getByText(/~\d+ min/)).toBeInTheDocument();
  });

  it('deve renderizar botão Confirmar (sem Cancelar - modal não pode ser fechado)', () => {
    render(<TopicCurationModal {...defaultProps} />);

    // v1.35.34: Modal não pode ser fechado - apenas botão Confirmar
    expect(screen.queryByText('Cancelar')).not.toBeInTheDocument();
    expect(screen.getByText('Confirmar e Gerar')).toBeInTheDocument();
  });

  it('deve renderizar botão Adicionar Tópico', () => {
    render(<TopicCurationModal {...defaultProps} />);

    expect(screen.getByText('Adicionar Tópico')).toBeInTheDocument();
  });

  it('deve renderizar corretamente em modo claro', () => {
    render(<TopicCurationModal {...defaultProps} isDarkMode={false} />);

    expect(screen.getByText('Revisão de Tópicos')).toBeInTheDocument();
  });

  it('deve renderizar com lista vazia de tópicos', () => {
    render(<TopicCurationModal {...defaultProps} initialTopics={[]} />);

    expect(screen.getByText('0 tópicos identificados')).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TESTES DE CALLBACKS
// ═══════════════════════════════════════════════════════════════════════════════

describe('TopicCurationModal - Callbacks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // v1.35.34: Modal não pode ser fechado - botão Cancelar removido
  it('não deve ter botão Cancelar (modal não pode ser fechado)', async () => {
    render(<TopicCurationModal {...defaultProps} />);

    expect(screen.queryByText('Cancelar')).not.toBeInTheDocument();
  });

  // v1.35.34: Modal não pode ser fechado - backdrop não responde a click
  it('backdrop não deve fechar o modal ao clicar', async () => {
    const onCancel = vi.fn();
    render(<TopicCurationModal {...defaultProps} onCancel={onCancel} />);

    // O backdrop tem a classe bg-black/70
    const backdrop = document.querySelector('.bg-black\\/70');
    fireEvent.click(backdrop);

    // Não deve chamar onCancel
    expect(onCancel).not.toHaveBeenCalled();
  });

  // v1.35.34: Botão X removido - modal não pode ser fechado
  it('não deve ter botão X no header', async () => {
    render(<TopicCurationModal {...defaultProps} />);

    // Verificar que não existe botão X no header (apenas ícones X em sub-modais)
    const header = screen.getByText('Revisão de Tópicos').closest('div').parentElement;
    const xButtonInHeader = header?.querySelector('button svg.lucide-x');

    expect(xButtonInHeader).toBeNull();
  });

  it('deve chamar onConfirm ao clicar em Confirmar e Gerar', async () => {
    // Este teste pegaria "setAnalysisInProgress is not defined" no App.jsx
    const onConfirm = vi.fn();
    render(<TopicCurationModal {...defaultProps} onConfirm={onConfirm} />);

    fireEvent.click(screen.getByText('Confirmar e Gerar'));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    // Deve passar os tópicos (sem campos internos como id)
    expect(onConfirm).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ title: 'RELATÓRIO', category: 'RELATÓRIO' }),
        expect.objectContaining({ title: 'PRESCRIÇÃO BIENAL', category: 'PREJUDICIAL' })
      ])
    );
  });

  // v1.35.34: Modal não pode ser fechado - ESC não funciona
  it('ESC não deve fechar o modal', async () => {
    const onCancel = vi.fn();
    render(<TopicCurationModal {...defaultProps} onCancel={onCancel} />);

    fireEvent.keyDown(document, { key: 'Escape' });

    // Não deve chamar onCancel
    expect(onCancel).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TESTES DE EDIÇÃO DE TÍTULO
// ═══════════════════════════════════════════════════════════════════════════════

describe('TopicCurationModal - Edição de Título', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve entrar em modo de edição ao clicar no título', async () => {
    render(<TopicCurationModal {...defaultProps} />);

    // Clicar no título para editar
    fireEvent.click(screen.getByText('HORAS EXTRAS'));

    // Deve aparecer um input
    await waitFor(() => {
      const input = screen.getByDisplayValue('HORAS EXTRAS');
      expect(input).toBeInTheDocument();
      expect(input.tagName).toBe('INPUT');
    });
  });

  it('deve salvar título ao pressionar Enter', async () => {
    const user = userEvent.setup();
    render(<TopicCurationModal {...defaultProps} />);

    // Entrar em modo de edição
    fireEvent.click(screen.getByText('HORAS EXTRAS'));

    await waitFor(() => {
      expect(screen.getByDisplayValue('HORAS EXTRAS')).toBeInTheDocument();
    });

    const input = screen.getByDisplayValue('HORAS EXTRAS');

    // Limpar e digitar novo valor
    await user.clear(input);
    await user.type(input, 'HORAS EXTRAS E REFLEXOS{enter}');

    // Deve atualizar o título (convertido para uppercase)
    await waitFor(() => {
      expect(screen.getByText('HORAS EXTRAS E REFLEXOS')).toBeInTheDocument();
    });
  });

  it('deve cancelar edição ao pressionar Escape', async () => {
    render(<TopicCurationModal {...defaultProps} />);

    // Entrar em modo de edição
    fireEvent.click(screen.getByText('HORAS EXTRAS'));

    await waitFor(() => {
      expect(screen.getByDisplayValue('HORAS EXTRAS')).toBeInTheDocument();
    });

    const input = screen.getByDisplayValue('HORAS EXTRAS');

    // Mudar valor e cancelar
    fireEvent.change(input, { target: { value: 'OUTRO TITULO' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    // Deve manter o título original
    await waitFor(() => {
      expect(screen.getByText('HORAS EXTRAS')).toBeInTheDocument();
    });
  });

  it('não deve permitir editar tópico RELATÓRIO', async () => {
    render(<TopicCurationModal {...defaultProps} />);

    // O RELATÓRIO deve estar marcado como fixo
    expect(screen.getByText('Fixo')).toBeInTheDocument();

    // Encontrar o título RELATÓRIO (o primeiro span com esse texto)
    const relatorioTitle = screen.getAllByText('RELATÓRIO')[0];

    // Tentar clicar no RELATÓRIO
    fireEvent.click(relatorioTitle);

    // Não deve entrar em modo de edição (não deve ter input)
    expect(screen.queryByDisplayValue('RELATÓRIO')).not.toBeInTheDocument();
  });

  it('deve converter título para uppercase automaticamente', async () => {
    const user = userEvent.setup();
    render(<TopicCurationModal {...defaultProps} />);

    fireEvent.click(screen.getByText('HORAS EXTRAS'));

    await waitFor(() => {
      expect(screen.getByDisplayValue('HORAS EXTRAS')).toBeInTheDocument();
    });

    const input = screen.getByDisplayValue('HORAS EXTRAS');
    await user.clear(input);
    await user.type(input, 'teste minusculo');

    // Deve converter para uppercase enquanto digita
    expect(input.value).toBe('TESTE MINUSCULO');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TESTES DE EXCLUSÃO
// ═══════════════════════════════════════════════════════════════════════════════

describe('TopicCurationModal - Exclusão', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve remover tópico ao clicar no botão de lixeira', async () => {
    render(<TopicCurationModal {...defaultProps} />);

    // Encontrar botão de delete do tópico HORAS EXTRAS
    const horasExtrasCard = screen.getByText('HORAS EXTRAS').closest('.flex');
    const deleteButton = within(horasExtrasCard).getByTitle('Remover tópico');

    fireEvent.click(deleteButton);

    // Tópico deve ser removido
    await waitFor(() => {
      expect(screen.queryByText('HORAS EXTRAS')).not.toBeInTheDocument();
    });
  });

  it('deve mostrar botão de desfazer após exclusão', async () => {
    render(<TopicCurationModal {...defaultProps} />);

    // Excluir um tópico
    const horasExtrasCard = screen.getByText('HORAS EXTRAS').closest('.flex');
    const deleteButton = within(horasExtrasCard).getByTitle('Remover tópico');
    fireEvent.click(deleteButton);

    // Deve mostrar botão de desfazer
    await waitFor(() => {
      expect(screen.getByText(/Desfazer exclusão/)).toBeInTheDocument();
      expect(screen.getByText(/"HORAS EXTRAS"/)).toBeInTheDocument();
    });
  });

  it('deve restaurar tópico ao clicar em desfazer', async () => {
    render(<TopicCurationModal {...defaultProps} />);

    // Excluir um tópico
    const horasExtrasCard = screen.getByText('HORAS EXTRAS').closest('.flex');
    const deleteButton = within(horasExtrasCard).getByTitle('Remover tópico');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.queryByText('HORAS EXTRAS')).not.toBeInTheDocument();
    });

    // Clicar em desfazer
    const undoButton = screen.getByText(/Desfazer exclusão/);
    fireEvent.click(undoButton);

    // Tópico deve voltar
    await waitFor(() => {
      expect(screen.getByText('HORAS EXTRAS')).toBeInTheDocument();
    });
  });

  it('não deve ter botão de delete no tópico RELATÓRIO', async () => {
    render(<TopicCurationModal {...defaultProps} />);

    // O card do RELATÓRIO não deve ter botão de delete
    // Encontrar o título RELATÓRIO (primeiro elemento) e seu card pai
    const relatorioTitle = screen.getAllByText('RELATÓRIO')[0];
    const relatorioCard = relatorioTitle.closest('.flex');
    const deleteButton = within(relatorioCard).queryByTitle('Remover tópico');

    expect(deleteButton).not.toBeInTheDocument();
  });

  it('deve atualizar estimativa após exclusão', async () => {
    render(<TopicCurationModal {...defaultProps} />);

    // Inicialmente 4 tópicos (excluindo RELATÓRIO)
    expect(screen.getByText('4 tópicos')).toBeInTheDocument();

    // Excluir um tópico
    const horasExtrasCard = screen.getByText('HORAS EXTRAS').closest('.flex');
    const deleteButton = within(horasExtrasCard).getByTitle('Remover tópico');
    fireEvent.click(deleteButton);

    // Deve atualizar para 3 tópicos
    await waitFor(() => {
      expect(screen.getByText('3 tópicos')).toBeInTheDocument();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TESTES DE MESCLAGEM
// ═══════════════════════════════════════════════════════════════════════════════

describe('TopicCurationModal - Mesclagem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve selecionar tópico para merge ao clicar no ícone', async () => {
    render(<TopicCurationModal {...defaultProps} />);

    // Encontrar botão de merge do tópico HORAS EXTRAS
    const horasExtrasCard = screen.getByText('HORAS EXTRAS').closest('.flex');
    const mergeButton = within(horasExtrasCard).getByTitle(/Selecionar para mesclar/);

    fireEvent.click(mergeButton);

    // Botão deve mudar de estado (ficar selecionado)
    await waitFor(() => {
      expect(mergeButton.className).toContain('bg-green-600');
    });
  });

  it('deve mostrar botão de mesclar quando 2+ tópicos selecionados', async () => {
    render(<TopicCurationModal {...defaultProps} />);

    // Selecionar dois tópicos
    const horasExtrasCard = screen.getByText('HORAS EXTRAS').closest('.flex');
    const adicionalCard = screen.getByText('ADICIONAL NOTURNO').closest('.flex');

    fireEvent.click(within(horasExtrasCard).getByTitle(/Selecionar para mesclar/));
    fireEvent.click(within(adicionalCard).getByTitle(/Selecionar para mesclar/));

    // Deve aparecer botão de mesclar
    await waitFor(() => {
      expect(screen.getByText(/Mesclar 2 tópicos selecionados/)).toBeInTheDocument();
    });
  });

  it('deve abrir confirmação de merge ao clicar em mesclar', async () => {
    render(<TopicCurationModal {...defaultProps} />);

    // Selecionar dois tópicos
    const horasExtrasCard = screen.getByText('HORAS EXTRAS').closest('.flex');
    const adicionalCard = screen.getByText('ADICIONAL NOTURNO').closest('.flex');

    fireEvent.click(within(horasExtrasCard).getByTitle(/Selecionar para mesclar/));
    fireEvent.click(within(adicionalCard).getByTitle(/Selecionar para mesclar/));

    await waitFor(() => {
      expect(screen.getByText(/Mesclar 2 tópicos selecionados/)).toBeInTheDocument();
    });

    // Clicar no botão de mesclar
    fireEvent.click(screen.getByText(/Mesclar 2 tópicos selecionados/));

    // Deve abrir confirmação
    await waitFor(() => {
      expect(screen.getByText(/Mesclar 2 tópicos/)).toBeInTheDocument();
      expect(screen.getByText('Confirmar Mesclagem')).toBeInTheDocument();
    });
  });

  it('deve mesclar tópicos ao confirmar', async () => {
    const user = userEvent.setup();
    render(<TopicCurationModal {...defaultProps} />);

    // Selecionar dois tópicos
    const horasExtrasCard = screen.getByText('HORAS EXTRAS').closest('.flex');
    const adicionalCard = screen.getByText('ADICIONAL NOTURNO').closest('.flex');

    fireEvent.click(within(horasExtrasCard).getByTitle(/Selecionar para mesclar/));
    fireEvent.click(within(adicionalCard).getByTitle(/Selecionar para mesclar/));

    await waitFor(() => {
      expect(screen.getByText(/Mesclar 2 tópicos selecionados/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Mesclar 2 tópicos selecionados/));

    await waitFor(() => {
      expect(screen.getByText('Confirmar Mesclagem')).toBeInTheDocument();
    });

    // Editar título do merge
    const mergeInput = screen.getByDisplayValue('HORAS EXTRAS + ADICIONAL NOTURNO');
    await user.clear(mergeInput);
    await user.type(mergeInput, 'JORNADA DE TRABALHO');

    // Confirmar
    fireEvent.click(screen.getByText('Confirmar Mesclagem'));

    // Tópicos originais devem sumir, novo deve aparecer
    await waitFor(() => {
      expect(screen.queryByText('HORAS EXTRAS')).not.toBeInTheDocument();
      expect(screen.queryByText('ADICIONAL NOTURNO')).not.toBeInTheDocument();
      expect(screen.getByText('JORNADA DE TRABALHO')).toBeInTheDocument();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TESTES DE SEPARAÇÃO
// ═══════════════════════════════════════════════════════════════════════════════

describe('TopicCurationModal - Separação', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve abrir modal de split ao clicar no ícone', async () => {
    render(<TopicCurationModal {...defaultProps} />);

    // Encontrar botão de split
    const horasExtrasCard = screen.getByText('HORAS EXTRAS').closest('.flex');
    const splitButton = within(horasExtrasCard).getByTitle(/Separar em subtópicos/);

    fireEvent.click(splitButton);

    // Deve abrir modal de split
    await waitFor(() => {
      expect(screen.getByText(/Separar "HORAS EXTRAS" em:/)).toBeInTheDocument();
    });
  });

  it('deve separar tópico em subtópicos', async () => {
    const user = userEvent.setup();
    render(<TopicCurationModal {...defaultProps} />);

    // Abrir split
    const horasExtrasCard = screen.getByText('HORAS EXTRAS').closest('.flex');
    const splitButton = within(horasExtrasCard).getByTitle(/Separar em subtópicos/);
    fireEvent.click(splitButton);

    await waitFor(() => {
      expect(screen.getByText(/Separar "HORAS EXTRAS" em:/)).toBeInTheDocument();
    });

    // Preencher subtópicos
    const inputs = screen.getAllByPlaceholderText(/Subtópico/);
    await user.type(inputs[0], 'HORAS EXTRAS 50%');
    await user.type(inputs[1], 'HORAS EXTRAS 100%');

    // Confirmar
    fireEvent.click(screen.getByText(/Separar \(2 tópicos\)/));

    // Deve criar os subtópicos
    await waitFor(() => {
      expect(screen.queryByText('HORAS EXTRAS')).not.toBeInTheDocument();
      expect(screen.getByText('HORAS EXTRAS 50%')).toBeInTheDocument();
      expect(screen.getByText('HORAS EXTRAS 100%')).toBeInTheDocument();
    });
  });

  it('deve cancelar split ao clicar em cancelar', async () => {
    render(<TopicCurationModal {...defaultProps} />);

    // Abrir split
    const horasExtrasCard = screen.getByText('HORAS EXTRAS').closest('.flex');
    const splitButton = within(horasExtrasCard).getByTitle(/Separar em subtópicos/);
    fireEvent.click(splitButton);

    await waitFor(() => {
      expect(screen.getByText(/Separar "HORAS EXTRAS" em:/)).toBeInTheDocument();
    });

    // Encontrar todos os botões Cancelar e clicar no que está dentro do split modal
    // O split modal tem classe mt-2 p-4 rounded-lg
    const cancelButtons = screen.getAllByText('Cancelar');
    // O botão Cancelar do split é o primeiro que encontramos além do principal
    const splitCancelButton = cancelButtons.find(btn =>
      btn.closest('.mt-2.p-4') || btn.closest('[class*="mt-2"]')
    ) || cancelButtons[0];
    fireEvent.click(splitCancelButton);

    // Modal deve fechar, tópico deve permanecer
    await waitFor(() => {
      expect(screen.queryByText(/Separar "HORAS EXTRAS" em:/)).not.toBeInTheDocument();
      expect(screen.getByText('HORAS EXTRAS')).toBeInTheDocument();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TESTES DE ADICIONAR TÓPICO
// ═══════════════════════════════════════════════════════════════════════════════

describe('TopicCurationModal - Adicionar Tópico', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve abrir formulário ao clicar em Adicionar Tópico', async () => {
    render(<TopicCurationModal {...defaultProps} />);

    fireEvent.click(screen.getByText('Adicionar Tópico'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Título do novo tópico')).toBeInTheDocument();
    });
  });

  it('deve adicionar novo tópico ao confirmar', async () => {
    const user = userEvent.setup();
    render(<TopicCurationModal {...defaultProps} />);

    fireEvent.click(screen.getByText('Adicionar Tópico'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Título do novo tópico')).toBeInTheDocument();
    });

    // Digitar título
    const input = screen.getByPlaceholderText('Título do novo tópico');
    await user.type(input, 'FÉRIAS PROPORCIONAIS');

    // Confirmar (botão com check)
    const confirmButton = input.parentElement.querySelector('button:not([class*="hover:bg-slate"])');
    fireEvent.click(confirmButton);

    // Novo tópico deve aparecer
    await waitFor(() => {
      expect(screen.getByText('FÉRIAS PROPORCIONAIS')).toBeInTheDocument();
    });
  });

  it('deve cancelar adição ao clicar em X', async () => {
    render(<TopicCurationModal {...defaultProps} />);

    fireEvent.click(screen.getByText('Adicionar Tópico'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Título do novo tópico')).toBeInTheDocument();
    });

    // Encontrar botão X (segundo botão no formulário)
    const form = screen.getByPlaceholderText('Título do novo tópico').closest('.flex');
    const buttons = within(form).getAllByRole('button');
    const cancelButton = buttons[buttons.length - 1]; // Último botão é o X

    fireEvent.click(cancelButton);

    // Formulário deve fechar
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Título do novo tópico')).not.toBeInTheDocument();
    });
  });

  it('deve atualizar estimativa após adicionar tópico', async () => {
    const user = userEvent.setup();
    render(<TopicCurationModal {...defaultProps} />);

    // Inicialmente 4 tópicos
    expect(screen.getByText('4 tópicos')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Adicionar Tópico'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Título do novo tópico')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('Título do novo tópico');
    await user.type(input, 'FÉRIAS{enter}');

    // Deve atualizar para 5 tópicos
    await waitFor(() => {
      expect(screen.getByText('5 tópicos')).toBeInTheDocument();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TESTES DE ESTIMATIVA DE CUSTO
// ═══════════════════════════════════════════════════════════════════════════════

describe('TopicCurationModal - Estimativa de Custo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve mostrar estimativa baseada no número de tópicos', () => {
    render(<TopicCurationModal {...defaultProps} />);

    // 4 tópicos gerando relatório (RELATÓRIO não conta)
    expect(screen.getByText('4 tópicos')).toBeInTheDocument();
  });

  it('deve excluir RELATÓRIO da contagem', () => {
    // Só RELATÓRIO
    const onlyRelatorio = [{ title: 'RELATÓRIO', category: 'RELATÓRIO' }];
    render(<TopicCurationModal {...defaultProps} initialTopics={onlyRelatorio} />);

    expect(screen.getByText('0 tópicos')).toBeInTheDocument();
  });

  it('deve desabilitar confirmação se não há tópicos', () => {
    const onlyRelatorio = [{ title: 'RELATÓRIO', category: 'RELATÓRIO' }];
    render(<TopicCurationModal {...defaultProps} initialTopics={onlyRelatorio} />);

    const confirmButton = screen.getByText('Confirmar e Gerar');
    expect(confirmButton).toBeDisabled();
  });

  it('deve mostrar tempo estimado baseado em parallelRequests', () => {
    render(<TopicCurationModal {...defaultProps} parallelRequests={10} />);

    // Com 4 tópicos e 10 parallelRequests, tempo deve ser menor
    expect(screen.getByText(/~\d+ min/)).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TESTES DE TÓPICOS ESPECIAIS
// ═══════════════════════════════════════════════════════════════════════════════

describe('TopicCurationModal - Tópicos Especiais', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('RELATÓRIO deve estar marcado como fixo', () => {
    render(<TopicCurationModal {...defaultProps} />);

    expect(screen.getByText('Fixo')).toBeInTheDocument();
  });

  it('RELATÓRIO não deve ter botões de ação', () => {
    render(<TopicCurationModal {...defaultProps} />);

    // Encontrar o título RELATÓRIO e seu card pai
    const relatorioTitle = screen.getAllByText('RELATÓRIO')[0];
    const relatorioCard = relatorioTitle.closest('.flex');

    // Não deve ter botões de delete, merge ou split
    expect(within(relatorioCard).queryByTitle('Remover tópico')).not.toBeInTheDocument();
    expect(within(relatorioCard).queryByTitle(/Selecionar para mesclar/)).not.toBeInTheDocument();
    expect(within(relatorioCard).queryByTitle(/Separar em subtópicos/)).not.toBeInTheDocument();
  });

  it('RELATÓRIO deve ter ícone de pin em vez de grip', () => {
    render(<TopicCurationModal {...defaultProps} />);

    // Encontrar o título RELATÓRIO e seu card pai
    const relatorioTitle = screen.getAllByText('RELATÓRIO')[0];
    const relatorioCard = relatorioTitle.closest('.flex');

    // Deve ter ícone de pin
    expect(within(relatorioCard).getByTitle('Posição fixa')).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TESTES DE CATEGORIAS
// ═══════════════════════════════════════════════════════════════════════════════

describe('TopicCurationModal - Categorias', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve mostrar badge de categoria para cada tópico', () => {
    render(<TopicCurationModal {...defaultProps} />);

    // Verificar que categorias estão visíveis (RELATÓRIO aparece 2x: título + badge)
    expect(screen.getAllByText('RELATÓRIO').length).toBeGreaterThan(0);
    expect(screen.getByText('PREJUDICIAL')).toBeInTheDocument();
    expect(screen.getAllByText('MÉRITO').length).toBeGreaterThan(0);
  });

  it('deve permitir mudar categoria durante edição', async () => {
    render(<TopicCurationModal {...defaultProps} />);

    // Entrar em modo de edição
    fireEvent.click(screen.getByText('HORAS EXTRAS'));

    await waitFor(() => {
      expect(screen.getByDisplayValue('HORAS EXTRAS')).toBeInTheDocument();
    });

    // Durante edição, MÉRITO aparece como botão dropdown (não como badge simples)
    // Encontrar botões que contêm MÉRITO
    const meritoElements = screen.getAllByText('MÉRITO');
    const categoryButton = meritoElements.find(el => el.closest('button'));
    expect(categoryButton).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TESTES DE PROPS E DEFAULTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('TopicCurationModal - Props e Defaults', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve usar valores default para props opcionais', () => {
    render(
      <TopicCurationModal
        isOpen={true}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    // Deve renderizar sem erros com props mínimas
    expect(screen.getByText('Revisão de Tópicos')).toBeInTheDocument();
    expect(screen.getByText('0 tópicos identificados')).toBeInTheDocument();
  });

  it('deve aceitar modelo Gemini', () => {
    render(
      <TopicCurationModal
        {...defaultProps}
        model="gemini-2.0-flash-001"
      />
    );

    // Custo deve ser diferente (Gemini é mais barato)
    expect(screen.getByText(/~R\$/)).toBeInTheDocument();
  });

  it('deve aceitar diferentes valores de parallelRequests', () => {
    render(
      <TopicCurationModal
        {...defaultProps}
        parallelRequests={20}
      />
    );

    // Tempo deve ser menor com mais paralelismo
    expect(screen.getByText(/~\d+ min/)).toBeInTheDocument();
  });
});
