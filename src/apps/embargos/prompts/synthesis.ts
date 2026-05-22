/**
 * @file synthesis.ts
 * @description Prompt da 1ª chamada à IA (síntese estruturada).
 */

import type { DocumentSlot } from '../types';

export const SYNTHESIS_SYSTEM_PROMPT = `Você é um exímio juiz do trabalho brasileiro, especializado em analisar embargos de declaração contra sentenças trabalhistas. Sua tarefa NESTA ETAPA é apenas estruturar uma síntese analítica em JSON — não redigir a decisão.

Aplique rigorosamente os arts. 897-A da CLT e 1.022 do CPC: omissão, contradição, obscuridade e erro material são os únicos vícios embargáveis. Diferencie vícios genuínos de mero pedido de rejulgamento.

PROIBIÇÕES INEGOCIÁVEIS:
- Não invente fatos.
- Não cite jurisprudência fictícia.
- Não cite dispositivos inexistentes.
- Não presuma informações ausentes — se faltarem elementos, marque null e adicione observação.
- Mantenha imparcialidade. Você é juiz, não advogado da parte.

Devolva APENAS um JSON válido no shape solicitado, sem texto adicional antes ou depois.`;

interface SlotPayload {
  slot: DocumentSlot;
  name?: string;
  text?: string;
  binaryAttached?: boolean;
}

const SLOT_HEADERS: Record<DocumentSlot, string> = {
  decisaoEmbargada: '=== DECISÃO EMBARGADA (SENTENÇA) ===',
  embargos: '=== EMBARGOS DE DECLARAÇÃO ===',
  contrarrazoes: '=== CONTRARRAZÕES AOS EMBARGOS ===',
  inicial: '=== PETIÇÃO INICIAL ===',
  contestacao: '=== CONTESTAÇÃO ==='
};

export function buildSynthesisPrompt(slots: SlotPayload[]): string {
  const sections = slots.map(({ slot, name, text, binaryAttached }) => {
    const header = SLOT_HEADERS[slot];
    const meta = name ? `Arquivo: ${name}` : '';
    const body = binaryAttached
      ? '(PDF anexado nesta mensagem; analise o conteúdo do anexo)'
      : (text ?? '(não fornecido)');
    return [header, meta, body].filter(Boolean).join('\n');
  });

  return `Analise os documentos abaixo e devolva um JSON estruturado conforme o shape especificado.

DOCUMENTOS:

${sections.join('\n\n')}

Retorne APENAS um JSON válido neste shape (sem markdown, sem texto adicional):

{
  "identificacao": {
    "numeroProcesso": "string ou null",
    "parteEmbargante": "nome da parte que opôs os embargos",
    "parteEmbargada": "nome da parte contrária",
    "polo": "reclamante | reclamada | ambas (polo do embargante)",
    "tempestividade": {
      "tempestivo": "true | false | null se não puder aferir",
      "observacao": "string ou null"
    }
  },
  "resumoSentenca": "narrativa curta do que a sentença decidiu (3-5 frases)",
  "resumoEmbargos": "narrativa curta dos embargos (3-5 frases)",
  "resumoContrarrazoes": "narrativa curta ou null se não fornecidas",
  "intimacaoContrariaStatus": "dispensada | manifestouSe | silente | null",
  "pontos": [
    {
      "ordem": 1,
      "trechoEmbargos": "trecho/resumo curto do que a parte alegou neste ponto",
      "vicioAlegadoPelaParte": ["omissao | contradicao | obscuridade | erroMaterial"],
      "vicioReconhecidoPelaIA": ["array do(s) vício(s) que a IA efetivamente reconhece (pode divergir)"],
      "divergenciaVicio": "string explicando divergência ou null se não há",
      "oQueSentencaDisse": "o que a sentença efetivamente decidiu sobre esse ponto",
      "questaoSuscitadaNoProcesso": "true se a questão foi suscitada na inicial/contestação fornecida, false se não foi, null se inicial/contestação não foram fornecidas",
      "conclusaoPreliminar": "acolher | acolherParcial | rejeitar | sanarOficio",
      "justificativaPreliminar": "1-3 frases concisas (não a redação final)",
      "efeitosInfringentes": "true | false (se a parte pleiteia efeito modificativo)",
      "outrosPedidos": ["array com outros pedidos formulados, ex: 'prazo para recurso ordinário'"]
    }
  ]
}

INSTRUÇÕES IMPORTANTES:
- Se a parte alegou um vício mas a análise indica outro (ex: alegou contradição, mas é erro material), preencha vicioReconhecidoPelaIA com o correto e descreva em divergenciaVicio.
- Se a inicial/contestação não foram fornecidas, marque questaoSuscitadaNoProcesso como null e indique isso em justificativaPreliminar quando relevante.
- justificativaPreliminar deve ser curta (1-3 frases) — apenas suficiente para o juiz avaliar. A redação completa virá depois.
- Se não houver pontos suscitáveis (caso raro), devolva array vazio em "pontos".`;
}
