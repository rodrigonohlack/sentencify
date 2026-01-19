/**
 * @file ChangelogModal.tsx
 * @description Modal de histórico de alterações do sistema
 * @version 1.38.13
 *
 * Extraído do App.tsx como parte da extração de modais.
 * Usa useUIStore para acessar estado via Zustand.
 *
 * v1.38.13: VirtualList para performance (~430 entradas → renderiza só ~15-20 visíveis)
 */

import React from 'react';
import { Clock } from 'lucide-react';
import { useUIStore } from '../../stores/useUIStore';
import { CHANGELOG } from '../../constants/changelog';
import { BaseModal } from './BaseModal';
import { VirtualList } from '../cards/VirtualList';

/** Tipo de item do changelog */
interface ChangelogItem {
  version: string;
  feature: string;
}

/**
 * ChangelogModal - Exibe o histórico de alterações do sistema
 *
 * Lista todas as versões e suas respectivas features.
 * Usa VirtualList para renderizar apenas items visíveis (performance).
 */
export const ChangelogModal: React.FC = () => {
  const showChangelogModal = useUIStore((s) => s.modals.changelog);
  const closeModal = useUIStore((s) => s.closeModal);

  // Renderiza um item do changelog
  const renderChangelogItem = React.useCallback((item: ChangelogItem) => (
    <div className="mb-3 pb-3 border-b theme-border-secondary">
      <span className="text-blue-400 font-mono text-sm font-semibold">v{item.version}</span>
      <p className="theme-text-secondary text-sm mt-1">{item.feature}</p>
    </div>
  ), []);

  return (
    <BaseModal
      isOpen={showChangelogModal}
      onClose={() => closeModal('changelog')}
      title="Histórico de Alterações"
      icon={<Clock />}
      iconColor="blue"
      size="md"
    >
      <div className="p-4">
        <VirtualList<ChangelogItem>
          items={CHANGELOG}
          itemHeight={72}
          renderItem={renderChangelogItem}
          overscan={3}
        />
      </div>
    </BaseModal>
  );
};

export default ChangelogModal;
