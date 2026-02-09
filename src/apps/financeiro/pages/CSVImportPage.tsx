import { useEffect } from 'react';
import { FileSpreadsheet, Check, X, Trash2 } from 'lucide-react';
import { useCSVImport } from '../hooks/useCSVImport';
import { Button } from '../components/ui';
import CSVUploader from '../components/csv/CSVUploader';
import CSVPreviewTable from '../components/csv/CSVPreviewTable';
import Header from '../components/layout/Header';
import { formatDate } from '../utils/formatters';

export default function CSVImportPage() {
  const {
    preview, isUploading, isConfirming, imports,
    uploadCSV, confirmImport, fetchImports, deleteImport, cancelPreview,
  } = useCSVImport();

  useEffect(() => {
    fetchImports();
  }, []);

  const handleConfirm = async () => {
    const result = await confirmImport(true);
    if (result) fetchImports();
  };

  const newCount = preview ? preview.newCount : 0;
  const reconciliationCount = preview ? preview.reconciliationCount : 0;
  const duplicateCount = preview ? preview.duplicateCount : 0;

  return (
    <div>
      <Header title="Importar CSV" subtitle="Importe faturas do cartão de crédito" />

      {/* Upload area or Preview */}
      {!preview ? (
        <CSVUploader onUpload={uploadCSV} isUploading={isUploading} />
      ) : (
        <div className="flex flex-col gap-5">
          <CSVPreviewTable
            rows={preview.preview}
            totalRows={preview.totalRows}
            duplicateCount={duplicateCount}
            reconciliationCount={reconciliationCount}
          />

          {/* Action buttons */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-[#7c7caa] dark:text-gray-400 flex flex-wrap gap-x-2">
              <span>
                <span className="font-bold text-[#1e1b4b] dark:text-gray-100">{newCount}</span> novas
              </span>
              {reconciliationCount > 0 && (
                <span>
                  · <span className="font-bold text-sky-600">{reconciliationCount}</span> reconciliadas
                </span>
              )}
              {duplicateCount > 0 && (
                <span>
                  · <span className="font-bold text-amber-600">{duplicateCount}</span> duplicatas ignoradas
                </span>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={cancelPreview}>
                <X className="w-4 h-4" /> Cancelar
              </Button>
              <Button onClick={handleConfirm} isLoading={isConfirming}>
                <Check className="w-4 h-4" /> Confirmar importação
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Import history */}
      {imports.length > 0 && !preview && (
        <div className="mt-8">
          <h3 className="text-base font-bold text-[#1e1b4b] dark:text-gray-100 tracking-tight mb-4">Histórico de importações</h3>
          <div className="flex flex-col gap-3">
            {imports.map((imp) => (
              <div key={imp.id} className="glass-card flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-[12px] bg-gradient-to-br from-indigo-500/15 to-violet-500/15 flex items-center justify-center">
                    <FileSpreadsheet className="w-5 h-5 text-indigo-500" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[#1e1b4b] dark:text-gray-100">{imp.filename}</div>
                    <div className="text-xs text-[#7c7caa] dark:text-gray-400 mt-0.5">
                      {formatDate(imp.created_at.split('T')[0])} · {imp.imported_count} importadas · {imp.skipped_count} ignoradas
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => deleteImport(imp.id)}
                  className="p-2.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                  title="Remover importação e despesas associadas"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
