/**
 * @file TopicModals.tsx
 * @description Modais relacionados a tópicos (Rename, Delete, Merge, Split, New)
 * @version 1.36.85
 *
 * Extraído do App.tsx como parte da FASE 3 de refatoração.
 */

import React from 'react';
import { Edit2, Sparkles, Edit, Trash2, Merge, Split, PlusCircle } from 'lucide-react';
import { BaseModal, ModalFooter, ModalWarningBox, ModalInfoBox, ModalContentPreview, CSS } from './BaseModal';
import type {
  Topic,
  TopicCategory,
  RenameTopicModalProps,
  DeleteTopicModalProps,
  MergeTopicsModalProps,
  SplitTopicModalProps,
  NewTopicModalProps
} from '../../types';

// Modal: Renomear Tópico
export const RenameTopicModal = React.memo(({ isOpen, onClose, topicToRename, setTopicToRename, newTopicName, setNewTopicName, handleRenameTopic, isRegenerating, hasDocuments }: RenameTopicModalProps) => {
  const handleClose = () => { onClose(); setTopicToRename(null); setNewTopicName(''); };
  return (
    <BaseModal isOpen={isOpen} onClose={handleClose} title="Renomear Tópico" icon={<Edit2 />} iconColor="purple" size="lg"
      footer={<>
        <button onClick={() => handleRenameTopic(true)} disabled={isRegenerating || !newTopicName.trim()} className="flex-1 py-3 rounded-lg font-medium disabled:opacity-50 bg-purple-600 text-white hover-purple-700-from-600">
          {isRegenerating ? <span className="flex items-center justify-center gap-2"><div className={CSS.spinner}></div>Regenerando...</span> : <span className="flex items-center justify-center gap-2"><Sparkles className="w-4 h-4" />Renomear e Regenerar</span>}
        </button>
        <button onClick={() => handleRenameTopic(false)} disabled={isRegenerating || !newTopicName.trim()} className="flex-1 py-3 rounded-lg font-medium disabled:opacity-50 bg-blue-600 text-white hover-blue-700-from-600">
          {isRegenerating ? <span className="flex items-center justify-center gap-2"><div className={CSS.spinner}></div>Renomeando...</span> : <span className="flex items-center justify-center gap-2"><Edit className="w-4 h-4" />Apenas Renomear</span>}
        </button>
        <button onClick={handleClose} disabled={isRegenerating} className="px-6 py-3 rounded-lg disabled:opacity-50 theme-bg-tertiary hover-slate-500">Cancelar</button>
      </>}>
      <div className="space-y-4">
        <div><label className={CSS.label}>Título Atual</label><p className="theme-text-muted theme-bg-app p-3 rounded">{topicToRename?.title}</p></div>
        <div><label className={CSS.label}>Novo Título</label><input type="text" value={newTopicName} onChange={(e) => setNewTopicName(e.target.value)} className="w-full theme-bg-app border theme-border-primary rounded-lg p-3 theme-text-secondary" placeholder="Digite o novo título" /></div>
        <ModalInfoBox>
          <strong>Escolha uma das opções:</strong>
          <ul className="mt-2 ml-4 space-y-1 theme-text-tertiary">
            <li>• <strong>Renomear e Regenerar:</strong> {hasDocuments ? 'Regerará com base nos documentos' : 'Regerará com IA'}</li>
            <li>• <strong>Apenas Renomear:</strong> Mantém o mini-relatório atual</li>
          </ul>
        </ModalInfoBox>
      </div>
    </BaseModal>
  );
});
RenameTopicModal.displayName = 'RenameTopicModal';

