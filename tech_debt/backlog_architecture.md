# Architectural Debt Backlog — ZenBots Frontend

> **Audit date:** 2026-02-26 | **Updated:** 2026-02-28
> **Scope:** Full codebase architectural review of `zenbots-frontend` (Next.js 16 App Router)
> **Related:** Security-specific issues are tracked in `tech_debt/backlog_vulnerabilities.md`

---

## Priority Definitions

| Priority | Meaning | Guidance |
|----------|---------|----------|
| **P0** | Critical — Active bugs or broken patterns that affect runtime behavior | Fix before next deploy |
| **P1** | High — Structural issues that cause cascading maintenance problems | Fix within 1 sprint |
| **P2** | Medium — Inconsistencies, missing patterns, or DX degradation | Fix within 2-3 sprints |
| **P3** | Low — Cleanup, dead code, minor performance, polish | Address opportunistically |

---

## P0 — Critical (Active Bugs / Broken Patterns)

### [x] P0-1: Double Base URL — Wrong Environment Variable in 12+ Files *(Fixed 2026-02-27)*

**Impact:** API calls construct `http://localhost:8000/http://localhost:8000/endpoint`. Only works by accident because Axios treats absolute URLs as overrides.

- **Root cause:** `lib/api.ts` configures Axios with `baseURL` from `NEXT_PUBLIC_API_BASE_URL`. But 12+ files define their own `API_BASE` using a *different, non-existent* env var `NEXT_PUBLIC_API_URL`, then pass full URLs to the Axios instance: `api.get(`${API_BASE}/bots`)`.
- **Why it works today:** `NEXT_PUBLIC_API_URL` is undefined, falls back to hardcoded `http://localhost:8000`. The absolute URL overrides Axios's `baseURL`. If either env var changes or the backend moves hosts, all these calls break silently.
- **Files using wrong pattern (`NEXT_PUBLIC_API_URL` + absolute URL with `api`):**

| File | Line |
|------|------|
| `app/(auth)/login/page.tsx` | 21 |
| `app/(auth)/cadastro/page.tsx` | 47 |
| `app/(auth)/esqueci-senha/page.tsx` | 18 |
| `app/(auth)/redefinir-senha/page.tsx` | 30 |
| `app/(portal)/bots/novo/bot-form.tsx` | 26 |
| `app/(portal)/meus-bots/page.tsx` | 24 |
| `app/(portal)/meus-bots/edit-bot-sheet.tsx` | 16 |
| `app/(portal)/produtos/page.tsx` | 52 |
| `app/(portal)/produtos/menu-import-dialog.tsx` | 30 |
| `app/(portal)/analytics/page.tsx` | 30 |
| `app/(portal)/analytics/best-sellers-card.tsx` | 13 |
| `components/ui/bot-selector.tsx` | 16 |

- **Correct pattern (already used in some files):** `api.get('/bots')` — relative path, let Axios `baseURL` handle it.
- **Fix:** Remove all per-file `API_BASE` constants. Use relative paths with the shared `api` instance. Standardize on `NEXT_PUBLIC_API_BASE_URL` everywhere.
- **Resolution:** Removed `API_BASE` from all 12 files listed above plus `bots/novo/page.tsx`. Converted all `api.*()` calls to relative paths. Kept `API_BASE` only in `pedidos/page.tsx` for the `EventSource` call (raw browser API, not Axios). All 92 tests pass, build succeeds.

---

### [x] P0-2: Missing Mobile Navigation — Users Locked Out on Small Screens *(Fixed 2026-02-27)*

**Impact:** The sidebar uses `hidden md:block` with zero mobile alternative. No hamburger menu, no drawer, no bottom nav. Mobile users cannot navigate the app at all.

- **File:** `app/(portal)/layout.tsx`, line 19
- **Fix:** Add a mobile navigation drawer/sheet triggered by a hamburger button in `TopHeader`.
- **Resolution:** Added hamburger `<Button>` (`md:hidden`) to `top-header.tsx` that opens a `<Sheet side="left">` with all 7 sidebar nav items. Matches dark sidebar styling with active route highlight via `usePathname`. Sheet closes on nav item click. Test file created at `components/layout/top-header.test.tsx`.

---

### [x] P0-3: Missing Suspense Boundary for `useSearchParams()` *(Fixed 2026-02-27)*

**Impact:** `whatsapp-callback/page.tsx` calls `useSearchParams()` directly in the page component without a `<Suspense>` wrapper. This causes a build-time error in Next.js production builds (`next build`).

- **File:** `app/(portal)/whatsapp-callback/page.tsx`, line 8
- **Fix:** Wrap the page content in a `<Suspense>` boundary, or extract the `useSearchParams()` usage into a child client component.
- **Resolution:** Extracted component body into `WhatsappCallbackContent`, wrapped in `<Suspense>` at the default export with a spinner fallback. Test file created at `app/(portal)/whatsapp-callback/page.test.tsx`.

