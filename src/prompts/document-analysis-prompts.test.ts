/**
 * Testes para document-analysis-prompts (prompt de análise de documentos)
 * Verifica a construção do prompt com diferentes combinações de parâmetros
 */
import { describe, it, expect } from 'vitest';
import { buildAnalysisPrompt } from './document-analysis-prompts';
import type { AISettings } from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// MOCK DE AISettings MÍNIMO PARA TESTES
// ═══════════════════════════════════════════════════════════════════════════

const baseAISettings: AISettings = {
  provider: 'claude',
  claudeModel: 'claude-sonnet-4-20250514',
  geminiModel: 'gemini-2.0-flash',
  openaiModel: 'gpt-5.2',
  openaiReasoningLevel: 'medium',
  grokModel: 'grok-4-1-fast-reasoning',
  apiKeys: { claude: '', gemini: '', openai: '', grok: '' },
  useExtendedThinking: false,
  thinkingBudget: '10000',
  geminiThinkingLevel: 'medium',
  customPrompt: '',
  modeloRelatorio: '',
  modeloDispositivo: '',
  modeloTopicoRelatorio: '',
  ocrEngine: 'tesseract',
  parallelRequests: 1,
  anonymization: { enabled: false, nomesUsuario: [] } as AISettings['anonymization'],
  semanticSearchEnabled: false,
  semanticThreshold: 0.7,
  jurisSemanticEnabled: false,
  quickPrompts: [],
};

