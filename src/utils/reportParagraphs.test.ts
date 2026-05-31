import { describe, it, expect } from 'vitest';
import { splitReportIntoParagraphs } from './reportParagraphs';

describe('splitReportIntoParagraphs', () => {
  it('divide N <p> em N parágrafos numerados a partir de 0', () => {
    const html = '<p>O reclamante narra os fatos.</p><p>A primeira reclamada contesta.</p>';
    const r = splitReportIntoParagraphs(html);
    expect(r).toEqual([
      { index: 0, text: 'O reclamante narra os fatos.' },
      { index: 1, text: 'A primeira reclamada contesta.' },
    ]);
  });

  it('trata <br>, &nbsp; e tags inline, descartando blocos vazios', () => {
    const html = '<p>Primeira&nbsp;linha<br>continua</p><p></p><p><strong>Segunda</strong> parte.</p>';
    const r = splitReportIntoParagraphs(html);
    expect(r.map(p => p.text)).toEqual(['Primeira linha', 'continua', 'Segunda parte.']);
  });

  it('retorna [] para html vazio', () => {
    expect(splitReportIntoParagraphs('')).toEqual([]);
  });
});
