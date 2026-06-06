/**
 * @file transcriptSegments.test.ts
 * @description Testes para segmentação de transcrições por timestamp
 * @version 1.52.26
 */

import { describe, it, expect } from 'vitest';
import { segmentTranscript } from './transcriptSegments';

describe('segmentTranscript', () => {
  it('separa falas por timestamp no formato (M:SS)', () => {
    const raw = '(0:00) Ok, Excelência, retirando o Sr. Rodrigo. (0:08) Doutora, pode fazer perguntas?';
    expect(segmentTranscript(raw)).toEqual([
      { timestamp: '(0:00)', text: 'Ok, Excelência, retirando o Sr. Rodrigo.' },
      { timestamp: '(0:08)', text: 'Doutora, pode fazer perguntas?' },
    ]);
  });

  it('suporta timestamps com hora (H:MM:SS)', () => {
    const raw = '(0:05) início (1:02:30) depois de uma hora';
    expect(segmentTranscript(raw)).toEqual([
      { timestamp: '(0:05)', text: 'início' },
      { timestamp: '(1:02:30)', text: 'depois de uma hora' },
    ]);
  });

  it('preserva texto introdutório antes do primeiro timestamp', () => {
    const raw = 'Transcrição da audiência (0:00) Bom dia';
    expect(segmentTranscript(raw)).toEqual([
      { timestamp: null, text: 'Transcrição da audiência' },
      { timestamp: '(0:00)', text: 'Bom dia' },
    ]);
  });

  it('retorna um único segmento sem timestamp para texto puro', () => {
    const raw = 'Apenas um texto colado, sem marcações de tempo.';
    expect(segmentTranscript(raw)).toEqual([
      { timestamp: null, text: 'Apenas um texto colado, sem marcações de tempo.' },
    ]);
  });

  it('retorna lista vazia para entrada vazia ou só espaços', () => {
    expect(segmentTranscript('')).toEqual([]);
    expect(segmentTranscript('   \n  ')).toEqual([]);
  });

  it('ignora segmentos cujo texto fica vazio após o timestamp', () => {
    const raw = '(0:00) (0:03) fala real';
    expect(segmentTranscript(raw)).toEqual([
      { timestamp: '(0:00)', text: '' },
      { timestamp: '(0:03)', text: 'fala real' },
    ]);
  });

  it('preserva quebras de linha internas de uma mesma fala', () => {
    const raw = '(0:00) linha um\nlinha dois (0:10) outra fala';
    expect(segmentTranscript(raw)).toEqual([
      { timestamp: '(0:00)', text: 'linha um\nlinha dois' },
      { timestamp: '(0:10)', text: 'outra fala' },
    ]);
  });

  it('lida com entrada não-string de forma defensiva', () => {
    expect(segmentTranscript(undefined as unknown as string)).toEqual([]);
    expect(segmentTranscript(null as unknown as string)).toEqual([]);
  });
});
