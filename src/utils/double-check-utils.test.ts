/**
 * @file double-check-utils.test.ts
 * @description Testes para utilitários do Double Check Review
 * @version 1.37.59
 */

import { describe, it, expect } from 'vitest';
import {
  getCorrectionIcon,
  getCorrectionDescription,
  correctionsToSelectable,
  applySelectedCorrections,
  getSelectedCorrections,
  OPERATION_LABELS,
  TOPIC_CORRECTION_ICONS,
  DISPOSITIVO_CORRECTION_ICONS,
  REVIEW_CORRECTION_ICONS,
  FACTS_CORRECTION_ICONS
} from './double-check-utils';
import type { DoubleCheckCorrection, DoubleCheckCorrectionWithSelection } from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// TESTES DAS CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════════

describe('Constantes exportadas', () => {
  describe('OPERATION_LABELS', () => {
    it('contém todas as operações', () => {
      expect(OPERATION_LABELS.topicExtraction).toBe('Extração de Tópicos');
      expect(OPERATION_LABELS.dispositivo).toBe('Dispositivo');
      expect(OPERATION_LABELS.sentenceReview).toBe('Revisão de Sentença');
      expect(OPERATION_LABELS.factsComparison).toBe('Confronto de Fatos');
    });
  });

  describe('TOPIC_CORRECTION_ICONS', () => {
    it('contém ícones para tipos de correção de tópicos', () => {
      expect(TOPIC_CORRECTION_ICONS.remove).toBe('❌');
      expect(TOPIC_CORRECTION_ICONS.add).toBe('➕');
      expect(TOPIC_CORRECTION_ICONS.merge).toBe('🔗');
      expect(TOPIC_CORRECTION_ICONS.reclassify).toBe('🏷️');
    });
  });

  describe('DISPOSITIVO_CORRECTION_ICONS', () => {
    it('contém ícones para tipos de correção de dispositivo', () => {
      expect(DISPOSITIVO_CORRECTION_ICONS.add).toBe('➕');
      expect(DISPOSITIVO_CORRECTION_ICONS.modify).toBe('✏️');
      expect(DISPOSITIVO_CORRECTION_ICONS.remove).toBe('❌');
    });
  });

  describe('REVIEW_CORRECTION_ICONS', () => {
    it('contém ícones para tipos de correção de revisão', () => {
      expect(REVIEW_CORRECTION_ICONS.false_positive).toBe('⚠️');
      expect(REVIEW_CORRECTION_ICONS.missed).toBe('🔍');
      expect(REVIEW_CORRECTION_ICONS.improve).toBe('💡');
    });
  });

  describe('FACTS_CORRECTION_ICONS', () => {
    it('contém ícones para tipos de correção de fatos', () => {
      expect(FACTS_CORRECTION_ICONS.add_row).toBe('➕');
      expect(FACTS_CORRECTION_ICONS.fix_row).toBe('✏️');
      expect(FACTS_CORRECTION_ICONS.remove_row).toBe('❌');
      expect(FACTS_CORRECTION_ICONS.add_fato).toBe('📝');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TESTES DE getCorrectionIcon
// ═══════════════════════════════════════════════════════════════════════════════

describe('getCorrectionIcon', () => {
  describe('topicExtraction', () => {
    it('retorna ícone correto para remove', () => {
      expect(getCorrectionIcon('topicExtraction', 'remove')).toBe('❌');
    });

    it('retorna ícone correto para add', () => {
      expect(getCorrectionIcon('topicExtraction', 'add')).toBe('➕');
    });

    it('retorna ícone correto para merge', () => {
      expect(getCorrectionIcon('topicExtraction', 'merge')).toBe('🔗');
    });

    it('retorna ícone correto para reclassify', () => {
      expect(getCorrectionIcon('topicExtraction', 'reclassify')).toBe('🏷️');
    });

    it('retorna ícone padrão para tipo desconhecido', () => {
      expect(getCorrectionIcon('topicExtraction', 'unknown')).toBe('📋');
    });
  });

  describe('dispositivo', () => {
    it('retorna ícone correto para add', () => {
      expect(getCorrectionIcon('dispositivo', 'add')).toBe('➕');
    });

    it('retorna ícone correto para modify', () => {
      expect(getCorrectionIcon('dispositivo', 'modify')).toBe('✏️');
    });

    it('retorna ícone correto para remove', () => {
      expect(getCorrectionIcon('dispositivo', 'remove')).toBe('❌');
    });
  });

  describe('sentenceReview', () => {
    it('retorna ícone correto para false_positive', () => {
      expect(getCorrectionIcon('sentenceReview', 'false_positive')).toBe('⚠️');
    });

    it('retorna ícone correto para missed', () => {
      expect(getCorrectionIcon('sentenceReview', 'missed')).toBe('🔍');
    });

    it('retorna ícone correto para improve', () => {
      expect(getCorrectionIcon('sentenceReview', 'improve')).toBe('💡');
    });
  });

  describe('factsComparison', () => {
    it('retorna ícone correto para add_row', () => {
      expect(getCorrectionIcon('factsComparison', 'add_row')).toBe('➕');
    });

    it('retorna ícone correto para fix_row', () => {
      expect(getCorrectionIcon('factsComparison', 'fix_row')).toBe('✏️');
    });

    it('retorna ícone correto para remove_row', () => {
      expect(getCorrectionIcon('factsComparison', 'remove_row')).toBe('❌');
    });

    it('retorna ícone correto para add_fato', () => {
      expect(getCorrectionIcon('factsComparison', 'add_fato')).toBe('📝');
    });
  });

  describe('operação desconhecida', () => {
    it('retorna ícone padrão', () => {
      expect(getCorrectionIcon('unknown' as 'topicExtraction', 'any')).toBe('📋');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TESTES DE getCorrectionDescription
// ═══════════════════════════════════════════════════════════════════════════════

describe('getCorrectionDescription', () => {
  describe('topicExtraction', () => {
    it('descreve remoção de tópico (string)', () => {
      const correction: DoubleCheckCorrection = {
        type: 'remove',
        reason: 'Tópico duplicado',
        topic: 'Horas Extras'
      };
      expect(getCorrectionDescription('topicExtraction', correction))
        .toBe('Remover tópico "Horas Extras"');
    });

    it('descreve remoção de tópico (objeto)', () => {
      const correction: DoubleCheckCorrection = {
        type: 'remove',
        reason: 'Tópico duplicado',
        topic: { title: 'FGTS', category: 'MÉRITO' }
      };
      expect(getCorrectionDescription('topicExtraction', correction))
        .toBe('Remover tópico "FGTS"');
    });

    it('descreve adição de tópico com categoria', () => {
      const correction: DoubleCheckCorrection = {
        type: 'add',
        reason: 'Tópico faltante',
        topic: { title: 'Adicional Noturno', category: 'MÉRITO' }
      };
      expect(getCorrectionDescription('topicExtraction', correction))
        .toBe('Adicionar tópico "Adicional Noturno" em MÉRITO');
    });

    it('descreve adição de tópico sem detalhes', () => {
      const correction: DoubleCheckCorrection = {
        type: 'add',
        reason: 'Tópico faltante'
      };
      expect(getCorrectionDescription('topicExtraction', correction))
        .toBe('Adicionar novo tópico');
    });

    it('descreve mesclagem de tópicos', () => {
      const correction: DoubleCheckCorrection = {
        type: 'merge',
        reason: 'Tópicos relacionados',
        topics: ['Horas Extras', 'Hora Extra'],
        into: 'Horas Extras'
      };
      expect(getCorrectionDescription('topicExtraction', correction))
        .toBe('Mesclar "Horas Extras" + "Hora Extra" → "Horas Extras"');
    });

    it('descreve reclassificação de tópico', () => {
      const correction: DoubleCheckCorrection = {
        type: 'reclassify',
        reason: 'Categoria incorreta',
        topic: 'Férias',
        from: 'PRELIMINAR',
        to: 'MÉRITO'
      };
      expect(getCorrectionDescription('topicExtraction', correction))
        .toBe('Reclassificar "Férias" de PRELIMINAR para MÉRITO');
    });
  });

  describe('dispositivo', () => {
    it('descreve adição de item', () => {
      const correction: DoubleCheckCorrection = {
        type: 'add',
        reason: 'Item faltante',
        item: 'Julgar procedente em parte'
      };
      expect(getCorrectionDescription('dispositivo', correction))
        .toBe('Adicionar: "Julgar procedente em parte"');
    });

    it('descreve modificação de item', () => {
      const correction: DoubleCheckCorrection = {
        type: 'modify',
        reason: 'Texto impreciso',
        item: 'Condenar ao pagamento',
        suggestion: 'Condenar a reclamada ao pagamento'
      };
      expect(getCorrectionDescription('dispositivo', correction))
        .toBe('Modificar: "Condenar ao pagamento" → "Condenar a reclamada ao pagamento"');
    });

    it('descreve remoção de item', () => {
      const correction: DoubleCheckCorrection = {
        type: 'remove',
        reason: 'Item duplicado',
        item: 'Custas pela reclamada'
      };
      expect(getCorrectionDescription('dispositivo', correction))
        .toBe('Remover: "Custas pela reclamada"');
    });
  });

  describe('sentenceReview', () => {
    it('descreve falso positivo', () => {
      const correction: DoubleCheckCorrection = {
        type: 'false_positive',
        reason: 'Não é problema real',
        item: 'Uso de gerúndio'
      };
      expect(getCorrectionDescription('sentenceReview', correction))
        .toBe('Falso positivo: "Uso de gerúndio" não é problema real');
    });

    it('descreve omissão detectada', () => {
      const correction: DoubleCheckCorrection = {
        type: 'missed',
        reason: 'Deveria ter sido apontado',
        item: 'Falta de fundamentação'
      };
      expect(getCorrectionDescription('sentenceReview', correction))
        .toBe('Omissão detectada: "Falta de fundamentação"');
    });

    it('descreve sugestão de melhoria', () => {
      const correction: DoubleCheckCorrection = {
        type: 'improve',
        reason: 'Pode ser melhorado',
        item: 'Texto prolixo',
        suggestion: 'Texto conciso'
      };
      expect(getCorrectionDescription('sentenceReview', correction))
        .toBe('Melhorar: "Texto prolixo" → "Texto conciso"');
    });
  });

  describe('factsComparison', () => {
    it('descreve adição de linha', () => {
      const correction: DoubleCheckCorrection = {
        type: 'add_row',
        reason: 'Fato faltante',
        row: { tema: 'Jornada de Trabalho', autor: 'A', reu: 'B' }
      };
      expect(getCorrectionDescription('factsComparison', correction))
        .toBe('Adicionar linha: "Jornada de Trabalho"');
    });

    it('descreve correção de linha com campo válido', () => {
      const correction: DoubleCheckCorrection = {
        type: 'fix_row',
        reason: 'Valor incorreto',
        tema: 'Salário',
        field: 'alegacaoReclamante',
        newValue: 'R$ 5.000,00'
      };
      expect(getCorrectionDescription('factsComparison', correction))
        .toBe('Alterar alegação do reclamante em "Salário": "R$ 5.000,00"');
    });

    it('descreve correção de linha com campo genérico', () => {
      const correction: DoubleCheckCorrection = {
        type: 'fix_row',
        reason: 'Corrigir observações',
        tema: 'Subordinação',
        field: 'tabela',
        newValue: ''
      };
      expect(getCorrectionDescription('factsComparison', correction))
        .toBe('Corrigir "Subordinação" - ver detalhes no motivo');
    });

    it('descreve remoção de linha', () => {
      const correction: DoubleCheckCorrection = {
        type: 'remove_row',
        reason: 'Linha duplicada',
        tema: 'Horas Extras'
      };
      expect(getCorrectionDescription('factsComparison', correction))
        .toBe('Remover linha: "Horas Extras"');
    });

    it('descreve adição de fato incontroverso', () => {
      const correction: DoubleCheckCorrection = {
        type: 'add_fato',
        reason: 'Fato omitido',
        list: 'fatosIncontroversos',
        fato: 'Vínculo empregatício reconhecido'
      };
      expect(getCorrectionDescription('factsComparison', correction))
        .toBe('Adicionar fato incontroverso: "Vínculo empregatício reconhecido"');
    });

    it('descreve adição de fato controverso', () => {
      const correction: DoubleCheckCorrection = {
        type: 'add_fato',
        reason: 'Fato omitido',
        list: 'fatosControversos',
        fato: 'Existência de horas extras'
      };
      expect(getCorrectionDescription('factsComparison', correction))
        .toBe('Adicionar fato controverso: "Existência de horas extras"');
    });
  });

  describe('tipo desconhecido', () => {
    it('retorna descrição genérica', () => {
      const correction: DoubleCheckCorrection = {
        type: 'unknown' as 'remove',
        reason: 'Teste'
      };
      expect(getCorrectionDescription('topicExtraction', correction))
        .toBe('Correção: unknown');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TESTES DE correctionsToSelectable
// ═══════════════════════════════════════════════════════════════════════════════

describe('correctionsToSelectable', () => {
  const corrections: DoubleCheckCorrection[] = [
    { type: 'remove', reason: 'Motivo 1', topic: 'Tópico A' },
    { type: 'add', reason: 'Motivo 2', topic: { title: 'Tópico B', category: 'MÉRITO' } }
  ];

  it('converte correções com IDs únicos', () => {
    const result = correctionsToSelectable('topicExtraction', corrections);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('topicExtraction-0-remove');
    expect(result[1].id).toBe('topicExtraction-1-add');
  });

  it('define selected como true por padrão', () => {
    const result = correctionsToSelectable('topicExtraction', corrections);

    expect(result[0].selected).toBe(true);
    expect(result[1].selected).toBe(true);
  });

  it('permite definir selected como false', () => {
    const result = correctionsToSelectable('topicExtraction', corrections, false);

    expect(result[0].selected).toBe(false);
    expect(result[1].selected).toBe(false);
  });

  it('adiciona descrição a cada correção', () => {
    const result = correctionsToSelectable('topicExtraction', corrections);

    expect(result[0].description).toBe('Remover tópico "Tópico A"');
    expect(result[1].description).toBe('Adicionar tópico "Tópico B" em MÉRITO');
  });

  it('preserva propriedades originais', () => {
    const result = correctionsToSelectable('topicExtraction', corrections);

    expect(result[0].type).toBe('remove');
    expect(result[0].reason).toBe('Motivo 1');
    expect(result[0].topic).toBe('Tópico A');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TESTES DE applySelectedCorrections
// ═══════════════════════════════════════════════════════════════════════════════

describe('applySelectedCorrections', () => {
  const originalResult = '{"original": true}';
  const verifiedResult = '{"verified": true}';
  const allCorrections: DoubleCheckCorrection[] = [
    { type: 'remove', reason: 'Motivo 1' },
    { type: 'add', reason: 'Motivo 2' }
  ];

  it('retorna original quando nenhuma correção selecionada', () => {
    const result = applySelectedCorrections(
      'topicExtraction',
      originalResult,
      verifiedResult,
      [], // nenhuma selecionada
      allCorrections
    );

    expect(result).toBe(originalResult);
  });

  it('retorna verificado quando todas as correções selecionadas', () => {
    const result = applySelectedCorrections(
      'topicExtraction',
      originalResult,
      verifiedResult,
      allCorrections, // todas selecionadas
      allCorrections
    );

    expect(result).toBe(verifiedResult);
  });

  it('retorna verificado para seleção parcial (comportamento conservador)', () => {
    const selectedCorrections = [allCorrections[0]]; // apenas uma

    const result = applySelectedCorrections(
      'topicExtraction',
      originalResult,
      verifiedResult,
      selectedCorrections,
      allCorrections
    );

    // Por ora, seleção parcial usa o resultado verificado
    expect(result).toBe(verifiedResult);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TESTES DE getSelectedCorrections
// ═══════════════════════════════════════════════════════════════════════════════

describe('getSelectedCorrections', () => {
  const correctionsWithSelection: DoubleCheckCorrectionWithSelection[] = [
    { id: 'c1', type: 'remove', reason: 'R1', selected: true, description: 'D1' },
    { id: 'c2', type: 'add', reason: 'R2', selected: false, description: 'D2' },
    { id: 'c3', type: 'merge', reason: 'R3', selected: true, description: 'D3' }
  ];

  it('filtra apenas correções selecionadas', () => {
    const result = getSelectedCorrections(correctionsWithSelection);

    expect(result).toHaveLength(2);
    expect(result[0].type).toBe('remove');
    expect(result[1].type).toBe('merge');
  });

  it('remove metadados de seleção (id, selected, description)', () => {
    const result = getSelectedCorrections(correctionsWithSelection);

    // Verifica que não tem as propriedades de seleção
    expect(result[0]).not.toHaveProperty('id');
    expect(result[0]).not.toHaveProperty('selected');
    expect(result[0]).not.toHaveProperty('description');
  });

  it('preserva propriedades originais', () => {
    const result = getSelectedCorrections(correctionsWithSelection);

    expect(result[0].type).toBe('remove');
    expect(result[0].reason).toBe('R1');
  });

  it('retorna array vazio se nenhuma selecionada', () => {
    const noneSelected: DoubleCheckCorrectionWithSelection[] = [
      { id: 'c1', type: 'remove', reason: 'R1', selected: false, description: 'D1' },
      { id: 'c2', type: 'add', reason: 'R2', selected: false, description: 'D2' }
    ];

    const result = getSelectedCorrections(noneSelected);

    expect(result).toHaveLength(0);
  });
});
