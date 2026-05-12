/**
 * @file refine-pedido.ts
 * @description Prompt para reanalisar UM ÚNICO pedido com instruções customizadas do magistrado.
 * Compartilha o vocabulário e formato de `pedidos[]` definido em analysis.ts, mas restringe
 * o escopo de saída a um único objeto PedidoAnalise para reduzir custo e ruído.
 */

import type { PedidoAnalise, AnalysisResult } from '../types';
import type { BinaryFlags } from './analysis';
import { binaryPlaceholder } from './analysis';

export const REFINE_PEDIDO_SYSTEM_PROMPT = `Você é um assistente jurídico especializado em Direito do Trabalho brasileiro.
Sua tarefa é REFINAR a análise de UM ÚNICO PEDIDO de uma petição trabalhista, considerando instruções específicas do magistrado e os documentos originais do processo.

REGRAS CRÍTICAS:
1. Retorne APENAS o objeto JSON do pedido refinado, no MESMO FORMATO do pedido original (mesmas chaves).
2. Mantenha o campo "numero" IDÊNTICO ao pedido original.
3. Não invente fatos — toda informação deve estar nos documentos. Se a instrução do magistrado pede algo não encontrado, sinalize em "pontosEsclarecer".
4. Você está refinando UM pedido — NÃO responda sobre outros pedidos do processo, mesmo que listados como contexto.
5. Imparcialidade absoluta: não enviese pró-empregado nem pró-empresa.
6. Em "fatosReclamante" e "defesaReclamada" mantenha o nível de detalhe COMPLETO (valores, horários, datas, citações de normas coletivas) — NÃO RESUMA.`;

export interface RefinePedidoContext {
  pedidoAtual: PedidoAnalise;
  /** Resultado completo da análise — usado apenas como contexto (outros pedidos, partes, contrato). */
  resultadoCompleto: AnalysisResult;
  /** Instrução do magistrado em texto livre. */
  instrucao: string;
  peticaoText: string;
  emendasTexts: string[];
  contestacoesTexts: string[];
  nomes: {
    peticao?: string;
    emendas: string[];
    contestacoes: string[];
  };
  binaryFlags: BinaryFlags;
}

/**
 * Monta o prompt de usuário para refino de pedido individual.
 * Estrutura: identificação resumida → pedido atual (JSON) → outros pedidos (header-only)
 * → documentos → instrução do magistrado → formato esperado de saída.
 */
export const buildRefinePedidoPrompt = (ctx: RefinePedidoContext): string => {
  const {
    pedidoAtual,
    resultadoCompleto,
    instrucao,
    peticaoText,
    emendasTexts,
    contestacoesTexts,
    nomes,
    binaryFlags,
  } = ctx;

  const identificacao = resultadoCompleto.identificacao || { reclamantes: [], reclamadas: [] };
  const reclamantes = (identificacao.reclamantes || []).join(', ') || 'Não informado';
  const reclamadas = (identificacao.reclamadas || []).join(', ') || 'Não informado';
  const numeroProcesso = identificacao.numeroProcesso || 'Não informado';

  const outrosPedidos = (resultadoCompleto.pedidos || [])
    .filter(p => p.numero !== pedidoAtual.numero)
    .map(p => ({
      numero: p.numero,
      tema: p.tema,
      tipoPedido: p.tipoPedido || 'principal',
    }));

  const peticaoBody = binaryFlags.peticao
    ? binaryPlaceholder(nomes.peticao || 'petição inicial')
    : (peticaoText || 'Não fornecida');

  const emendasSection = emendasTexts.length > 0
    ? emendasTexts.map((e, i) => {
        const nome = nomes.emendas[i] || `Emenda ${i + 1}`;
        const body = binaryFlags.emendas?.[i] ? binaryPlaceholder(nome) : e;
        return `--- ${nome} ---\n${body}`;
      }).join('\n\n')
    : 'Não há emendas à petição inicial.';

  const contestacoesSection = contestacoesTexts.length > 0
    ? contestacoesTexts.map((c, i) => {
        const nome = nomes.contestacoes[i] || `Contestação ${i + 1}`;
        const body = binaryFlags.contestacoes?.[i] ? binaryPlaceholder(nome) : c;
        return `--- ${nome} ---\n${body}`;
      }).join('\n\n')
    : 'Não há contestação nos autos.';

  return `Refine a análise do pedido abaixo, considerando a instrução do magistrado e os documentos originais.

=== IDENTIFICAÇÃO DO PROCESSO ===
Número: ${numeroProcesso}
Reclamante(s): ${reclamantes}
Reclamada(s): ${reclamadas}

=== PEDIDO A REFINAR (estado atual da análise) ===
${JSON.stringify(pedidoAtual, null, 2)}

=== OUTROS PEDIDOS DO PROCESSO (apenas contexto — NÃO analise) ===
${outrosPedidos.length > 0 ? JSON.stringify(outrosPedidos, null, 2) : 'Nenhum outro pedido.'}

=== DOCUMENTOS ORIGINAIS ===

--- PETIÇÃO INICIAL ---
Arquivo: ${nomes.peticao || 'Não informado'}
${peticaoBody}

--- EMENDAS À PETIÇÃO INICIAL ---
${emendasSection}

--- CONTESTAÇÕES ---
${contestacoesSection}

=== INSTRUÇÃO DO MAGISTRADO ===
${instrucao.trim()}

=== FORMATO DE SAÍDA ===
Retorne APENAS um objeto JSON com o pedido refinado, no MESMO formato do pedido original:

{
  "numero": ${pedidoAtual.numero},
  "tema": "string",
  "descricao": "string DETALHADA",
  "tipoPedido": "principal | subsidiario | alternativo | sucessivo",
  "pedidoPrincipalNumero": "number ou null",
  "condicao": "string ou null",
  "periodo": "string ou null",
  "valor": "number ou null",
  "fatosReclamante": "string COMPLETA com TODOS os argumentos — não resuma",
  "defesaReclamada": "string COMPLETA com TODOS os argumentos da defesa — não resuma",
  "teseJuridica": "string ou null",
  "controversia": true/false,
  "confissaoFicta": "string ou null",
  "pontosEsclarecer": ["array de pontos a esclarecer em audiência"]
}

Não inclua texto antes ou depois do JSON. Não envolva em markdown code blocks.`;
};
