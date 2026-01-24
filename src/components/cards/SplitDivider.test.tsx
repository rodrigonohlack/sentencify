/**
 * @file SplitDivider.test.tsx
 * @description Testes para o componente SplitDivider
 * @version 1.37.57
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { SplitDivider } from './SplitDivider';

describe('SplitDivider', () => {
  const mockOnDragStart = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERING TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Rendering', () => {
    it('should render divider element', () => {
      const { container } = render(<SplitDivider onDragStart={mockOnDragStart} />);

      const divider = container.querySelector('.split-divider');
      expect(divider).toBeInTheDocument();
    });

    it('should render handle element', () => {
      const { container } = render(<SplitDivider onDragStart={mockOnDragStart} />);

      const handle = container.querySelector('.split-divider-handle');
      expect(handle).toBeInTheDocument();
    });

    it('should render SVG icon', () => {
      const { container } = render(<SplitDivider onDragStart={mockOnDragStart} />);

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // MOUSE EVENT TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Mouse Events', () => {
    it('should call onDragStart on mousedown', () => {
      const { container } = render(<SplitDivider onDragStart={mockOnDragStart} />);

      const divider = container.querySelector('.split-divider') as HTMLElement;
      fireEvent.mouseDown(divider);

      expect(mockOnDragStart).toHaveBeenCalled();
    });

    it('should prevent default on mousedown', () => {
      const { container } = render(<SplitDivider onDragStart={mockOnDragStart} />);

      const divider = container.querySelector('.split-divider') as HTMLElement;
      const event = new MouseEvent('mousedown', { bubbles: true });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      divider.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should pass event to onDragStart', () => {
      const { container } = render(<SplitDivider onDragStart={mockOnDragStart} />);

      const divider = container.querySelector('.split-divider') as HTMLElement;
      fireEvent.mouseDown(divider, { clientX: 100, clientY: 200 });

      expect(mockOnDragStart).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'mousedown',
        })
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CALLBACK STABILITY TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Callback Stability', () => {
    it('should use memoized handleMouseDown', () => {
      const { container, rerender } = render(<SplitDivider onDragStart={mockOnDragStart} />);

      const divider = container.querySelector('.split-divider') as HTMLElement;
      fireEvent.mouseDown(divider);

      expect(mockOnDragStart).toHaveBeenCalledTimes(1);

      // Rerender with same callback
      rerender(<SplitDivider onDragStart={mockOnDragStart} />);

      fireEvent.mouseDown(divider);
      expect(mockOnDragStart).toHaveBeenCalledTimes(2);
    });

    it('should update handler when onDragStart changes', () => {
      const newOnDragStart = vi.fn();
      const { container, rerender } = render(<SplitDivider onDragStart={mockOnDragStart} />);

      const divider = container.querySelector('.split-divider') as HTMLElement;
      fireEvent.mouseDown(divider);

      expect(mockOnDragStart).toHaveBeenCalledTimes(1);
      expect(newOnDragStart).not.toHaveBeenCalled();

      // Rerender with new callback
      rerender(<SplitDivider onDragStart={newOnDragStart} />);

      fireEvent.mouseDown(divider);
      expect(newOnDragStart).toHaveBeenCalledTimes(1);
    });
  });
});
