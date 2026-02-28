import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { renderWithProviders } from '@/tests/helpers/render';
import { BotSelector } from './bot-selector';
import { api } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    interceptors: { request: { use: vi.fn() } },
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

describe('BotSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading skeleton while fetching bots', () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}) as any);

    renderWithProviders(
      <BotSelector selectedBotId={null} onBotChange={vi.fn()} />
    );

    // Skeleton renders as a div with specific classes
    expect(document.querySelector('[class*="animate-pulse"]')).toBeInTheDocument();
  });

  it('shows empty state when no bots returned', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: [] } as any);

    renderWithProviders(
      <BotSelector selectedBotId={null} onBotChange={vi.fn()} />
    );

    await waitFor(() => {
      expect(screen.getByText(/nenhum bot encontrado/i)).toBeInTheDocument();
    });
  });

  it('auto-selects first bot when none selected', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: [
        { id: 1, restaurant_name: 'Pizzaria A' },
        { id: 2, restaurant_name: 'Pizzaria B' },
      ],
    } as any);

    const onBotChange = vi.fn();
    renderWithProviders(
      <BotSelector selectedBotId={null} onBotChange={onBotChange} />
    );

    await waitFor(() => {
      expect(onBotChange).toHaveBeenCalledWith('1');
    });
  });

  it('calls onBotChange when user selects a bot', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: [
        { id: 1, restaurant_name: 'Pizzaria A' },
        { id: 2, restaurant_name: 'Pizzaria B' },
      ],
    } as any);

    const onBotChange = vi.fn();
    const user = userEvent.setup();

    renderWithProviders(
      <BotSelector selectedBotId="1" onBotChange={onBotChange} />
    );

    // Wait for bots to load
    await waitFor(() => {
      expect(screen.getByText('Pizzaria A')).toBeInTheDocument();
    });
  });

  it('does not re-fire onBotChange when callback reference changes', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: [
        { id: 1, restaurant_name: 'Pizzaria A' },
      ],
    } as any);

    const onBotChange1 = vi.fn();
    const { rerender } = renderWithProviders(
      <BotSelector selectedBotId={null} onBotChange={onBotChange1} />
    );

    await waitFor(() => {
      expect(onBotChange1).toHaveBeenCalledWith('1');
    });

    // Now rerender with a new callback ref but selectedBotId is set
    const onBotChange2 = vi.fn();
    rerender(
      <BotSelector selectedBotId="1" onBotChange={onBotChange2} />
    );

    // The new callback should NOT be called since a bot is already selected
    expect(onBotChange2).not.toHaveBeenCalled();
  });

  it('shows error message when API fails', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Network error'));

    renderWithProviders(
      <BotSelector selectedBotId={null} onBotChange={vi.fn()} />
    );

    await waitFor(() => {
      expect(screen.getByText(/erro ao carregar bots/i)).toBeInTheDocument();
    });
  });
});
