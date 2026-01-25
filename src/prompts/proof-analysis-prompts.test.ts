/**
 * Testes para proof-analysis-prompts (prompt de análise de prova documental)
 * Verifica a constante PROOF_ANALYSIS_INSTRUCTIONS e a função buildProofAnalysisPrompt
 */
import { describe, it, expect } from 'vitest';
import { PROOF_ANALYSIS_INSTRUCTIONS, buildProofAnalysisPrompt } from './proof-analysis-prompts';
import type { Topic } from '../types';

describe('proof-analysis-prompts', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // TESTES PARA PROOF_ANALYSIS_INSTRUCTIONS (constante)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('PROOF_ANALYSIS_INSTRUCTIONS', () => {
    it('deve ser uma string não vazia', () => {
      expect(PROOF_ANALYSIS_INSTRUCTIONS).toBeTruthy();
      expect(typeof PROOF_ANALYSIS_INSTRUCTIONS).toBe('string');
      expect(PROOF_ANALYSIS_INSTRUCTIONS.length).toBeGreaterThan(100);
    });

    it('deve conter título principal', () => {
      expect(PROOF_ANALYSIS_INSTRUCTIONS).toContain('ANÁLISE DE PROVA DOCUMENTAL TRABALHISTA');
    });

    it('deve conter seção de papel e função', () => {
      expect(PROOF_ANALYSIS_INSTRUCTIONS).toContain('PAPEL E FUNÇÃO');
      expect(PROOF_ANALYSIS_INSTRUCTIONS).toContain('assessor jurídico');
    });

    it('deve conter distinção PROVA vs CONTEXTO', () => {
      expect(PROOF_ANALYSIS_INSTRUCTIONS).toContain('DISTINÇÃO CRÍTICA: PROVA vs CONTEXTO');
      expect(PROOF_ANALYSIS_INSTRUCTIONS).toContain('TIPO 1: A PROVA');
      expect(PROOF_ANALYSIS_INSTRUCTIONS).toContain('TIPO 2: CONTEXTO PROCESSUAL');
    });

    it('deve conter metodologia em 6 passos', () => {
      expect(PROOF_ANALYSIS_INSTRUCTIONS).toContain('PASSO 1 - IDENTIFICAÇÃO DA PROVA');
      expect(PROOF_ANALYSIS_INSTRUCTIONS).toContain('PASSO 2 - CONTEÚDO OBJETIVO');
      expect(PROOF_ANALYSIS_INSTRUCTIONS).toContain('PASSO 3 - CONFRONTO COM ALEGAÇÕES DO AUTOR');
      expect(PROOF_ANALYSIS_INSTRUCTIONS).toContain('PASSO 4 - CONFRONTO COM ARGUMENTOS DA DEFESA');
      expect(PROOF_ANALYSIS_INSTRUCTIONS).toContain('PASSO 5 - VALORAÇÃO PROBATÓRIA');
      expect(PROOF_ANALYSIS_INSTRUCTIONS).toContain('PASSO 6 - SÍNTESE PARA CONVENCIMENTO');
    });

    it('deve conter exemplos de análise correta e incorreta', () => {
      expect(PROOF_ANALYSIS_INSTRUCTIONS).toContain('EXEMPLO CORRETO');
      expect(PROOF_ANALYSIS_INSTRUCTIONS).toContain('EXEMPLO INCORRETO');
    });

    it('deve conter regras invioláveis', () => {
      expect(PROOF_ANALYSIS_INSTRUCTIONS).toContain('REGRAS INVIOLÁVEIS');
      expect(PROOF_ANALYSIS_INSTRUCTIONS).toContain('NUNCA');
      expect(PROOF_ANALYSIS_INSTRUCTIONS).toContain('SEMPRE');
    });

    it('deve conter alertas e proibições', () => {
      expect(PROOF_ANALYSIS_INSTRUCTIONS).toContain('ALERTAS E PROIBIÇÕES');
      expect(PROOF_ANALYSIS_INSTRUCTIONS).toContain('jurisprudência');
    });

    it('deve conter tags de identificação de prova', () => {
      expect(PROOF_ANALYSIS_INSTRUCTIONS).toContain('<prova-principal>');
      expect(PROOF_ANALYSIS_INSTRUCTIONS).toContain('PROVA:');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TESTES PARA buildProofAnalysisPrompt (função)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('buildProofAnalysisPrompt', () => {
    const defaultOptions = {
      peticaoSummary: 'Resumo da petição inicial',
      contestacoesSummary: 'Resumo da contestação',
      linkedTopics: [] as Topic[],
    };

    // ═══════════════════════════════════════════════════════════════════
    // TESTES BÁSICOS
    // ═══════════════════════════════════════════════════════════════════

    it('deve retornar uma string não vazia', () => {
      const result = buildProofAnalysisPrompt(defaultOptions);
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(100);
    });

    it('deve incluir as instruções base (PROOF_ANALYSIS_INSTRUCTIONS)', () => {
      const result = buildProofAnalysisPrompt(defaultOptions);
      expect(result).toContain('ANÁLISE DE PROVA DOCUMENTAL TRABALHISTA');
    });

    it('deve incluir contexto do processo', () => {
      const result = buildProofAnalysisPrompt(defaultOptions);
      expect(result).toContain('CONTEXTO DO PROCESSO');
      expect(result).toContain('Resumo da petição inicial');
      expect(result).toContain('Resumo da contestação');
    });

    it('deve incluir formato de resposta', () => {
      const result = buildProofAnalysisPrompt(defaultOptions);
      expect(result).toContain('FORMATO DE RESPOSTA');
      expect(result).toContain('CONTEÚDO DA PROVA');
      expect(result).toContain('RELAÇÃO COM ALEGAÇÕES DO AUTOR');
      expect(result).toContain('RELAÇÃO COM A DEFESA');
      expect(result).toContain('FORÇA PROBATÓRIA');
      expect(result).toContain('CONCLUSÃO');
    });

    // ═══════════════════════════════════════════════════════════════════
    // TESTES COM INSTRUÇÕES PERSONALIZADAS
    // ═══════════════════════════════════════════════════════════════════

    it('não deve incluir seção de instruções do magistrado quando customInstructions é undefined', () => {
      const result = buildProofAnalysisPrompt(defaultOptions);
      expect(result).not.toContain('INSTRUÇÕES ESPECÍFICAS DO MAGISTRADO');
    });

    it('deve incluir instruções personalizadas quando fornecidas', () => {
      const result = buildProofAnalysisPrompt({
        ...defaultOptions,
        customInstructions: 'Focar em provas de jornada',
      });
      expect(result).toContain('INSTRUÇÕES ESPECÍFICAS DO MAGISTRADO');
      expect(result).toContain('Focar em provas de jornada');
    });

    it('instruções personalizadas devem aparecer antes das instruções base', () => {
      const result = buildProofAnalysisPrompt({
        ...defaultOptions,
        customInstructions: 'INSTRUÇÃO_CUSTOM_TESTE',
      });
      const customIdx = result.indexOf('INSTRUÇÃO_CUSTOM_TESTE');
      const baseIdx = result.indexOf('ANÁLISE DE PROVA DOCUMENTAL TRABALHISTA');
      expect(customIdx).toBeLessThan(baseIdx);
    });

    // ═══════════════════════════════════════════════════════════════════
    // TESTES COM TÓPICOS VINCULADOS
    // ═══════════════════════════════════════════════════════════════════

    it('não deve incluir seção de pedidos vinculados quando linkedTopics é vazio', () => {
      const result = buildProofAnalysisPrompt(defaultOptions);
      expect(result).not.toContain('PEDIDOS VINCULADOS A ESTA PROVA');
    });

    it('deve incluir tópicos vinculados quando fornecidos', () => {
      const topics: Topic[] = [
        { title: 'HORAS EXTRAS', category: 'MÉRITO', relatorio: 'Relatório de horas extras' },
        { title: 'DANO MORAL', category: 'MÉRITO', relatorio: 'Relatório de dano moral' },
      ];
      const result = buildProofAnalysisPrompt({
        ...defaultOptions,
        linkedTopics: topics,
      });
      expect(result).toContain('PEDIDOS VINCULADOS A ESTA PROVA');
      expect(result).toContain('HORAS EXTRAS');
      expect(result).toContain('DANO MORAL');
      expect(result).toContain('Relatório de horas extras');
      expect(result).toContain('Relatório de dano moral');
    });

    it('deve incluir categoria dos tópicos vinculados', () => {
      const topics: Topic[] = [
        { title: 'PRESCRIÇÃO', category: 'PRELIMINAR', relatorio: 'Teste' },
      ];
      const result = buildProofAnalysisPrompt({
        ...defaultOptions,
        linkedTopics: topics,
      });
      expect(result).toContain('PRESCRIÇÃO');
      expect(result).toContain('PRELIMINAR');
    });

    it('deve incluir instrução de foco quando há tópicos vinculados', () => {
      const topics: Topic[] = [
        { title: 'FÉRIAS', category: 'MÉRITO', relatorio: 'Teste' },
      ];
      const result = buildProofAnalysisPrompt({
        ...defaultOptions,
        linkedTopics: topics,
      });
      expect(result).toContain('FOCO DA ANÁLISE');
      expect(result).toContain('Priorize como esta prova impacta os pedidos vinculados');
    });

    it('deve incluir seção IMPACTO NOS PEDIDOS VINCULADOS quando há tópicos', () => {
      const topics: Topic[] = [
        { title: 'ADICIONAL NOTURNO', category: 'MÉRITO', relatorio: 'Teste' },
      ];
      const result = buildProofAnalysisPrompt({
        ...defaultOptions,
        linkedTopics: topics,
      });
      expect(result).toContain('IMPACTO NOS PEDIDOS VINCULADOS');
      expect(result).toContain('ADICIONAL NOTURNO');
    });

    it('deve lidar com tópicos sem relatorio', () => {
      const topics: Topic[] = [
        { title: 'VÍNCULO', category: 'MÉRITO' },
      ];
      const result = buildProofAnalysisPrompt({
        ...defaultOptions,
        linkedTopics: topics,
      });
      expect(result).toContain('VÍNCULO');
      expect(result).toContain('Mini-relatório não disponível');
    });

    it('deve numerar os tópicos sequencialmente', () => {
      const topics: Topic[] = [
        { title: 'TÓPICO A', category: 'MÉRITO', relatorio: 'A' },
        { title: 'TÓPICO B', category: 'MÉRITO', relatorio: 'B' },
        { title: 'TÓPICO C', category: 'PRELIMINAR', relatorio: 'C' },
      ];
      const result = buildProofAnalysisPrompt({
        ...defaultOptions,
        linkedTopics: topics,
      });
      expect(result).toContain('1. TÓPICO A');
      expect(result).toContain('2. TÓPICO B');
      expect(result).toContain('3. TÓPICO C');
    });

    // ═══════════════════════════════════════════════════════════════════
    // TESTES DE EDGE CASES
    // ═══════════════════════════════════════════════════════════════════

    it('deve lidar com resumos vazios', () => {
      const result = buildProofAnalysisPrompt({
        peticaoSummary: '',
        contestacoesSummary: '',
        linkedTopics: [],
      });
      expect(result).toContain('CONTEXTO DO PROCESSO');
      expect(result).toContain('Petição inicial:');
    });

    it('deve lidar com caracteres especiais nos resumos', () => {
      const result = buildProofAnalysisPrompt({
        peticaoSummary: 'Resumo com "aspas" e <tags> e $peciais',
        contestacoesSummary: 'Contestação com R$ 1.000,00',
        linkedTopics: [],
      });
      expect(result).toContain('Resumo com "aspas" e <tags> e $peciais');
      expect(result).toContain('Contestação com R$ 1.000,00');
    });

    it('deve lidar com customInstructions contendo caracteres especiais', () => {
      const result = buildProofAnalysisPrompt({
        ...defaultOptions,
        customInstructions: 'Instrução com {chaves} e [colchetes] e $cifrão',
      });
      expect(result).toContain('Instrução com {chaves} e [colchetes] e $cifrão');
    });
  });
});
