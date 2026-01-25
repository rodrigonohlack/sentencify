/**
 * @file double-check-utils.test.ts
 * @description Testes para utilitarios do Double Check Review
 * @version 1.38.49
 *
 * Cobertura completa de todas as funcoes exportadas e edge cases.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  getCorrectionIcon,
  getCorrectionDescription,
  correctionsToSelectable,
  applySelectedCorrections,
  getSelectedCorrections,
  isTextFreeOperation,
  OPERATION_LABELS,
  TOPIC_CORRECTION_ICONS,
  DISPOSITIVO_CORRECTION_ICONS,
  REVIEW_CORRECTION_ICONS,
  FACTS_CORRECTION_ICONS,
  TEXT_FREE_OPERATIONS
} from './double-check-utils';
import type { DoubleCheckCorrection, DoubleCheckCorrectionWithSelection, DoubleCheckOperation } from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// TESTES DAS CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════════

describe('Constantes exportadas', () => {
  describe('OPERATION_LABELS', () => {
    it('contem todas as operacoes', () => {
      expect(OPERATION_LABELS.topicExtraction).toBe('Extração de Tópicos');
      expect(OPERATION_LABELS.dispositivo).toBe('Dispositivo');
      expect(OPERATION_LABELS.sentenceReview).toBe('Revisão de Sentença');
      expect(OPERATION_LABELS.factsComparison).toBe('Confronto de Fatos');
      expect(OPERATION_LABELS.proofAnalysis).toBe('Análise de Provas');
      expect(OPERATION_LABELS.quickPrompt).toBe('Prompts Rápidos');
    });

    it('contem exatamente 6 operacoes', () => {
      expect(Object.keys(OPERATION_LABELS)).toHaveLength(6);
    });
  });

  describe('TOPIC_CORRECTION_ICONS', () => {
    it('contem icones para tipos de correcao de topicos', () => {
      expect(TOPIC_CORRECTION_ICONS.remove).toBe('❌');
      expect(TOPIC_CORRECTION_ICONS.add).toBe('➕');
      expect(TOPIC_CORRECTION_ICONS.merge).toBe('🔗');
      expect(TOPIC_CORRECTION_ICONS.reclassify).toBe('🏷️');
    });
  });

  describe('DISPOSITIVO_CORRECTION_ICONS', () => {
    it('contem icones para tipos de correcao de dispositivo', () => {
      expect(DISPOSITIVO_CORRECTION_ICONS.add).toBe('➕');
      expect(DISPOSITIVO_CORRECTION_ICONS.modify).toBe('✏️');
      expect(DISPOSITIVO_CORRECTION_ICONS.remove).toBe('❌');
    });
  });

  describe('REVIEW_CORRECTION_ICONS', () => {
    it('contem icones para tipos de correcao de revisao', () => {
      expect(REVIEW_CORRECTION_ICONS.false_positive).toBe('⚠️');
      expect(REVIEW_CORRECTION_ICONS.missed).toBe('🔍');
      expect(REVIEW_CORRECTION_ICONS.improve).toBe('💡');
    });
  });

  describe('FACTS_CORRECTION_ICONS', () => {
    it('contem icones para tipos de correcao de fatos', () => {
      expect(FACTS_CORRECTION_ICONS.add_row).toBe('➕');
      expect(FACTS_CORRECTION_ICONS.fix_row).toBe('✏️');
      expect(FACTS_CORRECTION_ICONS.remove_row).toBe('❌');
      expect(FACTS_CORRECTION_ICONS.add_fato).toBe('📝');
    });
  });

  describe('TEXT_FREE_OPERATIONS', () => {
    it('contem operacoes de texto livre', () => {
      expect(TEXT_FREE_OPERATIONS).toContain('sentenceReview');
      expect(TEXT_FREE_OPERATIONS).toContain('proofAnalysis');
      expect(TEXT_FREE_OPERATIONS).toContain('quickPrompt');
    });

    it('nao contem operacoes estruturadas', () => {
      expect(TEXT_FREE_OPERATIONS).not.toContain('topicExtraction');
      expect(TEXT_FREE_OPERATIONS).not.toContain('dispositivo');
      expect(TEXT_FREE_OPERATIONS).not.toContain('factsComparison');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TESTES DE isTextFreeOperation
// ═══════════════════════════════════════════════════════════════════════════════

describe('isTextFreeOperation', () => {
  it('retorna true para sentenceReview', () => {
    expect(isTextFreeOperation('sentenceReview')).toBe(true);
  });

  it('retorna true para proofAnalysis', () => {
    expect(isTextFreeOperation('proofAnalysis')).toBe(true);
  });

  it('retorna true para quickPrompt', () => {
    expect(isTextFreeOperation('quickPrompt')).toBe(true);
  });

  it('retorna false para topicExtraction', () => {
    expect(isTextFreeOperation('topicExtraction')).toBe(false);
  });

  it('retorna false para dispositivo', () => {
    expect(isTextFreeOperation('dispositivo')).toBe(false);
  });

  it('retorna false para factsComparison', () => {
    expect(isTextFreeOperation('factsComparison')).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TESTES DE getCorrectionIcon
// ═══════════════════════════════════════════════════════════════════════════════

describe('getCorrectionIcon', () => {
  describe('topicExtraction', () => {
    it('retorna icone correto para remove', () => {
      expect(getCorrectionIcon('topicExtraction', 'remove')).toBe('❌');
    });

    it('retorna icone correto para add', () => {
      expect(getCorrectionIcon('topicExtraction', 'add')).toBe('➕');
    });

    it('retorna icone correto para merge', () => {
      expect(getCorrectionIcon('topicExtraction', 'merge')).toBe('🔗');
    });

    it('retorna icone correto para reclassify', () => {
      expect(getCorrectionIcon('topicExtraction', 'reclassify')).toBe('🏷️');
    });

    it('retorna icone padrao para tipo desconhecido', () => {
      expect(getCorrectionIcon('topicExtraction', 'unknown')).toBe('📋');
    });
  });

  describe('dispositivo', () => {
    it('retorna icone correto para add', () => {
      expect(getCorrectionIcon('dispositivo', 'add')).toBe('➕');
    });

    it('retorna icone correto para modify', () => {
      expect(getCorrectionIcon('dispositivo', 'modify')).toBe('✏️');
    });

    it('retorna icone correto para remove', () => {
      expect(getCorrectionIcon('dispositivo', 'remove')).toBe('❌');
    });

    it('retorna icone padrao para tipo desconhecido', () => {
      expect(getCorrectionIcon('dispositivo', 'unknown_type')).toBe('📋');
    });
  });

  describe('sentenceReview', () => {
    it('retorna icone correto para false_positive', () => {
      expect(getCorrectionIcon('sentenceReview', 'false_positive')).toBe('⚠️');
    });

    it('retorna icone correto para missed', () => {
      expect(getCorrectionIcon('sentenceReview', 'missed')).toBe('🔍');
    });

    it('retorna icone correto para improve', () => {
      expect(getCorrectionIcon('sentenceReview', 'improve')).toBe('💡');
    });

    it('retorna icone padrao para tipo desconhecido', () => {
      expect(getCorrectionIcon('sentenceReview', 'xyz')).toBe('📋');
    });
  });

  describe('factsComparison', () => {
    it('retorna icone correto para add_row', () => {
      expect(getCorrectionIcon('factsComparison', 'add_row')).toBe('➕');
    });

    it('retorna icone correto para fix_row', () => {
      expect(getCorrectionIcon('factsComparison', 'fix_row')).toBe('✏️');
    });

    it('retorna icone correto para remove_row', () => {
      expect(getCorrectionIcon('factsComparison', 'remove_row')).toBe('❌');
    });

    it('retorna icone correto para add_fato', () => {
      expect(getCorrectionIcon('factsComparison', 'add_fato')).toBe('📝');
    });

    it('retorna icone padrao para tipo desconhecido', () => {
      expect(getCorrectionIcon('factsComparison', 'nonexistent')).toBe('📋');
    });
  });

  describe('operacao desconhecida', () => {
    it('retorna icone padrao para operacao nao mapeada', () => {
      expect(getCorrectionIcon('unknown' as DoubleCheckOperation, 'any')).toBe('📋');
    });

    it('retorna icone padrao para proofAnalysis (sem mapa proprio)', () => {
      expect(getCorrectionIcon('proofAnalysis', 'improve')).toBe('📋');
    });

    it('retorna icone padrao para quickPrompt (sem mapa proprio)', () => {
      expect(getCorrectionIcon('quickPrompt', 'missed')).toBe('📋');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TESTES DE getCorrectionDescription
// ═══════════════════════════════════════════════════════════════════════════════

describe('getCorrectionDescription', () => {
  describe('topicExtraction', () => {
    it('descreve remocao de topico (string)', () => {
      const correction: DoubleCheckCorrection = {
        type: 'remove',
        reason: 'Duplicado',
        topic: 'Horas Extras'
      };
      expect(getCorrectionDescription('topicExtraction', correction))
        .toBe('Remover tópico "Horas Extras"');
    });

    it('descreve remocao de topico (objeto com title)', () => {
      const correction: DoubleCheckCorrection = {
        type: 'remove',
        reason: 'Duplicado',
        topic: { title: 'FGTS', category: 'MERITO' }
      };
      expect(getCorrectionDescription('topicExtraction', correction))
        .toBe('Remover tópico "FGTS"');
    });

    it('descreve remocao de topico (objeto sem title)', () => {
      const correction: DoubleCheckCorrection = {
        type: 'remove',
        reason: 'Duplicado',
        topic: { title: '', category: 'MERITO' }
      };
      // title e vazio, vai para fallback 'topico'
      expect(getCorrectionDescription('topicExtraction', correction))
        .toBe('Remover tópico "tópico"');
    });

    it('descreve remocao sem topic definido', () => {
      const correction: DoubleCheckCorrection = {
        type: 'remove',
        reason: 'Duplicado'
      };
      // topic undefined -> fallback 'topico'
      expect(getCorrectionDescription('topicExtraction', correction))
        .toBe('Remover tópico "tópico"');
    });

    it('descreve adicao de topico com categoria', () => {
      const correction: DoubleCheckCorrection = {
        type: 'add',
        reason: 'Faltante',
        topic: { title: 'Adicional Noturno', category: 'MERITO' }
      };
      expect(getCorrectionDescription('topicExtraction', correction))
        .toBe('Adicionar tópico "Adicional Noturno" em MERITO');
    });

    it('descreve adicao de topico sem categoria (fallback MERITO)', () => {
      const correction: DoubleCheckCorrection = {
        type: 'add',
        reason: 'Faltante',
        topic: { title: 'Ferias', category: '' }
      };
      // category vazio -> usa || 'MERITO'
      expect(getCorrectionDescription('topicExtraction', correction))
        .toBe('Adicionar tópico "Ferias" em MÉRITO');
    });

    it('descreve adicao sem detalhes (topic string)', () => {
      const correction: DoubleCheckCorrection = {
        type: 'add',
        reason: 'Faltante',
        topic: 'Teste'
      };
      // topic e string, nao e objeto, vai para fallback
      expect(getCorrectionDescription('topicExtraction', correction))
        .toBe('Adicionar novo tópico');
    });

    it('descreve adicao sem topic', () => {
      const correction: DoubleCheckCorrection = {
        type: 'add',
        reason: 'Faltante'
      };
      expect(getCorrectionDescription('topicExtraction', correction))
        .toBe('Adicionar novo tópico');
    });

    it('descreve mesclagem de topicos', () => {
      const correction: DoubleCheckCorrection = {
        type: 'merge',
        reason: 'Relacionados',
        topics: ['Horas Extras', 'Hora Extra'],
        into: 'Horas Extras'
      };
      expect(getCorrectionDescription('topicExtraction', correction))
        .toBe('Mesclar "Horas Extras" + "Hora Extra" → "Horas Extras"');
    });

    it('descreve reclassificacao de topico (string)', () => {
      const correction: DoubleCheckCorrection = {
        type: 'reclassify',
        reason: 'Categoria incorreta',
        topic: 'Ferias',
        from: 'PRELIMINAR',
        to: 'MERITO'
      };
      expect(getCorrectionDescription('topicExtraction', correction))
        .toBe('Reclassificar "Ferias" de PRELIMINAR para MERITO');
    });

    it('descreve reclassificacao de topico (objeto)', () => {
      const correction: DoubleCheckCorrection = {
        type: 'reclassify',
        reason: 'Categoria incorreta',
        topic: { title: 'FGTS', category: 'PRELIMINAR' },
        from: 'PRELIMINAR',
        to: 'MERITO'
      };
      expect(getCorrectionDescription('topicExtraction', correction))
        .toBe('Reclassificar "FGTS" de PRELIMINAR para MERITO');
    });

    it('descreve reclassificacao sem title (fallback topico)', () => {
      const correction: DoubleCheckCorrection = {
        type: 'reclassify',
        reason: 'Categoria incorreta',
        topic: { title: '', category: 'PRELIMINAR' },
        from: 'PRELIMINAR',
        to: 'MERITO'
      };
      expect(getCorrectionDescription('topicExtraction', correction))
        .toBe('Reclassificar "tópico" de PRELIMINAR para MERITO');
    });

    it('descreve tipo desconhecido (fallback)', () => {
      const correction: DoubleCheckCorrection = {
        type: 'unknown_type' as 'remove',
        reason: 'Teste'
      };
      expect(getCorrectionDescription('topicExtraction', correction))
        .toBe('Correção: unknown_type');
    });
  });

  describe('dispositivo', () => {
    it('descreve adicao de item', () => {
      const correction: DoubleCheckCorrection = {
        type: 'add',
        reason: 'Faltante',
        item: 'Julgar procedente'
      };
      expect(getCorrectionDescription('dispositivo', correction))
        .toBe('Adicionar: "Julgar procedente"');
    });

    it('descreve modificacao de item', () => {
      const correction: DoubleCheckCorrection = {
        type: 'modify',
        reason: 'Texto impreciso',
        item: 'Condenar',
        suggestion: 'Condenar a reclamada'
      };
      expect(getCorrectionDescription('dispositivo', correction))
        .toBe('Modificar: "Condenar" → "Condenar a reclamada"');
    });

    it('descreve remocao de item', () => {
      const correction: DoubleCheckCorrection = {
        type: 'remove',
        reason: 'Duplicado',
        item: 'Custas pela reclamada'
      };
      expect(getCorrectionDescription('dispositivo', correction))
        .toBe('Remover: "Custas pela reclamada"');
    });

    it('descreve tipo desconhecido (fallback)', () => {
      const correction: DoubleCheckCorrection = {
        type: 'merge' as 'modify',
        reason: 'Teste'
      };
      expect(getCorrectionDescription('dispositivo', correction))
        .toBe('Correção: merge');
    });

    it('item vazio usa string vazia', () => {
      const correction: DoubleCheckCorrection = {
        type: 'add',
        reason: 'Teste'
      };
      expect(getCorrectionDescription('dispositivo', correction))
        .toBe('Adicionar: ""');
    });

    it('suggestion vazio usa string vazia', () => {
      const correction: DoubleCheckCorrection = {
        type: 'modify',
        reason: 'Teste',
        item: 'X'
      };
      expect(getCorrectionDescription('dispositivo', correction))
        .toBe('Modificar: "X" → ""');
    });
  });

  describe('sentenceReview', () => {
    it('descreve falso positivo', () => {
      const correction: DoubleCheckCorrection = {
        type: 'false_positive',
        reason: 'Nao e problema',
        item: 'Uso de gerundio'
      };
      expect(getCorrectionDescription('sentenceReview', correction))
        .toBe('Falso positivo: "Uso de gerundio" não é problema real');
    });

    it('descreve omissao detectada', () => {
      const correction: DoubleCheckCorrection = {
        type: 'missed',
        reason: 'Deveria ter apontado',
        item: 'Falta de fundamentacao'
      };
      expect(getCorrectionDescription('sentenceReview', correction))
        .toBe('Omissão detectada: "Falta de fundamentacao"');
    });

    it('descreve sugestao de melhoria', () => {
      const correction: DoubleCheckCorrection = {
        type: 'improve',
        reason: 'Pode melhorar',
        item: 'Texto prolixo',
        suggestion: 'Texto conciso'
      };
      expect(getCorrectionDescription('sentenceReview', correction))
        .toBe('Melhorar: "Texto prolixo" → "Texto conciso"');
    });

    it('descreve tipo desconhecido (fallback)', () => {
      const correction: DoubleCheckCorrection = {
        type: 'add_row' as 'false_positive',
        reason: 'Teste'
      };
      expect(getCorrectionDescription('sentenceReview', correction))
        .toBe('Correção: add_row');
    });

    it('item e suggestion vazios usam string vazia', () => {
      const correction: DoubleCheckCorrection = {
        type: 'improve',
        reason: 'Teste'
      };
      expect(getCorrectionDescription('sentenceReview', correction))
        .toBe('Melhorar: "" → ""');
    });
  });

  describe('proofAnalysis', () => {
    it('usa mesma logica de sentenceReview para false_positive', () => {
      const correction: DoubleCheckCorrection = {
        type: 'false_positive',
        reason: 'Prova invalida',
        item: 'Doc falso'
      };
      expect(getCorrectionDescription('proofAnalysis', correction))
        .toBe('Falso positivo: "Doc falso" não é problema real');
    });

    it('usa mesma logica de sentenceReview para missed', () => {
      const correction: DoubleCheckCorrection = {
        type: 'missed',
        reason: 'Prova nao analisada',
        item: 'Testemunho X'
      };
      expect(getCorrectionDescription('proofAnalysis', correction))
        .toBe('Omissão detectada: "Testemunho X"');
    });

    it('usa mesma logica de sentenceReview para improve', () => {
      const correction: DoubleCheckCorrection = {
        type: 'improve',
        reason: 'Analise incompleta',
        item: 'Analise parcial',
        suggestion: 'Analise completa'
      };
      expect(getCorrectionDescription('proofAnalysis', correction))
        .toBe('Melhorar: "Analise parcial" → "Analise completa"');
    });
  });

  describe('quickPrompt', () => {
    it('usa mesma logica de sentenceReview para false_positive', () => {
      const correction: DoubleCheckCorrection = {
        type: 'false_positive',
        reason: 'Nao se aplica',
        item: 'Sugestao irrelevante'
      };
      expect(getCorrectionDescription('quickPrompt', correction))
        .toBe('Falso positivo: "Sugestao irrelevante" não é problema real');
    });

    it('usa mesma logica de sentenceReview para improve', () => {
      const correction: DoubleCheckCorrection = {
        type: 'improve',
        reason: 'Melhorar',
        item: 'Original',
        suggestion: 'Melhorado'
      };
      expect(getCorrectionDescription('quickPrompt', correction))
        .toBe('Melhorar: "Original" → "Melhorado"');
    });
  });

  describe('factsComparison', () => {
    it('descreve adicao de linha com tema', () => {
      const correction: DoubleCheckCorrection = {
        type: 'add_row',
        reason: 'Fato faltante',
        row: { tema: 'Jornada', autor: 'A', reu: 'B' }
      };
      expect(getCorrectionDescription('factsComparison', correction))
        .toBe('Adicionar linha: "Jornada"');
    });

    it('descreve adicao de linha sem tema (fallback Nova linha)', () => {
      const correction: DoubleCheckCorrection = {
        type: 'add_row',
        reason: 'Fato faltante',
        row: { autor: 'A' }
      };
      expect(getCorrectionDescription('factsComparison', correction))
        .toBe('Adicionar linha: "Nova linha"');
    });

    it('descreve adicao de linha sem row (fallback Nova linha)', () => {
      const correction: DoubleCheckCorrection = {
        type: 'add_row',
        reason: 'Fato faltante'
      };
      expect(getCorrectionDescription('factsComparison', correction))
        .toBe('Adicionar linha: "Nova linha"');
    });

    it('descreve correcao de linha com campo alegacaoReclamante', () => {
      const correction: DoubleCheckCorrection = {
        type: 'fix_row',
        reason: 'Valor incorreto',
        tema: 'Salario',
        field: 'alegacaoReclamante',
        newValue: 'R$ 5.000'
      };
      expect(getCorrectionDescription('factsComparison', correction))
        .toBe('Alterar alegação do reclamante em "Salario": "R$ 5.000"');
    });

    it('descreve correcao de linha com campo alegacaoReclamada', () => {
      const correction: DoubleCheckCorrection = {
        type: 'fix_row',
        reason: 'Valor incorreto',
        tema: 'Salario',
        field: 'alegacaoReclamada',
        newValue: 'R$ 3.000'
      };
      expect(getCorrectionDescription('factsComparison', correction))
        .toBe('Alterar alegação da reclamada em "Salario": "R$ 3.000"');
    });

    it('descreve correcao de linha com campo status', () => {
      const correction: DoubleCheckCorrection = {
        type: 'fix_row',
        reason: 'Status incorreto',
        tema: 'Jornada',
        field: 'status',
        newValue: 'incontroverso'
      };
      expect(getCorrectionDescription('factsComparison', correction))
        .toBe('Alterar status em "Jornada": "incontroverso"');
    });

    it('descreve correcao de linha com campo relevancia', () => {
      const correction: DoubleCheckCorrection = {
        type: 'fix_row',
        reason: 'Relevancia incorreta',
        tema: 'Ferias',
        field: 'relevancia',
        newValue: 'alta'
      };
      expect(getCorrectionDescription('factsComparison', correction))
        .toBe('Alterar relevância em "Ferias": "alta"');
    });

    it('descreve correcao de linha com campo observacoes', () => {
      const correction: DoubleCheckCorrection = {
        type: 'fix_row',
        reason: 'Obs incompleta',
        tema: 'FGTS',
        field: 'observacoes',
        newValue: 'Documentos comprovam'
      };
      expect(getCorrectionDescription('factsComparison', correction))
        .toBe('Alterar observações em "FGTS": "Documentos comprovam"');
    });

    it('descreve correcao de linha com campo desconhecido (usa nome do campo)', () => {
      const correction: DoubleCheckCorrection = {
        type: 'fix_row',
        reason: 'Correcao',
        tema: 'Teste',
        field: 'campoCustom',
        newValue: 'valor'
      };
      expect(getCorrectionDescription('factsComparison', correction))
        .toBe('Alterar campoCustom em "Teste": "valor"');
    });

    it('descreve correcao de linha com campo "tabela" (descricao simplificada)', () => {
      const correction: DoubleCheckCorrection = {
        type: 'fix_row',
        reason: 'Corrigir',
        tema: 'Subordinacao',
        field: 'tabela',
        newValue: ''
      };
      expect(getCorrectionDescription('factsComparison', correction))
        .toBe('Corrigir "Subordinacao" - ver detalhes no motivo');
    });

    it('descreve correcao de linha sem newValue (descricao simplificada)', () => {
      const correction: DoubleCheckCorrection = {
        type: 'fix_row',
        reason: 'Corrigir',
        tema: 'Jornada',
        field: 'status'
      };
      expect(getCorrectionDescription('factsComparison', correction))
        .toBe('Corrigir "Jornada" - ver detalhes no motivo');
    });

    it('descreve correcao de linha sem tema (fallback)', () => {
      const correction: DoubleCheckCorrection = {
        type: 'fix_row',
        reason: 'Corrigir',
        field: 'status',
        newValue: 'ok'
      };
      expect(getCorrectionDescription('factsComparison', correction))
        .toBe('Alterar status em "(tema não especificado)": "ok"');
    });

    it('descreve correcao de linha sem field (fallback campo)', () => {
      const correction: DoubleCheckCorrection = {
        type: 'fix_row',
        reason: 'Corrigir',
        tema: 'Teste',
        newValue: 'val'
      };
      // field undefined -> field = 'campo' -> nao e 'tabela' e newValue existe
      expect(getCorrectionDescription('factsComparison', correction))
        .toBe('Alterar campo em "Teste": "val"');
    });

    it('descreve remocao de linha', () => {
      const correction: DoubleCheckCorrection = {
        type: 'remove_row',
        reason: 'Duplicada',
        tema: 'Horas Extras'
      };
      expect(getCorrectionDescription('factsComparison', correction))
        .toBe('Remover linha: "Horas Extras"');
    });

    it('descreve adicao de fato incontroverso', () => {
      const correction: DoubleCheckCorrection = {
        type: 'add_fato',
        reason: 'Omitido',
        list: 'fatosIncontroversos',
        fato: 'Vinculo reconhecido'
      };
      expect(getCorrectionDescription('factsComparison', correction))
        .toBe('Adicionar fato incontroverso: "Vinculo reconhecido"');
    });

    it('descreve adicao de fato controverso', () => {
      const correction: DoubleCheckCorrection = {
        type: 'add_fato',
        reason: 'Omitido',
        list: 'fatosControversos',
        fato: 'Horas extras existentes'
      };
      expect(getCorrectionDescription('factsComparison', correction))
        .toBe('Adicionar fato controverso: "Horas extras existentes"');
    });

    it('descreve tipo desconhecido (fallback)', () => {
      const correction: DoubleCheckCorrection = {
        type: 'merge' as 'add_row',
        reason: 'Teste'
      };
      expect(getCorrectionDescription('factsComparison', correction))
        .toBe('Correção: merge');
    });
  });

  describe('operacao desconhecida (default)', () => {
    it('retorna descricao generica para operacao nao mapeada', () => {
      const correction: DoubleCheckCorrection = {
        type: 'remove',
        reason: 'Teste'
      };
      expect(getCorrectionDescription('unknown_op' as DoubleCheckOperation, correction))
        .toBe('Correção: remove');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TESTES DE correctionsToSelectable
// ═══════════════════════════════════════════════════════════════════════════════

describe('correctionsToSelectable', () => {
  const corrections: DoubleCheckCorrection[] = [
    { type: 'remove', reason: 'Motivo 1', topic: 'Topico A' },
    { type: 'add', reason: 'Motivo 2', topic: { title: 'Topico B', category: 'MERITO' } }
  ];

  it('converte correcoes com IDs unicos', () => {
    const result = correctionsToSelectable('topicExtraction', corrections);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('topicExtraction-0-remove');
    expect(result[1].id).toBe('topicExtraction-1-add');
  });

  it('define selected como true por padrao', () => {
    const result = correctionsToSelectable('topicExtraction', corrections);

    expect(result[0].selected).toBe(true);
    expect(result[1].selected).toBe(true);
  });

  it('permite definir selected como false', () => {
    const result = correctionsToSelectable('topicExtraction', corrections, false);

    expect(result[0].selected).toBe(false);
    expect(result[1].selected).toBe(false);
  });

  it('adiciona descricao a cada correcao', () => {
    const result = correctionsToSelectable('topicExtraction', corrections);

    expect(result[0].description).toBe('Remover tópico "Topico A"');
    expect(result[1].description).toBe('Adicionar tópico "Topico B" em MERITO');
  });

  it('preserva propriedades originais', () => {
    const result = correctionsToSelectable('topicExtraction', corrections);

    expect(result[0].type).toBe('remove');
    expect(result[0].reason).toBe('Motivo 1');
    expect(result[0].topic).toBe('Topico A');
  });

  it('funciona com array vazio', () => {
    const result = correctionsToSelectable('topicExtraction', []);
    expect(result).toHaveLength(0);
  });

  it('gera IDs corretos para factsComparison', () => {
    const factsCorrections: DoubleCheckCorrection[] = [
      { type: 'add_row', reason: 'R1', row: { tema: 'T1' } },
      { type: 'fix_row', reason: 'R2', tema: 'T2', field: 'status', newValue: 'ok' }
    ];
    const result = correctionsToSelectable('factsComparison', factsCorrections);

    expect(result[0].id).toBe('factsComparison-0-add_row');
    expect(result[1].id).toBe('factsComparison-1-fix_row');
  });

  it('gera IDs corretos para dispositivo', () => {
    const dispCorrections: DoubleCheckCorrection[] = [
      { type: 'add', reason: 'R1', item: 'Item 1' },
      { type: 'modify', reason: 'R2', item: 'Item 2', suggestion: 'Sugestao' }
    ];
    const result = correctionsToSelectable('dispositivo', dispCorrections);

    expect(result[0].id).toBe('dispositivo-0-add');
    expect(result[1].id).toBe('dispositivo-1-modify');
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

  it('retorna original quando nenhuma correcao selecionada', () => {
    const result = applySelectedCorrections(
      'topicExtraction',
      originalResult,
      verifiedResult,
      [],
      allCorrections
    );
    expect(result).toBe(originalResult);
  });

  it('retorna verificado quando todas as correcoes selecionadas', () => {
    const result = applySelectedCorrections(
      'topicExtraction',
      originalResult,
      verifiedResult,
      allCorrections,
      allCorrections
    );
    expect(result).toBe(verifiedResult);
  });

  // ─── topicExtraction: aplicacao parcial ───────────────────────────────

  describe('topicExtraction - aplicacao parcial', () => {
    const topicsOriginal = JSON.stringify([
      { title: 'Horas Extras', category: 'MERITO' },
      { title: 'FGTS', category: 'MERITO' },
      { title: 'Ferias', category: 'MERITO' },
      { title: 'Adicional Noturno', category: 'PRELIMINAR' }
    ]);

    it('aplica correcao remove', () => {
      const corrections: DoubleCheckCorrection[] = [
        { type: 'remove', topic: 'Horas Extras', reason: 'Duplicado' },
        { type: 'remove', topic: 'FGTS', reason: 'Irrelevante' }
      ];

      const result = applySelectedCorrections(
        'topicExtraction',
        topicsOriginal,
        '[]',
        [corrections[0]], // apenas remove Horas Extras
        corrections
      );

      const parsed = JSON.parse(result);
      expect(parsed).toHaveLength(3);
      expect(parsed.find((t: { title: string }) => t.title === 'Horas Extras')).toBeUndefined();
      expect(parsed.find((t: { title: string }) => t.title === 'FGTS')).toBeDefined();
    });

    it('aplica correcao remove com topic como objeto', () => {
      const corrections: DoubleCheckCorrection[] = [
        { type: 'remove', topic: { title: 'FGTS', category: 'MERITO' }, reason: 'Duplicado' },
        { type: 'add', topic: { title: 'Novo', category: 'MERITO' }, reason: 'Faltante' }
      ];

      const result = applySelectedCorrections(
        'topicExtraction',
        topicsOriginal,
        '[]',
        [corrections[0]],
        corrections
      );

      const parsed = JSON.parse(result);
      expect(parsed.find((t: { title: string }) => t.title === 'FGTS')).toBeUndefined();
    });

    it('aplica correcao remove sem topicName (noop)', () => {
      const corrections: DoubleCheckCorrection[] = [
        { type: 'remove', reason: 'Sem topic' },
        { type: 'add', topic: { title: 'X', category: 'Y' }, reason: 'R' }
      ];

      const result = applySelectedCorrections(
        'topicExtraction',
        topicsOriginal,
        '[]',
        [corrections[0]],
        corrections
      );

      const parsed = JSON.parse(result);
      // Nenhum topico removido pois topic e undefined
      expect(parsed).toHaveLength(4);
    });

    it('aplica correcao add com topic objeto', () => {
      const corrections: DoubleCheckCorrection[] = [
        { type: 'add', topic: { title: 'Novo Topico', category: 'MERITO' }, reason: 'Faltante' },
        { type: 'remove', topic: 'Ferias', reason: 'Desnecessario' }
      ];

      const result = applySelectedCorrections(
        'topicExtraction',
        topicsOriginal,
        '[]',
        [corrections[0]],
        corrections
      );

      const parsed = JSON.parse(result);
      expect(parsed).toHaveLength(5);
      expect(parsed.find((t: { title: string }) => t.title === 'Novo Topico')).toBeDefined();
    });

    it('aplica correcao add com topic string (noop, nao e objeto)', () => {
      const corrections: DoubleCheckCorrection[] = [
        { type: 'add', topic: 'String Topic', reason: 'Faltante' },
        { type: 'remove', topic: 'X', reason: 'R' }
      ];

      const result = applySelectedCorrections(
        'topicExtraction',
        topicsOriginal,
        '[]',
        [corrections[0]],
        corrections
      );

      const parsed = JSON.parse(result);
      // topic e string, nao adiciona
      expect(parsed).toHaveLength(4);
    });

    it('aplica correcao add sem topic (noop)', () => {
      const corrections: DoubleCheckCorrection[] = [
        { type: 'add', reason: 'Sem topic' },
        { type: 'remove', topic: 'X', reason: 'R' }
      ];

      const result = applySelectedCorrections(
        'topicExtraction',
        topicsOriginal,
        '[]',
        [corrections[0]],
        corrections
      );

      const parsed = JSON.parse(result);
      expect(parsed).toHaveLength(4);
    });

    it('aplica correcao merge', () => {
      const corrections: DoubleCheckCorrection[] = [
        { type: 'merge', topics: ['Horas Extras', 'Adicional Noturno'], into: 'Horas Extras e Adicional', reason: 'Relacionados' },
        { type: 'remove', topic: 'FGTS', reason: 'R' }
      ];

      const result = applySelectedCorrections(
        'topicExtraction',
        topicsOriginal,
        '[]',
        [corrections[0]],
        corrections
      );

      const parsed = JSON.parse(result);
      // Topicos originais foram removidos, novo foi adicionado
      expect(parsed.find((t: { title: string }) => t.title === 'Horas Extras')).toBeUndefined();
      expect(parsed.find((t: { title: string }) => t.title === 'Adicional Noturno')).toBeUndefined();
      expect(parsed.find((t: { title: string }) => t.title === 'Horas Extras e Adicional')).toBeDefined();
    });

    it('aplica correcao merge sem topics ou into (noop)', () => {
      const corrections: DoubleCheckCorrection[] = [
        { type: 'merge', reason: 'Sem dados' },
        { type: 'remove', topic: 'X', reason: 'R' }
      ];

      const result = applySelectedCorrections(
        'topicExtraction',
        topicsOriginal,
        '[]',
        [corrections[0]],
        corrections
      );

      const parsed = JSON.parse(result);
      expect(parsed).toHaveLength(4);
    });

    it('aplica correcao reclassify com topic string', () => {
      const corrections: DoubleCheckCorrection[] = [
        { type: 'reclassify', topic: 'Ferias', from: 'MERITO', to: 'PRELIMINAR', reason: 'Categoria errada' },
        { type: 'remove', topic: 'X', reason: 'R' }
      ];

      const result = applySelectedCorrections(
        'topicExtraction',
        topicsOriginal,
        '[]',
        [corrections[0]],
        corrections
      );

      const parsed = JSON.parse(result);
      expect(parsed.find((t: { title: string }) => t.title === 'Ferias')?.category).toBe('PRELIMINAR');
    });

    it('aplica correcao reclassify com topic objeto', () => {
      const corrections: DoubleCheckCorrection[] = [
        { type: 'reclassify', topic: { title: 'FGTS', category: 'MERITO' }, to: 'PRELIMINAR', reason: 'Errado' },
        { type: 'remove', topic: 'X', reason: 'R' }
      ];

      const result = applySelectedCorrections(
        'topicExtraction',
        topicsOriginal,
        '[]',
        [corrections[0]],
        corrections
      );

      const parsed = JSON.parse(result);
      expect(parsed.find((t: { title: string }) => t.title === 'FGTS')?.category).toBe('PRELIMINAR');
    });

    it('aplica correcao reclassify sem topic name (noop)', () => {
      const corrections: DoubleCheckCorrection[] = [
        { type: 'reclassify', to: 'PRELIMINAR', reason: 'Sem topic' },
        { type: 'remove', topic: 'X', reason: 'R' }
      ];

      const result = applySelectedCorrections(
        'topicExtraction',
        topicsOriginal,
        '[]',
        [corrections[0]],
        corrections
      );

      const parsed = JSON.parse(result);
      // Nenhuma reclassificacao aplicada
      expect(parsed.find((t: { title: string }) => t.title === 'Ferias')?.category).toBe('MERITO');
    });

    it('aplica correcao reclassify sem to (noop)', () => {
      const corrections: DoubleCheckCorrection[] = [
        { type: 'reclassify', topic: 'Ferias', reason: 'Sem to' },
        { type: 'remove', topic: 'X', reason: 'R' }
      ];

      const result = applySelectedCorrections(
        'topicExtraction',
        topicsOriginal,
        '[]',
        [corrections[0]],
        corrections
      );

      const parsed = JSON.parse(result);
      // Sem 'to', nao reclassifica
      expect(parsed.find((t: { title: string }) => t.title === 'Ferias')?.category).toBe('MERITO');
    });

    it('aplica correcao reclassify para topico nao encontrado (noop)', () => {
      const corrections: DoubleCheckCorrection[] = [
        { type: 'reclassify', topic: 'Topico Inexistente', to: 'PRELIMINAR', reason: 'Nao existe' },
        { type: 'remove', topic: 'X', reason: 'R' }
      ];

      const result = applySelectedCorrections(
        'topicExtraction',
        topicsOriginal,
        '[]',
        [corrections[0]],
        corrections
      );

      const parsed = JSON.parse(result);
      // Nada muda
      expect(parsed).toHaveLength(4);
    });

    it('aplica multiplas correcoes em sequencia', () => {
      const corrections: DoubleCheckCorrection[] = [
        { type: 'remove', topic: 'Horas Extras', reason: 'R1' },
        { type: 'add', topic: { title: 'Novo', category: 'MERITO' }, reason: 'R2' },
        { type: 'reclassify', topic: 'Ferias', to: 'PRELIMINAR', reason: 'R3' }
      ];

      const result = applySelectedCorrections(
        'topicExtraction',
        topicsOriginal,
        '[]',
        [corrections[0], corrections[1]], // remove + add
        corrections
      );

      const parsed = JSON.parse(result);
      expect(parsed.find((t: { title: string }) => t.title === 'Horas Extras')).toBeUndefined();
      expect(parsed.find((t: { title: string }) => t.title === 'Novo')).toBeDefined();
      // Reclassify nao foi selecionado
      expect(parsed.find((t: { title: string }) => t.title === 'Ferias')?.category).toBe('MERITO');
    });
  });

  // ─── factsComparison: aplicacao parcial ───────────────────────────────

  describe('factsComparison - aplicacao parcial', () => {
    const factsOriginal = JSON.stringify({
      topicTitle: 'Jornada',
      tabela: [
        { tema: 'Horario', status: 'controverso', relevancia: 'alta' },
        { tema: 'Intervalo', status: 'controverso', relevancia: 'media' }
      ],
      fatosIncontroversos: ['Fato 1']
    });

    it('aplica correcao fix_row', () => {
      const corrections: DoubleCheckCorrection[] = [
        { type: 'fix_row', tema: 'Horario', field: 'status', newValue: 'incontroverso', reason: 'Art. 341' },
        { type: 'fix_row', tema: 'Intervalo', field: 'status', newValue: 'incontroverso', reason: 'Art. 341' }
      ];

      const result = applySelectedCorrections(
        'factsComparison',
        factsOriginal,
        '{}',
        [corrections[0]],
        corrections
      );

      const parsed = JSON.parse(result);
      expect(parsed.tabela.find((r: { tema: string }) => r.tema === 'Horario').status).toBe('incontroverso');
      expect(parsed.tabela.find((r: { tema: string }) => r.tema === 'Intervalo').status).toBe('controverso');
    });

    it('aplica fix_row para tema nao encontrado (noop)', () => {
      const corrections: DoubleCheckCorrection[] = [
        { type: 'fix_row', tema: 'Inexistente', field: 'status', newValue: 'ok', reason: 'R' },
        { type: 'fix_row', tema: 'Horario', field: 'status', newValue: 'ok', reason: 'R' }
      ];

      const result = applySelectedCorrections(
        'factsComparison',
        factsOriginal,
        '{}',
        [corrections[0]],
        corrections
      );

      const parsed = JSON.parse(result);
      // Nada muda, tema nao encontrado
      expect(parsed.tabela.find((r: { tema: string }) => r.tema === 'Horario').status).toBe('controverso');
    });

    it('aplica fix_row sem dados completos (noop)', () => {
      const corrections: DoubleCheckCorrection[] = [
        { type: 'fix_row', reason: 'Sem dados' },
        { type: 'fix_row', tema: 'Horario', field: 'status', newValue: 'ok', reason: 'R' }
      ];

      const result = applySelectedCorrections(
        'factsComparison',
        factsOriginal,
        '{}',
        [corrections[0]],
        corrections
      );

      const parsed = JSON.parse(result);
      // Sem tema/field/newValue, nao aplica
      expect(parsed.tabela).toHaveLength(2);
    });

    it('aplica correcao add_row com row valido', () => {
      const corrections: DoubleCheckCorrection[] = [
        { type: 'add_row', row: { tema: 'Nova Linha', status: 'controverso' }, reason: 'Fato faltante' },
        { type: 'fix_row', tema: 'Horario', field: 'status', newValue: 'ok', reason: 'R' }
      ];

      const result = applySelectedCorrections(
        'factsComparison',
        factsOriginal,
        '{}',
        [corrections[0]],
        corrections
      );

      const parsed = JSON.parse(result);
      expect(parsed.tabela).toHaveLength(3);
      expect(parsed.tabela[2].tema).toBe('Nova Linha');
    });

    it('aplica correcao add_row sem row (noop)', () => {
      const corrections: DoubleCheckCorrection[] = [
        { type: 'add_row', reason: 'Sem row' },
        { type: 'fix_row', tema: 'X', field: 'status', newValue: 'ok', reason: 'R' }
      ];

      const result = applySelectedCorrections(
        'factsComparison',
        factsOriginal,
        '{}',
        [corrections[0]],
        corrections
      );

      const parsed = JSON.parse(result);
      expect(parsed.tabela).toHaveLength(2);
    });

    it('aplica correcao add_row sem tabela no resultado (noop)', () => {
      const noTabela = JSON.stringify({ topicTitle: 'Jornada' });
      const corrections: DoubleCheckCorrection[] = [
        { type: 'add_row', row: { tema: 'Nova' }, reason: 'R' },
        { type: 'fix_row', tema: 'X', field: 'f', newValue: 'v', reason: 'R' }
      ];

      const result = applySelectedCorrections(
        'factsComparison',
        noTabela,
        '{}',
        [corrections[0]],
        corrections
      );

      const parsed = JSON.parse(result);
      // tabela nao existe, nao pode fazer push
      expect(parsed.tabela).toBeUndefined();
    });

    it('aplica correcao remove_row', () => {
      const corrections: DoubleCheckCorrection[] = [
        { type: 'remove_row', tema: 'Horario', reason: 'Duplicada' },
        { type: 'fix_row', tema: 'Intervalo', field: 'status', newValue: 'ok', reason: 'R' }
      ];

      const result = applySelectedCorrections(
        'factsComparison',
        factsOriginal,
        '{}',
        [corrections[0]],
        corrections
      );

      const parsed = JSON.parse(result);
      expect(parsed.tabela).toHaveLength(1);
      expect(parsed.tabela[0].tema).toBe('Intervalo');
    });

    it('aplica correcao remove_row sem tabela (noop)', () => {
      const noTabela = JSON.stringify({ topicTitle: 'X' });
      const corrections: DoubleCheckCorrection[] = [
        { type: 'remove_row', tema: 'Horario', reason: 'R' },
        { type: 'fix_row', tema: 'X', field: 'f', newValue: 'v', reason: 'R' }
      ];

      const result = applySelectedCorrections(
        'factsComparison',
        noTabela,
        '{}',
        [corrections[0]],
        corrections
      );

      const parsed = JSON.parse(result);
      expect(parsed.tabela).toBeUndefined();
    });

    it('aplica correcao remove_row sem tema (noop)', () => {
      const corrections: DoubleCheckCorrection[] = [
        { type: 'remove_row', reason: 'Sem tema' },
        { type: 'fix_row', tema: 'X', field: 'f', newValue: 'v', reason: 'R' }
      ];

      const result = applySelectedCorrections(
        'factsComparison',
        factsOriginal,
        '{}',
        [corrections[0]],
        corrections
      );

      const parsed = JSON.parse(result);
      // Sem tema, nao remove nada
      expect(parsed.tabela).toHaveLength(2);
    });

    it('aplica correcao add_fato para lista existente', () => {
      const corrections: DoubleCheckCorrection[] = [
        { type: 'add_fato', list: 'fatosIncontroversos', fato: 'Fato 2', reason: 'Omitido' },
        { type: 'fix_row', tema: 'X', field: 'f', newValue: 'v', reason: 'R' }
      ];

      const result = applySelectedCorrections(
        'factsComparison',
        factsOriginal,
        '{}',
        [corrections[0]],
        corrections
      );

      const parsed = JSON.parse(result);
      expect(parsed.fatosIncontroversos).toEqual(['Fato 1', 'Fato 2']);
    });

    it('aplica correcao add_fato para lista inexistente (cria lista)', () => {
      const corrections: DoubleCheckCorrection[] = [
        { type: 'add_fato', list: 'fatosControversos', fato: 'Fato Controverso', reason: 'Omitido' },
        { type: 'fix_row', tema: 'X', field: 'f', newValue: 'v', reason: 'R' }
      ];

      const result = applySelectedCorrections(
        'factsComparison',
        factsOriginal,
        '{}',
        [corrections[0]],
        corrections
      );

      const parsed = JSON.parse(result);
      expect(parsed.fatosControversos).toEqual(['Fato Controverso']);
    });

    it('aplica correcao add_fato sem list (noop)', () => {
      const corrections: DoubleCheckCorrection[] = [
        { type: 'add_fato', fato: 'Fato X', reason: 'R' },
        { type: 'fix_row', tema: 'X', field: 'f', newValue: 'v', reason: 'R' }
      ];

      const result = applySelectedCorrections(
        'factsComparison',
        factsOriginal,
        '{}',
        [corrections[0]],
        corrections
      );

      const parsed = JSON.parse(result);
      // Sem list, nao adiciona nada
      expect(parsed.fatosIncontroversos).toEqual(['Fato 1']);
    });

    it('aplica correcao add_fato sem fato (noop)', () => {
      const corrections: DoubleCheckCorrection[] = [
        { type: 'add_fato', list: 'fatosIncontroversos', reason: 'R' },
        { type: 'fix_row', tema: 'X', field: 'f', newValue: 'v', reason: 'R' }
      ];

      const result = applySelectedCorrections(
        'factsComparison',
        factsOriginal,
        '{}',
        [corrections[0]],
        corrections
      );

      const parsed = JSON.parse(result);
      // Sem fato, nao adiciona nada
      expect(parsed.fatosIncontroversos).toEqual(['Fato 1']);
    });

    it('aplica multiplas correcoes facts em sequencia', () => {
      const corrections: DoubleCheckCorrection[] = [
        { type: 'fix_row', tema: 'Horario', field: 'status', newValue: 'incontroverso', reason: 'R1' },
        { type: 'add_row', row: { tema: 'Nova', status: 'ok' }, reason: 'R2' },
        { type: 'add_fato', list: 'fatosIncontroversos', fato: 'Fato 2', reason: 'R3' }
      ];

      const result = applySelectedCorrections(
        'factsComparison',
        factsOriginal,
        '{}',
        [corrections[0], corrections[1], corrections[2]], // nao e tudo, pois allCorrections teria mais
        [...corrections, { type: 'remove_row', tema: 'Y', reason: 'R4' }]
      );

      const parsed = JSON.parse(result);
      expect(parsed.tabela.find((r: { tema: string }) => r.tema === 'Horario').status).toBe('incontroverso');
      expect(parsed.tabela).toHaveLength(3);
      expect(parsed.fatosIncontroversos).toEqual(['Fato 1', 'Fato 2']);
    });
  });

  // ─── operacoes de texto livre: default case (linhas 442-443) ──────────

  describe('operacoes de texto livre - default case (aplicacao parcial)', () => {
    it('retorna verifiedResult para sentenceReview com aplicacao parcial', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const original = '"original text"';
      const verified = '"verified text"';
      const allCorr: DoubleCheckCorrection[] = [
        { type: 'false_positive', reason: 'R1', item: 'A' },
        { type: 'missed', reason: 'R2', item: 'B' }
      ];
      const selectedCorr = [allCorr[0]]; // parcial

      const result = applySelectedCorrections(
        'sentenceReview',
        original,
        verified,
        selectedCorr,
        allCorr
      );

      expect(result).toBe(verified);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('sentenceReview não suporta aplicação parcial')
      );

      warnSpy.mockRestore();
      logSpy.mockRestore();
    });

    it('retorna verifiedResult para proofAnalysis com aplicacao parcial', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const original = '"original proof"';
      const verified = '"verified proof"';
      const allCorr: DoubleCheckCorrection[] = [
        { type: 'improve', reason: 'R1', item: 'A', suggestion: 'B' },
        { type: 'missed', reason: 'R2', item: 'C' }
      ];
      const selectedCorr = [allCorr[1]]; // parcial

      const result = applySelectedCorrections(
        'proofAnalysis',
        original,
        verified,
        selectedCorr,
        allCorr
      );

      expect(result).toBe(verified);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('proofAnalysis não suporta aplicação parcial')
      );

      warnSpy.mockRestore();
      logSpy.mockRestore();
    });

    it('retorna verifiedResult para quickPrompt com aplicacao parcial', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const original = '"original quick"';
      const verified = '"verified quick"';
      const allCorr: DoubleCheckCorrection[] = [
        { type: 'improve', reason: 'R1', item: 'X', suggestion: 'Y' },
        { type: 'false_positive', reason: 'R2', item: 'Z' }
      ];
      const selectedCorr = [allCorr[0]]; // parcial

      const result = applySelectedCorrections(
        'quickPrompt',
        original,
        verified,
        selectedCorr,
        allCorr
      );

      expect(result).toBe(verified);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('quickPrompt não suporta aplicação parcial')
      );

      warnSpy.mockRestore();
      logSpy.mockRestore();
    });

    it('retorna verifiedResult para dispositivo com aplicacao parcial', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const original = '"original disp"';
      const verified = '"verified disp"';
      const allCorr: DoubleCheckCorrection[] = [
        { type: 'add', reason: 'R1', item: 'Item 1' },
        { type: 'modify', reason: 'R2', item: 'Item 2', suggestion: 'Item 2b' }
      ];
      const selectedCorr = [allCorr[0]]; // parcial

      const result = applySelectedCorrections(
        'dispositivo',
        original,
        verified,
        selectedCorr,
        allCorr
      );

      // dispositivo cai no default (nao tem handler parcial)
      expect(result).toBe(verified);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('dispositivo não suporta aplicação parcial')
      );

      warnSpy.mockRestore();
      logSpy.mockRestore();
    });
  });

  // ─── console.log para aplicacao parcial ──────────────────────────────

  it('loga mensagem ao aplicar correcoes parcialmente', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const topicsOriginal = JSON.stringify([
      { title: 'A', category: 'MERITO' },
      { title: 'B', category: 'MERITO' }
    ]);
    const corrections: DoubleCheckCorrection[] = [
      { type: 'remove', topic: 'A', reason: 'R1' },
      { type: 'remove', topic: 'B', reason: 'R2' }
    ];

    applySelectedCorrections(
      'topicExtraction',
      topicsOriginal,
      '[]',
      [corrections[0]],
      corrections
    );

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('Aplicando 1/2 correções para topicExtraction')
    );

    logSpy.mockRestore();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TESTES DE getSelectedCorrections
// ═══════════════════════════════════════════════════════════════════════════════

describe('getSelectedCorrections', () => {
  it('filtra apenas correcoes selecionadas', () => {
    const correctionsWithSelection: DoubleCheckCorrectionWithSelection[] = [
      { id: 'c1', type: 'remove', reason: 'R1', selected: true, description: 'D1' },
      { id: 'c2', type: 'add', reason: 'R2', selected: false, description: 'D2' },
      { id: 'c3', type: 'merge', reason: 'R3', selected: true, description: 'D3' }
    ];

    const result = getSelectedCorrections(correctionsWithSelection);

    expect(result).toHaveLength(2);
    expect(result[0].type).toBe('remove');
    expect(result[1].type).toBe('merge');
  });

  it('remove metadados de selecao (id, selected, description)', () => {
    const correctionsWithSelection: DoubleCheckCorrectionWithSelection[] = [
      { id: 'c1', type: 'remove', reason: 'R1', selected: true, description: 'D1' }
    ];

    const result = getSelectedCorrections(correctionsWithSelection);

    expect(result[0]).not.toHaveProperty('id');
    expect(result[0]).not.toHaveProperty('selected');
    expect(result[0]).not.toHaveProperty('description');
  });

  it('preserva propriedades originais incluindo campos opcionais', () => {
    const correctionsWithSelection: DoubleCheckCorrectionWithSelection[] = [
      {
        id: 'c1',
        type: 'reclassify',
        reason: 'R1',
        selected: true,
        description: 'D1',
        topic: 'Ferias',
        from: 'MERITO',
        to: 'PRELIMINAR'
      }
    ];

    const result = getSelectedCorrections(correctionsWithSelection);

    expect(result[0].type).toBe('reclassify');
    expect(result[0].reason).toBe('R1');
    expect(result[0].topic).toBe('Ferias');
    expect(result[0].from).toBe('MERITO');
    expect(result[0].to).toBe('PRELIMINAR');
  });

  it('retorna array vazio se nenhuma selecionada', () => {
    const noneSelected: DoubleCheckCorrectionWithSelection[] = [
      { id: 'c1', type: 'remove', reason: 'R1', selected: false, description: 'D1' },
      { id: 'c2', type: 'add', reason: 'R2', selected: false, description: 'D2' }
    ];

    const result = getSelectedCorrections(noneSelected);

    expect(result).toHaveLength(0);
  });

  it('retorna array vazio para input vazio', () => {
    const result = getSelectedCorrections([]);
    expect(result).toHaveLength(0);
  });

  it('retorna todas quando todas selecionadas', () => {
    const allSelected: DoubleCheckCorrectionWithSelection[] = [
      { id: 'c1', type: 'remove', reason: 'R1', selected: true, description: 'D1' },
      { id: 'c2', type: 'add', reason: 'R2', selected: true, description: 'D2' },
      { id: 'c3', type: 'merge', reason: 'R3', selected: true, description: 'D3' }
    ];

    const result = getSelectedCorrections(allSelected);

    expect(result).toHaveLength(3);
  });

  it('preserva campos de facts corrections', () => {
    const factsWithSelection: DoubleCheckCorrectionWithSelection[] = [
      {
        id: 'f1',
        type: 'add_fato',
        reason: 'Omitido',
        selected: true,
        description: 'D1',
        list: 'fatosIncontroversos',
        fato: 'Vinculo reconhecido'
      },
      {
        id: 'f2',
        type: 'fix_row',
        reason: 'Errado',
        selected: true,
        description: 'D2',
        tema: 'Jornada',
        field: 'status',
        newValue: 'incontroverso'
      }
    ];

    const result = getSelectedCorrections(factsWithSelection);

    expect(result[0].list).toBe('fatosIncontroversos');
    expect(result[0].fato).toBe('Vinculo reconhecido');
    expect(result[1].tema).toBe('Jornada');
    expect(result[1].field).toBe('status');
    expect(result[1].newValue).toBe('incontroverso');
  });
});
