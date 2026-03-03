variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
}

variable "s3_bucket_id" {
  description = "The ID/name of the S3 origin bucket"
  type        = string
}

variable "s3_bucket_arn" {
  description = "The ARN of the S3 origin bucket"
  type        = string
}

variable "s3_bucket_regional_domain_name" {
  description = "The regional domain name of the S3 origin bucket"
  type        = string
}

variable "domain_name" {
  description = "Custom domain name for the CloudFront distribution (e.g., dev.zenbotz.com.br)"
  type        = string
}

variable "acm_certificate_arn" {
  description = "ARN of the ACM certificate for the custom domain"
  type        = string
}

variable "price_class" {
  description = "CloudFront price class"
  type        = string
  default     = "PriceClass_100"
}

variable "web_acl_id" {
  description = "Optional WAF Web ACL ID to associate with the distribution"
  type        = string
  default     = null
}

variable "csp_policy" {
  description = "Content-Security-Policy header value"
  type        = string
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}
