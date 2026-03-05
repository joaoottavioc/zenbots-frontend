# Production Blockers Backlog — ZenBots Frontend

> **Audit date:** 2026-03-02
> **Scope:** Full codebase production-readiness review of `zenbots-frontend` (Next.js 16 App Router)
> **Cross-reference:** Architecture debt in `backlog_architecture.md`, security debt in `backlog_vulnerabilities.md`

---

## Resolution Summary

| Severity | Total | Resolved | Open | % Resolved |
|----------|-------|----------|------|------------|
| **BLOCKER** | 7 | 0 | 7 | 0% |
| **CRITICAL** | 7 | 0 | 7 | 0% |
| **IMPORTANT** | 11 | 0 | 11 | 0% |
| **Total** | **25** | **0** | **25** | **0%** |

---

## Readiness Score: 6.5 / 10

The application is **well-built architecturally** — modern stack, good patterns, solid test infrastructure, 32 architectural issues already fixed. However, it is **not yet safe to go live**. The codebase has the engineering quality of a production app but the **configuration and operational posture of a development environment**. The blockers below are mostly configuration, secrets management, and missing operational infrastructure — not deep code problems.

---

## Severity Definitions

| Severity | Meaning | Gate |
|----------|---------|------|
| **BLOCKER** | Will cause failures, data leaks, or broken UX in production. Cannot ship. | Must fix before any production traffic |
| **CRITICAL** | Significant security or reliability risk. Could ship for soft-launch but not GA. | Fix within first week of launch |
| **IMPORTANT** | Degrades UX, observability, or maintainability in production. | Fix within first sprint post-launch |

---

## BLOCKER — Cannot Go Live Without Fixing

### BLK-1: `.env.local` Is Committed to Git with Dev Credentials

**Impact:** Facebook App ID (`836141859054340`), config IDs, and `WHATSAPP_DEV_MODE=true` are in the git history forever. Anyone with repo access has these credentials.

- **Proof:** `git ls-files --cached .env.local` returns the file. `.gitignore` has `.env*` but the file was added before that rule.
- **Contents exposed:**
  ```
  NEXT_PUBLIC_API_BASE_URL="http://localhost:8000"
  NEXT_PUBLIC_FB_APP_ID=836141859054340
  NEXT_PUBLIC_FB_CONFIG_ID=1980753239529004
  NEXT_PUBLIC_FB_LOGIN_CONFIG_ID=1980753239529004
  NEXT_PUBLIC_WHATSAPP_DEV_MODE=true
  ```
- **Risk:** Credential leakage. If the repo is ever made public or a contributor's account is compromised, these are exposed.
- **Fix:**
  1. `git rm --cached .env.local` and commit
  2. Rotate the Facebook App ID and config IDs (treat them as compromised)
  3. Create `.env.example` with placeholder values
  4. Add production env vars via hosting platform's secrets management (Vercel, AWS, etc.)

---

### BLK-2: MailHog Dev Link Visible to Production Users

**Impact:** The forgot-password success screen shows a hardcoded `http://localhost:8025` MailHog link to all users, in all environments.

- **File:** `app/(auth)/esqueci-senha/page.tsx:158-163`
- **Code:** Unconditional render of dev hint:
  ```tsx
  <p className="text-xs text-muted-foreground pt-4">
    Dica de Dev: Como estamos em ambiente de teste, verifique o
    <a href="http://localhost:8025">MailHog (localhost:8025)</a>.
  </p>
  ```
- **Risk:** Confuses real users. Leaks internal tooling info. Broken link in production.
- **Fix:** Wrap in `{process.env.NODE_ENV === 'development' && (...)}` or remove entirely.

---

### BLK-3: Toast Success Message Also References MailHog

**Impact:** The success toast on forgot-password says "Verifique sua caixa de entrada (ou o MailHog)."

- **File:** `app/(auth)/esqueci-senha/page.tsx:49`
- **Code:** `description: "Verifique sua caixa de entrada (ou o MailHog)."`
- **Fix:** Change to `"Verifique sua caixa de entrada."` in production. Use env check for the dev variant.

---

### BLK-4: SSE Endpoint Uses Hardcoded Localhost Fallback

**Impact:** The orders page SSE connection uses `API_BASE` with a `localhost:8000` fallback. If `NEXT_PUBLIC_API_BASE_URL` is unset in production, SSE silently connects to nothing.

