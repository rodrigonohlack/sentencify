/**
 * @file ProofModals.tsx
 * @description Modais relacionados a provas (Add, Delete, Analysis, Link)
 * @version 1.36.89
 *
 * Extraído do App.tsx como parte da FASE 3 de refatoração.
 * v1.36.89: Adicionados ProofAnalysisModal e LinkProofModal
 */

import React from 'react';
import { FileText, Trash2, Sparkles, Scale, Edit, AlertCircle } from 'lucide-react';
import { BaseModal, ModalFooter, ModalWarningBox, ModalContentPreview, CSS } from './BaseModal';
import type {
  AddProofTextModalProps,
  DeleteProofModalProps,
  ProofAnalysisModalProps,
  LinkProofModalProps,
  Topic
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

// Modal: Analisar Prova com IA
// v1.33.45: Migrado para BaseModal
export const ProofAnalysisModal = React.memo(({
  isOpen,
  onClose,
  proofToAnalyze,
  customInstructions,
  setCustomInstructions,
  useOnlyMiniRelatorios,
  setUseOnlyMiniRelatorios,
  includeLinkedTopicsInFree,
  setIncludeLinkedTopicsInFree,
  proofTopicLinks,
  onAnalyzeContextual,
  onAnalyzeFree,
  editorTheme = 'dark'
}: ProofAnalysisModalProps) => {
  if (!isOpen || !proofToAnalyze) return null;

  const linkedTopicsCount = proofTopicLinks[proofToAnalyze.id]?.length || 0;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Analisar Prova com IA"
      subtitle={proofToAnalyze.name}
      icon={<Sparkles />}
      iconColor="blue"
      size="lg"
      footer={<ModalFooter.CloseOnly onClose={onClose} text="Cancelar" />}
    >
      <div className="space-y-4">
        <p className="text-sm theme-text-tertiary">
          Selecione o tipo de análise que deseja realizar nesta prova:
        </p>

        {/* Campo de Instruções Personalizadas */}
        <div>
          <label className={CSS.label}>
            Instruções Personalizadas (Opcional)
          </label>
          <textarea
            value={customInstructions}
            onChange={(e) => setCustomInstructions(e.target.value)}
            placeholder="Adicione instruções específicas para esta análise (ex: 'Focar em valores monetários', 'Verificar datas de vínculos empregatícios', 'Identificar assinaturas e testemunhas', etc.)..."
            rows={3}
            className="w-full px-3 py-2 theme-bg-secondary-50 border theme-border-input rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent theme-text-secondary text-sm resize-none"
          />
          <p className="text-xs theme-text-disabled mt-1">
            Estas instruções serão adicionadas ao prompt de análise da IA.
          </p>
        </div>

        {/* Opção 1: Análise Contextual (com checkbox de mini-relatórios dentro) */}
        <div className={`rounded-lg ${editorTheme === 'light' ? 'hover-button-contextual-light' : 'hover-button-contextual'}`}>
          <button
            onClick={onAnalyzeContextual}
            className="w-full p-4 text-left"
          >
            <div className="flex items-start gap-3">
              <div className="icon-wrapper p-2 bg-purple-600/20 rounded-lg transition-colors">
                <Scale className="w-5 h-5 text-purple-400" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold theme-text-secondary mb-1">Análise Contextual</h4>
                <p className="text-sm theme-text-muted">
                  Compara a prova com as alegações da petição e contestação, avaliando se prova ou refuta os pontos discutidos no processo.
                </p>
              </div>
            </div>
          </button>
          {linkedTopicsCount > 0 && (
            <div className="px-4 pb-4 pt-0">
              <label
                className="flex items-center gap-2 cursor-pointer text-xs theme-text-muted hover-label-text-purple"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="checkbox"
                  checked={useOnlyMiniRelatorios}
                  onChange={(e) => setUseOnlyMiniRelatorios(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-purple-600 theme-bg-secondary text-purple-500 focus:ring-1 focus:ring-purple-500 cursor-pointer"
                />
                <span>Usar apenas mini-relatórios dos {linkedTopicsCount} tópico(s) vinculado(s)</span>
              </label>
            </div>
          )}
        </div>

        {/* Opção 2: Análise Livre (com checkbox de tópicos vinculados) */}
        <div className={`rounded-lg ${editorTheme === 'light' ? 'hover-button-free-light' : 'hover-button-free'}`}>
          <button
            onClick={onAnalyzeFree}
            className="w-full p-4 text-left"
          >
            <div className="flex items-start gap-3">
              <div className="icon-wrapper p-2 bg-green-600/20 rounded-lg transition-colors">
                <Edit className="w-5 h-5 text-green-400" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold theme-text-secondary mb-1">Análise Livre</h4>
                <p className="text-sm theme-text-muted">
                  Envia apenas a prova e suas instruções personalizadas.
                </p>
              </div>
            </div>
          </button>
          {linkedTopicsCount > 0 && (
            <div className="px-4 pb-4 pt-0">
              <label
                className="flex items-center gap-2 cursor-pointer text-xs theme-text-muted hover-label-text-green"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="checkbox"
                  checked={includeLinkedTopicsInFree}
                  onChange={(e) => setIncludeLinkedTopicsInFree(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-green-600 theme-bg-secondary text-green-500 focus:ring-1 focus:ring-green-500 cursor-pointer"
                />
                <span>Incluir tópicos vinculados ({linkedTopicsCount} tóp.)</span>
              </label>
            </div>
          )}
        </div>
      </div>
    </BaseModal>
  );
});

ProofAnalysisModal.displayName = 'ProofAnalysisModal';

// Modal: Vincular Prova a Tópicos
// v1.33.45: Migrado para BaseModal
export const LinkProofModal = React.memo(({
  isOpen,
  onClose,
  proofToLink,
  extractedTopics,
  proofTopicLinks,
  setProofTopicLinks
}: LinkProofModalProps) => {
  if (!isOpen || !proofToLink) return null;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Vincular Prova a Tópicos"
      subtitle={proofToLink.name}
      icon={<Scale />}
      iconColor="purple"
      size="lg"
      footer={
        <button
          onClick={onClose}
          className="px-6 py-2 rounded-lg font-medium bg-purple-600 text-white hover-purple-700-from-600"
        >
          Concluir
        </button>
      }
    >
      {/* Scroll com margens negativas para compensar padding do BaseModal */}
      <div className="max-h-[50vh] overflow-y-auto -mx-5 px-5">
        {extractedTopics.length === 0 ? (
          <div className="text-center py-8 theme-text-muted">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum tópico disponível</p>
            <p className="text-sm mt-2">Primeiro analise os documentos na aba "Upload & Análise"</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm theme-text-muted mb-4">
              Selecione os tópicos aos quais esta prova se relaciona:
            </p>
            {extractedTopics.map((topic: Topic) => {
              const isLinked = proofTopicLinks[proofToLink.id]?.includes(topic.title) || false;
              return (
                <label
                  key={topic.title}
                  className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                    isLinked
                      ? 'bg-purple-600/20 border border-purple-500/50'
                      : 'theme-bg-secondary-50 border theme-border-input hover-border-purple-alpha-30'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isLinked}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setProofTopicLinks((prev: Record<string, string[]>) => ({
                          ...prev,
                          [proofToLink.id]: [...(prev[proofToLink.id] || []), topic.title]
                        }));
                      } else {
                        setProofTopicLinks((prev: Record<string, string[]>) => ({
                          ...prev,
                          [proofToLink.id]: (prev[proofToLink.id] || []).filter((t: string) => t !== topic.title)
                        }));
                      }
                    }}
                    className="mt-1 w-4 h-4 rounded theme-border text-purple-600 focus:ring-2 focus:ring-purple-500 focus:ring-offset-0 theme-bg-secondary"
                  />
                  <div className="flex-1">
                    <div className={CSS.flexGap2}>
                      <span className="font-medium theme-text-secondary">{topic.title}</span>
                      <span className={`px-2 py-0.5 text-xs rounded ${
                        topic.category === 'PRELIMINAR'
                          ? 'bg-yellow-500/20 text-yellow-300'
                          : topic.category === 'PREJUDICIAL'
                          ? 'bg-orange-500/20 text-orange-300'
                          : 'theme-bg-blue-accent theme-text-blue'
                      }`}>
                        {topic.category}
                      </span>
                    </div>
                    {topic.relatorio && (
                      <p className="text-xs theme-text-muted mt-1 line-clamp-2">
                        {(topic.relatorio.replace(/<[^>]*>/g, '')).substring(0, 120)}...
                      </p>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </div>
    </BaseModal>
  );
});

LinkProofModal.displayName = 'LinkProofModal';