describe('document-analysis-prompts', () => {
  describe('buildAnalysisPrompt', () => {
    // ═══════════════════════════════════════════════════════════════════
    // TESTES BÁSICOS DE RETORNO
    // ═══════════════════════════════════════════════════════════════════

    it('deve retornar uma string não vazia', () => {
      const result = buildAnalysisPrompt(0, 0, baseAISettings);
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(100);
    });

    // ═══════════════════════════════════════════════════════════════════
    // TESTES COM CONTESTAÇÕES
    // ═══════════════════════════════════════════════════════════════════

    it('deve indicar ausência de contestação quando totalContestacoes = 0', () => {
      const result = buildAnalysisPrompt(0, 0, baseAISettings);
      expect(result).toContain('não há contestação fornecida');
    });

    it('deve indicar 1 contestação no singular', () => {
      const result = buildAnalysisPrompt(1, 0, baseAISettings);
      // Verifica que o número 1 aparece no contexto de contestação
      expect(result).toMatch(/e as 1 contest/);
    });

    it('deve indicar múltiplas contestações no plural', () => {
      const result = buildAnalysisPrompt(3, 0, baseAISettings);
      // Verifica que o número 3 aparece no contexto de contestação
      expect(result).toMatch(/e as 3 contest/);
    });

    it('deve incluir modelo de defesa para segunda ré quando há 2+ contestações', () => {
      const result = buildAnalysisPrompt(2, 0, baseAISettings);
      expect(result).toContain('segunda ré');
    });

    it('deve incluir modelo de defesa para terceira reclamada quando há 3+ contestações', () => {
      const result = buildAnalysisPrompt(3, 0, baseAISettings);
      expect(result).toContain('terceira reclamada');
    });

    it('não deve incluir modelo de defesa para terceira ré quando há apenas 2 contestações', () => {
      const result = buildAnalysisPrompt(2, 0, baseAISettings);
      // O template de 3+ contestações adiciona "A terceira reclamada também contesta"
      // que NÃO aparece quando há apenas 2
      expect(result).not.toContain('terceira reclamada também contesta');
    });

    // ═══════════════════════════════════════════════════════════════════
    // TESTES COM DOCUMENTOS COMPLEMENTARES
    // ═══════════════════════════════════════════════════════════════════

    it('deve indicar ausência de documentos complementares quando totalComplementares = 0', () => {
      const result = buildAnalysisPrompt(0, 0, baseAISettings);
      expect(result).toContain('não há documentos complementares');
    });

    it('deve indicar 1 documento complementar no singular', () => {
      const result = buildAnalysisPrompt(0, 1, baseAISettings);
      expect(result).toContain('1 documento complementar disponível');
    });

    it('deve indicar múltiplos documentos complementares no plural', () => {
      const result = buildAnalysisPrompt(0, 3, baseAISettings);
      // Template concatena: "documento"+"s", "complementar"+"es"
      expect(result).toContain('3 documentos complementares');
    });

    it('deve instruir uso de complementares apenas no RELATÓRIO', () => {
      const result = buildAnalysisPrompt(0, 2, baseAISettings);
      expect(result).toContain('APENAS neste tópico RELATÓRIO');
    });

    // ═══════════════════════════════════════════════════════════════════
    // TESTES COM MODELO PERSONALIZADO
    // ═══════════════════════════════════════════════════════════════════

    it('deve usar modelo padrão quando modeloRelatorio está vazio', () => {
      const result = buildAnalysisPrompt(1, 0, baseAISettings);
      expect(result).toContain('MODELO PADRÃO');
      expect(result).toContain('O reclamante narra');
    });

    it('deve usar modelo personalizado quando modeloRelatorio está preenchido', () => {
      const settings: AISettings = {
        ...baseAISettings,
        modeloRelatorio: 'Modelo customizado do magistrado',
      };
      const result = buildAnalysisPrompt(1, 0, settings);
      expect(result).toContain('MODELO PERSONALIZADO DO USUÁRIO');
      expect(result).toContain('Modelo customizado do magistrado');
    });

    // ═══════════════════════════════════════════════════════════════════
    // TESTES COM NÍVEL DE DETALHE
    // ═══════════════════════════════════════════════════════════════════

    it('não deve incluir instrução de detalhe quando detailedMiniReports é false', () => {
      const settings: AISettings = { ...baseAISettings, detailedMiniReports: false };
      const result = buildAnalysisPrompt(0, 0, settings);
      expect(result).not.toContain('NÍVEL DE DETALHE - FATOS');
    });

    it('deve incluir instrução de detalhe quando detailedMiniReports é true', () => {
      const settings: AISettings = { ...baseAISettings, detailedMiniReports: true };
      const result = buildAnalysisPrompt(0, 0, settings);
      expect(result).toContain('NÍVEL DE DETALHE - FATOS');
      expect(result).toContain('alto nível de detalhe');
    });

    // ═══════════════════════════════════════════════════════════════════
    // TESTES DE CONTEÚDO OBRIGATÓRIO
    // ═══════════════════════════════════════════════════════════════════

    it('deve conter instrução sobre tópico RELATÓRIO obrigatório', () => {
      const result = buildAnalysisPrompt(0, 0, baseAISettings);
      expect(result).toContain('TÓPICO OBRIGATÓRIO "RELATÓRIO"');
    });

    it('deve conter categorias de classificação', () => {
      const result = buildAnalysisPrompt(0, 0, baseAISettings);
      expect(result).toContain('QUESTÕES PROCESSUAIS');
      expect(result).toContain('PRELIMINARES');
      expect(result).toContain('PREJUDICIAIS');
      expect(result).toContain('MÉRITO');
    });

    it('deve conter formato de resposta JSON', () => {
      const result = buildAnalysisPrompt(0, 0, baseAISettings);
      expect(result).toContain('"partes"');
      expect(result).toContain('"topics"');
      expect(result).toContain('"title"');
      expect(result).toContain('"category"');
    });

    it('deve conter instrução de formatação de parágrafos', () => {
      const result = buildAnalysisPrompt(0, 0, baseAISettings);
      expect(result).toContain('FORMATAÇÃO DE PARÁGRAFOS');
    });

    it('deve conter instrução de numeração de reclamadas', () => {
      const result = buildAnalysisPrompt(0, 0, baseAISettings);
      expect(result).toContain('NUMERAÇÃO CONSISTENTE DAS RECLAMADAS');
    });

    it('deve conter instrução sobre formato do título dos tópicos', () => {
      const result = buildAnalysisPrompt(0, 0, baseAISettings);
      expect(result).toContain('FORMATO DO TÍTULO DOS TÓPICOS');
      expect(result).toContain('PEDIDO - CAUSA DE PEDIR');
    });

    it('deve conter instrução para retornar apenas JSON', () => {
      const result = buildAnalysisPrompt(0, 0, baseAISettings);
      expect(result).toContain('Responda APENAS com um JSON válido');
    });

    // ═══════════════════════════════════════════════════════════════════
    // TESTES DE EDGE CASES
    // ═══════════════════════════════════════════════════════════════════

    it('deve lidar com números grandes de contestações', () => {
      const result = buildAnalysisPrompt(10, 0, baseAISettings);
      expect(result).toMatch(/e as 10 contest/);
    });

    it('deve lidar com números grandes de documentos complementares', () => {
      const result = buildAnalysisPrompt(0, 50, baseAISettings);
      expect(result).toContain('50 documentos complementares');
    });

    it('deve combinar corretamente contestações e documentos complementares', () => {
      const result = buildAnalysisPrompt(2, 3, baseAISettings);
      expect(result).toMatch(/e as 2 contest/);
      expect(result).toContain('3 documentos complementares');
    });
  });
});