---

### [x] P0-4: Dead Route Reference — `/mais-vendidos` Does Not Exist *(Fixed 2026-02-27)*

**Impact:** The "Ver todos" button in the best sellers card navigates to a route that doesn't exist, producing a 404.

- **File:** `app/(portal)/analytics/best-sellers-card.tsx`, line 96
- **Code:** `router.push('/mais-vendidos')`
- **Fix:** Point to the correct route (likely `/analytics` or create the missing page).
- **Resolution:** Changed to `router.push('/analytics')` — consistent with the sidebar mapping.

---

### [x] P0-5: Settings Profile Save Is a No-Op (Fake Save) *(Fixed 2026-02-27)*

**Impact:** Users click "Save", see a success toast, but nothing is persisted. Data is lost on page reload.

- **File:** `app/(portal)/settings/page.tsx`, lines 163-168
- **Code:** Uses `setTimeout` to simulate saving. No API call.
- **Fix:** Implement the actual `PUT /auth/me` (or equivalent) API call, or disable the button with a "coming soon" label.
- **Resolution:** No backend endpoint exists. Removed `handleSaveProfile` fake handler and `isLoadingProfile` state. Button is now permanently disabled with label "Salvar (em breve)". Test updated to verify button is disabled.

---

## P1 — High (Structural / Maintainability)

### [x] P1-1: God Components — Files Exceeding 400+ Lines with Mixed Concerns *(Fixed 2026-02-27)*

Three page files are monolithic components that combine data fetching, business logic, and multiple UI sub-components in a single file:

| File | Lines | Contains |
|------|-------|----------|
| `app/(portal)/pedidos/page.tsx` | 859 | Page + `OrderColumn` + `OrderCard` + `TicketImpressao` + `PaymentStatusBadge` + `WhatsAppIcon` + utility functions. All sub-components accept `any` props. |
| `app/(portal)/produtos/page.tsx` | 415 | Page + inline editing + bulk operations + 6 mutations + 2 queries + multiple modals |
| `app/(portal)/settings/page.tsx` | 331 | Profile form + password change + subscription management + pricing cards + 3 manual `useEffect` fetches |

**Also:** `components/layout/top-header.tsx` (216 lines) contains ~160 lines of inline SVG artwork that should be extracted.

**Fix:** Extract sub-components into separate files. Define proper TypeScript interfaces for props. Move data-fetching logic into custom hooks.

**Resolution:** Extracted `pedidos/page.tsx` (859→~310 lines) into 7 files: `types.ts`, `utils.ts`, `whatsapp-icon.tsx`, `payment-status-badge.tsx`, `ticket-impressao.tsx`, `order-card.tsx`, `order-column.tsx` — all with typed interfaces (no more `any` props). Extracted `PasswordReq` into shared `components/ui/password-req.tsx` (used by settings, cadastro, redefinir-senha). Extracted circuit SVG into `components/ui/circuit-bg.tsx` wrapped in `React.memo`. Settings was already simplified during React Query migration (Step 6). All 101 tests pass.

---

### [x] P1-2: Settings & Pagamentos Pages Bypass React Query Entirely *(Fixed 2026-02-27)*

**Impact:** These pages manually manage loading/error/data states with `useState` + `useEffect` + `api.get()`, duplicating what React Query provides. This causes race conditions, no caching, no retry, and inconsistency with the rest of the codebase.

- **`settings/page.tsx`:** Three `useEffect` hooks (lines 71, 89, 105) that each call `api.get()` independently. The `fetchBots` effect has `selectedBotId` in its dep array, causing a double-fetch on mount.
- **`pagamentos/page.tsx`:** Entirely manual — `useState` for `isConnected`, `isLoading`, `isLinking` (lines 27-30). No `useQuery` or `useMutation`.
- **`user-nav.tsx`:** `useEffect` + `api.get('/auth/me')` instead of `useQuery`. The same endpoint is fetched by `settings/page.tsx` without cache sharing.

**Fix:** Refactor to use `useQuery` / `useMutation`. Extract reusable queries (e.g., `useCurrentUser`, `useMyBots`) into `hooks/` or `lib/queries.ts`.

**Resolution:** Migrated all 3 files to React Query. `user-nav.tsx` and `settings/page.tsx` now share the `['currentUser']` query key for `/auth/me` (automatic cache sharing). Settings uses `['myBots']` (shared with bot-selector) and `['billingStatus', botId]`. Pagamentos uses `useQuery` for status check and `useMutation` for connect/disconnect/callback. All manual `useEffect`+`useState` fetch patterns removed.

