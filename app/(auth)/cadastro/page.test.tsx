import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { renderWithProviders } from '@/tests/helpers/render';
import RegisterPage from './page';
import { api } from '@/lib/api';

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

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/cadastro',
  useSearchParams: () => new URLSearchParams(),
}));

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the registration form', () => {
    renderWithProviders(<RegisterPage />);

    expect(screen.getByText(/criar uma conta/i)).toBeInTheDocument();
    expect(screen.getByText(/cadastrar gratuitamente/i)).toBeInTheDocument();
  });

  it('shows password strength checklist items', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterPage />);

    const passwordInput = screen.getAllByPlaceholderText('******')[0];
    await user.type(passwordInput, 'Aa1!aaaa');

    expect(screen.getByText(/min. 8 caracteres/i)).toBeInTheDocument();
    expect(screen.getByText(/maiúscula/i)).toBeInTheDocument();
    expect(screen.getByText(/minúscula/i)).toBeInTheDocument();
    expect(screen.getByText(/número/i)).toBeInTheDocument();
  });

  it('shows password mismatch error on submit', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterPage />);

    await user.type(screen.getByPlaceholderText('seu@email.com'), 'test@test.com');

    const passwordFields = screen.getAllByPlaceholderText('******');
    await user.type(passwordFields[0], 'StrongPass1!');
    await user.type(passwordFields[1], 'DifferentPass1!');

    await user.click(screen.getByText(/cadastrar gratuitamente/i));

    await waitFor(() => {
      expect(screen.getByText(/as senhas não coincidem/i)).toBeInTheDocument();
    });
  });

  it('redirects to login on successful registration', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ data: {} } as any);

    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithProviders(<RegisterPage />);

    await user.type(screen.getByPlaceholderText('seu@email.com'), 'new@test.com');

    const passwordFields = screen.getAllByPlaceholderText('******');
    await user.type(passwordFields[0], 'StrongPass1!');
    await user.type(passwordFields[1], 'StrongPass1!');

    await user.click(screen.getByText(/cadastrar gratuitamente/i));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalled();
    });

    // Advance timers for the redirect setTimeout
    vi.advanceTimersByTime(2000);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });

    vi.useRealTimers();
  });
});
