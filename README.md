# ZenBotZ Frontend

Next.js 16 dashboard and embeddable chat widget for the **ZenBotZ AI ordering
platform** — the production multi-tenant LLM system that powers restaurant
ordering on WhatsApp and the web.

The deep technical story (semantic intent routing, 4-layer RAG, per-call
cost tracking, eval corpus) lives in the backend repo:
**[zenbots-whatsapp-platform](https://github.com/joaoottavioc/zenbots-whatsapp-platform)**.
This repo is the user-facing layer.

> **Live demo + telemetry:** [zenbotz.com.br/eval](https://zenbotz.com.br/eval)

---

## What's in this repo

```
app/
├── (landing)/          Public marketing site + /eval portfolio page
│   └── eval/           AI-engineering case study with conversation gallery
├── (portal)/           Authenticated restaurant-owner dashboard
│   ├── meus-bots/      Bot management + web widget config
│   ├── pedidos/        Kitchen-display system (real-time orders via SSE)
│   ├── produtos/       Menu management + PDF/image upload (extracted by gpt-4o)
│   ├── analytics/      Per-bot cost tracking + best-sellers
│   ├── billing/        Subscription / plan management
│   └── settings/       Restaurant config (hours, delivery, address)
├── (auth)/             Login, signup, password reset, email verification
└── (widget)/           Standalone embeddable chat widget page

components/
├── widget/             ~1700 LoC — the embeddable chat (used both by /widget
│   │                   and by data-slug script tags on third-party sites)
│   ├── ZenBotsWidget.tsx     UI: header, bubble list, composer, recorder
│   ├── useChat.ts            SSE lifecycle, message dispatch, receipts
│   ├── useRecorder.ts        MediaRecorder wrapper for voice input
│   ├── formatText.tsx        WhatsApp markup → React nodes (*bold*, _italic_)
│   └── api.ts                Backend HTTP client
├── landing/            Marketing pages (hero, features, pricing, footer)
└── ui/                 Shared shadcn-ui-style primitives + bot card

public/
└── widget-loader.js    Drop-in <script> tag for third-party embedding
```

---

## Highlights

The frontend is a companion to the backend, but a few pieces stand on
their own:

- **Embeddable chat widget** with SSE-driven bot replies, voice input
  (MediaRecorder), WhatsApp-style read receipts, markup rendering, and
  ✓/✓✓ delivery indicators — all in ~1700 LoC of TypeScript.
- **Public `/eval` page** that fetches live data from the backend's
  `/public/eval/*` endpoints and renders the AI-engineering story:
  headline metrics, methodology, a gallery of real demo conversations,
  and per-message AI telemetry (intent classification, tools called,
  tokens, USD cost, latency).
- **Real-time kitchen-display dashboard** via Server-Sent Events. Falls
  back to 5s polling when SSE drops.
- **Channel-aware UI** — the dashboard reflects which channels each bot
  has enabled (web widget today, WhatsApp coming once Meta App Review
  approves), with `Em breve` chips on deferred features.

## Tech stack

- **Framework:** Next.js 16 (App Router, `output: 'export'` static export)
- **Language:** TypeScript
- **UI:** React 19, Tailwind CSS, shadcn-ui primitives
- **Data:** TanStack Query (server state), native EventSource (SSE)
- **Auth:** httpOnly cookies + CSRF double-submit token
- **Forms:** react-hook-form + Zod
- **Tests:** Vitest + Testing Library + jsdom (~300 tests passing)
- **Hosting:** Static export to AWS S3 + CloudFront

## Quickstart

```bash
git clone <repo>
cd zenbots-frontend
npm install
cp .env.example .env.local   # fill in NEXT_PUBLIC_API_BASE_URL
npm run dev                  # http://localhost:3000
```

Required env vars (see `.env.example`):

| Var | Purpose |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Backend HTTP base. Default `http://localhost:8000`. |
| `NEXT_PUBLIC_FB_APP_ID` | Facebook App ID for the WhatsApp Embedded Signup flow. Optional — set `NEXT_PUBLIC_WHATSAPP_SIGNUP_ENABLED=false` to skip. |
| `NEXT_PUBLIC_FB_LOGIN_CONFIG_ID` | Same Embedded Signup config. |
| `NEXT_PUBLIC_WHATSAPP_DEV_MODE` | `true` while Meta App Review pending. |
| `NEXT_PUBLIC_SENTRY_DSN` | Optional — when set, errors report to Sentry. Logs to console otherwise. |

## Tests

```bash
npm run test          # vitest run
npm run test:watch    # watch mode
```

Coverage focuses on the widget pipeline (markup rendering, SSE event
dispatch, receipt state machine), the dashboard's order-transition logic,
and the auth flow. ~300 tests pass against `develop`.

## Deployment

CI/CD via GitHub Actions on push to `develop` → S3 sync + CloudFront
invalidation. Production deploys gate behind manual approval. Static
export means no Next.js server-side runtime — pages are pre-rendered at
build time and hydrated client-side.

## Related repos

- **[zenbots-whatsapp-platform](https://github.com/joaoottavioc/zenbots-whatsapp-platform)** — backend: FastAPI, async SQLAlchemy, ARQ workers, Postgres + pgvector, the AI pipeline (semantic router, tool calling, RAG, cost tracking). This is where the AI-engineering story lives.

## License

MIT.

## Contact

João Ribeiro — `joaoottavioc@gmail.com` · [LinkedIn](https://www.linkedin.com/in/joaoribeiroc/)

Open to AI engineer / LLM platform roles. See the backend repo's
[PORTFOLIO.md](https://github.com/joaoottavioc/zenbots-whatsapp-platform/blob/main/PORTFOLIO.md)
for the engineering case study.
