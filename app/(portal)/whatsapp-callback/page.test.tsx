import { screen } from '@testing-library/react';
import { vi } from 'vitest';
import { renderWithProviders } from '@/tests/helpers/render';
import WhatsappCallbackPage from './page';

const mockPush = vi.fn();
const mockSearchParams = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/whatsapp-callback',
  useSearchParams: () => mockSearchParams,
}));

describe('WhatsappCallbackPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams.delete('code');
    mockSearchParams.delete('state');
  });

  it('renders loading spinner UI', () => {
    renderWithProviders(<WhatsappCallbackPage />);

    expect(screen.getByText(/conectando ao whatsapp/i)).toBeInTheDocument();
    expect(screen.getByText(/aguarde o fechamento/i)).toBeInTheDocument();
  });

  it('calls router.push to /meus-bots when no code or opener', () => {
    renderWithProviders(<WhatsappCallbackPage />);

    expect(mockPush).toHaveBeenCalledWith('/meus-bots');
  });

  it('sends code and state via postMessage when opener exists', () => {
    const mockPostMessage = vi.fn();
    const mockClose = vi.fn();

    Object.defineProperty(window, 'opener', {
      value: { postMessage: mockPostMessage },
      writable: true,
      configurable: true,
    });
    window.close = mockClose;

    mockSearchParams.set('code', 'test-code');
    mockSearchParams.set('state', 'test-state');

    renderWithProviders(<WhatsappCallbackPage />);

    expect(mockPostMessage).toHaveBeenCalledWith(
      { type: 'WA_OAUTH_CODE', data: { code: 'test-code', state: 'test-state' } },
      window.location.origin
    );

    // Cleanup
    Object.defineProperty(window, 'opener', { value: null, writable: true, configurable: true });
  });
});