// Modal: Excluir Tópico
export const DeleteTopicModal = React.memo(({ isOpen, onClose, topicToDelete, setTopicToDelete, onConfirmDelete }: DeleteTopicModalProps) => (
  <BaseModal
    isOpen={isOpen}
    onClose={() => { onClose(); setTopicToDelete(null); }}
    title="Confirmar Exclusão"
    icon={<Trash2 />}
    iconColor="red"
    size="md"
    footer={<ModalFooter.Destructive onClose={() => { onClose(); setTopicToDelete(null); }} onConfirm={onConfirmDelete} confirmText="Sim, Excluir" />}
  >
    <div className="space-y-4">
      <p className="theme-text-tertiary">Deseja realmente excluir o tópico abaixo?</p>
      <ModalContentPreview title={topicToDelete?.title}>
        {topicToDelete?.relatorio && <div className="text-sm theme-text-muted mt-2 max-h-48 overflow-y-auto">{topicToDelete.relatorio}</div>}
      </ModalContentPreview>
      <ModalWarningBox><strong>Atenção:</strong> Esta ação não pode ser desfeita. O tópico será removido permanentemente.</ModalWarningBox>
    </div>
  </BaseModal>
));
DeleteTopicModal.displayName = 'DeleteTopicModal';

// Modal: Unir Tópicos
export const MergeTopicsModal = React.memo(({ isOpen, onClose, topicsToMerge, onConfirmMerge, isRegenerating, hasDocuments }: MergeTopicsModalProps) => {
  if (!topicsToMerge || topicsToMerge.length === 0) return null;
  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="Unir Tópicos" icon={<Merge />} iconColor="yellow" size="lg"
      footer={<>
        <button onClick={onConfirmMerge} disabled={isRegenerating} className="flex-1 py-3 rounded-lg font-medium disabled:opacity-50 bg-amber-600 text-white hover-amber-700-from-600">
          {isRegenerating ? <span className="flex items-center justify-center gap-2"><div className={CSS.spinner}></div>{hasDocuments ? 'Regenerando...' : 'Unindo...'}</span> : 'Confirmar União'}
        </button>
        <button onClick={onClose} className="px-6 py-3 rounded-lg theme-bg-tertiary hover-slate-500">Cancelar</button>
      </>}>
      <div className="space-y-4">
        <p className="theme-text-tertiary">Você está prestes a unir os seguintes tópicos:</p>
        <div className="space-y-2">{topicsToMerge.map((t: Topic, i: number) => <div key={i} className="theme-bg-app p-3 rounded border theme-border-input"><p className="font-medium theme-text-primary">{i+1}. {t.title}</p></div>)}</div>
        {hasDocuments ? <ModalInfoBox>✓ Um novo tópico unificado será criado e o mini-relatório será regenerado com base nos documentos originais.</ModalInfoBox> : <p className="text-xs theme-text-disabled">O mini-relatório será regenerado automaticamente.</p>}
      </div>
    </BaseModal>
  );
});
MergeTopicsModal.displayName = 'MergeTopicsModal';

