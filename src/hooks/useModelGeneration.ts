/**
 * @file useModelGeneration.ts
 * @description Hook para geração de keywords e títulos de modelos via IA
 * Extraído do App.tsx v1.37.8 - FASE 7 LegalDecisionEditor refactoring
 * v1.37.13: Removido cache - cada clique gera nova resposta da IA
 */

import React, { useCallback } from 'react';
import type { AIMessage, AICallOptions, NewModelData, Model } from '../types';
import { AI_PROMPTS } from '../prompts';
import { resolveTitleAndCategory } from '../utils/categoryNormalization';

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
  /** Modelos existentes — usados para deduplicar a categoria gerada via IA */
  models: Model[];
}

export interface UseModelGenerationProps {
  aiIntegration: AIIntegrationForModelGen;
  modelLibrary: ModelLibraryForModelGen;
  modelEditorRef: React.RefObject<{ root?: HTMLElement } | null>;
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
 * Nota: Sem cache - cada clique gera nova resposta (se o usuário clica de novo,
 * é porque quer uma resposta diferente)
 *
 * @param props - Propriedades do hook
 * @returns Funções para gerar keywords e título
 */
export function useModelGeneration({
  aiIntegration,
  modelLibrary,
  modelEditorRef,
  setError,
}: UseModelGenerationProps): UseModelGenerationReturn {

  // Gerar keywords automaticamente com IA
  const generateKeywordsWithAI = useCallback(async () => {
    // Verificação defensiva
    if (!aiIntegration?.callAI) {
      console.error('[generateKeywordsWithAI] aiIntegration.callAI undefined');
      setError('Erro interno: sistema de IA não inicializado. Recarregue a página.');
      return;
    }

    // v1.37.15: Ler conteúdo diretamente do editor Quill (não sincroniza com state em tempo real)
    const editorContent = modelEditorRef.current?.root?.innerHTML || '';

    if (!modelLibrary.newModel.title && !editorContent) {
      setError('Preencha ao menos o título ou conteúdo para gerar palavras-chave');
      return;
    }

    aiIntegration.setGeneratingKeywords(true);
    setError('');

    try {
      const prompt = `${AI_PROMPTS.roles.analiseDoc}

MODELO DE DECISÃO:
Título: ${modelLibrary.newModel.title || 'Não fornecido'}
Categoria: ${modelLibrary.newModel.category || 'Não especificada'}
Conteúdo: ${editorContent || 'Não fornecido'}

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
        modelLibrary.setNewModel(prev => ({ ...prev, keywords }));
      } else {
        setError('Não foi possível gerar palavras-chave. Tente novamente.');
      }

    } catch (err) {
      setError('Erro ao gerar palavras-chave: ' + (err as Error).message);
    } finally {
      aiIntegration.setGeneratingKeywords(false);
    }
  }, [aiIntegration, modelLibrary, modelEditorRef, setError]);

  // Gerar título automaticamente com IA
  const generateTitleWithAI = useCallback(async () => {
    // Verificação defensiva
    if (!aiIntegration?.callAI) {
      console.error('[generateTitleWithAI] aiIntegration.callAI undefined');
      setError('Erro interno: sistema de IA não inicializado. Recarregue a página.');
      return;
    }

    // v1.37.15: Ler conteúdo diretamente do editor Quill (não sincroniza com state em tempo real)
    const editorContent = modelEditorRef.current?.root?.innerHTML || '';

    if (!editorContent) {
      setError('Preencha o conteúdo do modelo para gerar o título');
      return;
    }

    aiIntegration.setGeneratingTitle(true);
    setError('');

    try {
      // Categorias já existentes (mesma derivação usada no formulário): a IA deve
      // reutilizar uma delas quando o tema for equivalente, evitando duplicatas.
      const existingCategories = [...new Set(
        modelLibrary.models
          .map((m) => m.category)
          .filter((c): c is string => !!c && c.trim() !== '')
      )].sort();

      const prompt = `${AI_PROMPTS.roles.classificacao}

CONTEÚDO DO MODELO:
${editorContent}

CATEGORIAS JÁ EXISTENTES (reutilize uma destas quando o tema for equivalente, mesmo que o nome use sinônimos; só crie nova se nenhuma servir):
${existingCategories.join('\n') || '(nenhuma ainda)'}

TAREFA:
Analise o conteúdo acima e gere, para este modelo de decisão:
1. Um TÍTULO padronizado
2. A CATEGORIA do modelo (apenas o TEMA — assunto principal, sem subtema nem resultado)

FORMATO OBRIGATÓRIO DO TÍTULO:
TEMA - SUBTEMA - RESULTADO (PROCEDENTE/IMPROCEDENTE)

EXEMPLOS VÁLIDOS DE TÍTULO:
- HORAS EXTRAS - SOBREJORNADA HABITUAL - PROCEDENTE
- RESCISÃO INDIRETA - ATRASO SALARIAL - PROCEDENTE
- DANOS MORAIS - ASSÉDIO MORAL - IMPROCEDENTE
- ADICIONAL DE INSALUBRIDADE - GRAU MÉDIO - PARCIALMENTE PROCEDENTE
- VÍNCULO EMPREGATÍCIO - PEJOTIZAÇÃO - PROCEDENTE
- EQUIPARAÇÃO SALARIAL - IDENTIDADE DE FUNÇÕES - IMPROCEDENTE

REGRAS DO TÍTULO:
1. TEMA: Assunto principal (ex: HORAS EXTRAS, DANOS MORAIS, VÍNCULO)
2. SUBTEMA: Especificação do tema (ex: SOBREJORNADA, ASSÉDIO, PEJOTIZAÇÃO)
3. RESULTADO: PROCEDENTE, IMPROCEDENTE ou PARCIALMENTE PROCEDENTE
4. Sempre em MAIÚSCULAS
5. Separar com " - " (hífen com espaços)

REGRAS DA CATEGORIA:
1. É apenas o TEMA do modelo (ex: "Horas Extras", "Danos Morais", "Vínculo Empregatício")
2. Se uma categoria existente for equivalente ao tema, repita-a EXATAMENTE como está na lista acima
3. Caso contrário, crie uma nova em Title Case

Responda APENAS com JSON válido, sem explicações:
{"title": "...", "category": "..."}`;

      const raw = await aiIntegration.callAI([{
        role: 'user',
        content: [{ type: 'text', text: prompt }]
      }], {
        maxTokens: 200,
        useInstructions: false,
        temperature: 0.1,
        topP: 0.9,
        topK: 40
      });

      if (raw) {
        const { title, category } = resolveTitleAndCategory(raw, existingCategories);
        modelLibrary.setNewModel(prev => ({ ...prev, title, category }));
      } else {
        setError('Não foi possível gerar o título. Tente novamente.');
      }
    } catch (err) {
      setError('Erro ao gerar título: ' + (err as Error).message);
    } finally {
      aiIntegration.setGeneratingTitle(false);
    }
  }, [aiIntegration, modelLibrary, modelEditorRef, setError]);

  return {
    generateKeywordsWithAI,
    generateTitleWithAI,
  };
}
