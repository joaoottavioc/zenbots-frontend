import { screen, waitFor, act } from '@testing-library/react';
import { vi } from 'vitest';
import { renderWithProviders } from '@/tests/helpers/render';
import GoogleSignInButton from './google-signin-button';
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
  usePathname: () => '/login',
  useSearchParams: () => new URLSearchParams(),
}));

const CLIENT_ID = 'test-client.apps.googleusercontent.com';

type GisCallback = (response: { credential?: string }) => void;

/** Installs a fake GIS SDK and returns a handle to fire its credential callback. */
function installFakeGis() {
  let callback: GisCallback = () => {};
  const renderButton = vi.fn((parent: HTMLElement) => {
    parent.appendChild(document.createElement('div'));
  });

  (window as unknown as { google: unknown }).google = {
    accounts: {
      id: {
        initialize: vi.fn((config: { callback: GisCallback }) => {
          callback = config.callback;
        }),
        renderButton,
      },
    },
  };

  return {
    renderButton,
    emitCredential: (credential?: string) =>
      act(() => {
        callback({ credential });
      }),
  };
}

describe('GoogleSignInButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_CLIENT_ID', CLIENT_ID);
    document.cookie = 'zenbots_auth=; path=/; max-age=0';
    delete (window as unknown as { google?: unknown }).google;
    document
      .querySelectorAll('script[src="https://accounts.google.com/gsi/client"]')
      .forEach((el) => el.remove());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('renders nothing when the client ID is not configured', () => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_CLIENT_ID', '');
    const { container } = renderWithProviders(
      <GoogleSignInButton dividerLabel="ou continue com" />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the divider and loads the GIS script when configured', () => {
    renderWithProviders(<GoogleSignInButton dividerLabel="ou continue com" />);

    expect(screen.getByText(/ou continue com/i)).toBeInTheDocument();
    expect(
      document.querySelector('script[src="https://accounts.google.com/gsi/client"]')
    ).not.toBeNull();
  });

  it('renders the Google widget with the configured client ID once the SDK is ready', async () => {
    const gis = installFakeGis();
    renderWithProviders(<GoogleSignInButton dividerLabel="ou continue com" />);

    await waitFor(() => expect(gis.renderButton).toHaveBeenCalled());

    const initialize = (window as unknown as {
      google: { accounts: { id: { initialize: ReturnType<typeof vi.fn> } } };
    }).google.accounts.id.initialize;

    expect(initialize).toHaveBeenCalledWith(
      expect.objectContaining({ client_id: CLIENT_ID, auto_select: false })
    );
  });

  it('posts the credential and redirects to the dashboard on success', async () => {
    const gis = installFakeGis();
    vi.mocked(api.post).mockResolvedValue(
      mockResponse({ access_token: 'jwt', token_type: 'bearer', csrf_token: 'csrf-123' })
    );

    renderWithProviders(<GoogleSignInButton dividerLabel="ou continue com" />);
    await waitFor(() => expect(gis.renderButton).toHaveBeenCalled());

    gis.emitCredential('google-id-token');

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/auth/google', {
        credential: 'google-id-token',
      })
    );
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/meus-bots'));
    expect(document.cookie).toContain('zenbots_auth=1');
  });

  it('shows an error toast when the backend rejects the credential', async () => {
    const gis = installFakeGis();
    vi.mocked(api.post).mockRejectedValue({
      response: { status: 401, data: { detail: 'Token do Google invalido ou expirado.' } },
    });

    renderWithProviders(<GoogleSignInButton dividerLabel="ou continue com" />);
    await waitFor(() => expect(gis.renderButton).toHaveBeenCalled());

    gis.emitCredential('bad-token');

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'destructive' })
      )
    );
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('does not call the API when Google returns no credential', async () => {
    const gis = installFakeGis();
    renderWithProviders(<GoogleSignInButton dividerLabel="ou continue com" />);
    await waitFor(() => expect(gis.renderButton).toHaveBeenCalled());

    gis.emitCredential(undefined);

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'destructive' })
      )
    );
    expect(api.post).not.toHaveBeenCalled();
  });

  it('hides the whole block, divider included, when the GIS script fails to load', async () => {
    const { container } = renderWithProviders(
      <GoogleSignInButton dividerLabel="ou continue com" />
    );

    const script = document.querySelector(
      'script[src="https://accounts.google.com/gsi/client"]'
    )!;
    act(() => {
      script.dispatchEvent(new Event('error'));
    });

    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });
});
