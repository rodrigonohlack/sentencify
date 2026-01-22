/**
 * @file analysis.types.ts
 * @description Tipos para resultados da análise de prepauta
 */

export type RitoType = 'ordinario' | 'sumarissimo' | 'sumario';

export interface Identificacao {
  numeroProcesso?: string;
  reclamantes: string[];
  reclamadas: string[];
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
