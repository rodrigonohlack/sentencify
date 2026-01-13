/**
 * @file text.ts
 * @description Utilitários de manipulação de texto
 * @version 1.36.81
 *
 * Extraído do App.tsx
 * Inclui: anonymizeText, normalizeHTMLSpacing, removeMetaComments, topic helpers
 */

import type { Topic, AnonymizationSettings } from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// ANONIMIZAÇÃO DE TEXTO (v1.17.0)
// ═══════════════════════════════════════════════════════════════════════════════

export const anonymizeText = (text: string, config: AnonymizationSettings | null | undefined, nomesUsuario: string[] = []): string => {
  if (!text || !config?.enabled) return text;

  // Normalizar: juntar dígitos separados por quebras de linha (PDF.js às vezes quebra números)
  let result = text.replace(/(\d)\s+(\d)/g, '$1$2');
  const encontrados: Record<string, string[]> = { cnpj: [], cpf: [], rg: [], pis: [], ctps: [], cep: [], processo: [], oab: [], telefone: [], email: [], conta: [], valor: [], pessoa: [] };

  // CNPJ: 00.000.000/0000-00
  if (config.cnpj !== false) {
    result = result.replace(/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/g, (m: string) => { encontrados.cnpj.push(m); return '[CNPJ]'; });
  }

  // CPF: 000.000.000-00 (após CNPJ para evitar conflito)
  if (config.cpf !== false) {
    result = result.replace(/\d{3}\.?\d{3}\.?\d{3}-?\d{2}/g, (m: string) => { encontrados.cpf.push(m); return '[CPF]'; });
  }

  // RG: 00.000.000-0 ou similar
  if (config.rg !== false) {
    result = result.replace(/\d{1,2}\.?\d{3}\.?\d{3}-?[\dXx]/g, (m: string) => { encontrados.rg.push(m); return '[RG]'; });
  }

  // PIS/PASEP: 000.00000.00-0
  if (config.pis !== false) {
    result = result.replace(/\d{3}\.?\d{5}\.?\d{2}-?\d/g, (m: string) => { encontrados.pis.push(m); return '[PIS]'; });
  }

  // CTPS: 0000000/00000 ou similar
  if (config.ctps !== false) {
    result = result.replace(/\d{5,7}[/-]\d{3,5}/g, (m: string) => { encontrados.ctps.push(m); return '[CTPS]'; });
  }

  // CEP: 00.000-000 ou 00000-000
  if (config.cep !== false) {
    result = result.replace(/\d{2}\.?\d{3}-?\d{3}/g, (m: string) => { encontrados.cep.push(m); return '[CEP]'; });
  }

  // Número de processo CNJ: 0000000-00.0000.0.00.0000 (com espaços antes/depois de separadores)
  if (config.processo !== false) {
    result = result.replace(/\d{7}\s*-\s*\d{2}\s*\.\s*\d{4}\s*\.\s*\d\s*\.\s*\d{2}\s*\.\s*\d{4}/g, (m: string) => { encontrados.processo.push(m); return '[PROCESSO]'; });
  }

  // OAB: OAB/XX 0000
  if (config.oab !== false) {
    result = result.replace(/OAB\/?\s*[A-Z]{2}\s*\d+/gi, (m: string) => { encontrados.oab.push(m); return '[OAB]'; });
  }

  // Telefone: (00) 00000-0000 ou variações
  if (config.telefone !== false) {
    result = result.replace(/\(?\d{2}\)?\s*\d{4,5}-?\d{4}/g, (m: string) => { encontrados.telefone.push(m); return '[TELEFONE]'; });
  }

  // E-mail
  if (config.email !== false) {
    result = result.replace(/[\w.-]+@[\w.-]+\.\w{2,}/gi, (m: string) => { encontrados.email.push(m); return '[EMAIL]'; });
  }

  // Conta bancária: Ag. 0000 C/C 00000-0 ou variações
  if (config.contaBancaria !== false) {
    result = result.replace(/[Aa]g[êe]?n?c?i?a?\.?\s*:?\s*\d[\d.-]*\s*[Cc]\.?\/?\s*[Cc]\.?\s*:?\s*\d[\d.-]*/g, (m: string) => { encontrados.conta.push(m); return '[CONTA]'; });
  }

  // Valores monetários R$
  if (config.valores === true) {
    result = result.replace(/R\$\s*[\d.,]+/g, (m: string) => { encontrados.valor.push(m); return '[VALOR]'; });
  }

  // Nomes inseridos pelo usuário (v1.17.0)
  if (nomesUsuario && nomesUsuario.length > 0) {
    // Helper: escapar caracteres especiais de regex
    const escapeRegex = (str: string): string => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Normalizar texto (remover acentos para comparação)
    const normalize = (str: string): string => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // Criar regex flexível para uma palavra
    const buildFlexRegex = (palavra: string): string => {
      let escaped = escapeRegex(palavra);
      // Permitir espaço opcional antes de caracteres acentuados (PDF.js bug)
      escaped = escaped.replace(/([ÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ])/gi, '\\s*$1');
      // Permitir espaço opcional após pontos (W.P → W. P)
      escaped = escaped.replace(/\\\./g, '\\.\\s*');
      return escaped;
    };

    nomesUsuario.forEach((nome, index) => {
      if (!nome || nome.trim().length < 2) return;
      // Remover anotações entre parênteses: "EMPRESA LTDA (1ª reclamada)" → "EMPRESA LTDA"
      let nomeClean = nome.trim().replace(/\s*\([^)]*\)\s*$/, '').trim();
      if (nomeClean.length < 2) return;
      // Limitar tamanho do nome para evitar ReDoS
      if (nomeClean.length > 200) nomeClean = nomeClean.substring(0, 200);

      const placeholder = `[PESSOA ${index + 1}]`;
      let matchCount = 0;

      // TENTATIVA 1: Busca normal (com espaços flexíveis)
      // Limitar a 10 palavras para evitar regex muito complexa
      const palavras = nomeClean.split(/\s+/).slice(0, 10).map(buildFlexRegex);
      let regexStr = palavras.join('\\s+');
      regexStr = regexStr.replace(/\\s\+&\\s\+/g, '\\s*[&＆]\\s*');
      const nomeRegex = new RegExp(regexStr, 'gi');

      matchCount = (result.match(nomeRegex) || []).length;
      if (matchCount > 0) {
        result = result.replace(nomeRegex, (match: string) => {
          encontrados.pessoa.push(match);
          return placeholder;
        });
      }

      // TENTATIVA 2: Busca normalizada (sem acentos) se não encontrou
      if (matchCount === 0) {
        const nomeNorm = normalize(nomeClean);
        // Limitar a 10 palavras também na busca normalizada
        const palavrasNorm = nomeNorm.split(/\s+/).slice(0, 10).map(buildFlexRegex);
        let regexStrNorm = palavrasNorm.join('\\s+');
        regexStrNorm = regexStrNorm.replace(/\\s\+&\\s\+/g, '\\s*[&＆]\\s*');
        const regexNorm = new RegExp(regexStrNorm, 'gi');
        const resultNorm = normalize(result);

        // Encontrar posições no texto normalizado (limitar a 100 matches para evitar loops)
        const matches: Array<{ start: number; len: number; original: string }> = [];
        let match: RegExpExecArray | null;
        let matchLimit = 100;
        while ((match = regexNorm.exec(resultNorm)) !== null && matchLimit-- > 0) {
          matches.push({ start: match.index, len: match[0].length, original: result.substring(match.index, match.index + match[0].length) });
        }

        if (matches.length > 0) {
          // Substituir de trás para frente (para manter índices)
          for (let i = matches.length - 1; i >= 0; i--) {
            const m = matches[i];
            encontrados.pessoa.push(m.original);
            result = result.substring(0, m.start) + placeholder + result.substring(m.start + m.len);
          }
          matchCount = matches.length;
        }
      }
    });
  }

  return result;
};

