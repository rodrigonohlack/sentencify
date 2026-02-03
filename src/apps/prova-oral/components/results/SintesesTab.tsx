/**
 * @file SintesesTab.tsx
 * @description Tab de sínteses dos depoimentos com 3 modos de visualização
 * Baseado no protótipo v2
 * Inclui suporte a marcações coloridas com comentários
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { FileText, Clock, ChevronDown, Target, Highlighter, Check, Loader2 } from 'lucide-react';
import { Card, CardContent, Badge } from '../ui';
import { HighlightedText } from '../highlights';
import { getQualificacaoStyle, getQualificacaoLabel } from '../../constants';
import { useProvaOralStore } from '../../stores/useProvaOralStore';
import { useProvaOralAPI } from '../../hooks/useProvaOralAPI';
import type { Sintese, SinteseCondensada, SintesePorTema, Depoente, SinteseViewMode, Qualificacao, TextHighlight } from '../../types';

interface SintesesTabProps {
  sinteses: Sintese[];
  sintesesCondensadas?: SinteseCondensada[];
  sintesesPorTema?: SintesePorTema[];
  depoentes?: Depoente[];
}

/** Badge de timestamp */
const TimestampBadge: React.FC<{ timestamp: string }> = ({ timestamp }) => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs rounded-full font-mono flex-shrink-0">
    <Clock className="w-3 h-3" />{timestamp}
  </span>
);

