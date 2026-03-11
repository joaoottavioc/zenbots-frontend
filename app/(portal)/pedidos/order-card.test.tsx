import { screen } from '@testing-library/react';
import { vi } from 'vitest';
import { renderWithProviders } from '@/tests/helpers/render';
import { OrderCard } from './order-card';
import { createMockOrder } from '@/tests/helpers/mocks';
import type { Order } from './types';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/pedidos',
  useSearchParams: () => new URLSearchParams(),
}));

describe('OrderCard', () => {
  const defaultProps = {
    onAction: vi.fn(),
    onBack: vi.fn(),
    onCancel: vi.fn(),
    onTakeover: vi.fn(),
    onPrint: vi.fn(),
    actionLabel: 'Iniciar Preparo',
    actionVariant: 'primary' as const,
    disabled: false,
    badgeColor: 'bg-blue-100 text-blue-700',
  };

  it('has aria-label on the print button', () => {
    const order = createMockOrder();
    renderWithProviders(<OrderCard order={order as Order} {...defaultProps} />);

    expect(screen.getByLabelText('Imprimir pedido')).toBeInTheDocument();
  });

  it('has aria-label on the undo button', () => {
    const order = createMockOrder();
    renderWithProviders(<OrderCard order={order as Order} {...defaultProps} />);

    expect(screen.getByLabelText('Voltar status')).toBeInTheDocument();
  });

  it('has aria-label on the cancel button', () => {
    const order = createMockOrder({ status: 'PENDING' });
    renderWithProviders(<OrderCard order={order as Order} {...defaultProps} />);

    expect(screen.getByLabelText('Cancelar pedido')).toBeInTheDocument();
  });

  it('has aria-label on the human takeover switch', () => {
    const order = createMockOrder();
    renderWithProviders(<OrderCard order={order as Order} {...defaultProps} />);

    expect(screen.getByLabelText('Atendimento humano')).toBeInTheDocument();
  });
});
