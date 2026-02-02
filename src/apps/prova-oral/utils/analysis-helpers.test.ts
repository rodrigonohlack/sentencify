/**
 * @file analysis-helpers.test.ts
 * @description Testes para funções utilitárias de análise de prova oral
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeThemeName,
  validateAnalysesCoverage,
  findConfissoesForTema,
  findContradicoesForTema,
  convertDeclaracoesToProvaOral,
  extractUniqueTemas,
  validateFundamentacao,
  checkConsistency,
} from './analysis-helpers';
import type {
  SintesePorTema,
  Confissao,
  Contradicao,
  AnaliseTemaPedido,
  DeclaracaoPorTema,
} from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// TESTES: normalizeThemeName
// ═══════════════════════════════════════════════════════════════════════════

describe('normalizeThemeName', () => {
  it('deve converter para minúsculas', () => {
    expect(normalizeThemeName('HORAS EXTRAS')).toBe('horas extras');
  });

  it('deve remover acentos', () => {
    expect(normalizeThemeName('Rescisão Indireta')).toBe('rescisao indireta');
  });

  it('deve remover caracteres especiais', () => {
    expect(normalizeThemeName('Horas Extras (art. 59, CLT)')).toBe('horas extras art 59 clt');
  });

  it('deve manter espaços entre palavras', () => {
    expect(normalizeThemeName('Intervalo Intrajornada')).toBe('intervalo intrajornada');
  });

  it('deve remover espaços extras', () => {
    expect(normalizeThemeName('  Dano Moral  ')).toBe('dano moral');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TESTES: validateAnalysesCoverage
// ═══════════════════════════════════════════════════════════════════════════

describe('validateAnalysesCoverage', () => {
  const sintesesPorTema: SintesePorTema[] = [
    { tema: 'Horas Extras', declaracoes: [] },
    { tema: 'Intervalo Intrajornada', declaracoes: [] },
    { tema: 'Dano Moral', declaracoes: [] },
  ];

  it('deve retornar isComplete=true quando todos os temas estão cobertos', () => {
    const analises: AnaliseTemaPedido[] = [
      { titulo: 'Horas Extras', conclusao: 'Favorável ao autor', status: 'favoravel-autor' },
      { titulo: 'Intervalo Intrajornada', conclusao: 'Favorável à ré', status: 'favoravel-re' },
      { titulo: 'Dano Moral', conclusao: 'Inconclusivo', status: 'inconclusivo' },
    ];

    const result = validateAnalysesCoverage(analises, sintesesPorTema);
    expect(result.isComplete).toBe(true);
    expect(result.missingTemas).toHaveLength(0);
  });

  it('deve identificar temas faltantes', () => {
    const analises: AnaliseTemaPedido[] = [
      { titulo: 'Horas Extras', conclusao: 'Favorável ao autor', status: 'favoravel-autor' },
    ];

    const result = validateAnalysesCoverage(analises, sintesesPorTema);
    expect(result.isComplete).toBe(false);
    expect(result.missingTemas).toContain('Intervalo Intrajornada');
    expect(result.missingTemas).toContain('Dano Moral');
  });

  it('deve ignorar diferenças de acentuação', () => {
    const analises: AnaliseTemaPedido[] = [
      { titulo: 'Horas Extras', conclusao: '', status: 'favoravel-autor' },
      { titulo: 'Intervalo Intrajornada', conclusao: '', status: 'favoravel-autor' },
      { titulo: 'Dano Moral', conclusao: '', status: 'favoravel-autor' },
    ];

    const result = validateAnalysesCoverage(analises, sintesesPorTema);
    expect(result.isComplete).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TESTES: findConfissoesForTema
// ═══════════════════════════════════════════════════════════════════════════

describe('findConfissoesForTema', () => {
  const confissoes: Confissao[] = [
    { tipo: 'preposto', tema: 'Intervalo Intrajornada', trecho: 'não havia horário fixo' },
    { tipo: 'preposto', tema: 'Horas Extras', trecho: 'saía às 02h' },
    { tipo: 'autor', tema: 'Faltas', trecho: 'faltei algumas vezes' },
  ];

  it('deve encontrar confissões do tema exato', () => {
    const result = findConfissoesForTema(confissoes, 'Horas Extras');
    expect(result).toHaveLength(1);
    expect(result[0].trecho).toBe('saía às 02h');
  });

  it('deve encontrar confissões com tema parcial', () => {
    const result = findConfissoesForTema(confissoes, 'Intervalo');
    expect(result).toHaveLength(1);
    expect(result[0].trecho).toBe('não havia horário fixo');
  });

  it('deve retornar array vazio se não houver confissões', () => {
    const result = findConfissoesForTema(confissoes, 'Equiparação Salarial');
    expect(result).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TESTES: findContradicoesForTema
// ═══════════════════════════════════════════════════════════════════════════

describe('findContradicoesForTema', () => {
  const contradicoes: Contradicao[] = [
    {
      tipo: 'externa',
      relevancia: 'alta',
      depoente: 'Autor vs Preposto',
      descricao: 'Horário de saída divergente quanto a horas extras',
      tema: 'Jornada de Trabalho',
    },
    {
      tipo: 'interna',
      relevancia: 'media',
      depoente: 'Testemunha Alfre',
      descricao: 'Declarações contraditórias sobre intervalo',
    },
  ];

  it('deve encontrar contradições pelo campo tema', () => {
    const result = findContradicoesForTema(contradicoes, 'Jornada');
    expect(result).toHaveLength(1);
    expect(result[0].depoente).toBe('Autor vs Preposto');
  });

  it('deve encontrar contradições pela descrição', () => {
    const result = findContradicoesForTema(contradicoes, 'Intervalo');
    expect(result).toHaveLength(1);
    expect(result[0].depoente).toBe('Testemunha Alfre');
  });

  it('deve retornar array vazio se não houver contradições', () => {
    const result = findContradicoesForTema(contradicoes, 'Dano Moral');
    expect(result).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TESTES: convertDeclaracoesToProvaOral
// ═══════════════════════════════════════════════════════════════════════════

describe('convertDeclaracoesToProvaOral', () => {
  it('deve converter declarações para formato provaOral', () => {
    const declaracoes: DeclaracaoPorTema[] = [
      { deponente: 'AUTOR JOÃO', qualificacao: 'autor', textoCorrente: 'afirmou X (1m 10s)' },
      { deponente: 'TESTEMUNHA MARIA', qualificacao: 'testemunha-autor', textoCorrente: 'declarou Y (5m 00s)' },
    ];

    const result = convertDeclaracoesToProvaOral(declaracoes);

    expect(result).toHaveLength(2);
    expect(result[0].deponente).toBe('AUTOR JOÃO');
    expect(result[0].textoCorrente).toBe('afirmou X (1m 10s)');
    expect(result[1].deponente).toBe('TESTEMUNHA MARIA');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TESTES: extractUniqueTemas
// ═══════════════════════════════════════════════════════════════════════════

describe('extractUniqueTemas', () => {
  it('deve extrair temas únicos das análises', () => {
    const analises: AnaliseTemaPedido[] = [
      { titulo: 'Horas Extras', conclusao: '', status: 'favoravel-autor' },
      { titulo: 'Intervalo', conclusao: '', status: 'favoravel-re' },
      { titulo: 'Horas Extras', conclusao: '', status: 'parcial' }, // Duplicado
    ];

    const result = extractUniqueTemas(analises);

    expect(result).toHaveLength(2);
    expect(result).toContain('Horas Extras');
    expect(result).toContain('Intervalo');
  });

  it('deve usar campo tema como fallback', () => {
    const analises: AnaliseTemaPedido[] = [
      { tema: 'Dano Moral', conclusao: '', status: 'inconclusivo' } as AnaliseTemaPedido,
    ];

    const result = extractUniqueTemas(analises);

    expect(result).toContain('Dano Moral');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TESTES: validateFundamentacao
// ═══════════════════════════════════════════════════════════════════════════

describe('validateFundamentacao', () => {
  it('deve retornar inválido para fundamentação ausente', () => {
    const result = validateFundamentacao(undefined);

    expect(result.isValid).toBe(false);
    expect(result.issues).toContain('Fundamentação ausente');
  });

  it('deve detectar ausência de timestamps', () => {
    const fundamentacao = 'O autor comprovou suas alegações mediante prova testemunhal.';

    const result = validateFundamentacao(fundamentacao);

    expect(result.hasTimestamps).toBe(false);
    expect(result.issues).toContain('Ausência de timestamps nas citações');
  });

  it('deve detectar presença de timestamps', () => {
    const fundamentacao = 'O autor declarou que saía às 02h (1m 33s). Isso foi corroborado pela testemunha (15m 20s).';

    const result = validateFundamentacao(fundamentacao, 50);

    expect(result.hasTimestamps).toBe(true);
  });

  it('deve detectar presença de base legal', () => {
    const fundamentacao = 'Nos termos do art. 391 do CPC, a confissão tem eficácia de prova plena (1m 10s).';

    const result = validateFundamentacao(fundamentacao, 50);

    expect(result.hasLegalBasis).toBe(true);
  });

  it('deve detectar presença de conclusão', () => {
    const fundamentacao = 'Diante do exposto, a prova é favorável ao autor (1m 10s), conforme art. 391 CPC.';

    const result = validateFundamentacao(fundamentacao, 50);

    expect(result.hasConclusion).toBe(true);
  });

  it('deve validar fundamentação completa', () => {
    const fundamentacao = `
      ## Quanto ao horário de saída

      O autor declarou saída às 02h30 (1m 33s). A testemunha Alfre corroborou: "ficava até tarde" (34m 45s).

      Nos termos do art. 391 do CPC, a confissão tem eficácia de prova plena.

      ## Conclusão

      Diante do exposto, a prova é favorável ao autor quanto à jornada estendida.
    `;

    const result = validateFundamentacao(fundamentacao);

    expect(result.isValid).toBe(true);
    expect(result.hasTimestamps).toBe(true);
    expect(result.hasLegalBasis).toBe(true);
    expect(result.hasConclusion).toBe(true);
    expect(result.minLength).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TESTES: checkConsistency
// ═══════════════════════════════════════════════════════════════════════════

describe('checkConsistency', () => {
  it('deve retornar consistente quando tudo está correto', () => {
    const sintesesPorTema: SintesePorTema[] = [
      { tema: 'Horas Extras', declaracoes: [] },
    ];

    const analises: AnaliseTemaPedido[] = [
      {
        titulo: 'Horas Extras',
        conclusao: 'Favorável ao autor',
        status: 'favoravel-autor',
        fundamentacao: `## Quanto ao horário de saída

O autor declarou saída às 02h30 (1m 33s). A testemunha Maria corroborou esta versão ao afirmar que "sempre ficavam até tarde" (15m 20s).

Nos termos do art. 391 do CPC, a confissão tem eficácia de prova plena, prevalecendo sobre eventual prova testemunhal em contrário.

## Conclusão

Diante do exposto, a prova é favorável ao autor quanto à jornada estendida, havendo prova testemunhal coesa corroborando suas alegações.`,
      },
    ];

    const result = checkConsistency(sintesesPorTema, analises);

    expect(result.isConsistent).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });

  it('deve identificar temas sem análise', () => {
    const sintesesPorTema: SintesePorTema[] = [
      { tema: 'Horas Extras', declaracoes: [] },
      { tema: 'Intervalo', declaracoes: [] },
    ];

    const analises: AnaliseTemaPedido[] = [
      {
        titulo: 'Horas Extras',
        conclusao: 'Favorável ao autor',
        status: 'favoravel-autor',
        fundamentacao: `O autor declarou X (1m 33s). Conforme art. 391 do CPC. Conclusão favorável.`,
      },
    ];

    const result = checkConsistency(sintesesPorTema, analises);

    expect(result.isConsistent).toBe(false);
    expect(result.warnings.some(w => w.includes('Intervalo'))).toBe(true);
  });

  it('deve identificar fundamentação insuficiente', () => {
    const sintesesPorTema: SintesePorTema[] = [
      { tema: 'Horas Extras', declaracoes: [] },
    ];

    const analises: AnaliseTemaPedido[] = [
      {
        titulo: 'Horas Extras',
        conclusao: 'Favorável ao autor',
        status: 'favoravel-autor',
        fundamentacao: 'Muito curta', // Sem timestamps, sem base legal, sem conclusão
      },
    ];

    const result = checkConsistency(sintesesPorTema, analises);

    expect(result.isConsistent).toBe(false);
    expect(result.warnings.some(w => w.includes('Horas Extras'))).toBe(true);
  });
});
