import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { renderWithProviders } from '@/tests/helpers/render';
import SuportePage from './page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/suporte',
  useSearchParams: () => new URLSearchParams(),
}));

const originalEnv = process.env;

describe('SuportePage', () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('renders FAQ section with questions', () => {
    renderWithProviders(<SuportePage />);

    expect(screen.getByText(/perguntas frequentes/i)).toBeInTheDocument();
    expect(screen.getByText(/como conecto meu whatsapp ao bot/i)).toBeInTheDocument();
  });

  it('renders all category filter buttons', () => {
    renderWithProviders(<SuportePage />);

    const buttons = screen.getAllByRole('button');
    const buttonTexts = buttons.map(btn => btn.textContent);

    expect(buttonTexts).toContain('Todas');
    expect(buttonTexts).toContain('WhatsApp');
    expect(buttonTexts).toContain('Pedidos');
    expect(buttonTexts).toContain('Pagamentos');
    expect(buttonTexts).toContain('Conta');
  });

  it('filters FAQs by search text', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SuportePage />);

    const searchInput = screen.getByPlaceholderText(/buscar nas perguntas/i);
    await user.type(searchInput, 'estorno');

    expect(screen.getByText(/como funciona o estorno de pix/i)).toBeInTheDocument();
    expect(screen.queryByText(/como conecto meu whatsapp/i)).not.toBeInTheDocument();
  });

  it('filters FAQs by category button', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SuportePage />);

    await user.click(screen.getByText('Conta'));

    expect(screen.getByText(/como altero minha senha/i)).toBeInTheDocument();
    expect(screen.queryByText(/como conecto meu whatsapp/i)).not.toBeInTheDocument();
  });

  it('shows "nenhum resultado" when search has no matches', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SuportePage />);

    await user.type(screen.getByPlaceholderText(/buscar nas perguntas/i), 'xyznonexistent');

    expect(screen.getByText(/nenhum resultado encontrado/i)).toBeInTheDocument();
  });

  it('renders WhatsApp contact link with env var number', () => {
    process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP = '5511988887777';
    renderWithProviders(<SuportePage />);

    const link = screen.getByText('Conversar');
    expect(link.closest('a')?.getAttribute('href')).toBe('https://wa.me/5511988887777');
  });

  it('renders disabled button when env var is not set', () => {
    delete process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP;
    renderWithProviders(<SuportePage />);

    const button = screen.getByText('Indisponível');
    expect(button).toBeInTheDocument();
    expect(button.closest('button')).toBeDisabled();
  });

  it('renders contact section with Email', () => {
    renderWithProviders(<SuportePage />);

    expect(screen.getByText('Enviar')).toBeInTheDocument();
  });
});
