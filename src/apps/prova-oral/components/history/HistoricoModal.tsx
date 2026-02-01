/**
 * @file HistoricoModal.tsx
 * @description Modal de histórico de análises de prova oral
 */

import React, { useEffect, useState } from 'react';
import {
  History,
  Loader2,
  Search,
  Calendar,
  Trash2,
  ExternalLink,
  AlertCircle,
  FileText,
  Users,
} from 'lucide-react';
import { Modal, Button, Card, CardContent } from '../ui';
import { useAnalysesStore, useProvaOralStore } from '../../stores';
import { useProvaOralAPI } from '../../hooks';
import type { SavedProvaOralAnalysis } from '../../types';

interface HistoricoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HistoricoModal: React.FC<HistoricoModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { analyses, isLoading, error, filters, setFilters, getFilteredAnalyses } = useAnalysesStore();
  const { loadAnalysis, setLoadedAnalysisId } = useProvaOralStore();
  const { fetchAnalyses, deleteAnalysis } = useProvaOralAPI();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Carregar análises quando o modal abre
  useEffect(() => {
    if (isOpen) {
      fetchAnalyses();
    }
  }, [isOpen, fetchAnalyses]);

  const filteredAnalyses = getFilteredAnalyses();

  const handleSelect = (analysis: SavedProvaOralAnalysis) => {
    setSelectedId(analysis.id);
  };

  const handleLoad = () => {
    if (!selectedId) return;

    const analysis = analyses.find(a => a.id === selectedId);
    if (!analysis) return;

    loadAnalysis(
      analysis.id,
      analysis.transcricao,
      analysis.sinteseProcesso,
      analysis.resultado
    );
    setLoadedAnalysisId(analysis.id);
    onClose();
  };

  const handleDelete = () => {
    if (!selectedId) return;
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedId) return;
    setIsDeleting(true);
    await deleteAnalysis(selectedId);
    setIsDeleting(false);
    setSelectedId(null);
    setShowDeleteConfirm(false);
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Histórico de Análises"
      subtitle="Análises de prova oral salvas"
      icon={<History className="w-5 h-5" />}
      size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Fechar
          </Button>
          {selectedId && (
            <>
              {/* Só mostra botão excluir para análises próprias */}
              {(() => {
                const selectedAnalysis = analyses.find(a => a.id === selectedId);
                const isOwn = !selectedAnalysis || selectedAnalysis.isOwn !== false;
                return isOwn ? (
                  <Button
                    variant="danger"
                    onClick={handleDelete}
                    loading={isDeleting}
                    icon={<Trash2 className="w-4 h-4" />}
                  >
                    Excluir
                  </Button>
                ) : null;
              })()}
              <Button
                onClick={handleLoad}
                icon={<ExternalLink className="w-4 h-4" />}
              >
                Carregar
              </Button>
            </>
          )}
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
            value={filters.search}
            onChange={(e) => setFilters({ search: e.target.value })}
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
            Nenhuma análise de prova oral salva.
          </p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-2">
            As análises serão salvas automaticamente após processadas.
          </p>
        </div>
      )}

      {/* List */}
      {!isLoading && !error && filteredAnalyses.length > 0 && (
        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
          {filteredAnalyses.map((analysis) => (
            <button
              key={analysis.id}
              onClick={() => handleSelect(analysis)}
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
                  {/* Badge de compartilhamento */}
                  {analysis.isOwn === false && (
                    <span className="inline-flex items-center gap-1 text-xs bg-purple-500/20 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-full mb-1">
                      <Users className="w-3 h-3" />
                      Compartilhada por {analysis.ownerEmail}
                    </span>
                  )}

                  {/* Número do processo */}
                  <p className={`font-medium truncate ${
                    selectedId === analysis.id
                      ? 'text-indigo-700 dark:text-indigo-300'
                      : 'text-slate-800 dark:text-slate-100'
                  }`}>
                    {analysis.numeroProcesso || 'Processo não identificado'}
                  </p>

                  {/* Partes */}
                  <div className="flex flex-wrap gap-x-2 gap-y-1 text-sm text-slate-600 dark:text-slate-400 mt-1">
                    {analysis.reclamante && (
                      <span className="truncate max-w-[200px]">
                        {analysis.reclamante}
                      </span>
                    )}
                    {analysis.reclamante && analysis.reclamada && (
                      <span className="text-slate-400 dark:text-slate-500">vs.</span>
                    )}
                    {analysis.reclamada && (
                      <span className="truncate max-w-[200px]">
                        {analysis.reclamada}
                      </span>
                    )}
                  </div>

                  {/* Estatísticas */}
                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-500 dark:text-slate-500">
                    <span>{analysis.resultado.depoentes?.length || 0} depoentes</span>
                    <span>{analysis.resultado.analises?.length || 0} temas</span>
                    <span>{analysis.resultado.contradicoes?.length || 0} contradições</span>
                    <span>{analysis.resultado.confissoes?.length || 0} confissões</span>
                  </div>
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
            Nenhuma análise encontrada para "{filters.search}"
          </p>
        </div>
      )}

      {/* Selected analysis preview */}
      {selectedId && (
        <Card className="mt-4 bg-slate-50 dark:bg-slate-800/50">
          <CardContent>
            {(() => {
              const analysis = analyses.find(a => a.id === selectedId);
              if (!analysis) return null;

              return (
                <div className="text-sm">
                  <p className="font-medium text-slate-700 dark:text-slate-200 mb-2">
                    Prévia da análise selecionada:
                  </p>
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                        {analysis.resultado.depoentes?.length || 0}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Depoentes</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                        {analysis.resultado.analises?.length || 0}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Temas</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                        {analysis.resultado.contradicoes?.length || 0}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Contradições</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                        {analysis.resultado.confissoes?.length || 0}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Confissões</p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Modal de confirmação de exclusão */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Excluir Análise"
        subtitle="Confirme a exclusão"
        icon={<Trash2 className="w-5 h-5" />}
        iconColor="text-red-600 dark:text-red-400"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmDelete}
              loading={isDeleting}
              icon={<Trash2 className="w-4 h-4" />}
            >
              Excluir
            </Button>
          </>
        }
      >
        <div className="text-center py-4">
          <p className="text-slate-700 dark:text-slate-300">
            Deseja realmente excluir esta análise?
          </p>
          <p className="text-sm text-red-600 dark:text-red-400 mt-2">
            Esta ação não pode ser desfeita.
          </p>
        </div>
      </Modal>
    </Modal>
  );
};

export default HistoricoModal;
