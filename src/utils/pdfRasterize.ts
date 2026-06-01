/**
 * @file pdfRasterize.ts
 * @description Rasteriza PDFs em imagens de página (JPEG base64) e converte blocos
 * de conteúdo `document` (PDF) em blocos `image`.
 *
 * Uso: provider Codex Local (CLI), que NÃO aceita PDF (binário/Files API) mas aceita
 * imagens via `codex exec -i <arquivo>`. No caminho do Codex, transformamos cada PDF
 * em N imagens (uma por página) antes do envio; o bridge (llm-bridge) decodifica e
 * passa um `-i` por página. Reusa o mesmo pdf.js do pipeline de visão
 * (useDocumentServices), com a mesma escala/qualidade.
 *
 * NÃO afeta Claude/Gemini (PDF binário nativo) nem OpenAI cloud — a chamada é feita
 * apenas no ramo `localBridge` (Codex) dos hooks de integração.
 */

import type { PdfjsLib } from '../types';

// Tipos estruturais mínimos: o util é genérico sobre o formato de mensagem para
// servir tanto o app principal (types/index.ts, com bloco `image`) quanto os
// subapps (types/ai.ts), sem exigir cast nos pontos de chamada.
interface RasterContentBlock {
  type?: string;
  source?: { type?: string; media_type?: string; data?: string };
  [key: string]: unknown;
}
interface RasterMessage {
  role: string;
  content: unknown;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════════

/** Escala de render — espelha o pipeline de visão (mantém < 2000px por imagem). */
export const DEFAULT_RASTERIZE_SCALE = 1.5;
/** Qualidade JPEG — espelha o pipeline de visão. */
export const DEFAULT_RASTERIZE_QUALITY = 0.85;

export interface RasterizeOptions {
  scale?: number;
  quality?: number;
  /**
   * Injeção para testes: substitui o render real (pdf.js/canvas indisponíveis em
   * jsdom). Recebe o PDF base64 e retorna um JPEG base64 por página.
   */
  renderer?: (base64Pdf: string, scale: number, quality: number) => Promise<string[]>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOADER pdf.js (reusa window.pdfjsLib, igual aos pdfService dos subapps)
// ═══════════════════════════════════════════════════════════════════════════════

const loadPdfJs = async (): Promise<PdfjsLib> => {
  if (window.pdfjsLib) return window.pdfjsLib;

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      const pdfjsLib = window.pdfjsLib;
      if (pdfjsLib) {
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        resolve(pdfjsLib);
      } else {
        reject(new Error('pdfjsLib não carregado'));
      }
    };
    script.onerror = () => reject(new Error('Falha ao carregar pdf.js'));
    document.head.appendChild(script);
  });
};

/** Decodifica base64 → Uint8Array (para o pdf.js consumir como `data`). */
function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RASTERIZAÇÃO
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Rasteriza um PDF (base64, sem prefixo data:) em uma lista de JPEGs base64,
 * um por página, na ordem original.
 *
 * @returns array de strings base64 (sem prefixo `data:image/jpeg;base64,`).
 */
export async function rasterizePdfToImages(
  base64Pdf: string,
  scale: number = DEFAULT_RASTERIZE_SCALE,
  quality: number = DEFAULT_RASTERIZE_QUALITY
): Promise<string[]> {
  const pdfjsLib = await loadPdfJs();
  const data = base64ToUint8Array(base64Pdf);

  const pdf = await pdfjsLib.getDocument({
    data,
    useSystemFonts: true,
    disableFontFace: true,
  } as unknown as { data: ArrayBuffer }).promise;

  const images: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    try {
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas 2D context indisponível');
      await page.render({ canvasContext: context, viewport }).promise;
      const base64Image = canvas.toDataURL('image/jpeg', quality).split(',')[1];
      images.push(base64Image);
    } finally {
      // Libera memória do canvas sempre.
      canvas.width = 0;
      canvas.height = 0;
    }
  }
  return images;
}

/**
 * Bloco de conteúdo é um documento PDF base64? Exige `type: 'document'` com dados e
 * media_type de PDF (ou ausente — no projeto, blocos document são sempre PDF). Blocos
 * `document` de outro media_type são ignorados para não passar não-PDF ao pdf.js.
 */
function isPdfDocumentBlock(c: unknown): c is { source: { data: string } } {
  if (typeof c !== 'object' || c === null) return false;
  const block = c as RasterContentBlock;
  if (block.type !== 'document' || !block.source?.data) return false;
  const mediaType = block.source.media_type;
  return !mediaType || mediaType === 'application/pdf';
}

/**
 * Substitui, em cada mensagem, blocos `document` (PDF) por N blocos `image` (uma
 * imagem JPEG por página). Blocos não-PDF e conteúdo string passam intactos.
 * Imutável: retorna um novo array, não muta a entrada.
 *
 * Genérico sobre o tipo de mensagem (`T`): devolve o mesmo tipo recebido, evitando
 * cast nos pontos de chamada (app principal e subapps usam tipos distintos).
 *
 * Para uso no ramo Codex (localBridge): a conversão posterior para o formato do
 * bridge já transforma blocos `image` em `image_url` data URI.
 */
export async function rasterizePdfDocumentBlocks<T extends RasterMessage>(
  messages: T[],
  opts: RasterizeOptions = {}
): Promise<T[]> {
  const scale = opts.scale ?? DEFAULT_RASTERIZE_SCALE;
  const quality = opts.quality ?? DEFAULT_RASTERIZE_QUALITY;
  const render = opts.renderer
    ? (b64: string) => opts.renderer!(b64, scale, quality)
    : (b64: string) => rasterizePdfToImages(b64, scale, quality);

  const out: T[] = [];
  for (const msg of messages) {
    if (!Array.isArray(msg.content)) {
      out.push(msg);
      continue;
    }

    const newContent: RasterContentBlock[] = [];
    for (const block of msg.content as RasterContentBlock[]) {
      if (isPdfDocumentBlock(block)) {
        const pages = await render(block.source.data);
        for (const pageBase64 of pages) {
          newContent.push({
            type: 'image',
            source: { type: 'base64', media_type: 'image/jpeg', data: pageBase64 },
          });
        }
      } else {
        newContent.push(block);
      }
    }
    out.push({ ...msg, content: newContent } as T);
  }
  return out;
}
