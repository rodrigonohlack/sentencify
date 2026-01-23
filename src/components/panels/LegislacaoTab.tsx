/**
 * @file LegislacaoTab.tsx
 * @description Aba de consulta de legislação com busca semântica
 * @version 1.36.87
 *
 * Extraido do App.tsx como parte da FASE 3 de refatoracao.
 * v1.20.3: Adicionado isReadOnly para modo somente leitura
 * v1.26.00: Adicionado busca semântica de legislação
 */

import React from 'react';
import { Search, X, RefreshCw, Eye, Upload, Trash2, BookOpen, AlertCircle, Check, Copy } from 'lucide-react';
import { useLegislacao, LEIS_METADATA } from '../../hooks';
import { ArtigoCard, VirtualList } from '../cards';
import { BaseModal } from '../modals';
import { useUIStore } from '../../stores/useUIStore';
import AIModelService from '../../services/AIModelService';
import { EmbeddingsService } from '../../services/EmbeddingsServices';
import type { LegislacaoTabProps, LegislacaoEmbeddingItem, Artigo } from '../../types';

export const LegislacaoTab = React.memo(({
  isReadOnly = false,
  // v1.26.00: Props para busca semântica
  semanticSearchEnabled = false,
  searchModelReady = false,
  embeddingsCount = 0,
  semanticThreshold = 50
}: LegislacaoTabProps) => {
  // FASE 3: Acessa stores diretamente
  const openModal = useUIStore((s) => s.openModal);
  const closeModal = useUIStore((s) => s.closeModal);
  const modals = useUIStore((s) => s.modals);
  const legislacao = useLegislacao();
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set());
  const [importStatus, setImportStatus] = React.useState<{ success: boolean; message?: string; count?: number; error?: string } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  // v1.26.00: Toggle local de busca semântica (modo de busca)
  // v1.28.01: Usa toggle global como padrão se não houver valor no localStorage
  const [useSemanticSearch, setUseSemanticSearch] = React.useState(() => {
    try {
      const stored = localStorage.getItem('legislacaoSemanticMode');
      if (stored !== null) return stored === 'true';
      return semanticSearchEnabled; // Usa toggle global como fallback
    } catch { return false; }
  });
  const [semanticResults, setSemanticResults] = React.useState<(LegislacaoEmbeddingItem & { similarity: number })[] | null>(null);
  const [searchingSemantics, setSearchingSemantics] = React.useState(false);

  // Busca semântica disponível se: toggle global ativo + modelo pronto + embeddings gerados
  const semanticAvailable = semanticSearchEnabled && searchModelReady && embeddingsCount > 0;

  // v1.26.00: Handler para busca semântica
  const performSemanticSearch = React.useCallback(async (query: string) => {
    if (!query || query.length < 3 || !semanticAvailable) {
      setSemanticResults(null);
      return;
    }

    setSearchingSemantics(true);
    try {
      // v1.32.20: toLowerCase para E5 case-sensitive
      const queryEmbedding = await AIModelService.getEmbedding(query.toLowerCase(), 'query');
      const threshold = semanticThreshold / 100; // Converter para 0-1
      const results = await EmbeddingsService.searchBySimilarity(queryEmbedding, threshold, 30);
      setSemanticResults(results);
    } catch (err) {
      console.error('[Semantic] Erro na busca:', err);
      setSemanticResults(null);
    } finally {
      setSearchingSemantics(false);
    }
  }, [semanticAvailable, semanticThreshold]);

  // v1.26.00: Debounce para busca semântica
  const semanticSearchTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(() => {
    if (useSemanticSearch && semanticAvailable && legislacao.searchTerm) {
      if (semanticSearchTimeoutRef.current) clearTimeout(semanticSearchTimeoutRef.current);
      semanticSearchTimeoutRef.current = setTimeout(() => {
        performSemanticSearch(legislacao.searchTerm);
      }, 500);
    } else {
      setSemanticResults(null);
    }
    return () => { if (semanticSearchTimeoutRef.current) clearTimeout(semanticSearchTimeoutRef.current); };
  }, [legislacao.searchTerm, useSemanticSearch, semanticAvailable, performSemanticSearch]);

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
      const result = await legislacao.handleImportJSON(file);
      if (result.success) {
        totalCount += result.count || 0;
      } else {
        errors.push(`${file.name}: ${result.error}`);
      }
    }
    const status = errors.length === 0
      ? { success: true, message: `${totalCount} artigos importados de ${files.length} arquivo(s)` }
      : { success: false, error: errors.join('; ') };
    setImportStatus(status);
    setTimeout(() => setImportStatus(null), 4000);
    e.target.value = '';
  }, [legislacao]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 theme-text-muted" />
          <input
            type="text"
            placeholder={useSemanticSearch ? "Buscar por significado (ex: demissão sem justa causa)..." : "Buscar por número (ex: 7) ou texto (ex: férias)..."}
            value={legislacao.searchTerm}
            onChange={(e) => legislacao.setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && legislacao.setSearchTerm('')}
            className="w-full pl-10 pr-12 py-2 border theme-input rounded-lg text-sm"
          />
          {legislacao.searchTerm && !searchingSemantics && (
            <button onClick={() => legislacao.setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 theme-text-muted hover-text-primary" title="Limpar (Esc)">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          {searchingSemantics && (
            <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400 animate-spin" />
          )}
        </div>
        {/* v1.26.00: Toggle de busca semântica */}
        {/* v1.33.8: Adicionado hover:bg-purple-700 ao estado semântico */}
        {semanticAvailable && (
          <button
            onClick={() => setUseSemanticSearch((prev: boolean) => !prev)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
              useSemanticSearch
                ? 'bg-purple-600 text-white hover:bg-purple-700'
                : 'theme-bg-tertiary theme-text-secondary hover-bg-purple-opacity'
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
          disabled={legislacao.isLoading || isReadOnly}
          className={`px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 hover-blue-700 ${isReadOnly ? 'cursor-not-allowed' : ''}`}
          title={isReadOnly ? 'Importação desabilitada no modo somente leitura' : 'Importar artigos de arquivo JSON'}
        >
          <Upload className="w-4 h-4 inline mr-2" />
          Importar JSON
        </button>
        {legislacao.artigos.length > 0 && !isReadOnly && (
          <button
            onClick={() => openModal('deleteAllLegislacao')}
            className="p-2 rounded hover-delete-all"
            title="Excluir toda legislação"
          >
            <Trash2 className="w-5 h-5 text-red-400" />
          </button>
        )}
        <input ref={fileInputRef} type="file" accept=".json" multiple onChange={handleFileSelect} className="hidden" disabled={isReadOnly} />
      </div>

      {importStatus && (
        <div className={`mb-3 p-2 rounded text-xs ${importStatus.success ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
          {importStatus.success ? importStatus.message : importStatus.error}
        </div>
      )}

      {legislacao.leisDisponiveis.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => legislacao.setLeiAtiva(null)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              !legislacao.leiAtiva
                ? 'bg-blue-600 text-white'
                : 'theme-bg-tertiary theme-text-secondary hover-bg-blue-opacity'
            }`}
          >
            Todas ({legislacao.artigos.length})
          </button>
          {legislacao.leisDisponiveis.map(lei => {
            const meta = LEIS_METADATA[lei] || { nome: lei.toUpperCase() };
            const count = legislacao.artigos.filter(a => a.lei === lei || a.id?.startsWith(lei + '-')).length;
            return (
              <button
                key={lei}
                onClick={() => legislacao.setLeiAtiva(legislacao.leiAtiva === lei ? null : lei)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  legislacao.leiAtiva === lei
                    ? 'bg-blue-600 text-white'
                    : 'theme-bg-tertiary theme-text-secondary hover-bg-blue-opacity'
                }`}
                title={meta.nomeCompleto || lei}
              >
                {meta.nome} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* v1.26.00: Resultados - Semânticos ou Textuais */}
      <div className="flex-1 overflow-hidden">
        {legislacao.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
          </div>
        ) : useSemanticSearch && semanticResults && semanticResults.length > 0 ? (
          /* v1.26.01: Resultados semânticos com artigo completo e destaque */
          <div className="space-y-3 overflow-y-auto h-full pr-1">
            {semanticResults
              .filter(item => !legislacao.leiAtiva || item.lei === legislacao.leiAtiva)
              .map((item, idx) => {
              const artigo = legislacao.artigos.find(a => a.id === item.artigoId);
              if (!artigo) return null;
              const hasDetails = (artigo.paragrafos && artigo.paragrafos.length > 0) || (artigo.incisos && artigo.incisos.length > 0) || (artigo.alineas && artigo.alineas.length > 0);
              const isMatchedType = (type: string) => item.type === type;
              const isMatchedParagrafo = (p: { texto?: string }) => item.type === 'paragrafo' && item.text.includes(p.texto?.slice(0, 50) || '');
              const isMatchedInciso = (inc: { numero: string; texto: string }) => item.type === 'inciso' && item.text.includes(inc.texto?.slice(0, 50));
              const isMatchedAlinea = (al: { letra: string; texto: string }) => item.type === 'alinea' && item.text.includes(al.texto?.slice(0, 50));
              return (
                <div key={`${item.id}-${idx}`} className="theme-bg-secondary-50 rounded-lg p-3 border theme-border-input">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 bg-purple-600/20 text-purple-400 text-xs rounded font-medium">
                        {Math.round(item.similarity * 100)}% similar
                      </span>
                      <span className="text-xs theme-text-muted uppercase">{item.lei}</span>
                      <span className="text-xs font-medium theme-text-primary">Art. {artigo.numero}</span>
                      <span className="text-xs theme-text-muted capitalize">({item.type})</span>
                    </div>
                    <button
                      onClick={() => legislacao.handleCopyArtigo(artigo)}
                      className={`p-1 ${legislacao.copiedId === artigo.id ? 'text-green-500' : 'text-blue-400 hover-text-blue-300'}`}
                      title={legislacao.copiedId === artigo.id ? 'Copiado!' : 'Copiar artigo completo'}
                    >
                      {legislacao.copiedId === artigo.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                  <p className={`text-sm theme-text-secondary ${isMatchedType('caput') ? 'font-semibold bg-yellow-500/10 px-1 rounded' : ''}`}>
                    {artigo.caput}
                  </p>
                  {hasDetails && (
                    <div className="mt-2 pt-2 border-t theme-border-subtle text-sm space-y-2">
                      {artigo.paragrafos && artigo.paragrafos.length > 0 && (
                        <div>
                          {artigo.paragrafos.map((p, i: number) => (
                            <p key={i} className={`theme-text-secondary ml-2 mb-1 ${isMatchedParagrafo(p) ? 'font-semibold bg-yellow-500/10 px-1 rounded' : ''}`}>
                              <span className="text-purple-400">§ {p.numero}º</span> {p.texto}
                            </p>
                          ))}
                        </div>
                      )}
                      {artigo.incisos && artigo.incisos.length > 0 && (
                        <div>
                          {artigo.incisos.map((inc, i: number) => (
                            <p key={i} className={`theme-text-secondary ml-2 mb-1 ${isMatchedInciso(inc) ? 'font-semibold bg-yellow-500/10 px-1 rounded' : ''}`}>
                              <span className="text-amber-400">{inc.numero}</span> - {inc.texto}
                            </p>
                          ))}
                        </div>
                      )}
                      {artigo.alineas && artigo.alineas.length > 0 && (
                        <div>
                          {artigo.alineas.map((al: { letra: string; texto: string }, i: number) => (
                            <p key={i} className={`theme-text-secondary ml-2 mb-1 ${isMatchedAlinea(al) ? 'font-semibold bg-yellow-500/10 px-1 rounded' : ''}`}>
                              <span className="text-teal-400">{al.letra})</span> {al.texto}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : useSemanticSearch && legislacao.searchTerm && !searchingSemantics ? (
          <div className="text-center py-8 theme-text-muted">
            <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Nenhum resultado semântico para "{legislacao.searchTerm}"</p>
            <p className="text-xs mt-1">Tente reduzir o threshold nas configurações</p>
          </div>
        ) : legislacao.filteredArtigos.length > 0 ? (
          <VirtualList
            items={legislacao.filteredArtigos}
            itemHeight={120}
            overscan={3}
            className="h-full"
            expandedIds={expandedIds}
            renderItem={(item, _index) => {
              const artigo = item as Artigo;
              return (
                <ArtigoCard
                  key={artigo.id}
                  artigo={artigo}
                  onCopy={legislacao.handleCopyArtigo}
                  expanded={expandedIds.has(artigo.id)}
                  onToggleExpand={handleToggleExpand}
                  copiedId={legislacao.copiedId}
                />
              );
            }}
          />
        ) : legislacao.artigos.length === 0 ? (
          <div className="text-center py-12 theme-text-muted">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium mb-2">Nenhuma legislação importada</p>
            <p className="text-sm">
              Clique em "Importar JSON" para carregar artigos de leis.<br/>
              Arquivos disponíveis na pasta LEGIS: clt.json, cf.json, cpc.json, etc.
            </p>
          </div>
        ) : (
          <div className="text-center py-8 theme-text-muted">
            <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Nenhum artigo encontrado para "{legislacao.searchTerm}"</p>
          </div>
        )}
      </div>

      {/* v1.26.00: Footer com contagem (filtrada por lei) */}
      {(useSemanticSearch && semanticResults && semanticResults.length > 0) ? (() => {
        const filteredSemanticCount = semanticResults.filter(item => !legislacao.leiAtiva || item.lei === legislacao.leiAtiva).length;
        return filteredSemanticCount > 0 ? (
          <div className="flex items-center justify-center mt-3 pt-2 border-t theme-border-subtle">
            <span className="text-sm theme-text-muted flex items-center gap-2">
              <span className="text-purple-400">🧠</span>
              {filteredSemanticCount} resultado(s) semântico(s){legislacao.leiAtiva ? ` em ${legislacao.leiAtiva.toUpperCase()}` : ''}
            </span>
          </div>
        ) : null;
      })() : legislacao.filteredArtigos.length > 0 && (
        <div className="flex items-center justify-center mt-3 pt-2 border-t theme-border-subtle">
          <span className="text-sm theme-text-muted">
            {legislacao.filteredCount} artigo(s) • Scroll virtual ativo
          </span>
        </div>
      )}

      {/* v1.35.66: Migrado para BaseModal */}
      <BaseModal
        isOpen={modals?.deleteAllLegislacao}
        onClose={() => { closeModal('deleteAllLegislacao'); legislacao.setDeleteConfirmText(''); }}
        title="Excluir Toda Legislação"
        icon={<AlertCircle />}
        iconColor="red"
        size="md"
      >
        <p className="theme-text-secondary mb-4">
          Você está prestes a <strong className="text-red-400">excluir TODOS os {legislacao.artigos.length} artigo(s)</strong> da sua base de legislação.
        </p>
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
          <p className="text-sm theme-text-red">⚠️ Esta ação não pode ser desfeita!</p>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium theme-text-secondary mb-2">
            Digite <strong className="text-red-400">EXCLUIR</strong> para confirmar:
          </label>
          <input
            type="text"
            value={legislacao.deleteConfirmText}
            onChange={(e) => legislacao.setDeleteConfirmText(e.target.value)}
            className="w-full theme-bg-app border theme-border-input rounded-lg p-3 theme-text-primary"
            placeholder="Digite EXCLUIR"
            autoFocus
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => { closeModal('deleteAllLegislacao'); legislacao.setDeleteConfirmText(''); }}
            className="flex-1 px-4 py-2 rounded-lg theme-bg-tertiary theme-text-secondary"
          >
            Cancelar
          </button>
          <button
            onClick={async () => {
              if (legislacao.deleteConfirmText === 'EXCLUIR') {
                await legislacao.handleClearAll();
                closeModal('deleteAllLegislacao');
              }
            }}
            disabled={legislacao.deleteConfirmText !== 'EXCLUIR'}
            className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🗑️ Excluir Tudo
          </button>
        </div>
      </BaseModal>
    </div>
  );
});

LegislacaoTab.displayName = 'LegislacaoTab';
