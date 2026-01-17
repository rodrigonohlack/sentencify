// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE: VoiceButton - Botão de ditado por voz
// v1.37.88 - Adicionado suporte a melhoria de texto com IA
//
// Botão reutilizável para ativar/desativar reconhecimento de voz.
// Usa Web Speech API via useVoiceToText hook.
//
// Features:
// - Preview flutuante mostra texto em tempo real enquanto fala
// - Só insere no editor quando resultado é final
// - Feedback visual com cursor piscando
// - v1.37.88: Melhoria automática do texto com IA (opcional)
//
// Props:
// - onTranscript: callback com texto final transcrito
// - size: 'sm' (apenas ícone) ou 'md' (ícone + texto)
// - className: classes CSS adicionais
// - improveWithAI: se deve melhorar texto com IA antes de inserir
// - onImproveText: função para melhorar texto (recebe raw, retorna melhorado)
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useCallback, memo } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
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
  /** v1.37.88: Se deve melhorar texto com IA antes de inserir */
  improveWithAI?: boolean;
  /** v1.37.88: Função para melhorar texto (recebe raw, retorna Promise<melhorado>) */
  onImproveText?: (text: string) => Promise<string>;
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
  improveWithAI = false,
  onImproveText
}) => {
  // v1.35.60: Estado para texto interim (preview flutuante)
  const [interimText, setInterimText] = useState('');
  // v1.37.88: Estado para indicar que está melhorando texto com IA
  const [isImproving, setIsImproving] = useState(false);

  // Handler de transcrição - mostra interim, insere apenas final
  // v1.37.88: Se improveWithAI ativo, melhora texto antes de inserir
  const handleTranscript = useCallback(async (text: string, isFinal: boolean) => {
    if (isFinal) {
      // v1.37.88: Melhorar com IA se habilitado
      if (improveWithAI && onImproveText && text.trim().length >= 10) {
        setInterimText('Melhorando com IA...');
        setIsImproving(true);
        try {
          const improvedText = await onImproveText(text);
          setInterimText('');
          onTranscript(improvedText);
        } catch (error) {
          console.warn('[VoiceButton] Erro ao melhorar texto:', error);
          setInterimText('');
          onTranscript(text); // Fallback para texto original
        } finally {
          setIsImproving(false);
        }
      } else {
        setInterimText(''); // Limpar preview
        onTranscript(text);  // Inserir no editor
      }
    } else {
      setInterimText(text); // Mostrar preview
    }
  }, [onTranscript, improveWithAI, onImproveText]);

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
      {/* v1.35.62: z-[200] para ficar acima de modais, posição top-full (abaixo do botão) */}
      {/* v1.37.88: Também mostra durante melhoria com IA */}
      {(voice.isRecording || isImproving) && interimText && (
        <div
          className={`absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-2
                     text-slate-200 text-sm rounded-lg
                     shadow-xl border
                     max-w-xs whitespace-pre-wrap z-[200]
                     animate-in fade-in slide-in-from-top-1 duration-150
                     ${isImproving
                       ? 'bg-indigo-900 border-indigo-500'
                       : 'bg-slate-800 border-slate-600'
                     }`}
          style={{ minWidth: '120px' }}
        >
          {/* Seta apontando para o botão (acima) */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 -mb-px">
            <div className={`border-8 border-transparent ${isImproving ? 'border-b-indigo-900' : 'border-b-slate-800'}`} />
          </div>
          <div className="flex items-center gap-2">
            {isImproving && <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />}
            <span>{interimText}</span>
            {!isImproving && <span className="animate-pulse text-indigo-400">▋</span>}
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
