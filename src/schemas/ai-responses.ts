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
}).passthrough();

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
}).passthrough();

export const AnalysisAlertaSchema = z.object({
  tipo: z.string().nullable().default('').transform(v => v ?? ''),
  descricao: z.string().nullable().default('').transform(v => v ?? ''),
  severidade: z.enum(['alta', 'media', 'baixa']).nullable().default('media').transform(v => v ?? 'media'),
  recomendacao: z.string().nullable().optional().default('').transform(v => v ?? ''),
}).passthrough();

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
}).passthrough();

// ═══════════════════════════════════════════════════════════════════
// SCHEMA: Double Check
// ═══════════════════════════════════════════════════════════════════

export const CorrectionSchema = z.object({
  type: z.enum([
    'remove', 'add', 'merge', 'reclassify',
    'modify',
    'false_positive', 'missed', 'improve',
    'add_row', 'fix_row', 'remove_row', 'add_fato',
  ]),
  description: z.string().nullable().default('').transform(v => v ?? ''),
  original: z.string().nullable().optional().transform(v => v ?? undefined),
  corrected: z.string().nullable().optional().transform(v => v ?? undefined),
}).passthrough();

export const DoubleCheckResponseSchema = z.object({
  corrections: z.array(CorrectionSchema).default([]),
  confidence: z.number().min(0).max(1).optional().default(0.85),
  summary: z.string().nullable().optional().default('').transform(v => v ?? ''),
}).passthrough(); // Permite campos extras (verifiedDispositivo, etc.)

// ═══════════════════════════════════════════════════════════════════
// SCHEMA: Extração de Tópicos
// ═══════════════════════════════════════════════════════════════════

export const TopicSchema = z.object({
  title: z.string().nullable().default('').transform(v => v ?? ''),
  category: z.string().nullable().default('').transform(v => v ?? ''),
}).passthrough();

/**
 * v1.42.07: Detecção de prompt injection nos documentos do processo.
 * Reportada pela própria IA durante a extração de tópicos — defesa semântica.
 */
export const PromptInjectionDetectionSchema = z.object({
  trecho: z.string().nullable().default('').transform(v => v ?? ''),
  documento: z.string().nullable().default('').transform(v => v ?? ''),
  descricao: z.string().nullable().default('').transform(v => v ?? ''),
  gravidade: z.enum(['baixa', 'media', 'alta']).nullable().default('media').transform(v => v ?? 'media'),
}).passthrough();

export const TopicExtractionSchema = z.object({
  partes: z.object({
    reclamante: z.string().nullable().default('').transform(v => v ?? ''),
    reclamadas: z.array(z.string()).default([]),
  }).passthrough().optional().default({ reclamante: '', reclamadas: [] }),
  topics: z.array(TopicSchema).default([]),
  /** v1.42.07: Tentativas de prompt injection identificadas pela IA. Default vazio. */
  promptInjections: z.array(PromptInjectionDetectionSchema).optional().default([]),
}).passthrough();

export type PromptInjectionDetection = z.infer<typeof PromptInjectionDetectionSchema>;

// ═══════════════════════════════════════════════════════════════════
// SCHEMA: Confronto de Fatos
// ═══════════════════════════════════════════════════════════════════

export const FactRowSchema = z.object({
  tema: z.string().optional(),
  fato: z.string().nullable().optional().transform(v => v ?? ''),
  alegacaoReclamante: z.string().nullable().optional().transform(v => v ?? ''),
  alegacaoReclamada: z.string().nullable().optional().transform(v => v ?? ''),
  posicaoReclamante: z.string().optional(),
  posicaoReclamada: z.string().optional(),
  status: z.enum(['controverso', 'incontroverso', 'silencio']).optional().default('controverso'),
  classificacao: z.string().optional(),
  relevancia: z.enum(['alta', 'media', 'baixa']).optional().default('media'),
  observacao: z.string().optional().nullable(),
}).passthrough();

export const FactsComparisonSchema = z.object({
  tabela: z.array(FactRowSchema).default([]),
  fatosIncontroversos: z.array(z.string()).optional().default([]),
  fatosControversos: z.array(z.string()).optional().default([]),
  pontosChave: z.array(z.string()).optional().default([]),
  resumo: z.string().optional().default(''),
}).passthrough();

// ═══════════════════════════════════════════════════════════════════
// SCHEMA: Extração em Lote de Modelos
// ═══════════════════════════════════════════════════════════════════

export const BulkModelSchema = z.object({
  titulo: z.string().nullable().default('').transform(v => v ?? ''),
  categoria: z.string().nullable().optional().default('').transform(v => v ?? ''),
  palavrasChave: z.union([
    z.array(z.string()),
    z.string().transform(s => s ? s.split(',').map(k => k.trim()) : [])
  ]).optional().default([]),
  conteudo: z.string().nullable().default('').transform(v => v ?? ''),
}).passthrough();

export const BulkExtractionSchema = z.object({
  modelos: z.array(BulkModelSchema).default([]),
}).passthrough();

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

// ═══════════════════════════════════════════════════════════════════
// SCHEMA: Rastreabilidade de fontes do mini-relatório
// ═══════════════════════════════════════════════════════════════════

export const RastreabilidadeTrechoSchema = z.object({
  peca: z.string().nullable().default('').transform(v => v ?? ''),
  trecho: z.string().nullable().default('').transform(v => v ?? ''),
}).passthrough();

