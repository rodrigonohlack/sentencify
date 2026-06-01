/**
 * @file pdfRasterize.test.ts
 * @description Testes de rasterizePdfDocumentBlocks. O render real (pdf.js/canvas)
 * não roda em jsdom; usamos o `renderer` injetável para testar a transformação de
 * blocos document → image de forma determinística.
 */

import { describe, it, expect, vi } from 'vitest';
import { rasterizePdfDocumentBlocks } from './pdfRasterize';

describe('rasterizePdfDocumentBlocks', () => {
  it('substitui um bloco document por N blocos image (uma página = um bloco)', async () => {
    const renderer = vi.fn().mockResolvedValue(['PAG1', 'PAG2', 'PAG3']);
    const messages = [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'analise o PDF' },
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: 'PDFBASE64' } },
        ],
      },
    ];

    const out = await rasterizePdfDocumentBlocks(messages, { renderer });

    expect(renderer).toHaveBeenCalledWith('PDFBASE64', 1.5, 0.85);
    const content = out[0].content as Array<Record<string, unknown>>;
    // 1 texto + 3 imagens
    expect(content).toHaveLength(4);
    expect(content[0]).toEqual({ type: 'text', text: 'analise o PDF' });
    expect(content[1]).toEqual({
      type: 'image',
      source: { type: 'base64', media_type: 'image/jpeg', data: 'PAG1' },
    });
    expect(content[3]).toMatchObject({ source: { data: 'PAG3' } });
  });

  it('preserva conteúdo string e blocos não-document intactos', async () => {
    const renderer = vi.fn().mockResolvedValue(['X']);
    const messages = [
      { role: 'system', content: 'instruções' },
      { role: 'user', content: [{ type: 'text', text: 'oi' }] },
    ];

    const out = await rasterizePdfDocumentBlocks(messages, { renderer });

    expect(renderer).not.toHaveBeenCalled();
    expect(out[0].content).toBe('instruções');
    expect(out[1].content).toEqual([{ type: 'text', text: 'oi' }]);
  });

  it('não muta o array de entrada (imutável)', async () => {
    const renderer = vi.fn().mockResolvedValue(['P']);
    const original = [
      {
        role: 'user',
        content: [{ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: 'D' } }],
      },
    ];
    const snapshot = JSON.parse(JSON.stringify(original));

    await rasterizePdfDocumentBlocks(original, { renderer });

    expect(original).toEqual(snapshot);
  });

  it('ignora bloco document com media_type não-PDF (não rasteriza)', async () => {
    const renderer = vi.fn().mockResolvedValue(['X']);
    const messages = [
      {
        role: 'user',
        content: [
          { type: 'document', source: { type: 'base64', media_type: 'text/plain', data: 'NAO_PDF' } },
        ],
      },
    ];

    const out = await rasterizePdfDocumentBlocks(messages, { renderer });

    expect(renderer).not.toHaveBeenCalled();
    expect(out[0].content).toEqual([
      { type: 'document', source: { type: 'base64', media_type: 'text/plain', data: 'NAO_PDF' } },
    ]);
  });

  it('respeita scale/quality customizados ao chamar o renderer', async () => {
    const renderer = vi.fn().mockResolvedValue(['P']);
    const messages = [
      {
        role: 'user',
        content: [{ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: 'D' } }],
      },
    ];

    await rasterizePdfDocumentBlocks(messages, { renderer, scale: 2, quality: 0.7 });

    expect(renderer).toHaveBeenCalledWith('D', 2, 0.7);
  });

  it('lida com múltiplos documentos numa mesma mensagem', async () => {
    const renderer = vi
      .fn()
      .mockResolvedValueOnce(['A1', 'A2'])
      .mockResolvedValueOnce(['B1']);
    const messages = [
      {
        role: 'user',
        content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: 'DOC_A' } },
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: 'DOC_B' } },
        ],
      },
    ];

    const out = await rasterizePdfDocumentBlocks(messages, { renderer });
    const content = out[0].content as Array<Record<string, unknown>>;

    expect(content).toHaveLength(3); // 2 páginas de A + 1 de B
    expect(content.map((c) => (c.source as { data: string }).data)).toEqual(['A1', 'A2', 'B1']);
  });
});
