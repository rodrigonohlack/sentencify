/**
 * @file useAutoSave.ts
 * @description Auto-save no IndexedDB com debounce. Observa mudanças em
 *              useSynthesisStore e useDraftStore.
 */

import { useEffect, useRef } from 'react';
import {
  useSynthesisStore,
  useDocumentStore,
  useDraftStore
} from '../stores';
import { saveMinuta } from '../services/localHistoryService';
import type { SavedEmbargos, SavedDocumentMeta, DocumentSlot } from '../types';

const DEBOUNCE_MS = 1000;
const SLOT_ORDER: DocumentSlot[] = ['decisaoEmbargada', 'embargos', 'contrarrazoes', 'inicial', 'contestacao'];

function buildRecord(): SavedEmbargos | null {
  const synth = useSynthesisStore.getState();
  const docs = useDocumentStore.getState();
  const draft = useDraftStore.getState();

  if (!synth.synthesis) return null;

  const id = synth.savedId ?? crypto.randomUUID();
  const now = Date.now();

  const documents: SavedDocumentMeta[] = SLOT_ORDER
    .map(slot => docs[slot])
    .filter((d): d is NonNullable<typeof d> => d !== null)
    .map(d => ({ slot: d.slot, name: d.name, size: d.size }));

  const numero = synth.synthesis.identificacao.numeroProcesso;
  const titulo = numero ?? `Embargos sem número — ${new Date(now).toLocaleString('pt-BR')}`;

  return {
    id,
    createdAt: synth.savedCreatedAt ?? now,
    updatedAt: now,
    titulo,
    documents,
    synthesis: synth.synthesis,
    draft: draft.draft
  };
}

export function useAutoSave() {
  const synthesis = useSynthesisStore(s => s.synthesis);
  const draft = useDraftStore(s => s.draft);
  const setSavedId = useSynthesisStore(s => s.setSavedId);
  const setSavedCreatedAt = useSynthesisStore(s => s.setSavedCreatedAt);
  const savedId = useSynthesisStore(s => s.savedId);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!synthesis) return;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(async () => {
      const record = buildRecord();
      if (!record) return;
      try {
        await saveMinuta(record);
        if (!savedId) {
          setSavedId(record.id);
          setSavedCreatedAt(record.createdAt);
        }
      } catch (err) {
        console.warn('[embargos] auto-save falhou:', err);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [synthesis, draft, savedId, setSavedId, setSavedCreatedAt]);
}

/** Save imediato — usado ao aceitar refino. */
export async function saveNow(): Promise<void> {
  const record = buildRecord();
  if (!record) return;
  await saveMinuta(record);
}
