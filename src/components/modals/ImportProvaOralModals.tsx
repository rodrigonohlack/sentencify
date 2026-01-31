/**
 * @file ImportProvaOralModals.tsx
 * @description Modais para importar análises de Prova Oral
 * @version 1.39.08
 *
 * Segue padrões: BaseModal + classes theme-*
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Mic, FileText, Search, AlertCircle, Check, Loader2 } from 'lucide-react';
import { BaseModal, CSS, ModalFooter } from './BaseModal';
import type { SavedProvaOralAnalysis } from '../../apps/prova-oral/types';
import {
  PROVA_ORAL_SECTIONS,
  getAvailableSections,
  type ProvaOralSectionKey
} from '../../utils/formatProvaOralImport';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

export interface ImportProvaOralListModalProps {
  isOpen: boolean;
  onClose: () => void;
  analyses: SavedProvaOralAnalysis[];
  isLoading: boolean;
  error: string | null;
  onSelect: (analysis: SavedProvaOralAnalysis) => void;
  onRefresh: () => void;
  /** Número do processo atual para pré-filtrar análises */
  currentProcessoNumero?: string;
}

export interface ImportProvaOralSectionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: SavedProvaOralAnalysis | null;
  onImport: (analysis: SavedProvaOralAnalysis, sections: ProvaOralSectionKey[]) => void;
  isImporting?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Formata data para exibição
 */
function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateStr;
  }
}

/**
 * Gera descrição resumida da análise
 */
function getAnalysisDescription(analysis: SavedProvaOralAnalysis): string {
  const parts: string[] = [];
  if (analysis.reclamante) parts.push(analysis.reclamante);
  if (analysis.reclamada) parts.push(`vs ${analysis.reclamada}`);
  if (analysis.vara) parts.push(`(${analysis.vara})`);
  return parts.join(' ') || 'Sem descrição';
}

// ═══════════════════════════════════════════════════════════════════════════
// MODAL 1: LISTA DE ANÁLISES
// ═══════════════════════════════════════════════════════════════════════════

