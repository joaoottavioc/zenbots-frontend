import { screen } from '@testing-library/react';
import { vi } from 'vitest';
import { renderWithProviders } from '@/tests/helpers/render';
import { Sidebar } from './sidebar';

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    interceptors: { request: { use: vi.fn() } },
  },
}));

vi.mock('@/components/ui/logo', () => ({
  Logo: () => <div data-testid="logo">Logo</div>,
}));

let mockPathname = '/meus-bots';
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => mockPathname,
  useSearchParams: () => new URLSearchParams(),
}));

describe('Sidebar', () => {
  beforeEach(() => {
    mockPathname = '/meus-bots';
  });

  it('renders all 7 navigation links', () => {
    renderWithProviders(<Sidebar />);

    expect(screen.getByText('Meus BotZ')).toBeInTheDocument();
    expect(screen.getByText('Produtos')).toBeInTheDocument();
    expect(screen.getByText('Pedidos')).toBeInTheDocument();
    expect(screen.getByText('Mais Vendidos')).toBeInTheDocument();
    expect(screen.getByText('Integração Pix')).toBeInTheDocument();
    expect(screen.getByText('Configurações')).toBeInTheDocument();
    expect(screen.getByText('Suporte')).toBeInTheDocument();
  });

  it('renders correct href for each link', () => {
    renderWithProviders(<Sidebar />);

    const links = screen.getAllByRole('link');
    const hrefs = links.map((link) => link.getAttribute('href'));

    expect(hrefs).toContain('/meus-bots');
    expect(hrefs).toContain('/produtos');
    expect(hrefs).toContain('/pedidos');
    expect(hrefs).toContain('/analytics');
    expect(hrefs).toContain('/pagamentos');
    expect(hrefs).toContain('/settings');
    expect(hrefs).toContain('/suporte');
  });

  it('highlights active route', () => {
    mockPathname = '/produtos';
    renderWithProviders(<Sidebar />);

    const activeLink = screen.getByText('Produtos').closest('a');
    expect(activeLink?.className).toContain('bg-white/10');

    const inactiveLink = screen.getByText('Pedidos').closest('a');
    expect(inactiveLink?.className).toContain('text-zinc-400');
  });

  it('uses a <nav> element with aria-label', () => {
    renderWithProviders(<Sidebar />);

    const nav = screen.getByRole('navigation', { name: 'Menu principal' });
    expect(nav).toBeInTheDocument();
  });
});
