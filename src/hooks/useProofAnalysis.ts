/**
 * @file useProofAnalysis.ts
 * @description Hook para analise de provas documentais
 * @version 1.36.73
 *
 * Extraido do App.tsx linha ~7210
 * Funcao: analyzeProof - analisa provas documentais com contexto do processo
 */

import { useCallback } from 'react';
import { anonymizeText } from '../utils/text';
import type {
  AIMessage,
  AIMessageContent,
  AITextContent,
  AIDocumentContent,
  Topic,
  Proof,
  ProofAnalysisResult,
  ProcessingMode,
  AISettings,
  AnalyzedDocuments,
  AnonymizationSettings,
} from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

/** Interface para AI Integration necessaria para analise de provas */
export interface AIIntegrationForProofs {
  aiSettings: AISettings;
  callAI: (messages: AIMessage[], options?: {
    maxTokens?: number;
    useInstructions?: boolean;
    extractText?: boolean;
    temperature?: number;
    topP?: number;
    topK?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) => Promise<any>;
}

/** Interface para Proof Manager necessaria para analise */
export interface ProofManagerForAnalysis {
  addAnalyzingProof: (proofId: string | number) => void;
  removeAnalyzingProof: (proofId: string | number) => void;
  extractedProofTexts: Record<string, string>;
  proofTopicLinks: Record<string, string[]>;
  proofProcessingModes: Record<string, ProcessingMode>;
  setProofAnalysisResults: (fn: (prev: Record<string, ProofAnalysisResult>) => Record<string, ProofAnalysisResult>) => void;
}

/** Interface para Document Services */
export interface DocumentServicesForProofs {
  extractTextFromPDFPure: (file: File, onProgress?: (current: number, total: number) => void) => Promise<string | null>;
  extractTextFromPDFWithClaudeVision: (file: File, onProgress?: (current: number, total: number) => void) => Promise<string | null>;
  extractTextFromPDFWithTesseract: (file: File, onProgress?: (current: number, total: number, status?: string) => void) => Promise<string | null>;
}

/** Interface para Storage */
export interface StorageForProofs {
  fileToBase64: (file: File) => Promise<string>;
}

/** Opcoes para construcao de array de documentos */
interface BuildDocumentOptions {
  includePeticao?: boolean;
  includeContestacoes?: boolean;
  includeComplementares?: boolean;
}

/** Props do hook */
export interface UseProofAnalysisProps {
  aiIntegration: AIIntegrationForProofs;
  proofManager: ProofManagerForAnalysis;
  documentServices: DocumentServicesForProofs;
  storage: StorageForProofs;
  selectedTopics: Topic[];
  analyzedDocuments: AnalyzedDocuments;
  setError: (error: string) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

/** Retorno do hook */
export interface UseProofAnalysisReturn {
  analyzeProof: (
    proof: Proof,
    analysisType: string,
    customInstructions?: string,
    useOnlyMiniRelatorios?: boolean,
    includeLinkedTopics?: boolean
  ) => Promise<void>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hook para analise de provas documentais
 *
 * @param props - Dependencias necessarias para analise
 * @returns Funcao analyzeProof para executar analise de provas
 */
export const useProofAnalysis = ({
  aiIntegration,
  proofManager,
  storage,
  selectedTopics,
  analyzedDocuments,
  setError,
  showToast,
}: UseProofAnalysisProps): UseProofAnalysisReturn => {

  /**
   * Constroi array de conteudo de documentos para envio a API
   * Helper interno para evitar duplicacao
   */
  const buildDocumentContentArray = useCallback((options: BuildDocumentOptions = {}): (AITextContent | AIDocumentContent)[] => {
    const {
      includePeticao = true,
      includeContestacoes = true,
      includeComplementares = false,
    } = options;

    const docs = analyzedDocuments;
    const contentArray: (AITextContent | AIDocumentContent)[] = [];

    // 1. Peticoes (multiplas) - v1.21: Suporte a peticao inicial + emendas
    if (includePeticao) {
      // Primeiro: textos extraidos (PDF.JS ou Claude Vision)
      if (docs.peticoesText?.length > 0) {
        docs.peticoesText.forEach((doc: { name?: string; text: string }, idx: number) => {
          contentArray.push({
            type: 'text',
            text: `${doc.name?.toUpperCase() || `PETICAO ${idx + 1}`}:\n\n${doc.text}`,
            cache_control: doc.text.length > 2000 ? { type: "ephemeral" } : undefined
          });
        });
      }
      // Depois: PDFs binarios (modo pdf-puro ou fallback)
      if (docs.peticoes?.length > 0) {
        const textCount = docs.peticoesText?.length || 0;
        docs.peticoes.forEach((base64: string, index: number) => {
          const label = index === 0 && textCount === 0 ? 'PETICAO INICIAL' : `PETICAO ${textCount + index + 1}`;
          contentArray.push({ type: 'text', text: `${label} (documento PDF a seguir):` });
          contentArray.push({
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: base64 },
            cache_control: base64.length > 100000 ? { type: "ephemeral" } : undefined
          });
        });
      }
    }

    // 2. Contestacoes - v1.14.1: Suporte a modos mistos
    if (includeContestacoes) {
      if (docs.contestacoesText?.length > 0) {
        docs.contestacoesText.forEach((contestacao: { text: string }, index: number) => {
          contentArray.push({
            type: 'text',
            text: `CONTESTACAO ${index + 1}:\n\n${contestacao.text}`,
            cache_control: contestacao.text.length > 2000 ? { type: "ephemeral" } : undefined
          });
        });
      }
      if (docs.contestacoes?.length > 0) {
        const textCount = docs.contestacoesText?.length || 0;
        docs.contestacoes.forEach((base64: string, index: number) => {
          contentArray.push({ type: 'text', text: `CONTESTACAO ${textCount + index + 1} (documento PDF a seguir):` });
          contentArray.push({
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: base64 },
            cache_control: base64.length > 100000 ? { type: "ephemeral" } : undefined
          });
        });
      }
    }

    // 3. Documentos Complementares
    if (includeComplementares) {
      if (docs.complementaresText?.length > 0) {
        docs.complementaresText.forEach((doc: { text: string }, index: number) => {
          contentArray.push({
            type: 'text',
            text: `DOCUMENTO COMPLEMENTAR ${index + 1}:\n\n${doc.text}`,
            cache_control: doc.text.length > 2000 ? { type: "ephemeral" } : undefined
          });
        });
      }
      if (docs.complementares?.length > 0) {
        const textCount = docs.complementaresText?.length || 0;
        docs.complementares.forEach((base64: string, index: number) => {
          contentArray.push({ type: 'text', text: `DOCUMENTO COMPLEMENTAR ${textCount + index + 1} (documento PDF a seguir):` });
          contentArray.push({
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: base64 },
            cache_control: base64.length > 100000 ? { type: "ephemeral" } : undefined
          });
        });
      }
    }

