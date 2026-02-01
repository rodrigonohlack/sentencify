/**
 * @file SharingSection.tsx
 * @description Seção de compartilhamento de análises no modal de configurações
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Users, Search, Loader2, Check, Share2 } from 'lucide-react';
import { useProvaOralAPI } from '../../hooks';
import type { User } from '../../types';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════

/** Tempo de debounce para salvar alterações (ms) */
const SAVE_DEBOUNCE_MS = 500;

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Seção de compartilhamento de análises de Prova Oral
 * Permite selecionar quais usuários podem ver todas as suas análises
 */
export const SharingSection: React.FC = () => {
  const { fetchUsers, fetchSharing, updateSharing } = useProvaOralAPI();

  // ═══════════════════════════════════════════════════════════════════════════
  // ESTADO
  // ═══════════════════════════════════════════════════════════════════════════

  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Ref para debounce
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ═══════════════════════════════════════════════════════════════════════════
  // CARREGAR DADOS INICIAIS
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [users, recipients] = await Promise.all([
          fetchUsers(),
          fetchSharing(),
        ]);
        setAvailableUsers(users);
        setSelectedIds(new Set(recipients.map((r) => r.id)));
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [fetchUsers, fetchSharing]);

  // ═══════════════════════════════════════════════════════════════════════════
  // SALVAR ALTERAÇÕES (COM DEBOUNCE)
  // ═══════════════════════════════════════════════════════════════════════════

  const saveChanges = useCallback(
    async (ids: Set<string>) => {
      setIsSaving(true);
      setSaveSuccess(false);
      try {
        const success = await updateSharing(Array.from(ids));
        if (success) {
          setSaveSuccess(true);
          setTimeout(() => setSaveSuccess(false), 2000);
        }
      } finally {
        setIsSaving(false);
      }
    },
    [updateSharing]
  );

  const debouncedSave = useCallback(
    (ids: Set<string>) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        saveChanges(ids);
      }, SAVE_DEBOUNCE_MS);
    },
    [saveChanges]
  );

  // Limpar timeout ao desmontar
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // TOGGLE SELEÇÃO
  // ═══════════════════════════════════════════════════════════════════════════

  const toggleUser = useCallback(
    (userId: string) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(userId)) {
          next.delete(userId);
        } else {
          next.add(userId);
        }
        debouncedSave(next);
        return next;
      });
    },
    [debouncedSave]
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // FILTRAR USUÁRIOS
  // ═══════════════════════════════════════════════════════════════════════════

  const filteredUsers = availableUsers.filter((user) =>
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Share2 className="w-4 h-4 text-purple-500" />
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Compartilhamento
          </h3>
        </div>
        {/* Indicador de status */}
        <div className="flex items-center gap-2">
          {isSaving && (
            <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
              <Loader2 className="w-3 h-3 animate-spin" />
              Salvando...
            </span>
          )}
          {saveSuccess && (
            <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
              <Check className="w-3 h-3" />
              Salvo
            </span>
          )}
        </div>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
        Selecione quem pode ver todas as suas análises de prova oral:
      </p>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        </div>
      ) : availableUsers.length === 0 ? (
        <div className="text-center py-6">
          <Users className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Nenhum outro usuário cadastrado
          </p>
        </div>
      ) : (
        <>
          {/* Campo de busca */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar usuários..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Lista de usuários */}
          <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
            {filteredUsers.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 py-2 text-center">
                Nenhum usuário encontrado
              </p>
            ) : (
              filteredUsers.map((user) => (
                <label
                  key={user.id}
                  className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(user.id)}
                    onChange={() => toggleUser(user.id)}
                    className="w-4 h-4 text-purple-600 border-slate-300 dark:border-slate-600 rounded focus:ring-purple-500 bg-white dark:bg-slate-700"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-200 truncate">
                    {user.email}
                  </span>
                </label>
              ))
            )}
          </div>

          {/* Contador */}
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {selectedIds.size === 0
                ? 'Nenhum usuário com acesso'
                : selectedIds.size === 1
                  ? '1 usuário com acesso'
                  : `${selectedIds.size} usuários com acesso`}
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default SharingSection;
