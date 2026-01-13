/**
 * @file useDispositivoGeneration.ts
 * @description Hook para geração e regeneração do DISPOSITIVO da sentença
 * Extraído do App.tsx v1.37.16 - FASE 11 refactoring
 */

import { useCallback } from 'react';
import type { Topic, AIMessage, AICallOptions, AIMessageContent, DoubleCheckCorrection } from '../types';
import { AI_PROMPTS } from '../prompts';
import { normalizeHTMLSpacing, isRelatorio } from '../utils/text';

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

export type DoubleCheckOperation = 'topicExtraction' | 'dispositivo' | 'sentenceReview' | 'factsComparison';

export interface AIIntegrationForDispositivo {
  callAI: (messages: AIMessage[], options?: AICallOptions) => Promise<string>;
  aiSettings: {
    modeloDispositivo?: string;
    doubleCheck?: {
      enabled: boolean;
      operations: {
        dispositivo?: boolean;
      };
    };
  };
  dispositivoInstruction?: string;
  setGeneratingDispositivo: (value: boolean) => void;
  setRegeneratingDispositivo: (value: boolean) => void;
  setDispositivoText: (text: string) => void;
  setDispositivoInstruction: (instruction: string) => void;
  performDoubleCheck: (
    operation: DoubleCheckOperation,
    content: string,
    context: string,
    onProgress?: (msg: string) => void
  ) => Promise<{ verified: string; corrections: DoubleCheckCorrection[]; summary: string }>;
}

export interface QuillInstance {
  root: HTMLElement;
  getText: () => string;
  getContents: () => unknown;
  setContents: (delta: unknown) => void;
  clipboard: { dangerouslyPasteHTML: (html: string) => void };
}

export interface UseDispositivoGenerationProps {
  selectedTopics: Topic[];
  setSelectedTopics: (topics: Topic[] | ((prev: Topic[]) => Topic[])) => void;
  extractedTopics: Topic[];
  setExtractedTopics: (topics: Topic[] | ((prev: Topic[]) => Topic[])) => void;
  editingTopic: Topic | null;
  setEditingTopic: (topic: Topic | null) => void;
  topicsParaDispositivo: Topic[];
  aiIntegration: AIIntegrationForDispositivo;
  editorRef: React.RefObject<QuillInstance | null>;
  setError: (error: string) => void;
  setAnalysisProgress: (progress: string) => void;
  openModal: (modalId: 'dispositivo' | string) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  sanitizeHTML: (html: string) => string;
  // Funções utilitárias passadas do App.tsx
  isTopicDecidido: (topic: Topic) => boolean | string | null | undefined;
  htmlToFormattedText: (html: string) => string;
}

