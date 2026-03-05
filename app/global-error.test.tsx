import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import GlobalError from './global-error';

vi.mock('@/lib/error-reporting', () => ({
  reportError: vi.fn(),
}));

import { reportError } from '@/lib/error-reporting';

describe('GlobalError', () => {
  const mockReset = vi.fn();
  const mockError = new Error('test') as Error & { digest?: string };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders generic error message without exposing error details', () => {
    render(<GlobalError error={mockError} reset={mockReset} />);

    expect(screen.getByText('Algo deu errado')).toBeInTheDocument();
    expect(screen.getByText(/ocorreu um erro inesperado/i)).toBeInTheDocument();
    expect(screen.queryByText('test')).not.toBeInTheDocument();
  });

  it('renders a retry button alongside the error message', () => {
    render(<GlobalError error={mockError} reset={mockReset} />);

    expect(screen.getByRole('button', { name: /tentar novamente/i })).toBeInTheDocument();
    expect(screen.getByText(/entre em contato com o suporte/i)).toBeInTheDocument();
  });

  it('calls reset when "Tentar novamente" is clicked', async () => {
    const user = userEvent.setup();
    render(<GlobalError error={mockError} reset={mockReset} />);

    await user.click(screen.getByRole('button', { name: /tentar novamente/i }));

    expect(mockReset).toHaveBeenCalledOnce();
  });

  it('calls reportError with the error and boundary context', () => {
    render(<GlobalError error={mockError} reset={mockReset} />);

    expect(reportError).toHaveBeenCalledWith(mockError, { boundary: 'global' });
  });

  it('displays error digest when available', () => {
    const errorWithDigest = new Error('crash') as Error & { digest?: string };
    errorWithDigest.digest = 'abc123';

    render(<GlobalError error={errorWithDigest} reset={mockReset} />);

    expect(screen.getByText('abc123')).toBeInTheDocument();
    expect(screen.getByText(/código do erro/i)).toBeInTheDocument();
  });

  it('does not display digest section when digest is absent', () => {
    render(<GlobalError error={mockError} reset={mockReset} />);

    expect(screen.queryByText(/código do erro/i)).not.toBeInTheDocument();
  });
});
