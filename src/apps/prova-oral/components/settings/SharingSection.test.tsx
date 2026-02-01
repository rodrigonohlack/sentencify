/**
 * @file SharingSection.test.tsx
 * @description Testes para o componente de compartilhamento
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';

// ═══════════════════════════════════════════════════════════════════════════
// MOCKS
// ═══════════════════════════════════════════════════════════════════════════

const mockUsers = [
  { id: 'user-1', email: 'alice@test.com' },
  { id: 'user-2', email: 'bob@test.com' },
  { id: 'user-3', email: 'charlie@test.com' },
];

const mockRecipients = [{ id: 'user-1', email: 'alice@test.com' }];

let mockFetchUsersResult = mockUsers;
let mockFetchSharingResult = mockRecipients;
const mockUpdateSharing = vi.fn().mockResolvedValue(true);
const mockFetchUsers = vi.fn().mockImplementation(() => Promise.resolve(mockFetchUsersResult));
const mockFetchSharing = vi.fn().mockImplementation(() => Promise.resolve(mockFetchSharingResult));

vi.mock('../../hooks', () => ({
  useProvaOralAPI: () => ({
    fetchUsers: mockFetchUsers,
    fetchSharing: mockFetchSharing,
    updateSharing: mockUpdateSharing,
  }),
}));

// Import after mocks
import { SharingSection } from './SharingSection';

describe('SharingSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchUsersResult = mockUsers;
    mockFetchSharingResult = mockRecipients;
    mockUpdateSharing.mockResolvedValue(true);
    mockFetchUsers.mockImplementation(() => Promise.resolve(mockFetchUsersResult));
    mockFetchSharing.mockImplementation(() => Promise.resolve(mockFetchSharingResult));
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Rendering', () => {
    it('should render section title', async () => {
      render(<SharingSection />);

      await waitFor(() => {
        expect(screen.getByText('Compartilhamento')).toBeInTheDocument();
      });
    });

    it('should render description text', async () => {
      render(<SharingSection />);

      await waitFor(() => {
        expect(screen.getByText(/Selecione quem pode ver/)).toBeInTheDocument();
      });
    });

    it('should render search input', async () => {
      render(<SharingSection />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Buscar usuários...')).toBeInTheDocument();
      });
    });

    it('should show empty state when no users available', async () => {
      mockFetchUsersResult = [];

      render(<SharingSection />);

      await waitFor(() => {
        expect(screen.getByText('Nenhum outro usuário cadastrado')).toBeInTheDocument();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // BASIC INTERACTION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Interactions', () => {
    it('should have accessible checkboxes when users load', async () => {
      render(<SharingSection />);

      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox');
        expect(checkboxes.length).toBeGreaterThan(0);
      });
    });

    it('should show pre-selected users as checked', async () => {
      render(<SharingSection />);

      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
        const aliceCheckbox = checkboxes.find((cb) =>
          cb.closest('label')?.textContent?.includes('alice@test.com')
        );
        expect(aliceCheckbox?.checked).toBe(true);

        const bobCheckbox = checkboxes.find((cb) =>
          cb.closest('label')?.textContent?.includes('bob@test.com')
        );
        expect(bobCheckbox?.checked).toBe(false);
      });
    });

    it('should toggle user selection when clicking checkbox', async () => {
      render(<SharingSection />);

      await waitFor(() => {
        expect(screen.getAllByRole('checkbox').length).toBe(3);
      });

      const bobLabel = screen.getByText('bob@test.com').closest('label');
      const bobCheckbox = bobLabel?.querySelector('input[type="checkbox"]') as HTMLInputElement;

      fireEvent.click(bobCheckbox);

      await waitFor(() => {
        expect(bobCheckbox.checked).toBe(true);
      });
    });

    it('should uncheck user when clicking checked checkbox', async () => {
      render(<SharingSection />);

      await waitFor(() => {
        expect(screen.getAllByRole('checkbox').length).toBe(3);
      });

      const aliceLabel = screen.getByText('alice@test.com').closest('label');
      const aliceCheckbox = aliceLabel?.querySelector('input[type="checkbox"]') as HTMLInputElement;

      expect(aliceCheckbox.checked).toBe(true);

      fireEvent.click(aliceCheckbox);

      await waitFor(() => {
        expect(aliceCheckbox.checked).toBe(false);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SEARCH/FILTER
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Search Filter', () => {
    it('should filter users by search query', async () => {
      render(<SharingSection />);

      await waitFor(() => {
        expect(screen.getAllByRole('checkbox').length).toBe(3);
      });

      const searchInput = screen.getByPlaceholderText('Buscar usuários...');
      fireEvent.change(searchInput, { target: { value: 'alice' } });

      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox');
        expect(checkboxes.length).toBe(1);
        expect(screen.getByText('alice@test.com')).toBeInTheDocument();
      });
    });

    it('should filter case-insensitively', async () => {
      render(<SharingSection />);

      await waitFor(() => {
        expect(screen.getAllByRole('checkbox').length).toBe(3);
      });

      const searchInput = screen.getByPlaceholderText('Buscar usuários...');
      fireEvent.change(searchInput, { target: { value: 'BOB' } });

      await waitFor(() => {
        expect(screen.getByText('bob@test.com')).toBeInTheDocument();
        expect(screen.queryByText('alice@test.com')).not.toBeInTheDocument();
      });
    });

    it('should show "Nenhum usuário encontrado" when search has no results', async () => {
      render(<SharingSection />);

      await waitFor(() => {
        expect(screen.getAllByRole('checkbox').length).toBe(3);
      });

      const searchInput = screen.getByPlaceholderText('Buscar usuários...');
      fireEvent.change(searchInput, { target: { value: 'nonexistent@user.com' } });

      await waitFor(() => {
        expect(screen.getByText('Nenhum usuário encontrado')).toBeInTheDocument();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DEBOUNCE SAVE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Debounced Save', () => {
    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should call updateSharing after debounce delay', async () => {
      render(<SharingSection />);

      await waitFor(() => {
        expect(screen.getAllByRole('checkbox').length).toBe(3);
      });

      const bobLabel = screen.getByText('bob@test.com').closest('label');
      const bobCheckbox = bobLabel?.querySelector('input[type="checkbox"]') as HTMLInputElement;

      fireEvent.click(bobCheckbox);

      // updateSharing should NOT be called immediately
      expect(mockUpdateSharing).not.toHaveBeenCalled();

      // Advance timers by 500ms (debounce time)
      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      // Now it should be called
      expect(mockUpdateSharing).toHaveBeenCalledTimes(1);
      expect(mockUpdateSharing).toHaveBeenCalledWith(expect.arrayContaining(['user-1', 'user-2']));
    });

    it('should reset debounce timer on rapid clicks', async () => {
      render(<SharingSection />);

      await waitFor(() => {
        expect(screen.getAllByRole('checkbox').length).toBe(3);
      });

      const bobLabel = screen.getByText('bob@test.com').closest('label');
      const bobCheckbox = bobLabel?.querySelector('input[type="checkbox"]') as HTMLInputElement;

      const charlieLabel = screen.getByText('charlie@test.com').closest('label');
      const charlieCheckbox = charlieLabel?.querySelector('input[type="checkbox"]') as HTMLInputElement;

      // Click bob
      fireEvent.click(bobCheckbox);

      // Advance 300ms (before debounce fires)
      await act(async () => {
        vi.advanceTimersByTime(300);
      });

      // Click charlie
      fireEvent.click(charlieCheckbox);

      // Advance 300ms more (total 600ms from first click, 300ms from second)
      await act(async () => {
        vi.advanceTimersByTime(300);
      });

      // Should still not be called (debounce restarted)
      expect(mockUpdateSharing).not.toHaveBeenCalled();

      // Advance 200ms more (total 500ms from second click)
      await act(async () => {
        vi.advanceTimersByTime(200);
      });

      // Now should be called once with all selections
      expect(mockUpdateSharing).toHaveBeenCalledTimes(1);
      expect(mockUpdateSharing).toHaveBeenCalledWith(expect.arrayContaining(['user-1', 'user-2', 'user-3']));
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // STATUS INDICATORS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Status Indicators', () => {
    it('should show user count correctly', async () => {
      render(<SharingSection />);

      await waitFor(() => {
        expect(screen.getByText('1 usuário com acesso')).toBeInTheDocument();
      });
    });

    it('should show plural form for multiple users', async () => {
      mockFetchSharingResult = [
        { id: 'user-1', email: 'alice@test.com' },
        { id: 'user-2', email: 'bob@test.com' },
      ];

      render(<SharingSection />);

      await waitFor(() => {
        expect(screen.getByText('2 usuários com acesso')).toBeInTheDocument();
      });
    });

    it('should show "Nenhum usuário com acesso" when none selected', async () => {
      mockFetchSharingResult = [];

      render(<SharingSection />);

      await waitFor(() => {
        expect(screen.getByText('Nenhum usuário com acesso')).toBeInTheDocument();
      });
    });

    it('should update count when toggling users', async () => {
      mockFetchSharingResult = [];
      render(<SharingSection />);

      await waitFor(() => {
        expect(screen.getByText('Nenhum usuário com acesso')).toBeInTheDocument();
      });

      const bobLabel = screen.getByText('bob@test.com').closest('label');
      const bobCheckbox = bobLabel?.querySelector('input[type="checkbox"]') as HTMLInputElement;

      fireEvent.click(bobCheckbox);

      await waitFor(() => {
        expect(screen.getByText('1 usuário com acesso')).toBeInTheDocument();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // LOADING STATE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Loading State', () => {
    it('should call fetchUsers and fetchSharing on mount', async () => {
      render(<SharingSection />);

      await waitFor(() => {
        expect(mockFetchUsers).toHaveBeenCalled();
        expect(mockFetchSharing).toHaveBeenCalled();
      });
    });

    it('should show users after loading', async () => {
      render(<SharingSection />);

      await waitFor(() => {
        expect(screen.getByText('alice@test.com')).toBeInTheDocument();
        expect(screen.getByText('bob@test.com')).toBeInTheDocument();
        expect(screen.getByText('charlie@test.com')).toBeInTheDocument();
      });
    });
  });
});
