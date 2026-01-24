/**
 * @file useDecisionTextGeneration.ts
 * @description Hook para geração de texto de decisão judicial via IA
 * @version 1.37.65 - Double Check para quick prompts
 *
 * Funções extraídas do App.tsx (FASE 12):
 * - generateAiText: Gera texto para decisão com contexto do tópico
 * - insertAiText: Insere texto gerado no editor
 * - buildContextForChat: Constrói contexto para chat assistente
 * - handleInsertChatResponse: Insere resposta do chat no editor
 * - handleSendChatMessage: Envia mensagem para chat assistente
 * - generateAiTextForModel: Gera texto para modelo de decisão
 * - insertAiTextModel: Insere texto gerado no editor de modelo
 */

import React, { useRef, useEffect } from 'react';
import type {
  Topic,
  InsertMode,
  AnonymizationSettings,
  AIMessageContent,
  DoubleCheckReviewResult,
  DoubleCheckCorrection,
  DoubleCheckCorrectionWithSelection,
} from '../types';
import type { QuillInstance } from '../types';
import { AI_PROMPTS } from '../prompts/ai-prompts';
import { stripInlineColors } from '../utils/color-stripper';
import { prepareDocumentsContext, prepareProofsContext } from '../utils/context-helpers';
import { normalizeHTMLSpacing } from '../utils/text';
import { getCorrectionDescription } from '../utils/double-check-utils';
import { sanitizeQuillHTML } from './useQuillEditor';
import { useUIStore } from '../stores/useUIStore';
import { buildChatContext } from '../utils/chat-context-builder';

// ═══════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

export interface AIIntegrationForDecisionText {
  aiInstruction: string;
  aiInstructionModel: string;
  aiGeneratedText: string;
  aiGeneratedTextModel: string;
  aiSettings?: {
    anonymization?: {
      enabled?: boolean;
    };
    // v1.37.65: Double Check settings
    doubleCheck?: {
      enabled: boolean;
      operations: {
        quickPrompt?: boolean;
      };
    };
  };
  setGeneratingAi: (generating: boolean) => void;
  setGeneratingAiModel: (generating: boolean) => void;
  setAiGeneratedText: (text: string) => void;
  setAiGeneratedTextModel: (text: string) => void;
  setAiInstruction: (instruction: string) => void;
  setAiInstructionModel: (instruction: string) => void;
  callAI: (
    messages: Array<{ role: string; content: AIMessageContent[] | string }>,
    options?: {
      maxTokens?: number;
      useInstructions?: boolean;
      logMetrics?: boolean;
      temperature?: number;
      topP?: number;
      topK?: number;
    }
  ) => Promise<string>;
  // v1.37.65: Double Check para quick prompts
  // v1.37.68: context agora é AIMessageContent[] (não string)
  performDoubleCheck?: (
    operation: 'topicExtraction' | 'dispositivo' | 'sentenceReview' | 'factsComparison' | 'proofAnalysis' | 'quickPrompt',
    originalResponse: string,
    context: AIMessageContent[],  // v1.37.68: mudou de string para array
    onProgress?: (msg: string) => void,
    userPrompt?: string
  ) => Promise<{
    verified: string;
    corrections: DoubleCheckCorrection[];
    summary: string;
    confidence?: number;
    failed?: boolean;
  }>;
}

export interface ProofManagerForDecisionText {
  proofs: Array<{
    id: string | number;
    title: string;
    topics?: string[];
    base64?: string;
    text?: string;
    isPdf?: boolean;
    type?: string;
    analysis?: string;
    conclusion?: string;
    extractedText?: string;
    anonymizationStatus?: 'OK' | 'CONFLITO' | null;
  }>;
}

export interface ChatAssistantForDecisionText {
  lastResponse: string | null;
  /** v1.38.34: Retorna response diretamente para evitar race condition */
  send: (
    message: string,
    contextBuilder: (msg: string) => Promise<AIMessageContent[]>
  ) => Promise<{ success: boolean; error?: string; response?: string | null }>;
  // v1.37.65: Double Check para quick prompts
  updateLastAssistantMessage: (newContent: string) => void;
}

