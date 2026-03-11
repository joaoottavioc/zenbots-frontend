import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { renderWithProviders } from '@/tests/helpers/render';
import { UserNav } from './user-nav';
import { api } from '@/lib/api';
import { mockResponse } from '@/tests/helpers/mocks';

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
    document.cookie = 'zenbots_auth=; path=/; max-age=0';
  });

  it('fetches user data from /auth/me and displays initials', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(mockResponse({ email: 'joao@test.com', name: '' }));

    renderWithProviders(<UserNav />);

    await waitFor(() => {
      expect(screen.getByText('JO')).toBeInTheDocument();
    });
  });

  it('displays user name when available', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(mockResponse({ email: 'teste@test.com', name: 'Teste User' }));

    renderWithProviders(<UserNav />);

    await waitFor(() => {
      expect(screen.getByText('TE')).toBeInTheDocument();
    });
  });

  it('does not render an <img> element inside the avatar', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(mockResponse({ email: 'user@test.com', name: 'User' }));

    renderWithProviders(<UserNav />);

    await waitFor(() => {
      expect(screen.getByText('US')).toBeInTheDocument();
    });

    const avatarButton = screen.getByRole('button');
    const img = avatarButton.querySelector('img');
    expect(img).toBeNull();
  });

  it('logout calls backend, clears cache, presence cookie and redirects to login', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(mockResponse({ email: 'user@test.com', name: 'User' }));
    document.cookie = 'zenbots_auth=1; path=/';

    const user = userEvent.setup();
    const { queryClient } = renderWithProviders(<UserNav />);
    const clearSpy = vi.spyOn(queryClient, 'clear');

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

    await waitFor(() => {
      // Verify backend logout call
      expect(api.post).toHaveBeenCalledWith('/auth/logout');
      expect(clearSpy).toHaveBeenCalled();
      // Presence cookie should be cleared
      expect(document.cookie).not.toContain('zenbots_auth=1');
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });
});
