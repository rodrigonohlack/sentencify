import { describe, it, expect } from 'vitest';
import { validateProvaOralImport } from './import-validation';

const validResultado = {
  processo: { numero: '0001', reclamante: 'A', reclamada: 'B', vara: '1ª VT' },
  depoentes: [{ id: 'dep-1', nome: 'Fulano', qualificacao: 'autor' }],
  sinteses: [{ deponenteId: 'dep-1', conteudo: [{ texto: 'afirmou X', timestamp: '1m 10s' }] }],
  analises: [{ titulo: 'Horas extras', conclusao: 'Procedente', status: 'favoravel-autor' }],
  contradicoes: [],
  confissoes: [],
  credibilidade: [{ deponenteId: 'dep-1', pontuacao: 4 }],
};

describe('validateProvaOralImport', () => {
  it('aceita JSON wrapped (SavedProvaOralAnalysis) e extrai transcricao/sinteseProcesso', () => {
    const wrapped = {
      id: 'x', createdAt: '', updatedAt: '',
      transcricao: 'texto bruto', sinteseProcesso: 'sintese da inicial',
      resultado: validResultado,
    };
    const r = validateProvaOralImport(wrapped);
    expect(r.valid).toBe(true);
    expect(r.payload?.transcricao).toBe('texto bruto');
    expect(r.payload?.sinteseProcesso).toBe('sintese da inicial');
    expect(r.payload?.resultado.depoentes).toHaveLength(1);
  });

  it('aceita ProvaOralResult cru e avisa transcrição vazia', () => {
    const r = validateProvaOralImport(validResultado);
    expect(r.valid).toBe(true);
    expect(r.payload?.transcricao).toBe('');
    expect(r.warnings.some((w) => w.includes('transcrição'))).toBe(true);
  });

  it('garante os 6 arrays nucleares mesmo se ausentes', () => {
    const r = validateProvaOralImport({
      processo: {}, depoentes: [{ id: 'd1', nome: 'X', qualificacao: 'preposto' }],
    });
    expect(r.valid).toBe(true);
    expect(r.payload?.resultado.sinteses).toEqual([]);
    expect(r.payload?.resultado.analises).toEqual([]);
    expect(r.payload?.resultado.contradicoes).toEqual([]);
    expect(r.payload?.resultado.confissoes).toEqual([]);
    expect(r.payload?.resultado.credibilidade).toEqual([]);
  });

  it('rejeita quando depoentes não é array', () => {
    const r = validateProvaOralImport({ ...validResultado, depoentes: 'nope' });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes('depoentes'))).toBe(true);
  });

  it('rejeita qualificacao fora do enum', () => {
    const r = validateProvaOralImport({
      ...validResultado,
      depoentes: [{ id: 'd1', nome: 'X', qualificacao: 'juiz' }],
    });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes('depoentes[0]'))).toBe(true);
  });

  it('rejeita status de análise fora do enum', () => {
    const r = validateProvaOralImport({
      ...validResultado,
      analises: [{ titulo: 'T', conclusao: 'C', status: 'talvez' }],
    });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes('analises[0]'))).toBe(true);
  });

  it('aceita mas avisa deponenteId órfão em sinteses', () => {
    const r = validateProvaOralImport({
      ...validResultado,
      sinteses: [{ deponenteId: 'inexistente', conteudo: [] }],
    });
    expect(r.valid).toBe(true);
    expect(r.warnings.some((w) => w.includes('inexistente'))).toBe(true);
  });

  it('rejeita entrada que não é objeto', () => {
    expect(validateProvaOralImport(42).valid).toBe(false);
  });

  it('trata null em arrays opcionais como ausente (não erro)', () => {
    const r = validateProvaOralImport({
      ...validResultado,
      sinteses: null,
      analises: null,
      contradicoes: null,
      confissoes: null,
      credibilidade: null,
    });
    expect(r.valid).toBe(true);
    expect(r.payload?.resultado.sinteses).toEqual([]);
    expect(r.payload?.resultado.credibilidade).toEqual([]);
  });
});
