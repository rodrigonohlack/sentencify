/**
 * @file HistoricoModal.tsx
 * @description Modal de histórico de análises com filtros e agrupamento
 * @version 1.39.0
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  History,
  Search,
  Calendar,
  CalendarPlus,
  Clock,
  Trash2,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronRight,
  User,
  Building2,
  Loader2,
  X,
  AlertCircle,
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
  { value: 'acordo', label: '✅ Acordo' },
  { value: 'sentenca', label: '⚖️ Sentença' },
  { value: 'sentenca_marcada', label: '📅 Sentença marcada' },
  { value: 'audiencia_encerramento', label: '📋 Aud. encerramento' },
  { value: 'adiamento', label: '🔄 Adiamento' },
  { value: 'redesignada_notificacao', label: '📬 Redesignada c/ notificação' },
  { value: 'cancelada', label: '❌ Cancelada' },
  { value: 'desistencia', label: '🚫 Desistência' },
  { value: 'arquivamento', label: '📦 Arquivamento' },
  { value: 'instrucao_encerrada', label: '✔️ Instrução encerrada' },
  { value: 'aguardando_pericia', label: '🔬 Aguardando perícia' },
  { value: 'suspenso', label: '⏸️ Suspenso' },
];

const RESULTADO_COLORS: Record<ResultadoAudiencia | 'null', string> = {
  acordo: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
  sentenca: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300',
  sentenca_marcada: 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300',
  audiencia_encerramento: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
  adiamento: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300',
  redesignada_notificacao: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
  cancelada: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
  desistencia: 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300',
  arquivamento: 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300',
  instrucao_encerrada: 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300',
  aguardando_pericia: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300',
  suspenso: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
  null: 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400',
};

const PENDENCIAS_OPCOES = [
  { value: 'razoes_finais', label: 'Razões finais' },
  { value: 'transcrever_audiencia', label: 'Transcrever audiência' },
  { value: 'prova_determinada', label: 'Prova determinada' },
  { value: 'pericia', label: 'Perícia' },
  { value: 'carta_precatoria', label: 'Carta precatória' },
  { value: 'juntada_docs', label: 'Juntada de documentos' },
  { value: 'manifestacao_parte', label: 'Manifestação da parte' },
  { value: 'calculo_liquidacao', label: 'Cálculo de liquidação' },
  { value: 'aguardando_transito', label: 'Aguardando trânsito' },
  { value: 'intimacao_testemunha', label: 'Intimação de testemunha' },
  { value: 'outra', label: 'Outra pendência' },
] as const;

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return 'Sem data';
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

const formatShortDate = (dateStr: string | null): string => {
  if (!dateStr) return '—';
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('pt-BR');
};

/** Extrai número do processo do campo ou do nome do arquivo */
const getNumeroProcesso = (analysis: SavedAnalysis): string | null => {
  if (analysis.numeroProcesso) return analysis.numeroProcesso;
  if (analysis.nomeArquivoPeticao) {
    const match = analysis.nomeArquivoPeticao.match(/\[(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})\]/);
    if (match) return match[1];
    const cnjMatch = analysis.nomeArquivoPeticao.match(/(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})/);
    if (cnjMatch) return cnjMatch[1];
  }
  return null;
};

