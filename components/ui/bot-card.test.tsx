import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { renderWithProviders } from '@/tests/helpers/render';
import { BotCard } from './bot-card';
import { createMockBot } from '@/tests/helpers/mocks';
import type { Bot } from '@/lib/types';

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

// Default tests assume WhatsApp signup is open — overridable per-test
// via `vi.mocked(isWhatsappSignupEnabled).mockReturnValue(false)` for the
// "Em breve" deferred-state cases.
vi.mock('@/lib/feature-flags', () => ({
  isWhatsappSignupEnabled: vi.fn(() => true),
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

  it('renders bot name and WhatsApp number when available', () => {
    const bot = createMockBot({ whatsapp_number: '5511999999999' });
    renderWithProviders(<BotCard bot={bot as Bot} {...defaultProps} />);

    expect(screen.getByText('Pizzaria Teste')).toBeInTheDocument();
    expect(screen.getByText('+55 (11) 99999-9999')).toBeInTheDocument();
  });

  it('does not show WhatsApp number when not available', () => {
    const bot = createMockBot({ whatsapp_number: undefined });
    renderWithProviders(<BotCard bot={bot as Bot} {...defaultProps} />);

    expect(screen.getByText('Pizzaria Teste')).toBeInTheDocument();
    expect(screen.queryByText('+55 (11) 99999-9999')).not.toBeInTheDocument();
  });

  it('shows connected status when phone_number_id is present', () => {
    const bot = createMockBot({ phone_number_id: 'phone_123' });
    renderWithProviders(<BotCard bot={bot as Bot} {...defaultProps} />);

    // Match the WhatsApp chip specifically — there is also a "Web Ativo/Inativo"
    // chip whose label can contain "conectado"-like substrings depending on
    // future copy changes.
    expect(screen.getByText(/WhatsApp Conectado/i)).toBeInTheDocument();
  });

  it('shows not connected when phone_number_id is empty', () => {
    const bot = createMockBot({ phone_number_id: '' });
    renderWithProviders(<BotCard bot={bot as Bot} {...defaultProps} />);

    expect(screen.getByText(/WhatsApp Não Conectado/i)).toBeInTheDocument();
  });

  it('shows "WhatsApp em breve" chip when signup flag is closed', async () => {
    const flags = await import('@/lib/feature-flags');
    vi.mocked(flags.isWhatsappSignupEnabled).mockReturnValueOnce(false);
    const bot = createMockBot({ phone_number_id: 'phone_123' });
    renderWithProviders(<BotCard bot={bot as Bot} {...defaultProps} />);

    expect(screen.getByText(/WhatsApp em breve/i)).toBeInTheDocument();
    expect(screen.queryByText(/WhatsApp Conectado/i)).not.toBeInTheDocument();
  });

  it('shows "Aberta" when bot is open', () => {
    const bot = createMockBot({ is_open: true });
    renderWithProviders(<BotCard bot={bot as Bot} {...defaultProps} />);

    expect(screen.getByText(/aberta/i)).toBeInTheDocument();
  });

  it('shows "Fechada" when bot is closed', () => {
    const bot = createMockBot({ is_open: false });
    renderWithProviders(<BotCard bot={bot as Bot} {...defaultProps} />);

    expect(screen.getByText(/fechada/i)).toBeInTheDocument();
  });

  it('calls onToggleStatus when switch is toggled', async () => {
    const bot = createMockBot({ is_open: true });
    const user = userEvent.setup();
    renderWithProviders(<BotCard bot={bot as Bot} {...defaultProps} />);

    const switchEl = screen.getByRole('switch');
    await user.click(switchEl);

    expect(defaultProps.onToggleStatus).toHaveBeenCalledWith(1, false);
  });

  it('shows ConnectWhatsApp button when not connected', () => {
    const bot = createMockBot({ phone_number_id: '' });
    renderWithProviders(<BotCard bot={bot as Bot} {...defaultProps} />);

    expect(screen.getByTestId('connect-whatsapp')).toBeInTheDocument();
  });

  it('shows Gerenciar button when connected', () => {
    const bot = createMockBot({ phone_number_id: 'phone_123' });
    renderWithProviders(<BotCard bot={bot as Bot} {...defaultProps} />);

    expect(screen.getByText(/gerenciar/i)).toBeInTheDocument();
  });

  it('has aria-label on the menu button', () => {
    const bot = createMockBot();
    renderWithProviders(<BotCard bot={bot as Bot} {...defaultProps} />);

    expect(screen.getByLabelText('Menu de ações')).toBeInTheDocument();
  });

  it('has aria-label on the store status switch', () => {
    const bot = createMockBot();
    renderWithProviders(<BotCard bot={bot as Bot} {...defaultProps} />);

    expect(screen.getByLabelText('Alterar status da loja')).toBeInTheDocument();
  });
});