- **File:** `app/(portal)/pedidos/page.tsx:32`
- **Code:** `const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";`
- **Why it matters:** This is the only file that still defines a local `API_BASE` (needed for raw `fetch()` SSE — not Axios). If the env var is missing, the entire orders page is non-functional.
- **Fix:** Remove fallback. Fail loudly: `const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL!;` with a startup validation check.

---

### BLK-5: No Environment Variable Validation at Startup

**Impact:** If any `NEXT_PUBLIC_*` env var is missing, the app silently degrades — localhost fallbacks, undefined FB App IDs, broken OAuth flows. No error until a user hits the broken feature.

- **Files:** `next.config.ts:3`, `pedidos/page.tsx:32`, `connect-whatsapp-button.tsx`
- **Fix:** Add a build-time or startup-time validation. Example in `next.config.ts`:
  ```typescript
  const requiredEnvs = ['NEXT_PUBLIC_API_BASE_URL', 'NEXT_PUBLIC_FB_APP_ID'];
  for (const env of requiredEnvs) {
    if (!process.env[env]) throw new Error(`Missing required env var: ${env}`);
  }
  ```

---

### BLK-6: Auth Cookie Missing `Secure` Flag

**Impact:** The `zenbots_auth` cookie is set without the `Secure` flag. In production over HTTPS, this means the cookie can also be sent over HTTP if the user (or an attacker) hits an HTTP URL, enabling session hijacking via MITM.

- **File:** `lib/auth.ts:12`
- **Code:** `document.cookie = \`${AUTH_COOKIE}=1; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Strict\`;`
- **Fix:** Add `Secure` flag: `; Secure; SameSite=Strict`
- **Note:** This will prevent the cookie from being set on `http://localhost` in dev. Use a conditional: `const secure = window.location.protocol === 'https:' ? '; Secure' : '';`

---

### BLK-7: No Deployment Infrastructure Exists

**Impact:** There is no way to deploy this to production. No Dockerfile, no CI/CD pipeline, no Vercel config, no deployment documentation.

- **Missing files:**
  - `Dockerfile` / `docker-compose.yml`
  - `.github/workflows/*.yml` (CI/CD)
  - `vercel.json` (if Vercel)
  - Deployment documentation / runbook
- **Fix:** Create deployment pipeline for your chosen platform. At minimum: build validation in CI, env var injection, and a deploy target.

---

## CRITICAL — Fix Within First Week

### CRT-1: CSP Is Report-Only — Not Enforcing

**Impact:** The `Content-Security-Policy-Report-Only` header only logs violations, doesn't block them. Any XSS payload executes freely.

- **File:** `next.config.ts:40`
- **Code:** Key is `"Content-Security-Policy-Report-Only"` instead of `"Content-Security-Policy"`
- **Compounding risk:** Combined with `'unsafe-inline'` and `'unsafe-eval'` in `script-src`, CSP provides zero real XSS protection.
- **Fix:**
  1. Switch to `Content-Security-Policy` (enforcing)
  2. Remove `'unsafe-eval'` (only needed by devtools)
  3. Keep `'unsafe-inline'` only if Facebook SDK requires it (test without)
  4. Add missing directives: `base-uri 'self'`, `object-src 'none'`, `form-action 'self'`, `frame-ancestors 'none'`

---

### CRT-2: JWT Token in localStorage — XSS-Accessible

**Impact:** Any XSS vulnerability (including from the Facebook SDK or a future `dangerouslySetInnerHTML`) allows immediate theft of the auth token.

- **File:** `lib/auth.ts:7,11`
- **Status:** Partially mitigated (centralized in `lib/auth.ts`, CSP headers added). Full fix requires backend httpOnly cookie support.
- **Mitigation path:** Backend must set token as `httpOnly; Secure; SameSite=Strict` cookie. Frontend stops handling raw tokens entirely.
- **Interim:** Ensure CSP is enforced (CRT-1) to minimize XSS surface.

---

### CRT-3: Middleware Cookie Is an Unsigned Presence Marker

**Impact:** Server-side route protection can be bypassed by manually setting `zenbots_auth=1` in browser DevTools.

- **File:** `middleware.ts:29` checks `request.cookies.get("zenbots_auth")`. `lib/auth.ts:12` sets the cookie to literal `"1"`.
- **Mitigating factor:** API calls still require the Bearer token, so no data is exposed. Only the empty UI shell (sidebar, headers) renders.
- **Fix:** Store the actual JWT in an httpOnly cookie and validate it in middleware. Or sign the marker cookie server-side.

