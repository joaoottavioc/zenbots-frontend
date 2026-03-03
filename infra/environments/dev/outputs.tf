output "cloudfront_distribution_id" {
  description = "The ID of the CloudFront distribution"
  value       = module.cloudfront.distribution_id
}

output "cloudfront_domain_name" {
  description = "The CloudFront domain name (e.g., d111111abcdef8.cloudfront.net)"
  value       = module.cloudfront.distribution_domain_name
}

output "s3_bucket_name" {
  description = "The name of the S3 bucket hosting the static files"
  value       = module.s3_hosting.bucket_id
}

output "website_url" {
  description = "The public URL of the website"
  value       = "https://${var.domain_name}"
}

output "dns_fqdn" {
  description = "The fully qualified domain name from the Route 53 record"
  value       = module.dns.fqdn
}
