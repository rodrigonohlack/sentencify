/**
 * @file draft.ts
 * @description Prompt da 2ª chamada à IA (minuta em 3 seções).
 */

import type { SynthesisResult, VicioTipo, PontoSuscitado } from '../types';
import { STYLE_GUIDE } from './style-guide';

export const DRAFT_SYSTEM_PROMPT = `Você é um exímio juiz do trabalho brasileiro, redigindo a minuta de decisão de embargos de declaração. Estrutura obrigatória em três seções: Relatório, Fundamentação, Dispositivo. Devolva como JSON { "relatorio": "...", "fundamentacao": "...", "dispositivo": "..." }, SEM cabeçalhos dentro do texto de cada campo.

${STYLE_GUIDE}

PROIBIÇÕES INEGOCIÁVEIS (REFORÇO):
- Não invente fatos, jurisprudência ou dispositivos legais.
- Não presuma informações ausentes.
- Mantenha estrita fidelidade ao que o usuário forneceu.
- Se faltar elemento essencial, registre no campo correspondente uma marca [ATENÇÃO: ...] para o juiz revisor — não fabule.`;

const PARAGRAFO_OMISSAO = `A omissão passível de correção por embargos de declaração é aquela que recai sobre ponto relevante e essencial à solução da controvérsia, ou seja, matéria que efetivamente influencie o convencimento judicial e repercuta no dispositivo da sentença. Não se trata, portanto, de qualquer ausência de manifestação, mas da omissão qualificada, juridicamente relevante.`;

const PARAGRAFO_OBSCURIDADE = `A obscuridade caracteriza-se pela falta de clareza ou precisão na redação da decisão judicial, capaz de comprometer a compreensão de seu conteúdo e dificultar a identificação das razões de decidir. Nessa hipótese, não se trata de divergência interpretativa ou mero inconformismo da parte, mas de passagens cujo teor se mostra ambíguo, confuso ou de difícil assimilação, inviabilizando a exata compreensão da fundamentação ou do dispositivo.`;

const PARAGRAFO_CONTRADICAO = `A contradição não se confunde com mera discordância da parte quanto ao resultado do julgamento ou à valoração da prova. Trata-se de vício interno da decisão judicial, caracterizado por incompatibilidade lógica entre diferentes trechos do julgado, ou entre a fundamentação e o dispositivo. Em outras palavras, há contradição embargável quando o juiz afirma uma coisa ao fundamentar e decide o oposto ao concluir, ou ainda quando duas passagens da decisão são mutuamente excludentes ou logicamente inconciliáveis. Não configura contradição, portanto, o simples fato de a parte entender que as provas foram mal apreciadas ou que determinada conclusão foi equivocada — nesses casos, o meio adequado de impugnação é o recurso ordinário, e não os embargos de declaração.`;

const PARAGRAFO_ERRO_MATERIAL = `O erro material é um equívoco evidente, objetivo e formal presente na decisão judicial, que não decorre de uma análise jurídica equivocada, mas, sim, de uma falha de escrita, cálculo, digitação ou identificação. Trata-se, portanto, de um deslize objetivo, que não exige juízo valorativo ou reexame do mérito da causa para ser corrigido. Sua retificação pode ser feita de ofício pelo juiz ou a requerimento da parte, inclusive por meio de embargos de declaração (CPC, art. 494, I, e art. 1.022, parágrafo único, II).`;

const PARAGRAFOS_VICIO: Record<VicioTipo, string> = {
  omissao: PARAGRAFO_OMISSAO,
  obscuridade: PARAGRAFO_OBSCURIDADE,
  contradicao: PARAGRAFO_CONTRADICAO,
  erroMaterial: PARAGRAFO_ERRO_MATERIAL
};