---

### [x] P1-3: No 401 Response Interceptor — Silent Auth Failures *(Fixed 2026-02-27)*

**Impact:** When the backend returns 401 (expired/invalid token), nothing happens. The user stays on the page with broken data. No redirect to login, no token cleanup.

- **File:** `lib/api.ts` — only has a request interceptor (lines 8-17). No response interceptor.
- **Fix:** Add `api.interceptors.response.use(...)` that on 401: clears localStorage token, calls `queryClient.clear()`, and redirects to `/login`.

**Resolution:** Added response interceptor to `lib/api.ts`. On 401: clears `zenbots_token` from localStorage and redirects to `/login` via `window.location.href`. Skips redirect for auth routes (`/login`, `/cadastro`, `/esqueci-senha`, `/redefinir-senha`). 3 new tests added.

---

### [x] P1-4: No Auth Guard on Portal Routes *(Fixed 2026-02-27)*

**Impact:** All portal pages render their UI shell (sidebar, header, layout) even when no token exists. API calls fail with 401, but users see a broken, confusing interface instead of being redirected to login.

- **File:** `app/(portal)/layout.tsx` — no auth check.
- **No `middleware.ts` exists.**
- **Fix:** Create `middleware.ts` that checks for the auth token on all `/(portal)/` routes and redirects to `/login` if absent. Alternatively, add a client-side auth guard in the portal layout.

**Resolution:** Added client-side auth guard in `app/(portal)/layout.tsx`. On mount, checks `localStorage.getItem('zenbots_token')` — if absent, calls `router.replace('/login')` and renders `null`. Layout children only render when token is confirmed present. 2 new tests in `layout.test.tsx`.

---

### [x] P1-5: React Query Cache Not Cleared on Logout *(Fixed 2026-02-27)*

**Impact:** After logout, if another user logs in on the same browser tab, they may briefly see cached data (bots, orders, products) from the previous user's session.

- **File:** `components/ui/user-nav.tsx`, lines 61-65
- **Code:** Only calls `localStorage.removeItem` and `router.push`. No `queryClient.clear()`.
- **Fix:** Import `useQueryClient` and call `queryClient.clear()` before navigating to `/login`.

**Resolution:** Added `queryClient.clear()` call in `handleLogout` before `localStorage.removeItem` and `router.push`. Test updated to verify `clear()` is called.

---

### [x] P1-6: Missing Error Handlers on Mutations (produtos/page.tsx) *(Fixed 2026-02-27)*

**Impact:** When product operations (delete, bulk delete, create, toggle, inline update) fail, the user receives zero feedback. The UI appears to do nothing.

- **File:** `app/(portal)/produtos/page.tsx`
- **Mutations without `onError`:** `deleteMutation` (135), `bulkDeleteMutation` (144), `createMutation` (154), `toggleStatusMutation` (163), `inlineUpdateMutation` (168)
- **Fix:** Add `onError` handlers that show toast notifications with user-friendly error messages.

**Resolution:** Added `onError` with destructive toast to all 5 mutations: "Erro ao excluir", "Erro ao excluir itens", "Erro ao criar produto", "Erro ao alterar disponibilidade", "Erro ao atualizar". Test added to verify error toast on delete failure.

---

### [x] P1-7: Missing Query Error States in UI *(Fixed 2026-02-27)*

**Impact:** When data fetching fails, users see either an infinite loading skeleton or a misleading "empty" state instead of an error message with a retry option.

| File | Query | What user sees on failure |
|------|-------|--------------------------|
| `meus-bots/page.tsx` | Bots list | Empty loading skeleton forever |
| `produtos/page.tsx` | Products | Infinite loading spinner |
| `bot-selector.tsx` | Bots dropdown | "Nenhum bot encontrado" (misleading) |
| `analytics/best-sellers-card.tsx` | Best sellers | Silent failure |

**Fix:** Check `isError` from `useQuery` and render an error state with a retry button.

**Resolution:** Added `isError` destructuring and error state UI to all 4 files. `meus-bots` and `produtos` show "Erro ao carregar" + "Tentar novamente" retry button. `bot-selector` shows "Erro ao carregar bots" text (replacing misleading empty state). `best-sellers-card` shows error card. Tests added for all 4 error states.

---

### [ ] P1-8: No Error Monitoring / Observability *(NEW — 2026-02-28 scan)*

**Impact:** Production errors are completely invisible. Error boundaries catch exceptions but silently discard them. No alerting, no dashboards, no ability to correlate user-reported issues.

