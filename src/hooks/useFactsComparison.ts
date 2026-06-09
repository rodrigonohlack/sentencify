/**
 * @file useFactsComparison.ts
 * @description Hook para gerenciar comparação de fatos (Confronto de Fatos)
 * @version v1.37.62
 *
 * Extraído do App.tsx para modularização.
 * Gerencia a geração e cache de comparações de fatos entre documentos.
 *
 * v1.37.62: Fix - usar dados reais da IA nas correções (não sobrescrever com valores fixos)
 * v1.37.59: Integração com DoubleCheckReviewModal - abre modal para revisão de correções
 */

import React, { useRef, useEffect } from 'react';
import useFactsComparisonCache from './useFactsComparisonCache';
import { useUIStore } from '../stores/useUIStore';
import { isPdfBinaryAllowed } from '../utils/manualCall';
import { parseAIResponse, extractJSON, FactsComparisonSchema } from '../schemas/ai-responses';
import {
  buildMiniRelatorioComparisonPrompt,
  buildDocumentosComparisonPrompt,
  buildPdfComparisonPrompt
} from '../prompts/facts-comparison-prompts';
import type {
  Topic,
  FactsComparisonSource,
  FactsComparisonResult,
  FactsComparisonRow,
  PastedText,
  AIMessageContent,
  AIDocumentContent,
  AnalyzedDocuments,
  DoubleCheckReviewResult,
  DoubleCheckCorrection,
  AIProvider
} from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

export interface AIIntegrationForFactsComparison {
  callAI: (
    messages: Array<{ role: string; content: AIMessageContent[] }>,
    options?: {
      maxTokens?: number;
      useInstructions?: boolean;
      temperature?: number;
      topP?: number;
      topK?: number;
    }
  ) => Promise<string>;
  callAIStream?: (
    messages: Array<{ role: string; content: AIMessageContent[] }>,
    options?: {
      maxTokens?: number;
      useInstructions?: boolean;
      temperature?: number;
      topP?: number;
      topK?: number;
      onChunk?: (chunk: string) => void;
    }
  ) => Promise<string>;
  aiSettings: {
    provider: AIProvider;
    doubleCheck?: {
      enabled: boolean;
      operations: {
        factsComparison?: boolean;
      };
    };
  };
  performDoubleCheck: (
    operation: string,
    result: string,
    context: AIMessageContent[]  // v1.37.68: mudou de string para array
  ) => Promise<{
    verified: string;
    corrections: string[];
    summary: string;
    confidence?: number;
  }>;
}

export interface UseFactsComparisonProps {
  editingTopic: Topic | null;
  aiIntegration: AIIntegrationForFactsComparison | null;
  analyzedDocuments: AnalyzedDocuments | null;
  openModal: (modalId: string) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

export interface UseFactsComparisonReturn {
  // Estados
  generatingFactsComparison: boolean;
  factsComparisonResult: FactsComparisonResult | null;
  factsComparisonError: string | null;

  // Setters
  setFactsComparisonResult: React.Dispatch<React.SetStateAction<FactsComparisonResult | null>>;
  setFactsComparisonError: React.Dispatch<React.SetStateAction<string | null>>;

  // Handlers
  handleOpenFactsComparison: () => Promise<void>;
  handleGenerateFactsComparison: (source: FactsComparisonSource) => Promise<void>;

