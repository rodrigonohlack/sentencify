/**
 * @file useTimestampFala.ts
 * @description Hook que resolve um timestamp ("7m 06s") para a fala correspondente
 *              ({ deponente, texto }), a partir das sínteses detalhadas do resultado.
 *              Usado pelo TimestampBadge para exibir a fala no hover.
 */

import { useMemo, useCallback } from 'react';
import { useProvaOralStore } from '../stores/useProvaOralStore';
import {
  buildTimestampIndex,
  parseTimestampToSeconds,
  type FalaPorTimestamp,
} from '../utils/analysis-helpers';

/**
 * Retorna uma função `lookup(timestamp)` que devolve a fala ({ deponente, texto })
 * daquele instante, ou `null` se não houver correspondência (ou sem resultado).
 * O índice é memoizado por identidade de `sinteses`/`depoentes`.
 */
export function useTimestampFala(): (timestamp: string) => FalaPorTimestamp | null {
  const sinteses = useProvaOralStore((s) => s.result?.sinteses);
  const depoentes = useProvaOralStore((s) => s.result?.depoentes);

  const index = useMemo(() => buildTimestampIndex(sinteses, depoentes), [sinteses, depoentes]);

  return useCallback(
    (timestamp: string) => {
      const secs = parseTimestampToSeconds(timestamp);
      if (secs === null) return null;
      return index.get(secs) ?? null;
    },
    [index]
  );
}

export default useTimestampFala;
