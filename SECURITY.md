# Security

Thanks for taking the time to look at this. Security reports help keep
the project useful for everyone who learns from it.

## Reporting a vulnerability

If you find a security issue — credential leak in git history, missing
authentication on an endpoint, injection vector, broken authorization,
XSS, CSRF gap, anything that could be abused — please **don't** open a
public issue.

Instead, email **`joaoottavioc@gmail.com`** with:

- A brief description of the issue
- A reproduction (curl/code/screenshots) if you have one
- The branch/commit you observed it on (if applicable)

You'll get an acknowledgement within 72 hours. Honest reports get an
honest response — including credit in the fix commit if you'd like one.

## Scope

This frontend is the user-facing layer of the
[ZenBotZ AI ordering platform](https://github.com/joaoottavioc/zenbots-whatsapp-platform).
The same codebase serves:

- `zenbotz.com.br` — public marketing site + `/eval` portfolio page
- `app.zenbotz.com.br` — authenticated restaurant-owner dashboard
- `zenbotz.com.br/widget` — embeddable chat widget for third-party sites

All three are in scope.

**Out of scope:**

- Findings against third-party services we depend on (Next.js itself,
  Sentry, AWS CloudFront, Tailwind) — report those upstream.
- Denial of service via rate limits — the existing rate-limit middleware
  is intentional; if you can defeat it that *is* a finding.
- Social engineering, physical security, phishing.

## What I'll do

For confirmed issues:

1. Acknowledge within 72 hours.
2. Triage severity (blocker / high / medium / low).
3. Fix on a private branch, then push.
4. Credit you (if desired) in the fix commit.

For the most common class — credentials accidentally committed —
the response is:
- Rotate the credential at the source.
- Scrub history with `git filter-repo` and force-push.
- Update `.gitignore` to prevent the same surface from regressing.

## What's already public

This repo is a portfolio piece. The following are *intentionally* public:

- AWS account ID `578761488332` (account IDs are not secrets by AWS's
  own design; they appear in any ARN).
- Route 53 zone ID, ACM cert ARN, CloudFront distribution patterns.
- Architecture, tech stack, deployment plans.
- Contact email + LinkedIn URL.
- Facebook App ID (App IDs are public by Facebook's design — they're in
  every Embedded Signup button on the public web).

The following are *not* and never were public:

- Any `.env*` file other than `.env.example`.
- Facebook App Secret, Sentry DSN, AWS keys, JWT signing keys.
- Customer data — the dashboard requires owner authentication, and the
  public demo at `pizzaria-do-ze` (renamed in production) is a seeded
  bot with fictional products.
- Session cookies, CSRF tokens.

## Hardening posture

For reviewers curious about how this codebase handles security:

- **Auth:** JWT in httpOnly cookies (migrated from localStorage to
  resist XSS), CSRF double-submit token pattern on every state-changing
  request, rate-limited login (5 req / 5min on backend).
- **CSP:** Next.js default + custom headers via `next.config.ts`.
- **CORS:** Backend enforces per-bot allowed-origins for the widget;
  empty allowlist + production env = block all browser embeds.
- **XSS:** No `dangerouslySetInnerHTML` in user-facing code paths. The
  widget's WhatsApp-markup renderer in `components/widget/formatText.tsx`
  builds React nodes, not HTML strings.
- **Input sanitization:** All bot replies pass through the backend's
  `sanitize.py` (strips URLs / emails / phone numbers / length cap)
  before reaching the widget.
- **Embedded widget sandboxing:** The `widget-loader.js` iframe declares
  `sandbox="allow-scripts allow-same-origin allow-forms allow-popups"`
  and `allow="microphone"` — only the capabilities the widget actually
  needs.
- **Static export:** No Next.js SSR / server-side runtime — entire surface
  is a static bundle on S3 + CloudFront. Reduces the dynamic-attack
  surface significantly.
- **Error reporting:** Errors flow to Sentry when `NEXT_PUBLIC_SENTRY_DSN`
  is set; locally and in dev they log to console. No sensitive context
  is attached to error reports.

## Reach me

João Ribeiro · `joaoottavioc@gmail.com` · [LinkedIn](https://www.linkedin.com/in/joaoribeiroc/)
