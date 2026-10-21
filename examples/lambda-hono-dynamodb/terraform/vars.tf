variable "region" {
  description = "AWS region to deploy into."
  type        = string
  default     = "us-east-2"
}

variable "name_prefix" {
  description = "Prefix for every resource name. Change it to deploy a second copy into the same account."
  type        = string
  default     = "lti-tool-lambda-hono-dynamodb"

  validation {
    # 40 characters plus the longest suffix (-launch-config) stays under the
    # 64-character limit on IAM role and Lambda function names.
    condition     = can(regex("^[a-z][a-z0-9-]{1,38}[a-z0-9]$", var.name_prefix))
    error_message = "name_prefix must be 3-40 lowercase letters, digits, or hyphens, start with a letter, and not end with a hyphen."
  }
}

variable "lambda_runtime" {
  description = "Lambda Node.js runtime. When you change it, change `target` in ../esbuild.mjs to match (for example nodejs26.x and node26)."
  type        = string
  default     = "nodejs24.x"
}

variable "lambda_architecture" {
  description = "Lambda instruction set architecture: arm64 or x86_64."
  type        = string
  default     = "arm64"
}

variable "lambda_memory_mb" {
  description = "Lambda memory in MB. CPU scales with memory, so this also sets cold-start speed."
  type        = number
  default     = 512
}

variable "lambda_timeout_seconds" {
  description = "Lambda timeout in seconds."
  type        = number
  default     = 10
}

variable "log_retention_days" {
  description = "How long CloudWatch keeps the function's logs."
  type        = number
  default     = 14
}

variable "throttle_burst_limit" {
  description = "API Gateway burst limit for the default route. Bounds cost on a public endpoint."
  type        = number
  default     = 20
}

variable "throttle_rate_limit" {
  description = "API Gateway steady-state requests per second for the default route."
  type        = number
  default     = 10
}

variable "secrets_version" {
  description = "Increment to generate and store a new private key and state secret. This replaces the old values immediately, with no overlap (revocation-style)."
  type        = number
  default     = 1
}
