/**
 * @file useModelExtraction.ts
 * @description Hook para gerenciar extração de modelos a partir de texto de decisão
 * @version v1.37.22
 *
 * Extraído do App.tsx para modularização.
 * Gerencia a extração de modelos genéricos a partir de decisões judiciais.
 */

import React from 'react';
import { AI_PROMPTS } from '../prompts/ai-prompts';
import { generateModelId } from '../utils/text';
import { TFIDFSimilarity } from '../services/EmbeddingsServices';
import type { Topic, Model, AIMessageContent } from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

export interface AIIntegrationForModelExtraction {
  callAI: (
    messages: Array<{ role: string; content: AIMessageContent[] }>,
    options?: {
      maxTokens?: number;
      useInstructions?: boolean;
      logMetrics?: boolean;
      temperature?: number;
      topP?: number;
      topK?: number;
    }
  ) => Promise<string>;
}

export interface ModelLibraryForModelExtraction {
  models: Model[];
  extractedModelPreview: Partial<Model> | null;
  setExtractingModelFromDecision: (value: boolean) => void;
  setExtractedModelPreview: (model: Partial<Model> | null) => void;
  setSimilarityWarning: (warning: {
    newModel: Model;
    similarModel: Model;
    similarity: number;
    context: string;
  } | null) => void;
}

export interface APICacheForModelExtraction {
  get: (key: string) => unknown;
  set: (key: string, value: string) => void;
}

export interface UseModelExtractionProps {
  editingTopic: Topic | null;
  aiIntegration: AIIntegrationForModelExtraction | null;
  modelLibrary: ModelLibraryForModelExtraction;
  apiCache: APICacheForModelExtraction;
  editorRef: React.RefObject<{ root: HTMLElement } | null>;
  openModal: (modalId: string) => void;
  closeModal: (modalId: string) => void;
  setError: (error: string) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  executeExtractedModelSave: (
    modelData: Partial<Model> & { title: string; content: string; embedding?: number[] },
    isReplace?: boolean,
    replaceId?: string | null
  ) => Promise<void>;
}

