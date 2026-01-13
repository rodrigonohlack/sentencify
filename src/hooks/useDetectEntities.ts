/**
 * @file useDetectEntities.ts
 * @description Hook para detecção automática de nomes usando NER
 * @version v1.37.24
 *
 * Extraído do App.tsx para modularização.
 * Gerencia detecção de entidades (pessoas e organizações) via modelo NER.
 */

import React from 'react';
import AIModelService from '../services/AIModelService';
import type { PastedText, UploadedFile } from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════

// v1.25.23: Separar STOP_WORDS em dois grupos para evitar filtrar "ALMEIDA" (contém "ME")
const STOP_WORDS_CONTAINS = [
  'V . EXA', 'V. EXA', 'VOSSA EXCELÊNCIA', 'V.EXA',
  'RECLAMANTE', 'RECLAMADA', 'RECLAMADO',
  'TRIBUNAL'
];

// Palavras curtas que devem ser palavras inteiras (word boundary)
const STOP_WORDS_EXACT = [
  'EXA', 'MM', 'DR', 'DRA', 'SR', 'SRA', 'EXMO', 'EXMA',
  'CPF', 'CNPJ', 'CEP', 'RG', 'CTPS', 'PIS',
  'S/A', 'S.A', 'ME', 'EPP', 'AUTOR', 'RÉU',
  'JUIZ', 'JUÍZO', 'VARA', 'TST', 'TRT'
];

// v1.25.22: Lista de gentílicos/estados civis que não são nomes de pessoas
const GENTILIC_WORDS = [
  'PARAENSE', 'PAULISTA', 'CARIOCA', 'MINEIRO', 'MINEIRA',
  'GAÚCHO', 'GAÚCHA', 'BAIANO', 'BAIANA', 'CATARINENSE',
  'GOIANO', 'GOIANA', 'CAPIXABA', 'AMAPAENSE', 'AMAZONENSE',
  'ACREANO', 'ACREANA', 'RONDONIENSE', 'RORAIMENSE', 'TOCANTINENSE',
  'MARANHENSE', 'PIAUIENSE', 'CEARENSE', 'POTIGUAR', 'PARAIBANO', 'PARAIBANA',
  'PERNAMBUCANO', 'PERNAMBUCANA', 'ALAGOANO', 'ALAGOANA', 'SERGIPANO', 'SERGIPANA',
  'PARANAENSE', 'MATOGROSSENSE', 'SULMATOGROSSENSE', 'BRASILIENSE',
  'BRASILEIRO', 'BRASILEIRA', 'SOLTEIRO', 'SOLTEIRA', 'CASADO', 'CASADA',
  'DIVORCIADO', 'DIVORCIADA', 'VIÚVO', 'VIÚVA', 'SEPARADO', 'SEPARADA'
];

// v1.29.01: STOP_WORDS para ORG (tribunais, órgãos públicos, termos jurídicos)
const ORG_STOP_WORDS = [
  'JUSTIÇA DO TRABALHO', 'TRIBUNAL REGIONAL', 'TRIBUNAL SUPERIOR',
  'TRT', 'TST', 'STF', 'STJ', 'TRF', 'TRE',
  'MINISTÉRIO PÚBLICO', 'MPT', 'MPF', 'MPE',
  'VARA DO TRABALHO', 'VARA CÍVEL', 'JUÍZO',
  'RECLAMANTE', 'RECLAMADA', 'RECLAMADO', 'AUTOR', 'RÉU', 'RÉUS',
  'CNPJ', 'CEI', 'CPF',
  'UNIÃO FEDERAL', 'MUNICÍPIO DE', 'PREFEITURA DE', 'GOVERNO DO',
  'INSS', 'CEF', 'CAIXA ECONÔMICA FEDERAL', 'BANCO DO BRASIL', 'FGTS',
  'EXCELENTÍSSIMO', 'V. EXA', 'SECRETARIA'
];

const ORG_MIN_SCORE = 0.85;

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

export interface DocumentServicesForNER {
  extractTextFromPDFPure: (file: File | Blob) => Promise<string>;
}

export interface ExtractedTextsForNER {
  peticoes?: Array<{ text?: string | null } | string | null>;
  contestacoes?: Array<{ text?: string | null } | string | null>;
}

