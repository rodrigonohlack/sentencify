/**
 * @file useDoubleCheckMultimodal.test.ts
 * @description Testes para Double Check multimodal (v1.37.68)
 * Testa:
 * - Filtragem de PDFs para Grok (não suporta PDF binário)
 * - Manutenção de PDFs para Claude/Gemini/OpenAI
 * - Extração de texto do contexto para template do prompt
 * - Criação de conteúdo final com prompt + PDFs
 * @version 1.37.68
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AIMessageContent, AITextContent, AIDocumentContent } from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// UTILITIES EXTRACTED FOR TESTING
// Estas funções são extraídas da lógica do useAIIntegration para testes isolados
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Filtra PDFs para providers que não suportam (Grok)
 * Replica a lógica de callDoubleCheckAPI
 */
function filterPdfForProvider(
  content: AIMessageContent[],
  provider: 'claude' | 'gemini' | 'openai' | 'grok'
): AIMessageContent[] {
  const hasPdfBinary = content.some(c =>
    typeof c === 'object' && c !== null && 'type' in c && c.type === 'document'
  );
  const providerSupportsPdf = provider !== 'grok';

  if (hasPdfBinary && !providerSupportsPdf) {
    return content.filter(c =>
      !(typeof c === 'object' && c !== null && 'type' in c && c.type === 'document')
    );
  }
  return content;
}

/**
 * Extrai texto do contexto para o template do prompt
 * Replica a lógica de performDoubleCheck
 */
function extractTextFromContext(context: AIMessageContent[]): string {
  return context
    .filter((c): c is AITextContent =>
      typeof c === 'object' && c !== null && 'type' in c && c.type === 'text'
    )
    .map(c => c.text)
    .join('\n\n');
}

/**
 * Extrai PDFs binários do contexto
 * Replica a lógica de performDoubleCheck
 */
function extractPdfsFromContext(context: AIMessageContent[]): AIMessageContent[] {
  return context.filter(c =>
    typeof c === 'object' && c !== null && 'type' in c && c.type === 'document'
  );
}

/**
 * Cria conteúdo final para Double Check (prompt + PDFs)
 * Replica a lógica de performDoubleCheck
 */
