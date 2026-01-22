/**
 * @file HistoricoModal.tsx
 * @description Modal de histórico de análises com filtros e agrupamento
 * @version 1.39.0
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  History,
  Search,
  Filter,
  Calendar,
  Clock,
  Trash2,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronRight,
  User,
  Building2,
  FileText,
  AlertCircle,
  CheckCircle,
  Loader2,
  X,
  Edit3,
  Save,
} from 'lucide-react';
import { Modal, Button } from '../ui';
import { useAnalysesStore } from '../../stores';
import { useAnalysesAPI } from '../../hooks';
import type {
  SavedAnalysis,
  ResultadoAudiencia,
  PautaGroup,
} from '../../types/analysis.types';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════

const RESULTADO_OPTIONS: { value: ResultadoAudiencia | 'todos'; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'pendente', label: 'Pendente' },
  { value: 'acordou', label: 'Acordo' },
  { value: 'desistiu', label: 'Desistência' },
  { value: 'arquivado', label: 'Arquivado' },
  { value: 'adiado', label: 'Adiado' },
  { value: 'instrucao', label: 'Instrução' },
  { value: 'sentenciado', label: 'Sentenciado' },
];

const RESULTADO_COLORS: Record<ResultadoAudiencia | 'null', string> = {
  pendente: 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300',
  acordou: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
  desistiu: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
  arquivado: 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300',
  adiado: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300',
  instrucao: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
  sentenciado: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300',
  null: 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400',
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return 'Sem data';
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

const formatShortDate = (dateStr: string | null): string => {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR');
};

// ═══════════════════════════════════════════════════════════════════════════
// SUBCOMPONENTES
// ═══════════════════════════════════════════════════════════════════════════

interface AnalysisItemProps {
  analysis: SavedAnalysis;
  isSelected: boolean;
  isSelectionMode: boolean;
  onToggleSelect: (id: string) => void;
  onView: (analysis: SavedAnalysis) => void;
  onUpdate: (id: string, updates: Partial<SavedAnalysis>) => void;
}

const AnalysisItem: React.FC<AnalysisItemProps> = ({
  analysis,
  isSelected,
  isSelectionMode,
  onToggleSelect,
  onView,
  onUpdate,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editHorario, setEditHorario] = useState(analysis.horarioAudiencia || '');
  const [editResultado, setEditResultado] = useState<ResultadoAudiencia | ''>(
    analysis.resultadoAudiencia || ''
  );

  const handleSave = useCallback(() => {
    onUpdate(analysis.id, {
      horarioAudiencia: editHorario || null,
      resultadoAudiencia: (editResultado as ResultadoAudiencia) || null,
    });
    setIsEditing(false);
  }, [analysis.id, editHorario, editResultado, onUpdate]);

  const handleCancel = useCallback(() => {
    setEditHorario(analysis.horarioAudiencia || '');
    setEditResultado(analysis.resultadoAudiencia || '');
    setIsEditing(false);
  }, [analysis.horarioAudiencia, analysis.resultadoAudiencia]);

  const resultadoColor =
    RESULTADO_COLORS[analysis.resultadoAudiencia || 'null'];

  return (
    <div
      className={`
        p-4 bg-white dark:bg-slate-800 rounded-lg border transition-all
        ${isSelected
          ? 'border-indigo-500 dark:border-indigo-400 shadow-md'
          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
        }
      `}
    >
      <div className="flex items-start gap-3">
        {/* Selection checkbox */}
        {isSelectionMode && (
          <button
            onClick={() => onToggleSelect(analysis.id)}
            className="mt-1 text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400"
          >
            {isSelected ? (
              <CheckSquare className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            ) : (
              <Square className="w-5 h-5" />
            )}
          </button>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <h4
                className="font-semibold text-slate-800 dark:text-slate-100 truncate cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400"
                onClick={() => onView(analysis)}
              >
                {analysis.numeroProcesso || 'Processo não identificado'}
              </h4>
              <div className="flex items-center gap-2 mt-1">
                <User className="w-3 h-3 text-slate-400" />
                <span className="text-sm text-slate-600 dark:text-slate-300 truncate">
                  {analysis.reclamante || '—'}
                </span>
              </div>
              {analysis.reclamadas.length > 0 && (
                <div className="flex items-center gap-2 mt-1">
                  <Building2 className="w-3 h-3 text-slate-400" />
                  <span className="text-sm text-slate-500 dark:text-slate-400 truncate">
                    {analysis.reclamadas.join(', ')}
                  </span>
                </div>
              )}
            </div>

            {/* Resultado badge */}
            <span
              className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${resultadoColor}`}
            >
              {analysis.resultadoAudiencia || 'Pendente'}
            </span>
          </div>

          {/* Edit mode */}
          {isEditing ? (
            <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Horário
                  </label>
                  <input
                    type="time"
                    value={editHorario}
                    onChange={(e) => setEditHorario(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Resultado
                  </label>
                  <select
                    value={editResultado}
                    onChange={(e) =>
                      setEditResultado(e.target.value as ResultadoAudiencia | '')
                    }
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
                  >
                    <option value="">Selecionar...</option>
                    {RESULTADO_OPTIONS.filter((o) => o.value !== 'todos').map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={handleCancel}
                  className="px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-md transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  className="px-3 py-1.5 text-sm bg-indigo-500 text-white hover:bg-indigo-600 rounded-md transition-colors flex items-center gap-1"
                >
                  <Save className="w-3 h-3" />
                  Salvar
                </button>
              </div>
            </div>
          ) : (
            /* View mode */
            <div className="flex items-center gap-4 mt-2 text-sm">
              {analysis.horarioAudiencia && (
                <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                  <Clock className="w-3 h-3" />
                  {analysis.horarioAudiencia}
                </div>
              )}
              <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                <FileText className="w-3 h-3" />
                {analysis.nomeArquivoPeticao || 'Arquivo não salvo'}
              </div>
              <button
                onClick={() => setIsEditing(true)}
                className="ml-auto text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface PautaGroupSectionProps {
  group: PautaGroup;
  selectedIds: Set<string>;
  isSelectionMode: boolean;
  onToggleSelect: (id: string) => void;
  onView: (analysis: SavedAnalysis) => void;
  onUpdate: (id: string, updates: Partial<SavedAnalysis>) => void;
}

const PautaGroupSection: React.FC<PautaGroupSectionProps> = ({
  group,
  selectedIds,
  isSelectionMode,
  onToggleSelect,
  onView,
  onUpdate,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const ChevronIcon = isExpanded ? ChevronDown : ChevronRight;
  const dateLabel = group.dataPauta ? formatDate(group.dataPauta) : 'Sem data de pauta';

  return (
    <div className="mb-6">
      {/* Group Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 w-full text-left mb-3"
      >
        <ChevronIcon className="w-5 h-5 text-slate-400" />
        <Calendar className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 capitalize">
          {dateLabel}
        </h3>
        <span className="px-2 py-0.5 text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full">
          {group.analyses.length}
        </span>
      </button>

      {/* Group Content */}
      {isExpanded && (
        <div className="space-y-3 ml-7">
          {group.analyses.map((analysis) => (
            <AnalysisItem
              key={analysis.id}
              analysis={analysis}
              isSelected={selectedIds.has(analysis.id)}
              isSelectionMode={isSelectionMode}
              onToggleSelect={onToggleSelect}
              onView={onView}
              onUpdate={onUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

interface HistoricoModalProps {
  onSelectAnalysis?: (analysis: SavedAnalysis) => void;
}

export const HistoricoModal: React.FC<HistoricoModalProps> = ({
  onSelectAnalysis,
}) => {
  // Stores
  const {
    isHistoricoOpen,
    closeHistorico,
    filters,
    setFilters,
    selectedIds,
    toggleSelection,
    selectAll,
    clearSelection,
    getGroupedByPauta,
    isLoading,
    analyses,
  } = useAnalysesStore();

  // API
  const { fetchAnalyses, updateAnalysis, deleteBatch } = useAnalysesAPI();

  // Local state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [dataPautaFilter, setDataPautaFilter] = useState('');

  // Fetch analyses on open
  useEffect(() => {
    if (isHistoricoOpen) {
      fetchAnalyses();
    }
  }, [isHistoricoOpen, fetchAnalyses]);

  // Computed
  const groupedAnalyses = useMemo(() => getGroupedByPauta(), [getGroupedByPauta, analyses, filters]);

  // Unique dates for filter
  const uniqueDates = useMemo(() => {
    const dates = new Set<string>();
    analyses.forEach((a) => {
      if (a.dataPauta) dates.add(a.dataPauta);
    });
    return Array.from(dates).sort().reverse();
  }, [analyses]);

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFilters({ search: e.target.value });
    },
    [setFilters]
  );

  const handleResultadoChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setFilters({ resultado: e.target.value as ResultadoAudiencia | 'todos' });
    },
    [setFilters]
  );

  const handleDataPautaChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      setDataPautaFilter(value);
      setFilters({ dataPauta: value || null });
    },
    [setFilters]
  );

  const handleToggleSelectionMode = useCallback(() => {
    setIsSelectionMode((prev) => !prev);
    if (isSelectionMode) {
      clearSelection();
    }
  }, [isSelectionMode, clearSelection]);

  const handleSelectAll = useCallback(() => {
    selectAll();
  }, [selectAll]);

  const handleDeleteSelected = useCallback(async () => {
    if (selectedIds.size === 0) return;

    const confirmed = window.confirm(
      `Tem certeza que deseja excluir ${selectedIds.size} análise(s)?`
    );

    if (!confirmed) return;

    setIsDeleting(true);
    await deleteBatch(Array.from(selectedIds));
    setIsDeleting(false);
    clearSelection();
    setIsSelectionMode(false);
  }, [selectedIds, deleteBatch, clearSelection]);

  const handleView = useCallback(
    (analysis: SavedAnalysis) => {
      if (onSelectAnalysis) {
        onSelectAnalysis(analysis);
        closeHistorico();
      }
    },
    [onSelectAnalysis, closeHistorico]
  );

  const handleUpdate = useCallback(
    async (id: string, updates: Partial<SavedAnalysis>) => {
      await updateAnalysis(id, {
        horarioAudiencia: updates.horarioAudiencia ?? undefined,
        resultadoAudiencia: updates.resultadoAudiencia ?? undefined,
        pendencias: updates.pendencias ?? undefined,
        dataPauta: updates.dataPauta ?? undefined,
      });
    },
    [updateAnalysis]
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  const totalAnalyses = analyses.length;
  const filteredCount = groupedAnalyses.reduce((sum, g) => sum + g.analyses.length, 0);

  return (
    <Modal
      isOpen={isHistoricoOpen}
      onClose={closeHistorico}
      title="Histórico de Análises"
      subtitle={`${totalAnalyses} análise${totalAnalyses !== 1 ? 's' : ''} salva${totalAnalyses !== 1 ? 's' : ''}`}
      icon={<History className="w-6 h-6" />}
      size="full"
    >
      <div className="flex flex-col h-[calc(90vh-180px)]">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-700">
          {/* Search */}
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por processo ou reclamante..."
              value={filters.search}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Resultado filter */}
          <select
            value={filters.resultado}
            onChange={handleResultadoChange}
            className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {RESULTADO_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Data Pauta filter */}
          <select
            value={dataPautaFilter}
            onChange={handleDataPautaChange}
            className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Todas as datas</option>
            {uniqueDates.map((date) => (
              <option key={date} value={date}>
                {formatShortDate(date)}
              </option>
            ))}
          </select>

          {/* Selection mode toggle */}
          <button
            onClick={handleToggleSelectionMode}
            className={`
              px-3 py-2 rounded-lg border transition-colors flex items-center gap-2
              ${isSelectionMode
                ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
                : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
              }
            `}
          >
            <CheckSquare className="w-4 h-4" />
            Selecionar
          </button>
        </div>

        {/* Selection toolbar */}
        {isSelectionMode && (
          <div className="flex items-center justify-between py-3 px-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg mt-3">
            <div className="flex items-center gap-3">
              <button
                onClick={handleSelectAll}
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Selecionar todos
              </button>
              <button
                onClick={clearSelection}
                className="text-sm text-slate-600 dark:text-slate-400 hover:underline"
              >
                Limpar seleção
              </button>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {selectedIds.size} selecionado{selectedIds.size !== 1 ? 's' : ''}
              </span>
            </div>
            <button
              onClick={handleDeleteSelected}
              disabled={selectedIds.size === 0 || isDeleting}
              className="flex items-center gap-2 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              Excluir
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
          ) : filteredCount === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <History className="w-16 h-16 text-slate-300 dark:text-slate-600 mb-4" />
              <h3 className="text-lg font-medium text-slate-600 dark:text-slate-300 mb-2">
                Nenhuma análise encontrada
              </h3>
              <p className="text-slate-500 dark:text-slate-400">
                {totalAnalyses === 0
                  ? 'Processe documentos para ver o histórico aqui.'
                  : 'Tente ajustar os filtros de busca.'}
              </p>
            </div>
          ) : (
            <div>
              {groupedAnalyses.map((group) => (
                <PautaGroupSection
                  key={group.dataPauta || 'sem-data'}
                  group={group}
                  selectedIds={selectedIds}
                  isSelectionMode={isSelectionMode}
                  onToggleSelect={toggleSelection}
                  onView={handleView}
                  onUpdate={handleUpdate}
                />
              ))}
            </div>
          )}
        </div>

        {/* Stats */}
        {filteredCount > 0 && filteredCount !== totalAnalyses && (
          <div className="pt-3 border-t border-slate-200 dark:border-slate-700 text-sm text-slate-500 dark:text-slate-400">
            Mostrando {filteredCount} de {totalAnalyses} análise{totalAnalyses !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default HistoricoModal;