---

### CRT-4: No Error Monitoring / Observability

**Impact:** Production errors are invisible. Error boundaries catch exceptions but silently discard them. No alerting, no dashboards, no correlation.

- **Files:** `app/global-error.tsx`, `app/(portal)/error.tsx`, `app/(auth)/error.tsx`
- **Consequence:** Cannot know errors are occurring, measure impact, or diagnose user-reported issues.
- **Fix:** Integrate Sentry (or equivalent). Add `Sentry.captureException(error)` in all error boundaries. Display `error.digest` to users for support correlation.

---

### CRT-5: React Query Retries 401/403 Errors

**Impact:** When a token expires, React Query retries the 401 once before failing, causing double redirect/toast.

- **File:** `app/providers.tsx:13` — `retry: 1` unconditionally
- **Fix:** Conditional retry:
  ```typescript
  retry: (failureCount, error) => {
    const status = (error as any)?.response?.status;
    if (status === 401 || status === 403) return false;
    return failureCount < 1;
  }
  ```

---

### CRT-6: React Query DevTools in Production Dependencies

**Impact:** `@tanstack/react-query-devtools` is in `dependencies` (not `devDependencies`), meaning it's bundled in production builds. Exposes internal query state and API response cache to anyone who opens React DevTools.

- **File:** `package.json:30`
- **Fix:** Move to `devDependencies`. Conditionally import only in development.

---

### CRT-7: `WHATSAPP_DEV_MODE=true` Will Persist Into Production

**Impact:** The committed `.env.local` has `NEXT_PUBLIC_WHATSAPP_DEV_MODE=true`. If this file or its values propagate to production, WhatsApp integration may run in dev/sandbox mode.

- **Fix:** Resolved by BLK-1 (removing `.env.local` from git) + ensuring production env vars explicitly set this to `false` or omit it.

---

## IMPORTANT — Fix Within First Sprint Post-Launch

### IMP-1: Toasts Never Auto-Dismiss (16-Minute Delay)

**Impact:** `TOAST_REMOVE_DELAY` is `1000000` ms (~16 min). Toasts accumulate on screen, cluttering the UI.

- **File:** `hooks/use-toast.ts:12`
- **Fix:** Set to `5000`–`8000` ms. Use longer delay or manual dismiss for error toasts.

---

### IMP-2: No Pagination for Products or Bots

**Impact:** `produtos/page.tsx` and `meus-bots/page.tsx` fetch and render ALL items. Performance degrades with 100+ items; unusable at 500+.

- **Files:** `app/(portal)/produtos/page.tsx`, `app/(portal)/meus-bots/page.tsx`
- **Fix:** Server-side pagination (`?page=1&limit=50`) or client-side virtualization (`@tanstack/react-virtual`). Requires backend support.

---

### IMP-3: No `robots.txt`, `favicon.ico`, or Sitemap

**Impact:** No SEO configuration. Missing favicon shows a broken icon in browser tabs. Search engines have no crawl guidance.

- **Directory:** `public/` has `logo-zenbotz.png` but no standard web assets.
- **Missing:** `robots.txt`, `favicon.ico`, `apple-touch-icon.png`, `sitemap.xml`
- **Fix:** Generate favicon set from logo. Add `robots.txt` (disallow if private SaaS). Add `sitemap.xml` for public routes if applicable.

---

### IMP-4: No Open Graph / Social Meta Tags

**Impact:** Sharing any ZenBots URL on WhatsApp, Slack, or social media shows a generic/blank preview.

- **File:** `app/layout.tsx` — only `title`, `description`, and `icon` in metadata
- **Missing:** `og:title`, `og:description`, `og:image`, `twitter:card`
- **Fix:** Expand `metadata` export with Open Graph configuration.

---

### IMP-5: No Custom `loading.tsx` or `not-found.tsx` Pages

**Impact:** Users see default Next.js loading and 404 pages instead of branded experiences.

- **Missing in:** `app/(portal)/` and `app/(auth)/` route groups
- **Fix:** Add `loading.tsx` with skeleton UI. Add `not-found.tsx` with branded 404 and navigation.

---

### IMP-6: Mock Data Visible in Analytics Page

**Impact:** The analytics page shows hardcoded fake product names ("Combo Família Premium", "X-Bacon Supremo") when the plan is locked. These are visible in source and DevTools.

