// ═══════════════════════════════════════════════════════════════════════════
// NOTÍCIAS JURÍDICAS - App Principal
// v1.41.0 - Agregador inteligente de notícias jurídicas trabalhistas
// ═══════════════════════════════════════════════════════════════════════════

import React, { useCallback, useEffect, useState } from 'react';
import {
  Newspaper, Settings, Plus, RefreshCw, Scale,
  Sun, Moon, LogOut, Rss, Star, ExternalLink, Loader2
} from 'lucide-react';

// Componentes
import {
  LoginGate,
  useLoginGate,
  NewsFeed,
  NewsFilters,
  NewsDetail,
  SettingsModal,
  ManualInput,
  Button
} from './components';

// Hooks e Stores
import { useNoticiasAPI } from './hooks';
import { useNoticiasStore } from './stores';
import { useAIIntegration } from './hooks/useAIIntegration';

// Modal base
import { BaseModal } from '../../components/modals/BaseModal';

// Utilitários de data
import { formatFullDate } from './utils/date-utils';

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
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-600/20">
                <Newspaper className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                  Notícias Jurídicas
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Sentencify AI
                </p>
              </div>
            </div>

            {/* Ações */}
            <div className="flex items-center gap-2">
              {/* Buscar RSS */}
              <Button
                variant="ghost"
                size="sm"
                onClick={refreshFromRSS}
                loading={loading.refresh}
                icon={<Rss className="w-4 h-4" />}
              >
                <span className="hidden sm:inline">Atualizar</span>
              </Button>

              {/* Adicionar manual */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsManualInputOpen(true)}
                icon={<Plus className="w-4 h-4" />}
              >
                <span className="hidden sm:inline">Adicionar</span>
              </Button>

              {/* Voltar ao Sentencify */}
              <a
                href="/"
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <Scale className="w-4 h-4" />
                <span className="hidden sm:inline">Sentencify</span>
              </a>

              {/* Toggle tema */}
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleAppTheme}
                icon={isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              >
                <span className="sr-only">Alternar tema</span>
              </Button>

              {/* Configurações */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSettingsOpen(true)}
                icon={<Settings className="w-4 h-4" />}
              >
                <span className="hidden sm:inline">Configurações</span>
              </Button>

              {/* User info & Logout */}
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-700">
                <span className="text-sm text-slate-600 dark:text-slate-400 hidden md:inline truncate max-w-[150px]">
                  {userEmail}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={logout}
                  icon={<LogOut className="w-4 h-4" />}
                >
                  <span className="sr-only">Sair</span>
                </Button>
              </div>
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
            <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto theme-card rounded-xl p-4 border theme-border-secondary">
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

        </div>
      </main>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MODAIS */}
      {/* ═══════════════════════════════════════════════════════════════ */}

      {/* Modal de detalhe de notícia */}
      <BaseModal
        isOpen={!!selectedNews}
        onClose={handleCloseDetail}
        title={selectedNews?.title || ''}
        subtitle={`${selectedNews?.sourceName || ''} · ${formatFullDate(selectedNews?.publishedAt || '')}`}
        icon={<Newspaper />}
        iconColor="blue"
        size="xl"
        footer={
          <div className="flex items-center justify-between w-full">
            <button
              onClick={() => selectedNews && handleToggleFavorite(selectedNews.id)}
              disabled={loading.favorite === selectedNews?.id}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium theme-bg-secondary theme-hover-bg border theme-border-modal theme-text-primary transition-all disabled:opacity-50"
            >
              {loading.favorite === selectedNews?.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Star
                  className={`w-4 h-4 ${
                    selectedNews?.isFavorite
                      ? 'fill-yellow-400 text-yellow-400'
                      : ''
                  }`}
                />
              )}
              {selectedNews?.isFavorite ? 'Favorito' : 'Favoritar'}
            </button>
            <a
              href={selectedNews?.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-lg shadow-blue-500/25 transition-all"
            >
              <ExternalLink className="w-4 h-4" />
              Ler no site original
            </a>
          </div>
        }
      >
        {selectedNews && (
          <NewsDetail
            news={selectedNews}
            hideHeader
            onClose={handleCloseDetail}
            onToggleFavorite={handleToggleFavorite}
            onGenerateSummary={handleGenerateSummary}
            isGeneratingSummary={loading.summary === selectedNews.id}
            isFavoriteLoading={loading.favorite === selectedNews.id}
          />
        )}
      </BaseModal>

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
