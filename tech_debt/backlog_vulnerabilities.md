# Security Vulnerabilities Backlog — ZenBots Frontend

> **Audit date:** 2026-02-26 | **Updated:** 2026-02-28
> **Scope:** Full codebase security review of `zenbots-frontend` (Next.js 16 App Router)
> **Audited by:** Claude Code (automated deep analysis across auth, XSS/injection, data handling, config, and business logic)

---

## Priority Definitions

| Priority | Meaning | SLA Guidance |
|----------|---------|--------------|
| **P0** | Critical — Actively exploitable, can lead to full account takeover or mass data breach | Fix immediately |
| **P1** | High — Exploitable with moderate effort, leads to significant security degradation | Fix within 1 sprint |
| **P2** | Medium — Requires specific conditions to exploit, or reduces defense-in-depth | Fix within 2-3 sprints |
| **P3** | Low — Minor risk, hardening measure, or defense-in-depth improvement | Schedule in backlog |
| **P4** | Informational — Best practice, code quality, or future-proofing concern | Address opportunistically |

---

## P0 — Critical

### [x] P0-1: No Middleware-Based Route Protection *(Fixed 2026-02-28 — middleware.ts with cookie-based auth check)*

**Impact:** Unauthenticated users can access all portal pages. Full UI structure, routes, and component scaffolding are exposed.

- **Root cause:** No `middleware.ts` exists at the project root. The `(portal)/layout.tsx` renders unconditionally without any auth check.
- **Files:** `app/(portal)/layout.tsx` (entire file)
- **Attack vector:** Navigate directly to any `/meus-bots`, `/pedidos`, `/settings`, `/pagamentos`, `/analytics`, `/produtos`, or `/suporte` URL without logging in. The page UI renders (sidebar, headers, layout), though API calls return 401.
- **Remediation:** Create `middleware.ts` at project root. Check for a valid auth token (cookie-based preferred) on all `/(portal)/` routes. Redirect to `/login` if absent or invalid.

---

### [x] P0-2: JWT Token Exposed in SSE URL Query Parameter *(Fixed 2026-02-28 — SSE migrated to fetch + Authorization header)*

**Impact:** Auth token leaked via browser history, server/proxy access logs, Referer headers, and network monitoring tools.

- **File:** `app/(portal)/pedidos/page.tsx`, line 126
- **Code:** `new EventSource(\`${API_BASE}/stream?token=${encodeURIComponent(token)}\`)`
- **Attack vector:** Token appears in plaintext in the URL. Any proxy, CDN, WAF, or browser extension that logs URLs will capture the token. The `Referer` header will also leak it on any subsequent navigation.
- **Remediation:** Implement a short-lived SSE ticket: client requests a one-time ticket from the backend, then passes only the ticket (not the JWT) to the SSE endpoint. Or migrate to cookie-based auth for SSE.

---

### [~] P0-3: JWT Token Stored in localStorage (XSS-Accessible) *(Partially mitigated 2026-02-28 — centralized in lib/auth.ts, CSP headers added. Full fix requires backend httpOnly cookie support)*

**Impact:** Any XSS vulnerability (including from third-party scripts like the Facebook SDK) allows immediate token theft.

- **Files:**
  - `app/(auth)/login/page.tsx`, line 31: `localStorage.setItem('zenbots_token', token)`
  - `lib/api.ts`, line 12: `localStorage.getItem('zenbots_token')`
  - `app/(portal)/pedidos/page.tsx`, line 111: `localStorage.getItem('zenbots_token')`
  - `components/ui/user-nav.tsx`, line 63: `localStorage.removeItem("zenbots_token")`
- **Attack vector:** `localStorage` is accessible to any JavaScript on the page. A single XSS vector (e.g., a compromised third-party script, a future `dangerouslySetInnerHTML`) exfiltrates the token with `localStorage.getItem('zenbots_token')`.
- **Remediation:** Migrate token storage to `httpOnly`, `Secure`, `SameSite=Strict` cookies. Requires backend changes to set the cookie on login response and remove the need for client-side token handling.