- **Files:** `app/global-error.tsx`, `app/(portal)/error.tsx`, `app/(auth)/error.tsx`
- **Problem:** All three error boundary files receive an `error` parameter but never log, report, or display its digest. The `global-error.tsx` reset button is the only recovery mechanism.
- **Consequence:** Without monitoring, the team cannot:
  - Know that errors are occurring in production
  - Measure error frequency or impact
  - Correlate frontend errors with backend issues
  - Provide users with actionable error IDs for support
- **Fix:** Integrate Sentry (or equivalent). Add `Sentry.captureException(error)` in all error boundaries. Display `error.digest` to users for support correlation. Configure alerting for error spike detection.

---

### [ ] P1-9: React Query Retries on Auth Errors (401/403) *(NEW — 2026-02-28 scan)*

**Impact:** `providers.tsx` configures `retry: 1` unconditionally. This means 401 (unauthorized) and 403 (forbidden) errors are retried once before failing, wasting network requests and confusing the session expiry flow.

- **File:** `app/providers.tsx`, line 13 — `retry: 1`
- **Problem:** When a token expires mid-session:
  1. Query fails with 401
  2. React Query retries the same request (still 401)
  3. Response interceptor fires twice, emitting two session-expired events
  4. User may see double redirect or double toast
- **Fix:** Use a conditional retry function:
  ```typescript
  retry: (failureCount, error) => {
    const status = (error as any)?.response?.status;
    if (status === 401 || status === 403) return false;
    return failureCount < 1;
  }
  ```

---

## P2 — Medium (Inconsistency / DX / Performance)

### [x] P2-1: Inconsistent Form Patterns — Some RHF+Zod, Some Raw `useState` *(Fixed 2026-02-27)*

The codebase had two incompatible form patterns:

| Pattern | Files |
|---------|-------|
| **React Hook Form + Zod** (correct) | `cadastro/page.tsx`, `bots/novo/bot-form.tsx`, `produtos/product-form.tsx` |
| **Raw `useState` + manual validation** | `login/page.tsx`, `esqueci-senha/page.tsx`, `redefinir-senha/page.tsx`, `settings/page.tsx` (password change), `produtos/page.tsx` (inline edit) |

**Fix:** Migrate all forms to React Hook Form + Zod. Extract shared schemas (e.g., password rules) into `lib/schemas.ts`.

**Resolution:** Migrated `login/page.tsx`, `esqueci-senha/page.tsx`, `redefinir-senha/page.tsx`, and `settings/page.tsx` (security tab) to React Hook Form + Zod with `<Form>`/`<FormField>` pattern. Login preserves `URLSearchParams` format. Reset password uses `.refine()` for password match. Settings uses `passwordForm.reset()` after success. **Exception:** `produtos/page.tsx` inline table editing intentionally remains as `useState` — RHF is designed for discrete form submissions, not inline row editing.

---

### [x] P2-2: Duplicated `PasswordReq` Component — Same Code in 3 Files *(Fixed 2026-02-27)*

The `PasswordReq` helper (renders password requirement checkmarks) is independently defined in:

1. `app/(auth)/cadastro/page.tsx`, line 94
2. `app/(auth)/redefinir-senha/page.tsx`, line 14
3. `app/(portal)/settings/page.tsx`, line 47

**Fix:** Extract to `components/ui/password-req.tsx` and import from all three locations.

**Resolution:** Extracted to `components/ui/password-req.tsx` with typed `PasswordReqProps` interface. All 3 files now import from shared location. Inline definitions removed.

---

### [x] P2-3: Pervasive `any` Typing — 25+ Instances *(Fixed 2026-02-27)*

TypeScript's type safety was severely undermined by widespread `any` usage:

| File | Notable instances |
|------|-------------------|
| `meus-bots/page.tsx` | `selectedBot: any`, `botToDelete: any`, `(bot: any)` |
| `pedidos/page.tsx` | `OrderColumn` and `OrderCard` props are entirely `any` |
| `edit-bot-sheet.tsx` | `bot: any | null`, `(values: any)` |
| `bots/novo/page.tsx` | `(values: any)` |
| `settings/page.tsx` | `catch (error: any)` |
| `analytics/page.tsx` | `catch (err: any)` |

**Fix:** Define TypeScript interfaces in `types/` for Bot, Order, Product, User, BillingInfo, etc. Type all `useQuery<T>` calls and component props.

**Resolution:** Created `lib/types.ts` with centralized `Bot`, `BotFormValues`, `OnboardingPayload` interfaces. Replaced `any` in `meus-bots/page.tsx` (Bot type for state, mutations, callbacks), `edit-bot-sheet.tsx` (Bot | null, BotFormValues, error: unknown), `bots/novo/page.tsx` (BotFormValues, error: unknown), `pedidos/page.tsx` (typed raw order in query map), `connect-whatsapp-button.tsx` (FB SDK types, FBLoginResponse, payload, error: unknown), `settings/page.tsx` (error: unknown). OrderColumn/OrderCard props were already typed during P1-1 extraction.

