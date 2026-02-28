import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { renderWithProviders } from '@/tests/helpers/render';
import PortalError from './error';

describe('PortalError', () => {
  const mockReset = vi.fn();
  const mockError = new Error('internal failure') as Error & { digest?: string };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders generic error message without exposing error details', () => {
    renderWithProviders(<PortalError error={mockError} reset={mockReset} />);

    expect(screen.getByText('Algo deu errado')).toBeInTheDocument();
    expect(screen.getByText(/ocorreu um erro inesperado/i)).toBeInTheDocument();
    expect(screen.queryByText('internal failure')).not.toBeInTheDocument();
  });

  it('calls reset when "Tentar novamente" is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PortalError error={mockError} reset={mockReset} />);

    await user.click(screen.getByRole('button', { name: /tentar novamente/i }));

    expect(mockReset).toHaveBeenCalledOnce();
  });

  it('renders inside a Card component', () => {
    const { container } = renderWithProviders(
      <PortalError error={mockError} reset={mockReset} />
    );

    expect(container.querySelector('[class*="card"]')).toBeInTheDocument();
  });
});