export const ImportProvaOralListModal: React.FC<ImportProvaOralListModalProps> = ({
  isOpen,
  onClose,
  analyses,
  isLoading,
  error,
  onSelect,
  onRefresh,
  currentProcessoNumero
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAll, setShowAll] = useState(false);

  // Reset search ao abrir (sem onRefresh nas deps para evitar loop infinito)
  useEffect(() => {
    if (isOpen && !isLoading) {
      setSearchTerm('');
      setShowAll(false);
      onRefresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Análises que correspondem ao processo atual
  const matchingAnalyses = useMemo(() => {
    if (!currentProcessoNumero?.trim()) return analyses;

    const normalized = currentProcessoNumero.replace(/[.\-\/]/g, '').toLowerCase();
    return analyses.filter(a => {
      if (!a.numeroProcesso) return false;
      const aNormalized = a.numeroProcesso.replace(/[.\-\/]/g, '').toLowerCase();
      return aNormalized.includes(normalized) || normalized.includes(aNormalized);
    });
  }, [analyses, currentProcessoNumero]);

  // Análises base (matching ou todas)
  const baseAnalyses = showAll ? analyses : matchingAnalyses;

  // Filtrar por termo de busca
  const filteredAnalyses = useMemo(() => {
    if (!searchTerm.trim()) return baseAnalyses;

    const term = searchTerm.toLowerCase();
    return baseAnalyses.filter(a =>
      a.numeroProcesso?.toLowerCase().includes(term) ||
      a.reclamante?.toLowerCase().includes(term) ||
      a.reclamada?.toLowerCase().includes(term) ||
      a.vara?.toLowerCase().includes(term)
    );
  }, [baseAnalyses, searchTerm]);

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Importar Análise de Prova Oral"
      subtitle="Selecione uma análise salva para importar"
      icon={<Mic />}
      iconColor="purple"
      size="lg"
    >
      {/* Campo de busca */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 theme-text-muted" />
        <input
          type="text"
          placeholder="Buscar por processo, partes ou vara..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={`${CSS.input} pl-10`}
          autoFocus
        />
      </div>

      {/* Aviso de filtro ativo */}
      {currentProcessoNumero && !showAll && (
        <div className="mb-4 p-3 rounded-lg theme-info-box">
          <p className="text-sm theme-text-blue">
            Mostrando análises do processo {currentProcessoNumero}
            {matchingAnalyses.length === 0 && ' (nenhuma encontrada)'}
          </p>
          {analyses.length > matchingAnalyses.length && (
            <button
              onClick={() => setShowAll(true)}
              className="text-sm theme-text-purple hover:underline mt-1"
            >
              Ver todas ({analyses.length} análises)
            </button>
          )}
        </div>
      )}

      {/* Erro */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-900/20 border border-red-500/30">
          <p className="text-sm theme-text-red flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </p>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin theme-text-muted" />
        </div>
      )}

      {/* Lista vazia */}
      {!isLoading && !error && filteredAnalyses.length === 0 && (
        <div className="text-center py-12 theme-text-muted">
          <Mic className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>{searchTerm ? 'Nenhuma análise encontrada' : 'Nenhuma análise de prova oral salva'}</p>
          <p className="text-sm mt-2">
            {searchTerm ? 'Tente outro termo de busca' : 'Crie análises no app Prova Oral primeiro'}
          </p>
        </div>
      )}

      {/* Lista de análises */}
      {!isLoading && filteredAnalyses.length > 0 && (
        <div className="max-h-[50vh] overflow-y-auto space-y-2">
          {filteredAnalyses.map(analysis => (
            <button
              key={analysis.id}
              onClick={() => onSelect(analysis)}
              className="w-full p-4 text-left rounded-lg theme-bg-secondary border theme-border-input hover:border-purple-500/50 transition-all group"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <span className="font-medium theme-text-secondary block truncate">
                    {analysis.numeroProcesso || 'Processo não identificado'}
                  </span>
                  <p className="text-sm theme-text-muted truncate mt-0.5">
                    {getAnalysisDescription(analysis)}
                  </p>
                  <p className="text-xs theme-text-disabled mt-1">
                    {formatDate(analysis.updatedAt || analysis.createdAt)}
                  </p>
                </div>
                <div className="ml-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs px-2 py-1 rounded theme-bg-purple-accent theme-text-purple">
                    Selecionar
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Footer com contagem */}
      {!isLoading && analyses.length > 0 && (
        <div className="mt-4 pt-4 border-t theme-border-modal">
          <p className="text-xs theme-text-muted text-center">
            {filteredAnalyses.length} de {analyses.length} análises
          </p>
        </div>
      )}
    </BaseModal>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MODAL 2: SELEÇÃO DE SEÇÕES
// ═══════════════════════════════════════════════════════════════════════════

export const ImportProvaOralSectionsModal: React.FC<ImportProvaOralSectionsModalProps> = ({
  isOpen,
  onClose,
  analysis,
  onImport,
  isImporting = false
}) => {
  const [selectedSections, setSelectedSections] = useState<ProvaOralSectionKey[]>([]);

  // Seções disponíveis na análise
  const availableSections = useMemo(() => {
    if (!analysis?.resultado) return [];
    return getAvailableSections(analysis.resultado);
  }, [analysis]);

  // Reset ao abrir com nova análise
  useEffect(() => {
    if (isOpen && analysis) {
      // Selecionar todas as seções disponíveis por padrão
      setSelectedSections(getAvailableSections(analysis.resultado));
    }
  }, [isOpen, analysis]);

  // Toggle seção
  const toggleSection = useCallback((key: ProvaOralSectionKey) => {
    setSelectedSections(prev =>
      prev.includes(key)
        ? prev.filter(k => k !== key)
        : [...prev, key]
    );
  }, []);

  // Selecionar/deselecionar todas
  const toggleAll = useCallback(() => {
    if (selectedSections.length === availableSections.length) {
      setSelectedSections([]);
    } else {
      setSelectedSections([...availableSections]);
    }
  }, [selectedSections, availableSections]);

  // Handler de importação
  const handleImport = useCallback(() => {
    if (!analysis || selectedSections.length === 0) return;
    onImport(analysis, selectedSections);
  }, [analysis, selectedSections, onImport]);

  if (!analysis) return null;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Selecionar Seções"
      subtitle={analysis.numeroProcesso || 'Análise de Prova Oral'}
      icon={<FileText />}
      iconColor="purple"
      size="md"
      preventClose={isImporting}
      footer={
        <ModalFooter.Standard
          onClose={onClose}
          onConfirm={handleImport}
          confirmText={isImporting ? 'Importando...' : 'Importar'}
          disabled={selectedSections.length === 0}
          loading={isImporting}
        />
      }
    >
      {/* Info box */}
      <div className="mb-4 p-3 rounded-lg theme-info-box">
        <p className="text-xs theme-text-blue">
          Selecione as seções que deseja importar. A transcrição completa será incluída automaticamente como conteúdo da prova.
        </p>
      </div>

      {/* Botão selecionar todas */}
      <div className="mb-3">
        <button
          onClick={toggleAll}
          className="text-sm theme-text-purple hover:underline"
        >
          {selectedSections.length === availableSections.length ? 'Desmarcar todas' : 'Selecionar todas'}
        </button>
      </div>

      {/* Lista de seções */}
      <div className="space-y-2">
        {PROVA_ORAL_SECTIONS.map(section => {
          const isAvailable = availableSections.includes(section.key);
          const isSelected = selectedSections.includes(section.key);

          return (
            <label
              key={section.key}
              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                !isAvailable
                  ? 'opacity-50 cursor-not-allowed theme-bg-secondary border theme-border-input'
                  : isSelected
                    ? 'bg-purple-600/20 border border-purple-500/50'
                    : 'theme-bg-secondary border theme-border-input hover:border-purple-500/30'
              }`}
            >
              <div className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${
                isSelected
                  ? 'bg-purple-600 border-purple-600'
                  : 'theme-border-input'
              }`}>
                {isSelected && <Check className="w-3 h-3 text-white" />}
              </div>
              <input
                type="checkbox"
                checked={isSelected}
                disabled={!isAvailable}
                onChange={() => isAvailable && toggleSection(section.key)}
                className="sr-only"
              />
              <span className={`flex-1 ${isAvailable ? 'theme-text-secondary' : 'theme-text-disabled'}`}>
                {section.label}
              </span>
              {!isAvailable && (
                <span className="text-xs theme-text-disabled">(vazio)</span>
              )}
            </label>
          );
        })}
      </div>

      {/* Aviso se nenhuma seção disponível */}
      {availableSections.length === 0 && (
        <div className="mt-4 p-3 rounded-lg bg-amber-900/20 border border-amber-500/30">
          <p className="text-sm theme-text-amber flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Esta análise não possui seções para importar.
          </p>
        </div>
      )}
    </BaseModal>
  );
};

export default {
  ImportProvaOralListModal,
  ImportProvaOralSectionsModal
};
