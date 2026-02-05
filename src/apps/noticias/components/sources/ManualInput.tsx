// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE - Entrada Manual de Notícia
// v1.41.0 - Modal para adicionar notícia manualmente
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useCallback } from 'react';
import { Plus, Loader2, Link, FileText, Building2 } from 'lucide-react';
import { BaseModal, CSS } from '../../../../components/modals/BaseModal';
import type { NewsItemCreate } from '../../types';

interface ManualInputProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (news: NewsItemCreate) => Promise<void>;
}

/**
 * Modal para adicionar notícia manualmente
 */
export const ManualInput: React.FC<ManualInputProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    link: '',
    sourceName: ''
  });

  // Reset form ao abrir
  React.useEffect(() => {
    if (isOpen) {
      setFormData({ title: '', description: '', link: '', sourceName: '' });
      setError(null);
    }
  }, [isOpen]);

  const handleChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    // Validação
    if (!formData.title.trim()) {
      setError('Título é obrigatório');
      return;
    }
    if (!formData.link.trim()) {
      setError('Link é obrigatório');
      return;
    }
    if (!formData.sourceName.trim()) {
      setError('Nome da fonte é obrigatório');
      return;
    }

    // Validar URL
    try {
      new URL(formData.link);
    } catch {
      setError('Link inválido. Use uma URL completa (ex: https://...)');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        title: formData.title.trim(),
        description: formData.description.trim() || formData.title.trim(),
        link: formData.link.trim(),
        sourceId: 'manual',
        sourceName: formData.sourceName.trim(),
        themes: ['manual']
      });
      onClose();
    } catch (err) {
      setError((err as Error).message || 'Erro ao adicionar notícia');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, onSubmit, onClose]);

  const footer = (
    <div className={CSS.modalFooter}>
      <button
        type="button"
        onClick={onClose}
        disabled={isSubmitting}
        className={CSS.btnSecondary}
      >
        Cancelar
      </button>
      <button
        type="submit"
        form="manual-news-form"
        disabled={isSubmitting}
        className={`${CSS.btnBlue} flex items-center gap-2`}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Adicionando...
          </>
        ) : (
          <>
            <Plus className="w-4 h-4" />
            Adicionar
          </>
        )}
      </button>
    </div>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Adicionar Notícia"
      subtitle="Adicione uma notícia manualmente ao feed"
      icon={<Plus className="w-5 h-5 text-white" />}
      iconColor="green"
      size="md"
      footer={footer}
      preventClose={isSubmitting}
    >
      <form id="manual-news-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Título */}
        <div>
          <label className={CSS.label}>
            <span className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Título *
            </span>
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="Título da notícia"
            className={CSS.input}
            disabled={isSubmitting}
            autoFocus
          />
        </div>

        {/* Link */}
        <div>
          <label className={CSS.label}>
            <span className="flex items-center gap-2">
              <Link className="w-4 h-4" />
              Link *
            </span>
          </label>
          <input
            type="url"
            name="link"
            value={formData.link}
            onChange={handleChange}
            placeholder="https://..."
            className={CSS.input}
            disabled={isSubmitting}
          />
        </div>

        {/* Fonte */}
        <div>
          <label className={CSS.label}>
            <span className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Fonte *
            </span>
          </label>
          <input
            type="text"
            name="sourceName"
            value={formData.sourceName}
            onChange={handleChange}
            placeholder="Nome do site ou portal"
            className={CSS.input}
            disabled={isSubmitting}
          />
        </div>

        {/* Descrição */}
        <div>
          <label className={CSS.label}>
            Descrição (opcional)
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Breve descrição da notícia"
            rows={3}
            className={`${CSS.input} resize-none`}
            disabled={isSubmitting}
          />
        </div>

        {/* Erro */}
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}
      </form>
    </BaseModal>
  );
};

export default ManualInput;
