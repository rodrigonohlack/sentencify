/**
 * @file jurisprudencia.ts
 * @description Helpers de busca e refinamento de jurisprudência
 * @version 1.36.81
 *
 * Extraído do App.tsx
 * Inclui: findJurisprudenciaHelper, refineJurisWithAIHelper, stemJuridico, expandWithSynonyms, cache
 */

import {
  loadPrecedentesFromIndexedDB,
  isIRRType,
  removeAccents,
  SEARCH_STOPWORDS,
  SINONIMOS_JURIDICOS
} from '../hooks';
import type { Precedente, JurisFiltros, AIMessage } from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Função de chamada de LLM para refinamento de jurisprudência
 */
export type CallAIFunction = (
  messages: AIMessage[],
  options?: {
    maxTokens?: number;
    disableThinking?: boolean;
    useInstructions?: boolean;
    temperature?: number;
    topP?: number;
    topK?: number;
  }
) => Promise<string>;

// ═══════════════════════════════════════════════════════════════════════════════
// STATUS E VALIDAÇÃO
// ═══════════════════════════════════════════════════════════════════════════════

export const STATUS_INVALIDOS = new Set(['cancelada', 'revogada', 'convertida', 'superado', 'convertida em súmula']);

export const isStatusValido = (status: string | null | undefined): boolean => {
  if (!status) return true;
  return !STATUS_INVALIDOS.has(status.toLowerCase());
};

// ═══════════════════════════════════════════════════════════════════════════════
// CACHE DE JURISPRUDÊNCIA
// ═══════════════════════════════════════════════════════════════════════════════

interface JurisCacheEntry {
  results: (Precedente & { similarity: number })[];
  timestamp: number;
}

export const jurisCache = new Map<string, JurisCacheEntry>();
export const JURIS_CACHE_TTL = 5 * 60 * 1000; // 5 minutos

export const hashJurisKey = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < (str || '').length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return hash.toString(36);
};

// ═══════════════════════════════════════════════════════════════════════════════
// STEMMING E SINÔNIMOS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Stemming simplificado para português jurídico
 */
export const stemJuridico = (word: string): string => {
  if (!word || word.length < 3) return word;
  const w = removeAccents(word.toLowerCase());
  return w
    .replace(/(ção|ções|são|sões|mento|mentos)$/i, '')
    .replace(/(ório|ória|órios|órias|ivo|iva|ivos|ivas)$/i, '')
    .replace(/(ista|istas|ante|antes|ente|entes)$/i, '')
    .replace(/(ade|ades|dade|dades)$/i, '')
    .replace(/(eiro|eira|eiros|eiras)$/i, '')
    .replace(/(al|ais|el|eis|il|is|ol|ois|ul|uis)$/i, '')
    .replace(/(ar|er|ir|or|ur)$/i, '')
    .replace(/(s|es)$/i, '');
};

/**
 * Expande termos com sinônimos jurídicos
 */
export const expandWithSynonyms = (words: string[]): string[] => {
  const expanded = new Set(words);
  for (const word of words) {
    const wordNorm = removeAccents(word.toLowerCase());
    for (const [termo, sinonimos] of Object.entries(SINONIMOS_JURIDICOS)) {
      const termoNorm = removeAccents(termo.toLowerCase());
      // Se a palavra está no termo ou vice-versa
      if (termoNorm.includes(wordNorm) || wordNorm.includes(termoNorm) ||
          termoNorm.split(' ').some(t => t === wordNorm)) {
        expanded.add(termoNorm);
        sinonimos.forEach((s: string) => expanded.add(removeAccents(s.toLowerCase())));
      }
      // Se a palavra está em algum sinônimo
      for (const sin of sinonimos) {
        const sinNorm = removeAccents(sin.toLowerCase());
        if (sinNorm.includes(wordNorm) || wordNorm.includes(sinNorm)) {
          expanded.add(termoNorm);
          sinonimos.forEach((s: string) => expanded.add(removeAccents(s.toLowerCase())));
          break;
        }
      }
    }
  }
  return Array.from(expanded);
};

// ═══════════════════════════════════════════════════════════════════════════════
// REFINAMENTO COM IA
// ═══════════════════════════════════════════════════════════════════════════════

