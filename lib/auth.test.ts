import { vi, beforeEach } from 'vitest';
import { getToken, setToken, clearToken } from './auth';

describe('lib/auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    document.cookie = 'zenbots_auth=; path=/; max-age=0';
  });

  describe('getToken', () => {
    it('returns null when no token is stored', () => {
      expect(getToken()).toBeNull();
    });

    it('returns the stored token', () => {
      localStorage.setItem('zenbots_token', 'my-jwt');
      expect(getToken()).toBe('my-jwt');
    });
  });

  describe('setToken', () => {
    it('stores token in localStorage', () => {
      setToken('new-token');
      expect(localStorage.setItem).toHaveBeenCalledWith('zenbots_token', 'new-token');
    });

    it('sets auth presence cookie', () => {
      setToken('new-token');
      expect(document.cookie).toContain('zenbots_auth=1');
    });
  });

  describe('clearToken', () => {
    it('removes token from localStorage', () => {
      localStorage.setItem('zenbots_token', 'old-token');
      clearToken();
      expect(localStorage.removeItem).toHaveBeenCalledWith('zenbots_token');
    });

    it('expires the auth cookie', () => {
      setToken('token');
      clearToken();
      expect(document.cookie).not.toContain('zenbots_auth=1');
    });
  });
});