/** Botão de modo de visualização */
const ViewModeButton: React.FC<{
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
      active
        ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-sm'
        : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
    }`}
  >
    {children}
  </button>
);

/** Cor da borda por qualificação */
const getQualBorderColor = (qual: Qualificacao | undefined): string => ({
  'autor': 'border-l-blue-500',
  'preposto': 'border-l-rose-500',
  'testemunha-autor': 'border-l-emerald-500',
  'testemunha-re': 'border-l-amber-500'
}[qual || 'autor'] || 'border-l-slate-300');

/** Tempo de debounce para auto-save (ms) */
const AUTO_SAVE_DEBOUNCE_MS = 2000;

export const SintesesTab: React.FC<SintesesTabProps> = ({
  sinteses,
  sintesesCondensadas,
  sintesesPorTema,
  depoentes = []
}) => {
  const [viewMode, setViewMode] = useState<SinteseViewMode>('detalhada');
  const [expandedId, setExpandedId] = useState<string | null>(sinteses?.[0]?.deponenteId || null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Store para highlights
  const { highlights, addHighlight, removeHighlight, loadedAnalysisId, result } = useProvaOralStore();
  const { updateAnalysis } = useProvaOralAPI();

  // Ref para controle do debounce
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousHighlightsRef = useRef<string>('');

  // Auto-save quando highlights mudam (apenas se análise carregada do histórico)
  useEffect(() => {
    if (!loadedAnalysisId || !result) return;

    const currentHighlightsStr = JSON.stringify(highlights);

    // Evita salvar se não houve mudança real
    if (currentHighlightsStr === previousHighlightsRef.current) return;
    previousHighlightsRef.current = currentHighlightsStr;

    // Limpa timeout anterior
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce para não fazer muitas requisições
    saveTimeoutRef.current = setTimeout(async () => {
      setSaveStatus('saving');
      const success = await updateAnalysis({
        id: loadedAnalysisId,
        resultado: result,
      });
      setSaveStatus(success ? 'saved' : 'idle');

      // Limpa status de "salvo" após 3 segundos
      if (success) {
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    }, AUTO_SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [highlights, loadedAnalysisId, result, updateAnalysis]);

  // Função para buscar depoente pelo ID
  const getDepoente = (id: string): Depoente | undefined =>
    depoentes.find(d => d.id === id);

  // Handlers de highlights
  const handleAddHighlight = useCallback((highlight: Omit<TextHighlight, 'id' | 'createdAt'>) => {
    addHighlight(highlight);
  }, [addHighlight]);

  const handleRemoveHighlight = useCallback((id: string) => {
    removeHighlight(id);
  }, [removeHighlight]);

  // Se não tem dados em nenhum formato
  if ((!sinteses || sinteses.length === 0) &&
      (!sintesesCondensadas || sintesesCondensadas.length === 0) &&
      (!sintesesPorTema || sintesesPorTema.length === 0)) {
    return (
      <div className="text-center py-12">
        <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
        <p className="text-slate-500 dark:text-slate-400">
          Nenhuma síntese de depoimento disponível.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Seletor de visualização e info de highlights */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-fit">
          <ViewModeButton
            active={viewMode === 'detalhada'}
            onClick={() => setViewMode('detalhada')}
          >
            Detalhada
          </ViewModeButton>
          <ViewModeButton
            active={viewMode === 'condensada'}
            onClick={() => setViewMode('condensada')}
          >
            Por Depoente
          </ViewModeButton>
          <ViewModeButton
            active={viewMode === 'tema'}
            onClick={() => setViewMode('tema')}
          >
            Por Tema
          </ViewModeButton>
        </div>

        {/* Indicador de marcações e status de salvamento */}
        <div className="flex items-center gap-3">
          {highlights.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <Highlighter className="w-3.5 h-3.5" />
              <span>{highlights.length} marcaç{highlights.length === 1 ? 'ão' : 'ões'}</span>
            </div>
          )}

          {/* Status de auto-save */}
          {saveStatus === 'saving' && (
            <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Salvando...</span>
            </div>
          )}
          {saveStatus === 'saved' && (
            <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
              <Check className="w-3 h-3" />
              <span>Salvo</span>
            </div>
          )}
        </div>
      </div>

      {/* Dica de uso */}
      {highlights.length === 0 && (
        <div className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
          <Highlighter className="w-3 h-3" />
          <span>Selecione texto para criar marcações coloridas com comentários</span>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* VISUALIZAÇÃO DETALHADA (cada declaração com timestamp) */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {viewMode === 'detalhada' && (
        <div className="space-y-3">
          {sinteses?.map((sintese, i) => {
            const dep = getDepoente(sintese.deponenteId);
            const isExpanded = expandedId === sintese.deponenteId;

            // Verifica se tem o novo formato (conteudo) ou o antigo (pontosPrincipais)
            const hasNewFormat = sintese.conteudo && sintese.conteudo.length > 0;
            const declaracoesCount = hasNewFormat
              ? sintese.conteudo.length
              : (sintese.pontosPrincipais?.length || 0);

            return (
              <Card key={`${sintese.deponenteId}-${i}`} className="overflow-hidden">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : sintese.deponenteId)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                      {dep
                        ? `${getQualificacaoLabel(dep.qualificacao).toUpperCase()} (${dep.nome})`
                        : sintese.deponenteNome || sintese.deponenteId}
                    </h3>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {declaracoesCount} declarações
                    </span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-slate-100 dark:border-slate-700 space-y-2 pt-3">
                    {hasNewFormat ? (
                      // Novo formato com timestamps
                      sintese.conteudo.map((item, j) => (
                        <div key={j} className="flex gap-2 text-sm">
                          {item.timestamp && <TimestampBadge timestamp={item.timestamp} />}
                          <p className="text-slate-700 dark:text-slate-300">
                            <HighlightedText
                              text={item.texto}
                              deponenteId={sintese.deponenteId}
                              itemIndex={j}
                              viewMode="detalhada"
                              highlights={highlights}
                              onAddHighlight={handleAddHighlight}
                              onRemoveHighlight={handleRemoveHighlight}
                            />
                          </p>
                        </div>
                      ))
                    ) : (
                      // Formato antigo (pontosPrincipais)
                      sintese.pontosPrincipais?.map((ponto, j) => (
                        <div key={j} className="flex gap-2 text-sm">
                          <span className="text-indigo-500 mt-0.5">•</span>
                          <p className="text-slate-700 dark:text-slate-300">
                            <HighlightedText
                              text={ponto}
                              deponenteId={sintese.deponenteId}
                              itemIndex={j}
                              viewMode="detalhada"
                              highlights={highlights}
                              onAddHighlight={handleAddHighlight}
                              onRemoveHighlight={handleRemoveHighlight}
                            />
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* VISUALIZAÇÃO CONDENSADA (texto corrido por depoente) */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {viewMode === 'condensada' && (
        <div className="space-y-4">
          {sintesesCondensadas && sintesesCondensadas.length > 0 ? (
            sintesesCondensadas.map((s, i) => {
              const style = getQualificacaoStyle(s.qualificacao);
              // Gera um deponenteId consistente para a síntese condensada
              const deponenteId = `condensada-${s.deponente.replace(/\s+/g, '-').toLowerCase()}`;
              return (
                <Card key={i} className={`border-l-4 ${getQualBorderColor(s.qualificacao)}`}>
                  <CardContent>
                    <div className="flex items-center gap-2 mb-3">
                      <Badge className={`${style.bg} ${style.text} font-bold`}>
                        {s.deponente}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      <HighlightedText
                        text={s.textoCorrente}
                        deponenteId={deponenteId}
                        itemIndex={i}
                        viewMode="condensada"
                        highlights={highlights}
                        onAddHighlight={handleAddHighlight}
                        onRemoveHighlight={handleRemoveHighlight}
                      />
                    </p>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
              <CardContent>
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  Sínteses condensadas não disponíveis. Tente gerar nova análise.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* VISUALIZAÇÃO POR TEMA */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {viewMode === 'tema' && (
        <div className="space-y-6">
          {sintesesPorTema && sintesesPorTema.length > 0 ? (
            sintesesPorTema.map((tema, i) => {
              // Identificar depoentes que NÃO falaram sobre este tema
              // Normaliza nome: remove acentos, hífens, converte para uppercase, tokeniza em palavras
              const normalizeToTokens = (name: string): string[] => {
                return name
                  .toUpperCase()
                  .normalize('NFD')
                  .replace(/[\u0300-\u036f]/g, '') // remove acentos
                  .replace(/[-_]/g, ' ')           // converte hífens/underscores em espaços
                  .replace(/[()]/g, ' ')           // remove parênteses
                  .split(/\s+/)                    // tokeniza por espaços
                  .filter(t => t.length > 1);      // remove tokens de 1 caractere
              };

              // Verifica se dois conjuntos de tokens têm pelo menos 2 palavras em comum
              const hasNameMatch = (tokens1: string[], tokens2: string[]): boolean => {
                const matches = tokens1.filter(t1 => tokens2.some(t2 => t1 === t2 || t1.includes(t2) || t2.includes(t1)));
                return matches.length >= 2 || (matches.length === 1 && (tokens1.length === 1 || tokens2.length === 1));
              };

              const deponentesSemDeclaracao = depoentes.filter(dep => {
                const depTokens = normalizeToTokens(dep.nome);
                // Verifica se alguma declaração do tema corresponde a este depoente
                const encontrado = tema.declaracoes?.some(dec => {
                  const decTokens = normalizeToTokens(dec.deponente);
                  return hasNameMatch(depTokens, decTokens);
                }) || false;
                return !encontrado;
              });

              return (
                <div key={i}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg flex items-center justify-center">
                      <Target className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100">{tema.tema}</h3>
                  </div>
                  <div className="space-y-3 pl-10">
                    {/* Depoentes que falaram sobre o tema */}
                    {tema.declaracoes?.map((dec, j) => {
                      const style = getQualificacaoStyle(dec.qualificacao);
                      // Gera um deponenteId consistente para a síntese por tema
                      const deponenteId = `tema-${dec.deponente.replace(/\s+/g, '-').toLowerCase()}`;
                      return (
                        <Card key={j} className={`border-l-4 ${getQualBorderColor(dec.qualificacao)}`}>
                          <CardContent>
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className={`${style.bg} ${style.text} font-bold`}>
                                {dec.deponente}
                              </Badge>
                            </div>
                            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                              <HighlightedText
                                text={dec.textoCorrente}
                                deponenteId={deponenteId}
                                itemIndex={j}
                                viewMode="tema"
                                temaIndex={i}
                                highlights={highlights}
                                onAddHighlight={handleAddHighlight}
                                onRemoveHighlight={handleRemoveHighlight}
                              />
                            </p>
                          </CardContent>
                        </Card>
                      );
                    })}
                    {/* Depoentes que NÃO falaram sobre o tema */}
                    {deponentesSemDeclaracao.map((dep, j) => {
                      const style = getQualificacaoStyle(dep.qualificacao);
                      return (
                        <Card key={`sem-${j}`} className={`border-l-4 ${getQualBorderColor(dep.qualificacao)} opacity-60`}>
                          <CardContent>
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className={`${style.bg} ${style.text} font-bold`}>
                                {getQualificacaoLabel(dep.qualificacao).toUpperCase()} ({dep.nome})
                              </Badge>
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                              Não falou sobre o tema
                            </p>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })
          ) : (
            <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
              <CardContent>
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  Sínteses por tema não disponíveis. Tente gerar nova análise.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default SintesesTab;
