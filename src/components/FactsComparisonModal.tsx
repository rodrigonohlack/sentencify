/**
 * FactsComparisonModal - Confronto de Fatos (Inicial vs Contestação)
 *
 * Exibe tabela comparativa das alegações das partes para um tópico específico.
 * Destaca fatos incontroversos e controversos com badges coloridos.
 *
 * @version 1.36.25 - Fix contraste badges no tema claro
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Scale, Loader2, RefreshCw, CheckCircle, AlertTriangle, HelpCircle, FileText, BookOpen } from 'lucide-react';
import type { FactsComparisonModalProps, FactsComparisonSource, FactsComparisonRow } from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTES AUXILIARES
// ═══════════════════════════════════════════════════════════════════════════

/** Badge de status para cada linha da tabela */
const StatusBadge: React.FC<{ status: FactsComparisonRow['status']; relevancia: FactsComparisonRow['relevancia'] }> = ({
  status,
  relevancia
}) => {
  // v1.36.25: cores -600 para tema claro, -400 para tema escuro (melhor contraste)
  const statusConfig = {
    controverso: { icon: AlertTriangle, bg: 'bg-red-500/20', text: 'text-red-600 dark:text-red-400', label: 'Controverso' },
    incontroverso: { icon: CheckCircle, bg: 'bg-green-500/20', text: 'text-green-600 dark:text-green-400', label: 'Incontroverso' },
    silencio: { icon: HelpCircle, bg: 'bg-yellow-500/20', text: 'text-yellow-600 dark:text-yellow-400', label: 'Silêncio' }
  };

  const relevanciaConfig = {
    alta: 'border-red-500/50',
    media: 'border-yellow-500/50',
    baixa: 'border-slate-500/50'
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className={`flex flex-col items-center gap-1`}>
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${config.bg} ${config.text} border ${relevanciaConfig[relevancia]}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
      <span className="text-[10px] theme-text-muted">
        Relevância: {relevancia}
      </span>
    </div>
  );
};

/** Seção de fatos incontroversos */
const IncontroversosSection: React.FC<{ fatos: string[] }> = ({ fatos }) => {
  if (!fatos || fatos.length === 0) return null;

  return (
    <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
      <h4 className="flex items-center gap-2 text-sm font-semibold text-green-400 mb-2">
        <CheckCircle className="w-4 h-4" />
        FATOS INCONTROVERSOS
      </h4>
      <ul className="space-y-1">
        {fatos.map((fato, idx) => (
          <li key={idx} className="flex items-start gap-2 text-sm theme-text-secondary">
            <span className="text-green-400 mt-0.5">{'\u2022'}</span>
            {fato}
          </li>
        ))}
      </ul>
    </div>
  );
};

/** Seção de pontos-chave a decidir */
const PontosChaveSection: React.FC<{ pontos: string[] }> = ({ pontos }) => {
  if (!pontos || pontos.length === 0) return null;

  return (
    <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
      <h4 className="flex items-center gap-2 text-sm font-semibold text-purple-400 mb-2">
        <HelpCircle className="w-4 h-4" />
        PONTOS-CHAVE A DECIDIR
      </h4>
      <ul className="space-y-1">
        {pontos.map((ponto, idx) => (
          <li key={idx} className="flex items-start gap-2 text-sm theme-text-secondary">
            <span className="text-purple-400 mt-0.5">{idx + 1}.</span>
            {ponto}
          </li>
        ))}
      </ul>
    </div>
  );
};