function collectViciosEmAnalise(synthesis: SynthesisResult): VicioTipo[] {
  const set = new Set<VicioTipo>();
  for (const p of synthesis.pontos) {
    p.vicioAlegadoPelaParte.forEach(v => set.add(v));
    p.vicioReconhecidoPelaIA.forEach(v => set.add(v));
  }
  // ordem canônica
  return (['omissao', 'obscuridade', 'contradicao', 'erroMaterial'] as VicioTipo[]).filter(v => set.has(v));
}

function effectiveConclusao(p: PontoSuscitado) {
  return p.conclusaoUsuario ?? p.conclusaoPreliminar;
}

export function buildDraftPrompt(synthesis: SynthesisResult): string {
  const polo = synthesis.identificacao.polo === 'ambas' ? 'reclamante e reclamada' : synthesis.identificacao.polo;
  const viciosEmAnalise = collectViciosEmAnalise(synthesis);
  const todasRejeicoes = synthesis.pontos.length > 0 && synthesis.pontos.every(p => effectiveConclusao(p) === 'rejeitar');

  const intimacaoVariantes = {
    dispensada: 'Nos termos do art. 897-A, § 2º, da CLT, dispensou-se a intimação da parte contrária, pois ausente eventual efeito modificativo na decisão.',
    manifestouSe: 'Intimada, a parte embargada manifestou-se.',
    silente: 'Intimada, a parte embargada manteve-se silente.'
  } as const;

  const intimacaoTexto = synthesis.intimacaoContrariaStatus
    ? intimacaoVariantes[synthesis.intimacaoContrariaStatus]
    : '[ATENÇÃO: status de intimação da parte contrária não informado]';

  const pontosFmt = synthesis.pontos.map((p, idx) => {
    const conclusao = effectiveConclusao(p);
    const diretrizes = p.diretrizesUsuario?.trim() ? `\n   Diretrizes do usuário: ${p.diretrizesUsuario.trim()}` : '';
    return `Ponto ${idx + 1}:
   - Trecho dos embargos: ${p.trechoEmbargos}
   - Vício alegado pela parte: ${p.vicioAlegadoPelaParte.join(', ')}
   - Vício reconhecido na análise: ${p.vicioReconhecidoPelaIA.join(', ')}
   - Divergência: ${p.divergenciaVicio ?? '(nenhuma)'}
   - O que a sentença disse: ${p.oQueSentencaDisse}
   - Questão suscitada no processo? ${p.questaoSuscitadaNoProcesso === null ? 'não informado' : p.questaoSuscitadaNoProcesso ? 'sim' : 'não'}
   - Conclusão: ${conclusao}
   - Justificativa preliminar: ${p.justificativaPreliminar}
   - Efeitos infringentes pleiteados? ${p.efeitosInfringentes ? 'sim' : 'não'}
   - Outros pedidos: ${p.outrosPedidos.length ? p.outrosPedidos.join('; ') : '(nenhum)'}${diretrizes}`;
  }).join('\n\n');

  const diretrizesGerais = synthesis.diretrizesGeraisUsuario?.trim()
    ? `\n\nDIRETRIZES GERAIS DO USUÁRIO:\n${synthesis.diretrizesGeraisUsuario.trim()}`
    : '';

  const introducoesVicios = viciosEmAnalise.map(v => PARAGRAFOS_VICIO[v]).join('\n\n');

  const paragrafoRejeicaoFinal = todasRejeicoes
    ? `\n\nINSTRUÇÃO ADICIONAL: como todos os pontos foram rejeitados, inclua ao final da fundamentação, com adaptação ao caso, o seguinte parágrafo (parametrize o vício efetivamente alegado):\n"A parte embargante, ao alegar [vício(s) alegado(s)], na verdade expressa mero inconformismo com a valoração das provas e com o resultado do julgamento, pretendendo rediscutir o mérito da causa, o que escapa do escopo legal dos embargos de declaração, não havendo, na presente hipótese, nenhum vício a ser sanado por essa estreita via recursal."`
    : '';

  return `Com base na síntese e diretrizes abaixo, redija a minuta da decisão de embargos de declaração.

SÍNTESE CONSOLIDADA:

Identificação:
- Número do processo: ${synthesis.identificacao.numeroProcesso ?? '[NÃO INFORMADO]'}
- Parte embargante: ${synthesis.identificacao.parteEmbargante}
- Parte embargada: ${synthesis.identificacao.parteEmbargada}
- Polo do embargante: ${polo}
- Tempestividade: ${synthesis.identificacao.tempestividade.tempestivo === null ? 'não aferida' : synthesis.identificacao.tempestividade.tempestivo ? 'tempestivos' : 'intempestivos'}${synthesis.identificacao.tempestividade.observacao ? ` (${synthesis.identificacao.tempestividade.observacao})` : ''}

Resumo da sentença: ${synthesis.resumoSentenca}

Resumo dos embargos: ${synthesis.resumoEmbargos}

${synthesis.resumoContrarrazoes ? `Resumo das contrarrazões: ${synthesis.resumoContrarrazoes}\n` : 'Contrarrazões: não fornecidas.\n'}
Status da intimação da parte contrária: ${synthesis.intimacaoContrariaStatus ?? 'não informado'}

PONTOS SUSCITADOS:

${pontosFmt || '(nenhum)'}${diretrizesGerais}

ESTRUTURA OBRIGATÓRIA DA MINUTA (devolva como JSON { relatorio, fundamentacao, dispositivo }):

=== RELATÓRIO ===
Use a seguinte estrutura, adaptando ao caso:

"[Parte embargante] opôs embargos de declaração (art. 897-A da CLT c/c art. 1.022 do CPC), alegando, em síntese, a existência de [vício(s)] na sentença embargada devido a [síntese curta das alegações].

${intimacaoTexto}

É o relatório. Decido."

=== FUNDAMENTAÇÃO ===
Comece literalmente com estes dois parágrafos:

"Conheço dos embargos de declaração opostos pela parte ${synthesis.identificacao.polo === 'reclamante' ? 'reclamante' : synthesis.identificacao.polo === 'reclamada' ? 'reclamada' : 'embargante'}, pois tempestivos e subscritos por advogado(a) habilitado(a), motivo por que passo à apreciação do mérito recursal."

"Nos termos do art. 897-A da CLT, com remissão ao art. 1.022 do CPC, os embargos de declaração são cabíveis quando houver na decisão judicial omissão, obscuridade, contradição interna ou erro material."

Em seguida, inclua o(s) parágrafo(s) introdutório(s) literal(is) abaixo (apenas dos vícios em análise — ${viciosEmAnalise.join(', ') || 'nenhum'}), na ordem em que aparecem:

${introducoesVicios || '(sem vícios em análise; trate como rejeição genérica)'}

Depois, analise cada ponto suscitado individualmente, na ordem dada, justificando acolhimento/rejeição/saneamento com base na análise técnica e nas diretrizes do usuário. Cite obrigatoriamente todos os Ids de documentos, dispositivos normativos e argumentos fornecidos pelo usuário nas diretrizes. Você pode incrementar e enriquecer os argumentos do usuário, desde que jamais invente fatos ou fundamentos.${paragrafoRejeicaoFinal}

=== DISPOSITIVO ===
Conclua acolhendo, acolhendo parcialmente ou rejeitando os embargos, ponto a ponto conforme as conclusões. Quando houver acolhimento, indique o saneamento do vício (supressão de omissão, esclarecimento de obscuridade, sanação de contradição, correção de erro material). Quando houver efeitos infringentes pleiteados e cabíveis, decida sobre a modificação da sentença. Decida também sobre eventuais outros pedidos (ex: prazo recursal).

Devolva APENAS o JSON { "relatorio": "...", "fundamentacao": "...", "dispositivo": "..." }, sem markdown, sem cabeçalhos dentro dos textos.`;
}
