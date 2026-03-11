import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { renderWithProviders } from '@/tests/helpers/render';
import PedidosPage from './page';
import { api } from '@/lib/api';
import { createMockOrder, mockResponse } from '@/tests/helpers/mocks';
import type { ReactNode } from 'react';

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    interceptors: { request: { use: vi.fn() } },
  },
}));

const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/pedidos',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/components/layout/page-header', () => ({
  PageHeader: ({ children, selectedBotId, onBotChange }: { children?: ReactNode; selectedBotId?: string | null; onBotChange?: (id: string) => void }) => (
    <div data-testid="dashboard-header">
      {!selectedBotId && (
        <button onClick={() => onBotChange?.('1')} data-testid="select-bot">
          Select Bot
        </button>
      )}
      {children}
    </div>
  ),
}));

vi.mock('@/components/layout/page-container', () => ({
  PageContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/bot-selector', () => ({
  BotSelector: ({ onBotChange }: { onBotChange: (id: string) => void }) => (
    <button onClick={() => onBotChange('1')} data-testid="bot-selector">Bot</button>
  ),
}));

// Mock fetch to prevent SSE connection noise in tests
const mockFetch = vi.fn().mockRejectedValue(new Error('no SSE in test'));
globalThis.fetch = mockFetch;

describe('PedidosPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockFetch.mockRejectedValue(new Error('no SSE in test'));
  });

  it('shows message to select a bot when none selected', () => {
    renderWithProviders(<PedidosPage />);

    expect(screen.getByText(/selecione um restaurante/i)).toBeInTheDocument();
  });

  it('shows 3 Kanban columns when bot is selected and orders loaded', async () => {
    const orders = [
      createMockOrder({ id: 1, status: 'PENDING', customer_name: 'Cliente 1' }),
      createMockOrder({ id: 2, status: 'PREPARING', customer_name: 'Cliente 2' }),
      createMockOrder({ id: 3, status: 'READY', customer_name: 'Cliente 3' }),
    ];

    vi.mocked(api.get).mockResolvedValue(mockResponse(orders));
    localStorage.setItem('zenbots_token', 'test-token');

    const user = userEvent.setup();
    renderWithProviders(<PedidosPage />);

    // Select a bot using userEvent to properly trigger state updates
    await user.click(screen.getByTestId('select-bot'));

    await waitFor(() => {
      expect(screen.getByText('A Fazer')).toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.getByText('Em Preparo')).toBeInTheDocument();
    expect(screen.getByText('Pronto / Expedição')).toBeInTheDocument();
  });

  it('renders order items correctly in the cards', async () => {
    const orders = [
      createMockOrder({
        id: 10,
        status: 'PENDING',
        display_items: [
          { quantity: 3, product_name: 'Pizza Margherita', price_at_time_of_order: 45.0, notes: null },
        ],
        customer_name: 'Maria',
      }),
    ];

    vi.mocked(api.get).mockResolvedValue(mockResponse(orders));
    localStorage.setItem('zenbots_token', 'test-token');

    const user = userEvent.setup();
    renderWithProviders(<PedidosPage />);

    await user.click(screen.getByTestId('select-bot'));

    await waitFor(() => {
      expect(screen.getByText('Pizza Margherita')).toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.getByText('3x')).toBeInTheDocument();
  });
});