function createFinalContent(
  verificationPrompt: string,
  context: AIMessageContent[]
): AIMessageContent[] {
  const pdfContent = extractPdfsFromContext(context);
  return [
    { type: 'text' as const, text: verificationPrompt },
    ...pdfContent
  ];
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST DATA
// ═══════════════════════════════════════════════════════════════════════════

const createTextContent = (text: string): AITextContent => ({
  type: 'text',
  text
});

const createPdfContent = (name: string, data: string = 'base64data'): AIDocumentContent => ({
  type: 'document',
  source: {
    type: 'base64',
    media_type: 'application/pdf',
    data
  },
  // cache_control is optional
});

// ═══════════════════════════════════════════════════════════════════════════
// TESTS: PDF FILTERING FOR PROVIDERS
// ═══════════════════════════════════════════════════════════════════════════

describe('Double Check Multimodal - PDF Filtering', () => {
  describe('filterPdfForProvider', () => {
    it('should keep PDFs for Claude provider', () => {
      const content: AIMessageContent[] = [
        createTextContent('Análise do documento'),
        createPdfContent('prova.pdf')
      ];

      const result = filterPdfForProvider(content, 'claude');

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ type: 'text' });
      expect(result[1]).toMatchObject({ type: 'document' });
    });

    it('should keep PDFs for Gemini provider', () => {
      const content: AIMessageContent[] = [
        createTextContent('Análise do documento'),
        createPdfContent('prova.pdf')
      ];

      const result = filterPdfForProvider(content, 'gemini');

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ type: 'text' });
      expect(result[1]).toMatchObject({ type: 'document' });
    });

    it('should keep PDFs for OpenAI provider', () => {
      const content: AIMessageContent[] = [
        createTextContent('Análise do documento'),
        createPdfContent('prova.pdf')
      ];

      const result = filterPdfForProvider(content, 'openai');

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ type: 'text' });
      expect(result[1]).toMatchObject({ type: 'document' });
    });

    it('should filter out PDFs for Grok provider', () => {
      const content: AIMessageContent[] = [
        createTextContent('Análise do documento'),
        createPdfContent('prova.pdf')
      ];

      const result = filterPdfForProvider(content, 'grok');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ type: 'text', text: 'Análise do documento' });
    });

    it('should filter multiple PDFs for Grok', () => {
      const content: AIMessageContent[] = [
        createTextContent('Texto 1'),
        createPdfContent('prova1.pdf'),
        createTextContent('Texto 2'),
        createPdfContent('prova2.pdf'),
        createPdfContent('prova3.pdf')
      ];

      const result = filterPdfForProvider(content, 'grok');

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ type: 'text', text: 'Texto 1' });
      expect(result[1]).toMatchObject({ type: 'text', text: 'Texto 2' });
    });

    it('should not filter when no PDFs present (Grok)', () => {
      const content: AIMessageContent[] = [
        createTextContent('Texto 1'),
        createTextContent('Texto 2')
      ];

      const result = filterPdfForProvider(content, 'grok');

      expect(result).toHaveLength(2);
    });

    it('should not filter when no PDFs present (Claude)', () => {
      const content: AIMessageContent[] = [
        createTextContent('Texto 1'),
        createTextContent('Texto 2')
      ];

      const result = filterPdfForProvider(content, 'claude');

      expect(result).toHaveLength(2);
    });

    it('should handle empty content array', () => {
      const content: AIMessageContent[] = [];

      const result = filterPdfForProvider(content, 'grok');

      expect(result).toHaveLength(0);
    });

    it('should handle content with only PDFs for Grok (returns empty)', () => {
      const content: AIMessageContent[] = [
        createPdfContent('prova1.pdf'),
        createPdfContent('prova2.pdf')
      ];

      const result = filterPdfForProvider(content, 'grok');

      expect(result).toHaveLength(0);
    });

    it('should handle content with only PDFs for Claude (keeps all)', () => {
      const content: AIMessageContent[] = [
        createPdfContent('prova1.pdf'),
        createPdfContent('prova2.pdf')
      ];

      const result = filterPdfForProvider(content, 'claude');

      expect(result).toHaveLength(2);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TESTS: TEXT EXTRACTION FROM CONTEXT
// ═══════════════════════════════════════════════════════════════════════════

describe('Double Check Multimodal - Text Extraction', () => {
  describe('extractTextFromContext', () => {
    it('should extract text from single text content', () => {
      const context: AIMessageContent[] = [
        createTextContent('Conteúdo do documento')
      ];

      const result = extractTextFromContext(context);

      expect(result).toBe('Conteúdo do documento');
    });

    it('should join multiple texts with double newline', () => {
      const context: AIMessageContent[] = [
        createTextContent('Petição inicial'),
        createTextContent('Contestação')
      ];

      const result = extractTextFromContext(context);

      expect(result).toBe('Petição inicial\n\nContestação');
    });

    it('should ignore PDFs in context', () => {
      const context: AIMessageContent[] = [
        createTextContent('Texto antes'),
        createPdfContent('prova.pdf'),
        createTextContent('Texto depois')
      ];

      const result = extractTextFromContext(context);

      expect(result).toBe('Texto antes\n\nTexto depois');
    });

    it('should return empty string when no text content', () => {
      const context: AIMessageContent[] = [
        createPdfContent('prova.pdf')
      ];

      const result = extractTextFromContext(context);

      expect(result).toBe('');
    });

    it('should handle empty context', () => {
      const context: AIMessageContent[] = [];

      const result = extractTextFromContext(context);

      expect(result).toBe('');
    });

    it('should preserve text with special characters (acentos)', () => {
      const context: AIMessageContent[] = [
        createTextContent('Petição com acentuação: ação, decisão, réu'),
        createTextContent('Contestação: não, também, através')
      ];

      const result = extractTextFromContext(context);

      expect(result).toContain('ação');
      expect(result).toContain('decisão');
      expect(result).toContain('réu');
      expect(result).toContain('não');
      expect(result).toContain('também');
    });

    it('should handle large text content', () => {
      const largeText = 'A'.repeat(10000);
      const context: AIMessageContent[] = [
        createTextContent(largeText),
        createTextContent('Texto adicional')
      ];

      const result = extractTextFromContext(context);

      expect(result).toContain(largeText);
      expect(result).toContain('Texto adicional');
      expect(result.length).toBeGreaterThan(10000);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TESTS: PDF EXTRACTION FROM CONTEXT
// ═══════════════════════════════════════════════════════════════════════════

describe('Double Check Multimodal - PDF Extraction', () => {
  describe('extractPdfsFromContext', () => {
    it('should extract single PDF', () => {
      const context: AIMessageContent[] = [
        createTextContent('Texto'),
        createPdfContent('prova.pdf', 'data1')
      ];

      const result = extractPdfsFromContext(context);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ type: 'document' });
    });

    it('should extract multiple PDFs', () => {
      const context: AIMessageContent[] = [
        createPdfContent('prova1.pdf', 'data1'),
        createTextContent('Texto'),
        createPdfContent('prova2.pdf', 'data2')
      ];

      const result = extractPdfsFromContext(context);

      expect(result).toHaveLength(2);
    });

    it('should return empty array when no PDFs', () => {
      const context: AIMessageContent[] = [
        createTextContent('Texto 1'),
        createTextContent('Texto 2')
      ];

      const result = extractPdfsFromContext(context);

      expect(result).toHaveLength(0);
    });

    it('should handle empty context', () => {
      const context: AIMessageContent[] = [];

      const result = extractPdfsFromContext(context);

      expect(result).toHaveLength(0);
    });

    it('should preserve PDF data', () => {
      const pdfData = 'JVBERi0xLjcKCjEgMCBvYmo...'; // base64 PDF header
      const context: AIMessageContent[] = [
        createPdfContent('prova.pdf', pdfData)
      ];

      const result = extractPdfsFromContext(context);
      const pdf = result[0] as AIDocumentContent;

      expect(pdf.source.data).toBe(pdfData);
      expect(pdf.source.media_type).toBe('application/pdf');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TESTS: FINAL CONTENT CREATION
// ═══════════════════════════════════════════════════════════════════════════

describe('Double Check Multimodal - Final Content Creation', () => {
  describe('createFinalContent', () => {
    it('should create content with prompt + PDFs', () => {
      const verificationPrompt = 'Verifique a análise a seguir...';
      const context: AIMessageContent[] = [
        createTextContent('Texto original'),
        createPdfContent('prova.pdf')
      ];

      const result = createFinalContent(verificationPrompt, context);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ type: 'text', text: verificationPrompt });
      expect(result[1]).toMatchObject({ type: 'document' });
    });

    it('should create content with only prompt when no PDFs', () => {
      const verificationPrompt = 'Verifique a análise...';
      const context: AIMessageContent[] = [
        createTextContent('Texto original')
      ];

      const result = createFinalContent(verificationPrompt, context);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ type: 'text', text: verificationPrompt });
    });

    it('should include multiple PDFs', () => {
      const verificationPrompt = 'Verifique...';
      const context: AIMessageContent[] = [
        createTextContent('Texto'),
        createPdfContent('prova1.pdf'),
        createPdfContent('prova2.pdf'),
        createPdfContent('prova3.pdf')
      ];

      const result = createFinalContent(verificationPrompt, context);

      expect(result).toHaveLength(4);
      expect(result[0]).toMatchObject({ type: 'text' });
      expect(result[1]).toMatchObject({ type: 'document' });
      expect(result[2]).toMatchObject({ type: 'document' });
      expect(result[3]).toMatchObject({ type: 'document' });
    });

    it('should put prompt text first, PDFs after', () => {
      const verificationPrompt = 'Prompt primeiro';
      const context: AIMessageContent[] = [
        createPdfContent('pdf1.pdf'),
        createTextContent('Texto original'),
        createPdfContent('pdf2.pdf')
      ];

      const result = createFinalContent(verificationPrompt, context);

      // Ordem: prompt (novo texto), pdf1, pdf2
      expect(result[0]).toMatchObject({ type: 'text', text: 'Prompt primeiro' });
      expect(result[1]).toMatchObject({ type: 'document' });
      expect(result[2]).toMatchObject({ type: 'document' });
    });

    it('should handle empty context', () => {
      const verificationPrompt = 'Verifique...';
      const context: AIMessageContent[] = [];

      const result = createFinalContent(verificationPrompt, context);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ type: 'text', text: 'Verifique...' });
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TESTS: INTEGRATION SCENARIOS
// ═══════════════════════════════════════════════════════════════════════════

describe('Double Check Multimodal - Integration Scenarios', () => {
  describe('topicExtraction with PDF documents', () => {
    it('should handle contentArray from useDocumentAnalysis', () => {
      // Simula contentArray como construído em useDocumentAnalysis
      const contentArray: AIMessageContent[] = [
        createTextContent('PETIÇÃO 1:\nReclamante alega horas extras não pagas...'),
        createTextContent('CONTESTAÇÃO 1:\nReclamada contesta alegações...'),
        createPdfContent('peticao.pdf', 'petdata'),
        createTextContent('Prompt de análise com instruções...')
      ];

      // Extrai texto para template
      const textContext = extractTextFromContext(contentArray);
      expect(textContext).toContain('Reclamante alega');
      expect(textContext).toContain('Reclamada contesta');
      expect(textContext).toContain('Prompt de análise');

      // PDFs mantidos
      const pdfs = extractPdfsFromContext(contentArray);
      expect(pdfs).toHaveLength(1);

      // Para Claude: mantém PDFs
      const claudeContent = filterPdfForProvider(contentArray, 'claude');
      expect(claudeContent).toHaveLength(4);

      // Para Grok: remove PDFs
      const grokContent = filterPdfForProvider(contentArray, 'grok');
      expect(grokContent).toHaveLength(3);
    });
  });

  describe('proofAnalysis with PDF pure mode', () => {
    it('should handle PDF-only contentArray (proof mode pdf-puro)', () => {
      // Simula contentArray do useProofAnalysis em modo PDF puro
      const contentArray: AIMessageContent[] = [
        createPdfContent('prova_pericial.pdf', 'laudodata'),
        createTextContent('Analise esta prova documental...')
      ];

      // Extrai texto (só tem o prompt)
      const textContext = extractTextFromContext(contentArray);
      expect(textContext).toBe('Analise esta prova documental...');

      // PDFs mantidos para Double Check
      const pdfs = extractPdfsFromContext(contentArray);
      expect(pdfs).toHaveLength(1);

      // Conteúdo final para Claude inclui PDF
      const finalContent = createFinalContent('Verificação...', contentArray);
      expect(finalContent).toHaveLength(2);

      // Para Grok: PDF filtrado (limitação conhecida)
      const grokFiltered = filterPdfForProvider(finalContent, 'grok');
      expect(grokFiltered).toHaveLength(1); // Só o texto
    });
  });

  describe('factsComparison with document fallback', () => {
    it('should handle messageContent with PDF fallback', () => {
      // Simula quando texto não foi extraído e PDF é fallback
      const messageContent: AIMessageContent[] = [
        createTextContent('Compare as alegações do autor e réu...'),
        createPdfContent('peticao_sem_texto.pdf'),
        createPdfContent('contestacao_sem_texto.pdf')
      ];

      // Extrai texto (só o prompt)
      const textContext = extractTextFromContext(messageContent);
      expect(textContext).toBe('Compare as alegações do autor e réu...');

      // PDFs mantidos
      const pdfs = extractPdfsFromContext(messageContent);
      expect(pdfs).toHaveLength(2);

      // Claude recebe tudo
      const claudeContent = filterPdfForProvider(messageContent, 'claude');
      expect(claudeContent).toHaveLength(3);

      // Grok recebe só texto (warning é logado em produção)
      const grokContent = filterPdfForProvider(messageContent, 'grok');
      expect(grokContent).toHaveLength(1);
    });
  });

  describe('dispositivo with complete context', () => {
    it('should handle text-only context (promptText)', () => {
      // useDispositivoGeneration passa promptText como array com texto
      const context: AIMessageContent[] = [
        { type: 'text' as const, text: `
          REDATOR ESPECIALIZADO EM SENTENÇAS TRABALHISTAS...
          AUTOR: João da Silva
          RÉU: Empresa ABC Ltda
          TÓPICOS:
          1. HORAS EXTRAS - PROCEDENTE
          2. DANO MORAL - IMPROCEDENTE
          REGRA FUNDAMENTAL DO DISPOSITIVO...
          ESTILO DE REDAÇÃO...
        ` }
      ];

      // Não há PDFs
      const pdfs = extractPdfsFromContext(context);
      expect(pdfs).toHaveLength(0);

      // Todo o contexto é texto
      const textContext = extractTextFromContext(context);
      expect(textContext).toContain('REDATOR ESPECIALIZADO');
      expect(textContext).toContain('HORAS EXTRAS');
      expect(textContext).toContain('PROCEDENTE');

      // Mesmo para Grok não filtra nada (não há PDF)
      const grokContent = filterPdfForProvider(context, 'grok');
      expect(grokContent).toHaveLength(1);
    });
  });

  describe('quickPrompt in chat', () => {
    it('should handle mixed context from chat', () => {
      // useDecisionTextGeneration pode ter contexto variado
      const contextArray: AIMessageContent[] = [
        createTextContent('Contexto da decisão...'),
        createTextContent('Histórico do chat...'),
        createPdfContent('documento_anexo.pdf')
      ];

      // Extrai texto
      const textContext = extractTextFromContext(contextArray);
      expect(textContext).toContain('Contexto da decisão');
      expect(textContext).toContain('Histórico do chat');

      // PDFs mantidos
      const pdfs = extractPdfsFromContext(contextArray);
      expect(pdfs).toHaveLength(1);

      // Final content com novo prompt
      const verificationPrompt = 'Verifique a resposta do assistente...';
      const finalContent = createFinalContent(verificationPrompt, contextArray);

      expect(finalContent[0]).toMatchObject({ type: 'text', text: verificationPrompt });
      expect(finalContent[1]).toMatchObject({ type: 'document' });
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TESTS: EDGE CASES AND ERROR HANDLING
// ═══════════════════════════════════════════════════════════════════════════

describe('Double Check Multimodal - Edge Cases', () => {
  it('should handle null/undefined values in content array gracefully', () => {
    // TypeScript deveria prevenir isso, mas testar comportamento
    const content = [
      createTextContent('Valid text'),
      null as unknown as AIMessageContent,
      createPdfContent('valid.pdf')
    ];

    // Filtro por type deveria ignorar null
    const filtered = content.filter(c =>
      typeof c === 'object' && c !== null && 'type' in c
    );

    expect(filtered).toHaveLength(2);
  });

  it('should handle text content with empty string', () => {
    const context: AIMessageContent[] = [
      createTextContent(''),
      createTextContent('Real content'),
      createTextContent('')
    ];

    const result = extractTextFromContext(context);

    expect(result).toBe('\n\nReal content\n\n');
  });

  it('should handle very long base64 PDF data', () => {
    const longData = 'A'.repeat(1_000_000); // ~1MB base64
    const content: AIMessageContent[] = [
      createPdfContent('large.pdf', longData)
    ];

    const pdfs = extractPdfsFromContext(content);
    expect(pdfs).toHaveLength(1);
    expect((pdfs[0] as AIDocumentContent).source.data).toHaveLength(1_000_000);
  });

  it('should maintain order of multiple text contents', () => {
    const context: AIMessageContent[] = [
      createTextContent('Primeiro'),
      createTextContent('Segundo'),
      createTextContent('Terceiro')
    ];

    const result = extractTextFromContext(context);

    expect(result).toBe('Primeiro\n\nSegundo\n\nTerceiro');
    expect(result.indexOf('Primeiro')).toBeLessThan(result.indexOf('Segundo'));
    expect(result.indexOf('Segundo')).toBeLessThan(result.indexOf('Terceiro'));
  });

  it('should maintain order of PDFs in final content', () => {
    const context: AIMessageContent[] = [
      createPdfContent('primeiro.pdf', 'data1'),
      createTextContent('Texto'),
      createPdfContent('segundo.pdf', 'data2')
    ];

    const result = createFinalContent('Prompt', context);

    // Ordem: Prompt, primeiro.pdf, segundo.pdf
    expect((result[1] as AIDocumentContent).source.data).toBe('data1');
    expect((result[2] as AIDocumentContent).source.data).toBe('data2');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TESTS: TYPE GUARDS
// ═══════════════════════════════════════════════════════════════════════════

describe('Double Check Multimodal - Type Guards', () => {
  it('should correctly identify text content', () => {
    const textContent = createTextContent('Test');
    const pdfContent = createPdfContent('test.pdf');

    const isText = (c: AIMessageContent): c is AITextContent =>
      typeof c === 'object' && c !== null && 'type' in c && c.type === 'text';

    expect(isText(textContent)).toBe(true);
    expect(isText(pdfContent)).toBe(false);
  });

  it('should correctly identify document content', () => {
    const textContent = createTextContent('Test');
    const pdfContent = createPdfContent('test.pdf');

    const isDocument = (c: AIMessageContent): c is AIDocumentContent =>
      typeof c === 'object' && c !== null && 'type' in c && c.type === 'document';

    expect(isDocument(textContent)).toBe(false);
    expect(isDocument(pdfContent)).toBe(true);
  });

  it('should handle string content (legacy compatibility check)', () => {
    // AIMessageContent pode ser string em casos legados
    const stringContent = 'Plain string' as unknown as AIMessageContent;

    const isText = (c: AIMessageContent): c is AITextContent =>
      typeof c === 'object' && c !== null && 'type' in c && c.type === 'text';

    expect(isText(stringContent)).toBe(false);
  });
});
