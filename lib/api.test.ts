import { vi } from 'vitest';
import type { InternalAxiosRequestConfig, AxiosHeaders } from 'axios';

// Must mock before importing api
vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://test-api.example.com');

const mockEmitSessionExpired = vi.fn();
vi.mock('./auth-events', () => ({
  emitSessionExpired: (...args: unknown[]) => mockEmitSessionExpired(...args),
}));

// Axios interceptors have an internal `handlers` array not in the public types.
// This interface mirrors the internal shape we need for testing.
interface InterceptorHandler<T> {
  fulfilled?: (value: T) => T | Promise<T>;
  rejected?: (error: unknown) => unknown;
}

interface InterceptorManagerWithHandlers<T> {
  handlers: InterceptorHandler<T>[];
}

describe('api module', () => {
  beforeEach(() => {
    vi.resetModules();
    mockEmitSessionExpired.mockClear();
    document.cookie = 'zenbots_auth=; path=/; max-age=0';
    document.cookie = 'csrf_token=; path=/; max-age=0';
  });

  it('creates axios instance with baseURL from env', async () => {
    const { api } = await import('./api');
    expect(api.defaults.baseURL).toBe('https://test-api.example.com');
  });

  it('sets withCredentials to true', async () => {
    const { api } = await import('./api');
    expect(api.defaults.withCredentials).toBe(true);
  });

  it('attaches CSRF header on POST requests when csrf cookie exists', async () => {
    document.cookie = 'csrf_token=test-csrf-value; path=/';
    const { api } = await import('./api');

    const requestInterceptors = api.interceptors.request as unknown as InterceptorManagerWithHandlers<InternalAxiosRequestConfig>;
    const config = await requestInterceptors.handlers[0].fulfilled!({
      method: 'post',
      url: '/bots/123',
      headers: {} as unknown as AxiosHeaders,
    } as InternalAxiosRequestConfig);

    expect(config.headers['X-CSRF-Token']).toBe('test-csrf-value');
  });

  it('does not attach CSRF header on GET requests', async () => {
    document.cookie = 'csrf_token=test-csrf-value; path=/';
    const { api } = await import('./api');

    const requestInterceptors = api.interceptors.request as unknown as InterceptorManagerWithHandlers<InternalAxiosRequestConfig>;
    const config = await requestInterceptors.handlers[0].fulfilled!({
      method: 'get',
      url: '/bots',
      headers: {} as unknown as AxiosHeaders,
    } as InternalAxiosRequestConfig);

    expect(config.headers['X-CSRF-Token']).toBeUndefined();
  });

  it('does not attach CSRF header on exempt auth paths', async () => {
    document.cookie = 'csrf_token=test-csrf-value; path=/';
    const { api } = await import('./api');

    const exemptPaths = ['/auth/token', '/auth/register', '/auth/forgot-password', '/auth/reset-password', '/auth/logout'];

    const requestInterceptors = api.interceptors.request as unknown as InterceptorManagerWithHandlers<InternalAxiosRequestConfig>;
    for (const url of exemptPaths) {
      const config = await requestInterceptors.handlers[0].fulfilled!({
        method: 'post',
        url,
        headers: {} as unknown as AxiosHeaders,
      } as InternalAxiosRequestConfig);

      expect(config.headers['X-CSRF-Token']).toBeUndefined();
    }
  });

  describe('401 response interceptor', () => {
    it('clears presence cookie, emits session expired, and redirects to /login on 401', async () => {
      document.cookie = 'zenbots_auth=1; path=/';
      const { api } = await import('./api');

      Object.defineProperty(window, 'location', {
        value: { pathname: '/meus-bots', href: '' },
        writable: true,
        configurable: true,
      });

      const responseInterceptors = api.interceptors.response as unknown as InterceptorManagerWithHandlers<unknown>;
      const responseInterceptor = responseInterceptors.handlers[0];
      const error = { response: { status: 401 } };

      await expect(responseInterceptor.rejected!(error)).rejects.toEqual(error);

      expect(mockEmitSessionExpired).toHaveBeenCalledTimes(1);
      expect(document.cookie).not.toContain('zenbots_auth=1');
      expect(window.location.href).toBe('/login');
    });

    it('does not redirect when already on /login', async () => {
      document.cookie = 'zenbots_auth=1; path=/';
      const { api } = await import('./api');

      Object.defineProperty(window, 'location', {
        value: { pathname: '/login', href: '' },
        writable: true,
        configurable: true,
      });

      const responseInterceptors = api.interceptors.response as unknown as InterceptorManagerWithHandlers<unknown>;
      const responseInterceptor = responseInterceptors.handlers[0];
      const error = { response: { status: 401 } };

      await expect(responseInterceptor.rejected!(error)).rejects.toEqual(error);

      expect(document.cookie).not.toContain('zenbots_auth=1');
      expect(window.location.href).toBe('');
    });

    it('passes through non-401 errors unchanged', async () => {
      const { api } = await import('./api');

      const responseInterceptors = api.interceptors.response as unknown as InterceptorManagerWithHandlers<unknown>;
      const responseInterceptor = responseInterceptors.handlers[0];
      const error = { response: { status: 500 } };

      await expect(responseInterceptor.rejected!(error)).rejects.toEqual(error);
    });
  });
});
