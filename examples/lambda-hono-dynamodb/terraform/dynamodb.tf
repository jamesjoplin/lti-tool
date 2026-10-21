# The three tables @lti-tool/dynamodb expects. See packages/dynamodb/README.md
# for the item layout. Deletion protection is off so `destroy` cleans up.

# LMS clients and deployments. The adapter lists clients through GSI1.
resource "aws_dynamodb_table" "control" {
  name         = "${var.name_prefix}-control"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "pk"
  range_key    = "sk"

  attribute {
    name = "pk"
    type = "S"
  }

  attribute {
    name = "sk"
    type = "S"
  }

  attribute {
    name = "gsi1pk"
    type = "S"
  }

  attribute {
    name = "gsi1sk"
    type = "S"
  }

  global_secondary_index {
    # The adapter hardcodes this index name.
    name            = "GSI1"
    projection_type = "ALL"

    key_schema {
      attribute_name = "gsi1pk"
      key_type       = "HASH"
    }

    key_schema {
      attribute_name = "gsi1sk"
      key_type       = "RANGE"
    }
  }
}

# Sessions, nonces, and dynamic registration sessions, expired through TTL.
resource "aws_dynamodb_table" "data" {
  name         = "${var.name_prefix}-data"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "pk"
  range_key    = "sk"

  attribute {
    name = "pk"
    type = "S"
  }

  attribute {
    name = "sk"
    type = "S"
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }
}

# Issuer + client + deployment lookups on the launch path.
resource "aws_dynamodb_table" "launch_config" {
  name         = "${var.name_prefix}-launch-config"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "pk"
  range_key    = "sk"

  attribute {
    name = "pk"
    type = "S"
  }

  attribute {
    name = "sk"
    type = "S"
  }
}
