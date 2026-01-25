/**
 * @file FactsComparisonModal.test.tsx
 * @description Testes para o componente FactsComparisonModal
 * @version 1.38.52
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FactsComparisonModalContent } from './FactsComparisonModal';
import type { FactsComparisonResult } from '../types';

describe('FactsComparisonModalContent', () => {
  const createCachedResult = (): FactsComparisonResult => ({
    topicTitle: 'Tópico de Teste',
    resumo: 'Resumo da análise',
    fatosIncontroversos: ['Fato 1 incontroverso', 'Fato 2 incontroverso'],
    fatosControversos: ['Fato controverso 1', 'Fato controverso 2'],
    tabela: [
      {
        tema: 'Tema 1',
        alegacaoReclamante: 'Alegação do reclamante',
        alegacaoReclamada: 'Alegação da reclamada',
        status: 'controverso',
        relevancia: 'alta',
        observacao: 'Observação importante',
      },
      {
        tema: 'Tema 2',
        alegacaoReclamante: 'Segunda alegação',
        alegacaoReclamada: 'Segunda defesa',
        status: 'incontroverso',
        relevancia: 'media',
      },
    ],
    pontosChave: ['Ponto 1', 'Ponto 2'],
    generatedAt: new Date().toISOString(),
    source: 'mini-relatorio',
  });

  const defaultProps = {
    topicTitle: 'Tópico de Teste',
    topicRelatorio: 'Mini relatório do tópico com detalhes...',
    hasPeticao: true,
    hasContestacao: true,
    onGenerate: vi.fn().mockResolvedValue(undefined),
    cachedResult: null as FactsComparisonResult | null,
    isGenerating: false,
    error: null as string | null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Rendering', () => {
    it('should render source selector', () => {
      render(<FactsComparisonModalContent {...defaultProps} />);
      expect(screen.getByText('Fonte dos dados:')).toBeInTheDocument();
    });

    it('should render mini-relatorio option', () => {
      render(<FactsComparisonModalContent {...defaultProps} />);
      expect(screen.getByText('Mini-relatório do tópico')).toBeInTheDocument();
    });

    it('should render documentos-completos option', () => {
      render(<FactsComparisonModalContent {...defaultProps} />);
      expect(screen.getByText('Documentos completos')).toBeInTheDocument();
    });

    it('should render generate button', () => {
      render(<FactsComparisonModalContent {...defaultProps} />);
      expect(screen.getByText('Gerar Análise')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SOURCE SELECTION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Source Selection', () => {
    it('should have mini-relatorio selected by default', () => {
      render(<FactsComparisonModalContent {...defaultProps} />);
      const radios = screen.getAllByRole('radio');
      expect(radios[0]).toBeChecked();
    });

    it('should allow selecting documentos-completos', () => {
      render(<FactsComparisonModalContent {...defaultProps} />);
      const radios = screen.getAllByRole('radio');
      fireEvent.click(radios[1]);
      expect(radios[1]).toBeChecked();
    });

    it('should disable mini-relatorio when no topicRelatorio', () => {
      render(<FactsComparisonModalContent {...defaultProps} topicRelatorio="" />);
      const radios = screen.getAllByRole('radio');
      expect(radios[0]).toBeDisabled();
    });

    it('should disable documentos-completos when no documents', () => {
      render(<FactsComparisonModalContent {...defaultProps} hasPeticao={false} hasContestacao={false} />);
      const radios = screen.getAllByRole('radio');
      expect(radios[1]).toBeDisabled();
    });

    it('should auto-select documentos-completos when no mini-relatorio', () => {
      render(<FactsComparisonModalContent {...defaultProps} topicRelatorio="" />);
      const radios = screen.getAllByRole('radio');
      // Should auto-select documentos-completos
      expect(radios[1]).toBeChecked();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GENERATE BUTTON
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Generate Button', () => {
    it('should call onGenerate when clicked', async () => {
      render(<FactsComparisonModalContent {...defaultProps} />);
      fireEvent.click(screen.getByText('Gerar Análise'));
      await waitFor(() => {
        expect(defaultProps.onGenerate).toHaveBeenCalledWith('mini-relatorio');
      });
    });

    it('should show loading state when generating', () => {
      render(<FactsComparisonModalContent {...defaultProps} isGenerating={true} />);
      expect(screen.getByText('Analisando...')).toBeInTheDocument();
    });

    it('should be disabled when generating', () => {
      render(<FactsComparisonModalContent {...defaultProps} isGenerating={true} />);
      expect(screen.getByText('Analisando...').closest('button')).toBeDisabled();
    });

    it('should show "Atualizar" when has cached result', () => {
      render(<FactsComparisonModalContent {...defaultProps} cachedResult={createCachedResult()} />);
      expect(screen.getByText('Atualizar')).toBeInTheDocument();
    });

    it('should be disabled when no source available', () => {
      render(<FactsComparisonModalContent
        {...defaultProps}
        topicRelatorio=""
        hasPeticao={false}
        hasContestacao={false}
      />);
      expect(screen.getByText('Gerar Análise').closest('button')).toBeDisabled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // WARNING MESSAGES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Warning Messages', () => {
    it('should show warning when no sources available', () => {
      render(<FactsComparisonModalContent
        {...defaultProps}
        topicRelatorio=""
        hasPeticao={false}
        hasContestacao={false}
      />);
      expect(screen.getByText(/Nenhuma fonte disponível/)).toBeInTheDocument();
    });

    it('should show error message when error exists', () => {
      render(<FactsComparisonModalContent {...defaultProps} error="Erro ao gerar análise" />);
      expect(screen.getByText('Erro ao gerar análise')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CACHED RESULT DISPLAY
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Cached Result Display', () => {
    it('should display resumo when cached', () => {
      render(<FactsComparisonModalContent {...defaultProps} cachedResult={createCachedResult()} />);
      expect(screen.getByText('Resumo da análise')).toBeInTheDocument();
    });

    it('should display fatos incontroversos section', () => {
      render(<FactsComparisonModalContent {...defaultProps} cachedResult={createCachedResult()} />);
      expect(screen.getByText('FATOS INCONTROVERSOS')).toBeInTheDocument();
      expect(screen.getByText('Fato 1 incontroverso')).toBeInTheDocument();
      expect(screen.getByText('Fato 2 incontroverso')).toBeInTheDocument();
    });

    it('should display comparison table', () => {
      render(<FactsComparisonModalContent {...defaultProps} cachedResult={createCachedResult()} />);
      expect(screen.getByText('Tabela Comparativa')).toBeInTheDocument();
      expect(screen.getByText('Tema 1')).toBeInTheDocument();
      expect(screen.getByText('Alegação do reclamante')).toBeInTheDocument();
    });

    it('should display pontos-chave section', () => {
      render(<FactsComparisonModalContent {...defaultProps} cachedResult={createCachedResult()} />);
      expect(screen.getByText('PONTOS-CHAVE A DECIDIR')).toBeInTheDocument();
      expect(screen.getByText('Ponto 1')).toBeInTheDocument();
    });

    it('should show generation date', () => {
      render(<FactsComparisonModalContent {...defaultProps} cachedResult={createCachedResult()} />);
      expect(screen.getByText(/Gerado em:/)).toBeInTheDocument();
    });

    it('should not display result when generating', () => {
      render(<FactsComparisonModalContent {...defaultProps} cachedResult={createCachedResult()} isGenerating={true} />);
      expect(screen.queryByText('Resumo da análise')).not.toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // STATUS BADGES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Status Badges', () => {
    it('should display Controverso badge', () => {
      render(<FactsComparisonModalContent {...defaultProps} cachedResult={createCachedResult()} />);
      expect(screen.getByText('Controverso')).toBeInTheDocument();
    });

    it('should display Incontroverso badge', () => {
      render(<FactsComparisonModalContent {...defaultProps} cachedResult={createCachedResult()} />);
      expect(screen.getByText('Incontroverso')).toBeInTheDocument();
    });

    it('should display relevancia info', () => {
      render(<FactsComparisonModalContent {...defaultProps} cachedResult={createCachedResult()} />);
      expect(screen.getByText('Relevância: alta')).toBeInTheDocument();
      expect(screen.getByText('Relevância: media')).toBeInTheDocument();
    });

    it('should display observacao when present', () => {
      render(<FactsComparisonModalContent {...defaultProps} cachedResult={createCachedResult()} />);
      expect(screen.getByText('Observação importante')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // LOADING STATE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Loading State', () => {
    it('should show loading spinner when generating', () => {
      const { container } = render(<FactsComparisonModalContent {...defaultProps} isGenerating={true} />);
      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('should show loading message when generating', () => {
      render(<FactsComparisonModalContent {...defaultProps} isGenerating={true} />);
      expect(screen.getByText('Analisando alegações das partes...')).toBeInTheDocument();
    });

    it('should disable source selection when generating', () => {
      render(<FactsComparisonModalContent {...defaultProps} isGenerating={true} />);
      const radios = screen.getAllByRole('radio');
      radios.forEach(radio => {
        expect(radio).toBeDisabled();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EMPTY TABLE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Empty Table', () => {
    it('should show empty message when no rows', () => {
      const emptyResult: FactsComparisonResult = {
        ...createCachedResult(),
        tabela: [],
      };
      render(<FactsComparisonModalContent {...defaultProps} cachedResult={emptyResult} />);
      expect(screen.getByText('Nenhum fato identificado para comparação.')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EMPTY SECTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Empty Sections', () => {
    it('should not render fatos incontroversos when empty', () => {
      const result: FactsComparisonResult = {
        ...createCachedResult(),
        fatosIncontroversos: [],
      };
      render(<FactsComparisonModalContent {...defaultProps} cachedResult={result} />);
      expect(screen.queryByText('FATOS INCONTROVERSOS')).not.toBeInTheDocument();
    });

    it('should not render pontos-chave when empty', () => {
      const result: FactsComparisonResult = {
        ...createCachedResult(),
        pontosChave: [],
      };
      render(<FactsComparisonModalContent {...defaultProps} cachedResult={result} />);
      expect(screen.queryByText('PONTOS-CHAVE A DECIDIR')).not.toBeInTheDocument();
    });
  });
});
