import { screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { renderWithProviders } from '@/tests/helpers/render';
import PortalLayout from './layout';

const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: mockReplace,
    refresh: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/meus-bots',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/components/ui/sidebar', () => ({
  Sidebar: () => <div data-testid="sidebar">Sidebar</div>,
}));

vi.mock('@/components/layout/top-header', () => ({
  TopHeader: () => <div data-testid="top-header">Header</div>,
}));

describe('PortalLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('redirects to /login when no token exists', async () => {
    renderWithProviders(
      <PortalLayout><div>Child Content</div></PortalLayout>
    );

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith(
        expect.stringContaining('/login')
      );
    });

    expect(screen.queryByText('Child Content')).not.toBeInTheDocument();
  });

  it('redirects to /login when zenbots_token is removed in another tab', async () => {
    localStorage.setItem('zenbots_token', 'valid-token');

    renderWithProviders(
      <PortalLayout><div>Child Content</div></PortalLayout>
    );

    await waitFor(() => {
      expect(screen.getByText('Child Content')).toBeInTheDocument();
    });

    // Simulate another tab removing the token
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'zenbots_token',
      newValue: null,
    }));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/login');
    });
  });

  it('does NOT redirect when a different storage key changes', async () => {
    localStorage.setItem('zenbots_token', 'valid-token');

    renderWithProviders(
      <PortalLayout><div>Child Content</div></PortalLayout>
    );

    await waitFor(() => {
      expect(screen.getByText('Child Content')).toBeInTheDocument();
    });

    // Simulate a different key being removed
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'some_other_key',
      newValue: null,
    }));

    // Should NOT redirect
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('renders children when token is present', async () => {
    localStorage.setItem('zenbots_token', 'valid-token');

    renderWithProviders(
      <PortalLayout><div>Child Content</div></PortalLayout>
    );

    await waitFor(() => {
      expect(screen.getByText('Child Content')).toBeInTheDocument();
    });

    expect(mockReplace).not.toHaveBeenCalled();
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('top-header')).toBeInTheDocument();
  });

  it('renders a skip-to-content link', async () => {
    localStorage.setItem('zenbots_token', 'valid-token');

    renderWithProviders(
      <PortalLayout><div>Child Content</div></PortalLayout>
    );

    await waitFor(() => {
      expect(screen.getByText('Child Content')).toBeInTheDocument();
    });

    const skipLink = screen.getByText('Ir para o conteúdo principal');
    expect(skipLink).toBeInTheDocument();
    expect(skipLink.getAttribute('href')).toBe('#main-content');
  });

  it('has id="main-content" on the main element', async () => {
    localStorage.setItem('zenbots_token', 'valid-token');

    renderWithProviders(
      <PortalLayout><div>Child Content</div></PortalLayout>
    );

    await waitFor(() => {
      expect(screen.getByText('Child Content')).toBeInTheDocument();
    });

    const main = screen.getByRole('main');
    expect(main.id).toBe('main-content');
  });
});
