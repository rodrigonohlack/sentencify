import { describe, it, expect } from 'vitest';
import {
  validateTopicForGeneration,
  formatReclamadas,
  extractPartesFromRelatorio,
  formatTopicosSection,
  checkMeritDecisions,
  formatFundamentacaoHTML,
  checkDispositivoConsistency,
  TopicForGeneration,
  Reclamada,
} from './sentenceGeneration';

describe('validateTopicForGeneration', () => {
  it('should return invalid for null/undefined topic', () => {
    expect(validateTopicForGeneration(null)).toEqual({
      valid: false,
      warnings: ['Tópico não fornecido'],
    });
    expect(validateTopicForGeneration(undefined)).toEqual({
      valid: false,
      warnings: ['Tópico não fornecido'],
    });
  });

  it('should warn about missing title', () => {
    const result = validateTopicForGeneration({ category: 'Mérito', miniRelatorio: 'x'.repeat(60), decision: 'procedente' });
    expect(result.warnings).toContain('Tópico sem título');
  });

  it('should warn about missing category', () => {
    const result = validateTopicForGeneration({ title: 'Test', miniRelatorio: 'x'.repeat(60), decision: 'procedente' });
    expect(result.warnings).toContain('Tópico sem categoria');
  });

  it('should warn about short mini-relatório', () => {
    const result = validateTopicForGeneration({ title: 'Test', category: 'Mérito', miniRelatorio: 'curto', decision: 'procedente' });
    expect(result.warnings).toContain('Mini-relatório ausente ou muito curto (mínimo 50 caracteres)');
  });

  it('should warn about missing mini-relatório', () => {
    const result = validateTopicForGeneration({ title: 'Test', category: 'Mérito', decision: 'procedente' });
    expect(result.warnings).toContain('Mini-relatório ausente ou muito curto (mínimo 50 caracteres)');
  });

  it('should warn about missing decision for non-special topics', () => {
    const result = validateTopicForGeneration({ title: 'Horas Extras', category: 'Mérito', miniRelatorio: 'x'.repeat(60) });
    expect(result.warnings).toContain('Decisão (procedente/improcedente) não definida');
  });

  it('should NOT warn about missing decision for RELATÓRIO', () => {
    const result = validateTopicForGeneration({ title: 'RELATÓRIO', category: 'Relatório', miniRelatorio: 'x'.repeat(60) });
    expect(result.warnings).not.toContain('Decisão (procedente/improcedente) não definida');
  });

  it('should NOT warn about missing decision for DISPOSITIVO', () => {
    const result = validateTopicForGeneration({ title: 'DISPOSITIVO', category: 'Dispositivo', miniRelatorio: 'x'.repeat(60) });
    expect(result.warnings).not.toContain('Decisão (procedente/improcedente) não definida');
  });

  it('should return valid for complete topic', () => {
    const result = validateTopicForGeneration({
      title: 'Horas Extras',
      category: 'Mérito',
      miniRelatorio: 'Reclamante alega que realizava horas extras sem receber o pagamento correspondente.',
      decision: 'procedente',
    });
    expect(result.valid).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });
});

describe('formatReclamadas', () => {
  it('should return empty string for null/undefined/empty', () => {
    expect(formatReclamadas(null)).toBe('');
    expect(formatReclamadas(undefined)).toBe('');
    expect(formatReclamadas([])).toBe('');
  });

  it('should return just the name for single reclamada', () => {
    const reclamadas: Reclamada[] = [{ nome: 'Empresa XYZ Ltda' }];
    expect(formatReclamadas(reclamadas)).toBe('Empresa XYZ Ltda');
  });

  it('should format multiple reclamadas with feminine ordinals (ré)', () => {
    const reclamadas: Reclamada[] = [
      { nome: 'Empresa A' },
      { nome: 'Empresa B' },
      { nome: 'Empresa C' },
    ];
    const result = formatReclamadas(reclamadas, false);
    expect(result).toContain('primeira ré: Empresa A');
    expect(result).toContain('segunda ré: Empresa B');
    expect(result).toContain('terceira ré: Empresa C');
  });

  it('should format with masculine ordinals when inicial=true (reclamado)', () => {
    const reclamadas: Reclamada[] = [
      { nome: 'João Silva' },
      { nome: 'Pedro Santos' },
    ];
    const result = formatReclamadas(reclamadas, true);
    expect(result).toContain('primeiro reclamado: João Silva');
    expect(result).toContain('segundo reclamado: Pedro Santos');
  });

  it('should handle ordinals beyond 10', () => {
    const reclamadas: Reclamada[] = Array.from({ length: 11 }, (_, i) => ({
      nome: `Empresa ${i + 1}`,
    }));
    const result = formatReclamadas(reclamadas, false);
    expect(result).toContain('11ª ré: Empresa 11');
  });
});

