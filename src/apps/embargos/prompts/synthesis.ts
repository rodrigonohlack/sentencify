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

Retorne APENAS um JSON válido neste shape (sem markdown, sem texto adicional).

REGRAS DE TIPO (CRÍTICAS):
- Campos do tipo boolean DEVEM ser literais JSON true/false (sem aspas).
- Campos nullable que não puderem ser preenchidos DEVEM ser literal JSON null (sem aspas).
- Campos enum DEVEM usar EXATAMENTE um dos valores listados, entre aspas.
- Strings normais entre aspas. Números sem aspas.

SHAPE (os marcadores <...> descrevem o tipo esperado em cada posição):

{
  "identificacao": {
    "numeroProcesso": <string ou null>,
    "parteEmbargante": <string com o nome da parte que opôs os embargos>,
    "parteEmbargada": <string com o nome da parte contrária>,
    "polo": <enum: "reclamante" | "reclamada" | "ambas">,
    "tempestividade": {
      "tempestivo": <boolean true ou false, ou null se não puder aferir>,
      "observacao": <string ou null>
    }
  },
  "resumoSentenca": <string com narrativa curta do que a sentença decidiu (3-5 frases)>,
  "resumoEmbargos": <string com narrativa curta dos embargos (3-5 frases)>,
  "resumoContrarrazoes": <string ou null se contrarrazões não fornecidas>,
  "intimacaoContrariaStatus": <enum: "dispensada" | "manifestouSe" | "silente" | null>,
  "pontos": [
    {
      "ordem": <number, ex: 1>,
      "trechoEmbargos": <string com trecho/resumo do que a parte alegou neste ponto>,
      "vicioAlegadoPelaParte": [<array de enum: "omissao" | "contradicao" | "obscuridade" | "erroMaterial">],
      "vicioReconhecidoPelaIA": [<array dos vícios que a análise reconhece — pode divergir do alegado>],
      "divergenciaVicio": <string explicando divergência ou null se não há>,
      "oQueSentencaDisse": <string com o que a sentença efetivamente decidiu sobre esse ponto>,
      "questaoSuscitadaNoProcesso": <boolean true ou false, ou null se inicial/contestação não foram fornecidas>,
      "conclusaoPreliminar": <enum: "acolher" | "acolherParcial" | "rejeitar" | "sanarOficio">,
      "justificativaPreliminar": <string com 1-3 frases concisas (não a redação final)>,
      "efeitosInfringentes": <boolean true ou false>,
      "outrosPedidos": [<array de strings, ex: ["prazo para recurso ordinário"]>]
    }
  ]
}

INSTRUÇÕES IMPORTANTES:
- Se a parte alegou um vício mas a análise indica outro (ex: alegou contradição, mas é erro material), preencha vicioReconhecidoPelaIA com o correto e descreva em divergenciaVicio.
- Se a inicial/contestação não foram fornecidas, marque questaoSuscitadaNoProcesso como null e indique isso em justificativaPreliminar quando relevante.
- justificativaPreliminar deve ser curta (1-3 frases) — apenas suficiente para o juiz avaliar. A redação completa virá depois.
- Se não houver pontos suscitáveis (caso raro), devolva array vazio em "pontos".`;
}
