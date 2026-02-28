import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { renderWithProviders } from '@/tests/helpers/render';
import { UserNav } from './user-nav';
import { api } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn().mockResolvedValue({}),
    interceptors: { request: { use: vi.fn() } },
  },
}));

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

describe('UserNav', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('fetches user data from /auth/me and displays initials', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { email: 'joao@test.com', name: '' },
    } as any);

    renderWithProviders(<UserNav />);

    await waitFor(() => {
      // When name is empty, it derives from email: "joao" -> "Jo" (first 2 chars uppercase)
      expect(screen.getByText('JO')).toBeInTheDocument();
    });
  });

  it('displays user name when available', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { email: 'teste@test.com', name: 'Teste User' },
    } as any);

    renderWithProviders(<UserNav />);

    await waitFor(() => {
      expect(screen.getByText('TE')).toBeInTheDocument();
    });
  });

  it('does not render an <img> element inside the avatar', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { email: 'user@test.com', name: 'User' },
    } as any);

    renderWithProviders(<UserNav />);

    await waitFor(() => {
      expect(screen.getByText('US')).toBeInTheDocument();
    });

    const avatarButton = screen.getByRole('button');
    const img = avatarButton.querySelector('img');
    expect(img).toBeNull();
  });

  it('logout calls backend, clears cache, token and redirects to login', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { email: 'user@test.com', name: 'User' },
    } as any);
    localStorage.setItem('zenbots_token', 'test-token');

    const user = userEvent.setup();
    const { queryClient } = renderWithProviders(<UserNav />);
    const clearSpy = vi.spyOn(queryClient, 'clear');

    // Wait for user data to load
    await waitFor(() => {
      expect(screen.getByText('US')).toBeInTheDocument();
    });

    // Open the dropdown
    const avatarButton = screen.getByRole('button');
    await user.click(avatarButton);

    // Click logout
    await waitFor(() => {
      expect(screen.getByText(/sair/i)).toBeInTheDocument();
    });
    await user.click(screen.getByText(/sair/i));

    // Verify backend logout call
    expect(api.post).toHaveBeenCalledWith('/auth/logout');
    expect(clearSpy).toHaveBeenCalled();
    expect(localStorage.removeItem).toHaveBeenCalledWith('zenbots_token');
    expect(mockPush).toHaveBeenCalledWith('/login');
  });
});
