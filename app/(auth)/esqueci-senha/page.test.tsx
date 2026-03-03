import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { renderWithProviders } from '@/tests/helpers/render';
import ForgotPasswordPage from './page';
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

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/esqueci-senha',
  useSearchParams: () => new URLSearchParams(),
}));

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the forgot password form', () => {
    renderWithProviders(<ForgotPasswordPage />);

    expect(screen.getByText(/esqueceu a senha/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email cadastrado/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /enviar link de recuperação/i })).toBeInTheDocument();
  });

  it('renders back to login link', () => {
    renderWithProviders(<ForgotPasswordPage />);
    expect(screen.getByText(/voltar para login/i)).toBeInTheDocument();
  });

  it('switches to confirmation view on success', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ data: {} } as any);

    const user = userEvent.setup();
    renderWithProviders(<ForgotPasswordPage />);

    await user.type(screen.getByLabelText(/email cadastrado/i), 'user@test.com');
    await user.click(screen.getByRole('button', { name: /enviar link de recuperação/i }));

    await waitFor(() => {
      expect(screen.getByText(/verifique seu e-mail/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/user@test.com/)).toBeInTheDocument();
  });

  it('does not submit with invalid email', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ForgotPasswordPage />);

    await user.type(screen.getByLabelText(/email cadastrado/i), 'not-an-email');
    await user.click(screen.getByRole('button', { name: /enviar link de recuperação/i }));

    // Wait a tick for form validation
    await waitFor(() => {
      expect(api.post).not.toHaveBeenCalled();
    });
  });

  it('shows success view on failure to prevent email enumeration', async () => {
    vi.mocked(api.post).mockRejectedValueOnce(new Error('Server error'));

    const user = userEvent.setup();
    renderWithProviders(<ForgotPasswordPage />);

    await user.type(screen.getByLabelText(/email cadastrado/i), 'user@test.com');
    await user.click(screen.getByRole('button', { name: /enviar link de recuperação/i }));

    await waitFor(() => {
      expect(screen.getByText(/verifique seu e-mail/i)).toBeInTheDocument();
    });
  });
});
