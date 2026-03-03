terraform {
  backend "s3" {
    bucket         = "zenbots-terraform-state"
    key            = "frontend-dev/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "zenbots-terraform-locks"
    encrypt        = true
  }
}
