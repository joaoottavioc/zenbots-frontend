import { vi } from 'vitest';

// Must mock before importing api
vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://test-api.example.com');

const mockEmitSessionExpired = vi.fn();
vi.mock('./auth-events', () => ({
  emitSessionExpired: (...args: unknown[]) => mockEmitSessionExpired(...args),
}));

describe('api module', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
    mockEmitSessionExpired.mockClear();
  });

  it('creates axios instance with baseURL from env', async () => {
    const { api } = await import('./api');
    expect(api.defaults.baseURL).toBe('https://test-api.example.com');
  });

  it('attaches Bearer token when present in localStorage', async () => {
    localStorage.setItem('zenbots_token', 'test-jwt-token');
    const { api } = await import('./api');

    // Get the request interceptor by making a dry-run config transform
    const config = await api.interceptors.request.handlers[0].fulfilled!({
      headers: {} as any,
    } as any);

    expect(config.headers['Authorization']).toBe('Bearer test-jwt-token');
  });

  it('does not attach Authorization header when no token', async () => {
    const { api } = await import('./api');

    const config = await api.interceptors.request.handlers[0].fulfilled!({
      headers: {} as any,
    } as any);

    expect(config.headers['Authorization']).toBeUndefined();
  });

  describe('401 response interceptor', () => {
    it('clears token, emits session expired, and redirects to /login on 401', async () => {
      localStorage.setItem('zenbots_token', 'expired-token');
      const { api } = await import('./api');

      // Simulate current path on a portal page
      Object.defineProperty(window, 'location', {
        value: { pathname: '/meus-bots', href: '' },
        writable: true,
        configurable: true,
      });

      const responseInterceptor = api.interceptors.response.handlers[0];
      const error = { response: { status: 401 } };

      await expect(responseInterceptor.rejected!(error)).rejects.toEqual(error);

      expect(mockEmitSessionExpired).toHaveBeenCalledTimes(1);
      expect(localStorage.getItem('zenbots_token')).toBeNull();
      expect(window.location.href).toBe('/login');
    });

    it('does not redirect when already on /login', async () => {
      localStorage.setItem('zenbots_token', 'expired-token');
      const { api } = await import('./api');

      Object.defineProperty(window, 'location', {
        value: { pathname: '/login', href: '' },
        writable: true,
        configurable: true,
      });

      const responseInterceptor = api.interceptors.response.handlers[0];
      const error = { response: { status: 401 } };

      await expect(responseInterceptor.rejected!(error)).rejects.toEqual(error);

      expect(localStorage.getItem('zenbots_token')).toBeNull();
      expect(window.location.href).toBe('');
    });

    it('passes through non-401 errors unchanged', async () => {
      const { api } = await import('./api');

      const responseInterceptor = api.interceptors.response.handlers[0];
      const error = { response: { status: 500 } };

      await expect(responseInterceptor.rejected!(error)).rejects.toEqual(error);

      // Should not clear token
      localStorage.setItem('zenbots_token', 'valid-token');
      await expect(responseInterceptor.rejected!(error)).rejects.toEqual(error);
      expect(localStorage.getItem('zenbots_token')).toBe('valid-token');
    });
  });
});
