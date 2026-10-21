terraform {
  # 1.11 is the first release of both Terraform and OpenTofu with ephemeral
  # resources and write-only arguments, which keep the secrets out of state.
  required_version = ">= 1.11"

  required_providers {
    aws = {
      source = "hashicorp/aws"
      # 6.37: aws_ssm_parameter.value_wo, and stable GSI key_schema blocks.
      version = "~> 6.37"
    }
    tls = {
      source = "hashicorp/tls"
      # ephemeral "tls_private_key"
      version = "~> 4.1"
    }
    random = {
      source = "hashicorp/random"
      # ephemeral "random_password"
      version = "~> 3.7"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.7"
    }
  }
}

provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Project    = "lti-tool"
      Example    = "lambda-hono-dynamodb"
      Repository = "https://github.com/lti-tool/lti-tool"
      ManagedBy  = "terraform"
    }
  }
}
