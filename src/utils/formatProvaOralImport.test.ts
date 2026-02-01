/**
 * @file formatProvaOralImport.test.ts
 * @description Testes para formatação de seções da análise de prova oral
 */

import { describe, it, expect } from 'vitest';
import {
  PROVA_ORAL_SECTIONS,
  formatProvaOralSections,
  getAvailableSections,
  type ProvaOralSectionKey
} from './formatProvaOralImport';
import type {
  ProvaOralResult,
  SinteseCondensada,
  SintesePorTema,
  Contradicao,
  Confissao,
  AvaliacaoCredibilidade
} from '../apps/prova-oral/types';

// ═══════════════════════════════════════════════════════════════════════════
// MOCK DATA FACTORIES
// ═══════════════════════════════════════════════════════════════════════════

const createEmptyResult = (): ProvaOralResult => ({
  processo: {},
  depoentes: [],
  sinteses: [],
  analises: [],
  contradicoes: [],
  confissoes: [],
  credibilidade: []
});

const createSinteseCondensada = (overrides: Partial<SinteseCondensada> = {}): SinteseCondensada => ({
  deponente: 'João Silva',
  qualificacao: 'autor',
  textoCorrente: 'O depoente afirmou que trabalhava das 8h às 18h.',
  ...overrides
});

const createSintesePorTema = (overrides: Partial<SintesePorTema> = {}): SintesePorTema => ({
  tema: 'Jornada de Trabalho',
  declaracoes: [
    {
      deponente: 'João Silva',
      qualificacao: 'autor',
      textoCorrente: 'Trabalhava das 8h às 18h sem intervalo.'
    }
  ],
  ...overrides
});

const createContradicao = (overrides: Partial<Contradicao> = {}): Contradicao => ({
  tipo: 'interna',
  relevancia: 'alta',
  depoente: 'Maria Santos',
  descricao: 'A testemunha disse horários diferentes em momentos distintos.',
  ...overrides
});

const createConfissao = (overrides: Partial<Confissao> = {}): Confissao => ({
  tipo: 'autor',
  tema: 'Horas Extras',
  trecho: 'Admito que às vezes saía mais cedo.',
  ...overrides
});

