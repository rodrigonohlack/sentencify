/**
 * @file useProofManager.ts
 * @description Hook para gerenciamento de provas (PDFs e textos)
 * @version 1.36.76
 *
 * Extraído do App.tsx - wrapper que adiciona handlers de I/O
 * ao store Zustand (useProofManagerCompat)
 */

import React from 'react';
import { useProofManagerCompat } from '../stores/useProofsStore';
import { savePdfToIndexedDB } from './useLocalStorage';
import type { ProofFile, ProofText, Proof } from '../types';

/**
 * Interface de retorno do useProofManager
 */
export type UseProofManagerReturn = ReturnType<typeof useProofManagerCompat> & {
  handleUploadProofPdf: (files: FileList | File[]) => Promise<void>;
  handleAddProofText: () => void;
  handleDeleteProof: (proof: Proof) => void;
};

/**
 * Hook para gerenciamento de provas
 * Delega estado para Zustand e adiciona handlers com I/O (IndexedDB)
 *
 * @param _documentServices - Parâmetro legacy (não utilizado, mantido para compatibilidade)
 * @returns Estados e handlers para gerenciar provas
 */
const useProofManager = (_documentServices: unknown = null): UseProofManagerReturn => {
  // Delega estado e ações simples para o store Zustand
  const storeState = useProofManagerCompat();

  // 🔧 v1.14.1: Helpers utilitários (permanecem aqui pois são usados nos handlers abaixo)
  const removeById = React.useCallback(<T extends { id: string | number }>(arr: T[], id: string | number): T[] => arr.filter((item: T) => item.id !== id), []);
  const toFilesArray = React.useCallback((value: FileList | File[] | null) => Array.isArray(value) ? value : Array.from(value || []), []);

  // Handler: Upload de provas em PDF (usa savePdfToIndexedDB externo)
  const handleUploadProofPdf = React.useCallback(async (files: FileList | File[]) => {
    const filesArray = toFilesArray(files);

    for (const file of filesArray) {
      const id = Date.now() + Math.random();
      const newProof: ProofFile = {
        id,
        file,
        name: file.name,
        type: 'pdf',
        size: file.size,
        uploadDate: new Date().toISOString()
      };

      storeState.setProofFiles(prev => [...prev, newProof]);
      storeState.setProofUsePdfMode(prev => ({ ...prev, [id]: true }));
      storeState.setProofProcessingModes(prev => ({ ...prev, [id]: 'pdfjs' }));

      // Salvar no IndexedDB para persistência entre reloads
      try {
        await savePdfToIndexedDB(`proof-${id}`, file, 'proof');
      } catch (err) {
        // Silently ignore - PDF won't persist but app continues working
      }
    }
  }, [toFilesArray, storeState]);

  // Handler: Adicionar prova em texto
  const handleAddProofText = React.useCallback(() => {
    if (!storeState.newProofTextData.name.trim() || !storeState.newProofTextData.text.trim()) {
      return;
    }

    const id = Date.now() + Math.random();
    const newProof: ProofText = {
      id,
      text: storeState.newProofTextData.text,
      name: storeState.newProofTextData.name,
      type: 'text',
      uploadDate: new Date().toISOString()
    };

    storeState.setProofTexts(prev => [...prev, newProof]);
    storeState.setNewProofTextData({ name: '', text: '' });
  }, [storeState]);

  // Handler: Deletar prova (PDF ou texto)
  const handleDeleteProof = React.useCallback((proof: Proof) => {
    if (proof.isPdf || proof.type === 'pdf') {
      storeState.setProofFiles(prev => removeById(prev, proof.id));
    } else {
      storeState.setProofTexts(prev => removeById(prev, proof.id));
    }
    // Limpar dados relacionados
    storeState.setProofUsePdfMode(prev => { const { [proof.id]: _, ...rest } = prev; return rest; });
    storeState.setExtractedProofTexts(prev => { const { [proof.id]: _, ...rest } = prev; return rest; });
    storeState.setProofExtractionFailed(prev => { const { [proof.id]: _, ...rest } = prev; return rest; });
    storeState.setProofTopicLinks(prev => { const { [proof.id]: _, ...rest } = prev; return rest; });
    storeState.setProofAnalysisResults(prev => { const { [proof.id]: _, ...rest } = prev; return rest; });
    storeState.setProofConclusions(prev => { const { [proof.id]: _, ...rest } = prev; return rest; });
    storeState.setProofProcessingModes(prev => { const { [proof.id]: _, ...rest } = prev; return rest; });
  }, [removeById, storeState]);

  // Retorno combinado: store + handlers com IO
  return {
    ...storeState,
    handleUploadProofPdf,
    handleAddProofText,
    handleDeleteProof
  };
};

export { useProofManager };