export interface ModelLibraryForDecisionText {
  newModel: {
    title: string;
    category?: string;
    content: string;
  };
  setNewModel: (model: {
    title: string;
    category?: string;
    content: string;
  }) => void;
}

export interface AnalyzedDocuments {
  peticoes?: string[];
  peticoesText?: Array<{ name?: string; text: string }>;
  contestacoes?: string[];
  contestacoesText?: Array<{ text: string }>;
  complementares?: string[];
  complementaresText?: Array<{ text: string }>;
}

export interface UseDecisionTextGenerationProps {
  aiIntegration: AIIntegrationForDecisionText;
  proofManager: ProofManagerForDecisionText;
  chatAssistant: ChatAssistantForDecisionText;
  modelLibrary: ModelLibraryForDecisionText;
  analyzedDocuments: AnalyzedDocuments;
  editorRef: React.RefObject<QuillInstance | null>;
  modelEditorRef: React.RefObject<QuillInstance | null>;
  editingTopic: Topic | null;
  setEditingTopic: (topic: Topic | null) => void;
  selectedTopics: Topic[];
  topicContextScope: 'current' | 'selected' | 'all';
  storage: {
    fileToBase64: (file: File) => Promise<string>;
  };
  closeModal: (modalId: string) => void;
  setError: (error: string) => void;
  sanitizeHTML: (html: string) => string;
  showToast?: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

/** v1.38.12: Opções para construção de contexto do chat */
export interface ChatContextOptions {
  proofFilter?: string;
  includeMainDocs?: boolean;
  selectedContextTopics?: string[];
}

export interface UseDecisionTextGenerationReturn {
  generateAiText: () => Promise<void>;
  insertAiText: (mode: InsertMode) => void;
  buildContextForChat: (userMessage: string, options?: ChatContextOptions) => Promise<AIMessageContent[]>;
  handleInsertChatResponse: (mode: InsertMode) => void;
  handleSendChatMessage: (message: string, options?: ChatContextOptions) => Promise<void>;
  generateAiTextForModel: () => Promise<void>;
  insertAiTextModel: (mode: InsertMode) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

export function useDecisionTextGeneration(props: UseDecisionTextGenerationProps): UseDecisionTextGenerationReturn {
  const {
    aiIntegration,
    proofManager,
    chatAssistant,
    modelLibrary,
    analyzedDocuments,
    editorRef,
    modelEditorRef,
    editingTopic,
    setEditingTopic,
    selectedTopics,
    topicContextScope,
    storage,
    closeModal,
    setError,
    sanitizeHTML,
    showToast,
  } = props;

  // ═══════════════════════════════════════════════════════════════════════════
  // DOUBLE CHECK INTEGRATION (v1.37.65)
  // ═══════════════════════════════════════════════════════════════════════════
  const openDoubleCheckReview = useUIStore(state => state.openDoubleCheckReview);
  const doubleCheckResult = useUIStore(state => state.doubleCheckResult);
  const setDoubleCheckResult = useUIStore(state => state.setDoubleCheckResult);

  // Ref para armazenar o resolver da Promise que aguarda decisao do usuario
  const pendingDoubleCheckResolve = useRef<((result: DoubleCheckReviewResult) => void) | null>(null);

  // Quando o usuario decide no modal, resolver a Promise pendente
  useEffect(() => {
    if (doubleCheckResult && doubleCheckResult.operation === 'quickPrompt' && pendingDoubleCheckResolve.current) {
      pendingDoubleCheckResolve.current(doubleCheckResult);
      pendingDoubleCheckResolve.current = null;
      setDoubleCheckResult(null);
    }
  }, [doubleCheckResult, setDoubleCheckResult]);

  // ═══════════════════════════════════════════════════════════════════════════
  // GENERATE AI TEXT (DECISÃO)
  // ═══════════════════════════════════════════════════════════════════════════

  const generateAiText = async () => {
    if (!aiIntegration.aiInstruction?.trim()) {
      setError('Digite uma instrução para a IA');
      return;
    }

    aiIntegration.setGeneratingAi(true);
    aiIntegration.setAiGeneratedText('');

    try {
      const currentContent = editorRef.current?.root?.innerText || '';

      // Preparar documentos usando helper
      const { contentArray, flags } = prepareDocumentsContext(analyzedDocuments);
      const { hasPeticao, hasContestacoes, hasComplementares } = flags;

      // Usar função centralizada para provas
      const { proofDocuments, proofsContext, hasProofs } = await prepareProofsContext(
        proofManager as Parameters<typeof prepareProofsContext>[0],
        editingTopic?.title || '',
        storage.fileToBase64,
        aiIntegration?.aiSettings?.anonymization?.enabled,
        aiIntegration?.aiSettings?.anonymization as AnonymizationSettings | null | undefined
      );
      contentArray.push(...proofDocuments);

      // Preparar contexto baseado no escopo selecionado
      let decisionContext = '';

      if (topicContextScope === 'current') {
        // Apenas o tópico atual
        decisionContext = `📋 CONTEXTO DO TÓPICO:
Título: ${editingTopic?.title || 'Não especificado'}
Categoria: ${editingTopic?.category || 'Não especificada'}

📝 MINI-RELATÓRIO DO TÓPICO:
${editingTopic?.relatorio || 'Não disponível'}

✍️ CONTEÚDO JÁ ESCRITO DA DECISÃO:
${currentContent || 'Ainda não foi escrito nada'}`;
      } else {
        // Toda a decisão (todos os tópicos)
        decisionContext = '📋 CONTEXTO COMPLETO DA DECISÃO:\n\n';

        selectedTopics.forEach((t, index) => {
          const titleUpper = t.title.toUpperCase();
          if (titleUpper === 'RELATÓRIO') {
            decisionContext += `📄 RELATÓRIO GERAL:\n${t.editedRelatorio || t.relatorio || 'Não disponível'}\n\n---\n\n`;
          } else if (titleUpper === 'DISPOSITIVO') {
            decisionContext += `⚖️ DISPOSITIVO:\n${t.editedContent || ''}\n\n---\n\n`;
          } else {
            decisionContext += `📋 TÓPICO ${index}: ${t.title} (${t.category || 'Sem categoria'})
Mini-relatório: ${t.editedRelatorio || t.relatorio || 'Não disponível'}
Decisão: ${t.editedFundamentacao || t.fundamentacao || 'Não escrita'}

---

`;
          }
        });

        decisionContext += `\n🎯 TÓPICO SENDO EDITADO: ${editingTopic?.title}
✍️ CONTEÚDO JÁ ESCRITO NESTE TÓPICO:
${currentContent || 'Ainda não foi escrito nada'}`;
      }

      // Adicionar instrução de texto
      contentArray.push({
        type: 'text',
        text: `Você está auxiliando na redação de uma DECISÃO JUDICIAL TRABALHISTA.

${decisionContext}

${hasPeticao || hasContestacoes || hasComplementares || hasProofs ? `
📚 DOCUMENTOS DISPONÍVEIS PARA CONSULTA:
${hasPeticao ? '✓ Petição inicial' : ''}
${hasContestacoes ? '✓ Contestação(ões)' : ''}
${hasComplementares ? '✓ Documento(s) complementar(es)' : ''}
${hasProofs ? '✓ Prova(s) vinculada(s) a este tópico' : ''}

Os documentos foram anexados acima. Você pode e DEVE consultá-los para fundamentar sua decisão, especialmente:
- Para identificar alegações e argumentos das partes
- Para verificar provas mencionadas
- Para fundamentar sua decisão com base no que foi apresentado nos autos
${hasProofs ? '- Para analisar as provas vinculadas e suas respectivas análises/conclusões' : ''}
` : ''}
${proofsContext}
🎯 INSTRUÇÃO DO USUÁRIO:
${aiIntegration.aiInstruction}

⚠️ IMPORTANTE - NÃO INCLUIR MINI-RELATÓRIO:
- O mini-relatório já foi fornecido acima apenas como CONTEXTO
- NÃO repita ou resuma os fatos no texto gerado
- NÃO inicie com "Trata-se de...", "Cuida-se de...", "O reclamante postula..."
- Vá DIRETO para a análise jurídica, fundamentação e conclusão

${AI_PROMPTS.estiloRedacao}

Com base em TODOS os elementos acima (contexto do tópico, documentos processuais e instrução do usuário), gere o texto solicitado.

O texto deve:
- Ser adequado para uma decisão judicial trabalhista
- Usar SEMPRE a primeira pessoa
- Manter linguagem formal, mas acessível
- Evitar latinismos desnecessários
- Ser claro e objetivo
- Considerar o contexto do tópico e o que já foi escrito
- FUNDAMENTAR-SE nos documentos processuais (petição, contestações, provas)
- Citar fatos específicos dos autos quando relevante
- Aplicar bases legais quando apropriado

${AI_PROMPTS.formatacaoHTML("A <strong>CLT</strong> estabelece que...")}

${AI_PROMPTS.formatacaoParagrafos("<p>Passo a analisar...</p><p>A CLT estabelece...</p>")}

${AI_PROMPTS.numeracaoReclamadas}

Responda APENAS com o texto gerado em HTML, sem prefácio, sem explicações. Gere texto pronto para ser inserido na decisão.`
      });

      // Parâmetros para assistente interativo (criativo moderado)
      const textContent = await aiIntegration.callAI([{
        role: 'user',
        content: contentArray
      }], {
        maxTokens: 4000,
        useInstructions: true,
        logMetrics: true,
        temperature: 0.5,
        topP: 0.9,
        topK: 80
      });

      aiIntegration.setAiGeneratedText(textContent.trim());
      setError('');
    } catch (err) {
      setError('Erro ao gerar texto com IA: ' + (err as Error).message);
    } finally {
      aiIntegration.setGeneratingAi(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // INSERT AI TEXT (DECISÃO)
  // ═══════════════════════════════════════════════════════════════════════════

  const insertAiText = (mode: InsertMode) => {
    if (!aiIntegration.aiGeneratedText || !editorRef.current || !editingTopic) return;

    const currentHtml = editorRef.current.root.innerHTML;
    const normalizedAiText = normalizeHTMLSpacing(aiIntegration.aiGeneratedText);
    let newHtml: string;

    switch (mode) {
      case 'replace':
        // v1.37.81: stripInlineColors para sistema color-free
        newHtml = stripInlineColors(sanitizeHTML(normalizedAiText) || '');
        break;
      case 'append':
        newHtml = stripInlineColors(sanitizeHTML(currentHtml + '<br>' + normalizedAiText) || '');
        break;
      case 'prepend':
        newHtml = stripInlineColors(sanitizeHTML(normalizedAiText + '<br>' + currentHtml) || '');
        break;
    }

    editorRef.current.root.innerHTML = newHtml;

    setEditingTopic({
      ...editingTopic,
      editedFundamentacao: newHtml
    });

    closeModal('aiAssistant');
    aiIntegration.setAiInstruction('');
    aiIntegration.setAiGeneratedText('');
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // BUILD CONTEXT FOR CHAT
  // v1.38.21: Centralizado em chat-context-builder.ts
  // ═══════════════════════════════════════════════════════════════════════════

  const buildContextForChat = React.useCallback(async (userMessage: string, options: ChatContextOptions = {}) => {
    if (!editingTopic) return [];

    return buildChatContext({
      userMessage,
      options,
      currentTopic: editingTopic,
      currentContent: editorRef.current?.root?.innerText || '',
      allTopics: selectedTopics,
      contextScope: options.selectedContextTopics?.length ? 'selected' : topicContextScope,
      analyzedDocuments,
      proofManager: proofManager as Parameters<typeof buildChatContext>[0]['proofManager'],
      fileToBase64: storage.fileToBase64,
      anonymizationEnabled: aiIntegration?.aiSettings?.anonymization?.enabled,
      anonymizationSettings: aiIntegration?.aiSettings?.anonymization as AnonymizationSettings | undefined,
    });
  }, [editingTopic, selectedTopics, topicContextScope, analyzedDocuments, proofManager, storage.fileToBase64, aiIntegration?.aiSettings?.anonymization, editorRef]);

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLE INSERT CHAT RESPONSE
  // ═══════════════════════════════════════════════════════════════════════════

  const handleInsertChatResponse = React.useCallback((mode: InsertMode) => {
    const response = chatAssistant.lastResponse;
    if (!response || !editorRef.current || !editingTopic) return;

    const currentHtml = editorRef.current.root.innerHTML;
    const normalizedAiText = normalizeHTMLSpacing(response);
    let newHtml: string;

    switch (mode) {
      case 'replace':
        // v1.37.81: stripInlineColors para sistema color-free
        newHtml = stripInlineColors(sanitizeHTML(normalizedAiText) || '');
        break;
      case 'append':
        newHtml = stripInlineColors(sanitizeHTML(currentHtml + '<br>' + normalizedAiText) || '');
        break;
      case 'prepend':
        newHtml = stripInlineColors(sanitizeHTML(normalizedAiText + '<br>' + currentHtml) || '');
        break;
      default:
        newHtml = stripInlineColors(sanitizeHTML(normalizedAiText) || '');
    }

    editorRef.current.root.innerHTML = newHtml;
    setEditingTopic({
      ...editingTopic,
      editedFundamentacao: newHtml
    });
  }, [chatAssistant.lastResponse, editingTopic, setEditingTopic, editorRef, sanitizeHTML]);

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLE SEND CHAT MESSAGE
  // ═══════════════════════════════════════════════════════════════════════════

  const handleSendChatMessage = React.useCallback(async (message: string, options: ChatContextOptions = {}) => {
    const contextBuilderWithOptions = (msg: string) => buildContextForChat(msg, options);
    const result = await chatAssistant.send(message, contextBuilderWithOptions);

    // ═══════════════════════════════════════════════════════════════════════════
    // DOUBLE CHECK DO QUICK PROMPT (v1.37.65)
    // v1.38.34: Usar result.response diretamente (evita race condition com lastResponse memoizado)
    // v1.38.35: Mostrar "Verificando resposta..." enquanto Double Check roda
    // ═══════════════════════════════════════════════════════════════════════════
    if (result.success &&
        result.response &&
        aiIntegration?.aiSettings?.doubleCheck?.enabled &&
        aiIntegration?.aiSettings?.doubleCheck?.operations?.quickPrompt &&
        aiIntegration?.performDoubleCheck) {
      const originalResponse = result.response; // v1.38.34: Usar resposta direta do result

      // v1.38.35: Mostrar estado de verificação no chat ANTES de rodar Double Check
      chatAssistant.updateLastAssistantMessage('🔍 Verificando resposta...');

      try {
        // v1.37.68: Passar contextContent diretamente (sem filtrar para texto)
        const contextContent = await buildContextForChat(message, options);
        const contextArray: AIMessageContent[] = Array.isArray(contextContent)
          ? contextContent as AIMessageContent[]
          : [{ type: 'text' as const, text: String(contextContent) }];

        const { verified, corrections, summary, confidence, failed } = await aiIntegration.performDoubleCheck(
          'quickPrompt',
          originalResponse,
          contextArray,  // v1.37.68: Array (não string)
          undefined,  // onProgress
          message  // userPrompt - texto do quick prompt/mensagem do usuario
        );

        if (corrections.length > 0) {
          // Converter corrections para tipo esperado com descrição legível
          const typedCorrections: DoubleCheckCorrectionWithSelection[] = corrections.map((c, idx) => {
            const type = typeof c === 'object' && c !== null && 'type' in c ? String(c.type) : 'improve';
            const reason = typeof c === 'object' && c !== null && 'reason' in c ? String(c.reason) : '';
            const item = typeof c === 'object' && c !== null && 'item' in c ? String(c.item) : `Correção ${idx + 1}`;
            const suggestion = typeof c === 'object' && c !== null && 'suggestion' in c ? String(c.suggestion) : '';

            const correction: DoubleCheckCorrection = { type: type as DoubleCheckCorrection['type'], reason, item, suggestion };

            return {
              ...correction,
              id: `quickPrompt-${idx}-${type}`,
              selected: true,
              description: getCorrectionDescription('quickPrompt', correction)
            };
          });

          const waitForDecision = new Promise<DoubleCheckReviewResult>(resolve => {
            pendingDoubleCheckResolve.current = resolve;
          });

          openDoubleCheckReview({
            operation: 'quickPrompt',
            originalResult: originalResponse,
            verifiedResult: verified,
            corrections: typedCorrections,
            summary,
            confidence: Math.round((confidence ?? 0.85) * 100)
          });

          const dcResult = await waitForDecision;

          if (dcResult.selected.length > 0) {
            // v1.38.35: Atualizar chat com resposta corrigida
            chatAssistant.updateLastAssistantMessage(dcResult.finalResult);
            console.log('[DoubleCheck QuickPrompt] Correções aplicadas:', dcResult.selected);
          } else {
            // v1.38.35: Usuário rejeitou correções - restaurar resposta original
            chatAssistant.updateLastAssistantMessage(originalResponse);
            console.log('[DoubleCheck QuickPrompt] Usuário descartou correções - restaurando original');
          }
        } else if (failed) {
          // Verificação falhou - restaurar resposta original e notificar
          chatAssistant.updateLastAssistantMessage(originalResponse);
          console.warn('[DoubleCheck QuickPrompt] Verificação falhou - resultado não verificado');
          showToast?.('Double Check: verificação falhou, resultado não verificado', 'warning');
        } else {
          // v1.38.35: Sem correções - restaurar resposta original
          chatAssistant.updateLastAssistantMessage(originalResponse);
          console.log('[DoubleCheck QuickPrompt] Sem correções - resposta verificada OK');
        }
      } catch (dcError) {
        // v1.38.35: Erro no Double Check - restaurar resposta original
        chatAssistant.updateLastAssistantMessage(originalResponse);
        console.error('[DoubleCheck QuickPrompt] Erro:', dcError);
      }
    }
  }, [chatAssistant, buildContextForChat, aiIntegration, openDoubleCheckReview, showToast]);

  // ═══════════════════════════════════════════════════════════════════════════
  // GENERATE AI TEXT FOR MODEL
  // ═══════════════════════════════════════════════════════════════════════════

  const generateAiTextForModel = async () => {
    // Verificação defensiva
    if (!aiIntegration?.callAI) {
      console.error('[generateAiTextForModel] aiIntegration.callAI undefined');
      setError('Erro interno: sistema de IA não inicializado. Recarregue a página.');
      return;
    }
    if (!aiIntegration.aiInstructionModel?.trim()) {
      setError('Digite uma instrução para a IA');
      return;
    }

    aiIntegration.setGeneratingAiModel(true);
    aiIntegration.setAiGeneratedTextModel('');

    try {
      // Obter conteúdo atual do editor (Quill)
      let currentContent = '';
      if (modelEditorRef.current) {
        currentContent = modelEditorRef.current.root ? modelEditorRef.current.root.innerText : '';
      }

      const prompt = `Você está auxiliando na criação de um modelo de texto para decisões judiciais trabalhistas.

CONTEXTO DO MODELO:
Título: ${modelLibrary.newModel.title || 'Não especificado'}
Categoria: ${modelLibrary.newModel.category || 'Não especificada'}

CONTEÚDO JÁ ESCRITO:
${currentContent || 'Ainda não foi escrito nada'}

INSTRUÇÃO DO USUÁRIO:
${aiIntegration.aiInstructionModel}

⚠️ IMPORTANTE - NÃO INCLUIR MINI-RELATÓRIO:
- Este é um MODELO genérico de decisão, não um caso específico
- NÃO inicie com resumo de fatos ou mini-relatório
- NÃO use "Trata-se de...", "Cuida-se de...", "O reclamante postula..."
- Vá DIRETO para a análise jurídica, fundamentação e conclusão
- Use termos genéricos ("o reclamante", "a reclamada", "os documentos dos autos")

${AI_PROMPTS.estiloRedacao}

Baseado no contexto acima e na instrução do usuário, gere o texto solicitado. O texto deve:
- Ser adequado para um modelo reutilizável de decisão judicial trabalhista
- Usar SEMPRE a primeira pessoa
- Manter linguagem formal, mas acessível
- Evitar latinismos desnecessários
- Ser claro e objetivo
- Ser genérico o suficiente para ser adaptável a diferentes casos similares
- Fundamentar em bases legais quando apropriado

Responda APENAS com o texto gerado, sem prefácio, sem explicações, sem markdown. Gere texto pronto para ser inserido no modelo.`;

      // Parâmetros para assistente de modelos (mais criativo)
      const textContent = await aiIntegration.callAI([{
        role: 'user',
        content: [{ type: 'text', text: prompt }]
      }], {
        maxTokens: 4000,
        useInstructions: true,
        temperature: 0.6,
        topP: 0.9,
        topK: 100
      });

      aiIntegration.setAiGeneratedTextModel(textContent);
      setError('');
    } catch (err) {
      setError('Erro ao gerar texto com IA: ' + (err as Error).message);
    } finally {
      aiIntegration.setGeneratingAiModel(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // INSERT AI TEXT FOR MODEL
  // ═══════════════════════════════════════════════════════════════════════════

  const insertAiTextModel = (mode: InsertMode) => {
    if (!aiIntegration.aiGeneratedTextModel || !modelEditorRef.current) return;

    const quillInstance = modelEditorRef.current;
    const generatedText = normalizeHTMLSpacing(aiIntegration.aiGeneratedTextModel);

    switch (mode) {
      case 'replace':
        // Substituir todo o conteúdo
        // v1.37.81: stripInlineColors para sistema color-free
        quillInstance.root.innerHTML = stripInlineColors(sanitizeQuillHTML(generatedText));
        break;

      case 'append': {
        // Adicionar ao final
        const currentLength = quillInstance.getLength();
        quillInstance.insertText(currentLength - 1, '\n');
        quillInstance.clipboard.dangerouslyPasteHTML(
          quillInstance.getLength(),
          stripInlineColors(sanitizeQuillHTML(generatedText))
        );
        break;
      }

      case 'prepend':
        // Adicionar no início
        quillInstance.clipboard.dangerouslyPasteHTML(0, stripInlineColors(sanitizeQuillHTML(generatedText + '\n')));
        break;
    }

    // Atualizar estado com o HTML do Quill
    const newContent = stripInlineColors(sanitizeQuillHTML(quillInstance.root.innerHTML));
    modelLibrary.setNewModel({
      ...modelLibrary.newModel,
      content: newContent
    });

    closeModal('aiAssistantModel');
    aiIntegration.setAiInstructionModel('');
    aiIntegration.setAiGeneratedTextModel('');
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RETURN
  // ═══════════════════════════════════════════════════════════════════════════

  return {
    generateAiText,
    insertAiText,
    buildContextForChat,
    handleInsertChatResponse,
    handleSendChatMessage,
    generateAiTextForModel,
    insertAiTextModel,
  };
}
