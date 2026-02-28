import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { renderWithProviders } from '@/tests/helpers/render';
import { BotCard } from './bot-card';
import { createMockBot } from '@/tests/helpers/mocks';

vi.mock('@/lib/api', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
    interceptors: { request: { use: vi.fn() } },
  },
}));

const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/components/ui/connect-whatsapp-button', () => ({
  default: ({ botId }: { botId: number }) => (
    <button data-testid="connect-whatsapp">Conectar WhatsApp #{botId}</button>
  ),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

describe('BotCard', () => {
  const defaultProps = {
    onEdit: vi.fn(),
    onToggleStatus: vi.fn(),
    onDelete: vi.fn(),
    onDisconnect: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders bot name and WhatsApp number', () => {
    const bot = createMockBot();
    renderWithProviders(<BotCard bot={bot as any} {...defaultProps} />);

    expect(screen.getByText('Pizzaria Teste')).toBeInTheDocument();
    expect(screen.getByText('5511999999999')).toBeInTheDocument();
  });

  it('shows connected status when phone_number_id is present', () => {
    const bot = createMockBot({ phone_number_id: 'phone_123' });
    renderWithProviders(<BotCard bot={bot as any} {...defaultProps} />);

    expect(screen.getByText(/whatsapp conectado/i)).toBeInTheDocument();
  });

  it('shows not connected when phone_number_id is empty', () => {
    const bot = createMockBot({ phone_number_id: '' });
    renderWithProviders(<BotCard bot={bot as any} {...defaultProps} />);

    expect(screen.getByText(/não conectado/i)).toBeInTheDocument();
  });

  it('shows "Aberta" when bot is open', () => {
    const bot = createMockBot({ is_open: true });
    renderWithProviders(<BotCard bot={bot as any} {...defaultProps} />);

    expect(screen.getByText(/aberta/i)).toBeInTheDocument();
  });

  it('shows "Fechada" when bot is closed', () => {
    const bot = createMockBot({ is_open: false });
    renderWithProviders(<BotCard bot={bot as any} {...defaultProps} />);

    expect(screen.getByText(/fechada/i)).toBeInTheDocument();
  });

  it('calls onToggleStatus when switch is toggled', async () => {
    const bot = createMockBot({ is_open: true });
    const user = userEvent.setup();
    renderWithProviders(<BotCard bot={bot as any} {...defaultProps} />);

    const switchEl = screen.getByRole('switch');
    await user.click(switchEl);

    expect(defaultProps.onToggleStatus).toHaveBeenCalledWith(1, false);
  });

  it('shows ConnectWhatsApp button when not connected', () => {
    const bot = createMockBot({ phone_number_id: '' });
    renderWithProviders(<BotCard bot={bot as any} {...defaultProps} />);

    expect(screen.getByTestId('connect-whatsapp')).toBeInTheDocument();
  });

  it('shows Gerenciar button when connected', () => {
    const bot = createMockBot({ phone_number_id: 'phone_123' });
    renderWithProviders(<BotCard bot={bot as any} {...defaultProps} />);

    expect(screen.getByText(/gerenciar/i)).toBeInTheDocument();
  });

  it('has aria-label on the menu button', () => {
    const bot = createMockBot();
    renderWithProviders(<BotCard bot={bot as any} {...defaultProps} />);

    expect(screen.getByLabelText('Menu de ações')).toBeInTheDocument();
  });

  it('has aria-label on the store status switch', () => {
    const bot = createMockBot();
    renderWithProviders(<BotCard bot={bot as any} {...defaultProps} />);

    expect(screen.getByLabelText('Alterar status da loja')).toBeInTheDocument();
  });
});