---

### [ ] P2-4: Portal Layout Forces Client Component Boundary on All Pages *(Intentionally Deferred)*

**Impact:** `app/(portal)/layout.tsx` has `"use client"` because it imports `Sidebar` (which uses `usePathname()`). This forces every portal page into a Client Component tree, preventing any Server Component rendering benefits.

- **Fix:** Restructure using composition — make the layout a Server Component and pass the sidebar as a client component island via `children` pattern, or use Next.js `template.tsx` for the client parts.

**Deferral Note:** HIGH risk, LOW reward. All portal pages already use client hooks (useQuery, useMutation, useState). Converting layout to Server Component requires middleware.ts for auth, which is a larger refactor. Current approach works and is tested.

---

### [x] P2-5: `window.location.reload()` Instead of Cache Invalidation *(Fixed 2026-02-27)*

**Impact:** After connecting WhatsApp, the entire page is hard-reloaded, destroying all client state (React Query cache, component state, scroll position).

- **File:** `components/ui/connect-whatsapp-button.tsx`, line 94
- **Code:** `setTimeout(() => window.location.reload(), 2000)`
- **Fix:** Call `queryClient.invalidateQueries({ queryKey: ['myBots'] })` instead.

**Resolution:** Imported `useQueryClient`, replaced `setTimeout(() => window.location.reload(), 2000)` with `queryClient.invalidateQueries({ queryKey: ['myBots'] })`.

---

### [x] P2-6: Conflicting Background Colors — Tailwind Class vs CSS Variable *(Fixed 2026-02-27)*

Multiple layers applied different backgrounds:

| Source | Value | Effective? |
|--------|-------|------------|
| `globals.css` (body rule) | `bg-background` → `hsl(0 0% 100%)` (white) | Overridden |
| `app/layout.tsx` (body class) | `bg-slate-50` → `#f8fafc` | Wins (more specific) |
| `app/(portal)/layout.tsx` | `bg-slate-50` | Redundant |

**Fix:** Remove `bg-slate-50` from `layout.tsx` body. Set `--background` CSS variable to the desired value. Use `bg-background` consistently.

**Resolution:** Changed `--background` CSS variable to `210 40% 98%` (HSL for slate-50). Replaced `bg-slate-50 text-slate-900` with `bg-background text-foreground` on body in `app/layout.tsx`. Replaced `bg-slate-50` with `bg-background` in portal layout.

---

### [x] P2-7: Hardcoded Colors Instead of Design Tokens *(Fixed 2026-02-27)*

Several components used hex values instead of Tailwind config or CSS variables:

| File | Color | Should be |
|------|-------|-----------|
| `sidebar.tsx`, line 32 | `bg-[#0f172a]` | `bg-brand-nav` |
| `top-header.tsx`, line 7 | `bg-[#0f172a]` | `bg-brand-nav` |
| `connect-whatsapp-button.tsx` | `bg-[#25D366]`, `bg-[#128C7E]` | `bg-brand-whatsapp`, `hover:bg-brand-whatsapp-hover` |
| `pagamentos/page.tsx` | `bg-[#009EE3]`, `bg-[#008CC9]` | `bg-brand-mercadopago`, `hover:bg-brand-mercadopago-hover` |

**Fix:** Add brand colors to `tailwind.config.ts` `extend.colors` and reference them by name.

**Resolution:** Added `brand.nav`, `brand.whatsapp`, `brand.whatsapp-hover`, `brand.mercadopago`, `brand.mercadopago-hover` to `tailwind.config.ts`. Replaced all hex values in sidebar, top-header, connect-whatsapp-button, and pagamentos page.

---

### [x] P2-8: Dead Dark Mode Configuration *(Fixed 2026-02-27)*

`tailwind.config.ts` had `darkMode: ["class"]` and `globals.css` defined `.dark` CSS variables, but no component or mechanism toggles the `.dark` class. This was dead configuration.

**Fix:** Either remove dark mode config (if not planned) or implement a theme toggle.

**Resolution:** Removed `darkMode: ["class"]` from `tailwind.config.ts`. Removed the entire `.dark { ... }` block (21 lines) from `globals.css`.

---

### [x] P2-9: Missing Memoization on SSE-Driven Re-renders *(Fixed 2026-02-27)*

**Impact:** The SSE connection in `pedidos/page.tsx` calls `queryClient.invalidateQueries` on every event, triggering full re-renders. `OrderCard` and `OrderColumn` were not wrapped in `React.memo` and received unstable callback props, so ALL cards re-rendered on every SSE event.

- **Fix:** Wrap `OrderColumn` and `OrderCard` in `React.memo`. Stabilize callback props with `useCallback`.

