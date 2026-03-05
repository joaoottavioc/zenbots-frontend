# Test Coverage Backlog — ZenBots Frontend

> **Audit date:** 2026-02-27 | **Updated:** 2026-02-28
> **Last run:** 30 test files, 171 tests, all passing (~19s)
> **Overall coverage:** 66.55% Stmts | 66.15% Branch | 59.21% Funcs | 68.31% Lines
> **Stack:** Vitest 4 + React Testing Library + jsdom + @vitest/coverage-v8
> **Related:** Architecture debt in `tech_debt/backlog_architecture.md`, security issues in `tech_debt/backlog_vulnerabilities.md`

---

## Resolution Summary

| Priority | Total | Resolved | Open | % Resolved |
|----------|-------|----------|------|------------|
| **P0** | 5 | 0 | 5 | 0% |
| **P1** | 8 | 0 | 8 | 0% |
| **P2** | 7 | 0 | 7 | 0% |
| **P3** | 7 | 1 | 6 | 14.3% |
| **Infra** | 4 | 0 | 4 | 0% |
| **Total** | **31** | **1** | **30** | **3.2%** |

---

### Change log (2026-02-28)

| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| Test files | 22 | 30 | **+8** |
| Tests | 120 | 171 | **+51** |
| Stmts | 70.31% | 66.55% | **-3.76%** |
| Branch | 71.49% | 66.15% | **-5.34%** |
| Funcs | 58.40% | 59.21% | **+0.81%** |
| Lines | 71.88% | 68.31% | **-3.57%** |

> **Why coverage dropped:** Security hardening (middleware, auth module, session guard, submit throttle, error boundaries) added ~400 lines of new source code. While 8 new test files were created, the heavily-reworked `connect-whatsapp-button.tsx` (security fixes) went from 0 lines tested to 7.31% stmts — the component grew significantly but its test file primarily covers the `isAllowedOrigin` utility, not the core SDK/onboarding flow.

---

## Priority Definitions

| Priority | Meaning | Guidance |
|----------|---------|----------|
| **P0** | Critical — Untested files with 0% coverage or broken infra | Block merges until resolved |
| **P1** | High — Files below 50% statement coverage | Fix within 1 sprint |
| **P2** | Medium — Files between 50-75% statement coverage | Fix within 2-3 sprints |
| **P3** | Low — Files above 75% but with notable function/branch gaps | Address opportunistically |

---

## P0 — Critical (Untested Files)

These files have **zero dedicated tests**. They only get indirect coverage (if any) through page-level tests that happen to render them.

### [ ] P0-1: `app/(portal)/bots/novo/bot-form.tsx` — No Tests

**Impact:** Multi-step bot creation wizard with Zod validation, file upload, conditional fields (PIX, delivery settings). Most complex form in the codebase.

- **What to test:** Schema validation (PIX key formats, phone, CEP), step navigation, conditional field visibility, form submission payload, error handling
- **Mock needs:** `api.post('/bots')`, `api.patch`, file upload via react-dropzone

---

### [ ] P0-2: `app/(portal)/bots/novo/page.tsx` — No Tests

**Impact:** Wrapper page for bot creation. Handles navigation after successful bot creation.

- **What to test:** Renders `BotForm`, redirects on success

---

### [ ] P0-3: `app/(portal)/produtos/menu-import-dialog.tsx` — No Tests

**Impact:** CSV/text import dialog for bulk product creation. Accepts file upload and raw text input.

- **What to test:** File upload validation (size, type), text input submission, API call, error feedback
- **Mock needs:** `api.post`, react-dropzone file drop simulation

---

### [ ] P0-4: `app/(portal)/meus-bots/edit-bot-sheet.tsx` — No Tests

**Impact:** Bot editing sheet — form pre-populated with existing bot data. Currently mocked in `meus-bots/page.test.tsx`.

- **What to test:** Form pre-population, field validation, save mutation, error handling
- **Mock needs:** `api.patch('/bots/:id')`, bot data fixture

---

### [ ] P0-5: `app/providers.tsx` — No Tests

**Impact:** Low risk. QueryClient configuration wrapper. Indirectly tested by every test that uses `renderWithProviders()`.

- **What to test:** QueryClient defaults (retry: 1, refetchOnWindowFocus: false), provider renders children
- **Priority note:** Lowest P0 — only here because 0% direct coverage

---

## P1 — High (Below 50% Statement Coverage)

### [ ] P1-1: `components/ui/connect-whatsapp-button.tsx` — 7.31% Stmts, 9.09% Funcs *(NEW — was P0-3)*

