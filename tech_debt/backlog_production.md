# Production Blockers Backlog — ZenBots Frontend

> **Audit date:** 2026-03-02
> **Last updated:** 2026-03-09
> **Scope:** Full codebase production-readiness review of `zenbots-frontend` (Next.js 16 App Router)
> **Cross-reference:** Architecture debt in `backlog_architecture.md`, security debt in `backlog_vulnerabilities.md`

---

## Resolution Summary

| Severity | Total | Resolved | Open | % Resolved |
|----------|-------|----------|------|------------|
| **BLOCKER** | 7 | 7 | 0 | 100% |
| **CRITICAL** | 7 | 7 | 0 | 100% |
| **IMPORTANT** | 11 | 4 | 7 | 36% |
| **Total** | **25** | **18** | **7** | **72%** |

---

## Readiness Score: 8.5 / 10

All **BLOCKER** and **CRITICAL** items have been resolved. The application is now safe to go live. Auth has been migrated to httpOnly cookies with CSRF double-submit, CSP is enforced at the CloudFront edge, Sentry error monitoring is integrated, and full CI/CD deployment infrastructure is in place. The remaining 7 open items are UX polish and minor operational improvements — none block production traffic.

---

## Severity Definitions

| Severity | Meaning | Gate |
|----------|---------|------|
| **BLOCKER** | Will cause failures, data leaks, or broken UX in production. Cannot ship. | Must fix before any production traffic |
| **CRITICAL** | Significant security or reliability risk. Could ship for soft-launch but not GA. | Fix within first week of launch |
| **IMPORTANT** | Degrades UX, observability, or maintainability in production. | Fix within first sprint post-launch |

---

## BLOCKER — Cannot Go Live Without Fixing

### BLK-1: `.env.local` Is Committed to Git with Dev Credentials — RESOLVED

**Resolved:** `.env.local` is no longer tracked in git. `.env.example` exists with placeholder values and instructions. Production env vars are injected via GitHub Secrets in CI/CD.

---

### BLK-2: MailHog Dev Link Visible to Production Users — RESOLVED

**Resolved:** The MailHog link in `app/(auth)/esqueci-senha/page.tsx` is now wrapped in `{process.env.NODE_ENV === 'development' && (...)}` — will not render in production.

---

### BLK-3: Toast Success Message Also References MailHog — RESOLVED

**Resolved:** Toast message in `app/(auth)/esqueci-senha/page.tsx:49` now reads `"Verifique sua caixa de entrada."` — no MailHog reference.

---

### BLK-4: SSE Endpoint Uses Hardcoded Localhost Fallback — RESOLVED

**Resolved:** `app/(portal)/pedidos/page.tsx` now uses a `getApiBase()` helper that throws an error if `NEXT_PUBLIC_API_BASE_URL` is not configured. No localhost fallback.

---

### BLK-5: No Environment Variable Validation at Startup — RESOLVED

**Resolved:** `next.config.ts` validates required env vars (`NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_FB_APP_ID`, `NEXT_PUBLIC_FB_CONFIG_ID`, `NEXT_PUBLIC_FB_LOGIN_CONFIG_ID`) during production builds. Build fails if any are missing.

---

### BLK-6: Auth Cookie Missing `Secure` Flag — RESOLVED

**Resolved:** `lib/auth.ts` `setAuthPresence()` conditionally adds `; Secure` when `window.location.protocol === 'https:'`. Works in both dev (HTTP) and production (HTTPS).

---

### BLK-7: No Deployment Infrastructure Exists — RESOLVED

**Resolved:** Full deployment infrastructure in place:
- Terraform modules in `infra/modules/` (s3-hosting, cloudfront, dns)
- Environment config in `infra/environments/dev/`
- GitHub Actions: `deploy-dev.yml` (build → S3 sync → CloudFront invalidation → smoke test) and `pr-checks.yml` (lint, typecheck, test)
- IAM uses OIDC (no static keys)

---

## CRITICAL — Fix Within First Week

### CRT-1: CSP Is Report-Only — Not Enforcing — RESOLVED

**Resolved:** CSP headers removed from `next.config.ts`. CSP is now enforced at the CloudFront edge via `aws_cloudfront_response_headers_policy` in `infra/modules/cloudfront/main.tf`. The policy includes `default-src 'self'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`, and removes `'unsafe-eval'`.

