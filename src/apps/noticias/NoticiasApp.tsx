// ═══════════════════════════════════════════════════════════════════════════
// NOTÍCIAS JURÍDICAS - App Principal
// v1.41.0 - Agregador inteligente de notícias jurídicas trabalhistas
// ═══════════════════════════════════════════════════════════════════════════

import React, { useCallback, useEffect, useState } from 'react';
import {
  Newspaper, Settings, Plus, RefreshCw, Loader2, Scale,
  Sun, Moon, LogOut, Rss
} from 'lucide-react';

// Componentes
import {
  LoginGate,
  useLoginGate,
  NewsFeed,
  NewsFilters,
  NewsDetail,
  SettingsModal,
  ManualInput
} from './components';

// Hooks e Stores
import { useNoticiasAPI } from './hooks';
import { useNoticiasStore } from './stores';
import { useAIIntegration } from './hooks/useAIIntegration';

// Tema global (necessário para CSS variables dos modais)
import { ThemeStyles } from '../../styles';
import { useThemeManagement } from '../../hooks';

// Serviços
import { fetchRSSWithStats } from './services/rss-service';

// Prompts
import { SUMMARY_SYSTEM_PROMPT, buildSummaryPrompt, SUMMARY_AI_CONFIG } from './prompts/summary-prompts';

// Tipos
import type { NewsItem, NewsItemCreate, NewsFilters as NewsFiltersType } from './types';

// Constantes
import { PAGINATION_CONFIG } from './constants/sources';

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL (com autenticação)
// ═══════════════════════════════════════════════════════════════════════════