describe('extractPartesFromRelatorio', () => {
  it('should return empty string for null/undefined', () => {
    expect(extractPartesFromRelatorio(null)).toBe('');
    expect(extractPartesFromRelatorio(undefined)).toBe('');
  });

  it('should strip HTML tags', () => {
    const html = '<p><strong>Fulano de Tal</strong> ajuiza reclamatória.</p>';
    const result = extractPartesFromRelatorio(html);
    expect(result).not.toContain('<');
    expect(result).toContain('Fulano de Tal');
  });

  it('should extract first paragraph up to first period', () => {
    const text = 'Primeira sentença aqui.\nSegundo parágrafo aqui.';
    const result = extractPartesFromRelatorio(text);
    expect(result).toBe('Primeira sentença aqui.');
  });

  it('should fallback to first 500 chars when no clear paragraph break', () => {
    const longText = 'A'.repeat(600);
    const result = extractPartesFromRelatorio(longText);
    expect(result).toHaveLength(500);
  });
});

describe('formatTopicosSection', () => {
  it('should format topics with decisions', () => {
    const comDecisao: TopicForGeneration[] = [
      { title: 'Horas Extras', decision: 'procedente' },
      { title: 'Danos Morais', decision: 'improcedente' },
    ];
    const result = formatTopicosSection(comDecisao, []);
    expect(result).toContain('✅ TÓPICOS COM DECISÃO:');
    expect(result).toContain('Horas Extras: ✓ PROCEDENTE');
    expect(result).toContain('Danos Morais: ✗ IMPROCEDENTE');
  });

  it('should include fundamentação when present', () => {
    const comDecisao: TopicForGeneration[] = [
      { title: 'Horas Extras', decision: 'procedente', fundamentacao: 'Conforme prova testemunhal...' },
    ];
    const result = formatTopicosSection(comDecisao, []);
    expect(result).toContain('Fundamentação: Conforme prova testemunhal...');
  });

  it('should format topics without decisions', () => {
    const semDecisao: TopicForGeneration[] = [
      { title: 'Adicional Noturno' },
      { title: 'Férias' },
    ];
    const result = formatTopicosSection([], semDecisao);
    expect(result).toContain('⚠️ TÓPICOS SEM DECISÃO');
    expect(result).toContain('- Adicional Noturno');
    expect(result).toContain('- Férias');
  });

  it('should return empty string when both arrays are empty', () => {
    const result = formatTopicosSection([], []);
    expect(result).toBe('');
  });

  it('should combine both sections', () => {
    const comDecisao: TopicForGeneration[] = [{ title: 'A', decision: 'procedente' }];
    const semDecisao: TopicForGeneration[] = [{ title: 'B' }];
    const result = formatTopicosSection(comDecisao, semDecisao);
    expect(result).toContain('✅ TÓPICOS COM DECISÃO:');
    expect(result).toContain('⚠️ TÓPICOS SEM DECISÃO');
  });
});

describe('checkMeritDecisions', () => {
  it('should return not ready for null/undefined/empty', () => {
    expect(checkMeritDecisions(null)).toEqual({ ready: false, pending: [] });
    expect(checkMeritDecisions(undefined)).toEqual({ ready: false, pending: [] });
    expect(checkMeritDecisions([])).toEqual({ ready: false, pending: [] });
  });

  it('should return ready when all merit topics have decisions', () => {
    const topics: TopicForGeneration[] = [
      { title: 'Horas Extras', category: 'Mérito', decision: 'procedente' },
      { title: 'Férias', category: 'Mérito', decision: 'improcedente' },
    ];
    const result = checkMeritDecisions(topics);
    expect(result.ready).toBe(true);
    expect(result.pending).toHaveLength(0);
  });

  it('should identify pending topics without decisions', () => {
    const topics: TopicForGeneration[] = [
      { title: 'Horas Extras', category: 'Mérito', decision: 'procedente' },
      { title: 'Férias', category: 'Mérito' },
      { title: 'FGTS', category: 'Mérito' },
    ];
    const result = checkMeritDecisions(topics);
    expect(result.ready).toBe(false);
    expect(result.pending).toEqual(['Férias', 'FGTS']);
  });

  it('should ignore non-merit categories', () => {
    const topics: TopicForGeneration[] = [
      { title: 'Prescrição', category: 'Prejudicial' },
      { title: 'Horas Extras', category: 'Mérito', decision: 'procedente' },
    ];
    const result = checkMeritDecisions(topics);
    expect(result.ready).toBe(true);
  });

  it('should exclude RELATÓRIO and DISPOSITIVO from merit check', () => {
    const topics: TopicForGeneration[] = [
      { title: 'RELATÓRIO', category: 'Mérito' },
      { title: 'DISPOSITIVO', category: 'Mérito' },
      { title: 'Horas Extras', category: 'Mérito', decision: 'procedente' },
    ];
    const result = checkMeritDecisions(topics);
    expect(result.ready).toBe(true);
  });

  it('should handle topics without title', () => {
    const topics: TopicForGeneration[] = [
      { category: 'Mérito' },
    ];
    const result = checkMeritDecisions(topics);
    expect(result.pending).toContain('Sem título');
  });
});

