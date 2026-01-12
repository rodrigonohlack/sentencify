/**
 * @file JurisprudenciaModal.tsx
 * @description Modal de busca de jurisprudencia
 * @version 1.36.93
 *
 * Extraido do App.tsx como parte da FASE 3 de refatoracao.
 * v1.20.0: Modal de Jurisprudencia Reutilizavel
 * v1.32.18: Busca semantica via IA Local
 * v1.33.16: Toggle interno + badge IA Local
 */

import React from 'react';
import { Scale, Search, X, Loader2, Check, Copy } from 'lucide-react';
import { CSS } from './BaseModal';
import AIModelService from '../../services/AIModelService';
import { JurisEmbeddingsService } from '../../services/EmbeddingsServices';
import { findJurisprudenciaHelper, isStatusValido } from '../../utils/jurisprudencia';
import { JURIS_TIPOS_DISPONIVEIS, JURIS_TRIBUNAIS_DISPONIVEIS, isIRRType } from '../../hooks/useJurisprudencia';
import type { JurisprudenciaModalProps, JurisSuggestion, FiltrosLegislacao } from '../../types';

export const JurisprudenciaModal = React.memo(({
  isOpen,
  onClose,
  topicTitle,
  topicRelatorio,
  callAI,
  useLocalAI = false,
  jurisSemanticThreshold = 50,
  jurisSemanticEnabled = false
}: JurisprudenciaModalProps) => {
  const [suggestions, setSuggestions] = React.useState<JurisSuggestion[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [filtros, setFiltros] = React.useState<FiltrosLegislacao>({ tipo: [], tribunal: [] });
  const [searchTerm, setSearchTerm] = React.useState('');
  const [searchApplied, setSearchApplied] = React.useState('');
  const [searchSource, setSearchSource] = React.useState<string | null>(null);
  const [useSemanticMode, setUseSemanticMode] = React.useState(useLocalAI);

  // v1.32.18: Busca semantica via IA Local
  const doSemanticSearch = React.useCallback(async (queryText: string) => {
    try {
      const threshold = jurisSemanticThreshold / 100;
      const queryEmbedding = await AIModelService.getEmbedding(queryText.toLowerCase(), 'query');
      const results = await JurisEmbeddingsService.searchBySimilarity(queryEmbedding, threshold, 30, filtros);
      return results;
    } catch (err) {
      console.warn('[JurisModal] Erro na busca semantica:', err);
      return [];
    }
  }, [jurisSemanticThreshold, filtros]);

  const doSearch = React.useCallback(async (term = '') => {
    setLoading(true);
    setSuggestions([]);
    setSearchApplied(term);
    try {
      if (useSemanticMode && jurisSemanticEnabled) {
        const queryText = term || topicTitle || '';
        const results = await doSemanticSearch(queryText);
        setSuggestions(results);
        setSearchSource('local');
      } else if (callAI) {
        const results = await findJurisprudenciaHelper(topicTitle || '', topicRelatorio || '', callAI, { ...filtros, searchTerm: term });
        setSuggestions(results);
        setSearchSource('text');
      }
    } catch { setSuggestions([]); }
    setLoading(false);
  }, [topicTitle, topicRelatorio, callAI, filtros, useSemanticMode, jurisSemanticEnabled, doSemanticSearch]);

  // v1.33.16: Re-busca quando toggle muda
  React.useEffect(() => {
    if (isOpen && topicTitle) {
      doSearch(searchApplied);
    }
  }, [isOpen, topicTitle, filtros, useSemanticMode]);

  // v1.33.17: Sincronizar useSemanticMode com useLocalAI quando modal abre
  React.useEffect(() => {
    if (isOpen) {
      setUseSemanticMode(useLocalAI);
    }
  }, [isOpen, useLocalAI]);

  React.useEffect(() => {
    if (!isOpen) {
      setFiltros({ tipo: [], tribunal: [] });
      setSearchTerm('');
      setSearchApplied('');
    }
  }, [isOpen]);

  // v1.35.64: ESC handler
  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
    }
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // v1.35.64: Bloquear scroll do body quando modal aberto
  React.useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = async (p: JurisSuggestion) => {
    const tipo = isIRRType(p.tipoProcesso) ? 'IRR' : (p.tipoProcesso || '');
    const identificador = p.tema ? `Tema ${p.tema}` : (p.numero ? `n ${p.numero}` : '');
    const partes: string[] = [];
    partes.push(`${tipo}${identificador ? ` ${identificador}` : ''}${p.tribunal ? ` - ${p.tribunal}` : ''}${p.orgao ? ` - ${p.orgao}` : ''}`);
    if (p.titulo) partes.push(`Titulo: ${p.titulo}`);
    const conteudo = p.tese || p.enunciado || p.fullText || p.text || '';
    if (conteudo) partes.push('');
    partes.push(conteudo);
    await navigator.clipboard.writeText(partes.join('\n'));
    setCopiedId(p.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className={`${CSS.modalOverlay} overflow-auto`} onClick={onClose}>
      <div className={`${CSS.modalContainer} flex flex-col my-auto`} style={{ width: '80vw', maxHeight: '90vh' }} onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b theme-border flex justify-between items-center flex-shrink-0">
          <h3 className="font-semibold theme-text-primary flex items-center gap-2">
            <Scale className="w-4 h-4" />
            Jurisprudencia: {topicTitle}
            {searchSource === 'local' && (
              <span className="bg-purple-600 text-white px-1.5 py-0.5 rounded text-[10px]">🤖 IA Local</span>
            )}
          </h3>
          <button onClick={onClose} className="p-1 rounded hover-bg-tertiary">
            <X className="w-5 h-5 theme-text-secondary" />
          </button>
        </div>
        <div className="px-4 py-2 border-b theme-border flex flex-wrap gap-2 items-center flex-shrink-0">
          <span className="text-xs theme-text-muted mr-1">Filtros:</span>
          <div className="flex gap-1 flex-wrap">
            {JURIS_TIPOS_DISPONIVEIS.map(tipo => (
              <button
                key={tipo}
                onClick={() => setFiltros(prev => ({
                  ...prev,
                  tipo: prev.tipo.includes(tipo) ? prev.tipo.filter((t: string) => t !== tipo) : [...prev.tipo, tipo]
                }))}
                className={`px-2 py-0.5 rounded-full text-xs transition-colors ${filtros.tipo.includes(tipo) ? 'bg-purple-600 text-white' : 'theme-bg-tertiary theme-text-tertiary hover-slate-600'}`}
              >
                {tipo}
              </button>
            ))}
          </div>
          <div className="w-px h-4 theme-bg-tertiary mx-1" />
          <div className="flex gap-1 flex-wrap">
            {JURIS_TRIBUNAIS_DISPONIVEIS.map(trib => (
              <button
                key={trib}
                onClick={() => setFiltros(prev => ({
                  ...prev,
                  tribunal: prev.tribunal.includes(trib) ? prev.tribunal.filter((t: string) => t !== trib) : [...prev.tribunal, trib]
                }))}
                className={`px-2 py-0.5 rounded-full text-xs transition-colors ${filtros.tribunal.includes(trib) ? 'bg-blue-600 text-white' : 'theme-bg-tertiary theme-text-tertiary hover-slate-600'}`}
              >
                {trib}
              </button>
            ))}
          </div>
          <div className="w-px h-4 theme-bg-tertiary mx-1" />
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <div className="flex-1 relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por termo, tese..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && doSearch(searchTerm.trim())}
                className="w-full pl-8 pr-2 py-1 border rounded text-xs theme-input"
              />
            </div>
            <button
              onClick={() => doSearch(searchTerm.trim())}
              disabled={loading}
              className="px-2.5 py-1 bg-blue-600 text-white rounded text-xs hover-blue-700-from-600 disabled:opacity-50 flex items-center gap-1"
            >
              <Search className="w-3 h-3" />
              Buscar
            </button>
            {searchApplied && (
              <button
                onClick={() => { setSearchTerm(''); doSearch(''); }}
                className="px-2 py-1 theme-bg-tertiary theme-text-secondary rounded text-xs hover-slate-600"
                title="Limpar busca"
              >
                <X className="w-3 h-3" />
              </button>
            )}
            {/* v1.33.16: Toggle semantico/textual */}
            {jurisSemanticEnabled && (
              <button
                onClick={() => setUseSemanticMode((prev: boolean) => !prev)}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  useSemanticMode
                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                    : 'theme-bg-tertiary theme-text-secondary hover-slate-600'
                }`}
                title={useSemanticMode ? 'Busca semantica (por significado)' : 'Busca textual (por palavras)'}
              >
                {useSemanticMode ? '🧠' : '🔤'}
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-500" />
              <p className="text-sm theme-text-muted">Buscando precedentes relevantes...</p>
            </div>
          ) : suggestions.length === 0 ? (
            <div className="text-center py-8">
              <Scale className="w-8 h-8 mx-auto mb-2 theme-text-muted opacity-50" />
              <p className="theme-text-muted">Nenhum precedente encontrado{searchApplied ? ` para "${searchApplied}"` : ' para este topico'}</p>
              <p className="text-xs theme-text-muted mt-1">{searchApplied ? 'Tente outros termos ou remova filtros' : 'Importe JSONs de jurisprudencia na aba correspondente'}</p>
            </div>
          ) : (
            suggestions.map(p => (
              <div key={p.id} className="theme-bg-secondary p-3 rounded-lg border theme-border-secondary">
                <div className="flex flex-wrap justify-between items-start gap-2 mb-2">
                  <span className="text-xs px-2 py-0.5 rounded theme-bg-tertiary theme-text-tertiary">
                    {isIRRType(p.tipoProcesso) ? 'IRR' : p.tipoProcesso} {p.numero || p.tema}
                  </span>
                  <div className="flex gap-1 flex-wrap">
                    {p.status && (
                      <span className={`text-xs px-2 py-0.5 rounded ${isStatusValido(p.status) ? 'theme-badge-success' : 'theme-badge-error'}`}>
                        {isStatusValido(p.status) ? '✓' : '✗'} {p.status.replace(/_/g, ' ')}
                      </span>
                    )}
                    {p.orgao && <span className="text-xs px-2 py-0.5 rounded theme-badge-purple">{p.orgao}</span>}
                    {p.tribunal && <span className="text-xs px-2 py-0.5 rounded theme-badge-blue">{p.tribunal}</span>}
                    {/* v1.33.18: Badge de similaridade no modo semantico */}
                    {searchSource === 'local' && p.similarity && (
                      <span className="text-xs px-2 py-0.5 rounded bg-green-600 text-white">
                        {Math.round(p.similarity * 100)}%
                      </span>
                    )}
                  </div>
                </div>
                {p.titulo && <p className="text-xs font-medium theme-text-primary mb-1">{p.titulo}</p>}
                <p className="text-sm theme-text-secondary mb-3 line-clamp-4">{p.tese || p.enunciado || p.fullText || p.text}</p>
                <button
                  onClick={() => handleCopy(p)}
                  className={`text-xs px-3 py-1.5 text-white rounded flex items-center gap-1 ${copiedId === p.id ? 'bg-green-600' : 'bg-purple-600 hover-purple-700'}`}
                >
                  {copiedId === p.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copiedId === p.id ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
});

JurisprudenciaModal.displayName = 'JurisprudenciaModal';
