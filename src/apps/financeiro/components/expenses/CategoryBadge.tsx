import { useState, useCallback, useRef } from 'react';
import CategoryPicker from './CategoryPicker';

interface CategoryBadgeProps {
  categoryId: string | null;
  categoryName?: string;
  categoryColor?: string;
  onCategoryChange?: (categoryId: string | null) => void;
}

export default function CategoryBadge({ categoryId, categoryName, categoryColor, onCategoryChange }: CategoryBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const badgeRef = useRef<HTMLButtonElement>(null);

  const handleClick = useCallback(() => {
    if (!onCategoryChange || !badgeRef.current) return;
    setIsOpen(true);
  }, [onCategoryChange]);

  const handleSelect = useCallback((newCategoryId: string | null) => {
    setIsOpen(false);
    if (newCategoryId !== categoryId) {
      onCategoryChange?.(newCategoryId);
    }
  }, [categoryId, onCategoryChange]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const isInteractive = !!onCategoryChange;

  // ═══════════════════════════════════════════════════════
  // "Sem categoria" state
  // ═══════════════════════════════════════════════════════
  if (!categoryId || !categoryName) {
    if (isInteractive) {
      return (
        <>
          <button
            ref={badgeRef}
            onClick={handleClick}
            className="inline-flex px-3 py-1 rounded-[10px] text-[11px] font-semibold bg-gray-100/50 dark:bg-gray-700/50 text-gray-400 backdrop-blur-sm cursor-pointer hover:ring-2 hover:ring-indigo-300/50 dark:hover:ring-indigo-400/30 transition-all"
          >
            Sem categoria
          </button>
          {isOpen && badgeRef.current && (
            <CategoryPicker
              anchorRect={badgeRef.current.getBoundingClientRect()}
              currentCategoryId={null}
              onSelect={handleSelect}
              onClose={handleClose}
            />
          )}
        </>
      );
    }

    return (
      <span className="inline-flex px-3 py-1 rounded-[10px] text-[11px] font-semibold bg-gray-100/50 dark:bg-gray-700/50 text-gray-400 backdrop-blur-sm">
        Sem categoria
      </span>
    );
  }

  // ═══════════════════════════════════════════════════════
  // Badge with category
  // ═══════════════════════════════════════════════════════
  const color = categoryColor || '#94a3b8';

  if (isInteractive) {
    return (
      <>
        <button
          ref={badgeRef}
          onClick={handleClick}
          className="inline-flex px-3 py-1 rounded-[10px] text-[11px] font-semibold backdrop-blur-sm cursor-pointer hover:ring-2 hover:ring-indigo-300/50 dark:hover:ring-indigo-400/30 transition-all"
          style={{ backgroundColor: color + '18', color }}
        >
          {categoryName}
        </button>
        {isOpen && badgeRef.current && (
          <CategoryPicker
            anchorRect={badgeRef.current.getBoundingClientRect()}
            currentCategoryId={categoryId}
            onSelect={handleSelect}
            onClose={handleClose}
          />
        )}
      </>
    );
  }

  return (
    <span
      className="inline-flex px-3 py-1 rounded-[10px] text-[11px] font-semibold backdrop-blur-sm"
      style={{ backgroundColor: color + '18', color }}
    >
      {categoryName}
    </span>
  );
}
