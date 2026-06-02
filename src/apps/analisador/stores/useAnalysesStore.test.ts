/**
 * @file useAnalysesStore.test.ts
 * @description Testes para o store do app Analisador (progresso de lote)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useAnalysesStore } from './useAnalysesStore';

describe('useAnalysesStore - progresso de lote', () => {
  beforeEach(() => {
    useAnalysesStore.getState().resetBatch();
  });

  it('startBatch zera os contadores herdados do lote anterior', () => {
    const store = useAnalysesStore.getState();

    // Simula um lote anterior concluído com 2 processos.
    store.setBatchProgress(2, 2, 2, 0);
    expect(useAnalysesStore.getState().batch.processedCount).toBe(2);

    // Novo lote com 1 processo: deve zerar os contadores e fixar o total novo.
    store.startBatch(1);

    const batch = useAnalysesStore.getState().batch;
    expect(batch.isProcessing).toBe(true);
    expect(batch.processedCount).toBe(0);
    expect(batch.errorCount).toBe(0);
    expect(batch.currentIndex).toBe(0);
    expect(batch.totalFiles).toBe(1);
  });

  it('sem reset, o numerador do progresso herdaria a contagem anterior (bug "2 de 1")', () => {
    const store = useAnalysesStore.getState();

    // Lote anterior: 2 processos analisados.
    store.setBatchProgress(2, 2, 2, 0);

    // REGRESSÃO: se o novo lote (1 processo) apenas ativasse isProcessing
    // sem zerar, processedCount + errorCount = 2 sobre pairs.length = 1 → 200%.
    store.setBatchProcessing(true);
    const stale = useAnalysesStore.getState().batch;
    expect(stale.processedCount + stale.errorCount).toBe(2); // estado problemático

    // startBatch corrige: numerador volta a 0 antes do primeiro par concluir.
    store.startBatch(1);
    const fixed = useAnalysesStore.getState().batch;
    expect(fixed.processedCount + fixed.errorCount).toBe(0);
  });
});
