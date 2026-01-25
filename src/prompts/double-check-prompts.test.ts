/**
 * Testes para double-check-prompts (prompts de verificação secundária)
 * Verifica DOUBLE_CHECK_PROMPTS, buildDoubleCheckPrompt e DOUBLE_CHECK_OPERATION_LABELS
 */
import { describe, it, expect } from 'vitest';
import {
  DOUBLE_CHECK_PROMPTS,
  buildDoubleCheckPrompt,
  DOUBLE_CHECK_OPERATION_LABELS,
} from './double-check-prompts';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS AUXILIARES
// ═══════════════════════════════════════════════════════════════════════════

type DoubleCheckOperation = keyof typeof DOUBLE_CHECK_PROMPTS;

const ALL_OPERATIONS: DoubleCheckOperation[] = [
  'topicExtraction',
  'dispositivo',
  'sentenceReview',
  'factsComparison',
  'proofAnalysis',
  'quickPrompt',
];

describe('double-check-prompts', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // TESTES PARA DOUBLE_CHECK_PROMPTS (constante)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('DOUBLE_CHECK_PROMPTS', () => {
    it('deve ter todas as operações esperadas', () => {
      for (const op of ALL_OPERATIONS) {
        expect(DOUBLE_CHECK_PROMPTS[op]).toBeDefined();
        expect(typeof DOUBLE_CHECK_PROMPTS[op]).toBe('string');
      }
    });

    it('cada prompt deve ser não vazio', () => {
      for (const op of ALL_OPERATIONS) {
        expect(DOUBLE_CHECK_PROMPTS[op].length).toBeGreaterThan(50);
      }
    });

    it('cada prompt deve conter placeholders de contexto', () => {
      for (const op of ALL_OPERATIONS) {
        expect(DOUBLE_CHECK_PROMPTS[op]).toContain('{context}');
        expect(DOUBLE_CHECK_PROMPTS[op]).toContain('{originalResponse}');
      }
    });

    it('cada prompt deve conter instrução de idioma português', () => {
      for (const op of ALL_OPERATIONS) {
        expect(DOUBLE_CHECK_PROMPTS[op]).toContain('PORTUGUÊS BRASILEIRO');
      }
    });

    it('cada prompt deve conter formato de resposta JSON', () => {
      for (const op of ALL_OPERATIONS) {
        expect(DOUBLE_CHECK_PROMPTS[op]).toContain('corrections');
        expect(DOUBLE_CHECK_PROMPTS[op]).toContain('confidence');
        expect(DOUBLE_CHECK_PROMPTS[op]).toContain('summary');
      }
    });

    // Testes específicos por operação
    describe('topicExtraction', () => {
      it('deve conter critérios de verificação de tópicos', () => {
        const prompt = DOUBLE_CHECK_PROMPTS.topicExtraction;
        expect(prompt).toContain('FALSOS POSITIVOS');
        expect(prompt).toContain('OMISSÕES');
        expect(prompt).toContain('CATEGORIZAÇÃO');
        expect(prompt).toContain('DUPLICATAS');
      });

      it('deve conter categorias PRELIMINAR e MÉRITO', () => {
        const prompt = DOUBLE_CHECK_PROMPTS.topicExtraction;
        expect(prompt).toContain('PRELIMINAR');
        expect(prompt).toContain('MÉRITO');
      });

      it('deve conter campo verifiedTopics no formato', () => {
        const prompt = DOUBLE_CHECK_PROMPTS.topicExtraction;
        expect(prompt).toContain('verifiedTopics');
      });
    });

    describe('dispositivo', () => {
      it('deve conter critérios de verificação do dispositivo', () => {
        const prompt = DOUBLE_CHECK_PROMPTS.dispositivo;
        expect(prompt).toContain('COMPLETUDE');
        expect(prompt).toContain('COERÊNCIA COM A FUNDAMENTAÇÃO');
        expect(prompt).toContain('PARÂMETROS DAS CONDENAÇÕES');
        expect(prompt).toContain('FORMATO TÉCNICO');
      });

      it('deve conter campo verifiedDispositivo no formato', () => {
        const prompt = DOUBLE_CHECK_PROMPTS.dispositivo;
        expect(prompt).toContain('verifiedDispositivo');
      });

      it('deve conter regra crítica de incorporar correções', () => {
        const prompt = DOUBLE_CHECK_PROMPTS.dispositivo;
        expect(prompt).toContain('REGRA CRÍTICA OBRIGATÓRIA');
        expect(prompt).toContain('TODAS AS CORREÇÕES JÁ APLICADAS');
      });
    });

    describe('sentenceReview', () => {
      it('deve conter critérios de verificação da revisão', () => {
        const prompt = DOUBLE_CHECK_PROMPTS.sentenceReview;
        expect(prompt).toContain('OMISSÕES IDENTIFICADAS');
        expect(prompt).toContain('CONTRADIÇÕES IDENTIFICADAS');
        expect(prompt).toContain('OBSCURIDADES IDENTIFICADAS');
        expect(prompt).toContain('QUALIDADE DAS SUGESTÕES');
      });

      it('deve conter campo verifiedReview no formato', () => {
        const prompt = DOUBLE_CHECK_PROMPTS.sentenceReview;
        expect(prompt).toContain('verifiedReview');
      });
    });

    describe('factsComparison', () => {
      it('deve conter critérios de verificação do confronto de fatos', () => {
        const prompt = DOUBLE_CHECK_PROMPTS.factsComparison;
        expect(prompt).toContain('COMPLETUDE DA TABELA');
        expect(prompt).toContain('CLASSIFICAÇÃO DE STATUS');
      });

      it('deve conter regras de fix_row', () => {
        const prompt = DOUBLE_CHECK_PROMPTS.factsComparison;
        expect(prompt).toContain('fix_row');
        expect(prompt).toContain('add_row');
        expect(prompt).toContain('add_fato');
      });

      it('deve conter status válidos', () => {
        const prompt = DOUBLE_CHECK_PROMPTS.factsComparison;
        expect(prompt).toContain('controverso');
        expect(prompt).toContain('incontroverso');
        expect(prompt).toContain('silencio');
      });

      it('deve conter campo verifiedResult no formato', () => {
        const prompt = DOUBLE_CHECK_PROMPTS.factsComparison;
        expect(prompt).toContain('verifiedResult');
      });
    });

    describe('proofAnalysis', () => {
      it('deve conter critérios de verificação da análise de prova', () => {
        const prompt = DOUBLE_CHECK_PROMPTS.proofAnalysis;
        expect(prompt).toContain('COMPLETUDE');
        expect(prompt).toContain('COERÊNCIA COM A PROVA');
        expect(prompt).toContain('OBJETIVIDADE');
        expect(prompt).toContain('RELEVÂNCIA JURÍDICA');
      });

      it('deve conter campo verifiedResult no formato', () => {
        const prompt = DOUBLE_CHECK_PROMPTS.proofAnalysis;
        expect(prompt).toContain('verifiedResult');
      });
    });

    describe('quickPrompt', () => {
      it('deve conter critérios de verificação do quick prompt', () => {
        const prompt = DOUBLE_CHECK_PROMPTS.quickPrompt;
        expect(prompt).toContain('ATENDIMENTO À SOLICITAÇÃO');
        expect(prompt).toContain('PRECISÃO JURÍDICA');
        expect(prompt).toContain('COERÊNCIA COM OS DOCUMENTOS');
        expect(prompt).toContain('QUALIDADE DA ANÁLISE');
      });

      it('deve conter placeholder {userPrompt}', () => {
        const prompt = DOUBLE_CHECK_PROMPTS.quickPrompt;
        expect(prompt).toContain('{userPrompt}');
      });

      it('deve conter campo verifiedResult no formato', () => {
        const prompt = DOUBLE_CHECK_PROMPTS.quickPrompt;
        expect(prompt).toContain('verifiedResult');
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TESTES PARA buildDoubleCheckPrompt (função)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('buildDoubleCheckPrompt', () => {
    const mockContext = 'Conteúdo do documento para análise';
    const mockResponse = '{"topics": [{"title": "HORAS EXTRAS", "category": "MÉRITO"}]}';

    it('deve retornar uma string não vazia', () => {
      const result = buildDoubleCheckPrompt('topicExtraction', mockResponse, mockContext);
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('deve substituir {context} pelo contexto fornecido', () => {
      const result = buildDoubleCheckPrompt('topicExtraction', mockResponse, mockContext);
      expect(result).toContain(mockContext);
      expect(result).not.toContain('{context}');
    });

    it('deve substituir {originalResponse} pela resposta fornecida', () => {
      const result = buildDoubleCheckPrompt('topicExtraction', mockResponse, mockContext);
      expect(result).toContain(mockResponse);
      expect(result).not.toContain('{originalResponse}');
    });

    it('deve funcionar para todas as operações', () => {
      for (const op of ALL_OPERATIONS) {
        const result = buildDoubleCheckPrompt(op, mockResponse, mockContext);
        expect(result).toContain(mockContext);
        expect(result).toContain(mockResponse);
        expect(result).not.toContain('{context}');
        expect(result).not.toContain('{originalResponse}');
      }
    });

    // Testes específicos para quickPrompt com userPrompt
    describe('quickPrompt com userPrompt', () => {
      it('deve substituir {userPrompt} quando fornecido', () => {
        const userPrompt = 'Redija a fundamentação do dano moral';
        const result = buildDoubleCheckPrompt('quickPrompt', mockResponse, mockContext, userPrompt);
        expect(result).toContain(userPrompt);
        expect(result).not.toContain('{userPrompt}');
      });

      it('deve remover seção {userPrompt} quando não fornecido', () => {
        const result = buildDoubleCheckPrompt('quickPrompt', mockResponse, mockContext);
        expect(result).not.toContain('{userPrompt}');
        expect(result).not.toContain('SOLICITAÇÃO DO USUÁRIO');
      });

      it('deve manter seção SOLICITAÇÃO DO USUÁRIO quando userPrompt é fornecido', () => {
        const result = buildDoubleCheckPrompt('quickPrompt', mockResponse, mockContext, 'Teste');
        expect(result).toContain('SOLICITAÇÃO DO USUÁRIO');
        expect(result).toContain('Teste');
      });
    });

    // Testes com userPrompt em operações que não usam
    it('userPrompt não deve afetar operações que não o usam', () => {
      const result = buildDoubleCheckPrompt('topicExtraction', mockResponse, mockContext, 'Ignorado');
      // A operação topicExtraction não tem {userPrompt}, logo não substitui
      expect(result).not.toContain('{userPrompt}');
    });

    // Testes de edge cases
    it('deve lidar com contexto vazio', () => {
      const result = buildDoubleCheckPrompt('topicExtraction', mockResponse, '');
      expect(result).toBeTruthy();
      expect(result).not.toContain('{context}');
    });

    it('deve lidar com resposta vazia', () => {
      const result = buildDoubleCheckPrompt('topicExtraction', '', mockContext);
      expect(result).toBeTruthy();
      expect(result).not.toContain('{originalResponse}');
    });

    it('deve lidar com caracteres especiais no contexto', () => {
      const specialContext = 'Valor de R$ 1.000,00 e "aspas" com <tags>';
      const result = buildDoubleCheckPrompt('dispositivo', mockResponse, specialContext);
      expect(result).toContain(specialContext);
    });

    it('deve lidar com JSON complexo na resposta', () => {
      const complexResponse = JSON.stringify({
        topics: [
          { title: 'HORAS EXTRAS - BANCO DE HORAS', category: 'MÉRITO' },
          { title: 'PRESCRIÇÃO QUINQUENAL', category: 'PRELIMINAR' },
        ],
      });
      const result = buildDoubleCheckPrompt('topicExtraction', complexResponse, mockContext);
      expect(result).toContain('HORAS EXTRAS - BANCO DE HORAS');
      expect(result).toContain('PRESCRIÇÃO QUINQUENAL');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TESTES PARA DOUBLE_CHECK_OPERATION_LABELS (constante)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('DOUBLE_CHECK_OPERATION_LABELS', () => {
    it('deve ter labels para todas as operações', () => {
      for (const op of ALL_OPERATIONS) {
        expect(DOUBLE_CHECK_OPERATION_LABELS[op]).toBeDefined();
        expect(DOUBLE_CHECK_OPERATION_LABELS[op].label).toBeDefined();
        expect(DOUBLE_CHECK_OPERATION_LABELS[op].description).toBeDefined();
      }
    });

    it('cada label deve ser uma string não vazia', () => {
      for (const op of ALL_OPERATIONS) {
        expect(typeof DOUBLE_CHECK_OPERATION_LABELS[op].label).toBe('string');
        expect(DOUBLE_CHECK_OPERATION_LABELS[op].label.length).toBeGreaterThan(0);
      }
    });

    it('cada description deve ser uma string não vazia', () => {
      for (const op of ALL_OPERATIONS) {
        expect(typeof DOUBLE_CHECK_OPERATION_LABELS[op].description).toBe('string');
        expect(DOUBLE_CHECK_OPERATION_LABELS[op].description.length).toBeGreaterThan(0);
      }
    });

    it('labels devem ser em português', () => {
      expect(DOUBLE_CHECK_OPERATION_LABELS.topicExtraction.label).toBe('Extração de tópicos');
      expect(DOUBLE_CHECK_OPERATION_LABELS.dispositivo.label).toBe('Dispositivo');
      expect(DOUBLE_CHECK_OPERATION_LABELS.sentenceReview.label).toBe('Revisar sentença');
      expect(DOUBLE_CHECK_OPERATION_LABELS.factsComparison.label).toBe('Confronto de fatos');
      expect(DOUBLE_CHECK_OPERATION_LABELS.proofAnalysis.label).toBe('Análise de provas');
      expect(DOUBLE_CHECK_OPERATION_LABELS.quickPrompt.label).toBe('Prompts rápidos');
    });

    it('descriptions devem descrever a finalidade', () => {
      expect(DOUBLE_CHECK_OPERATION_LABELS.topicExtraction.description).toContain('falsos positivos');
      expect(DOUBLE_CHECK_OPERATION_LABELS.dispositivo.description).toContain('omissões');
      expect(DOUBLE_CHECK_OPERATION_LABELS.sentenceReview.description).toContain('omissões');
      expect(DOUBLE_CHECK_OPERATION_LABELS.factsComparison.description).toContain('completude');
      expect(DOUBLE_CHECK_OPERATION_LABELS.proofAnalysis.description).toContain('completude');
      expect(DOUBLE_CHECK_OPERATION_LABELS.quickPrompt.description).toContain('solicitação');
    });
  });
});
