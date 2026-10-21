---
title: Examples
---

# Examples

Complete, deployable tools built from the published `@lti-tool/*` packages. Each example lives in its own folder in the repository, with its own `package.json` and lockfile, so you can copy the folder out and use it as a starting point.

## AWS Lambda + Hono + DynamoDB

[`examples/lambda-hono-dynamodb`](https://github.com/lti-tool/lti-tool/tree/main/examples/lambda-hono-dynamodb) deploys an LTI 1.3 tool to AWS Lambda behind an API Gateway HTTP API, using [`@lti-tool/hono`](https://docs.lti-tool.dev/modules/_lti-tool_hono.html) for the routes and [`@lti-tool/dynamodb`](https://docs.lti-tool.dev/modules/_lti-tool_dynamodb.html) for storage. One `apply` with Terraform or OpenTofu creates everything, and the output includes a registration URL you paste into Moodle's dynamic registration. The signing key and state secret are generated as ephemeral values and stored in Parameter Store without entering plan or state, which makes this example a concrete implementation of the [Key Management](./key-management.md) storage guidance.
