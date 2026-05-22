/**
 * @file useLocalHistory.ts
 * @description Wrapper React em torno do localHistoryService (IndexedDB).
 */

import { useCallback, useEffect, useState } from 'react';
import {
  listMinutas,
  getMinuta,
  saveMinuta,
  deleteMinuta
} from '../services/localHistoryService';
import type { SavedEmbargos } from '../types';

export function useLocalHistory() {
  const [items, setItems] = useState<SavedEmbargos[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const list = await listMinutas();
    setItems(list);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const save = useCallback(async (record: SavedEmbargos) => {
    await saveMinuta(record);
    await refresh();
  }, [refresh]);

  const remove = useCallback(async (id: string) => {
    await deleteMinuta(id);
    await refresh();
  }, [refresh]);

  const load = useCallback(async (id: string) => {
    return await getMinuta(id);
  }, []);

  return { items, isLoading, refresh, save, remove, load };
}
