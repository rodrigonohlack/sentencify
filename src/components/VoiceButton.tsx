// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE: VoiceButton - Botão de ditado por voz
// v1.35.60
//
// Botão reutilizável para ativar/desativar reconhecimento de voz.
// Usa Web Speech API via useVoiceToText hook.
//
// Features:
// - Preview flutuante mostra texto em tempo real enquanto fala
// - Só insere no editor quando resultado é final
// - Feedback visual com cursor piscando
//
// Props:
// - onTranscript: callback com texto final transcrito
// - size: 'sm' (apenas ícone) ou 'md' (ícone + texto)
// - className: classes CSS adicionais
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useCallback, memo } from 'react';
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
  recordingText = 'Ouvindo...'
}) => {
  // v1.35.60: Estado para texto interim (preview flutuante)
  const [interimText, setInterimText] = useState('');

  // Handler de transcrição - mostra interim, insere apenas final
  const handleTranscript = useCallback((text: string, isFinal: boolean) => {
    if (isFinal) {
      setInterimText(''); // Limpar preview
      onTranscript(text);  // Inserir no editor
    } else {
      setInterimText(text); // Mostrar preview
    }
  }, [onTranscript]);

  // Hook de voice-to-text
  const voice = useVoiceToText({
    onTranscript: handleTranscript,
    lang: 'pt-BR',
    continuous: true,
    interimResults: true, // v1.35.60: Habilitar interim para preview
    onError,
    onEnd: () => setInterimText('') // Limpar ao parar
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
    <div className="relative">
      {/* v1.35.60: Preview flutuante com texto interim */}
      {voice.isRecording && interimText && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2
                     bg-slate-800 text-slate-200 text-sm rounded-lg
                     shadow-xl border border-slate-600
                     max-w-xs whitespace-pre-wrap z-50
                     animate-in fade-in slide-in-from-bottom-1 duration-150"
          style={{ minWidth: '120px' }}
        >
          <div className="flex items-start gap-1">
            <span>{interimText}</span>
            <span className="animate-pulse text-indigo-400">▋</span>
          </div>
          {/* Seta apontando para o botão */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
            <div className="border-8 border-transparent border-t-slate-800" />
          </div>
        </div>
      )}

      {/* Botão */}
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
    </div>
  );
});

VoiceButton.displayName = 'VoiceButton';

export default VoiceButton;
