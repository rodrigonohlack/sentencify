import { useCallback, useRef } from 'react';
import { Upload, FileSpreadsheet } from 'lucide-react';
import { Button } from '../ui';
import type { BankId } from '../../types';

interface CSVUploaderProps {
  bankId: BankId;
  bankName: string;
  onUpload: (file: File, bankId: BankId) => void;
  isUploading: boolean;
}

export default function CSVUploader({ bankId, bankName, onUpload, isUploading }: CSVUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) {
      onUpload(file, bankId);
    }
  }, [onUpload, bankId]);

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file, bankId);
  };

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className="glass-card flex flex-col items-center justify-center py-16 px-8 text-center border-2 border-dashed border-indigo-500/20 dark:border-indigo-400/20 hover:border-indigo-500/40 dark:hover:border-indigo-400/40 transition-colors cursor-pointer"
      onClick={() => inputRef.current?.click()}
    >
      <input ref={inputRef} type="file" accept=".csv" onChange={handleSelect} className="hidden" />
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/15 to-violet-500/15 flex items-center justify-center mb-5">
        <FileSpreadsheet className="w-8 h-8 text-indigo-500" />
      </div>
      <h3 className="text-lg font-bold text-[#1e1b4b] dark:text-gray-100 mb-2">Importar CSV — {bankName}</h3>
      <p className="text-sm text-[#7c7caa] dark:text-gray-400 max-w-sm mb-6">
        Arraste o CSV do {bankName} aqui ou clique para selecionar.
      </p>
      <Button isLoading={isUploading}>
        <Upload className="w-4 h-4" /> Selecionar arquivo
      </Button>
    </div>
  );
}
