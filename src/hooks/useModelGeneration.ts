/**
 * @file useModelGeneration.ts
 * @description Hook para geração de keywords e títulos de modelos via IA
 * Extraído do App.tsx v1.37.8 - FASE 7 LegalDecisionEditor refactoring
 */

import { useCallback } from 'react';
import type { AIMessage, AICallOptions, NewModelData } from '../types';
import { AI_PROMPTS } from '../prompts';

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

export interface AIIntegrationForModelGen {
  callAI: (messages: AIMessage[], options?: AICallOptions) => Promise<string>;
  setGeneratingKeywords: (value: boolean) => void;
  setGeneratingTitle: (value: boolean) => void;
}

export interface ModelLibraryForModelGen {
  newModel: NewModelData;
  setNewModel: (model: NewModelData | ((prev: NewModelData) => NewModelData)) => void;
}

export interface APICacheForModelGen {
  get: (key: string) => unknown;
  set: (key: string, value: unknown) => void;
}

export interface UseModelGenerationProps {
  aiIntegration: AIIntegrationForModelGen;
  modelLibrary: ModelLibraryForModelGen;
  apiCache: APICacheForModelGen;
  setError: (error: string) => void;
}

export interface UseModelGenerationReturn {
  generateKeywordsWithAI: () => Promise<void>;
  generateTitleWithAI: () => Promise<void>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hook para geração de keywords e títulos de modelos via IA
 *
 * @description Gera automaticamente:
 * - Keywords: palavras-chave para busca do modelo
 * - Título: título padronizado no formato TEMA - SUBTEMA - RESULTADO
 *
 * @param props - Propriedades do hook
 * @returns Funções para gerar keywords e título
 */
export function useModelGeneration({
  aiIntegration,
  modelLibrary,
  apiCache,
  setError,
}: UseModelGenerationProps): UseModelGenerationReturn {

  // Gerar keywords automaticamente com IA (COM CACHE)
  const generateKeywordsWithAI = useCallback(async () => {
    // Verificação defensiva
    if (!aiIntegration?.callAI) {
      console.error('[generateKeywordsWithAI] aiIntegration.callAI undefined');
      setError('Erro interno: sistema de IA não inicializado. Recarregue a página.');
      return;
    }
    if (!modelLibrary.newModel.title && !modelLibrary.newModel.content) {
      setError('Preencha ao menos o título ou conteúdo para gerar palavras-chave');
      return;
    }

    // Cache key baseado em título + categoria + conteúdo
    const cacheKey = `keywords_${modelLibrary.newModel.title}_${modelLibrary.newModel.category}_${modelLibrary.newModel.content}`;

    // Verificar cache antes de chamar API
    const cachedKeywords = apiCache.get(cacheKey);
    if (cachedKeywords && typeof cachedKeywords === 'string') {
      modelLibrary.setNewModel({ ...modelLibrary.newModel, keywords: cachedKeywords });
      return; // Retornar imediatamente com resultado cacheado
    }

    aiIntegration.setGeneratingKeywords(true);
    setError('');

    try {
      const prompt = `${AI_PROMPTS.roles.analiseDoc}

MODELO DE DECISÃO:
Título: ${modelLibrary.newModel.title || 'Não fornecido'}
Categoria: ${modelLibrary.newModel.category || 'Não especificada'}
Conteúdo: ${modelLibrary.newModel.content || 'Não fornecido'}

TAREFA:
Analise o modelo acima e gere palavras-chave (keywords) relevantes que ajudem a identificar e encontrar este modelo.

CRITÉRIOS:
1. Identifique os principais conceitos jurídicos mencionados
2. Extraia termos técnicos relevantes
3. Identifique pedidos ou temas tratados (ex: "horas extras", "adicional noturno", "danos morais")
4. Inclua sinônimos e variações (ex: "sobrejornada" para "horas extras")
5. Limite a 5-8 palavras-chave mais relevantes
6. Use termos que um usuário provavelmente buscaria

Responda APENAS com as palavras-chave separadas por vírgula, sem explicações.
Exemplo de resposta válida: horas extras, sobrejornada, adicional, jornada de trabalho, hora extra

Não adicione explicações, apenas as keywords separadas por vírgula.`;

      // Parametros semi-deterministicos para keywords
      const keywords = await aiIntegration.callAI([{
        role: 'user',
        content: [{ type: 'text', text: prompt }]
      }], {
        maxTokens: 500,
        useInstructions: false,
        temperature: 0.2,
        topP: 0.9,
        topK: 50
      });

      if (keywords) {
        // Armazenar resultado no cache
        apiCache.set(cacheKey, keywords);
        modelLibrary.setNewModel({ ...modelLibrary.newModel, keywords: keywords });
      } else {
        setError('Não foi possível gerar palavras-chave. Tente novamente.');
      }

    } catch (err) {
      setError('Erro ao gerar palavras-chave: ' + (err as Error).message);
    } finally {
      aiIntegration.setGeneratingKeywords(false);
    }
  }, [aiIntegration, modelLibrary, apiCache, setError]);

  // Gerar título automaticamente com IA
  const generateTitleWithAI = useCallback(async () => {
    // Verificação defensiva
    if (!aiIntegration?.callAI) {
      console.error('[generateTitleWithAI] aiIntegration.callAI undefined');
      setError('Erro interno: sistema de IA não inicializado. Recarregue a página.');
      return;
    }
    if (!modelLibrary.newModel.content) {
      setError('Preencha o conteúdo do modelo para gerar o título');
      return;
    }

    // Cache key baseado nos primeiros 500 caracteres do conteúdo
    const cacheKey = `title_${modelLibrary.newModel.content.substring(0, 500)}`;
    const cachedTitle = apiCache.get(cacheKey);
    if (cachedTitle && typeof cachedTitle === 'string') {
      modelLibrary.setNewModel({ ...modelLibrary.newModel, title: cachedTitle });
      return;
    }

    aiIntegration.setGeneratingTitle(true);
    setError('');

    try {
      const prompt = `${AI_PROMPTS.roles.classificacao}

CONTEÚDO DO MODELO:
${modelLibrary.newModel.content}

TAREFA:
Analise o conteúdo acima e gere um TÍTULO padronizado para este modelo de decisão.

FORMATO OBRIGATÓRIO:
TEMA - SUBTEMA - RESULTADO (PROCEDENTE/IMPROCEDENTE)

EXEMPLOS VÁLIDOS:
- HORAS EXTRAS - SOBREJORNADA HABITUAL - PROCEDENTE
- RESCISÃO INDIRETA - ATRASO SALARIAL - PROCEDENTE
- DANOS MORAIS - ASSÉDIO MORAL - IMPROCEDENTE
- ADICIONAL DE INSALUBRIDADE - GRAU MÉDIO - PARCIALMENTE PROCEDENTE
- VÍNCULO EMPREGATÍCIO - PEJOTIZAÇÃO - PROCEDENTE
- EQUIPARAÇÃO SALARIAL - IDENTIDADE DE FUNÇÕES - IMPROCEDENTE

REGRAS:
1. TEMA: Assunto principal (ex: HORAS EXTRAS, DANOS MORAIS, VÍNCULO)
2. SUBTEMA: Especificação do tema (ex: SOBREJORNADA, ASSÉDIO, PEJOTIZAÇÃO)
3. RESULTADO: PROCEDENTE, IMPROCEDENTE ou PARCIALMENTE PROCEDENTE
4. Sempre em MAIÚSCULAS
5. Separar com " - " (hífen com espaços)

Responda APENAS com o título no formato especificado, sem explicações.`;

      // Parametros semi-deterministicos para titulo padronizado
      const title = await aiIntegration.callAI([{
        role: 'user',
        content: [{ type: 'text', text: prompt }]
      }], {
        maxTokens: 100,
        useInstructions: false,
        temperature: 0.1,
        topP: 0.9,
        topK: 40
      });

      if (title) {
        apiCache.set(cacheKey, title.trim());
        modelLibrary.setNewModel({ ...modelLibrary.newModel, title: title.trim() });
      } else {
        setError('Não foi possível gerar o título. Tente novamente.');
      }
    } catch (err) {
      setError('Erro ao gerar título: ' + (err as Error).message);
    } finally {
      aiIntegration.setGeneratingTitle(false);
    }
  }, [aiIntegration, modelLibrary, apiCache, setError]);

  return {
    generateKeywordsWithAI,
    generateTitleWithAI,
  };
}
