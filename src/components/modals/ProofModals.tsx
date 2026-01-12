/**
 * @file ProofModals.tsx
 * @description Modais relacionados a provas (Add, Delete)
 * @version 1.36.85
 *
 * Extraído do App.tsx como parte da FASE 3 de refatoração.
 */

import React from 'react';
import { FileText, Trash2 } from 'lucide-react';
import { BaseModal, ModalFooter, ModalWarningBox, ModalContentPreview, CSS } from './BaseModal';
import type {
  AddProofTextModalProps,
  DeleteProofModalProps
} from '../../types';

// Modal: Adicionar Prova (Texto)
export const AddProofTextModal = React.memo(({ isOpen, onClose, newProofData, setNewProofData, onAddProof }: AddProofTextModalProps) => {
  const data = newProofData || { name: '', text: '' };
  const handleClose = () => { onClose(); setNewProofData({ name: '', text: '' }); };
  return (
    <BaseModal isOpen={isOpen} onClose={handleClose} title="Adicionar Prova (Texto)" icon={<FileText />} iconColor="blue" size="lg"
      footer={<>
        <button onClick={handleClose} className={CSS.btnSecondary}>Cancelar</button>
        <button onClick={onAddProof} disabled={!data.text.trim()} className="px-6 py-2 rounded-lg disabled:opacity-50 bg-blue-600 text-white hover-blue-700-from-600">Adicionar Prova</button>
      </>}>
      <div className="space-y-4">
        <div><label className={CSS.label}>Nome da Prova</label><input type="text" value={data.name} onChange={(e) => setNewProofData((prev: { name: string; text: string }) => ({...prev, name: e.target.value}))} placeholder="Ex: Contracheques, Ata de Audiência" className="w-full px-4 py-2 theme-bg-secondary border theme-border-input rounded-lg theme-text-secondary" /></div>
        <div><label className={CSS.label}>Texto da Prova</label><textarea value={data.text} onChange={(e) => setNewProofData((prev: { name: string; text: string }) => ({...prev, text: e.target.value}))} placeholder="Cole aqui o texto da prova..." rows={12} className="w-full px-4 py-2 theme-bg-secondary border theme-border-input rounded-lg theme-text-secondary font-mono text-sm" /></div>
      </div>
    </BaseModal>
  );
});
AddProofTextModal.displayName = 'AddProofTextModal';

// Modal: Excluir Prova
// v1.36.30: Fix race condition - isOpen && proofToDelete para evitar modal vazio
export const DeleteProofModal = React.memo(({ isOpen, onClose, proofToDelete, onConfirmDelete }: DeleteProofModalProps) => {
  return (
    <BaseModal isOpen={isOpen && !!proofToDelete} onClose={onClose} title="Confirmar Exclusão" icon={<Trash2 />} iconColor="red" size="md"
      footer={<ModalFooter.Destructive onClose={onClose} onConfirm={onConfirmDelete} confirmText="Excluir Prova" />}>
      {proofToDelete && (
        <div className="space-y-4">
          <p className="theme-text-tertiary">Deseja excluir a prova abaixo?</p>
          <ModalContentPreview title={proofToDelete.name}>
            <span className={`px-2 py-0.5 text-xs rounded ml-2 ${proofToDelete.isPdf ? 'theme-bg-red-accent theme-text-red' : 'theme-bg-blue-accent theme-text-blue'}`}>
              {proofToDelete.isPdf ? 'PDF' : 'TEXTO'}
            </span>
            {!proofToDelete.isPdf && proofToDelete.text && <p className="text-xs theme-text-muted mt-2">{proofToDelete.text.substring(0, 200)}...</p>}
          </ModalContentPreview>
          <ModalWarningBox><strong>Atenção:</strong> Esta ação não pode ser desfeita.</ModalWarningBox>
        </div>
      )}
    </BaseModal>
  );
});
DeleteProofModal.displayName = 'DeleteProofModal';