/** Retorna label legível para o resultado */
const getResultadoLabel = (resultado: ResultadoAudiencia | null): string => {
  if (!resultado) return 'Sem resultado';
  const opt = RESULTADO_OPTIONS.find((o) => o.value === resultado);
  return opt?.label || resultado;
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
  const numeroProcesso = getNumeroProcesso(analysis);
  const resultadoColor = RESULTADO_COLORS[analysis.resultadoAudiencia || 'null'];

  // Local state para o horário (evita API call a cada keystroke)
  const [localHorario, setLocalHorario] = useState(analysis.horarioAudiencia || '');

  useEffect(() => {
    setLocalHorario(analysis.horarioAudiencia || '');
  }, [analysis.horarioAudiencia]);

  const handleHorarioBlur = useCallback(() => {
    if (localHorario !== (analysis.horarioAudiencia || '')) {
      onUpdate(analysis.id, { horarioAudiencia: localHorario || null });
    }
  }, [analysis.id, analysis.horarioAudiencia, localHorario, onUpdate]);

  const handleResultadoChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value as ResultadoAudiencia | '';
      onUpdate(analysis.id, { resultadoAudiencia: value || null });
    },
    [analysis.id, onUpdate]
  );

  const handleTogglePendencia = useCallback(
    (pendenciaValue: string) => {
      const current = analysis.pendencias || [];
      const updated = current.includes(pendenciaValue)
        ? current.filter((p) => p !== pendenciaValue)
        : [...current, pendenciaValue];
      onUpdate(analysis.id, { pendencias: updated });
    },
    [analysis.id, analysis.pendencias, onUpdate]
  );

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
          {/* Header row: processo + reclamante */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <h4
                className="font-semibold text-slate-800 dark:text-slate-100 truncate cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400"
                onClick={() => onView(analysis)}
                title="Clique para abrir análise"
              >
                {numeroProcesso || 'Processo não identificado'}
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
          </div>

          {/* Inline controls row */}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {/* Horário input */}
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="time"
                value={localHorario}
                onChange={(e) => setLocalHorario(e.target.value)}
                onBlur={handleHorarioBlur}
                className="px-2 py-1 text-sm border border-slate-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 w-[110px]"
              />
            </div>

            {/* Resultado select */}
            <select
              value={analysis.resultadoAudiencia || ''}
              onChange={handleResultadoChange}
              className={`px-2 py-1 text-sm border rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 ${
                analysis.resultadoAudiencia
                  ? resultadoColor + ' border-transparent'
                  : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              <option value="">Sem resultado</option>
              {RESULTADO_OPTIONS.filter((o) => o.value !== 'todos').map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Pendências pills */}
          <div className="mt-3">
            <div className="flex flex-wrap gap-1.5">
              {PENDENCIAS_OPCOES.map((pend) => {
                const isActive = (analysis.pendencias || []).includes(pend.value);
                return (
                  <button
                    key={pend.value}
                    onClick={() => handleTogglePendencia(pend.value)}
                    className={`
                      px-2.5 py-1 text-xs rounded-full border transition-all
                      ${isActive
                        ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700 font-medium'
                        : 'bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
                      }
                    `}
                  >
                    {pend.label}
                  </button>
                );
              })}
            </div>
          </div>
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
  const { fetchAnalyses, updateAnalysis, updateBatchDataPauta, deleteBatch } = useAnalysesAPI();

  // Local state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [dataPautaFilter, setDataPautaFilter] = useState('');
  const [dataPautaSelecionada, setDataPautaSelecionada] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

  const handleDeleteClick = useCallback(() => {
    if (selectedIds.size === 0) return;
    setShowDeleteConfirm(true);
  }, [selectedIds]);

  const handleConfirmDelete = useCallback(async () => {
    setShowDeleteConfirm(false);
    setIsDeleting(true);
    await deleteBatch(Array.from(selectedIds));
    setIsDeleting(false);
    clearSelection();
    setIsSelectionMode(false);
  }, [selectedIds, deleteBatch, clearSelection]);

  const handleSetPautaHoje = useCallback(() => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    setDataPautaSelecionada(today);
  }, []);

  const handleAplicarPauta = useCallback(async () => {
    if (selectedIds.size === 0 || !dataPautaSelecionada) return;
    await updateBatchDataPauta(Array.from(selectedIds), dataPautaSelecionada);
    setDataPautaSelecionada('');
  }, [selectedIds, dataPautaSelecionada, updateBatchDataPauta]);

  const handleRemoverPauta = useCallback(async () => {
    if (selectedIds.size === 0) return;
    await updateBatchDataPauta(Array.from(selectedIds), null);
    setDataPautaSelecionada('');
  }, [selectedIds, updateBatchDataPauta]);

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
    (id: string, updates: Partial<SavedAnalysis>) => {
      updateAnalysis(id, {
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
          <div className="py-3 px-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg mt-3 space-y-3">
            {/* Top row: select controls + count + delete */}
            <div className="flex items-center justify-between">
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
                onClick={handleDeleteClick}
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

            {/* Bottom row: Definir Pauta */}
            <div className="flex items-center gap-2 pt-2 border-t border-indigo-100 dark:border-indigo-800/40">
              <CalendarPlus className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Pauta:</span>
              <button
                onClick={handleSetPautaHoje}
                className="px-2.5 py-1 text-xs bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md text-slate-600 dark:text-slate-300 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors"
              >
                Hoje
              </button>
              <input
                type="date"
                value={dataPautaSelecionada}
                onChange={(e) => setDataPautaSelecionada(e.target.value)}
                className="px-2 py-1 text-sm border border-slate-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-indigo-500"
              />
              <button
                onClick={handleAplicarPauta}
                disabled={selectedIds.size === 0 || !dataPautaSelecionada}
                className="px-2.5 py-1 text-xs bg-indigo-500 hover:bg-indigo-600 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Aplicar
              </button>
              <button
                onClick={handleRemoverPauta}
                disabled={selectedIds.size === 0}
                className="px-2.5 py-1 text-xs text-slate-600 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 border border-slate-200 dark:border-slate-600 rounded-md hover:border-red-300 dark:hover:border-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <X className="w-3 h-3 inline mr-0.5" />
                Remover
              </button>
            </div>
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

      {/* Modal de confirmação de exclusão */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Excluir Análises?"
        icon={<AlertCircle className="w-6 h-6" />}
        iconColor="text-red-600 dark:text-red-400"
        size="sm"
        footer={
          <>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmDelete}
              className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium transition-colors"
            >
              Sim, Excluir
            </button>
          </>
        }
      >
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
          {selectedIds.size} análise{selectedIds.size !== 1 ? 's' : ''} será{selectedIds.size !== 1 ? 'ão' : ''} excluída{selectedIds.size !== 1 ? 's' : ''} permanentemente.
        </div>
      </Modal>
    </Modal>
  );
};

export default HistoricoModal;
