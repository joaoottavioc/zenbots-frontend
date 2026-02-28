import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { renderWithProviders } from '@/tests/helpers/render';
import BestSellersPage from './page';
import { api } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    interceptors: { request: { use: vi.fn() } },
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/analytics',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/components/ui/bot-selector', () => ({
  BotSelector: ({ onBotChange, selectedBotId }: any) => (
    <button onClick={() => onBotChange('1')} data-testid="bot-selector">
      {selectedBotId ? `Bot ${selectedBotId}` : 'Select Bot'}
    </button>
  ),
}));

describe('BestSellersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page header', () => {
    vi.mocked(api.get).mockResolvedValue({ data: {} } as any);
    renderWithProviders(<BestSellersPage />);

    expect(screen.getByText(/produtos campeões/i)).toBeInTheDocument();
  });

  it('shows premium lock when API returns 403', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('/plans/pricing')) {
        return Promise.resolve({ data: { price: 10 } }) as any;
      }
      if (url.includes('/analytics/best-sellers')) {
        return Promise.reject({
          response: { status: 403, data: { detail: 'SUBSCRIPTION_REQUIRED' } },
        });
      }
      return Promise.resolve({ data: [] }) as any;
    });

    const user = userEvent.setup();
    renderWithProviders(<BestSellersPage />);

    const selectors = screen.getAllByTestId('bot-selector');
    await user.click(selectors[0]);

    await waitFor(() => {
      expect(screen.getByText(/desbloquear agora/i)).toBeInTheDocument();
    });
  });

  it('shows blurred content with mock data when locked', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('/plans/pricing')) {
        return Promise.resolve({ data: { price: 10 } }) as any;
      }
      if (url.includes('/analytics/best-sellers')) {
        return Promise.reject({
          response: { status: 403, data: { detail: 'SUBSCRIPTION_REQUIRED' } },
        });
      }
      return Promise.resolve({ data: [] }) as any;
    });

    const user = userEvent.setup();
    renderWithProviders(<BestSellersPage />);
    const selectors = screen.getAllByTestId('bot-selector');
    await user.click(selectors[0]);

    await waitFor(() => {
      // Use getAllByText since mock data appears in both KPI card and table
      const matches = screen.getAllByText(/combo família premium/i);
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders real data when not locked', async () => {
    const realData = [
      { name: 'X-Bacon Real', quantity: 50, revenue: 1500 },
      { name: 'Pizza Real', quantity: 30, revenue: 900 },
    ];

    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('/plans/pricing')) {
        return Promise.resolve({ data: { price: 10 } }) as any;
      }
      if (url.includes('/analytics/best-sellers')) {
        return Promise.resolve({ data: realData }) as any;
      }
      return Promise.resolve({ data: [] }) as any;
    });

    const user = userEvent.setup();
    renderWithProviders(<BestSellersPage />);
    const selectors = screen.getAllByTestId('bot-selector');
    await user.click(selectors[0]);

    await waitFor(() => {
      const matches = screen.getAllByText('X-Bacon Real');
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });
  });
});
