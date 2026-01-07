/**
 * Testes para meta-prompts (geração automática de prompts personalizados)
 * v1.35.76: Criado junto com refatoração de AI_INSTRUCTIONS modular
 */
import { describe, it, expect } from 'vitest';
import { buildMetaPrompt, FIELD_LABELS, TargetField } from './meta-prompts';

describe('Meta-Prompts', () => {
  describe('buildMetaPrompt', () => {
    it('deve gerar prompt com exemplos formatados', () => {
      const prompt = buildMetaPrompt(
        'modeloRelatorio',
        ['Exemplo 1', 'Exemplo 2'],
        'Prompt de referência'
      );

      expect(prompt).toContain('══ EXEMPLO 1 ══');
      expect(prompt).toContain('══ EXEMPLO 2 ══');
      expect(prompt).toContain('Exemplo 1');
      expect(prompt).toContain('Exemplo 2');
    });

    it('deve incluir tipo correto no prompt para modeloRelatorio', () => {
      const prompt = buildMetaPrompt('modeloRelatorio', ['Ex'], 'Ref');
      expect(prompt).toContain('MINI-RELATÓRIO');
    });

    it('deve incluir tipo correto no prompt para modeloDispositivo', () => {
      const prompt = buildMetaPrompt('modeloDispositivo', ['Ex'], 'Ref');
      expect(prompt).toContain('DISPOSITIVO DE SENTENÇA');
    });

    it('deve incluir tipo correto no prompt para modeloTopicoRelatorio', () => {
      const prompt = buildMetaPrompt('modeloTopicoRelatorio', ['Ex'], 'Ref');
      expect(prompt).toContain('RELATÓRIO PROCESSUAL');
    });

    it('deve incluir prompt de referência', () => {
      const hardcoded = 'Este é o prompt hardcoded de referência';
      const prompt = buildMetaPrompt('modeloRelatorio', ['Ex'], hardcoded);

      expect(prompt).toContain(hardcoded);
      expect(prompt).toContain('PROMPT DE REFERÊNCIA');
    });

    it('deve conter seções de análise requerida', () => {
      const prompt = buildMetaPrompt('modeloRelatorio', ['Ex'], 'Ref');

      expect(prompt).toContain('ESTRUTURA:');
      expect(prompt).toContain('VOCABULÁRIO:');
      expect(prompt).toContain('TOM:');
      expect(prompt).toContain('PADRÕES:');
    });

    it('deve conter instrução de formato de resposta', () => {
      const prompt = buildMetaPrompt('modeloRelatorio', ['Ex'], 'Ref');

      expect(prompt).toContain('FORMATO DA RESPOSTA');
      expect(prompt).toContain('prompt de instrução');
      expect(prompt).toContain('APENAS com o prompt');
    });

    it('deve formatar múltiplos exemplos corretamente', () => {
      const prompt = buildMetaPrompt(
        'modeloRelatorio',
        ['Primeiro exemplo', 'Segundo exemplo', 'Terceiro exemplo'],
        'Ref'
      );

      expect(prompt).toContain('══ EXEMPLO 1 ══');
      expect(prompt).toContain('Primeiro exemplo');
      expect(prompt).toContain('══ EXEMPLO 2 ══');
      expect(prompt).toContain('Segundo exemplo');
      expect(prompt).toContain('══ EXEMPLO 3 ══');
      expect(prompt).toContain('Terceiro exemplo');
    });

    it('snapshot: estrutura completa do meta-prompt para modeloDispositivo', () => {
      const prompt = buildMetaPrompt(
        'modeloDispositivo',
        ['Exemplo de dispositivo do juiz'],
        'Prompt de referência do sistema'
      );
      expect(prompt).toMatchSnapshot();
    });

    it('snapshot: estrutura completa do meta-prompt para modeloRelatorio', () => {
      const prompt = buildMetaPrompt(
        'modeloRelatorio',
        ['Exemplo de mini-relatório'],
        'Prompt de referência do sistema'
      );
      expect(prompt).toMatchSnapshot();
    });
  });

  describe('FIELD_LABELS', () => {
    it('deve ter label correto para modeloRelatorio', () => {
      expect(FIELD_LABELS.modeloRelatorio).toBe('Mini-Relatório');
    });

    it('deve ter label correto para modeloDispositivo', () => {
      expect(FIELD_LABELS.modeloDispositivo).toBe('Dispositivo');
    });

    it('deve ter label correto para modeloTopicoRelatorio', () => {
      expect(FIELD_LABELS.modeloTopicoRelatorio).toBe('Relatório Processual');
    });

    it('deve ter labels para todos os campos do tipo TargetField', () => {
      const fields: TargetField[] = ['modeloRelatorio', 'modeloDispositivo', 'modeloTopicoRelatorio'];

      for (const field of fields) {
        expect(FIELD_LABELS[field]).toBeDefined();
        expect(typeof FIELD_LABELS[field]).toBe('string');
        expect(FIELD_LABELS[field].length).toBeGreaterThan(0);
      }
    });
  });
});