const NoticiasAppContent: React.FC = () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // STORES E HOOKS
  // ═══════════════════════════════════════════════════════════════════════════

  const { userEmail, logout } = useLoginGate();
  const api = useNoticiasAPI();
  const { callAI, aiSettings } = useAIIntegration();

  // Store de notícias
  const {
    news,
    sources,
    filters,
    loading,
    error,
    hasMore,
    totalCount,
    selectedNews,
    isSettingsOpen,
    setNews,
    appendNews,
    updateNewsItem,
    setFilters,
    resetFilters,
    setLoading,
    setError,
    setTotalCount,
    setHasMore,
    setSelectedNews,
    setSettingsOpen,
    toggleSource,
    enableAllSources,
    disableAllSources,
    setLastRefresh
  } = useNoticiasStore();

  // Tema global (sincronizado com Sentencify principal)
  const { isDarkMode, toggleAppTheme } = useThemeManagement();

  // Estado local
  const [isManualInputOpen, setIsManualInputOpen] = useState(false);
  const [offset, setOffset] = useState(0);

  // ═══════════════════════════════════════════════════════════════════════════
  // EFEITOS
  // ═══════════════════════════════════════════════════════════════════════════

  // Carregar notícias ao montar e quando filtros mudam
  useEffect(() => {
    loadNews(true);
  }, [filters]);

  // ═══════════════════════════════════════════════════════════════════════════
  // FUNÇÕES DE CARREGAMENTO
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Carrega notícias do backend
   */
  const loadNews = useCallback(async (reset: boolean = false) => {
    if (loading.feed) return;

    const newOffset = reset ? 0 : offset;
    setLoading({ feed: true });
    setError(null);

    try {
      const result = await api.fetchNoticias(filters, {
        limit: PAGINATION_CONFIG.DEFAULT_PAGE_SIZE,
        offset: newOffset
      });

      if (reset) {
        setNews(result.news);
        setOffset(PAGINATION_CONFIG.DEFAULT_PAGE_SIZE);
      } else {
        appendNews(result.news);
        setOffset(prev => prev + PAGINATION_CONFIG.DEFAULT_PAGE_SIZE);
      }

      setTotalCount(result.total);
      setHasMore(result.hasMore);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading({ feed: false });
    }
  }, [api, filters, loading.feed, offset, setNews, appendNews, setLoading, setError, setTotalCount, setHasMore]);

  /**
   * Busca novas notícias dos feeds RSS
   */
  const refreshFromRSS = useCallback(async () => {
    if (loading.refresh) return;

    setLoading({ refresh: true });
    setError(null);

    try {
      // Buscar dos feeds RSS
      const rssResult = await fetchRSSWithStats(sources, true);

      if (rssResult.news.length > 0) {
        // Enviar para o backend em lote
        const batchResult = await api.createNoticiasBatch(rssResult.news);
        console.log(`[Noticias] RSS: ${batchResult.inserted} inseridas, ${batchResult.skipped} duplicadas`);
      }

      // Atualizar timestamp
      setLastRefresh(new Date().toISOString());

      // Recarregar feed
      await loadNews(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading({ refresh: false });
    }
  }, [api, sources, loading.refresh, setLoading, setError, setLastRefresh, loadNews]);

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS DE AÇÕES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Toggle favorito de uma notícia
   */
  const handleToggleFavorite = useCallback(async (id: string) => {
    const newsItem = news.find(n => n.id === id);
    if (!newsItem) return;

    setLoading({ favorite: id });

    try {
      await api.toggleFavorite(id, newsItem.isFavorite);
      updateNewsItem(id, { isFavorite: !newsItem.isFavorite });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading({ favorite: null });
    }
  }, [api, news, updateNewsItem, setLoading, setError]);

  /**
   * Gera resumo IA para uma notícia
   */
  const handleGenerateSummary = useCallback(async (id: string) => {
    const newsItem = news.find(n => n.id === id);
    if (!newsItem || newsItem.aiSummary) return;

    // Verificar se tem API key configurada
    const currentApiKey = aiSettings.apiKeys[aiSettings.provider];
    if (!currentApiKey) {
      setError(`Configure sua API key do ${aiSettings.provider} nas configurações do Sentencify`);
      return;
    }

    setLoading({ summary: id });
    setError(null);

    try {
      const prompt = buildSummaryPrompt(newsItem);
      const summary = await callAI(
        [{ role: 'user', content: prompt }],
        {
          systemPrompt: SUMMARY_SYSTEM_PROMPT,
          maxTokens: SUMMARY_AI_CONFIG.maxTokens,
          disableThinking: SUMMARY_AI_CONFIG.disableThinking
        }
      );

      // Salvar no backend (compartilhado)
      const result = await api.saveSummary(id, summary);

      // Atualizar localmente
      updateNewsItem(id, {
        aiSummary: summary,
        aiSummaryGeneratedAt: result.aiSummaryGeneratedAt
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading({ summary: null });
    }
  }, [api, news, callAI, aiSettings, updateNewsItem, setLoading, setError]);

  /**
   * Marca notícia como lida
   */
  const handleMarkAsRead = useCallback(async (id: string) => {
    const newsItem = news.find(n => n.id === id);
    if (!newsItem || newsItem.isRead) return;

    try {
      await api.markAsRead(id);
      updateNewsItem(id, { isRead: true });
    } catch (err) {
      // Silencioso - não crítico
      console.warn('[Noticias] Error marking as read:', err);
    }
  }, [api, news, updateNewsItem]);

  /**
   * Seleciona notícia para visualização detalhada
   */
  const handleSelectNews = useCallback((newsItem: NewsItem) => {
    setSelectedNews(newsItem);
  }, [setSelectedNews]);

  /**
   * Fecha visualização detalhada
   */
  const handleCloseDetail = useCallback(() => {
    setSelectedNews(null);
  }, [setSelectedNews]);

  /**
   * Atualiza filtros
   */
  const handleFiltersChange = useCallback((newFilters: Partial<NewsFiltersType>) => {
    setFilters(newFilters);
    setOffset(0);
  }, [setFilters]);

  /**
   * Adiciona notícia manualmente
   */
  const handleManualAdd = useCallback(async (newsItem: NewsItemCreate) => {
    await api.createNoticia(newsItem);
    await loadNews(true);
  }, [api, loadNews]);

  /**
   * Carrega mais notícias (scroll infinito)
   */
  const handleLoadMore = useCallback(() => {
    loadNews(false);
  }, [loadNews]);

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen theme-bg-primary">
      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* HEADER */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 theme-bg-secondary border-b theme-border-secondary backdrop-blur-lg bg-opacity-90">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center shadow-lg">
                <Newspaper className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold theme-text-primary text-lg">
                  Notícias Jurídicas
                </h1>
                <p className="text-xs theme-text-muted">
                  Feed trabalhista inteligente
                </p>
              </div>
            </div>

            {/* Ações */}
            <div className="flex items-center gap-2">
              {/* Buscar RSS */}
              <button
                onClick={refreshFromRSS}
                disabled={loading.refresh}
                className="p-2 rounded-lg theme-bg-tertiary hover:theme-bg-secondary transition-colors"
                title="Buscar novas notícias"
              >
                {loading.refresh ? (
                  <Loader2 className="w-5 h-5 animate-spin theme-text-secondary" />
                ) : (
                  <Rss className="w-5 h-5 theme-text-secondary" />
                )}
              </button>

              {/* Adicionar manual */}
              <button
                onClick={() => setIsManualInputOpen(true)}
                className="p-2 rounded-lg theme-bg-tertiary hover:theme-bg-secondary transition-colors"
                title="Adicionar notícia manualmente"
              >
                <Plus className="w-5 h-5 theme-text-secondary" />
              </button>

              {/* Configurações */}
              <button
                onClick={() => setSettingsOpen(true)}
                className="p-2 rounded-lg theme-bg-tertiary hover:theme-bg-secondary transition-colors"
                title="Configurações"
              >
                <Settings className="w-5 h-5 theme-text-secondary" />
              </button>

              {/* Voltar ao Sentencify */}
              <a
                href="/"
                className="p-2 rounded-lg theme-bg-tertiary hover:theme-bg-secondary transition-colors"
                title="Voltar ao Sentencify"
              >
                <Scale className="w-5 h-5 theme-text-secondary" />
              </a>

              {/* Toggle tema */}
              <button
                onClick={toggleAppTheme}
                className="p-2 rounded-lg theme-bg-tertiary hover:theme-bg-secondary transition-colors"
                title={isDarkMode ? 'Modo claro' : 'Modo escuro'}
              >
                {isDarkMode ? (
                  <Sun className="w-5 h-5 text-yellow-400" />
                ) : (
                  <Moon className="w-5 h-5 theme-text-secondary" />
                )}
              </button>

              {/* Logout */}
              <button
                onClick={logout}
                className="p-2 rounded-lg theme-bg-tertiary hover:bg-red-500/20 transition-colors"
                title={`Sair (${userEmail})`}
              >
                <LogOut className="w-5 h-5 text-red-400" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* CONTEÚDO PRINCIPAL */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Sidebar com filtros (desktop) */}
          <aside className="hidden lg:block w-72 flex-shrink-0">
            <div className="sticky top-24 theme-card rounded-xl p-4 border theme-border-secondary">
              <h2 className="font-semibold theme-text-primary mb-4 flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                Filtros
              </h2>
              <NewsFilters
                filters={filters}
                sources={sources}
                onFiltersChange={handleFiltersChange}
                onResetFilters={resetFilters}
              />
            </div>
          </aside>

          {/* Feed principal */}
          <div className="flex-1 min-w-0">
            {/* Filtros mobile */}
            <div className="lg:hidden mb-4 theme-card rounded-xl p-4 border theme-border-secondary">
              <NewsFilters
                filters={filters}
                sources={sources}
                onFiltersChange={handleFiltersChange}
                onResetFilters={resetFilters}
              />
            </div>

            {/* Feed de notícias */}
            <NewsFeed
              news={news}
              loading={loading}
              error={error}
              hasMore={hasMore}
              totalCount={totalCount}
              onLoadMore={handleLoadMore}
              onRefresh={refreshFromRSS}
              onToggleFavorite={handleToggleFavorite}
              onGenerateSummary={handleGenerateSummary}
              onSelectNews={handleSelectNews}
              onMarkAsRead={handleMarkAsRead}
              summaryGeneratingId={loading.summary}
              favoriteLoadingId={loading.favorite}
            />
          </div>

          {/* Detail panel (desktop) */}
          {selectedNews && (
            <aside className="hidden xl:block w-96 flex-shrink-0">
              <div className="sticky top-24 theme-card rounded-xl border theme-border-secondary overflow-hidden max-h-[calc(100vh-8rem)]">
                <NewsDetail
                  news={selectedNews}
                  onClose={handleCloseDetail}
                  onToggleFavorite={handleToggleFavorite}
                  onGenerateSummary={handleGenerateSummary}
                  isGeneratingSummary={loading.summary === selectedNews.id}
                  isFavoriteLoading={loading.favorite === selectedNews.id}
                />
              </div>
            </aside>
          )}
        </div>
      </main>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MODAIS */}
      {/* ═══════════════════════════════════════════════════════════════ */}

      {/* Modal de detalhe (mobile/tablet) */}
      {selectedNews && (
        <div className="xl:hidden fixed inset-0 z-50 theme-bg-primary">
          <NewsDetail
            news={selectedNews}
            onClose={handleCloseDetail}
            onToggleFavorite={handleToggleFavorite}
            onGenerateSummary={handleGenerateSummary}
            isGeneratingSummary={loading.summary === selectedNews.id}
            isFavoriteLoading={loading.favorite === selectedNews.id}
          />
        </div>
      )}

      {/* Modal de configurações */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setSettingsOpen(false)}
        sources={sources}
        onToggleSource={toggleSource}
        onEnableAll={enableAllSources}
        onDisableAll={disableAllSources}
      />

      {/* Modal de entrada manual */}
      <ManualInput
        isOpen={isManualInputOpen}
        onClose={() => setIsManualInputOpen(false)}
        onSubmit={handleManualAdd}
      />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTAÇÃO COM GATE DE AUTENTICAÇÃO
// ═══════════════════════════════════════════════════════════════════════════

/**
 * App de Notícias Jurídicas com autenticação
 * Inclui ThemeStyles para CSS variables dos modais
 */
export const NoticiasApp: React.FC = () => (
  <>
    <ThemeStyles />
    <LoginGate>
      <NoticiasAppContent />
    </LoginGate>
  </>
);

export default NoticiasApp;
