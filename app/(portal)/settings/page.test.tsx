import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { renderWithProviders } from '@/tests/helpers/render';
import ConfiguracoesPage from './page';
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
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/settings',
  useSearchParams: () => new URLSearchParams(),
}));

describe('ConfiguracoesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mocks for initial data loading
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/auth/me') {
        return Promise.resolve({ data: { email: 'test@example.com', name: '' } }) as any;
      }
      if (url === '/bots') {
        return Promise.resolve({
          data: [{ id: 1, restaurant_name: 'Bot Test' }],
        }) as any;
      }
      if (url.includes('/billing/status')) {
        return Promise.resolve({
          data: { status: 'active', is_active: true, days_remaining: 25, next_payment: '2026-03-25', plan_type: 'basic' },
        }) as any;
      }
      if (url === '/billing/plans') {
        return Promise.resolve({
          data: [
            { id: 1, key: 'basic', title: 'ZenBotZ Básico', description: 'Para iniciar sua operação.', price: 5.0, currency: 'BRL', frequency: 1 },
            { id: 2, key: 'pro', title: 'ZenBotZ Pro', description: 'Pizzaria Dominadora', price: 10.0, currency: 'BRL', frequency: 1 },
          ],
        }) as any;
      }
      return Promise.resolve({ data: {} }) as any;
    });
  });

  it('renders 3 tab triggers (Perfil, Segurança, Assinatura)', async () => {
    renderWithProviders(<ConfiguracoesPage />);

    await waitFor(() => {
      expect(screen.getByText(/meu perfil/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/segurança/i)).toBeInTheDocument();
    expect(screen.getByText(/assinatura/i)).toBeInTheDocument();
  });

  it('renders profile tab by default with user email', async () => {
    renderWithProviders(<ConfiguracoesPage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
    });
  });

  it('navigates to security tab and shows password fields', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ConfiguracoesPage />);

    await waitFor(() => {
      expect(screen.getByText(/segurança/i)).toBeInTheDocument();
    });

    await user.click(screen.getByText(/segurança/i));

    await waitFor(() => {
      expect(screen.getByText(/alterar senha/i)).toBeInTheDocument();
    });
  });

  it('validates password requirements in security tab', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ConfiguracoesPage />);

    await waitFor(() => {
      expect(screen.getByText(/segurança/i)).toBeInTheDocument();
    });

    await user.click(screen.getByText(/segurança/i));

    await waitFor(() => {
      expect(screen.getByLabelText(/nova senha/i)).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/nova senha/i), 'Aa1!test');

    // Password strength indicators should appear
    expect(screen.getByText(/min. 8 caracteres/i)).toBeInTheDocument();
    expect(screen.getByText(/maiúscula/i)).toBeInTheDocument();
  });

  it('profile save button is disabled and shows "em breve"', async () => {
    renderWithProviders(<ConfiguracoesPage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
    });

    const saveBtn = screen.getByRole('button', { name: /salvar \(em breve\)/i });
    expect(saveBtn).toBeDisabled();
  });

  it('shows subscription status in assinatura tab', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ConfiguracoesPage />);

    await waitFor(() => {
      expect(screen.getByText(/assinatura/i)).toBeInTheDocument();
    });

    await user.click(screen.getByText(/assinatura/i));

    await waitFor(() => {
      expect(screen.getByText(/ativo/i)).toBeInTheDocument();
    });
  });

  it('renders dynamic plan prices from API', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ConfiguracoesPage />);

    await waitFor(() => {
      expect(screen.getByText(/assinatura/i)).toBeInTheDocument();
    });

    await user.click(screen.getByText(/assinatura/i));

    await waitFor(() => {
      // Prices are split across elements (price + "/mês" span), so use getAllByText with function matcher
      const price5 = screen.getAllByText((_, el) => el?.tagName === 'DIV' && /R\$\s*5,00/.test(el.textContent || ''));
      expect(price5.length).toBeGreaterThan(0);
      const price10 = screen.getAllByText((_, el) => el?.tagName === 'DIV' && /R\$\s*10,00/.test(el.textContent || ''));
      expect(price10.length).toBeGreaterThan(0);
    });
  });

  it('shows empty state when no plans returned', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/auth/me') return Promise.resolve({ data: { email: 'test@example.com', name: '' } }) as any;
      if (url === '/bots') return Promise.resolve({ data: [{ id: 1, restaurant_name: 'Bot Test', whatsapp_number: '111' }] }) as any;
      if (url.includes('/billing/status')) return Promise.resolve({ data: { status: 'inactive', is_active: false, days_remaining: 0, next_payment: '', plan_type: null } }) as any;
      if (url === '/billing/plans') return Promise.resolve({ data: [] }) as any;
      return Promise.resolve({ data: {} }) as any;
    });

    const user = userEvent.setup();
    renderWithProviders(<ConfiguracoesPage />);

    await waitFor(() => {
      expect(screen.getByText(/assinatura/i)).toBeInTheDocument();
    });

    await user.click(screen.getByText(/assinatura/i));

    await waitFor(() => {
      expect(screen.getByText(/nenhum plano disponível/i)).toBeInTheDocument();
    });
  });
});