---

### [x] P0-4: No Security Headers Configured (CSP, X-Frame-Options, HSTS, etc.) *(Fixed 2026-02-28 — all security headers added, CSP in report-only mode)*

**Impact:** No browser-level protections against XSS, clickjacking, MIME sniffing, or protocol downgrade attacks.

- **File:** `next.config.ts` (no `headers()` function exists)
- **Missing headers:**
  - `Content-Security-Policy` — no restriction on script/style/connect sources
  - `X-Frame-Options` / `frame-ancestors` — site can be iframed (clickjacking)
  - `X-Content-Type-Options: nosniff` — MIME sniffing possible
  - `Strict-Transport-Security` — no HTTPS enforcement
  - `Referrer-Policy` — full URLs (including query-string tokens) leak via Referer
  - `Permissions-Policy` — no restriction on browser APIs
- **Compounding factor:** The Facebook SDK is loaded dynamically via `document.createElement('script')` in `connect-whatsapp-button.tsx`, line 47. Without CSP, any injected script executes freely.
- **Remediation:** Add `async headers()` in `next.config.ts` returning all recommended security headers. Start with a report-only CSP and tighten iteratively.

---

### [x] P0-5: No Error Boundary Files — Stack Traces Leak in Dev Mode *(Fixed 2026-02-28 — error boundaries added for root, portal, and auth)*

**Impact:** Unhandled errors show Next.js default error page with full stack traces, file paths, and source code in development. No recovery UX in production.

- **Files:** No `error.tsx` or `global-error.tsx` exist anywhere in the `app/` directory.
- **Attack vector:** Trigger any unhandled runtime error (e.g., navigate to a page with missing data). In dev mode, full internal paths and code are exposed. In production, users see a generic unhelpful error page.
- **Remediation:** Add `error.tsx` in `app/(portal)/` and `app/(auth)/` route groups. Add `global-error.tsx` at the app root. Ensure error messages shown to users are generic.

---

## P1 — High

### [x] P1-1: No Axios Response Interceptor for 401/403 Handling *(Fixed 2026-02-28 — auth-events pub/sub + useSessionGuard clears QueryClient cache on 401)*

**Impact:** Expired tokens cause silently broken UI states. Users are never redirected to login. Stale tokens persist indefinitely.

- **File:** `lib/api.ts` (lines 1-21, only has a request interceptor)
- **Remediation:** Add a response interceptor that on 401: clears the token from storage, clears the React Query cache, closes open SSE connections, and redirects to `/login`.

---

### [x] P1-2: Mercado Pago OAuth — Missing State Parameter (CSRF) *(Fixed 2026-02-28 — crypto.randomUUID state in sessionStorage, validated on callback)*

**Impact:** Attacker can craft a URL with their own OAuth `code` and trick a victim into linking the attacker's payment account.

- **File:** `app/(portal)/pagamentos/page.tsx`, lines 38-71
- **Code:** `const code = searchParams.get('code'); if (code) { handleCallback(code); }`
- **Remediation:** Generate a cryptographically random `state` parameter before the OAuth redirect, store it in `sessionStorage`, and validate it when the user returns with the `code`.

---

### [x] P1-3: WhatsApp OAuth — Missing State Parameter (CSRF) *(Fixed 2026-02-28 — state generated before FB.login, passed via postMessage, validated in handler)*

**Impact:** Same as P1-2 but for WhatsApp account linking.

- **File:** `app/(portal)/whatsapp-callback/page.tsx`, lines 10-28
- **Remediation:** Same approach — generate, store, and validate a `state` parameter.

---

### [x] P1-4: Overly Permissive postMessage Origin Check *(Fixed 2026-02-28 — isAllowedOrigin() with strict HTTPS + hostname regex)*

**Impact:** Domains like `evil-facebook.com` or `facebook.com.evil.com` pass the origin check and can send forged WhatsApp onboarding messages.

