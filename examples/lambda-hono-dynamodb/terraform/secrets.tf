# The signing key and the state secret are generated as ephemeral values and
# written through write-only arguments, so neither appears in plan output or in
# state. Write-only arguments are sent only when value_wo_version changes, so
# the values regenerated on every run reach Parameter Store only on the first
# apply and after you bump var.secrets_version.

ephemeral "tls_private_key" "signing" {
  algorithm = "RSA"
  rsa_bits  = 2048
}

ephemeral "random_password" "state_secret" {
  length  = 64
  special = false
}

resource "aws_ssm_parameter" "private_key" {
  name             = "/${var.name_prefix}/private-key"
  description      = "LTI tool RSA signing key (PKCS#8 PEM)"
  type             = "SecureString"
  value_wo         = ephemeral.tls_private_key.signing.private_key_pem_pkcs8
  value_wo_version = var.secrets_version
  # key_id         = aws_kms_key.secrets.arn
}

resource "aws_ssm_parameter" "state_secret" {
  name             = "/${var.name_prefix}/state-secret"
  description      = "LTI tool OIDC state signing secret"
  type             = "SecureString"
  value_wo         = ephemeral.random_password.state_secret.result
  value_wo_version = var.secrets_version
  # key_id         = aws_kms_key.secrets.arn
}

# SECOPS GAP: without a key_id, both parameters are encrypted with the
# AWS-managed aws/ssm key. Its key policy lets any principal in the account that
# has ssm:GetParameter(s) on a parameter decrypt it, so read access to the
# parameter is the only control. A customer-managed key adds a second control:
# the key policy below lets only the function's role decrypt.
#
# To enable it (about $1/month):
#   1. Uncomment the data source and the key below.
#   2. Uncomment `key_id` on both parameters above.
#   3. Uncomment the kms:Decrypt statement in lambda.tf.
#   4. Bump var.secrets_version so the values are rewritten under the new key.

# data "aws_caller_identity" "current" {}
#
# resource "aws_kms_key" "secrets" {
#   description             = "${var.name_prefix} secret parameters"
#   enable_key_rotation     = true
#   deletion_window_in_days = 7
#
#   policy = jsonencode({
#     Version = "2012-10-17"
#     Statement = [
#       {
#         # Keeps the key manageable through IAM. Without it the key can become
#         # unmanageable. Scope it down to your administrators in production.
#         Sid       = "AccountAdministration"
#         Effect    = "Allow"
#         Principal = { AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root" }
#         Action    = "kms:*"
#         Resource  = "*"
#       },
#       {
#         Sid       = "FunctionDecrypt"
#         Effect    = "Allow"
#         Principal = { AWS = aws_iam_role.lambda.arn }
#         Action    = "kms:Decrypt"
#         Resource  = "*"
#       },
#     ]
#   })
# }
