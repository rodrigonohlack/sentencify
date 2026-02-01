/**
 * @file SharingSection.test.tsx
 * @description Testes para o componente de compartilhamento
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

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
let mockUpdateSharingResult = true;

vi.mock('../../hooks', () => ({
  useProvaOralAPI: () => ({
    fetchUsers: vi.fn().mockImplementation(() => Promise.resolve(mockFetchUsersResult)),
    fetchSharing: vi.fn().mockImplementation(() => Promise.resolve(mockFetchSharingResult)),
    updateSharing: vi.fn().mockImplementation(() => Promise.resolve(mockUpdateSharingResult)),
  }),
}));

// Import after mocks
import { SharingSection } from './SharingSection';

describe('SharingSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockFetchUsersResult = mockUsers;
    mockFetchSharingResult = mockRecipients;
    mockUpdateSharingResult = true;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Rendering', () => {
    it('should render section title', async () => {
      render(<SharingSection />);

      // Wait for loading to finish and title to appear
      await waitFor(() => {
        expect(screen.getByText('Compartilhamento')).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should render description text', async () => {
      render(<SharingSection />);

      await waitFor(() => {
        expect(screen.getByText(/Selecione quem pode ver/)).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should render search input', async () => {
      render(<SharingSection />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Buscar usuários...')).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should show empty state when no users available', async () => {
      mockFetchUsersResult = [];

      render(<SharingSection />);

      await waitFor(() => {
        expect(screen.getByText('Nenhum outro usuário cadastrado')).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // BASIC INTERACTION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Interactions', () => {
    it('should have accessible checkboxes when users load', async () => {
      render(<SharingSection />);

      await waitFor(() => {
        // Should have checkboxes for each user
        const checkboxes = screen.getAllByRole('checkbox');
        expect(checkboxes.length).toBeGreaterThan(0);
      }, { timeout: 2000 });
    });
  });
});
