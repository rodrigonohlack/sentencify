/**
 * @file ModelModals.tsx
 * @description Modais relacionados a modelos (Delete, DeleteAll, DeleteAllPrecedentes)
 * @version 1.36.85
 *
 * Extraído do App.tsx como parte da FASE 3 de refatoração.
 */

import React from 'react';
import { Trash2, AlertCircle } from 'lucide-react';
import { BaseModal, ModalFooter, ModalWarningBox, ModalContentPreview, CSS } from './BaseModal';
import type {
  DeleteModelModalProps,
  DeleteAllModelsModalProps,
  DeleteAllPrecedentesModalProps
} from '../../types';

// Modal: Excluir Modelo
export const DeleteModelModal = React.memo(({ isOpen, onClose, modelToDelete, setModelToDelete, onConfirmDelete }: DeleteModelModalProps) => {
  if (!modelToDelete) return null;
  const handleClose = () => { onClose(); setModelToDelete(null); };
  return (
    <BaseModal isOpen={isOpen} onClose={handleClose} title="Excluir Modelo" icon={<Trash2 />} iconColor="red" size="sm"
      footer={<ModalFooter.Destructive onClose={handleClose} onConfirm={onConfirmDelete} confirmText="Excluir" />}>
      <div className="space-y-4">
        <p className="theme-text-tertiary">Tem certeza que deseja excluir o modelo:</p>
        <ModalContentPreview title={modelToDelete.title} badge={modelToDelete.category}>
          {modelToDelete.favorite && <span className="text-xl float-right">⭐</span>}
        </ModalContentPreview>
        <ModalWarningBox><strong>Atenção:</strong> O modelo será permanentemente removido e não poderá ser recuperado.</ModalWarningBox>
      </div>
    </BaseModal>
  );
});
DeleteModelModal.displayName = 'DeleteModelModal';

// Modal: Excluir Todos os Modelos
export const DeleteAllModelsModal = React.memo(({ isOpen, onClose, totalModels, confirmText, setConfirmText, onConfirmDelete }: DeleteAllModelsModalProps) => {
  const handleClose = () => { onClose(); setConfirmText(''); };
  return (
    <BaseModal isOpen={isOpen} onClose={handleClose} title="ATENÇÃO: Exclusão em Massa" icon={<AlertCircle />} iconColor="red" size="md"
      footer={<>
        <button onClick={handleClose} className={CSS.btnSecondary}>Cancelar</button>
        <button onClick={onConfirmDelete} disabled={confirmText !== 'EXCLUIR'} className="flex-1 px-4 py-3 rounded-lg disabled:theme-bg-tertiary disabled:cursor-not-allowed font-medium bg-red-600 text-white hover-red-700-from-600">🗑️ Excluir Tudo</button>
      </>}>
      <div className="space-y-4">
        <p className="theme-text-tertiary">Você está prestes a <strong className="text-red-400">excluir TODOS os {totalModels} modelo(s)</strong> da sua biblioteca.</p>
        <ModalWarningBox>
          ⚠️ <strong>ATENÇÃO:</strong> Todos os modelos serão permanentemente removidos. Esta ação não pode ser desfeita!
          <ul className="mt-2 ml-4 list-disc space-y-1 theme-text-secondary">
            <li>Todos os {totalModels} modelos serão excluídos</li>
            <li>As sugestões automáticas não funcionarão mais</li>
            <li>Você precisará recriar ou importar novos modelos</li>
          </ul>
        </ModalWarningBox>
        <div>
          <label className={CSS.label}>Para confirmar, digite <strong className="text-red-400">EXCLUIR</strong>:</label>
          <input type="text" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} className="w-full theme-bg-app border theme-border-input rounded-lg p-3 theme-text-primary" placeholder="Digite EXCLUIR" autoFocus />
          {confirmText && confirmText !== 'EXCLUIR' && <p className="text-xs text-red-400 mt-1">❌ Digite exatamente "EXCLUIR"</p>}
        </div>
      </div>
    </BaseModal>
  );
});
DeleteAllModelsModal.displayName = 'DeleteAllModelsModal';

// Modal: Excluir Todos os Precedentes
export const DeleteAllPrecedentesModal = React.memo(({ isOpen, onClose, totalPrecedentes, confirmText, setConfirmText, onConfirmDelete }: DeleteAllPrecedentesModalProps) => {
  const handleClose = () => { onClose(); setConfirmText(''); };
  return (
    <BaseModal isOpen={isOpen} onClose={handleClose} title="ATENÇÃO: Exclusão em Massa" icon={<AlertCircle />} iconColor="red" size="md"
      footer={<>
        <button onClick={handleClose} className={CSS.btnSecondary}>Cancelar</button>
        <button onClick={onConfirmDelete} disabled={confirmText !== 'EXCLUIR'} className="flex-1 px-4 py-3 rounded-lg disabled:theme-bg-tertiary disabled:cursor-not-allowed font-medium bg-red-600 text-white hover-red-700-from-600">🗑️ Excluir Tudo</button>
      </>}>
      <div className="space-y-4">
        <p className="theme-text-tertiary">Você está prestes a <strong className="text-red-400">excluir TODOS os {totalPrecedentes} precedente(s)</strong> da sua base.</p>
        <ModalWarningBox>
          ⚠️ <strong>ATENÇÃO:</strong> Todos os precedentes serão permanentemente removidos. Esta ação não pode ser desfeita!
        </ModalWarningBox>
        <div>
          <label className={CSS.label}>Para confirmar, digite <strong className="text-red-400">EXCLUIR</strong>:</label>
          <input type="text" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} className="w-full theme-bg-app border theme-border-input rounded-lg p-3 theme-text-primary" placeholder="Digite EXCLUIR" autoFocus />
          {confirmText && confirmText !== 'EXCLUIR' && <p className="text-xs text-red-400 mt-1">❌ Digite exatamente "EXCLUIR"</p>}
        </div>
      </div>
    </BaseModal>
  );
});
DeleteAllPrecedentesModal.displayName = 'DeleteAllPrecedentesModal';
