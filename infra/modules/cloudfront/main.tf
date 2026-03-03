###############################################################################
# CloudFront Module
# Creates the CloudFront distribution with OAC, cache policies, security
# headers, a CloudFront Function for auth redirect / URL rewriting, and
# the S3 bucket policy granting CloudFront read access.
###############################################################################

# ---------------------------------------------------------------------------
# Origin Access Control (OAC)
# ---------------------------------------------------------------------------
resource "aws_cloudfront_origin_access_control" "this" {
  name                              = "oac-${var.environment}-frontend"
  description                       = "OAC for ${var.environment} frontend S3 bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# ---------------------------------------------------------------------------
# S3 Bucket Policy — grants CloudFront OAC read access
# Lives here (not in s3-hosting) to avoid circular dependency.
# ---------------------------------------------------------------------------
resource "aws_s3_bucket_policy" "cloudfront_access" {
  bucket = var.s3_bucket_id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowCloudFrontServicePrincipalReadOnly"
        Effect    = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${var.s3_bucket_arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.this.arn
          }
        }
      }
    ]
  })
}

# ---------------------------------------------------------------------------
# CloudFront Function — auth redirect + URL rewriting
# ---------------------------------------------------------------------------
resource "aws_cloudfront_function" "auth_redirect" {
  name    = "auth-redirect-${var.environment}"
  runtime = "cloudfront-js-2.0"
  comment = "Auth redirect and URI rewriting for ${var.environment} frontend"
  publish = true
  code    = file("${path.module}/auth-redirect.js")
}

# ---------------------------------------------------------------------------
# Cache Policy — Default (short TTL for HTML pages)
# ---------------------------------------------------------------------------
resource "aws_cloudfront_cache_policy" "default" {
  name        = "${var.environment}-frontend-default"
  comment     = "Short TTL for HTML pages (${var.environment})"
  min_ttl     = 0
  default_ttl = 300
  max_ttl     = 300

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "none"
    }
    headers_config {
      header_behavior = "none"
    }
    query_strings_config {
      query_string_behavior = "none"
    }

    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true
  }
}

# ---------------------------------------------------------------------------
# Cache Policy — Immutable (long TTL for hashed static assets)
# ---------------------------------------------------------------------------
resource "aws_cloudfront_cache_policy" "immutable" {
  name        = "${var.environment}-frontend-immutable"
  comment     = "Long TTL for immutable hashed assets (${var.environment})"
  min_ttl     = 31536000
  default_ttl = 31536000
  max_ttl     = 31536000

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "none"
    }
    headers_config {
      header_behavior = "none"
    }
    query_strings_config {
      query_string_behavior = "none"
    }

    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true
  }
}

# ---------------------------------------------------------------------------
# Response Headers Policy — Security Headers
# ---------------------------------------------------------------------------
resource "aws_cloudfront_response_headers_policy" "security" {
  name    = "${var.environment}-frontend-security-headers"
  comment = "Security headers for ${var.environment} frontend"

  security_headers_config {
    content_security_policy {
      content_security_policy = var.csp_policy
      override                = true
    }

    strict_transport_security {
      access_control_max_age_sec = 31536000
      include_subdomains         = true
      override                   = true
    }

    content_type_options {
      override = true
    }

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

# ---------------------------------------------------------------------------
# CloudFront Distribution
# ---------------------------------------------------------------------------
resource "aws_cloudfront_distribution" "this" {
  enabled         = true
  is_ipv6_enabled = true
  comment         = "ZenBots ${var.environment} frontend"
  price_class     = var.price_class
  # No default_root_object — the CloudFront Function handles "/" redirect to /login
  aliases             = [var.domain_name]
  web_acl_id          = var.web_acl_id

  # --- S3 Origin with OAC ---------------------------------------------------
  origin {
    domain_name              = var.s3_bucket_regional_domain_name
    origin_id                = "s3-${var.s3_bucket_id}"
    origin_access_control_id = aws_cloudfront_origin_access_control.this.id
  }

  # --- Default Cache Behavior (HTML pages) -----------------------------------
  default_cache_behavior {
    target_origin_id       = "s3-${var.s3_bucket_id}"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    cache_policy_id            = aws_cloudfront_cache_policy.default.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.auth_redirect.arn
    }
  }

  # --- Ordered Cache Behavior: _next/static/* (immutable assets) -------------
  ordered_cache_behavior {
    path_pattern           = "_next/static/*"
    target_origin_id       = "s3-${var.s3_bucket_id}"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    cache_policy_id            = aws_cloudfront_cache_policy.immutable.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id
  }

  # --- Custom Error Response: 403 -> 404 page --------------------------------
  custom_error_response {
    error_code            = 403
    response_code         = 404
    response_page_path    = "/404.html"
    error_caching_min_ttl = 60
  }

  # --- SSL / TLS --------------------------------------------------------------
  viewer_certificate {
    acm_certificate_arn      = var.acm_certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  # --- No Geo Restriction -----------------------------------------------------
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  tags = merge(var.tags, {
    Name = "${var.environment}-frontend-cdn"
  })
}
