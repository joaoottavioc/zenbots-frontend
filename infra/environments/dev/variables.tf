variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
}

variable "domain_name" {
  description = "Custom domain name for the frontend (e.g., dev.zenbotz.com.br)"
  type        = string
}

variable "acm_certificate_arn" {
  description = "ARN of the ACM certificate for the custom domain"
  type        = string
}

variable "route53_zone_id" {
  description = "Route 53 hosted zone ID for the domain"
  type        = string
}

variable "price_class" {
  description = "CloudFront price class (e.g., PriceClass_100, PriceClass_200, PriceClass_All)"
  type        = string
  default     = "PriceClass_100"
}

variable "api_base_url" {
  description = "Backend API base URL (used in CSP header)"
  type        = string
}

variable "web_acl_id" {
  description = "Optional WAF Web ACL ID to associate with the CloudFront distribution"
  type        = string
  default     = null
}