export interface UseDetectEntitiesProps {
  nerEnabled: boolean;
  nerIncludeOrg: boolean;
  anonymizationNamesText: string;
  setAnonymizationNamesText: (text: string) => void;
  setDetectingNames: (detecting: boolean) => void;
  pastedPeticaoTexts: PastedText[] | null;
  pastedContestacaoTexts: PastedText[] | null;
  peticaoFiles: UploadedFile[] | null;
  contestacaoFiles: UploadedFile[] | null;
  extractedTexts: ExtractedTextsForNER | null;
  documentServices: DocumentServicesForNER;
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

export interface UseDetectEntitiesReturn {
  detectarNomesAutomaticamente: (overrideText?: string | null, skipSetDetecting?: boolean) => Promise<void>;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

// Função para verificar se é palavra inteira (word boundary)
const containsExactWord = (text: string, word: string): boolean => {
  const regex = new RegExp(`\\b${word}\\b`, 'i');
  return regex.test(text);
};

// Fuzzy similarity para deduplicação
const similarity = (a: string, b: string): number => {
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  if (longer.length === 0) return 1.0;
  if (longer.includes(shorter)) return shorter.length / longer.length;
  const wordsA = a.split(/\s+/);
  const wordsB = b.split(/\s+/);
  const common = wordsA.filter((w: string) => wordsB.some((wb: string) => wb.includes(w) || w.includes(wb)));
  return common.length / Math.max(wordsA.length, wordsB.length);
};

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

export function useDetectEntities({
  nerEnabled,
  nerIncludeOrg,
  anonymizationNamesText,
  setAnonymizationNamesText,
  setDetectingNames,
  pastedPeticaoTexts,
  pastedContestacaoTexts,
  peticaoFiles,
  contestacaoFiles,
  extractedTexts,
  documentServices,
  showToast
}: UseDetectEntitiesProps): UseDetectEntitiesReturn {

  // v1.25: Detectar nomes automaticamente usando NER
  // v1.25.26: Adicionar overrideText para modais de prova
  // v1.28.09: Adicionar skipSetDetecting para feedback visual imediato
  const detectarNomesAutomaticamente = React.useCallback(async (
    overrideText: string | null = null,
    skipSetDetecting = false
  ) => {
    // v1.32.17: Verificar se NER está habilitado (modelo será carregado sob demanda)
    if (!nerEnabled) {
      showToast('Ative o NER em Configurações IA para detectar nomes automaticamente.', 'error');
      return;
    }

    if (!skipSetDetecting) setDetectingNames(true);

    try {
      let textoCompleto: string;

      // v1.25.26: Se overrideText fornecido, usar diretamente (modal de prova)
      if (overrideText && typeof overrideText === 'string' && overrideText.trim().length > 50) {
        textoCompleto = overrideText.slice(0, 3000); // Limitar a 3000 chars
      } else {
        // Coletar APENAS qualificação das partes (~1000 chars por doc)
        // Nomes aparecem nos primeiros ~500-800 chars (cabeçalho)
        const CHARS_PER_PAGE = 1000;
        const textos: string[] = [];
        const textosHash = new Set<string>(); // Para deduplicação

        // Helper: adicionar texto se não for duplicata
        const addTexto = (txt: string | null) => {
          if (!txt || txt.length < 50) return;
          const hash = txt.slice(0, 200); // Usar primeiros 200 chars como hash
          if (!textosHash.has(hash)) {
            textosHash.add(hash);
            textos.push(txt);
          }
        };

        // Helper: extrair texto de string ou objeto (só primeira página)
        const getFirstPage = (t: { text?: string | null } | string | null | undefined): string | null => {
          if (!t) return null;
          const fullText = typeof t === 'string' ? t : (t.text || null);
          if (!fullText) return null;
          return fullText.slice(0, CHARS_PER_PAGE);
        };

        // Helper: extrair primeira página de um PDF
        const extractFirstPageFromPDF = async (fileObj: { file?: File } | File): Promise<string | null> => {
          try {
            const file = (fileObj as { file?: File }).file ?? (fileObj as File);
            if (!file || !(file instanceof Blob)) return null;
            const text = await documentServices.extractTextFromPDFPure(file);
            return text ? text.slice(0, CHARS_PER_PAGE) : null;
          } catch (e) {
            console.warn('[NER] Falha ao extrair PDF:', (e as Error).message);
            return null;
          }
        };

        // 1. Textos COLADOS (já disponíveis, limitados a 3000 chars)
        pastedPeticaoTexts?.forEach(t => addTexto(getFirstPage(t)));
        pastedContestacaoTexts?.forEach(t => addTexto(getFirstPage(t)));

        // 2. PDFs - extrair primeira página de cada (PRIORIDADE: funciona antes da análise!)
        for (const fileObj of (peticaoFiles || [])) {
          const txt = await extractFirstPageFromPDF(fileObj);
          addTexto(txt);
        }
        for (const fileObj of (contestacaoFiles || [])) {
          const txt = await extractFirstPageFromPDF(fileObj);
          addTexto(txt);
        }

        // 3. Se extractedTexts JÁ tiver dados, usar também (fallback)
        extractedTexts?.peticoes?.forEach(p => addTexto(getFirstPage(p)));
        extractedTexts?.contestacoes?.forEach(c => addTexto(getFirstPage(c)));

        textoCompleto = textos.join('\n\n');

        if (!textoCompleto.trim()) {
          showToast('Nenhum documento carregado para análise.', 'error');
          setDetectingNames(false);
          return;
        }
      }

      // Executar NER
      const entidades = await AIModelService.extractEntities(textoCompleto);

      // v1.29: Filtrar pessoas (PER/PESSOA) e opcionalmente ORG
      const isPessoa = (e: { type: string }) => e.type.includes('PER') || e.type.includes('PESSOA');
      const isOrg = (e: { type: string }) => e.type.includes('ORG');

      const entidadesFiltradas = entidades.filter(e => {
        if (isPessoa(e)) return true;
        if (nerIncludeOrg && isOrg(e)) {
          if (e.score < ORG_MIN_SCORE) return false;
          const upper = e.text.toUpperCase();
          if (ORG_STOP_WORDS.some(sw => upper.includes(sw))) return false;
          return true;
        }
        return false;
      });

      // v1.33.14: Fallback regex para ORG não detectadas pelo modelo
      if (nerIncludeOrg) {
        const ORG_REGEX = /\b([A-Z0-9]+(?:\s+[A-Z0-9]+){0,3})\s+(LTDA|EIRELI|S\.?A\.?|ME|EPP)\b/gi;
        const ORG_PREFIX_STOP = ['O', 'A', 'OS', 'AS', 'DE', 'DO', 'DA', 'EM', 'FACE', 'CONTRA', 'RECLAMADA', 'RECLAMANTE'];
        const textoUpper = textoCompleto.toUpperCase();
        let match;
        while ((match = ORG_REGEX.exec(textoUpper)) !== null) {
          let fullOrg = match[0].trim().replace(/\s+/g, ' ');
          let words = fullOrg.split(' ');
          while (words.length > 2 && ORG_PREFIX_STOP.includes(words[0])) {
            words.shift();
          }
          fullOrg = words.join(' ');
          const alreadyDetected = entidadesFiltradas.some(e =>
            e.text.toUpperCase().includes(fullOrg) || fullOrg.includes(e.text.toUpperCase())
          );
          if (!alreadyDetected && !ORG_STOP_WORDS.some(sw => fullOrg.includes(sw))) {
            console.log(`[NER] Fallback ORG: "${fullOrg}"`);
            entidadesFiltradas.push({ text: fullOrg, type: 'ORG', score: 0.9, start: 0, end: fullOrg.length });
          }
        }
      }

      // v1.29.02: Manter tipo junto com texto para fuzzy dedup separado
      const nomesComTipo = entidadesFiltradas.map(e => ({
        text: e.text.toUpperCase(),
        isOrg: isOrg(e)
      }));

      // v1.25.23: Filtro com STOP_WORDS separados (contains vs exact)
      const seen = new Map<string, { text: string; isOrg: boolean }>();
      nomesComTipo.forEach(item => {
        if (!seen.has(item.text)) seen.set(item.text, item);
      });
      const nomesFiltrados = [...seen.values()].filter(item =>
        item.text.length >= 4 &&
        !STOP_WORDS_CONTAINS.some(sw => item.text.includes(sw)) &&
        !STOP_WORDS_EXACT.some(sw => containsExactWord(item.text, sw)) &&
        !GENTILIC_WORDS.includes(item.text.trim())
      );

      // v1.29.02: Fuzzy dedup separado por tipo (PER vs ORG)
      const nomesUnicos: { text: string; isOrg: boolean }[] = [];
      for (const item of nomesFiltrados) {
        const similarIdx = nomesUnicos.findIndex(n => {
          if (n.isOrg !== item.isOrg) return false;
          const threshold = item.isOrg ? 0.85 : 0.7;
          return similarity(n.text, item.text) > threshold;
        });
        if (similarIdx >= 0) {
          if (item.text.length > nomesUnicos[similarIdx].text.length) {
            console.log(`[NER] Fuzzy merge: "${nomesUnicos[similarIdx].text}" → "${item.text}"`);
            nomesUnicos[similarIdx] = item;
          }
        } else {
          nomesUnicos.push(item);
        }
      }
      console.log('[NER] Nomes após fuzzy dedup:', nomesUnicos.map(n => n.text));

      // v1.25.24: Limpar gentílicos do final dos nomes
      const nomesLimpos = nomesUnicos.map(item => {
        let limpo = item.text;
        for (const gentilic of GENTILIC_WORDS) {
          if (limpo.endsWith(' ' + gentilic)) {
            limpo = limpo.slice(0, -(gentilic.length + 1)).trim();
          }
        }
        return limpo;
      });

      if (nomesLimpos.length === 0) {
        showToast('Nenhum nome detectado nos documentos.', 'info');
        return;
      }

      // Merge com nomes existentes
      const nomesAtuais = anonymizationNamesText.split(/[\n,]/).map(n => n.trim().toUpperCase()).filter(n => n);
      const todoNomes = [...new Set([...nomesAtuais, ...nomesLimpos])];

      // Atualizar textarea
      setAnonymizationNamesText(todoNomes.join('\n'));

      showToast(`Detectados ${nomesLimpos.length} nome(s). Total: ${todoNomes.length}`, 'success');

    } catch (err) {
      console.error('Erro na detecção de nomes:', err);
      showToast('Erro ao detectar nomes: ' + (err as Error).message, 'error');
    } finally {
      setDetectingNames(false);
    }
  }, [
    nerEnabled,
    nerIncludeOrg,
    anonymizationNamesText,
    setAnonymizationNamesText,
    setDetectingNames,
    pastedPeticaoTexts,
    pastedContestacaoTexts,
    peticaoFiles,
    contestacaoFiles,
    extractedTexts,
    documentServices,
    showToast
  ]);

  return {
    detectarNomesAutomaticamente
  };
}