---

### CRT-2: JWT Token in localStorage — XSS-Accessible — RESOLVED

**Resolved:** JWT is no longer stored in localStorage. Auth uses httpOnly cookies set by the backend. Frontend only manages a non-sensitive presence cookie (`zenbots_auth=1`). Legacy localStorage cleanup runs automatically via `cleanupLegacyAuth()` in `app/providers.tsx`.

---

### CRT-3: Middleware Cookie Is an Unsigned Presence Marker — RESOLVED

**Resolved:** `middleware.ts` was removed (static export). Auth uses three-layer defense: (1) CloudFront Function validates both the presence cookie and the backend's httpOnly `access_token` cookie, (2) client-side guard in portal layout, (3) API interceptor catches 401. The httpOnly cookie cannot be forged via XSS.

---

### CRT-4: No Error Monitoring / Observability — RESOLVED

**Resolved:** Sentry integration via `lib/error-reporting.ts` and `@sentry/react`. All error boundaries (`global-error.tsx`, `(auth)/error.tsx`, `(portal)/error.tsx`) call `reportError()`. Activates when `NEXT_PUBLIC_SENTRY_DSN` is set; logs to console otherwise.

---

### CRT-5: React Query Retries 401/403 Errors — RESOLVED

**Resolved:** `app/providers.tsx` retry logic is now conditional — returns `false` for 401/403 status codes, `failureCount < 1` otherwise.

---

### CRT-6: React Query DevTools in Production Dependencies — RESOLVED

**Resolved:** `@tanstack/react-query-devtools` moved to `devDependencies` in `package.json`. Not bundled in production builds.

---

### CRT-7: `WHATSAPP_DEV_MODE=true` Will Persist Into Production — RESOLVED

**Resolved:** `.env.local` is properly git-ignored (BLK-1 resolved). CI/CD builds from the git tree with env vars injected via GitHub Secrets. The dev flag does not propagate to production builds.

---

## IMPORTANT — Fix Within First Sprint Post-Launch

### IMP-1: Toasts Never Auto-Dismiss (16-Minute Delay) — RESOLVED

**Resolved:** `TOAST_REMOVE_DELAY` in `hooks/use-toast.ts` is now `5000` ms (5 seconds).

---

### IMP-2: No Pagination for Products or Bots

**Impact:** `produtos/page.tsx` and `meus-bots/page.tsx` fetch and render ALL items. Performance degrades with 100+ items; unusable at 500+.

- **Files:** `app/(portal)/produtos/page.tsx`, `app/(portal)/meus-bots/page.tsx`
- **Fix:** Server-side pagination (`?page=1&limit=50`) or client-side virtualization (`@tanstack/react-virtual`). Requires backend support.

---

### IMP-3: No `robots.txt`, `favicon.ico`, or Sitemap — PARTIALLY RESOLVED

**Partially resolved:**
- `robots.txt` exists in `public/` with proper disallows for protected routes
- Favicon configured in `app/layout.tsx` metadata (`icon: "/logo-zenbotz.png"`)

**Still missing:** `sitemap.xml` (may not be needed for a private SaaS with no public-facing pages)

---

### IMP-4: No Open Graph / Social Meta Tags

**Impact:** Sharing any ZenBots URL on WhatsApp, Slack, or social media shows a generic/blank preview.

- **File:** `app/layout.tsx` — only `title`, `description`, and `icon` in metadata
- **Missing:** `og:title`, `og:description`, `og:image`, `twitter:card`
- **Fix:** Expand `metadata` export with Open Graph configuration.

---

### IMP-5: No Custom `loading.tsx` or `not-found.tsx` Pages — PARTIALLY RESOLVED

**Partially resolved:**
- `app/not-found.tsx` exists with a branded 404 page

**Still missing:** `loading.tsx` files for skeleton UI during route transitions

---

### IMP-6: Mock Data Visible in Analytics Page

**Impact:** The analytics page shows hardcoded fake product names ("Combo Familia Premium", "X-Bacon Supremo") when the plan is locked. These are visible in source and DevTools.

- **File:** `app/(portal)/analytics/page.tsx:81-87`
- **Risk:** Users on free plans see obviously fake data behind a blur, which looks unprofessional.
- **Fix:** Use generic placeholder data or pure skeleton/blur without rendered text.

