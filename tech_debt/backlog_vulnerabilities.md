# Security Vulnerabilities Backlog — ZenBots Frontend

> **Audit date:** 2026-02-26
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

## P2 — Medium

### [ ] P2-1: Backend Error Details Displayed Directly to Users

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

### [ ] P2-2: Console Logging of Sensitive Data in Production

**Impact:** Auth responses, customer data, order payloads, and error objects visible in browser console.

- **Key instances:**
  - `components/ui/connect-whatsapp-button.tsx`, line 118: `console.log("authResponse:", response.authResponse)` — logs Facebook OAuth tokens
  - `app/(portal)/pedidos/page.tsx`, line 140: `console.log("Atualização recebida:", data.type, data.payload)` — logs customer data
  - `app/(auth)/login/page.tsx`, line 42: `console.error("Erro no login:", error)` — may log credential-related errors
  - 13+ additional instances across the codebase
- **Remediation:** Remove all `console.log`/`console.error` calls from production code. Use a logging library with environment-aware log levels, or configure a build step to strip console calls.

---

### [ ] P2-3: Account Enumeration via Registration/Reset Error Messages

**Impact:** Attacker can determine which emails are registered by observing different error messages.

- **Files:** `app/(auth)/cadastro/page.tsx`, lines 80-88; `app/(auth)/esqueci-senha/page.tsx`
- **Remediation:** Return generic messages regardless of whether the email exists (e.g., "If this email is registered, you will receive a reset link"). This is primarily a backend fix but the frontend should also use generic fallback messages.

---

### [ ] P2-4: Open Redirect via Backend-Provided URLs

**Impact:** If the backend is compromised or API responses are tampered with, users are redirected to phishing sites.

- **Files:**
  - `app/(portal)/pagamentos/page.tsx`, line 94: `window.location.href = res.data.url`
  - `app/(portal)/settings/page.tsx`, line 140: `window.open(response.data.checkout_url, '_blank')`
- **Remediation:** Validate that returned URLs match expected domains (e.g., `mercadopago.com`, `mercadopago.com.br`) before navigating.

---

### [ ] P2-5: IDOR Potential — No Client-Side Bot Ownership Validation

**Impact:** A user could manipulate `selectedBotId` via browser dev tools to attempt accessing another user's bot data.

- **Files:** Throughout portal pages — `pedidos/page.tsx`, `produtos/page.tsx`, `analytics/page.tsx`
- **Pattern:** `api.get(\`${API_BASE}/bots/${selectedBotId}/orders\`)`
- **Note:** The backend MUST enforce ownership validation. The frontend should only display bots returned by the user's own `/bots` endpoint.
- **Remediation:** Primarily a backend concern, but the frontend should validate that `selectedBotId` is in the user's bot list before making requests.

---

### [ ] P2-6: Bot Form Schema — Weak Validation on Sensitive Fields

**Impact:** Invalid or malicious data can be submitted for PIX keys, phone numbers, CEPs, and monetary values.

- **File:** `app/(portal)/bots/novo/bot-form.tsx`, lines 28-58
- **Details:**
  - `pix_key`: Only `min(5)`, no format validation for CPF/CNPJ/email/phone
  - `whatsapp_number`: Only `min(10)`, no digits-only regex
  - `cep`: Only `min(8)`, no 8-digit regex
  - `max_delivery_radius`, `delivery_fee`, `min_order_value`: No upper bound (`max()`)
- **Remediation:** Add regex patterns for PIX key types, phone numbers, and CEP. Add reasonable `max()` constraints on numeric fields.

---

### [ ] P2-7: Password Change Uses Manual Validation Instead of Zod Schema

**Impact:** Password strength rules may drift out of sync with registration schema. No form-level validation integration.

- **File:** `app/(portal)/settings/page.tsx`, lines 170-190
- **Remediation:** Extract the password validation schema from the registration page into a shared Zod schema. Use React Hook Form for the password change form.

---

### [ ] P2-8: Login Form Has No Zod Schema

**Impact:** Only HTML5 `required` and `type="email"` validation. Inconsistent with the rest of the codebase.

