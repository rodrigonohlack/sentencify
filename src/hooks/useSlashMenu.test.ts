/**
 * @file useSlashMenu.test.ts
 * @description Testes para o hook de gerenciamento do Slash Menu
 * @version 1.37.57
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSlashMenu } from './useSlashMenu';

describe('useSlashMenu', () => {
  // Mock dependencies
  const mockSanitizeHTML = vi.fn((html: string) => html);
  const mockShowToast = vi.fn();

  // Mock QuillInstance
  const createMockQuill = () => ({
    getText: vi.fn(() => 'test\\content'),
    deleteText: vi.fn(),
    focus: vi.fn(),
    setSelection: vi.fn(),
    getSelection: vi.fn(() => ({ index: 5, length: 0 })),
    clipboard: {
      dangerouslyPasteHTML: vi.fn()
    }
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIAL STATE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Initial State', () => {
    it('should start with menu closed', () => {
      const { result } = renderHook(() =>
        useSlashMenu({
          sanitizeHTML: mockSanitizeHTML,
          showToast: mockShowToast
        })
      );

      expect(result.current.slashMenu.isOpen).toBe(false);
    });

    it('should have default position of 0,0', () => {
      const { result } = renderHook(() =>
        useSlashMenu({
          sanitizeHTML: mockSanitizeHTML,
          showToast: mockShowToast
        })
      );

      expect(result.current.slashMenu.position).toEqual({ top: 0, left: 0 });
    });

    it('should have empty search term', () => {
      const { result } = renderHook(() =>
        useSlashMenu({
          sanitizeHTML: mockSanitizeHTML,
          showToast: mockShowToast
        })
      );

      expect(result.current.slashMenu.searchTerm).toBe('');
    });

    it('should have selectedIndex of 0', () => {
      const { result } = renderHook(() =>
        useSlashMenu({
          sanitizeHTML: mockSanitizeHTML,
          showToast: mockShowToast
        })
      );

      expect(result.current.slashMenu.selectedIndex).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // OPEN MENU TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('openSlashMenu', () => {
    it('should open the menu', () => {
      const mockQuill = createMockQuill();
      const { result } = renderHook(() =>
        useSlashMenu({
          sanitizeHTML: mockSanitizeHTML,
          showToast: mockShowToast
        })
      );

      act(() => {
        result.current.openSlashMenu({
          position: { top: 100, left: 200 },
          quillInstance: mockQuill as any,
          triggerPosition: 5
        });
      });

      expect(result.current.slashMenu.isOpen).toBe(true);
    });

    it('should set position correctly', () => {
      const mockQuill = createMockQuill();
      const { result } = renderHook(() =>
        useSlashMenu({
          sanitizeHTML: mockSanitizeHTML,
          showToast: mockShowToast
        })
      );

      act(() => {
        result.current.openSlashMenu({
          position: { top: 150, left: 250 },
          quillInstance: mockQuill as any,
          triggerPosition: 10
        });
      });

      expect(result.current.slashMenu.position).toEqual({ top: 150, left: 250 });
    });

    it('should reset search term and selected index on open', () => {
      const mockQuill = createMockQuill();
      const { result } = renderHook(() =>
        useSlashMenu({
          sanitizeHTML: mockSanitizeHTML,
          showToast: mockShowToast
        })
      );

      // First update search term
      act(() => {
        result.current.updateSlashSearchTerm('test');
      });

      // Then open menu
      act(() => {
        result.current.openSlashMenu({
          position: { top: 100, left: 200 },
          quillInstance: mockQuill as any,
          triggerPosition: 5
        });
      });

      expect(result.current.slashMenu.searchTerm).toBe('');
      expect(result.current.slashMenu.selectedIndex).toBe(0);
    });

    it('should store quill instance and trigger position', () => {
      const mockQuill = createMockQuill();
      const { result } = renderHook(() =>
        useSlashMenu({
          sanitizeHTML: mockSanitizeHTML,
          showToast: mockShowToast
        })
      );

      act(() => {
        result.current.openSlashMenu({
          position: { top: 100, left: 200 },
          quillInstance: mockQuill as any,
          triggerPosition: 42
        });
      });

      expect(result.current.slashMenu.quillInstance).toBe(mockQuill);
      expect(result.current.slashMenu.triggerPosition).toBe(42);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CLOSE MENU TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('closeSlashMenu', () => {
    it('should close the menu', () => {
      const mockQuill = createMockQuill();
      const { result } = renderHook(() =>
        useSlashMenu({
          sanitizeHTML: mockSanitizeHTML,
          showToast: mockShowToast
        })
      );

      // Open first
      act(() => {
        result.current.openSlashMenu({
          position: { top: 100, left: 200 },
          quillInstance: mockQuill as any,
          triggerPosition: 5
        });
      });

      expect(result.current.slashMenu.isOpen).toBe(true);

      // Then close
      act(() => {
        result.current.closeSlashMenu();
      });

      expect(result.current.slashMenu.isOpen).toBe(false);
    });

    it('should close without removing slash by default', () => {
      const mockQuill = createMockQuill();
      const { result } = renderHook(() =>
        useSlashMenu({
          sanitizeHTML: mockSanitizeHTML,
          showToast: mockShowToast
        })
      );

      // Open first
      act(() => {
        result.current.openSlashMenu({
          position: { top: 100, left: 200 },
          quillInstance: mockQuill as any,
          triggerPosition: 4
        });
      });

      // Close without removing slash
      act(() => {
        result.current.closeSlashMenu();
      });

      expect(mockQuill.deleteText).not.toHaveBeenCalled();
    });

    it('should remove slash when removeSlash is true', () => {
      const mockQuill = createMockQuill();
      mockQuill.getText.mockReturnValue('test\\content');

      const { result } = renderHook(() =>
        useSlashMenu({
          sanitizeHTML: mockSanitizeHTML,
          showToast: mockShowToast
        })
      );

      // Open first
      act(() => {
        result.current.openSlashMenu({
          position: { top: 100, left: 200 },
          quillInstance: mockQuill as any,
          triggerPosition: 4 // Position of \ in 'test\content'
        });
      });

      // Close with removing slash
      act(() => {
        result.current.closeSlashMenu(true);
      });

      expect(mockQuill.deleteText).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // NAVIGATION TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('navigateSlashMenu', () => {
    it('should navigate down', () => {
      const { result } = renderHook(() =>
        useSlashMenu({
          sanitizeHTML: mockSanitizeHTML,
          showToast: mockShowToast
        })
      );

      expect(result.current.slashMenu.selectedIndex).toBe(0);

      act(() => {
        result.current.navigateSlashMenu('down');
      });

      expect(result.current.slashMenu.selectedIndex).toBe(1);
    });

    it('should navigate up', () => {
      const { result } = renderHook(() =>
        useSlashMenu({
          sanitizeHTML: mockSanitizeHTML,
          showToast: mockShowToast
        })
      );

      // First go down
      act(() => {
        result.current.navigateSlashMenu('down');
        result.current.navigateSlashMenu('down');
      });

      expect(result.current.slashMenu.selectedIndex).toBe(2);

      // Then go up
      act(() => {
        result.current.navigateSlashMenu('up');
      });

      expect(result.current.slashMenu.selectedIndex).toBe(1);
    });

    it('should not go below 0', () => {
      const { result } = renderHook(() =>
        useSlashMenu({
          sanitizeHTML: mockSanitizeHTML,
          showToast: mockShowToast
        })
      );

      act(() => {
        result.current.navigateSlashMenu('up');
        result.current.navigateSlashMenu('up');
      });

      expect(result.current.slashMenu.selectedIndex).toBe(0);
    });

    it('should not exceed maxItems - 1', () => {
      const { result } = renderHook(() =>
        useSlashMenu({
          sanitizeHTML: mockSanitizeHTML,
          showToast: mockShowToast
        })
      );

      // Navigate down many times with maxItems = 5
      act(() => {
        for (let i = 0; i < 10; i++) {
          result.current.navigateSlashMenu('down', 5);
        }
      });

      expect(result.current.slashMenu.selectedIndex).toBe(4); // maxItems - 1
    });

    it('should use default maxItems of 10', () => {
      const { result } = renderHook(() =>
        useSlashMenu({
          sanitizeHTML: mockSanitizeHTML,
          showToast: mockShowToast
        })
      );

      // Navigate down many times
      act(() => {
        for (let i = 0; i < 15; i++) {
          result.current.navigateSlashMenu('down');
        }
      });

      expect(result.current.slashMenu.selectedIndex).toBe(9); // 10 - 1
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SEARCH TERM TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('updateSlashSearchTerm', () => {
    it('should update search term', () => {
      const { result } = renderHook(() =>
        useSlashMenu({
          sanitizeHTML: mockSanitizeHTML,
          showToast: mockShowToast
        })
      );

      act(() => {
        result.current.updateSlashSearchTerm('horas');
      });

      expect(result.current.slashMenu.searchTerm).toBe('horas');
    });

    it('should reset selectedIndex on search term update', () => {
      const { result } = renderHook(() =>
        useSlashMenu({
          sanitizeHTML: mockSanitizeHTML,
          showToast: mockShowToast
        })
      );

      // Navigate down first
      act(() => {
        result.current.navigateSlashMenu('down');
        result.current.navigateSlashMenu('down');
      });

      expect(result.current.slashMenu.selectedIndex).toBe(2);

      // Update search term
      act(() => {
        result.current.updateSlashSearchTerm('test');
      });

      expect(result.current.slashMenu.selectedIndex).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SELECT MODEL TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('selectModelFromSlash', () => {
    it('should close menu when no quill instance', () => {
      const { result } = renderHook(() =>
        useSlashMenu({
          sanitizeHTML: mockSanitizeHTML,
          showToast: mockShowToast
        })
      );

      // Open without quill
      act(() => {
        result.current.openSlashMenu({
          position: { top: 100, left: 200 },
          quillInstance: null,
          triggerPosition: 5
        });
      });

      const model = { id: '1', title: 'Test Model', content: '<p>Content</p>' };

      act(() => {
        result.current.selectModelFromSlash(model as any);
      });

      expect(result.current.slashMenu.isOpen).toBe(false);
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('should insert model content and show toast', () => {
      const mockQuill = createMockQuill();
      mockQuill.getText.mockReturnValue('test\\content');
      mockQuill.getSelection.mockReturnValue({ index: 5, length: 0 });

      const { result } = renderHook(() =>
        useSlashMenu({
          sanitizeHTML: mockSanitizeHTML,
          showToast: mockShowToast
        })
      );

      // Open with quill
      act(() => {
        result.current.openSlashMenu({
          position: { top: 100, left: 200 },
          quillInstance: mockQuill as any,
          triggerPosition: 4
        });
      });

      const model = { id: '1', title: 'Horas Extras', content: '<p>Modelo de horas extras</p>' };

      act(() => {
        result.current.selectModelFromSlash(model as any);
      });

      expect(mockSanitizeHTML).toHaveBeenCalledWith(model.content);
      expect(mockQuill.clipboard.dangerouslyPasteHTML).toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledWith('Modelo "Horas Extras" inserido', 'success');
      expect(result.current.slashMenu.isOpen).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CALLBACK STABILITY TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Callback Stability', () => {
    it('openSlashMenu should be stable across renders', () => {
      const { result, rerender } = renderHook(() =>
        useSlashMenu({
          sanitizeHTML: mockSanitizeHTML,
          showToast: mockShowToast
        })
      );

      const first = result.current.openSlashMenu;
      rerender();
      const second = result.current.openSlashMenu;

      expect(first).toBe(second);
    });

    it('closeSlashMenu should be stable across renders', () => {
      const { result, rerender } = renderHook(() =>
        useSlashMenu({
          sanitizeHTML: mockSanitizeHTML,
          showToast: mockShowToast
        })
      );

      const first = result.current.closeSlashMenu;
      rerender();
      const second = result.current.closeSlashMenu;

      expect(first).toBe(second);
    });

    it('navigateSlashMenu should be stable across renders', () => {
      const { result, rerender } = renderHook(() =>
        useSlashMenu({
          sanitizeHTML: mockSanitizeHTML,
          showToast: mockShowToast
        })
      );

      const first = result.current.navigateSlashMenu;
      rerender();
      const second = result.current.navigateSlashMenu;

      expect(first).toBe(second);
    });

    it('updateSlashSearchTerm should be stable across renders', () => {
      const { result, rerender } = renderHook(() =>
        useSlashMenu({
          sanitizeHTML: mockSanitizeHTML,
          showToast: mockShowToast
        })
      );

      const first = result.current.updateSlashSearchTerm;
      rerender();
      const second = result.current.updateSlashSearchTerm;

      expect(first).toBe(second);
    });
  });
});
