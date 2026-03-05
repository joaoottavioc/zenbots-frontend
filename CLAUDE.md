# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## IMPORTANT: Consult /docs Before Writing Any Code

**Before generating any code, always read the relevant documentation file in the `/docs` directory first.**

The `/docs` directory contains authoritative standards for this project. Code that violates these standards must not be written. Currently documented standards:

| File | Covers |
|------|--------|
| `docs/ui.md` | UI component standards — Shadcn UI only, no custom components |
| `docs/aws_architecture.md` | AWS deployment architecture — S3, CloudFront, Terraform, CI/CD |

If a task touches UI, read `docs/ui.md` before writing a single line. If a new standards doc is added to `/docs`, it carries the same mandatory precedence.

Also consult `tech_debt/` for known issues and `plan/` for deployment context before proposing architectural changes.

## Commands

```bash
npm run dev           # Start development server (Next.js on port 3000)
npm run build         # Production build (static export to out/)
npm run start         # Start production server (not used — static export)
npm run lint          # Run ESLint
npm run test          # Run all tests (Vitest)
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
```

## Architecture Overview

This is a **Next.js 16 App Router** frontend for ZenBots AI — a WhatsApp bot platform for delivery/restaurant automation. It is built as a **static export** (`output: 'export'` in `next.config.ts`) — there is no Node.js server in production. The static files are hosted on S3 and served through CloudFront.

### Route Groups

```
app/
  (auth)/      # Public routes: login, cadastro, esqueci-senha, redefinir-senha
  (portal)/    # Authenticated routes: meus-bots, produtos, pedidos, pagamentos,
               #   analytics, settings, suporte, bots/novo, whatsapp-callback
```

Route groups have their own `layout.tsx`. The portal layout includes the sidebar, top header, and a client-side auth guard.

### Authentication (Three Layers)

1. **Edge (production)**: CloudFront Function (`auth-redirect-dev`) checks for **both** the `zenbots_auth` presence cookie **and** the backend's httpOnly `access_token` cookie. If either is missing on a protected route, redirects to `/login`. The httpOnly cookie cannot be forged via XSS (`document.cookie` cannot create httpOnly cookies). Also handles `.html` URL rewriting. See `infra/modules/cloudfront/auth-redirect.js`.
2. **Client guard**: Portal layout (`app/(portal)/layout.tsx`) checks `isAuthenticated()` (presence cookie) on mount and redirects to `/login` if absent. Cross-tab logout sync via `BroadcastChannel`.
3. **API interceptor**: `lib/api.ts` response interceptor catches 401 → emits `sessionExpired` event → clears auth → redirects to `/login`.

There is **no `middleware.ts`** — it was removed when moving to static export. Auth uses **httpOnly cookies** set by the backend. The `zenbots_auth` presence cookie (non-sensitive, set by frontend) enables edge-level checks and client-side auth guards. CSRF protection uses double-submit pattern with `X-CSRF-Token` header.

### Auth Utilities (`lib/auth.ts`, `lib/auth-events.ts`)

- `lib/auth.ts`: `isAuthenticated()`, `setAuthPresence()`, `clearAuth()`, `getCsrfToken()`, `cleanupLegacyAuth()`. No client-side token storage — the httpOnly cookie is managed by the browser.
- `lib/auth-events.ts`: Pub/sub for session expiration. `onSessionExpired(handler)` returns unsubscribe. `emitSessionExpired()` broadcasts to all listeners.
- `hooks/use-session-guard.ts`: Subscribes to session expiration and clears React Query cache.

### API Layer (`lib/api.ts`)

A single Axios instance is used throughout the app:
- Base URL: `NEXT_PUBLIC_API_BASE_URL` (defaults to `http://localhost:8000`)
- `withCredentials: true` — browser sends httpOnly cookie automatically on all requests
- Request interceptor: attaches `X-CSRF-Token` header on mutating requests (POST/PUT/PATCH/DELETE), read from `csrf_token` cookie. Public auth paths are exempt.
- Response interceptor: on 401 → `emitSessionExpired()` + `clearAuth()` + redirect to `/login` (skips auth routes)
- **No API rewrites** — all calls go directly to the backend URL via Axios

All API calls use React Query:

```typescript
// Query pattern
useQuery({ queryKey: ['key'], queryFn: () => api.get('/endpoint').then(r => r.data) })

// Mutation pattern
useMutation({ mutationFn: (data) => api.post('/endpoint', data), onSuccess: () => queryClient.invalidateQueries(...) })
```

### State Management

**React Query** (TanStack v5) handles all server state. The `QueryClient` is configured in `app/providers.tsx`:
- **retry**: Conditional — returns `false` for 401/403 responses, `failureCount < 1` otherwise
- **refetchOnWindowFocus**: `false`

No global client-side state library is used.

### UI Stack

- **Shadcn UI** ("new-york" style) — base components live in `components/ui/`
- **Radix UI** primitives underlie Shadcn components
- **Tailwind CSS** with custom HSL color variables and brand tokens (`brand.nav`, `brand.whatsapp`, `brand.mercadopago`)
- **Fonts**: `Inter` (sans), `Outfit` (heading), `Space Grotesk` (logo)
- **Lucide React** for icons
- Custom business components (e.g., `bot-card.tsx`, `bot-selector.tsx`) also live in `components/ui/`