  // Cache
  factsComparisonCache: ReturnType<typeof useFactsComparisonCache>;
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

export function useFactsComparison({
  editingTopic,
  aiIntegration,
  analyzedDocuments,
  openModal,
  showToast
}: UseFactsComparisonProps): UseFactsComparisonReturn {
  // Estados
  const [generatingFactsComparison, setGeneratingFactsComparison] = React.useState(false);
  const [factsComparisonResult, setFactsComparisonResult] = React.useState<FactsComparisonResult | null>(null);
  const [factsComparisonError, setFactsComparisonError] = React.useState<string | null>(null);

  // Cache
  const factsComparisonCache = useFactsComparisonCache();

  // Double Check Review - Zustand actions (v1.37.59)
  const openDoubleCheckReview = useUIStore(state => state.openDoubleCheckReview);
  const doubleCheckResult = useUIStore(state => state.doubleCheckResult);
  const setDoubleCheckResult = useUIStore(state => state.setDoubleCheckResult);

  // Ref para armazenar o resolver da Promise que aguarda decisão do usuário
  const pendingDoubleCheckResolve = useRef<((result: DoubleCheckReviewResult) => void) | null>(null);

  // Quando o usuário decide no modal, resolver a Promise pendente
  useEffect(() => {
    if (doubleCheckResult && doubleCheckResult.operation === 'factsComparison' && pendingDoubleCheckResolve.current) {
      pendingDoubleCheckResolve.current(doubleCheckResult);
      pendingDoubleCheckResolve.current = null;
      setDoubleCheckResult(null); // Limpar após consumir
    }
  }, [doubleCheckResult, setDoubleCheckResult]);

  // v1.36.26: Limpar resultado do Confronto quando tópico muda (evita mostrar cache do tópico anterior)
  React.useEffect(() => {
    setFactsComparisonResult(null);
    setFactsComparisonError(null);
  }, [editingTopic?.title]);

  // v1.36.24: Handler para ABRIR modal de Confronto de Fatos com recuperação de cache
  const handleOpenFactsComparison = React.useCallback(async () => {
    if (!editingTopic) return;

    setFactsComparisonError(null);

    // Verificar cache (prioriza mini-relatorio, depois documentos-completos)
    const cached = await factsComparisonCache.getComparison(editingTopic.title, 'mini-relatorio');
    if (cached) {
      setFactsComparisonResult(cached);
    } else {
      const cachedDocs = await factsComparisonCache.getComparison(editingTopic.title, 'documentos-completos');
      setFactsComparisonResult(cachedDocs);
    }

    openModal('factsComparisonIndividual');
  }, [editingTopic, factsComparisonCache, openModal]);

  // v1.36.21: Handler para GERAR Confronto de Fatos
  // v1.36.22: Adicionado fallback para PDF binário
  const handleGenerateFactsComparison = React.useCallback(async (source: FactsComparisonSource) => {
    if (!aiIntegration || !editingTopic) return;

    setGeneratingFactsComparison(true);
    setFactsComparisonError(null);

    try {
      let prompt: string;

      if (source === 'mini-relatorio') {
        const relatorio = editingTopic.editedRelatorio || editingTopic.relatorio || '';
        if (!relatorio.trim()) {
          throw new Error('Mini-relatório não disponível para este tópico.');
        }
        prompt = buildMiniRelatorioComparisonPrompt(editingTopic.title, relatorio);
      } else {
        // Documentos completos - priorizar texto, fallback para PDF binário
        const peticaoText = (analyzedDocuments?.peticoesText || []).map((t: PastedText) => t.text || '').join('\n\n');
        const contestacaoText = (analyzedDocuments?.contestacoesText || []).map((t: PastedText) => t.text || '').join('\n\n');
        const impugnacaoText = (analyzedDocuments?.complementaresText || []).map((t: PastedText) => t.text || '').join('\n\n');

        const hasText = peticaoText.trim() || contestacaoText.trim();
        const hasPdfs = (analyzedDocuments?.peticoes?.length || 0) > 0 || (analyzedDocuments?.contestacoes?.length || 0) > 0;

        if (!hasText && !hasPdfs) {
          throw new Error('Nenhum documento disponível (petição ou contestação).');
        }

        if (hasText) {
          // Caminho padrão: usar texto extraído
          prompt = buildDocumentosComparisonPrompt(editingTopic.title, peticaoText, contestacaoText, impugnacaoText);
        } else {
          // v1.36.22: Fallback para PDF binário (quando não há texto extraído)
          prompt = buildPdfComparisonPrompt(editingTopic.title);
        }
      }

      // Construir mensagem - pode ser texto simples ou incluir PDFs binários
      let messageContent: AIMessageContent[];

      const peticaoTextFallback = (analyzedDocuments?.peticoesText || []).map((t: PastedText) => t.text || '').join('\n\n');
      const contestacaoTextFallback = (analyzedDocuments?.contestacoesText || []).map((t: PastedText) => t.text || '').join('\n\n');
      const hasTextForMessage = peticaoTextFallback.trim() || contestacaoTextFallback.trim();

      if (hasTextForMessage || source === 'mini-relatorio') {
        // Texto simples
        messageContent = [{ type: 'text', text: prompt }];
      } else if (isPdfBinaryAllowed(aiIntegration.aiSettings.provider)) {
        // v1.36.22: Incluir PDFs binários como fallback (apenas quando provider suporta)
        messageContent = [{ type: 'text', text: prompt }];

        // Adicionar petições como PDF
        for (const base64 of (analyzedDocuments?.peticoes || [])) {
          messageContent.push({ type: 'text', text: '\n\n📄 PETIÇÃO INICIAL (documento PDF a seguir):' });
          messageContent.push({
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: base64
            }
          } as AIDocumentContent);
        }

        // Adicionar contestações como PDF
        for (const base64 of (analyzedDocuments?.contestacoes || [])) {
          messageContent.push({ type: 'text', text: '\n\n📄 CONTESTAÇÃO (documento PDF a seguir):' });
          messageContent.push({
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: base64
            }
          } as AIDocumentContent);
        }

        // Adicionar complementares como PDF
        for (const base64 of (analyzedDocuments?.complementares || [])) {
          messageContent.push({ type: 'text', text: '\n\n📄 DOCUMENTO COMPLEMENTAR (documento PDF a seguir):' });
          messageContent.push({
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: base64
            }
          } as AIDocumentContent);
        }
      } else {
        // Provider não suporta PDF binário (manual/grok) — só texto
        messageContent = [{ type: 'text', text: prompt }];
      }

      // v1.40.10: Usar streaming para evitar timeout em operações longas
      const aiOptions = {
        maxTokens: 8000,
        useInstructions: false,
        temperature: 0.3,
        topP: 0.9,
        topK: 40
      };

      const response = aiIntegration.callAIStream
        ? await aiIntegration.callAIStream([{
            role: 'user',
            content: messageContent
          }], aiOptions)
        : await aiIntegration.callAI([{
            role: 'user',
            content: messageContent
          }], aiOptions);

      // Validar resposta com schema Zod
      const validated = parseAIResponse(response, FactsComparisonSchema);
      let parsed: ReturnType<typeof FactsComparisonSchema['parse']>;
      if (validated.success) {
        parsed = validated.data;
      } else {
        console.warn('[FactsComparison] Validação Zod falhou, usando fallback:', validated.error);
        const jsonStr = extractJSON(response);
        if (!jsonStr) throw new Error('Não foi possível encontrar JSON válido na resposta da IA.');
        parsed = JSON.parse(jsonStr);
      }

      // v1.36.58: Double Check do Confronto de Fatos
      let verifiedParsed = parsed;
      if (aiIntegration.aiSettings.doubleCheck?.enabled &&
          aiIntegration.aiSettings.doubleCheck?.operations.factsComparison) {
        try {
          // v1.37.68: Usar messageContent original (contém prompt + PDFs binários se fallback)
          // messageContent já inclui: prompt de comparação + PDFs binários (se texto não extraído)
          const { verified, corrections, summary, confidence } = await aiIntegration.performDoubleCheck(
            'factsComparison',
            JSON.stringify(parsed, null, 2),
            messageContent  // Array original (já é AIMessageContent[])
          );

          if (corrections.length > 0) {
            // v1.37.62: Usar dados reais da IA (não sobrescrever com valores fixos)
            const typedCorrections: DoubleCheckCorrection[] = corrections.map((c) => {
              // Se já é um objeto com os campos corretos, usar diretamente
              if (typeof c === 'object' && c !== null) {
                return c as DoubleCheckCorrection;
              }
              // Fallback para string (não deveria acontecer)
              return {
                type: 'fix_row' as const,
                reason: String(c),
                tema: 'Desconhecido',
                field: 'observacoes',
                newValue: String(c)
              };
            });

            // Criar Promise para aguardar decisão do usuário
            const waitForDecision = new Promise<DoubleCheckReviewResult>(resolve => {
              pendingDoubleCheckResolve.current = resolve;
            });

            // Abrir modal de revisão
            openDoubleCheckReview({
              operation: 'factsComparison',
              originalResult: JSON.stringify(parsed, null, 2),
              verifiedResult: verified,
              corrections: typedCorrections,
              summary,
              confidence: Math.round((confidence ?? 0.85) * 100)
            });

            // Aguardar decisão do usuário
            const dcResult = await waitForDecision;

            // Aplicar resultado da decisão
            if (dcResult.selected.length > 0) {
              const verifiedObj = JSON.parse(dcResult.finalResult);
              // Extrair o resultado verificado (pode estar em verifiedResult ou ser o objeto inteiro)
              verifiedParsed = verifiedObj.verifiedResult || verifiedObj;
              showToast(`🔄 Double Check: ${dcResult.selected.length} correção(ões) aplicada(s)`, 'info');
              console.log('[DoubleCheck FactsComparison] Correções aplicadas pelo usuário:', dcResult.selected);
            } else {
              console.log('[DoubleCheck FactsComparison] Usuário descartou todas as correções');
              showToast('Double Check: correções descartadas', 'info');
            }
          }
        } catch (dcError) {
          console.error('[DoubleCheck FactsComparison] Erro:', dcError);
          // Continuar com parsed original em caso de erro
        }
      }

      const result: FactsComparisonResult = {
        topicTitle: editingTopic.title,
        source,
        generatedAt: new Date().toISOString(),
        tabela: (verifiedParsed.tabela || []) as FactsComparisonRow[],
        fatosIncontroversos: verifiedParsed.fatosIncontroversos || [],
        fatosControversos: verifiedParsed.fatosControversos || [],
        pontosChave: verifiedParsed.pontosChave || [],
        resumo: verifiedParsed.resumo || ''
      };

      // Salvar no cache
      await factsComparisonCache.saveComparison(editingTopic.title, source, result);

      setFactsComparisonResult(result);
    } catch (err) {
      console.error('[FactsComparison] Erro:', err);
      setFactsComparisonError(err instanceof Error ? err.message : 'Erro ao gerar análise. Tente novamente.');
    } finally {
      setGeneratingFactsComparison(false);
    }
  }, [aiIntegration, editingTopic, analyzedDocuments, factsComparisonCache, showToast, openDoubleCheckReview]);

  return {
    // Estados
    generatingFactsComparison,
    factsComparisonResult,
    factsComparisonError,

    // Setters
    setFactsComparisonResult,
    setFactsComparisonError,

    // Handlers
    handleOpenFactsComparison,
    handleGenerateFactsComparison,

    // Cache
    factsComparisonCache
  };
}
