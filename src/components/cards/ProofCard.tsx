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
import { FileText, Sparkles, AlertCircle, Loader2, Check, Scale, Trash2 } from 'lucide-react';
import { ProcessingModeSelector } from '../ui/ProcessingModeSelector';
import { anonymizeText } from '../../utils/text';
import type { ProofCardProps, ProcessingMode } from '../../types';

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

          {/* Botão: Analisar com IA */}
          <div className="mt-3">
            <button
              onClick={handleAnalyze}
              disabled={proofManager.isAnalyzingProof(String(proof.id)) || (anonymizationEnabled && isPdf && !proofManager.extractedProofTexts[proof.id]) || (anonymizationEnabled && isPdf && proofManager.proofUsePdfMode[proof.id])}
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

          {/* Resultado da Análise */}
          {proofManager.proofAnalysisResults[proof.id] && (
            <div className="mt-3 theme-info-box">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-3 h-3 text-blue-400" />
                <span className="text-xs font-medium theme-text-blue">
                  Análise {proofManager.proofAnalysisResults[proof.id].type === 'livre' ? 'Livre' : 'Contextual'}
                </span>
              </div>
              <div className="overflow-y-auto" style={{ resize: 'vertical', height: '16rem', minHeight: '10rem', maxHeight: '40rem' }}>
                <p className="text-xs theme-text-tertiary whitespace-pre-wrap">
                  {proofManager.proofAnalysisResults[proof.id].result}
                </p>
              </div>
            </div>
          )}

          {/* Conclusões Manuais */}
          <div className="mt-3">
            <label className="block text-xs font-medium theme-text-muted mb-2">
              Minhas Conclusões:
            </label>
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
