/**
 * @file KnowledgePackageSelector.tsx
 * @description Seletor compacto de Pacotes de Conhecimento para o Assistente de Redação IA
 * @version 1.40.34
 */

import React from 'react';
import { BookOpen } from 'lucide-react';
import type { KnowledgePackage } from '../../types';

interface KnowledgePackageSelectorProps {
  packages: KnowledgePackage[];
  selectedPackageId: string | null;
  onSelect: (packageId: string | null) => void;
  /** Desabilitado após a primeira mensagem enviada */
  disabled: boolean;
  onManage: () => void;
}

export const KnowledgePackageSelector = React.memo(({
  packages,
  selectedPackageId,
  onSelect,
  disabled,
  onManage,
}: KnowledgePackageSelectorProps) => {
  const selected = packages.find(p => p.id === selectedPackageId) ?? null;

  return (
    <div className={`p-3 rounded-lg border theme-border-input theme-bg-secondary-50 ${disabled ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-2 mb-2">
        <BookOpen className="w-4 h-4 text-purple-400 shrink-0" />
        <span className="text-xs font-medium theme-text-secondary">Pacote de conhecimento</span>
        {disabled && (
          <span className="text-xs theme-text-disabled ml-1">(bloqueado após 1ª mensagem)</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <select
          value={selectedPackageId ?? ''}
          onChange={(e) => onSelect(e.target.value || null)}
          disabled={disabled}
          className="flex-1 text-sm theme-bg-app border theme-border-input rounded-lg px-3 py-1.5 theme-text-primary focus:border-purple-500 focus:ring-1 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">Nenhum selecionado</option>
          {packages.map(pkg => (
            <option key={pkg.id} value={pkg.id}>{pkg.name}</option>
          ))}
        </select>
        <button
          onClick={onManage}
          className="text-xs px-3 py-1.5 rounded-lg border theme-border-input theme-text-secondary theme-hover-bg transition-colors shrink-0"
          title="Gerenciar pacotes de conhecimento"
        >
          Gerenciar
        </button>
      </div>
      {selected && (
        <div className="mt-2 text-xs theme-text-muted space-y-0.5">
          {selected.description && <p className="truncate">{selected.description}</p>}
          <p>
            {selected.instructions.trim() ? '✓ Instruções' : ''}
            {selected.instructions.trim() && selected.files.length > 0 ? ' · ' : ''}
            {selected.files.length > 0 ? `${selected.files.length} arquivo${selected.files.length > 1 ? 's' : ''}` : ''}
          </p>
        </div>
      )}
    </div>
  );
});

KnowledgePackageSelector.displayName = 'KnowledgePackageSelector';
