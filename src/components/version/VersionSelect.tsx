/**
 * @file VersionSelect.tsx
 * @description Botão compacto com dropdown de versões
 * @version 1.36.83
 */

import React from 'react';
import type { FieldVersion } from '../../types';
import { VersionCompareModal } from './VersionCompareModal';

export interface VersionSelectProps {
  topicTitle: string;
  versioning: { getVersions: (title: string) => Promise<FieldVersion[]> } | null;
  currentContent: string;
  onRestore: (content: string) => void;
  className?: string;
}

export const VersionSelect = React.memo(({
  topicTitle,
  versioning,
  currentContent,
  onRestore,
  className = ''
}: VersionSelectProps) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [versions, setVersions] = React.useState<FieldVersion[]>([]);
  const [compareVersion, setCompareVersion] = React.useState<FieldVersion | null>(null);
  const dropdownRef = React.useRef<HTMLDivElement | null>(null);

  const loadVersions = React.useCallback(async () => {
    if (!versioning || !topicTitle) return;
    const v = await versioning.getVersions(topicTitle);
    setVersions(v);
  }, [versioning, topicTitle]);

  // Carregar versões ao montar e quando topicTitle mudar
  React.useEffect(() => { loadVersions(); }, [loadVersions]);

  const formatTime = (ts: number) => {
    const diff = Math.floor((Date.now() - ts) / 60000);
    if (diff < 60) return `${diff}min`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h`;
    return `${Math.floor(diff / 1440)}d`;
  };

  const handleToggle = async () => {
    if (!isOpen) await loadVersions();
    setIsOpen(!isOpen);
  };

  const handleVersionClick = (version: FieldVersion) => {
    setCompareVersion(version);
    setIsOpen(false);
  };

  const handleRestore = () => {
    if (compareVersion && onRestore) {
      onRestore(compareVersion.content);
      setCompareVersion(null);
      loadVersions();
    }
  };

  // Fechar ao clicar fora
  React.useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  if (!versioning || !topicTitle) return null;

  return (
    <>
      <div ref={dropdownRef} className={`relative inline-block ${className}`}>
        <button
          onClick={handleToggle}
          className="px-2 py-1 text-xs border rounded theme-bg-secondary theme-text-primary theme-border-input cursor-pointer hover-slate-600 focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all"
          title="Histórico de versões"
        >
          📜 {versions.length > 0 ? `(${versions.length})` : ''}
        </button>
        {isOpen && versions.length > 0 && (
          <div className="absolute right-0 mt-1 z-50 min-w-32 max-h-48 overflow-y-auto rounded border theme-border-input theme-bg-secondary shadow-lg">
            {versions.map(v => (
              <div
                key={v.id}
                onClick={() => handleVersionClick(v)}
                title={v.preview}
                className="px-3 py-2 text-xs cursor-pointer theme-text-primary hover-slate-600 border-b theme-border-input last:border-b-0"
              >
                🕐 {formatTime(v.timestamp)} atrás
              </div>
            ))}
          </div>
        )}
        {isOpen && versions.length === 0 && (
          <div className="absolute right-0 mt-1 z-50 px-3 py-2 text-xs rounded border theme-border-input theme-bg-secondary theme-text-muted">
            Sem versões salvas
          </div>
        )}
      </div>
      {compareVersion && (
        <VersionCompareModal
          oldContent={compareVersion.content}
          newContent={currentContent}
          timestamp={compareVersion.timestamp}
          onRestore={handleRestore}
          onClose={() => setCompareVersion(null)}
        />
      )}
    </>
  );
});

VersionSelect.displayName = 'VersionSelect';