**Current tests:** 12 (origin validation in `isAllowedOrigin` utility)
**Uncovered lines:** 49-202 (essentially the entire component)

- **What happened:** Test file was created during security hardening, but only covers the exported `isAllowedOrigin` helper. The core component logic (FB SDK load, `launchWhatsAppSignup`, `postMessage` handler, CSRF state generation, onboarding API call) is completely untested.
- **Missing tests:**
  - [ ] FB SDK script loads and sets `window.fbAsyncInit`
  - [ ] `launchWhatsAppSignup()` call with correct config
  - [ ] `postMessage` handler validates origin via `isAllowedOrigin`
  - [ ] CSRF state is generated and validated
  - [ ] Onboarding API call with correct payload
  - [ ] Error handling on onboarding failure
  - [ ] Race condition guard (onboarding not triggered twice)
- **Mock needs:** `window.FB`, `window.fbAsyncInit`, `MessageEvent`, `api.post('/onboarding')`, `crypto.randomUUID`

---

### [ ] P1-2: `middleware.ts` — 30.76% Stmts, 66.66% Funcs *(NEW)*

**Current tests:** 13
**Uncovered lines:** 23-37

- **What happened:** Middleware was created during security hardening (P0-1 in vulnerability backlog). Tests cover route matching logic but not the cookie-based auth check and redirect flow.
- **Missing tests:**
  - [ ] Unauthenticated request to portal route redirects to `/login`
  - [ ] Authenticated request passes through
  - [ ] Auth routes (`/login`, `/cadastro`) are not protected
  - [ ] Static assets and API routes are excluded from middleware

---

### [ ] P1-3: `app/(portal)/meus-bots/page.tsx` — 34.78% Stmts, 17.39% Funcs

**Current tests:** 6 (loading, empty state, render cards, delete dialog, "Novo Bot" link, error state)
**Uncovered lines:** 58-62, 69-73, 79-82, 92-110, 145, 168-196

- **Missing tests:**
  - [ ] Toggle bot status (open/close) mutation and optimistic update
  - [ ] Delete confirmation actually calls `api.delete` and removes bot from list
  - [ ] Edit sheet opens with correct bot data
  - [ ] WhatsApp disconnect flow
  - [ ] Pagination or empty state after last bot deleted

---

### [ ] P1-4: `components/ui/bot-card.tsx` — 42.85% Stmts, 22.22% Funcs *(Reclassified from P3)*

**Current tests:** 10 (renders, status, toggle, connect/manage buttons)
**Uncovered lines:** 65-76, 117-133, 183-195

- **Missing tests:**
  - [ ] Dropdown menu actions (edit, delete, disconnect)
  - [ ] Menu opens on click and shows all options
  - [ ] Delete calls `onDelete` callback
  - [ ] Edit calls `onEdit` callback

**Note:** Stmts are low despite 10 tests because dropdown menu interactions are not exercised. Reclassified from P3 to P1 since 42.85% stmts properly belongs in the <50% tier.

---

### [ ] P1-5: `app/(portal)/pedidos/order-column.tsx` — 42.85% Stmts, 33.33% Funcs

**Current tests:** Indirectly tested through `pedidos/page.test.tsx`
**Uncovered lines:** 50-54

- **Missing tests:**
  - [ ] Renders column header with correct title and order count
  - [ ] Renders order cards inside the column
  - [ ] Empty column state

---

### [ ] P1-6: `app/(portal)/pedidos/payment-status-badge.tsx` — 46.15% Stmts, 33.33% Funcs

**Current tests:** Indirectly covered by `order-card.test.tsx`
**Uncovered lines:** 35-59

- **Missing tests:**
  - [ ] Renders correct badge variant for each payment status (`paid`, `pending`, `failed`, `refunded`)
  - [ ] Displays correct label text for each status
  - [ ] Handles unknown/null status gracefully

---

### [ ] P1-7: `app/(portal)/pedidos/page.tsx` — 47.54% Stmts, 34.28% Funcs

**Current tests:** 3 (select bot prompt, Kanban columns, order items)
**Uncovered lines:** 124, 228, 292-407

- **Missing tests:**
  - [ ] SSE connection setup and real-time order updates
  - [ ] Order status transitions (PENDING -> PREPARING -> READY)
  - [ ] Cancel order flow
  - [ ] Human takeover toggle
  - [ ] Print ticket action
  - [ ] Sound notification toggle
  - [ ] WhatsApp link opens correct URL
  - [ ] Error handling when SSE connection fails

