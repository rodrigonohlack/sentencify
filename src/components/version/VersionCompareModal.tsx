/**
 * @file VersionCompareModal.tsx
 * @description Modal de comparação de versões com diff visual
 * @version 1.36.83
 */

import React from 'react';

export interface VersionCompareModalProps {
  oldContent: string;
  newContent: string;
  timestamp: number;
  onRestore: () => void;
  onClose: () => void;
}

interface DiffItem {
  type: 'same' | 'added' | 'removed';
  text: string;
}

export const VersionCompareModal = React.memo(({
  oldContent,
  newContent,
  timestamp,
  onRestore,
  onClose
}: VersionCompareModalProps) => {
  const stripHtml = (html: string) => (html || '').replace(/<[^>]*>/g, '');
  const oldText = stripHtml(oldContent);
  const newText = stripHtml(newContent);

  const formatTimeAgo = (ts: number) => {
    const diff = Math.floor((Date.now() - ts) / 60000);
    if (diff < 60) return `${diff} minuto${diff !== 1 ? 's' : ''}`;
    if (diff < 1440) return `${Math.floor(diff / 60)} hora${Math.floor(diff / 60) !== 1 ? 's' : ''}`;
    return `${Math.floor(diff / 1440)} dia${Math.floor(diff / 1440) !== 1 ? 's' : ''}`;
  };

  // Algoritmo LCS para diff por palavras
  const computeDiff = React.useMemo((): DiffItem[] => {
    const oldWords = oldText.split(/(\s+)/);
    const newWords = newText.split(/(\s+)/);
    const m = oldWords.length, n = newWords.length;
    const lcs = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        lcs[i][j] = oldWords[i-1] === newWords[j-1] ? lcs[i-1][j-1] + 1 : Math.max(lcs[i-1][j], lcs[i][j-1]);
      }
    }
    const result: DiffItem[] = [];
    let i = m, j = n;
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && oldWords[i-1] === newWords[j-1]) {
        result.unshift({ type: 'same', text: oldWords[i-1] });
        i--; j--;
      } else if (j > 0 && (i === 0 || lcs[i][j-1] >= lcs[i-1][j])) {
        result.unshift({ type: 'added', text: newWords[j-1] });
        j--;
      } else {
        result.unshift({ type: 'removed', text: oldWords[i-1] });
        i--;
      }
    }
    return result;
  }, [oldText, newText]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-auto" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="theme-bg-secondary rounded-lg shadow-xl w-full max-w-3xl mx-4 my-auto">
        <div className="flex items-center justify-between p-4 border-b theme-border-primary">
          <h3 className="font-semibold theme-text-primary">Comparar Versões</h3>
          <button onClick={onClose} className="text-xl theme-text-muted cursor-pointer">×</button>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-4 text-xs mb-3">
            <span className="theme-text-muted">Versão salva há {formatTimeAgo(timestamp)}</span>
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 bg-red-200 rounded"></span> Removido</span>
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 bg-green-200 rounded"></span> Adicionado</span>
          </div>
          <div className="border theme-border-input rounded p-3 max-h-80 overflow-auto text-sm theme-text-primary theme-bg-primary leading-relaxed">
            {computeDiff.map((item, i: number) => {
              if (item.type === 'removed') return <span key={i} className="bg-red-200 text-red-900 line-through">{item.text}</span>;
              if (item.type === 'added') return <span key={i} className="bg-green-200 text-green-900">{item.text}</span>;
              return <span key={i}>{item.text}</span>;
            })}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={onClose} className="px-4 py-2 text-sm border rounded theme-border-input theme-text-primary cursor-pointer hover-slate-600">Cancelar</button>
            <button onClick={onRestore} className="px-4 py-2 text-sm rounded bg-blue-600 text-white cursor-pointer hover-blue-700">Restaurar Versão Anterior</button>
          </div>
        </div>
      </div>
    </div>
  );
});

VersionCompareModal.displayName = 'VersionCompareModal';
