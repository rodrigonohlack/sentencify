/**
 * @file ManualCallModal.tsx
 * @description Modal do modo "Sem Provider (copiar/colar)": exibe o prompt para
 * o usuário copiar, aceita a resposta colada de qualquer LLM e resolve/rejeita
 * a Promise pendente no useManualCallStore.
 */

import React from 'react';
import { ClipboardCopy, Check } from 'lucide-react';
import { BaseModal, CSS } from './BaseModal';
import { Button } from '../ui/Button';
import { useManualCallStore } from '../../stores/useManualCallStore';

/**
 * Modal global do modo "Sem Provider".
 * Auto-oculta quando não há chamada pendente (pending === null).
 * Montado em ModalRoot — sem prop drilling.
 */
export const ManualCallModal: React.FC = () => {
  const pending = useManualCallStore((s) => s.pending);
  const resolveCurrent = useManualCallStore((s) => s.resolveCurrent);
  const rejectCurrent = useManualCallStore((s) => s.rejectCurrent);

  const [response, setResponse] = React.useState('');
  const [copied, setCopied] = React.useState(false);

  // Limpa o formulário sempre que uma nova chamada entrar na fila
  React.useEffect(() => {
    setResponse('');
    setCopied(false);
  }, [pending?.id]);

  if (!pending) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pending.prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard indisponível: usuário seleciona o texto manualmente */
    }
  };

  const handleConfirm = () => {
    if (!response.trim()) return;
    resolveCurrent(response);
  };

  const handleCancel = () => rejectCurrent();

  return (
    <BaseModal
      isOpen
      onClose={handleCancel}
      title={pending.meta?.title || 'Chamada manual'}
      subtitle="Sem Provider · copie o prompt, gere a resposta em qualquer LLM e cole abaixo"
      icon={<ClipboardCopy />}
      iconColor="blue"
      size="lg"
      // O modal manual precisa ficar acima de qualquer overlay de geração
      // (ex.: popover do Ctrl+K em z-[120]), pois é o que o usuário precisa usar.
      overlayClassName={CSS.modalOverlay.replace('z-[90]', 'z-[130]')}
      footer={
        <div className="flex justify-end gap-2 w-full">
          <Button variant="secondary" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={!response.trim()}
          >
            Confirmar
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Prompt para copiar */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold theme-text-muted">PROMPT</label>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              icon={copied ? <Check className="w-4 h-4" /> : <ClipboardCopy className="w-4 h-4" />}
            >
              {copied ? 'Copiado' : 'Copiar'}
            </Button>
          </div>
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg p-3 text-sm theme-bg-secondary-30 theme-text-primary border theme-border-input">
            {pending.prompt}
          </pre>
        </div>

        {/* Área de cola da resposta */}
        <div>
          <label className="block text-xs font-semibold theme-text-muted mb-1">
            RESPOSTA (cole aqui)
          </label>
          <textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            rows={8}
            autoFocus
            className="w-full rounded-lg p-3 text-sm resize-y theme-bg-secondary-30 theme-text-primary border theme-border-input focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Cole aqui a resposta gerada pelo seu LLM…"
          />
        </div>
      </div>
    </BaseModal>
  );
};

export default ManualCallModal;
