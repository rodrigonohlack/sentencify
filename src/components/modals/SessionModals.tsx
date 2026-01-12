/**
 * @file SessionModals.tsx
 * @description Modais relacionados a sessão (Restore, Clear, Logout)
 * @version 1.36.85
 *
 * Extraído do App.tsx como parte da FASE 3 de refatoração.
 */

import React from 'react';
import { Save, Trash2, LogOut } from 'lucide-react';
import { BaseModal, ModalFooter, ModalInfoBox, ModalAmberBox, CSS } from './BaseModal';
import type {
  RestoreSessionModalProps,
  ClearProjectModalProps,
  LogoutConfirmModalProps
} from '../../types';

// Modal: Restaurar Sessão
// v1.33.62: preventClose - usuário deve escolher uma opção
export const RestoreSessionModal = React.memo(({ isOpen, onClose, sessionLastSaved, onRestoreSession, onStartNew }: RestoreSessionModalProps) => (
  <BaseModal isOpen={isOpen} onClose={onClose} title="Sessão Anterior Encontrada" icon={<Save />} iconColor="blue" size="sm" preventClose
    footer={<><button onClick={onRestoreSession} className={CSS.btnGreen}>✅ Continuar Sessão</button><button onClick={onStartNew} className={CSS.btnRed}>🗑️ Começar do Zero</button></>}>
    <div className="space-y-4">
      <p className="text-xs theme-text-muted">Última atualização: {sessionLastSaved ? new Date(sessionLastSaved).toLocaleString('pt-BR') : ''}</p>
      <p className="theme-text-tertiary">Encontramos uma sessão salva. Deseja continuar ou começar uma nova sentença?</p>
      <ModalInfoBox>💡 <strong>Dica:</strong> Use "Salvar Projeto" para fazer backup seguro.</ModalInfoBox>
    </div>
  </BaseModal>
));
RestoreSessionModal.displayName = 'RestoreSessionModal';

// Modal: Limpar Projeto
export const ClearProjectModal = React.memo(({ isOpen, onClose, onConfirmClear }: ClearProjectModalProps) => (
  <BaseModal isOpen={isOpen} onClose={onClose} title="Limpar Projeto" icon={<Trash2 />} iconColor="red" size="sm"
    footer={<ModalFooter.Destructive onClose={onClose} onConfirm={onConfirmClear} confirmText="Sim, Limpar Tudo" />}>
    <div className="space-y-4">
      <p className="theme-text-tertiary">Tem certeza que deseja <strong>limpar todos os dados</strong> do projeto?</p>
      <ModalAmberBox>
        <p className="text-xs theme-text-primary mb-2"><strong>⚠️ Atenção! Isto irá apagar:</strong></p>
        <ul className="text-xs theme-text-secondary space-y-1 ml-4 list-disc">
          <li>Todos os documentos (PDFs e textos)</li>
          <li>Todos os tópicos e decisões</li>
          <li>Todo o progresso da sentença</li>
        </ul>
      </ModalAmberBox>
      <ModalInfoBox>💡 <strong>Dica:</strong> Se quiser manter seus dados, clique em "Salvar Projeto" antes.</ModalInfoBox>
    </div>
  </BaseModal>
));
ClearProjectModal.displayName = 'ClearProjectModal';

// v1.33.57: Modal de confirmação de logout estilizado
export const LogoutConfirmModal = React.memo(({ isOpen, onClose, onConfirm }: LogoutConfirmModalProps) => (
  <BaseModal isOpen={isOpen} onClose={onClose} title="Sair do Sistema" icon={<LogOut />} iconColor="red" size="sm"
    footer={<ModalFooter.Destructive onClose={onClose} onConfirm={onConfirm} confirmText="Sim, Sair" />}>
    <div className="space-y-4">
      <p className="theme-text-tertiary">Deseja realmente sair do sistema?</p>
      <ModalInfoBox>💾 Seus dados permanecerão salvos localmente.</ModalInfoBox>
    </div>
  </BaseModal>
));
LogoutConfirmModal.displayName = 'LogoutConfirmModal';
