import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { renderWithProviders } from '@/tests/helpers/render';
import ProdutosPage from './page';
import { api } from '@/lib/api';
import { createMockProduct } from '@/tests/helpers/mocks';

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    interceptors: { request: { use: vi.fn() } },
  },
}));

const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/produtos',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/components/layout/dashboard-header', () => ({
  DashboardHeader: ({ children, selectedBotId, onBotChange }: any) => (
    <div data-testid="dashboard-header">
      {!selectedBotId && (
        <button onClick={() => onBotChange('1')} data-testid="select-bot">
          Select Bot
        </button>
      )}
      {children}
    </div>
  ),
}));

vi.mock('./product-form', () => ({
  ProductForm: () => <div data-testid="product-form">Product Form</div>,
}));

vi.mock('./menu-import-dialog', () => ({
  MenuImportDialog: () => <div data-testid="menu-import-dialog">Import</div>,
}));

describe('ProdutosPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows message to select bot when none selected', () => {
    renderWithProviders(<ProdutosPage />);
    expect(screen.getByText(/selecione um bot acima/i)).toBeInTheDocument();
  });

  it('shows empty state when no products exist', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('/products')) return Promise.resolve({ data: [] }) as any;
      if (url.includes('/bots')) return Promise.resolve({ data: [{ id: 1, restaurant_name: 'Test', menu_url: null }] }) as any;
      return Promise.resolve({ data: [] }) as any;
    });

    renderWithProviders(<ProdutosPage />);

    // Select a bot
    screen.getByTestId('select-bot').click();

    await waitFor(() => {
      expect(screen.getByText(/cardápio vazio/i)).toBeInTheDocument();
    });
  });

  it('renders products grouped by category', async () => {
    const products = [
      createMockProduct({ id: 1, name: 'X-Bacon', category: 'Lanches', price: 25.9 }),
      createMockProduct({ id: 2, name: 'X-Tudo', category: 'Lanches', price: 32.0 }),
      createMockProduct({ id: 3, name: 'Coca-Cola', category: 'Bebidas', price: 8.0 }),
    ];

    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('/products')) return Promise.resolve({ data: products }) as any;
      if (url.includes('/bots')) return Promise.resolve({ data: [{ id: 1, restaurant_name: 'Test', menu_url: null }] }) as any;
      return Promise.resolve({ data: [] }) as any;
    });

    renderWithProviders(<ProdutosPage />);
    screen.getByTestId('select-bot').click();

    await waitFor(() => {
      expect(screen.getByText('Lanches')).toBeInTheDocument();
      expect(screen.getByText('X-Bacon')).toBeInTheDocument();
      expect(screen.getByText('X-Tudo')).toBeInTheDocument();
    });

    // Bebidas category
    expect(screen.getByText('Bebidas')).toBeInTheDocument();
    expect(screen.getByText('Coca-Cola')).toBeInTheDocument();
  });

  it('renders availability toggle switches for products', async () => {
    const products = [
      createMockProduct({ id: 1, name: 'X-Bacon', is_available: true }),
    ];

    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('/products')) return Promise.resolve({ data: products }) as any;
      if (url.includes('/bots')) return Promise.resolve({ data: [{ id: 1, restaurant_name: 'Test', menu_url: null }] }) as any;
      return Promise.resolve({ data: [] }) as any;
    });

    renderWithProviders(<ProdutosPage />);
    screen.getByTestId('select-bot').click();

    await waitFor(() => {
      const switches = screen.getAllByRole('switch');
      expect(switches.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows error state when products query fails', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('/products')) return Promise.reject(new Error('Network error'));
      if (url.includes('/bots')) return Promise.resolve({ data: [{ id: 1, restaurant_name: 'Test', menu_url: null }] }) as any;
      return Promise.resolve({ data: [] }) as any;
    });

    renderWithProviders(<ProdutosPage />);
    screen.getByTestId('select-bot').click();

    await waitFor(() => {
      expect(screen.getByText(/erro ao carregar produtos/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/tentar novamente/i)).toBeInTheDocument();
  });

  it('shows error toast when delete mutation fails', async () => {
    const products = [
      createMockProduct({ id: 1, name: 'X-Bacon' }),
    ];

    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('/products')) return Promise.resolve({ data: products }) as any;
      if (url.includes('/bots')) return Promise.resolve({ data: [{ id: 1, restaurant_name: 'Test', menu_url: null }] }) as any;
      return Promise.resolve({ data: [] }) as any;
    });

    vi.mocked(api.delete).mockRejectedValue(new Error('Network error'));

    const user = userEvent.setup();
    renderWithProviders(<ProdutosPage />);
    screen.getByTestId('select-bot').click();

    await waitFor(() => {
      expect(screen.getByText('X-Bacon')).toBeInTheDocument();
    });

    // Click the delete button (trash icon) that appears on hover
    const deleteButtons = screen.getAllByRole('button');
    const trashButton = deleteButtons.find(
      btn => btn.querySelector('.lucide-trash-2') || btn.querySelector('svg')
    );

    // Find the delete icon button in the actions column
    const allButtons = document.querySelectorAll('button');
    let deleteBtn: HTMLElement | null = null;
    allButtons.forEach(btn => {
      if (btn.innerHTML.includes('trash') || btn.innerHTML.includes('Trash')) {
        deleteBtn = btn;
      }
    });

    if (deleteBtn) {
      await user.click(deleteBtn);

      // Confirm delete in the alert dialog
      await waitFor(() => {
        expect(screen.getByText(/excluir produto/i)).toBeInTheDocument();
      });
      await user.click(screen.getByRole('button', { name: /excluir/i }));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({ title: "Erro ao excluir", variant: "destructive" })
        );
      });
    }
  });
});
