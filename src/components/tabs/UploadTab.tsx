/**
 * @file UploadTab.tsx
 * @description Aba de Upload de documentos
 * @version 1.38.40
 *
 * FASE 3 Etapa 3.3: Acessa useDocumentsStore e useUIStore diretamente,
 * eliminando ~20 props de prop drilling.
 *
 * Seções:
 * 1. Petição Inicial (upload múltiplo + paste + lista)
 * 2. Contestação (upload múltiplo + paste + lista)
 * 3. Documentos Complementares (upload + paste + lista)
 * 4. Botão Analisar Documentos
 */

import React from 'react';
import { Upload, FileText, Trash2 } from 'lucide-react';
import { CSS } from '../../constants/styles';
import { ProcessingModeSelector } from '../ui';
import { useDocumentsStore } from '../../stores/useDocumentsStore';
import { useUIStore } from '../../stores/useUIStore';
import { removePdfFromIndexedDB } from '../../hooks/useLocalStorage';
import type { UploadTabProps, ProcessingMode } from '../../types';

export const UploadTab: React.FC<UploadTabProps> = ({
  getDefaultProcessingMode,
  processoNumero,
  setProcessoNumero,
  handleUploadPeticao,
  handleUploadContestacao,
  handleUploadComplementary,
  removePeticaoFile,
  handleAnalyzeDocuments,
  aiIntegration,
  documentServices
}) => {
  // ═══════════════════════════════════════════════════════════════════════════
  // STORE ACCESS (substituindo props)
  // ═══════════════════════════════════════════════════════════════════════════

  const peticaoFiles = useDocumentsStore((s) => s.peticaoFiles);
  const contestacaoFiles = useDocumentsStore((s) => s.contestacaoFiles);
  const complementaryFiles = useDocumentsStore((s) => s.complementaryFiles);
  const pastedPeticaoTexts = useDocumentsStore((s) => s.pastedPeticaoTexts);
  const pastedContestacaoTexts = useDocumentsStore((s) => s.pastedContestacaoTexts);
  const pastedComplementaryTexts = useDocumentsStore((s) => s.pastedComplementaryTexts);
  const analyzedDocuments = useDocumentsStore((s) => s.analyzedDocuments);
  const setAnalyzedDocuments = useDocumentsStore((s) => s.setAnalyzedDocuments);
  const documentProcessingModes = useDocumentsStore((s) => s.documentProcessingModes);
  const setDocumentProcessingModes = useDocumentsStore((s) => s.setDocumentProcessingModes);
  const setPeticaoMode = useDocumentsStore((s) => s.setPeticaoMode);
  const setContestacaoMode = useDocumentsStore((s) => s.setContestacaoMode);
  const setComplementarMode = useDocumentsStore((s) => s.setComplementarMode);
  const showPasteArea = useDocumentsStore((s) => s.showPasteArea);
  const setShowPasteArea = useDocumentsStore((s) => s.setShowPasteArea);
  const handlePastedText = useDocumentsStore((s) => s.handlePastedText);
  const removePastedText = useDocumentsStore((s) => s.removePastedText);
  const analyzing = useDocumentsStore((s) => s.analyzing);
  const setContestacaoFiles = useDocumentsStore((s) => s.setContestacaoFiles);
  const setComplementaryFiles = useDocumentsStore((s) => s.setComplementaryFiles);

  const setTextPreview = useUIStore((s) => s.setTextPreview);

  return (
    <div className="space-y-6">
      {/* v1.36.36: Aviso removido - bloqueio visual no seletor é suficiente */}

      <div className="space-y-6">
        {/* ═══════════════════════════════════════════════════════════════════════════════
            SEÇÃO 1: Petição Inicial / Emendas
            ═══════════════════════════════════════════════════════════════════════════════ */}
        <div className="space-y-3">
          <label className="block text-sm font-medium theme-text-tertiary">
            Petição Inicial / Emendas à Petição * (múltiplos)
          </label>
          <div
            style={{ borderColor: '#475569', transition: 'border-color 0.3s ease' }}
            className="border-2 border-dashed rounded-lg p-8 text-center hover-border-blue-500"
          >
            <input
              type="file"
              accept=".pdf"
              multiple
              onChange={async (e) => {
                const files = Array.from(e.target.files || []);
                if (files.length === 0) return;

                handleUploadPeticao(files);

                const defaultMode = getDefaultProcessingMode();
                setDocumentProcessingModes(prev => ({
                  ...prev,
                  peticoes: [...(prev.peticoes || []), ...files.map(() => defaultMode)]
                }));

                if (!processoNumero) {
                  try {
                    const numeroDetectado = await documentServices.autoDetectProcessoNumero({
                      peticao: files[0],
                      contestacoes: contestacaoFiles.map(f => f.file),
                      complementares: complementaryFiles.map(f => f.file)
                    });
                    if (numeroDetectado) {
                      setProcessoNumero(numeroDetectado);
                    }
                  } catch { }
                }
              }}
              className="hidden"
              id="peticao"
            />
            <label htmlFor="peticao" className="cursor-pointer">
              <Upload className="w-12 h-12 mx-auto mb-3 theme-text-muted" />
              <p className="theme-text-tertiary font-medium">
                {peticaoFiles.length > 0 || pastedPeticaoTexts.length > 0 ||
                 analyzedDocuments.peticoes?.length > 0 || analyzedDocuments.peticoesText?.length > 0
                  ? `${peticaoFiles.length + (pastedPeticaoTexts?.length || 0) + (analyzedDocuments.peticoes?.length || 0) + (analyzedDocuments.peticoesText?.length || 0)} documento(s) carregado(s)`
                  : 'Clique para fazer upload (múltiplos)'}
              </p>
              <p className="theme-text-disabled text-sm mt-1">
                PDFs até 10MB cada | Petição Inicial + Emendas
              </p>
            </label>
          </div>

          {/* Lista de arquivos de petição */}
          {(peticaoFiles.length > 0 || pastedPeticaoTexts.length > 0 ||
            analyzedDocuments.peticoes?.length > 0 || analyzedDocuments.peticoesText?.length > 0) && (
            <div className="theme-bg-secondary-30 rounded-lg p-3 space-y-2">
              <p className="text-xs theme-text-muted font-medium mb-2">Documentos do Autor:</p>

              {/* Arquivos PDF novos */}
              {peticaoFiles.map((fileObj, idx) => (
                <div key={`peticao-file-${fileObj.id || idx}`} className="flex items-center justify-between text-sm bg-blue-900/20 p-2 rounded">
                  <span className="theme-text-tertiary truncate flex-1 flex items-center gap-2">
                    <FileText className="w-3 h-3 text-blue-400 flex-shrink-0" />
                    {idx + 1}. {idx === 0 ? 'Petição Inicial' : (fileObj.file?.name || fileObj.name)}
                  </span>
                  <ProcessingModeSelector
                    value={documentProcessingModes.peticoes?.[idx] || 'pdfjs'}
                    onChange={(mode: ProcessingMode) => setPeticaoMode(idx, mode)}
                    anonymizationEnabled={aiIntegration.aiSettings?.anonymization?.enabled}
                    grokEnabled={aiIntegration.aiSettings?.provider === 'grok'}
                  />
                  <button
                    onClick={() => removePeticaoFile(idx)}
                    className="ml-2 hover-text-red-400-from-300"
                    title="Remover"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {/* PDFs importados (já processados) */}
              {peticaoFiles.length === 0 && analyzedDocuments.peticoes?.map((_, idx) => (
                <div key={`peticao-imported-${idx}`} className="flex items-center justify-between text-sm bg-blue-900/20 p-2 rounded">
                  <span className="theme-text-blue truncate flex-1 flex items-center gap-2">
                    <FileText className="w-3 h-3 text-blue-400 flex-shrink-0" />
                    {idx + 1}. {idx === 0 ? 'Petição Inicial' : `Documento ${idx + 1}`} (PDF importado)
                  </span>
                  <button
                    onClick={() => setAnalyzedDocuments(prev => ({
                      ...prev,
                      peticoes: prev.peticoes.filter((_, i: number) => i !== idx)
                    }))}
                    className="ml-2 hover-text-red-400-from-300"
                    title="Remover"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {/* Textos colados */}
              {pastedPeticaoTexts.map((doc, idx) => (
                <div key={`peticao-pasted-${idx}`} className="flex items-center justify-between text-sm bg-green-900/20 p-2 rounded">
                  <span
                    className="theme-text-green truncate flex-1 flex items-center gap-2 cursor-pointer hover:underline"
                    onClick={() => setTextPreview({ isOpen: true, title: doc.name, text: doc.text })}
                  >
                    <FileText className="w-3 h-3 text-green-400 flex-shrink-0" />
                    {doc.name} ({doc.text.length.toLocaleString()} caracteres)
                  </span>
                  <button
                    onClick={() => removePastedText('peticao', idx)}
                    className="ml-2 hover-text-red-400-from-300"
                    title="Remover"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {/* Textos extraídos/importados */}
              {analyzedDocuments.peticoesText?.map((doc, idx) => (
                <div key={`peticao-text-${idx}`} className="flex items-center justify-between text-sm bg-green-900/20 p-2 rounded">
                  <span
                    className="theme-text-green truncate flex-1 flex items-center gap-2 cursor-pointer hover:underline"
                    onClick={() => setTextPreview({ isOpen: true, title: doc.name, text: doc.text })}
                  >
                    <FileText className="w-3 h-3 text-green-400 flex-shrink-0" />
                    {doc.name} (Texto - {doc.text.length.toLocaleString()} caracteres)
                  </span>
                  <button
                    onClick={() => setAnalyzedDocuments(prev => ({
                      ...prev,
                      peticoesText: prev.peticoesText.filter((_, i: number) => i !== idx)
                    }))}
                    className="ml-2 hover-text-red-400-from-300"
                    title="Remover"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Opção de colar texto */}
          <div className="text-center">
            <p className="theme-text-disabled text-xs mb-2">— OU —</p>
            {!showPasteArea.peticao ? (
              <button
                onClick={() => setShowPasteArea({ ...showPasteArea, peticao: true })}
                className="text-sm flex items-center gap-2 mx-auto hover-text-blue-400-from-300"
              >
                <FileText className="w-4 h-4" />
                Colar texto (Ctrl+V)
              </button>
            ) : (
              <div className="theme-bg-secondary-30 rounded-lg p-4">
                <p className="text-xs theme-text-muted mb-2">Cole o texto da petição/emenda abaixo:</p>
                <textarea
                  className="w-full h-32 theme-bg-primary border theme-border-input rounded p-2 text-sm theme-text-secondary resize-none focus:border-blue-500 focus:outline-none"
                  placeholder="Cole o texto aqui (Ctrl+V)..."
                  onPaste={(e) => {
                    const text = e.clipboardData.getData('text');
                    handlePastedText(text, 'peticao');
                  }}
                  onKeyDown={(e) => {
                    if (e.ctrlKey && e.key === 'Enter') {
                      const text = (e.target as HTMLTextAreaElement).value;
                      handlePastedText(text, 'peticao');
                    }
                  }}
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={(e) => {
                      const textarea = (e.target as Element).closest('.theme-bg-secondary-30')?.querySelector('textarea');
                      if (textarea) handlePastedText(textarea.value, 'peticao');
                    }}
                    className="hover-blue-700 flex-1 py-2 rounded text-sm bg-blue-600 text-white"
                  >
                    Confirmar
                  </button>
                  <button
                    onClick={() => setShowPasteArea({ ...showPasteArea, peticao: false })}
                    className="px-4 py-2 rounded text-sm theme-bg-tertiary hover-slate-700-from-600"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════════════
            SEÇÃO 2: Contestações
            ═══════════════════════════════════════════════════════════════════════════════ */}
        <div className="space-y-3">
          <label className="block text-sm font-medium theme-text-tertiary">
            Contestações (Opcional - múltiplas)
          </label>
          <div
            style={{ borderColor: '#475569', transition: 'border-color 0.3s ease' }}
            className="border-2 border-dashed rounded-lg p-8 text-center hover-border-blue-500"
          >
            <input
              type="file"
              accept=".pdf"
              multiple
              onChange={async (e) => {
                const files = Array.from(e.target.files || []);
                if (files.length === 0) return;

                handleUploadContestacao(files);

                const defaultMode = getDefaultProcessingMode();
                setDocumentProcessingModes(prev => ({
                  ...prev,
                  contestacoes: files.map(() => defaultMode)
                }));

                if (!processoNumero) {
                  try {
                    const numeroDetectado = await documentServices.autoDetectProcessoNumero({
                      peticao: peticaoFiles[0]?.file || peticaoFiles[0] as unknown as File,
                      contestacoes: files,
                      complementares: complementaryFiles.map(f => f.file || f as unknown as File)
                    });

                    if (numeroDetectado) {
                      setProcessoNumero(numeroDetectado);
                    }
                  } catch {
                    // Silencioso - não bloqueia upload se falhar
                  }
                }
              }}
              className="hidden"
              id="contestacao"
            />
            <label htmlFor="contestacao" className="cursor-pointer">
              <Upload className="w-12 h-12 mx-auto mb-3 theme-text-muted" />
              <p className="theme-text-tertiary font-medium">
                {contestacaoFiles.length > 0
                  ? `${contestacaoFiles.length} arquivo${contestacaoFiles.length > 1 ? 's' : ''} selecionado${contestacaoFiles.length > 1 ? 's' : ''}`
                  : (analyzedDocuments.contestacoes?.length > 0 || pastedContestacaoTexts.length > 0)
                  ? `✓ ${(analyzedDocuments.contestacoes?.length || 0) + pastedContestacaoTexts.length} importado${((analyzedDocuments.contestacoes?.length || 0) + pastedContestacaoTexts.length) > 1 ? 's' : ''}`
                  : 'Clique para fazer upload'}
              </p>
              <p className="theme-text-disabled text-sm mt-1">Múltiplos PDFs até 10MB cada</p>
            </label>
          </div>

          {/* Opção de colar texto */}
          <div className="text-center mt-3">
            <p className="theme-text-disabled text-xs mb-2">— OU —</p>
            {!showPasteArea.contestacao ? (
              <button
                onClick={() => setShowPasteArea({ ...showPasteArea, contestacao: true })}
                className="text-sm flex items-center gap-2 mx-auto hover-text-blue-400-from-300"
              >
                <FileText className="w-4 h-4" />
                Colar texto de contestação (Ctrl+V)
              </button>
            ) : (
              <div className="theme-bg-secondary-30 rounded-lg p-4">
                <p className="text-xs theme-text-muted mb-2">Cole o texto da contestação abaixo:</p>
                <textarea
                  className="w-full h-32 theme-bg-primary border theme-border-input rounded p-2 text-sm theme-text-secondary resize-none focus:border-blue-500 focus:outline-none"
                  placeholder="Cole o texto aqui (Ctrl+V)..."
                  onPaste={(e) => {
                    const text = e.clipboardData.getData('text');
                    handlePastedText(text, 'contestacao');
                  }}
                  onKeyDown={(e) => {
                    if (e.ctrlKey && e.key === 'Enter') {
                      const text = (e.target as HTMLTextAreaElement).value;
                      handlePastedText(text, 'contestacao');
                    }
                  }}
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={(e) => {
                      const textarea = (e.target as Element).closest('.theme-bg-secondary\\/30')?.querySelector('textarea');
                      if (textarea) handlePastedText(textarea.value, 'contestacao');
                    }}
                    className="hover-blue-700 flex-1 py-2 rounded text-sm bg-blue-600 text-white"
                  >
                    Confirmar
                  </button>
                  <button
                    onClick={() => setShowPasteArea({ ...showPasteArea, contestacao: false })}
                    className="px-4 py-2 rounded text-sm theme-bg-tertiary hover-slate-700-from-600"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>

          {(contestacaoFiles.length > 0 || pastedContestacaoTexts.length > 0 || analyzedDocuments.contestacoes?.length > 0 || analyzedDocuments.contestacoesText?.length > 0) && (
            <div className="theme-bg-secondary-30 rounded-lg p-3 space-y-2 mt-3">
              <p className="text-xs theme-text-muted font-medium">Contestações:</p>
              {/* Contestações com indicador de status */}
              {contestacaoFiles.map((fileObj, idx) => (
                <div key={`file-${fileObj.id || idx}`} className="flex items-center justify-between text-sm theme-bg-primary-50 p-2 rounded">
                  <span className="theme-text-tertiary truncate flex-1 flex items-center gap-2">
                    <FileText className="w-3 h-3 text-blue-400" />
                    {idx + 1}. {fileObj.file?.name || fileObj.name}
                  </span>
                  <ProcessingModeSelector
                    value={documentProcessingModes.contestacoes?.[idx] || 'pdfjs'}
                    onChange={(mode: ProcessingMode) => setContestacaoMode(idx, mode)}
                    className="mx-2"
                    anonymizationEnabled={aiIntegration.aiSettings?.anonymization?.enabled}
                    grokEnabled={aiIntegration.aiSettings?.provider === 'grok'}
                  />
                  <button
                    onClick={async () => {
                      const fileToRemove = contestacaoFiles[idx];
                      if (fileToRemove?.id) {
                        try { await removePdfFromIndexedDB(`upload-contestacao-${fileToRemove.id}`); } catch {}
                      }
                      setContestacaoFiles(prev => prev.filter((_, i: number) => i !== idx));
                      setDocumentProcessingModes(prev => ({
                        ...prev,
                        contestacoes: (prev.contestacoes || []).filter((_, i: number) => i !== idx)
                      }));
                    }}
                    className="text-red-400 hover-text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {/* PDFs importados */}
              {contestacaoFiles.length === 0 && analyzedDocuments.contestacoes?.map((_, idx) => (
                <div key={`imported-pdf-${idx}`} className="flex items-center justify-between text-sm bg-blue-900/20 p-2 rounded border border-blue-500/30">
                  <span className="theme-text-blue truncate flex-1 flex items-center gap-2">
                    <FileText className="w-3 h-3 text-blue-400" />
                    {idx + 1}. Contestação {idx + 1} (PDF importado)
                  </span>
                  <button
                    onClick={() => {
                      const newDocs = { ...analyzedDocuments };
                      newDocs.contestacoes = newDocs.contestacoes.filter((_, i: number) => i !== idx);
                      setAnalyzedDocuments(newDocs);
                    }}
                    className="ml-2 text-red-400 hover-text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {pastedContestacaoTexts.map((contestacao, idx) => (
                <div key={`text-${idx}`} className="flex items-center justify-between text-sm bg-green-900/20 p-2 rounded border border-green-500/30">
                  <span
                    className="theme-text-green truncate flex-1 flex items-center gap-2 cursor-pointer hover:underline"
                    onClick={() => setTextPreview({ isOpen: true, title: contestacao.name, text: contestacao.text })}
                  >
                    <FileText className="w-3 h-3 text-green-400" />
                    {contestacaoFiles.length + (analyzedDocuments.contestacoes?.length || 0) + idx + 1}. {contestacao.name} (Texto - {contestacao.text.length.toLocaleString()} caracteres)
                  </span>
                  <button
                    onClick={() => removePastedText('contestacao', idx)}
                    className="ml-2 text-red-400 hover-text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {analyzedDocuments.contestacoesText?.map((doc, idx) => (
                <div key={`imported-text-${idx}`} className="flex items-center justify-between text-sm bg-green-900/20 p-2 rounded border border-green-500/30">
                  <span
                    className="theme-text-green truncate flex-1 flex items-center gap-2 cursor-pointer hover:underline"
                    onClick={() => setTextPreview({ isOpen: true, title: doc.name, text: doc.text })}
                  >
                    <FileText className="w-3 h-3 text-green-400" />
                    {contestacaoFiles.length + (analyzedDocuments.contestacoes?.length || 0) + pastedContestacaoTexts.length + idx + 1}. {doc.name} (Texto importado - {doc.text.length.toLocaleString()} caracteres)
                  </span>
                  <button
                    onClick={() => {
                      const newDocs = { ...analyzedDocuments };
                      newDocs.contestacoesText = newDocs.contestacoesText.filter((_, i: number) => i !== idx);
                      setAnalyzedDocuments(newDocs);
                    }}
                    className="ml-2 text-red-400 hover-text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════════════
          SEÇÃO 3: Documentos Complementares
          ═══════════════════════════════════════════════════════════════════════════════ */}
      <div className="border-t theme-border-secondary pt-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold theme-text-secondary mb-1">
            📎 Documentos Complementares (Opcional)
          </h3>
          <p className={CSS.textMuted}>
            Atas de audiência, transcrições, impugnações, provas, etc. Estes documentos NÃO são usados nos mini-relatórios automáticos, mas podem ser consultados pela IA quando você solicitar durante a redação.
          </p>
        </div>

        <div
          style={{ borderColor: '#475569', transition: 'border-color 0.3s ease' }}
          className="border-2 border-dashed rounded-lg p-6 text-center hover-border-purple-500"
        >
          <input
            type="file"
            accept=".pdf"
            multiple
            onChange={async (e) => {
              const files = Array.from(e.target.files || []);
              if (files.length === 0) return;

              handleUploadComplementary(files);

              const defaultMode = getDefaultProcessingMode();
              setDocumentProcessingModes(prev => ({
                ...prev,
                complementares: files.map(() => defaultMode)
              }));

              if (!processoNumero) {
                try {
                  const numeroDetectado = await documentServices.autoDetectProcessoNumero({
                    peticao: peticaoFiles[0]?.file || peticaoFiles[0] as unknown as File,
                    contestacoes: contestacaoFiles.map(f => f.file || f as unknown as File),
                    complementares: files
                  });

                  if (numeroDetectado) {
                    setProcessoNumero(numeroDetectado);
                  }
                } catch {
                  // Silencioso - não bloqueia upload se falhar
                }
              }
            }}
            className="hidden"
            id="complementary"
          />
          <label htmlFor="complementary" className="cursor-pointer">
            <Upload className="w-10 h-10 mx-auto mb-2 theme-text-muted" />
            <p className="theme-text-tertiary font-medium">
              {complementaryFiles.length > 0
                ? `${complementaryFiles.length} documento${complementaryFiles.length > 1 ? 's' : ''} complementar${complementaryFiles.length > 1 ? 'es' : ''}`
                : (analyzedDocuments.complementares?.length > 0 || pastedComplementaryTexts.length > 0)
                ? `✓ ${(analyzedDocuments.complementares?.length || 0) + pastedComplementaryTexts.length} importado${((analyzedDocuments.complementares?.length || 0) + pastedComplementaryTexts.length) > 1 ? 's' : ''}`
                : 'Clique para adicionar documentos complementares'}
            </p>
            <p className="theme-text-disabled text-sm mt-1">Múltiplos PDFs até 10MB cada</p>
          </label>
        </div>

        {/* Opção de colar texto */}
        <div className="text-center mt-3">
          <p className="theme-text-disabled text-xs mb-2">— OU —</p>
          {!showPasteArea.complementary ? (
            <button
              onClick={() => setShowPasteArea({ ...showPasteArea, complementary: true })}
              className="text-sm flex items-center gap-2 mx-auto hover-text-purple-400-from-400"
            >
              <FileText className="w-4 h-4" />
              Colar texto de documento complementar (Ctrl+V)
            </button>
          ) : (
            <div className="theme-bg-secondary-30 rounded-lg p-4">
              <p className="text-xs theme-text-muted mb-2">Cole o texto do documento complementar abaixo:</p>
              <textarea
                className="w-full h-32 theme-bg-primary border theme-border-input rounded p-2 text-sm theme-text-secondary resize-none focus:border-purple-500 focus:outline-none"
                placeholder="Cole o texto aqui (Ctrl+V)..."
                onPaste={(e) => {
                  const text = e.clipboardData.getData('text');
                  handlePastedText(text, 'complementary');
                }}
                onKeyDown={(e) => {
                  if (e.ctrlKey && e.key === 'Enter') {
                    const text = (e.target as HTMLTextAreaElement).value;
                    handlePastedText(text, 'complementary');
                  }
                }}
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={(e) => {
                    const textarea = (e.target as Element).closest('.theme-bg-secondary\\/30')?.querySelector('textarea');
                    if (textarea) handlePastedText(textarea.value, 'complementary');
                  }}
                  className="hover-purple-700 flex-1 py-2 rounded text-sm bg-purple-600 text-white"
                >
                  Confirmar
                </button>
                <button
                  onClick={() => setShowPasteArea({ ...showPasteArea, complementary: false })}
                  className="px-4 py-2 theme-bg-tertiary rounded hover-slate-700 text-sm"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>

        {(complementaryFiles.length > 0 || pastedComplementaryTexts.length > 0 || analyzedDocuments.complementares?.length > 0 || analyzedDocuments.complementaresText?.length > 0) && (
          <div className="mt-3 bg-purple-900/20 border border-purple-500/30 rounded-lg p-4 space-y-2">
            <p className="text-xs theme-text-purple font-medium flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Documentos complementares anexados:
            </p>
            {/* Complementares com seletor de modo de processamento */}
            {complementaryFiles.map((fileObj, idx) => (
              <div key={`file-${fileObj.id || idx}`} className="flex items-center justify-between text-sm theme-bg-primary-50 rounded p-2">
                <span className="theme-text-tertiary truncate flex-1 flex items-center gap-2">
                  <FileText className="w-3 h-3 text-purple-400" />
                  {idx + 1}. {fileObj.file?.name || fileObj.name}
                </span>
                <ProcessingModeSelector
                  value={documentProcessingModes.complementares?.[idx] || 'pdfjs'}
                  onChange={(mode: ProcessingMode) => setComplementarMode(idx, mode)}
                  className="mx-2"
                  anonymizationEnabled={aiIntegration.aiSettings?.anonymization?.enabled}
                  grokEnabled={aiIntegration.aiSettings?.provider === 'grok'}
                />
                <button
                  onClick={async () => {
                    const fileToRemove = complementaryFiles[idx];
                    if (fileToRemove?.id) {
                      try { await removePdfFromIndexedDB(`upload-complementar-${fileToRemove.id}`); } catch {}
                    }
                    setComplementaryFiles(prev => prev.filter((_, i: number) => i !== idx));
                    setDocumentProcessingModes(prev => ({
                      ...prev,
                      complementares: (prev.complementares || []).filter((_, i: number) => i !== idx)
                    }));
                  }}
                  className="hover-text-red-400-from-300"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {/* PDFs importados */}
            {complementaryFiles.length === 0 && analyzedDocuments.complementares?.map((_, idx) => (
              <div key={`imported-pdf-${idx}`} className="flex items-center justify-between text-sm bg-purple-900/20 rounded p-2 border border-purple-500/30">
                <span className="theme-text-purple truncate flex-1 flex items-center gap-2">
                  <FileText className="w-3 h-3 text-purple-400" />
                  {idx + 1}. Documento complementar {idx + 1} (PDF importado)
                </span>
                <button
                  onClick={() => {
                    const newDocs = { ...analyzedDocuments };
                    newDocs.complementares = newDocs.complementares.filter((_, i: number) => i !== idx);
                    setAnalyzedDocuments(newDocs);
                  }}
                  className="ml-2 hover-text-red-400-from-300"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {pastedComplementaryTexts.map((doc, idx) => (
              <div key={`text-${idx}`} className="flex items-center justify-between text-sm bg-green-900/20 rounded p-2 border border-green-500/30">
                <span
                  className="theme-text-green truncate flex-1 flex items-center gap-2 cursor-pointer hover:underline"
                  onClick={() => setTextPreview({ isOpen: true, title: doc.name, text: doc.text })}
                >
                  <FileText className="w-3 h-3 text-green-400" />
                  {complementaryFiles.length + (analyzedDocuments.complementares?.length || 0) + idx + 1}. {doc.name} (Texto - {doc.text.length.toLocaleString()} caracteres)
                </span>
                <button
                  onClick={() => removePastedText('complementary', idx)}
                  className="ml-2 hover-text-red-400-from-300"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {analyzedDocuments.complementaresText?.map((doc, idx) => (
              <div key={`imported-text-${idx}`} className="flex items-center justify-between text-sm bg-green-900/20 rounded p-2 border border-green-500/30">
                <span
                  className="theme-text-green truncate flex-1 flex items-center gap-2 cursor-pointer hover:underline"
                  onClick={() => setTextPreview({ isOpen: true, title: doc.name, text: doc.text })}
                >
                  <FileText className="w-3 h-3 text-green-400" />
                  {complementaryFiles.length + (analyzedDocuments.complementares?.length || 0) + pastedComplementaryTexts.length + idx + 1}. {doc.name} (Texto importado - {doc.text.length.toLocaleString()} caracteres)
                </span>
                <button
                  onClick={() => {
                    const newDocs = { ...analyzedDocuments };
                    newDocs.complementaresText = newDocs.complementaresText.filter((_, i: number) => i !== idx);
                    setAnalyzedDocuments(newDocs);
                  }}
                  className="ml-2 hover-text-red-400-from-300"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════════════
          SEÇÃO 4: Botão Analisar Documentos
          ═══════════════════════════════════════════════════════════════════════════════ */}
      <button
        onClick={handleAnalyzeDocuments}
        disabled={analyzing || (peticaoFiles.length === 0 && pastedPeticaoTexts.length === 0)}
        className="w-full py-4 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white hover-gradient-blue-purple"
      >
        {analyzing ? 'Analisando documentos...' : 'Analisar Documentos'}
      </button>
    </div>
  );
};
