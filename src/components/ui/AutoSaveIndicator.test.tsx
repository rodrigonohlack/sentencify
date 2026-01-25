/**
 * @file AutoSaveIndicator.test.tsx
 * @description Testes para o componente AutoSaveIndicator
 * @version 1.38.52
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AutoSaveIndicator } from './AutoSaveIndicator';

describe('AutoSaveIndicator', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Rendering', () => {
    it('should render when show is true', () => {
      const { container } = render(<AutoSaveIndicator show={true} />);
      expect(container.firstChild).not.toBeNull();
    });

    it('should return null when show is false', () => {
      const { container } = render(<AutoSaveIndicator show={false} />);
      expect(container.firstChild).toBeNull();
    });

    it('should render with correct structure', () => {
      const { container } = render(<AutoSaveIndicator show={true} />);

      // Check for fixed positioning
      const outerDiv = container.firstChild as HTMLElement;
      expect(outerDiv.className).toContain('fixed');
      expect(outerDiv.className).toContain('bottom-4');
      expect(outerDiv.className).toContain('right-4');
    });

    it('should render checkmark SVG icon', () => {
      const { container } = render(<AutoSaveIndicator show={true} />);

      const svg = container.querySelector('svg');
      expect(svg).not.toBeNull();
      // Check that SVG has animate-pulse class
      expect(svg?.classList.contains('animate-pulse')).toBe(true);
    });

    it('should have animation classes', () => {
      const { container } = render(<AutoSaveIndicator show={true} />);

      const outerDiv = container.firstChild as HTMLElement;
      expect(outerDiv.className).toContain('animate-in');
      expect(outerDiv.className).toContain('fade-in');
    });

    it('should have proper z-index for visibility', () => {
      const { container } = render(<AutoSaveIndicator show={true} />);

      const outerDiv = container.firstChild as HTMLElement;
      expect(outerDiv.className).toContain('z-[9999]');
    });

    it('should have theme-aware styling', () => {
      const { container } = render(<AutoSaveIndicator show={true} />);

      const innerDiv = container.querySelector('.theme-autosave');
      expect(innerDiv).not.toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ACCESSIBILITY
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Accessibility', () => {
    it('should have SVG element', () => {
      const { container } = render(<AutoSaveIndicator show={true} />);

      const svg = container.querySelector('svg');
      expect(svg).not.toBeNull();
    });

    it('should render path with checkmark', () => {
      const { container } = render(<AutoSaveIndicator show={true} />);

      const path = container.querySelector('path');
      expect(path).not.toBeNull();
      // Check that path has a d attribute (the checkmark shape)
      expect(path).toHaveAttribute('d');
    });
  });
});
