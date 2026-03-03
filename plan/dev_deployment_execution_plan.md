# Dev Environment Deployment — Execution Plan

Step-by-step plan to deploy the ZenBots frontend dev environment to AWS (S3 + CloudFront).

**Estimated total effort:** ~2 days of focused work
**Monthly cost:** ~$2/month (CloudFront + S3)
**Result:** Push to `develop` → auto-deploy to `https://dev.zenbotz.com.br`

---

## Prerequisites (Already Done)

These are confirmed as already existing:

- [x] AWS account `578761488332` in `us-east-1`
- [x] S3 state bucket `zenbots-terraform-state` + DynamoDB lock table `zenbots-terraform-locks`
- [x] GitHub OIDC Identity Provider configured
- [x] Route 53 hosted zone `zenbotz.com.br` (Zone ID: `Z0672127E335XW159Q8N`)
- [x] ACM wildcard cert `*.zenbotz.com.br` (ARN: `arn:aws:acm:us-east-1:578761488332:certificate/c91277cb-e5c1-463a-a8b2-75d7b613b4b1`)
- [x] `.env.local` already gitignored (not tracked)

---

## Phase 1 — Code Changes (Claude Code can do this)

These changes prepare the Next.js app for static export. All are in-repo code changes.

### 1.1 — Update `next.config.ts`

**File:** `next.config.ts`

Changes:
- Add `output: 'export'`
- Add `images: { unoptimized: true }`
- Remove `experimental.serverActions` (incompatible with static export)
- Remove `headers()` (security headers move to CloudFront Response Headers Policy)
- Add build-time env var validation (production builds only)

```typescript
import type { NextConfig } from "next";

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

const nextConfig: NextConfig = {
  output: 'export',

  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "**.facebook.com" },
      { protocol: "https", hostname: "**.fbcdn.net" },
    ],
  },

  // headers() removed — security headers are now served by CloudFront Response Headers Policy
  // experimental.serverActions removed — incompatible with static export and unused
};

export default nextConfig;
```

### 1.2 — Delete `middleware.ts` + Add client-side auth guard

**Delete:** `middleware.ts` — its logic moves to CloudFront Function (edge).

**Create:** `hooks/use-auth-guard.ts` — client-side fallback for local dev + defense-in-depth.

```typescript
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";

export function useAuthGuard() {
  const router = useRouter();
  useEffect(() => {
    if (!getToken()) {
      router.replace(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
    }
  }, [router]);
}
```

**Wire into portal layout:** Call `useAuthGuard()` in `app/(portal)/layout.tsx`.

### 1.3 — Fix auth cookie `Secure` flag (BLK-6)

**File:** `lib/auth.ts`

```typescript
const secure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : '';
document.cookie = `${AUTH_COOKIE}=1; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Strict${secure}`;
```

### 1.4 — Fix MailHog references (BLK-2, BLK-3)

**File:** `app/(auth)/esqueci-senha/page.tsx`

- Wrap the "MailHog" link in `process.env.NODE_ENV === 'development'` conditional
- Remove "(ou o MailHog)" from toast message

### 1.5 — Fix SSE localhost fallback (BLK-4)

**File:** `app/(portal)/pedidos/page.tsx`

```typescript
// Change from:
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
// To:
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
if (!API_BASE) throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured");
```

### 1.6 — Fix React Query retry on 401/403 (CRT-5)

**File:** `app/providers.tsx`

```typescript
retry: (failureCount, error) => {
  const status = (error as any)?.response?.status;
  if (status === 401 || status === 403) return false;
  return failureCount < 1;
},
```

### 1.7 — Move React Query DevTools to devDependencies (CRT-6)

```bash
npm install --save-dev @tanstack/react-query-devtools
```

Verify it's imported conditionally (lazy/dynamic) so it's not in the production bundle.

### 1.8 — Create static files

**Create:** `public/health.html`
```html
<!DOCTYPE html><html><body>ok</body></html>
```

