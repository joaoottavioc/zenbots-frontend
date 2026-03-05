# AWS Architecture — Frontend Deployment

This document describes the AWS infrastructure that hosts the ZenBots frontend, how the CI/CD pipeline deploys it, and how to change parameters for new environments or adjustments.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [How It Works (Request Flow)](#how-it-works-request-flow)
3. [AWS Resources](#aws-resources)
4. [Terraform Structure](#terraform-structure)
5. [CI/CD Pipelines](#cicd-pipelines)
6. [CloudFront Function (Auth + URL Rewriting)](#cloudfront-function-auth--url-rewriting)
7. [Caching Strategy](#caching-strategy)
8. [Security Headers](#security-headers)
9. [IAM & Permissions](#iam--permissions)
10. [GitHub Secrets](#github-secrets)
11. [How to Change Parameters](#how-to-change-parameters)
12. [Adding a New Environment](#adding-a-new-environment)
13. [Common Operations](#common-operations)
14. [Cost](#cost)
15. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

The frontend is a **Next.js static export** (`output: 'export'`). The build produces plain HTML, CSS, and JS files in an `out/` directory — no Node.js server runs in production. These static files are hosted on **S3 + CloudFront**.

```
                    ┌─────────────────────────────────────────────────┐
                    │              GitHub Actions                      │
                    │   push to develop → build → sync to S3          │
                    └───────────────────────┬─────────────────────────┘
                                            │ OIDC (no keys)
                                            ▼
┌──────────┐      ┌──────────────┐      ┌──────────┐      ┌──────────────┐
│  Browser  │─────▶│  CloudFront  │─────▶│    S3     │      │  Route 53    │
│           │ HTTPS│  (CDN)       │ OAC  │ (private) │      │  A record    │
│           │◀─────│              │◀─────│           │      │  → CF alias  │
└──────────┘      └──────────────┘      └──────────┘      └──────────────┘
                    │
                    ├─ CloudFront Function: auth redirect + URL rewriting
                    ├─ Cache policies: 5min HTML, 1yr hashed assets
                    ├─ Security headers: CSP, HSTS, X-Frame-Options
                    └─ TLS 1.2+ via ACM wildcard cert
```

**Why S3+CloudFront instead of ECS/EC2:**
- Static export = no server-side rendering, no API routes, no server actions
- Cost: ~$2/month vs ~$45-75/month for a container solution
- Performance: content served from edge locations worldwide
- Simplicity: no servers to patch, scale, or monitor

---

## How It Works (Request Flow)

1. User visits `https://dev.zenbotz.com.br/pedidos`
2. **Route 53** resolves the domain to the CloudFront distribution
3. **CloudFront Function** runs on `viewer-request`:
   - `/pedidos` is a protected route → checks for both `zenbots_auth` and `access_token` cookies
   - Missing either cookie → returns `302` redirect to `/login?redirect=%2Fpedidos`
   - Has both cookies → rewrites URI from `/pedidos` to `/pedidos.html`
4. **CloudFront cache** checks if `/pedidos.html` is cached (5-min TTL)
5. On cache miss, CloudFront fetches from **S3** using OAC (SigV4 signed request)
6. **Response headers policy** adds CSP, HSTS, X-Frame-Options, etc.
7. Browser receives the HTML and loads JS/CSS from `_next/static/*` (1-year cache)

---

## AWS Resources

| Resource | Name / ID | Purpose |
|----------|-----------|---------|
| S3 Bucket | `zenbots-dev-frontend` | Stores static build output (private) |
| CloudFront Distribution | `EBRLSVG9C0VM3` | CDN, TLS termination, edge auth |
| CloudFront OAC | `oac-dev-frontend` | Signs requests from CloudFront to S3 |
| CloudFront Function | `auth-redirect-dev` | Auth redirect + `.html` URL rewriting |
| ACM Certificate | `*.zenbotz.com.br` | Wildcard TLS cert (us-east-1) |
| Route 53 A Record | `dev.zenbotz.com.br` | Alias to CloudFront distribution |
| IAM Role | `github-actions-frontend-dev` | OIDC role for GitHub Actions deploys |
| Terraform State | `s3://zenbots-terraform-state/frontend-dev/terraform.tfstate` | Remote state with DynamoDB locking |

**AWS Account:** `578761488332` | **Region:** `us-east-1`

---

## Terraform Structure

```
infra/
├── modules/
│   ├── s3-hosting/          # Private S3 bucket with versioning + encryption
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── cloudfront/          # Distribution, OAC, cache policies, security headers
│   │   ├── main.tf
│   │   ├── auth-redirect.js # CloudFront Function source code
│   │   ├── variables.tf
│   │   └── outputs.tf
│   └── dns/                 # Route 53 A record alias
│       ├── main.tf
│       ├── variables.tf
│       └── outputs.tf
└── environments/
    └── dev/
        ├── main.tf          # Wires modules together + CSP policy
        ├── variables.tf     # Input variable declarations
        ├── outputs.tf       # Terraform outputs
        ├── terraform.tfvars # Dev-specific values
        └── backend.tf       # S3 state backend config
```

### Module: `s3-hosting`

Creates a fully private S3 bucket. Features:
- Versioning enabled (object history for rollback)
- AES256 server-side encryption by default
- All public access blocked (no public ACLs or policies)
- Bucket policy is **not** here — it lives in the `cloudfront` module to avoid circular dependency

### Module: `cloudfront`

The main module. Creates:
- **Origin Access Control (OAC)** — SigV4 signing so only CloudFront can read S3
- **S3 Bucket Policy** — grants `s3:GetObject` only from this specific CloudFront distribution
- **CloudFront Function** — auth redirect + URL rewriting (see [section below](#cloudfront-function-auth--url-rewriting))
- **Cache Policy (default)** — 5-minute TTL for HTML pages
- **Cache Policy (immutable)** — 1-year TTL for `_next/static/*` hashed assets
- **Response Headers Policy** — security headers (CSP, HSTS, etc.)
- **CloudFront Distribution** — ties everything together

### Module: `dns`

Creates a Route 53 A record (alias type) pointing the custom domain to CloudFront.

### Environment Config: `dev/terraform.tfvars`

```hcl
environment         = "dev"
domain_name         = "dev.zenbotz.com.br"
acm_certificate_arn = "arn:aws:acm:us-east-1:578761488332:certificate/c91277cb-e5c1-463a-a8b2-75d7b613b4b1"
route53_zone_id     = "Z0672127E335XW159Q8N"
price_class         = "PriceClass_100"
api_base_url        = "https://dev-api.zenbotz.com.br"
```

---

## CI/CD Pipelines

### PR Checks (`.github/workflows/pr-checks.yml`)

**Trigger:** Pull requests to `develop` or `main`

| Job | Blocking? | What it does |
|-----|-----------|-------------|
| `lint` | No (`\|\| true`) | Runs `npm run lint` |
| `typecheck` | No (`\|\| true`) | Runs `npx tsc --noEmit` |
| `test` | **Yes** | Runs `npm run test` |
| `build` | **Yes** (after all above) | Runs `npm run build` + verifies `out/login.html` exists |

Lint and typecheck are non-blocking due to pre-existing errors. Tests and build must pass.

### Deploy to Dev (`.github/workflows/deploy-dev.yml`)

**Trigger:** Push to `develop` (ignores `*.md`, `docs/**`, `tech_debt/**`, `plan/**`)

**Jobs:**

1. **`checks`** — Same quality gates as PR checks
2. **`build-and-deploy`** — Builds with real env vars, syncs to S3, invalidates CloudFront
3. **`smoke-test`** — Hits `https://dev.zenbotz.com.br/health.html` and verifies `/login` renders

**Deploy steps in detail:**

```
npm run build                         # Static export → out/
    ↓
aws s3 sync out/_next/static → S3     # Hashed assets (1-year cache-control)
    ↓
aws s3 sync out → S3                  # HTML + public files (must-revalidate)
    ↓
aws s3 cp (images, fonts)             # Override cache to 1-day for media
    ↓
aws cloudfront create-invalidation    # Invalidate /*.html, /404.html, /health.html
    ↓
sleep 30 → smoke test                 # Health check + login page content check
```

**Environment variables used during build:**

| Variable | Source | Value (dev) |
|----------|--------|-------------|
| `NEXT_PUBLIC_API_BASE_URL` | Hardcoded in workflow | `https://dev-api.zenbotz.com.br` |
| `NEXT_PUBLIC_FB_APP_ID` | GitHub secret | `DEV_FB_APP_ID` |
| `NEXT_PUBLIC_FB_CONFIG_ID` | GitHub secret | `DEV_FB_CONFIG_ID` |
| `NEXT_PUBLIC_FB_LOGIN_CONFIG_ID` | GitHub secret | `DEV_FB_LOGIN_CONFIG_ID` |
| `NEXT_PUBLIC_WHATSAPP_DEV_MODE` | Hardcoded in workflow | `"true"` |
| `NEXT_PUBLIC_ENVIRONMENT` | Hardcoded in workflow | `dev` |

---

## CloudFront Function (Auth + URL Rewriting)

**File:** `infra/modules/cloudfront/auth-redirect.js`

This function runs at the CloudFront edge on every `viewer-request` (before cache lookup). It replaces the deleted Next.js `middleware.ts`.

### What it does:

1. **Auth redirect** — If the request path starts with a protected prefix AND either the `zenbots_auth` presence cookie or the backend's httpOnly `access_token` cookie is missing, return a `302` to `/login?redirect=<original_path>`. The dual-cookie check prevents XSS-based bypass: even if an attacker forges `zenbots_auth=1` via `document.cookie`, they cannot create the httpOnly `access_token` cookie from JavaScript.

2. **Root redirect** — `/` redirects to `/login` (there is no `app/page.tsx`).

3. **URL rewriting** — If the URI has no file extension (e.g., `/login`), append `.html` (e.g., `/login.html`). This is needed because Next.js 16 static export generates `/route.html`, not `/route/index.html`.

### Protected routes:

```
/meus-bots, /pedidos, /produtos, /settings,
/pagamentos, /analytics, /suporte, /bots,
/whatsapp-callback
```

### How to add a new protected route:

Edit `infra/modules/cloudfront/auth-redirect.js` and add the path prefix to the `protectedPrefixes` array. Then re-deploy with `terraform apply`.

### How to add a new public route:

No changes needed — any path not in `protectedPrefixes` is public by default.

---

## Caching Strategy

| Content Type | Path Pattern | Cache-Control Header | CloudFront TTL | Browser Behavior |
|-------------|-------------|---------------------|----------------|-----------------|
| Hashed JS/CSS | `_next/static/*` | `public, max-age=31536000, immutable` | 1 year | Never re-fetches (filename changes on rebuild) |
| HTML pages | `*.html` | `public, max-age=0, must-revalidate` | 5 minutes | Always validates with CloudFront |
| Images/Fonts | `*.png, *.svg, *.ico, *.woff2` | `public, max-age=86400` | 1 day | Re-fetches after 24h |
| Other public | everything else | `public, max-age=0, must-revalidate` | 5 minutes | Always validates |

**CloudFront invalidation** only targets HTML files (`/*.html`, `/404.html`, `/health.html`) — hashed assets never need invalidation because their filenames change on every build.

---

## Security Headers

Served by CloudFront Response Headers Policy (not `next.config.ts`):

| Header | Value |
|--------|-------|
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' 'unsafe-inline' https://connect.facebook.net; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob: https://*.facebook.com https://*.fbcdn.net; connect-src 'self' {api_base_url} https://*.facebook.com; frame-src https://www.facebook.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'` |
| `Strict-Transport-Security` | `max-age=31536000; includeSubdomains` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |

### How to change the CSP:

The CSP is built in `infra/environments/dev/main.tf` inside the `locals.csp_policy` block. Edit the directives there and run `terraform apply`.

---

## IAM & Permissions

### GitHub Actions Role: `github-actions-frontend-dev`

**Trust policy (OIDC):**
- Only the `develop` branch and the `dev` GitHub environment can assume this role
- Uses GitHub's OIDC provider — no static AWS access keys

**Permissions (least-privilege):**

| Action | Resource |
|--------|----------|
| `s3:PutObject`, `s3:DeleteObject`, `s3:ListBucket`, `s3:GetObject` | `arn:aws:s3:::zenbots-dev-frontend` and `/*` |
| `cloudfront:CreateInvalidation` | `arn:aws:cloudfront::578761488332:distribution/*` |

The role **cannot** modify the S3 bucket configuration, CloudFront distribution settings, DNS records, or any other AWS resources.

---

## GitHub Secrets

### Environment: `dev`

| Secret | Description | Where it's used |
|--------|-------------|-----------------|
| `AWS_FRONTEND_DEV_ROLE_ARN` | IAM role ARN for OIDC auth | `deploy-dev.yml` → `configure-aws-credentials` |
| `CLOUDFRONT_DEV_DIST_ID` | CloudFront distribution ID | `deploy-dev.yml` → cache invalidation step |
| `DEV_FB_APP_ID` | Facebook App ID | `deploy-dev.yml` → build step env var |
| `DEV_FB_CONFIG_ID` | Facebook embedded signup config ID | `deploy-dev.yml` → build step env var |
| `DEV_FB_LOGIN_CONFIG_ID` | Facebook login config ID | `deploy-dev.yml` → build step env var |

To update secrets: **GitHub repo → Settings → Environments → dev → Environment secrets**

---

## How to Change Parameters

### Change the domain

1. Edit `infra/environments/dev/terraform.tfvars`:
   ```hcl
   domain_name = "new-domain.zenbotz.com.br"
   ```
2. Run `cd infra/environments/dev && terraform apply`
3. Update `deploy-dev.yml` smoke test URLs to match

### Change the CloudFront price class

Edit `terraform.tfvars`:
```hcl
price_class = "PriceClass_200"   # North America + Europe + Asia
# or
price_class = "PriceClass_All"   # All edge locations (most expensive)
```

| Price Class | Coverage | Cost |
|-------------|----------|------|
| `PriceClass_100` | North America + Europe | Cheapest |
| `PriceClass_200` | + Asia, Middle East, Africa | Medium |
| `PriceClass_All` | All 400+ edge locations | Most expensive |

### Change the API base URL

1. Edit `terraform.tfvars`:
   ```hcl
   api_base_url = "https://new-api.zenbotz.com.br"
   ```
2. Run `terraform apply` (updates the CSP header)
3. Edit `deploy-dev.yml` build step:
   ```yaml
   NEXT_PUBLIC_API_BASE_URL: https://new-api.zenbotz.com.br
   ```
4. Push to `develop` to trigger a rebuild with the new API URL baked in

### Change cache TTLs

Edit `infra/modules/cloudfront/main.tf`:
- **HTML TTL** → `aws_cloudfront_cache_policy.default` → change `default_ttl` / `max_ttl` (in seconds)
- **Static assets TTL** → `aws_cloudfront_cache_policy.immutable` → change all three TTL values

### Add a WAF Web ACL

1. Create a WAF Web ACL in `us-east-1` (CloudFront requires global WAF)
2. Edit `terraform.tfvars`:
   ```hcl
   web_acl_id = "arn:aws:wafv2:us-east-1:578761488332:global/webacl/my-acl/abc-123"
   ```
3. Run `terraform apply`

### Change the ACM certificate

If you need a different TLS certificate:
1. Create/import the cert in ACM **in us-east-1** (required for CloudFront)
2. Edit `terraform.tfvars`:
   ```hcl
   acm_certificate_arn = "arn:aws:acm:us-east-1:578761488332:certificate/NEW-CERT-ID"
   ```
3. Run `terraform apply`

---

## Adding a New Environment

To create a `staging` or `prod` environment:

### 1. Terraform

```bash
# Copy the dev environment config
cp -r infra/environments/dev infra/environments/prod
```

Edit `infra/environments/prod/terraform.tfvars`:
```hcl
environment         = "prod"
domain_name         = "app.zenbotz.com.br"
acm_certificate_arn = "arn:aws:acm:us-east-1:578761488332:certificate/c91277cb-e5c1-463a-a8b2-75d7b613b4b1"
route53_zone_id     = "Z0672127E335XW159Q8N"
price_class         = "PriceClass_200"    # broader coverage for prod
api_base_url        = "https://api.zenbotz.com.br"
```

Edit `infra/environments/prod/backend.tf`:
```hcl
terraform {
  backend "s3" {
    bucket         = "zenbots-terraform-state"
    key            = "frontend-prod/terraform.tfstate"    # different key
    region         = "us-east-1"
    dynamodb_table = "zenbots-terraform-locks"
    encrypt        = true
  }
}
```

```bash
cd infra/environments/prod
terraform init
terraform plan
terraform apply
```

### 2. IAM Role

Create a new OIDC role for the prod environment:
```bash
aws iam create-role \
  --role-name github-actions-frontend-prod \
  --assume-role-policy-document '{...}'  # trust policy for main branch + prod environment
```

Attach a policy scoped to the prod S3 bucket and CloudFront distribution.

### 3. GitHub Environment + Secrets

Create a `prod` environment in **GitHub repo → Settings → Environments** with:
- `AWS_FRONTEND_PROD_ROLE_ARN`
- `CLOUDFRONT_PROD_DIST_ID`
- `PROD_FB_APP_ID`
- `PROD_FB_CONFIG_ID`
- `PROD_FB_LOGIN_CONFIG_ID`

Optionally add **required reviewers** for the prod environment.

### 4. Workflow

Create `.github/workflows/deploy-prod.yml` (copy `deploy-dev.yml` and adjust):
- Trigger: push to `main`
- Environment: `prod`
- S3 bucket: `zenbots-prod-frontend`
- Env vars: production API URL, `NEXT_PUBLIC_WHATSAPP_DEV_MODE: "false"`, `NEXT_PUBLIC_ENVIRONMENT: prod`
- Secrets: `PROD_*` variants
- Smoke test: production domain

---

## Common Operations

### Manual deploy (without pushing code)

```bash
# 1. Build locally
NEXT_PUBLIC_API_BASE_URL=https://dev-api.zenbotz.com.br \
NEXT_PUBLIC_FB_APP_ID=... \
NEXT_PUBLIC_FB_CONFIG_ID=... \
NEXT_PUBLIC_FB_LOGIN_CONFIG_ID=... \
npm run build

# 2. Sync to S3
aws s3 sync out/_next/static s3://zenbots-dev-frontend/_next/static \
  --cache-control "public, max-age=31536000, immutable" --delete

aws s3 sync out s3://zenbots-dev-frontend \
  --exclude "_next/static/*" \
  --cache-control "public, max-age=0, must-revalidate" --delete

# 3. Invalidate CloudFront
aws cloudfront create-invalidation \
  --distribution-id EBRLSVG9C0VM3 \
  --paths "/*.html" "/404.html" "/health.html"
```

### Invalidate the entire CloudFront cache

```bash
aws cloudfront create-invalidation \
  --distribution-id EBRLSVG9C0VM3 \
  --paths "/*"
```

Note: `/*` invalidation costs $0 for the first 1,000/month, then $0.005 per path.

### Check current Terraform state

```bash
cd infra/environments/dev
terraform show
terraform output
```

### View CloudFront distribution config

```bash
aws cloudfront get-distribution --id EBRLSVG9C0VM3
```

### Rollback to previous S3 version

S3 versioning is enabled. To restore a previous version of a file:
```bash
# List versions
aws s3api list-object-versions --bucket zenbots-dev-frontend --prefix login.html

# Restore a specific version
aws s3api copy-object \
  --bucket zenbots-dev-frontend \
  --copy-source "zenbots-dev-frontend/login.html?versionId=VERSION_ID" \
  --key login.html

# Invalidate CloudFront
aws cloudfront create-invalidation --distribution-id EBRLSVG9C0VM3 --paths "/login.html"
```

### Check GitHub Actions logs

```bash
gh run list --workflow=deploy-dev.yml --limit=5
gh run view <run-id> --log
```

---

## Cost

### Monthly estimate (dev environment, low traffic)

| Resource | Estimated Cost |
|----------|---------------|
| S3 storage (~50 MB) | $0.02 |
| S3 requests | $0.01 |
| CloudFront data transfer (~1 GB) | $0.50 |
| CloudFront requests (~10K) | $0.20 |
| Route 53 hosted zone | $0.50 |
| **Total** | **~$1.23/month** |

CloudFront costs scale with traffic. For a high-traffic production site (100 GB/month, 1M requests), expect ~$15-20/month — still significantly cheaper than running a container.

---

## Troubleshooting

### Site returns 403 / Access Denied

The S3 bucket is private. A 403 from S3 usually means:
- The file doesn't exist in S3 (CloudFront maps 403 → 404 via custom error response)
- The OAC or bucket policy is misconfigured — check `terraform show` for the bucket policy

### CloudFront Function errors

View function logs (sampled):
```bash
aws cloudfront get-function --name auth-redirect-dev --stage LIVE
```

CloudFront Functions log to CloudWatch in `us-east-1` under `/aws/cloudfront/function/auth-redirect-dev`. Note: only errors are logged by default; `console.log()` in CF Functions is not supported.

### Changes not showing after deploy

1. Check if CloudFront invalidation completed:
   ```bash
   aws cloudfront list-invalidations --distribution-id EBRLSVG9C0VM3
   ```
2. Wait for `Status: Completed` (usually < 60 seconds)
3. Try hard-refreshing the browser (`Ctrl+Shift+R`)
4. Check if the file exists in S3:
   ```bash
   aws s3 ls s3://zenbots-dev-frontend/login.html
   ```

### CORS errors from frontend to backend

The frontend CSP allows `connect-src` to the configured `api_base_url`. But the **backend** must also return proper CORS headers (`Access-Control-Allow-Origin: https://dev.zenbotz.com.br`). Update the backend's `CORS_ORIGINS` environment variable.

### Build fails with "Missing required environment variables"

`next.config.ts` validates that these env vars exist at build time:
- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_FB_APP_ID`
- `NEXT_PUBLIC_FB_CONFIG_ID`
- `NEXT_PUBLIC_FB_LOGIN_CONFIG_ID`

In CI, these come from the workflow file and GitHub secrets. Locally, set them in `.env.local` (see `.env.example`).

### Login redirect loop

If visiting `/login` keeps redirecting to `/login`:
- The CloudFront Function only redirects **protected** routes. `/login` is public.
- Check that the function code in `infra/modules/cloudfront/auth-redirect.js` doesn't accidentally include `/login` in `protectedPrefixes`.
- Check the client-side auth guard in `app/(portal)/layout.tsx`.