- **File:** `app/(portal)/analytics/page.tsx:81-87`
- **Risk:** Users on free plans see obviously fake data behind a blur, which looks unprofessional.
- **Fix:** Use generic placeholder data or pure skeleton/blur without rendered text.

---

### IMP-7: Auth Layout Uses `h-screen` Instead of `min-h-screen`

**Impact:** On small screens, auth page content (especially with password requirements expanded) gets clipped instead of scrolling.

- **File:** `app/(auth)/esqueci-senha/page.tsx:65` and similar in other auth pages
- **Fix:** Change `h-screen` to `min-h-screen` in auth layout/pages.

---

### IMP-8: Hardcoded Subscription Prices in Settings

**Impact:** Settings page shows "R$ 5,00" and "R$ 10,00" as static strings even though it queries the billing API. Price changes require a code deployment.

- **File:** `app/(portal)/settings/page.tsx`
- **Fix:** Use pricing data from billing API response dynamically.

---

### IMP-9: Profile Save Is Permanently Disabled

**Impact:** The settings profile tab shows a "Salvar (em breve)" disabled button. For production, this is confusing — users expect to save their profile.

- **File:** `app/(portal)/settings/page.tsx`
- **Options:** (a) Implement the `PUT /auth/me` endpoint and enable save, (b) hide the profile editing fields entirely until the feature is ready, or (c) keep as-is with clearer "coming soon" messaging.

---

### IMP-10: `auth-events.ts` Listeners Not Error-Isolated

**Impact:** If any session-expired listener throws, the `forEach` loop breaks and remaining listeners don't execute. Could leave sessions in inconsistent state.

- **File:** `lib/auth-events.ts`
- **Fix:** Wrap each listener invocation in try-catch.

---

### IMP-11: No Request Timeout on Axios

**Impact:** API calls can hang indefinitely if the backend is unresponsive. Users see infinite loading spinners.

- **File:** `lib/api.ts` — no `timeout` configured on the Axios instance
- **Fix:** Add `timeout: 15000` (15s) to the Axios `create()` config.

---

## Summary

| Severity | Count | Theme |
|----------|-------|-------|
| **BLOCKER** | 7 | Env vars committed to git, dev references in prod UI, missing `Secure` cookie flag, no deployment pipeline, no env validation |
| **CRITICAL** | 7 | CSP not enforcing, localStorage XSS, unsigned auth cookie, no error monitoring, query retry on 401, devtools in prod, dev mode flag |
| **IMPORTANT** | 11 | Toast delay, no pagination, missing SEO/meta/favicon, mock data visible, layout clipping, hardcoded prices, no request timeout |
| **Total** | **25** | |

---

## What's Already Done Well

Before concluding negatively, the codebase has strong fundamentals:

- **32 architectural issues already fixed** (P0s and P1s from `backlog_architecture.md`)
- **30 security issues already fixed** (from `backlog_vulnerabilities.md`)
- **Solid auth flow:** middleware route protection, 401 interceptor, cross-tab sync, logout with cache clear
- **Good form practices:** React Hook Form + Zod on all forms, client-side throttling on auth
- **Safe error messages:** `getSafeErrorMessage()` prevents backend detail leakage
- **URL validation:** `isTrustedRedirectUrl()` prevents open redirects
- **OAuth CSRF protection:** State parameters on both WhatsApp and Mercado Pago flows
- **Strict postMessage origin checking:** `isAllowedOrigin()` validates Facebook origins
- **No console.log in source:** All debug logging has been removed
- **Type safety:** Centralized types in `lib/types.ts`, `any` largely eliminated
- **Error boundaries:** All three levels (global, auth, portal) implemented
- **SSE with auth headers:** Token sent via `Authorization` header, not URL parameter
- **Security headers:** HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy all configured

---

## Recommended Launch Sequence

1. **Week 1 — Blockers:** Fix BLK-1 through BLK-7. This is pure configuration work.
2. **Week 1 — Critical (quick wins):** CRT-5 (5 lines), CRT-6 (`npm install` change), CRT-7 (env var)
3. **Week 2 — Critical (requires effort):** CRT-1 (CSP enforcement — test thoroughly), CRT-4 (Sentry integration)
4. **Week 2 — Critical (requires backend):** CRT-2, CRT-3 (httpOnly cookie migration)
5. **Post-launch sprint:** IMP-1 through IMP-11

**Estimated effort to unblock production (BLK items only):** 1–2 days of focused work.
