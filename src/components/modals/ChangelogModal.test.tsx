/**
 * @file ChangelogModal.test.tsx
 * @description Testes para o componente ChangelogModal
 * @version 1.37.57
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChangelogModal } from './ChangelogModal';
import { CHANGELOG } from '../../constants/changelog';

// Mock useUIStore
const mockCloseModal = vi.fn();
let mockShowChangelogModal = false;

vi.mock('../../stores/useUIStore', () => ({
  useUIStore: (selector: (state: any) => any) => {
    const state = {
      modals: { changelog: mockShowChangelogModal },
      closeModal: mockCloseModal,
    };
    return selector(state);
  },
}));

describe('ChangelogModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockShowChangelogModal = false;
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERING TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Rendering', () => {
    it('should not render when modal is closed', () => {
      mockShowChangelogModal = false;
      render(<ChangelogModal />);

      expect(screen.queryByText('Histórico de Alterações')).not.toBeInTheDocument();
    });

    it('should render when modal is open', () => {
      mockShowChangelogModal = true;
      render(<ChangelogModal />);

      expect(screen.getByText('Histórico de Alterações')).toBeInTheDocument();
    });

    it('should render changelog entries', () => {
      mockShowChangelogModal = true;
      render(<ChangelogModal />);

      // Check that at least some changelog entries are rendered
      if (CHANGELOG.length > 0) {
        expect(screen.getByText(`v${CHANGELOG[0].version}`)).toBeInTheDocument();
        expect(screen.getByText(CHANGELOG[0].feature)).toBeInTheDocument();
      }
    });

    it('should render multiple changelog entries', () => {
      mockShowChangelogModal = true;
      render(<ChangelogModal />);

      // Check that at least first few version numbers are rendered
      const firstFewItems = CHANGELOG.slice(0, 3);
      firstFewItems.forEach((item) => {
        expect(screen.getByText(`v${item.version}`)).toBeInTheDocument();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CLOSE BEHAVIOR TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Close Behavior', () => {
    it('should call closeModal with "changelog" when closed', () => {
      mockShowChangelogModal = true;
      render(<ChangelogModal />);

      // Close via X button
      const closeButton = screen.getByRole('button');
      fireEvent.click(closeButton);

      expect(mockCloseModal).toHaveBeenCalledWith('changelog');
    });

    it('should call closeModal on ESC key', () => {
      mockShowChangelogModal = true;
      render(<ChangelogModal />);

      fireEvent.keyDown(window, { key: 'Escape' });

      expect(mockCloseModal).toHaveBeenCalledWith('changelog');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // STYLING TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Styling', () => {
    it('should have scrollable content area', () => {
      mockShowChangelogModal = true;
      const { container } = render(<ChangelogModal />);

      const scrollArea = container.querySelector('.overflow-y-auto');
      expect(scrollArea).toBeInTheDocument();
    });

    it('should have version numbers styled with blue color', () => {
      mockShowChangelogModal = true;
      const { container } = render(<ChangelogModal />);

      const versionSpans = container.querySelectorAll('.text-blue-400');
      expect(versionSpans.length).toBeGreaterThan(0);
    });
  });
});