// ═══════════════════════════════════════════════════════════════════════════════
// NORMALIZAÇÃO HTML
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Remove espaçamento extra entre tags HTML
 */
export const normalizeHTMLSpacing = (html: string | null | undefined): string => {
  if (!html) return html ?? '';
  return html
    .replace(/>\s*\n\s*\n+\s*</g, '><')
    .replace(/>\s*\n\s*</g, '><')
    .trim();
};

/**
 * Remove meta-comentários de revisão que a IA pode adicionar ao final do texto
 */
export const removeMetaComments = (text: string | null | undefined): string => {
  if (!text) return text ?? '';

  // Padrões de meta-comentários que a IA pode adicionar
  const patterns = [
    /\n*\**\s*Revis(ão|ei)[^<]*$/i,
    /\n*\**\s*Identifica(ção|do)[^<]*alucinaç[^<]*$/i,
    /\n*\**\s*Confirmo que não houve[^<]*$/i,
    /\n*\**\s*Não houve alucinação[^<]*$/i,
    /\n*\**\s*REVISÃO[:\s][^<]*$/i,
    /\n*\*{3,}[^<]*$/,  // *** linha final
  ];

  let cleaned = text;
  let removed = false;
  for (const pattern of patterns) {
    if (pattern.test(cleaned)) {
      cleaned = cleaned.replace(pattern, '');
      removed = true;
    }
  }

  // Log quando fallback é ativado (meta-comentário detectado e removido)
  if (removed) {
    console.warn('[Mini-Relatório] Meta-comentário de revisão removido automaticamente');
  }

  return cleaned.trim();
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS DE TÓPICOS ESPECIAIS
// ═══════════════════════════════════════════════════════════════════════════════

export const SPECIAL_TOPICS = ['RELATÓRIO', 'DISPOSITIVO'];

export const isSpecialTopic = (topic: Topic | null | undefined): boolean => {
  return Boolean(topic && SPECIAL_TOPICS.includes(topic.title?.toUpperCase()));
};

export const isRelatorio = (topic: Topic | null | undefined): boolean => {
  return topic?.title?.toUpperCase() === 'RELATÓRIO';
};

export const isDispositivo = (topic: Topic | null | undefined): boolean => {
  return topic?.title?.toUpperCase() === 'DISPOSITIVO';
};

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITÁRIOS DE MODELOS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Gera um ID único para um modelo
 */
export const generateModelId = (): string => {
  // Tentar usar crypto.randomUUID() (disponível em contextos seguros HTTPS)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `model:${crypto.randomUUID()}`;
  }

  // Fallback: Date.now() + random string
  // Random string: base36 (0-9, a-z), 9 caracteres
  const randomStr = Math.random().toString(36).substr(2, 9);
  return `model:${Date.now()}_${randomStr}`;
};

/**
 * Converte texto puro em HTML preservando quebras de linha
 * @param text - Texto puro a ser convertido
 * @returns HTML com quebras de linha convertidas para <br>
 */
export const plainTextToHtml = (text: string): string => {
  if (!text) return '';

  // Converter texto puro em HTML, preservando quebras de linha
  let html = text;

  // Escapar caracteres HTML especiais
  html = html.replace(/&/g, '&amp;');
  html = html.replace(/</g, '&lt;');
  html = html.replace(/>/g, '&gt;');

  // Converter quebras de linha em <br>
  html = html.replace(/\n/g, '<br>');

  return html;
};
