// ═══════════════════════════════════════════════════════════════════════════
// HOOK: useVoiceToText - Ditado por voz via Web Speech API
// v1.35.59
//
// Funcionalidades:
// - Reconhecimento de voz em português brasileiro
// - Transcrição em tempo real (interim + final)
// - Detecção automática de suporte do browser
// - Cleanup rigoroso para evitar memory leaks
// - Lazy initialization (cria SpeechRecognition apenas no primeiro uso)
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useRef, useCallback, useEffect } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS - Web Speech API (não incluídos em lib.dom.d.ts padrão)
// ─────────────────────────────────────────────────────────────────────────────

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

// Extend Window interface
declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERFACES DO HOOK
// ─────────────────────────────────────────────────────────────────────────────

export interface UseVoiceToTextOptions {
  /** Callback chamado com texto transcrito (parcial ou final) */
  onTranscript: (text: string, isFinal: boolean) => void;
  /** Continuar ouvindo após cada frase (default: true) */
  continuous?: boolean;
  /** Mostrar resultados intermediários enquanto fala (default: true) */
  interimResults?: boolean;
  /** Idioma para reconhecimento (default: 'pt-BR') */
  lang?: string;
  /** Callback de erro */
  onError?: (error: string) => void;
  /** Callback quando inicia gravação */
  onStart?: () => void;
  /** Callback quando para gravação */
  onEnd?: () => void;
}

export interface UseVoiceToTextReturn {
  /** Se está gravando no momento */
  isRecording: boolean;
  /** Se o browser suporta Web Speech API */
  isSupported: boolean;
  /** Texto transcrito intermediário (enquanto fala) */
  interimTranscript: string;
  /** Iniciar gravação */
  start: () => void;
  /** Parar gravação */
  stop: () => void;
  /** Alternar gravação (start/stop) */
  toggle: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────────────────────────────────────

export const useVoiceToText = ({
  onTranscript,
  continuous = true,
  interimResults = true,
  lang = 'pt-BR',
  onError,
  onStart,
  onEnd
}: UseVoiceToTextOptions): UseVoiceToTextReturn => {
  // ─── Estado ───
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');

  // ─── Refs ───
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isStoppingRef = useRef(false); // Evita restart automático ao parar manualmente
  const onTranscriptRef = useRef(onTranscript);

  // Manter ref sempre atualizada para evitar stale closures no SpeechRecognition
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  // ─── Detectar suporte (apenas uma vez) ───
  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognitionAPI);
  }, []);

  // ─── Cleanup ao desmontar ───
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
    };
  }, []);

  // ─── Criar instância SpeechRecognition (lazy) ───
  const createRecognition = useCallback((): SpeechRecognition | null => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return null;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.lang = lang;

    // Handler de resultado
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interim = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;

        if (result.isFinal) {
          finalTranscript += transcript;
        } else {
          interim += transcript;
        }
      }

      // Atualizar interim transcript para feedback visual
      setInterimTranscript(interim);

      // Enviar resultado final (usa ref para evitar stale closure)
      if (finalTranscript) {
        onTranscriptRef.current(finalTranscript, true);
        setInterimTranscript('');
      } else if (interim && interimResults) {
        // Enviar interim para preview (opcional)
        onTranscriptRef.current(interim, false);
      }
    };

    // Handler de erro
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('[VoiceToText] Error:', event.error);

      const errorMessages: Record<string, string> = {
        'not-allowed': 'Permissão de microfone negada. Permita o acesso ao microfone nas configurações do navegador.',
        'no-speech': 'Nenhuma fala detectada. Tente novamente.',
        'audio-capture': 'Microfone não encontrado. Verifique se está conectado.',
        'network': 'Erro de rede. Verifique sua conexão.',
        'aborted': 'Reconhecimento cancelado.',
        'service-not-allowed': 'Serviço de reconhecimento não permitido.'
      };

      const message = errorMessages[event.error] || `Erro: ${event.error}`;
      onError?.(message);

      // Não resetar estado se foi abort manual
      if (event.error !== 'aborted') {
        setIsRecording(false);
        setInterimTranscript('');
      }
    };

    // Handler de fim
    recognition.onend = () => {
      // Se continuous e não foi stop manual, reiniciar
      if (continuous && !isStoppingRef.current && isRecording) {
        try {
          recognition.start();
        } catch (e) {
          // Ignorar erro se já parou
        }
      } else {
        setIsRecording(false);
        setInterimTranscript('');
        onEnd?.();
      }
    };

    // Handler de início
    recognition.onstart = () => {
      setIsRecording(true);
      onStart?.();
    };

    return recognition;
  }, [continuous, interimResults, lang, onError, onStart, onEnd, isRecording]);

  // ─── Iniciar gravação ───
  const start = useCallback(() => {
    if (!isSupported) {
      onError?.('Seu navegador não suporta reconhecimento de voz. Use Chrome, Edge ou Safari.');
      return;
    }

    if (isRecording) return;

    isStoppingRef.current = false;

    // Lazy init: criar recognition apenas no primeiro uso
    if (!recognitionRef.current) {
      recognitionRef.current = createRecognition();
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error('[VoiceToText] Start error:', e);
        onError?.('Erro ao iniciar reconhecimento de voz.');
      }
    }
  }, [isSupported, isRecording, createRecognition, onError]);

  // ─── Parar gravação ───
  const stop = useCallback(() => {
    isStoppingRef.current = true;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignorar erro se já parou
      }
    }

    setIsRecording(false);
    setInterimTranscript('');
  }, []);

  // ─── Toggle ───
  const toggle = useCallback(() => {
    if (isRecording) {
      stop();
    } else {
      start();
    }
  }, [isRecording, start, stop]);

  return {
    isRecording,
    isSupported,
    interimTranscript,
    start,
    stop,
    toggle
  };
};

export default useVoiceToText;
