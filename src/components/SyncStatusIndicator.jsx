/**
 * SyncStatusIndicator - Indicador de Status de Sincronização
 * v1.35.49
 *
 * Badge compacto que mostra o status atual de sync:
 * - idle (verde): sincronizado
 * - syncing (azul): sincronizando
 * - error (vermelho): erro de sync
 * - offline (cinza): sem conexão
 * - pending (amarelo): mudanças pendentes
 */

import React from 'react';
import { Cloud, CloudOff, RefreshCw, AlertCircle, Check } from 'lucide-react';

const SyncStatusIndicator = ({
  status = 'idle',
  pendingCount = 0,
  lastSyncAt = null,
  onSync,
  className = '',
}) => {
  const formatTime = (iso) => {
    if (!iso) return 'Nunca';
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins}min atrás`;

    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  // v1.35.49: Configuração visual por status (textos mais descritivos)
  const statusConfig = {
    idle: {
      icon: pendingCount > 0 ? RefreshCw : Check,
      iconClass: pendingCount > 0 ? 'text-yellow-400' : 'text-green-400',
      bgClass: pendingCount > 0 ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-green-500/10 border-green-500/30',
      label: pendingCount > 0
        ? `${pendingCount} modelo${pendingCount > 1 ? 's' : ''} pendente${pendingCount > 1 ? 's' : ''}`
        : 'Modelos sincronizados',
      labelClass: pendingCount > 0 ? 'text-yellow-400' : 'text-green-400',
    },
    syncing: {
      icon: RefreshCw,
      iconClass: 'text-blue-400 animate-spin',
      bgClass: 'bg-blue-500/10 border-blue-500/30',
      label: 'Sincronizando...',
      labelClass: 'text-blue-400',
    },
    error: {
      icon: AlertCircle,
      iconClass: 'text-red-400',
      bgClass: 'bg-red-500/10 border-red-500/30',
      label: 'Erro de sync',
      labelClass: 'text-red-400',
    },
    offline: {
      icon: CloudOff,
      iconClass: 'text-slate-500',
      bgClass: 'bg-slate-500/10 border-slate-500/30',
      label: 'Offline',
      labelClass: 'text-slate-500',
    },
  };

  const config = statusConfig[status] || statusConfig.idle;
  const Icon = config.icon;
  const canSync = status !== 'syncing' && status !== 'offline' && onSync;

  return (
    <button
      onClick={canSync ? onSync : undefined}
      disabled={!canSync}
      title={`Biblioteca de modelos\nÚltimo sync: ${formatTime(lastSyncAt)}${canSync ? '\nClique para sincronizar' : ''}`}
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-lg border
        transition-all duration-200
        ${config.bgClass}
        ${canSync ? 'hover:bg-opacity-20 cursor-pointer' : 'cursor-default'}
        ${className}
      `}
    >
      <Icon className={`w-4 h-4 ${config.iconClass}`} />
      <span className={`text-xs font-medium ${config.labelClass}`}>
        {config.label}
      </span>
    </button>
  );
};

/**
 * Versão compacta (apenas ícone)
 */
export const SyncStatusIcon = ({
  status = 'idle',
  pendingCount = 0,
  onSync,
  className = '',
}) => {
  const icons = {
    idle: pendingCount > 0 ? RefreshCw : Cloud,
    syncing: RefreshCw,
    error: AlertCircle,
    offline: CloudOff,
  };

  const colors = {
    idle: pendingCount > 0 ? 'text-yellow-400' : 'text-green-400',
    syncing: 'text-blue-400',
    error: 'text-red-400',
    offline: 'text-slate-500',
  };

  const Icon = icons[status] || Cloud;
  const colorClass = colors[status] || 'text-slate-400';
  const canSync = status !== 'syncing' && status !== 'offline' && onSync;

  return (
    <button
      onClick={canSync ? onSync : undefined}
      disabled={!canSync}
      className={`
        p-2 rounded-lg transition-all
        ${canSync ? 'hover:bg-slate-700/50 cursor-pointer' : 'cursor-default'}
        ${className}
      `}
    >
      <Icon
        className={`
          w-5 h-5
          ${colorClass}
          ${status === 'syncing' ? 'animate-spin' : ''}
        `}
      />
      {pendingCount > 0 && status === 'idle' && (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 text-black text-[10px] font-bold rounded-full flex items-center justify-center">
          {pendingCount > 9 ? '9+' : pendingCount}
        </span>
      )}
    </button>
  );
};

export default SyncStatusIndicator;
