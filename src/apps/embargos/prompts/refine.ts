/**
 * @file refine.ts
 * @description Prompt de refino de uma seção específica da minuta via chat.
 */

import type { Draft, DraftSectionKey, ChatMessage, SynthesisResult } from '../types';
import { SECTION_LABELS } from '../types';
import { STYLE_GUIDE } from './style-guide';

export const REFINE_SYSTEM_PROMPT = `Você é um exímio juiz do trabalho brasileiro, refinando uma seção específica de uma minuta de decisão de embargos de declaração já redigida.

${STYLE_GUIDE}

PROIBIÇÕES INEGOCIÁVEIS:
- Não invente fatos, jurisprudência ou dispositivos legais.
- Não presuma informações ausentes.
- Mantenha estrita fidelidade ao que foi fornecido.
- Devolva APENAS o JSON { "text": "..." } com a seção refinada, sem cabeçalhos, sem markdown.`;

export function buildRefinePrompt(
  section: DraftSectionKey,
  draft: Draft,
  synthesis: SynthesisResult,
  history: ChatMessage[],
  newInstruction: string
): string {
  const sectionLabel = SECTION_LABELS[section];
  const historicoChat = history.length
    ? history.map(m => `[${m.role === 'user' ? 'USUÁRIO' : 'IA'}] ${m.content}`).join('\n\n')
    : '(nenhum histórico anterior)';

  return `Refine apenas a seção [${sectionLabel}] da minuta abaixo, aplicando a instrução do usuário. Mantenha coerência com as outras seções (estão listadas como contexto, mas NÃO devem ser modificadas).

CONTEXTO — minuta atual completa:

=== RELATÓRIO ===
${draft.relatorio.text}

=== FUNDAMENTAÇÃO ===
${draft.fundamentacao.text}

=== DISPOSITIVO ===
${draft.dispositivo.text}

CONTEXTO — síntese consolidada (resumo):
Parte embargante: ${synthesis.identificacao.parteEmbargante}
Parte embargada: ${synthesis.identificacao.parteEmbargada}
Total de pontos: ${synthesis.pontos.length}

HISTÓRICO DO CHAT DESTA SEÇÃO:
${historicoChat}

NOVA INSTRUÇÃO DO USUÁRIO:
${newInstruction}

Devolva APENAS o JSON { "text": "texto integral da seção [${sectionLabel}] refinada" }, sem cabeçalhos no texto, sem markdown.`;
}