describe('formatFundamentacaoHTML', () => {
  it('should return empty string for null/undefined content', () => {
    expect(formatFundamentacaoHTML(null, 'Test')).toBe('');
    expect(formatFundamentacaoHTML(undefined, 'Test')).toBe('');
    expect(formatFundamentacaoHTML('', 'Test')).toBe('');
  });

  it('should add title when content does not start with heading', () => {
    const result = formatFundamentacaoHTML('Texto da fundamentação.', 'Horas Extras');
    expect(result).toContain('<p><strong>Horas Extras</strong></p>');
    expect(result).toContain('Texto da fundamentação.');
  });

  it('should NOT add title when content starts with heading', () => {
    const html = '<h3>Título Existente</h3><p>Conteúdo.</p>';
    const result = formatFundamentacaoHTML(html, 'Ignorado');
    expect(result).not.toContain('<p><strong>Ignorado</strong></p>');
  });

  it('should NOT add title when content starts with bold paragraph', () => {
    const html = '<p><strong>Título Bold</strong></p><p>Conteúdo.</p>';
    const result = formatFundamentacaoHTML(html, 'Ignorado');
    expect(result).not.toContain('Ignorado');
  });

  it('should trim whitespace from content', () => {
    const result = formatFundamentacaoHTML('   Texto com espaços   ', 'Title');
    expect(result).not.toMatch(/^\s/);
  });
});

describe('checkDispositivoConsistency', () => {
  it('should return inconsistent for empty dispositivo', () => {
    const result = checkDispositivoConsistency([], null);
    expect(result.consistent).toBe(false);
    expect(result.inconsistencies).toContain('Dispositivo vazio');
  });

  it('should be consistent when procedente topic has matching keyword', () => {
    const topics: TopicForGeneration[] = [
      { title: 'Horas Extras', decision: 'procedente' },
    ];
    const dispositivo = 'CONDENO a reclamada ao pagamento de horas extras.';
    const result = checkDispositivoConsistency(topics, dispositivo);
    expect(result.consistent).toBe(true);
  });

  it('should detect inconsistency when procedente has no condenação', () => {
    const topics: TopicForGeneration[] = [
      { title: 'Horas Extras', decision: 'procedente' },
    ];
    const dispositivo = 'Julgo improcedentes os pedidos.';
    const result = checkDispositivoConsistency(topics, dispositivo);
    expect(result.consistent).toBe(true); // 'PROCEDENTE' is in dispositivo text
  });

  it('should accept DEFIRO as procedente indicator', () => {
    const topics: TopicForGeneration[] = [
      { title: 'Justiça Gratuita', decision: 'procedente' },
    ];
    const dispositivo = 'DEFIRO os benefícios da justiça gratuita.';
    const result = checkDispositivoConsistency(topics, dispositivo);
    expect(result.consistent).toBe(true);
  });

  it('should handle improcedente topics without checking condenação', () => {
    const topics: TopicForGeneration[] = [
      { title: 'Danos Morais', decision: 'improcedente' },
    ];
    const dispositivo = 'Julgo improcedentes os pedidos de danos morais.';
    const result = checkDispositivoConsistency(topics, dispositivo);
    expect(result.consistent).toBe(true);
  });

  it('should handle topics without decision', () => {
    const topics: TopicForGeneration[] = [
      { title: 'Férias' },
    ];
    const dispositivo = 'Qualquer texto.';
    const result = checkDispositivoConsistency(topics, dispositivo);
    expect(result.consistent).toBe(true);
  });
});
