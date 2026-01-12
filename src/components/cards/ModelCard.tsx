/**
 * @file ModelCard.tsx
 * @description Card dual-view cards/list para biblioteca de modelos
 * @version 1.36.86
 *
 * Extraído do App.tsx como parte da FASE 3 de refatoração.
 * v1.35.0: Suporte a modelos compartilhados com badge de proprietário
 */

import React from 'react';
import { Users, Edit, Trash2 } from 'lucide-react';
import type { ModelCardProps } from '../../types';

export const ModelCard = React.memo(({
  model,
  viewMode,
  onEdit,
  onToggleFavorite,
  onDuplicate,
  onDelete,
  onInsert,
  sanitizeHTML,
  isShared = false,
  ownerEmail = null,
  sharedPermission = 'view'
}: ModelCardProps) => {
  // Validacao de viewMode
  let validViewMode = viewMode;
  if (viewMode !== 'cards' && viewMode !== 'list') {
    validViewMode = 'cards';
  }

  // MODO CARDS - Visualizacao expandida com preview
  if (validViewMode === 'cards') {
    return (
      <div
        className="theme-bg-secondary-30 p-5 rounded-lg border-2 transition-all hover-theme-border-from-600 card-hover-lift"
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => onToggleFavorite(model.id)}
                className={`text-xl hover:scale-125 transition-all duration-200 ${model.favorite ? 'text-yellow-400' : 'text-slate-400 hover:text-yellow-300'}`}
                title={model.favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
              >
                {model.favorite ? '\u2605' : '\u2606'}
              </button>
              <h4 className="font-semibold text-lg theme-text-primary">{model.title}</h4>
            </div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {model.category && (
                <span className="text-xs px-2 py-1 rounded theme-bg-purple-accent theme-text-purple border border-purple-500/30 font-medium">
                  {model.category}
                </span>
              )}
              {/* Badge de similaridade para busca semantica */}
              {model.similarity !== undefined && (
                <span className={`text-xs px-2 py-1 rounded font-medium animate-badge ${
                  model.similarity >= 0.7 ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                  model.similarity >= 0.5 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                  'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                }`}>
                  {Math.round(model.similarity * 100)}% similar
                </span>
              )}
              {/* Badge de modelo compartilhado */}
              {isShared && ownerEmail && (
                <span className="text-xs px-2 py-1 rounded font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30 animate-badge flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  De: {ownerEmail.split('@')[0]}
                </span>
              )}
              {model.createdAt && (
                <span className="text-xs theme-text-disabled">
                  {new Date(model.createdAt).toLocaleDateString('pt-BR')}
                </span>
              )}
            </div>
            {model.keywords && (() => {
              const kwArr = Array.isArray(model.keywords) ? model.keywords : model.keywords.split(',');
              return (
              <div className="flex flex-wrap gap-1 mb-3">
                {kwArr.slice(0, 3).map((kw: string, i: number) => (
                  <span key={i} className="text-xs px-2 py-0.5 rounded theme-bg-tertiary theme-text-tertiary">
                    {kw.trim()}
                  </span>
                ))}
                {kwArr.length > 3 && (
                  <span className="text-xs px-2 py-0.5 theme-text-muted">
                    +{kwArr.length - 3}
                  </span>
                )}
              </div>
            );})()}
          </div>
        </div>

        {/* Preview do conteudo */}
        <div
          className="theme-text-tertiary text-sm mb-4 line-clamp-4 theme-bg-primary-50 p-3 rounded"
          dangerouslySetInnerHTML={{ __html: sanitizeHTML(model.content) }}
        />

        {/* Botoes de acao - desabilitados para compartilhados view-only */}
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(model)}
            disabled={isShared && sharedPermission === 'view'}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded text-sm transition-all duration-300 border-none ${
              isShared && sharedPermission === 'view'
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'hover-blue-500 bg-blue-600 text-white'
            }`}
            title={isShared && sharedPermission === 'view' ? 'Modelo compartilhado (somente leitura)' : 'Editar modelo'}
          >
            <Edit className="w-4 h-4" />
            {isShared && sharedPermission === 'view' ? 'Visualizar' : 'Editar'}
          </button>
          <button
            onClick={() => onDuplicate(model)}
            className="hover-merge-confirm-btn px-3 py-2 rounded text-sm"
            style={{
              color: '#ffffff',
              transform: 'scale(1)'
            }}
            title="Duplicar para sua biblioteca"
          >
            \uD83D\uDCCB
          </button>
          {/* Mostrar excluir para modelos proprios OU compartilhados com permissao edit */}
          {(!isShared || sharedPermission === 'edit') && (
            <button
              onClick={() => onDelete(model)}
              className="hover-merge-cancel-btn px-3 py-2 rounded text-sm"
              style={{
                color: '#ffffff',
                transform: 'scale(1)'
              }}
              title={isShared ? 'Excluir modelo compartilhado (afeta o proprietario)' : 'Excluir modelo'}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // MODO LIST - Visualizacao compacta inline
  return (
    <div
      className="theme-bg-secondary-30 p-4 rounded-lg border-2 transition-all hover-theme-border-from-600"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            onClick={() => onToggleFavorite(model.id)}
            className={`text-lg flex-shrink-0 hover:scale-125 transition-all duration-200 ${model.favorite ? 'text-yellow-400' : 'text-slate-400 hover:text-yellow-300'}`}
            title={model.favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          >
            {model.favorite ? '\u2605' : '\u2606'}
          </button>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold theme-text-primary truncate">{model.title}</h4>
            <div className="flex items-center gap-2 mt-1">
              {model.category && (
                <span className="text-xs px-2 py-0.5 rounded theme-bg-purple-accent theme-text-purple border border-purple-500/30">
                  {model.category}
                </span>
              )}
              {/* Badge de similaridade para busca semantica */}
              {model.similarity !== undefined && (
                <span className={`text-xs px-2 py-0.5 rounded font-medium animate-badge ${
                  model.similarity >= 0.7 ? 'bg-green-500/20 text-green-400' :
                  model.similarity >= 0.5 ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-gray-500/20 text-gray-400'
                }`}>
                  {Math.round(model.similarity * 100)}%
                </span>
              )}
              {/* Badge de modelo compartilhado */}
              {isShared && ownerEmail && (
                <span className="text-xs px-2 py-0.5 rounded font-medium bg-purple-500/20 text-purple-400 animate-badge flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  De: {ownerEmail.split('@')[0]}
                </span>
              )}
              {model.keywords && (() => {
                const kwArr = Array.isArray(model.keywords) ? model.keywords : model.keywords.split(',');
                return (
                <span className="text-xs theme-text-muted truncate">
                  {kwArr[0].trim()}
                  {kwArr.length > 1 && ` +${kwArr.length - 1}`}
                </span>
              );})()}
            </div>
          </div>
        </div>
        {/* Botoes adaptados para modelos compartilhados */}
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => onEdit(model)}
            disabled={isShared && sharedPermission === 'view'}
            className={`p-2 rounded ${
              isShared && sharedPermission === 'view'
                ? 'cursor-not-allowed opacity-50'
                : 'hover-icon-blue-scale'
            }`}
            style={{
              color: isShared && sharedPermission === 'view' ? '#9ca3af' : '#60a5fa',
              transform: 'scale(1)'
            }}
            title={isShared && sharedPermission === 'view' ? 'Modelo compartilhado (somente leitura)' : 'Editar modelo'}
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDuplicate(model)}
            className="hover-icon-green-scale p-2 rounded"
            style={{
              color: '#4ade80',
              transform: 'scale(1)'
            }}
            title="Duplicar para sua biblioteca"
          >
            \uD83D\uDCCB
          </button>
          {/* Mostrar excluir para modelos proprios OU compartilhados com permissao edit */}
          {(!isShared || sharedPermission === 'edit') && (
            <button
              onClick={() => onDelete(model)}
              className="hover-icon-red-scale p-2 rounded"
              style={{
                color: '#f87171',
                transform: 'scale(1)'
              }}
              title={isShared ? 'Excluir modelo compartilhado (afeta o proprietario)' : 'Excluir modelo'}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

ModelCard.displayName = 'ModelCard';