---

### IMP-7: Auth Layout Uses `h-screen` Instead of `min-h-screen`

**Impact:** On small screens, auth page content (especially with password requirements expanded) gets clipped instead of scrolling.

- **Files:** All auth pages (`login`, `cadastro`, `esqueci-senha`, `redefinir-senha`, `verificar-email`, `verificar-email-enviado`) and `app/(auth)/layout.tsx`
- **Fix:** Change `h-screen` to `min-h-screen` in auth layout/pages.

---

### IMP-8: Hardcoded Subscription Prices in Settings — RESOLVED

**Resolved:** Prices are now fetched dynamically from the backend via `useQuery` to `/billing/plans` and rendered with `formatPrice(plan.price, plan.currency)`.

---

### IMP-9: Profile Save Is Permanently Disabled

**Impact:** The settings profile tab shows a "Salvar (em breve)" disabled button. For production, this is confusing — users expect to save their profile.

- **File:** `app/(portal)/settings/page.tsx:257`
- **Options:** (a) Implement the `PUT /auth/me` endpoint and enable save, (b) hide the profile editing fields entirely until the feature is ready, or (c) keep as-is with clearer "coming soon" messaging.

---

### IMP-10: `auth-events.ts` Listeners Not Error-Isolated — RESOLVED

**Resolved:** `lib/auth-events.ts` `emitSessionExpired()` wraps each listener invocation in try-catch with `reportError()`.

---

### IMP-11: No Request Timeout on Axios

**Impact:** API calls can hang indefinitely if the backend is unresponsive. Users see infinite loading spinners.

- **File:** `lib/api.ts` — no `timeout` configured on the Axios instance
- **Fix:** Add `timeout: 15000` (15s) to the Axios `create()` config.

---

## Summary

| Severity | Count | Resolved | Open | Theme (Open) |
|----------|-------|----------|------|---------------|
| **BLOCKER** | 7 | 7 | 0 | — |
| **CRITICAL** | 7 | 7 | 0 | — |
| **IMPORTANT** | 11 | 4 | 7 | No pagination, missing OG meta, no loading.tsx, mock analytics data, h-screen clipping, disabled profile save, no Axios timeout |
| **Total** | **25** | **18** | **7** | |

---

## What's Already Done Well

The codebase has strong fundamentals and has made significant progress since the initial audit:

- **All 7 blockers resolved** — env vars secured, dev references removed, deployment infrastructure complete
- **All 7 critical issues resolved** — httpOnly cookie auth, enforced CSP at edge, Sentry monitoring, conditional retries
- **34 architectural issues fixed** (from `backlog_architecture.md`)
- **32 security issues fixed** (from `backlog_vulnerabilities.md`)
- **Three-layer auth:** CloudFront Function + client guard + API interceptor with httpOnly cookies
- **CSRF protection:** Double-submit pattern with `X-CSRF-Token` header
- **Good form practices:** React Hook Form + Zod on all forms, client-side throttling on auth
- **Safe error messages:** `getSafeErrorMessage()` prevents backend detail leakage
- **URL validation:** `isTrustedRedirectUrl()` prevents open redirects
- **OAuth CSRF protection:** State parameters on both WhatsApp and Mercado Pago flows
- **Strict postMessage origin checking:** `isAllowedOrigin()` validates Facebook origins
- **No console.log in source:** All debug logging has been removed
- **Type safety:** Centralized types in `lib/types.ts`, `any` largely eliminated
- **Error boundaries:** All three levels (global, auth, portal) with Sentry reporting
- **Full CI/CD:** GitHub Actions for PR checks and automated deployment to S3/CloudFront

---

## Remaining Work

The 7 open items are all **IMPORTANT** severity (UX polish, not blockers):

1. **IMP-2:** Add pagination for products/bots (requires backend support)
2. **IMP-3:** Add `sitemap.xml` (if needed for SEO)
3. **IMP-4:** Add Open Graph meta tags for social sharing previews
4. **IMP-5:** Add `loading.tsx` skeleton pages for route transitions
5. **IMP-6:** Replace mock analytics data with generic placeholders
6. **IMP-7:** Fix `h-screen` → `min-h-screen` on auth pages
7. **IMP-9:** Implement profile save or improve "coming soon" UX
8. **IMP-11:** Add Axios request timeout
