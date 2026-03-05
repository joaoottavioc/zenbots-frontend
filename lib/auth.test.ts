import { vi, beforeEach } from 'vitest';
import { isAuthenticated, setAuthPresence, clearAuth, getCsrfToken, setCsrfToken, cleanupLegacyAuth, AUTH_CHANNEL_NAME } from './auth';

describe('lib/auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.cookie = 'zenbots_auth=; path=/; max-age=0';
    document.cookie = 'csrf_token=; path=/; max-age=0';
    localStorage.clear();
  });

  describe('isAuthenticated', () => {
    it('returns false when no presence cookie exists', () => {
      expect(isAuthenticated()).toBe(false);
    });

    it('returns true when presence cookie is set', () => {
      document.cookie = 'zenbots_auth=1; path=/';
      expect(isAuthenticated()).toBe(true);
    });
  });

  describe('setAuthPresence', () => {
    it('sets the presence cookie', () => {
      setAuthPresence();
      expect(document.cookie).toContain('zenbots_auth=1');
    });
  });

  describe('clearAuth', () => {
    it('expires the presence cookie', () => {
      setAuthPresence();
      expect(isAuthenticated()).toBe(true);
      clearAuth();
      expect(isAuthenticated()).toBe(false);
    });

    it('broadcasts logout via BroadcastChannel', () => {
      const receivedMessages: unknown[] = [];
      const listener = new BroadcastChannel(AUTH_CHANNEL_NAME);
      listener.onmessage = (event: { data: unknown }) => {
        receivedMessages.push(event.data);
      };

      clearAuth();

      expect(receivedMessages).toEqual([{ type: 'logout' }]);
      listener.close();
    });
  });

  describe('getCsrfToken / setCsrfToken', () => {
    it('returns null when no csrf cookie or in-memory token exists', () => {
      expect(getCsrfToken()).toBeNull();
    });

    it('returns the csrf token from cookie', () => {
      document.cookie = 'csrf_token=abc123; path=/';
      expect(getCsrfToken()).toBe('abc123');
    });

    it('returns in-memory token when set', () => {
      setCsrfToken('memory-token');
      expect(getCsrfToken()).toBe('memory-token');
    });

    it('prefers in-memory token over cookie', () => {
      document.cookie = 'csrf_token=cookie-token; path=/';
      setCsrfToken('memory-token');
      expect(getCsrfToken()).toBe('memory-token');
    });

    it('clearAuth clears the in-memory token', () => {
      setCsrfToken('memory-token');
      clearAuth();
      expect(getCsrfToken()).toBeNull();
    });
  });

  describe('cleanupLegacyAuth', () => {
    it('removes old localStorage keys', () => {
      localStorage.setItem('zenbots_token', 'old-jwt');
      localStorage.setItem('zenbots_token_set_at', '1234567890');

      cleanupLegacyAuth();

      expect(localStorage.removeItem).toHaveBeenCalledWith('zenbots_token');
      expect(localStorage.removeItem).toHaveBeenCalledWith('zenbots_token_set_at');
    });

    it('does not throw when localStorage is empty', () => {
      expect(() => cleanupLegacyAuth()).not.toThrow();
    });
  });
});