    return contentArray;
  }, [analyzedDocuments]);

  /**
   * Analisa uma prova documental
   *
   * @param proof - Prova a ser analisada (PDF ou texto)
   * @param analysisType - Tipo de analise ('livre' ou 'contextual')
   * @param customInstructions - Instruções personalizadas do usuário
   * @param useOnlyMiniRelatorios - Usar apenas mini-relatórios ao inves de documentos completos
   * @param includeLinkedTopics - Incluir tópicos vinculados na analise livre
   */
  const analyzeProof = useCallback(async (
    proof: Proof,
    analysisType: string,
    customInstructions = '',
    useOnlyMiniRelatorios = false,
    includeLinkedTopics = false
  ): Promise<void> => {
    const proofId = String(proof.id);
    try {
      proofManager.addAnalyzingProof(proofId);
      setError('');

      // v1.16.2: Anonimizacao de provas (ProcessingModeSelector ja forca PDF.js quando ativo)
      // v1.21.3: Adicionado nomesUsuario para anonimizar nomes customizados
      const anonConfig: AnonymizationSettings | null | undefined = aiIntegration?.aiSettings?.anonymization;
      const shouldAnonymize = anonConfig?.enabled;
      const nomesParaAnonimizar = anonConfig?.nomesUsuario || [];
      const maybeAnonymize = (text: string) => shouldAnonymize ? anonymizeText(text, anonConfig, nomesParaAnonimizar) : text;

      // Preparar conteudo da prova
      const contentArray: AIMessageContent[] = [];

      // v1.36.28: Verificacao robusta - usa type === 'pdf' para compatibilidade com provas existentes
      if (proof.type === 'pdf' || proof.isPdf) {
        // Prova em PDF - v1.21.2: Respeita modo de processamento escolhido
        const proofMode = proofManager.proofProcessingModes?.[proofId] || 'pdfjs';

        if (proofMode === 'pdf-puro') {
          // Usuario escolheu PDF puro explicitamente
          if (shouldAnonymize) {
            // v1.21.9: Fallback para texto extraido quando anonimizacao ativa
            const extractedText = proofManager.extractedProofTexts[proofId];
            if (extractedText) {
              contentArray.push({
                type: 'text' as const,
                text: `PROVA (texto extraído do PDF):\n\n${maybeAnonymize(extractedText)}`
              });
            } else {
              proofManager.removeAnalyzingProof(proofId);
              showToast('Anonimizacao ativa: extraia o texto primeiro.', 'error');
              return;
            }
          } else {
            if (!proof.file) {
              proofManager.removeAnalyzingProof(proofId);
              showToast('Arquivo PDF não encontrado.', 'error');
              return;
            }
            const base64 = await storage.fileToBase64(proof.file);
            contentArray.push({
              type: 'document' as const,
              source: { type: 'base64' as const, media_type: 'application/pdf' as const, data: base64 }
            });
          }
        } else {
          // Usuário escolheu modo de extração (pdfjs ou claude-vision)
          const extractedText = proofManager.extractedProofTexts[proofId];
          if (extractedText) {
            contentArray.push({
              type: 'text' as const,
              text: `PROVA (texto extraído do PDF):\n\n${maybeAnonymize(extractedText)}`
            });
          } else {
            proofManager.removeAnalyzingProof(proofId);
            showToast('Texto não extraído. Extraia o texto da prova antes de analisar.', 'error');
            return;
          }
        }
      } else {
        // Prova em texto
        contentArray.push({
          type: 'text' as const,
          text: `PROVA:\n\n${maybeAnonymize(proof.text || '')}`
        });
      }

      // Buscar tópicos vinculados a esta prova
      const linkedTopicTitles = proofManager.proofTopicLinks[proofId] || [];
      const linkedTopics = selectedTopics.filter(t => linkedTopicTitles.includes(t.title));

      // Preparar prompt baseado no tipo de análise
      let prompt = '';

      if (analysisType === 'livre') {
        if (includeLinkedTopics && linkedTopics.length > 0) {
          // Adicionar tópicos vinculados e mini-relatórios ao contexto
          const topicsContext = linkedTopics.map((topic, idx) =>
            `TOPICO ${idx + 1}: ${topic.title} (${topic.category})\n\n${topic.relatorio || 'Mini-relatório não disponível'}`
          ).join('\n\n---\n\n');

          contentArray.push({
            type: 'text' as const,
            text: `TOPICOS VINCULADOS:\n\n${topicsContext}`
          });

          prompt = customInstructions
            ? `Analise a prova a seguir considerando os tópicos vinculados fornecidos.\n\nInstruções do usuário:\n${customInstructions}`
            : `Analise a prova a seguir considerando os tópicos vinculados fornecidos. Seja objetivo e direto.`;
        } else {
          // Análise livre simples - apenas prova + instruções
          prompt = customInstructions
            ? `Analise a prova a seguir conforme estas instruções:\n\n${customInstructions}`
            : `Analise a prova a seguir e forneça insights relevantes. Seja objetivo e direto.`;
        }
      } else {
        // Análise contextual - Escolher entre documentos completos ou apenas mini-relatórios

        // Se useOnlyMiniRelatorios estiver ativado E houver tópicos vinculados, usar apenas mini-relatórios
        if (useOnlyMiniRelatorios && linkedTopics.length > 0) {
          // Adicionar apenas mini-relatórios dos tópicos vinculados
          const miniRelatoriosText = linkedTopics.map((topic, idx) =>
            `TOPICO ${idx + 1}: ${topic.title} (${topic.category})\n\n${topic.relatorio || 'Mini-relatório não disponível'}`
          ).join('\n\n---\n\n');

          contentArray.push({
            type: 'text' as const,
            text: `CONTEXTO DOS PEDIDOS VINCULADOS:\n\n${miniRelatoriosText}`
          });
        } else {
          // Comportamento padrão: usar helper para documentos (evita duplicação)
          const docsArray = buildDocumentContentArray({ includeComplementares: true });
          contentArray.push(...docsArray);
        }

        // Construir resumo do contexto para o prompt
        const totalPeticoes = (analyzedDocuments.peticoes?.length || 0) + (analyzedDocuments.peticoesText?.length || 0);
        const peticaoSummary = useOnlyMiniRelatorios && linkedTopics.length > 0 ?
          'Não enviado (usando apenas mini-relatórios)' :
          (totalPeticoes > 0 ?
            `${totalPeticoes} documento${totalPeticoes > 1 ? 's' : ''} do autor fornecido${totalPeticoes > 1 ? 's' : ''} (veja acima)` :
            'Petição inicial não disponível');

        const totalContestacoes = (analyzedDocuments.contestacoes?.length || 0) + (analyzedDocuments.contestacoesText?.length || 0);
        const contestacoesSummary = useOnlyMiniRelatorios && linkedTopics.length > 0 ?
          'Não enviado (usando apenas mini-relatórios)' :
          (totalContestacoes > 0 ?
            `${totalContestacoes} contestação${totalContestacoes > 1 ? 'ões' : ''} fornecida${totalContestacoes > 1 ? 's' : ''} (veja acima)` :
            'Nenhuma contestação disponível');

        const totalComplementares = (analyzedDocuments.complementares?.length || 0) + (analyzedDocuments.complementaresText?.length || 0);
        const complementaresSummary = useOnlyMiniRelatorios && linkedTopics.length > 0 ?
          'Não enviado (usando apenas mini-relatórios)' :
          (totalComplementares > 0 ?
            `${totalComplementares} documento${totalComplementares > 1 ? 's' : ''} complementar${totalComplementares > 1 ? 'es' : ''} fornecido${totalComplementares > 1 ? 's' : ''} (veja acima)` :
            'Nenhum documento complementar disponível');

        prompt = `${customInstructions ? `**INSTRUÇÕES ESPECÍFICAS PARA ESTA PROVA:**\n${customInstructions}\n\n` : ''}Você está analisando uma prova no contexto de um processo trabalhista.

CONTEXTO DO PROCESSO:
- Petição inicial: ${peticaoSummary}
- Contestações: ${contestacoesSummary}
- Documentos complementares: ${complementaresSummary}

${linkedTopics.length > 0 ? `
**PEDIDOS ESPECÍFICOS VINCULADOS A ESTA PROVA:**

Esta prova foi vinculada aos seguintes pedidos/tópicos do processo:

${linkedTopics.map((topic, idx) => `
${idx + 1}. **${topic.title}** (${topic.category})

   O que as partes alegaram sobre este pedido:
   ${topic.relatorio || 'Mini-relatório não disponível - verifique a petição e contestação acima'}

   ${topic.editedContent ? `Fundamentação parcial já escrita (considere ao analisar):
   ${topic.editedContent}
   ` : 'Fundamentação ainda não iniciada para este pedido'}
   Resultado parcial: ${topic.resultado || 'Ainda não definido'}
`).join('\n---\n')}

**IMPORTANTE:** Ao analisar esta prova no contexto do processo, PRIORIZE sua relação com os pedidos vinculados acima.

Para cada pedido vinculado, indique ESPECIFICAMENTE:
- Como esta prova impacta este pedido em particular
- Se a prova favorece o autor ou réu neste ponto específico
- Qual conclusão a prova sugere para este pedido

` : `
Esta prova não foi vinculada a nenhum pedido específico. A análise será genérica em relação a todo o processo.

`}
Analise a prova fornecida e responda:

1. **O que esta prova demonstra?** Descreva objetivamente o conteúdo probatório
2. **Relação com alegações do autor**: Esta prova confirma, refuta ou é neutra em relação às alegações da petição inicial?
3. **Relação com defesa**: Esta prova confirma, refuta ou é neutra em relação aos argumentos de defesa?
4. **Força probatória**: Avalie a qualidade e relevância desta prova para o deslinde do feito
5. **Conclusão**: De forma resumida, qual a contribuição desta prova para a formação do convencimento?

Seja objetivo, técnico e imparcial. Base-se exclusivamente no conteúdo da prova.

Formato da resposta (use quebras de linha entre seções):

CONTEÚDO DA PROVA:
[descreva o que a prova demonstra]

RELAÇÃO COM ALEGAÇÕES DO AUTOR:
[análise]

RELAÇÃO COM A DEFESA:
[análise]

FORÇA PROBATÓRIA:
[avaliação]

CONCLUSÃO:
[síntese]`;
      }

      contentArray.push({
        type: 'text' as const,
        text: prompt
      });

      // Fazer chamada à API
      // v1.21.26: Parâmetros para análise crítica de provas
      const textContent = await aiIntegration.callAI([{
        role: 'user',
        content: contentArray
      }], {
        maxTokens: 20000,
        useInstructions: true,
        temperature: 0.3,
        topP: 0.9,
        topK: 50
      });

      // Armazenar resultado
      proofManager.setProofAnalysisResults(prev => ({
        ...prev,
        [proofId]: {
          type: analysisType as 'contextual' | 'livre',
          result: textContent.trim()
        }
      }));

    } catch (err) {
      setError('Erro ao analisar prova: ' + (err as Error).message);
    } finally {
      proofManager.removeAnalyzingProof(proofId);
    }
  }, [
    aiIntegration,
    proofManager,
    storage,
    selectedTopics,
    analyzedDocuments,
    buildDocumentContentArray,
    setError,
    showToast
  ]);

  return {
    analyzeProof
  };
};

export default useProofAnalysis;
