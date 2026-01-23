/**
 * @file context-helpers.ts
 * @description Funções helper para preparar contexto de documentos e provas para API de IA
 * @version 1.36.96
 *
 * Extraído de App.tsx para centralizar helpers de contexto.
 *
 * @usedBy App.tsx (buildApiRequest), AIIntegration
 */

import type { AIMessageContent, ProofFile, ProofText, AnonymizationSettings, ProofAnalysisResult } from '../types';
import { anonymizeText } from './text';
import { isOralProof } from '../components';
import { wrapUserContent } from './prompt-safety';

// ═══════════════════════════════════════════════════════════════════════════
// PREPARE DOCUMENTS CONTEXT
// v1.25: Adicionado cache_control para otimização de tokens
// ═══════════════════════════════════════════════════════════════════════════

interface DocumentsInput {
  // v1.38.11: Suporte a arrays (formato de AnalyzedDocuments)
  peticoes?: string[];
  peticoesText?: Array<{ name?: string; text: string }>;
  // Legado: manter para compatibilidade com sessões antigas
  peticao?: string;
  peticaoType?: string;
  // Contestações e complementares (já eram arrays)
  contestacoes?: string[];
  contestacoesText?: { text: string }[];
  complementares?: string[];
  complementaresText?: { text: string }[];
}

interface DocumentsContextResult {
  contentArray: AIMessageContent[];
  flags: {
    hasPeticao: boolean;
    hasContestacoes: boolean;
    hasComplementares: boolean;
  };
}

/**
 * Prepara array de documentos para envio à API de IA
 * @param docs - Documentos do processo (petição, contestações, complementares)
 * @returns Objeto com array de conteúdo e flags indicando quais documentos estão presentes
 * @version 1.38.11 - Adicionado suporte a peticoes (array) além de peticao (singular legado)
 */
export const prepareDocumentsContext = (docs: DocumentsInput): DocumentsContextResult => {
  const contentArray: AIMessageContent[] = [];
  let hasPeticao = false;

  // v1.38.11: Suporte a peticoes (array de PDFs base64) - formato de AnalyzedDocuments
  docs.peticoes?.forEach((base64: string) => {
    contentArray.push({
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data: base64 },
      cache_control: base64.length > 100000 ? { type: "ephemeral" } : undefined
    });
    hasPeticao = true;
  });

  // v1.38.11: Suporte a peticoesText (array de textos colados/extraídos)
  docs.peticoesText?.forEach((peticao: { name?: string; text: string }, index: number) => {
    const label = peticao.name || `PETIÇÃO INICIAL ${index + 1 + (docs.peticoes?.length || 0)}`;
    contentArray.push({
      type: 'text',
      text: wrapUserContent(peticao.text, label),
      cache_control: peticao.text.length > 2000 ? { type: "ephemeral" } : undefined
    });
    hasPeticao = true;
  });

  // Legado: suporte a peticao singular (para sessões antigas migradas)
  if (docs.peticao) {
    contentArray.push(docs.peticaoType === 'pdf'
      ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: docs.peticao }, cache_control: docs.peticao.length > 100000 ? { type: "ephemeral" } : undefined }
      : { type: 'text', text: `PETIÇÃO INICIAL:\n\n${docs.peticao}`, cache_control: docs.peticao.length > 2000 ? { type: "ephemeral" } : undefined });
    hasPeticao = true;
  }

  docs.contestacoes?.forEach((base64: string) => {
    contentArray.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 }, cache_control: base64.length > 100000 ? { type: "ephemeral" } : undefined });
  });

  docs.contestacoesText?.forEach((contestacao: { text: string }, index: number) => {
    const label = `CONTESTAÇÃO ${index + 1 + (docs.contestacoes?.length || 0)}`;
    contentArray.push({ type: 'text', text: wrapUserContent(contestacao.text, label), cache_control: contestacao.text.length > 2000 ? { type: "ephemeral" } : undefined });
  });

  docs.complementares?.forEach((base64: string) => {
    contentArray.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 }, cache_control: base64.length > 100000 ? { type: "ephemeral" } : undefined });
  });

  docs.complementaresText?.forEach((doc: { text: string }, index: number) => {
    contentArray.push({ type: 'text', text: `DOCUMENTO COMPLEMENTAR ${index + 1 + (docs.complementares?.length || 0)}:\n\n${doc.text}`, cache_control: doc.text.length > 2000 ? { type: "ephemeral" } : undefined });
  });

  return {
    contentArray,
    flags: {
      hasPeticao,
      hasContestacoes: (docs.contestacoes?.length || 0) + (docs.contestacoesText?.length || 0) > 0,
      hasComplementares: (docs.complementares?.length || 0) + (docs.complementaresText?.length || 0) > 0
    }
  };
};

