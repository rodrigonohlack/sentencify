import { describe, it, expect, beforeEach } from 'vitest';
import { useManualCallStore } from './useManualCallStore';
import { ManualCancelledError, ManualUnsupportedError } from '../utils/manualCall';

describe('useManualCallStore', () => {
  beforeEach(() => {
    useManualCallStore.setState({ pending: null });
  });

  it('enqueue seta pending e resolve com o texto confirmado', async () => {
    const p = useManualCallStore.getState().enqueue('PROMPT');
    expect(useManualCallStore.getState().pending?.prompt).toBe('PROMPT');
    useManualCallStore.getState().resolveCurrent('RESPOSTA');
    await expect(p).resolves.toBe('RESPOSTA');
    expect(useManualCallStore.getState().pending).toBeNull();
  });

  it('rejectCurrent rejeita com ManualCancelledError por padrão', async () => {
    const p = useManualCallStore.getState().enqueue('PROMPT');
    useManualCallStore.getState().rejectCurrent();
    await expect(p).rejects.toBeInstanceOf(ManualCancelledError);
    expect(useManualCallStore.getState().pending).toBeNull();
  });

  it('chamada concorrente (sem resolver a anterior) é rejeitada', async () => {
    const p1 = useManualCallStore.getState().enqueue('A');
    const p2 = useManualCallStore.getState().enqueue('B');
    await expect(p2).rejects.toBeInstanceOf(ManualUnsupportedError);
    useManualCallStore.getState().resolveCurrent('ok');
    await expect(p1).resolves.toBe('ok');
  });

  it('chamadas sequenciais (await) resolvem ambas', async () => {
    const p1 = useManualCallStore.getState().enqueue('A');
    useManualCallStore.getState().resolveCurrent('r1');
    await expect(p1).resolves.toBe('r1');
    const p2 = useManualCallStore.getState().enqueue('B', { title: 'fase 2' });
    expect(useManualCallStore.getState().pending?.meta?.title).toBe('fase 2');
    useManualCallStore.getState().resolveCurrent('r2');
    await expect(p2).resolves.toBe('r2');
  });
});
