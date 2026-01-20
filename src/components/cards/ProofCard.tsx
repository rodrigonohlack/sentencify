/**
 * @file ProofCard.tsx
 * @description Card de prova PDF/Texto com extração, anonimização e análise
 * @version 1.36.86
 *
 * Extraído do App.tsx como parte da FASE 3 de refatoração.
 * v1.21.5: Suporte a anonimização de provas
 * v1.36.36: Bloquear PDF Puro quando Grok selecionado
 */

import React from 'react';
import { FileText, Sparkles, AlertCircle, Loader2, Check, Scale, Trash2, Paperclip, Plus, X } from 'lucide-react';
import { ProcessingModeSelector } from '../ui/ProcessingModeSelector';
import VoiceButton from '../VoiceButton';
import { anonymizeText } from '../../utils/text';
import { useAIStore } from '../../stores/useAIStore';
import { useAIIntegration } from '../../hooks';
import { useVoiceImprovement } from '../../hooks/useVoiceImprovement';
import { useProofsStore } from '../../stores/useProofsStore';
import {
  saveAttachmentToIndexedDB,
  removeAttachmentFromIndexedDB
} from '../../hooks/useLocalStorage';
import type { ProofCardProps, ProcessingMode, ProofAttachment } from '../../types';

export const ProofCard = React.memo(({
  proof,
  isPdf,
  proofManager,
  openModal,
  setError,
  extractTextFromPDFWithMode,
  anonymizationEnabled = false,
  grokEnabled = false,
  anonConfig = null,
  nomesParaAnonimizar = [],
  editorTheme = 'dark',
  setTextPreview
}: ProofCardProps) => {
  // Estado local para progresso de extração
  const [extractionProgress, setExtractionProgress] = React.useState<{ current: number; total: number; mode: string } | null>(null);

  // v1.37.88: Voice improvement com IA
  // v1.37.90: Usa callAI do useAIIntegration para tracking de tokens
  const aiSettings = useAIStore((state) => state.aiSettings);
  const { callAI } = useAIIntegration();
  const { improveText } = useVoiceImprovement({ callAI });

  // Handler: Remover vínculo de tópico
  const handleUnlinkTopic = React.useCallback((topicTitle: string) => {
    proofManager.setProofTopicLinks((prev: Record<string, string[]>) => ({
      ...prev,
      [proof.id]: (prev[proof.id] || []).filter((t: string) => t !== topicTitle)
    }));
  }, [proof.id, proofManager]);

  // Handler: Atualizar conclusao
  const handleConclusionChange = React.useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    proofManager.setProofConclusions((prev: Record<string, string>) => ({
      ...prev,
      [proof.id]: e.target.value
    }));
  }, [proof.id, proofManager]);

  // Handler: Ditado por voz para conclusões
  const handleVoiceTranscript = React.useCallback((text: string) => {
    proofManager.setProofConclusions((prev: Record<string, string>) => {
      const current = prev[proof.id] || '';
      return {
        ...prev,
        [proof.id]: current + (current ? ' ' : '') + text
      };
    });
  }, [proof.id, proofManager]);

  // Handler: Definir modo PDF
  const handleSetPdfMode = React.useCallback(() => {
    if (!proof.isPlaceholder) {
      proofManager.setProofUsePdfMode((prev: Record<string, boolean>) => ({
        ...prev,
        [proof.id]: true
      }));
    }
  }, [proof.id, proof.isPlaceholder, proofManager]);

  // Função interna de extração (chamada diretamente ou após modal de nomes)
  const executeExtraction = React.useCallback(async (nomesToUse: string[] = []) => {
    // Bloquear apenas modos binários, permitir tesseract
    const userMode = proofManager.proofProcessingModes[proof.id] || 'pdfjs';
    const blockedModes = ['claude-vision', 'pdf-puro'];
    const selectedMode = (anonymizationEnabled && blockedModes.includes(userMode))
      ? 'pdfjs'
      : userMode;

    // Se modo é 'pdf-puro', usar PDF binário diretamente
    if (selectedMode === 'pdf-puro') {
      proofManager.setProofUsePdfMode((prev: Record<string, boolean>) => ({ ...prev, [proof.id]: true }));
      return;
    }

    proofManager.setProofUsePdfMode((prev: Record<string, boolean>) => ({ ...prev, [proof.id]: false }));

    try {
      setExtractionProgress({ current: 0, total: 0, mode: selectedMode });
      const extractedText = await extractTextFromPDFWithMode(proof.file!, selectedMode, (current: number, total: number) => {
        setExtractionProgress({ current, total, mode: selectedMode });
      });
      setExtractionProgress(null);

      if (extractedText && extractedText.trim().length > 0) {
        // Usar nomes passados como parametro (do modal ou existentes)
        const textToStore = (anonymizationEnabled && anonConfig)
          ? anonymizeText(extractedText, anonConfig, nomesToUse)
          : extractedText;
        proofManager.setExtractedProofTexts((prev: Record<string, string>) => ({ ...prev, [proof.id]: textToStore }));
        proofManager.setProofExtractionFailed((prev: Record<string, boolean>) => ({ ...prev, [proof.id]: false }));
      } else {
        proofManager.setProofExtractionFailed((prev: Record<string, boolean>) => ({ ...prev, [proof.id]: true }));
        // So fazer fallback para PDF se NAO estiver bloqueado (anon/Grok)
        const pdfBinaryBlocked = anonymizationEnabled || grokEnabled;
        if (!pdfBinaryBlocked) {
          proofManager.setProofUsePdfMode((prev: Record<string, boolean>) => ({ ...prev, [proof.id]: true }));
        }
      }
    } catch (err) {
      setExtractionProgress(null);
      proofManager.setProofExtractionFailed((prev: Record<string, boolean>) => ({ ...prev, [proof.id]: true }));
      // So fazer fallback para PDF se NAO estiver bloqueado (anon/Grok)
      const pdfBinaryBlocked = anonymizationEnabled || grokEnabled;
      if (!pdfBinaryBlocked) {
        proofManager.setProofUsePdfMode((prev: Record<string, boolean>) => ({ ...prev, [proof.id]: true }));
      }
    }
  }, [proof.id, proof.file, proofManager, extractTextFromPDFWithMode, anonymizationEnabled, anonConfig, grokEnabled]);

  // Handler: Extrair texto do PDF
  const handleExtractText = React.useCallback(async () => {
    if (proof.isPlaceholder) return;

    // Se anonimização ativa, abrir modal de nomes antes de extrair
    if (anonymizationEnabled && anonConfig) {
      proofManager.setPendingExtraction({ proofId: proof.id, proof, executeExtraction });
      openModal('proofExtractionAnonymization');
      return;
    }

    // Sem anonimização: extrair diretamente
    await executeExtraction(nomesParaAnonimizar);
  }, [proof.id, proof.isPlaceholder, proofManager, openModal, anonymizationEnabled, anonConfig, nomesParaAnonimizar, executeExtraction]);

  // Handler: Abrir modal de análise
  const handleAnalyze = React.useCallback(() => {
    proofManager.setProofToAnalyze(proof);
    openModal('proofAnalysis');
  }, [proof, proofManager, openModal]);

  // Handler: Abrir modal de vinculacao
  const handleLink = React.useCallback(() => {
    proofManager.setProofToLink(proof);
    openModal('linkProof');
  }, [proof, proofManager, openModal]);

  // Handler: Abrir modal de remocao
  const handleDelete = React.useCallback(() => {
    proofManager.setProofToDelete(proof);
    openModal('deleteProof');
  }, [proof, proofManager, openModal]);

  // Handler: Remover uma análise específica (v1.38.27)
  const handleRemoveAnalysis = React.useCallback((analysisId: string) => {
    proofManager.removeProofAnalysis(String(proof.id), analysisId);
  }, [proof.id, proofManager]);

  // ═══════════════════════════════════════════════════════════════════════════
  // ANEXOS (v1.38.8)
  // ═══════════════════════════════════════════════════════════════════════════

  // Estado e refs para anexos
  const attachmentFileInputRef = React.useRef<HTMLInputElement>(null);
  const [showAttachmentTextInput, setShowAttachmentTextInput] = React.useState(false);
  const [attachmentTextName, setAttachmentTextName] = React.useState('');
  const [attachmentTextContent, setAttachmentTextContent] = React.useState('');

  // Store actions para anexos
  const addAttachment = useProofsStore((s) => s.addAttachment);
  const removeAttachment = useProofsStore((s) => s.removeAttachment);
  const updateAttachmentExtractedText = useProofsStore((s) => s.updateAttachmentExtractedText);
  const updateAttachmentProcessingMode = useProofsStore((s) => s.updateAttachmentProcessingMode);

  // Handler: Adicionar anexo PDF
  const handleAddAttachmentPdf = React.useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const attachmentId = `att-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const attachment: ProofAttachment = {
      id: attachmentId,
      name: file.name,
      type: 'pdf',
      file,
      size: file.size,
      uploadDate: new Date().toISOString()
    };

    // Salvar no IndexedDB
    try {
      await saveAttachmentToIndexedDB(proof.id, attachmentId, file);
    } catch (err) {
      console.error('[ProofCard] Erro ao salvar anexo:', err);
    }

    // Adicionar ao store
    addAttachment(proof.id, attachment);

    // Limpar input
    if (attachmentFileInputRef.current) {
      attachmentFileInputRef.current.value = '';
    }
  }, [proof.id, addAttachment]);

  // Handler: Adicionar anexo texto
  const handleAddAttachmentText = React.useCallback(() => {
    if (!attachmentTextName.trim() || !attachmentTextContent.trim()) return;

    const attachmentId = `att-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const attachment: ProofAttachment = {
      id: attachmentId,
      name: attachmentTextName.trim(),
      type: 'text',
      text: attachmentTextContent.trim(),
      uploadDate: new Date().toISOString()
    };

    addAttachment(proof.id, attachment);

    // Limpar form
    setAttachmentTextName('');
    setAttachmentTextContent('');
    setShowAttachmentTextInput(false);
  }, [proof.id, attachmentTextName, attachmentTextContent, addAttachment]);

  // Handler: Remover anexo
  const handleRemoveAttachment = React.useCallback(async (attachmentId: string, type: 'pdf' | 'text') => {
    // Remover do IndexedDB se for PDF
    if (type === 'pdf') {
      try {
        await removeAttachmentFromIndexedDB(proof.id, attachmentId);
      } catch (err) {
        console.error('[ProofCard] Erro ao remover anexo do IndexedDB:', err);
      }
    }

    // Remover do store
    removeAttachment(proof.id, attachmentId);
  }, [proof.id, removeAttachment]);

  // Handler: Extrair texto de anexo PDF
  // v1.38.10: Usa processingMode do próprio anexo (não da prova principal)
  const handleExtractAttachmentText = React.useCallback(async (attachment: ProofAttachment) => {
    if (!attachment.file || attachment.type !== 'pdf') return;

    try {
      // Usar modo do anexo (default: pdfjs)
      const userMode = attachment.processingMode || 'pdfjs';
      // Bloquear claude-vision se anonimização ativa
      // Bloquear pdf-puro se anonimização OU Grok ativos
      let selectedMode = userMode;
      if (anonymizationEnabled && userMode === 'claude-vision') {
        selectedMode = 'pdfjs';
      }
      if ((anonymizationEnabled || grokEnabled) && userMode === 'pdf-puro') {
        selectedMode = 'pdfjs';
      }

      const extractedText = await extractTextFromPDFWithMode(attachment.file, selectedMode);

      if (extractedText && extractedText.trim().length > 0) {
        const textToStore = (anonymizationEnabled && anonConfig)
          ? anonymizeText(extractedText, anonConfig, nomesParaAnonimizar)
          : extractedText;
        updateAttachmentExtractedText(proof.id, attachment.id, textToStore);
      }
    } catch (err) {
      console.error('[ProofCard] Erro ao extrair texto do anexo:', err);
    }
  }, [proof.id, anonymizationEnabled, grokEnabled, anonConfig, nomesParaAnonimizar, extractTextFromPDFWithMode, updateAttachmentExtractedText]);

  // Obter anexos da prova atual
  const attachments = proof.attachments || [];

  return (
    <div
      className="theme-bg-secondary-50 rounded-lg p-4 border theme-border-input hover-border-blue-500 transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Cabecalho - Nome + Badge de Tipo */}
          <div className="flex items-center gap-2 mb-2">
            <FileText className={`w-5 h-5 flex-shrink-0 ${isPdf ? 'text-red-400' : 'text-blue-400'}`} />
            <h5 className="font-medium theme-text-secondary truncate">{proof.name}</h5>
            <span className={`px-2 py-0.5 text-xs rounded ${
              isPdf
                ? 'theme-bg-red-accent theme-text-red'
                : 'theme-bg-blue-accent theme-text-blue'
            }`}>
              {isPdf ? 'PDF' : 'TEXTO'}
            </span>
            {isPdf && proof.isPlaceholder && (
              <span className="px-2 py-0.5 theme-bg-amber-accent theme-text-amber text-xs rounded" title="PDF original não salvo, mas texto extraído disponível">
                Somente Texto
              </span>
            )}
            {/* Badge de modo de processamento (BINÁRIO vs EXTRAÍDO) */}
            {isPdf && !proof.isPlaceholder && (
              <span className={`px-2 py-0.5 text-xs rounded ${
                anonymizationEnabled && proofManager.proofUsePdfMode[proof.id]
                  ? editorTheme === 'light' ? 'bg-amber-100 text-amber-700 border border-amber-300' : 'bg-amber-600/20 text-amber-400 border border-amber-500/30'
                  : proofManager.proofUsePdfMode[proof.id]
                    ? editorTheme === 'light' ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                    : editorTheme === 'light' ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-green-600/20 text-green-400 border border-green-500/30'
              }`} title={
                anonymizationEnabled && proofManager.proofUsePdfMode[proof.id]
                  ? 'Conflito: Modo PDF + anonimização. Clique em "Usar Texto" para resolver.'
                  : proofManager.proofUsePdfMode[proof.id]
                    ? 'PDF binário será enviado à IA'
                    : 'Texto extraído será enviado à IA'
              }>
                {anonymizationEnabled && proofManager.proofUsePdfMode[proof.id]
                  ? 'CONFLITO'
                  : proofManager.proofUsePdfMode[proof.id] ? 'BINÁRIO' : 'EXTRAÍDO'}
              </span>
            )}
          </div>

          {/* Metadata - Tamanho/Caracteres + Data */}
          <div className="flex items-center gap-4 text-xs theme-text-muted mb-2">
            <span>{isPdf ? `${((proof.size ?? 0) / 1024).toFixed(1)} KB` : `${(proof.text ?? '').length} caracteres`}</span>
            <span>{new Date(proof.uploadDate).toLocaleDateString('pt-BR')}</span>
          </div>

          {/* Alert para PDF Placeholder */}
          {isPdf && proof.isPlaceholder && (
            <div className="mb-3 text-xs text-amber-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              PDF original não salvo (muito grande), mas texto extraído está disponível
            </div>
          )}

          {/* Aviso para PDF com anonimização ativa */}
          {isPdf && anonymizationEnabled && !proofManager.extractedProofTexts[proof.id] && (
            <div className={`mb-3 p-2 rounded text-xs flex items-start gap-2 ${
              editorTheme === 'dark'
                ? 'bg-purple-600/20 border border-purple-500/30 text-purple-300'
                : 'bg-purple-100 border border-purple-300 text-purple-700'
            }`}>
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <div>
                <span className="font-medium">Anonimização ativa:</span> Extraia o texto antes de usar no Assistente IA
              </div>
            </div>
          )}

          {/* Aviso para PDF com Grok selecionado (só mostra se anonimização não ativa) */}
          {isPdf && grokEnabled && !anonymizationEnabled && !proofManager.extractedProofTexts[proof.id] && (
            <div className={`mb-3 p-2 rounded text-xs flex items-start gap-2 ${
              editorTheme === 'dark'
                ? 'bg-orange-600/20 border border-orange-500/30 text-orange-300'
                : 'bg-orange-100 border border-orange-300 text-orange-700'
            }`}>
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <div>
                <span className="font-medium">Grok selecionado:</span> Grok não suporta PDF binário. Extraia o texto primeiro.
              </div>
            </div>
          )}

          {/* Preview de Texto (apenas para tipo TEXTO) */}
          {!isPdf && proof.text && (
            <p className="text-xs theme-text-muted line-clamp-2 mb-2">{proof.text.substring(0, 150)}...</p>
          )}

          {/* Toggle PDF/Texto - APENAS para PDFs */}
          {isPdf && (
            <div className="mt-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSetPdfMode}
                  disabled={proof.isPlaceholder || !!extractionProgress || anonymizationEnabled || grokEnabled}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    proof.isPlaceholder || extractionProgress || anonymizationEnabled || grokEnabled
                      ? 'theme-bg-tertiary-30 theme-text-disabled cursor-not-allowed'
                      : proofManager.proofUsePdfMode[proof.id]
                      ? 'bg-blue-600 text-white shadow-lg hover-blue-700-from-600'
                      : 'theme-bg-tertiary-50 theme-text-muted hover-slate-600'
                  }`}
                  title={proof.isPlaceholder ? 'PDF original não disponível' : anonymizationEnabled ? 'Anonimização ativa: PDF binário bloqueado' : grokEnabled ? 'Grok não suporta PDF binário' : ''}
                >
                  Usar PDF
                </button>
                <button
                  onClick={handleExtractText}
                  disabled={!!extractionProgress}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    extractionProgress
                      ? 'theme-bg-tertiary-30 theme-text-disabled cursor-not-allowed'
                      : proofManager.proofUsePdfMode[proof.id] && !proof.isPlaceholder
                      ? 'bg-green-600 text-white shadow-lg hover-green-700-from-600'
                      : 'theme-bg-tertiary-50 theme-text-muted hover-slate-600'
                  }`}
                >
                  {extractionProgress ? 'Extraindo...' : 'Extrair Texto'}
                </button>
              </div>

              {/* Seletor de modo de processamento */}
              <div className="mt-2 flex items-center justify-end gap-2">
                <span className="text-xs theme-text-muted">Modo:</span>
                <ProcessingModeSelector
                  value={proofManager.proofProcessingModes[proof.id] || 'pdfjs'}
                  onChange={(mode: ProcessingMode) => proofManager.setProofProcessingModes((prev: Record<string, ProcessingMode>) => ({
                    ...prev,
                    [proof.id]: mode
                  }))}
                  disabled={proofManager.isAnalyzingProof(String(proof.id)) || !!extractionProgress}
                  anonymizationEnabled={anonymizationEnabled}
                  grokEnabled={grokEnabled}
                />
              </div>

              {/* Indicador de progresso de extração (inline) */}
              {extractionProgress && (
                <div className="mt-2 text-xs text-blue-400 flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>
                    {extractionProgress.mode === 'claude-vision' ? '' : ''}
                    {extractionProgress.total > 0
                      ? ` Extraindo... ${extractionProgress.current}/${extractionProgress.total} páginas`
                      : ' Iniciando extração...'}
                  </span>
                </div>
              )}

              {/* Indicador de texto extraído - clicável para preview */}
              {!proofManager.proofUsePdfMode[proof.id] && proofManager.extractedProofTexts[proof.id] && (
                <div
                  className={`mt-2 text-xs flex items-center gap-1 cursor-pointer hover:underline ${editorTheme === 'light' ? 'text-green-600' : 'text-green-400'}`}
                  onClick={() => setTextPreview?.({ isOpen: true, title: proof.name, text: proofManager.extractedProofTexts[proof.id] })}
                >
                  <Check className="w-3 h-3" />
                  Texto extraído com sucesso ({proofManager.extractedProofTexts[proof.id].length.toLocaleString()} caracteres)
                </div>
              )}

              {/* Indicador de extração falhada - mensagem diferente quando PDF bloqueado */}
              {proofManager.proofExtractionFailed[proof.id] && (
                <div className={`mt-2 text-xs flex items-center gap-1 ${
                  (anonymizationEnabled || grokEnabled) ? 'text-red-400' : 'text-amber-400'
                }`}>
                  <AlertCircle className="w-3 h-3" />
                  {(anonymizationEnabled || grokEnabled)
                    ? 'PDF sem texto extraível - extração obrigatória (tente Tesseract OCR)'
                    : 'PDF sem texto extraível (imagem) - usando PDF completo'}
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════════
              SEÇÃO DE ANEXOS (v1.38.8)
              ═══════════════════════════════════════════════════════════════════════ */}
          <div className="mt-4 pt-3 border-t theme-border-input">
            {/* Header da seção */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Paperclip className="w-4 h-4 theme-text-muted" />
                <span className="text-xs font-medium theme-text-secondary">
                  Anexos {attachments.length > 0 && `(${attachments.length})`}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {/* Botão: Adicionar PDF */}
                <button
                  onClick={() => attachmentFileInputRef.current?.click()}
                  className="px-2 py-1 text-xs theme-text-muted rounded hover-slate-600 transition-colors flex items-center gap-1"
                  title="Adicionar anexo PDF"
                >
                  <Plus className="w-3 h-3" />
                  PDF
                </button>
                {/* Botão: Adicionar Texto */}
                <button
                  onClick={() => setShowAttachmentTextInput(true)}
                  className="px-2 py-1 text-xs theme-text-muted rounded hover-slate-600 transition-colors flex items-center gap-1"
                  title="Adicionar anexo de texto"
                >
                  <Plus className="w-3 h-3" />
                  Texto
                </button>
              </div>
            </div>

            {/* Input oculto para upload de PDF */}
            <input
              ref={attachmentFileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleAddAttachmentPdf}
              className="hidden"
            />

            {/* Formulário inline para anexo de texto */}
            {showAttachmentTextInput && (
              <div className="mb-3 p-3 theme-bg-tertiary-30 rounded-lg border theme-border-input">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium theme-text-secondary">Novo Anexo de Texto</span>
                  <button
                    onClick={() => {
                      setShowAttachmentTextInput(false);
                      setAttachmentTextName('');
                      setAttachmentTextContent('');
                    }}
                    className="p-1 rounded hover:theme-bg-tertiary-50"
                  >
                    <X className="w-3 h-3 theme-text-muted" />
                  </button>
                </div>
                <input
                  type="text"
                  value={attachmentTextName}
                  onChange={(e) => setAttachmentTextName(e.target.value)}
                  placeholder="Nome do anexo (ex: Impugnação do Autor)"
                  className="w-full px-2 py-1.5 mb-2 text-xs theme-bg-secondary-50 border theme-border-input rounded focus:ring-1 focus:ring-blue-500 theme-text-secondary"
                />
                <textarea
                  value={attachmentTextContent}
                  onChange={(e) => setAttachmentTextContent(e.target.value)}
                  placeholder="Cole o conteúdo do anexo aqui..."
                  rows={4}
                  className="w-full px-2 py-1.5 mb-2 text-xs theme-bg-secondary-50 border theme-border-input rounded focus:ring-1 focus:ring-blue-500 theme-text-secondary resize-none"
                />
                <button
                  onClick={handleAddAttachmentText}
                  disabled={!attachmentTextName.trim() || !attachmentTextContent.trim()}
                  className="w-full px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-700 transition-colors"
                >
                  Adicionar Anexo
                </button>
              </div>
            )}

            {/* Lista de anexos */}
            {attachments.length > 0 ? (
              <div className="space-y-2">
                {attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex flex-col gap-2 p-2 theme-bg-tertiary-30 rounded border theme-border-input"
                  >
                    {/* Linha 1: Nome e metadata */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <FileText className={`w-4 h-4 flex-shrink-0 ${attachment.type === 'pdf' ? 'text-red-400' : 'text-blue-400'}`} />
                        <div className="min-w-0 flex-1">
                          <span className="text-xs theme-text-secondary truncate block">{attachment.name}</span>
                          <span className="text-[10px] theme-text-muted">
                            {attachment.type === 'pdf'
                              ? `PDF • ${((attachment.size ?? 0) / 1024).toFixed(1)} KB`
                              : `Texto • ${(attachment.text ?? '').length} caracteres`}
                          </span>
                        </div>
                      </div>
                      {/* Botão remover */}
                      <button
                        onClick={() => handleRemoveAttachment(attachment.id, attachment.type)}
                        className="p-1 rounded hover:bg-red-500/20 transition-colors"
                        title="Remover anexo"
                      >
                        <Trash2 className="w-3 h-3 text-red-400" />
                      </button>
                    </div>

                    {/* Linha 2: ProcessingModeSelector + Extrair (só para PDF sem texto extraído) */}
                    {attachment.type === 'pdf' && !attachment.extractedText && attachment.file && (
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <ProcessingModeSelector
                            value={attachment.processingMode || 'pdfjs'}
                            onChange={(mode) => updateAttachmentProcessingMode(proof.id, attachment.id, mode)}
                            anonymizationEnabled={anonymizationEnabled}
                            grokEnabled={grokEnabled}
                          />
                        </div>
                        <button
                          onClick={() => handleExtractAttachmentText(attachment)}
                          className="px-2 py-1 text-[10px] theme-text-blue theme-bg-blue-accent rounded hover:opacity-80 transition-opacity whitespace-nowrap"
                          title="Extrair texto do PDF"
                        >
                          Extrair
                        </button>
                      </div>
                    )}

                    {/* Linha 2 alternativa: Texto extraído clicável (abre preview) */}
                    {attachment.extractedText && (
                      <button
                        onClick={() => setTextPreview?.({
                          isOpen: true,
                          title: `Anexo: ${attachment.name}`,
                          text: attachment.extractedText || ''
                        })}
                        className="flex items-center gap-1 px-2 py-1 text-[10px] theme-text-green theme-bg-green-accent rounded hover:opacity-80 transition-opacity cursor-pointer w-fit"
                        title="Clique para ver o texto extraído"
                      >
                        <Check className="w-3 h-3" />
                        Extraído: {attachment.extractedText.length.toLocaleString()} caracteres
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs theme-text-muted text-center py-2">
                Nenhum anexo. Adicione impugnações, esclarecimentos ou documentos relacionados.
              </p>
            )}
          </div>

          {/* Botão: Analisar com IA */}
          <div className="mt-3">
            <button
              onClick={handleAnalyze}
              disabled={proofManager.isAnalyzingProof(String(proof.id)) || (anonymizationEnabled && isPdf && !proofManager.extractedProofTexts[proof.id]) || (anonymizationEnabled && isPdf && proofManager.proofUsePdfMode[proof.id])}
              title={
                proofManager.isAnalyzingProof(String(proof.id))
                  ? 'Análise em andamento...'
                  : (anonymizationEnabled && isPdf && proofManager.proofUsePdfMode[proof.id])
                    ? 'Incompatível: anonimização + PDF puro. Desabilite anonimização ou extraia o texto.'
                    : (anonymizationEnabled && isPdf && !proofManager.extractedProofTexts[proof.id])
                      ? 'Extraia o texto primeiro (anonimização requer texto extraído)'
                      : 'Analisar prova com IA'
              }
              className="w-full px-3 py-2 border border-blue-500/30 rounded-lg text-xs font-medium theme-text-blue flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover-blue-alpha-3-from-2 theme-bg-blue-accent transition-all duration-300"
            >
              {proofManager.isAnalyzingProof(String(proof.id)) ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Analisando...
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3" />
                  Analisar com IA
                </>
              )}
            </button>
          </div>

          {/* Botão: Vincular a Tópicos */}
          <div className="mt-3">
            <button
              onClick={handleLink}
              disabled={(anonymizationEnabled && isPdf && !proofManager.extractedProofTexts[proof.id]) || (anonymizationEnabled && isPdf && proofManager.proofUsePdfMode[proof.id])}
              title={
                (anonymizationEnabled && isPdf && proofManager.proofUsePdfMode[proof.id])
                  ? 'Incompatível: anonimização + PDF puro. Desabilite anonimização ou extraia o texto.'
                  : (anonymizationEnabled && isPdf && !proofManager.extractedProofTexts[proof.id])
                    ? 'Extraia o texto primeiro (anonimização requer texto extraído)'
                    : 'Vincular prova a tópicos específicos'
              }
              className={`w-full px-3 py-2 border rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all duration-300 ${
                (anonymizationEnabled && isPdf && !proofManager.extractedProofTexts[proof.id]) || (anonymizationEnabled && isPdf && proofManager.proofUsePdfMode[proof.id])
                  ? 'border-gray-500/30 theme-text-disabled cursor-not-allowed opacity-50'
                  : 'border-purple-500/30 theme-text-purple hover-purple-alpha-3-from-2 theme-bg-purple-accent'
              }`}
            >
              <Scale className="w-3 h-3" />
              Vincular a Tópicos
            </button>
          </div>

          {/* Toggle para enviar conteúdo completo à IA */}
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => {
                const isDisabled = anonymizationEnabled && isPdf && !proofManager.extractedProofTexts[proof.id];
                if (!isDisabled) {
                  proofManager.setProofSendFullContent((prev: Record<string, boolean>) => ({
                    ...prev,
                    [proof.id]: !prev[proof.id]
                  }));
                }
              }}
              disabled={anonymizationEnabled && isPdf && !proofManager.extractedProofTexts[proof.id]}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                anonymizationEnabled && isPdf && !proofManager.extractedProofTexts[proof.id]
                  ? 'bg-gray-700 opacity-50 cursor-not-allowed'
                  : proofManager.proofSendFullContent[proof.id]
                    ? 'bg-green-500'
                    : 'bg-gray-600'
              }`}
            >
              <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                proofManager.proofSendFullContent[proof.id] ? 'translate-x-5' : 'translate-x-1'
              }`} />
            </button>
            <span className={`text-xs ${
              anonymizationEnabled && isPdf && !proofManager.extractedProofTexts[proof.id]
                ? 'theme-text-disabled'
                : 'theme-text-muted'
            }`}>
              Enviar conteúdo completo à IA
            </span>
          </div>

          {/* Análises da Prova (v1.38.27: múltiplas análises) */}
          {proofManager?.proofAnalysisResults?.[proof.id]?.length > 0 && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3 h-3 text-blue-400" />
                <span className="text-xs font-medium theme-text-blue">
                  Análises ({proofManager?.proofAnalysisResults?.[proof.id]?.length ?? 0}/5)
                </span>
              </div>

              {proofManager?.proofAnalysisResults?.[proof.id]?.map((analysis, idx) => (
                <div key={analysis.id} className="theme-info-box relative group">
                  {/* Header com tipo, data e botão excluir */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium theme-text-blue">
                        #{idx + 1} - {analysis.type === 'livre' ? 'Livre' : 'Contextual'}
                      </span>
                      <span className="text-xs theme-text-muted">
                        {new Date(analysis.timestamp).toLocaleString('pt-BR', {
                          day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                    </div>
                    {/* Botão excluir - tema claro/escuro compatível */}
                    <button
                      onClick={() => handleRemoveAnalysis(analysis.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 dark:hover:bg-red-500/30 text-red-500 dark:text-red-400 transition-all"
                      title="Excluir esta análise"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Conteúdo da análise */}
                  <div
                    className="overflow-y-auto"
                    style={{ resize: 'vertical', height: '10rem', minHeight: '6rem', maxHeight: '30rem' }}
                  >
                    <p className="text-xs theme-text-tertiary whitespace-pre-wrap">
                      {analysis.result}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Conclusões Manuais */}
          <div className="mt-3">
            <div className="flex items-center gap-2 mb-2">
              <label className="text-xs font-medium theme-text-muted">
                Minhas Conclusões:
              </label>
              <VoiceButton
                onTranscript={handleVoiceTranscript}
                size="sm"
                onError={(err: unknown) => console.warn('[VoiceToText] Conclusões:', err)}
                improveWithAI={aiSettings.voiceImprovement?.enabled}
                onImproveText={aiSettings.voiceImprovement?.enabled
                  ? (text) => improveText(text, aiSettings.voiceImprovement?.model || 'haiku')
                  : undefined
                }
              />
            </div>
            <textarea
              value={proofManager.proofConclusions[proof.id] || ''}
              onChange={handleConclusionChange}
              placeholder="Adicione suas conclusões sobre esta prova..."
              rows={3}
              className="w-full px-3 py-2 theme-bg-secondary-50 border theme-border-input rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent theme-text-secondary text-xs resize-none"
            />
          </div>

          {/* Badges de Tópicos Vinculados */}
          {proofManager.proofTopicLinks[proof.id] && proofManager.proofTopicLinks[proof.id].length > 0 && (
            <div className="mt-3">
              <p className="text-xs theme-text-muted mb-2">Vinculado a:</p>
              <div className="flex flex-wrap gap-1">
                {proofManager.proofTopicLinks[proof.id].map((topicTitle: string, idx: number) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2 py-1 theme-bg-purple-accent theme-text-purple text-xs rounded border border-purple-500/30"
                  >
                    {topicTitle}
                    <button
                      onClick={() => handleUnlinkTopic(topicTitle)}
                      className="hover-text-red-400 transition-colors"
                    >
                      x
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Botão Remover */}
        <button
          onClick={handleDelete}
          className="p-2 rounded-lg hover-delete-proof"
        >
          <Trash2 className="w-4 h-4 text-red-400" />
        </button>
      </div>
    </div>
  );
});

ProofCard.displayName = 'ProofCard';
