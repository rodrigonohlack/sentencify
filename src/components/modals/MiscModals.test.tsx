/**
 * @file MiscModals.test.tsx
 * @description Testes para os modais diversos (AnalysisModal, ExportModal, AnonymizationNamesModal, LinkedProofsModal)
 * @version 1.38.49
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AnalysisModal, ExportModal, AnonymizationNamesModal, LinkedProofsModal } from './MiscModals';
import type {
  AnalysisModalProps,
  ExportModalProps,
  AnonymizationNamesModalProps,
  LinkedProofsModalProps,
  Proof,
} from '../../types';

// Mock ClipboardItem globally (not available in jsdom)
class MockClipboardItem {
  types: string[];
  constructor(items: Record<string, Blob>) {
    this.types = Object.keys(items);
  }
  getType(_type: string) { return Promise.resolve(new Blob()); }
}
(global as any).ClipboardItem = MockClipboardItem;

// ═══════════════════════════════════════════════════════════════════════════
// TESTS: ANALYSIS MODAL
// ═══════════════════════════════════════════════════════════════════════════

describe('AnalysisModal', () => {
  const createProps = (overrides: Partial<AnalysisModalProps> = {}): AnalysisModalProps => ({
    isOpen: true,
    analysisProgress: 'Processando documentos...',
    peticaoFiles: [],
    pastedPeticaoTexts: [],
    contestacaoFiles: [],
    pastedContestacaoTexts: [],
    complementaryFiles: [],
    pastedComplementaryTexts: [],
    ...overrides,
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Rendering', () => {
    it('should return null when isOpen is false', () => {
      const { container } = render(<AnalysisModal {...createProps({ isOpen: false })} />);
      expect(container.innerHTML).toBe('');
    });

    it('should render when isOpen is true', () => {
      render(<AnalysisModal {...createProps()} />);
      expect(screen.getByText('Análise em Andamento')).toBeInTheDocument();
    });

    it('should display the subtitle text', () => {
      render(<AnalysisModal {...createProps()} />);
      expect(screen.getByText('Por favor, aguarde enquanto processamos os documentos')).toBeInTheDocument();
    });

    it('should display the analysis progress message', () => {
      render(<AnalysisModal {...createProps({ analysisProgress: 'Extraindo texto...' })} />);
      expect(screen.getByText('Extraindo texto...')).toBeInTheDocument();
    });

    it('should display different progress messages', () => {
      render(<AnalysisModal {...createProps({ analysisProgress: 'Analisando com IA...' })} />);
      expect(screen.getByText('Analisando com IA...')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DOCUMENT COUNT DISPLAY
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Document Count Display', () => {
    it('should show "Não anexados" when no peticao files or texts', () => {
      render(<AnalysisModal {...createProps({ peticaoFiles: [], pastedPeticaoTexts: [] })} />);
      expect(screen.getByText(/Não anexados/)).toBeInTheDocument();
    });

    it('should show singular count for 1 peticao file', () => {
      const files = [{ name: 'pet.pdf', size: 1000, type: 'application/pdf' }] as any;
      render(<AnalysisModal {...createProps({ peticaoFiles: files })} />);
      expect(screen.getByText(/1 documento$/)).toBeInTheDocument();
    });

    it('should show plural count for multiple peticao files', () => {
      const files = [
        { name: 'pet1.pdf', size: 1000, type: 'application/pdf' },
        { name: 'pet2.pdf', size: 2000, type: 'application/pdf' },
      ] as any;
      render(<AnalysisModal {...createProps({ peticaoFiles: files })} />);
      expect(screen.getByText(/2 documentos/)).toBeInTheDocument();
    });

    it('should count pasted texts in peticao total', () => {
      const texts = [{ id: '1', text: 'Texto 1', title: 'T1' }] as any;
      render(<AnalysisModal {...createProps({ pastedPeticaoTexts: texts })} />);
      expect(screen.getByText(/1 documento$/)).toBeInTheDocument();
    });

    it('should combine files and texts for peticao count', () => {
      const files = [{ name: 'pet1.pdf', size: 1000, type: 'application/pdf' }] as any;
      const texts = [{ id: '1', text: 'Texto 1', title: 'T1' }] as any;
      render(<AnalysisModal {...createProps({ peticaoFiles: files, pastedPeticaoTexts: texts })} />);
      expect(screen.getByText(/2 documentos/)).toBeInTheDocument();
    });

    it('should not show contestacao section when no files or texts', () => {
      render(<AnalysisModal {...createProps({ contestacaoFiles: [], pastedContestacaoTexts: [] })} />);
      expect(screen.queryByText(/Contestações/)).not.toBeInTheDocument();
    });

    it('should show contestacao section when files exist', () => {
      const files = [{ name: 'cont.pdf', size: 1000, type: 'application/pdf' }] as any;
      render(<AnalysisModal {...createProps({ contestacaoFiles: files })} />);
      expect(screen.getByText(/Contestações/)).toBeInTheDocument();
    });

    it('should show contestacao section when pasted texts exist', () => {
      const texts = [{ id: '1', text: 'Contestacao text', title: 'C1' }] as any;
      render(<AnalysisModal {...createProps({ pastedContestacaoTexts: texts })} />);
      expect(screen.getByText(/Contestações/)).toBeInTheDocument();
    });

    it('should show singular for 1 contestacao document', () => {
      const files = [{ name: 'cont.pdf', size: 1000, type: 'application/pdf' }] as any;
      render(<AnalysisModal {...createProps({ contestacaoFiles: files })} />);
      expect(screen.getByText(/1 documento(?!s)/)).toBeInTheDocument();
    });

    it('should show plural for multiple contestacao documents', () => {
      const files = [
        { name: 'c1.pdf', size: 1000, type: 'application/pdf' },
        { name: 'c2.pdf', size: 2000, type: 'application/pdf' },
      ] as any;
      render(<AnalysisModal {...createProps({ contestacaoFiles: files })} />);
      expect(screen.getByText(/2 documentos/)).toBeInTheDocument();
    });

    it('should show pasted texts info in contestacao when available', () => {
      const texts = [
        { id: '1', text: 'Text 1', title: 'T1' },
        { id: '2', text: 'Text 2', title: 'T2' },
      ] as any;
      render(<AnalysisModal {...createProps({ pastedContestacaoTexts: texts })} />);
      expect(screen.getByText(/2 textos/)).toBeInTheDocument();
    });

    it('should show singular "texto" for 1 pasted contestacao text', () => {
      const texts = [{ id: '1', text: 'Text 1', title: 'T1' }] as any;
      render(<AnalysisModal {...createProps({ pastedContestacaoTexts: texts })} />);
      expect(screen.getByText(/1 texto\b/)).toBeInTheDocument();
    });

    it('should not show complementary section when no files or texts', () => {
      render(<AnalysisModal {...createProps({ complementaryFiles: [], pastedComplementaryTexts: [] })} />);
      expect(screen.queryByText(/Complementares/)).not.toBeInTheDocument();
    });

    it('should show complementary section when files exist', () => {
      const files = [{ name: 'comp.pdf', size: 1000, type: 'application/pdf' }] as any;
      render(<AnalysisModal {...createProps({ complementaryFiles: files })} />);
      expect(screen.getByText(/Complementares/)).toBeInTheDocument();
    });

    it('should show complementary section when pasted texts exist', () => {
      const texts = [{ id: '1', text: 'Complementary text', title: 'Comp1' }] as any;
      render(<AnalysisModal {...createProps({ pastedComplementaryTexts: texts })} />);
      expect(screen.getByText(/Complementares/)).toBeInTheDocument();
    });

    it('should show combined count for complementary files and texts', () => {
      const files = [{ name: 'comp.pdf', size: 1000, type: 'application/pdf' }] as any;
      const texts = [{ id: '1', text: 'Text', title: 'T' }] as any;
      render(<AnalysisModal {...createProps({ complementaryFiles: files, pastedComplementaryTexts: texts })} />);
      expect(screen.getByText(/2 documentos/)).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EDGE CASES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Edge Cases', () => {
    it('should handle undefined peticaoFiles', () => {
      render(<AnalysisModal {...createProps({ peticaoFiles: undefined })} />);
      expect(screen.getByText(/Não anexados/)).toBeInTheDocument();
    });

    it('should handle undefined pastedPeticaoTexts', () => {
      render(<AnalysisModal {...createProps({ pastedPeticaoTexts: undefined })} />);
      expect(screen.getByText(/Não anexados/)).toBeInTheDocument();
    });

    it('should handle undefined contestacaoFiles gracefully', () => {
      render(<AnalysisModal {...createProps({ contestacaoFiles: undefined })} />);
      expect(screen.queryByText(/Contestações/)).not.toBeInTheDocument();
    });

    it('should handle undefined complementaryFiles gracefully', () => {
      render(<AnalysisModal {...createProps({ complementaryFiles: undefined })} />);
      expect(screen.queryByText(/Complementares/)).not.toBeInTheDocument();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TESTS: EXPORT MODAL
// ═══════════════════════════════════════════════════════════════════════════

describe('ExportModal', () => {
  const createProps = (overrides: Partial<ExportModalProps> = {}): ExportModalProps => ({
    isOpen: true,
    onClose: vi.fn(),
    exportedText: 'Texto exportado de exemplo',
    exportedHtml: '<p>Texto exportado</p>',
    copySuccess: false,
    setCopySuccess: vi.fn(),
    setError: vi.fn(),
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(<ExportModal {...createProps({ isOpen: false })} />);
      expect(screen.queryByText('Minuta Exportada')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(<ExportModal {...createProps()} />);
      expect(screen.getByText('Minuta Exportada')).toBeInTheDocument();
    });

    it('should display the exported text in textarea', () => {
      render(<ExportModal {...createProps({ exportedText: 'Conteudo da minuta' })} />);
      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
      expect(textarea.value).toBe('Conteudo da minuta');
    });

    it('should have a read-only textarea', () => {
      render(<ExportModal {...createProps()} />);
      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
      expect(textarea).toHaveAttribute('readonly');
    });

    it('should display copy button', () => {
      render(<ExportModal {...createProps()} />);
      expect(screen.getByText(/Copiar com Formatação/)).toBeInTheDocument();
    });

    it('should display close button', () => {
      render(<ExportModal {...createProps()} />);
      expect(screen.getByText('Fechar')).toBeInTheDocument();
    });

    it('should display formatting info box', () => {
      render(<ExportModal {...createProps()} />);
      expect(screen.getByText(/Formatação Preservada/)).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // COPY SUCCESS STATE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Copy Success', () => {
    it('should show success message when copySuccess is true', () => {
      render(<ExportModal {...createProps({ copySuccess: true })} />);
      expect(screen.getByText(/Copiado para área de transferência/)).toBeInTheDocument();
    });

    it('should not show success message when copySuccess is false', () => {
      render(<ExportModal {...createProps({ copySuccess: false })} />);
      expect(screen.queryByText(/Copiado para área de transferência/)).not.toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INTERACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Interactions', () => {
    it('should call onClose when close button is clicked', () => {
      const onClose = vi.fn();
      render(<ExportModal {...createProps({ onClose })} />);
      fireEvent.click(screen.getByText('Fechar'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call handleCopy when copy button is clicked (clipboard.write succeeds)', async () => {
      const setCopySuccess = vi.fn();
      const mockWrite = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, { clipboard: { write: mockWrite, writeText: vi.fn() } });

      render(<ExportModal {...createProps({ setCopySuccess })} />);
      fireEvent.click(screen.getByText(/Copiar com Formatação/));

      await waitFor(() => {
        expect(setCopySuccess).toHaveBeenCalledWith(true);
      });
    });

    it('should fallback to writeText when clipboard.write fails', async () => {
      const setCopySuccess = vi.fn();
      const mockWrite = vi.fn().mockRejectedValue(new Error('write failed'));
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, { clipboard: { write: mockWrite, writeText: mockWriteText } });

      render(<ExportModal {...createProps({ setCopySuccess })} />);
      fireEvent.click(screen.getByText(/Copiar com Formatação/));

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledWith('Texto exportado de exemplo');
        expect(setCopySuccess).toHaveBeenCalledWith(true);
      });
    });

    it('should call setError when both clipboard methods fail', async () => {
      const setError = vi.fn();
      const mockWrite = vi.fn().mockRejectedValue(new Error('write failed'));
      const mockWriteText = vi.fn().mockRejectedValue(new Error('writeText failed'));
      Object.assign(navigator, { clipboard: { write: mockWrite, writeText: mockWriteText } });

      render(<ExportModal {...createProps({ setError })} />);
      fireEvent.click(screen.getByText(/Copiar com Formatação/));

      await waitFor(() => {
        expect(setError).toHaveBeenCalledWith('Erro ao copiar texto');
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPONENT METADATA
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Component Metadata', () => {
    it('should have displayName set to ExportModal', () => {
      expect(ExportModal.displayName).toBe('ExportModal');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TESTS: ANONYMIZATION NAMES MODAL
// ═══════════════════════════════════════════════════════════════════════════

describe('AnonymizationNamesModal', () => {
  const createProps = (overrides: Partial<AnonymizationNamesModalProps> = {}): AnonymizationNamesModalProps => ({
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    nomesTexto: '',
    setNomesTexto: vi.fn(),
    nerEnabled: false,
    onDetectNames: vi.fn(),
    detectingNames: false,
    onOpenAiSettings: vi.fn(),
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(<AnonymizationNamesModal {...createProps({ isOpen: false })} />);
      expect(screen.queryByText('Anonimização de Documentos')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(<AnonymizationNamesModal {...createProps()} />);
      expect(screen.getByText('Anonimização de Documentos')).toBeInTheDocument();
    });

    it('should display info box about anonymization', () => {
      render(<AnonymizationNamesModal {...createProps()} />);
      expect(screen.getByText(/A anonimização está ativada/)).toBeInTheDocument();
    });

    it('should display label for names textarea', () => {
      render(<AnonymizationNamesModal {...createProps()} />);
      expect(screen.getByText('Nomes para anonimizar (um por linha)')).toBeInTheDocument();
    });

    it('should display the textarea with placeholder', () => {
      render(<AnonymizationNamesModal {...createProps()} />);
      const textarea = screen.getByPlaceholderText(/JOÃO DA SILVA/);
      expect(textarea).toBeInTheDocument();
    });

    it('should display auto-anonymization tip', () => {
      render(<AnonymizationNamesModal {...createProps()} />);
      expect(screen.getByText(/CPF, CNPJ, telefone, e-mail serão anonimizados automaticamente/)).toBeInTheDocument();
    });

    it('should display confirm button text', () => {
      render(<AnonymizationNamesModal {...createProps()} />);
      expect(screen.getByText('Continuar Análise')).toBeInTheDocument();
    });

    it('should display cancel button', () => {
      render(<AnonymizationNamesModal {...createProps()} />);
      expect(screen.getByText('Cancelar')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // NER BUTTON
  // ═══════════════════════════════════════════════════════════════════════════

  describe('NER Detect Names Button', () => {
    it('should show "Detectar Nomes" button when not detecting', () => {
      render(<AnonymizationNamesModal {...createProps({ nerEnabled: true, detectingNames: false })} />);
      expect(screen.getByText('Detectar Nomes')).toBeInTheDocument();
    });

    it('should show "Detectando..." when detectingNames is true', () => {
      render(<AnonymizationNamesModal {...createProps({ nerEnabled: true, detectingNames: true })} />);
      expect(screen.getByText('Detectando...')).toBeInTheDocument();
    });

    it('should disable button when NER is not enabled', () => {
      render(<AnonymizationNamesModal {...createProps({ nerEnabled: false })} />);
      const button = screen.getByText('Detectar Nomes').closest('button');
      expect(button).toBeDisabled();
    });

    it('should disable button when detecting names', () => {
      render(<AnonymizationNamesModal {...createProps({ nerEnabled: true, detectingNames: true })} />);
      const button = screen.getByText('Detectando...').closest('button');
      expect(button).toBeDisabled();
    });

    it('should enable button when NER is enabled and not detecting', () => {
      render(<AnonymizationNamesModal {...createProps({ nerEnabled: true, detectingNames: false })} />);
      const button = screen.getByText('Detectar Nomes').closest('button');
      expect(button).not.toBeDisabled();
    });

    it('should call onDetectNames when button is clicked', () => {
      const onDetectNames = vi.fn();
      render(<AnonymizationNamesModal {...createProps({ nerEnabled: true, onDetectNames })} />);
      fireEvent.click(screen.getByText('Detectar Nomes'));
      expect(onDetectNames).toHaveBeenCalledTimes(1);
    });

    it('should show "Configurar IA" link when NER is not enabled', () => {
      render(<AnonymizationNamesModal {...createProps({ nerEnabled: false })} />);
      expect(screen.getByText('Configurar IA')).toBeInTheDocument();
    });

    it('should not show "Configurar IA" link when NER is enabled', () => {
      render(<AnonymizationNamesModal {...createProps({ nerEnabled: true })} />);
      expect(screen.queryByText('Configurar IA')).not.toBeInTheDocument();
    });

    it('should call onOpenAiSettings when "Configurar IA" is clicked', () => {
      const onOpenAiSettings = vi.fn();
      render(<AnonymizationNamesModal {...createProps({ nerEnabled: false, onOpenAiSettings })} />);
      fireEvent.click(screen.getByText('Configurar IA'));
      expect(onOpenAiSettings).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INTERACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Interactions', () => {
    it('should call setNomesTexto when typing in textarea', () => {
      const setNomesTexto = vi.fn();
      render(<AnonymizationNamesModal {...createProps({ setNomesTexto })} />);
      const textarea = screen.getByPlaceholderText(/JOÃO DA SILVA/);
      fireEvent.change(textarea, { target: { value: 'NOME TESTE' } });
      expect(setNomesTexto).toHaveBeenCalledWith('NOME TESTE');
    });

    it('should display current nomesTexto value', () => {
      render(<AnonymizationNamesModal {...createProps({ nomesTexto: 'FULANO\nCICLANO' })} />);
      const textarea = screen.getByPlaceholderText(/JOÃO DA SILVA/) as HTMLTextAreaElement;
      expect(textarea.value).toBe('FULANO\nCICLANO');
    });

    it('should call onConfirm with parsed names when confirm is clicked (newline separated)', () => {
      const onConfirm = vi.fn();
      render(<AnonymizationNamesModal {...createProps({ onConfirm, nomesTexto: 'FULANO\nCICLANO\nBELTRANO' })} />);
      fireEvent.click(screen.getByText('Continuar Análise'));
      expect(onConfirm).toHaveBeenCalledWith(['FULANO', 'CICLANO', 'BELTRANO']);
    });

    it('should call onConfirm with parsed names when comma separated', () => {
      const onConfirm = vi.fn();
      render(<AnonymizationNamesModal {...createProps({ onConfirm, nomesTexto: 'FULANO,CICLANO,BELTRANO' })} />);
      fireEvent.click(screen.getByText('Continuar Análise'));
      expect(onConfirm).toHaveBeenCalledWith(['FULANO', 'CICLANO', 'BELTRANO']);
    });

    it('should filter out short names (less than 2 chars)', () => {
      const onConfirm = vi.fn();
      render(<AnonymizationNamesModal {...createProps({ onConfirm, nomesTexto: 'A\nFULANO\nB\nCICLANO' })} />);
      fireEvent.click(screen.getByText('Continuar Análise'));
      expect(onConfirm).toHaveBeenCalledWith(['FULANO', 'CICLANO']);
    });

    it('should trim whitespace from names', () => {
      const onConfirm = vi.fn();
      render(<AnonymizationNamesModal {...createProps({ onConfirm, nomesTexto: '  FULANO  \n  CICLANO  ' })} />);
      fireEvent.click(screen.getByText('Continuar Análise'));
      expect(onConfirm).toHaveBeenCalledWith(['FULANO', 'CICLANO']);
    });

    it('should filter empty lines', () => {
      const onConfirm = vi.fn();
      render(<AnonymizationNamesModal {...createProps({ onConfirm, nomesTexto: 'FULANO\n\n\nCICLANO' })} />);
      fireEvent.click(screen.getByText('Continuar Análise'));
      expect(onConfirm).toHaveBeenCalledWith(['FULANO', 'CICLANO']);
    });

    it('should call onClose when cancel button is clicked', () => {
      const onClose = vi.fn();
      render(<AnonymizationNamesModal {...createProps({ onClose })} />);
      fireEvent.click(screen.getByText('Cancelar'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPONENT METADATA
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Component Metadata', () => {
    it('should have displayName set to AnonymizationNamesModal', () => {
      expect(AnonymizationNamesModal.displayName).toBe('AnonymizationNamesModal');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TESTS: LINKED PROOFS MODAL
// ═══════════════════════════════════════════════════════════════════════════

describe('LinkedProofsModal', () => {
  const createMockProof = (overrides: Partial<Proof> = {}): Proof => ({
    id: 'proof-1',
    name: 'Documento de Prova 1',
    isPdf: false,
    text: 'Conteudo da prova',
    ...overrides,
  } as Proof);

  const createProofManager = (overrides: Partial<LinkedProofsModalProps['proofManager']> = {}) => ({
    proofTopicLinks: {},
    setProofTopicLinks: vi.fn(),
    proofAnalysisResults: {},
    proofConclusions: {},
    ...overrides,
  });

  const createProps = (overrides: Partial<LinkedProofsModalProps> = {}): LinkedProofsModalProps => ({
    isOpen: true,
    onClose: vi.fn(),
    topicTitle: 'Horas Extras',
    linkedProofs: [createMockProof()],
    proofManager: createProofManager(),
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Rendering', () => {
    it('should return null when isOpen is false', () => {
      const { container } = render(<LinkedProofsModal {...createProps({ isOpen: false })} />);
      expect(container.innerHTML).toBe('');
    });

    it('should return null when linkedProofs is null/undefined', () => {
      const { container } = render(<LinkedProofsModal {...createProps({ linkedProofs: null as any })} />);
      expect(container.innerHTML).toBe('');
    });

    it('should render when isOpen is true with proofs', () => {
      render(<LinkedProofsModal {...createProps()} />);
      expect(screen.getByText('Provas Vinculadas')).toBeInTheDocument();
    });

    it('should display topic title', () => {
      render(<LinkedProofsModal {...createProps({ topicTitle: 'Dano Moral' })} />);
      expect(screen.getByText('Dano Moral')).toBeInTheDocument();
    });

    it('should display close button in footer', () => {
      render(<LinkedProofsModal {...createProps()} />);
      const buttons = screen.getAllByText('Fechar');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EMPTY STATE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Empty State', () => {
    it('should show empty message when linkedProofs is empty array', () => {
      render(<LinkedProofsModal {...createProps({ linkedProofs: [] })} />);
      expect(screen.getByText('Nenhuma prova vinculada a este tópico')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PROOF LIST
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Proof List', () => {
    it('should display proof name', () => {
      render(<LinkedProofsModal {...createProps({
        linkedProofs: [createMockProof({ name: 'Comprovante de Pagamento' })],
      })} />);
      expect(screen.getByText('Comprovante de Pagamento')).toBeInTheDocument();
    });

    it('should display TEXTO badge for non-PDF proof', () => {
      render(<LinkedProofsModal {...createProps({
        linkedProofs: [createMockProof({ isPdf: false })],
      })} />);
      expect(screen.getByText('TEXTO')).toBeInTheDocument();
    });

    it('should display PDF badge for PDF proof', () => {
      render(<LinkedProofsModal {...createProps({
        linkedProofs: [createMockProof({ isPdf: true })],
      })} />);
      expect(screen.getByText('PDF')).toBeInTheDocument();
    });

    it('should render multiple proofs', () => {
      render(<LinkedProofsModal {...createProps({
        linkedProofs: [
          createMockProof({ id: '1', name: 'Prova 1' }),
          createMockProof({ id: '2', name: 'Prova 2' }),
          createMockProof({ id: '3', name: 'Prova 3' }),
        ],
      })} />);
      expect(screen.getByText('Prova 1')).toBeInTheDocument();
      expect(screen.getByText('Prova 2')).toBeInTheDocument();
      expect(screen.getByText('Prova 3')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PROOF ANALYSIS RESULTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Proof Analysis Results', () => {
    it('should not show analysis section when no results', () => {
      render(<LinkedProofsModal {...createProps({
        linkedProofs: [createMockProof({ id: 'p1' })],
        proofManager: createProofManager({ proofAnalysisResults: {} }),
      })} />);
      expect(screen.queryByText(/Análise Livre/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Análise Contextual/)).not.toBeInTheDocument();
    });

    it('should show analysis results when available', () => {
      render(<LinkedProofsModal {...createProps({
        linkedProofs: [createMockProof({ id: 'p1' })],
        proofManager: createProofManager({
          proofAnalysisResults: {
            'p1': [
              { id: 'a1', type: 'livre', result: 'Resultado da análise livre' },
            ] as any,
          },
        }),
      })} />);
      expect(screen.getByText(/Análise Livre/)).toBeInTheDocument();
      expect(screen.getByText('Resultado da análise livre')).toBeInTheDocument();
    });

    it('should show contextual analysis type', () => {
      render(<LinkedProofsModal {...createProps({
        linkedProofs: [createMockProof({ id: 'p1' })],
        proofManager: createProofManager({
          proofAnalysisResults: {
            'p1': [
              { id: 'a1', type: 'contextual', result: 'Resultado contextual' },
            ] as any,
          },
        }),
      })} />);
      expect(screen.getByText(/Análise Contextual/)).toBeInTheDocument();
    });

    it('should show multiple analyses numbered', () => {
      render(<LinkedProofsModal {...createProps({
        linkedProofs: [createMockProof({ id: 'p1' })],
        proofManager: createProofManager({
          proofAnalysisResults: {
            'p1': [
              { id: 'a1', type: 'livre', result: 'Primeira análise' },
              { id: 'a2', type: 'contextual', result: 'Segunda análise' },
            ] as any,
          },
        }),
      })} />);
      expect(screen.getByText(/^#1/)).toBeInTheDocument();
      expect(screen.getByText(/^#2/)).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PROOF CONCLUSIONS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Proof Conclusions', () => {
    it('should not show conclusions when none exist', () => {
      render(<LinkedProofsModal {...createProps({
        linkedProofs: [createMockProof({ id: 'p1' })],
        proofManager: createProofManager({ proofConclusions: {} }),
      })} />);
      expect(screen.queryByText('Minhas Conclusões')).not.toBeInTheDocument();
    });

    it('should show conclusions when they exist for a proof', () => {
      render(<LinkedProofsModal {...createProps({
        linkedProofs: [createMockProof({ id: 'p1' })],
        proofManager: createProofManager({
          proofConclusions: { 'p1': 'Conclusao do juiz sobre a prova' },
        }),
      })} />);
      expect(screen.getByText('Minhas Conclusões')).toBeInTheDocument();
      expect(screen.getByText('Conclusao do juiz sobre a prova')).toBeInTheDocument();
    });

    it('should not show conclusions for other proofs', () => {
      render(<LinkedProofsModal {...createProps({
        linkedProofs: [createMockProof({ id: 'p1' })],
        proofManager: createProofManager({
          proofConclusions: { 'p2': 'Outra conclusao' },
        }),
      })} />);
      expect(screen.queryByText('Minhas Conclusões')).not.toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INTERACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Interactions', () => {
    it('should call onClose when header close button (X) is clicked', () => {
      const onClose = vi.fn();
      render(<LinkedProofsModal {...createProps({ onClose })} />);
      // The X button is the first button in the header
      const xButton = screen.getAllByRole('button')[0];
      fireEvent.click(xButton);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when footer close button is clicked', () => {
      const onClose = vi.fn();
      render(<LinkedProofsModal {...createProps({ onClose })} />);
      const closeButtons = screen.getAllByText('Fechar');
      fireEvent.click(closeButtons[closeButtons.length - 1]);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
