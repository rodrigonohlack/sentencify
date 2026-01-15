/**
 * @file DownloadModals.tsx
 * @description Modais para download de dados e embeddings
 * @version 1.37.51
 *
 * Extraído do App.tsx como parte da extração de modais.
 * Contém dois modais relacionados:
 * - DataDownloadModal: Download de legislação e jurisprudência
 * - EmbeddingsDownloadModal: Download de embeddings para busca semântica
 */

import React from 'react';
import { Download, RefreshCw, Check } from 'lucide-react';
import { BaseModal } from './BaseModal';

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

interface DownloadStatus {
  needed: boolean | null;
  downloading: boolean;
  progress: number;
  completed?: boolean;
  error?: string | null;
}

interface DownloadStatusState {
  legislacao: DownloadStatus;
  jurisprudencia: DownloadStatus;
}

interface DataDownloadModalProps {
  isOpen: boolean;
  onDismiss: () => void;
  onStartDownload: () => void;
  status: DownloadStatusState;
}

interface EmbeddingsDownloadModalProps {
  isOpen: boolean;
  onDismiss: () => void;
  onStartDownload: () => void;
  status: DownloadStatusState;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE DE PROGRESSO REUTILIZÁVEL
// ═══════════════════════════════════════════════════════════════════════════════

interface DownloadProgressItemProps {
  label: string;
  icon: string;
  status: DownloadStatus;
  progressColor: string;
}

const DownloadProgressItem: React.FC<DownloadProgressItemProps> = ({
  label,
  icon,
  status,
  progressColor
}) => {
  if (!status.needed) return null;

  return (
    <div className="p-3 rounded-lg theme-bg-secondary border theme-border-input">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium theme-text-primary">{icon} {label}</span>
        {status.downloading && (
          <span className="text-xs theme-text-muted">
            {Math.round(status.progress * 100)}%
          </span>
        )}
        {status.completed && (
          <span className="text-xs text-green-500">✓ Concluído</span>
        )}
      </div>
      {status.downloading && (
        <div className="h-2 bg-gray-600 rounded-full overflow-hidden">
          <div
            className={`h-full ${progressColor} transition-all duration-300`}
            style={{ width: `${status.progress * 100}%` }}
          />
        </div>
      )}
      {status.error && (
        <p className="text-xs text-red-400 mt-1">{status.error}</p>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// DATA DOWNLOAD MODAL
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * DataDownloadModal - Modal de download de dados essenciais
 *
 * Baixa legislação (~3 MB) e jurisprudência (~2 MB) para uso offline.
 */
export const DataDownloadModal: React.FC<DataDownloadModalProps> = ({
  isOpen,
  onDismiss,
  onStartDownload,
  status
}) => {
  const isDownloading = status.legislacao.downloading || status.jurisprudencia.downloading;
  const nothingNeeded = !status.legislacao.needed && !status.jurisprudencia.needed;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onDismiss}
      title="Baixar Base de Dados"
      icon={<Download />}
      iconColor="blue"
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <button
            onClick={onDismiss}
            disabled={isDownloading}
            className="px-4 py-2 text-sm theme-text-secondary hover:theme-text-primary disabled:opacity-50"
          >
            Depois
          </button>
          <button
            onClick={onStartDownload}
            disabled={isDownloading || nothingNeeded}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {isDownloading ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> Baixando...</>
            ) : (
              <><Download className="w-4 h-4" /> Baixar Agora</>
            )}
          </button>
        </div>
      }
    >
      <div className="p-4 space-y-4">
        <p className="text-sm theme-text-secondary">
          Para usar o Sentencify, é necessário baixar a base de dados de legislação e jurisprudência (~5 MB total, download único e rápido).
        </p>

        <DownloadProgressItem
          label="Legislação (~3 MB)"
          icon="📜"
          status={status.legislacao}
          progressColor="bg-blue-500"
        />

        <DownloadProgressItem
          label="Jurisprudência (~2 MB)"
          icon="⚖️"
          status={status.jurisprudencia}
          progressColor="bg-green-500"
        />

        {/* Mensagem se ambos já foram baixados */}
        {nothingNeeded && (
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
            <p className="text-sm text-green-400 flex items-center gap-2">
              <Check className="w-4 h-4" /> Base de dados instalada!
            </p>
          </div>
        )}
      </div>
    </BaseModal>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// EMBEDDINGS DOWNLOAD MODAL
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * EmbeddingsDownloadModal - Modal de download de embeddings
 *
 * Baixa embeddings de legislação (~211 MB) e jurisprudência (~38 MB)
 * para habilitar busca semântica offline.
 */
export const EmbeddingsDownloadModal: React.FC<EmbeddingsDownloadModalProps> = ({
  isOpen,
  onDismiss,
  onStartDownload,
  status
}) => {
  const isDownloading = status.legislacao.downloading || status.jurisprudencia.downloading;
  const nothingNeeded = !status.legislacao.needed && !status.jurisprudencia.needed;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onDismiss}
      title="Baixar Dados para Busca Semântica"
      icon={<Download />}
      iconColor="blue"
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <button
            onClick={onDismiss}
            disabled={isDownloading}
            className="px-4 py-2 text-sm theme-text-secondary hover:theme-text-primary disabled:opacity-50"
          >
            Depois
          </button>
          <button
            onClick={onStartDownload}
            disabled={isDownloading || nothingNeeded}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {isDownloading ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> Baixando...</>
            ) : (
              <><Download className="w-4 h-4" /> Baixar Agora</>
            )}
          </button>
        </div>
      }
    >
      <div className="p-4 space-y-4">
        <p className="text-sm theme-text-secondary">
          Para usar a busca semântica de legislação e jurisprudência, é necessário baixar os dados de embeddings (~250 MB total, download único).
        </p>

        <DownloadProgressItem
          label="Legislação (~211 MB)"
          icon="📜"
          status={status.legislacao}
          progressColor="bg-blue-500"
        />

        <DownloadProgressItem
          label="Jurisprudência (~38 MB)"
          icon="📚"
          status={status.jurisprudencia}
          progressColor="bg-green-500"
        />

        {/* Mensagem se ambos já foram baixados */}
        {nothingNeeded && (
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
            <p className="text-sm text-green-400 flex items-center gap-2">
              <Check className="w-4 h-4" /> Todos os embeddings já estão instalados!
            </p>
          </div>
        )}
      </div>
    </BaseModal>
  );
};

export default { DataDownloadModal, EmbeddingsDownloadModal };
