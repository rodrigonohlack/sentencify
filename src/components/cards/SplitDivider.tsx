/**
 * @file SplitDivider.tsx
 * @description Divisor arrastável para split window (v1.9.21)
 * @version 1.36.82
 */

import React from 'react';

export interface SplitDividerProps {
  onDragStart: (e: React.MouseEvent) => void;
}

export const SplitDivider = React.memo(({ onDragStart }: SplitDividerProps) => {
  const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    onDragStart(e);
  }, [onDragStart]);

  return (
    <div
      className="split-divider"
      onMouseDown={handleMouseDown}
    >
      <div className="split-divider-handle">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5h2v14H8zM14 5h2v14h-2z" />
        </svg>
      </div>
    </div>
  );
});

SplitDivider.displayName = 'SplitDivider';
