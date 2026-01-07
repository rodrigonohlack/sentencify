/**
 * Testes de regressão de prompts via snapshot
 * Garante que mudanças nos prompts são intencionais
 * v1.35.27: Corrigido para usar AI_PROMPTS real (não mais mocks)
 * v1.35.76: Adiciona testes para AI_INSTRUCTIONS modular (CORE, STYLE, SAFETY)
 */
import { describe, it, expect } from 'vitest';
import { buildReorderPrompt } from '../utils/topicOrdering';
import { AI_PROMPTS } from './ai-prompts.js';
import {
  AI_INSTRUCTIONS,
  AI_INSTRUCTIONS_CORE,
  AI_INSTRUCTIONS_STYLE,
  AI_INSTRUCTIONS_SAFETY
} from './system.js';

describe('Prompts - Snapshot Tests', () => {
  describe('Prompt de Ordenação (reorderTopicsViaLLM)', () => {
    it('deve manter estrutura consistente do prompt de ordenação', () => {
      const topics = [
        { title: 'HORAS EXTRAS', category: 'Mérito' },
        { title: 'PRESCRIÇÃO', category: 'Prejudicial' },
        { title: 'INCOMPETÊNCIA', category: 'Preliminar' }
      ];

      const prompt = buildReorderPrompt(topics);

      // Verificar estrutura esperada (não snapshot exato, mas estrutura)
      expect(prompt).toContain('ORDEM PROCESSUAL:');
      expect(prompt).toContain('1. RELATÓRIO');
      expect(prompt).toContain('2. TRAMITAÇÃO');
      expect(prompt).toContain('3. IMPUGNAÇÃO AOS DOCUMENTOS');
      expect(prompt).toContain('4. PRELIMINARES');
      expect(prompt).toContain('Art. 337 CPC');
      expect(prompt).toContain('5. PREJUDICIAIS');
      expect(prompt).toContain('6. MÉRITO');
      expect(prompt).toContain('6a.');
      expect(prompt).toContain('6b.');
      expect(prompt).toContain('6c.');
      expect(prompt).toContain('6d.');
      expect(prompt).toContain('6e.');
      expect(prompt).toContain('6f.');
      expect(prompt).toContain('7. QUESTÕES FINAIS');
      expect(prompt).toContain('TÓPICOS A ORDENAR:');
      expect(prompt).toContain('{"order": [1, 3, 2, ...]}');
    });

    it('snapshot: prompt completo de ordenação', () => {
      const topics = [
        { title: 'TESTE', category: 'Mérito' }
      ];

      const prompt = buildReorderPrompt(topics);
      expect(prompt).toMatchSnapshot();
    });
  });

  describe('Prompts de Estilo e Formatação', () => {
    it('snapshot: estiloRedacao', () => {
      expect(AI_PROMPTS.estiloRedacao).toMatchSnapshot();
    });

    it('snapshot: formatacaoHTML', () => {
      const prompt = AI_PROMPTS.formatacaoHTML('Exemplo de <strong>texto</strong>');
      expect(prompt).toMatchSnapshot();
    });

    it('snapshot: formatacaoParagrafos', () => {
      const prompt = AI_PROMPTS.formatacaoParagrafos('<p>Parágrafo 1</p><p>Parágrafo 2</p>');
      expect(prompt).toMatchSnapshot();
    });

    it('snapshot: numeracaoReclamadas', () => {
      expect(AI_PROMPTS.numeracaoReclamadas).toMatchSnapshot();
    });

    it('snapshot: preservarAnonimizacao', () => {
      expect(AI_PROMPTS.preservarAnonimizacao).toMatchSnapshot();
    });

    it('snapshot: proibicaoMetaComentarios', () => {
      expect(AI_PROMPTS.proibicaoMetaComentarios).toMatchSnapshot();
    });
  });

  describe('Prompts de Geração', () => {
    it('snapshot: revisaoSentenca sem documentos', () => {
      const prompt = AI_PROMPTS.revisaoSentenca(false);
      expect(prompt).toMatchSnapshot();
    });

    it('snapshot: revisaoSentenca com documentos', () => {
      const prompt = AI_PROMPTS.revisaoSentenca(true);
      expect(prompt).toMatchSnapshot();
    });

    it('snapshot: instrucoesRelatorioPadrao', () => {
      expect(AI_PROMPTS.instrucoesRelatorioPadrao).toMatchSnapshot();
    });

    it('snapshot: instrucoesDispositivoPadrao', () => {
      expect(AI_PROMPTS.instrucoesDispositivoPadrao).toMatchSnapshot();
    });
  });

  describe('Consistência de Instruções', () => {
    it('estiloRedacao deve conter instruções de qualidade', () => {
      const prompt = AI_PROMPTS.estiloRedacao;
      expect(prompt).toContain('ESTILO DE REDAÇÃO');
      expect(prompt).toContain('QUALIDADE');
    });

    it('formatacaoHTML deve mencionar tags válidas', () => {
      const prompt = AI_PROMPTS.formatacaoHTML('exemplo');
      expect(prompt).toContain('<p>');
      expect(prompt).toContain('<strong>');
    });

    it('preservarAnonimizacao deve mencionar placeholders', () => {
      const prompt = AI_PROMPTS.preservarAnonimizacao;
      expect(prompt).toContain('ANONIMIZAÇÃO');
      expect(prompt).toContain('placeholder');
    });

    it('numeracaoReclamadas deve usar terminologia correta', () => {
      const prompt = AI_PROMPTS.numeracaoReclamadas;
      expect(prompt).toContain('RECLAMADAS');
      expect(prompt).toContain('primeira');
    });

    it('instrucoesRelatorioPadrao deve ter estrutura de relatório', () => {
      const prompt = AI_PROMPTS.instrucoesRelatorioPadrao;
      expect(prompt).toContain('RELATÓRIO');
      expect(prompt).toContain('sentença');
    });

    it('instrucoesDispositivoPadrao deve ter estrutura de dispositivo', () => {
      const prompt = AI_PROMPTS.instrucoesDispositivoPadrao;
      expect(prompt).toContain('DISPOSITIVO');
      expect(prompt).toContain('sentença');
    });

    it('revisaoSentenca deve listar tipos de problemas', () => {
      const prompt = AI_PROMPTS.revisaoSentenca(true);
      expect(prompt).toContain('OMISSÃO');
      expect(prompt).toContain('CONTRADIÇÃO');
      expect(prompt).toContain('OBSCURIDADE');
    });
  });

  describe('Ordenação - Regras de Negócio', () => {
    it('preliminares devem seguir Art. 337 CPC', () => {
      const topics = [{ title: 'TESTE', category: 'Preliminar' }];
      const prompt = buildReorderPrompt(topics);

      // Verificar ordem das preliminares conforme Art. 337
      const preliminaresSection = prompt.match(/4\. PRELIMINARES.*?(?=5\.)/s)?.[0] || '';

      expect(preliminaresSection).toContain('citação');
      expect(preliminaresSection).toContain('incompetência');
      expect(preliminaresSection).toContain('valor');
      expect(preliminaresSection).toContain('inépcia');
      expect(preliminaresSection).toContain('perempção');
      expect(preliminaresSection).toContain('litispendência');
      expect(preliminaresSection).toContain('coisa julgada');
      expect(preliminaresSection).toContain('conexão');
      expect(preliminaresSection).toContain('representação');
      expect(preliminaresSection).toContain('arbitragem');
      expect(preliminaresSection).toContain('legitimidade');
      expect(preliminaresSection).toContain('caução');
      expect(preliminaresSection).toContain('gratuidade');
    });

    it('mérito deve seguir ordem lógica (causa > obrigação > efeito)', () => {
      const topics = [{ title: 'TESTE', category: 'Mérito' }];
      const prompt = buildReorderPrompt(topics);

      // Verificar ordem do mérito
      const meritoSection = prompt.match(/6\. MÉRITO.*?(?=7\.)/s)?.[0] || '';

      // 6a antes de 6b
      const idx6a = meritoSection.indexOf('6a.');
      const idx6b = meritoSection.indexOf('6b.');
      expect(idx6a).toBeLessThan(idx6b);

      // 6d (responsabilidade) vem APÓS condenatórios
      expect(meritoSection).toContain('APÓS definir o que é devido');

      // 6e (gratuidade) vem ANTES de honorários
      expect(meritoSection).toContain('ANTES de honorários');

      // 6f (honorários) é ÚLTIMO
      expect(meritoSection).toContain('ÚLTIMO do mérito');
    });

    it('prompt deve solicitar resposta em JSON', () => {
      const topics = [{ title: 'TESTE', category: 'Mérito' }];
      const prompt = buildReorderPrompt(topics);

      expect(prompt).toContain('{"order":');
      expect(prompt).toContain('APENAS com JSON');
      expect(prompt).toContain('números originais');
    });
  });

  // v1.35.76: Testes para AI_INSTRUCTIONS modular
  describe('AI_INSTRUCTIONS Modular', () => {
    it('concatenação das 3 partes deve ser EXATAMENTE igual ao AI_INSTRUCTIONS', () => {
      const reconstructed = `${AI_INSTRUCTIONS_CORE}

${AI_INSTRUCTIONS_STYLE}

${AI_INSTRUCTIONS_SAFETY}`;

      expect(reconstructed).toBe(AI_INSTRUCTIONS);
    });

    it('CORE não deve conter instruções de estilo substituíveis', () => {
      expect(AI_INSTRUCTIONS_CORE).not.toContain('Evite latinismos');
      expect(AI_INSTRUCTIONS_CORE).not.toContain('FLUIDEZ E COESÃO');
      expect(AI_INSTRUCTIONS_CORE).not.toContain('PROSA CORRIDA');
      expect(AI_INSTRUCTIONS_CORE).not.toContain('Evite adjetivações');
    });

    it('CORE deve conter persona, metodologia e princípios', () => {
      expect(AI_INSTRUCTIONS_CORE).toContain('assistente de juiz do trabalho');
      expect(AI_INSTRUCTIONS_CORE).toContain('Formação e Expertise');
      expect(AI_INSTRUCTIONS_CORE).toContain('Metodologia de Análise');
      expect(AI_INSTRUCTIONS_CORE).toContain('Princípios de Atuação');
      expect(AI_INSTRUCTIONS_CORE).toContain('Formato das Respostas');
    });

    it('STYLE deve conter todas as instruções de redação', () => {
      expect(AI_INSTRUCTIONS_STYLE).toContain('Estilo de Comunicação');
      expect(AI_INSTRUCTIONS_STYLE).toContain('EXIGÊNCIAS DE QUALIDADE TEXTUAL');
      expect(AI_INSTRUCTIONS_STYLE).toContain('FLUIDEZ E COESÃO');
      expect(AI_INSTRUCTIONS_STYLE).toContain('RITMO E CONTINUIDADE');
      expect(AI_INSTRUCTIONS_STYLE).toContain('COERÊNCIA');
      expect(AI_INSTRUCTIONS_STYLE).toContain('FORMATO NARRATIVO CONTÍNUO');
      expect(AI_INSTRUCTIONS_STYLE).toContain('DIDÁTICA E CLAREZA');
    });

    it('SAFETY deve conter proibições e anonimização', () => {
      expect(AI_INSTRUCTIONS_SAFETY).toContain('PROIBIÇÕES ABSOLUTAS');
      expect(AI_INSTRUCTIONS_SAFETY).toContain('ANONIMIZAÇÃO DE DADOS');
      expect(AI_INSTRUCTIONS_SAFETY).toContain('[PESSOA 1]');
      expect(AI_INSTRUCTIONS_SAFETY).toContain('[PESSOA 2]');
      expect(AI_INSTRUCTIONS_SAFETY).toContain('[VALOR]');
      expect(AI_INSTRUCTIONS_SAFETY).toContain('revise-a e identifique se houve alucinação');
    });

    it('snapshot: AI_INSTRUCTIONS completo (detectar mudanças acidentais)', () => {
      expect(AI_INSTRUCTIONS).toMatchSnapshot();
    });

    it('snapshot: AI_INSTRUCTIONS_CORE', () => {
      expect(AI_INSTRUCTIONS_CORE).toMatchSnapshot();
    });

    it('snapshot: AI_INSTRUCTIONS_STYLE', () => {
      expect(AI_INSTRUCTIONS_STYLE).toMatchSnapshot();
    });

    it('snapshot: AI_INSTRUCTIONS_SAFETY', () => {
      expect(AI_INSTRUCTIONS_SAFETY).toMatchSnapshot();
    });
  });
});
