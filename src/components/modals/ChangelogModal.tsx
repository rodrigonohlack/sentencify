/**
 * @file ChangelogModal.tsx
 * @description Modal de histórico de alterações do sistema
 * @version 1.38.18
 *
 * Extraído do App.tsx como parte da extração de modais.
 * Usa useUIStore para acessar estado via Zustand.
 *
 * v1.38.13: VirtualList para performance (~430 entradas → renderiza só ~15-20 visíveis)
 * v1.38.17: Fix scroll duplo - overflow-hidden no wrapper (só VirtualList rola)
 * v1.38.18: Lista simples com altura dinâmica (VirtualList cortava texto)
 */

import React from 'react';
import { Clock } from 'lucide-react';
import { useUIStore } from '../../stores/useUIStore';
import { CHANGELOG } from '../../constants/changelog';
import { BaseModal } from './BaseModal';

/**
 * ChangelogModal - Exibe o histórico de alterações do sistema
 *
 * Lista todas as versões e suas respectivas features.
 * Usa lista simples para permitir altura dinâmica por item.
 */
export const ChangelogModal: React.FC = () => {
  const showChangelogModal = useUIStore((s) => s.modals.changelog);
  const closeModal = useUIStore((s) => s.closeModal);

  return (
    <BaseModal
      isOpen={showChangelogModal}
      onClose={() => closeModal('changelog')}
      title="Histórico de Alterações"
      icon={<Clock />}
      iconColor="blue"
      size="md"
    >
      {/* v1.38.18: Lista simples com altura dinâmica (BaseModal já tem scroll) */}
      <div className="space-y-3">
        {CHANGELOG.map((item, idx) => (
          <div key={idx} className="pb-3 border-b theme-border-secondary last:border-b-0">
            <span className="text-blue-400 font-mono text-sm font-semibold">v{item.version}</span>
            <p className="theme-text-secondary text-sm mt-1">{item.feature}</p>
          </div>
        ))}
      </div>
    </BaseModal>
  );
};

export default ChangelogModal;