---

### [ ] P1-8: `app/(portal)/produtos/page.tsx` — 49.58% Stmts, 35% Funcs

**Current tests:** 6 (select bot prompt, empty state, grouped by category, toggle switches, error state, error toast on delete)
**Uncovered lines:** 156-163, 178-187, 218-222, 227-229, 349-393, 421

- **Missing tests:**
  - [ ] Create product via form submission
  - [ ] Inline edit product (name, price) and save
  - [ ] Bulk select and bulk delete
  - [ ] Toggle product availability mutation
  - [ ] Menu import dialog opens and closes
  - [ ] Delete single product confirmation and API call

---

## P2 — Medium (50-75% Statement Coverage)

### [ ] P2-1: `app/(portal)/pedidos/ticket-impressao.tsx` — 50% Stmts, 50% Funcs

**Current tests:** None direct
**Uncovered lines:** 6-25

- **Missing tests:**
  - [ ] Renders order details in print-friendly layout (store name, items, total, customer info)
  - [ ] Formats currency values correctly
  - [ ] Handles orders with and without delivery info

---

### [ ] P2-2: `hooks/use-toast.ts` — 52.83% Stmts, 33.33% Funcs

**Current tests:** 9 (reducer actions: ADD, UPDATE, DISMISS, REMOVE)
**Uncovered lines:** 41-44, 67-68, 137-190

- **Missing tests:**
  - [ ] `useToast()` hook returns `toast` and `dismiss` functions
  - [ ] `toast()` function dispatches ADD_TOAST action
  - [ ] Auto-dismiss via `TOAST_REMOVE_DELAY`
  - [ ] Multiple listener subscriptions and cleanup

---

### [ ] P2-3: `tests/helpers/render.tsx` — 57.14% Stmts

**Uncovered lines:** 20-22

- **Missing tests:**
  - [ ] `renderWithProviders()` accepts custom QueryClient options
  - [ ] Low priority — test infra, not business logic

---

### [ ] P2-4: `app/(portal)/pagamentos/page.tsx` — 58.13% Stmts, 46.66% Funcs

**Current tests:** 6 (connected/disconnected badge, connect/disconnect buttons, redirect to MP, features card)
**Uncovered lines:** 55, 77-78, 94, 101-112, 175

- **Missing tests:**
  - [ ] OAuth callback handling (code in URL triggers `handleCallback`)
  - [ ] CSRF state validation on OAuth return
  - [ ] Disconnect mutation calls API and updates state
  - [ ] Error toast on failed connection/disconnection
  - [ ] Loading state during connection flow

---

### [ ] P2-5: `app/(portal)/settings/page.tsx` — 63.63% Stmts, 70.58% Funcs

**Current tests:** 6 (tabs, profile tab, security tab, password validation, save disabled, subscription status)
**Uncovered lines:** 152-153, 171-175, 273, 324-339

- **Missing tests:**
  - [ ] Password change form submission and success toast
  - [ ] Password change API error handling
  - [ ] Subscription upgrade button redirects to checkout URL
  - [ ] Bot selector in subscription tab

---

### [ ] P2-6: `tests/helpers/mocks.ts` — 75% Stmts *(NEW)*

**Uncovered lines:** 46

- Low priority — test infrastructure helper. Only missing one mock branch.

---

### [ ] P2-7: `app/(portal)/pedidos/utils.ts` — 64.28% Stmts

**Current tests:** Indirectly tested
**Uncovered lines:** 13-15

- **Missing tests:**
  - [ ] All utility functions with edge cases (null/undefined inputs, empty strings)

---

## P3 — Low (Above 75% with Notable Gaps)

### [ ] P3-1: `app/(auth)/cadastro/page.tsx` — 81.25% Stmts, 63.63% Branch

**Current tests:** 4
**Uncovered lines:** 84-91

- **Missing tests:**
  - [ ] API error with field-level validation message from backend
  - [ ] Duplicate email error handling

---

### [ ] P3-2: `app/(auth)/redefinir-senha/page.tsx` — 78.37% Stmts, 76.92% Branch

**Current tests:** 5
**Uncovered lines:** 79-84

- **Missing tests:**
  - [ ] API error on password reset (network failure, expired token)
  - [ ] Password mismatch via Zod `.refine()` shows inline error

---

### [x] P3-3: `app/(portal)/whatsapp-callback/page.tsx` — 100% Stmts *(Resolved 2026-02-28)*