export const refineJurisWithAIHelper = async (
  title: string,
  context: string,
  candidates: Precedente[],
  callLLM: CallAIFunction
): Promise<Precedente[]> => {
  if (!callLLM || typeof callLLM !== 'function') {
    console.warn('[JurisAI] callLLM não disponível, retornando candidatos sem refinamento');
    return candidates.slice(0, 10);
  }
  try {
    // Formatar candidatos com mais informação para a IA decidir melhor
    const candidatosFormatados = candidates.map((c: Precedente, i: number) => {
      const tipo = c.tipoProcesso || 'Precedente';
      const num = c.numero ? ` ${c.numero}` : '';
      const tribunal = c.tribunal ? ` (${c.tribunal})` : '';
      const titulo = c.titulo ? `\n   Título: ${c.titulo}` : '';
      const tese = (c.tese || c.enunciado || '').substring(0, 150);
      return `${i}: ${tipo}${num}${tribunal}${titulo}\n   Tese: ${tese}...`;
    }).join('\n\n');

    const prompt = `Você é um especialista em jurisprudência trabalhista brasileira.

TÓPICO DA SENTENÇA: "${title}"

CONTEXTO/RELATÓRIO:
${context || 'Não disponível'}

PRECEDENTES CANDIDATOS:
${candidatosFormatados}

TAREFA: Selecione os 10 precedentes MAIS RELEVANTES para fundamentar este tópico específico.

CRITÉRIOS DE PRIORIZAÇÃO:
1. Precedentes que tratam EXATAMENTE do tema específico (não apenas mencionam palavras similares)
2. Súmulas e OJs vinculantes diretamente aplicáveis
3. Teses de repercussão geral ou recursos repetitivos sobre o assunto
4. Hierarquia: TST = STF > TRT > STJ

IMPORTANTE: Foque na PERTINÊNCIA TEMÁTICA REAL, não apenas em palavras coincidentes.

Retorne APENAS os índices dos 10 selecionados, do mais ao menos relevante.
Formato: 5,12,3,8,15,1,9,7,2,11`;

    const messages: AIMessage[] = [{ role: 'user', content: [{ type: 'text', text: prompt }] }];
    // v1.21.26: Parametros deterministicos para ranking
    const response = await callLLM(messages, { maxTokens: 300, disableThinking: true, useInstructions: false, temperature: 0.0, topP: 0.9, topK: 40 });
    // CallAIFunction always returns string
    const text = response || '';
    const indices = text.match(/\d+/g)?.map(Number) || [];
    const result = indices.filter((i: number) => i < candidates.length).map((i: number) => candidates[i]);
    return result.length > 0 ? result.slice(0, 10) : candidates.slice(0, 10);
  } catch (err) {
    console.warn('[JurisAI] Refinamento falhou:', err instanceof Error ? (err as Error).message : err);
    return candidates.slice(0, 10);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// BUSCA DE JURISPRUDÊNCIA
// ═══════════════════════════════════════════════════════════════════════════════

export const findJurisprudenciaHelper = async (
  topicTitle: string,
  miniRelatorio: string,
  callLLM: CallAIFunction,
  filtros: JurisFiltros = {}
): Promise<(Precedente & { similarity: number })[]> => {
  // Verificar cache primeiro (incluindo filtros na chave)
  const cacheKey = `juris_${topicTitle}_${hashJurisKey(miniRelatorio)}_${filtros.tipo?.join(',') || ''}_${filtros.tribunal?.join(',') || ''}_${filtros.searchTerm || ''}`;
  const cached = jurisCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < JURIS_CACHE_TTL) {
    return cached.results;
  }

  const allPrecedentes = await loadPrecedentesFromIndexedDB();
  if (!allPrecedentes || allPrecedentes.length === 0) return [];

  // Filtrar apenas precedentes válidos (excluir canceladas/revogadas/convertidas)
  let validPrecedentes = allPrecedentes.filter(p => isStatusValido(p.status));

  // Aplicar filtros por tipo
  if (filtros.tipo && filtros.tipo.length > 0) {
    const tipoFilter = filtros.tipo;
    validPrecedentes = validPrecedentes.filter(p => {
      if (!p.tipoProcesso) return false;
      if (tipoFilter.includes('IRR') && isIRRType(p.tipoProcesso)) return true;
      return tipoFilter.includes(p.tipoProcesso);
    });
  }

  // Aplicar filtros por tribunal
  if (filtros.tribunal && filtros.tribunal.length > 0) {
    const tribunalFilter = filtros.tribunal;
    validPrecedentes = validPrecedentes.filter(p => p.tribunal && tribunalFilter.includes(p.tribunal));
  }

  // Filtro por busca textual do usuário
  if (filtros.searchTerm?.trim()) {
    const searchTermNorm = removeAccents(filtros.searchTerm.toLowerCase().trim());
    const rawTerms = searchTermNorm.split(/\s+/).filter((w: string) => w.length > 2 && !SEARCH_STOPWORDS.has(w));
    if (rawTerms.length === 0) return [];

    // Só expande sinônimos se a frase COMPLETA corresponder a uma chave do dicionário
    const expandedFromPhrase: string[] = [];
    for (const [termo, sinonimos] of Object.entries(SINONIMOS_JURIDICOS)) {
      const termoNorm = removeAccents(termo.toLowerCase());
      if (searchTermNorm.includes(termoNorm) || termoNorm.includes(searchTermNorm)) {
        expandedFromPhrase.push(termoNorm, ...sinonimos.map(s => removeAccents(s.toLowerCase())));
      }
    }

    // Termos para busca: originais + stems + sinônimos de frase completa (sem sinônimos genéricos)
    const rawStems = rawTerms.map(stemJuridico).filter((s: string) => s.length > 3);

    // Pontuar cada precedente por quantos termos deram match
    const scored = validPrecedentes.map(p => {
      const searchable = removeAccents(
        `${p.tese || ''} ${p.enunciado || ''} ${p.titulo || ''} ${(Array.isArray(p.keywords) ? p.keywords : []).join(' ')}`
      ).toLowerCase();

      let score = 0;
      let matchedTerms = 0;

      // Match de termos originais (mais importante)
      for (const term of rawTerms) {
        if (searchable.includes(term)) {
          score += 30;
          matchedTerms++;
        }
      }

      // Match por stems (se não houve match direto)
      if (matchedTerms < rawTerms.length) {
        for (const stem of rawStems) {
          if (searchable.includes(stem)) {
            score += 15;
            matchedTerms++;
          }
        }
      }

      // Match por sinônimos de frase completa
      for (const syn of expandedFromPhrase) {
        if (searchable.includes(syn)) {
          score += 20;
          matchedTerms++;
          break; // só conta uma vez
        }
      }

      // EXIGIR que pelo menos metade dos termos originais deem match (ou sinônimo da frase)
      const minMatches = Math.max(1, Math.ceil(rawTerms.length / 2));
      if (matchedTerms < minMatches && expandedFromPhrase.length === 0) {
        return { ...p, score: 0 };
      }
      if (matchedTerms === 0) return { ...p, score: 0 };

      // Boost por hierarquia de tribunal
      if (isIRRType(p.tipoProcesso) && p.tribunal === 'TST') score += 500;
      else if (p.tipoProcesso && ['ADI', 'ADC', 'ADPF', 'RE', 'ARE'].some(t => p.tipoProcesso?.includes(t))) score += 500;
      else if (p.tipoProcesso && ['IRDR', 'IAC'].includes(p.tipoProcesso) && p.tribunal === 'TRT8') score += 450;
      else if (p.tipoProcesso === 'Súmula' && p.tribunal === 'STF') score += 100;
      else if (p.tipoProcesso && ['Súmula', 'OJ'].includes(p.tipoProcesso) && p.tribunal === 'TST') score += 100;
      else if (p.tribunal === 'STF') score += 50;
      else if (p.tribunal === 'TST') score += 50;
      else if (p.tribunal === 'TRT8') score += 30;
      else if (p.tribunal === 'STJ') score += 5;

      return { ...p, score, similarity: score / 1000 } as Precedente & { score: number; similarity: number };
    });

    const filtered = scored.filter(p => p.score > 0).sort((a, b) => b.score - a.score);
    const top = filtered.slice(0, 40) as (Precedente & { similarity: number })[];
    jurisCache.set(cacheKey, { results: top, timestamp: Date.now() });
    return top;
  }

  // 1. Limpar e normalizar título (remover pontuação e stopwords)
  const cleanTitle = topicTitle.replace(/[.,;:!?()\[\]{}]/g, ' ').toLowerCase();
  const rawWords = cleanTitle.split(/\s+/).filter((w: string) => w.length > 2);
  const titleWords = rawWords.filter((w: string) => !SEARCH_STOPWORDS.has(w));

  // 2. Também extrair termos do relatório (contexto adicional)
  const cleanRelatorio = (miniRelatorio || '').replace(/[.,;:!?()\[\]{}]/g, ' ').toLowerCase();
  const relatorioWords = cleanRelatorio.split(/\s+/)
    .filter((w: string) => w.length > 3 && !SEARCH_STOPWORDS.has(w))
    .slice(0, 30); // Limitar para não sobrecarregar

  // 3. Expandir com sinônimos
  const expandedTitle = expandWithSynonyms(titleWords);
  const expandedRelatorio = expandWithSynonyms(relatorioWords);

  // 4. Criar stems para busca fuzzy
  const titleStems = new Set(titleWords.map((w: string) => stemJuridico(w)).filter((s: string) => s.length > 2));
  const allSearchTerms = new Set([...expandedTitle, ...titleWords]);
  const allSearchStems = new Set([...titleStems, ...titleWords.map((w: string) => removeAccents(w))]);

  // 5. Pontuar cada precedente
  const scored = validPrecedentes.map(p => {
    let score = 0;
    const keywordsRaw = typeof p.keywords === 'string' ? p.keywords.split(/[,;]/).map((k: string) => k.trim()) : (Array.isArray(p.keywords) ? p.keywords : []);
    const keywords = keywordsRaw.map((k: string) => removeAccents(k.toLowerCase()));
    const keywordStems = keywords.map((k: string) => k.split(/\s+/).map((w: string) => stemJuridico(w))).flat();
    const tese = removeAccents((p.tese || p.enunciado || '').toLowerCase());
    const titulo = removeAccents((p.titulo || '').toLowerCase());
    const teseStems = tese.split(/\s+/).map((w: string) => stemJuridico(w));

    // Match em keywords (mais importante)
    for (const term of allSearchTerms) {
      const termNorm = removeAccents(term);
      if (keywords.some((k: string) => k.includes(termNorm) || termNorm.includes(k))) score += 20;
    }

    // Match por stem em keywords (captura variações morfológicas)
    for (const stem of allSearchStems) {
      if (stem.length > 3 && keywordStems.some((ks: string) => ks.includes(stem) || stem.includes(ks))) score += 15;
    }

    // Match em título do precedente
    for (const term of allSearchTerms) {
      const termNorm = removeAccents(term);
      if (titulo.includes(termNorm)) score += 15;
    }

    // Match em tese/enunciado
    for (const term of allSearchTerms) {
      const termNorm = removeAccents(term);
      if (tese.includes(termNorm)) score += 10;
    }

    // Match por stemming em tese (mais flexível)
    for (const stem of allSearchStems) {
      if (stem.length > 3 && teseStems.some((ts: string) => ts.includes(stem) || stem.includes(ts))) score += 8;
    }

    // Match com termos do relatório (contexto)
    for (const term of expandedRelatorio) {
      const termNorm = removeAccents(term);
      if (tese.includes(termNorm) || titulo.includes(termNorm)) score += 3;
    }

    // Boost para status válido
    if (isStatusValido(p.status)) score += 5;

    // Boost FORTE para precedentes vinculantes/obrigatórios
    const tipoProc = (p.tipoProcesso || '').toUpperCase();
    const tribunal = (p.tribunal || '').toUpperCase();
    const orgao = (p.orgao || '').toUpperCase();
    const category = (p.category || '').toUpperCase();

    // IRR/IAC do TST (máxima prioridade - vinculantes obrigatórios)
    if (tribunal === 'TST' && (isIRRType(tipoProc) || tipoProc === 'IAC' || category.includes('IRR') || category.includes('IAC'))) {
      score += 500;
    }
    // ADI/ADC/ADPF e Repercussão Geral do STF (vinculantes)
    else if (tribunal === 'STF' && (tipoProc === 'ADI' || tipoProc === 'ADC' || tipoProc === 'ADPF' || tipoProc === 'RE' || tipoProc === 'ARE' || category.includes('REPERCUSSAO'))) {
      score += 480;
    }
    // IRDR/IAC do TRT8 (vinculantes regionais)
    else if ((tribunal === 'TRT8' || tribunal === 'TRT-8' || orgao.includes('TRT')) && (tipoProc === 'IRDR' || tipoProc === 'IAC' || category.includes('IRDR') || category.includes('IAC'))) {
      score += 450;
    }
    // Súmulas vinculantes STF
    else if (tribunal === 'STF' && tipoProc === 'SÚMULA') {
      score += 80;
    }
    // Súmulas TST
    else if (tribunal === 'TST' && (tipoProc === 'SÚMULA' || tipoProc === 'OJ')) {
      score += 70;
    }
    // Outros STF/STJ/TST
    else if (tribunal === 'STF') score += 15;
    else if (tribunal === 'STJ') score += 12;
    else if (tribunal === 'TST') score += 10;

    return { ...p, score, similarity: score / 1000 } as Precedente & { score: number; similarity: number };
  });

  // 6. Filtrar e ordenar (mais candidatos para a IA refinar)
  const candidates = scored.filter(p => p.score > 0).sort((a, b) => b.score - a.score).slice(0, 40) as (Precedente & { similarity: number })[];

  // 7. Se tiver candidatos suficientes, usar IA para refinar
  let results: (Precedente & { similarity: number })[];
  if (candidates.length > 3 && callLLM) {
    const refined = await refineJurisWithAIHelper(topicTitle, miniRelatorio, candidates, callLLM);
    // Adicionar similarity baseado na posição no ranking
    results = refined.map((p, i) => ({ ...p, similarity: 1 - (i * 0.05) }));
  } else {
    results = candidates.slice(0, 10);
  }

  // Salvar no cache
  jurisCache.set(cacheKey, { results, timestamp: Date.now() });
  return results;
};
