/**
 * Testes para meta-prompts (geração automática de prompts personalizados)
 * v1.35.76: Criado junto com refatoração de AI_INSTRUCTIONS modular
 * v1.35.77: Adiciona testes para buildStyleMetaPrompt (extração de estilo)
 */
import { describe, it, expect } from 'vitest';
import { buildMetaPrompt, buildStyleMetaPrompt, FIELD_LABELS, TargetField } from './meta-prompts';

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

    it('deve ter label correto para estiloRedacao', () => {
      expect(FIELD_LABELS.estiloRedacao).toBe('Estilo de Redação');
    });

    it('deve ter labels para todos os campos do tipo TargetField', () => {
      const fields: TargetField[] = ['modeloRelatorio', 'modeloDispositivo', 'modeloTopicoRelatorio', 'estiloRedacao'];

      for (const field of fields) {
        expect(FIELD_LABELS[field]).toBeDefined();
        expect(typeof FIELD_LABELS[field]).toBe('string');
        expect(FIELD_LABELS[field].length).toBeGreaterThan(0);
      }
    });
  });

  // v1.35.77: Testes para buildStyleMetaPrompt (extração de ESTILO, não estrutura)
  describe('buildStyleMetaPrompt', () => {
    it('deve gerar prompt com exemplos formatados', () => {
      const prompt = buildStyleMetaPrompt(
        ['Exemplo 1', 'Exemplo 2'],
        'Estilo de referência'
      );

      expect(prompt).toContain('══ EXEMPLO 1 ══');
      expect(prompt).toContain('══ EXEMPLO 2 ══');
      expect(prompt).toContain('Exemplo 1');
      expect(prompt).toContain('Exemplo 2');
    });

    it('deve focar em ESTILO, não em estrutura', () => {
      const prompt = buildStyleMetaPrompt(['Ex'], 'Ref');

      // Deve mencionar aspectos de ESTILO
      expect(prompt).toContain('TOM');
      expect(prompt).toContain('VOCABULÁRIO');
      expect(prompt).toContain('CONECTIVOS');
      expect(prompt).toContain('RITMO');

      // Deve ter aviso explícito de foco em estilo
      expect(prompt).toContain('FOCO EXCLUSIVO EM ESTILO');
      expect(prompt).toContain('não em estrutura');
    });

    it('deve incluir estilo de referência', () => {
      const styleRef = 'Este é o estilo de referência do sistema';
      const prompt = buildStyleMetaPrompt(['Ex'], styleRef);

      expect(prompt).toContain(styleRef);
      expect(prompt).toContain('ESTILO DE REFERÊNCIA');
    });

    it('deve conter seções de análise específicas de estilo', () => {
      const prompt = buildStyleMetaPrompt(['Ex'], 'Ref');

      expect(prompt).toContain('TOM GERAL');
      expect(prompt).toContain('VOCABULÁRIO CARACTERÍSTICO');
      expect(prompt).toContain('ESTRUTURA DAS FRASES');
      expect(prompt).toContain('PADRÕES DE FUNDAMENTAÇÃO');
    });

    it('deve instruir sobre formato de resposta focado em estilo', () => {
      const prompt = buildStyleMetaPrompt(['Ex'], 'Ref');

      expect(prompt).toContain('FORMATO DA RESPOSTA');
      expect(prompt).toContain('CONECTIVOS E EXPRESSÕES');
      expect(prompt).toContain('RITMO textual');
      expect(prompt).toContain('EXEMPLOS de frases');
      expect(prompt).toContain('APENAS com o prompt de estilo');
    });

    it('deve mencionar aspectos linguísticos específicos', () => {
      const prompt = buildStyleMetaPrompt(['Ex'], 'Ref');

      // Aspectos linguísticos que diferem de estrutura
      expect(prompt).toContain('PESSOA'); // 1ª pessoa, impessoal, etc.
      expect(prompt).toContain('ADJETIVAÇÃO');
      expect(prompt).toContain('latinismos');
      expect(prompt).toContain('autoridade');
    });

    it('deve formatar múltiplos exemplos corretamente', () => {
      const prompt = buildStyleMetaPrompt(
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

    it('snapshot: estrutura completa do meta-prompt para estiloRedacao', () => {
      const prompt = buildStyleMetaPrompt(
        ['Exemplo de sentença trabalhista do juiz'],
        'Estilo de referência do sistema'
      );
      expect(prompt).toMatchSnapshot();
    });
  });
});
