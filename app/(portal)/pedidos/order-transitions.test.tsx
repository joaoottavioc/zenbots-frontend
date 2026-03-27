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

const mockFetch = vi.fn().mockRejectedValue(new Error('no SSE in test'));
globalThis.fetch = mockFetch;

async function renderPageWithOrders(orders: ReturnType<typeof createMockOrder>[]) {
  vi.mocked(api.get).mockResolvedValue(mockResponse(orders));
  vi.mocked(api.patch).mockResolvedValue(mockResponse({}));
  localStorage.setItem('zenbots_token', 'test-token');

  const user = userEvent.setup();
  renderWithProviders(<PedidosPage />);
  await user.click(screen.getByTestId('select-bot'));

  await waitFor(() => {
    expect(screen.getByText('A Fazer')).toBeInTheDocument();
  }, { timeout: 3000 });

  return user;
}

describe('Order status transitions — payment method awareness', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockFetch.mockRejectedValue(new Error('no SSE in test'));
  });

  describe('PIX orders', () => {
    it('disables action button for PIX PENDING orders', async () => {
      const orders = [
        createMockOrder({ id: 1, status: 'PENDING', payment_method: 'pix' }),
      ];
      await renderPageWithOrders(orders);

      // Find the action button specifically (not the payment badge)
      const buttons = screen.getAllByText('Aguardando Pix');
      const actionBtn = buttons.find(el => el.closest('button[class*="flex-1"]'));
      expect(actionBtn).toBeTruthy();
      expect(actionBtn!.closest('button')).toBeDisabled();
    });

    it('enables action button for PIX PAID orders', async () => {
      const orders = [
        createMockOrder({ id: 1, status: 'PAID', payment_method: 'pix' }),
      ];
      await renderPageWithOrders(orders);

      const btn = screen.getByText('Iniciar Preparo');
      expect(btn.closest('button')).not.toBeDisabled();
    });
  });

  describe('Card orders', () => {
    it('enables action button for card PENDING orders', async () => {
      const orders = [
        createMockOrder({ id: 1, status: 'PENDING', payment_method: 'card' }),
      ];
      await renderPageWithOrders(orders);

      const btn = screen.getByText('Iniciar Preparo');
      expect(btn.closest('button')).not.toBeDisabled();
    });

    it('sends preparing status when advancing card PENDING order', async () => {
      const orders = [
        createMockOrder({ id: 1, status: 'PENDING', payment_method: 'card' }),
      ];
      const user = await renderPageWithOrders(orders);

      await user.click(screen.getByText('Iniciar Preparo'));

      expect(api.patch).toHaveBeenCalledWith('/bots/1/orders/1', { status: 'preparing' });
    });
  });

  describe('Money orders', () => {
    it('enables action button for money PENDING orders', async () => {
      const orders = [
        createMockOrder({ id: 1, status: 'PENDING', payment_method: 'money' }),
      ];
      await renderPageWithOrders(orders);

      const btn = screen.getByText('Iniciar Preparo');
      expect(btn.closest('button')).not.toBeDisabled();
    });
  });

  describe('Back button transitions', () => {
    it('sends "pending" when going back from PREPARING for card order', async () => {
      const orders = [
        createMockOrder({ id: 1, status: 'PREPARING', payment_method: 'card' }),
      ];
      const user = await renderPageWithOrders(orders);

      const backBtn = screen.getByLabelText('Voltar status');
      await user.click(backBtn);

      expect(api.patch).toHaveBeenCalledWith('/bots/1/orders/1', { status: 'pending' });
    });

    it('sends "pending" when going back from PREPARING for money order', async () => {
      const orders = [
        createMockOrder({ id: 1, status: 'PREPARING', payment_method: 'money' }),
      ];
      const user = await renderPageWithOrders(orders);

      const backBtn = screen.getByLabelText('Voltar status');
      await user.click(backBtn);

      expect(api.patch).toHaveBeenCalledWith('/bots/1/orders/1', { status: 'pending' });
    });

    it('sends "paid" when going back from PREPARING for pix order', async () => {
      const orders = [
        createMockOrder({ id: 1, status: 'PREPARING', payment_method: 'pix' }),
      ];
      const user = await renderPageWithOrders(orders);

      const backBtn = screen.getByLabelText('Voltar status');
      await user.click(backBtn);

      expect(api.patch).toHaveBeenCalledWith('/bots/1/orders/1', { status: 'paid' });
    });

    it('sends "preparing" when going back from READY for any payment method', async () => {
      const orders = [
        createMockOrder({ id: 1, status: 'READY', payment_method: 'card' }),
      ];
      const user = await renderPageWithOrders(orders);

      const backBtn = screen.getByLabelText('Voltar status');
      await user.click(backBtn);

      expect(api.patch).toHaveBeenCalledWith('/bots/1/orders/1', { status: 'preparing' });
    });
  });

  describe('Forward transitions', () => {
    it('advances PREPARING to ready', async () => {
      const orders = [
        createMockOrder({ id: 1, status: 'PREPARING', payment_method: 'card' }),
      ];
      const user = await renderPageWithOrders(orders);

      await user.click(screen.getByText('Marcar Pronto'));

      expect(api.patch).toHaveBeenCalledWith('/bots/1/orders/1', { status: 'ready' });
    });

    it('advances READY to completed', async () => {
      const orders = [
        createMockOrder({ id: 1, status: 'READY', payment_method: 'card' }),
      ];
      const user = await renderPageWithOrders(orders);

      await user.click(screen.getByText('Finalizar'));

      expect(api.patch).toHaveBeenCalledWith('/bots/1/orders/1', { status: 'completed' });
    });
  });
});
