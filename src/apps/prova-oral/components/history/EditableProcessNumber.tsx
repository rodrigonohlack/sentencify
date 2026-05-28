/**
 * @file EditableProcessNumber.tsx
 * @description Subcomponente para edição inline do número do processo
 *              em cards do histórico. Sem conhecimento de store ou API —
 *              recebe `value`, `canEdit`, `onSave` e gerencia somente o
 *              modo de edição local. O caller é responsável por persistir.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pencil, Loader2 } from 'lucide-react';

interface EditableProcessNumberProps {
  /** Número atual (null = não identificado). */
  value: string | null;
  /** Mostra o lápis somente quando true (regra: análise própria). */
  canEdit: boolean;
  /** Herda a cor do texto do estado de seleção do card. */
  isSelected: boolean;
  /**
   * Callback chamado ao confirmar a edição (Enter ou blur).
   * Recebe o novo valor trimmado, ou null se foi esvaziado.
   * Não é chamado se o valor não mudou ou se o usuário cancelou (Esc).
   */
  onSave: (newValue: string | null) => Promise<void>;
}

const FALLBACK_LABEL = 'Processo não identificado';

export const EditableProcessNumber: React.FC<EditableProcessNumberProps> = ({
  value,
  canEdit,
  isSelected,
  onSave,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focar e selecionar todo o texto ao entrar em edição.
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setLocalValue(value ?? '');
      setIsEditing(true);
    },
    [value]
  );

  const handleSave = useCallback(async () => {
    const trimmed = localValue.trim();
    const normalized = trimmed === '' ? null : trimmed;

    // Sem mudança → só sai do modo edição sem chamar onSave.
    if (normalized === (value ?? null) || (normalized === null && value === null)) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(normalized);
    } finally {
      setIsSaving(false);
      setIsEditing(false);
    }
  }, [localValue, value, onSave]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        e.preventDefault();
        void handleSave();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      }
    },
    [handleSave, handleCancel]
  );

  const textColor = isSelected
    ? 'text-indigo-700 dark:text-indigo-300'
    : 'text-slate-800 dark:text-slate-100';

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => void handleSave()}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          disabled={isSaving}
          className={`
            font-medium px-2 py-0.5 rounded-md border border-indigo-300 dark:border-indigo-600
            bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100
            focus:outline-none focus:ring-2 focus:ring-indigo-500
            disabled:opacity-60
            min-w-0 flex-1
          `}
          placeholder="Número do processo"
        />
        {isSaving && (
          <Loader2 className="w-4 h-4 text-indigo-500 animate-spin flex-shrink-0" />
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <p className={`font-medium truncate ${textColor}`}>
        {value || FALLBACK_LABEL}
      </p>
      {canEdit && (
        <button
          type="button"
          onClick={handleStartEdit}
          onMouseDown={(e) => e.stopPropagation()}
          className="
            flex-shrink-0 p-1 rounded-md text-slate-400 dark:text-slate-500
            hover:text-indigo-600 dark:hover:text-indigo-400
            hover:bg-indigo-50 dark:hover:bg-indigo-900/30
            transition-colors
          "
          title="Renomear processo"
          aria-label="Renomear processo"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

export default EditableProcessNumber;