// ═══════════════════════════════════════════════════════════════════════════
// PREPARE PROOFS CONTEXT
// v1.19.5: Prepara contexto de provas vinculadas para envio à API de IA
// v1.19.2: Adicionado anonymizationEnabled para bloquear PDF binário
// v1.21.5: Adicionado anonConfig para anonimizar texto extraído ao enviar
// ═══════════════════════════════════════════════════════════════════════════

interface ProofManagerInput {
  proofTopicLinks?: Record<string, string[]>;
  proofFiles?: ProofFile[];
  proofTexts?: ProofText[];
  proofUsePdfMode?: Record<string, boolean>;
  extractedProofTexts?: Record<string, string>;
  proofAnalysisResults?: Record<string, ProofAnalysisResult[]>;
  proofConclusions?: Record<string, string>;
  proofSendFullContent?: Record<string, boolean>;
}

interface ProofsContextResult {
  proofDocuments: AIMessageContent[];
  proofsContext: string;
  hasProofs: boolean;
  noOralProofFound?: boolean;
}

/**
 * Prepara contexto de provas vinculadas para envio à API de IA
 * @param proofManager - Estado do gerenciador de provas
 * @param topicTitle - Título do tópico para filtrar provas vinculadas
 * @param fileToBase64Fn - Função para converter File para base64
 * @param anonymizationEnabled - Se anonimização está ativa
 * @param anonConfig - Configurações de anonimização
 */
export const prepareProofsContext = async (
  proofManager: ProofManagerInput | null,
  topicTitle: string,
  fileToBase64Fn: (file: File) => Promise<string>,
  anonymizationEnabled = false,
  anonConfig: AnonymizationSettings | null = null
): Promise<ProofsContextResult> => {
  if (!proofManager) return { proofDocuments: [] as AIMessageContent[], proofsContext: '', hasProofs: false };

  const proofTopicLinks = proofManager.proofTopicLinks || {};
  const linkedProofIds = Object.keys(proofTopicLinks).filter(proofId =>
    proofTopicLinks[proofId]?.includes(topicTitle)
  );

  const linkedProofs = [
    ...(proofManager.proofFiles || []).filter((p: ProofFile) => linkedProofIds.includes(String(p.id))),
    ...(proofManager.proofTexts || []).filter((p: ProofText) => linkedProofIds.includes(String(p.id)))
  ];

  // v1.21.13: Filtrar provas CONFLITO quando anonimização ativa
  // - CONFLITO: proofUsePdfMode=true + anon ativa (usuário quer PDF mas anon exige texto)
  // - Sem texto extraído + anon ativa (impossível anonimizar)
  const filteredProofs = linkedProofs.filter(proof => {
    const isPdf = proofManager.proofFiles?.some((p: ProofFile) => p.id === proof.id);
    if (anonymizationEnabled && isPdf) {
      // CONFLITO: usuário escolheu "Usar PDF" mas anonimização está ativa
      if (proofManager.proofUsePdfMode?.[proof.id]) {
        return false;
      }
      // Sem texto extraído: impossível anonimizar
      if (!proofManager.extractedProofTexts?.[proof.id]) {
        return false;
      }
    }
    return true;
  });

  if (filteredProofs.length === 0) {
    return { proofDocuments: [] as AIMessageContent[], proofsContext: '', hasProofs: false };
  }

  const proofDocuments: AIMessageContent[] = [];
  let proofsContext = '\n\n🔍 PROVAS VINCULADAS A ESTE TÓPICO:\n\n';

  for (let index = 0; index < filteredProofs.length; index++) {
    const proof = filteredProofs[index];
    const proofId = proof.id;
    const isPdf = proofManager.proofFiles?.some((p: ProofFile) => p.id === proof.id);

    proofsContext += `PROVA ${index + 1}: ${proof.name}\n`;

    // Análises IA (v1.38.27: suporte a múltiplas análises)
    const analyses = proofManager.proofAnalysisResults?.[proofId];
    if (analyses && analyses.length > 0) {
      proofsContext += `\n--- ANÁLISES DA PROVA (${analyses.length}) ---\n`;
      for (let idx = 0; idx < analyses.length; idx++) {
        const analysis = analyses[idx];
        const typeLabel = analysis.type === 'livre' ? 'Livre' : 'Contextual';
        const dateStr = analysis.timestamp
          ? new Date(analysis.timestamp).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
          : '';
        proofsContext += `\nAnálise ${idx + 1} (${typeLabel}${dateStr ? ` - ${dateStr}` : ''}):\n${analysis.result}\n`;
      }
    }

    // Conclusões do juiz
    if (proofManager.proofConclusions?.[proofId]) {
      proofsContext += `\nConclusões do Juiz:\n${proofManager.proofConclusions[proofId]}\n`;
    }

    // Conteúdo completo (se flag ativada) - v1.21.15: Respeita proofUsePdfMode (escolha visual do usuário)
    if (proofManager.proofSendFullContent?.[proofId]) {
      if (isPdf) {
        const usePdfMode = proofManager.proofUsePdfMode?.[proofId];
        const fullText = proofManager.extractedProofTexts?.[proofId];

        if (usePdfMode || !fullText) {
          // Usuário escolheu "Usar PDF" OU não há texto extraído → enviar PDF binário
          if (anonymizationEnabled) {
            // Anon ativa: fallback para texto extraído (se existir)
            if (fullText) {
              const nomesParaAnonimizar = anonConfig?.nomesUsuario || [];
              const textToSend = anonymizeText(fullText, anonConfig, nomesParaAnonimizar);
              proofsContext += `\nConteúdo Completo da Prova:\n${textToSend}\n`;
            } else {
              proofsContext += `\n[PDF "${proof.name}" não anexado - anonimização ativa e texto não extraído]\n`;
            }
          } else {
            const proofFile = (proof as ProofFile).file;
            if (proofFile && fileToBase64Fn) {
              // Anon desligada: enviar PDF binário
              // v1.25: Adicionado cache_control para otimização de tokens
              const base64 = await fileToBase64Fn(proofFile);
              proofDocuments.push({
                type: 'document',
                source: { type: 'base64', media_type: 'application/pdf', data: base64 },
                cache_control: base64.length > 100000 ? { type: "ephemeral" } : undefined
              });
              proofsContext += `\n[PDF "${proof.name}" anexado como documento]\n`;
            }
          }
        } else {
          // Usuário escolheu "Usar Texto" → enviar texto extraído
          const nomesParaAnonimizar = anonConfig?.nomesUsuario || [];
          const textToSend = (anonymizationEnabled && anonConfig)
            ? anonymizeText(fullText, anonConfig, nomesParaAnonimizar)
            : fullText;
          proofsContext += `\nConteúdo Completo da Prova:\n${textToSend}\n`;
        }
      } else if ((proof as ProofText).text) {
        // v1.21.5: Anonimizar texto colado ao enviar
        const nomesParaAnonimizar = anonConfig?.nomesUsuario || [];
        const textToSend = (anonymizationEnabled && anonConfig)
          ? anonymizeText((proof as ProofText).text, anonConfig, nomesParaAnonimizar)
          : (proof as ProofText).text;
        proofsContext += `\nConteúdo Completo da Prova:\n${textToSend}\n`;
      }
    }

    proofsContext += '\n---\n\n';
  }

  return { proofDocuments, proofsContext, hasProofs: true };
};

