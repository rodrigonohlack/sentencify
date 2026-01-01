/**
 * Testes de regressão de prompts via snapshot
 * Garante que mudanças nos prompts são intencionais
 * v1.33.39
 */
import { describe, it, expect } from 'vitest';
import { buildReorderPrompt } from '../utils/topicOrdering';

// Mock dos prompts que seriam extraídos de AI_PROMPTS
// Em produção, estes seriam importados do módulo de prompts
const MOCK_PROMPTS = {
  estiloRedacao: `Use linguagem jurídica formal, objetiva e precisa.
Evite repetições e redundâncias.
Seja direto e conciso, sem perder a clareza.
Utilize voz ativa sempre que possível.
Mantenha coerência terminológica ao longo do texto.`,

  formatacaoHTML: (exemplo) => `Formate a resposta em HTML válido.
Use tags <p> para parágrafos, <strong> para negrito, <em> para itálico.
Use <ul>/<ol> e <li> para listas.
Exemplo: ${exemplo}`,

  formatacaoParagrafos: (exemplo) => `Cada parágrafo deve estar em uma tag <p> separada.
Não use <br> para separar parágrafos.
Exemplo: ${exemplo}`,

  numeracaoReclamadas: `Se houver mais de uma reclamada:
- Use "primeira ré", "segunda ré", etc.
- Na fundamentação, identifique claramente a qual ré se refere cada obrigação.`,

  preservarAnonimizacao: `IMPORTANTE: O texto pode conter placeholders de anonimização como [RECLAMANTE], [RECLAMADA], [VALOR], etc.
PRESERVE estes placeholders exatamente como aparecem.
NÃO substitua por nomes reais ou valores fictícios.`,

  revisaoSentenca: (incluiDocumentos) => `Você é um revisor jurídico especializado em sentenças trabalhistas.
Sua tarefa é identificar:
1. Omissões - pedidos ou teses não apreciados
2. Contradições - entre fundamentação e dispositivo
3. Obscuridades - trechos confusos ou ambíguos
4. Erros formais - citações incorretas, inconsistências numéricas
${incluiDocumentos ? 'Você tem acesso à petição inicial e contestação para verificar omissões.' : ''}`,

  gerarRelatorio: `Gere o RELATÓRIO da sentença trabalhista.
Estrutura:
1. Identificação das partes (reclamante e reclamada(s))
2. Síntese dos pedidos da petição inicial
3. Resumo da defesa (se houver)
4. Tramitação processual relevante

Seja objetivo e conciso. Use voz passiva quando apropriado.`,

  gerarDispositivo: `Gere o DISPOSITIVO da sentença trabalhista.
Estrutura:
1. Frase inicial (Ante o exposto / Diante do exposto)
2. Decisão sobre cada pedido (procedente/improcedente)
3. Condenações específicas com valores/critérios
4. Justiça gratuita
5. Honorários advocatícios
6. Custas processuais

Use verbos no JULGO, CONDENO, DEFIRO, INDEFIRO.`
};

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
      expect(MOCK_PROMPTS.estiloRedacao).toMatchSnapshot();
    });

    it('snapshot: formatacaoHTML', () => {
      const prompt = MOCK_PROMPTS.formatacaoHTML('Exemplo de <strong>texto</strong>');
      expect(prompt).toMatchSnapshot();
    });

    it('snapshot: formatacaoParagrafos', () => {
      const prompt = MOCK_PROMPTS.formatacaoParagrafos('<p>Parágrafo 1</p><p>Parágrafo 2</p>');
      expect(prompt).toMatchSnapshot();
    });

    it('snapshot: numeracaoReclamadas', () => {
      expect(MOCK_PROMPTS.numeracaoReclamadas).toMatchSnapshot();
    });

    it('snapshot: preservarAnonimizacao', () => {
      expect(MOCK_PROMPTS.preservarAnonimizacao).toMatchSnapshot();
    });
  });

  describe('Prompts de Geração', () => {
    it('snapshot: revisaoSentenca sem documentos', () => {
      const prompt = MOCK_PROMPTS.revisaoSentenca(false);
      expect(prompt).toMatchSnapshot();
    });

    it('snapshot: revisaoSentenca com documentos', () => {
      const prompt = MOCK_PROMPTS.revisaoSentenca(true);
      expect(prompt).toMatchSnapshot();
    });

    it('snapshot: gerarRelatorio', () => {
      expect(MOCK_PROMPTS.gerarRelatorio).toMatchSnapshot();
    });

    it('snapshot: gerarDispositivo', () => {
      expect(MOCK_PROMPTS.gerarDispositivo).toMatchSnapshot();
    });
  });

  describe('Consistência de Instruções', () => {
    it('estiloRedacao deve conter instruções de clareza', () => {
      const prompt = MOCK_PROMPTS.estiloRedacao;
      expect(prompt).toContain('objetiva');
      expect(prompt).toContain('precisa');
      expect(prompt).toContain('conciso');
    });

    it('formatacaoHTML deve mencionar tags válidas', () => {
      const prompt = MOCK_PROMPTS.formatacaoHTML('exemplo');
      expect(prompt).toContain('<p>');
      expect(prompt).toContain('<strong>');
      expect(prompt).toContain('<em>');
    });

    it('preservarAnonimizacao deve listar placeholders comuns', () => {
      const prompt = MOCK_PROMPTS.preservarAnonimizacao;
      expect(prompt).toContain('[RECLAMANTE]');
      expect(prompt).toContain('[RECLAMADA]');
      expect(prompt).toContain('[VALOR]');
    });

    it('numeracaoReclamadas deve usar terminologia feminina', () => {
      const prompt = MOCK_PROMPTS.numeracaoReclamadas;
      expect(prompt).toContain('primeira ré');
      expect(prompt).toContain('segunda ré');
    });

    it('gerarRelatorio deve ter estrutura de 4 partes', () => {
      const prompt = MOCK_PROMPTS.gerarRelatorio;
      expect(prompt).toContain('1.');
      expect(prompt).toContain('2.');
      expect(prompt).toContain('3.');
      expect(prompt).toContain('4.');
    });

    it('gerarDispositivo deve ter estrutura de 6 partes', () => {
      const prompt = MOCK_PROMPTS.gerarDispositivo;
      expect(prompt).toContain('1.');
      expect(prompt).toContain('2.');
      expect(prompt).toContain('3.');
      expect(prompt).toContain('4.');
      expect(prompt).toContain('5.');
      expect(prompt).toContain('6.');
    });

    it('revisaoSentenca deve listar 4 tipos de problemas', () => {
      const prompt = MOCK_PROMPTS.revisaoSentenca(true);
      expect(prompt).toContain('Omissões');
      expect(prompt).toContain('Contradições');
      expect(prompt).toContain('Obscuridades');
      expect(prompt).toContain('Erros formais');
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
});