// Modal: Separar Tópico
export const SplitTopicModal = React.memo(({ isOpen, onClose, topicToSplit, setTopicToSplit, splitNames, setSplitNames, onConfirmSplit, isRegenerating, hasDocuments }: SplitTopicModalProps) => {
  if (!splitNames) return null;
  const handleClose = () => { onClose(); setTopicToSplit(null); setSplitNames(['', '']); };
  return (
    <BaseModal isOpen={isOpen} onClose={handleClose} title="Separar Tópico" icon={<Split />} iconColor="orange" size="lg"
      footer={<>
        <button onClick={onConfirmSplit} disabled={isRegenerating || splitNames.filter((n: string) => n.trim()).length < 2} className="flex-1 py-3 rounded-lg font-medium disabled:opacity-50 bg-orange-600 text-white hover-orange-700-from-600">
          {isRegenerating ? <span className="flex items-center justify-center gap-2"><div className={CSS.spinner}></div>{hasDocuments ? 'Regenerando...' : 'Separando...'}</span> : 'Confirmar Separação'}
        </button>
        <button onClick={handleClose} className="px-6 py-3 rounded-lg theme-bg-tertiary hover-slate-500">Cancelar</button>
      </>}>
      <div className="space-y-4">
        <div><label className={CSS.label}>Tópico Original</label><p className="theme-text-muted theme-bg-app p-3 rounded">{topicToSplit?.title}</p></div>
        <p className="theme-text-tertiary">Separe em quantos subtópicos desejar:</p>
        {splitNames.map((name: string, i: number) => <div key={i}><label className={CSS.label}>Subtópico {i+1}</label><input type="text" value={name} onChange={(e) => { const n=[...splitNames]; n[i]=e.target.value; setSplitNames(n); }} className="w-full theme-bg-app border theme-border-input rounded-lg p-3 theme-text-primary" placeholder={`Título do subtópico ${i+1}`} /></div>)}
        <button onClick={() => setSplitNames([...splitNames, ''])} className="text-sm hover-text-blue-400-from-300">+ Adicionar mais um subtópico</button>
        {hasDocuments ? <ModalInfoBox>✓ Cada subtópico terá seu mini-relatório regenerado com base nos documentos originais.</ModalInfoBox> : <p className="text-xs theme-text-disabled">O mini-relatório será regenerado com as informações relevantes.</p>}
      </div>
    </BaseModal>
  );
});
SplitTopicModal.displayName = 'SplitTopicModal';

// Modal: Criar Novo Tópico
export const NewTopicModal = React.memo(({ isOpen, onClose, newTopicData, setNewTopicData, onConfirmCreate, isRegenerating, hasDocuments }: NewTopicModalProps) => {
  const data = newTopicData || { title: '', category: 'MÉRITO', relatorio: '' };
  const handleClose = () => { onClose(); setNewTopicData({ title: '', category: 'MÉRITO', relatorio: '' }); };
  return (
    <BaseModal isOpen={isOpen} onClose={handleClose} title="Criar Novo Tópico" icon={<PlusCircle />} iconColor="green" size="lg"
      footer={<>
        <button onClick={onConfirmCreate} disabled={isRegenerating || !(data.title || '').trim()} className="flex-1 py-3 rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2 bg-green-600 text-white hover-green-700-from-600">
          {isRegenerating ? <><div className={CSS.spinner}></div>{hasDocuments ? 'Analisando...' : 'Criando...'}</> : 'Criar Tópico'}
        </button>
        <button onClick={handleClose} className="px-6 py-3 rounded-lg theme-bg-tertiary hover-slate-500">Cancelar</button>
      </>}>
      <div className="space-y-4">
        <div><label className={CSS.label}>Título do Tópico</label><input type="text" value={data.title} onChange={(e) => setNewTopicData({...data, title: e.target.value})} className="w-full theme-bg-app border theme-border-input rounded-lg p-3 theme-text-primary" placeholder="Ex: Adicional de Periculosidade" /></div>
        <div><label className={CSS.label}>Categoria</label><select value={data.category} onChange={(e) => setNewTopicData({...data, category: e.target.value as TopicCategory})} className="w-full theme-bg-app border theme-border-input rounded-lg p-3 theme-text-primary"><option value="PRELIMINAR">Preliminar</option><option value="PREJUDICIAL">Prejudicial</option><option value="MÉRITO">Mérito</option></select></div>
        <div><label className={CSS.label}>Mini-relatório (opcional)</label><textarea value={data.relatorio} onChange={(e) => setNewTopicData({...data, relatorio: e.target.value})} className="w-full h-32 theme-bg-app border theme-border-input rounded-lg p-3 theme-text-primary resize-none" placeholder="Digite ou deixe em branco para gerar automaticamente" /></div>
        {hasDocuments ? <ModalInfoBox>✓ Se deixar em branco, o mini-relatório será gerado com base nos documentos.</ModalInfoBox> : <p className="text-xs theme-text-disabled">Se deixar vazio, será gerado um texto padrão.</p>}
      </div>
    </BaseModal>
  );
});
NewTopicModal.displayName = 'NewTopicModal';
