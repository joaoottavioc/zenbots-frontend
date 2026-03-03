###############################################################################
# DNS Module
# Creates a Route 53 alias A record pointing the custom domain to CloudFront.
###############################################################################

resource "aws_route53_record" "website" {
  zone_id = var.zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = var.cloudfront_domain_name
    zone_id                = var.cloudfront_hosted_zone_id
    evaluate_target_health = false
  }
}
