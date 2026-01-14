/**
 * @file useDocumentAnalysis.ts
 * @description Hook para análise de documentos (petição, contestação, complementares)
 * @version 1.36.73
 *
 * Extraido do App.tsx linhas ~7451-8521
 * Funções: handleAnalyzeDocuments, handleAnonymizationConfirm, analyzeDocuments,
 *          handleCurationConfirm, handleCurationCancel
 */

import { useState, useCallback } from 'react';
import { useUIStore } from '../stores/useUIStore';
import { anonymizeText, normalizeHTMLSpacing } from '../utils/text';
import { AI_PROMPTS } from '../prompts';
import type {
  AIMessage,
  AIMessageContent,
  Topic,
  TopicCategory,
  PartesProcesso,
  ExtractedTexts,
  AnalyzedDocuments,
  UploadedFile,
  PastedText,
  DocumentProcessingModes,
  AISettings,
  TopicoComplementar,
  AIProvider,
} from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

/** Tipo para item de texto extraido */
interface ExtractedTextItem {
  id: string;
  text: string;
  name: string;
}

/** Tipo para item do content array */
interface ContentArrayItem {
  type: 'text' | 'document';
  text?: string;
  source?: {
    type: 'base64';
    media_type: 'application/pdf';
    data: string;
  };
  cache_control?: { type: 'ephemeral' };
}

/** Dados de curadoria pendentes */
export interface CurationData {
  topics: Topic[];
  partes: { reclamante: string; reclamadas: string[] };
  relatórioContentArray: AIMessageContent[];
  documents: {
    peticoesText: ExtractedTextItem[];
    contestacoesText: ExtractedTextItem[];
    complementaresText: ExtractedTextItem[];
    peticoesBase64: string[];
    contestaçõesBase64: string[];
    complementaryBase64: string[];
    contestaçõesExtraidasDePDF: ExtractedTextItem[];
    contestaçõesJaColadas: ExtractedTextItem[];
    complementaresExtraidasDePDF: ExtractedTextItem[];
    complementaresJaColadas: ExtractedTextItem[];
    peticoesExtraidasDePDF: ExtractedTextItem[];
    peticoesJaColadas: ExtractedTextItem[];
  };
}

/** Interface para servicos de documento */
export interface DocumentServicesForAnalysis {
  extractTextFromPDFPure: (file: File, onProgress?: (current: number, total: number) => void) => Promise<string | null>;
  extractTextFromPDFWithClaudeVision: (file: File, onProgress?: (current: number, total: number) => void) => Promise<string | null>;
  extractTextFromPDFWithTesseract: (file: File, onProgress?: (current: number, total: number, status?: string) => void) => Promise<string | null>;
}

/** Interface para storage */
export interface StorageForAnalysis {
  fileToBase64: (file: File) => Promise<string>;
}

