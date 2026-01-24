import { describe, it, expect } from 'vitest';
import {
  extractOrderFromResponse,
  reorderByIndices,
  buildReorderPrompt,
  TopicForOrdering,
} from './topicOrdering';

describe('extractOrderFromResponse', () => {
  it('should return null for null/undefined input', () => {
    expect(extractOrderFromResponse(null)).toBeNull();
    expect(extractOrderFromResponse(undefined)).toBeNull();
    expect(extractOrderFromResponse('')).toBeNull();
  });

  it('should extract JSON with order array from pure JSON', () => {
    const result = extractOrderFromResponse('{"order": [3, 1, 2]}');
    expect(result).toEqual({ order: [3, 1, 2] });
  });

  it('should extract order from JSON with whitespace/newlines', () => {
    const input = `{
      "order": [
        5,
        3,
        1,
        4,
        2
      ]
    }`;
    const result = extractOrderFromResponse(input);
    expect(result).toEqual({ order: [5, 3, 1, 4, 2] });
  });

  it('should extract from markdown ```json``` block', () => {
    const input = `Aqui está a ordenação:

\`\`\`json
{"order": [2, 1, 3]}
\`\`\`

Espero ter ajudado!`;
    const result = extractOrderFromResponse(input);
    expect(result).toEqual({ order: [2, 1, 3] });
  });

  it('should extract from markdown ``` block without json tag', () => {
    const input = `\`\`\`
{"order": [4, 2, 3, 1]}
\`\`\``;
    const result = extractOrderFromResponse(input);
    expect(result).toEqual({ order: [4, 2, 3, 1] });
  });

  it('should extract JSON embedded in surrounding text', () => {
    const input = 'A ordem correta é: {"order": [1, 3, 2]} conforme análise.';
    const result = extractOrderFromResponse(input);
    expect(result).toEqual({ order: [1, 3, 2] });
  });

  it('should return null for invalid JSON', () => {
    const result = extractOrderFromResponse('{"order": [1, 2, invalid]}');
    expect(result).toBeNull();
  });

  it('should return null for text without order pattern', () => {
    const result = extractOrderFromResponse('Nenhuma ordenação possível.');
    expect(result).toBeNull();
  });

  it('should handle response with thinking tokens before JSON', () => {
    const input = `<think>Preciso analisar os tópicos...</think>
{"order": [2, 4, 1, 3]}`;
    const result = extractOrderFromResponse(input);
    expect(result).toEqual({ order: [2, 4, 1, 3] });
  });
});

describe('reorderByIndices', () => {
  const topics: TopicForOrdering[] = [
    { title: 'Horas Extras', category: 'Mérito' },
    { title: 'Prescrição', category: 'Prejudicial' },
    { title: 'Vínculo', category: 'Mérito' },
  ];

  it('should return empty array for null/undefined topics', () => {
    expect(reorderByIndices(null, { order: [1, 2] })).toEqual([]);
    expect(reorderByIndices(undefined, { order: [1, 2] })).toEqual([]);
  });

  it('should return original topics for null/undefined parsed', () => {
    expect(reorderByIndices(topics, null)).toEqual(topics);
    expect(reorderByIndices(topics, undefined)).toEqual(topics);
  });

  it('should reorder by 1-based indices', () => {
    const result = reorderByIndices(topics, { order: [3, 1, 2] });
    expect(result[0].title).toBe('Vínculo');
    expect(result[1].title).toBe('Horas Extras');
    expect(result[2].title).toBe('Prescrição');
  });

  it('should append unmapped topics at the end', () => {
    // Only maps 2 of 3 topics
    const result = reorderByIndices(topics, { order: [2, 3] });
    expect(result).toHaveLength(3);
    expect(result[0].title).toBe('Prescrição');
    expect(result[1].title).toBe('Vínculo');
    expect(result[2].title).toBe('Horas Extras');
  });

  it('should handle out-of-range indices gracefully', () => {
    const result = reorderByIndices(topics, { order: [1, 99, 2] });
    expect(result).toHaveLength(3);
    expect(result[0].title).toBe('Horas Extras');
    expect(result[1].title).toBe('Prescrição');
    // Vínculo is unmapped, appended at end
    expect(result[2].title).toBe('Vínculo');
  });

  it('should fallback to orderedTitles when order is absent', () => {
    const result = reorderByIndices(topics, {
      orderedTitles: ['VÍNCULO', 'PRESCRIÇÃO', 'HORAS EXTRAS'],
    });
    expect(result[0].title).toBe('Vínculo');
    expect(result[1].title).toBe('Prescrição');
    expect(result[2].title).toBe('Horas Extras');
  });

  it('should handle case-insensitive title matching in orderedTitles', () => {
    const result = reorderByIndices(topics, {
      orderedTitles: ['horas extras', 'vínculo'],
    });
    expect(result[0].title).toBe('Horas Extras');
    expect(result[1].title).toBe('Vínculo');
    expect(result[2].title).toBe('Prescrição');
  });

  it('should return original topics if parsed has neither order nor orderedTitles', () => {
    const result = reorderByIndices(topics, {});
    expect(result).toEqual(topics);
  });
});

describe('buildReorderPrompt', () => {
  it('should generate numbered list of topics', () => {
    const topics: TopicForOrdering[] = [
      { title: 'Horas Extras', category: 'Mérito' },
      { title: 'Prescrição', category: 'Prejudicial' },
    ];
    const prompt = buildReorderPrompt(topics);
    expect(prompt).toContain('1. "Horas Extras" (Mérito)');
    expect(prompt).toContain('2. "Prescrição" (Prejudicial)');
  });

  it('should include instruction for JSON response format', () => {
    const prompt = buildReorderPrompt([{ title: 'Test', category: 'Cat' }]);
    expect(prompt).toContain('{"order": [1, 3, 2, ...]}');
  });

  it('should include ORDEM PROCESSUAL section', () => {
    const prompt = buildReorderPrompt([{ title: 'Test', category: 'Cat' }]);
    expect(prompt).toContain('ORDEM PROCESSUAL');
    expect(prompt).toContain('RELATÓRIO');
    expect(prompt).toContain('PRELIMINARES');
    expect(prompt).toContain('MÉRITO');
  });

  it('should handle empty topics array', () => {
    const prompt = buildReorderPrompt([]);
    expect(prompt).toContain('TÓPICOS A ORDENAR:');
    expect(prompt).toContain('Responda APENAS com JSON');
  });
});
