/**
 * @file transcriptSegments.ts
 * @description Segmenta uma transcrição de audiência em falas delimitadas por
 *              timestamp, para renderização em "modo leitura" no preview de prova.
 * @version 1.52.26
 *
 * Suporta timestamps no formato (M:SS), (MM:SS) e (H:MM:SS), como os gerados
 * pelas transcrições importadas na aba Provas. Texto sem timestamps (prova colada
 * apenas como texto) retorna um único segmento sem marcação de tempo.
 */

/** Uma fala da transcrição: o timestamp (ou null para texto solto) e seu conteúdo. */
export interface TranscriptSegment {
  /** Timestamp original, ex.: "(0:08)" — ou null para texto antes do 1º timestamp. */
  timestamp: string | null;
  /** Texto da fala, com bordas aparadas e quebras internas preservadas. */
  text: string;
}

// Captura (M:SS), (MM:SS) ou (H:MM:SS). O grupo de captura faz o split preservar
// os próprios timestamps como delimitadores.
const TIMESTAMP_RE = /(\(\d{1,2}:\d{2}(?::\d{2})?\))/g;

/**
 * Quebra uma transcrição em segmentos por timestamp.
 *
 * @param raw Texto bruto da transcrição (proof.text).
 * @returns Lista ordenada de segmentos. Vazia se a entrada for vazia/só espaços.
 */
export function segmentTranscript(raw: string): TranscriptSegment[] {
  if (typeof raw !== 'string' || raw.trim() === '') return [];

  const parts = raw.split(TIMESTAMP_RE);
  const segments: TranscriptSegment[] = [];

  // parts[0] é qualquer texto que anteceda o primeiro timestamp.
  const lead = parts[0]?.trim() ?? '';
  if (lead) segments.push({ timestamp: null, text: lead });

  // A partir daí os elementos alternam: timestamp, texto, timestamp, texto...
  for (let i = 1; i < parts.length; i += 2) {
    const timestamp = parts[i];
    const text = (parts[i + 1] ?? '').trim();
    segments.push({ timestamp, text });
  }

  return segments;
}