### Forms

React Hook Form + Zod for all forms. Use the `Form` wrapper from `components/ui/form.tsx` and `@hookform/resolvers/zod` for schema validation.

### Notifications

Custom toast system via `hooks/use-toast.ts` + `components/ui/toaster.tsx`. Use the `useToast` hook.

### Error Handling

- `lib/error-messages.ts`: `getSafeErrorMessage(error, fallback)` maps backend error strings to user-friendly Portuguese messages (21 known patterns).
- `lib/url-validation.ts`: `isTrustedRedirectUrl(url)` validates HTTPS + trusted domains for OAuth redirects.
- `hooks/use-submit-throttle.ts`: Client-side rate limiter for auth forms (3 free attempts, then exponential backoff capped at 30s).
- `app/global-error.tsx` and route-level `error.tsx` files provide error boundaries.
- `lib/error-reporting.ts`: Error monitoring via `@sentry/react`. `initErrorReporting()` is called in `providers.tsx` — activates Sentry when `NEXT_PUBLIC_SENTRY_DSN` is set, otherwise logs to console. All error boundaries call `reportError(error, { boundary })` and display `error.digest` when available.

### Types (`lib/types.ts`)

Shared TypeScript interfaces: `Bot`, `BotFormValues`, `OnboardingPayload`. Re-exports `Order`, `OrderStatus`, `OrderItem` from `app/(portal)/pedidos/types.ts`.

## Testing

**Vitest 4** with `@testing-library/react`. Tests live alongside source files (`*.test.tsx`).

- **31 test files, 174 tests**, all passing
- **Coverage**: ~66% statements, ~68% lines
- Setup file: `tests/setup.tsx` (jsdom environment, `@testing-library/jest-dom` matchers)
- Config: `vitest.config.ts` with `tsconfigPaths` plugin

When writing tests, follow existing patterns: co-locate test files with source, use `vi.mock()` for module mocking, `@testing-library/react` for rendering.

## Deployment

### Infrastructure (`infra/`)

Terraform modules in `infra/modules/` (s3-hosting, cloudfront, dns). Environment configs in `infra/environments/dev/`.

- **Hosting**: S3 bucket `zenbots-dev-frontend` + CloudFront distribution
- **Domain**: `dev.zenbotz.com.br` (Route 53 alias → CloudFront)
- **State**: `s3://zenbots-terraform-state/frontend-dev/terraform.tfstate`
- **Region**: `us-east-1`, Account: `578761488332`

### CI/CD (`.github/workflows/`)

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `pr-checks.yml` | PRs to `develop` or `main` | Lint (non-blocking), typecheck (non-blocking), test, build |
| `deploy-dev.yml` | Push to `develop` | Quality gates → build → S3 sync → CloudFront invalidation → smoke test |

IAM uses OIDC (no static keys). Build env vars come from GitHub Secrets.

## Key Integration Points

- **WhatsApp OAuth**: Facebook App ID/Config IDs in env vars. Dev mode toggled via `NEXT_PUBLIC_WHATSAPP_DEV_MODE`.
- **Mercado Pago OAuth**: Payment flow in `app/(portal)/pagamentos/`. OAuth redirect handled in `whatsapp-callback/`.
- **Login**: POST to `/auth/token` with `application/x-www-form-urlencoded` (fields: `username`, `password`). Backend returns `access_token`.

## Environment Variables

```
NEXT_PUBLIC_API_BASE_URL       # Backend FastAPI URL (e.g., http://localhost:8000)
NEXT_PUBLIC_FB_APP_ID          # Facebook App ID for WhatsApp integration
NEXT_PUBLIC_FB_CONFIG_ID       # Facebook embedded signup config ID
NEXT_PUBLIC_FB_LOGIN_CONFIG_ID # Facebook login config ID
NEXT_PUBLIC_WHATSAPP_DEV_MODE  # "true" to enable WhatsApp dev mode
NEXT_PUBLIC_ENVIRONMENT        # "dev" or "prod" — used in CI/CD builds
NEXT_PUBLIC_SUPPORT_WHATSAPP   # WhatsApp number for support page link
NEXT_PUBLIC_SENTRY_DSN         # Sentry DSN for error monitoring (optional — logs to console when unset)
```

Build-time validation in `next.config.ts` ensures required vars are present for production builds.

## Tech Debt

Active backlogs are tracked in `tech_debt/`:

| File | Scope |
|------|-------|
| `backlog_architecture.md` | Architecture issues (42 total, 34 fixed) |
| `backlog_tests.md` | Test coverage gaps (current: ~66%) |
| `backlog_vulnerabilities.md` | Security issues (44 total, 32 fixed) |
| `backlog_production.md` | Production readiness (score: 6.5/10, 25 items) |

Key open blockers: `.env.local` committed with credentials (BLK-1). Error monitoring infrastructure is in place (set `NEXT_PUBLIC_SENTRY_DSN` to activate Sentry). JWT in localStorage has been migrated to httpOnly cookie auth with CSRF double-submit.
