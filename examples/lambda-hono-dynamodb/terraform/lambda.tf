data "aws_iam_policy_document" "lambda_assume" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "lambda" {
  name               = "${var.name_prefix}-function"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume.json
}

data "aws_iam_policy_document" "lambda" {
  statement {
    sid       = "Logs"
    actions   = ["logs:CreateLogStream", "logs:PutLogEvents"]
    resources = ["${aws_cloudwatch_log_group.lambda.arn}:*"]
  }

  # Every call @lti-tool/dynamodb makes: no scans, batch, or transactional writes.
  statement {
    sid = "Tables"
    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:UpdateItem",
      "dynamodb:DeleteItem",
      "dynamodb:Query",
    ]
    resources = [
      aws_dynamodb_table.control.arn,
      "${aws_dynamodb_table.control.arn}/index/*",
      aws_dynamodb_table.data.arn,
      aws_dynamodb_table.launch_config.arn,
    ]
  }

  statement {
    sid     = "Secrets"
    actions = ["ssm:GetParameters"]
    resources = [
      aws_ssm_parameter.private_key.arn,
      aws_ssm_parameter.state_secret.arn,
    ]
  }

  # Needed only with the customer-managed key in secrets.tf. The aws/ssm key
  # needs no kms permission on the role.
  # statement {
  #   sid       = "DecryptSecrets"
  #   actions   = ["kms:Decrypt"]
  #   resources = [aws_kms_key.secrets.arn]
  # }
}

resource "aws_iam_role_policy" "lambda" {
  name   = "${var.name_prefix}-function"
  role   = aws_iam_role.lambda.id
  policy = data.aws_iam_policy_document.lambda.json
}

# Created here so it has a retention period. A log group Lambda creates on
# first invoke never expires.
resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${var.name_prefix}"
  retention_in_days = var.log_retention_days
}

# Run `npm ci && npm run build` in the example directory before plan or apply.
data "archive_file" "lambda" {
  type        = "zip"
  source_dir  = "${path.module}/../dist"
  output_path = "${path.module}/lambda.zip"
}

resource "aws_lambda_function" "app" {
  function_name    = var.name_prefix
  role             = aws_iam_role.lambda.arn
  runtime          = var.lambda_runtime
  architectures    = [var.lambda_architecture]
  handler          = "index.handler"
  filename         = data.archive_file.lambda.output_path
  source_code_hash = data.archive_file.lambda.output_base64sha256
  memory_size      = var.lambda_memory_mb
  timeout          = var.lambda_timeout_seconds

  logging_config {
    log_format = "Text"
    log_group  = aws_cloudwatch_log_group.lambda.name
  }

  environment {
    variables = {
      BASE_URL            = aws_apigatewayv2_api.http.api_endpoint
      CONTROL_TABLE       = aws_dynamodb_table.control.name
      DATA_TABLE          = aws_dynamodb_table.data.name
      LAUNCH_CONFIG_TABLE = aws_dynamodb_table.launch_config.name
      # Parameter names only. The function reads the values at cold start.
      PRIVATE_KEY_PARAM  = aws_ssm_parameter.private_key.name
      STATE_SECRET_PARAM = aws_ssm_parameter.state_secret.name
      # Changing secrets_version changes the function configuration, which
      # recycles warm instances still holding the old secrets.
      SECRETS_VERSION = tostring(var.secrets_version)
      NODE_OPTIONS    = "--enable-source-maps"
    }
  }

  # The role must be able to write logs and read secrets before the first invoke.
  depends_on = [aws_iam_role_policy.lambda]
}
