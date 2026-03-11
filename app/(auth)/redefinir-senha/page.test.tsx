import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { renderWithProviders } from '@/tests/helpers/render';
import ResetPasswordPage from './page';
import { api } from '@/lib/api';
import { mockResponse } from '@/tests/helpers/mocks';

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
let mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/redefinir-senha',
  useSearchParams: () => mockSearchParams,
}));

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  it('shows invalid link message when no token in URL', () => {
    mockSearchParams = new URLSearchParams();
    renderWithProviders(<ResetPasswordPage />);

    expect(screen.getByText(/link inválido ou expirado/i)).toBeInTheDocument();
  });

  it('renders password form when token is present', () => {
    mockSearchParams = new URLSearchParams('token=valid-reset-token');
    renderWithProviders(<ResetPasswordPage />);

    expect(screen.getByRole('heading', { name: /nova senha/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /alterar senha/i })).toBeInTheDocument();
  });

  it('shows password validation checklist', () => {
    mockSearchParams = new URLSearchParams('token=valid-reset-token');
    renderWithProviders(<ResetPasswordPage />);

    expect(screen.getByText(/min. 8 caracteres/i)).toBeInTheDocument();
    expect(screen.getByText(/maiúscula/i)).toBeInTheDocument();
    expect(screen.getByText(/minúscula/i)).toBeInTheDocument();
  });

  it('shows mismatch error when passwords do not match', async () => {
    mockSearchParams = new URLSearchParams('token=valid-reset-token');
    const user = userEvent.setup();
    renderWithProviders(<ResetPasswordPage />);

    const passwordFields = screen.getAllByPlaceholderText('******');
    await user.type(passwordFields[0], 'NewPass1!');
    await user.type(passwordFields[1], 'DifferentPass1!');

    // Trigger blur to validate
    await user.tab();

    await waitFor(() => {
      expect(screen.getByText(/as senhas não coincidem/i)).toBeInTheDocument();
    });
  });

  it('redirects to login on successful password reset', async () => {
    mockSearchParams = new URLSearchParams('token=valid-reset-token');
    vi.mocked(api.post).mockResolvedValueOnce(mockResponse({}));

    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithProviders(<ResetPasswordPage />);

    const passwordFields = screen.getAllByPlaceholderText('******');
    await user.type(passwordFields[0], 'NewPass1!');
    await user.type(passwordFields[1], 'NewPass1!');

    await user.click(screen.getByRole('button', { name: /alterar senha/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText(/senha atualizada/i)).toBeInTheDocument();
    });

    vi.advanceTimersByTime(3000);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });

    vi.useRealTimers();
  });
});
