/**
 * @file ChatHistoryArea.tsx
 * @description Área de histórico do chat (v1.19.0)
 * @version 1.36.84
 */

import React from 'react';
import { Sparkles } from 'lucide-react';
import type { ChatHistoryAreaProps } from '../../types';
import { ChatBubble } from './ChatBubble';

export const ChatHistoryArea = React.memo(({
  history,
  generating,
  onUseMessage,
  showUseButtons,
  sanitizeHTML
}: ChatHistoryAreaProps) => {
  const ref = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [history, generating]);

  return (
    <div ref={ref} className="h-80 overflow-y-auto p-4 space-y-4 theme-bg-app" role="log" aria-live="polite">
      {history.length === 0 ? (
        <div className="h-full flex items-center justify-center">
          <div className="text-center theme-text-muted">
            <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Inicie a conversa com sua instrução</p>
            <p className="text-xs mt-1">A IA pode fazer perguntas se precisar de mais informações</p>
          </div>
        </div>
      ) : (
        history.map((msg: { role: string; content: string }, i: number) => (
          <ChatBubble
            key={i}
            msg={msg}
            onUse={onUseMessage}
            showUse={showUseButtons && msg.role === 'assistant'}
            sanitizeHTML={sanitizeHTML}
          />
        ))
      )}
      {generating && (
        <div className="flex justify-start">
          <div className="max-w-[85%]">
            <div className="text-xs mb-1 theme-text-muted">🤖 Assistente</div>
            <div className="rounded-lg p-3 theme-bg-secondary border theme-border-input flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm theme-text-muted">Gerando...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

ChatHistoryArea.displayName = 'ChatHistoryArea';
