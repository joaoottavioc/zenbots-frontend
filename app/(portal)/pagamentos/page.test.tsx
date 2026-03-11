import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { renderWithProviders } from '@/tests/helpers/render';
import PagamentosPage from './page';
import { api } from '@/lib/api';
import { mockResponse } from '@/tests/helpers/mocks';
import type { ReactNode } from 'react';

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

vi.mock('@/components/layout/page-header', () => ({
  PageHeader: ({ children, onBotChange }: { children?: ReactNode; selectedBotId?: string | null; onBotChange?: (id: string) => void }) => (
    <div data-testid="page-header">
      {onBotChange && (
        <button onClick={() => onBotChange('1')} data-testid="bot-selector">Select Bot</button>
      )}
      {children}
    </div>
  ),
}));

vi.mock('@/components/layout/page-container', () => ({
  PageContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
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
    vi.mocked(api.get).mockResolvedValue(mockResponse({ is_active: false }));

    renderWithProviders(<PagamentosPage />);

    await waitFor(() => {
      expect(screen.getByText(/desconectado/i)).toBeInTheDocument();
    });
  });

  it('shows connected badge when connected', async () => {
    vi.mocked(api.get).mockResolvedValue(mockResponse({ is_active: true }));

    renderWithProviders(<PagamentosPage />);

    await waitFor(() => {
      expect(screen.getByText(/conectado/i)).toBeInTheDocument();
    });
  });

  it('shows connect button when disconnected', async () => {
    vi.mocked(api.get).mockResolvedValue(mockResponse({ is_active: false }));

    renderWithProviders(<PagamentosPage />);

    await waitFor(() => {
      expect(screen.getByText(/conectar conta/i)).toBeInTheDocument();
    });
  });

  it('shows disconnect button when connected', async () => {
    vi.mocked(api.get).mockResolvedValue(mockResponse({ is_active: true }));

    renderWithProviders(<PagamentosPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /desconectar/i })).toBeInTheDocument();
    });
  });

  it('redirects to Mercado Pago auth URL on connect click', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('/auth-url')) {
        return Promise.resolve(mockResponse({ url: 'https://mercadopago.com/auth' }));
      }
      return Promise.resolve(mockResponse({ is_active: false }));
    });

    const user = userEvent.setup();
    renderWithProviders(<PagamentosPage />);

    // Select a bot first (required for connect)
    await user.click(screen.getByTestId('bot-selector'));

    await waitFor(() => {
      expect(screen.getByText(/conectar conta/i)).toBeInTheDocument();
    });

    await user.click(screen.getByText(/conectar conta/i));

    await waitFor(() => {
      // Backend includes CSRF state in the URL — no client-side state param
      expect(window.location.href).toContain('mercadopago.com/auth');
    });

    // Verify bot_id is passed to the API
    expect(api.get).toHaveBeenCalledWith(expect.stringContaining('bot_id=1'));
  });

  it('renders Mercado Pago card with features', async () => {
    vi.mocked(api.get).mockResolvedValue(mockResponse({ is_active: false }));

    renderWithProviders(<PagamentosPage />);

    await waitFor(() => {
      expect(screen.getByText('Mercado Pago')).toBeInTheDocument();
    });

    expect(screen.getByText(/confirmação via webhook/i)).toBeInTheDocument();
  });
});
