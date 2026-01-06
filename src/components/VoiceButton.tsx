// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE: VoiceButton - Botão de ditado por voz
// v1.35.59
//
// Botão reutilizável para ativar/desativar reconhecimento de voz.
// Usa Web Speech API via useVoiceToText hook.
//
// Props:
// - onTranscript: callback com texto final transcrito
// - size: 'sm' (apenas ícone) ou 'md' (ícone + texto)
// - className: classes CSS adicionais
// ═══════════════════════════════════════════════════════════════════════════

import React, { useCallback, memo } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { useVoiceToText } from '../hooks/useVoiceToText';

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────

export interface VoiceButtonProps {
  /** Callback chamado com texto transcrito final */
  onTranscript: (text: string) => void;
  /** Tamanho do botão: 'sm' = apenas ícone, 'md' = ícone + texto */
  size?: 'sm' | 'md';
  /** Classes CSS adicionais */
  className?: string;
  /** Callback de erro (ex: permissão negada) */
  onError?: (error: string) => void;
  /** Texto do botão quando idle (default: 'Voz') */
  idleText?: string;
  /** Texto do botão quando gravando (default: 'Ouvindo...') */
  recordingText?: string;
  /** Se deve mostrar texto interim enquanto fala */
  showInterim?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE
// ─────────────────────────────────────────────────────────────────────────────

export const VoiceButton: React.FC<VoiceButtonProps> = memo(({
  onTranscript,
  size = 'sm',
  className = '',
  onError,
  idleText = 'Voz',
  recordingText = 'Ouvindo...',
  showInterim = false
}) => {
  // Handler de transcrição - só envia resultado final
  const handleTranscript = useCallback((text: string, isFinal: boolean) => {
    if (isFinal) {
      onTranscript(text);
    }
  }, [onTranscript]);

  // Hook de voice-to-text
  const voice = useVoiceToText({
    onTranscript: handleTranscript,
    lang: 'pt-BR',
    continuous: true,
    interimResults: showInterim,
    onError
  });

  // Não renderizar se browser não suporta
  if (!voice.isSupported) {
    return null;
  }

  // Classes do botão
  const baseClasses = 'flex items-center gap-1 rounded transition-all duration-200';
  const sizeClasses = size === 'sm'
    ? 'p-1.5'
    : 'px-3 py-1.5 text-xs';
  const stateClasses = voice.isRecording
    ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse ring-2 ring-red-400/50'
    : 'bg-indigo-600 hover:bg-indigo-700 text-white';

  // Ícone
  const Icon = voice.isRecording ? MicOff : Mic;
  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  // Texto do botão
  const buttonText = voice.isRecording ? recordingText : idleText;

  // Título/tooltip
  const title = voice.isRecording
    ? 'Clique para parar o ditado'
    : 'Clique para ditar por voz';

  return (
    <button
      type="button"
      onClick={voice.toggle}
      className={`${baseClasses} ${sizeClasses} ${stateClasses} ${className}`}
      title={title}
      aria-label={title}
      aria-pressed={voice.isRecording}
    >
      <Icon className={iconSize} />
      {size === 'md' && <span>{buttonText}</span>}
    </button>
  );
});

VoiceButton.displayName = 'VoiceButton';

export default VoiceButton;