**Resolution:** Wrapped `OrderCard` and `OrderColumn` exports in `React.memo`. In `pedidos/page.tsx`, wrapped `handlePrint`, `toggleSound`, `getOrdersByStatus`, `handleCancel`, and `handleTakeover` in `useCallback`. Extracted inline arrow callbacks from JSX into stable references.

---

### [x] P2-10: No Cross-Tab Auth Synchronization *(Fixed 2026-02-27)*

**Impact:** If a user logged out in one tab, other open tabs continued functioning with the cached token/data until they made a new API call. Could lead to data leaks if another person used the browser.

- **Fix:** Add a `window.addEventListener('storage', ...)` listener that detects when `zenbots_token` is removed and redirects to `/login`.

**Resolution:** Added second `useEffect` in `app/(portal)/layout.tsx` that listens for `storage` events. When `event.key === 'zenbots_token'` and `!event.newValue`, redirects to `/login`. The `storage` event only fires in OTHER tabs (never the tab that made the change). 2 new tests added: token removal triggers redirect, different key does not.

---

### [x] P2-11: `bot-selector.tsx` — Potential Infinite Loop from Unstable `onBotChange` *(Fixed 2026-02-27)*

**Impact:** The `useEffect` in `bot-selector.tsx` included `onBotChange` in its dependency array. If the parent did not wrap `onBotChange` in `useCallback`, this triggered an infinite re-render loop.

- **File:** `components/ui/bot-selector.tsx`, line 42
- **Fix:** Either remove `onBotChange` from the dependency array (with an ESLint suppression comment) or ensure all consumers wrap `onBotChange` in `useCallback`.

**Resolution:** Used a `useRef` to store the `onBotChange` callback, removing it from the `useEffect` dependency array. Also wrapped `handleBotChange` in `useCallback` in `produtos/page.tsx`. 1 new test added verifying no re-fire when callback reference changes.

---

### [ ] P2-12: Toast Auto-Dismiss Effectively Disabled *(NEW — 2026-02-28 scan)*

**Impact:** `TOAST_REMOVE_DELAY` in `hooks/use-toast.ts` is set to `1000000` ms (~16 minutes). Toasts never auto-dismiss in practice, accumulating on screen and cluttering the UI.

- **File:** `hooks/use-toast.ts`
- **Fix:** Set `TOAST_REMOVE_DELAY` to a reasonable duration (5000-8000ms). For destructive/error toasts, use a longer delay or require manual dismiss.

---

### [ ] P2-13: No Pagination for Large Datasets *(NEW — 2026-02-28 scan)*

**Impact:** `produtos/page.tsx` and `meus-bots/page.tsx` fetch and render ALL items from the API without pagination, virtualization, or infinite scroll. Performance will degrade significantly for users with 100+ products or bots.

- **Files:** `app/(portal)/produtos/page.tsx` (line 310-407 iterates all products), `app/(portal)/meus-bots/page.tsx`
- **Consequence:** DOM size grows linearly. React re-renders become expensive. Network payload increases.
- **Fix:** Implement server-side pagination (`?page=1&limit=50`) or add client-side virtualization (e.g., `@tanstack/react-virtual`). This requires backend support for paginated endpoints.

---

### [ ] P2-14: Hardcoded Subscription Prices in Settings UI *(NEW — 2026-02-28 scan)*

**Impact:** `settings/page.tsx` displays "R$ 5,00" and "R$ 10,00" as static strings even though it queries the billing API. Price changes require a code deployment.

- **File:** `app/(portal)/settings/page.tsx`, lines 325, 340
- **Fix:** Use the pricing data from the billing API query response to populate price labels dynamically.

---

## P3 — Low (Cleanup / Polish / Minor Performance)

### [x] P3-1: Missing Accessibility Basics *(Fixed 2026-02-27)*

| Issue | Location |
|-------|----------|
| No `aria-label` on icon-only buttons (print, cancel, menu) | `pedidos/page.tsx` lines 648, 666, 674, 683 |
| No `aria-label` on bot card menu button | `bot-card.tsx` line 111 |
| Sidebar has no `<nav>` landmark or `role="navigation"` | `sidebar.tsx` |
| `Switch` components have no accessible labels | `pedidos/page.tsx` line 544, `bot-card.tsx` line 160 |
| No skip-to-content link | `app/(portal)/layout.tsx` |

**Resolution:** Added `aria-label` to all icon-only buttons in `order-card.tsx` (print, undo, cancel) and `bot-card.tsx` (menu). Added `aria-label` to all `Switch` components in `order-card.tsx` ("Atendimento humano") and `bot-card.tsx` ("Alterar status da loja"). Added `aria-label` to sound toggle in `pedidos/page.tsx`. Changed sidebar outer `<div>` to `<nav aria-label="Menu principal">`. Added skip-to-content link and `id="main-content"` to portal layout. Tests added for all changes.

