/**
 * @file JurisprudenciaTab.tsx
 * @description Aba de consulta de jurisprudência com busca semântica
 * @version 1.36.87
 *
 * Extraido do App.tsx como parte da FASE 3 de refatoracao.
 * v1.20.3: Adicionado isReadOnly para modo somente leitura
 * v1.27.00: Adicionado busca semântica de jurisprudência
 */

import React from 'react';
import { Search, X, RefreshCw, Eye, Upload, Trash2, Scale, Check, Copy } from 'lucide-react';
import { useJurisprudencia } from '../../hooks';
import { JurisprudenciaCard } from '../cards';
import { DeleteAllPrecedentesModal } from '../modals';
import { useUIStore } from '../../stores/useUIStore';
import AIModelService from '../../services/AIModelService';
import { JurisEmbeddingsService } from '../../services/EmbeddingsServices';
import type { JurisprudenciaTabProps, JurisEmbeddingWithSimilarity, Precedente } from '../../types';

export const JurisprudenciaTab = React.memo(({
  isReadOnly = false,
  // v1.27.00: Props para busca semântica
  jurisSemanticEnabled = false,
  searchModelReady = false,
  jurisEmbeddingsCount = 0,
  jurisSemanticThreshold = 50
}: JurisprudenciaTabProps) => {
  // FASE 3: Acessa stores diretamente
  const openModal = useUIStore((s) => s.openModal);
  const closeModal = useUIStore((s) => s.closeModal);
  const modals = useUIStore((s) => s.modals);
  const jurisprudencia = useJurisprudencia();

  // Mapa de precedentes para enriquecer resultados semânticos
  const precedenteMap = React.useMemo(() => {
    const map = new Map<string, Precedente>();
    for (const p of jurisprudencia.precedentes) {
      map.set(p.id, p);
    }
    return map;
  }, [jurisprudencia.precedentes]);

  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set());
  const [importStatus, setImportStatus] = React.useState<{ success: boolean; message?: string; count?: number; error?: string } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // v1.27.00: Estados para busca semântica (usa scroll, não paginação)
  // v1.28.01: Usa toggle global como padrão se não houver valor no localStorage
  const [useSemanticSearch, setUseSemanticSearch] = React.useState(() => {
    try {
      const stored = localStorage.getItem('jurisSemanticMode');
      if (stored !== null) return stored === 'true';
      return jurisSemanticEnabled; // Usa toggle global como fallback
    } catch { return false; }
  });
  const [semanticResults, setSemanticResults] = React.useState<JurisEmbeddingWithSimilarity[] | null>(null);
  const [searchingSemantics, setSearchingSemantics] = React.useState(false);

  // Busca semântica disponível se: toggle global ativo + modelo pronto + embeddings gerados
  const semanticAvailable = jurisSemanticEnabled && searchModelReady && jurisEmbeddingsCount > 0;

  // v1.27.00: Handler para busca semântica de jurisprudência
  const performSemanticSearch = React.useCallback(async (query: string) => {
    if (!query || query.length < 3 || !semanticAvailable) {
      setSemanticResults(null);
      return;
    }

    setSearchingSemantics(true);
    try {
      // v1.32.20: toLowerCase para E5 case-sensitive
      const queryEmbedding = await AIModelService.getEmbedding(query.toLowerCase(), 'query');
      const threshold = jurisSemanticThreshold / 100;
      // v1.32.21: Passar filtros para aplicar ANTES do limit (retorna até 30 do tipo desejado)
      const results = await JurisEmbeddingsService.searchBySimilarity(queryEmbedding, threshold, 30, jurisprudencia.filtros);

      // Enriquecer resultados com dados do Precedente (numeroProcesso, tema, numero, titulo)
      const enriched = results.map(r => {
        const p = precedenteMap.get(r.precedenteId || r.id);
        if (!p) return r;
        return {
          ...r,
          numeroProcesso: r.numeroProcesso || p.numeroProcesso,
          tema: r.tema || p.tema,
          numero: r.numero || p.numero,
          titulo: r.titulo || p.titulo,
        };
      });
      setSemanticResults(enriched);
    } catch (err) {
      console.error('[Juris Semantic] Erro na busca:', err);
      setSemanticResults(null);
    } finally {
      setSearchingSemantics(false);
    }
  }, [semanticAvailable, jurisSemanticThreshold, jurisprudencia.filtros, precedenteMap]);

  // v1.27.00: Debounce para busca semântica
  const semanticSearchTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(() => {
    if (useSemanticSearch && semanticAvailable && jurisprudencia.searchTerm) {
      if (semanticSearchTimeoutRef.current) clearTimeout(semanticSearchTimeoutRef.current);
      semanticSearchTimeoutRef.current = setTimeout(() => {
        performSemanticSearch(jurisprudencia.searchTerm);
      }, 500);
    } else {
      setSemanticResults(null);
    }
    return () => { if (semanticSearchTimeoutRef.current) clearTimeout(semanticSearchTimeoutRef.current); };
  }, [jurisprudencia.searchTerm, useSemanticSearch, semanticAvailable, performSemanticSearch, jurisprudencia.filtros]);

  const handleToggleExpand = React.useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleFileSelect = React.useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    let totalCount = 0;
    let errors = [];
    for (const file of files) {
      const result = await jurisprudencia.handleImportJSON(file);
      if (result.success) {
        totalCount += result.count || 0;
      } else {
        errors.push(file.name);
      }
    }
    const status = errors.length === 0
      ? { success: true, count: totalCount, message: `${files.length} arquivo(s), ${totalCount} itens` }
      : { success: false, error: `Erro em: ${errors.join(', ')}` };
    setImportStatus(status);
    setTimeout(() => setImportStatus(null), 4000);
    e.target.value = '';
  }, [jurisprudencia]);

  const tiposDisponiveis = ['IRR', 'IAC', 'IRDR', 'Súmula', 'OJ', 'RG', 'ADI/ADC/ADPF', 'Informativo'];
  const tribunaisDisponiveis = ['TST', 'STF', 'STJ', 'TRT8'];

  return (
    <div className="h-full flex flex-col">
      <div className="flex gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 theme-text-muted" />
          <input
            type="text"
            placeholder={useSemanticSearch ? "Buscar por significado (ex: intervalo intrajornada)..." : "Buscar por tese, keywords ou número..."}
            value={jurisprudencia.searchTerm}
            onChange={jurisprudencia.handleSearchChange}
            onKeyDown={(e) => e.key === 'Escape' && jurisprudencia.handleSearchChange({ target: { value: '' } } as React.ChangeEvent<HTMLInputElement>)}
            className="w-full pl-10 pr-12 py-2 border theme-input rounded-lg text-sm"
          />
          {jurisprudencia.searchTerm && !searchingSemantics && (
            <button onClick={() => jurisprudencia.handleSearchChange({ target: { value: '' } } as React.ChangeEvent<HTMLInputElement>)} className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 theme-text-muted hover-text-primary" title="Limpar (Esc)">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          {searchingSemantics && (
            <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400 animate-spin" />
          )}
        </div>
        {/* v1.27.00: Toggle de busca semântica */}
        {/* v1.33.8: Adicionado hover:bg-purple-700 ao estado semântico */}
        {semanticAvailable && (
          <button
            onClick={() => setUseSemanticSearch((prev: boolean) => !prev)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
              useSemanticSearch
                ? 'bg-purple-600 text-white hover:bg-purple-700'
                : 'theme-bg-tertiary theme-text-secondary hover-slate-600'
            }`}
            title={useSemanticSearch ? 'Busca semântica (por significado)' : 'Busca textual (por palavras)'}
          >
            {useSemanticSearch ? '🧠' : '🔤'}
          </button>
        )}
        {/* v1.20.3: Badge de somente leitura */}
        {isReadOnly && (
          <span className="flex items-center gap-1 px-3 py-2 text-xs text-amber-400 bg-amber-500/10 rounded-lg border border-amber-500/30">
            <Eye className="w-3 h-3" />
            Somente leitura
          </span>
        )}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={jurisprudencia.isLoading || isReadOnly}
          className={`px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 hover-purple-700 ${isReadOnly ? 'cursor-not-allowed' : ''}`}
          title={isReadOnly ? 'Importação desabilitada no modo somente leitura' : 'Importar precedentes de arquivo JSON'}
        >
          <Upload className="w-4 h-4 inline mr-2" />
          Importar JSON
        </button>
        {jurisprudencia.precedentes.length > 0 && !isReadOnly && (
          <button
            onClick={() => openModal('deleteAllPrecedentes')}
            className="p-2 rounded hover-delete-all"
            title="Excluir todos os precedentes"
          >
            <Trash2 className="w-5 h-5 text-red-400" />
          </button>
        )}
        <input ref={fileInputRef} type="file" accept=".json" multiple onChange={handleFileSelect} className="hidden" disabled={isReadOnly} />
      </div>

      {importStatus && (
        <div className={`mb-3 p-2 rounded text-xs ${importStatus.success ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
          {importStatus.success ? (importStatus.message || `${importStatus.count} precedentes importados`) : importStatus.error}
        </div>
      )}

      <div className="flex flex-wrap justify-between gap-y-2 mb-4">
        <div className="flex gap-2 flex-wrap">
          {tiposDisponiveis.map(tipo => (
            <button
              key={tipo}
              onClick={() => jurisprudencia.setFiltros(prev => ({
                ...prev,
                tipo: prev.tipo.includes(tipo)
                  ? prev.tipo.filter((t: string) => t !== tipo)
                  : [...prev.tipo, tipo]
              }))}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                jurisprudencia.filtros.tipo.includes(tipo)
                  ? 'bg-purple-600 text-white'
                  : 'theme-bg-tertiary theme-text-tertiary hover-slate-600'
              }`}
            >
              {tipo}
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          {tribunaisDisponiveis.map(trib => (
            <button
              key={trib}
              onClick={() => jurisprudencia.setFiltros(prev => ({
                ...prev,
                tribunal: prev.tribunal?.includes(trib)
                  ? prev.tribunal.filter((t: string) => t !== trib)
                  : [...(prev.tribunal || []), trib]
              }))}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                jurisprudencia.filtros.tribunal?.includes(trib)
                  ? 'bg-blue-600 text-white'
                  : 'theme-bg-tertiary theme-text-tertiary hover-slate-600'
              }`}
            >
              {trib}
            </button>
          ))}
        </div>
      </div>

      <div className="text-xs theme-text-muted mb-3">
        {useSemanticSearch && semanticResults ? (
          <span>{semanticResults.length} resultado(s) semântico(s) 🧠</span>
        ) : (
          <span>{jurisprudencia.filteredCount} precedentes encontrados</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {/* v1.27.00: Resultados semânticos */}
        {useSemanticSearch && semanticResults && semanticResults.length > 0 ? (
          semanticResults.map((result, idx) => (
            <div key={result.id || idx} className="theme-bg-secondary p-4 rounded-lg border theme-border-secondary">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs px-2 py-0.5 rounded theme-bg-tertiary theme-text-tertiary font-medium">
                    {result.tipoProcesso}
                  </span>
                  {result.tema ? (
                    <span className="text-xs theme-text-muted">Tema {result.tema}</span>
                  ) : (result.tipoProcesso === 'Súmula' || result.tipoProcesso === 'OJ') && result.numero ? (
                    <span className="text-xs theme-text-muted">nº {result.numero}</span>
                  ) : result.numeroProcesso ? (
                    <span className="text-xs theme-text-muted">nº {result.numeroProcesso}</span>
                  ) : null}
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                    result.similarity >= 0.7 ? 'bg-green-500/20 text-green-400' :
                    result.similarity >= 0.5 ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {Math.round(result.similarity * 100)}%
                  </span>
                  {(result.totalChunks ?? 0) > 1 && (
                    <span className="text-xs theme-text-muted">(chunk {(result.chunkIndex ?? 0) + 1}/{result.totalChunks})</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {result.tribunal && (
                    <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">{result.tribunal}</span>
                  )}
                  <button
                    onClick={() => jurisprudencia.handleCopyTese({
                      id: result.id,
                      tipo: result.tipo || result.tipoProcesso || '',
                      numero: result.numero || '',
                      texto: result.text || result.fullText || '',
                      tipoProcesso: result.tipoProcesso,
                      titulo: result.titulo,
                      tese: result.fullText || result.text
                    })}
                    className={`p-1.5 rounded ${jurisprudencia.copiedId === result.id ? 'text-green-500' : 'hover-icon-blue-scale'}`}
                    title={jurisprudencia.copiedId === result.id ? 'Copiado!' : 'Copiar tese completa'}
                  >
                    {jurisprudencia.copiedId === result.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {result.titulo && (
                <h4 className="font-semibold theme-text-primary text-sm mb-2 uppercase">{result.titulo}</h4>
              )}
              <p className="text-sm theme-text-secondary whitespace-pre-wrap">
                {result.fullText || result.text}
              </p>
            </div>
          ))
        ) : useSemanticSearch && semanticResults && semanticResults.length === 0 ? (
          <div className="text-center py-8 theme-text-muted">
            <Search className="w-12 h-12 mx-auto mb-3 opacity-40 animate-pulse" />
            <p className="text-sm">Nenhum resultado semântico encontrado</p>
            <p className="text-xs mt-1">Tente reduzir o threshold nas configurações</p>
          </div>
        ) : jurisprudencia.paginatedPrecedentes.length === 0 ? (
          <div className="text-center py-8 theme-text-muted">
            <Scale className="w-12 h-12 mx-auto mb-3 opacity-40 animate-pulse" />
            <p className="text-sm">Nenhum precedente encontrado</p>
            <p className="text-xs mt-1">Importe um arquivo JSON para começar</p>
          </div>
        ) : (
          jurisprudencia.paginatedPrecedentes.map(p => (
            <JurisprudenciaCard
              key={p.id}
              precedente={p}
              expanded={expandedIds.has(p.id)}
              onToggleExpand={handleToggleExpand}
              onCopy={jurisprudencia.handleCopyTese}
              copiedId={jurisprudencia.copiedId}
            />
          ))
        )}
      </div>

      {/* Paginação só para busca textual (semântica usa scroll) */}
      {!useSemanticSearch && jurisprudencia.totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-4 pt-4 border-t theme-border-secondary">
          <button
            disabled={jurisprudencia.currentPage === 1}
            onClick={() => jurisprudencia.setCurrentPage(p => p - 1)}
            className="px-3 py-1 rounded theme-bg-tertiary text-sm disabled:opacity-50 hover-slate-600"
          >
            Anterior
          </button>
          <span className="px-3 py-1 theme-text-muted text-sm">
            {jurisprudencia.currentPage} / {jurisprudencia.totalPages}
          </span>
          <button
            disabled={jurisprudencia.currentPage === jurisprudencia.totalPages}
            onClick={() => jurisprudencia.setCurrentPage(p => p + 1)}
            className="px-3 py-1 rounded theme-bg-tertiary text-sm disabled:opacity-50 hover-slate-600"
          >
            Próxima
          </button>
        </div>
      )}

      <DeleteAllPrecedentesModal
        isOpen={modals.deleteAllPrecedentes}
        onClose={() => closeModal('deleteAllPrecedentes')}
        totalPrecedentes={jurisprudencia.precedentes.length}
        confirmText={jurisprudencia.deleteAllConfirmText}
        setConfirmText={jurisprudencia.setDeleteAllConfirmText}
        onConfirmDelete={async () => {
          if (jurisprudencia.deleteAllConfirmText === 'EXCLUIR') {
            await jurisprudencia.handleClearAll();
            closeModal('deleteAllPrecedentes');
            jurisprudencia.setDeleteAllConfirmText('');
          }
        }}
      />
    </div>
  );
});

JurisprudenciaTab.displayName = 'JurisprudenciaTab';
