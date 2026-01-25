/**
 * @file oral-proof-analysis.test.ts
 * @description Testes para o módulo oral-proof-analysis
 * @version 1.38.52
 */

import { describe, it, expect } from 'vitest';
import { ORAL_PROOF_ANALYSIS_INSTRUCTIONS, buildOralProofSynthesisSection } from './oral-proof-analysis';
import type { Topic, TopicCategory } from '../types';

describe('oral-proof-analysis', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // CONSTANTE ORAL_PROOF_ANALYSIS_INSTRUCTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('ORAL_PROOF_ANALYSIS_INSTRUCTIONS', () => {
    it('should be a non-empty string', () => {
      expect(typeof ORAL_PROOF_ANALYSIS_INSTRUCTIONS).toBe('string');
      expect(ORAL_PROOF_ANALYSIS_INSTRUCTIONS.length).toBeGreaterThan(100);
    });

    it('should contain analysis title', () => {
      expect(ORAL_PROOF_ANALYSIS_INSTRUCTIONS).toContain('ANÁLISE DE TRANSCRIÇÃO DE PROVA ORAL TRABALHISTA');
    });

    it('should contain fundamental premises', () => {
      expect(ORAL_PROOF_ANALYSIS_INSTRUCTIONS).toContain('PREMISSAS FUNDAMENTAIS');
    });

    it('should contain depoimento pessoal section', () => {
      expect(ORAL_PROOF_ANALYSIS_INSTRUCTIONS).toContain('Natureza e função do depoimento pessoal');
    });

    it('should contain prova testemunhal section', () => {
      expect(ORAL_PROOF_ANALYSIS_INSTRUCTIONS).toContain('Natureza e função da prova testemunhal');
    });

    it('should contain analysis structure', () => {
      expect(ORAL_PROOF_ANALYSIS_INSTRUCTIONS).toContain('ESTRUTURA DA ANÁLISE');
    });

    it('should contain parte 1 identification', () => {
      expect(ORAL_PROOF_ANALYSIS_INSTRUCTIONS).toContain('PARTE 1 — IDENTIFICAÇÃO DOS DEPOIMENTOS');
    });

    it('should contain parte 2 reclamante', () => {
      expect(ORAL_PROOF_ANALYSIS_INSTRUCTIONS).toContain('PARTE 2 — ANÁLISE DO DEPOIMENTO PESSOAL DO RECLAMANTE');
    });

    it('should contain parte 3 preposto', () => {
      expect(ORAL_PROOF_ANALYSIS_INSTRUCTIONS).toContain('PARTE 3 — ANÁLISE DO DEPOIMENTO PESSOAL DO PREPOSTO');
    });

    it('should contain parte 4 testemunhal', () => {
      expect(ORAL_PROOF_ANALYSIS_INSTRUCTIONS).toContain('PARTE 4 — ANÁLISE DA PROVA TESTEMUNHAL');
    });

    it('should contain redaction rules', () => {
      expect(ORAL_PROOF_ANALYSIS_INSTRUCTIONS).toContain('REGRAS DE REDAÇÃO');
    });

    it('should contain alerts and prohibitions', () => {
      expect(ORAL_PROOF_ANALYSIS_INSTRUCTIONS).toContain('ALERTAS E PROIBIÇÕES');
    });

    it('should contain correct analysis example', () => {
      expect(ORAL_PROOF_ANALYSIS_INSTRUCTIONS).toContain('EXEMPLO DE ANÁLISE CORRETA');
    });

    it('should contain warning about confissão real vs ficta', () => {
      expect(ORAL_PROOF_ANALYSIS_INSTRUCTIONS).toContain('Confissão real vs. confissão ficta');
    });

    it('should contain golden rule for fundamentação', () => {
      expect(ORAL_PROOF_ANALYSIS_INSTRUCTIONS).toContain('Regra de ouro para a fundamentação');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FUNÇÃO buildOralProofSynthesisSection
  // ═══════════════════════════════════════════════════════════════════════════

  describe('buildOralProofSynthesisSection', () => {
    const createTopic = (title: string, category?: string): Topic => ({
      id: Math.random().toString(),
      title,
      category: (category || 'MÉRITO') as TopicCategory,
      text: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    describe('with linked topics', () => {
      it('should return synthesis section with linked topics', () => {
        const topics: Topic[] = [
          createTopic('Horas Extras', 'Jornada'),
          createTopic('Vínculo Empregatício', 'Contrato'),
        ];

        const result = buildOralProofSynthesisSection(topics);

        expect(result).toContain('PARTE 5 — SÍNTESE VALORATIVA POR TÓPICO VINCULADO');
      });

      it('should list linked topics with numbers', () => {
        const topics: Topic[] = [
          createTopic('Horas Extras', 'Jornada'),
          createTopic('Vínculo Empregatício', 'Contrato'),
        ];

        const result = buildOralProofSynthesisSection(topics);

        expect(result).toContain('1. Horas Extras (Jornada)');
        expect(result).toContain('2. Vínculo Empregatício (Contrato)');
      });

      it('should show default category when not specified', () => {
        const topics: Topic[] = [
          createTopic('Tópico Sem Categoria'),
        ];

        const result = buildOralProofSynthesisSection(topics);

        // createTopic uses 'MÉRITO' as default category
        expect(result).toContain('1. Tópico Sem Categoria (MÉRITO)');
      });

      it('should contain table structure for topics', () => {
        const topics: Topic[] = [createTopic('Test Topic', 'Test')];

        const result = buildOralProofSynthesisSection(topics);

        expect(result).toContain('| Tópico | Ônus da prova | Confissão? | O que a prova testemunhal demonstrou | Conclusão |');
        expect(result).toContain('|--------|---------------|------------|--------------------------------------|-----------|');
      });

      it('should contain specific instructions for each topic', () => {
        const topics: Topic[] = [createTopic('Test Topic', 'Test')];

        const result = buildOralProofSynthesisSection(topics);

        expect(result).toContain('CADA TÓPICO VINCULADO');
        expect(result).toContain('Qual o ônus da prova');
        expect(result).toContain('Se houve confissão real');
        expect(result).toContain('prova testemunhal demonstrou especificamente');
        expect(result).toContain('se o ônus foi ou não satisfeito');
      });
    });

    describe('without linked topics (free analysis)', () => {
      it('should return free synthesis section when no topics', () => {
        const result = buildOralProofSynthesisSection([]);

        expect(result).toContain('PARTE 5 — SÍNTESE VALORATIVA');
        expect(result).not.toContain('POR TÓPICO VINCULADO');
      });

      it('should instruct to identify matters from transcription', () => {
        const result = buildOralProofSynthesisSection([]);

        expect(result).toContain('Identifique as matérias de fato controvertidas');
      });

      it('should contain table structure for matters', () => {
        const result = buildOralProofSynthesisSection([]);

        expect(result).toContain('| Matéria | Ônus da prova | Confissão? | O que a prova testemunhal demonstrou | Conclusão |');
        expect(result).toContain('|---------|---------------|------------|--------------------------------------|-----------|');
      });

      it('should contain general instructions', () => {
        const result = buildOralProofSynthesisSection([]);

        expect(result).toContain('Qual o ônus da prova');
        expect(result).toContain('Se houve confissão real');
        expect(result).toContain('prova testemunhal demonstrou');
        expect(result).toContain('se o ônus foi ou não satisfeito');
      });
    });
  });
});