**Create:** `public/robots.txt`
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

**Create:** `app/not-found.tsx` (renders to `404.html` in static export)

### 1.9 — Create `.env.example`

```
# ZenBots Frontend — Environment Variables
# Copy to .env.local and fill in values

NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_FB_APP_ID=your_facebook_app_id
NEXT_PUBLIC_FB_CONFIG_ID=your_facebook_config_id
NEXT_PUBLIC_FB_LOGIN_CONFIG_ID=your_facebook_login_config_id
NEXT_PUBLIC_WHATSAPP_DEV_MODE=true
```

### 1.10 — Verify static export works

```bash
# Set placeholder env vars and build
NEXT_PUBLIC_API_BASE_URL=https://placeholder.example.com \
NEXT_PUBLIC_FB_APP_ID=placeholder \
NEXT_PUBLIC_FB_CONFIG_ID=placeholder \
NEXT_PUBLIC_FB_LOGIN_CONFIG_ID=placeholder \
npm run build

# Verify output
ls out/          # Should exist
ls out/index.html  # Should exist
ls out/login/index.html  # Should exist (route HTML)
```

---

## Phase 2 — AWS Infrastructure (Manual + Terraform)

### 2.1 — Create IAM Role: `github-actions-frontend-dev`

**Manual step in AWS Console or CLI.**

Trust policy (OIDC — only `develop` branch can assume):

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "Federated": "arn:aws:iam::578761488332:oidc-provider/token.actions.githubusercontent.com"
    },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": {
        "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
      },
      "StringLike": {
        "token.actions.githubusercontent.com:sub": [
          "repo:<your-org>/zenbots-frontend:ref:refs/heads/develop",
          "repo:<your-org>/zenbots-frontend:environment:dev"
        ]
      }
    }
  }]
}
```

Permissions policy:

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
      "Resource": "arn:aws:cloudfront::578761488332:distribution/*"
    }
  ]
}
```

### 2.2 — Write Terraform Modules

Create the `infra/` directory structure:

```
infra/
├── modules/
│   ├── s3-hosting/         # S3 bucket, private access, OAC policy
│   ├── cloudfront/         # Distribution, cache policies, OAC, CF Function, response headers
│   └── dns/                # Route 53 alias record
├── environments/
│   └── dev/
│       ├── main.tf
│       ├── variables.tf
│       ├── terraform.tfvars
│       ├── outputs.tf
│       └── backend.tf
└── global/                 # (empty for now — ACM cert is managed by backend)
```

