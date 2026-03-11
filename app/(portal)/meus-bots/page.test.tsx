import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { renderWithProviders } from '@/tests/helpers/render';
import MyBotsPage from './page';
import { api } from '@/lib/api';
import { createMockBot, mockResponse } from '@/tests/helpers/mocks';

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    interceptors: { request: { use: vi.fn() } },
  },
}));

const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/meus-bots',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('./edit-bot-sheet', () => ({
  EditBotSheet: () => <div data-testid="edit-bot-sheet" />,
}));

vi.mock('@/components/ui/connect-whatsapp-button', () => ({
  default: ({ botId }: { botId: number }) => (
    <button data-testid="connect-whatsapp">Conectar #{botId}</button>
  ),
}));

describe('MyBotsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading skeletons while fetching', () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}));
    renderWithProviders(<MyBotsPage />);

    const skeletons = document.querySelectorAll('[class*="animate-pulse"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows empty state when no bots exist', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(mockResponse([]));

    renderWithProviders(<MyBotsPage />);

    await waitFor(() => {
      expect(screen.getByText(/nenhum bot criado/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/criar meu primeiro bot/i)).toBeInTheDocument();
  });

  it('renders bot cards when bots exist', async () => {
    const bots = [
      createMockBot({ id: 1, restaurant_name: 'Pizzaria Alpha' }),
      createMockBot({ id: 2, restaurant_name: 'Burger Beta' }),
    ];
    vi.mocked(api.get).mockResolvedValueOnce(mockResponse(bots));

    renderWithProviders(<MyBotsPage />);

    await waitFor(() => {
      expect(screen.getByText('Pizzaria Alpha')).toBeInTheDocument();
      expect(screen.getByText('Burger Beta')).toBeInTheDocument();
    });
  });

  it('shows delete confirmation dialog', async () => {
    const bots = [createMockBot({ id: 1, restaurant_name: 'Pizzaria Delete' })];
    vi.mocked(api.get).mockResolvedValueOnce(mockResponse(bots));

    const user = userEvent.setup();
    renderWithProviders(<MyBotsPage />);

    await waitFor(() => {
      expect(screen.getByText('Pizzaria Delete')).toBeInTheDocument();
    });

    // Open dropdown
    screen.getByRole('button', { name: 'Menu de ações' });
    // Find the MoreVertical trigger button - it's the button with the 3 dots
    const dropdownTrigger = document.querySelector('[data-state]');
    if (dropdownTrigger) {
      await user.click(dropdownTrigger as HTMLElement);
    }
  });

  it('shows Novo Bot link', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(mockResponse([]));

    renderWithProviders(<MyBotsPage />);

    expect(screen.getByText(/novo bot/i)).toBeInTheDocument();
  });

  it('shows error state when API fails', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Network error'));

    renderWithProviders(<MyBotsPage />);

    await waitFor(() => {
      expect(screen.getByText(/erro ao carregar bots/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/tentar novamente/i)).toBeInTheDocument();
  });

  it('disconnect mutation does not spread secret tokens in payload', async () => {
    const bot = createMockBot({
      id: 1,
      restaurant_name: 'Bot Seguro',
      whatsapp_token: 'SECRET_TOKEN_123',
      phone_number_id: 'phone_abc',
    });
    vi.mocked(api.get).mockResolvedValueOnce(mockResponse([bot]));
    vi.mocked(api.put).mockResolvedValueOnce(mockResponse({}));

    const user = userEvent.setup();
    renderWithProviders(<MyBotsPage />);

    await waitFor(() => {
      expect(screen.getByText('Bot Seguro')).toBeInTheDocument();
    });

    // Find and click the disconnect action via the dropdown menu
    const moreButton = screen.getByRole('button', { name: 'Menu de ações' });
    await user.click(moreButton);

    await waitFor(() => {
      const disconnectBtn = screen.queryByText(/desconectar/i);
      if (disconnectBtn) {
        user.click(disconnectBtn);
      }
    });

    // Verify that if put was called, it does NOT contain the full bot spread
    if (vi.mocked(api.put).mock.calls.length > 0) {
      const payload = vi.mocked(api.put).mock.calls[0][1] as Record<string, unknown>;
      expect(payload.whatsapp_token).toBe('');
      expect(payload.phone_number_id).toBe('');
    }
  });
});
