/**
 * @file MiscModals.tsx
 * @description Modais diversos (TIER 1 - menores)
 * @version 1.36.91
 *
 * Extraído do App.tsx como parte da FASE 3 de refatoração.
 * Inclui: AnalysisModal, ExportModal, AnonymizationNamesModal, LinkedProofsModal
 */

import React from 'react';
import { Loader2, Download, AlertCircle, RefreshCw, Wand2, Scale, FileText, X, Sparkles, Edit } from 'lucide-react';
import { BaseModal, ModalFooter, ModalInfoBox, CSS } from './BaseModal';
import type {
  AnalysisModalProps,
  ExportModalProps,
  AnonymizationNamesModalProps,
  LinkedProofsModalProps,
  Proof
} from '../../types';

// ═══════════════════════════════════════════════════════════════════════════════
// ANALYSIS MODAL
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Modal de progresso durante análise de documentos
 */
export const AnalysisModal: React.FC<AnalysisModalProps> = ({
  isOpen,
  analysisProgress,
  peticaoFiles,
  pastedPeticaoTexts,
  contestacaoFiles,
  pastedContestacaoTexts,
  complementaryFiles,
  pastedComplementaryTexts
}) => {
  if (!isOpen) return null;

  const totalPeticoes = (peticaoFiles?.length || 0) + (pastedPeticaoTexts?.length || 0);

  return (
    <div className={CSS.modalOverlay}>
      <div className={`${CSS.modalContainer} theme-border-modal theme-modal-glow animate-modal max-w-lg w-full`}>
        <div className={CSS.modalHeader}>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-blue-500/20">
              <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
            </div>
            <div>
              <h3 className="text-lg font-semibold theme-text-primary">Análise em Andamento</h3>
              <p className="text-sm theme-text-muted">Por favor, aguarde enquanto processamos os documentos</p>
            </div>
          </div>
        </div>

        <div className="p-8">
          <div className="flex flex-col items-center gap-6">
            {/* Spinner Neon + Ripple - v1.33.49 */}
            <div className="spinner-neon-ripple">
              <div className="ripple"></div>
              <div className="ripple"></div>
              <div className="ripple"></div>
              <div className="core">
                <div className="outer"></div>
                <div className="inner"></div>
              </div>
            </div>

            {/* Mensagem de progresso */}
            <div className="text-center space-y-2 w-full">
              <p className="text-lg font-medium theme-text-secondary">{analysisProgress}</p>

              {/* Barra de progresso animada */}
              <div className="w-full theme-bg-secondary rounded-full h-2 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 animate-pulse"
                     style={{
                       width: '100%',
                       animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                     }}>
                </div>
              </div>
            </div>

            {/* Informações adicionais */}
            <div className="theme-bg-app-50 rounded-lg p-4 w-full border theme-border-input">
              <div className="space-y-2 text-sm theme-text-muted">
                <div className={CSS.flexGap2}>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>
                    Docs do Autor: {totalPeticoes > 0 ? `${totalPeticoes} documento${totalPeticoes !== 1 ? 's' : ''}` : 'Não anexados'}
                  </span>
                </div>
                {((contestacaoFiles?.length ?? 0) > 0 || (pastedContestacaoTexts?.length ?? 0) > 0) && (
                  <div className={CSS.flexGap2}>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>
                      Contestações: {(contestacaoFiles?.length ?? 0) + (pastedContestacaoTexts?.length ?? 0)} documento{((contestacaoFiles?.length ?? 0) + (pastedContestacaoTexts?.length ?? 0)) !== 1 ? 's' : ''}
                      {(pastedContestacaoTexts?.length ?? 0) > 0 && ` (${pastedContestacaoTexts?.length ?? 0} texto${(pastedContestacaoTexts?.length ?? 0) !== 1 ? 's' : ''})`}
                    </span>
                  </div>
                )}
                {((complementaryFiles?.length ?? 0) > 0 || (pastedComplementaryTexts?.length ?? 0) > 0) && (
                  <div className={CSS.flexGap2}>
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                    <span>
                      Complementares: {(complementaryFiles?.length ?? 0) + (pastedComplementaryTexts?.length ?? 0)} documento{((complementaryFiles?.length ?? 0) + (pastedComplementaryTexts?.length ?? 0)) !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Dica */}
            <div className="text-xs text-center theme-text-disabled max-w-sm">
              💡 A análise pode levar de 30 segundos a 2 minutos dependendo do tamanho dos documentos e da complexidade do processo.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT MODAL
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Modal para exportar minuta (migrado para BaseModal v1.18.3)
 */
export const ExportModal = React.memo(({ isOpen, onClose, exportedText, exportedHtml, copySuccess, setCopySuccess, setError }: ExportModalProps) => {
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  const handleCopy = async () => {
    try {
      const htmlBlob = new Blob([exportedHtml], { type: 'text/html' });
      const textBlob = new Blob([exportedText], { type: 'text/plain' });
      await navigator.clipboard.write([new ClipboardItem({ 'text/html': htmlBlob, 'text/plain': textBlob })]);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setCopySuccess(true);
      timeoutRef.current = setTimeout(() => setCopySuccess(false), 3000);
    } catch (clipErr) {
      try {
        await navigator.clipboard.writeText(exportedText);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setCopySuccess(true);
        timeoutRef.current = setTimeout(() => setCopySuccess(false), 3000);
      } catch (err) {
        setError('Erro ao copiar texto');
      }
    }
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="Minuta Exportada" icon={<Download />} iconColor="blue" size="xl"
      footer={<>
        <button onClick={handleCopy} className="flex-1 py-3 rounded-lg font-medium bg-blue-600 text-white hover-blue-700-from-600">📋 Copiar com Formatação</button>
        <button onClick={onClose} className="px-6 py-3 rounded-lg theme-bg-tertiary hover-slate-500">Fechar</button>
      </>}>
      <div className="space-y-4">
        {copySuccess && <p className="text-green-400 text-sm">✓ Copiado para área de transferência!</p>}
        <ModalInfoBox>
          <strong>Formatação Preservada</strong> - O conteúdo foi copiado com toda a formatação. Cole diretamente no Google Docs ou Word usando Ctrl+V.
        </ModalInfoBox>
        <textarea value={exportedText} readOnly className="w-full min-h-[400px] theme-bg-app border theme-border-input rounded-lg p-4 theme-text-primary font-mono text-sm resize-none" />
      </div>
    </BaseModal>
  );
});
ExportModal.displayName = 'ExportModal';

// ═══════════════════════════════════════════════════════════════════════════════
// ANONYMIZATION NAMES MODAL
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Modal para configurar nomes a serem anonimizados
 */
export const AnonymizationNamesModal = React.memo(({ isOpen, onClose, onConfirm, nomesTexto, setNomesTexto, nerEnabled, onDetectNames, detectingNames, onOpenAiSettings }: AnonymizationNamesModalProps) => {
  const handleConfirm = () => {
    onConfirm(nomesTexto.split(/[\n,]/).map((n: string) => n.trim()).filter((n: string) => n.length >= 2));
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="Anonimização de Documentos" icon={<AlertCircle />} iconColor="purple" size="lg"
      footer={<ModalFooter.Standard onClose={onClose} onConfirm={handleConfirm} confirmText="Continuar Análise" />}>
      {/* v1.32.00: Overlay removido - NER roda em worker */}
      <div className="space-y-4">
        <ModalInfoBox>🔒 A anonimização está ativada. Insira os nomes para anonimizar.</ModalInfoBox>
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className={CSS.label}>Nomes para anonimizar (um por linha)</label>
            {/* v1.25: Botão Detectar Nomes com IA */}
            <div className="flex items-center gap-2">
              <button
                onClick={onDetectNames}
                disabled={!nerEnabled || detectingNames}
                title={!nerEnabled ? 'Ative o NER em Configurações IA' : 'Detectar nomes automaticamente'}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  nerEnabled && !detectingNames
                    ? 'bg-purple-600 text-white hover-purple-700'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
              >
                {detectingNames ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Detectando...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-3.5 h-3.5" />
                    Detectar Nomes
                  </>
                )}
              </button>
              {!nerEnabled && (
                <button
                  onClick={onOpenAiSettings}
                  className="text-xs text-amber-400 underline"
                  title="Abrir configurações de IA"
                >
                  Configurar IA
                </button>
              )}
            </div>
          </div>
          <textarea value={nomesTexto} onChange={(e) => setNomesTexto(e.target.value)}
            className="w-full h-48 theme-bg-app border theme-border-primary rounded-lg p-3 theme-text-secondary font-mono text-sm"
            placeholder="JOÃO DA SILVA&#10;MARIA SANTOS&#10;EMPRESA XYZ LTDA&#10;..." />
          <p className="text-xs theme-text-tertiary mt-2">💡 CPF, CNPJ, telefone, e-mail serão anonimizados automaticamente.</p>
        </div>
      </div>
    </BaseModal>
  );
});
AnonymizationNamesModal.displayName = 'AnonymizationNamesModal';

// ═══════════════════════════════════════════════════════════════════════════════
// LINKED PROOFS MODAL
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Modal para visualizar provas vinculadas a um tópico
 */
export const LinkedProofsModal: React.FC<LinkedProofsModalProps> = ({
  isOpen,
  onClose,
  topicTitle,
  linkedProofs,
  proofManager
}) => {
  if (!isOpen || !linkedProofs) return null;

  return (
    <div className="absolute inset-0 bg-black/80 flex items-start justify-center z-[80] py-8 px-4 overflow-y-auto">
      <div className="theme-bg-primary rounded-lg shadow-2xl border border-green-700 max-w-4xl w-full">
        {/* Header */}
        <div className="p-4 border-b border-green-500/30 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <Scale className="w-6 h-6 text-green-400" />
            <div>
              <h3 className="text-lg font-bold text-green-400">Provas Vinculadas</h3>
              <p className="text-sm theme-text-muted">{topicTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 theme-text-secondary" />
          </button>
        </div>

        {/* Lista de Provas */}
        <div className="p-4 space-y-3 max-h-[75vh] overflow-y-auto">
          {linkedProofs.length === 0 ? (
            <div className="text-center py-8 theme-text-muted">
              <Scale className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma prova vinculada a este tópico</p>
            </div>
          ) : (
            linkedProofs.map((proof: Proof) => (
              <div
                key={proof.id}
                className="theme-bg-secondary-50 rounded-lg p-3 border theme-border-input"
              >
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <h5 className="font-medium theme-text-secondary text-sm flex-1 truncate">{proof.name}</h5>
                  <span className={`px-2 py-0.5 text-xs rounded ${
                    proof.isPdf
                      ? 'theme-bg-red-accent theme-text-red'
                      : 'theme-bg-blue-accent theme-text-blue'
                  }`}>
                    {proof.isPdf ? 'PDF' : 'TEXTO'}
                  </span>
                </div>

                {/* Análises IA (v1.38.27: múltiplas análises) */}
                {proofManager?.proofAnalysisResults?.[proof.id]?.length > 0 && (
                  <div className="mb-2 space-y-1">
                    {proofManager?.proofAnalysisResults?.[proof.id]?.map((analysis, idx) => (
                      <div key={analysis.id} className="p-2 theme-bg-blue-accent border border-blue-500/30 rounded text-xs">
                        <div className="flex items-center gap-1 mb-1">
                          <Sparkles className="w-3 h-3 theme-text-blue" />
                          <span className="font-medium theme-text-blue">
                            #{idx + 1} {analysis.type === 'livre' ? 'Análise Livre' : 'Análise Contextual'}
                          </span>
                        </div>
                        <div className="overflow-y-auto" style={{ resize: 'vertical', height: '8rem', minHeight: '8rem' }}>
                          <p className="theme-text-tertiary whitespace-pre-wrap">
                            {analysis.result}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Conclusões Manuais */}
                {proofManager?.proofConclusions?.[proof.id] && (
                  <div className="p-2 theme-bg-green-accent border border-green-500/30 rounded text-xs">
                    <div className="flex items-center gap-1 mb-1">
                      <Edit className="w-3 h-3 theme-text-green" />
                      <span className="font-medium theme-text-green">Minhas Conclusões</span>
                    </div>
                    <div className="overflow-y-auto" style={{ resize: 'vertical', height: '6rem', minHeight: '6rem' }}>
                      <p className="theme-text-tertiary whitespace-pre-wrap">
                        {proofManager.proofConclusions[proof.id]}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t theme-border-secondary flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2 theme-bg-tertiary hover-slate-600 rounded-lg text-sm font-medium theme-text-secondary"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