- **File:** `components/ui/connect-whatsapp-button.tsx`, line 58
- **Code:** `!event.origin.includes("facebook.com")`
- **Remediation:** Use strict origin matching:
  ```typescript
  const url = new URL(event.origin);
  const isFacebook = url.hostname === 'www.facebook.com' || url.hostname.endsWith('.facebook.com');
  if (event.origin !== window.location.origin && !isFacebook) return;
  ```

---

### [x] P1-5: Inconsistent API Base URL — Dead Proxy, Potential Double-Prefix *(Fixed previously — all files now use centralized api instance)*

**Impact:** `next.config.ts` proxy rewrites are dead code. Backend URL is exposed directly to client browsers. If env vars mismatch in production, API calls break or route to wrong servers.

- **Files affected (using wrong `NEXT_PUBLIC_API_URL` instead of `NEXT_PUBLIC_API_BASE_URL`):**
  - `app/(auth)/login/page.tsx`, line 21
  - `app/(auth)/cadastro/page.tsx`, line 47
  - `app/(auth)/esqueci-senha/page.tsx`, line 18
  - `app/(auth)/redefinir-senha/page.tsx`, line 30
  - `app/(portal)/bots/novo/bot-form.tsx`, line 27
  - `app/(portal)/produtos/menu-import-dialog.tsx`, line 30
  - `app/(portal)/analytics/page.tsx`, line 30
  - `app/(portal)/analytics/best-sellers-card.tsx`, line 13
  - `app/(portal)/meus-bots/page.tsx`, line 24
  - `app/(portal)/meus-bots/edit-bot-sheet.tsx`, line 16
  - `components/ui/bot-selector.tsx`, line 16
- **Remediation:** Remove all per-file `API_BASE` constants. Use the shared `api` Axios instance from `lib/api.ts` consistently with relative paths (e.g., `api.get('/bots')` instead of `api.get(\`${API_BASE}/bots\`)`). Alternatively, if direct URLs are needed (e.g., login with `fetch`), standardize on a single env var name.

---

### [x] P1-6: Bot Credentials (WhatsApp Token) Handled Client-Side *(Fixed 2026-02-28 — disconnect mutation sends explicit fields only, no bot spread)*

**Impact:** The `whatsapp_token` (a highly sensitive Meta API credential) is transmitted in plaintext in API requests, stored in React state, and visible in browser dev tools.

- **Files:**
  - `app/(portal)/bots/novo/bot-form.tsx`, lines 422-458
  - `app/(portal)/meus-bots/page.tsx`, lines 83-99 (sends entire bot object including token on disconnect)
- **Remediation:** The backend should never return the full `whatsapp_token` to the frontend. Use masked/redacted values for display. For disconnect, send only the bot ID and action, not the full object.

---

### [x] P1-7: No Client-Side Rate Limiting on Auth Forms *(Fixed 2026-02-28 — useSubmitThrottle hook with exponential backoff on login, cadastro, esqueci-senha)*

**Impact:** Brute-force login attacks, email bombing via forgot-password, and account enumeration.

- **Files:**
  - `app/(auth)/login/page.tsx` — no throttling
  - `app/(auth)/esqueci-senha/page.tsx` — no throttling
  - `app/(auth)/cadastro/page.tsx` — no throttling
- **Remediation:** Add client-side cooldown after failed attempts (e.g., exponential backoff). Add CAPTCHA (e.g., Turnstile/reCAPTCHA) after N failed attempts. Ensure the backend also rate-limits these endpoints.

---

### [x] P1-8: Incomplete Logout — Token Not Revoked, Cache Not Cleared *(Fixed 2026-02-28 — fire-and-forget api.post('/auth/logout'), queryClient.clear() already present)*

**Impact:** Stolen tokens remain valid after logout. Cached data may persist across user sessions.

- **File:** `components/ui/user-nav.tsx`, lines 61-65
- **Code:**
  ```typescript
  const handleLogout = () => {
    localStorage.removeItem("zenbots_token");
    router.push("/login");
  };
  ```
