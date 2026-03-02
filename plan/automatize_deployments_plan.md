# CI/CD & AWS Deployment Automation Plan — ZenBots Frontend

Comprehensive plan for automating ZenBots **frontend** deployments with **dev** and **production** environments, cost-optimized AWS infrastructure (S3 + CloudFront), and a robust GitHub Actions CI/CD pipeline.

**Created:** 2026-03-02
**Last updated:** 2026-03-02 (v1)
**Source backlogs:** `tech_debt/backlog_production.md`, `tech_debt/backlog_vulnerabilities.md`
**Companion plan:** Backend deployment plan (separate repo — ECS Fargate + RDS + ElastiCache)

---

## Table of Contents

1. [Current State](#1-current-state)
2. [Target Architecture — Why S3 + CloudFront, Not ECS](#2-target-architecture--why-s3--cloudfront-not-ecs)
3. [Availability & Performance Architecture](#3-availability--performance-architecture)
4. [Layer 1 — AWS Account Bootstrap (Manual, One-Time)](#4-layer-1--aws-account-bootstrap)
5. [Layer 2 — Code Changes (Pre-requisites)](#5-layer-2--code-changes)
6. [Layer 3 — Terraform Infrastructure](#6-layer-3--terraform-infrastructure)
7. [Layer 4 — GitHub Actions Workflows](#7-layer-4--github-actions-workflows)
8. [Layer 5 — Environment Management](#8-layer-5--environment-management)
9. [Implementation Order](#10-implementation-order)
10. [Cost Summary](#11-cost-summary)
11. [Pre-Flight Checklist](#12-pre-flight-checklist)

---

## 1. Current State

Zero deployment infrastructure. Everything is manual.

| Component | Status |
|-----------|--------|
| GitHub Actions | None |
| Terraform | None |
| Dockerfile | Missing |
| `.dockerignore` | Missing |
| `.env.local` in git | Dev credentials exposed (BLK-1) |
| Env var validation | None (BLK-5) |
| CSP | Report-only, not enforcing (CRT-1) |
| Error monitoring | None (CRT-4) |
| Auth cookie `Secure` flag | Missing (BLK-6) |
| `next/image` optimization | Server-side (requires Node.js runtime) |
| Dynamic routes (`[id]`) | None — all 13 pages are static paths |
| Server Actions | Configured but unused |
| API routes (`app/api/`) | None — all API calls go directly to backend via Axios |
| SSR data fetching | None — all data fetched client-side via React Query |
| Middleware | Cookie presence check + redirect (simple, replicable at edge) |

### Key Architectural Insight

This Next.js app is **architecturally a Single-Page Application** deployed via App Router. Every page renders a client-side shell, then fetches data from the backend API via React Query. There are:
- No server-side data fetching (no `fetch()` in server components)
- No API routes
- No Server Actions in use
- No dynamic route segments (`[id]`)
- Simple middleware (cookie check → redirect)

This means we can use **static export** (`output: 'export'`) and serve the app from S3 + CloudFront — eliminating the need for a Node.js server entirely.

---

## 2. Target Architecture — Why S3 + CloudFront, Not ECS

### Decision Matrix

| Criteria | S3 + CloudFront | ECS Fargate | AWS Amplify |
|----------|----------------|-------------|-------------|
| **Monthly cost** | **$3–12** | $45–75 | $10–25 |
| **Global latency** | **< 50ms** (400+ edge locations) | 100–200ms (single region) | < 50ms (edge) |
| **Availability** | **99.99%** (built-in) | 99.95% (needs multi-AZ config) | 99.95% |
| **Scaling** | **Infinite** (S3 + CDN) | Manual/auto-scaling config | Auto |
| **Zero-downtime deploy** | **Atomic** (S3 upload + invalidation) | Rolling update needed | Atomic |
| **DDoS protection** | **Shield Standard** (free, included) | Needs WAF on ALB | Shield Standard |
| **Operational complexity** | **Low** (no servers) | High (containers, health checks) | Low |
| **Next.js middleware** | CloudFront Function (5ms, free tier) | Native | Native |
| **`next/image` optimization** | Client-side (unoptimized) or CloudFront image resize | Native | Native |
| **SSR support** | No (static only) | Full | Full |

**Verdict: S3 + CloudFront.** The app doesn't use SSR. Paying $45–75/month for a Node.js container to serve static files makes no sense. CloudFront provides better performance (edge-cached globally), higher availability (99.99% SLA), and costs 85–95% less.

If SSR is needed in the future, migration to ECS or Amplify is straightforward — change `output` mode and add a container/Amplify config.

### Branching Model (Matches Backend)

```
feature/* ──→ PR to develop ──→ dev auto-deploy (S3 + CloudFront)
                                    │
                               PR to main ──→ build ──→ manual approval ──→ prod deploy
```

### Environment Comparison

| Aspect | Local | Dev (AWS) | Production (AWS) |
|--------|-------|-----------|------------------|
| **Purpose** | Active development | Integration testing, QA | Live customers |
| **Trigger** | `npm run dev` | Push to `develop` | Merge to `main` + approval |
| **Hosting** | Next.js dev server | S3 + CloudFront | S3 + CloudFront |
| **CDN** | None | CloudFront (single behavior) | CloudFront (optimized caching) |
| **Auth redirect** | Next.js middleware | CloudFront Function | CloudFront Function |
| **Security headers** | `next.config.ts` headers() | CloudFront response headers policy | CloudFront response headers policy |
| **Image optimization** | Next.js built-in | `unoptimized: true` (CSS/lazy load) | `unoptimized: true` (CSS/lazy load) |
| **Domain** | `localhost:3000` | `dev.zenbots.com.br` | `app.zenbots.com.br` |
| **SSL** | None | ACM certificate (free) | ACM certificate (free) |
| **WAF** | None | None | AWS WAF (rate limiting) |
| **Error monitoring** | Console | Sentry (free tier) | Sentry |
| **Cache TTL (static)** | None | 1 year (hashed filenames) | 1 year (hashed filenames) |
| **Cache TTL (HTML)** | None | 5 min | 5 min |
| **Backend API** | `http://localhost:8000` | `https://dev-api.zenbots.com.br` | `https://api.zenbots.com.br` |

### High-Level AWS Diagram

```
                    ┌──────────────────────────────────────────┐
                    │              Route 53 (DNS)                │
                    │  app.zenbots.com.br                        │
                    │  + health check → failover to maintenance  │
                    └────────────────┬─────────────────────────┘
                                     │
                    ┌────────────────▼─────────────────────────┐
                    │         CloudFront Distribution            │
                    │  + ACM TLS Certificate (*.zenbots.com.br)  │
                    │  + WAF (prod only — rate limiting)         │
                    │  + Shield Standard (free DDoS protection)  │
                    │  + Response Headers Policy (CSP, HSTS...)  │
                    │  + 400+ global edge locations              │
                    └──────┬─────────────────┬─────────────────┘
                           │                 │
              ┌────────────▼──┐    ┌─────────▼────────────────┐
              │ CloudFront     │    │  Origin: S3 Bucket        │
              │ Function       │    │  (private, OAC-only)      │
              │ (viewer-request)│    │                           │
              │                │    │  /login/index.html         │
              │ • Auth cookie  │    │  /meus-bots/index.html     │
              │   check        │    │  /pedidos/index.html       │
              │ • Redirect to  │    │  /_next/static/chunks/*.js │
              │   /login if    │    │  /_next/static/css/*.css   │
              │   missing      │    │  /logo-zenbotz.png         │
              │ • Clean URL    │    │  ...                       │
              │   rewriting    │    │                            │
              └────────────────┘    └────────────────────────────┘

              All API calls go directly from browser → Backend ALB
              (no proxy, no rewrite — pure client-side Axios)
```

### How Static Export + CloudFront Replaces the Node.js Server

| Next.js Feature | Node.js Server | S3 + CloudFront Equivalent |
|----------------|----------------|---------------------------|
| Middleware (auth redirect) | `middleware.ts` runs on Node.js | CloudFront Function (viewer-request) |
| Security headers | `next.config.ts` `headers()` | CloudFront Response Headers Policy |
| `next/image` optimization | Sharp library on server | `images: { unoptimized: true }` — images served as-is |
| `next/font/google` | Downloaded + self-hosted at build | Same — build-time optimization, fonts in `_next/static` |
| Route handling | Node.js serves HTML per route | S3 stores `/route/index.html`, CloudFront Function rewrites URIs |
| 404 page | Next.js renders `not-found.tsx` | CloudFront custom error response → `/404.html` |

---

## 3. Availability & Performance Architecture

### CloudFront — Built-In High Availability

CloudFront provides availability guarantees that would require significant engineering to replicate with ECS:

| Mechanism | How It Works | Equivalent in ECS |
|-----------|-------------|-------------------|
| **400+ edge locations** | Content served from nearest edge to user | Single-region ALB (~100-200ms for distant users) |
| **99.99% SLA** | AWS contractual guarantee | Requires multi-AZ + auto-scaling (~99.95%) |
| **Automatic failover** | If one edge fails, traffic routes to next nearest | Need ALB health checks + circuit breakers |
| **Shield Standard** | Free DDoS protection on all CloudFront distributions | Need WAF on ALB ($10+/month) |
| **Origin failover** | Can configure backup S3 bucket in another region | Need multi-region ECS (very expensive) |

### Zero-Downtime Deployments

Static hosting makes zero-downtime deployments trivial:

```
1. CI builds new static files → outputs to out/
2. CI syncs new files to S3 (aws s3 sync)
   → New files uploaded BEFORE old files deleted
   → S3 sync is atomic per-file (no half-uploaded state)
3. CI creates CloudFront invalidation (/*)
   → Edge caches refresh within 1-2 minutes
   → Users on cached version continue working (SPA with client-side routing)
   → Next page navigation gets new version
4. Done. No containers to drain, no health checks to pass, no rolling updates.
```

**Why this is inherently zero-downtime:**
- S3 `sync` uploads new files first, then deletes removed files
- Hashed filenames (`_next/static/chunks/abc123.js`) mean old and new versions coexist in S3
- Only HTML files change paths (same URL, new content) — and these have short cache TTL (5 min)
- Users mid-session keep working with cached JS/CSS bundles
- CloudFront serves stale content during invalidation propagation (1-2 min), then serves fresh

### Caching Strategy

| File Pattern | Cache-Control Header | CloudFront TTL | Rationale |
|-------------|---------------------|----------------|-----------|
| `_next/static/**` | `public, max-age=31536000, immutable` | 1 year | Hashed filenames — content-addressed, safe to cache forever |
| `*.html` | `public, max-age=0, must-revalidate` | 5 min (CloudFront min TTL) | HTML changes on every deploy. Short cache, quick updates. |
| `public/**` (images, fonts) | `public, max-age=86400` | 24 hours | Static assets change rarely. 24h is a good balance. |
| `favicon.ico`, `robots.txt` | `public, max-age=86400` | 24 hours | Changes very rarely. |

This caching strategy means:
- **First visit:** ~200ms (CloudFront edge cache miss → S3 fetch → cache)
- **Subsequent visits:** ~10-30ms (served from CloudFront edge cache)
- **After deploy:** HTML refreshes within 5 min; JS/CSS chunks are new hashed files (cache miss → fetch)

### CloudFront Function — Auth Redirect

Replaces `middleware.ts`. Runs at viewer-request stage on every CloudFront edge location.

```javascript
function handler(event) {
    var request = event.request;
    var uri = request.uri;
    var cookies = request.cookies;

    // Protected route prefixes (mirrors middleware.ts PROTECTED_PREFIXES)
    var protectedPrefixes = [
        '/meus-bots', '/pedidos', '/produtos', '/settings',
        '/pagamentos', '/analytics', '/suporte', '/bots',
        '/whatsapp-callback'
    ];

    // Check if route is protected
    var isProtected = false;
    for (var i = 0; i < protectedPrefixes.length; i++) {
        var prefix = protectedPrefixes[i];
        if (uri === prefix || uri.indexOf(prefix + '/') === 0) {
            isProtected = true;
            break;
        }
    }

    // Redirect to login if protected and no auth cookie
    if (isProtected && (!cookies['zenbots_auth'] || !cookies['zenbots_auth'].value)) {
        return {
            statusCode: 302,
            statusDescription: 'Found',
            headers: {
                'location': { value: '/login?redirect=' + encodeURIComponent(uri) }
            }
        };
    }

    // Clean URL rewriting for S3 static export
    // /login → /login/index.html (Next.js static export structure)
    if (uri === '/' || uri === '') {
        request.uri = '/index.html';
    } else if (!uri.includes('.')) {
        // No file extension — it's a page route
        if (uri.endsWith('/')) {
            request.uri = uri + 'index.html';
        } else {
            request.uri = uri + '/index.html';
        }
    }

    return request;
}
```

**Constraints & limits of CloudFront Functions:**
- Max 10 KB code size (our function is ~1.2 KB — well within limit)
- Max 2 ms execution time (our function runs in < 0.5 ms)
- No network calls (no external API validation — matches current middleware behavior)
- 2 million free invocations/month (then $0.10/million)
- Runs on **every edge location** — zero cold starts, sub-millisecond latency

### Response Headers Policy (Replaces `next.config.ts` `headers()`)

Since static export doesn't run `next.config.ts` headers at runtime, we move security headers to a CloudFront Response Headers Policy:

| Header | Value | Notes |
|--------|-------|-------|
| `X-Frame-Options` | `DENY` | Prevents clickjacking |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Controls referrer leakage |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Blocks unused APIs |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Forces HTTPS |
| `Content-Security-Policy` | See CSP section below | **Enforcing** (not report-only) — fixes CRT-1 |

**CSP for Production (enforcing):**

```
default-src 'self';
script-src 'self' 'unsafe-inline' https://connect.facebook.net;
style-src 'self' 'unsafe-inline';
connect-src 'self' https://api.zenbots.com.br https://*.facebook.com https://*.sentry.io;
font-src 'self';
img-src 'self' data: blob: https://*.facebook.com https://*.fbcdn.net;
frame-src https://www.facebook.com;
base-uri 'self';
object-src 'none';
form-action 'self';
frame-ancestors 'none';
```

Changes from current config:
- **Removed `'unsafe-eval'`** from `script-src` — only needed by dev tools, not Facebook SDK
- **Removed `https://fonts.gstatic.com`** from `font-src` — Next.js `next/font/google` self-hosts fonts at build time
- **Added `https://*.sentry.io`** to `connect-src` — for error monitoring (CRT-4)
- **Added** `base-uri`, `object-src`, `form-action`, `frame-ancestors` — hardening directives
- **Backend URL** is environment-specific (injected at build time via `NEXT_PUBLIC_API_BASE_URL`)
- **Switched to enforcing** `Content-Security-Policy` (not `Content-Security-Policy-Report-Only`)

### WAF (Production Only)

Attach AWS WAF v2 to the production CloudFront distribution:

| Rule | Action | Rationale |
|------|--------|-----------|
| Rate limiting (100 req/5 min per IP) | Block | Prevent brute-force on login |
| AWS Managed — Common Rule Set | Count → Block | OWASP core rules |
| AWS Managed — Known Bad Inputs | Block | SQLi/XSS payload patterns |
| Geo-restriction (Brazil only) | Optional | If user base is Brazil-only |

Cost: ~$5–10/month (1 Web ACL + 2-3 rules + request volume).

### Route 53 Failover (Production Only)

```
Route 53 Health Check:
  Endpoint: https://app.zenbots.com.br/health.html
  Interval: 30s
  Failure threshold: 3

DNS Failover:
  Primary: CloudFront distribution
  Secondary: S3 static website → "ZenBots is under maintenance" page
```

This is a lightweight health check. CloudFront + S3 rarely fails entirely (99.99% SLA), but Route 53 failover costs $0.50/month and provides the last line of defense.

**`health.html`** — A simple static file in the S3 bucket root:

```html
<!DOCTYPE html><html><body>ok</body></html>
```

Route 53 checks that this file returns HTTP 200. If CloudFront or S3 is unreachable (extremely rare), DNS switches to a maintenance page on a separate S3 bucket in a different region.

### Origin Access Control (OAC)

The S3 bucket must be **private** (no public access). CloudFront uses Origin Access Control (OAC) to fetch content:

```
S3 Bucket Policy:
  Allow: s3:GetObject
  Principal: cloudfront.amazonaws.com
  Condition: aws:SourceArn = arn:aws:cloudfront::<account>:distribution/<dist-id>
```

This means:
- No one can access S3 directly (no public URL)
- Only CloudFront can read from S3
- All traffic goes through CloudFront (enforces headers, WAF, HTTPS)

### Availability Summary

| Mechanism | What It Prevents | Environment |
|-----------|-----------------|-------------|
| CloudFront 99.99% SLA | Frontend downtime | Both |
| 400+ edge locations | High latency for distant users | Both |
| Shield Standard | DDoS attacks | Both |
| OAC (private S3) | Direct S3 access bypassing security | Both |
| Hashed filenames | Cache poisoning, stale JS/CSS | Both |
| Short HTML TTL (5 min) | Serving old HTML after deploy | Both |
| CloudFront invalidation | Stale content after deploy | Both |
| CloudFront Function auth | Unauthenticated access to protected routes | Both |
| Response headers policy | Missing security headers | Both |
| WAF rate limiting | Brute-force, abuse | Prod |
| Route 53 failover | Total CloudFront/S3 failure (extremely rare) | Prod |
| Sentry error monitoring | Silent frontend errors | Both |

---

## 4. Layer 1 — AWS Account Bootstrap

Manual one-time steps. Some resources are shared with the backend (Route 53 zone, OIDC provider, Terraform state bucket).

### 4.1 — Shared Resources (Already Created by Backend Plan)

These exist if the backend plan has been executed. If not, create them:

- AWS account in `us-east-1`
- S3 bucket `zenbots-terraform-state` + DynamoDB lock table
- GitHub OIDC Identity Provider
- Route 53 hosted zone for `zenbots.com.br`

### 4.2 — Frontend-Specific IAM Roles (2 Roles)

| Role | Trust Policy | Permissions | Used By |
|------|-------------|-------------|---------|
| `github-actions-frontend-dev` | OIDC, repo:zenbots-frontend, ref:develop | S3 write (dev bucket), CloudFront invalidation (dev dist), Terraform state read | `deploy-dev.yml` |
| `github-actions-frontend-prod` | OIDC, repo:zenbots-frontend, ref:main | S3 write (prod bucket), CloudFront invalidation (prod dist), Terraform state read | `deploy-prod.yml` |

Trust policy pattern (same OIDC approach as backend):

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "Federated": "arn:aws:iam::<ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com"
    },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": {
        "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
      },
      "StringLike": {
        "token.actions.githubusercontent.com:sub": "repo:<org>/zenbots-frontend:ref:refs/heads/develop"
      }
    }
  }]
}
```

**IAM Policy for deploy roles (minimal permissions):**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3Deploy",
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:DeleteObject", "s3:ListBucket", "s3:GetObject"],
      "Resource": [
        "arn:aws:s3:::zenbots-frontend-dev/*",
        "arn:aws:s3:::zenbots-frontend-dev"
      ]
    },
    {
      "Sid": "CloudFrontInvalidation",
      "Effect": "Allow",
      "Action": "cloudfront:CreateInvalidation",
      "Resource": "arn:aws:cloudfront::<ACCOUNT_ID>:distribution/<DEV_DIST_ID>"
    }
  ]
}
```

### 4.3 — GitHub Repository Secrets

```
AWS_ACCOUNT_ID                    = 123456789012
AWS_REGION                        = us-east-1
AWS_FRONTEND_DEV_ROLE_ARN         = arn:aws:iam::<id>:role/github-actions-frontend-dev
AWS_FRONTEND_PROD_ROLE_ARN        = arn:aws:iam::<id>:role/github-actions-frontend-prod
SENTRY_AUTH_TOKEN                 = <token>   (for source map upload)
```

### 4.4 — GitHub Environments

| GitHub Environment | Purpose | Protection Rules |
|---|---|---|
| `dev` | Dev AWS credentials | None (auto-deploy) |
| `production` | Prod AWS credentials | 1 required reviewer, 5 min wait |

### 4.5 — ACM Certificate

Request a wildcard certificate for `*.zenbots.com.br` in `us-east-1` (required for CloudFront):

```bash
aws acm request-certificate \
  --domain-name "*.zenbots.com.br" \
  --subject-alternative-names "zenbots.com.br" \
  --validation-method DNS \
  --region us-east-1
```

**Important:** CloudFront requires the ACM certificate to be in `us-east-1`, regardless of where other resources live. If the backend plan already created this wildcard cert, reuse it.

---

## 5. Layer 2 — Code Changes

Code changes that must land before the pipeline works.

### 5.1 — Add `output: 'export'` to `next.config.ts`

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',

  images: {
    unoptimized: true,    // No server-side image optimization in static export
    remotePatterns: [
      { protocol: "https", hostname: "**.facebook.com" },
      { protocol: "https", hostname: "**.fbcdn.net" },
    ],
  },

  // Remove experimental.serverActions (unused, incompatible with static export)
  // Remove headers() (moved to CloudFront Response Headers Policy)
};

export default nextConfig;
```

Key changes:
- **`output: 'export'`** — generates static HTML/CSS/JS in `out/` directory
- **`images: { unoptimized: true }`** — disables server-side image optimization (no Sharp needed)
- **Remove `headers()`** — security headers move to CloudFront Response Headers Policy (they don't run in static export)
- **Remove `experimental.serverActions`** — incompatible with static export and unused

### 5.2 — Remove Middleware (Replaced by CloudFront Function)

The `middleware.ts` file won't execute in static export mode. Its logic moves to the CloudFront Function (defined in Section 3).

```bash
# Delete middleware.ts — its logic is now in the CloudFront Function
git rm middleware.ts
```

**No functional change for local development.** In dev mode (`npm run dev`), Next.js ignores `output: 'export'` and runs the full server. But middleware won't run. For local dev, protected routes are accessible without auth — this is acceptable since the API still requires a valid token.

**Alternative for local dev parity:** Add a simple client-side redirect hook:

```typescript
// hooks/use-auth-guard.ts
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";

export function useAuthGuard() {
  const router = useRouter();
  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
    }
  }, [router]);
}
```

Then call `useAuthGuard()` in the portal layout. This provides auth redirect in both local dev and production (as a fallback to the CloudFront Function).

### 5.3 — Remove `.env.local` from Git (BLK-1)

```bash
# Remove from tracking (keeps local file)
git rm --cached .env.local

# Verify .gitignore already has .env* (it does)
```

Create `.env.example`:

```
# ZenBots Frontend — Environment Variables
# Copy to .env.local and fill in values

NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_FB_APP_ID=your_facebook_app_id
NEXT_PUBLIC_FB_CONFIG_ID=your_facebook_config_id
NEXT_PUBLIC_FB_LOGIN_CONFIG_ID=your_facebook_login_config_id
NEXT_PUBLIC_WHATSAPP_DEV_MODE=true
```

**Rotate credentials after removal:**
- Facebook App ID and Config IDs (treat as compromised since they were in git)

### 5.4 — Build-Time Environment Validation (BLK-5)

Add to `next.config.ts`:

```typescript
// Validate required env vars at build time (not in dev mode)
if (process.env.NODE_ENV === 'production') {
  const required = [
    'NEXT_PUBLIC_API_BASE_URL',
    'NEXT_PUBLIC_FB_APP_ID',
    'NEXT_PUBLIC_FB_CONFIG_ID',
    'NEXT_PUBLIC_FB_LOGIN_CONFIG_ID',
  ];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
```

This runs during `next build`. If any `NEXT_PUBLIC_*` var is missing, the CI build fails immediately — no silent production breakage.

### 5.5 — Fix MailHog References (BLK-2, BLK-3)

In `app/(auth)/esqueci-senha/page.tsx`:

```typescript
// Replace hardcoded MailHog link with dev-only conditional
{process.env.NODE_ENV === 'development' && (
  <p className="text-xs text-muted-foreground pt-4">
    Dica de Dev: Verifique o
    <a href="http://localhost:8025"> MailHog (localhost:8025)</a>.
  </p>
)}

// Replace toast message
description: "Verifique sua caixa de entrada."
// Remove "(ou o MailHog)" from the toast
```

### 5.6 — Fix SSE Localhost Fallback (BLK-4)

In `app/(portal)/pedidos/page.tsx`:

```typescript
// Remove fallback — fail explicitly if env var is missing
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
if (!API_BASE) throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured");
```

### 5.7 — Auth Cookie `Secure` Flag (BLK-6)

In `lib/auth.ts`:

```typescript
const secure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : '';
document.cookie = `${AUTH_COOKIE}=1; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Strict${secure}`;
```

### 5.8 — Fix React Query Retry on 401/403 (CRT-5)

In `app/providers.tsx`:

```typescript
const [queryClient] = useState(
  () =>
    new QueryClient({
      defaultOptions: {
        queries: {
          retry: (failureCount, error) => {
            const status = (error as any)?.response?.status;
            if (status === 401 || status === 403) return false;
            return failureCount < 1;
          },
          refetchOnWindowFocus: false,
        },
      },
    })
);
```

### 5.9 — Move React Query DevTools to devDependencies (CRT-6)

```bash
npm install --save-dev @tanstack/react-query-devtools
```

Verify it's imported conditionally (lazy/dynamic import in dev only).

### 5.10 — Add Static Health File

Create `public/health.html`:

```html
<!DOCTYPE html><html><body>ok</body></html>
```

Used by Route 53 health check to verify the frontend is serving content.

### 5.11 — Add Proper 404 Page

Create `app/not-found.tsx` (renders to `404.html` in static export):

```tsx
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-heading font-bold">404</h1>
        <p className="mt-2 text-muted-foreground">Página não encontrada</p>
        <Link href="/login" className="mt-4 inline-block text-primary hover:underline">
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
```

### 5.12 — Add `robots.txt` and Favicon

Create `public/robots.txt`:

```
User-agent: *
Disallow: /meus-bots
Disallow: /pedidos
Disallow: /produtos
Disallow: /settings
Disallow: /pagamentos
Disallow: /analytics
Allow: /login
Allow: /cadastro
```

Generate `favicon.ico` from `public/logo-zenbotz.png` (use any online converter — 16x16, 32x32, 48x48 multi-size ICO).

### 5.13 — Sentry Integration (CRT-4)

```bash
npm install @sentry/nextjs
```

Create `lib/sentry.ts`:

```typescript
import * as Sentry from "@sentry/nextjs";

export function initSentry() {
  if (process.env.NODE_ENV === 'production') {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: 0.1,     // 10% of transactions
      replaysSessionSampleRate: 0, // No session replays (cost)
      environment: process.env.NEXT_PUBLIC_ENVIRONMENT || 'production',
    });
  }
}
```

Call `initSentry()` in `app/providers.tsx`. Add `Sentry.captureException(error)` in all error boundaries.

**Cost:** Sentry free tier = 5K errors/month, 10K transactions/month. Enough for early stage.

---

## 6. Layer 3 — Terraform Infrastructure

### Module Structure

```
infra/
├── modules/
│   ├── s3-hosting/         # S3 bucket for static files, bucket policy, OAC
│   ├── cloudfront/         # Distribution, behaviors, cache policies, OAC
│   │                       # Response headers policy (security headers)
│   │                       # CloudFront Function (auth redirect)
│   │                       # Error pages (404 → /404.html)
│   ├── waf/                # WAF v2 web ACL (prod only)
│   ├── dns/                # Route 53 records, health checks, failover
│   └── monitoring/         # CloudWatch alarms on CloudFront (5xx rate, etc.)
├── environments/
│   ├── dev/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── terraform.tfvars
│   │   └── backend.tf       # S3 state: key=frontend-dev/terraform.tfstate
│   └── prod/
│       ├── main.tf
│       ├── variables.tf
│       ├── terraform.tfvars
│       └── backend.tf       # S3 state: key=frontend-prod/terraform.tfstate
└── global/
    └── main.tf              # ACM certificate (shared with backend if wildcard)
