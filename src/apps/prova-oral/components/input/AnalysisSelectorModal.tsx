/**
 * @file AnalysisSelectorModal.tsx
 * @description Modal para selecionar análise do Analisador de Prepauta
 */

import React, { useEffect, useState } from 'react';
import { FileSearch, Loader2, Search, FileText, Calendar, AlertCircle } from 'lucide-react';
import { Modal, Button } from '../ui';
import { useAnalisadorIntegration } from '../../hooks';

interface AnalysisSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (sintese: string) => void;
}

export const AnalysisSelectorModal: React.FC<AnalysisSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelect,
}) => {
  const { analyses, isLoading, error, fetchAnalyses, convertToSintese } = useAnalisadorIntegration();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Carregar análises quando o modal abre
  useEffect(() => {
    if (isOpen && analyses.length === 0) {
      fetchAnalyses();
    }
  }, [isOpen, analyses.length, fetchAnalyses]);

  // Filtrar análises
  const filteredAnalyses = analyses.filter((a) => {
    const search = searchTerm.toLowerCase();
    return (
      a.numeroProcesso?.toLowerCase().includes(search) ||
      a.reclamante?.toLowerCase().includes(search) ||
      a.reclamadas?.some(r => r.toLowerCase().includes(search))
    );
  });

  const handleConfirm = () => {
    if (!selectedId) return;

    const analysis = analyses.find(a => a.id === selectedId);
    if (!analysis) return;

    const sintese = convertToSintese(analysis);
    onSelect(sintese);
    onClose();
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Importar do Analisador"
      subtitle="Selecione uma análise para importar a síntese do processo"
      icon={<FileSearch className="w-5 h-5" />}
      size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedId}
          >
            Importar Síntese
          </Button>
        </>
      }
    >
      {/* Busca */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por processo, reclamante ou reclamada..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          <span className="ml-3 text-slate-500 dark:text-slate-400">Carregando análises...</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-800 dark:text-red-300">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && analyses.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400">
            Nenhuma análise encontrada no Analisador de Prepauta.
          </p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-2">
            Analise um processo no Analisador primeiro para poder importar aqui.
          </p>
        </div>
      )}

      {/* List */}
      {!isLoading && !error && filteredAnalyses.length > 0 && (
        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
          {filteredAnalyses.map((analysis) => (
            <button
              key={analysis.id}
              onClick={() => setSelectedId(analysis.id)}
              className={`
                w-full p-4 rounded-xl border-2 text-left transition-all
                ${selectedId === analysis.id
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800'
                }
              `}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Número do processo */}
                  <p className={`font-medium truncate ${
                    selectedId === analysis.id
                      ? 'text-indigo-700 dark:text-indigo-300'
                      : 'text-slate-800 dark:text-slate-100'
                  }`}>
                    {analysis.numeroProcesso || 'Processo não identificado'}
                  </p>

                  {/* Reclamante */}
                  {analysis.reclamante && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 truncate mt-1">
                      {analysis.reclamante}
                    </p>
                  )}

                  {/* Reclamadas */}
                  {analysis.reclamadas?.length > 0 && (
                    <p className="text-xs text-slate-500 dark:text-slate-500 truncate mt-0.5">
                      vs. {analysis.reclamadas.join(', ')}
                    </p>
                  )}
                </div>

                {/* Data */}
                <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 flex-shrink-0">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDate(analysis.createdAt)}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results for search */}
      {!isLoading && !error && analyses.length > 0 && filteredAnalyses.length === 0 && (
        <div className="text-center py-8">
          <Search className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400">
            Nenhuma análise encontrada para "{searchTerm}"
          </p>
        </div>
      )}
    </Modal>
  );
};

export default AnalysisSelectorModal;
