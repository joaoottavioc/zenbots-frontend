variable "zone_id" {
  description = "Route 53 hosted zone ID"
  type        = string
}

variable "domain_name" {
  description = "The DNS record name (e.g., dev.zenbotz.com.br)"
  type        = string
}

variable "cloudfront_domain_name" {
  description = "The domain name of the CloudFront distribution (e.g., d111111abcdef8.cloudfront.net)"
  type        = string
}

variable "cloudfront_hosted_zone_id" {
  description = "The Route 53 hosted zone ID for CloudFront (always Z2FDTNDATAQYW2)"
  type        = string
}
