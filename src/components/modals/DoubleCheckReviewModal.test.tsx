/**
 * @file DoubleCheckReviewModal.test.tsx
 * @description Testes para o modal de revisão do Double Check
 * @version 1.37.59
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DoubleCheckReviewModal } from './DoubleCheckReviewModal';
import { useUIStore } from '../../stores/useUIStore';
import type { DoubleCheckCorrection, DoubleCheckReviewData } from '../../types';

// Mock do Zustand store
vi.mock('../../stores/useUIStore');

// ═══════════════════════════════════════════════════════════════════════════════
// DADOS DE TESTE
// ═══════════════════════════════════════════════════════════════════════════════

const mockCorrections: DoubleCheckCorrection[] = [
  { type: 'remove', reason: 'Tópico duplicado', topic: 'Horas Extras' },
  { type: 'add', reason: 'Tópico faltante', topic: { title: 'FGTS', category: 'MÉRITO' } },
  { type: 'reclassify', reason: 'Categoria incorreta', topic: 'Férias', from: 'PRELIMINAR', to: 'MÉRITO' }
];

const mockDoubleCheckReview: DoubleCheckReviewData = {
  operation: 'topicExtraction',
  originalResult: '{"original": true}',
  verifiedResult: '{"verified": true}',
  corrections: mockCorrections,
  summary: 'Encontradas 3 correções',
  confidence: 85
};

// ═══════════════════════════════════════════════════════════════════════════════
// TESTES
// ═══════════════════════════════════════════════════════════════════════════════

describe('DoubleCheckReviewModal', () => {
  const mockCloseDoubleCheckReview = vi.fn();
  const mockSetDoubleCheckResult = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDERIZAÇÃO CONDICIONAL
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Renderização condicional', () => {
    it('não renderiza quando doubleCheckReview é null', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(useUIStore).mockImplementation((selector: any) => {
        const state = {
          doubleCheckReview: null,
          closeDoubleCheckReview: mockCloseDoubleCheckReview,
          setDoubleCheckResult: mockSetDoubleCheckResult
        };
        return selector(state);
      });

      const { container } = render(<DoubleCheckReviewModal />);

      expect(container.firstChild).toBeNull();
    });

    it('renderiza modal quando doubleCheckReview tem dados', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(useUIStore).mockImplementation((selector: any) => {
        const state = {
          doubleCheckReview: mockDoubleCheckReview,
          closeDoubleCheckReview: mockCloseDoubleCheckReview,
          setDoubleCheckResult: mockSetDoubleCheckResult
        };
        return selector(state);
      });

      render(<DoubleCheckReviewModal />);

      expect(screen.getByText('Revisão do Double Check')).toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // EXIBIÇÃO DE INFORMAÇÕES
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Exibição de informações', () => {
    beforeEach(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(useUIStore).mockImplementation((selector: any) => {
        const state = {
          doubleCheckReview: mockDoubleCheckReview,
          closeDoubleCheckReview: mockCloseDoubleCheckReview,
          setDoubleCheckResult: mockSetDoubleCheckResult
        };
        return selector(state);
      });
    });

    it('exibe label da operação corretamente', () => {
      render(<DoubleCheckReviewModal />);

      expect(screen.getByText('Extração de Tópicos')).toBeInTheDocument();
    });

    it('exibe número de correções', () => {
      render(<DoubleCheckReviewModal />);

      expect(screen.getByText(/encontrou 3 correção/i)).toBeInTheDocument();
    });

    it('exibe resumo quando disponível', () => {
      render(<DoubleCheckReviewModal />);

      expect(screen.getByText('Encontradas 3 correções')).toBeInTheDocument();
    });

    it('exibe confiança quando disponível', () => {
      render(<DoubleCheckReviewModal />);

      expect(screen.getByText('85%')).toBeInTheDocument();
    });

    it('lista todas as correções', () => {
      render(<DoubleCheckReviewModal />);

      expect(screen.getByText(/Remover tópico "Horas Extras"/)).toBeInTheDocument();
      expect(screen.getByText(/Adicionar tópico "FGTS"/)).toBeInTheDocument();
      expect(screen.getByText(/Reclassificar "Férias"/)).toBeInTheDocument();
    });

    it('exibe motivo de cada correção', () => {
      render(<DoubleCheckReviewModal />);

      expect(screen.getByText(/Motivo: Tópico duplicado/)).toBeInTheDocument();
      expect(screen.getByText(/Motivo: Tópico faltante/)).toBeInTheDocument();
      expect(screen.getByText(/Motivo: Categoria incorreta/)).toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // SELEÇÃO DE CORREÇÕES
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Seleção de correções', () => {
    beforeEach(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(useUIStore).mockImplementation((selector: any) => {
        const state = {
          doubleCheckReview: mockDoubleCheckReview,
          closeDoubleCheckReview: mockCloseDoubleCheckReview,
          setDoubleCheckResult: mockSetDoubleCheckResult
        };
        return selector(state);
      });
    });

    it('todas as correções começam selecionadas por padrão', () => {
      render(<DoubleCheckReviewModal />);

      // O botão deve mostrar (3) no início
      expect(screen.getByText(/Aplicar \(3\)/)).toBeInTheDocument();
    });

    it('toggle de seleção funciona ao clicar em uma correção', async () => {
      render(<DoubleCheckReviewModal />);

      // Encontra e clica na primeira correção para desmarcar
      const firstCorrection = screen.getByText(/Remover tópico "Horas Extras"/).closest('div[class*="cursor-pointer"]');
      if (firstCorrection) {
        fireEvent.click(firstCorrection);
      }

      await waitFor(() => {
        expect(screen.getByText(/Aplicar \(2\)/)).toBeInTheDocument();
      });
    });

    it('"Selecionar Todas" marca todas as correções', async () => {
      render(<DoubleCheckReviewModal />);

      // Primeiro desmarca uma
      const firstCorrection = screen.getByText(/Remover tópico "Horas Extras"/).closest('div[class*="cursor-pointer"]');
      if (firstCorrection) {
        fireEvent.click(firstCorrection);
      }

      await waitFor(() => {
        expect(screen.getByText(/Aplicar \(2\)/)).toBeInTheDocument();
      });

      // Agora clica em "Selecionar Todas"
      fireEvent.click(screen.getByText('Selecionar Todas'));

      await waitFor(() => {
        expect(screen.getByText(/Aplicar \(3\)/)).toBeInTheDocument();
      });
    });

    it('"Desmarcar Todas" desmarca todas as correções', async () => {
      render(<DoubleCheckReviewModal />);

      fireEvent.click(screen.getByText('Desmarcar Todas'));

      await waitFor(() => {
        expect(screen.getByText(/Aplicar \(0\)/)).toBeInTheDocument();
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // AÇÕES DO MODAL
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Ações do modal', () => {
    beforeEach(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(useUIStore).mockImplementation((selector: any) => {
        const state = {
          doubleCheckReview: mockDoubleCheckReview,
          closeDoubleCheckReview: mockCloseDoubleCheckReview,
          setDoubleCheckResult: mockSetDoubleCheckResult
        };
        return selector(state);
      });
    });

    it('"Descartar" chama setDoubleCheckResult com array vazio e resultado original', () => {
      render(<DoubleCheckReviewModal />);

      fireEvent.click(screen.getByText('Descartar'));

      expect(mockSetDoubleCheckResult).toHaveBeenCalledWith({
        selected: [],
        finalResult: mockDoubleCheckReview.originalResult,
        operation: 'topicExtraction'
      });
      expect(mockCloseDoubleCheckReview).toHaveBeenCalled();
    });

    it('"Aplicar" chama setDoubleCheckResult com correções selecionadas', () => {
      render(<DoubleCheckReviewModal />);

      fireEvent.click(screen.getByText(/Aplicar/));

      expect(mockSetDoubleCheckResult).toHaveBeenCalled();
      const callArg = mockSetDoubleCheckResult.mock.calls[0][0];
      expect(callArg.operation).toBe('topicExtraction');
      expect(callArg.selected).toHaveLength(3);
      expect(mockCloseDoubleCheckReview).toHaveBeenCalled();
    });

    it('botão "Aplicar" fica desabilitado quando nenhuma correção está selecionada', async () => {
      render(<DoubleCheckReviewModal />);

      // Desmarca todas
      fireEvent.click(screen.getByText('Desmarcar Todas'));

      await waitFor(() => {
        const applyButton = screen.getByText(/Aplicar \(0\)/).closest('button');
        expect(applyButton).toBeDisabled();
      });
    });

    it('botão "Aplicar" fica habilitado quando há correções selecionadas', () => {
      render(<DoubleCheckReviewModal />);

      const applyButton = screen.getByText(/Aplicar \(3\)/).closest('button');
      expect(applyButton).not.toBeDisabled();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // OPERAÇÕES DIFERENTES
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Operações diferentes', () => {
    it('exibe label correto para dispositivo', () => {
      const dispositivoReview: DoubleCheckReviewData = {
        ...mockDoubleCheckReview,
        operation: 'dispositivo',
        corrections: [
          { type: 'add', reason: 'Faltante', item: 'Julgar procedente' }
        ]
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(useUIStore).mockImplementation((selector: any) => {
        const state = {
          doubleCheckReview: dispositivoReview,
          closeDoubleCheckReview: mockCloseDoubleCheckReview,
          setDoubleCheckResult: mockSetDoubleCheckResult
        };
        return selector(state);
      });

      render(<DoubleCheckReviewModal />);

      expect(screen.getByText('Dispositivo')).toBeInTheDocument();
    });

    it('exibe label correto para sentenceReview', () => {
      const reviewReview: DoubleCheckReviewData = {
        ...mockDoubleCheckReview,
        operation: 'sentenceReview',
        corrections: [
          { type: 'false_positive', reason: 'Não é erro', item: 'Texto' }
        ]
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(useUIStore).mockImplementation((selector: any) => {
        const state = {
          doubleCheckReview: reviewReview,
          closeDoubleCheckReview: mockCloseDoubleCheckReview,
          setDoubleCheckResult: mockSetDoubleCheckResult
        };
        return selector(state);
      });

      render(<DoubleCheckReviewModal />);

      expect(screen.getByText('Revisão de Sentença')).toBeInTheDocument();
    });

    it('exibe label correto para factsComparison', () => {
      const factsReview: DoubleCheckReviewData = {
        ...mockDoubleCheckReview,
        operation: 'factsComparison',
        corrections: [
          { type: 'add_row', reason: 'Faltante', row: { tema: 'Salário' } }
        ]
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(useUIStore).mockImplementation((selector: any) => {
        const state = {
          doubleCheckReview: factsReview,
          closeDoubleCheckReview: mockCloseDoubleCheckReview,
          setDoubleCheckResult: mockSetDoubleCheckResult
        };
        return selector(state);
      });

      render(<DoubleCheckReviewModal />);

      expect(screen.getByText('Confronto de Fatos')).toBeInTheDocument();
    });
  });
});
