/**
 * @file StreamingModal.tsx
 * @description Modal que exibe resposta da IA chegando em tempo real
 * Evita percepção de timeout mostrando progresso visual
 */

import React, { useRef, useEffect } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { BaseModal } from '../../../components/modals/BaseModal';

interface StreamingModalProps {
  /** Se o modal está aberto */
  isOpen: boolean;
  /** Texto atual sendo recebido */
  text: string;
  /** Se o streaming terminou */
  isComplete: boolean;
  /** Callback para fechar/cancelar */
  onClose?: () => void;
  /** Nome do provedor sendo usado */
  providerName?: string;
}

export const StreamingModal: React.FC<StreamingModalProps> = ({
  isOpen,
  text,
  isComplete,
  onClose,
  providerName = 'IA'
}) => {
  const contentRef = useRef<HTMLDivElement>(null);

  // Auto-scroll para o final conforme texto chega
  useEffect(() => {
    if (contentRef.current && text) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [text]);

  // Contar caracteres recebidos
  const charCount = text.length;
  const lineCount = text.split('\n').length;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose || (() => {})}
      title="Analisando Prova Oral"
      subtitle={`Recebendo resposta de ${providerName}`}
      icon={<Sparkles />}
      iconColor="purple"
      size="lg"
      preventClose={!isComplete}
    >
      {/* Area de texto com scroll */}
      <div
        ref={contentRef}
        className="h-96 overflow-auto theme-bg-secondary rounded-xl p-4 font-mono text-xs leading-relaxed border theme-border-modal"
      >
        {text ? (
          <pre className="whitespace-pre-wrap theme-text-secondary break-words">
            {text}
            {/* Cursor pulsante enquanto streaming */}
            {!isComplete && (
              <span className="inline-block w-2 h-4 ml-0.5 bg-purple-500 animate-pulse rounded-sm" />
            )}
          </pre>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-purple-500 animate-spin mx-auto mb-3" />
              <p className="text-sm theme-text-muted">Iniciando conexão...</p>
            </div>
          </div>
        )}
      </div>

      {/* Barra de status */}
      <div className="flex items-center justify-between mt-4 px-1">
        <div className="flex items-center gap-4 text-xs theme-text-muted">
          <span>{charCount.toLocaleString()} caracteres</span>
          <span>{lineCount} linhas</span>
        </div>

        {!isComplete ? (
          <div className="flex items-center gap-2 text-xs text-purple-500 dark:text-purple-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Recebendo resposta...</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-emerald-500 dark:text-emerald-400">
            <span>Concluído!</span>
          </div>
        )}
      </div>

      {/* Aviso sobre nao fechar */}
      {!isComplete && (
        <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <p className="text-xs text-amber-600 dark:text-amber-400 text-center">
            Aguarde a conclusão da análise. Fechar esta janela pode interromper o processamento.
          </p>
        </div>
      )}

      {/* Botao de fechar quando completo */}
      {isComplete && onClose && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl font-medium bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-sm shadow-lg shadow-purple-500/25 transition-all"
          >
            Fechar e Ver Resultado
          </button>
        </div>
      )}
    </BaseModal>
  );
};

export default StreamingModal;
