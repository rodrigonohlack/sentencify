/**
 * @file ai-responses.ts
 * @description Schemas Zod para validação de respostas da IA
 * @version 1.0.0
 * Previne crashes quando a IA retorna JSON malformado
 */

import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════
// SCHEMA: Análise de Prepauta (Analisador)
// ═══════════════════════════════════════════════════════════════════

export const AnalysisIdentificacaoSchema = z.object({
  numeroProcesso: z.string().optional().nullable(),
  reclamantes: z.array(z.string()).default([]),
  reclamadas: z.array(z.string()).default([]),
  rito: z.string().optional().nullable(),
  vara: z.string().optional().nullable(),
  dataAjuizamento: z.string().optional().nullable(),
});

export const AnalysisPedidoSchema = z.object({
  numero: z.number().or(z.string().transform(Number)).optional(),
  tema: z.string().nullable().default(''),
  descricao: z.string().nullable().optional().default(''),
  periodo: z.string().optional().nullable(),
  valor: z.union([z.string(), z.number().transform(String)]).nullable().optional(),
  fatosReclamante: z.string().nullable().optional().transform(v => v ?? ''),
  defesaReclamada: z.string().nullable().optional().transform(v => v ?? ''),
  teseJuridica: z.string().nullable().optional().transform(v => v ?? ''),
  controversia: z.boolean().default(true),
  confissaoFicta: z.string().optional().nullable(),
  pontosEsclarecer: z.array(z.string()).optional().default([]),
});

export const AnalysisAlertaSchema = z.object({
  tipo: z.string(),
  descricao: z.string(),
  severidade: z.enum(['alta', 'media', 'baixa']).default('media'),
  recomendacao: z.string().optional().default(''),
});

export const AnalysisResponseSchema = z.object({
  identificacao: AnalysisIdentificacaoSchema.optional(),
  contrato: z.any().optional(),
  tutelasProvisoras: z.array(z.any()).optional().default([]),
  preliminares: z.array(z.any()).optional().default([]),
  prejudiciais: z.any().optional(),
  pedidos: z.array(AnalysisPedidoSchema).default([]),
  reconvencao: z.any().optional(),
  defesasAutonomas: z.array(z.any()).optional().default([]),
  impugnacoes: z.any().optional(),
  provas: z.any().optional(),
  valorCausa: z.any().optional(),
  alertas: z.array(AnalysisAlertaSchema).optional().default([]),
  tabelaSintetica: z.array(z.any()).optional().default([]),
});

// ═══════════════════════════════════════════════════════════════════
// SCHEMA: Double Check
// ═══════════════════════════════════════════════════════════════════

export const CorrectionSchema = z.object({
  type: z.enum(['remove', 'add', 'merge', 'reclassify', 'modify', 'improve']),
  description: z.string(),
  original: z.string().optional(),
  corrected: z.string().optional(),
});

export const DoubleCheckResponseSchema = z.object({
  corrections: z.array(CorrectionSchema).default([]),
  confidence: z.number().min(0).max(1).optional().default(0.85),
  summary: z.string().optional().default(''),
}).passthrough(); // Permite campos extras (verifiedDispositivo, etc.)

// ═══════════════════════════════════════════════════════════════════
// SCHEMA: Extração de Tópicos
// ═══════════════════════════════════════════════════════════════════

export const TopicSchema = z.object({
  titulo: z.string(),
  categoria: z.string(),
  miniRelatorio: z.string().optional(),
});

export const TopicExtractionSchema = z.object({
  partes: z.object({
    reclamantes: z.array(z.string()).default([]),
    reclamadas: z.array(z.string()).default([]),
  }),
  topics: z.array(TopicSchema).default([]),
});

// ═══════════════════════════════════════════════════════════════════
// SCHEMA: Confronto de Fatos
// ═══════════════════════════════════════════════════════════════════

export const FactRowSchema = z.object({
  tema: z.string().optional(),
  fato: z.string().optional(),
  alegacaoReclamante: z.string().optional().default(''),
  alegacaoReclamada: z.string().optional().default(''),
  posicaoReclamante: z.string().optional(),
  posicaoReclamada: z.string().optional(),
  status: z.enum(['controverso', 'incontroverso', 'silencio']).optional().default('controverso'),
  classificacao: z.string().optional(),
  relevancia: z.enum(['alta', 'media', 'baixa']).optional().default('media'),
  observacao: z.string().optional().nullable(),
});

export const FactsComparisonSchema = z.object({
  tabela: z.array(FactRowSchema).default([]),
  fatosIncontroversos: z.array(z.string()).optional().default([]),
  fatosControversos: z.array(z.string()).optional().default([]),
  pontosChave: z.array(z.string()).optional().default([]),
  resumo: z.string().optional().default(''),
});

// ═══════════════════════════════════════════════════════════════════
// SCHEMA: Extração em Lote de Modelos
// ═══════════════════════════════════════════════════════════════════

export const BulkModelSchema = z.object({
  titulo: z.string(),
  categoria: z.string().optional().default(''),
  palavrasChave: z.array(z.string()).optional().default([]),
  conteudo: z.string(),
});

export const BulkExtractionSchema = z.object({
  modelos: z.array(BulkModelSchema).default([]),
});

// ═══════════════════════════════════════════════════════════════════
// UTILIDADE: Parser seguro de JSON com validação
// ═══════════════════════════════════════════════════════════════════

/**
 * Extrai JSON de uma resposta da IA (suporta markdown code blocks e JSON direto)
 */
export function extractJSON(response: string): string | null {
  // Tenta extrair de code block markdown
  const codeBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) return codeBlockMatch[1].trim();

  // Tenta encontrar JSON direto (objeto ou array)
  const jsonMatch = response.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch) return jsonMatch[1].trim();

  return null;
}

/**
 * Parse e valida resposta da IA contra um schema Zod
 * @returns Dados validados ou null se falhar
 */
export function parseAIResponse<T>(
  response: string,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: string } {
  const jsonStr = extractJSON(response);
  if (!jsonStr) {
    return { success: false, error: 'Nenhum JSON encontrado na resposta' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    return { success: false, error: `JSON inválido: ${(e as Error).message}` };
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
    return { success: false, error: `Validação falhou: ${issues}` };
  }

  return { success: true, data: result.data };
}
