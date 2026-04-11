/**
 * @file KnowledgePackagesManagerModal.tsx
 * @description Modal de gerenciamento de Pacotes de Conhecimento
 * @version 1.40.34
 */

import React from 'react';
import { BookOpen, Plus, Pencil, Trash2, X, FileText, ChevronLeft } from 'lucide-react';
import { BaseModal, CSS } from './BaseModal';
import type { KnowledgePackage } from '../../types';
import type { UseKnowledgePackagesReturn } from '../../hooks/useKnowledgePackages';

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS INTERNOS
// ─────────────────────────────────────────────────────────────────────────────

type View = 'list' | 'form';

interface FormState {
  name: string;
  description: string;
  instructions: string;
}

const emptyForm: FormState = { name: '', description: '', instructions: '' };

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE
// ─────────────────────────────────────────────────────────────────────────────

interface KnowledgePackagesManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  knowledgePackages: UseKnowledgePackagesReturn;
}

export const KnowledgePackagesManagerModal = React.memo(({
  isOpen,
  onClose,
  knowledgePackages,
}: KnowledgePackagesManagerModalProps) => {
  const { packages, isLoading, createPackage, updatePackage, deletePackage, addFile, removeFile } = knowledgePackages;

  const [view, setView] = React.useState<View>('list');
  const [editingPkg, setEditingPkg] = React.useState<KnowledgePackage | null>(null);
  const [form, setForm] = React.useState<FormState>(emptyForm);
  const [saving, setSaving] = React.useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null);

  // Formulário de novo arquivo (inline)
  const [addingFile, setAddingFile] = React.useState(false);
  const [fileForm, setFileForm] = React.useState({ name: '', content: '' });
  const [savingFile, setSavingFile] = React.useState(false);

  // ─── Navegação ─────────────────────────────────────────────────────────────

  const goToCreate = () => {
    setEditingPkg(null);
    setForm(emptyForm);
    setView('form');
  };

  const goToEdit = (pkg: KnowledgePackage) => {
    setEditingPkg(pkg);
    setForm({ name: pkg.name, description: pkg.description || '', instructions: pkg.instructions || '' });
    setAddingFile(false);
    setFileForm({ name: '', content: '' });
    setView('form');
  };

  const goToList = () => {
    setView('list');
    setEditingPkg(null);
    setForm(emptyForm);
    setAddingFile(false);
  };

  // ─── Salvar pacote ─────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editingPkg) {
        await updatePackage(editingPkg.id, form);
      } else {
        await createPackage(form);
      }
      goToList();
    } finally {
      setSaving(false);
    }
  };

  // ─── Deletar pacote ────────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    await deletePackage(id);
    setConfirmDeleteId(null);
  };

  // ─── Adicionar arquivo ─────────────────────────────────────────────────────

  const handleAddFile = async () => {
    if (!editingPkg || !fileForm.name.trim() || !fileForm.content.trim()) return;
    setSavingFile(true);
    try {
      const result = await addFile(editingPkg.id, fileForm);
      if (result) {
        // Atualizar editingPkg local com o novo arquivo
        setEditingPkg(prev => prev ? { ...prev, files: [...prev.files, result] } : prev);
        setFileForm({ name: '', content: '' });
        setAddingFile(false);
      }
    } finally {
      setSavingFile(false);
    }
  };

  // ─── Remover arquivo ───────────────────────────────────────────────────────

  const handleRemoveFile = async (fileId: string) => {
    if (!editingPkg) return;
    const ok = await removeFile(editingPkg.id, fileId);
    if (ok) {
      setEditingPkg(prev => prev ? { ...prev, files: prev.files.filter(f => f.id !== fileId) } : prev);
    }
  };

  // ─── Reset ao fechar ───────────────────────────────────────────────────────

  const handleClose = () => {
    goToList();
    onClose();
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title={view === 'list' ? 'Pacotes de Conhecimento' : (editingPkg ? 'Editar Pacote' : 'Novo Pacote')}
      subtitle={view === 'list' ? 'Instruções e textos injetados no contexto do Assistente de Redação IA' : undefined}
      icon={<BookOpen className="w-5 h-5" />}
      iconColor="purple"
      size="xl"
      footer={
        view === 'form' ? (
          <div className="flex justify-between w-full">
            <button onClick={goToList} className={CSS.btnSecondary}>
              <ChevronLeft className="w-4 h-4 inline mr-1" />Voltar
            </button>
            <button
              onClick={handleSave}
              disabled={!form.name.trim() || saving}
              className={CSS.btnBlue + ' disabled:opacity-50'}
            >
              {saving ? <span className={CSS.spinner + ' inline-block mr-2'} /> : null}
              {editingPkg ? 'Salvar alterações' : 'Criar pacote'}
            </button>
          </div>
        ) : (
          <div className="flex justify-end w-full">
            <button onClick={handleClose} className={CSS.btnSecondary}>Fechar</button>
          </div>
        )
      }
    >
      {/* ── LISTA ── */}
      {view === 'list' && (
        <div className="p-5 space-y-4">
          <div className="flex justify-end">
            <button onClick={goToCreate} className={CSS.btnBlue + ' flex items-center gap-2'}>
              <Plus className="w-4 h-4" />Novo Pacote
            </button>
          </div>

          {isLoading && (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!isLoading && packages.length === 0 && (
            <div className="text-center py-12 theme-text-muted">
              <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhum pacote criado ainda.</p>
              <p className="text-xs mt-1">Crie um pacote para adicionar instruções e textos de referência.</p>
            </div>
          )}

          <div className="space-y-3">
            {packages.map(pkg => (
              <div key={pkg.id} className="p-4 rounded-xl border theme-border-input theme-bg-secondary-50 hover:border-purple-500/40 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium theme-text-primary truncate">{pkg.name}</p>
                    {pkg.description && (
                      <p className="text-xs theme-text-muted mt-0.5 truncate">{pkg.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5 text-xs theme-text-disabled">
                      {pkg.instructions?.trim() && <span>✓ Instruções</span>}
                      {pkg.files.length > 0 && (
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {pkg.files.length} arquivo{pkg.files.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => goToEdit(pkg)}
                      className="p-1.5 rounded-lg theme-hover-bg transition-colors theme-text-secondary"
                      title="Editar pacote"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    {confirmDeleteId === pkg.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(pkg.id)}
                          className="px-2 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-500"
                        >
                          Confirmar
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="p-1.5 rounded-lg theme-hover-bg transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(pkg.id)}
                        className="p-1.5 rounded-lg theme-hover-bg transition-colors text-red-400 hover:text-red-300"
                        title="Excluir pacote"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── FORMULÁRIO ── */}
      {view === 'form' && (
        <div className="p-5 space-y-5 overflow-y-auto">
          {/* Nome */}
          <div>
            <label className={CSS.label}>Nome do pacote *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Ex: Horas Extras — Minha fundamentação"
              className={CSS.input}
            />
          </div>

          {/* Descrição */}
          <div>
            <label className={CSS.label}>Descrição (opcional)</label>
            <input
              type="text"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Ex: Textos e instruções para tópicos de jornada"
              className={CSS.input}
            />
          </div>

          {/* Instruções */}
          <div>
            <label className={CSS.label}>Instruções para a IA</label>
            <textarea
              value={form.instructions}
              onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))}
              rows={5}
              placeholder="Ex: Ao decidir sobre horas extras, considere que entendo que o ônus da prova do horário é do empregador quando não há controle de ponto. Não presuma boa-fé do empregador em casos de jornada excessiva..."
              className={CSS.input + ' resize-none'}
            />
            <p className="text-xs theme-text-disabled mt-1">Estas instruções são injetadas no contexto da primeira mensagem ao Assistente.</p>
          </div>

          {/* Arquivos (apenas ao editar pacote já existente) */}
          {editingPkg && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={CSS.label + ' mb-0'}>Arquivos de texto</label>
                {!addingFile && (
                  <button
                    onClick={() => setAddingFile(true)}
                    className="text-xs flex items-center gap-1 text-purple-400 hover:text-purple-300"
                  >
                    <Plus className="w-3 h-3" />Adicionar texto
                  </button>
                )}
              </div>

              {/* Lista de arquivos existentes */}
              {editingPkg.files.length === 0 && !addingFile && (
                <p className="text-xs theme-text-disabled py-2">Nenhum arquivo adicionado.</p>
              )}
              <div className="space-y-2">
                {editingPkg.files.map(f => (
                  <div key={f.id} className="flex items-center justify-between p-2.5 rounded-lg border theme-border-input theme-bg-app-50">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-purple-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm theme-text-primary truncate">{f.name}</p>
                        <p className="text-xs theme-text-disabled">{f.content.length.toLocaleString()} chars</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveFile(f.id)}
                      className="p-1.5 rounded-lg theme-hover-bg text-red-400 hover:text-red-300 shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Formulário inline de novo arquivo */}
              {addingFile && (
                <div className="mt-3 p-3 rounded-xl border theme-border-input theme-bg-secondary-50 space-y-3">
                  <input
                    type="text"
                    value={fileForm.name}
                    onChange={e => setFileForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Nome do arquivo (ex: Acórdão TST — Súmula 338)"
                    className={CSS.input}
                  />
                  <textarea
                    value={fileForm.content}
                    onChange={e => setFileForm(f => ({ ...f, content: e.target.value }))}
                    rows={6}
                    placeholder="Cole aqui o texto do documento..."
                    className={CSS.input + ' resize-none'}
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => { setAddingFile(false); setFileForm({ name: '', content: '' }); }}
                      className={CSS.btnSecondary + ' text-sm py-2'}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleAddFile}
                      disabled={!fileForm.name.trim() || !fileForm.content.trim() || savingFile}
                      className={CSS.btnBlue + ' text-sm py-2 disabled:opacity-50'}
                    >
                      {savingFile ? <span className={CSS.spinner + ' inline-block mr-1'} /> : null}
                      Salvar arquivo
                    </button>
                  </div>
                </div>
              )}

              {editingPkg.files.length === 0 && !addingFile && (
                <p className="text-xs theme-text-disabled mt-1">
                  Salve o pacote primeiro, depois adicione arquivos de texto.
                </p>
              )}
            </div>
          )}

          {!editingPkg && (
            <p className="text-xs theme-text-disabled">
              Após criar o pacote, você poderá adicionar arquivos de texto (acórdãos, trechos doutrinários, etc.).
            </p>
          )}
        </div>
      )}
    </BaseModal>
  );
});

KnowledgePackagesManagerModal.displayName = 'KnowledgePackagesManagerModal';
