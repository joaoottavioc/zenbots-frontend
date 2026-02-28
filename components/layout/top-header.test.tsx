import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { renderWithProviders } from '@/tests/helpers/render';
import { TopHeader } from './top-header';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/meus-bots',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    interceptors: { request: { use: vi.fn() } },
  },
}));

describe('TopHeader', () => {
  it('renders hamburger menu button', () => {
    renderWithProviders(<TopHeader />);

    const menuBtn = screen.getByRole('button', { name: /abrir menu/i });
    expect(menuBtn).toBeInTheDocument();
  });

  it('opens sheet with all 7 nav items on click', async () => {
    const user = userEvent.setup();
    renderWithProviders(<TopHeader />);

    const menuBtn = screen.getByRole('button', { name: /abrir menu/i });
    await user.click(menuBtn);

    await waitFor(() => {
      expect(screen.getByText('Meus BotZ')).toBeInTheDocument();
    });

    expect(screen.getByText('Produtos')).toBeInTheDocument();
    expect(screen.getByText('Pedidos')).toBeInTheDocument();
    expect(screen.getByText('Mais Vendidos')).toBeInTheDocument();
    expect(screen.getByText('Integração Pix')).toBeInTheDocument();
    expect(screen.getByText('Configurações')).toBeInTheDocument();
    expect(screen.getByText('Suporte')).toBeInTheDocument();
  });

  it('nav items have correct hrefs', async () => {
    const user = userEvent.setup();
    renderWithProviders(<TopHeader />);

    await user.click(screen.getByRole('button', { name: /abrir menu/i }));

    await waitFor(() => {
      expect(screen.getByText('Meus BotZ')).toBeInTheDocument();
    });

    const expectedHrefs = [
      '/meus-bots',
      '/produtos',
      '/pedidos',
      '/analytics',
      '/pagamentos',
      '/settings',
      '/suporte',
    ];

    const links = screen.getAllByRole('link');
    const navLinks = links.filter(link =>
      expectedHrefs.includes(link.getAttribute('href') || '')
    );

    expect(navLinks).toHaveLength(7);
    expectedHrefs.forEach(href => {
      expect(navLinks.find(link => link.getAttribute('href') === href)).toBeTruthy();
    });
  });
});
