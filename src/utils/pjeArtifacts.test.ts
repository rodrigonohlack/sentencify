import { describe, it, expect } from 'vitest';
import { cleanPjeArtifacts } from './pjeArtifacts';

describe('cleanPjeArtifacts', () => {
  it('remove o rodapé do PJe injetado no meio da frase, juntando as duas metades', () => {
    const sujo = 'no mês da rescisão ocorrida em Documento assinado eletronicamente por JEAN CARLOS MAGALHAES CONCEICAO, em 18/03/2026, às 11:15:27 - 85cb794 31/10/2025, a Reclamada não efetuou o pagamento.';
    const limpo = cleanPjeArtifacts(sujo);
    expect(limpo).not.toMatch(/assinado eletronicamente/i);
    expect(limpo).not.toContain('85cb794');
    expect(limpo).toContain('ocorrida em 31/10/2025, a Reclamada');
  });

  it('preserva maiúsculas, acentos e pontuação do texto real', () => {
    const r = cleanPjeArtifacts('A Reclamante foi admitida em 01/03/2024, função: Agente de Portaria.');
    expect(r).toBe('A Reclamante foi admitida em 01/03/2024, função: Agente de Portaria.');
  });

  it('não altera texto sem rodapé', () => {
    const t = 'Texto comum sem nenhum rodapé.';
    expect(cleanPjeArtifacts(t)).toBe(t);
  });

  it('remove múltiplas ocorrências (várias páginas)', () => {
    const sujo = 'parte A assinado eletronicamente por X, em 01/01/2026, às 09:00:00 - aaa1 parte B assinado eletronicamente por Y, em 02/02/2026, às 10:00:00 - bbb2 parte C';
    const limpo = cleanPjeArtifacts(sujo);
    expect(limpo).not.toMatch(/assinado eletronicamente/i);
    expect(limpo).toContain('parte A');
    expect(limpo).toContain('parte B');
    expect(limpo).toContain('parte C');
  });

  it('tolera string vazia/nula', () => {
    expect(cleanPjeArtifacts('')).toBe('');
    expect(cleanPjeArtifacts(undefined as unknown as string)).toBe('');
  });
});
