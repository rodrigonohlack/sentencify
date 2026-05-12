/**
 * @file tabela.ts
 * @description Gera a tabelaSintetica a partir do array de pedidos.
 * Extraído para evitar dependência circular entre useResultStore e useAnalysis.
 */

import type { PedidoAnalise, TabelaPedido } from '../types';

/**
 * Gera tabelaSintetica derivada de result.pedidos.
 * Mantém consistência 1:1 entre a aba Análise Completa e a Tabela Sintética.
 */
export const generateTabelaSintetica = (pedidos: PedidoAnalise[]): TabelaPedido[] => {
  return pedidos.map(p => ({
    numero: p.numero,
    tema: p.tema,
    valor: p.valor,
    teseAutor: p.fatosReclamante || '',
    teseRe: p.defesaReclamada || 'Não houve contestação',
    controversia: p.controversia,
    confissaoFicta: p.confissaoFicta,
    observacoes: p.pontosEsclarecer?.length > 0 ? p.pontosEsclarecer[0] : undefined,
    tipoPedido: p.tipoPedido,
    pedidoPrincipalNumero: p.pedidoPrincipalNumero,
    condicao: p.condicao,
  }));
};
