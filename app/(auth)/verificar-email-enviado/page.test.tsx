import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { renderWithProviders } from '@/tests/helpers/render';
import CheckEmailPage from './page';
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

let mockSearchParams = new URLSearchParams('email=test@example.com');
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/verificar-email-enviado',
  useSearchParams: () => mockSearchParams,
}));

describe('CheckEmailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams('email=test@example.com');
  });

  it('renders the check email screen with user email', () => {
    renderWithProviders(<CheckEmailPage />);

    expect(screen.getByText(/verifique seu e-mail/i)).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('renders resend button', () => {
    renderWithProviders(<CheckEmailPage />);

    expect(screen.getByRole('button', { name: /reenviar e-mail/i })).toBeInTheDocument();
  });

  it('renders link back to signup', () => {
    renderWithProviders(<CheckEmailPage />);

    expect(screen.getByText(/cadastre-se novamente/i)).toBeInTheDocument();
  });

  it('calls resend API and shows success toast', async () => {
    vi.mocked(api.post).mockResolvedValueOnce(mockResponse({}));
    const user = userEvent.setup();
    renderWithProviders(<CheckEmailPage />);

    await user.click(screen.getByRole('button', { name: /reenviar e-mail/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/resend-verification', { email: 'test@example.com' });
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'E-mail reenviado' })
      );
    });
  });

  it('starts cooldown after resend', async () => {
    vi.mocked(api.post).mockResolvedValueOnce(mockResponse({}));
    const user = userEvent.setup();
    renderWithProviders(<CheckEmailPage />);

    await user.click(screen.getByRole('button', { name: /reenviar e-mail/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /reenviar em/i })).toBeDisabled();
    });
  });

  it('shows error toast on resend failure', async () => {
    vi.mocked(api.post).mockRejectedValueOnce(new Error('Network error'));
    const user = userEvent.setup();
    renderWithProviders(<CheckEmailPage />);

    await user.click(screen.getByRole('button', { name: /reenviar e-mail/i }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'destructive' })
      );
    });
  });
});
