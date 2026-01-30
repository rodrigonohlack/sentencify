/**
 * @file prova-oral.types.ts
 * @description Tipos para análise de prova oral trabalhista
 */

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS BASE
// ═══════════════════════════════════════════════════════════════════════════

/** Qualificação do depoente no processo */
export type Qualificacao = 'autor' | 'preposto' | 'testemunha-autor' | 'testemunha-re';

/** Status de uma análise temática */
export type StatusAnalise = 'favoravel-autor' | 'favoravel-re' | 'parcial' | 'inconclusivo';

/** Nível de relevância */
export type Relevancia = 'alta' | 'media' | 'baixa';

/** Nível de credibilidade */
export type NivelCredibilidade = 'alta' | 'media' | 'baixa';

// ═══════════════════════════════════════════════════════════════════════════
// ESTRUTURA DO PROCESSO
// ═══════════════════════════════════════════════════════════════════════════

/** Informações básicas do processo */
export interface ProcessoInfo {
  numeroProcesso?: string;
  reclamante?: string;
  reclamada?: string;
  vara?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// DEPOENTES
// ═══════════════════════════════════════════════════════════════════════════

/** Depoente identificado na transcrição */
export interface Depoente {
  id: string;
  nome: string;
  qualificacao: Qualificacao;
  relacaoComPartes?: string;
  observacoes?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// SÍNTESES
// ═══════════════════════════════════════════════════════════════════════════

/** Síntese do depoimento de um depoente */
export interface Sintese {
  deponenteId: string;
  deponenteNome: string;
  qualificacao: Qualificacao;
  pontosPrincipais: string[];
  trechoRelevante?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// ANÁLISES POR TEMA/PEDIDO
// ═══════════════════════════════════════════════════════════════════════════

/** Declaração de um depoente sobre um tema específico */
export interface DeclaracaoDepoente {
  deponenteId: string;
  deponenteNome: string;
  qualificacao: Qualificacao;
  declaracao: string;
  favoravel: 'autor' | 're' | 'neutro';
}

/** Análise de um tema/pedido específico */
export interface AnaliseTemaPedido {
  tema: string;
  descricao?: string;
  declaracoes: DeclaracaoDepoente[];
  conclusao: StatusAnalise;
  fundamentacao: string;
  relevancia: Relevancia;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTRADIÇÕES
// ═══════════════════════════════════════════════════════════════════════════

/** Contradição identificada entre depoimentos */
export interface Contradicao {
  tema: string;
  depoentes: string[];
  descricao: string;
  relevancia: Relevancia;
  impacto: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONFISSÕES
// ═══════════════════════════════════════════════════════════════════════════

/** Confissão identificada em depoimento */
export interface Confissao {
  deponenteNome: string;
  qualificacao: Qualificacao;
  tema: string;
  declaracao: string;
  tipo: 'real' | 'ficta';
  relevancia: Relevancia;
}

// ═══════════════════════════════════════════════════════════════════════════
// CREDIBILIDADE
// ═══════════════════════════════════════════════════════════════════════════

/** Avaliação de credibilidade de um depoente */
export interface AvaliacaoCredibilidade {
  deponenteId: string;
  deponenteNome: string;
  qualificacao: Qualificacao;
  nivel: NivelCredibilidade;
  fundamentacao: string;
  pontosPositivos: string[];
  pontosNegativos: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// RESULTADO COMPLETO
// ═══════════════════════════════════════════════════════════════════════════

/** Resultado completo da análise de prova oral */
export interface ProvaOralResult {
  processo: ProcessoInfo;
  depoentes: Depoente[];
  sinteses: Sintese[];
  analises: AnaliseTemaPedido[];
  contradicoes: Contradicao[];
  confissoes: Confissao[];
  credibilidade: AvaliacaoCredibilidade[];
}

// ═══════════════════════════════════════════════════════════════════════════
// ANÁLISE SALVA
// ═══════════════════════════════════════════════════════════════════════════

/** Análise de prova oral salva no banco de dados */
export interface SavedProvaOralAnalysis {
  id: string;
  numeroProcesso: string | null;
  reclamante: string | null;
  reclamada: string | null;
  vara: string | null;
  transcricao: string;
  sinteseProcesso: string;
  resultado: ProvaOralResult;
  createdAt: string;
  updatedAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// ESTADO DA ANÁLISE
// ═══════════════════════════════════════════════════════════════════════════

/** Estado da análise em andamento */
export interface ProvaOralAnalysisState {
  result: ProvaOralResult | null;
  isAnalyzing: boolean;
  progress: number;
  progressMessage: string;
  error: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// TABS DE RESULTADO
// ═══════════════════════════════════════════════════════════════════════════

/** Tipo das tabs disponíveis */
export type ResultTabId =
  | 'depoentes'
  | 'sinteses'
  | 'analises'
  | 'contradicoes'
  | 'confissoes'
  | 'credibilidade'
  | 'comparativo';
