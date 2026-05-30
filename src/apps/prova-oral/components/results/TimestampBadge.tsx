/**
 * @file TimestampBadge.tsx
 * @description Pill de timestamp (ícone de relógio + "Xm Ys") com tooltip de hover
 *              que mostra o depoente + a fala daquele instante. A fala é resolvida
 *              a partir das sínteses detalhadas via useTimestampFala. Sem fala
 *              casável, o pill é renderizado normalmente, sem tooltip.
 *
 *              Componente único compartilhado pelas tabs (antes duplicado em
 *              ContradicoesTab, ConfissoesTab e SintesesTab).
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Clock } from 'lucide-react';
import { useTimestampFala } from '../../hooks/useTimestampFala';
import type { FalaPorTimestamp } from '../../utils/analysis-helpers';

interface TimestampBadgeProps {
  timestamp: string;
}

/** Tooltip flutuante (portal) com depoente + fala, ajustado à viewport. */
const FalaTooltip: React.FC<{ fala: FalaPorTimestamp; anchor: { x: number; y: number } }> = ({
  fala,
  anchor,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(anchor);

  useEffect(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let x = anchor.x;
    let y = anchor.y;
    if (x + rect.width > vw - 16) x = vw - rect.width - 16;
    if (x < 16) x = 16;
    // Se não couber abaixo do badge, abre acima.
    if (y + rect.height > vh - 16) y = anchor.y - rect.height - 28;
    if (y < 16) y = 16;
    setPos({ x, y });
  }, [anchor]);

  return createPortal(
    <div
      ref={ref}
      style={{ position: 'fixed', left: pos.x, top: pos.y, zIndex: 9999, maxWidth: 360 }}
      className="px-3 py-2 rounded-lg shadow-lg border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs pointer-events-none"
    >
      <p className="font-semibold text-slate-800 dark:text-slate-100 mb-0.5">{fala.deponente}</p>
      <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{fala.texto}</p>
    </div>,
    document.body
  );
};

export const TimestampBadge: React.FC<TimestampBadgeProps> = ({ timestamp }) => {
  const lookup = useTimestampFala();
  const fala = lookup(timestamp);
  const badgeRef = useRef<HTMLSpanElement>(null);
  const [hover, setHover] = useState(false);
  const [anchor, setAnchor] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const show = useCallback(() => {
    if (!fala || !badgeRef.current) return;
    const r = badgeRef.current.getBoundingClientRect();
    setAnchor({ x: r.left, y: r.bottom + 6 });
    setHover(true);
  }, [fala]);

  const hide = useCallback(() => setHover(false), []);

  return (
    <span
      ref={badgeRef}
      onMouseEnter={show}
      onMouseLeave={hide}
      className={`inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs rounded-full font-mono flex-shrink-0${fala ? ' cursor-help' : ''}`}
    >
      <Clock className="w-3 h-3" />
      {timestamp}
      {hover && fala && <FalaTooltip fala={fala} anchor={anchor} />}
    </span>
  );
};

export default TimestampBadge;
