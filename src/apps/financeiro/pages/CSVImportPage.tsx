import { useState, useEffect } from 'react';
import { FileSpreadsheet, Check, X, Trash2, CreditCard, ArrowLeft } from 'lucide-react';
import { useCSVImport } from '../hooks/useCSVImport';
import { Button } from '../components/ui';
import CSVUploader from '../components/csv/CSVUploader';
import CSVPreviewTable from '../components/csv/CSVPreviewTable';
import Header from '../components/layout/Header';
import { formatDate } from '../utils/formatters';
import type { BankId, BankInfo } from '../types';

/** Available banks — hardcoded for now, could fetch from /banks endpoint */
const BANKS: BankInfo[] = [
  { id: 'c6', name: 'Banco C6', logo: '/banks/c6.svg' },
];

export default function CSVImportPage() {
  const {
    preview, isUploading, isConfirming, imports,
    uploadCSV, confirmImport, fetchImports, deleteImport, cancelPreview,
  } = useCSVImport();

  const [selectedBank, setSelectedBank] = useState<BankId | null>(null);

  useEffect(() => {
    fetchImports();
  }, []);

  const handleConfirm = async () => {
    const result = await confirmImport(true);
    if (result) fetchImports();
  };

  const handleBackToSelection = () => {
    setSelectedBank(null);
    cancelPreview();
  };

  const selectedBankInfo = BANKS.find(b => b.id === selectedBank);
  const newCount = preview ? preview.newCount : 0;
  const reconciliationCount = preview ? preview.reconciliationCount : 0;
  const duplicateCount = preview ? preview.duplicateCount : 0;

  /** Map bank_id to bank info for import history */
  const getBankInfo = (bankId?: string) => {
    const bank = BANKS.find(b => b.id === bankId);
    return bank || { id: bankId, name: bankId || 'Banco C6' } as BankInfo;
  };

  return (
    <div>
      <Header title="Importar CSV" subtitle="Selecione o banco e importe a fatura" />

      {/* ═══ Step 1: Bank Selection ═══ */}
      {!selectedBank && !preview && (
        <div>
          <h3 className="text-sm font-semibold text-[#7c7caa] dark:text-gray-400 uppercase tracking-wider mb-4">
            Selecione o banco
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {BANKS.map((bank) => (
              <button
                key={bank.id}
                onClick={() => setSelectedBank(bank.id)}
                className="glass-card flex flex-col items-center gap-3 p-6 hover:border-indigo-500/40 dark:hover:border-indigo-400/40 border-2 border-transparent transition-all cursor-pointer group"
              >
                {bank.logo ? (
                  <img src={bank.logo} alt={bank.name} className="w-12 h-12 rounded-2xl" />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/15 to-violet-500/15 flex items-center justify-center group-hover:from-indigo-500/25 group-hover:to-violet-500/25 transition-all">
                    <CreditCard className="w-6 h-6 text-indigo-500" />
                  </div>
                )}
                <span className="text-sm font-semibold text-[#1e1b4b] dark:text-gray-100">{bank.name}</span>
              </button>
            ))}
            {/* Placeholder for future banks */}
            <div className="glass-card flex flex-col items-center gap-3 p-6 opacity-40 cursor-not-allowed border-2 border-transparent">
              <div className="w-12 h-12 rounded-2xl bg-gray-200/50 dark:bg-gray-700/50 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-gray-400 dark:text-gray-500" />
              </div>
              <span className="text-sm font-medium text-gray-400 dark:text-gray-500">Em breve</span>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Step 2: Upload or Preview ═══ */}
      {selectedBank && !preview && (
        <div>
          <button
            onClick={handleBackToSelection}
            className="flex items-center gap-2 text-sm text-[#7c7caa] dark:text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Trocar banco
          </button>
          <CSVUploader
            bankId={selectedBank}
            bankName={selectedBankInfo?.name || ''}
            onUpload={uploadCSV}
            isUploading={isUploading}
          />
        </div>
      )}

      {preview && (
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

      {/* ═══ Import History ═══ */}
      {imports.length > 0 && !preview && (
        <div className="mt-8">
          <h3 className="text-base font-bold text-[#1e1b4b] dark:text-gray-100 tracking-tight mb-4">Histórico de importações</h3>
          <div className="flex flex-col gap-3">
            {imports.map((imp) => {
              const bankInfo = getBankInfo(imp.bank_id);
              return (
              <div key={imp.id} className="glass-card flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  {bankInfo.logo ? (
                    <img src={bankInfo.logo} alt={bankInfo.name} className="w-10 h-10 rounded-[12px]" />
                  ) : (
                    <div className="w-10 h-10 rounded-[12px] bg-gradient-to-br from-indigo-500/15 to-violet-500/15 flex items-center justify-center">
                      <FileSpreadsheet className="w-5 h-5 text-indigo-500" />
                    </div>
                  )}
                  <div>
                    <div className="text-sm font-semibold text-[#1e1b4b] dark:text-gray-100">{imp.filename}</div>
                    <div className="text-xs text-[#7c7caa] dark:text-gray-400 mt-0.5">
                      {bankInfo.name} · {formatDate(imp.created_at.split('T')[0])} · {imp.imported_count} importadas · {imp.skipped_count} ignoradas
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
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