const createAvaliacaoCredibilidade = (overrides: Partial<AvaliacaoCredibilidade> = {}): AvaliacaoCredibilidade => ({
  deponenteId: 'dep-1',
  ...overrides
});

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('PROVA_ORAL_SECTIONS', () => {
  it('should export all expected sections', () => {
    expect(PROVA_ORAL_SECTIONS).toHaveLength(5);

    const keys = PROVA_ORAL_SECTIONS.map(s => s.key);
    expect(keys).toContain('sintesesCondensadas');
    expect(keys).toContain('sintesesPorTema');
    expect(keys).toContain('contradicoes');
    expect(keys).toContain('confissoes');
    expect(keys).toContain('credibilidade');
  });

  it('should have labels in Portuguese', () => {
    const labels = PROVA_ORAL_SECTIONS.map(s => s.label);
    expect(labels).toContain('Sínteses Condensadas');
    expect(labels).toContain('Sínteses por Tema');
    expect(labels).toContain('Contradições');
    expect(labels).toContain('Confissões');
    expect(labels).toContain('Credibilidade');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// getAvailableSections TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('getAvailableSections', () => {
  it('should return empty array for empty result', () => {
    const result = createEmptyResult();
    expect(getAvailableSections(result)).toEqual([]);
  });

  it('should detect sintesesCondensadas', () => {
    const result = createEmptyResult();
    result.sintesesCondensadas = [createSinteseCondensada()];

    const available = getAvailableSections(result);
    expect(available).toContain('sintesesCondensadas');
  });

  it('should detect sintesesPorTema', () => {
    const result = createEmptyResult();
    result.sintesesPorTema = [createSintesePorTema()];

    const available = getAvailableSections(result);
    expect(available).toContain('sintesesPorTema');
  });

  it('should detect contradicoes', () => {
    const result = createEmptyResult();
    result.contradicoes = [createContradicao()];

    const available = getAvailableSections(result);
    expect(available).toContain('contradicoes');
  });

  it('should detect confissoes', () => {
    const result = createEmptyResult();
    result.confissoes = [createConfissao()];

    const available = getAvailableSections(result);
    expect(available).toContain('confissoes');
  });

  it('should detect credibilidade', () => {
    const result = createEmptyResult();
    result.credibilidade = [createAvaliacaoCredibilidade()];

    const available = getAvailableSections(result);
    expect(available).toContain('credibilidade');
  });

  it('should return all sections when all have content', () => {
    const result: ProvaOralResult = {
      ...createEmptyResult(),
      sintesesCondensadas: [createSinteseCondensada()],
      sintesesPorTema: [createSintesePorTema()],
      contradicoes: [createContradicao()],
      confissoes: [createConfissao()],
      credibilidade: [createAvaliacaoCredibilidade()]
    };

    const available = getAvailableSections(result);
    expect(available).toHaveLength(5);
  });

  it('should not include sections with empty arrays', () => {
    const result = createEmptyResult();
    result.sintesesCondensadas = [];
    result.contradicoes = [];

    expect(getAvailableSections(result)).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// formatProvaOralSections TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('formatProvaOralSections', () => {
  describe('Empty Results', () => {
    it('should return empty string for empty result and empty sections', () => {
      const result = createEmptyResult();
      expect(formatProvaOralSections(result, [])).toBe('');
    });

    it('should return empty string when requested sections have no data', () => {
      const result = createEmptyResult();
      const output = formatProvaOralSections(result, ['sintesesCondensadas', 'contradicoes']);
      expect(output).toBe('');
    });
  });

  describe('Sínteses Condensadas', () => {
    it('should format single sintese condensada', () => {
      const result = createEmptyResult();
      result.sintesesCondensadas = [createSinteseCondensada()];

      const output = formatProvaOralSections(result, ['sintesesCondensadas']);

      expect(output).toContain('## Sínteses Condensadas');
      expect(output).toContain('**João Silva (Autor)**');
      expect(output).toContain('O depoente afirmou que trabalhava das 8h às 18h.');
    });

    it('should format multiple sinteses condensadas', () => {
      const result = createEmptyResult();
      result.sintesesCondensadas = [
        createSinteseCondensada({ deponente: 'João', qualificacao: 'autor' }),
        createSinteseCondensada({ deponente: 'Maria', qualificacao: 'preposto' })
      ];

      const output = formatProvaOralSections(result, ['sintesesCondensadas']);

      expect(output).toContain('**João (Autor)**');
      expect(output).toContain('**Maria (Preposto)**');
    });

    it('should format all qualificacao types correctly', () => {
      const result = createEmptyResult();
      result.sintesesCondensadas = [
        createSinteseCondensada({ deponente: 'A', qualificacao: 'autor' }),
        createSinteseCondensada({ deponente: 'B', qualificacao: 'preposto' }),
        createSinteseCondensada({ deponente: 'C', qualificacao: 'testemunha-autor' }),
        createSinteseCondensada({ deponente: 'D', qualificacao: 'testemunha-re' })
      ];

      const output = formatProvaOralSections(result, ['sintesesCondensadas']);

      expect(output).toContain('(Autor)');
      expect(output).toContain('(Preposto)');
      expect(output).toContain('(Testemunha do Autor)');
      expect(output).toContain('(Testemunha da Ré)');
    });

    it('should handle unknown qualificacao gracefully', () => {
      const result = createEmptyResult();
      result.sintesesCondensadas = [
        createSinteseCondensada({ qualificacao: 'desconhecido' as any })
      ];

      const output = formatProvaOralSections(result, ['sintesesCondensadas']);
      expect(output).toContain('(desconhecido)');
    });
  });

  describe('Sínteses por Tema', () => {
    it('should format sinteses por tema with header', () => {
      const result = createEmptyResult();
      result.sintesesPorTema = [createSintesePorTema()];

      const output = formatProvaOralSections(result, ['sintesesPorTema']);

      expect(output).toContain('## Sínteses por Tema');
      expect(output).toContain('### Jornada de Trabalho');
      expect(output).toContain('- **João Silva (Autor)**:');
    });

    it('should format multiple temas', () => {
      const result = createEmptyResult();
      result.sintesesPorTema = [
        createSintesePorTema({ tema: 'Horas Extras' }),
        createSintesePorTema({ tema: 'Intervalo' })
      ];

      const output = formatProvaOralSections(result, ['sintesesPorTema']);

      expect(output).toContain('### Horas Extras');
      expect(output).toContain('### Intervalo');
    });

    it('should format multiple declaracoes per tema', () => {
      const result = createEmptyResult();
      result.sintesesPorTema = [{
        tema: 'Teste',
        declaracoes: [
          { deponente: 'João', qualificacao: 'autor', textoCorrente: 'Texto 1' },
          { deponente: 'Maria', qualificacao: 'preposto', textoCorrente: 'Texto 2' }
        ]
      }];

      const output = formatProvaOralSections(result, ['sintesesPorTema']);

      expect(output).toContain('**João (Autor)**: Texto 1');
      expect(output).toContain('**Maria (Preposto)**: Texto 2');
    });
  });

  describe('Contradições', () => {
    it('should format contradicao interna', () => {
      const result = createEmptyResult();
      result.contradicoes = [createContradicao({ tipo: 'interna' })];

      const output = formatProvaOralSections(result, ['contradicoes']);

      expect(output).toContain('## Contradições');
      expect(output).toContain('(Interna - Relevância: Alta)');
    });

    it('should format contradicao externa', () => {
      const result = createEmptyResult();
      result.contradicoes = [createContradicao({ tipo: 'externa' })];

      const output = formatProvaOralSections(result, ['contradicoes']);

      expect(output).toContain('(Externa - Relevância: Alta)');
    });

    it('should format all relevancia levels', () => {
      const result = createEmptyResult();
      result.contradicoes = [
        createContradicao({ depoente: 'A', relevancia: 'alta' }),
        createContradicao({ depoente: 'B', relevancia: 'media' }),
        createContradicao({ depoente: 'C', relevancia: 'baixa' })
      ];

      const output = formatProvaOralSections(result, ['contradicoes']);

      expect(output).toContain('Relevância: Alta');
      expect(output).toContain('Relevância: Média');
      expect(output).toContain('Relevância: Baixa');
    });

    it('should include analise when present', () => {
      const result = createEmptyResult();
      result.contradicoes = [
        createContradicao({ analise: 'Possível confusão temporal.' })
      ];

      const output = formatProvaOralSections(result, ['contradicoes']);

      expect(output).toContain('_Análise: Possível confusão temporal._');
    });

    it('should not include analise when absent', () => {
      const result = createEmptyResult();
      result.contradicoes = [createContradicao({ analise: undefined })];

      const output = formatProvaOralSections(result, ['contradicoes']);

      expect(output).not.toContain('_Análise:');
    });

    it('should handle unknown relevancia gracefully', () => {
      const result = createEmptyResult();
      result.contradicoes = [createContradicao({ relevancia: 'critica' as any })];

      const output = formatProvaOralSections(result, ['contradicoes']);
      expect(output).toContain('Relevância: critica');
    });
  });

  describe('Confissões', () => {
    it('should format confissao do autor', () => {
      const result = createEmptyResult();
      result.confissoes = [createConfissao({ tipo: 'autor' })];

      const output = formatProvaOralSections(result, ['confissoes']);

      expect(output).toContain('## Confissões');
      expect(output).toContain('**Autor**');
      expect(output).toContain('Tema: Horas Extras');
      expect(output).toContain('> "Admito que às vezes saía mais cedo."');
    });

    it('should format confissao do preposto', () => {
      const result = createEmptyResult();
      result.confissoes = [createConfissao({ tipo: 'preposto' })];

      const output = formatProvaOralSections(result, ['confissoes']);

      expect(output).toContain('**Preposto**');
    });

    it('should include implicacao when present', () => {
      const result = createEmptyResult();
      result.confissoes = [
        createConfissao({ implicacao: 'Reconhecimento de descumprimento contratual.' })
      ];

      const output = formatProvaOralSections(result, ['confissoes']);

      expect(output).toContain('_Implicação: Reconhecimento de descumprimento contratual._');
    });

    it('should not include implicacao when absent', () => {
      const result = createEmptyResult();
      result.confissoes = [createConfissao({ implicacao: undefined })];

      const output = formatProvaOralSections(result, ['confissoes']);

      expect(output).not.toContain('_Implicação:');
    });
  });

  describe('Credibilidade', () => {
    it('should format credibilidade with deponenteNome', () => {
      const result = createEmptyResult();
      result.credibilidade = [
        createAvaliacaoCredibilidade({ deponenteNome: 'João Silva' })
      ];

      const output = formatProvaOralSections(result, ['credibilidade']);

      expect(output).toContain('## Avaliação de Credibilidade');
      expect(output).toContain('**João Silva**');
    });

    it('should fallback to deponenteId when deponenteNome is absent', () => {
      const result = createEmptyResult();
      result.credibilidade = [
        createAvaliacaoCredibilidade({ deponenteId: 'dep-123', deponenteNome: undefined })
      ];

      const output = formatProvaOralSections(result, ['credibilidade']);

      expect(output).toContain('**dep-123**');
    });

    it('should include pontuacao when present', () => {
      const result = createEmptyResult();
      result.credibilidade = [
        createAvaliacaoCredibilidade({ pontuacao: 4 })
      ];

      const output = formatProvaOralSections(result, ['credibilidade']);

      expect(output).toContain('Pontuação: 4/5');
    });

    it('should include avaliacaoGeral when present', () => {
      const result = createEmptyResult();
      result.credibilidade = [
        createAvaliacaoCredibilidade({ avaliacaoGeral: 'Depoimento coerente e detalhado.' })
      ];

      const output = formatProvaOralSections(result, ['credibilidade']);

      expect(output).toContain('Depoimento coerente e detalhado.');
    });

    it('should format criterios when present', () => {
      const result = createEmptyResult();
      result.credibilidade = [
        createAvaliacaoCredibilidade({
          criterios: {
            conhecimentoDireto: true,
            contemporaneidade: 'alta',
            coerenciaInterna: 'alta',
            interesseLitigio: 'baixo'
          }
        })
      ];

      const output = formatProvaOralSections(result, ['credibilidade']);

      expect(output).toContain('Conhecimento direto: Sim');
      expect(output).toContain('Contemporaneidade: Alta');
      expect(output).toContain('Coerência interna: alta');
      expect(output).toContain('Interesse no litígio: baixo');
    });

    it('should show "Não" for conhecimentoDireto false', () => {
      const result = createEmptyResult();
      result.credibilidade = [
        createAvaliacaoCredibilidade({
          criterios: {
            conhecimentoDireto: false,
            contemporaneidade: 'baixa',
            coerenciaInterna: 'comprometida',
            interesseLitigio: 'alto'
          }
        })
      ];

      const output = formatProvaOralSections(result, ['credibilidade']);

      expect(output).toContain('Conhecimento direto: Não');
    });
  });

  describe('Multiple Sections', () => {
    it('should combine multiple sections with separators', () => {
      const result = createEmptyResult();
      result.sintesesCondensadas = [createSinteseCondensada()];
      result.contradicoes = [createContradicao()];

      const output = formatProvaOralSections(result, ['sintesesCondensadas', 'contradicoes']);

      expect(output).toContain('## Sínteses Condensadas');
      expect(output).toContain('---');
      expect(output).toContain('## Contradições');
    });

    it('should only include requested sections', () => {
      const result = createEmptyResult();
      result.sintesesCondensadas = [createSinteseCondensada()];
      result.contradicoes = [createContradicao()];
      result.confissoes = [createConfissao()];

      const output = formatProvaOralSections(result, ['sintesesCondensadas']);

      expect(output).toContain('## Sínteses Condensadas');
      expect(output).not.toContain('## Contradições');
      expect(output).not.toContain('## Confissões');
    });

    it('should skip sections without data even if requested', () => {
      const result = createEmptyResult();
      result.sintesesCondensadas = [createSinteseCondensada()];
      // contradicoes is empty

      const output = formatProvaOralSections(result, ['sintesesCondensadas', 'contradicoes']);

      expect(output).toContain('## Sínteses Condensadas');
      expect(output).not.toContain('## Contradições');
      expect(output).not.toContain('---'); // No separator needed for single section
    });

    it('should format all sections when all requested and have data', () => {
      const result: ProvaOralResult = {
        ...createEmptyResult(),
        sintesesCondensadas: [createSinteseCondensada()],
        sintesesPorTema: [createSintesePorTema()],
        contradicoes: [createContradicao()],
        confissoes: [createConfissao()],
        credibilidade: [createAvaliacaoCredibilidade({ deponenteNome: 'Test' })]
      };

      const sections: ProvaOralSectionKey[] = [
        'sintesesCondensadas',
        'sintesesPorTema',
        'contradicoes',
        'confissoes',
        'credibilidade'
      ];

      const output = formatProvaOralSections(result, sections);

      expect(output).toContain('## Sínteses Condensadas');
      expect(output).toContain('## Sínteses por Tema');
      expect(output).toContain('## Contradições');
      expect(output).toContain('## Confissões');
      expect(output).toContain('## Avaliação de Credibilidade');

      // Should have 4 separators between 5 sections
      const separatorCount = (output.match(/---/g) || []).length;
      expect(separatorCount).toBe(4);
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined optional arrays', () => {
      const result: ProvaOralResult = {
        processo: {},
        depoentes: [],
        sinteses: [],
        analises: [],
        contradicoes: [],
        confissoes: [],
        credibilidade: [],
        sintesesCondensadas: undefined,
        sintesesPorTema: undefined
      };

      const output = formatProvaOralSections(result, ['sintesesCondensadas', 'sintesesPorTema']);
      expect(output).toBe('');
    });

    it('should handle empty arrays for optional sections', () => {
      const result: ProvaOralResult = {
        ...createEmptyResult(),
        sintesesCondensadas: [],
        sintesesPorTema: []
      };

      const output = formatProvaOralSections(result, ['sintesesCondensadas', 'sintesesPorTema']);
      expect(output).toBe('');
    });
  });
});