/** Interface para AI Integration */
export interface AIIntegrationForAnalysis {
  aiSettings: AISettings;
  setAiSettings: (fn: (prev: AISettings) => AISettings) => void;
  callAI: (messages: AIMessage[], options?: {
    maxTokens?: number;
    useInstructions?: boolean;
    extractText?: boolean;
    temperature?: number;
    topP?: number;
    topK?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) => Promise<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  extractResponseText: (data: any, provider: AIProvider) => string;
  performDoubleCheck?: (
    operation: 'topicExtraction' | 'dispositivo' | 'sentenceReview' | 'factsComparison',
    originalResponse: string,
    context: string,
    setProgress?: (msg: string) => void
  ) => Promise<{ verified: string; corrections: { type: string; reason: string }[]; summary: string }>;
}

/** Props do hook */
export interface UseDocumentAnalysisProps {
  aiIntegration: AIIntegrationForAnalysis;
  documentServices: DocumentServicesForAnalysis;
  storage: StorageForAnalysis;
  // Estados dos documentos
  peticaoFiles: UploadedFile[];
  pastedPeticaoTexts: PastedText[];
  contestacaoFiles: UploadedFile[];
  pastedContestacaoTexts: PastedText[];
  complementaryFiles: UploadedFile[];
  pastedComplementaryTexts: PastedText[];
  documentProcessingModes: DocumentProcessingModes;
  // Setters
  setExtractedTopics: (topics: Topic[]) => void;
  setSelectedTopics: (topics: Topic[]) => void;
  setPartesProcesso: (partes: PartesProcesso) => void;
  setExtractedTexts: (texts: ExtractedTexts) => void;
  setAnalyzedDocuments: (docs: AnalyzedDocuments) => void;
  setPeticaoFiles: (files: UploadedFile[]) => void;
  setContestacaoFiles: (files: UploadedFile[]) => void;
  setComplementaryFiles: (files: UploadedFile[]) => void;
  setActiveTab: (tab: string) => void;
  setError: (error: string) => void;
  // Funcoes auxiliares
  showToast: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  generateRelatorioProcessual: (content: AIMessageContent[]) => Promise<string>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  generateMiniReportsBatch: (
    topics: any[],
    options?: {
      batchSize?: number;
      delayBetweenBatches?: number;
      onProgress?: ((current: number, total: number, batchNum: number, totalBatches: number) => void) | null;
    }
  ) => Promise<{
    results: Array<{ title: string; relatorio?: string }>;
    errors: Array<{ title: string; error?: string }>;
  }>;
  reorderTopicsViaLLM: (topics: Topic[]) => Promise<Topic[]>;
}

/** Retorno do hook */
export interface UseDocumentAnalysisReturn {
  // Estados
  analyzing: boolean;
  analysisProgress: string;
  showAnonymizationModal: boolean;
  showTopicCurationModal: boolean;
  pendingCurationData: CurationData | null;
  // Handlers
  handleAnalyzeDocuments: () => void;
  handleAnonymizationConfirm: (nomes: string[]) => void;
  handleCurationConfirm: (curatedTopics: Topic[]) => Promise<void>;
  handleCurationCancel: () => void;
  // Setters para controle externo
  setShowAnonymizationModal: (show: boolean) => void;
  setShowTopicCurationModal: (show: boolean) => void;
  setAnalyzing: (analyzing: boolean) => void;
  setAnalysisProgress: (progress: string) => void;
  setPendingCurationData: (data: CurationData | null) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export const useDocumentAnalysis = (props: UseDocumentAnalysisProps): UseDocumentAnalysisReturn => {
  const {
    aiIntegration,
    documentServices,
    storage,
    peticaoFiles,
    pastedPeticaoTexts,
    contestacaoFiles,
    pastedContestacaoTexts,
    complementaryFiles,
    pastedComplementaryTexts,
    documentProcessingModes,
    setExtractedTopics,
    setSelectedTopics,
    setPartesProcesso,
    setExtractedTexts,
    setAnalyzedDocuments,
    setPeticaoFiles,
    setContestacaoFiles,
    setComplementaryFiles,
    setActiveTab,
    setError,
    showToast,
    generateRelatorioProcessual,
    generateMiniReportsBatch,
    reorderTopicsViaLLM,
  } = props;

  // Estados locais
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState('');
  const [showAnonymizationModal, setShowAnonymizationModal] = useState(false);
  const [showTopicCurationModal, setShowTopicCurationModal] = useState(false);
  const [pendingCurationData, setPendingCurationData] = useState<CurationData | null>(null);

  // Store de modais
  const { openModal, closeModal } = useUIStore();

  // ═══════════════════════════════════════════════════════════════════════════
  // FUNCAO PRINCIPAL DE ANALISE
  // ═══════════════════════════════════════════════════════════════════════════

  const analyzeDocuments = useCallback(async (nomesParaAnonimizar: string[] = []) => {
    if (peticaoFiles.length === 0 && pastedPeticaoTexts.length === 0) {
      setError('Por favor, faça upload da petição inicial ou cole o texto');
      return;
    }

    setAnalyzing(true);
    openModal('analysis');
    setError('');
    await new Promise(resolve => setTimeout(resolve, 100)); // Aguardar modal abrir

    try {
      // Processamento por modo individual (nãomais global)
      let contentArray: ContentArrayItem[] = [];
      const extractedTextsData: { peticoes: ExtractedTextItem[]; contestacoes: ExtractedTextItem[]; complementares: ExtractedTextItem[] } = {
        peticoes: [],
        contestacoes: [],
        complementares: []
      };
      const peticoesBase64: string[] = [];
      const peticoesTextFinal: ExtractedTextItem[] = [];

      // Obter configuração global de OCR
      const globalOcrEngine = aiIntegration.aiSettings?.ocrEngine;
      const anonConfig = aiIntegration.aiSettings?.anonymization;
      const anonymizationEnabled = anonConfig?.enabled;
      const blockedModes = ['claude-vision', 'pdf-puro'];

      const getEffectiveMode = (docMode: string | undefined) => {
        if (anonymizationEnabled && docMode && blockedModes.includes(docMode)) return 'pdfjs';
        return docMode || globalOcrEngine || 'pdfjs';
      };

      const maybeAnonymize = (text: string) =>
        anonymizationEnabled ? anonymizeText(text, anonConfig, nomesParaAnonimizar) : text;

      // === PROCESSAR PETICOES (MULTIPLAS) ===
      if (peticaoFiles.length > 0) {
        for (let i = 0; i < peticaoFiles.length; i++) {
          const peticaoMode = getEffectiveMode(documentProcessingModes.peticoes?.[i]);
          const label = i === 0 ? 'Petição Inicial' : `Documento do Autor ${i + 1}`;
          setAnalysisProgress(`Processando ${label} (${i + 1}/${peticaoFiles.length}) - ${peticaoMode}...`);
          await new Promise(resolve => setTimeout(resolve, 100));

          const fileObj = peticaoFiles[i].file || (peticaoFiles[i] as unknown as File);

          if (peticaoMode === 'pdf-puro') {
            const base64 = await storage.fileToBase64(fileObj);
            peticoesBase64.push(base64);
            contentArray.push({ type: 'text', text: `${label.toUpperCase()} (documento PDF a seguir):` });
            contentArray.push({
              type: 'document',
              source: { type: 'base64', media_type: 'application/pdf', data: base64 },
              cache_control: base64.length > 100000 ? { type: 'ephemeral' } : undefined
            });
          } else {
            try {
              let extractedText: string | null = null;

              if (peticaoMode === 'pdfjs') {
                extractedText = await documentServices.extractTextFromPDFPure(fileObj, (current: number, total: number) => {
                  setAnalysisProgress(`${label} (PDF.js) - página ${current}/${total}...`);
                });
              } else if (peticaoMode === 'claude-vision') {
                extractedText = await documentServices.extractTextFromPDFWithClaudeVision(fileObj, (current: number, total: number) => {
                  setAnalysisProgress(`${label} (Claude Vision) - página ${current}/${total}...`);
                });
              } else if (peticaoMode === 'tesseract') {
                extractedText = await documentServices.extractTextFromPDFWithTesseract(fileObj, (current: number, total: number, status?: string) => {
                  setAnalysisProgress(`${label} (Tesseract) - página ${current}/${total} ${status || ''}`);
                });
              } else {
                console.warn(`[analyzeDocuments] Modo desconhecido '${peticaoMode}', usando PDF.js`);
                extractedText = await documentServices.extractTextFromPDFPure(fileObj, (current: number, total: number) => {
                  setAnalysisProgress(`${label} (PDF.js) - página ${current}/${total}...`);
                });
              }

              if (extractedText && extractedText.length > 100) {
                const anonText = maybeAnonymize(extractedText);
                const extractedItem = { id: crypto.randomUUID(), text: anonText, name: label };
                extractedTextsData.peticoes[i] = extractedItem;
                peticoesTextFinal.push(extractedItem);
                contentArray.push({
                  type: 'text',
                  text: `${label.toUpperCase()}:\n\n${anonText}`,
                  cache_control: anonText.length > 2000 ? { type: 'ephemeral' } : undefined
                });
              } else {
                if (anonymizationEnabled) {
                  console.warn(`[analyzeDocuments] Extração falhou em ${label}, PDF bloqueado (anonimização ativa)`);
                  showToast(`Nao foi possível extrair texto de ${label}. Com anonimização ativa, PDF binario nãopode ser usado.`, 'error');
                } else {
                  console.warn(`[analyzeDocuments] Extração falhou em ${label}, usando PDF puro`);
                  const base64 = await storage.fileToBase64(fileObj);
                  peticoesBase64.push(base64);
                  contentArray.push({ type: 'text', text: `${label.toUpperCase()} (documento PDF a seguir):` });
                  contentArray.push({
                    type: 'document',
                    source: { type: 'base64', media_type: 'application/pdf', data: base64 }
                  });
                }
              }
            } catch (extractErr) {
              if (anonymizationEnabled) {
                console.warn(`[analyzeDocuments] Erro na extração de ${label}, PDF bloqueado (anonimização ativa)`);
              } else {
                const base64 = await storage.fileToBase64(fileObj);
                peticoesBase64.push(base64);
                contentArray.push({ type: 'text', text: `${label.toUpperCase()} (documento PDF a seguir):` });
                contentArray.push({
                  type: 'document',
                  source: { type: 'base64', media_type: 'application/pdf', data: base64 }
                });
              }
            }
          }
        }
      }

      // Textos colados de petição
      pastedPeticaoTexts.forEach((pastedItem) => {
        const anonPasted = maybeAnonymize(pastedItem.text);
        peticoesTextFinal.push({ id: pastedItem.id || crypto.randomUUID(), text: anonPasted, name: pastedItem.name });
        contentArray.push({
          type: 'text',
          text: `${pastedItem.name.toUpperCase()}:\n\n${anonPasted}`,
          cache_control: anonPasted.length > 2000 ? { type: 'ephemeral' } : undefined
        });
      });

      // === PROCESSAR CONTESTACOES ===
      const totalContestacoes = contestacaoFiles.length + pastedContestacaoTexts.length;
      const contestaçõesBase64: string[] = [];
      const contestacoesTextFinal: ExtractedTextItem[] = [];

      if (contestacaoFiles.length > 0) {
        for (let i = 0; i < contestacaoFiles.length; i++) {
          const mode = getEffectiveMode(documentProcessingModes.contestacoes?.[i]);
          setAnalysisProgress(`Processando contestação ${i + 1}/${contestacaoFiles.length} (${mode})...`);
          await new Promise(resolve => setTimeout(resolve, 100));

          const fileObj = contestacaoFiles[i].file || (contestacaoFiles[i] as unknown as File);

          if (mode === 'pdf-puro') {
            const base64 = await storage.fileToBase64(fileObj);
            contestaçõesBase64.push(base64);
            contentArray.push({ type: 'text', text: `CONTESTAÇÃO ${i + 1} (documento PDF a seguir):` });
            contentArray.push({
              type: 'document',
              source: { type: 'base64', media_type: 'application/pdf', data: base64 }
            });
          } else {
            try {
              let extractedText: string | null = null;

              if (mode === 'pdfjs') {
                extractedText = await documentServices.extractTextFromPDFPure(fileObj, (current: number, total: number) => {
                  setAnalysisProgress(`Contestação ${i + 1} (PDF.js) - página ${current}/${total}...`);
                });
              } else if (mode === 'claude-vision') {
                extractedText = await documentServices.extractTextFromPDFWithClaudeVision(fileObj, (current: number, total: number) => {
                  setAnalysisProgress(`Contestação ${i + 1} (Claude Vision) - página ${current}/${total}...`);
                });
              } else if (mode === 'tesseract') {
                extractedText = await documentServices.extractTextFromPDFWithTesseract(fileObj, (current: number, total: number, status?: string) => {
                  setAnalysisProgress(`Contestação ${i + 1} (Tesseract) - página ${current}/${total} ${status || ''}`);
                });
              } else {
                console.warn(`[analyzeDocuments] Contestação - modo desconhecido '${mode}', usando PDF.js`);
                extractedText = await documentServices.extractTextFromPDFPure(fileObj, (current: number, total: number) => {
                  setAnalysisProgress(`Contestação ${i + 1} (PDF.js) - página ${current}/${total}...`);
                });
              }

              if (extractedText && extractedText.length > 100) {
                const anonText = maybeAnonymize(extractedText);
                const extractedItem = { id: crypto.randomUUID(), text: anonText, name: `Contestação ${i + 1}` };
                extractedTextsData.contestacoes[i] = extractedItem;
                contestacoesTextFinal.push(extractedItem);
                contentArray.push({
                  type: 'text',
                  text: `CONTESTAÇÃO ${i + 1}:\n\n${anonText}`
                });
              } else {
                if (anonymizationEnabled) {
                  showToast(`Nao foi possível extrair texto da contestação ${i + 1}. PDF bloqueado (anonimização ativa).`, 'error');
                } else {
                  showToast(`Texto insuficiente na contestação ${i + 1}. Usando documento original.`, 'warning');
                  const base64 = await storage.fileToBase64(fileObj);
                  contestaçõesBase64.push(base64);
                  contentArray.push({ type: 'text', text: `CONTESTAÇÃO ${i + 1} (documento PDF a seguir):` });
                  contentArray.push({
                    type: 'document',
                    source: { type: 'base64', media_type: 'application/pdf', data: base64 }
                  });
                }
              }
            } catch (extractErr) {
              if (anonymizationEnabled) {
                showToast(`Erro ao extrair texto da contestação ${i + 1}. PDF bloqueado (anonimização ativa).`, 'error');
              } else {
                const base64 = await storage.fileToBase64(fileObj);
                contestaçõesBase64.push(base64);
                contentArray.push({ type: 'text', text: `CONTESTAÇÃO ${i + 1} (documento PDF a seguir):` });
                contentArray.push({
                  type: 'document',
                  source: { type: 'base64', media_type: 'application/pdf', data: base64 }
                });
              }
            }
          }
        }
      }

      // Contestações coladas como texto
      pastedContestacaoTexts.forEach((contestação, index) => {
        const anonText = maybeAnonymize(contestação.text);
        contestacoesTextFinal.push({ ...contestação, text: anonText });
        contentArray.push({
          type: 'text',
          text: `CONTESTAÇÃO ${index + 1 + contestacaoFiles.length}:\n\n${anonText}`
        });
      });

      // === PROCESSAR DOCUMENTOS COMPLEMENTARES ===
      const totalComplementares = complementaryFiles.length + pastedComplementaryTexts.length;
      const complementaryBase64: string[] = [];
      const complementaresTextFinal: ExtractedTextItem[] = [];

      if (complementaryFiles.length > 0) {
        for (let i = 0; i < complementaryFiles.length; i++) {
          const mode = getEffectiveMode(documentProcessingModes.complementares?.[i]);
          setAnalysisProgress(`Processando complementar ${i + 1}/${complementaryFiles.length} (${mode})...`);
          await new Promise(resolve => setTimeout(resolve, 100));

          const fileObj = complementaryFiles[i].file || (complementaryFiles[i] as unknown as File);

          if (mode === 'pdf-puro') {
            const base64 = await storage.fileToBase64(fileObj);
            complementaryBase64.push(base64);
            contentArray.push({ type: 'text', text: `DOCUMENTO COMPLEMENTAR ${i + 1} (documento PDF a seguir):` });
            contentArray.push({
              type: 'document',
              source: { type: 'base64', media_type: 'application/pdf', data: base64 }
            });
          } else {
            try {
              let extractedText: string | null = null;

              if (mode === 'pdfjs') {
                extractedText = await documentServices.extractTextFromPDFPure(fileObj, (current: number, total: number) => {
                  setAnalysisProgress(`Complementar ${i + 1} (PDF.js) - página ${current}/${total}...`);
                });
              } else if (mode === 'claude-vision') {
                extractedText = await documentServices.extractTextFromPDFWithClaudeVision(fileObj, (current: number, total: number) => {
                  setAnalysisProgress(`Complementar ${i + 1} (Claude Vision) - página ${current}/${total}...`);
                });
              } else if (mode === 'tesseract') {
                extractedText = await documentServices.extractTextFromPDFWithTesseract(fileObj, (current: number, total: number, status?: string) => {
                  setAnalysisProgress(`Complementar ${i + 1} (Tesseract) - página ${current}/${total} ${status || ''}`);
                });
              } else {
                console.warn(`[analyzeDocuments] Complementar - modo desconhecido '${mode}', usando PDF.js`);
                extractedText = await documentServices.extractTextFromPDFPure(fileObj, (current: number, total: number) => {
                  setAnalysisProgress(`Complementar ${i + 1} (PDF.js) - página ${current}/${total}...`);
                });
              }

              if (extractedText && extractedText.length > 100) {
                const anonText = maybeAnonymize(extractedText);
                const extractedItem = { id: crypto.randomUUID(), text: anonText, name: `Complementar ${i + 1}` };
                extractedTextsData.complementares[i] = extractedItem;
                complementaresTextFinal.push(extractedItem);
                contentArray.push({
                  type: 'text',
                  text: `DOCUMENTO COMPLEMENTAR ${i + 1}:\n\n${anonText}`
                });
              } else {
                if (anonymizationEnabled) {
                  showToast(`Nao foi possível extrair texto do complementar ${i + 1}. PDF bloqueado (anonimização ativa).`, 'error');
                } else {
                  showToast(`Texto insuficiente no documento complementar ${i + 1}. Usando original.`, 'warning');
                  const base64 = await storage.fileToBase64(fileObj);
                  complementaryBase64.push(base64);
                  contentArray.push({ type: 'text', text: `DOCUMENTO COMPLEMENTAR ${i + 1} (documento PDF a seguir):` });
                  contentArray.push({
                    type: 'document',
                    source: { type: 'base64', media_type: 'application/pdf', data: base64 }
                  });
                }
              }
            } catch (extractErr) {
              if (anonymizationEnabled) {
                showToast(`Erro ao extrair texto do complementar ${i + 1}. PDF bloqueado (anonimização ativa).`, 'error');
              } else {
                const base64 = await storage.fileToBase64(fileObj);
                complementaryBase64.push(base64);
                contentArray.push({ type: 'text', text: `DOCUMENTO COMPLEMENTAR ${i + 1} (documento PDF a seguir):` });
                contentArray.push({
                  type: 'document',
                  source: { type: 'base64', media_type: 'application/pdf', data: base64 }
                });
              }
            }
          }
        }
      }

      // Salvar textos extraidos no estado para persistencia
      setExtractedTexts(extractedTextsData);

      // Documentos complementares colados como texto
      pastedComplementaryTexts.forEach((doc, index) => {
        const anonText = maybeAnonymize(doc.text);
        complementaresTextFinal.push({ ...doc, text: anonText });
        contentArray.push({
          type: 'text',
          text: `DOCUMENTO COMPLEMENTAR ${index + 1 + complementaryFiles.length}:\n\n${anonText}`
        });
      });

      setAnalysisProgress('Enviando documentos para análise com IA...');
      await new Promise(resolve => setTimeout(resolve, 500));

      // Construir prompt de análise
      contentArray.push({
        type: 'text',
        text: buildAnalysisPrompt(totalContestacoes, totalComplementares, aiIntegration.aiSettings)
      });

      const messages: AIMessage[] = [
        {
          role: 'user' as const,
          content: contentArray as AIMessageContent[]
        }
      ];

      setAnalysisProgress('Aguardando análise da IA (isso pode levar alguns minutos)...');

      // Chamar IA com parametros para análise critica
      const data = await aiIntegration.callAI(messages, {
        maxTokens: 16000,
        useInstructions: true,
        extractText: false,
        temperature: 0.2,
        topP: 0.85,
        topK: 40
      });

      // Verificar se a resposta foi truncada por limite de tokens
      const provider = aiIntegration.aiSettings.provider || 'claude';
      const isTruncated = provider === 'gemini'
        ? data.candidates?.[0]?.finishReason === 'MAX_TOKENS'
        : data.stop_reason === 'max_tokens';

      if (isTruncated) {
        throw new Error('O documento e muito extenso e a análise foi truncada. Tente: 1) Dividir o PDF em partes menores, 2) Usar documentos com menos páginas, ou 3) Colar apenas trechos relevantes do texto.');
      }

      const textContent = aiIntegration.extractResponseText(data, provider);

      if (!textContent) {
        throw new Error('Nenhum conteúdo de texto encontrado na resposta da API');
      }

      setAnalysisProgress('Extraindo tópicos identificados...');
      await new Promise(resolve => setTimeout(resolve, 300));

      // Limpar markdown e espacos
      let cleanText = textContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      let parsed;
      try {
        parsed = JSON.parse(cleanText);
      } catch (parseError) {
        const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            parsed = JSON.parse(jsonMatch[0]);
          } catch (matchError) {
            let fixedText = jsonMatch[0];
            const lastQuote = fixedText.lastIndexOf('"');
            const lastBrace = fixedText.lastIndexOf('}');

            if (lastQuote > lastBrace) {
              fixedText = fixedText.substring(0, lastQuote + 1) + '"}]}';
              try {
                parsed = JSON.parse(fixedText);
              } catch (fixError) {
                throw new Error(`Erro ao parsear resposta da IA. Resposta pode estar incompleta ou mal formatada. Detalhes: ${(parseError as Error).message}`);
              }
            } else {
              throw new Error(`Erro ao parsear resposta da IA. Resposta pode estar incompleta ou mal formatada. Detalhes: ${(parseError as Error).message}`);
            }
          }
        } else {
          throw new Error(`Nao foi possível encontrar JSON válido na resposta da IA. Detalhes: ${(parseError as Error).message}`);
        }
      }

      let topics = parsed.topics || [];

      // Double Check - Verificação secundaria da extração de tópicos
      if (aiIntegration.aiSettings.doubleCheck?.enabled &&
          aiIntegration.aiSettings.doubleCheck?.operations.topicExtraction &&
          aiIntegration.performDoubleCheck) {

        setAnalysisProgress('Verificando extração com Double Check...');
        await new Promise(resolve => setTimeout(resolve, 300));

        // Reconstruir contexto dos documentos para verificação
        const contextParts: string[] = [];
        peticoesTextFinal.forEach((doc, idx) => {
          contextParts.push(`PETIÇÃO ${idx + 1}:\n${doc.text?.substring(0, 3000) || ''}`);
        });
        contestacoesTextFinal.forEach((doc, idx) => {
          contextParts.push(`CONTESTAÇÃO ${idx + 1}:\n${doc.text?.substring(0, 3000) || ''}`);
        });
        pastedPeticaoTexts.forEach((doc, idx) => {
          contextParts.push(`PETIÇÃO COLADA ${idx + 1}:\n${doc.text?.substring(0, 3000) || ''}`);
        });
        pastedContestacaoTexts.forEach((doc, idx) => {
          contextParts.push(`CONTESTAÇÃO COLADA ${idx + 1}:\n${doc.text?.substring(0, 3000) || ''}`);
        });

        const documentContext = contextParts.join('\n\n---\n\n');

        try {
          const { verified, corrections, summary } = await aiIntegration.performDoubleCheck(
            'topicExtraction',
            JSON.stringify(topics),
            documentContext,
            setAnalysisProgress
          );

          if (corrections.length > 0) {
            const verifiedTopics = JSON.parse(verified);
            topics = verifiedTopics;
            showToast(`Double Check: ${corrections.length} correção(oes) - ${summary}`, 'info');
            console.log('[DoubleCheck] Correções aplicadas:', corrections);
          } else {
            console.log('[DoubleCheck] Nenhuma correção necessária');
          }
        } catch (dcError) {
          console.error('[DoubleCheck] Erro na verificação:', dcError);
        }
      }

      // Armazenar informações das partes se disponíveis
      if (parsed.partes) {
        setPartesProcesso({
          reclamante: parsed.partes.reclamante || '',
          reclamadas: parsed.partes.reclamadas || []
        });
      }

      // Reordenar tópicos via LLM
      setAnalysisProgress('Ordenando tópicos por categoria processual...');
      await new Promise(resolve => setTimeout(resolve, 300));
      topics = await reorderTopicsViaLLM(topics);

      setAnalysisProgress(`${topics.length} tópico${topics.length !== 1 ? 's' : ''} identificado${topics.length !== 1 ? 's' : ''}! Revisando...`);
      await new Promise(resolve => setTimeout(resolve, 300));

      // Preparar contentArray para o relatório (seráusado apos confirmação)
      const relatórioContentArray: AIMessageContent[] = [];

      // Usar textos extraidos de peticoes se disponíveis
      if (peticoesTextFinal.length > 0) {
        peticoesTextFinal.forEach((doc, idx) => {
          relatórioContentArray.push({
            type: 'text' as const,
            text: `${doc.name?.toUpperCase() || `PETIÇÃO ${idx + 1}`}:\n\n${doc.text}`
          });
        });
      }
      if (peticoesBase64.length > 0) {
        peticoesBase64.forEach((base64) => {
          relatórioContentArray.push({
            type: 'document' as const,
            source: { type: 'base64' as const, media_type: 'application/pdf' as const, data: base64 }
          });
        });
      }

      // Adicionar contestações
      contestacoesTextFinal.forEach((contestação, index) => {
        relatórioContentArray.push({
          type: 'text' as const,
          text: `CONTESTAÇÃO ${index + 1}:\n\n${contestação.text}`
        });
      });
      contestaçõesBase64.forEach((base64) => {
        relatórioContentArray.push({
          type: 'document' as const,
          source: { type: 'base64' as const, media_type: 'application/pdf' as const, data: base64 }
        });
      });

      // Adicionar documentos complementares
      complementaresTextFinal.forEach((doc, index) => {
        relatórioContentArray.push({
          type: 'text' as const,
          text: `DOCUMENTO COMPLEMENTAR ${index + 1}:\n\n${doc.text}`
        });
      });
      complementaryBase64.forEach((base64) => {
        relatórioContentArray.push({
          type: 'document' as const,
          source: { type: 'base64' as const, media_type: 'application/pdf' as const, data: base64 }
        });
      });

      // Separar textos extraidos de PDFs dos textos jácolados
      const contestaçõesExtraidasDePDF = contestacoesTextFinal.filter(c =>
        !pastedContestacaoTexts.some(p => p.text === c.text)
      );
      const contestaçõesJaColadas = contestacoesTextFinal.filter(c =>
        pastedContestacaoTexts.some(p => p.text === c.text)
      );

      const complementaresExtraidasDePDF = complementaresTextFinal.filter(c =>
        !pastedComplementaryTexts.some(p => p.text === c.text)
      );
      const complementaresJaColadas = complementaresTextFinal.filter(c =>
        pastedComplementaryTexts.some(p => p.text === c.text)
      );

      const peticoesExtraidasDePDF = peticoesTextFinal.filter(p =>
        !pastedPeticaoTexts.some(pt => pt.text === p.text)
      );
      const peticoesJaColadas = peticoesTextFinal.filter(p =>
        pastedPeticaoTexts.some(pt => pt.text === p.text)
      );

      // Preparar dados para o modal de curadoria
      const curationData: CurationData = {
        topics: topics,
        partes: parsed.partes || { reclamante: '', reclamadas: [] },
        relatórioContentArray: relatórioContentArray,
        documents: {
          peticoesText: peticoesTextFinal,
          contestacoesText: contestacoesTextFinal,
          complementaresText: complementaresTextFinal,
          peticoesBase64,
          contestaçõesBase64,
          complementaryBase64,
          contestaçõesExtraidasDePDF,
          contestaçõesJaColadas,
          complementaresExtraidasDePDF,
          complementaresJaColadas,
          peticoesExtraidasDePDF,
          peticoesJaColadas
        }
      };

      // Salvar dados e abrir modal de curadoria
      setPendingCurationData(curationData);
      setShowTopicCurationModal(true);
      setAnalyzing(false);
      setAnalysisProgress('');

      // PAUSA: O fluxo continua em handleCurationConfirm() após o usuário confirmar

    } catch (err) {
      setError('Erro ao analisar documentos: ' + (err as Error).message);
      closeModal('analysis');
      setAnalyzing(false);
    }
  }, [
    peticaoFiles,
    pastedPeticaoTexts,
    contestacaoFiles,
    pastedContestacaoTexts,
    complementaryFiles,
    pastedComplementaryTexts,
    documentProcessingModes,
    aiIntegration,
    documentServices,
    storage,
    setExtractedTexts,
    setPartesProcesso,
    setError,
    showToast,
    reorderTopicsViaLLM,
    openModal,
    closeModal,
  ]);