// Fidelidade tolerante: `veredito` aceita qualquer string (normalizada a jusante em
// mapTracingResponse para 'fiel'|'divergente'|'indeterminado'); `divergencias` default [].
export const RastreabilidadeFidelidadeSchema = z.object({
  veredito: z.string().nullable().optional(),
  divergencias: z.array(z.string()).default([]),
}).passthrough();

// Tolerância intencional: `blocoIndex` aceita number ou string numérica (LLMs às vezes
// serializam índices como string). Um valor não-numérico vira NaN e NÃO derruba o parse —
// é ignorado a jusante por mapTracingResponse (NaN nunca casa com o índice do parágrafo),
// o que é preferível a rejeitar a resposta inteira por causa de um único bloco malformado.
export const RastreabilidadeBlocoSchema = z.object({
  blocoIndex: z.number().or(z.string().transform(Number)),
  trechos: z.array(RastreabilidadeTrechoSchema).default([]),
  fidelidade: RastreabilidadeFidelidadeSchema.optional(),
}).passthrough();

export const RastreabilidadeResponseSchema = z.object({
  blocos: z.array(RastreabilidadeBlocoSchema).default([]),
}).passthrough();

// ═══════════════════════════════════════════════════════════════════
// SCHEMA: Embargos de Declaração (subapp Embargos)
// ═══════════════════════════════════════════════════════════════════

const EmbargosVicioTipoSchema = z.enum(['omissao', 'contradicao', 'obscuridade', 'erroMaterial']);
const EmbargosConclusaoTipoSchema = z.enum(['acolher', 'acolherParcial', 'rejeitar', 'sanarOficio']);

/**
 * Coerção tolerante: aceita boolean nativo, strings "true"/"false"/"sim"/"não"/"null"
 * (com variações de case e acento), null e undefined.
 * Necessário porque LLMs frequentemente serializam booleans como strings.
 */
const toleranteBooleanNullable = z.preprocess(
  (v) => {
    if (typeof v === 'boolean') return v;
    if (v === null || v === undefined) return null;
    if (typeof v === 'string') {
      const s = v.toLowerCase().trim();
      if (s === 'true' || s === 'sim') return true;
      if (s === 'false' || s === 'não' || s === 'nao') return false;
      if (s === 'null' || s === '' || s === 'não informado' || s === 'nao informado' || s === 'n/a') return null;
    }
    return v;
  },
  z.boolean().nullable()
);

const toleranteBoolean = z.preprocess(
  (v) => {
    if (typeof v === 'boolean') return v;
    if (typeof v === 'string') {
      const s = v.toLowerCase().trim();
      if (s === 'true' || s === 'sim') return true;
      if (s === 'false' || s === 'não' || s === 'nao' || s === '') return false;
    }
    return v;
  },
  z.boolean()
);

const toleranteIntimacao = z.preprocess(
  (v) => {
    if (v === null || v === undefined) return null;
    if (typeof v === 'string') {
      const s = v.toLowerCase().trim();
      if (s === 'dispensada' || s.includes('dispens')) return 'dispensada';
      if (s === 'manifestouse' || s === 'manifestou-se' || s.includes('manifest')) return 'manifestouSe';
      if (s === 'silente' || s.includes('silen')) return 'silente';
      if (s === 'null' || s === '' || s.includes('não informado') || s.includes('nao informado') || s === 'n/a') return null;
    }
    return v;
  },
  z.enum(['dispensada', 'manifestouSe', 'silente']).nullable()
);

const EmbargosPontoSchema = z.object({
  id: z.string().optional(),
  ordem: z.number(),
  trechoEmbargos: z.string(),
  vicioAlegadoPelaParte: z.array(EmbargosVicioTipoSchema),
  vicioReconhecidoPelaIA: z.array(EmbargosVicioTipoSchema),
  divergenciaVicio: z.string().nullable(),
  oQueSentencaDisse: z.string(),
  questaoSuscitadaNoProcesso: toleranteBooleanNullable,
  conclusaoPreliminar: EmbargosConclusaoTipoSchema,
  justificativaPreliminar: z.string(),
  efeitosInfringentes: toleranteBoolean,
  outrosPedidos: z.array(z.string())
});

export const SynthesisResponseSchema = z.object({
  identificacao: z.object({
    numeroProcesso: z.string().nullable(),
    parteEmbargante: z.string(),
    parteEmbargada: z.string(),
    polo: z.enum(['reclamante', 'reclamada', 'ambas']),
    tempestividade: z.object({
      tempestivo: toleranteBooleanNullable,
      observacao: z.string().nullable()
    })
  }),
  resumoSentenca: z.string(),
  resumoEmbargos: z.string(),
  resumoContrarrazoes: z.string().nullable(),
  intimacaoContrariaStatus: toleranteIntimacao,
  pontos: z.array(EmbargosPontoSchema)
});

export const DraftResponseSchema = z.object({
  relatorio: z.string(),
  fundamentacao: z.string(),
  dispositivo: z.string()
});

export const RefineResponseSchema = z.object({
  text: z.string()
});

export type SynthesisResponse = z.infer<typeof SynthesisResponseSchema>;
export type DraftResponse = z.infer<typeof DraftResponseSchema>;
export type RefineResponse = z.infer<typeof RefineResponseSchema>;
