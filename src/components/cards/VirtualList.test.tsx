/**
 * @file VirtualList.test.tsx
 * @description Testes para o componente VirtualList (virtual scrolling)
 * @version 1.38.49
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VirtualList } from './VirtualList';

describe('VirtualList', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  const createItems = (count: number) =>
    Array.from({ length: count }, (_, i) => ({
      id: `item-${i}`,
      label: `Item ${i}`,
    }));

  const defaultRenderItem = (item: { id: string; label: string }, index: number) => (
    <div data-testid={`item-${index}`} key={item.id}>
      {item.label}
    </div>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.innerHeight for viewport calculation
    Object.defineProperty(window, 'innerHeight', { value: 800, writable: true });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERING TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Rendering', () => {
    it('should render the container', () => {
      const items = createItems(10);
      const { container } = render(
        <VirtualList
          items={items}
          itemHeight={50}
          renderItem={defaultRenderItem}
        />
      );
      expect(container.querySelector('.virtual-list-container')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const items = createItems(5);
      const { container } = render(
        <VirtualList
          items={items}
          itemHeight={50}
          renderItem={defaultRenderItem}
          className="custom-class"
        />
      );
      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });

    it('should render visible items within viewport', () => {
      const items = createItems(5);
      render(
        <VirtualList
          items={items}
          itemHeight={50}
          renderItem={defaultRenderItem}
        />
      );
      // With viewport of 600px (800-200) and itemHeight 50, all 5 items should be visible
      expect(screen.getByText('Item 0')).toBeInTheDocument();
      expect(screen.getByText('Item 4')).toBeInTheDocument();
    });

    it('should set total height based on items count', () => {
      const items = createItems(20);
      const { container } = render(
        <VirtualList
          items={items}
          itemHeight={50}
          renderItem={defaultRenderItem}
        />
      );
      // Total height should be items.length * itemHeight = 20 * 50 = 1000
      const spacer = container.querySelector('.virtual-list-container > div');
      expect(spacer).toHaveStyle({ height: '1000px' });
    });

    it('should render empty list without errors', () => {
      const { container } = render(
        <VirtualList
          items={[]}
          itemHeight={50}
          renderItem={defaultRenderItem}
        />
      );
      expect(container.querySelector('.virtual-list-container')).toBeInTheDocument();
    });

    it('should use item.id as key when available', () => {
      const items = [{ id: 'unique-1', label: 'First' }];
      render(
        <VirtualList
          items={items}
          itemHeight={50}
          renderItem={defaultRenderItem}
        />
      );
      expect(screen.getByText('First')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // VIRTUAL SCROLLING BEHAVIOR
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Virtual Scrolling', () => {
    it('should only render items within visible range plus overscan', () => {
      // With 100 items at 50px each, viewport 600px:
      // visible = 600/50 = 12 items, plus overscan 5 on each side = 22 items max
      const items = createItems(100);
      render(
        <VirtualList
          items={items}
          itemHeight={50}
          renderItem={defaultRenderItem}
          overscan={5}
        />
      );
      // First items should be visible
      expect(screen.getByText('Item 0')).toBeInTheDocument();
      // Items far below should NOT be rendered
      expect(screen.queryByText('Item 99')).not.toBeInTheDocument();
    });

    it('should handle custom overscan value', () => {
      const items = createItems(50);
      render(
        <VirtualList
          items={items}
          itemHeight={50}
          renderItem={defaultRenderItem}
          overscan={2}
        />
      );
      // With smaller overscan, fewer items are rendered
      expect(screen.getByText('Item 0')).toBeInTheDocument();
    });

    it('should set container overflow to auto', () => {
      const items = createItems(5);
      const { container } = render(
        <VirtualList
          items={items}
          itemHeight={50}
          renderItem={defaultRenderItem}
        />
      );
      const listContainer = container.querySelector('.virtual-list-container');
      expect(listContainer).toHaveStyle({ overflow: 'auto' });
    });

    it('should set position relative on container', () => {
      const items = createItems(5);
      const { container } = render(
        <VirtualList
          items={items}
          itemHeight={50}
          renderItem={defaultRenderItem}
        />
      );
      const listContainer = container.querySelector('.virtual-list-container');
      expect(listContainer).toHaveStyle({ position: 'relative' });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPANDED ITEMS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Expanded Items', () => {
    it('should apply expanded styles when item id is in expandedIds', () => {
      const items = [{ id: 'item-0', label: 'Expanded Item' }];
      const expandedIds = new Set(['item-0']);
      const { container } = render(
        <VirtualList
          items={items}
          itemHeight={50}
          renderItem={defaultRenderItem}
          expandedIds={expandedIds}
        />
      );
      // Expanded items should have position relative and z-index
      const itemWrapper = container.querySelector('[style*="z-index: 10"]');
      expect(itemWrapper).toBeInTheDocument();
    });

    it('should apply non-expanded styles for items not in expandedIds', () => {
      const items = [{ id: 'item-0', label: 'Normal Item' }];
      const expandedIds = new Set<string>();
      const { container } = render(
        <VirtualList
          items={items}
          itemHeight={50}
          renderItem={defaultRenderItem}
          expandedIds={expandedIds}
        />
      );
      // Non-expanded items should have fixed height and hidden overflow
      const itemWrapper = container.querySelector('[style*="height: 50px"]');
      expect(itemWrapper).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SCROLL HANDLING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Scroll Handling', () => {
    it('should handle scroll events', () => {
      const items = createItems(100);
      const { container } = render(
        <VirtualList
          items={items}
          itemHeight={50}
          renderItem={defaultRenderItem}
        />
      );
      const listContainer = container.querySelector('.virtual-list-container');
      expect(listContainer).toBeInTheDocument();

      // Fire scroll event
      if (listContainer) {
        fireEvent.scroll(listContainer, { target: { scrollTop: 500 } });
      }
      // The component should still be rendered without errors
      expect(listContainer).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER ITEM CALLBACK
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Render Item Callback', () => {
    it('should pass correct item and absolute index to renderItem', () => {
      const items = createItems(3);
      const renderItem = vi.fn((item: { id: string; label: string }, index: number) => (
        <div key={item.id}>{item.label} at {index}</div>
      ));

      render(
        <VirtualList
          items={items}
          itemHeight={50}
          renderItem={renderItem}
        />
      );

      expect(renderItem).toHaveBeenCalledWith(items[0], 0);
      expect(renderItem).toHaveBeenCalledWith(items[1], 1);
      expect(renderItem).toHaveBeenCalledWith(items[2], 2);
    });

    it('should render custom content via renderItem', () => {
      const items = [{ id: '1', label: 'Custom' }];
      render(
        <VirtualList
          items={items}
          itemHeight={50}
          renderItem={(item) => <span data-testid="custom-render">{item.label} rendered</span>}
        />
      );
      expect(screen.getByText('Custom rendered')).toBeInTheDocument();
    });
  });
});
