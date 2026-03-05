import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import AuthError from './error';

vi.mock('@/lib/error-reporting', () => ({
  reportError: vi.fn(),
}));

import { reportError } from '@/lib/error-reporting';

describe('AuthError', () => {
  const mockReset = vi.fn();
  const mockError = new Error('auth crash') as Error & { digest?: string };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders generic error message without exposing error details', () => {
    render(<AuthError error={mockError} reset={mockReset} />);

    expect(screen.getByText('Algo deu errado')).toBeInTheDocument();
    expect(screen.getByText(/ocorreu um erro inesperado/i)).toBeInTheDocument();
    expect(screen.queryByText('auth crash')).not.toBeInTheDocument();
  });

  it('calls reset when "Tentar novamente" is clicked', async () => {
    const user = userEvent.setup();
    render(<AuthError error={mockError} reset={mockReset} />);

    await user.click(screen.getByRole('button', { name: /tentar novamente/i }));

    expect(mockReset).toHaveBeenCalledOnce();
  });

  it('has a "Voltar ao login" link', () => {
    render(<AuthError error={mockError} reset={mockReset} />);

    const loginLink = screen.getByRole('link', { name: /voltar ao login/i });
    expect(loginLink).toBeInTheDocument();
    expect(loginLink).toHaveAttribute('href', '/login');
  });

  it('calls reportError with the error and boundary context', () => {
    render(<AuthError error={mockError} reset={mockReset} />);

    expect(reportError).toHaveBeenCalledWith(mockError, { boundary: 'auth' });
  });

  it('displays error digest when available', () => {
    const errorWithDigest = new Error('crash') as Error & { digest?: string };
    errorWithDigest.digest = 'ghi789';

    render(<AuthError error={errorWithDigest} reset={mockReset} />);

    expect(screen.getByText('ghi789')).toBeInTheDocument();
    expect(screen.getByText(/código do erro/i)).toBeInTheDocument();
  });

  it('does not display digest section when digest is absent', () => {
    render(<AuthError error={mockError} reset={mockReset} />);

    expect(screen.queryByText(/código do erro/i)).not.toBeInTheDocument();
  });
});
