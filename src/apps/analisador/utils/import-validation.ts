/**
 * @file import-validation.ts
 * @description Validador para JSON de import de análises externas
 * @version 1.43.38
 *
 * Valida que um objeto avulso satisfaz o contrato mínimo de AnalysisResult
 * (e opcionalmente de SavedAnalysis), permitindo importar análises geradas
 * fora do app sem corromper o banco.
 */

import type {
  AnalysisResult,
  PedidoAnalise,
  Preliminar,
  TabelaPedido,
  Identificacao,
  Contrato,
  Provas,
  ValorCausa,
  TipoPedido,
} from '../types/analysis.types';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

/** Resultado da validação de um arquivo */
export interface ValidationResult {
  valid: boolean;
  /** Erros que impedem a importação */
  errors: string[];
  /** Avisos não-bloqueantes (campos opcionais ausentes, etc.) */
  warnings: string[];
  /** Payload pronto para createAnalysis se valid === true */
  payload?: ImportPayload;
}

/** Payload para createAnalysis, derivado do JSON de entrada */
export interface ImportPayload {
  resultado: AnalysisResult;
  nomeArquivoPeticao?: string;
  nomesArquivosEmendas?: string[];
  nomesArquivosContestacoes?: string[];
  dataPauta?: string;
  horarioAudiencia?: string;
}