  // ═══════════════════════════════════════════════════════════════════════════
  // WRAPPER QUE MOSTRA MODAL DE NOMES
  // ═══════════════════════════════════════════════════════════════════════════

  const handleAnalyzeDocuments = useCallback(() => {
    if (peticaoFiles.length === 0 && pastedPeticaoTexts.length === 0) {
      setError('Por favor, faça upload da petição inicial ou cole o texto');
      return;
    }

    const anonConfig = aiIntegration.aiSettings?.anonymization;
    if (anonConfig?.enabled) {
      setShowAnonymizationModal(true);
    } else {
      analyzeDocuments([]);
    }
  }, [peticaoFiles, pastedPeticaoTexts, aiIntegration.aiSettings, setError, analyzeDocuments]);

  // ═══════════════════════════════════════════════════════════════════════════
  // CALLBACK DO MODAL DE ANONIMIZACAO
  // ═══════════════════════════════════════════════════════════════════════════

  const handleAnonymizationConfirm = useCallback((nomes: string[]) => {
    aiIntegration.setAiSettings(prev => ({
      ...prev,
      anonymization: {
        ...prev.anonymization,
        nomesUsuario: nomes
      }
    }));
    setShowAnonymizationModal(false);
    analyzeDocuments(nomes);
  }, [aiIntegration, analyzeDocuments]);

