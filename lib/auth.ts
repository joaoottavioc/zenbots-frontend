const AUTH_COOKIE = "zenbots_auth";
const CSRF_COOKIE = "csrf_token";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export const AUTH_CHANNEL_NAME = "zenbots-auth";

/** Check if user is authenticated by looking for the presence cookie */
export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return getCookie(AUTH_COOKIE) === "1";
}

/** Set the auth presence cookie (backend sets the httpOnly access_token cookie via Set-Cookie) */
export function setAuthPresence(): void {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${AUTH_COOKIE}=1; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
}

/** Clear auth state: expire presence cookie and broadcast logout to other tabs */
export function clearAuth(): void {
  document.cookie = `${AUTH_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
  try {
    const channel = new BroadcastChannel(AUTH_CHANNEL_NAME);
    channel.postMessage({ type: "logout" });
    channel.close();
  } catch {
    // BroadcastChannel not supported — no cross-tab sync
  }
}

/** Read the CSRF token from the non-httpOnly cookie set by the backend */
export function getCsrfToken(): string | null {
  return getCookie(CSRF_COOKIE);
}

/** One-time removal of legacy localStorage keys from the old auth system */
export function cleanupLegacyAuth(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem("zenbots_token");
    localStorage.removeItem("zenbots_token_set_at");
  } catch {
    // localStorage unavailable
  }
}

/** Read a cookie value by name */
function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}