- **Missing:** No backend token revocation call, no `queryClient.clear()`, no SSE connection teardown.
- **Remediation:** Call a backend `/auth/logout` endpoint (if available) to invalidate the token server-side. Call `queryClient.clear()`. Close any active `EventSource` connections.

---

### [ ] P1-9: CSP in Report-Only Mode — Not Enforcing *(NEW — 2026-02-28 scan)*

**Impact:** All Content-Security-Policy directives are suggestions, not enforcements. Browsers log violations but don't block them. Injected scripts, styles, and connections execute freely.

- **File:** `next.config.ts`, line 40
- **Code:** `"Content-Security-Policy-Report-Only"` instead of `"Content-Security-Policy"`
- **Attack vector:** Any XSS payload executes because CSP doesn't block it — only logs. Combined with `'unsafe-inline'` and `'unsafe-eval'` in `script-src`, this provides zero effective XSS protection.
- **Compounding factor:** P0-3 (localStorage token) means any successful XSS immediately steals auth tokens.
- **Remediation:** Switch to enforced `Content-Security-Policy` before production. Remove `'unsafe-eval'` (only needed for dev tools). Keep `'unsafe-inline'` only if Facebook SDK requires it, otherwise use nonce-based CSP. Deploy report-only in staging first, then enforce in production.

---

### [ ] P1-10: Middleware Auth Cookie Is Unsigned Presence Marker *(NEW — 2026-02-28 scan)*

**Impact:** Server-side route protection via `middleware.ts` can be bypassed by manually setting a cookie in browser DevTools.

- **File:** `lib/auth.ts`, line 12 — sets `document.cookie = "zenbots_auth=1; ..."`
- **File:** `middleware.ts`, line 29 — checks `request.cookies.get("zenbots_auth")`
- **Mechanism:** The cookie contains a static value `"1"`, not a signed token or session ID. Middleware only checks presence, never validates authenticity.
- **Attack vector:** Open DevTools → Application → Cookies → add `zenbots_auth=1`. Middleware now allows access to all portal routes. Page shell renders (sidebar, headers, layout structure).
- **Mitigating factors:** API calls still require the Bearer token, so no data is exposed. The attacker only sees the empty UI structure.
- **Remediation:** Either (a) store the actual JWT in an httpOnly cookie and validate it in middleware, or (b) sign the marker cookie with a server-side secret so it can't be forged. Option (a) is preferred as it also resolves P0-3.

---

## P2 — Medium

### [x] P2-1: Backend Error Details Displayed Directly to Users *(Fixed 2026-02-28 — getSafeErrorMessage() in lib/error-messages.ts maps known errors to safe Portuguese messages)*

**Impact:** Information leakage about backend implementation, database errors, or internal paths.

- **Files:**
  - `app/(auth)/cadastro/page.tsx`, lines 83-85
  - `app/(auth)/redefinir-senha/page.tsx`, line 63
  - `app/(portal)/settings/page.tsx`, line 185
  - `components/ui/connect-whatsapp-button.tsx`, line 98
  - `app/(portal)/bots/novo/bot-form.tsx`, line 182
  - `app/(portal)/produtos/menu-import-dialog.tsx`, line 143
- **Pattern:** `msg = error.response.data.detail`
- **Remediation:** Map known backend error codes to user-friendly messages. Only show raw `detail` if it matches an expected format. Log the full error for debugging.

---

### [x] P2-2: Console Logging of Sensitive Data in Production *(Fixed 2026-02-28 — all console.log/error/warn removed from production code)*

**Impact:** Auth responses, customer data, order payloads, and error objects visible in browser console.

- **Key instances:**
  - `components/ui/connect-whatsapp-button.tsx`, line 118: `console.log("authResponse:", response.authResponse)` — logs Facebook OAuth tokens
  - `app/(portal)/pedidos/page.tsx`, line 140: `console.log("Atualização recebida:", data.type, data.payload)` — logs customer data
  - `app/(auth)/login/page.tsx`, line 42: `console.error("Erro no login:", error)` — may log credential-related errors
  - 13+ additional instances across the codebase
