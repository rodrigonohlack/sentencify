/**
 * @file useFileProcessing.ts
 * @description Hook para processamento de arquivos (PDF)
 * Suporta petição inicial, emendas e contestações
 */

import { useCallback } from 'react';
import { useDocumentStore } from '../stores';
import { extractTextFromPDF, isValidPDF, formatFileSize } from '../services/pdfService';
import type { DocumentFile, DocumentType } from '../types';

export const useFileProcessing = () => {
  const {
    setPeticao,
    addEmenda,
    updateEmenda,
    removeEmenda: storeRemoveEmenda,
    addContestacao,
    updateContestacao,
    removeContestacao: storeRemoveContestacao,
    emendas,
    contestacoes
  } = useDocumentStore();

  // ═══════════════════════════════════════════════════════════════════════════
  // PETIÇÃO INICIAL
  // ═══════════════════════════════════════════════════════════════════════════

  const processPeticao = useCallback(async (file: File): Promise<void> => {
    const id = `peticao-${Date.now()}`;

    const initialDoc: DocumentFile = {
      id,
      name: file.name,
      type: 'peticao',
      file,
      text: '',
      status: 'processing',
      uploadedAt: new Date(),
      order: 0
    };

    setPeticao(initialDoc);

    try {
      if (!isValidPDF(file)) {
        throw new Error('Arquivo inválido. Por favor, envie um PDF.');
      }

      const result = await extractTextFromPDF(file);

      if (!result.text || result.text.trim().length < 100) {
        throw new Error(
          'Não foi possível extrair texto suficiente do PDF. O arquivo pode estar escaneado ou protegido.'
        );
      }

      setPeticao({
        ...initialDoc,
        text: result.text,
        base64: result.base64,
        status: 'ready'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao processar arquivo';
      setPeticao({
        ...initialDoc,
        status: 'error',
        error: errorMessage
      });
      throw error;
    }
  }, [setPeticao]);

  const removePeticao = useCallback(() => {
    setPeticao(null);
  }, [setPeticao]);

  // ═══════════════════════════════════════════════════════════════════════════
  // EMENDAS
  // ═══════════════════════════════════════════════════════════════════════════

  const processEmenda = useCallback(async (file: File): Promise<void> => {
    const id = `emenda-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const initialDoc: DocumentFile = {
      id,
      name: file.name,
      type: 'emenda',
      file,
      text: '',
      status: 'processing',
      uploadedAt: new Date(),
      order: emendas.length
    };

    addEmenda(initialDoc);

    try {
      if (!isValidPDF(file)) {
        throw new Error('Arquivo inválido. Por favor, envie um PDF.');
      }

      const result = await extractTextFromPDF(file);

      if (!result.text || result.text.trim().length < 100) {
        throw new Error(
          'Não foi possível extrair texto suficiente do PDF. O arquivo pode estar escaneado ou protegido.'
        );
      }

      updateEmenda(id, {
        text: result.text,
        base64: result.base64,
        status: 'ready'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao processar arquivo';
      updateEmenda(id, {
        status: 'error',
        error: errorMessage
      });
      throw error;
    }
  }, [addEmenda, updateEmenda, emendas.length]);

  const removeEmenda = useCallback((id: string) => {
    storeRemoveEmenda(id);
  }, [storeRemoveEmenda]);

  // ═══════════════════════════════════════════════════════════════════════════
  // CONTESTAÇÕES
  // ═══════════════════════════════════════════════════════════════════════════

  const processContestacao = useCallback(async (file: File): Promise<void> => {
    const id = `contestacao-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const initialDoc: DocumentFile = {
      id,
      name: file.name,
      type: 'contestacao',
      file,
      text: '',
      status: 'processing',
      uploadedAt: new Date(),
      order: contestacoes.length
    };

    addContestacao(initialDoc);

    try {
      if (!isValidPDF(file)) {
        throw new Error('Arquivo inválido. Por favor, envie um PDF.');
      }

      const result = await extractTextFromPDF(file);

      if (!result.text || result.text.trim().length < 100) {
        throw new Error(
          'Não foi possível extrair texto suficiente do PDF. O arquivo pode estar escaneado ou protegido.'
        );
      }

      updateContestacao(id, {
        text: result.text,
        base64: result.base64,
        status: 'ready'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao processar arquivo';
      updateContestacao(id, {
        status: 'error',
        error: errorMessage
      });
      throw error;
    }
  }, [addContestacao, updateContestacao, contestacoes.length]);

  const removeContestacao = useCallback((id: string) => {
    storeRemoveContestacao(id);
  }, [storeRemoveContestacao]);

  // ═══════════════════════════════════════════════════════════════════════════
  // LEGADO (mantido para compatibilidade com código existente)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * @deprecated Use processPeticao, processEmenda ou processContestacao
   */
  const processFile = useCallback(
    async (file: File, type: DocumentType): Promise<void> => {
      if (type === 'peticao') {
        return processPeticao(file);
      }
      if (type === 'emenda') {
        return processEmenda(file);
      }
      return processContestacao(file);
    },
    [processPeticao, processEmenda, processContestacao]
  );

  /**
   * @deprecated Use removePeticao, removeEmenda ou removeContestacao
   */
  const removeFile = useCallback(
    (type: DocumentType, id?: string) => {
      if (type === 'peticao') {
        removePeticao();
      } else if (type === 'emenda' && id) {
        removeEmenda(id);
      } else if (type === 'contestacao' && id) {
        removeContestacao(id);
      }
    },
    [removePeticao, removeEmenda, removeContestacao]
  );

  /**
   * Extrai texto de um arquivo PDF sem armazenar no store
   * Usado pelo BatchMode para processar múltiplos arquivos
   */
  const extractPDFText = useCallback(
    async (file: File): Promise<{ text: string; base64?: string }> => {
      if (!isValidPDF(file)) {
        throw new Error('Arquivo inválido. Por favor, envie um PDF.');
      }

      const result = await extractTextFromPDF(file);

      if (!result.text || result.text.trim().length < 100) {
        throw new Error(
          'Não foi possível extrair texto suficiente do PDF. O arquivo pode estar escaneado ou protegido.'
        );
      }

      return result;
    },
    []
  );

  return {
    // Petição
    processPeticao,
    removePeticao,
    // Emendas
    processEmenda,
    removeEmenda,
    // Contestações
    processContestacao,
    removeContestacao,
    // Legado
    processFile,
    removeFile,
    // Utilitários
    extractPDFText,
    formatFileSize
  };
};

export default useFileProcessing;
