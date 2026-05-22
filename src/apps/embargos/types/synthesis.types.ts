/**
 * @file synthesis.types.ts
 * @description Tipos da síntese estruturada (1ª chamada à IA) e revisão pelo usuário.
 */

export type VicioTipo = 'omissao' | 'contradicao' | 'obscuridade' | 'erroMaterial';
export type ConclusaoTipo = 'acolher' | 'acolherParcial' | 'rejeitar' | 'sanarOficio';

export interface Tempestividade {
  tempestivo: boolean | null;
  observacao: string | null;
}

export interface Identificacao {
  numeroProcesso: string | null;
  parteEmbargante: string;
  parteEmbargada: string;
  polo: 'reclamante' | 'reclamada' | 'ambas';
  tempestividade: Tempestividade;
}

export interface PontoSuscitado {
  id: string;
  ordem: number;
  trechoEmbargos: string;
  vicioAlegadoPelaParte: VicioTipo[];
  vicioReconhecidoPelaIA: VicioTipo[];
  divergenciaVicio: string | null;
  oQueSentencaDisse: string;
  questaoSuscitadaNoProcesso: boolean | null;
  conclusaoPreliminar: ConclusaoTipo;
  justificativaPreliminar: string;
  efeitosInfringentes: boolean;
  outrosPedidos: string[];
  conclusaoUsuario?: ConclusaoTipo;
  diretrizesUsuario?: string;
}

export interface SynthesisResult {
  identificacao: Identificacao;
  resumoSentenca: string;
  resumoEmbargos: string;
  resumoContrarrazoes: string | null;
  intimacaoContrariaStatus: 'dispensada' | 'manifestouSe' | 'silente' | null;
  pontos: PontoSuscitado[];
  diretrizesGeraisUsuario?: string;
}

export const VICIO_LABELS: Record<VicioTipo, string> = {
  omissao: 'Omissão',
  contradicao: 'Contradição',
  obscuridade: 'Obscuridade',
  erroMaterial: 'Erro material'
};

export const CONCLUSAO_LABELS: Record<ConclusaoTipo, string> = {
  acolher: 'Acolher',
  acolherParcial: 'Acolher parcialmente',
  rejeitar: 'Rejeitar',
  sanarOficio: 'Sanar de ofício'
};
