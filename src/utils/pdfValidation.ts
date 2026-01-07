/**
 * Utilitário para validação de arquivos PDF
 * v1.33.40
 *
 * @version 1.35.80 - Migrado para TypeScript
 */

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════

/** Tamanho máximo de arquivo em bytes (100MB) */
export const MAX_FILE_SIZE = 100 * 1024 * 1024;

/** Magic bytes de um arquivo PDF */
export const PDF_MAGIC_BYTES = '%PDF';

/** MIME types válidos para PDF */
export const VALID_PDF_TYPES: readonly string[] = ['application/pdf', 'application/x-pdf'];

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

/** Resultado de validação de PDF */
export interface PDFValidationResult {
  valid: boolean;
  error?: string;
}

/** Arquivo inválido com erro */
export interface InvalidFile {
  file: File;
  error: string;
}

/** Resultado de validação múltipla */
export interface MultipleValidationResult {
  valid: File[];
  invalid: InvalidFile[];
}

/** Informações extraídas de um arquivo */
export interface FileInfo {
  name: string;
  size: string;
  sizeBytes: number;
  type: string;
  lastModified: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNÇÕES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Valida um arquivo antes de processá-lo
 */
export const validatePDF = async (file: File | null | undefined): Promise<PDFValidationResult> => {
  // Validar se arquivo foi fornecido
  if (!file) {
    return { valid: false, error: 'Arquivo não fornecido' };
  }

  // Validar tamanho
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = Math.round(file.size / (1024 * 1024));
    return { valid: false, error: `Arquivo muito grande: ${sizeMB}MB (máximo: 100MB)` };
  }

  // Validar se arquivo não está vazio
  if (file.size === 0) {
    return { valid: false, error: 'Arquivo está vazio' };
  }

  // Validar MIME type
  if (!VALID_PDF_TYPES.includes(file.type) && !file.name.toLowerCase().endsWith('.pdf')) {
    return { valid: false, error: `Tipo de arquivo inválido: ${file.type || 'desconhecido'}. Esperado: PDF` };
  }

  // Validar magic bytes (primeiros 4 bytes do arquivo)
  try {
    const isValidMagic = await checkMagicBytes(file);
    if (!isValidMagic) {
      return { valid: false, error: 'Arquivo corrompido ou não é um PDF válido' };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    return { valid: false, error: `Erro ao ler arquivo: ${message}` };
  }

  return { valid: true };
};

/**
 * Verifica os magic bytes do arquivo
 */
export const checkMagicBytes = (file: File): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e: ProgressEvent<FileReader>): void => {
      try {
        const result = e.target?.result;
        if (!(result instanceof ArrayBuffer)) {
          resolve(false);
          return;
        }
        const arr = new Uint8Array(result);
        const header = String.fromCharCode(...arr.slice(0, 4));
        resolve(header === PDF_MAGIC_BYTES);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (): void => {
      reject(new Error('Falha ao ler o arquivo'));
    };

    // Ler apenas os primeiros 4 bytes
    reader.readAsArrayBuffer(file.slice(0, 4));
  });
};

/**
 * Valida múltiplos arquivos PDF
 */
export const validateMultiplePDFs = async (files: FileList | File[]): Promise<MultipleValidationResult> => {
  const results: MultipleValidationResult = {
    valid: [],
    invalid: []
  };

  for (const file of files) {
    const validation = await validatePDF(file);
    if (validation.valid) {
      results.valid.push(file);
    } else {
      results.invalid.push({ file, error: validation.error || 'Erro desconhecido' });
    }
  }

  return results;
};

/**
 * Estima o tempo de processamento baseado no tamanho do arquivo
 */
export const estimateProcessingTime = (file: File | null | undefined): string => {
  if (!file) return 'Desconhecido';

  const sizeMB = file.size / (1024 * 1024);

  // Estimativas baseadas em experiência (~1-2s por MB)
  if (sizeMB < 1) return 'Menos de 5 segundos';
  if (sizeMB < 5) return '5-15 segundos';
  if (sizeMB < 20) return '15-45 segundos';
  if (sizeMB < 50) return '1-2 minutos';
  return '2-5 minutos';
};

/**
 * Formata tamanho de arquivo para exibição
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Extrai informações básicas de um arquivo PDF
 */
export const extractFileInfo = (file: File | null | undefined): FileInfo | null => {
  if (!file) return null;

  return {
    name: file.name,
    size: formatFileSize(file.size),
    sizeBytes: file.size,
    type: file.type || 'application/pdf',
    lastModified: file.lastModified ? new Date(file.lastModified).toISOString() : null
  };
};
