/**
 * @file ChatBubble.tsx
 * @description Bolha de mensagem do chat
 * @version 1.36.84
 */

import React from 'react';
import type { ChatBubbleProps } from '../../types';

/**
 * v1.19.4: Converter Markdown básico para HTML
 */
const markdownToHtml = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
    .replace(/\n+/g, '<br>');
};

export const ChatBubble = React.memo(({
  msg,
  onUse,
  showUse,
  sanitizeHTML = (html: string) => html || ''
}: ChatBubbleProps) => {
  const isUser = msg.role === 'user';
  const time = new Date(msg.ts ?? Date.now()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className="max-w-[85%]">
        <div className={`text-xs mb-1 theme-text-muted ${isUser ? 'text-right' : ''}`}>
          {isUser ? '👤 Você' : '🤖 Assistente'} <span className="ml-1">{time}</span>
        </div>
        <div className={`rounded-lg p-3 ${
          isUser
            ? 'bg-purple-600/20 border border-purple-500/30'
            : 'theme-bg-secondary border theme-border-input'
        }`}>
          {isUser ? (
            <p className="theme-text-primary text-sm whitespace-pre-wrap">{msg.content}</p>
          ) : (
            <div
              className="theme-text-secondary text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: sanitizeHTML(markdownToHtml(msg.content)) }}
            />
          )}
        </div>
        {msg.error && (
          <div className="text-xs text-red-400 mt-1">⚠️ Erro: {msg.error}</div>
        )}
        {!isUser && showUse && !msg.error && (
          <div className="flex justify-end mt-1">
            <button
              onClick={() => onUse(msg.content)}
              className="text-xs px-2 py-1 rounded theme-bg-tertiary theme-text-muted hover-green-700"
            >
              Usar ↑
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

ChatBubble.displayName = 'ChatBubble';