- **Remediation:** Remove all `console.log`/`console.error` calls from production code. Use a logging library with environment-aware log levels, or configure a build step to strip console calls.

---

### [x] P2-3: Account Enumeration via Registration/Reset Error Messages *(Fixed 2026-02-28 — esqueci-senha always shows success view on error; cadastro uses generic error via getSafeErrorMessage)*

**Impact:** Attacker can determine which emails are registered by observing different error messages.

- **Files:** `app/(auth)/cadastro/page.tsx`, lines 80-88; `app/(auth)/esqueci-senha/page.tsx`
- **Remediation:** Return generic messages regardless of whether the email exists (e.g., "If this email is registered, you will receive a reset link"). This is primarily a backend fix but the frontend should also use generic fallback messages.

---

### [x] P2-4: Open Redirect via Backend-Provided URLs *(Fixed 2026-02-28 — isTrustedRedirectUrl() in lib/url-validation.ts validates HTTPS + trusted domains before redirect)*

**Impact:** If the backend is compromised or API responses are tampered with, users are redirected to phishing sites.

- **Files:**
  - `app/(portal)/pagamentos/page.tsx`, line 94: `window.location.href = res.data.url`
  - `app/(portal)/settings/page.tsx`, line 140: `window.open(response.data.checkout_url, '_blank')`
- **Remediation:** Validate that returned URLs match expected domains (e.g., `mercadopago.com`, `mercadopago.com.br`) before navigating.

---

### [x] P2-5: IDOR Potential — No Client-Side Bot Ownership Validation *(Fixed 2026-02-28 — bot-selector validates selected ID exists in fetched bots array)*

**Impact:** A user could manipulate `selectedBotId` via browser dev tools to attempt accessing another user's bot data.

- **Files:** Throughout portal pages — `pedidos/page.tsx`, `produtos/page.tsx`, `analytics/page.tsx`
- **Pattern:** `api.get(\`${API_BASE}/bots/${selectedBotId}/orders\`)`
- **Note:** The backend MUST enforce ownership validation. The frontend should only display bots returned by the user's own `/bots` endpoint.
- **Remediation:** Primarily a backend concern, but the frontend should validate that `selectedBotId` is in the user's bot list before making requests.

---

### [x] P2-6: Bot Form Schema — Weak Validation on Sensitive Fields *(Fixed 2026-02-28 — regex for phone/CEP, refine for PIX key, max() on all numeric fields)*

**Impact:** Invalid or malicious data can be submitted for PIX keys, phone numbers, CEPs, and monetary values.

- **File:** `app/(portal)/bots/novo/bot-form.tsx`, lines 28-58
- **Details:**
  - `pix_key`: Only `min(5)`, no format validation for CPF/CNPJ/email/phone
  - `whatsapp_number`: Only `min(10)`, no digits-only regex
  - `cep`: Only `min(8)`, no 8-digit regex
  - `max_delivery_radius`, `delivery_fee`, `min_order_value`: No upper bound (`max()`)
- **Remediation:** Add regex patterns for PIX key types, phone numbers, and CEP. Add reasonable `max()` constraints on numeric fields.

---

### [x] P2-7: Password Change Uses Manual Validation Instead of Zod Schema *(Already resolved — changePasswordSchema with zodResolver is already implemented in settings/page.tsx)*

**Impact:** Password strength rules may drift out of sync with registration schema. No form-level validation integration.

- **File:** `app/(portal)/settings/page.tsx`, lines 170-190
- **Remediation:** Extract the password validation schema from the registration page into a shared Zod schema. Use React Hook Form for the password change form.

---

### [x] P2-8: Login Form Has No Zod Schema *(Already resolved — loginSchema with zodResolver is already implemented in login/page.tsx)*

**Impact:** Only HTML5 `required` and `type="email"` validation. Inconsistent with the rest of the codebase.

- **File:** `app/(auth)/login/page.tsx`
- **Remediation:** Add a Zod schema with proper email format validation. Use React Hook Form for consistency.

