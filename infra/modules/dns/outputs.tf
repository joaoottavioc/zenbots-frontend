output "fqdn" {
  description = "The fully qualified domain name of the DNS record"
  value       = aws_route53_record.website.fqdn
}
