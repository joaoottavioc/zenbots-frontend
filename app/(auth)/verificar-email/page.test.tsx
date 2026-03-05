import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { renderWithProviders } from '@/tests/helpers/render';
import VerifyEmailPage from './page';
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
const mockReplace = vi.fn();
let mockSearchParams = new URLSearchParams('token=valid-token');

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    refresh: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/verificar-email',
  useSearchParams: () => mockSearchParams,
}));

describe('VerifyEmailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockSearchParams = new URLSearchParams('token=valid-token');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows loading state initially', () => {
    vi.mocked(api.post).mockReturnValue(new Promise(() => {})); // never resolves
    renderWithProviders(<VerifyEmailPage />);

    expect(screen.getByText(/verificando seu e-mail/i)).toBeInTheDocument();
  });

  it('shows success state on successful verification', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      data: { message: 'E-mail verificado com sucesso!' },
    } as any);

    renderWithProviders(<VerifyEmailPage />);

    await waitFor(() => {
      expect(screen.getByText(/e-mail verificado!/i)).toBeInTheDocument();
    });

    expect(api.post).toHaveBeenCalledWith('/auth/verify-email', { token: 'valid-token' });
  });

  it('shows already-verified state', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      data: { message: 'E-mail já verificado.' },
    } as any);

    renderWithProviders(<VerifyEmailPage />);

    await waitFor(() => {
      expect(screen.getByText(/ja verificado/i)).toBeInTheDocument();
    });
  });

  it('redirects to login after success', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      data: { message: 'E-mail verificado com sucesso!' },
    } as any);

    renderWithProviders(<VerifyEmailPage />);

    await waitFor(() => {
      expect(screen.getByText(/e-mail verificado!/i)).toBeInTheDocument();
    });

    vi.advanceTimersByTime(3000);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login?verified=true');
    });
  });

  it('shows error state on invalid token', async () => {
    vi.mocked(api.post).mockRejectedValueOnce({
      response: { status: 400, data: { detail: 'Token inválido ou expirado.' } },
    });

    renderWithProviders(<VerifyEmailPage />);

    await waitFor(() => {
      expect(screen.getByText(/link invalido ou expirado/i)).toBeInTheDocument();
    });
  });

  it('shows error when no token provided', async () => {
    mockSearchParams = new URLSearchParams('');
    renderWithProviders(<VerifyEmailPage />);

    await waitFor(() => {
      expect(screen.getByText(/link invalido ou expirado/i)).toBeInTheDocument();
    });

    expect(api.post).not.toHaveBeenCalled();
  });

  it('allows requesting a new link on error', async () => {
    vi.mocked(api.post).mockRejectedValueOnce({
      response: { status: 400, data: { detail: 'Token inválido ou expirado.' } },
    });

    renderWithProviders(<VerifyEmailPage />);

    await waitFor(() => {
      expect(screen.getByText(/link invalido ou expirado/i)).toBeInTheDocument();
    });

    vi.mocked(api.post).mockResolvedValueOnce({ data: {} } as any);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    await user.type(screen.getByPlaceholderText('seu@email.com'), 'test@example.com');
    await user.click(screen.getByRole('button', { name: /solicitar novo link/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/resend-verification', { email: 'test@example.com' });
    });
  });
});