  // ═══════════════════════════════════════════════════════════════════════════
  // CONTINUA APOS CURADORIA DE TOPICOS
  // ═══════════════════════════════════════════════════════════════════════════

  const handleCurationConfirm = useCallback(async (curatedTopics: Topic[]) => {
    if (!pendingCurationData) {
      console.error('[handleCurationConfirm] pendingCurationData is null');
      return;
    }

    try {
      setShowTopicCurationModal(false);
      setAnalyzing(true);
      openModal('analysis');

      const { relatórioContentArray, documents, partes } = pendingCurationData;

      // Gerar relatório processual
      setAnalysisProgress('Gerando relatório processual...');
      await new Promise(resolve => setTimeout(resolve, 300));

      const relatórioProcessual = await generateRelatorioProcessual(relatórioContentArray);
      const relatórioHtml = normalizeHTMLSpacing(relatórioProcessual.trim());

      // Buscar tópicos complementares configurados pelo usuário
      const topicosComplementaresConfig = aiIntegration.aiSettings?.topicosComplementares || [];
      const topicosComplementaresAtivos = topicosComplementaresConfig
        .filter((t: TopicoComplementar) => t.enabled)
        .sort((a: TopicoComplementar, b: TopicoComplementar) => a.ordem - b.ordem);

      // Gerar tópicos complementares baseados na configuração
      const topicosComplementares = topicosComplementaresAtivos.map((config: TopicoComplementar, idx: number) => ({
        title: config.title,
        category: config.category,
        relatorio: config.descricao || '',
        editedContent: '',
        order: curatedTopics.length + idx + 1,
        isComplementar: true
      }));

      // Filtrar tópicos para remover qualquer "RELATÓRIO" que possa ter sido incluído
      const topicsSemRelatorio = curatedTopics.filter((topic: Topic) =>
        !topic.title || topic.title.toUpperCase() !== 'RELATÓRIO'
      );

      // Construir objeto de documentos
      const documentsForBatch = {
        peticoes: documents.peticoesBase64,
        peticoesText: [...documents.peticoesExtraidasDePDF, ...documents.peticoesJaColadas],
        contestacoes: documents.contestaçõesBase64,
        contestacoesText: [...documents.contestaçõesExtraidasDePDF, ...documents.contestaçõesJaColadas],
        complementares: documents.complementaryBase64,
        complementaresText: [...documents.complementaresExtraidasDePDF, ...documents.complementaresJaColadas]
      };

      // Salvar no estado
      setAnalyzedDocuments(documentsForBatch);

      // Gerar mini-relatórios em batches
      let topicsComRelatorios = topicsSemRelatorio;

      if (topicsSemRelatorio.length > 0) {
        setAnalysisProgress(`Gerando mini-relatórios... 0/${topicsSemRelatorio.length}`);

        const { results, errors } = await generateMiniReportsBatch(
          topicsSemRelatorio.map((t: Topic) => ({
            title: t.title,
            category: t.category,
            isInitialGeneration: true,
            includeComplementares: false,
            documentsOverride: documentsForBatch
          })),
          {
            batchSize: aiIntegration.aiSettings.parallelRequests || 5,
            delayBetweenBatches: 1000,
            onProgress: (current: number, total: number, batchNum: number, totalBatches: number) => {
              setAnalysisProgress(`Gerando mini-relatórios... ${current}/${total} (Lote ${batchNum}/${totalBatches})`);
            }
          }
        );

        // Mesclar resultados com os tópicos
        topicsComRelatorios = topicsSemRelatorio.map((topic: Topic) => {
          const resultado = results.find((r: { title: string; relatorio?: string }) => r.title === topic.title);
          if (resultado && resultado.relatorio) {
            return { ...topic, relatorio: resultado.relatorio };
          }
          const erro = errors.find((e: { title: string; error?: string }) => e.title === topic.title);
          return {
            ...topic,
            relatorio: `<p>Erro ao gerar mini-relatório${erro ? `: ${erro.error}` : ''}. Use "Gerar com IA" para tentar novamente.</p>`
          };
        });

        if (errors.length > 0) {
          showToast(`${errors.length} tópico(s) falharam na geração. Você pode regenera-los individualmente.`, 'warning');
        }

        setAnalysisProgress(`Mini-relatórios gerados! ${results.length}/${topicsSemRelatorio.length} com sucesso`);
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Filtrar complementares que jáexistem nos tópicos gerados
      const títulosGeradosUpper = new Set(
        topicsComRelatorios.map((t: Topic) => (t.title || '').toUpperCase().trim())
      );
      const topicosComplementaresUnicos = topicosComplementares.filter(
        (t: { title: string }) => !títulosGeradosUpper.has((t.title || '').toUpperCase().trim())
      );

      // Montar lista final de tópicos
      const allTopics: Topic[] = [
        {
          title: 'RELATÓRIO',
          category: 'RELATÓRIO',
          relatorio: relatórioHtml,
          editedFundamentacao: relatórioHtml,
        },
        ...topicsComRelatorios.map((topic: Topic, index: number) => ({ ...topic, order: index + 1 })),
        ...topicosComplementaresUnicos
      ];

      setExtractedTopics(allTopics);

      // Selecionar apenas RELATÓRIO e os tópicos analisados
      const tópicosInicialmenteSelecionados = allTopics.filter((_, index) => index < topicsComRelatorios.length + 1);
      setSelectedTopics(tópicosInicialmenteSelecionados);

      // Atualizar partes do processo se disponíveis
      if (partes) {
        setPartesProcesso({
          reclamante: partes.reclamante || '',
          reclamadas: partes.reclamadas || []
        });
      }

      // Limpar PDFs originais apos extração
      if (documents.peticoesText?.length > 0 && peticaoFiles.length > 0) {
        setPeticaoFiles([]);
      }
      if (documents.contestaçõesExtraidasDePDF?.length > 0) {
        setContestacaoFiles([]);
      }
      if (documents.complementaresExtraidasDePDF?.length > 0) {
        setComplementaryFiles([]);
      }

      // Limpar dados pendentes
      setPendingCurationData(null);

      closeModal('analysis');
      setActiveTab('topics');
      showToast('Analise concluída com sucesso!', 'success');

    } catch (err) {
      setError('Erro ao processar tópicos: ' + (err as Error).message);
      closeModal('analysis');
    } finally {
      setAnalyzing(false);
    }
  }, [
    pendingCurationData,
    aiIntegration.aiSettings,
    peticaoFiles,
    generateRelatorioProcessual,
    generateMiniReportsBatch,
    setAnalyzedDocuments,
    setExtractedTopics,
    setSelectedTopics,
    setPartesProcesso,
    setPeticaoFiles,
    setContestacaoFiles,
    setComplementaryFiles,
    setActiveTab,
    setError,
    showToast,
    openModal,
    closeModal,
  ]);

  // ═══════════════════════════════════════════════════════════════════════════
  // CANCELA CURADORIA
  // ═══════════════════════════════════════════════════════════════════════════

  const handleCurationCancel = useCallback(() => {
    setShowTopicCurationModal(false);
    setPendingCurationData(null);
    setAnalysisProgress('');
    showToast('Analise cancelada. Você pode reiniciar quando quiser.', 'info');
  }, [showToast]);

  // ═══════════════════════════════════════════════════════════════════════════
  // RETORNO DO HOOK
  // ═══════════════════════════════════════════════════════════════════════════

  return {
    // Estados
    analyzing,
    analysisProgress,
    showAnonymizationModal,
    showTopicCurationModal,
    pendingCurationData,
    // Handlers
    handleAnalyzeDocuments,
    handleAnonymizationConfirm,
    handleCurationConfirm,
    handleCurationCancel,
    // Setters para controle externo
    setShowAnonymizationModal,
    setShowTopicCurationModal,
    setAnalyzing,
    setAnalysisProgress,
    setPendingCurationData,
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCAO AUXILIAR: CONSTRUIR PROMPT DE ANALISE
// ═══════════════════════════════════════════════════════════════════════════════

function buildAnalysisPrompt(
  totalContestacoes: number,
  totalComplementares: number,
  aiSettings: AISettings
): string {
  return `Analise a peticao inicial ${totalContestacoes > 0 ? `e as ${totalContestacoes} contestação${totalContestacoes > 1 ? 'es' : ''} fornecida${totalContestacoes > 1 ? 's' : ''}` : '(não há contestação fornecida)'}.

TOPICO OBRIGATÓRIO "RELATORIO":
Você DEVE criar um tópico especial chamado "RELATORIO" (categoria PRELIMINAR) que descreva o histórico processual.
${totalComplementares > 0 ? `Ha ${totalComplementares} documento${totalComplementares > 1 ? 's' : ''} complementar${totalComplementares > 1 ? 'es' : ''} disponível${totalComplementares > 1 ? 'eis' : ''} (atas, provas, documentos adicionais) que devem ser usados APENAS neste tópico RELATORIO.` : 'Como não há documentos complementares, base o relatório apenas nas informações da peticao inicial e contestações sobre o andamento do processo.'}

Extraia e classifique todos os tópicos/pedidos em:

1. QUESTÕES PROCESSUAIS (impugnação aos cálculos, regularidade de representação processual, impugnação aos documentos, gratuidade de justiça, etc.)
2. PRELIMINARES (prescrição, inépcia, ilegitimidade, incompetência, litispendência, coisa julgada, etc.)
3. PREJUDICIAIS (questoes que impedem análise do mérito - prescrição bienal, prescrição quinquenal, etc.)
4. MÉRITO (pedidos principais - verbas rescisórias, horas extras, danos morais, vínculo empregaticio, grupo econômico, etc.)

Para cada tópico, crie um mini-relatório em formato NARRATIVO, seguindo EXATAMENTE este modelo com PARÁGRAFOS SEPARADOS:

${aiSettings.modeloRelatorio ? `
MODELO PERSONALIZADO DO USUARIO:
${aiSettings.modeloRelatorio}

Use este modelo como referência, mas mantenha a estrutura de parágrafos separados.
` : `
MODELO PADRAO:
PRIMEIRO PARAGRAFO (alegações do autor):
"O reclamante narra [resumo dos fatos]. Sustenta [argumentos]. Indica que [situação]. Em decorrência, postula [pedido específico]."

SEGUNDO PARAGRAFO (primeira defesa):
${totalContestacoes > 0 ? '"A primeira reclamada, em defesa, alega [argumentos]. Sustenta que [posição]."' : '"Não houve apresentação de contestação."'}

${totalContestacoes > 1 ? 'TERCEIRO PARAGRAFO (segunda defesa):\n"A segunda ré, por sua vez, nega [posição]. Aduz [argumentos]."' : ''}

${totalContestacoes > 2 ? 'QUARTO PARAGRAFO (terceira defesa):\n"A terceira reclamada também contesta [argumentos]. Sustenta [posição]."' : ''}
`}

TOPICO ESPECIAL "RELATORIO" (OBRIGATÓRIO):
O tópico "RELATORIO" deve resumir o histórico processual:
${totalComplementares > 0 ?
`"A presente reclamação foi distribuída em [data se constar]. Realizou-se audiência em [data], na qual [ocorrências]. Foram juntados aos autos [documentos]. As partes apresentaram [manifestações]. O processo encontra-se [situação atual]."`
:
`"A presente reclamação foi ajuizada em [data se constar]. ${totalContestacoes > 0 ? 'Foram apresentadas contestações.' : 'Não houve apresentação de contestação.'} ${totalContestacoes > 0 ? 'As partes manifestaram-se nos autos.' : ''} O processo encontra-se em fase de sentença."`
}

${AI_PROMPTS.formatacaoParagrafos("<p>O reclamante narra...</p><p>A primeira reclamada, em defesa...</p>")}

${aiSettings.detailedMiniReports ? `NÍVEL DE DETALHE - FATOS:
Gere com alto nível de detalhe em relação aos FATOS alegados pelas partes.
A descrição fática (postulatória e defensiva) deve ter alto nível de detalhe.
` : ''}

ESTRUTURA DOS PARÁGRAFOS:
- PRIMEIRO PARAGRAFO (<p>): apenas alegações do reclamante
- PARÁGRAFOS SEGUINTES (<p>): uma defesa por parágrafo
- Use "O reclamante narra...", "Sustenta...", "Postula..."
- Para defesas use: "A primeira reclamada, em defesa...", "A segunda ré, por sua vez...", "A terceira reclamada..."
- O tópico "RELATORIO" e OBRIGATÓRIO e deve sempre ser o primeiro da lista
${totalComplementares > 0 ? '- Documentos complementares devem ser usados APENAS no tópico "RELATORIO"' : '- Como não há documentos complementares, o RELATORIO deve ser baseado apenas em peticao e contestações'}

${AI_PROMPTS.numeracaoReclamadasInicial}

IDENTIFICAÇÃO DAS PARTES:
Extraia também os nomes das partes do processo:
- Nome completo do RECLAMANTE (autor da ação)
- Nomes completos de todas as RECLAMADAS (res)

FORMATO DO TITULO DOS TOPICOS (v1.32.23):
Use o formato "PEDIDO - CAUSA DE PEDIR" quando a causa de pedir for especifica e distintiva.
Exemplos com causa especifica:
- RESCISAO INDIRETA - ASSEDIO MORAL (nãoapenas "RESCISAO INDIRETA")
- ADICIONAL DE PERICULOSIDADE - ELETRICIDADE (nãoapenas "ADICIONAL DE PERICULOSIDADE")
- HORAS EXTRAS - NULIDADE DOS CARTOES DE PONTO
- DANO MORAL - ACIDENTE DE TRABALHO
- VINCULO EMPREGATICIO - FRAUDE A CLT (PJ)
Exemplos que NÃO precisam de complemento (causa óbvia ou única):
- FERIAS, DECIMO TERCEIRO SALARIO (verbas simples)
- INEPCIA DA INICIAL, GRATUIDADE DE JUSTICA (preliminares genéricas)

Responda APENAS com um JSON válido, sem markdown, no seguinte formato:
{
  "partes": {
    "reclamante": "Nome completo do reclamante",
    "reclamadas": ["Nome da primeira reclamada", "Nome da segunda reclamada"]
  },
  "topics": [
    {
      "title": "PEDIDO - CAUSA ESPECIFICA (quando relevante)",
      "category": "QUESTÃO PROCESSUAL | PRELIMINAR | PREJUDICIAL | MÉRITO"
    }
  ]
}

IMPORTANTE: Retorne APENAS título e categoria de cada tópico. NÃO inclua o campo "relatório" - os mini-relatórios serão gerados separadamente para cada tópico.`;
}

export default useDocumentAnalysis;