**Resolution:** Coverage improved from 75% to 100% after security hardening refactored the component with `useRouter` and CSRF state validation. All code paths now covered.

---

### [ ] P3-4: `components/layout/top-header.tsx` — 85.71% Stmts

**Current tests:** 3
**Uncovered line:** 60

- **Missing tests:**
  - [ ] Mobile sheet closes after nav item click

---

### [ ] P3-5: `hooks/use-session-guard.ts` — 75% Stmts *(NEW)*

**Current tests:** Indirectly covered via `layout.test.tsx`
**Uncovered lines:** 14

- **Missing tests:**
  - [ ] Hook cleanup (event listener removal)
- **Priority note:** Low risk — indirectly tested through portal layout tests.

---

### [ ] P3-6: `app/(auth)/login/page.tsx` — 96% Stmts, 66.66% Branch *(NEW — was 100%)*

**Current tests:** 7
**Uncovered lines:** 74, 170-175

- **What happened:** Coverage regressed from 100% to 96% after submit throttle integration added untested code paths.
- **Missing tests:**
  - [ ] Submit throttle cooldown prevents rapid resubmission
  - [ ] Throttle state displayed to user

---

### [ ] P3-7: `app/(auth)/esqueci-senha/page.tsx` — 89.47% Stmts, 66.66% Branch

**Current tests:** 5
**Uncovered line:** 158

- **Missing tests:**
  - [ ] Submit throttle cooldown behavior

---

## Infrastructure Gaps

These are not coverage gaps but important missing pieces in the test setup.

### [ ] INFRA-1: No CI Integration

- `npm run test:coverage` is not wired into any CI pipeline
- No coverage thresholds configured in `vitest.config.ts` to prevent regressions
- **Fix:** Add `coverage.thresholds` to vitest config and integrate into CI

### [ ] INFRA-2: No Coverage Thresholds

- No minimum coverage enforced — coverage can silently regress
- Coverage has already dropped from 70.31% to 66.55% stmts in one day due to new source without proportional test coverage
- **Fix:** Add to `vitest.config.ts`:
  ```ts
  coverage: {
    thresholds: {
      statements: 65,
      branches: 65,
      functions: 55,
      lines: 65,
    }
  }
  ```
  *(Thresholds lowered from original recommendation to match current reality)*

### [ ] INFRA-3: `act(...)` Warnings in Test Output

- `produtos/page.test.tsx` produces multiple `act(...)` warnings during test runs
- Tests pass but warnings indicate state updates outside React's batching
- **Fix:** Wrap async state updates in `act()` or use `waitFor()` properly

### [ ] INFRA-4: Console Errors During Test Runs (Expected but Noisy)

- `login/page.test.tsx` and `esqueci-senha/page.test.tsx` intentionally trigger error paths
- `console.error` output clutters test output
- **Fix:** Suppress expected console errors with `vi.spyOn(console, 'error').mockImplementation(() => {})` in relevant tests

---

## Current Coverage Snapshot

### By File (sorted by statement coverage, ascending)

