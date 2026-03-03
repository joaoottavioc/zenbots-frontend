output "distribution_id" {
  description = "The ID of the CloudFront distribution"
  value       = aws_cloudfront_distribution.this.id
}

output "distribution_arn" {
  description = "The ARN of the CloudFront distribution"
  value       = aws_cloudfront_distribution.this.arn
}

output "distribution_domain_name" {
  description = "The domain name of the CloudFront distribution (e.g., d111111abcdef8.cloudfront.net)"
  value       = aws_cloudfront_distribution.this.domain_name
}

output "distribution_hosted_zone_id" {
  description = "The CloudFront Route 53 zone ID (always Z2FDTNDATAQYW2)"
  value       = aws_cloudfront_distribution.this.hosted_zone_id
}

output "oac_id" {
  description = "The ID of the CloudFront Origin Access Control"
  value       = aws_cloudfront_origin_access_control.this.id
}
