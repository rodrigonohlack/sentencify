/**
 * @file MediaProofCard.tsx
 * @description Card de prova em áudio/vídeo (Gemini-only). v1.43.00
 *
 * Renderiza player nativo + status do upload/cache + lista de análises.
 * Reutiliza ações do useProofManager existente para análises e exclusão.
 */

import React from 'react';
import {
  FileAudio,
  FileVideo,
  Trash2,
  Sparkles,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Clock,
  Edit2,
  X,
  Save,
} from 'lucide-react';
import type { ProofMedia, ProofAnalysisResult } from '../../types';
import { TimestampedText } from '../../utils/gemini-timestamp-renderer';

interface MediaProofCardProps {
  proof: ProofMedia;
  proofManager: {
    handleDeleteProof: (proof: ProofMedia) => void | Promise<void>;
    setProofToAnalyze: (proof: ProofMedia | null) => void;
    proofAnalysisResults: Record<string, ProofAnalysisResult[]>;
    removeProofAnalysis: (proofId: string, analysisId: string) => void;
    updateProofAnalysis: (proofId: string, analysisId: string, newResult: string) => void;
    isAnalyzingProof: (id: string | number) => boolean;
  };
  providerIsGemini: boolean;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatDuration(s?: number): string {
  if (!s) return '';
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

const STATUS_CONFIG: Record<ProofMedia['status'], { label: string; icon: React.FC<{ className?: string }>; color: string }> = {
  uploading: { label: 'Enviando…', icon: Loader2, color: 'text-blue-600 dark:text-blue-400' },
  processing: { label: 'Processando no Gemini…', icon: Loader2, color: 'text-amber-600 dark:text-amber-400' },
  ready: { label: 'Pronto', icon: CheckCircle2, color: 'text-green-600 dark:text-green-400' },
  failed: { label: 'Falhou', icon: AlertCircle, color: 'text-red-600 dark:text-red-400' },
  expired: { label: 'Expirado', icon: Clock, color: 'text-slate-500 dark:text-slate-400' },
};

export const MediaProofCard: React.FC<MediaProofCardProps> = ({ proof, proofManager, providerIsGemini }) => {
  const playerRef = React.useRef<HTMLMediaElement>(null);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editText, setEditText] = React.useState('');

  const analyses = proofManager.proofAnalysisResults[proof.id] || [];
  const status = STATUS_CONFIG[proof.status];
  const StatusIcon = status.icon;
  const isProcessing = proof.status === 'uploading' || proof.status === 'processing';
  const isReady = proof.status === 'ready';
  const isAnalyzing = proofManager.isAnalyzingProof(proof.id);

  const seekTo = React.useCallback((seconds: number) => {
    if (playerRef.current) {
      playerRef.current.currentTime = seconds;
      playerRef.current.play().catch(() => { /* user gesture pendente */ });
    }
  }, []);

  const startEdit = (a: ProofAnalysisResult) => {
    setEditingId(a.id);
    setEditText(a.result);
  };
  const saveEdit = () => {
    if (editingId) {
      proofManager.updateProofAnalysis(proof.id, editingId, editText);
      setEditingId(null);
    }
  };
  const cancelEdit = () => setEditingId(null);

  return (
    <div className="border theme-border-secondary rounded-lg p-4 theme-bg-card space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {proof.type === 'audio'
            ? <FileAudio className="w-6 h-6 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
            : <FileVideo className="w-6 h-6 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />}
          <div className="min-w-0 flex-1">
            <h4 className="font-medium theme-text-secondary truncate" title={proof.name}>{proof.name}</h4>
            <div className="flex items-center gap-2 mt-1 text-xs theme-text-muted flex-wrap">
              <span className="px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 uppercase">
                {proof.type}
              </span>
              <span>{formatBytes(proof.size)}</span>
              {proof.durationSeconds && <span>{formatDuration(proof.durationSeconds)}</span>}
              <span className={`flex items-center gap-1 ${status.color}`}>
                <StatusIcon className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                {status.label}
              </span>
            </div>
            {proof.errorMessage && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">{proof.errorMessage}</p>
            )}
          </div>
        </div>
        <button
          onClick={() => proofManager.handleDeleteProof(proof)}
          className="p-2 rounded hover:bg-red-100 dark:hover:bg-red-500/10 text-red-600 dark:text-red-400"
          title="Excluir prova"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Player */}
      {proof.objectUrl && (
        proof.type === 'audio'
          ? <audio ref={playerRef as React.RefObject<HTMLAudioElement>} src={proof.objectUrl} controls className="w-full" />
          : <video ref={playerRef as React.RefObject<HTMLVideoElement>} src={proof.objectUrl} controls className="w-full max-h-72 rounded bg-black" />
      )}
      {!proof.objectUrl && proof.status !== 'expired' && (
        <div className="text-xs theme-text-muted italic px-2 py-3 text-center bg-slate-100 dark:bg-slate-900/30 rounded border border-dashed theme-border-input">
          Player indisponível após reload — envie o arquivo novamente para reproduzir.
        </div>
      )}

      {/* Gating: provider precisa ser gemini para analisar */}
      {!providerIsGemini && (
        <div className="text-xs px-2 py-2 rounded bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-500/30 text-amber-800 dark:text-amber-300 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          Análise de áudio/vídeo só está disponível com o provider Gemini selecionado.
        </div>
      )}

      {/* Cache info */}
      {isReady && proof.cacheExpiresAt && (
        <div className="text-xs theme-text-muted flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          Cache válido até {new Date(proof.cacheExpiresAt).toLocaleTimeString()}
        </div>
      )}

      {/* Botão de análise */}
      {isReady && providerIsGemini && (
        <button
          onClick={() => proofManager.setProofToAnalyze(proof)}
          disabled={isAnalyzing}
          className="w-full py-2 px-3 rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-50
            text-white text-sm flex items-center justify-center gap-2"
        >
          {isAnalyzing
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Analisando…</>
            : <><Sparkles className="w-4 h-4" /> Analisar com IA</>}
        </button>
      )}

      {/* Análises */}
      {analyses.length > 0 && (
        <div className="space-y-2 pt-2 border-t theme-border-secondary">
          <h5 className="text-xs font-semibold theme-text-tertiary uppercase tracking-wide">
            Análises ({analyses.length})
          </h5>
          {analyses.map((a) => (
            <div key={a.id} className="rounded border theme-border-input p-2 bg-slate-50 dark:bg-slate-900/20">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs theme-text-muted">
                  {a.type} · {new Date(a.timestamp).toLocaleString()}
                </span>
                <div className="flex items-center gap-1">
                  {editingId === a.id ? (
                    <>
                      <button onClick={saveEdit} className="p-1 rounded hover:bg-green-100 dark:hover:bg-green-500/10 text-green-600 dark:text-green-400" title="Salvar">
                        <Save className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={cancelEdit} className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-500/10 theme-text-muted" title="Cancelar">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => startEdit(a)} className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-500/10 text-blue-600 dark:text-blue-400" title="Editar">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => proofManager.removeProofAnalysis(proof.id, a.id)}
                        className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-500/10 text-red-600 dark:text-red-400"
                        title="Remover"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
              {editingId === a.id ? (
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full p-2 text-sm rounded theme-bg-input theme-text-primary border theme-border-input"
                  rows={6}
                />
              ) : (
                <div className="text-sm theme-text-secondary whitespace-pre-wrap">
                  <TimestampedText text={a.result} onSeek={seekTo} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MediaProofCard;
