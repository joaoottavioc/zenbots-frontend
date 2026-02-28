import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { renderWithProviders } from '@/tests/helpers/render';
import PagamentosPage from './page';
import { api } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    interceptors: { request: { use: vi.fn() } },
  },
}));

const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/pagamentos',
  useSearchParams: () => new URLSearchParams(),
}));

describe('PagamentosPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows disconnected badge when not connected', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { is_active: false } } as any);

    renderWithProviders(<PagamentosPage />);

    await waitFor(() => {
      expect(screen.getByText(/desconectado/i)).toBeInTheDocument();
    });
  });

  it('shows connected badge when connected', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { is_active: true } } as any);

    renderWithProviders(<PagamentosPage />);

    await waitFor(() => {
      expect(screen.getByText(/conectado/i)).toBeInTheDocument();
    });
  });

  it('shows connect button when disconnected', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { is_active: false } } as any);

    renderWithProviders(<PagamentosPage />);

    await waitFor(() => {
      expect(screen.getByText(/conectar conta/i)).toBeInTheDocument();
    });
  });

  it('shows disconnect button when connected', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { is_active: true } } as any);

    renderWithProviders(<PagamentosPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /desconectar/i })).toBeInTheDocument();
    });
  });

  it('redirects to Mercado Pago auth URL with state param on connect click', async () => {
    const mockUUID = 'test-uuid-1234';
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(mockUUID as `${string}-${string}-${string}-${string}-${string}`);

    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('/auth-url')) {
        return Promise.resolve({ data: { url: 'https://mercadopago.com/auth' } }) as any;
      }
      return Promise.resolve({ data: { is_active: false } }) as any;
    });

    const user = userEvent.setup();
    renderWithProviders(<PagamentosPage />);

    await waitFor(() => {
      expect(screen.getByText(/conectar conta/i)).toBeInTheDocument();
    });

    await user.click(screen.getByText(/conectar conta/i));

    await waitFor(() => {
      expect(window.location.href).toContain('state=test-uuid-1234');
    });

    expect(sessionStorage.setItem).toHaveBeenCalledWith('mp_oauth_state', mockUUID);
  });

  it('renders Mercado Pago card with features', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { is_active: false } } as any);

    renderWithProviders(<PagamentosPage />);

    await waitFor(() => {
      expect(screen.getByText('Mercado Pago')).toBeInTheDocument();
    });

    expect(screen.getByText(/confirmação via webhook/i)).toBeInTheDocument();
  });
});
