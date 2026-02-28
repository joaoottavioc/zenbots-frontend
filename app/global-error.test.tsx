import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import GlobalError from './global-error';

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
});
