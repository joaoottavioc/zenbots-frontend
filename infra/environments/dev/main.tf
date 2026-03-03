###############################################################################
# ZenBots Frontend — Dev Environment
# Wires the s3-hosting, cloudfront, and dns modules together.
###############################################################################

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"

  default_tags {
    tags = {
      Project     = "zenbots"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# ---------------------------------------------------------------------------
# Locals
# ---------------------------------------------------------------------------
locals {
  bucket_name = "zenbots-${var.environment}-frontend"

  tags = {
    Project     = "zenbots"
    Environment = var.environment
    ManagedBy   = "terraform"
  }

  # Content-Security-Policy for the frontend.
  # Allows the app to talk to its own origin plus the backend API, and
  # includes the domains needed for Facebook/WhatsApp OAuth and Mercado Pago.
  csp_policy = join("; ", [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://connect.facebook.net",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "img-src 'self' data: blob: https://*.facebook.com https://*.fbcdn.net",
    "connect-src 'self' ${var.api_base_url} https://*.facebook.com",
    "frame-src https://www.facebook.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ])
}

# ---------------------------------------------------------------------------
# Module: S3 Hosting
# Creates the private S3 bucket (no bucket policy — see cloudfront module).
# ---------------------------------------------------------------------------
module "s3_hosting" {
  source = "../../modules/s3-hosting"

  bucket_name = local.bucket_name
  tags        = local.tags
}

# ---------------------------------------------------------------------------
# Module: CloudFront
# Creates the distribution, OAC, cache policies, security headers,
# CloudFront Function, and the S3 bucket policy.
# ---------------------------------------------------------------------------
module "cloudfront" {
  source = "../../modules/cloudfront"

  environment                    = var.environment
  s3_bucket_id                   = module.s3_hosting.bucket_id
  s3_bucket_arn                  = module.s3_hosting.bucket_arn
  s3_bucket_regional_domain_name = module.s3_hosting.bucket_regional_domain_name
  domain_name                    = var.domain_name
  acm_certificate_arn            = var.acm_certificate_arn
  price_class                    = var.price_class
  web_acl_id                     = var.web_acl_id
  csp_policy                     = local.csp_policy
  tags                           = local.tags
}

# ---------------------------------------------------------------------------
# Module: DNS
# Creates the Route 53 A-record alias pointing to CloudFront.
# ---------------------------------------------------------------------------
module "dns" {
  source = "../../modules/dns"

  zone_id                   = var.route53_zone_id
  domain_name               = var.domain_name
  cloudfront_domain_name    = module.cloudfront.distribution_domain_name
  cloudfront_hosted_zone_id = module.cloudfront.distribution_hosted_zone_id
}
