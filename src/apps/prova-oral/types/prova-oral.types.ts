/**
 * @file prova-oral.types.ts
 * @description Tipos para análise de prova oral trabalhista
 * Baseado no protótipo v2 com estrutura detalhada
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

/** Nível de coerência interna */
export type CoerenciaInterna = 'alta' | 'media' | 'comprometida';

/** Nível de interesse no litígio */
export type InteresseLitigio = 'baixo' | 'alerta' | 'alto';

// ═══════════════════════════════════════════════════════════════════════════
// ESTRUTURA DO PROCESSO
// ═══════════════════════════════════════════════════════════════════════════

/** Informações básicas do processo */
export interface ProcessoInfo {
  numero?: string;
  numeroProcesso?: string; // Retrocompatibilidade
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
  funcao?: string;
  periodo?: string;
  relacaoComPartes?: string; // Retrocompatibilidade
  observacoes?: string; // Retrocompatibilidade
}

// ═══════════════════════════════════════════════════════════════════════════
// SÍNTESES DETALHADAS (NOVO - com timestamps)
// ═══════════════════════════════════════════════════════════════════════════

/** Item de conteúdo com timestamp */
export interface SinteseConteudoItem {
  texto: string;
  timestamp: string;
}

/** Síntese detalhada do depoimento de um depoente */
export interface Sintese {
  deponenteId: string;
  conteudo: SinteseConteudoItem[];
  // Retrocompatibilidade
  deponenteNome?: string;
  qualificacao?: Qualificacao;
  pontosPrincipais?: string[];
  trechoRelevante?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// SÍNTESES CONDENSADAS (NOVO)
// ═══════════════════════════════════════════════════════════════════════════

/** Síntese condensada de um depoente (texto corrido) */
export interface SinteseCondensada {
  deponente: string;
  qualificacao: Qualificacao;
  textoCorrente: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// SÍNTESES POR TEMA (NOVO)
// ═══════════════════════════════════════════════════════════════════════════

/** Declaração de um depoente sobre um tema específico */
export interface DeclaracaoPorTema {
  deponente: string;
  qualificacao: Qualificacao;
  textoCorrente: string;
}

/** Síntese agrupada por tema */
export interface SintesePorTema {
  tema: string;
  declaracoes: DeclaracaoPorTema[];
}

// ═══════════════════════════════════════════════════════════════════════════
// ANÁLISES POR TEMA/PEDIDO (ATUALIZADO)
// ═══════════════════════════════════════════════════════════════════════════

/** Prova oral de um depoente (novo formato com deponente obrigatório) */
export interface ProvaOralItem {
  deponente: string;
  conteudo: string;
  timestamp?: string;
}

/** Análise de um tema/pedido específico (formato do protótipo) */
export interface AnaliseTemaPedido {
  titulo: string;
  alegacaoAutor?: string;
  defesaRe?: string;
  provaOral?: ProvaOralItem[];
  conclusao: string;
  status: StatusAnalise;
  // Retrocompatibilidade
  tema?: string;
  descricao?: string;
  declaracoes?: DeclaracaoDepoente[];
  fundamentacao?: string;
  relevancia?: Relevancia;
}

/** Declaração de um depoente (retrocompatibilidade) */
export interface DeclaracaoDepoente {
  deponenteId: string;
  deponenteNome: string;
  qualificacao: Qualificacao;
  declaracao: string;
  favoravel: 'autor' | 're' | 'neutro';
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTRADIÇÕES (ATUALIZADO)
// ═══════════════════════════════════════════════════════════════════════════

/** Contradição identificada entre depoimentos */
export interface Contradicao {
  tipo: 'interna' | 'externa';
  relevancia: Relevancia;
  depoente: string;
  descricao: string;
  timestamps?: string[];
  analise?: string;
  // Retrocompatibilidade
  tema?: string;
  depoentes?: string[];
  impacto?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONFISSÕES (ATUALIZADO)
// ═══════════════════════════════════════════════════════════════════════════

/** Confissão identificada em depoimento */
export interface Confissao {
  tipo: 'autor' | 'preposto';
  tema: string;
  trecho: string;
  timestamp?: string;
  implicacao?: string;
  gravidade?: Relevancia;
  // Retrocompatibilidade
  deponenteNome?: string;
  qualificacao?: Qualificacao;
  declaracao?: string;
  relevancia?: Relevancia;
}

// ═══════════════════════════════════════════════════════════════════════════
// CREDIBILIDADE (ATUALIZADO)
// ═══════════════════════════════════════════════════════════════════════════

/** Critérios de avaliação de credibilidade */
export interface CriteriosCredibilidade {
  conhecimentoDireto: boolean;
  contemporaneidade: Relevancia;
  coerenciaInterna: CoerenciaInterna;
  interesseLitigio: InteresseLitigio;
}

/** Avaliação de credibilidade de um depoente */
export interface AvaliacaoCredibilidade {
  deponenteId: string;
  pontuacao?: number; // 1-5
  avaliacaoGeral?: string;
  criterios?: CriteriosCredibilidade;
  // Retrocompatibilidade
  deponenteNome?: string;
  qualificacao?: Qualificacao;
  nivel?: NivelCredibilidade;
  fundamentacao?: string;
  pontosPositivos?: string[];
  pontosNegativos?: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// RESULTADO COMPLETO
// ═══════════════════════════════════════════════════════════════════════════

/** Resultado completo da análise de prova oral */
export interface ProvaOralResult {
  processo: ProcessoInfo;
  depoentes: Depoente[];
  sinteses: Sintese[];
  sintesesCondensadas?: SinteseCondensada[];
  sintesesPorTema?: SintesePorTema[];
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
  // Campos opcionais de compartilhamento (presentes quando vem da API com sharing)
  isOwn?: boolean;
  ownerEmail?: string;
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

/** Modo de visualização das sínteses */
export type SinteseViewMode = 'detalhada' | 'condensada' | 'tema';

// ═══════════════════════════════════════════════════════════════════════════
// COMPARTILHAMENTO
// ═══════════════════════════════════════════════════════════════════════════

/** Usuário do sistema */
export interface User {
  id: string;
  email: string;
}

/** Estado de compartilhamento */
export interface SharingState {
  recipients: User[];
  availableUsers: User[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
}
