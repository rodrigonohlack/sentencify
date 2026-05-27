/**
 * @file import-validation.ts
 * @description Validador para JSON de import de análises de prova oral.
 * @version 1.47.0
 *
 * Espelha o validador do Analisador
 * (src/apps/analisador/utils/import-validation.ts), adaptado ao shape
 * ProvaOralResult / SavedProvaOralAnalysis. Aceita tanto o formato "wrapped"
 * (SavedProvaOralAnalysis, com `resultado`/`transcricao`/`sinteseProcesso`)
 * quanto o ProvaOralResult cru. Estrito nos campos que o renderizador usa
 * (enums + arrays nucleares + vínculo deponenteId↔id); tolerante no resto.
 */

import type {
  ProvaOralResult,
  Depoente,
  Sintese,
  SinteseConteudoItem,
  AnaliseTemaPedido,
  Contradicao,
  Confissao,
  AvaliacaoCredibilidade,
  ProcessoInfo,
  Qualificacao,
  StatusAnalise,
  Relevancia,
  CoerenciaInterna,
  InteresseLitigio,
} from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

export interface ProvaOralValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  payload?: ProvaOralImportPayload;
}

export interface ProvaOralImportPayload {
  resultado: ProvaOralResult;
  transcricao: string;
  sinteseProcesso: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

const isString = (v: unknown): v is string => typeof v === 'string';
const isNumber = (v: unknown): v is number => typeof v === 'number' && !isNaN(v);
const isBoolean = (v: unknown): v is boolean => typeof v === 'boolean';
const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const QUALIFICACAO = new Set(['autor', 'preposto', 'testemunha-autor', 'testemunha-re']);
const STATUS = new Set(['favoravel-autor', 'favoravel-re', 'parcial', 'inconclusivo']);
const RELEVANCIA = new Set(['alta', 'media', 'baixa']);
const COERENCIA = new Set(['alta', 'media', 'comprometida']);
const INTERESSE = new Set(['baixo', 'alerta', 'alto']);
const TIPO_CONTRADICAO = new Set(['interna', 'externa']);
const TIPO_CONFISSAO = new Set(['autor', 'preposto']);

// ═══════════════════════════════════════════════════════════════════════════
// VALIDADORES DE SUB-ESTRUTURAS
// ═══════════════════════════════════════════════════════════════════════════

function validateProcesso(raw: unknown, warnings: string[]): ProcessoInfo {
  if (!isObject(raw)) {
    warnings.push('processo: ausente ou inválido, usando vazio');
    return {};
  }
  const out: ProcessoInfo = {};
  if (isString(raw.numero)) out.numero = raw.numero;
  if (isString(raw.numeroProcesso)) out.numeroProcesso = raw.numeroProcesso;
  if (isString(raw.reclamante)) out.reclamante = raw.reclamante;
  if (isString(raw.reclamada)) out.reclamada = raw.reclamada;
  if (isString(raw.vara)) out.vara = raw.vara;
  return out;
}

function validateDepoentes(raw: unknown, errors: string[]): Depoente[] {
  if (!Array.isArray(raw)) {
    errors.push('depoentes: deve ser array');
    return [];
  }
  const out: Depoente[] = [];
  raw.forEach((d, i) => {
    if (!isObject(d) || !isString(d.id) || !isString(d.nome) || !QUALIFICACAO.has(d.qualificacao as string)) {
      errors.push(
        `depoentes[${i}]: faltam/invalidos campos (id, nome, qualificacao∈{autor,preposto,testemunha-autor,testemunha-re})`
      );
      return;
    }
    const dep: Depoente = { id: d.id, nome: d.nome, qualificacao: d.qualificacao as Qualificacao };
    if (isString(d.funcao)) dep.funcao = d.funcao;
    if (isString(d.periodo)) dep.periodo = d.periodo;
    if (isString(d.relacaoComPartes)) dep.relacaoComPartes = d.relacaoComPartes;
    if (isString(d.observacoes)) dep.observacoes = d.observacoes;
    out.push(dep);
  });
  return out;
}

function validateSinteses(
  raw: unknown,
  depIds: Set<string>,
  errors: string[],
  warnings: string[]
): Sintese[] {
  if (raw == null) return [];
  if (!Array.isArray(raw)) {
    errors.push('sinteses: deve ser array');
    return [];
  }
  const out: Sintese[] = [];
  raw.forEach((s, i) => {
    if (!isObject(s) || !isString(s.deponenteId)) {
      errors.push(`sinteses[${i}]: deponenteId deve ser string`);
      return;
    }
    if (!depIds.has(s.deponenteId)) {
      warnings.push(`sinteses[${i}].deponenteId "${s.deponenteId}" não consta em depoentes[]`);
    }
    const conteudo: SinteseConteudoItem[] = [];
    if (Array.isArray(s.conteudo)) {
      s.conteudo.forEach((c) => {
        if (isObject(c) && isString(c.texto) && isString(c.timestamp)) {
          conteudo.push({ texto: c.texto, timestamp: c.timestamp });
        }
      });
    }
    out.push({ deponenteId: s.deponenteId, conteudo });
  });
  return out;
}

function validateAnalises(raw: unknown, errors: string[]): AnaliseTemaPedido[] {
  if (raw == null) return [];
  if (!Array.isArray(raw)) {
    errors.push('analises: deve ser array');
    return [];
  }
  const out: AnaliseTemaPedido[] = [];
  raw.forEach((a, i) => {
    if (!isObject(a) || !isString(a.titulo) || !isString(a.conclusao) || !STATUS.has(a.status as string)) {
      errors.push(
        `analises[${i}]: faltam/invalidos campos (titulo, conclusao, status∈{favoravel-autor,favoravel-re,parcial,inconclusivo})`
      );
      return;
    }
    const an: AnaliseTemaPedido = {
      titulo: a.titulo,
      conclusao: a.conclusao,
      status: a.status as StatusAnalise,
    };
    if (isString(a.alegacaoAutor)) an.alegacaoAutor = a.alegacaoAutor;
    if (isString(a.defesaRe)) an.defesaRe = a.defesaRe;
    if (Array.isArray(a.provaOral)) {
      an.provaOral = a.provaOral
        .filter((p): p is Record<string, unknown> => isObject(p) && isString(p.deponente) && isString(p.textoCorrente))
        .map((p) => ({ deponente: p.deponente as string, textoCorrente: p.textoCorrente as string }));
    }
    out.push(an);
  });
  return out;
}

function validateContradicoes(raw: unknown, errors: string[]): Contradicao[] {
  if (raw == null) return [];
  if (!Array.isArray(raw)) {
    errors.push('contradicoes: deve ser array');
    return [];
  }
  const out: Contradicao[] = [];
  raw.forEach((c, i) => {
    if (
      !isObject(c) ||
      !TIPO_CONTRADICAO.has(c.tipo as string) ||
      !RELEVANCIA.has(c.relevancia as string) ||
      !isString(c.depoente) ||
      !isString(c.descricao)
    ) {
      errors.push(
        `contradicoes[${i}]: faltam/invalidos campos (tipo∈{interna,externa}, relevancia∈{alta,media,baixa}, depoente, descricao)`
      );
      return;
    }
    const item: Contradicao = {
      tipo: c.tipo as 'interna' | 'externa',
      relevancia: c.relevancia as Relevancia,
      depoente: c.depoente,
      descricao: c.descricao,
    };
    if (Array.isArray(c.timestamps) && c.timestamps.every(isString)) item.timestamps = c.timestamps as string[];
    if (isString(c.analise)) item.analise = c.analise;
    out.push(item);
  });
  return out;
}

function validateConfissoes(raw: unknown, errors: string[]): Confissao[] {
  if (raw == null) return [];
  if (!Array.isArray(raw)) {
    errors.push('confissoes: deve ser array');
    return [];
  }
  const out: Confissao[] = [];
  raw.forEach((c, i) => {
    if (!isObject(c) || !TIPO_CONFISSAO.has(c.tipo as string) || !isString(c.tema) || !isString(c.trecho)) {
      errors.push(`confissoes[${i}]: faltam/invalidos campos (tipo∈{autor,preposto}, tema, trecho)`);
      return;
    }
    const item: Confissao = {
      tipo: c.tipo as 'autor' | 'preposto',
      tema: c.tema,
      trecho: c.trecho,
    };
    if (isString(c.timestamp)) item.timestamp = c.timestamp;
    if (isString(c.implicacao)) item.implicacao = c.implicacao;
    if (RELEVANCIA.has(c.gravidade as string)) item.gravidade = c.gravidade as Relevancia;
    out.push(item);
  });
  return out;
}

function validateCredibilidade(
  raw: unknown,
  depIds: Set<string>,
  errors: string[],
  warnings: string[]
): AvaliacaoCredibilidade[] {
  if (raw == null) return [];
  if (!Array.isArray(raw)) {
    errors.push('credibilidade: deve ser array');
    return [];
  }
  const out: AvaliacaoCredibilidade[] = [];
  raw.forEach((c, i) => {
    if (!isObject(c) || !isString(c.deponenteId)) {
      errors.push(`credibilidade[${i}]: deponenteId deve ser string`);
      return;
    }
    if (!depIds.has(c.deponenteId)) {
      warnings.push(`credibilidade[${i}].deponenteId "${c.deponenteId}" não consta em depoentes[]`);
    }
    const item: AvaliacaoCredibilidade = { deponenteId: c.deponenteId };
    if (isNumber(c.pontuacao)) item.pontuacao = c.pontuacao;
    if (isString(c.avaliacaoGeral)) item.avaliacaoGeral = c.avaliacaoGeral;
    if (isObject(c.criterios)) {
      const cr = c.criterios;
      item.criterios = {
        conhecimentoDireto: isBoolean(cr.conhecimentoDireto) ? cr.conhecimentoDireto : false,
        contemporaneidade: (RELEVANCIA.has(cr.contemporaneidade as string) ? cr.contemporaneidade : 'media') as Relevancia,
        coerenciaInterna: (COERENCIA.has(cr.coerenciaInterna as string) ? cr.coerenciaInterna : 'media') as CoerenciaInterna,
        interesseLitigio: (INTERESSE.has(cr.interesseLitigio as string) ? cr.interesseLitigio : 'baixo') as InteresseLitigio,
      };
    }
    out.push(item);
  });
  return out;
}

// ═══════════════════════════════════════════════════════════════════════════
// VALIDADOR PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Valida e normaliza um objeto que representa uma análise de prova oral
 * importada. Aceita SavedProvaOralAnalysis (com `resultado` aninhado) ou
 * ProvaOralResult cru. Retorna errors/warnings e payload pronto para
 * createAnalysis se válido.
 */
export function validateProvaOralImport(raw: unknown): ProvaOralValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isObject(raw)) {
    return { valid: false, errors: ['Entrada não é objeto JSON'], warnings: [] };
  }

  const isWrapped = isObject(raw.resultado);
  const result: Record<string, unknown> = isWrapped
    ? (raw.resultado as Record<string, unknown>)
    : raw;

  const processo = validateProcesso(result.processo, warnings);
  const depoentes = validateDepoentes(result.depoentes, errors);
  const depIds = new Set(depoentes.map((d) => d.id));
  const sinteses = validateSinteses(result.sinteses, depIds, errors, warnings);
  const analises = validateAnalises(result.analises, errors);
  const contradicoes = validateContradicoes(result.contradicoes, errors);
  const confissoes = validateConfissoes(result.confissoes, errors);
  const credibilidade = validateCredibilidade(result.credibilidade, depIds, errors, warnings);

  if (errors.length > 0) {
    return { valid: false, errors, warnings };
  }

  const resultado: ProvaOralResult = {
    processo,
    depoentes,
    sinteses,
    analises,
    contradicoes,
    confissoes,
    credibilidade,
  };
  if (Array.isArray(result.sintesesCondensadas)) {
    resultado.sintesesCondensadas = result.sintesesCondensadas as ProvaOralResult['sintesesCondensadas'];
  }
  if (Array.isArray(result.sintesesPorTema)) {
    resultado.sintesesPorTema = result.sintesesPorTema as ProvaOralResult['sintesesPorTema'];
  }
  if (Array.isArray(result.highlights)) {
    resultado.highlights = result.highlights as ProvaOralResult['highlights'];
  }

  let transcricao = '';
  let sinteseProcesso = '';
  if (isWrapped) {
    if (isString(raw.transcricao)) transcricao = raw.transcricao;
    if (isString(raw.sinteseProcesso)) sinteseProcesso = raw.sinteseProcesso;
  }
  if (!transcricao) warnings.push('transcrição ausente no JSON; importada vazia');

  return { valid: true, errors: [], warnings, payload: { resultado, transcricao, sinteseProcesso } };
}