---

### [x] P2-9: No Image Domain Restrictions in next.config.ts *(Fixed 2026-02-28 — remotePatterns added for **.facebook.com and **.fbcdn.net over HTTPS)*

**Impact:** If future features use `next/image` with remote URLs, there is no domain allowlist.

- **File:** `next.config.ts`
- **Remediation:** Add `images: { remotePatterns: [...] }` configuration restricting allowed image domains.

---

### [x] P2-10: WhatsApp Onboarding Race Condition *(Fixed 2026-02-28 — fallbackTimerRef clears timeout on happy path event, cleanup on unmount)*

**Impact:** The 5-second fallback timer in the WhatsApp connect flow could cause onboarding to be triggered twice if the "Happy Path" event arrives after the fallback fires.

- **File:** `components/ui/connect-whatsapp-button.tsx`, lines 116-133
- **Remediation:** Track whether onboarding has already been triggered with a ref/flag. Clear the timeout when the happy-path event arrives.

---

### [x] P2-11: No CSRF Protection *(Mitigated 2026-02-28 — Bearer token auth is immune to CSRF; SameSite=Strict added to presence marker cookie)*

**Impact:** If the backend ever uses cookies for session state (e.g., the Facebook SDK sets `cookie: true`), CSRF attacks could be possible.

- **Files:** All mutation calls across the codebase
- **Remediation:** Implement CSRF tokens or verify that the backend exclusively uses Bearer tokens (not cookies) for authentication.

---

### [ ] P2-12: Missing CSP Directives — base-uri, object-src, form-action *(NEW — 2026-02-28 scan)*

**Impact:** Even when CSP is enforced, missing directives leave attack surface open.

- **File:** `next.config.ts`, lines 41-50
- **Missing directives:**
  - `base-uri 'self'` — prevents `<base>` tag injection that redirects all relative URLs
  - `object-src 'none'` — prevents Flash/Java plugin loading
  - `form-action 'self'` — prevents form hijacking to external domains
  - `frame-ancestors 'none'` — should complement `X-Frame-Options: DENY`
- **Remediation:** Append these directives to the existing CSP string. All are low-risk additions with no functional impact.

---

### [ ] P2-13: No Error Monitoring or Logging in Production *(NEW — 2026-02-28 scan)*

**Impact:** Production errors are completely invisible. Error boundaries catch exceptions but discard them silently. No alerts, no tracking, no ability to diagnose issues reported by users.

- **Files:**
  - `app/global-error.tsx` — receives `error` parameter but never logs it
  - `app/(portal)/error.tsx` — same pattern
  - `app/(auth)/error.tsx` — same pattern
  - `lib/error-messages.ts` — transforms errors silently with no audit trail
- **Attack vector:** An attacker could trigger repeated errors (e.g., malformed API responses) without anyone noticing until users report problems manually.
- **Remediation:** Integrate an error monitoring service (Sentry, LogRocket, or Datadog RUM). At minimum, add `console.error` in production error boundaries and configure a reporting endpoint. Error digests should be displayed to users for support correlation.

---

### [ ] P2-14: auth-events.ts Listeners Not Error-Isolated *(NEW — 2026-02-28 scan)*

**Impact:** If any session-expired listener throws an error, the `forEach` loop in `emitSessionExpired()` breaks and remaining listeners don't execute, potentially leaving sessions in inconsistent state.

- **File:** `lib/auth-events.ts`, line 15 — `listeners.forEach((fn) => fn())`
- **Scenario:** Listener A clears QueryClient (succeeds), Listener B throws (breaks loop), Listener C redirects to login (never runs). User stays on protected page with cleared cache.
- **Remediation:** Wrap each listener invocation in try-catch:
  ```typescript
  export function emitSessionExpired() {
    listeners.forEach((fn) => {
      try { fn(); } catch (e) { console.error('Session expiry handler failed:', e); }
    });
  }
  ```

---

## P3 — Low

### [x] P3-1: MailHog Dev Link Visible in Production UI *(Fixed 2026-02-28)*

