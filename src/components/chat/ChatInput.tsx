/**
 * @file ChatInput.tsx
 * @description Campo de entrada do chat (v1.19.0)
 * @version 1.36.84
 */

import React from 'react';
import type { ChatInputProps } from '../../types';
import { VoiceButton } from '../VoiceButton';

export const ChatInput = React.memo(({
  onSend,
  disabled,
  placeholder
}: ChatInputProps) => {
  const [value, setValue] = React.useState('');

  const handleSend = () => {
    if (!value.trim() || disabled) return;
    onSend(value.trim());
    setValue('');
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // v1.35.59: Handler para Voice-to-Text - adiciona texto ao valor
  const handleVoiceTranscript = React.useCallback((text: string) => {
    setValue(prev => (prev ? prev + ' ' : '') + text);
  }, []);

  return (
    <div className="flex gap-2">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKey}
        disabled={disabled}
        className="flex-1 h-20 theme-bg-app border theme-border-input rounded-lg p-3 theme-text-primary resize-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 disabled:opacity-50"
        placeholder={placeholder}
      />
      {/* v1.35.59: VoiceButton para ditado */}
      <VoiceButton
        onTranscript={handleVoiceTranscript}
        size="sm"
        className="self-end mb-1"
      />
      <button
        onClick={handleSend}
        disabled={!value.trim() || disabled}
        className="px-4 rounded-lg font-medium disabled:opacity-50 text-white bg-gradient-to-r from-purple-600 to-blue-600 hover-purple-700"
      >
        {disabled ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          'Enviar'
        )}
      </button>
    </div>
  );
});

ChatInput.displayName = 'ChatInput';
