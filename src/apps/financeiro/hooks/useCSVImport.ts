import { useState, useCallback } from 'react';
import { useUIStore } from '../stores/useUIStore';
import { apiFetch } from '../utils/api';
import { ENDPOINTS } from '../constants/api';
import type { CSVPreviewRow, CSVImport } from '../types';

interface UploadResult {
  filename: string;
  fileHash: string;
  billingMonth: string | null;
  totalRows: number;
  duplicateCount: number;
  reconciliationCount: number;
  newCount: number;
  preview: CSVPreviewRow[];
}

export function useCSVImport() {
  const [preview, setPreview] = useState<UploadResult | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [imports, setImports] = useState<CSVImport[]>([]);
  const addToast = useUIStore((s) => s.addToast);

  const uploadCSV = useCallback(async (file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const data = await apiFetch<UploadResult>(ENDPOINTS.CSV_UPLOAD, {
        method: 'POST',
        body: formData,
      });
      setPreview(data);
      const parts: string[] = [];
      parts.push(`${data.totalRows} linhas encontradas`);
      if (data.duplicateCount > 0) parts.push(`${data.duplicateCount} duplicatas`);
      if (data.reconciliationCount > 0) parts.push(`${data.reconciliationCount} reconciliações`);
      addToast(parts.join(' · '), 'info');
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao processar CSV';
      addToast(message, 'error');
      throw error;
    } finally {
      setIsUploading(false);
    }
  }, [addToast]);

  const confirmImport = useCallback(async (skipDuplicates = true) => {
    setIsConfirming(true);
    try {
      const data = await apiFetch<{
        success: boolean;
        importId: string;
        importedCount: number;
        skippedCount: number;
        projectedCount: number;
        reconciledCount: number;
      }>(ENDPOINTS.CSV_CONFIRM, {
        method: 'POST',
        body: JSON.stringify({ skipDuplicates }),
      });

      setPreview(null);
      const parts: string[] = [];
      if (data.importedCount > 0) parts.push(`${data.importedCount} importadas`);
      if (data.projectedCount > 0) parts.push(`${data.projectedCount} projetadas`);
      if (data.reconciledCount > 0) parts.push(`${data.reconciledCount} reconciliadas`);
      addToast(parts.join(' · ') || 'Importação concluída', 'success');
      return data;
    } catch {
      addToast('Erro ao confirmar importação', 'error');
    } finally {
      setIsConfirming(false);
    }
  }, [addToast]);

  const fetchImports = useCallback(async () => {
    try {
      const data = await apiFetch<{ imports: CSVImport[] }>(ENDPOINTS.CSV_IMPORTS);
      setImports(data.imports);
    } catch {
      addToast('Erro ao carregar importações', 'error');
    }
  }, [addToast]);

  const deleteImport = useCallback(async (id: string) => {
    try {
      await apiFetch(`${ENDPOINTS.CSV_IMPORTS}/${id}`, { method: 'DELETE' });
      setImports((prev) => prev.filter((i) => i.id !== id));
      addToast('Importação removida', 'success');
    } catch {
      addToast('Erro ao remover importação', 'error');
    }
  }, [addToast]);

  const cancelPreview = useCallback(() => setPreview(null), []);

  return {
    preview, isUploading, isConfirming, imports,
    uploadCSV, confirmImport, fetchImports, deleteImport, cancelPreview,
  };
}
