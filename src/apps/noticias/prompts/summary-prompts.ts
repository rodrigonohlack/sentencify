// ═══════════════════════════════════════════════════════════════════════════
// PROMPTS - Resumo de Notícias Jurídicas
// v1.41.0 - Prompts para geração de resumos por IA
// ═══════════════════════════════════════════════════════════════════════════

import type { NewsItem } from '../types';

/**
 * System prompt para resumo de notícias jurídicas
 */
export const SUMMARY_SYSTEM_PROMPT = `Você é um assessor jurídico especializado em direito do trabalho brasileiro.
Sua função é resumir notícias jurídicas de forma clara, objetiva e focada na aplicação prática para juízes do trabalho.

Diretrizes:
- Use linguagem técnica apropriada para magistrados
- Seja conciso e objetivo
- Destaque aspectos práticos para aplicação em audiências e sentenças
- Identifique temas relevantes (súmulas, jurisprudência, legislação, etc.)` as const;

/**
 * Gera prompt para resumo de notícia individual
 * @param newsItem - Notícia a ser resumida
 * @returns Prompt formatado para a IA
 */
export const buildSummaryPrompt = (newsItem: NewsItem): string => `
Resuma a seguinte notícia jurídica para um juiz do trabalho:

**Título:** ${newsItem.title}
**Fonte:** ${newsItem.sourceName}
**Data:** ${new Date(newsItem.publishedAt).toLocaleDateString('pt-BR')}
**Conteúdo:** ${newsItem.content || newsItem.description}

Forneça em formato estruturado:

## Resumo Executivo
[2-3 frases com a essência da notícia]

## Pontos-Chave
- [3-5 bullet points com os aspectos mais importantes]

## Relevância Prática
[Como isso impacta audiências, sentenças ou a prática trabalhista]

## Temas Relacionados
[3-5 tags: súmula, jurisprudência, legislação, reforma trabalhista, etc.]

Seja conciso e focado na aplicação prática.`;

/**
 * Configuração para chamada de IA de resumo
 */
export const SUMMARY_AI_CONFIG = {
  maxTokens: 1000,
  disableThinking: true,
} as const;