- **File:** `app/(auth)/login/page.tsx`
- **Remediation:** Add a Zod schema with proper email format validation. Use React Hook Form for consistency.

---

### [ ] P2-9: No Image Domain Restrictions in next.config.ts

**Impact:** If future features use `next/image` with remote URLs, there is no domain allowlist.

- **File:** `next.config.ts`
- **Remediation:** Add `images: { remotePatterns: [...] }` configuration restricting allowed image domains.

---

### [ ] P2-10: WhatsApp Onboarding Race Condition

**Impact:** The 5-second fallback timer in the WhatsApp connect flow could cause onboarding to be triggered twice if the "Happy Path" event arrives after the fallback fires.

- **File:** `components/ui/connect-whatsapp-button.tsx`, lines 116-133
- **Remediation:** Track whether onboarding has already been triggered with a ref/flag. Clear the timeout when the happy-path event arrives.

---

### [ ] P2-11: No CSRF Protection

**Impact:** If the backend ever uses cookies for session state (e.g., the Facebook SDK sets `cookie: true`), CSRF attacks could be possible.

- **Files:** All mutation calls across the codebase
- **Remediation:** Implement CSRF tokens or verify that the backend exclusively uses Bearer tokens (not cookies) for authentication.

---

## P3 — Low

### [ ] P3-1: MailHog Dev Link Visible in Production UI

**Impact:** Leaks internal development infrastructure details to end users.

- **File:** `app/(auth)/esqueci-senha/page.tsx`, lines 132-137
- **Code:** `<a href="http://localhost:8025">MailHog (localhost:8025)</a>`
- **Remediation:** Conditionally render this block only when `process.env.NODE_ENV === 'development'` or behind a `NEXT_PUBLIC_DEV_MODE` flag.

---

### [ ] P3-2: Fake Profile Save (No-Op)

**Impact:** Users are told their profile was saved when no API call was made. Data loss / false sense of security.

- **File:** `app/(portal)/settings/page.tsx`, lines 163-168
- **Remediation:** Implement the actual API call to persist profile data, or remove the save button until the backend endpoint is ready.

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

### [ ] P3-5: Hardcoded Backend URL in next.config.ts Rewrite

**Impact:** The rewrite destination `http://127.0.0.1:8000` won't work in production.

- **File:** `next.config.ts`, line 21
- **Remediation:** Use an environment variable: `destination: \`${process.env.API_INTERNAL_URL}/api/v1/:path*\``

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

### [ ] P4-1: Extensive Use of `any` Type Reduces Type Safety

- **Files:** Throughout the codebase — API responses, bot objects, order objects, error handlers
- **Impact:** TypeScript cannot catch data-shape bugs at compile time. Increases risk of runtime errors.
- **Remediation:** Define TypeScript interfaces for all API response shapes. Replace `any` with proper types.

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

### [ ] P4-5: `useEffect` Dependency Issue — SSE Reconnection Churn

- **File:** `app/(portal)/pedidos/page.tsx`, lines 110-183
- **Impact:** The `toast` function in the dependency array may cause unnecessary SSE reconnections on every render.
- **Remediation:** Wrap `toast` in a `useRef` or use `useCallback` to stabilize the reference.

---

## Summary

| Priority | Count | Description |
|----------|-------|-------------|
| **P0** | 5 | No route guard, JWT in URL, localStorage tokens, no security headers, no error boundaries |
| **P1** | 8 | No 401 handler, missing OAuth state params, loose origin check, inconsistent API URLs, credential exposure, no rate limiting, incomplete logout |
| **P2** | 11 | Error leakage, console logging, account enumeration, open redirects, IDOR risk, weak validation, race conditions, no CSRF protection |
| **P3** | 10 | Dev info in prod, fake save, missing rel attributes, hardcoded URLs, no env example, weak form limits |
| **P4** | 5 | Type safety, missing UX pages, dormant config, client-only upload validation, useEffect deps |
| **Total** | **39** | |

---

> **Next steps:** Address all P0 items before any production deployment. P1 items should be resolved in the current development cycle. P2+ items should be scheduled based on development capacity.