**Impact:** Leaks internal development infrastructure details to end users.

- **File:** `app/(auth)/esqueci-senha/page.tsx`, lines 132-137
- **Code:** `<a href="http://localhost:8025">MailHog (localhost:8025)</a>`
- **Remediation:** Conditionally render this block only when `process.env.NODE_ENV === 'development'` or behind a `NEXT_PUBLIC_DEV_MODE` flag.
- **Resolution:** Already wrapped in `{process.env.NODE_ENV === 'development' && (...)}` conditional. Verified not visible in production builds.

---

### [x] P3-2: Fake Profile Save (No-Op) *(Fixed 2026-02-27)*

**Impact:** Users are told their profile was saved when no API call was made. Data loss / false sense of security.

- **File:** `app/(portal)/settings/page.tsx`, lines 163-168
- **Remediation:** Implement the actual API call to persist profile data, or remove the save button until the backend endpoint is ready.
- **Resolution:** Save button is now permanently disabled with label "Salvar (em breve)". Fake `handleSaveProfile` handler removed. No false success feedback.

---

### [ ] P3-3: Missing `rel="noopener noreferrer"` on External Links

**Impact:** Opened pages can access `window.opener`.

- **File:** `app/(auth)/esqueci-senha/page.tsx`, line 134
- **Remediation:** Add `rel="noopener noreferrer"` to all `target="_blank"` links.

---

### [ ] P3-4: Password Reset Token in URL Query String

**Impact:** Token appears in browser history and could leak via Referer header.

- **File:** `app/(auth)/redefinir-senha/page.tsx`, line 23
- **Note:** This is standard practice for password reset flows, but combined with the lack of `Referrer-Policy` header (P0-4), the token could leak.
- **Remediation:** Fixing P0-4 (adding `Referrer-Policy: strict-origin-when-cross-origin`) mitigates this. Optionally, consume the token on page load and replace the URL via `history.replaceState`.

---

### [x] P3-5: Hardcoded Backend URL in next.config.ts Rewrite *(Fixed 2026-02-27)*

**Impact:** The rewrite destination `http://127.0.0.1:8000` won't work in production.

- **File:** `next.config.ts`, line 21
- **Remediation:** Use an environment variable: `destination: \`${process.env.API_INTERNAL_URL}/api/v1/:path*\``
- **Resolution:** Entire `rewrites()` function removed from `next.config.ts`. All API calls go directly through the Axios instance with `NEXT_PUBLIC_API_BASE_URL`.

---

### [ ] P3-6: Backend-Provided `menu_url` Used as href Without Validation

**Impact:** If a `javascript:` protocol URL is stored in the database, it could execute code when clicked.

- **File:** `app/(portal)/produtos/page.tsx`, line 254
- **Remediation:** Validate that the URL starts with `https://` before rendering as an `<a>` href.

---

### [ ] P3-7: No `.env.example` File

**Impact:** New developers must guess which environment variables to set. Risk of misconfiguration.

- **Remediation:** Create an `.env.example` file documenting all required variables with placeholder values.

---

### [ ] P3-8: Product Form — No Max Length Constraints

**Impact:** Arbitrary-length names, descriptions, and prices can be submitted.

- **File:** `app/(portal)/produtos/product-form.tsx`, lines 27-32
- **Remediation:** Add `max()` constraints to string fields and reasonable upper bounds to numeric fields.

---

### [ ] P3-9: Catalog Text Import — No Length Limit

**Impact:** Users can paste megabytes of text and submit it to the backend.

- **File:** `app/(portal)/produtos/menu-import-dialog.tsx`, lines 110-146
- **Remediation:** Add a character limit to the textarea and validate before submission.

---

### [ ] P3-10: WhatsApp Link — No Phone Number Format Validation

**Impact:** Malformed phone numbers could produce unexpected `wa.me` URLs.

- **File:** `app/(portal)/pedidos/page.tsx`, lines 508-509
- **Remediation:** Validate phone number format (e.g., minimum length, country code) before constructing the URL.

