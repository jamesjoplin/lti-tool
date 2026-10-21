# @lti-tool/dynamodb

<p align="center">Production-ready DynamoDB storage adapter for LTI 1.3. Includes caching and optimized for AWS Lambda.</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@lti-tool/dynamodb"><img alt="npm" src="https://img.shields.io/npm/v/%40lti-tool%2Fdynamodb" /></a>
</p>

## Installation

```bash
npm install @lti-tool/dynamodb
```

## Quick Start

```typescript
import { LTITool } from '@lti-tool/core';
import { DynamoDbStorage } from '@lti-tool/dynamodb';

const storage = new DynamoDbStorage({
  controlPlaneTable: 'lti-tool-control',
  dataPlaneTable: 'lti-tool-data',
  launchConfigTable: 'lti-tool-launch-config',
  logger: pino('dynamodb-storage'), // optional pino logger
});

const ltiTool = new LTITool({
  stateSecret: new TextEncoder().encode('your-secret'),
  keyPair: await generateKeyPair(), // generate secure keypair
  storage,
});
```

## Features

- **Production Ready** - Handles high-scale LTI deployments
- **Built-in Caching** - LRU cache for frequently accessed data
- **Three-Table Design** - Optimized access patterns
- **Auto-cleanup** - Expired nonces and sessions removed automatically
- **AWS Optimized** - Works seamlessly with Lambda and IAM roles

## API Reference

- [API Reference](https://docs.lti-tool.dev/modules/_lti-tool_dynamodb.html) - Complete API documentation

## Configuration

### Basic Setup

```typescript
const storage = new DynamoDbStorage({
  controlPlaneTable: 'lti-tool-control', // LMS configurations
  dataPlaneTable: 'lti-tool-data', // nonce and session storage, with ttl
  launchConfigTable: 'lti-tool-launch-config', // LMS client and deployment lookup for optimized critical launch path performance
});
```

## Table Schema

Three-table design optimized for different access patterns:

### Control Plane Table (`lti-tool-control`)

Stores LMS client and deployment configurations.

| Attribute | Type   | Description                    |
| --------- | ------ | ------------------------------ |
| `pk`      | String | `C#<clientId>`                 |
| `sk`      | String | `#` (client) or `D#<deployId>` |
| `gsi1pk`  | String | `Type#Client` (for listing)    |
| `gsi1sk`  | String | `#<clientId>`                  |

### Data Plane Table (`lti-tool-data`)

Stores sessions and nonces with automatic TTL cleanup.

| Attribute   | Type   | Description                               |
| ----------- | ------ | ----------------------------------------- |
| `pk`        | String | `S#<sessionId>` or `N#<nonce>`            |
| `sk`        | String | Same as pk                                |
| `expiresAt` | String | Expiration timestamp for nonce validation |
| `usedAt`    | String | Present after nonce consumption           |
| `ttl`       | Number | TTL for auto cleanup                      |

### Launch Config Table (`lti-tool-launch-config`)

Optimized for fast LTI launch lookups.

| Attribute | Type   | Description        |
| --------- | ------ | ------------------ |
| `pk`      | String | `<iss>#<clientId>` |
| `sk`      | String | `<deploymentId>`   |

## IAM Permissions

Required DynamoDB permissions for all three tables:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query"
      ],
      "Resource": [
        "arn:aws:dynamodb:*:*:table/lti-tool-control",
        "arn:aws:dynamodb:*:*:table/lti-tool-control/index/*",
        "arn:aws:dynamodb:*:*:table/lti-tool-data",
        "arn:aws:dynamodb:*:*:table/lti-tool-launch-config"
      ]
    }
  ]
}
```

## Performance

- **Cached reads**: ~1ms average
- **Cache misses**: ~5ms average
- **Writes**: ~3ms average

## Deployment

### Terraform / OpenTofu

The [Lambda + Hono + DynamoDB example](https://github.com/lti-tool/lti-tool/tree/main/examples/lambda-hono-dynamodb) maintains the table definitions in [`terraform/dynamodb.tf`](https://github.com/lti-tool/lti-tool/blob/main/examples/lambda-hono-dynamodb/terraform/dynamodb.tf), alongside a least-privilege IAM policy and a complete Lambda deployment.
