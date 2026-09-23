import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { renderWithProviders } from '@/tests/helpers/render';
import LoginPage from './page';
import { api } from '@/lib/api';
import { mockResponse } from '@/tests/helpers/mocks';

// Mock the api module
vi.mock('@/lib/api', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
    interceptors: { request: { use: vi.fn() } },
  },
}));

// Mock useToast
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Mock useRouter
const mockPush = vi.fn();
const mockReplace = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    refresh: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/login',
  useSearchParams: () => mockSearchParams,
}));

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    document.cookie = 'zenbots_auth=; path=/; max-age=0';
  });

  it('renders the login form with email and password fields', () => {
    renderWithProviders(<LoginPage />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /entrar na conta/i })).toBeInTheDocument();
  });

  it('renders link to register page', () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByText(/criar uma conta gratuitamente/i)).toBeInTheDocument();
  });

  it('renders forgot password link', () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByText(/esqueceu a senha/i)).toBeInTheDocument();
  });

  it('renders the Google sign-in option when a client ID is configured', () => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_CLIENT_ID', 'test-client.apps.googleusercontent.com');
    renderWithProviders(<LoginPage />);
    expect(screen.getByText(/ou continue com/i)).toBeInTheDocument();
    vi.unstubAllEnvs();
  });

  it('omits the Google sign-in option when no client ID is configured', () => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_CLIENT_ID', '');
    renderWithProviders(<LoginPage />);
    expect(screen.queryByText(/ou continue com/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /entrar na conta/i })).toBeInTheDocument();
    vi.unstubAllEnvs();
  });

  it('sets presence cookie and redirects on successful login', async () => {
    vi.mocked(api.post).mockResolvedValueOnce(mockResponse({ access_token: 'fake-jwt-token' }));

    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/senha/i), 'password123');
    await user.click(screen.getByRole('button', { name: /entrar na conta/i }));

    await waitFor(() => {
      expect(document.cookie).toContain('zenbots_auth=1');
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/meus-bots');
    });
  });

  it('does not submit with invalid email', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    await user.type(screen.getByLabelText(/email/i), 'not-an-email');
    await user.type(screen.getByLabelText(/senha/i), 'password123');
    await user.click(screen.getByRole('button', { name: /entrar na conta/i }));

    // Wait a tick for form validation
    await waitFor(() => {
      expect(api.post).not.toHaveBeenCalled();
    });
  });

  it('sends URLSearchParams format to the API', async () => {
    vi.mocked(api.post).mockResolvedValueOnce(mockResponse({ access_token: 'fake-jwt-token' }));

    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/senha/i), 'password123');
    await user.click(screen.getByRole('button', { name: /entrar na conta/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalled();
    });

    const callArgs = vi.mocked(api.post).mock.calls[0];
    const formData = callArgs[1] as URLSearchParams;
    expect(formData.get('username')).toBe('test@example.com');
    expect(formData.get('password')).toBe('password123');
  });

  it('shows error toast on failed login', async () => {
    vi.mocked(api.post).mockRejectedValueOnce(new Error('Unauthorized'));

    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    await user.type(screen.getByLabelText(/email/i), 'wrong@example.com');
    await user.type(screen.getByLabelText(/senha/i), 'wrongpass');
    await user.click(screen.getByRole('button', { name: /entrar na conta/i }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'destructive' })
      );
    });
  });

  it('shows unverified email banner on 403 response', async () => {
    vi.mocked(api.post).mockRejectedValueOnce({
      response: { status: 403, data: { detail: 'Email não verificado.' } },
    });

    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    await user.type(screen.getByLabelText(/email/i), 'unverified@example.com');
    await user.type(screen.getByLabelText(/senha/i), 'password123');
    await user.click(screen.getByRole('button', { name: /entrar na conta/i }));

    await waitFor(() => {
      expect(screen.getByText(/e-mail ainda nao foi verificado/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /reenviar e-mail/i })).toBeInTheDocument();
  });

  it('calls resend verification API from unverified banner', async () => {
    vi.mocked(api.post).mockRejectedValueOnce({
      response: { status: 403, data: { detail: 'Email não verificado.' } },
    });

    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    await user.type(screen.getByLabelText(/email/i), 'unverified@example.com');
    await user.type(screen.getByLabelText(/senha/i), 'password123');
    await user.click(screen.getByRole('button', { name: /entrar na conta/i }));

    await waitFor(() => {
      expect(screen.getByText(/e-mail ainda nao foi verificado/i)).toBeInTheDocument();
    });

    vi.mocked(api.post).mockResolvedValueOnce(mockResponse({}));
    await user.click(screen.getByRole('button', { name: /reenviar e-mail/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/resend-verification', { email: 'unverified@example.com' });
    });
  });

  it('shows verified toast when redirected with verified param', () => {
    mockSearchParams = new URLSearchParams('verified=true');
    renderWithProviders(<LoginPage />);

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'E-mail verificado!' })
    );
  });
});
