import { useCallback } from 'react';
import { useRecurringStore } from '../stores/useRecurringStore';
import { useUIStore } from '../stores/useUIStore';
import { apiFetch } from '../utils/api';
import { ENDPOINTS } from '../constants/api';
import type { RecurringExpense, Reminder } from '../types';

export function useRecurring() {
  const { setRecurring, setReminders, setLoading } = useRecurringStore();
  const addToast = useUIStore((s) => s.addToast);

  const fetchRecurring = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ recurring: RecurringExpense[] }>(ENDPOINTS.RECURRING);
      setRecurring(data.recurring);
    } catch {
      addToast('Erro ao carregar recorrências', 'error');
    } finally {
      setLoading(false);
    }
  }, [setRecurring, setLoading, addToast]);

  const createRecurring = useCallback(async (data: Partial<RecurringExpense>) => {
    try {
      const result = await apiFetch<{ recurring: RecurringExpense }>(ENDPOINTS.RECURRING, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      addToast('Recorrência criada', 'success');
      return result.recurring;
    } catch {
      addToast('Erro ao criar recorrência', 'error');
    }
  }, [addToast]);

  const updateRecurring = useCallback(async (id: string, data: Partial<RecurringExpense>) => {
    try {
      await apiFetch(`${ENDPOINTS.RECURRING}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      addToast('Recorrência atualizada', 'success');
    } catch {
      addToast('Erro ao atualizar recorrência', 'error');
    }
  }, [addToast]);

  const deleteRecurring = useCallback(async (id: string) => {
    try {
      await apiFetch(`${ENDPOINTS.RECURRING}/${id}`, { method: 'DELETE' });
      addToast('Recorrência removida', 'success');
    } catch {
      addToast('Erro ao remover recorrência', 'error');
    }
  }, [addToast]);

  const toggleRecurring = useCallback(async (id: string) => {
    try {
      const result = await apiFetch<{ is_active: number }>(`${ENDPOINTS.RECURRING}/${id}/toggle`, {
        method: 'POST',
      });
      addToast(result.is_active ? 'Recorrência ativada' : 'Recorrência pausada', 'info');
    } catch {
      addToast('Erro ao alterar recorrência', 'error');
    }
  }, [addToast]);

  const generateMonth = useCallback(async (month?: string) => {
    try {
      const result = await apiFetch<{ generated: number; skipped: number }>(ENDPOINTS.RECURRING_GENERATE, {
        method: 'POST',
        body: JSON.stringify({ month }),
      });
      addToast(`${result.generated} despesas geradas (${result.skipped} já existentes)`, 'success');
      return result;
    } catch {
      addToast('Erro ao gerar despesas recorrentes', 'error');
    }
  }, [addToast]);

  const fetchReminders = useCallback(async () => {
    try {
      const data = await apiFetch<{ reminders: Reminder[] }>(ENDPOINTS.RECURRING_REMINDERS);
      setReminders(data.reminders);
    } catch {
      // Silent - reminders are optional
    }
  }, [setReminders]);

  return {
    fetchRecurring, createRecurring, updateRecurring, deleteRecurring,
    toggleRecurring, generateMonth, fetchReminders,
  };
}
