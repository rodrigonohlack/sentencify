/**
 * @file ChangelogModal.tsx
 * @description Modal de histórico de alterações do sistema
 * @version 1.37.51
 *
 * Extraído do App.tsx como parte da extração de modais.
 * Usa useUIStore para acessar estado via Zustand.
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
      <div className="p-4 overflow-y-auto max-h-[60vh]">
        {CHANGELOG.map((item, i: number) => (
          <div key={i} className="mb-3 pb-3 border-b theme-border-secondary last:border-0">
            <span className="text-blue-400 font-mono text-sm font-semibold">v{item.version}</span>
            <p className="theme-text-secondary text-sm mt-1">{item.feature}</p>
          </div>
        ))}
      </div>
    </BaseModal>
  );
};

export default ChangelogModal;