---

### [x] P3-2: Stray `layout.tsx` at Project Root (Dead Code) *(Fixed 2026-02-27)*

A duplicate portal layout file exists at `C:\Users\joaoo\OneDrive\Desktop\Projetos\zenbots-frontend\layout.tsx` — outside the `app/` directory. Next.js ignores it, but it will confuse developers.

**Fix:** Delete it.

**Resolution:** Deleted `layout.tsx` from project root.

---

### [x] P3-3: Undefined Chart CSS Variables *(Fixed 2026-02-27)*

`tailwind.config.ts` (lines 84-90) defines `chart-1` through `chart-5` color tokens that reference `--chart-1` through `--chart-5`, but these CSS variables are never defined in `globals.css`. Any component using `text-chart-1` etc. would get `hsl(undefined)`.

**Fix:** Either add the CSS variables to `globals.css` or remove the chart tokens from `tailwind.config.ts`.

**Resolution:** Added `--chart-1` through `--chart-5` CSS variables to `:root` in `globals.css` using standard Shadcn defaults.

---

### [x] P3-4: Tailwind Content Path Includes Non-Existent `src/` Directory *(Fixed 2026-02-27)*

`tailwind.config.ts`, line 11: `'./src/**/*.{ts,tsx}'` — there is no `src/` directory. Harmless but misleading.

**Fix:** Remove the `src/` content path.

**Resolution:** Removed `'./pages/**/*.{ts,tsx}'` and `'./src/**/*.{ts,tsx}'` from `tailwind.config.ts` content paths. Only `./components/**` and `./app/**` remain.

---

### [ ] P3-5: No Code Splitting for Heavy Components *(Intentionally Deferred)*

The 859-line `pedidos/page.tsx` and the SVG-heavy `top-header.tsx` are eagerly loaded. For pages with heavy UI (Kanban board, analytics charts), `next/dynamic` with `ssr: false` could improve initial load time.

**Deferral Note:** After P1-1 extraction, `pedidos/page.tsx` is ~310 lines and sub-components are already in separate files. Next.js App Router already lazy-loads pages. The only candidate (`TicketImpressao` with `ssr: false`) is 63 lines and risks breaking the `window.print()` timing flow. HIGH risk, LOW reward.

---

### [x] P3-6: `window.location.href` Instead of `router.push` in WhatsApp Callback *(Fixed 2026-02-27)*

**File:** `app/(portal)/whatsapp-callback/page.tsx`, line 27
**Code:** `window.location.href = "/meus-bots"` — causes a full page reload instead of client-side navigation.
**Fix:** Import and use `useRouter` with `router.push('/meus-bots')`.

**Resolution:** Added `useRouter` import, replaced `window.location.href = "/meus-bots"` with `router.push("/meus-bots")`, added `router` to `useEffect` dependency array. Test rewritten to mock `router.push`.

---

### [x] P3-7: Empty `src` on `AvatarImage` *(Fixed 2026-02-27)*

**File:** `components/ui/user-nav.tsx`, line 73
**Code:** `<AvatarImage src="" alt={userData.name} />`
The `src` is always empty, which may trigger a broken image request.
**Fix:** Either pass the user's actual avatar URL or remove `AvatarImage` and rely solely on `AvatarFallback`.

**Resolution:** Removed `<AvatarImage src="" />` and its import. Avatar now relies solely on `AvatarFallback`. Test added to verify no `<img>` element inside avatar.

---

### [x] P3-8: Hardcoded Placeholder WhatsApp Number *(Fixed 2026-02-27)*

**File:** `app/(portal)/suporte/page.tsx`, line 194
**Code:** `href="https://wa.me/5500000000000"` — placeholder number.
**Fix:** Replace with real support number via env var (`NEXT_PUBLIC_SUPPORT_WHATSAPP`).

**Resolution:** Reads `NEXT_PUBLIC_SUPPORT_WHATSAPP` env var. When set, renders link with `href={https://wa.me/${supportWhatsApp}}`. When unset, renders disabled button with "Indisponível". Tests added for both states.

---

### [x] P3-9: Large Inline SVG in TopHeader (160 Lines) *(Fixed 2026-02-27)*

**File:** `components/layout/top-header.tsx`, lines 35-195
The entire circuit-board decorative SVG is inline in the component, making it hard to maintain. It re-renders on every navigation because the portal layout is a client component.

**Fix:** Extract to a separate file (e.g., `components/ui/circuit-bg.tsx`) and wrap in `React.memo`.

**Resolution:** Extracted to `components/ui/circuit-bg.tsx` wrapped in `React.memo`. `top-header.tsx` reduced from 282 to ~110 lines.