/** Resultado da validação de um lote (array ou single) */
export interface BatchValidationResult {
  /** Total de análises encontradas no arquivo */
  total: number;
  /** Resultados individuais, na mesma ordem do input */
  items: ValidationResult[];
  /** Quantas são válidas */
  validCount: number;
  /** Quantas são inválidas */
  invalidCount: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

const TIPOS_PEDIDO_VALIDOS: TipoPedido[] = ['principal', 'subsidiario', 'alternativo', 'sucessivo'];

function isString(v: unknown): v is string {
  return typeof v === 'string';
}

function isNumber(v: unknown): v is number {
  return typeof v === 'number' && !isNaN(v);
}

function isBoolean(v: unknown): v is boolean {
  return typeof v === 'boolean';
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every(isString);
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

// ═══════════════════════════════════════════════════════════════════════════
// VALIDADORES DE SUB-ESTRUTURAS
// ═══════════════════════════════════════════════════════════════════════════

function validateIdentificacao(
  raw: unknown,
  errors: string[],
  warnings: string[]
): Identificacao | null {
  if (!isObject(raw)) {
    errors.push('identificacao: deve ser objeto');
    return null;
  }
  const reclamantes = raw.reclamantes;
  const reclamadas = raw.reclamadas;
  if (!isStringArray(reclamantes)) {
    errors.push('identificacao.reclamantes: deve ser array de strings');
    return null;
  }
  if (!isStringArray(reclamadas)) {
    errors.push('identificacao.reclamadas: deve ser array de strings');
    return null;
  }
  if (reclamantes.length === 0) warnings.push('identificacao.reclamantes vazio');
  if (reclamadas.length === 0) warnings.push('identificacao.reclamadas vazio');

  const out: Identificacao = { reclamantes, reclamadas };
  if (isString(raw.numeroProcesso)) out.numeroProcesso = raw.numeroProcesso;
  if (isBoolean(raw.temEntePublico)) out.temEntePublico = raw.temEntePublico;
  if (raw.rito === 'ordinario' || raw.rito === 'sumarissimo' || raw.rito === 'sumario') {
    out.rito = raw.rito;
  }
  if (isString(raw.vara)) out.vara = raw.vara;
  if (isString(raw.dataAjuizamento)) out.dataAjuizamento = raw.dataAjuizamento;
  return out;
}

function validateContrato(raw: unknown, errors: string[]): Contrato | null {
  if (!isObject(raw)) {
    errors.push('contrato: deve ser objeto');
    return null;
  }
  if (!isObject(raw.dadosInicial)) {
    errors.push('contrato.dadosInicial: deve ser objeto');
    return null;
  }
  const controversias = isStringArray(raw.controversias) ? raw.controversias : [];
  // Sanitiza dadosInicial deixando passar apenas campos conhecidos
  const di = raw.dadosInicial;
  const dadosInicial = {
    ...(isString(di.dataAdmissao) && { dataAdmissao: di.dataAdmissao }),
    ...(isString(di.dataDemissao) && { dataDemissao: di.dataDemissao }),
    ...(isString(di.funcao) && { funcao: di.funcao }),
    ...(isNumber(di.ultimoSalario) && { ultimoSalario: di.ultimoSalario }),
    ...(isString(di.tipoContrato) && { tipoContrato: di.tipoContrato }),
    ...(isString(di.motivoRescisao) && { motivoRescisao: di.motivoRescisao }),
    ...(isString(di.jornadaAlegada) && { jornadaAlegada: di.jornadaAlegada }),
  };
  const out: Contrato = { dadosInicial, controversias };
  if (isObject(raw.dadosContestacao)) {
    const dc = raw.dadosContestacao;
    out.dadosContestacao = {
      ...(isString(dc.dataAdmissao) && { dataAdmissao: dc.dataAdmissao }),
      ...(isString(dc.dataDemissao) && { dataDemissao: dc.dataDemissao }),
      ...(isString(dc.funcao) && { funcao: dc.funcao }),
      ...(isNumber(dc.ultimoSalario) && { ultimoSalario: dc.ultimoSalario }),
      ...(isString(dc.tipoContrato) && { tipoContrato: dc.tipoContrato }),
      ...(isString(dc.motivoRescisao) && { motivoRescisao: dc.motivoRescisao }),
      ...(isString(dc.jornadaAlegada) && { jornadaAlegada: dc.jornadaAlegada }),
    };
  }
  return out;
}

function validatePedido(raw: unknown, index: number, errors: string[]): PedidoAnalise | null {
  if (!isObject(raw)) {
    errors.push(`pedidos[${index}]: deve ser objeto`);
    return null;
  }
  if (!isNumber(raw.numero)) {
    errors.push(`pedidos[${index}].numero: deve ser número`);
    return null;
  }
  if (!isString(raw.tema)) {
    errors.push(`pedidos[${index}].tema: deve ser string`);
    return null;
  }
  if (!isString(raw.descricao)) {
    errors.push(`pedidos[${index}].descricao: deve ser string`);
    return null;
  }
  if (!isString(raw.fatosReclamante)) {
    errors.push(`pedidos[${index}].fatosReclamante: deve ser string`);
    return null;
  }
  if (!isBoolean(raw.controversia)) {
    errors.push(`pedidos[${index}].controversia: deve ser boolean`);
    return null;
  }
  if (!Array.isArray(raw.pontosEsclarecer) || !raw.pontosEsclarecer.every(isString)) {
    errors.push(`pedidos[${index}].pontosEsclarecer: deve ser array de strings`);
    return null;
  }
  const out: PedidoAnalise = {
    numero: raw.numero,
    tema: raw.tema,
    descricao: raw.descricao,
    fatosReclamante: raw.fatosReclamante,
    controversia: raw.controversia,
    pontosEsclarecer: raw.pontosEsclarecer,
  };
  if (isString(raw.periodo)) out.periodo = raw.periodo;
  if (isNumber(raw.valor)) out.valor = raw.valor;
  if (isString(raw.defesaReclamada)) out.defesaReclamada = raw.defesaReclamada;
  if (isString(raw.teseJuridica)) out.teseJuridica = raw.teseJuridica;
  if (isString(raw.confissaoFicta)) out.confissaoFicta = raw.confissaoFicta;
  if (isString(raw.tipoPedido) && TIPOS_PEDIDO_VALIDOS.includes(raw.tipoPedido as TipoPedido)) {
    out.tipoPedido = raw.tipoPedido as TipoPedido;
  }
  if (isNumber(raw.pedidoPrincipalNumero)) out.pedidoPrincipalNumero = raw.pedidoPrincipalNumero;
  if (isString(raw.condicao)) out.condicao = raw.condicao;
  return out;
}

function validateTabelaPedido(raw: unknown, index: number, errors: string[]): TabelaPedido | null {
  if (!isObject(raw)) {
    errors.push(`tabelaSintetica[${index}]: deve ser objeto`);
    return null;
  }
  if (!isNumber(raw.numero) || !isString(raw.tema) || !isString(raw.teseAutor) || !isString(raw.teseRe) || !isBoolean(raw.controversia)) {
    errors.push(`tabelaSintetica[${index}]: faltam campos obrigatórios (numero, tema, teseAutor, teseRe, controversia)`);
    return null;
  }
  const out: TabelaPedido = {
    numero: raw.numero,
    tema: raw.tema,
    teseAutor: raw.teseAutor,
    teseRe: raw.teseRe,
    controversia: raw.controversia,
  };
  if (isNumber(raw.valor)) out.valor = raw.valor;
  if (isString(raw.confissaoFicta)) out.confissaoFicta = raw.confissaoFicta;
  if (isString(raw.observacoes)) out.observacoes = raw.observacoes;
  if (isString(raw.tipoPedido) && TIPOS_PEDIDO_VALIDOS.includes(raw.tipoPedido as TipoPedido)) {
    out.tipoPedido = raw.tipoPedido as TipoPedido;
  }
  if (isNumber(raw.pedidoPrincipalNumero)) out.pedidoPrincipalNumero = raw.pedidoPrincipalNumero;
  if (isString(raw.condicao)) out.condicao = raw.condicao;
  return out;
}

function validatePreliminar(raw: unknown, index: number, errors: string[]): Preliminar | null {
  if (!isObject(raw)) {
    errors.push(`preliminares[${index}]: deve ser objeto`);
    return null;
  }
  if (!isString(raw.tipo) || !isString(raw.descricao)) {
    errors.push(`preliminares[${index}]: faltam campos tipo/descricao`);
    return null;
  }
  const alegadaPor = raw.alegadaPor;
  if (alegadaPor !== 'reclamante' && alegadaPor !== 'reclamada') {
    errors.push(`preliminares[${index}].alegadaPor: deve ser 'reclamante' ou 'reclamada'`);
    return null;
  }
  const out: Preliminar = { tipo: raw.tipo, descricao: raw.descricao, alegadaPor };
  if (isString(raw.fundamentacao)) out.fundamentacao = raw.fundamentacao;
  return out;
}

function defaultProvas(): Provas {
  const empty = {
    testemunhal: false,
    documental: false,
    pericial: false,
    depoimentoPessoal: false,
  };
  return { reclamante: { ...empty }, reclamada: { ...empty } };
}

function validateProvas(raw: unknown, warnings: string[]): Provas {
  if (!isObject(raw) || !isObject(raw.reclamante) || !isObject(raw.reclamada)) {
    warnings.push('provas: ausente ou inválido, usando defaults');
    return defaultProvas();
  }
  const toRequired = (side: Record<string, unknown>) => ({
    testemunhal: isBoolean(side.testemunhal) ? side.testemunhal : false,
    documental: isBoolean(side.documental) ? side.documental : false,
    pericial: isBoolean(side.pericial) ? side.pericial : false,
    depoimentoPessoal: isBoolean(side.depoimentoPessoal) ? side.depoimentoPessoal : false,
    ...(isStringArray(side.outras) && { outras: side.outras }),
    ...(isString(side.especificacoes) && { especificacoes: side.especificacoes }),
  });
  return {
    reclamante: toRequired(raw.reclamante),
    reclamada: toRequired(raw.reclamada),
  };
}

function validateValorCausa(raw: unknown, warnings: string[]): ValorCausa {
  if (!isObject(raw)) {
    warnings.push('valorCausa: ausente, usando zeros');
    return { valorTotal: 0, somaPedidos: 0, inconsistencia: false };
  }
  return {
    valorTotal: isNumber(raw.valorTotal) ? raw.valorTotal : 0,
    somaPedidos: isNumber(raw.somaPedidos) ? raw.somaPedidos : 0,
    inconsistencia: isBoolean(raw.inconsistencia) ? raw.inconsistencia : false,
    ...(isString(raw.detalhes) && { detalhes: raw.detalhes }),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// VALIDADOR PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Valida e normaliza um objeto que representa uma análise importada.
 * Aceita tanto um SavedAnalysis (com `resultado` aninhado) quanto um
 * AnalysisResult cru. Retorna ValidationResult com errors/warnings e o
 * payload pronto para createAnalysis se válido.
 */
export function validateAnalysisImport(raw: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isObject(raw)) {
    return { valid: false, errors: ['Entrada não é objeto JSON'], warnings: [] };
  }

  // Detecta se é SavedAnalysis (tem `resultado`) ou AnalysisResult cru
  const isWrapped = isObject(raw.resultado);
  const result: Record<string, unknown> = isWrapped
    ? (raw.resultado as Record<string, unknown>)
    : raw;

  // Campos obrigatórios do AnalysisResult
  const identificacao = validateIdentificacao(result.identificacao, errors, warnings);
  const contrato = validateContrato(result.contrato, errors);

  if (!Array.isArray(result.pedidos)) {
    errors.push('pedidos: deve ser array');
  }
  const pedidos: PedidoAnalise[] = [];
  if (Array.isArray(result.pedidos)) {
    result.pedidos.forEach((p, i) => {
      const v = validatePedido(p, i, errors);
      if (v) pedidos.push(v);
    });
  }

  const preliminares: Preliminar[] = [];
  if (Array.isArray(result.preliminares)) {
    result.preliminares.forEach((p, i) => {
      const v = validatePreliminar(p, i, errors);
      if (v) preliminares.push(v);
    });
  }

  const tabelaSintetica: TabelaPedido[] = [];
  if (Array.isArray(result.tabelaSintetica)) {
    result.tabelaSintetica.forEach((t, i) => {
      const v = validateTabelaPedido(t, i, errors);
      if (v) tabelaSintetica.push(v);
    });
  } else {
    warnings.push('tabelaSintetica ausente; usando derivação automática dos pedidos');
    // Deriva tabela a partir dos pedidos
    pedidos.forEach((p) => {
      tabelaSintetica.push({
        numero: p.numero,
        tema: p.tema,
        valor: p.valor,
        teseAutor: p.fatosReclamante,
        teseRe: p.defesaReclamada ?? '',
        controversia: p.controversia,
        ...(p.confissaoFicta && { confissaoFicta: p.confissaoFicta }),
        ...(p.tipoPedido && { tipoPedido: p.tipoPedido }),
        ...(p.pedidoPrincipalNumero !== undefined && { pedidoPrincipalNumero: p.pedidoPrincipalNumero }),
        ...(p.condicao && { condicao: p.condicao }),
      });
    });
  }

  const prejudiciais = isObject(result.prejudiciais) ? result.prejudiciais : {};

  if (errors.length > 0) {
    return { valid: false, errors, warnings };
  }

  // Constrói o AnalysisResult final (todos os campos validados)
  const analysisResult: AnalysisResult = {
    identificacao: identificacao!,
    contrato: contrato!,
    preliminares,
    prejudiciais: prejudiciais as AnalysisResult['prejudiciais'],
    pedidos,
    defesasAutonomas: Array.isArray(result.defesasAutonomas) ? result.defesasAutonomas : [],
    impugnacoes: isObject(result.impugnacoes)
      ? (result.impugnacoes as unknown as AnalysisResult['impugnacoes'])
      : { documentos: [], documentosNaoImpugnados: [] },
    provas: validateProvas(result.provas, warnings),
    valorCausa: validateValorCausa(result.valorCausa, warnings),
    alertas: Array.isArray(result.alertas) ? result.alertas : [],
    tabelaSintetica,
  };
  if (Array.isArray(result.tutelasProvisoras)) {
    analysisResult.tutelasProvisoras = result.tutelasProvisoras;
  }
  if (isObject(result.reconvencao)) {
    analysisResult.reconvencao = result.reconvencao as unknown as AnalysisResult['reconvencao'];
  }

  // Campos top-level do SavedAnalysis (se vier wrapped)
  const payload: ImportPayload = { resultado: analysisResult };
  if (isWrapped) {
    if (isString(raw.nomeArquivoPeticao)) payload.nomeArquivoPeticao = raw.nomeArquivoPeticao;
    if (isStringArray(raw.nomesArquivosEmendas)) payload.nomesArquivosEmendas = raw.nomesArquivosEmendas;
    if (isStringArray(raw.nomesArquivosContestacoes)) payload.nomesArquivosContestacoes = raw.nomesArquivosContestacoes;
    if (isString(raw.dataPauta)) payload.dataPauta = raw.dataPauta;
    if (isString(raw.horarioAudiencia)) payload.horarioAudiencia = raw.horarioAudiencia;
  }

  return { valid: true, errors: [], warnings, payload };
}

/**
 * Valida um arquivo JSON completo (que pode conter um objeto único ou um array).
 * Retorna um BatchValidationResult.
 */
export function validateImportFile(json: unknown): BatchValidationResult {
  const items: ValidationResult[] = [];
  if (Array.isArray(json)) {
    json.forEach((item) => items.push(validateAnalysisImport(item)));
  } else {
    items.push(validateAnalysisImport(json));
  }
  const validCount = items.filter((i) => i.valid).length;
  return {
    total: items.length,
    items,
    validCount,
    invalidCount: items.length - validCount,
  };
}