Key resources:
- S3 bucket `zenbots-frontend-dev` (private, OAC-only)
- CloudFront distribution with:
  - OAC to S3
  - CloudFront Function (viewer-request): auth redirect + URL rewriting
  - Response Headers Policy: CSP, HSTS, X-Frame-Options, etc.
  - Cache policies: 5-min HTML, 1-year hashed assets
  - Custom error response: 403 → 404.html
  - ACM cert: `arn:aws:acm:us-east-1:578761488332:certificate/c91277cb-e5c1-463a-a8b2-75d7b613b4b1`
  - PriceClass_100 (cheapest — latency doesn't matter for dev)
- Route 53 A record: `dev.zenbotz.com.br` → CloudFront

### 2.3 — Apply Terraform

```bash
cd infra/environments/dev
terraform init
terraform plan
terraform apply
```

Capture outputs:
- `cloudfront_distribution_id` → needed for GitHub secret
- `cloudfront_domain_name` → verify DNS
- `s3_bucket_name` → verify bucket

### 2.4 — Configure GitHub

**Repository secrets:**
```
AWS_ACCOUNT_ID = 578761488332
```

**Environment: `dev` — secrets:**
```
AWS_FRONTEND_DEV_ROLE_ARN = arn:aws:iam::578761488332:role/github-actions-frontend-dev
CLOUDFRONT_DEV_DIST_ID = <from terraform output>
DEV_FB_APP_ID = <your dev facebook app id>
DEV_FB_CONFIG_ID = <your dev facebook config id>
DEV_FB_LOGIN_CONFIG_ID = <your dev facebook login config id>
```

### 2.5 — Manual Smoke Test

Before wiring up CI/CD, manually upload a build to verify the infrastructure works:

```bash
# Build locally
NEXT_PUBLIC_API_BASE_URL=https://dev-api.zenbotz.com.br \
NEXT_PUBLIC_FB_APP_ID=<id> \
NEXT_PUBLIC_FB_CONFIG_ID=<id> \
NEXT_PUBLIC_FB_LOGIN_CONFIG_ID=<id> \
npm run build

# Upload to S3
aws s3 sync out/_next/static s3://zenbots-frontend-dev/_next/static \
  --cache-control "public, max-age=31536000, immutable"

aws s3 sync out s3://zenbots-frontend-dev \
  --exclude "_next/static/*" \
  --cache-control "public, max-age=0, must-revalidate"

# Invalidate CloudFront
aws cloudfront create-invalidation \
  --distribution-id <DIST_ID> \
  --paths "/*"

# Test
curl -I https://dev.zenbotz.com.br/health.html  # Should return 200
curl -I https://dev.zenbotz.com.br/login         # Should return 200 with security headers
```

---

## Phase 3 — CI/CD Pipelines (Claude Code can do this)

### 3.1 — Create `.github/workflows/pr-checks.yml`

Runs on every PR to `develop` or `main`:
- `npm ci`
- `npm run lint`
- `npx tsc --noEmit`
- `npm run build` (with placeholder env vars)
- Verify `out/` exists

### 3.2 — Create `.github/workflows/deploy-dev.yml`

Runs on push to `develop`:
- Build static export with dev env vars
- OIDC auth → assume `github-actions-frontend-dev` role
- Sync to S3 (hashed assets first with immutable cache, then HTML with short cache)
- CloudFront invalidation (HTML paths only)
- Smoke test: health check + login page content

### 3.3 — Test the full cycle

1. Create a feature branch
2. Make a change
3. Open PR → `pr-checks.yml` runs
4. Merge to `develop` → `deploy-dev.yml` runs
5. Verify `https://dev.zenbotz.com.br` is live

---

## Phase Summary

| Phase | What | Who | Effort |
|-------|------|-----|--------|
| **Phase 1** | Code changes (next.config, middleware, auth, etc.) | Claude Code | ~2-3 hours |
| **Phase 2** | AWS infra (IAM role, Terraform, DNS) | Human (AWS console + CLI) | ~4-6 hours |
| **Phase 3** | CI/CD workflows | Claude Code | ~1-2 hours |

### What Claude Code Can Do Now (Phase 1 + 3):

1. All code changes in Phase 1 (1.1 through 1.10)
2. All GitHub Actions workflows in Phase 3 (3.1 and 3.2)
3. Terraform module scaffolding (Phase 2.2 — write the `.tf` files)

### What Requires Human Action (Phase 2):

1. Create IAM role in AWS (2.1)
2. `terraform apply` (2.3)
3. Set GitHub repository secrets (2.4)
4. Manual smoke test (2.5)

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Static export breaks some page | Run `npm run build` locally first, check `out/` has all route HTML files |
| CloudFront Function has bugs | Test auth redirect manually before enabling CI/CD |
| Middleware removal breaks local dev | Client-side `useAuthGuard()` hook provides same redirect behavior |
| S3 sync deletes old files before new ones upload | `aws s3 sync` uploads first, then deletes — atomic per-file |
| CloudFront caches stale HTML | HTML has `max-age=0, must-revalidate` + explicit invalidation on deploy |

---

## Backend CORS Update Needed

After `dev.zenbotz.com.br` is live, the backend `CORS_ORIGINS` must include `https://dev.zenbotz.com.br`. Update the backend's environment config or secrets accordingly. Without this, the frontend will get CORS errors on all API calls.
