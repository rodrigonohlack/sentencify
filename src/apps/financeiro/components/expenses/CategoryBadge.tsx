interface CategoryBadgeProps {
  categoryId: string | null;
  categoryName?: string;
  categoryColor?: string;
}

export default function CategoryBadge({ categoryId, categoryName, categoryColor }: CategoryBadgeProps) {
  if (!categoryId || !categoryName) {
    return (
      <span className="inline-flex px-3 py-1 rounded-[10px] text-[11px] font-semibold bg-gray-100/50 dark:bg-gray-700/50 text-gray-400 backdrop-blur-sm">
        Sem categoria
      </span>
    );
  }

  const color = categoryColor || '#94a3b8';

  return (
    <span
      className="inline-flex px-3 py-1 rounded-[10px] text-[11px] font-semibold backdrop-blur-sm"
      style={{ backgroundColor: color + '18', color }}
    >
      {categoryName}
    </span>
  );
}