/** Tabela comparativa */
const ComparisonTable: React.FC<{ rows: FactsComparisonRow[] }> = ({ rows }) => {
  if (!rows || rows.length === 0) {
    return (
      <div className="text-center py-8 theme-text-muted">
        Nenhum fato identificado para comparação.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="theme-bg-tertiary">
            <th className="p-2 text-left font-semibold theme-text-primary border-b theme-border" style={{ width: '20%' }}>
              Tema
            </th>
            <th className="p-2 text-left font-semibold theme-text-primary border-b theme-border" style={{ width: '30%' }}>
              Reclamante
            </th>
            <th className="p-2 text-left font-semibold theme-text-primary border-b theme-border" style={{ width: '30%' }}>
              Reclamada
            </th>
            <th className="p-2 text-center font-semibold theme-text-primary border-b theme-border" style={{ width: '20%' }}>
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx} className="border-b theme-border hover:theme-bg-secondary transition-colors">
              <td className="p-2 font-medium theme-text-primary align-top">
                {row.tema}
                {row.observacao && (
                  <div className="mt-1 text-xs theme-text-muted italic">
                    {row.observacao}
                  </div>
                )}
              </td>
              <td className="p-2 theme-text-secondary align-top">
                {row.alegacaoReclamante}
              </td>
              <td className="p-2 theme-text-secondary align-top">
                {row.alegacaoReclamada}
              </td>
              <td className="p-2 align-top">
                <StatusBadge status={row.status} relevancia={row.relevancia} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/** Seletor de fonte */
const SourceSelector: React.FC<{
  selected: FactsComparisonSource;
  onChange: (source: FactsComparisonSource) => void;
  hasMiniRelatorio: boolean;
  hasDocumentos: boolean;
  disabled: boolean;
}> = ({ selected, onChange, hasMiniRelatorio, hasDocumentos, disabled }) => {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium theme-text-secondary">Fonte dos dados:</label>
      <div className="space-y-2">
        <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors
          ${selected === 'mini-relatorio' ? 'border-amber-500 bg-amber-500/10' : 'theme-border hover:theme-bg-secondary'}
          ${!hasMiniRelatorio || disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
          <input
            type="radio"
            name="source"
            value="mini-relatorio"
            checked={selected === 'mini-relatorio'}
            onChange={() => onChange('mini-relatorio')}
            disabled={!hasMiniRelatorio || disabled}
            className="mt-1"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-amber-400" />
              <span className="font-medium theme-text-primary">Mini-relatório do tópico</span>
              <span className="text-xs px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded">Mais rápido</span>
            </div>
            <p className="text-xs theme-text-muted mt-1">
              Usa o resumo já processado das alegações
            </p>
          </div>
        </label>

        <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors
          ${selected === 'documentos-completos' ? 'border-blue-500 bg-blue-500/10' : 'theme-border hover:theme-bg-secondary'}
          ${!hasDocumentos || disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
          <input
            type="radio"
            name="source"
            value="documentos-completos"
            checked={selected === 'documentos-completos'}
            onChange={() => onChange('documentos-completos')}
            disabled={!hasDocumentos || disabled}
            className="mt-1"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-400" />
              <span className="font-medium theme-text-primary">Documentos completos</span>
              <span className="text-xs px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded">Mais completo</span>
            </div>
            <p className="text-xs theme-text-muted mt-1">
              Analisa petição inicial + contestação + impugnação
            </p>
          </div>
        </label>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL (usando BaseModal do App.tsx)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * FactsComparisonModal - Renderiza conteúdo interno para BaseModal
 *
 * IMPORTANTE: Este componente deve ser renderizado DENTRO de um BaseModal no App.tsx
 * Não gerencia ESC, scroll lock, overlay - BaseModal faz isso.
 */
export const FactsComparisonModalContent: React.FC<Omit<FactsComparisonModalProps, 'isOpen' | 'onClose'>> = ({
  topicTitle,
  topicRelatorio,
  hasPeticao,
  hasContestacao,
  onGenerate,
  cachedResult,
  isGenerating,
  error
}) => {
  const [selectedSource, setSelectedSource] = useState<FactsComparisonSource>('mini-relatorio');

  // Determinar disponibilidade das fontes
  const hasMiniRelatorio = !!topicRelatorio?.trim();
  const hasDocumentos = hasPeticao || hasContestacao;

  // Auto-selecionar fonte disponível
  useEffect(() => {
    if (!hasMiniRelatorio && hasDocumentos) {
      setSelectedSource('documentos-completos');
    } else if (hasMiniRelatorio && !hasDocumentos) {
      setSelectedSource('mini-relatorio');
    }
  }, [hasMiniRelatorio, hasDocumentos]);

  const handleGenerate = useCallback(async () => {
    await onGenerate(selectedSource);
  }, [onGenerate, selectedSource]);

  const canGenerate = (selectedSource === 'mini-relatorio' && hasMiniRelatorio) ||
                      (selectedSource === 'documentos-completos' && hasDocumentos);

  return (
    <div className="space-y-4">
      {/* Seletor de fonte e botão gerar */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <SourceSelector
            selected={selectedSource}
            onChange={setSelectedSource}
            hasMiniRelatorio={hasMiniRelatorio}
            hasDocumentos={hasDocumentos}
            disabled={isGenerating}
          />
        </div>
        <div className="flex flex-col justify-end gap-2">
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !canGenerate}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700
                     text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analisando...
              </>
            ) : cachedResult ? (
              <>
                <RefreshCw className="w-4 h-4" />
                Atualizar
              </>
            ) : (
              <>
                <Scale className="w-4 h-4" />
                Gerar Análise
              </>
            )}
          </button>
          {cachedResult && (
            <span className="text-xs theme-text-muted text-center">
              Gerado em: {new Date(cachedResult.generatedAt).toLocaleString('pt-BR')}
            </span>
          )}
        </div>
      </div>

      {/* Aviso se não há fontes */}
      {!hasMiniRelatorio && !hasDocumentos && (
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <p className="text-sm text-yellow-400">
            Nenhuma fonte disponível. Adicione documentos ao processo ou gere o mini-relatório do tópico primeiro.
          </p>
        </div>
      )}

      {/* Erro */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Resultado */}
      {cachedResult && !isGenerating && (
        <div className="space-y-4">
          {/* Resumo */}
          {cachedResult.resumo && (
            <div className="p-3 theme-bg-secondary rounded-lg">
              <h4 className="text-sm font-semibold theme-text-primary mb-1">Resumo</h4>
              <p className="text-sm theme-text-secondary">{cachedResult.resumo}</p>
            </div>
          )}

          {/* Fatos Incontroversos */}
          <IncontroversosSection fatos={cachedResult.fatosIncontroversos} />

          {/* Tabela */}
          <div>
            <h4 className="text-sm font-semibold theme-text-primary mb-2">Tabela Comparativa</h4>
            <ComparisonTable rows={cachedResult.tabela} />
          </div>

          {/* Pontos-Chave */}
          <PontosChaveSection pontos={cachedResult.pontosChave} />
        </div>
      )}

      {/* Loading */}
      {isGenerating && (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
          <p className="theme-text-secondary">Analisando alegações das partes...</p>
          <p className="text-xs theme-text-muted">Isso pode levar alguns segundos</p>
        </div>
      )}
    </div>
  );
};

// Re-export para compatibilidade (será usado dentro de BaseModal no App.tsx)
export const FactsComparisonModal = FactsComparisonModalContent;
export default FactsComparisonModalContent;
