/**
 * @file ModelsTab.tsx
 * @description Aba de Banco de Modelos extraída do App.tsx
 * @version 1.37.31
 *
 * Seções:
 * 1. Banner de aviso (mudanças não exportadas)
 * 2. Header (título + botões)
 * 3. ModelFormModal
 * 4. Filtros e busca
 * 5. Resultados semânticos
 * 6. Grid de cards + paginação
 * 7. VirtualList (modo lista)
 * 8. Empty states
 */

import React from 'react';
import {
  Search, X, Plus, Upload, Download, Save, Share2, Users, Sparkles, RefreshCw
} from 'lucide-react';
import { CSS } from '../../constants/styles';
import { SyncStatusIndicator, ModelFormModal, ModelCard, VirtualList } from '../';
import type { SyncStatus } from '../SyncStatusIndicator';
import type { ModelsTabProps, Model } from '../../types';

export const ModelsTab: React.FC<ModelsTabProps> = ({
  modals,
  openModal,
  closeModal,
  modelLibrary,
  cloudSync,
  aiIntegration,
  useModelSemanticSearch,
  setUseModelSemanticSearch,
  modelSemanticResults,
  setModelSemanticResults,
  searchingModelSemantics,
  modelSemanticAvailable,
  filteredModels,
  currentModels,
  totalModelPages,
  indexOfFirstModel,
  indexOfLastModel,
  categories,
  categoryCounts,
  exportModels,
  importModels,
  saveModel,
  saveModelWithoutClosing,
  generateKeywordsWithAI,
  generateTitleWithAI,
  startEditingModel,
  toggleFavorite,
  duplicateModel,
  confirmDeleteModel,
  sanitizeHTML,
  fileInputRef,
  modelFormRef,
  modelEditorRef,
  quillReady,
  quillError,
  editorTheme,
  toggleEditorTheme,
  modelSaved,
  savingModel
}) => {
  return (
    <div className="space-y-6">
      {/* ═══════════════════════════════════════════════════════════════════════════════
          SEÇÃO 1: Banner de aviso - Apenas quando há mudanças não exportadas
          ═══════════════════════════════════════════════════════════════════════════════ */}
      {modelLibrary.hasUnsavedChanges && modelLibrary.models.length > 0 && (
        <div className="theme-warning-box p-4 flex items-start gap-3">
          <svg className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="flex-1">
            <h4 className="theme-text-primary font-semibold mb-1">Você tem mudanças não exportadas</h4>
            <p className="theme-text-secondary text-sm mb-2">
              Há alterações em seus modelos que ainda não foram exportadas.
              Para fazer backup do seu trabalho, <strong>exporte seus modelos antes de sair</strong>.
            </p>
            <button
              onClick={exportModels}
              className="hover-warning-yellow-btn px-4 py-2 rounded-lg font-semibold shadow-lg"
              style={{
                color: '#000',
                transform: 'scale(1)'
              }}
            >
              Exportar Modelos Agora
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════════
          SEÇÃO 2: Header com título e botões
          ═══════════════════════════════════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <h3 className="text-xl font-bold text-purple-400">Banco de Modelos</h3>
          {cloudSync?.isAuthenticated && (
            <div className="flex items-center gap-2">
              <SyncStatusIndicator
                status={cloudSync.syncStatus as SyncStatus}
                pendingCount={cloudSync.pendingCount}
                lastSyncAt={cloudSync.lastSyncAt}
                onSync={() => {
                  const initialPushDone = localStorage.getItem('sentencify-initial-push-done');
                  if (!initialPushDone && modelLibrary.models.length > 0) {
                    cloudSync.pushAllModels(modelLibrary.models).then((result: { success: boolean }) => {
                      if (result.success) {
                        localStorage.setItem('sentencify-initial-push-done', 'true');
                      }
                    });
                  } else {
                    cloudSync.sync();
                  }
                }}
              />
              {cloudSync.user?.email && (
                <span className="text-slate-400 text-xs" title={cloudSync.user.email}>
                  {cloudSync.user.email.length > 25 ? cloudSync.user.email.slice(0, 22) + '...' : cloudSync.user.email}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => openModal('bulkModal')}
            className="hover-gradient-blue-purple flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg text-white"
            style={{
              backgroundImage: 'linear-gradient(to right, #2563eb, #9333ea)'
            }}
            title="Criar multiplos modelos automaticamente a partir de arquivos usando IA"
          >
            <Sparkles className="w-4 h-4" />
            <Upload className="w-4 h-4" />
            Criar de Arquivos
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg hover-green-700-from-600 bg-emerald-600 text-white transition-colors duration-300"
            title="Carregar modelos de um arquivo JSON previamente exportado"
          >
            <Upload className="w-4 h-4" />
            Importar
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={importModels}
            className="hidden"
          />
          <button
            onClick={exportModels}
            className="flex items-center gap-2 px-4 py-2 rounded-lg hover-purple-700-from-600 bg-purple-600 text-white transition-colors duration-300"
            title="Salvar todos os modelos em um arquivo JSON (necessario para backup)"
          >
            <Download className="w-4 h-4" />
            Exportar
          </button>
          <button
            onClick={() => {
              if (modals.modelForm) {
                closeModal('modelForm');
                modelLibrary.setNewModel({ title: '', content: '', keywords: '', category: '' });
                modelLibrary.setEditingModel(null);
                if (modelEditorRef.current?.root) {
                  modelEditorRef.current.root.innerHTML = '';
                }
              } else {
                modelLibrary.setNewModel({ title: '', content: '', keywords: '', category: '' });
                modelLibrary.setEditingModel(null);
                openModal('modelForm');

                window.scrollTo({
                  top: 0,
                  behavior: 'smooth'
                });

                setTimeout(() => {
                  if (modelEditorRef.current?.root) {
                    modelEditorRef.current.root.innerHTML = '';
                    modelEditorRef.current.focus();
                  }
                }, 50);
              }
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg hover-blue-700-from-600 bg-blue-600 text-white transition-colors duration-300"
          >
            <Plus className="w-4 h-4" />
            Novo Modelo
          </button>

          {cloudSync.isAuthenticated && (
            <button
              onClick={() => openModal('shareLibrary')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-colors duration-300"
              title="Compartilhar biblioteca de modelos"
            >
              <Share2 className="w-4 h-4" />
              Compartilhar
            </button>
          )}

          {modelLibrary.models.length > 0 && (
            <button
              onClick={() => openModal('deleteAllModels')}
              className="p-2 rounded hover-delete-all"
              title="Excluir todos os modelos"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════════════
          SEÇÃO 3: Formulário de Modelo (ModelFormModal)
          ═══════════════════════════════════════════════════════════════════════════════ */}
      <ModelFormModal
        ref={modelFormRef}
        isOpen={modals.modelForm}
        editingModel={modelLibrary.editingModel}
        newModel={modelLibrary.newModel}
        setNewModel={modelLibrary.setNewModel}
        models={modelLibrary.models}
        onSave={saveModel}
        onCancel={() => {
          closeModal('modelForm');
          modelLibrary.setNewModel({ title: '', content: '', keywords: '', category: '' });
          modelLibrary.setEditingModel(null);
          if (modelEditorRef.current?.root) {
            modelEditorRef.current.root.innerHTML = '';
          }
        }}
        onGenerateKeywords={generateKeywordsWithAI}
        generatingKeywords={aiIntegration.generatingKeywords}
        onGenerateTitle={generateTitleWithAI}
        generatingTitle={aiIntegration.generatingTitle}
        onSaveWithoutClosing={saveModelWithoutClosing}
        onOpenAIAssistant={() => openModal('aiAssistantModel')}
        sanitizeHTML={sanitizeHTML}
        modelEditorRef={modelEditorRef}
        quillReady={quillReady}
        quillError={quillError}
        editorTheme={editorTheme}
        toggleEditorTheme={toggleEditorTheme}
        modelSaved={modelSaved}
        savingModel={savingModel}
      />

      {/* ═══════════════════════════════════════════════════════════════════════════════
          SEÇÃO 4: Filtros e Busca
          ═══════════════════════════════════════════════════════════════════════════════ */}
      <div>
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div className="relative flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 theme-text-muted" />
              <input
                type="text"
                value={modelLibrary.searchTerm}
                onChange={(e) => modelLibrary.setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Escape' && modelLibrary.setSearchTerm('')}
                className="w-full theme-bg-primary border theme-border-input rounded-lg pl-10 pr-10 py-3 theme-text-primary focus:border-blue-500"
                placeholder={useModelSemanticSearch ? "Buscar por significado..." : "Buscar modelos..."}
              />
              {modelLibrary.searchTerm && (
                <button onClick={() => modelLibrary.setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 theme-text-muted hover-text-primary" title="Limpar (Esc)">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {modelSemanticAvailable && (
              <button
                onClick={() => {
                  setUseModelSemanticSearch(prev => !prev);
                  setModelSemanticResults(null);
                }}
                className={`px-3 py-3 rounded-lg text-lg transition-colors ${
                  useModelSemanticSearch
                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                    : 'theme-bg-secondary theme-text-secondary hover-slate-600'
                }`}
                title={useModelSemanticSearch ? 'Busca semantica (por significado)' : 'Busca textual (por palavras)'}
              >
                {useModelSemanticSearch ? '🧠' : '🔤'}
              </button>
            )}
          </div>
          <div>
            <select
              value={modelLibrary.selectedCategory}
              onChange={(e) => modelLibrary.setSelectedCategory(e.target.value)}
              className="w-full theme-bg-primary border theme-border-input rounded-lg px-4 py-3 theme-text-primary focus:border-blue-500"
            >
              <option value="all">Todas as categorias ({modelLibrary.models.length})</option>
              {categories.map((cat, idx) => (
                <option key={idx} value={cat}>
                  {cat} ({categoryCounts.counts[cat] || 0})
                </option>
              ))}
              <option value="">Sem categoria ({categoryCounts.withoutCategory})</option>
            </select>
          </div>
        </div>

        {/* Controles de visualizacao e favoritos */}
        <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
          <div className={CSS.flexGap2}>
            <button
              onClick={() => modelLibrary.setShowFavoritesOnly(!modelLibrary.showFavoritesOnly)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                modelLibrary.showFavoritesOnly
                  ? 'bg-yellow-600 hover-yellow-600'
                  : 'theme-bg-secondary hover-slate-600'
              }`}
              title="Mostrar apenas favoritos"
            >
              <span className="text-lg">{modelLibrary.showFavoritesOnly ? '⭐' : '☆'}</span>
              <span className="text-sm">
                {modelLibrary.showFavoritesOnly ? 'Favoritos' : 'Todos'}
                {modelLibrary.showFavoritesOnly && ` (${categoryCounts.favorites})`}
              </span>
            </button>

            {/* Filtro de propriedade (Meus/Compartilhados) */}
            <div className="flex items-center theme-bg-primary rounded-lg p-1">
              <button
                onClick={() => modelLibrary.setOwnershipFilter('all')}
                className={`px-3 py-1.5 rounded text-sm transition-colors ${
                  modelLibrary.ownershipFilter === 'all'
                    ? 'bg-purple-600 text-white'
                    : 'theme-text-muted hover-theme-text-secondary'
                }`}
                title="Mostrar todos os modelos"
              >
                Todos
              </button>
              <button
                onClick={() => modelLibrary.setOwnershipFilter('mine')}
                className={`px-3 py-1.5 rounded text-sm transition-colors ${
                  modelLibrary.ownershipFilter === 'mine'
                    ? 'bg-purple-600 text-white'
                    : 'theme-text-muted hover-theme-text-secondary'
                }`}
                title="Mostrar apenas meus modelos"
              >
                Meus
              </button>
              <button
                onClick={() => modelLibrary.setOwnershipFilter('shared')}
                className={`px-3 py-1.5 rounded text-sm transition-colors flex items-center gap-1 ${
                  modelLibrary.ownershipFilter === 'shared'
                    ? 'bg-purple-600 text-white'
                    : 'theme-text-muted hover-theme-text-secondary'
                }`}
                title="Mostrar apenas modelos compartilhados"
              >
                <Users className="w-3 h-3" />
                Compartilhados
              </button>
            </div>

            <span className={CSS.textMuted}>
              {filteredModels.length} modelo{filteredModels.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="flex items-center gap-2 theme-bg-primary rounded-lg p-1">
            <button
              onClick={() => modelLibrary.setModelViewMode('cards')}
              className={`px-3 py-1.5 rounded transition-colors text-sm ${
                modelLibrary.modelViewMode === 'cards'
                  ? 'bg-blue-600 text-white'
                  : 'theme-text-muted hover-theme-text-secondary'
              }`}
              title="Visualização em cards"
            >
              📇 Cards
            </button>
            <button
              onClick={() => modelLibrary.setModelViewMode('list')}
              className={`px-3 py-1.5 rounded transition-colors text-sm ${
                modelLibrary.modelViewMode === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'theme-text-muted hover-theme-text-secondary'
              }`}
              title="Visualização em lista"
            >
              📋 Lista
            </button>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════════════
            SEÇÃO 5: Resultados semânticos
            ═══════════════════════════════════════════════════════════════════════════════ */}
        {useModelSemanticSearch && modelSemanticResults && modelSemanticResults.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-3 text-sm theme-text-muted">
              <span className="text-purple-400">🧠</span>
              <span>{modelSemanticResults.length} resultado(s) semantico(s)</span>
              {searchingModelSemantics && <RefreshCw className="w-4 h-4 animate-spin" />}
            </div>
            {modelLibrary.modelViewMode === 'cards' ? (
              <div className="grid grid-cols-1 gap-4">
                {modelSemanticResults.map((model: Model) => (
                  <ModelCard
                    key={model.id}
                    model={model}
                    viewMode="cards"
                    onEdit={startEditingModel}
                    onToggleFavorite={toggleFavorite}
                    onDuplicate={duplicateModel}
                    onDelete={confirmDeleteModel}
                    sanitizeHTML={sanitizeHTML}
                    isShared={model.isShared}
                    ownerEmail={model.ownerEmail}
                    sharedPermission={model.sharedPermission}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-1">
                {modelSemanticResults.map((model: Model) => (
                  <ModelCard
                    key={model.id}
                    model={model}
                    viewMode="list"
                    onEdit={startEditingModel}
                    onToggleFavorite={toggleFavorite}
                    onDuplicate={duplicateModel}
                    onDelete={confirmDeleteModel}
                    sanitizeHTML={sanitizeHTML}
                    isShared={model.isShared}
                    ownerEmail={model.ownerEmail}
                    sharedPermission={model.sharedPermission}
                  />
                ))}
              </div>
            )}
          </div>
        ) : useModelSemanticSearch && modelSemanticResults && modelSemanticResults.length === 0 ? (
          /* ═══════════════════════════════════════════════════════════════════════════════
              SEÇÃO 8a: Empty state - sem resultados semânticos
              ═══════════════════════════════════════════════════════════════════════════════ */
          <div className="text-center py-12 theme-text-muted">
            <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhum resultado semantico encontrado</p>
            <p className="text-xs mt-1">Tente reduzir o threshold nas configuracoes</p>
          </div>
        ) : filteredModels.length === 0 ? (
          /* ═══════════════════════════════════════════════════════════════════════════════
              SEÇÃO 8b: Empty state - sem modelos
              ═══════════════════════════════════════════════════════════════════════════════ */
          <div className="text-center py-12 theme-text-muted">
            <Save className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>Nenhum modelo {modelLibrary.showFavoritesOnly ? 'favorito' : 'cadastrado'} ainda</p>
          </div>
        ) : modelLibrary.modelViewMode === 'cards' ? (
          /* ═══════════════════════════════════════════════════════════════════════════════
              SEÇÃO 6: Grid de Cards + Paginação
              ═══════════════════════════════════════════════════════════════════════════════ */
          <>
            <div className="grid grid-cols-1 gap-4">
              {currentModels.map((model: Model) => (
                <ModelCard
                  key={model.id}
                  model={model}
                  viewMode="cards"
                  onEdit={startEditingModel}
                  onToggleFavorite={toggleFavorite}
                  onDuplicate={duplicateModel}
                  onDelete={confirmDeleteModel}
                  sanitizeHTML={sanitizeHTML}
                  isShared={model.isShared}
                  ownerEmail={model.ownerEmail}
                  sharedPermission={model.sharedPermission}
                />
              ))}
            </div>

            {/* Paginação apenas no modo CARDS */}
            {filteredModels.length > modelLibrary.modelsPerPage && (() => {
              const getPaginationRange = (current: number, total: number) => {
                if (total <= 7) {
                  return Array.from({ length: total }, (_, i: number) => i + 1);
                }
                const pages = new Set([1, total]);
                for (let i = Math.max(2, current - 2); i <= Math.min(total - 1, current + 2); i++) {
                  pages.add(i);
                }
                const sorted = Array.from(pages).sort((a, b) => a - b);
                const result: (number | null)[] = [];
                for (let i = 0; i < sorted.length; i++) {
                  if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
                    result.push(null);
                  }
                  result.push(sorted[i]);
                }
                return result;
              };

              const paginationRange = getPaginationRange(modelLibrary.currentModelPage, totalModelPages);

              return (
                <div className="mt-6 flex items-center justify-between border-t theme-border-input pt-4">
                  <div className="text-sm theme-text-muted">
                    Mostrando {indexOfFirstModel + 1}-{Math.min(indexOfLastModel, filteredModels.length)} de {filteredModels.length} modelos
                  </div>
                  <div className={CSS.flexGap2}>
                    <button
                      onClick={() => modelLibrary.setCurrentModelPage(prev => Math.max(prev - 1, 1))}
                      disabled={modelLibrary.currentModelPage === 1}
                      className="px-3 py-2 rounded-lg disabled:theme-bg-primary disabled:theme-text-disabled disabled:cursor-not-allowed flex items-center justify-center hover-pagination-btn"
                      title="Pagina anterior"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <div className="flex items-center gap-1">
                      {paginationRange.map((pageNum, idx) => (
                        pageNum === null ? (
                          <span key={`ellipsis-${idx}`} className="px-2 theme-text-muted select-none">...</span>
                        ) : (
                          <button
                            key={pageNum}
                            onClick={() => modelLibrary.setCurrentModelPage(pageNum)}
                            data-active={modelLibrary.currentModelPage === pageNum ? "true" : undefined}
                            className={`px-3 py-2 rounded-lg text-white min-w-[40px] ${
                              modelLibrary.currentModelPage === pageNum
                                ? 'bg-gradient-to-r from-blue-600 to-purple-600'
                                : 'theme-bg-secondary hover-pagination-page'
                            }`}
                          >
                            {pageNum}
                          </button>
                        )
                      ))}
                    </div>
                    <button
                      onClick={() => modelLibrary.setCurrentModelPage(prev => Math.min(prev + 1, totalModelPages))}
                      disabled={modelLibrary.currentModelPage === totalModelPages}
                      className="px-3 py-2 rounded-lg disabled:theme-bg-primary disabled:theme-text-disabled disabled:cursor-not-allowed flex items-center justify-center hover-pagination-btn"
                      title="Proxima pagina"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })()}
          </>
        ) : (
          /* ═══════════════════════════════════════════════════════════════════════════════
              SEÇÃO 7: VirtualList (modo lista)
              ═══════════════════════════════════════════════════════════════════════════════ */
          <VirtualList<Model>
            items={filteredModels}
            itemHeight={90}
            renderItem={(model) => (
              <ModelCard
                key={model.id}
                model={model}
                viewMode="list"
                onEdit={startEditingModel}
                onToggleFavorite={toggleFavorite}
                onDuplicate={duplicateModel}
                onDelete={confirmDeleteModel}
                sanitizeHTML={sanitizeHTML}
                isShared={model.isShared}
                ownerEmail={model.ownerEmail}
                sharedPermission={model.sharedPermission}
              />
            )}
            className="space-y-1"
          />
        )}
      </div>
    </div>
  );
};

export default ModelsTab;
