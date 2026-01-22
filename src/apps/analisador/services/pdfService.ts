/**
 * @file pdfService.ts
 * @description Serviço para extração de texto de PDFs
 * Usa o mesmo pdf.js (3.11.174) que o Sentencify via window.pdfjsLib
 * para evitar conflitos de versão com o pdfjs-dist npm
 */

export interface PDFExtractionResult {
  text: string;
  pageCount: number;
  base64?: string;
}

/**
 * Carrega pdf.js de forma compatível com o Sentencify
 * Reutiliza window.pdfjsLib se já existir, ou carrega via CDN
 */
const loadPDFJS = async (): Promise<any> => {
  // Se já existe (carregado pelo Sentencify), reutiliza
  if ((window as any).pdfjsLib) {
    return (window as any).pdfjsLib;
  }

  // Fallback: carrega via CDN (mesma versão do Sentencify)
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      const pdfjsLib = (window as any).pdfjsLib;
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

/**
 * Extrai texto de um arquivo PDF
 */
export async function extractTextFromPDF(file: File): Promise<PDFExtractionResult> {
  const pdfjsLib = await loadPDFJS();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const textParts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    textParts.push(pageText);
  }

  // Convert to base64 for API calls
  const base64 = await fileToBase64(file);

  return {
    text: textParts.join('\n\n'),
    pageCount: pdf.numPages,
    base64
  };
}

/**
 * Converte arquivo para base64
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Valida se o arquivo é um PDF válido
 */
export function isValidPDF(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

/**
 * Formata tamanho do arquivo
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