// ═══════════════════════════════════════════════════════════════════════════
// PREPARE ORAL PROOFS CONTEXT
// v1.21.1: Prepara contexto APENAS de provas orais vinculadas
// v1.21.5: Adicionado anonConfig para anonimizar texto extraído ao enviar
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Prepara contexto APENAS de provas orais vinculadas para envio à API de IA
 * @param proofManager - Estado do gerenciador de provas
 * @param topicTitle - Título do tópico para filtrar provas vinculadas
 * @param fileToBase64Fn - Função para converter File para base64
 * @param anonymizationEnabled - Se anonimização está ativa
 * @param anonConfig - Configurações de anonimização
 */
export const prepareOralProofsContext = async (
  proofManager: ProofManagerInput | null,
  topicTitle: string,
  fileToBase64Fn: (file: File) => Promise<string>,
  anonymizationEnabled = false,
  anonConfig: AnonymizationSettings | null = null
): Promise<ProofsContextResult> => {
  if (!proofManager) return { proofDocuments: [] as AIMessageContent[], proofsContext: '', hasProofs: false, noOralProofFound: true };

  const proofTopicLinks = proofManager.proofTopicLinks || {};
  const linkedProofIds = Object.keys(proofTopicLinks).filter(proofId =>
    proofTopicLinks[proofId]?.includes(topicTitle)
  );

  const allLinkedProofs = [
    ...(proofManager.proofFiles || []).filter((p: ProofFile) => linkedProofIds.includes(String(p.id))),
    ...(proofManager.proofTexts || []).filter((p: ProofText) => linkedProofIds.includes(String(p.id)))
  ];

  // Filtrar apenas provas orais
  const linkedOralProofs = allLinkedProofs.filter(p => isOralProof(p.name));

  // v1.21.13: Filtrar provas CONFLITO quando anonimização ativa
  const filteredProofs = linkedOralProofs.filter(proof => {
    const isPdf = proofManager.proofFiles?.some((p: ProofFile) => p.id === proof.id);
    if (anonymizationEnabled && isPdf) {
      if (proofManager.proofUsePdfMode?.[proof.id]) {
        return false; // CONFLITO: usuário quer PDF mas anon exige texto
      }
      if (!proofManager.extractedProofTexts?.[proof.id]) {
        return false; // Sem texto extraído: impossível anonimizar
      }
    }
    return true;
  });

  if (filteredProofs.length === 0) {
    return { proofDocuments: [] as AIMessageContent[], proofsContext: '', hasProofs: false, noOralProofFound: true };
  }

  const proofDocuments: AIMessageContent[] = [];
  let proofsContext = '\n\n🎤 PROVAS ORAIS VINCULADAS A ESTE TÓPICO:\n\n';

  for (let index = 0; index < filteredProofs.length; index++) {
    const proof = filteredProofs[index];
    const proofId = proof.id;
    const isPdf = proofManager.proofFiles?.some(p => p.id === proof.id);

    proofsContext += `PROVA ORAL ${index + 1}: ${proof.name}\n`;

    // Análises IA (v1.38.27: suporte a múltiplas análises)
    const analyses = proofManager.proofAnalysisResults?.[proofId];
    if (analyses && analyses.length > 0) {
      proofsContext += `\n--- ANÁLISES DA PROVA (${analyses.length}) ---\n`;
      for (let idx = 0; idx < analyses.length; idx++) {
        const analysis = analyses[idx];
        const typeLabel = analysis.type === 'livre' ? 'Livre' : 'Contextual';
        const dateStr = analysis.timestamp
          ? new Date(analysis.timestamp).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
          : '';
        proofsContext += `\nAnálise ${idx + 1} (${typeLabel}${dateStr ? ` - ${dateStr}` : ''}):\n${analysis.result}\n`;
      }
    }

    if (proofManager.proofConclusions?.[proofId]) {
      proofsContext += `\nConclusões do Juiz:\n${proofManager.proofConclusions[proofId]}\n`;
    }

    // v1.21.15: Respeita proofUsePdfMode (escolha visual do usuário)
    if (proofManager.proofSendFullContent?.[proofId]) {
      if (isPdf) {
        const usePdfMode = proofManager.proofUsePdfMode?.[proofId];
        const fullText = proofManager.extractedProofTexts?.[proofId];

        if (usePdfMode || !fullText) {
          // Usuário escolheu "Usar PDF" OU não há texto extraído → enviar PDF binário
          if (anonymizationEnabled) {
            // Anon ativa: fallback para texto extraído (se existir)
            if (fullText) {
              const nomesParaAnonimizar = anonConfig?.nomesUsuario || [];
              const textToSend = anonymizeText(fullText, anonConfig, nomesParaAnonimizar);
              proofsContext += `\nConteúdo Completo da Prova:\n${textToSend}\n`;
            } else {
              proofsContext += `\n[PDF "${proof.name}" não anexado - anonimização ativa e texto não extraído]\n`;
            }
          } else {
            const proofFile = (proof as ProofFile).file;
            if (proofFile && fileToBase64Fn) {
              // Anon desligada: enviar PDF binário
              // v1.25: Adicionado cache_control para otimização de tokens
              const base64 = await fileToBase64Fn(proofFile);
              proofDocuments.push({
                type: 'document',
                source: { type: 'base64', media_type: 'application/pdf', data: base64 },
                cache_control: base64.length > 100000 ? { type: "ephemeral" } : undefined
              });
              proofsContext += `\n[PDF "${proof.name}" anexado como documento]\n`;
            }
          }
        } else {
          // Usuário escolheu "Usar Texto" → enviar texto extraído
          const nomesParaAnonimizar = anonConfig?.nomesUsuario || [];
          const textToSend = (anonymizationEnabled && anonConfig)
            ? anonymizeText(fullText, anonConfig, nomesParaAnonimizar)
            : fullText;
          proofsContext += `\nConteúdo Completo da Prova:\n${textToSend}\n`;
        }
      } else if ((proof as ProofText).text) {
        // Anonimizar texto colado ao enviar
        const nomesParaAnonimizar = anonConfig?.nomesUsuario || [];
        const textToSend = (anonymizationEnabled && anonConfig)
          ? anonymizeText((proof as ProofText).text, anonConfig, nomesParaAnonimizar)
          : (proof as ProofText).text;
        proofsContext += `\nConteúdo Completo da Prova:\n${textToSend}\n`;
      }
    }

    proofsContext += '\n---\n\n';
  }

  return { proofDocuments, proofsContext, hasProofs: true, noOralProofFound: false };
};

// ═══════════════════════════════════════════════════════════════════════════
// FAST HASH UTILITY
// v1.9.1: Hash rápido para strings (usado em caching de tópicos)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Gera um hash rápido para uma string (32bit integer em base36)
 * @param str - String para gerar hash
 * @returns Hash em formato base36 ou 'empty' se string vazia
 */
export const fastHashUtil = (str: string): string => {
  if (!str) return 'empty';
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return hash.toString(36);
};
