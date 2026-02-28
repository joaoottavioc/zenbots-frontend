import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import AuthError from './error';

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
});
