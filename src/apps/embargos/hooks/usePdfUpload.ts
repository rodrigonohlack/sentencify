/**
 * @file usePdfUpload.ts
 * @description Upload de PDF para um slot específico. Extrai texto + base64,
 *              decide useBinary com base no provider atual, atualiza store.
 */

import { useCallback } from 'react';
import { useDocumentStore, useAIStore } from '../stores';
import { providerSupportsPdfBinary } from '../constants';
import { extractPdfMetadata } from '../services/pdfService';
import type { DocumentFile, DocumentSlot } from '../types';

interface UsePdfUploadResult {
  uploadFile: (file: File) => Promise<void>;
  removeFile: () => void;
  slot: DocumentFile | null;
}

export function usePdfUpload(slot: DocumentSlot): UsePdfUploadResult {
  const setSlot = useDocumentStore(s => s.setSlot);
  const updateSlotStatus = useDocumentStore(s => s.updateSlotStatus);
  const slotData = useDocumentStore(s => s[slot]);
  const provider = useAIStore(s => s.aiSettings.provider);

  const uploadFile = useCallback(async (file: File) => {
    const id = crypto.randomUUID();
    setSlot(slot, {
      id,
      slot,
      name: file.name,
      size: file.size,
      text: '',
      base64: null,
      useBinary: false,
      status: 'parsing'
    });

    try {
      const meta = await extractPdfMetadata(file);
      const useBinary = providerSupportsPdfBinary(provider) && !meta.hasUsableText;
      setSlot(slot, {
        id,
        slot,
        name: file.name,
        size: file.size,
        text: meta.text,
        base64: meta.base64,
        useBinary,
        status: 'ready'
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao processar PDF';
      updateSlotStatus(slot, 'error', msg);
    }
  }, [setSlot, updateSlotStatus, slot, provider]);

  const removeFile = useCallback(() => {
    setSlot(slot, null);
  }, [setSlot, slot]);

  return { uploadFile, removeFile, slot: slotData };
}
