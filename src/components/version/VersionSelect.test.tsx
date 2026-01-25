/**
 * @file VersionSelect.test.tsx
 * @description Testes para o componente VersionSelect
 * @version 1.38.49
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { VersionSelect } from './VersionSelect';
import type { VersionSelectProps } from './VersionSelect';
import type { FieldVersion } from '../../types';

// ═══════════════════════════════════════════════════════════════════════════
// MOCKS
// ═══════════════════════════════════════════════════════════════════════════

// Mock VersionCompareModal to avoid testing the full diff logic
vi.mock('./VersionCompareModal', () => ({
  VersionCompareModal: ({ onClose, onRestore }: { onClose: () => void; onRestore: () => void }) => (
    <div data-testid="version-compare-modal">
      <button data-testid="modal-close" onClick={onClose}>Close Modal</button>
      <button data-testid="modal-restore" onClick={onRestore}>Restore</button>
    </div>
  ),
}));

describe('VersionSelect', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  const createMockVersions = (count: number): FieldVersion[] =>
    Array.from({ length: count }, (_, i) => ({
      id: `v-${i}`,
      topicId: 'topic-1',
      field: 'fundamentacao' as const,
      content: `<p>Version ${i} content</p>`,
      timestamp: Date.now() - (i + 1) * 5 * 60 * 1000, // 5, 10, 15... minutes ago
      preview: `Preview of version ${i}`,
    }));

  const createDefaultProps = (overrides: Partial<VersionSelectProps> = {}): VersionSelectProps => ({
    topicTitle: 'Horas Extras',
    versioning: {
      getVersions: vi.fn().mockResolvedValue(createMockVersions(3)),
    },
    currentContent: '<p>Current content</p>',
    onRestore: vi.fn(),
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERING TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Rendering', () => {
    it('should render the version button', async () => {
      await act(async () => {
        render(<VersionSelect {...createDefaultProps()} />);
      });
      const button = screen.getByTitle('Histórico de versões');
      expect(button).toBeInTheDocument();
    });

    it('should show version count in button after loading', async () => {
      await act(async () => {
        render(<VersionSelect {...createDefaultProps()} />);
      });
      await waitFor(() => {
        expect(screen.getByText(/\(3\)/)).toBeInTheDocument();
      });
    });

    it('should return null when versioning is null', () => {
      const { container } = render(
        <VersionSelect {...createDefaultProps({ versioning: null })} />
      );
      expect(container.innerHTML).toBe('');
    });

    it('should return null when topicTitle is empty', () => {
      const { container } = render(
        <VersionSelect {...createDefaultProps({ topicTitle: '' })} />
      );
      expect(container.innerHTML).toBe('');
    });

    it('should apply custom className', async () => {
      await act(async () => {
        render(<VersionSelect {...createDefaultProps({ className: 'custom-class' })} />);
      });
      const wrapper = screen.getByTitle('Histórico de versões').parentElement;
      expect(wrapper?.className).toContain('custom-class');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DROPDOWN BEHAVIOR
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Dropdown', () => {
    it('should not show dropdown initially', async () => {
      await act(async () => {
        render(<VersionSelect {...createDefaultProps()} />);
      });
      expect(screen.queryByText(/atrás/)).not.toBeInTheDocument();
    });

    it('should show dropdown with versions when button is clicked', async () => {
      await act(async () => {
        render(<VersionSelect {...createDefaultProps()} />);
      });

      await act(async () => {
        fireEvent.click(screen.getByTitle('Histórico de versões'));
      });

      await waitFor(() => {
        expect(screen.getAllByText(/atrás/).length).toBe(3);
      });
    });

    it('should show "Sem versões salvas" when no versions exist', async () => {
      const props = createDefaultProps({
        versioning: {
          getVersions: vi.fn().mockResolvedValue([]),
        },
      });

      await act(async () => {
        render(<VersionSelect {...props} />);
      });

      await act(async () => {
        fireEvent.click(screen.getByTitle('Histórico de versões'));
      });

      await waitFor(() => {
        expect(screen.getByText('Sem versões salvas')).toBeInTheDocument();
      });
    });

    it('should close dropdown when button is clicked again', async () => {
      await act(async () => {
        render(<VersionSelect {...createDefaultProps()} />);
      });

      const button = screen.getByTitle('Histórico de versões');

      // Open
      await act(async () => {
        fireEvent.click(button);
      });

      await waitFor(() => {
        expect(screen.getAllByText(/atrás/).length).toBe(3);
      });

      // Close
      await act(async () => {
        fireEvent.click(button);
      });

      await waitFor(() => {
        expect(screen.queryByText(/atrás/)).not.toBeInTheDocument();
      });
    });

    it('should close dropdown on outside click', async () => {
      await act(async () => {
        render(<VersionSelect {...createDefaultProps()} />);
      });

      await act(async () => {
        fireEvent.click(screen.getByTitle('Histórico de versões'));
      });

      await waitFor(() => {
        expect(screen.getAllByText(/atrás/).length).toBe(3);
      });

      // Click outside
      await act(async () => {
        fireEvent.mouseDown(document.body);
      });

      await waitFor(() => {
        expect(screen.queryByText(/atrás/)).not.toBeInTheDocument();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // VERSION SELECTION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Version Selection', () => {
    it('should open compare modal when a version is clicked', async () => {
      await act(async () => {
        render(<VersionSelect {...createDefaultProps()} />);
      });

      await act(async () => {
        fireEvent.click(screen.getByTitle('Histórico de versões'));
      });

      await waitFor(() => {
        expect(screen.getAllByText(/atrás/).length).toBe(3);
      });

      // Click first version
      const versionItems = screen.getAllByText(/atrás/);
      await act(async () => {
        fireEvent.click(versionItems[0]);
      });

      expect(screen.getByTestId('version-compare-modal')).toBeInTheDocument();
    });

    it('should close compare modal when modal close is clicked', async () => {
      await act(async () => {
        render(<VersionSelect {...createDefaultProps()} />);
      });

      await act(async () => {
        fireEvent.click(screen.getByTitle('Histórico de versões'));
      });

      await waitFor(() => {
        expect(screen.getAllByText(/atrás/).length).toBe(3);
      });

      const versionItems = screen.getAllByText(/atrás/);
      await act(async () => {
        fireEvent.click(versionItems[0]);
      });

      expect(screen.getByTestId('version-compare-modal')).toBeInTheDocument();

      await act(async () => {
        fireEvent.click(screen.getByTestId('modal-close'));
      });

      expect(screen.queryByTestId('version-compare-modal')).not.toBeInTheDocument();
    });

    it('should call onRestore with version content when restore is clicked', async () => {
      const props = createDefaultProps();
      await act(async () => {
        render(<VersionSelect {...props} />);
      });

      await act(async () => {
        fireEvent.click(screen.getByTitle('Histórico de versões'));
      });

      await waitFor(() => {
        expect(screen.getAllByText(/atrás/).length).toBe(3);
      });

      const versionItems = screen.getAllByText(/atrás/);
      await act(async () => {
        fireEvent.click(versionItems[0]);
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('modal-restore'));
      });

      expect(props.onRestore).toHaveBeenCalledWith(expect.any(String));
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TIME FORMAT
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Time Format', () => {
    it('should format time in minutes for recent versions', async () => {
      const versions: FieldVersion[] = [{
        id: 'v-1',
        topicId: 'topic-1',
        field: 'fundamentacao',
        content: 'content',
        timestamp: Date.now() - 30 * 60 * 1000, // 30 minutes ago
        preview: 'preview',
      }];

      const props = createDefaultProps({
        versioning: { getVersions: vi.fn().mockResolvedValue(versions) },
      });

      await act(async () => {
        render(<VersionSelect {...props} />);
      });

      await act(async () => {
        fireEvent.click(screen.getByTitle('Histórico de versões'));
      });

      await waitFor(() => {
        expect(screen.getByText(/30min atrás/)).toBeInTheDocument();
      });
    });

    it('should format time in hours for older versions', async () => {
      const versions: FieldVersion[] = [{
        id: 'v-1',
        topicId: 'topic-1',
        field: 'fundamentacao',
        content: 'content',
        timestamp: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
        preview: 'preview',
      }];

      const props = createDefaultProps({
        versioning: { getVersions: vi.fn().mockResolvedValue(versions) },
      });

      await act(async () => {
        render(<VersionSelect {...props} />);
      });

      await act(async () => {
        fireEvent.click(screen.getByTitle('Histórico de versões'));
      });

      await waitFor(() => {
        expect(screen.getByText(/2h atrás/)).toBeInTheDocument();
      });
    });

    it('should format time in days for very old versions', async () => {
      const versions: FieldVersion[] = [{
        id: 'v-1',
        topicId: 'topic-1',
        field: 'fundamentacao',
        content: 'content',
        timestamp: Date.now() - 3 * 24 * 60 * 60 * 1000, // 3 days ago
        preview: 'preview',
      }];

      const props = createDefaultProps({
        versioning: { getVersions: vi.fn().mockResolvedValue(versions) },
      });

      await act(async () => {
        render(<VersionSelect {...props} />);
      });

      await act(async () => {
        fireEvent.click(screen.getByTitle('Histórico de versões'));
      });

      await waitFor(() => {
        expect(screen.getByText(/3d atrás/)).toBeInTheDocument();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // LOAD VERSIONS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Load Versions', () => {
    it('should call getVersions on mount', async () => {
      const getVersions = vi.fn().mockResolvedValue([]);
      await act(async () => {
        render(<VersionSelect {...createDefaultProps({ versioning: { getVersions } })} />);
      });
      expect(getVersions).toHaveBeenCalledWith('Horas Extras');
    });

    it('should call getVersions again when button is clicked', async () => {
      const getVersions = vi.fn().mockResolvedValue(createMockVersions(2));
      await act(async () => {
        render(<VersionSelect {...createDefaultProps({ versioning: { getVersions } })} />);
      });

      await act(async () => {
        fireEvent.click(screen.getByTitle('Histórico de versões'));
      });

      // Called on mount + on click
      expect(getVersions.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });
});