---

## P4 — Informational

### [x] P4-1: Extensive Use of `any` Type Reduces Type Safety *(Fixed 2026-02-27)*

- **Files:** Throughout the codebase — API responses, bot objects, order objects, error handlers
- **Impact:** TypeScript cannot catch data-shape bugs at compile time. Increases risk of runtime errors.
- **Remediation:** Define TypeScript interfaces for all API response shapes. Replace `any` with proper types.
- **Resolution:** Created `lib/types.ts` with centralized `Bot`, `BotFormValues`, `OnboardingPayload` interfaces. Replaced `any` across `meus-bots`, `edit-bot-sheet`, `bots/novo`, `pedidos`, `connect-whatsapp-button`, and `settings`.

---

### [ ] P4-2: No `loading.tsx` or `not-found.tsx` Pages

- **Impact:** Users see default Next.js loading/404 pages instead of branded experiences.
- **Remediation:** Add `loading.tsx` and `not-found.tsx` in route groups for better UX.

---

### [ ] P4-3: Server Actions Body Size Limit (5MB) — Dormant Config

- **File:** `next.config.ts`, line 7
- **Impact:** None currently (no server actions are used), but if server actions are added later, the 5MB limit could be abused.
- **Remediation:** Review and adjust if server actions are implemented.

---

### [ ] P4-4: File Upload Client-Side Validation Only

- **File:** `app/(portal)/produtos/menu-import-dialog.tsx`, lines 32-108
- **Impact:** Client-side 10MB limit and MIME type filtering can be bypassed by crafting raw HTTP requests.
- **Remediation:** Ensure the backend also validates file type and size. Client-side validation is UX, not security.

---

### [x] P4-5: `useEffect` Dependency Issue — SSE Reconnection Churn *(Fixed 2026-02-27)*

- **File:** `app/(portal)/pedidos/page.tsx`, lines 110-183
- **Impact:** The `toast` function in the dependency array may cause unnecessary SSE reconnections on every render.
- **Remediation:** Wrap `toast` in a `useRef` or use `useCallback` to stabilize the reference.
- **Resolution:** Wrapped `toast` and all callback props in `useCallback`. SSE effect dependencies stabilized.

---

## Summary

> **Updated:** 2026-02-28 (deep codebase scan)

| Priority | Open | Fixed | Description |
|----------|------|-------|-------------|
| **P0** | 1 | 4 | ~~Route guard, JWT in URL, security headers, error boundaries~~ resolved. **1 open:** localStorage tokens (P0-3, needs backend httpOnly cookie) |
| **P1** | 2 | 8 | ~~401 handler, OAuth state, origin check, API URLs, credentials, rate limiting, logout~~ resolved. **2 open:** CSP report-only (P1-9), cookie auth bypass (P1-10) |
| **P2** | 3 | 11 | ~~Error leakage, console logging, enumeration, open redirects, IDOR, validation, race conditions, CSRF~~ resolved. **3 open:** missing CSP directives (P2-12), no error monitoring (P2-13), auth-events error isolation (P2-14) |
| **P3** | 5 | 5 | ~~MailHog, fake save, hardcoded URL~~ resolved. **5 open:** rel attributes (P3-3), token in URL (P3-4), menu_url validation (P3-6), .env.example (P3-7), form limits (P3-8, P3-9, P3-10) |
| **P4** | 3 | 2 | ~~any typing, useEffect deps~~ resolved. **3 open:** loading/not-found pages (P4-2), server actions limit (P4-3), client-only upload validation (P4-4) |
| **Total** | **14** | **30** | **44 total** (5 new items added in 2026-02-28 scan) |

---

> **Production blockers (must fix):** P0-3 (localStorage XSS — needs backend support), P1-9 (enforce CSP), P2-13 (error monitoring).
> **Should fix before launch:** P1-10 (cookie bypass), P2-12 (CSP directives), P2-14 (error isolation).
> **Can defer post-launch:** P3/P4 items are defense-in-depth and polish.
