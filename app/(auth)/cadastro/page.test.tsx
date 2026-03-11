import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { renderWithProviders } from '@/tests/helpers/render';
import RegisterPage from './page';
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

  it('renders the registration form with all fields', () => {
    renderWithProviders(<RegisterPage />);

    expect(screen.getByRole('heading', { name: /criar sua conta/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/nome completo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /criar conta gratis/i })).toBeInTheDocument();
  });

  it('shows password strength checklist items', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterPage />);

    const passwordInput = screen.getAllByPlaceholderText('********')[0];
    await user.type(passwordInput, 'Aa1!aaaa');

    expect(screen.getByText(/min. 8 caracteres/i)).toBeInTheDocument();
    expect(screen.getByText(/maiuscula/i)).toBeInTheDocument();
    expect(screen.getByText(/minuscula/i)).toBeInTheDocument();
    expect(screen.getByText(/numero/i)).toBeInTheDocument();
  });

  it('shows password mismatch error on submit', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterPage />);

    await user.type(screen.getByLabelText(/nome completo/i), 'Test User');
    await user.type(screen.getByPlaceholderText('seu@email.com'), 'test@test.com');

    const passwordFields = screen.getAllByPlaceholderText('********');
    await user.type(passwordFields[0], 'StrongPass1!');
    await user.type(passwordFields[1], 'DifferentPass1!');

    await user.click(screen.getByText(/criar conta gratis/i));

    await waitFor(() => {
      expect(screen.getByText(/as senhas nao coincidem/i)).toBeInTheDocument();
    });
  });

  it('redirects to check-email page on successful registration', async () => {
    vi.mocked(api.post).mockResolvedValueOnce(mockResponse({}));

    const user = userEvent.setup();
    renderWithProviders(<RegisterPage />);

    await user.type(screen.getByLabelText(/nome completo/i), 'Test User');
    await user.type(screen.getByPlaceholderText('seu@email.com'), 'new@test.com');

    const passwordFields = screen.getAllByPlaceholderText('********');
    await user.type(passwordFields[0], 'StrongPass1!');
    await user.type(passwordFields[1], 'StrongPass1!');

    await user.click(screen.getByText(/criar conta gratis/i));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/register', expect.objectContaining({
        name: 'Test User',
        email: 'new@test.com',
        password: 'StrongPass1!',
      }));
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/verificar-email-enviado?email=new%40test.com');
    });
  });

  it('sends whatsapp when provided', async () => {
    vi.mocked(api.post).mockResolvedValueOnce(mockResponse({}));

    const user = userEvent.setup();
    renderWithProviders(<RegisterPage />);

    await user.type(screen.getByLabelText(/nome completo/i), 'Test User');
    await user.type(screen.getByPlaceholderText('(11) 99999-9999'), '11999998888');
    await user.type(screen.getByPlaceholderText('seu@email.com'), 'new@test.com');

    const passwordFields = screen.getAllByPlaceholderText('********');
    await user.type(passwordFields[0], 'StrongPass1!');
    await user.type(passwordFields[1], 'StrongPass1!');

    await user.click(screen.getByText(/criar conta gratis/i));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/register', expect.objectContaining({
        whatsapp: expect.stringContaining('(11)'),
      }));
    });
  });

  it('shows error toast on failed registration', async () => {
    vi.mocked(api.post).mockRejectedValueOnce({
      response: { data: { detail: 'Email already registered' } },
    });

    const user = userEvent.setup();
    renderWithProviders(<RegisterPage />);

    await user.type(screen.getByLabelText(/nome completo/i), 'Test User');
    await user.type(screen.getByPlaceholderText('seu@email.com'), 'existing@test.com');

    const passwordFields = screen.getAllByPlaceholderText('********');
    await user.type(passwordFields[0], 'StrongPass1!');
    await user.type(passwordFields[1], 'StrongPass1!');

    await user.click(screen.getByText(/criar conta gratis/i));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'destructive' })
      );
    });
  });

  it('formats WhatsApp input as user types', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterPage />);

    const whatsappInput = screen.getByPlaceholderText('(11) 99999-9999');
    await user.type(whatsappInput, '11999');

    expect(whatsappInput).toHaveValue('(11) 999');
  });
});