export interface UseDispositivoGenerationReturn {
  generateDispositivo: () => Promise<void>;
  regenerateDispositivoWithInstruction: () => Promise<void>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hook para geração do DISPOSITIVO da sentença
 *
 * @description Gera o dispositivo com base nos tópicos decididos,
 * aplicando modelo personalizado e Double Check quando configurado.
 *
 * @param props - Propriedades do hook
 * @returns Funções para gerar e regenerar dispositivo
 */
export function useDispositivoGeneration({
  selectedTopics,
  setSelectedTopics,
  extractedTopics,
  setExtractedTopics,
  editingTopic,
  setEditingTopic,
  topicsParaDispositivo,
  aiIntegration,
  editorRef,
  setError,
  setAnalysisProgress,
  openModal,
  showToast,
  sanitizeHTML,
  isTopicDecidido,
  htmlToFormattedText,
}: UseDispositivoGenerationProps): UseDispositivoGenerationReturn {

  /**
   * Gera o DISPOSITIVO inicial baseado nos tópicos decididos
   */
  const generateDispositivo = useCallback(async () => {
    if (selectedTopics.length === 0) {
      setError('Nenhum tópico selecionado. Adicione e preencha os tópicos antes de gerar o dispositivo.');
      return;
    }

    // Verificar se há tópicos decididos sem resultado selecionado (exceto RELATÓRIO, DISPOSITIVO e complementares)
    const topicsWithoutResult = selectedTopics.filter(t =>
      isTopicDecidido(t) &&
      !t.resultado &&
      t.title.toUpperCase() !== 'RELATÓRIO' &&
      t.title.toUpperCase() !== 'DISPOSITIVO' &&
      !t.isComplementar
    );

    if (topicsWithoutResult.length > 0) {
      const titulosFaltando = topicsWithoutResult.map(t => `"${t.title}"`).join(', ');
      setError(`Os seguintes tópicos estão decididos mas sem resultado selecionado: ${titulosFaltando}. Por favor, selecione o resultado (Procedente/Improcedente/etc) antes de gerar o dispositivo.`);
      return;
    }

    aiIntegration.setGeneratingDispositivo(true);
    setError('');

    try {
      // Preparar resumo de cada tópico com sua decisão
      const topicsSummary = topicsParaDispositivo.map(topic => {
        const relatorio = topic.editedRelatorio ? htmlToFormattedText(topic.editedRelatorio) : (topic.relatorio || '');

        const isDispositivo = topic.title.toUpperCase() === 'DISPOSITIVO';
        const decisao = isDispositivo
          ? (topic.editedContent ? htmlToFormattedText(topic.editedContent) : '')
          : (topic.editedFundamentacao ? htmlToFormattedText(topic.editedFundamentacao) : '');

        const temDecisao = decisao && decisao.trim() !== '' && decisao.trim() !== 'Sem decisão preenchida';
        const resultadoSelecionado = topic.resultado || 'NÃO DEFINIDO';

        return {
          titulo: topic.title,
          categoria: topic.category,
          relatorio: relatorio || '',
          decisao: temDecisao ? (decisao || '') : 'SEM DECISÃO PREENCHIDA',
          resultado: resultadoSelecionado,
          temDecisao: temDecisao
        };
      });

      const topicosComDecisao = topicsSummary.filter(t => t.temDecisao);
      const topicosSemDecisao = topicsSummary.filter(t => !t.temDecisao);

      const topicoRelatorio = selectedTopics.find(isRelatorio);
      let primeiroParagrafoRelatorio = '';

      if (topicoRelatorio) {
        const relatorioCompleto = topicoRelatorio.editedRelatorio
          ? htmlToFormattedText(topicoRelatorio.editedRelatorio)
          : (topicoRelatorio.relatorio || '');

        const linhas = relatorioCompleto.split('\n').map(l => l.trim()).filter(l => l.length > 0);

        let paragrafoEncontrado = '';
        for (const linha of linhas) {
          const ehTitulo = linha.length < 50 || (!linha.includes(',') && !linha.includes('. '));
          if (!ehTitulo) {
            paragrafoEncontrado = linha;
            break;
          }
        }

        primeiroParagrafoRelatorio = paragrafoEncontrado || (linhas[0] || '');

        if (!primeiroParagrafoRelatorio) {
          setError('Aviso: Primeiro parágrafo do RELATÓRIO está vazio. Os placeholders podem não funcionar corretamente.');
        }
      } else {
        setError('Erro: Tópico RELATÓRIO não encontrado. Crie um tópico chamado "RELATÓRIO" com os nomes das partes no primeiro parágrafo.');
      }

      // Preparar prompt com contexto dos tópicos
      const promptText = `${AI_PROMPTS.roles.redacao}

Com base nos tópicos decididos abaixo, gere um DISPOSITIVO completo.

ATENÇÃO CRÍTICA: O usuário SELECIONOU EXPLICITAMENTE o resultado de cada decisão. Use EXATAMENTE o resultado fornecido, sem interpretação.

Com base nos tópicos e resultados fornecidos abaixo, gere um DISPOSITIVO completo e bem estruturado para uma sentença trabalhista.

${AI_PROMPTS.buildPartesDoProcesso(primeiroParagrafoRelatorio)}

${AI_PROMPTS.buildTopicosSection(topicosComDecisao, topicosSemDecisao)}

INSTRUÇÕES PARA O DISPOSITIVO:

${AI_PROMPTS.regraFundamentalDispositivo}

${AI_PROMPTS.estiloRedacao}

${aiIntegration.aiSettings.modeloDispositivo ? `
═══════════════════════════════════════════════════════════════
MODELO PERSONALIZADO DO USUÁRIO:
═══════════════════════════════════════════════════════════════

Use o seguinte modelo como referência para estruturar o dispositivo:

${aiIntegration.aiSettings.modeloDispositivo}

⚠️ INSTRUÇÕES PARA PLACEHOLDERS:
Se o modelo personalizado contiver placeholders como [RECLAMANTE], [RECLAMADA], [PRIMEIRA RECLAMADA], [SEGUNDA RECLAMADA], etc., substitua-os pelos nomes reais extraídos da seção "PARTES DO PROCESSO" acima.

Importante: Use o RESULTADO SELECIONADO PELO USUÁRIO para cada tópico.

═══════════════════════════════════════════════════════════════
` : AI_PROMPTS.instrucoesDispositivoPadrao}

IMPORTANTE:
- Use linguagem formal e técnico-jurídica adequada
- Mantenha primeira pessoa do singular (DECIDO, julgo, reconheço, etc.)
- Seja objetivo e claro em cada item
- **NUNCA USE NUMERAÇÃO ROMANA (I, II, III, IV)** - use apenas hífens (-) ou bullets
- **NÃO INCLUA JUSTIFICATIVAS OU FUNDAMENTOS** - apenas o resultado
- **USE O "RESULTADO SELECIONADO PELO USUÁRIO"** - foi escolhido manualmente
- **NÃO INVERTA OS RESULTADOS** - se diz IMPROCEDENTE, escreva IMPROCEDENTE
- Organize os itens de forma lógica (questões processuais primeiro, depois mérito, pedidos não decididos por último)
- Para resultados "NÃO DEFINIDO", deixe MUITO CLARO que não foram apreciados

${AI_PROMPTS.formatacaoHTML("<strong>JULGAR PROCEDENTE</strong> o pedido de...")}

${AI_PROMPTS.formatacaoParagrafos("<p>Ante o exposto...</p><p>REJEITAR a preliminar...</p>")}

${AI_PROMPTS.numeracaoReclamadas}

CHECKLIST DE VERIFICAÇÃO FINAL:
1. ✓ Usei o "RESULTADO SELECIONADO PELO USUÁRIO" para cada tópico?
2. ✓ Se diz "IMPROCEDENTE", escrevi "IMPROCEDENTE" (não "PROCEDENTE")?
3. ✓ Se diz "PROCEDENTE", escrevi "PROCEDENTE" (não "IMPROCEDENTE")?
4. ✓ Não inverti nenhum resultado escolhido pelo usuário?
5. ✓ Omiti justificativas e incluí apenas o resultado?
6. ✓ NÃO usei numeração romana (I, II, III, IV)?
7. ✓ Usei HTML (<strong>, <em>, <br>) ao invés de markdown (**, *, ##)?

Responda APENAS com o texto completo do dispositivo em HTML, sem explicações adicionais.`;

      const contentArray: AIMessageContent[] = [{
        type: 'text' as const,
        text: promptText
      }];

      const textContent = await aiIntegration.callAI([{
        role: 'user',
        content: contentArray
      }], {
        maxTokens: 8000,
        useInstructions: true,
        logMetrics: true,
        temperature: 0.3,
        topP: 0.9,
        topK: 50
      });

      let dispositivoFinal = normalizeHTMLSpacing(textContent.trim());

      // Double Check do Dispositivo
      if (aiIntegration.aiSettings.doubleCheck?.enabled &&
          aiIntegration.aiSettings.doubleCheck?.operations.dispositivo) {

        const fundamentacaoContext = topicsSummary.map(t =>
          `${t.titulo} (${t.categoria})\nResultado: ${t.resultado}\nDecisão: ${t.decisao}`
        ).join('\n\n---\n\n');

        try {
          const { verified, corrections, summary } = await aiIntegration.performDoubleCheck(
            'dispositivo',
            dispositivoFinal,
            fundamentacaoContext
          );

          if (corrections.length > 0) {
            dispositivoFinal = verified;
            showToast(`🔄 Double Check: ${corrections.length} correção(ões) - ${summary}`, 'info');
            console.log('[DoubleCheck Dispositivo] Correções aplicadas:', corrections);
          } else {
            console.log('[DoubleCheck Dispositivo] Nenhuma correção necessária');
          }
        } catch (dcError) {
          console.error('[DoubleCheck Dispositivo] Erro:', dcError);
        }
      }

      aiIntegration.setDispositivoText(dispositivoFinal);
      openModal('dispositivo');
      aiIntegration.setGeneratingDispositivo(false);
    } catch (err) {
      setError('Erro ao gerar dispositivo: ' + (err as Error).message);
      aiIntegration.setGeneratingDispositivo(false);
    }
  }, [
    selectedTopics,
    topicsParaDispositivo,
    aiIntegration,
    setError,
    openModal,
    showToast,
    isTopicDecidido,
    htmlToFormattedText
  ]);

  /**
   * Regenera o DISPOSITIVO com instrução customizada do usuário
   */
  const regenerateDispositivoWithInstruction = useCallback(async () => {
    if (!editingTopic || editingTopic.title.toUpperCase() !== 'DISPOSITIVO') {
      setError('Esta função só pode ser usada para o tópico DISPOSITIVO');
      return;
    }

    if (selectedTopics.length === 0) {
      setError('Nenhum tópico selecionado. Adicione e preencha os tópicos antes de regenerar o dispositivo.');
      return;
    }

    const topicsWithoutResult = selectedTopics.filter(t =>
      isTopicDecidido(t) &&
      !t.resultado &&
      t.title.toUpperCase() !== 'RELATÓRIO' &&
      t.title.toUpperCase() !== 'DISPOSITIVO' &&
      !t.isComplementar
    );

    if (topicsWithoutResult.length > 0) {
      const titulosFaltando = topicsWithoutResult.map(t => `"${t.title}"`).join(', ');
      setError(`Os seguintes tópicos estão decididos mas sem resultado selecionado: ${titulosFaltando}. Por favor, selecione o resultado (Procedente/Improcedente/etc) antes de regenerar o dispositivo.`);
      return;
    }

    aiIntegration.setRegeneratingDispositivo(true);
    setAnalysisProgress('🔄 Regenerando DISPOSITIVO...');

    try {
      const topicsSummary = topicsParaDispositivo.map(topic => {
        const relatorio = topic.editedRelatorio ? htmlToFormattedText(topic.editedRelatorio) : (topic.relatorio || '');
        const decisao = topic.editedFundamentacao ? htmlToFormattedText(topic.editedFundamentacao) : '';
        const temDecisao = decisao && decisao.trim() !== '' && decisao.trim() !== 'Sem decisão preenchida';

        return {
          titulo: topic.title,
          categoria: topic.category,
          relatorio: relatorio || '',
          decisao: temDecisao ? (decisao || '') : 'SEM DECISÃO PREENCHIDA',
          resultado: topic.resultado || 'NÃO DEFINIDO',
          temDecisao: temDecisao
        };
      });

      const topicoRelatorio = selectedTopics.find(isRelatorio);
      let primeiroParagrafoRelatorio = '';
      if (topicoRelatorio) {
        const relatorioCompleto = htmlToFormattedText(topicoRelatorio.editedRelatorio || topicoRelatorio.relatorio || '');
        const linhas = relatorioCompleto.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        for (const linha of linhas) {
          const ehTitulo = linha.length < 50 || (!linha.includes(',') && !linha.includes('. '));
          if (!ehTitulo) {
            primeiroParagrafoRelatorio = linha;
            break;
          }
        }
        primeiroParagrafoRelatorio = primeiroParagrafoRelatorio || (linhas[0] || '');
      }

      const topicosComDecisao = topicsSummary.filter(t => t.temDecisao);
      const topicosSemDecisao = topicsSummary.filter(t => !t.temDecisao);

      const instrucaoCustomizada = aiIntegration.dispositivoInstruction?.trim() || '';

      const promptText = `${AI_PROMPTS.roles.redacao}

Com base nos tópicos decididos abaixo, gere um DISPOSITIVO completo.

${instrucaoCustomizada ? `
═══════════════════════════════════════════════════════════════
📝 INSTRUÇÃO CUSTOMIZADA DO USUÁRIO:
═══════════════════════════════════════════════════════════════

${instrucaoCustomizada}

═══════════════════════════════════════════════════════════════
` : ''}

ATENÇÃO CRÍTICA: O usuário SELECIONOU EXPLICITAMENTE o resultado de cada decisão. Use EXATAMENTE o resultado fornecido, sem interpretação.

Com base nos tópicos e resultados fornecidos abaixo, gere um DISPOSITIVO completo e bem estruturado para uma sentença trabalhista.

${AI_PROMPTS.buildPartesDoProcesso(primeiroParagrafoRelatorio)}

${AI_PROMPTS.buildTopicosSection(topicosComDecisao, topicosSemDecisao)}

INSTRUÇÕES PARA O DISPOSITIVO:

${AI_PROMPTS.regraFundamentalDispositivo}

${AI_PROMPTS.estiloRedacao}

${aiIntegration.aiSettings.modeloDispositivo ? `
═══════════════════════════════════════════════════════════════
MODELO PERSONALIZADO DO USUÁRIO:
═══════════════════════════════════════════════════════════════

Use o seguinte modelo como referência para estruturar o dispositivo:

${aiIntegration.aiSettings.modeloDispositivo}

⚠️ INSTRUÇÕES PARA PLACEHOLDERS:
Se o modelo personalizado contiver placeholders como [RECLAMANTE], [RECLAMADA], [PRIMEIRA RECLAMADA], [SEGUNDA RECLAMADA], etc., substitua-os pelos nomes reais extraídos da seção "PARTES DO PROCESSO" acima.

Importante: Use o RESULTADO SELECIONADO PELO USUÁRIO para cada tópico.

═══════════════════════════════════════════════════════════════
` : AI_PROMPTS.instrucoesDispositivoPadrao}${(aiIntegration.dispositivoInstruction || '').trim() ? `

═══════════════════════════════════════════════════════════════
⚠️ INSTRUÇÃO ADICIONAL DO USUÁRIO (v1.5.8c):
═══════════════════════════════════════════════════════════════

${(aiIntegration.dispositivoInstruction || '').trim()}

Por favor, considere esta instrução adicional ao gerar o dispositivo, mantendo todas as demais regras e estruturas definidas acima.

═══════════════════════════════════════════════════════════════
` : ''}

IMPORTANTE:
- Use linguagem formal e técnico-jurídica adequada
- Mantenha primeira pessoa do singular (DECIDO, julgo, reconheço, etc.)
- Seja objetivo e claro em cada item
- **NUNCA USE NUMERAÇÃO ROMANA (I, II, III, IV)** - use apenas hífens (-) ou bullets
- **NÃO INCLUA JUSTIFICATIVAS OU FUNDAMENTOS** - apenas o resultado
- **USE O "RESULTADO SELECIONADO PELO USUÁRIO"** - foi escolhido manualmente
- **NÃO INVERTA OS RESULTADOS** - se diz IMPROCEDENTE, escreva IMPROCEDENTE
- Organize os itens de forma lógica (questões processuais primeiro, depois mérito, pedidos não decididos por último)
- Para resultados "NÃO DEFINIDO", deixe MUITO CLARO que não foram apreciados

${AI_PROMPTS.formatacaoHTML("<strong>JULGAR PROCEDENTE</strong> o pedido de...")}

${AI_PROMPTS.formatacaoParagrafos("<p>Ante o exposto...</p><p>REJEITAR a preliminar...</p>")}

${AI_PROMPTS.numeracaoReclamadas}

CHECKLIST DE VERIFICAÇÃO FINAL:
1. ✓ Usei o "RESULTADO SELECIONADO PELO USUÁRIO" para cada tópico?
2. ✓ Se diz "IMPROCEDENTE", escrevi "IMPROCEDENTE" (não "PROCEDENTE")?
3. ✓ Se diz "PROCEDENTE", escrevi "PROCEDENTE" (não "IMPROCEDENTE")?
4. ✓ Não inverti nenhum resultado escolhido pelo usuário?
5. ✓ Omiti justificativas e incluí apenas o resultado?
6. ✓ NÃO usei numeração romana (I, II, III, IV)?
7. ✓ Usei HTML (<strong>, <em>, <br>) ao invés de markdown (**, *, ##)?

Responda APENAS com o texto completo do dispositivo em HTML, sem explicações adicionais.`;

      const contentArray: AIMessageContent[] = [{
        type: 'text' as const,
        text: promptText
      }];

      const textContent = await aiIntegration.callAI([{
        role: 'user',
        content: contentArray
      }], {
        maxTokens: 8000,
        useInstructions: true,
        logMetrics: true,
        temperature: 0.3,
        topP: 0.9,
        topK: 50
      });

      if (!textContent || textContent.trim() === '') {
        throw new Error('Dispositivo gerado está vazio');
      }

      const htmlContent = normalizeHTMLSpacing(textContent.trim());

      const updatedTopic = {
        ...editingTopic,
        editedContent: htmlContent
      };
      setEditingTopic(updatedTopic);

      if (editorRef.current) {
        editorRef.current.root.innerHTML = sanitizeHTML(htmlContent);
      }

      setSelectedTopics(selectedTopics.map(t =>
        t.title === editingTopic.title ? updatedTopic : t
      ));
      setExtractedTopics(extractedTopics.map(t =>
        t.title === editingTopic.title ? updatedTopic : t
      ));

      setAnalysisProgress('');
      aiIntegration.setDispositivoInstruction('');
      showToast('✅ DISPOSITIVO regenerado com sucesso!', 'success');

    } catch (err) {
      setError('Erro ao regenerar DISPOSITIVO: ' + (err as Error).message);
      setAnalysisProgress('');
    } finally {
      aiIntegration.setRegeneratingDispositivo(false);
    }
  }, [
    editingTopic,
    setEditingTopic,
    selectedTopics,
    setSelectedTopics,
    extractedTopics,
    setExtractedTopics,
    topicsParaDispositivo,
    aiIntegration,
    editorRef,
    setError,
    setAnalysisProgress,
    showToast,
    sanitizeHTML,
    isTopicDecidido,
    htmlToFormattedText
  ]);

  return {
    generateDispositivo,
    regenerateDispositivoWithInstruction,
  };
}
