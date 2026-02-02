/**
 * @file StreamingModal.tsx
 * @description Modal que exibe progresso da análise de prova oral em 3 fases
 * Visual moderno com cards por fase, status individual e contador de caracteres
 */

import React, { useEffect, useState } from 'react';
import { Loader2, CheckCircle, XCircle, Circle, Search } from 'lucide-react';
import { BaseModal } from '../../../components/modals/BaseModal';
import type { PhaseStatus } from '../stores/useProvaOralStore';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface PhaseInfo {
  status: PhaseStatus;
  charCount: number;
  errorMessage?: string;
}

interface StreamingModalProps {
  /** Se o modal está aberto */
  isOpen: boolean;
  /** Estado de cada fase */
  phases: {
    phase1: PhaseInfo;
    phase2: PhaseInfo;
    phase3: PhaseInfo;
  };
  /** Se todas as fases foram concluídas */
  isComplete: boolean;
  /** Callback para fechar/cancelar */
  onClose?: () => void;
  /** Nome do provedor sendo usado */
  providerName?: string;
  /** Timestamp de início para calcular tempo decorrido */
  startTime?: number | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const PHASE_TITLES = {
  phase1: 'Transcrição Exaustiva',
  phase2: 'Classificação Jurídica',
  phase3: 'Análise Probatória',
} as const;

const STATUS_CONFIG: Record<PhaseStatus, {
  text: string;
  colorClass: string;
  iconColorClass: string;
  bgClass: string;
  borderClass: string;
}> = {
  pending: {
    text: 'Aguardando...',
    colorClass: 'text-gray-500 dark:text-gray-400',
    iconColorClass: 'text-gray-400 dark:text-gray-500',
    bgClass: 'bg-gray-50 dark:bg-gray-800/50',
    borderClass: 'border-gray-200 dark:border-gray-700',
  },
  connecting: {
    text: 'Iniciando conexão...',
    colorClass: 'text-blue-600 dark:text-blue-400',
    iconColorClass: 'text-blue-500 dark:text-blue-400',
    bgClass: 'bg-blue-50 dark:bg-blue-900/20',
    borderClass: 'border-blue-200 dark:border-blue-800',
  },
  streaming: {
    text: 'Processando...',
    colorClass: 'text-indigo-600 dark:text-indigo-400',
    iconColorClass: 'text-indigo-500 dark:text-indigo-400',
    bgClass: 'bg-indigo-50 dark:bg-indigo-900/20',
    borderClass: 'border-indigo-200 dark:border-indigo-800',
  },
  completed: {
    text: 'Concluído',
    colorClass: 'text-emerald-600 dark:text-emerald-400',
    iconColorClass: 'text-emerald-500 dark:text-emerald-400',
    bgClass: 'bg-emerald-50 dark:bg-emerald-900/20',
    borderClass: 'border-emerald-200 dark:border-emerald-800',
  },
  error: {
    text: 'Erro',
    colorClass: 'text-red-600 dark:text-red-400',
    iconColorClass: 'text-red-500 dark:text-red-400',
    bgClass: 'bg-red-50 dark:bg-red-900/20',
    borderClass: 'border-red-200 dark:border-red-800',
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ícone da fase baseado no status
 */
const PhaseIcon: React.FC<{ status: PhaseStatus; className?: string }> = ({ status, className = '' }) => {
  const baseClass = `w-5 h-5 ${className}`;

  switch (status) {
    case 'pending':
      return <Circle className={baseClass} />;
    case 'connecting':
    case 'streaming':
      return <Loader2 className={`${baseClass} animate-spin`} />;
    case 'completed':
      return <CheckCircle className={baseClass} />;
    case 'error':
      return <XCircle className={baseClass} />;
    default:
      return <Circle className={baseClass} />;
  }
};

/**
 * Barra de progresso animada para fase em streaming
 */
const StreamingProgressBar: React.FC = () => {
  return (
    <div className="mt-3 h-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-full overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full animate-pulse"
        style={{
          width: '100%',
          animation: 'indeterminate 1.5s ease-in-out infinite',
        }}
      />
      <style>{`
        @keyframes indeterminate {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

/**
 * Card individual de fase
 */
const PhaseCard: React.FC<{
  number: 1 | 2 | 3;
  title: string;
  status: PhaseStatus;
  charCount: number;
  errorMessage?: string;
}> = ({ number, title, status, charCount, errorMessage }) => {
  const config = STATUS_CONFIG[status];

  return (
    <div
      className={`p-4 rounded-xl border transition-all duration-300 ${config.bgClass} ${config.borderClass}`}
    >
      <div className="flex items-start gap-3">
        <PhaseIcon status={status} className={config.iconColorClass} />
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 dark:text-gray-100">
            Fase {number} - {title}
          </h4>
          <p className={`text-sm mt-0.5 ${config.colorClass}`}>
            {status === 'error' && errorMessage ? (
              <span>{errorMessage}</span>
            ) : (
              <>
                {config.text}
                {charCount > 0 && (
                  <span className="ml-1.5">
                    • {charCount.toLocaleString('pt-BR')} caracteres
                  </span>
                )}
              </>
            )}
          </p>
        </div>
      </div>
      {status === 'streaming' && <StreamingProgressBar />}
    </div>
  );
};

/**
 * Formata tempo decorrido em formato legível
 */
function formatElapsedTime(startTime: number | null | undefined): string {
  if (!startTime) return '0s';

  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

/**
 * Calcula progresso total baseado no estado das fases
 */
function calculateTotalProgress(phases: StreamingModalProps['phases']): number {
  const phaseWeights = { phase1: 35, phase2: 35, phase3: 30 };
  let total = 0;

  for (const [key, phase] of Object.entries(phases)) {
    const weight = phaseWeights[key as keyof typeof phaseWeights];
    if (phase.status === 'completed') {
      total += weight;
    } else if (phase.status === 'streaming') {
      total += weight * 0.5; // 50% quando em streaming
    } else if (phase.status === 'connecting') {
      total += weight * 0.1; // 10% quando conectando
    }
  }

  return Math.round(total);
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export const StreamingModal: React.FC<StreamingModalProps> = ({
  isOpen,
  phases,
  isComplete,
  onClose,
  providerName = 'IA',
  startTime,
}) => {
  const [elapsedTime, setElapsedTime] = useState('0s');

  // Atualizar tempo decorrido a cada segundo
  useEffect(() => {
    if (!isOpen || !startTime) return;

    const updateTime = () => {
      setElapsedTime(formatElapsedTime(startTime));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, [isOpen, startTime]);

  const totalProgress = calculateTotalProgress(phases);
  const totalCharCount =
    phases.phase1.charCount + phases.phase2.charCount + phases.phase3.charCount;

  const hasError =
    phases.phase1.status === 'error' ||
    phases.phase2.status === 'error' ||
    phases.phase3.status === 'error';

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose || (() => {})}
      title="Analisando Prova Oral"
      subtitle={`Processando em 3 fases com ${providerName}`}
      icon={<Search />}
      iconColor="purple"
      size="md"
      preventClose={!isComplete && !hasError}
    >
      {/* Cards das fases */}
      <div className="space-y-3">
        <PhaseCard
          number={1}
          title={PHASE_TITLES.phase1}
          status={phases.phase1.status}
          charCount={phases.phase1.charCount}
          errorMessage={phases.phase1.errorMessage}
        />
        <PhaseCard
          number={2}
          title={PHASE_TITLES.phase2}
          status={phases.phase2.status}
          charCount={phases.phase2.charCount}
          errorMessage={phases.phase2.errorMessage}
        />
        <PhaseCard
          number={3}
          title={PHASE_TITLES.phase3}
          status={phases.phase3.status}
          charCount={phases.phase3.charCount}
          errorMessage={phases.phase3.errorMessage}
        />
      </div>

      {/* Separador e progresso total */}
      <div className="mt-5 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">
            Progresso total: <span className="font-medium">{totalProgress}%</span>
            {totalCharCount > 0 && (
              <span className="ml-2 text-gray-400 dark:text-gray-500">
                • {totalCharCount.toLocaleString('pt-BR')} caracteres
              </span>
            )}
          </span>
          <span className="text-gray-500 dark:text-gray-400">
            Tempo: <span className="font-medium">{elapsedTime}</span>
          </span>
        </div>

        {/* Barra de progresso geral */}
        <div className="mt-3 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500"
            style={{ width: `${totalProgress}%` }}
          />
        </div>
      </div>

      {/* Aviso sobre não fechar */}
      {!isComplete && !hasError && (
        <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <p className="text-xs text-amber-600 dark:text-amber-400 text-center">
            Aguarde a conclusão da análise. Fechar esta janela pode interromper o processamento.
          </p>
        </div>
      )}

      {/* Mensagem de erro */}
      {hasError && (
        <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-xs text-red-600 dark:text-red-400 text-center">
            Ocorreu um erro durante a análise. Você pode fechar e tentar novamente.
          </p>
        </div>
      )}

      {/* Botão de fechar quando completo ou com erro */}
      {(isComplete || hasError) && onClose && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-xl font-medium text-sm shadow-lg transition-all ${
              hasError
                ? 'bg-gray-600 hover:bg-gray-500 text-white'
                : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-500/25'
            }`}
          >
            {hasError ? 'Fechar' : 'Fechar e Ver Resultado'}
          </button>
        </div>
      )}
    </BaseModal>
  );
};

export default StreamingModal;