| File | Stmts | Branch | Funcs | Lines | Tests |
|------|-------|--------|-------|-------|-------|
| `connect-whatsapp-button.tsx` | 7.31% | 9.09% | 9.09% | 6.57% | 12 |
| `middleware.ts` | 30.76% | 33.33% | 66.66% | 30.76% | 13 |
| `meus-bots/page.tsx` | 34.78% | 38.88% | 17.39% | 36.36% | 6 |
| `bot-card.tsx` | 42.85% | 96.66% | 22.22% | 42.85% | 10 |
| `pedidos/order-column.tsx` | 42.85% | 75% | 33.33% | 42.85% | 0 |
| `pedidos/payment-status-badge.tsx` | 46.15% | 40% | 33.33% | 54.54% | 0 |
| `pedidos/page.tsx` | 47.54% | 37.34% | 34.28% | 49.54% | 3 |
| `produtos/page.tsx` | 49.58% | 60.93% | 35% | 52.04% | 6 |
| `pedidos/ticket-impressao.tsx` | 50% | 23.07% | 50% | 33.33% | 0 |
| `hooks/use-toast.ts` | 52.83% | 75% | 33.33% | 54.9% | 9 |
| `tests/helpers/render.tsx` | 57.14% | 100% | 60% | 57.14% | — |
| `pagamentos/page.tsx` | 58.13% | 65.51% | 46.66% | 58.13% | 6 |
| `settings/page.tsx` | 63.63% | 71.91% | 70.58% | 65.62% | 6 |
| `pedidos/utils.ts` | 64.28% | 50% | 100% | 72.72% | 0 |
| `hooks/use-session-guard.ts` | 75% | 100% | 66.66% | 75% | 0 |
| `tests/helpers/mocks.ts` | 75% | 75% | 75% | 75% | — |
| `order-card.tsx` | 76.19% | 82.22% | 66.66% | 75% | 4 |
| `redefinir-senha/page.tsx` | 78.37% | 76.92% | 90% | 84.84% | 5 |
| `cadastro/page.tsx` | 81.25% | 63.63% | 100% | 83.33% | 4 |
| `top-header.tsx` | 85.71% | 100% | 75% | 85.71% | 3 |
| `lib/api.ts` | 89.47% | 90% | 60% | 88.88% | 6 |
| `esqueci-senha/page.tsx` | 89.47% | 66.66% | 85.71% | 94.44% | 5 |
| `lib/auth.ts` | 90% | 50% | 100% | 100% | 6 |
| `analytics/page.tsx` | 91.52% | 84.09% | 87.5% | 91.66% | 4 |
| `login/page.tsx` | 96% | 66.66% | 100% | 100% | 7 |
| `user-nav.tsx` | 94.73% | 100% | 66.66% | 94.73% | 3 |
| `portal/layout.tsx` | 100% | 100% | 100% | 100% | 6 |
| `suporte/page.tsx` | 100% | 100% | 100% | 100% | 8 |
| `whatsapp-callback/page.tsx` | 100% | 100% | 100% | 100% | 2 |

### Files at 100% Coverage (no action needed)

- `login/page.tsx` (lines), `portal/layout.tsx`, `suporte/page.tsx`, `whatsapp-callback/page.tsx`
- `lib/utils.ts`, `lib/auth-events.ts`, `hooks/use-submit-throttle.ts`
- `pedidos/whatsapp-icon.tsx`
- Error boundaries: `app/global-error.tsx`, `app/(auth)/error.tsx`, `app/(portal)/error.tsx`
- UI primitives: `accordion`, `alert-dialog`, `avatar`, `badge`, `button`, `checkbox`, `circuit-bg`, `input`, `label`, `logo`, `password-req`, `premium-lock`, `separator`, `sidebar`, `skeleton`, `switch`, `tabs`
- `bot-selector.tsx` (100% stmts)

### New Test Files (added 2026-02-28)

| File | Tests | Covers |
|------|-------|--------|
| `middleware.test.ts` | 13 | Route matching, auth checks |
| `components/ui/connect-whatsapp-button.test.tsx` | 12 | `isAllowedOrigin` utility only |
| `components/ui/sidebar.test.tsx` | 6 | Sidebar nav rendering |
| `lib/auth.test.ts` | 6 | Token management (`getToken`, `setToken`, `clearToken`) |
| `lib/auth-events.test.ts` | 3 | Auth event pub/sub system |
| `hooks/use-submit-throttle.test.ts` | 7 | Exponential backoff throttle hook |
| `app/(auth)/error.test.tsx` | 3 | Auth error boundary |
| `app/(portal)/error.test.tsx` | 3 | Portal error boundary |
| `app/global-error.test.tsx` | 3 | Global error boundary |

---

## Summary

| Priority | Open | Resolved | Theme |
|----------|------|----------|-------|
| **P0** | 5 | 0 | Untested files: bot-form, bot page, menu-import, edit-bot-sheet, providers |
| **P1** | 8 | 0 | Below 50%: connect-whatsapp (7%), middleware (31%), meus-bots, bot-card, order-column, payment-badge, pedidos, produtos |
| **P2** | 7 | 0 | 50-75%: ticket-impressao, use-toast, test helpers, pagamentos, settings, mocks, pedidos/utils |
| **P3** | 6 | 1 | 75%+: cadastro, redefinir-senha, top-header, session-guard, login, esqueci-senha. ~~whatsapp-callback~~ resolved (100%) |
| **Infra** | 4 | 0 | CI integration, coverage thresholds, act() warnings, console noise |
| **Total** | **30** | **1** | |

---

> **Recommended approach:** The biggest wins right now are: (1) Expand `connect-whatsapp-button.test.tsx` to cover the component flow — this alone could lift overall stmts by ~3-4%. (2) Expand `middleware.test.ts` to cover the auth redirect logic. (3) Tackle P1 items (meus-bots, pedidos, produtos) as they cover the most business-critical pages. (4) Set up INFRA-2 coverage thresholds immediately to prevent further regression.
