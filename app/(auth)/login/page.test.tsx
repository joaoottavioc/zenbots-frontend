import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { renderWithProviders } from '@/tests/helpers/render';
import LoginPage from './page';
import { api } from '@/lib/api';

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
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/login',
  useSearchParams: () => new URLSearchParams(),
}));

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it('sets presence cookie and redirects on successful login', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      data: { access_token: 'fake-jwt-token' },
    } as any);

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
    vi.mocked(api.post).mockResolvedValueOnce({
      data: { access_token: 'fake-jwt-token' },
    } as any);

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
});
