# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## IMPORTANT: Consult /docs Before Writing Any Code

**Before generating any code, always read the relevant documentation file in the `/docs` directory first.**

The `/docs` directory contains authoritative standards for this project. Code that violates these standards must not be written. Currently documented standards:

| File | Covers |
|------|--------|
| `docs/ui.md` | UI component standards — Shadcn UI only, no custom components |
| `docs/restart_spec.md` | Dev server restart — always run `npm run dev` after any change |

If a task touches UI, read `docs/ui.md` before writing a single line. If a new standards doc is added to `/docs`, it carries the same mandatory precedence.

## Commands

```bash
npm run dev      # Start development server (Next.js on port 3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

No test runner is configured.

## Architecture Overview

This is a **Next.js 16 App Router** frontend for ZenBots AI — a WhatsApp bot platform for delivery/restaurant automation.

### Route Groups

```
app/
  (auth)/      # Public routes: login, cadastro, esqueci-senha, redefinir-senha
  (portal)/    # Authenticated routes: meus-bots, produtos, pedidos, pagamentos, analytics, settings
```

Route groups have their own `layout.tsx`. The portal layout includes the sidebar. There is no middleware-based route protection — auth relies entirely on the presence of `zenbots_token` in localStorage.

### API Layer (`lib/api.ts`)

A single Axios instance is used throughout the app:
- Base URL: `NEXT_PUBLIC_API_BASE_URL` (defaults to `http://localhost:8000`)
- A request interceptor auto-attaches `Authorization: Bearer <token>` from `localStorage.getItem('zenbots_token')`
- `next.config.ts` rewrites `/api/v1/*` to the FastAPI backend

All API calls go through this instance using React Query:

```typescript
// Query pattern
useQuery({ queryKey: ['key'], queryFn: () => api.get('/endpoint').then(r => r.data) })

// Mutation pattern
useMutation({ mutationFn: (data) => api.post('/endpoint', data), onSuccess: () => queryClient.invalidateQueries(...) })
```

### State Management

**React Query** (TanStack v5) handles all server state. The `QueryClient` is configured in `app/providers.tsx` with `retry: 1` and `refetchOnWindowFocus: false`. No global client-side state library is used.

### UI Stack

- **Shadcn UI** ("new-york" style) — base components live in `components/ui/`
- **Radix UI** primitives underlie Shadcn components
- **Tailwind CSS** with custom HSL color variables and fonts: `Inter` (sans) and `Outfit` (heading)
- **Lucide React** for icons
- Custom business components (e.g., `bot-card.tsx`, `bot-selector.tsx`) also live in `components/ui/`

### Forms

React Hook Form + Zod for all forms. Use the `Form` wrapper from `components/ui/form.tsx` and `@hookform/resolvers/zod` for schema validation.

### Notifications

Custom toast system via `hooks/use-toast.ts` + `components/ui/toaster.tsx`. Use the `useToast` hook.

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
```
