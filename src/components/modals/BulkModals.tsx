/**
 * @file BulkModals.tsx
 * @description Modais de operações em lote (Discard, Cancel)
 * @version 1.36.85
 *
 * Extraído do App.tsx como parte da FASE 3 de refatoração.
 */

import React from 'react';
import { AlertCircle } from 'lucide-react';
import { BaseModal, ModalFooter, ModalInfoBox, CSS } from './BaseModal';
import type {
  BulkDiscardConfirmModalProps,
  ConfirmBulkCancelModalProps
} from '../../types';

// Modal: Descartar Modelos em Lote
export const BulkDiscardConfirmModal = React.memo(({ isOpen, onClose, totalModels, onConfirm }: BulkDiscardConfirmModalProps) => (
  <BaseModal isOpen={isOpen} onClose={onClose} title="Descartar Modelos?" icon={<AlertCircle />} iconColor="red" size="sm"
    footer={<ModalFooter.Destructive onClose={onClose} onConfirm={onConfirm} confirmText="Sim, Descartar" />}>
    <div className="space-y-4">
      <p className="theme-text-tertiary">Descartar <strong className="theme-text-primary">{totalModels} modelo(s)</strong>?</p>
      <p className="text-sm theme-text-muted">Todos serão perdidos e precisará processar novamente.</p>
    </div>
  </BaseModal>
));
BulkDiscardConfirmModal.displayName = 'BulkDiscardConfirmModal';

// Modal: Cancelar Processamento em Lote
export const ConfirmBulkCancelModal = React.memo(({ isOpen, onClose, filesInProgress, onConfirm }: ConfirmBulkCancelModalProps) => (
  <BaseModal isOpen={isOpen} onClose={onClose} title="Cancelar Processamento?" icon={<AlertCircle />} iconColor="yellow" size="sm"
    footer={<><button onClick={onClose} className={CSS.btnSecondary}>Continuar</button><button onClick={onConfirm} className="flex-1 px-4 py-3 rounded-lg font-medium bg-amber-600 text-white hover-amber-700-from-600">Sim, Cancelar</button></>}>
    <div className="space-y-4">
      <p className="theme-text-tertiary">Cancelar processamento de <strong className="theme-text-primary">{filesInProgress} arquivo(s)</strong>?</p>
      <ModalInfoBox>ℹ️ Os modelos já gerados serão preservados.</ModalInfoBox>
    </div>
  </BaseModal>
));
ConfirmBulkCancelModal.displayName = 'ConfirmBulkCancelModal';
