/**
 * Testes de integração para ordenação de tópicos via IA
 * v1.33.38
 */
import { describe, it, expect } from 'vitest';
import {
  extractOrderFromResponse,
  reorderByIndices,
  buildReorderPrompt
} from '../utils/topicOrdering';

describe('topicOrdering', () => {
  // Fixtures de tópicos para testes
  const mockTopics = [
    { title: 'HORAS EXTRAS', category: 'Mérito' },
    { title: 'RELATÓRIO', category: 'Relatório' },
    { title: 'PRESCRIÇÃO', category: 'Prejudicial' },
    { title: 'INCOMPETÊNCIA', category: 'Preliminar' },
    { title: 'RESPONSABILIDADE SUBSIDIÁRIA', category: 'Mérito' },
    { title: 'HONORÁRIOS ADVOCATÍCIOS', category: 'Mérito' },
  ];

  describe('extractOrderFromResponse', () => {
    it('deve extrair JSON simples de resposta pura', () => {
      const response = '{"order": [2, 4, 3, 1, 5, 6]}';
      const result = extractOrderFromResponse(response);
      expect(result).toEqual({ order: [2, 4, 3, 1, 5, 6] });
    });

    it('deve extrair JSON de bloco markdown ```json```', () => {
      const response = `Aqui está a ordenação:

\`\`\`json
{"order": [2, 4, 3, 1, 5, 6]}
\`\`\`

Ordenei seguindo a ordem processual.`;
      const result = extractOrderFromResponse(response);
      expect(result).toEqual({ order: [2, 4, 3, 1, 5, 6] });
    });

    it('deve extrair JSON com newlines internas', () => {
      const response = `{
  "order": [
    2,
    4,
    3,
    1,
    5,
    6
  ]
}`;
      const result = extractOrderFromResponse(response);
      expect(result).toEqual({ order: [2, 4, 3, 1, 5, 6] });
    });

    it('deve extrair JSON mesmo com thinking tokens antes', () => {
      const response = `<thinking>
Analisando os tópicos, a ordem processual correta seria:
1. Relatório primeiro (sempre)
2. Preliminares antes de prejudiciais
3. Prejudiciais antes do mérito
4. Mérito na ordem lógica
</thinking>

{"order": [2, 4, 3, 1, 5, 6]}`;
      const result = extractOrderFromResponse(response);
      expect(result).toEqual({ order: [2, 4, 3, 1, 5, 6] });
    });

    it('deve retornar null para resposta sem JSON', () => {
      const response = 'A ordem correta seria: 2, 4, 3, 1, 5, 6';
      const result = extractOrderFromResponse(response);
      expect(result).toBeNull();
    });

    it('deve retornar null para JSON malformado', () => {
      const response = '{"order": [2, 4, 3, 1, 5, 6}'; // falta ]
      const result = extractOrderFromResponse(response);
      expect(result).toBeNull();
    });

    it('deve retornar null para resposta vazia', () => {
      expect(extractOrderFromResponse('')).toBeNull();
      expect(extractOrderFromResponse(null)).toBeNull();
      expect(extractOrderFromResponse(undefined)).toBeNull();
    });

    it('deve extrair JSON sem bloco markdown (código genérico)', () => {
      const response = `Baseado na ordem processual, sugiro:

{"order": [2, 4, 3, 1, 5, 6]}

Esta ordem segue Art. 337 CPC.`;
      const result = extractOrderFromResponse(response);
      expect(result).toEqual({ order: [2, 4, 3, 1, 5, 6] });
    });
  });

  describe('reorderByIndices', () => {
    it('deve reordenar tópicos corretamente com índices', () => {
      const parsed = { order: [2, 4, 3, 1, 5, 6] };
      const result = reorderByIndices(mockTopics, parsed);

      expect(result[0].title).toBe('RELATÓRIO');
      expect(result[1].title).toBe('INCOMPETÊNCIA');
      expect(result[2].title).toBe('PRESCRIÇÃO');
      expect(result[3].title).toBe('HORAS EXTRAS');
      expect(result[4].title).toBe('RESPONSABILIDADE SUBSIDIÁRIA');
      expect(result[5].title).toBe('HONORÁRIOS ADVOCATÍCIOS');
    });

    it('deve manter ordem original se parsed é null', () => {
      const result = reorderByIndices(mockTopics, null);
      expect(result).toEqual(mockTopics);
    });

    it('deve manter ordem original se parsed.order não existe', () => {
      const result = reorderByIndices(mockTopics, { foo: 'bar' });
      expect(result).toEqual(mockTopics);
    });

    it('deve adicionar tópicos não mapeados ao final', () => {
      const parsed = { order: [2, 4] }; // só 2 dos 6
      const result = reorderByIndices(mockTopics, parsed);

      expect(result.length).toBe(6);
      expect(result[0].title).toBe('RELATÓRIO');
      expect(result[1].title).toBe('INCOMPETÊNCIA');
      // Os outros 4 são adicionados ao final na ordem original
      expect(result.slice(2).map(t => t.title)).toContain('HORAS EXTRAS');
    });

    it('deve ignorar índices inválidos', () => {
      const parsed = { order: [2, 99, 4] }; // 99 não existe
      const result = reorderByIndices(mockTopics, parsed);

      expect(result[0].title).toBe('RELATÓRIO');
      expect(result[1].title).toBe('INCOMPETÊNCIA');
      expect(result.length).toBe(6); // todos são incluídos
    });

    it('deve suportar formato antigo com orderedTitles', () => {
      const parsed = { orderedTitles: ['RELATÓRIO', 'INCOMPETÊNCIA', 'PRESCRIÇÃO'] };
      const result = reorderByIndices(mockTopics, parsed);

      expect(result[0].title).toBe('RELATÓRIO');
      expect(result[1].title).toBe('INCOMPETÊNCIA');
      expect(result[2].title).toBe('PRESCRIÇÃO');
    });

    it('deve ser case-insensitive para orderedTitles', () => {
      const parsed = { orderedTitles: ['relatório', 'INCOMPETÊNCIA'] };
      const result = reorderByIndices(mockTopics, parsed);

      expect(result[0].title).toBe('RELATÓRIO');
      expect(result[1].title).toBe('INCOMPETÊNCIA');
    });

    it('deve retornar array vazio para topics null', () => {
      const result = reorderByIndices(null, { order: [1, 2] });
      expect(result).toEqual([]);
    });
  });

  describe('buildReorderPrompt', () => {
    it('deve incluir todos os tópicos numerados', () => {
      const prompt = buildReorderPrompt(mockTopics);

      expect(prompt).toContain('1. "HORAS EXTRAS" (Mérito)');
      expect(prompt).toContain('2. "RELATÓRIO" (Relatório)');
      expect(prompt).toContain('3. "PRESCRIÇÃO" (Prejudicial)');
      expect(prompt).toContain('4. "INCOMPETÊNCIA" (Preliminar)');
    });

    it('deve incluir a ordem do Art. 337 CPC', () => {
      const prompt = buildReorderPrompt(mockTopics);

      expect(prompt).toContain('Art. 337 CPC');
      expect(prompt).toContain('citação → incompetência');
      expect(prompt).toContain('litispendência → coisa julgada');
    });

    it('deve incluir instruções de formato JSON', () => {
      const prompt = buildReorderPrompt(mockTopics);

      expect(prompt).toContain('{"order": [1, 3, 2, ...]}');
      expect(prompt).toContain('APENAS com JSON');
    });

    it('deve incluir ordem do mérito (6a-6f)', () => {
      const prompt = buildReorderPrompt(mockTopics);

      expect(prompt).toContain('6a. Declaratórios/Constitutivos');
      expect(prompt).toContain('6b. Obrigações de fazer');
      expect(prompt).toContain('6c. Condenatórios');
      expect(prompt).toContain('6d. Responsabilidade');
      expect(prompt).toContain('6e. Justiça Gratuita');
      expect(prompt).toContain('6f. Honorários');
    });
  });

  describe('Cenários de integração completos', () => {
    it('deve processar fluxo completo: resposta IA → parsing → reordenação', () => {
      // Simula resposta típica de Claude/Gemini
      const iaResponse = `Analisando os tópicos fornecidos, seguindo a ordem processual trabalhista:

\`\`\`json
{"order": [2, 4, 3, 1, 5, 6]}
\`\`\`

Esta ordem respeita:
1. Relatório primeiro
2. Preliminares (incompetência)
3. Prejudiciais (prescrição)
4. Mérito (horas extras, responsabilidade, honorários)`;

      const parsed = extractOrderFromResponse(iaResponse);
      expect(parsed).not.toBeNull();

      const ordered = reorderByIndices(mockTopics, parsed);

      // Verificar ordem processual correta
      expect(ordered[0].title).toBe('RELATÓRIO');
      expect(ordered[1].title).toBe('INCOMPETÊNCIA'); // Preliminar
      expect(ordered[2].title).toBe('PRESCRIÇÃO'); // Prejudicial
      expect(ordered[3].title).toBe('HORAS EXTRAS'); // Mérito
      expect(ordered[4].title).toBe('RESPONSABILIDADE SUBSIDIÁRIA'); // Mérito (após condenatórios)
      expect(ordered[5].title).toBe('HONORÁRIOS ADVOCATÍCIOS'); // Último do mérito
    });

    it('deve manter ordem original quando IA retorna resposta inválida', () => {
      const iaResponse = 'Não consegui processar a ordenação.';

      const parsed = extractOrderFromResponse(iaResponse);
      expect(parsed).toBeNull();

      const ordered = reorderByIndices(mockTopics, parsed);
      expect(ordered).toEqual(mockTopics); // Ordem original mantida
    });

    it('deve processar resposta com newlines no JSON', () => {
      const iaResponse = `{
        "order": [
          2,
          4,
          3,
          1,
          5,
          6
        ]
      }`;

      const parsed = extractOrderFromResponse(iaResponse);
      expect(parsed).toEqual({ order: [2, 4, 3, 1, 5, 6] });
    });
  });
});
