/**
 * @file useFileProcessing.ts
 * @description Hook para processamento de arquivos (PDF)
 */

import { useCallback } from 'react';
import { useDocumentStore } from '../stores';
import { extractTextFromPDF, isValidPDF, formatFileSize } from '../services/pdfService';
import type { DocumentFile, DocumentType } from '../types';

export const useFileProcessing = () => {
  const { setPeticao, setContestacao, updateDocument } = useDocumentStore();

  const processFile = useCallback(async (file: File, type: DocumentType): Promise<void> => {
    const id = `${type}-${Date.now()}`;

    // Create initial document entry
    const initialDoc: DocumentFile = {
      id,
      name: file.name,
      type,
      file,
      text: '',
      status: 'processing',
      uploadedAt: new Date()
    };

    // Set document in store
    if (type === 'peticao') {
      setPeticao(initialDoc);
    } else {
      setContestacao(initialDoc);
    }

    try {
      // Validate file
      if (!isValidPDF(file)) {
        throw new Error('Arquivo inválido. Por favor, envie um PDF.');
      }

      // Extract text
      const result = await extractTextFromPDF(file);

      if (!result.text || result.text.trim().length < 100) {
        throw new Error('Não foi possível extrair texto suficiente do PDF. O arquivo pode estar escaneado ou protegido.');
      }

      // Update document with extracted text
      const updatedDoc: DocumentFile = {
        ...initialDoc,
        text: result.text,
        base64: result.base64,
        status: 'ready'
      };

      if (type === 'peticao') {
        setPeticao(updatedDoc);
      } else {
        setContestacao(updatedDoc);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao processar arquivo';

      const errorDoc: DocumentFile = {
        ...initialDoc,
        status: 'error',
        error: errorMessage
      };

      if (type === 'peticao') {
        setPeticao(errorDoc);
      } else {
        setContestacao(errorDoc);
      }

      throw error;
    }
  }, [setPeticao, setContestacao, updateDocument]);

  const removeFile = useCallback((type: DocumentType) => {
    if (type === 'peticao') {
      setPeticao(null);
    } else {
      setContestacao(null);
    }
  }, [setPeticao, setContestacao]);

  return {
    processFile,
    removeFile,
    formatFileSize
  };
};

export default useFileProcessing;
