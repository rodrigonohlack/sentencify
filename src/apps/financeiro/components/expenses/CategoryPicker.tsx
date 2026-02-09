import { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { CATEGORIES } from '../../constants/categories';

interface CategoryPickerProps {
  anchorRect: DOMRect;
  currentCategoryId: string | null;
  onSelect: (categoryId: string | null) => void;
  onClose: () => void;
}

export default function CategoryPicker({ anchorRect, currentCategoryId, onSelect, onClose }: CategoryPickerProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  // ═══════════════════════════════════════════════════════
  // Positioning: below badge by default, above if no space
  // ═══════════════════════════════════════════════════════
  const getPosition = useCallback(() => {
    const popoverWidth = 320;
    const popoverHeight = 360;
    const gap = 6;

    let top = anchorRect.bottom + gap;
    let left = anchorRect.left;

    // Flip above if not enough space below
    if (top + popoverHeight > window.innerHeight - 8) {
      top = anchorRect.top - popoverHeight - gap;
    }

    // Clamp horizontally
    if (left + popoverWidth > window.innerWidth - 8) {
      left = window.innerWidth - popoverWidth - 8;
    }
    if (left < 8) left = 8;

    return { top, left };
  }, [anchorRect]);

  // ═══════════════════════════════════════════════════════
  // Close on outside click (mousedown) or Escape
  // ═══════════════════════════════════════════════════════
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const pos = getPosition();

  const popover = (
    <div
      ref={popoverRef}
      role="listbox"
      className="fixed z-[100] w-[320px] max-h-[360px] overflow-y-auto rounded-2xl border border-white/60 dark:border-white/[0.12] bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl shadow-xl shadow-black/10 dark:shadow-black/30 p-2"
      style={{ top: pos.top, left: pos.left }}
    >
      {/* "Sem categoria" option */}
      <button
        role="option"
        aria-selected={currentCategoryId === null}
        onClick={() => onSelect(null)}
        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-[12px] font-medium transition-colors ${
          currentCategoryId === null
            ? 'bg-indigo-50 dark:bg-indigo-500/15 ring-1 ring-indigo-300/50 dark:ring-indigo-400/30 text-indigo-700 dark:text-indigo-300'
            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
        }`}
      >
        <span className="w-3.5 h-3.5 rounded-full bg-gray-300 dark:bg-gray-600 flex-shrink-0" />
        Sem categoria
      </button>

      <div className="h-px bg-gray-200/60 dark:bg-white/10 my-1.5" />

      {/* Categories grid */}
      <div className="grid grid-cols-2 gap-0.5">
        {CATEGORIES.map((cat) => {
          const isSelected = cat.id === currentCategoryId;
          return (
            <button
              key={cat.id}
              role="option"
              aria-selected={isSelected}
              onClick={() => onSelect(cat.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-left text-[12px] font-medium transition-colors ${
                isSelected
                  ? 'bg-indigo-50 dark:bg-indigo-500/15 ring-1 ring-indigo-300/50 dark:ring-indigo-400/30'
                  : 'hover:bg-gray-50 dark:hover:bg-white/5'
              }`}
            >
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: cat.color }}
              />
              <span className={isSelected ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-300'}>
                {cat.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  return createPortal(popover, document.body);
}
