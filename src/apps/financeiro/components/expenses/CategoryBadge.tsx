interface CategoryBadgeProps {
  categoryId: string | null;
  categoryName?: string;
  categoryColor?: string;
}

export default function CategoryBadge({ categoryId, categoryName }: CategoryBadgeProps) {
  if (!categoryId || !categoryName) {
    return (
      <span className="inline-flex px-3 py-1 rounded-[10px] text-[11px] font-semibold bg-gray-100/50 dark:bg-gray-700/50 text-gray-400 backdrop-blur-sm">
        Sem categoria
      </span>
    );
  }

  return (
    <span
      className={`inline-flex px-3 py-1 rounded-[10px] text-[11px] font-semibold backdrop-blur-sm cat-${categoryId}`}
    >
      {categoryName}
    </span>
  );
}
