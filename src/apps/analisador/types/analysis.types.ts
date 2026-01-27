/**
 * @file analysis.types.ts
 * @description Tipos para resultados da análise de prepauta
 */

export type RitoType = 'ordinario' | 'sumarissimo' | 'sumario';

/** Tipo de pedido processual */
export type TipoPedido = 'principal' | 'subsidiario' | 'alternativo' | 'sucessivo';

export interface Identificacao {
  numeroProcesso?: string;
  reclamantes: string[];
  reclamadas: string[];
  temEntePublico?: boolean;
  rito?: RitoType;
  vara?: string;
  dataAjuizamento?: string;
}

export interface ContratoData {
  dataAdmissao?: string;
  dataDemissao?: string;
  funcao?: string;
  ultimoSalario?: number;
  tipoContrato?: string;
  motivoRescisao?: string;
  jornadaAlegada?: string;
}

export interface Contrato {
  dadosInicial: ContratoData;
  dadosContestacao?: ContratoData;
  controversias: string[];
}

export interface TutelaProvisoria {
  tipo: string;
  pedido: string;
  fundamentacao: string;
  urgencia?: string;
}

export interface Preliminar {
  tipo: string;
  descricao: string;
  alegadaPor: 'reclamante' | 'reclamada';
  fundamentacao?: string;
}

export interface PrescricaoData {
  tipo: 'quinquenal' | 'bienal' | 'parcial';
  dataBase?: string;
  fundamentacao: string;
}

export interface DecadenciaData {
  tipo: string;
  prazo: string;
  fundamentacao: string;
}

export interface Prejudiciais {
  prescricao?: PrescricaoData;
  decadencia?: DecadenciaData;
}

export interface PedidoAnalise {
  numero: number;
  tema: string;
  descricao: string;
  periodo?: string;
  valor?: number;
  fatosReclamante: string;
  defesaReclamada?: string;
  teseJuridica?: string;
  controversia: boolean;
  confissaoFicta?: string;
  pontosEsclarecer: string[];
  /** Tipo do pedido: principal, subsidiário, alternativo ou sucessivo */
  tipoPedido?: TipoPedido;
  /** Número do pedido principal relacionado (para pedidos subsidiários/alternativos/sucessivos) */
  pedidoPrincipalNumero?: number;
  /** Condição de aplicação do pedido (ex: "caso não seja reconhecido o turno ininterrupto") */
  condicao?: string;
}

export interface Reconvencao {
  existe: boolean;
  pedidos?: PedidoAnalise[];
  fundamentacao?: string;
}

export interface DefesaAutonoma {
  tipo: string;
  descricao: string;
  fundamentacao: string;
}

export interface ImpugnacaoDocumento {
  documento: string;
  motivo: string;
  manifestacao?: string;
}

export interface Impugnacoes {
  documentos: ImpugnacaoDocumento[];
  documentosNaoImpugnados: string[];
  calculos?: string;
}

export interface ProvasRequeridas {
  testemunhal: boolean;
  documental: boolean;
  pericial: boolean;
  depoimentoPessoal: boolean;
  outras?: string[];
  especificacoes?: string;
}

export interface Provas {
  reclamante: ProvasRequeridas;
  reclamada: ProvasRequeridas;
}

export interface ValorCausa {
  valorTotal: number;
  somaPedidos: number;
  inconsistencia: boolean;
  detalhes?: string;
}

export type AlertaSeveridade = 'alta' | 'media' | 'baixa';

export interface Alerta {
  tipo: string;
  descricao: string;
  severidade: AlertaSeveridade;
  recomendacao?: string;
}

export interface TabelaPedido {
  numero: number;
  tema: string;
  valor?: number;
  teseAutor: string;
  teseRe: string;
  controversia: boolean;
  confissaoFicta?: string;
  observacoes?: string;
  /** Tipo do pedido: principal, subsidiário, alternativo ou sucessivo */
  tipoPedido?: TipoPedido;
  /** Número do pedido principal relacionado (para pedidos subsidiários/alternativos/sucessivos) */
  pedidoPrincipalNumero?: number;
  /** Condição de aplicação do pedido (ex: "caso não seja reconhecido o turno ininterrupto") */
  condicao?: string;
}

export interface AnalysisResult {
  identificacao: Identificacao;
  contrato: Contrato;
  tutelasProvisoras?: TutelaProvisoria[];
  preliminares: Preliminar[];
  prejudiciais: Prejudiciais;
  pedidos: PedidoAnalise[];
  reconvencao?: Reconvencao;
  defesasAutonomas: DefesaAutonoma[];
  impugnacoes: Impugnacoes;
  provas: Provas;
  valorCausa: ValorCausa;
  alertas: Alerta[];
  tabelaSintetica: TabelaPedido[];
}

export interface AnalysisState {
  result: AnalysisResult | null;
  isAnalyzing: boolean;
  progress: number;
  progressMessage: string;
  error: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS PARA HISTÓRICO E BATCH MODE
// ═══════════════════════════════════════════════════════════════════════════

/** Resultado possível de uma audiência */
export type ResultadoAudiencia =
  | 'acordo'
  | 'sentenca'
  | 'sentenca_marcada'
  | 'audiencia_encerramento'
  | 'adiamento'
  | 'redesignada_notificacao'
  | 'cancelada'
  | 'desistencia'
  | 'arquivamento'
  | 'instrucao_encerrada'
  | 'aguardando_pericia'
  | 'suspenso';

/** Análise salva no banco de dados */
export interface SavedAnalysis {
  id: string;
  numeroProcesso: string | null;
  reclamante: string | null;
  reclamadas: string[];
  nomeArquivoPeticao: string | null;
  nomesArquivosEmendas: string[];
  nomesArquivosContestacoes: string[];
  /** @deprecated Use nomesArquivosContestacoes. Mantido para migração de dados antigos. */
  nomeArquivoContestacao?: string | null;
  dataPauta: string | null;
  horarioAudiencia: string | null;
  resultadoAudiencia: ResultadoAudiencia | null;
  pendencias: string[];
  resultado: AnalysisResult;
  createdAt: string;
  updatedAt: string;
}

/** Item de pendência */
export interface Pendencia {
  id: string;
  texto: string;
  concluida: boolean;
}

/** Filtros do histórico */
export interface HistoricoFilters {
  search: string;
  resultado: ResultadoAudiencia | 'todos';
  dataPauta: string | null;
}

/** Estado do batch processing */
export interface BatchState {
  files: BatchFile[];
  isProcessing: boolean;
  currentIndex: number;
  totalFiles: number;
  processedCount: number;
  errorCount: number;
}

/** Arquivo no batch */
export interface BatchFile {
  id: string;
  file: File;
  tipo: 'peticao' | 'emenda' | 'contestacao';
  numeroProcesso: string | null;
  status: 'pending' | 'processing' | 'success' | 'error';
  error?: string;
  matchedWith?: string;
}

/** Par de arquivos para análise */
export interface BatchPair {
  peticao: BatchFile;
  emendas: BatchFile[];
  contestacoes: BatchFile[];
}

/** Resultado do batch processing */
export interface BatchResult {
  success: boolean;
  analysisId?: string;
  error?: string;
  pair: BatchPair;
}

/** Agrupamento por data da pauta */
export interface PautaGroup {
  dataPauta: string;
  analyses: SavedAnalysis[];
}