export interface UseModelExtractionReturn {
  extractModelFromDecisionText: () => Promise<void>;
  saveExtractedModel: () => void;
  cancelExtractedModel: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

export function useModelExtraction({
  editingTopic,
  aiIntegration,
  modelLibrary,
  apiCache,
  editorRef,
  openModal,
  closeModal,
  setError,
  showToast,
  executeExtractedModelSave
}: UseModelExtractionProps): UseModelExtractionReturn {

  // ═══════════════════════════════════════════════════════════════════════════
  // EXTRAIR MODELO DO TEXTO DE DECISÃO
  // ═══════════════════════════════════════════════════════════════════════════

  const extractModelFromDecisionText = React.useCallback(async () => {
    closeModal('extractModelConfirm');
    if (!editorRef.current?.root || !editingTopic) {
      setError('Editor ou tópico não disponível');
      return;
    }
    modelLibrary.setExtractingModelFromDecision(true);
    setError('');

    const decisionText = editorRef.current.root.innerText || '';

    // 🚀 v1.8.2: Cache key baseado em texto + título + categoria do tópico
    const cacheKey = `extractModel_${editingTopic.title}_${editingTopic.category}_${decisionText}`;

    // 🚀 v1.8.2: Verificar cache antes de chamar API
    const cachedModelRaw = apiCache.get(cacheKey);
    const cachedModel = typeof cachedModelRaw === 'string' ? cachedModelRaw : null;
    if (cachedModel) {
      try {
        const parsedResponse = JSON.parse(cachedModel);
        if (parsedResponse.modelos && Array.isArray(parsedResponse.modelos) && parsedResponse.modelos.length > 0) {
          const modelo = parsedResponse.modelos[0];
          modelLibrary.setExtractedModelPreview({
            id: generateModelId(),
            title: modelo.titulo,
            category: modelo.categoria,
            keywords: modelo.palavrasChave,
            content: modelo.conteudo
          });
          openModal('extractedModelPreview');
          setError('');
        }
      } catch (err) {
        // Se falhar, continua com chamada API normal abaixo
      }
      modelLibrary.setExtractingModelFromDecision(false);
      return; // Retornar se cache funcionou
    }

    try {

      const analysisPrompt = `Você é um assistente jurídico especializado em criar modelos de decisão trabalhista GENÉRICOS e REUTILIZÁVEIS.

TAREFA: Analise o texto de decisão judicial fornecido e transforme-o em UM MODELO GENÉRICO e REUTILIZÁVEL.

⚠️ ATENÇÃO - REGRAS DE GENERALIZAÇÃO (MUITO IMPORTANTE):

1. **REMOVA informações específicas do caso concreto:**
   - ❌ NÃO use nomes de partes (ex: "João da Silva", "Empresa XYZ Ltda")
   - ❌ NÃO use valores monetários específicos (ex: "R$ 5.000,00")
   - ❌ NÃO use datas específicas (ex: "10/05/2023")
   - ❌ NÃO use números de processo
   - ❌ NÃO use endereços ou locais específicos

2. **USE termos genéricos:**
   - ✅ "o reclamante", "a reclamada", "a empresa"
   - ✅ "o valor devido", "o montante apurado"
   - ✅ "o período trabalhado", "a data da rescisão"
   - ✅ "os documentos apresentados", "as provas dos autos"

3. **FOQUE na fundamentação jurídica:**
   - Argumentação legal aplicável a casos similares
   - Análise de requisitos jurídicos genéricos
   - Raciocínio jurídico reproduzível
   - Conclusões adaptáveis a diferentes situações

4. **MANTENHA a estrutura, o estilo e a qualidade textual:**
   - Preserve o tom e a formatação do texto original
   - Mantenha os parágrafos bem desenvolvidos e conectivos entre eles
   - Conserve a linha argumentativa fluida
   - Mantenha a coesão e progressão textual
   - NÃO fragmente em enumerações excessivas
   - Mantenha redação em prosa corrida quando o original estiver assim

🚨 PRESERVAÇÃO LITERAL DO TEXTO (CRÍTICO - EXTREMAMENTE IMPORTANTE):

Esta é a regra MAIS IMPORTANTE de todas. Se você não seguir isso, o modelo será INÚTIL.

**O QUE VOCÊ DEVE FAZER:**
- Fazer APENAS substituições literais de informações específicas por termos genéricos
- Funcionar como "CTRL+F → SUBSTITUIR": encontrar nomes/valores/datas e trocar por genéricos
- PRESERVAR TODO O RESTO DO TEXTO EXATAMENTE COMO ESTÁ
- Manter a redação, estrutura de frases, argumentação, conectivos, tudo IDÊNTICO

**O QUE VOCÊ NÃO DEVE FAZER:**
- ❌ NÃO resuma o texto
- ❌ NÃO reescreva com suas próprias palavras
- ❌ NÃO simplifique a argumentação
- ❌ NÃO altere a estrutura das frases
- ❌ NÃO mude conectivos ou expressões jurídicas
- ❌ NÃO "melhore" ou "otimize" o texto original

**EXEMPLO DO QUE FAZER:**

❌ ERRADO (resumindo/reescrevendo):
Texto original: "A pretensão autoral merece acolhimento. Com efeito, restou comprovado nos autos que o reclamante João da Silva laborou para a empresa Acme Ltda no período de 01/01/2020 a 31/12/2023, recebendo salário mensal de R$ 3.500,00. A jornada habitual era das 8h às 18h, com uma hora de intervalo, conforme cartões de ponto de fls. 45/89."

Modelo ERRADO: "A pretensão é procedente. Ficou demonstrado que houve relação de trabalho com jornada superior à legal."

✅ CORRETO (apenas substituindo dados específicos):
Modelo CORRETO: "A pretensão autoral merece acolhimento. Com efeito, restou comprovado nos autos que o reclamante laborou para a reclamada no período trabalhado, recebendo o salário mensal contratado. A jornada habitual era das [horário de início] às [horário de término], com uma hora de intervalo, conforme cartões de ponto dos autos."

**REGRA DE OURO:**
Se você não tem certeza se deve alterar algo, NÃO ALTERE. Preserve o texto original.
Seu trabalho é fazer "buscar e substituir" de dados específicos, NÃO reescrever.

**CHECKLIST FINAL - VERIFIQUE ANTES DE RESPONDER:**
✓ Mantive a estrutura exata das frases do original?
✓ Mantive os mesmos conectivos (ademais, com efeito, nesse sentido, etc.)?
✓ Mantive a mesma argumentação jurídica?
✓ Mantive a mesma ordem dos argumentos?
✓ Fiz APENAS substituições de nomes, valores, datas por termos genéricos?
✓ O texto tem o mesmo tamanho/extensão do original (não resumi)?

EXCLUSAO OBRIGATORIA DE MINI-RELATORIO (CRITICO):

Esta e uma das regras MAIS IMPORTANTES. Se voce incluir mini-relatorio, o modelo sera INUTIL.

PROIBIDO ABSOLUTAMENTE (exemplos do que NAO fazer):
- "O reclamante pleiteia..."
- "O reclamante postula..."
- "O reclamante alega..."
- "As reclamadas impugnaram..."
- "A reclamada sustenta..."
- "Trata-se de..."
- "Cuida-se de..."
- "O reclamante ajuizou..."
- Qualquer resumo das alegacoes das partes
- Qualquer descricao do que foi pedido ou contestado

CORRETO - Como DEVE comecar o modelo:
- "A configuracao de grupo economico..."
- "O reconhecimento do vinculo empregaticio..."
- "A concessao de horas extras..."
- "Para caracterizacao da jornada..."
- "A caracterizacao do dano moral..."
- Diretamente com ANALISE JURIDICA, FUNDAMENTOS LEGAIS, DOUTRINA, PRECEDENTES

⚠️ IMPORTANTE - PRESERVAÇÃO DE CITAÇÕES DOUTRINÁRIAS E JURISPRUDENCIAIS:

Esta regra e CRITICA para manter a qualidade e fundamentacao do modelo extraido.

O QUE PRESERVAR (MANTER INTEGRALMENTE):
✅ Citacoes de autores (ex: "Segundo Mauricio Godinho Delgado...")
✅ Citacoes de jurisprudencia (ex: "Conforme TST-AIRR-1234-56.2023...")
✅ Sumulas (ex: "A Sumula 437 do TST estabelece...")
✅ Orientacoes Jurisprudenciais (ex: "A OJ 415 da SDI-1 dispoe...")
✅ Precedentes vinculantes (ex: "Nos termos do Tema 1046 do TST...")
✅ Referencias doutrinarias completas (autor, obra, citacao)
✅ Referencias jurisprudenciais completas (tribunal, numero, ementa)
✅ Fundamentos teoricos e academicos

O QUE GENERALIZAR (SUBSTITUIR POR TERMOS GENERICOS):
🔄 Nomes de partes especificas → "o reclamante", "a reclamada"
🔄 Valores monetarios especificos → "[valor]", "quantia devida"
🔄 Datas especificas → "periodo trabalhado", "data da rescisao"
🔄 Locais especificos → "local de trabalho", "estabelecimento"
🔄 Documentos especificos do caso → "prova documental", "laudo pericial"
🔄 Testemunhas especificas → "prova testemunhal"

O QUE NUNCA FAZER:
❌ NÃO remova citacoes de autores renomados
❌ NÃO remova referencias a precedentes e jurisprudencia
❌ NÃO remova fundamentacao teorica/doutrinaria
❌ NÃO substitua nomes de doutrinadores por termos genericos
❌ NÃO remova numeros de processos citados como precedentes

EXEMPLO CORRETO DE PRESERVAÇÃO:

ORIGINAL:
"A pretensao autoral merece acolhimento. Segundo Mauricio Godinho Delgado,
a configuracao de grupo economico exige demonstracao de direcao, controle
ou administracao comum (TST-AIRR-1234-56.2023.5.01.0000). No caso concreto,
a Empresa XYZ demonstrou..."

MODELO EXTRAÍDO (CORRETO):
"A pretensao autoral merece acolhimento. Segundo Mauricio Godinho Delgado,
a configuracao de grupo economico exige demonstracao de direcao, controle
ou administracao comum (TST-AIRR-1234-56.2023.5.01.0000). No caso concreto,
a reclamada demonstrou..."

✅ Citacao de Godinho Delgado → PRESERVADA
✅ Precedente TST-AIRR → PRESERVADO
🔄 "Empresa XYZ" → "a reclamada" (generalizado)

REGRA DE OURO:
Se o primeiro paragrafo fala sobre "o que o reclamante pede" ou "o que as partes alegam", ESTA ERRADO.
O primeiro paragrafo DEVE comecar com analise juridica do instituto/direito discutido.

EXEMPLO COMPARATIVO:

ERRADO (tem mini-relatorio):
"O reclamante pleiteia a condenacao solidaria das reclamadas, sob a alegacao de que integram o mesmo grupo economico. As reclamadas impugnaram o pedido."

CORRETO (sem mini-relatorio):
"A configuracao de grupo economico trabalhista demanda a presenca dos requisitos previstos no artigo 2 paragrafo 2 da CLT..."

ACAO REQUERIDA:
Se o texto original da decisao tiver mini-relatorio no inicio, voce DEVE REMOVE-LO completamente antes de generalizar.
Identifique onde termina o mini-relatorio e onde comeca a fundamentacao. Mantenha APENAS a fundamentacao.

Voce entendeu? INICIE DIRETAMENTE NA ANALISE JURIDICA. ZERO mini-relatorio.

${AI_PROMPTS.estiloRedacao}

CONTEXTO DO TÓPICO ORIGINAL:
Título: ${editingTopic.title}
Categoria: ${editingTopic.category || 'Não especificada'}

Crie UM ÚNICO modelo baseado neste texto, extraindo:
1. **Título**: Baseado no tópico atual, mas ajustado se necessário. IMPORTANTE: O titulo DEVE estar em LETRAS MAIUSCULAS. Exemplo: "GRUPO ECONOMICO - PROCEDENCIA"
2. **Categoria**: ${editingTopic.category || 'Mérito'}
3. **Palavras-chave** (5 a 10 termos estratégicos):

   INCLUA:
   - ✅ Termos técnicos jurídicos principais
   - ✅ Sinônimos e variações do tema
   - ✅ Palavras que um juiz digitaria na busca
   - ✅ Conceitos-chave relacionados
   - ✅ Artigos de lei relevantes (ex: "CLT art 59", "Lei 13467")

   EVITE:
   - ❌ Palavras muito genéricas ("direito", "trabalho", "lei", "justiça")
   - ❌ Verbos conjugados ("trabalhar", "receber", "pagar")
   - ❌ Artigos e preposições (o, a, de, da, para)
   - ❌ Nomes próprios ou específicos

4. **Conteúdo**: Versão GENÉRICA do texto fornecido em HTML, com redação fluida e coesa

FORMATO DE RESPOSTA - JSON válido:
{
  "modelos": [
    {
      "titulo": "${editingTopic.title}",
      "categoria": "${editingTopic.category || 'Mérito'}",
      "palavrasChave": "palavra1, palavra2, palavra3",
      "conteudo": "<p>Modelo completo em HTML GENÉRICO, com redação fluida e coesa, sem mini-relatório...</p>"
    }
  ]
}

TEXTO DA DECISÃO A GENERALIZAR:
${decisionText}`;

      // v1.21.26: Parametros para extracao/transformacao (moderado)
      const textResponse = await aiIntegration!.callAI([{
        role: 'user',
        content: [{ type: 'text', text: analysisPrompt }]
      }], {
        maxTokens: 16000,
        useInstructions: true,
        logMetrics: true,
        temperature: 0.4,
        topP: 0.9,
        topK: 60
      });


      // Parse JSON
      const jsonMatch = textResponse.match(/\{[\s\S]*"modelos"[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Formato de resposta inválido');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // 🚀 v1.8.2: Cachear resposta JSON parseada
      apiCache.set(cacheKey, jsonMatch[0]);

      if (!parsed.modelos || parsed.modelos.length === 0) {
        throw new Error('Nenhum modelo foi gerado');
      }

      // Preparar modelo para preview/edição
      const extractedModel = parsed.modelos[0];
      const modelId = generateModelId();
      // Converter HTML para texto plano preservando quebras de linha
      const rawContent = extractedModel.conteudo || '';
      const plainContent = rawContent
        .replace(/<\/p>\s*<p>/gi, '\n')    // </p><p> → quebra simples
        .replace(/<br\s*\/?>/gi, '\n')     // <br> → quebra simples
        .replace(/<\/?(p|div)[^>]*>/gi, '') // remove tags de bloco
        .replace(/<[^>]*>/g, '')           // remove outras tags
        .replace(/&nbsp;/g, ' ')           // &nbsp; → espaço
        .replace(/\n{2,}/g, '\n')          // máx 1 quebra seguida
        .trim();
      const previewModel = {
        id: modelId,
        title: extractedModel.titulo || editingTopic.title,
        category: extractedModel.categoria || editingTopic.category || 'Mérito',
        content: plainContent,
        keywords: extractedModel.palavrasChave || '',
        isFavorite: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Mostrar modal de preview/edição ao invés de salvar diretamente
      modelLibrary.setExtractedModelPreview(previewModel);
      openModal('extractedModelPreview');


    } catch (err) {
      setError(`Erro ao extrair modelo: ${(err as Error).message}`);
    } finally {
      modelLibrary.setExtractingModelFromDecision(false);
    }
  }, [editingTopic, aiIntegration, modelLibrary, apiCache, editorRef, openModal, closeModal, setError]);

  // ═══════════════════════════════════════════════════════════════════════════
  // SALVAR MODELO EXTRAÍDO
  // ═══════════════════════════════════════════════════════════════════════════

  const saveExtractedModel = React.useCallback(() => {
    if (!modelLibrary.extractedModelPreview) {
      showToast('Nenhum modelo para salvar.', 'error');
      return;
    }

    // 🔍 v1.13.1: Verificar similaridade com TF-IDF
    const previewAsModel: Model = {
      ...modelLibrary.extractedModelPreview,
      id: crypto.randomUUID(),
      updatedAt: new Date().toISOString()
    } as Model;
    const simResult = TFIDFSimilarity.findSimilar(previewAsModel, modelLibrary.models, 0.80);
    if (simResult.hasSimilar) {
      modelLibrary.setSimilarityWarning({
        newModel: previewAsModel,
        similarModel: simResult.similarModel,
        similarity: simResult.similarity,
        context: 'saveExtractedModel'
      });
      return;
    }

    executeExtractedModelSave(modelLibrary.extractedModelPreview as Partial<Model> & { title: string; content: string });
  }, [modelLibrary, showToast, executeExtractedModelSave]);

  // ═══════════════════════════════════════════════════════════════════════════
  // CANCELAR MODELO EXTRAÍDO
  // ═══════════════════════════════════════════════════════════════════════════

  const cancelExtractedModel = React.useCallback(() => {
    closeModal('extractedModelPreview');
    modelLibrary.setExtractedModelPreview(null);
    showToast('Criação de modelo cancelada.', 'info');
  }, [closeModal, modelLibrary, showToast]);

  return {
    extractModelFromDecisionText,
    saveExtractedModel,
    cancelExtractedModel
  };
}