---

### [x] P3-10: `pedidos/page.tsx` — Kanban Board Forces Horizontal Scroll *(Fixed 2026-02-27)*

**File:** `app/(portal)/pedidos/page.tsx`, line 299
**Code:** `min-w-[1000px]` on the Kanban container.
On screens under 1000px wide, the board requires horizontal scrolling with no visual affordance.

**Fix:** Consider a stacked/card view for mobile breakpoints.

**Resolution:** Changed `min-w-[1000px]` to `md:min-w-[1000px]` so the min-width only applies at md+ breakpoints. Mobile uses the existing `grid-cols-1` layout naturally without forced horizontal scroll.

---

### [x] P3-11: Unused `next.config.ts` Rewrite — Dead Proxy *(Fixed 2026-02-27)*

**File:** `next.config.ts`, lines 18-23
The `/api/v1/*` rewrite to `http://127.0.0.1:8000/api/v1/:path*` is never used because all API calls go directly to the backend URL via the Axios instance.
**Fix:** Either use the proxy (switch `api.ts` baseURL to `/api/v1`) or remove the rewrite.

**Resolution:** Removed the entire `rewrites()` function from `next.config.ts`.

---

### [ ] P3-12: No Custom `loading.tsx` or `not-found.tsx` Pages *(NEW — 2026-02-28 scan)*

**Impact:** Users see default Next.js loading spinners and 404 pages instead of branded experiences. Breaks visual consistency.

- **Files:** Missing in `app/(portal)/` and `app/(auth)/` route groups
- **Fix:** Add `loading.tsx` with skeleton UI matching each route group's design language. Add `not-found.tsx` with branded 404 page and navigation back to home.

---

### [ ] P3-13: No `prefers-reduced-motion` Support *(NEW — 2026-02-28 scan)*

**Impact:** Animations in auth pages (`animate-in fade-in zoom-in` on success views), toasts, and accordion transitions play regardless of user motion preferences. Can cause discomfort for users with vestibular disorders.

- **Files:** `app/(auth)/esqueci-senha/page.tsx`, `app/(auth)/redefinir-senha/page.tsx`, `tailwind.config.ts`
- **Fix:** Use Tailwind's `motion-safe:` and `motion-reduce:` modifiers: `motion-safe:animate-in motion-reduce:animate-none`.

---

### [ ] P3-14: Auth Layout Uses `h-screen` Instead of `min-h-screen` *(NEW — 2026-02-28 scan)*

**Impact:** On very small screens or when content overflows (e.g., password requirements list on mobile), the auth page content gets clipped instead of scrolling.

- **File:** `app/(auth)/layout.tsx`, line 8 — `h-screen`
- **Fix:** Change to `min-h-screen` to allow vertical scrolling when content exceeds viewport height.

---

## Summary

> **Updated:** 2026-02-28 (deep codebase scan — 8 new issues added)

| Priority | Open | Fixed | Theme |
|----------|------|-------|-------|
| **P0** | 0 | 5 | ~~Broken env vars, missing mobile nav, Suspense, dead route, fake save~~ — **All resolved 2026-02-27** |
| **P1** | 2 | 7 | ~~God components, bypassed React Query, no 401 handler, no auth guard, no logout cleanup, missing error UX~~ — **7 resolved 2026-02-27**. **2 open:** no error monitoring (P1-8), retry on auth errors (P1-9) |
| **P2** | 4 | 10 | ~~Form inconsistency, duplicate components, `any` types, stale renders, dead dark mode, hardcoded colors, cache invalidation, background colors, infinite loop, cross-tab auth~~ — **10 resolved 2026-02-27**. **4 open:** client boundary (P2-4, deferred), toast dismiss (P2-12), no pagination (P2-13), hardcoded prices (P2-14) |
| **P3** | 4 | 10 | ~~Accessibility, dead code, chart vars, stale config, empty avatar, placeholder number, dead proxy, responsive gaps, inline SVGs~~ — **10 resolved 2026-02-27**. **4 open:** code splitting (P3-5, deferred), loading/404 pages (P3-12), reduced-motion (P3-13), h-screen clip (P3-14) |
| **Total** | **10** | **32** | **42 total** (8 new items from 2026-02-28 scan) |

---

> **Cross-reference:** 44 security-specific issues are tracked in `tech_debt/backlog_vulnerabilities.md`. Some items overlap (e.g., error monitoring is both an architecture and security concern) — listed in both backlogs from their respective perspectives.

> **Recommended approach:** P1-8 (error monitoring) is the highest-impact open item — production without observability is flying blind. P1-9 (retry on auth) is a quick 5-line fix. P2 items should be addressed in the next sprint. P3 items are polish for post-launch.