```

### Environment Parameters (`terraform.tfvars`)

| Parameter | Dev | Prod |
|-----------|-----|------|
| `s3_bucket_name` | `zenbots-frontend-dev` | `zenbots-frontend-prod` |
| `domain_name` | `dev.zenbots.com.br` | `app.zenbots.com.br` |
| `api_base_url` | `https://dev-api.zenbots.com.br` | `https://api.zenbots.com.br` |
| `cloudfront_price_class` | `PriceClass_100` (US, Canada, Europe) | `PriceClass_200` (+ South America, Asia) |
| `enable_waf` | `false` | `true` |
| `enable_route53_failover` | `false` | `true` |
| `cloudfront_function_auth` | `true` | `true` |
| `html_cache_ttl` | `300` (5 min) | `300` (5 min) |
| `static_cache_ttl` | `31536000` (1 year) | `31536000` (1 year) |
| `csp_connect_src_api` | `https://dev-api.zenbots.com.br` | `https://api.zenbots.com.br` |
| `enable_logging` | `false` | `true` (S3 access logs) |

### CloudFront Price Classes (Cost vs Latency)

| Price Class | Edge Locations | Monthly Cost Impact | Best For |
|-------------|---------------|-------------------|----------|
| `PriceClass_100` | US, Canada, Europe, Israel | Cheapest | Dev (users are in Brazil, but latency isn't critical for dev) |
| `PriceClass_200` | + South America, Africa, Asia, Middle East, Japan | ~10-20% more | **Prod (Brazil users get São Paulo edge)** |
| `PriceClass_All` | All 400+ locations | Most expensive | Overkill for Brazil-focused SaaS |

**Dev uses PriceClass_100** ($0 base + $0.085/GB transfer) because dev traffic is minimal and latency doesn't matter.
**Prod uses PriceClass_200** to include the São Paulo edge location — critical for Brazilian users.

### Key Terraform Resources

**S3 Bucket (`s3-hosting` module):**

```hcl
resource "aws_s3_bucket" "frontend" {
  bucket = var.bucket_name
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_policy" "oac" {
  bucket = aws_s3_bucket.frontend.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AllowCloudFrontOAC"
      Effect    = "Allow"
      Principal = { Service = "cloudfront.amazonaws.com" }
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.frontend.arn}/*"
      Condition = {
        StringEquals = {
          "AWS:SourceArn" = aws_cloudfront_distribution.frontend.arn
        }
      }
    }]
  })
}
```

**CloudFront Distribution (`cloudfront` module):**

```hcl
resource "aws_cloudfront_distribution" "frontend" {
  enabled             = true
  default_root_object = "index.html"
  price_class         = var.price_class
  aliases             = [var.domain_name]
  web_acl_id          = var.enable_waf ? aws_wafv2_web_acl.frontend[0].arn : null

  origin {
    domain_name              = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id                = "S3Origin"
    origin_access_control_id = aws_cloudfront_origin_access_control.oac.id
  }

  default_cache_behavior {
    target_origin_id       = "S3Origin"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]

    cache_policy_id            = aws_cloudfront_cache_policy.default.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.auth_redirect.arn
    }
  }

  # Long-lived cache for hashed static assets
  ordered_cache_behavior {
    path_pattern           = "_next/static/*"
    target_origin_id       = "S3Origin"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    cache_policy_id        = aws_cloudfront_cache_policy.immutable.id
  }

  # Custom 404 handling
  custom_error_response {
    error_code            = 403    # S3 returns 403 for missing files (OAC)
    response_code         = 404
    response_page_path    = "/404.html"
    error_caching_min_ttl = 60
  }

  viewer_certificate {
    acm_certificate_arn      = var.acm_certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
}
```

**Cache Policies:**

```hcl
# Default: short TTL for HTML files
resource "aws_cloudfront_cache_policy" "default" {
  name        = "${var.environment}-default"
  min_ttl     = 0
  default_ttl = 300      # 5 minutes
  max_ttl     = 300

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config { cookie_behavior = "none" }
    headers_config { header_behavior = "none" }
    query_strings_config { query_string_behavior = "none" }
  }
}

# Immutable: 1 year for hashed static assets
resource "aws_cloudfront_cache_policy" "immutable" {
  name        = "${var.environment}-immutable"
  min_ttl     = 31536000
  default_ttl = 31536000
  max_ttl     = 31536000

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config { cookie_behavior = "none" }
    headers_config { header_behavior = "none" }
    query_strings_config { query_string_behavior = "none" }
  }
}
```

**Response Headers Policy (security headers):**

```hcl
resource "aws_cloudfront_response_headers_policy" "security" {
  name = "${var.environment}-security-headers"

  security_headers_config {
    content_security_policy {
      content_security_policy = var.csp_policy
      override = true
    }
    strict_transport_security {
      access_control_max_age_sec = 31536000
      include_subdomains         = true
      override                   = true
    }
    content_type_options { override = true }
    frame_options {
      frame_option = "DENY"
      override     = true
    }
    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
      override        = true
    }
  }

  custom_headers_config {
    items {
      header   = "Permissions-Policy"
      value    = "camera=(), microphone=(), geolocation=()"
      override = true
    }
  }
}
```

### Terraform State

- Remote backend: S3 bucket `zenbots-terraform-state` (shared with backend)
- Separate state files: `frontend-dev/terraform.tfstate`, `frontend-prod/terraform.tfstate`
- Encrypted at rest via S3 SSE-KMS

---

## 7. Layer 4 — GitHub Actions Workflows

### 7.1 — `pr-checks.yml` (Quality Gate on Every PR)

```yaml
name: PR Checks

on:
  pull_request:
    branches: [develop, main]

concurrency:
  group: pr-${{ github.head_ref }}
  cancel-in-progress: true

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'
      - run: npm ci
      - run: npm run lint

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'
      - run: npm ci
      - run: npx tsc --noEmit

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'
      - run: npm ci
      - run: npm run test

  build:
    runs-on: ubuntu-latest
    needs: [lint, typecheck, test]
    env:
      NEXT_PUBLIC_API_BASE_URL: https://placeholder.example.com
      NEXT_PUBLIC_FB_APP_ID: placeholder
      NEXT_PUBLIC_FB_CONFIG_ID: placeholder
      NEXT_PUBLIC_FB_LOGIN_CONFIG_ID: placeholder
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      # Verify static export succeeded
      - run: test -d out && test -f out/index.html
```

### 7.2 — `deploy-dev.yml` (Auto-Deploy on Push to `develop`)

```yaml
name: Deploy to Dev

on:
  push:
    branches: [develop]

concurrency:
  group: deploy-dev
  cancel-in-progress: true

env:
  AWS_REGION: us-east-1
  S3_BUCKET: zenbots-frontend-dev
  CLOUDFRONT_DISTRIBUTION_ID: ${{ secrets.CLOUDFRONT_DEV_DIST_ID }}

jobs:
  build:
    runs-on: ubuntu-latest
    environment: dev
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'

      - run: npm ci

      - name: Run tests
        run: npm run test

      - name: Build static export
        env:
          NEXT_PUBLIC_API_BASE_URL: https://dev-api.zenbots.com.br
          NEXT_PUBLIC_FB_APP_ID: ${{ secrets.DEV_FB_APP_ID }}
          NEXT_PUBLIC_FB_CONFIG_ID: ${{ secrets.DEV_FB_CONFIG_ID }}
          NEXT_PUBLIC_FB_LOGIN_CONFIG_ID: ${{ secrets.DEV_FB_LOGIN_CONFIG_ID }}
          NEXT_PUBLIC_WHATSAPP_DEV_MODE: "true"
          NEXT_PUBLIC_SENTRY_DSN: ${{ secrets.SENTRY_DSN }}
          NEXT_PUBLIC_ENVIRONMENT: dev
        run: npm run build
        # output: 'export' generates files in out/

      - name: Verify build output
        run: |
          test -d out || { echo "Build output directory 'out' not found"; exit 1; }
          test -f out/index.html || { echo "index.html not found in build output"; exit 1; }
          echo "Build output size: $(du -sh out | cut -f1)"
          echo "File count: $(find out -type f | wc -l)"

      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_FRONTEND_DEV_ROLE_ARN }}
          aws-region: ${{ env.AWS_REGION }}

      # Sync hashed assets first (long-lived cache)
      - name: Sync static assets to S3
        run: |
          aws s3 sync out/_next/static s3://${{ env.S3_BUCKET }}/_next/static \
            --cache-control "public, max-age=31536000, immutable" \
            --delete

      # Sync remaining files (HTML, public assets)
      - name: Sync HTML and public assets to S3
        run: |
          aws s3 sync out s3://${{ env.S3_BUCKET }} \
            --exclude "_next/static/*" \
            --cache-control "public, max-age=0, must-revalidate" \
            --delete

      # Override cache for specific static assets
      - name: Set cache headers for public assets
        run: |
          aws s3 cp s3://${{ env.S3_BUCKET }}/ s3://${{ env.S3_BUCKET }}/ \
            --recursive \
            --exclude "*" \
            --include "*.png" \
            --include "*.svg" \
            --include "*.ico" \
            --include "*.woff2" \
            --cache-control "public, max-age=86400" \
            --metadata-directive REPLACE

      - name: Invalidate CloudFront cache
        run: |
          aws cloudfront create-invalidation \
            --distribution-id ${{ env.CLOUDFRONT_DISTRIBUTION_ID }} \
            --paths "/*.html" "/index.html" "/404.html" "/health.html"

  smoke-test:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Wait for CloudFront propagation
        run: sleep 30

      - name: Health check
        run: |
          for i in {1..10}; do
            STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://dev.zenbots.com.br/health.html)
            if [ "$STATUS" = "200" ]; then
              echo "Health check passed"
              exit 0
            fi
            echo "Attempt $i: HTTP $STATUS, retrying in 10s..."
            sleep 10
          done
          echo "Health check failed after 10 attempts"
          exit 1

      - name: Verify login page loads
        run: |
          BODY=$(curl -s https://dev.zenbots.com.br/login)
          if echo "$BODY" | grep -q "ZenBotZ"; then
            echo "Login page renders correctly"
          else
            echo "Login page content check failed"
            exit 1
          fi
```

### 7.3 — `deploy-prod.yml` (Gated Deploy on Push to `main`)

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

concurrency:
  group: deploy-prod
  cancel-in-progress: false  # Never cancel in-progress prod deploys

env:
  AWS_REGION: us-east-1
  S3_BUCKET: zenbots-frontend-prod
  CLOUDFRONT_DISTRIBUTION_ID: ${{ secrets.CLOUDFRONT_PROD_DIST_ID }}

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'

      - run: npm ci

      - name: Run tests
        run: npm run test

      - name: Build static export
        env:
          NEXT_PUBLIC_API_BASE_URL: https://api.zenbots.com.br
          NEXT_PUBLIC_FB_APP_ID: ${{ secrets.PROD_FB_APP_ID }}
          NEXT_PUBLIC_FB_CONFIG_ID: ${{ secrets.PROD_FB_CONFIG_ID }}
          NEXT_PUBLIC_FB_LOGIN_CONFIG_ID: ${{ secrets.PROD_FB_LOGIN_CONFIG_ID }}
          NEXT_PUBLIC_WHATSAPP_DEV_MODE: "false"
          NEXT_PUBLIC_SENTRY_DSN: ${{ secrets.SENTRY_DSN }}
          NEXT_PUBLIC_ENVIRONMENT: production
        run: npm run build

      - name: Verify build output
        run: |
          test -d out && test -f out/index.html
          echo "Build: $(du -sh out | cut -f1), $(find out -type f | wc -l) files"

      - uses: actions/upload-artifact@v4
        with:
          name: frontend-build
          path: out/
          retention-days: 7

  # Upload Sentry source maps (in parallel with approval wait)
  sentry-sourcemaps:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with:
          name: frontend-build
          path: out/
      - name: Upload source maps to Sentry
        env:
          SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
        run: |
          npx @sentry/cli sourcemaps upload \
            --release="${{ github.sha }}" \
            --url-prefix="~/_next/static" \
            out/_next/static/ || echo "Sentry upload skipped (non-fatal)"

  approval:
    needs: build
    runs-on: ubuntu-latest
    environment: production  # ← GitHub manual approval gate
    steps:
      - name: Approval received
        run: echo "Production deployment approved"

  deploy:
    needs: approval
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: frontend-build
          path: out/

      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_FRONTEND_PROD_ROLE_ARN }}
          aws-region: ${{ env.AWS_REGION }}

      # Sync hashed assets first (long-lived cache, immutable)
      - name: Sync static assets to S3
        run: |
          aws s3 sync out/_next/static s3://${{ env.S3_BUCKET }}/_next/static \
            --cache-control "public, max-age=31536000, immutable" \
            --delete

      # Sync HTML and public assets (short cache)
      - name: Sync HTML and public assets to S3
        run: |
          aws s3 sync out s3://${{ env.S3_BUCKET }} \
            --exclude "_next/static/*" \
            --cache-control "public, max-age=0, must-revalidate" \
            --delete

      # Override cache for images, fonts, etc.
      - name: Set cache headers for public assets
        run: |
          aws s3 cp s3://${{ env.S3_BUCKET }}/ s3://${{ env.S3_BUCKET }}/ \
            --recursive \
            --exclude "*" \
            --include "*.png" \
            --include "*.svg" \
            --include "*.ico" \
            --include "*.woff2" \
            --cache-control "public, max-age=86400" \
            --metadata-directive REPLACE

      - name: Invalidate CloudFront cache
        run: |
          INVALIDATION_ID=$(aws cloudfront create-invalidation \
            --distribution-id ${{ env.CLOUDFRONT_DISTRIBUTION_ID }} \
            --paths "/*.html" "/index.html" "/404.html" "/health.html" \
            --query 'Invalidation.Id' \
            --output text)

          echo "Waiting for invalidation $INVALIDATION_ID..."
          aws cloudfront wait invalidation-completed \
            --distribution-id ${{ env.CLOUDFRONT_DISTRIBUTION_ID }} \
            --id "$INVALIDATION_ID"
          echo "Invalidation complete"

  smoke-test:
    needs: deploy
    runs-on: ubuntu-latest
    steps:
      - name: Health check
        run: |
          for i in {1..10}; do
            STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://app.zenbots.com.br/health.html)
            if [ "$STATUS" = "200" ]; then
              echo "Health check passed"
              exit 0
            fi
            echo "Attempt $i: HTTP $STATUS, retrying in 15s..."
            sleep 15
          done
          echo "Health check failed after 10 attempts"
          exit 1

      - name: Verify login page loads
        run: |
          BODY=$(curl -s https://app.zenbots.com.br/login)
          if echo "$BODY" | grep -q "ZenBotZ"; then
            echo "Login page content verified"
          else
            echo "Login page content check failed"
            exit 1
          fi

      - name: Verify security headers
        run: |
          HEADERS=$(curl -sI https://app.zenbots.com.br/login)
          echo "$HEADERS"
          echo "$HEADERS" | grep -qi "strict-transport-security" || { echo "Missing HSTS header"; exit 1; }
          echo "$HEADERS" | grep -qi "x-frame-options" || { echo "Missing X-Frame-Options"; exit 1; }
          echo "$HEADERS" | grep -qi "content-security-policy" || { echo "Missing CSP header"; exit 1; }
          echo "All security headers present"

  notify:
    needs: [smoke-test]
    runs-on: ubuntu-latest
    if: always()
    steps:
      - name: Deployment notification
        run: |
          if [ "${{ needs.smoke-test.result }}" = "success" ]; then
            echo "Production frontend deployment SUCCEEDED: ${{ github.sha }}"
          else
            echo "Production frontend deployment FAILED: ${{ github.sha }}"
          fi
```

### 7.4 — `terraform.yml` (Infrastructure Changes)

```yaml
name: Terraform (Frontend)

on:
  push:
    branches: [main]
    paths: ["infra/**"]
  workflow_dispatch:
    inputs:
      environment:
        description: "Target environment"
        required: true
        type: choice
        options: [dev, prod]

jobs:
  plan:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_TERRAFORM_ROLE_ARN }}
          aws-region: us-east-1
      - uses: hashicorp/setup-terraform@v3
      - name: Terraform Plan
        run: |
          ENV="${{ github.event.inputs.environment || 'dev' }}"
          cd infra/environments/$ENV
          terraform init
          terraform plan -out=plan.tfplan -no-color
      - uses: actions/upload-artifact@v4
        with:
          name: terraform-plan
          path: infra/environments/*/plan.tfplan

  apply:
    needs: plan
    runs-on: ubuntu-latest
    environment: infrastructure
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_TERRAFORM_ROLE_ARN }}
          aws-region: us-east-1
      - uses: hashicorp/setup-terraform@v3
      - uses: actions/download-artifact@v4
        with:
          name: terraform-plan
      - name: Terraform Apply
        run: |
          ENV="${{ github.event.inputs.environment || 'dev' }}"
          cd infra/environments/$ENV
          terraform init
          terraform apply plan.tfplan
```

---

## 8. Layer 5 — Environment Management

### No Secrets Manager Needed

Unlike the backend (which stores DB passwords, API keys, encryption keys), the frontend only uses **`NEXT_PUBLIC_*` environment variables** — these are baked into the JavaScript bundle at build time and are inherently public (visible in browser source).

| Variable | Where It's Set | Sensitive? |
|----------|---------------|-----------|
| `NEXT_PUBLIC_API_BASE_URL` | GitHub Actions env (per workflow) | No (public URL) |
| `NEXT_PUBLIC_FB_APP_ID` | GitHub Secrets | Low (public in page source) |
| `NEXT_PUBLIC_FB_CONFIG_ID` | GitHub Secrets | Low (public in page source) |
| `NEXT_PUBLIC_FB_LOGIN_CONFIG_ID` | GitHub Secrets | Low (public in page source) |
| `NEXT_PUBLIC_WHATSAPP_DEV_MODE` | GitHub Actions env (hardcoded per workflow) | No |
| `NEXT_PUBLIC_SENTRY_DSN` | GitHub Secrets | Low (public DSN is by design) |
| `NEXT_PUBLIC_ENVIRONMENT` | GitHub Actions env (hardcoded per workflow) | No |

**There is no need for AWS Secrets Manager for the frontend.** All env vars are injected at `npm run build` time in GitHub Actions, not at runtime. This is another cost advantage over the ECS approach (which would need runtime secrets injection).

### Environment-Specific Build Configuration

| Variable | Dev Build | Prod Build |
|----------|-----------|------------|
| `NEXT_PUBLIC_API_BASE_URL` | `https://dev-api.zenbots.com.br` | `https://api.zenbots.com.br` |
| `NEXT_PUBLIC_FB_APP_ID` | `${{ secrets.DEV_FB_APP_ID }}` | `${{ secrets.PROD_FB_APP_ID }}` |
| `NEXT_PUBLIC_WHATSAPP_DEV_MODE` | `"true"` | `"false"` |
| `NEXT_PUBLIC_SENTRY_DSN` | `${{ secrets.SENTRY_DSN }}` | `${{ secrets.SENTRY_DSN }}` |
| `NEXT_PUBLIC_ENVIRONMENT` | `dev` | `production` |

### Rollback Strategy

Since deployments are just S3 file syncs, rollback is trivial:

| Scenario | Action | Time to Recover |
|----------|--------|----------------|
| Bad deploy (broken JS) | Re-run previous successful workflow | ~2 min (rebuild) + ~1 min (sync + invalidation) |
| Bad deploy (quick rollback) | `aws s3 sync` from previous build artifact | ~30s (sync) + ~1 min (invalidation) |
| CloudFront misconfiguration | Terraform rollback (`terraform apply` previous state) | ~5 min |

**Build artifacts are retained for 7 days** (configured in `deploy-prod.yml` upload-artifact step). For emergency rollback, download the artifact from a previous workflow run and re-sync to S3.

---

## 9. Implementation Order

### Timeline Overview

```
Month 1: Dev environment ($4/month)
  Phase 1 (Week 1)   — Code changes + AWS bootstrap
  Phase 2 (Week 1-2) — Terraform modules + dev infra
  Phase 3 (Week 2)   — CI/CD pipelines (dev auto-deploy working)

Month 2: Add production ($12/month)
  Phase 4 (Week 3-4) — Prod infra + prod pipeline with approval gate
  Phase 5 (Week 4)   — Monitoring, WAF, hardening
```

**Why this is much faster than the backend:** No containers, no databases, no secrets management, no health checks, no rolling updates. It's just S3 buckets + CloudFront distributions.

---

### MONTH 1 — Dev Environment

### Phase 1 — Foundation & Code Changes (Week 1)

| # | Task | Depends On | Effort |
|---|------|-----------|--------|
| 1.1 | Add `output: 'export'` to `next.config.ts` | Nothing | 30 min |
| 1.2 | Add `images: { unoptimized: true }` | 1.1 | 5 min |
| 1.3 | Remove `headers()` from `next.config.ts` (moved to CloudFront) | 1.1 | 10 min |
| 1.4 | Remove `experimental.serverActions` (incompatible with export) | 1.1 | 5 min |
| 1.5 | Remove `middleware.ts` (replaced by CloudFront Function) | 1.1 | 10 min |
| 1.6 | Add client-side auth guard hook (local dev parity) | 1.5 | 30 min |
| 1.7 | Remove `.env.local` from git + create `.env.example` (BLK-1) | Nothing | 30 min |
| 1.8 | Add build-time env var validation (BLK-5) | Nothing | 15 min |
| 1.9 | Fix MailHog references (BLK-2, BLK-3) | Nothing | 15 min |
| 1.10 | Fix SSE localhost fallback (BLK-4) | Nothing | 10 min |
| 1.11 | Add `Secure` flag to auth cookie (BLK-6) | Nothing | 10 min |
| 1.12 | Fix React Query retry on 401/403 (CRT-5) | Nothing | 10 min |
| 1.13 | Move React Query DevTools to devDependencies (CRT-6) | Nothing | 5 min |
| 1.14 | Add `public/health.html` | Nothing | 5 min |
| 1.15 | Add `app/not-found.tsx` (404 page) | Nothing | 30 min |
| 1.16 | Add `public/robots.txt` + `favicon.ico` | Nothing | 30 min |
| 1.17 | Verify `npm run build` produces `out/` directory with all routes | 1.1-1.6 | 30 min |
| 1.18 | Create GitHub OIDC provider in AWS (if not done by backend) | AWS account | 30 min |
| 1.19 | Create IAM role: `github-actions-frontend-dev` | 1.18 | 30 min |
| 1.20 | Set GitHub repo secrets + create `dev` environment | 1.19 | 15 min |
| 1.21 | Write `.github/workflows/pr-checks.yml` | Nothing | 1 hour |

### Phase 2 — Dev Environment Infrastructure (Week 1-2)

| # | Task | Depends On | Effort |
|---|------|-----------|--------|
| 2.1 | Write Terraform S3 hosting module | Nothing | 1 hour |
| 2.2 | Write Terraform CloudFront module (cache policies, OAC) | 2.1 | 2 hours |
| 2.3 | Write CloudFront Function for auth redirect | 2.2 | 1 hour |
| 2.4 | Write CloudFront Response Headers Policy (security headers) | 2.2 | 1 hour |
| 2.5 | Wire up `environments/dev/main.tf` | 2.1-2.4 | 1 hour |
| 2.6 | `terraform apply` for dev | 2.5 | 30 min |
| 2.7 | Configure Route 53 → CloudFront (`dev.zenbots.com.br`) | 2.6 | 15 min |
| 2.8 | Attach ACM certificate to dev CloudFront distribution | 2.6 | 15 min |
| 2.9 | Manual test: upload build to S3, verify via CloudFront | 2.6 | 30 min |

### Phase 3 — Dev CI/CD Pipeline (Week 2)

| # | Task | Depends On | Effort |
|---|------|-----------|--------|
| 3.1 | Write `.github/workflows/deploy-dev.yml` | 2.9 | 2 hours |
| 3.2 | Test: push to develop → verify auto-deploy | 3.1 | 1 hour |
| 3.3 | Write `.github/workflows/terraform.yml` | 2.5 | 1 hour |
| 3.4 | Verify auth redirect via CloudFront Function | 3.2 | 30 min |
| 3.5 | Verify security headers via CloudFront Response Headers | 3.2 | 30 min |
| 3.6 | Test full cycle: PR → merge to develop → auto-deploy | 3.2-3.5 | 1 hour |

---

### MONTH 2 — Production Environment

### Phase 4 — Production Infrastructure (Week 3-4)

| # | Task | Depends On | Effort |
|---|------|-----------|--------|
| 4.1 | Create IAM role: `github-actions-frontend-prod` (OIDC, ref:main) | 1.18 | 30 min |
| 4.2 | Add `AWS_FRONTEND_PROD_ROLE_ARN` to GitHub secrets + create `production` environment (1 reviewer) | 4.1 | 15 min |
| 4.3 | Wire up `environments/prod/main.tf` (PriceClass_200, WAF, Route 53 failover) | Modules from Phase 2 | 1 hour |
| 4.4 | `terraform apply` for prod | 4.3 | 30 min |
| 4.5 | Configure Route 53 → CloudFront (`app.zenbots.com.br`) | 4.4 | 15 min |
| 4.6 | Write `.github/workflows/deploy-prod.yml` (approval gate) | 3.1, 4.4 | 1.5 hours |
| 4.7 | Test: merge to main → approval gate → prod deploy | 4.6 | 1 hour |
| 4.8 | Rotate Facebook App ID / Config IDs (since they were in git) | 4.7 | 30 min |

### Phase 5 — Monitoring, WAF & Hardening (Week 4)

| # | Task | Depends On | Effort |
|---|------|-----------|--------|
| 5.1 | Integrate Sentry error monitoring (CRT-4) | Nothing | 2 hours |
| 5.2 | Configure WAF rules on prod CloudFront | 4.4 | 1.5 hours |
| 5.3 | Set up Route 53 health check + failover to maintenance page | 4.4 | 1 hour |
| 5.4 | Switch CSP from report-only to enforcing (CRT-1) — test thoroughly | 4.7 | 2 hours |
| 5.5 | Add CloudWatch alarm: CloudFront 5xx error rate > 1% | 4.4 | 30 min |
| 5.6 | Verify zero-downtime deploy (deploy while browsing — no errors) | 4.7 | 30 min |
| 5.7 | Update backend CORS_ORIGINS with `https://app.zenbots.com.br` | 4.7 | 15 min |

---

## 10. Cost Summary

### Monthly Cost by Phase

| Period | Running Infrastructure | Monthly Cost |
|--------|----------------------|-------------|
| **Month 1** (dev only) | S3 + CloudFront (dev) | **~$4/month** |
| **Month 2+** (dev + prod) | S3 + CloudFront (dev + prod + WAF) | **~$16/month** |

### Fixed Monthly Costs

| Service | Dev | Prod |
|---------|-----|------|
| S3 storage (~20 MB build × 2 versions) | $0.01 | $0.01 |
| CloudFront (PriceClass_100 / PriceClass_200) | $0 base + ~$0.50 transfer | $0 base + ~$2 transfer |
| CloudFront Function (auth redirect) | $0 (within 2M free invocations) | $0 (within 2M free invocations) |
| Route 53 | $0 (shared zone with backend) | $1 (health check + failover) |
| ACM certificate | $0 (free with CloudFront) | $0 (free with CloudFront) |
| WAF | — | $6 (1 web ACL + 2 rules) |
| CloudWatch alarms | $0 | $0.30 (3 alarms) |
| Sentry (free tier) | $0 | $0 |
| **Total** | **~$1–2/month** | **~$10–12/month** |
| **Combined (Month 2+)** | | **~$12–16/month** |

### First-Year Cost Projection

| Period | Duration | Monthly | Subtotal |
|--------|----------|---------|----------|
| Month 1 (dev only) | 1 month | $4 | $4 |
| Months 2-12 (dev + prod) | 11 months | $16 | $176 |
| **Year 1 Total** | | | **~$180** |

### Comparison: S3 + CloudFront vs ECS Fargate vs Amplify

| | S3 + CloudFront | ECS Fargate | AWS Amplify |
|---|---|---|---|
| **Dev** | $2/month | $40/month | $8/month |
| **Prod** | $12/month | $60/month | $18/month |
| **Combined** | **$14/month** | $100/month | $26/month |
| **Year 1** | **$180** | $1,200 | $312 |
| **Savings vs ECS** | **$1,020/year (85%)** | — | $888/year (74%) |
| **Global latency** | **< 50ms** | 100-200ms | < 50ms |
| **Availability SLA** | **99.99%** | 99.95% | 99.95% |

S3 + CloudFront is simultaneously **the cheapest, fastest, and most available** option for this specific frontend architecture. It's not a compromise — it's objectively the best fit.

### Variable Costs

| Service | Unit Cost | Notes |
|---------|-----------|-------|
| CloudFront data transfer | $0.085/GB (first 10TB) | ~$0.50–2/month for typical SaaS |
| CloudFront invalidation | Free (first 1,000 paths/month) | We invalidate ~5 paths per deploy |
| S3 requests | $0.0004 per 1,000 GET | Negligible — CloudFront caches nearly all requests |
| WAF requests | $0.60 per million | ~$0.10/month for small SaaS traffic |
| Sentry (over free tier) | $26/month for 50K errors | Free tier (5K) sufficient for early stage |

### Frontend + Backend Combined Cost

| | Frontend | Backend | Combined |
|---|---|---|---|
| **Dev** | $2/month | $57/month | $59/month |
| **Prod** | $12/month | $215/month | $227/month |
| **Total (Month 2+)** | $14/month | $272/month | **$286/month** |
| **Year 1** | $180 | $3,049 | **$3,229** |

The frontend adds only **5% to the total infrastructure cost** — practically a rounding error compared to the backend.

---

## 11. Pre-Flight Checklist

### Before First Deploy (Any Environment)

**Code Changes:**
- [ ] `output: 'export'` added to `next.config.ts`
- [ ] `images: { unoptimized: true }` configured
- [ ] `headers()` removed from `next.config.ts` (moved to CloudFront)
- [ ] `experimental.serverActions` removed
- [ ] `middleware.ts` deleted (replaced by CloudFront Function)
- [ ] Client-side auth guard hook added (local dev parity)
- [ ] `npm run build` produces `out/` directory with all 13 route HTML files
- [ ] `.env.local` removed from git
- [ ] `.env.example` created with placeholder values
- [ ] Build-time env var validation in `next.config.ts`
- [ ] MailHog references wrapped in dev-only conditional
- [ ] SSE localhost fallback removed
- [ ] Auth cookie `Secure` flag added
- [ ] React Query retry skips 401/403
- [ ] React Query DevTools in devDependencies
- [ ] `public/health.html` exists
- [ ] `app/not-found.tsx` exists (renders as `404.html`)
- [ ] `public/robots.txt` and `favicon.ico` exist
- [ ] Facebook App ID and Config IDs rotated (were exposed in git)

**Infrastructure:**
- [ ] S3 bucket created (private, no public access)
- [ ] CloudFront distribution created with OAC
- [ ] CloudFront Function deployed (auth redirect + URL rewriting)
- [ ] CloudFront Response Headers Policy attached (CSP, HSTS, etc.)
- [ ] Cache policies configured (5 min HTML, 1 year hashed assets)
- [ ] ACM certificate attached and validated
- [ ] Route 53 alias record pointing to CloudFront
- [ ] IAM deploy role has S3 write + CloudFront invalidation permissions
- [ ] Custom error response: 403 → 404.html

**CI/CD:**
- [ ] GitHub OIDC provider configured
- [ ] GitHub Secrets populated (role ARNs, FB IDs, Sentry DSN)
- [ ] `pr-checks.yml` runs on PRs (lint + typecheck + test + build)
- [ ] `deploy-dev.yml` auto-deploys on push to develop
- [ ] Smoke test passes after deploy

### Before Production Go-Live

- [ ] Prod CloudFront distribution uses PriceClass_200 (includes South America edge)
- [ ] WAF v2 attached with rate limiting rules
- [ ] CSP switched from report-only to enforcing (test thoroughly first)
- [ ] Sentry integrated with error boundaries
- [ ] Route 53 failover configured (health check on /health.html)
- [ ] Maintenance page in separate S3 bucket (failover target)
- [ ] Backend `CORS_ORIGINS` updated with `https://app.zenbots.com.br`
- [ ] Backend WhatsApp webhook callback URLs updated
- [ ] Backend Mercado Pago redirect URIs updated
- [ ] `deploy-prod.yml` has manual approval gate
- [ ] Smoke test verifies: health, page content, security headers
- [ ] Zero-downtime deploy verified (browse during deploy → no errors)
- [ ] DNS TTL lowered before cutover (60s), restored after stable (300s)
- [ ] CloudWatch alarm on 5xx rate configured
- [ ] Source maps uploaded to Sentry for production debugging

---

## Appendix A: Future Considerations

### When to Migrate Away from Static Export

If any of these features become needed, migrate to ECS Fargate or AWS Amplify:

| Feature | Why Static Export Can't Handle It | Migration Path |
|---------|----------------------------------|---------------|
| Server-side rendering (SSR) | `output: 'export'` is static-only | Add `output: 'standalone'` + ECS container |
| API routes (`app/api/`) | Need a Node.js runtime | Same as above |
| Server Actions | Need a Node.js runtime | Same as above |
| Server-side auth (httpOnly cookies) | Can't set cookies from CDN | Backend sets cookies OR migrate to ECS |
| `next/image` optimization | Needs Sharp on server | Use CloudFront image resize Lambda OR migrate |
| Incremental Static Regeneration (ISR) | Needs Node.js cache | Migrate to Amplify or ECS |

**Current assessment:** None of these are needed. All data fetching is client-side. Auth is token-based. Images are served as-is from Facebook CDN or S3. Migration is straightforward if requirements change.

### Amplify as a Middle Ground

If static export limitations become frustrating but ECS feels like overkill, AWS Amplify Hosting is a good middle ground:

- Native Next.js SSR support (including middleware, ISR, image optimization)
- Managed infrastructure (no Terraform needed)
- Built-in CI/CD (no GitHub Actions needed for deploy)
- ~$10-25/month (between S3+CloudFront and ECS)
- Can be switched to with minimal code changes (remove `output: 'export'`, add `amplify.yml`)

### Performance Optimization (Post-Launch)

| Optimization | Impact | When |
|-------------|--------|------|
| Preload critical fonts via `<link rel="preload">` | -100ms LCP | Post-launch |
| Optimize images (WebP, proper sizing) | -30-50% image weight | Post-launch |
| Bundle analysis (`@next/bundle-analyzer`) | Identify large dependencies | Post-launch |
| Lazy load below-fold components | -200ms TTI | Post-launch |

---

*This plan is designed to deploy the ZenBots frontend for ~$14/month combined (dev + prod) while providing 99.99% availability, sub-50ms global latency, free DDoS protection, and zero-downtime deployments. The S3 + CloudFront architecture is not a cost compromise — it delivers better performance and availability than a server-based approach, at 85% lower cost.*
