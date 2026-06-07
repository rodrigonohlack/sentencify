import { describe, it, expect, vi } from 'vitest';

// cosineSimilarity controlada: usa embedding[0] como "cosseno" do modelo
vi.mock('../services/AIModelService', () => ({
  default: { cosineSimilarity: (_q: number[], b: number[]) => b[0] }
}));

import { rankModelsLocal, LOCAL_RANK_CONFIG } from './useModelSuggestions';
import type { Model } from '../types';

const emb = (cos: number): number[] => { const a = new Array(768).fill(0); a[0] = cos; return a; };
const mk = (o: Partial<Model>): Model => ({ id: 'x', title: '', content: '', ...o } as Model);
const qEmb = new Array(768).fill(0);
const TH = 0.40;

describe('rankModelsLocal', () => {
  it('descarta semântico fraco sem casamento lexical (ganho de precisão)', () => {
    // cos 0.75 → semScaled (0.75-0.72)/0.16=0.1875 → *0.65=0.122 ; lex 0 → final 0.122 < 0.40
    const m = mk({ id: 'a', title: 'Adicional noturno', category: 'MÉRITO', keywords: '', content: '', embedding: emb(0.75) });
    const out = rankModelsLocal([m], { title: 'Horas extras', category: 'PRELIMINAR' }, qEmb, TH);
    expect(out).toHaveLength(0);
  });

  it('inclui match de título+categoria mesmo com semântico fraco (recall via lexical)', () => {
    // cos 0.75 (0.122) + lex 80→1.0*0.35=0.35 → final 0.472 ≥ 0.40
    const m = mk({ id: 'b', title: 'Horas extras', category: 'MÉRITO', keywords: '', content: '', embedding: emb(0.75) });
    const out = rankModelsLocal([m], { title: 'Horas extras', category: 'MÉRITO' }, qEmb, TH);
    expect(out.map(x => x.id)).toEqual(['b']);
  });

  it('fixa favoritos no topo mesmo com score menor', () => {
    const fav = mk({ id: 'fav', title: 'A', category: 'MÉRITO', keywords: '', content: '', favorite: true, embedding: emb(0.86) }); // 0.569
    const reg = mk({ id: 'reg', title: 'B', category: 'MÉRITO', keywords: '', content: '', embedding: emb(0.88) }); // 0.65
    const out = rankModelsLocal([reg, fav], { title: 'Z', category: 'OUTRO' }, qEmb, TH);
    expect(out.map(x => x.id)).toEqual(['fav', 'reg']);
  });

  it('faz clamp do rescale semântico em 1 para cosseno alto', () => {
    const m = mk({ id: 'c', title: 'A', category: 'X', keywords: '', content: '', embedding: emb(0.95) });
    const out = rankModelsLocal([m], { title: 'Z', category: 'Y' }, qEmb, TH);
    expect(out[0].similarity).toBeCloseTo(LOCAL_RANK_CONFIG.W_SEM, 5); // semScaled=1 → final=W_SEM
  });

  it('ignora modelos sem embedding 768 e limita ao TOP_N', () => {
    const many = Array.from({ length: 8 }, (_, i) => mk({ id: `m${i}`, title: `T${i}`, category: 'X', embedding: emb(0.90) }));
    const semEmb = mk({ id: 'no', title: 'T', category: 'X', embedding: [1, 2, 3] });
    const out = rankModelsLocal([...many, semEmb], { title: 'Z', category: 'Y' }, qEmb, TH);
    expect(out.length).toBe(LOCAL_RANK_CONFIG.TOP_N);
    expect(out.find(x => x.id === 'no')).toBeUndefined();
  });
});
