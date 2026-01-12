/**
 * @file VirtualList.tsx
 * @description Componente de virtual scrolling para listas grandes
 * @version 1.36.86
 *
 * Extraido do App.tsx como parte da FASE 3 de refatoracao.
 * v1.19.2: Adicionado suporte a expandedIds para items com altura dinamica
 * v1.35.79: Generic component with proper React.memo typing
 */

import React from 'react';
import type { VirtualListProps } from '../../types';

function VirtualListBase<T>({ items, itemHeight, renderItem, className = '', overscan = 5, expandedIds = new Set() }: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = React.useState(0);
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  // Calcular viewport height dinamicamente
  const viewportHeight = React.useMemo(() => {
    if (typeof window === 'undefined') return 600;
    return Math.min(window.innerHeight - 200, 800); // Max 800px
  }, []);

  // Calcular range de items visiveis
  const { visibleStart, visibleEnd, offsetY } = React.useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight);
    const end = Math.ceil((scrollTop + viewportHeight) / itemHeight);

    return {
      visibleStart: Math.max(0, start - overscan),
      visibleEnd: Math.min(items.length, end + overscan),
      offsetY: Math.max(0, start - overscan) * itemHeight
    };
  }, [scrollTop, itemHeight, viewportHeight, items.length, overscan]);

  // Items visiveis + buffer
  const visibleItems = React.useMemo(() => {
    return items.slice(visibleStart, visibleEnd);
  }, [items, visibleStart, visibleEnd]);

  // Handler de scroll com RAF para performance
  const handleScroll = React.useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = (e.target as HTMLDivElement).scrollTop;
    // So atualizar se mudou significativamente (> 10px)
    if (Math.abs(newScrollTop - scrollTop) > 10) {
      requestAnimationFrame(() => {
        setScrollTop(newScrollTop);
      });
    }
  }, [scrollTop]);

  // Total height para manter scrollbar correto
  const totalHeight = items.length * itemHeight;

  return (
    <div
      ref={containerRef}
      className={`virtual-list-container ${className}`}
      style={{
        height: viewportHeight,
        overflow: 'auto',
        position: 'relative'
      }}
      onScroll={handleScroll}
    >
      {/* Spacer para altura total */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {/* Container para items visiveis */}
        <div style={{
          position: 'absolute',
          top: offsetY,
          left: 0,
          right: 0
        }}>
          {visibleItems.map((item, idx) => {
            const absoluteIndex = visibleStart + idx;
            const itemWithId = item as { id?: string | number };
            const isExpanded = itemWithId.id ? expandedIds.has(String(itemWithId.id)) : false;
            return (
              <div
                key={itemWithId.id ?? absoluteIndex}
                style={isExpanded ? {
                  position: 'relative',
                  zIndex: 10,
                  paddingBottom: '12px'
                } : {
                  height: itemHeight,
                  overflow: 'hidden'
                }}
              >
                {renderItem(item, absoluteIndex)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Create memoized version with proper generic support
export const VirtualList = React.memo(VirtualListBase) as <T>(props: VirtualListProps<T>) => React.ReactElement;

(VirtualList as React.FC).displayName = 'VirtualList';
