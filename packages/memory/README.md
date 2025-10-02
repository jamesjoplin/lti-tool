# @lti-tool/memory

<p align="center">In-memory storage adapter for LTI 1.3. Perfect for development, testing, and proof of concept single-instance deployments.</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@lti-tool/memory"><img alt="npm" src="https://img.shields.io/npm/v/%40lti-tool%2Fmemory" /></a>
</p>

## Installation

```bash
npm install @lti-tool/memory
```

## Quick Start

```typescript
import { LTITool } from '@lti-tool/core';
import { MemoryStorage } from '@lti-tool/memory';

// Generate keypair (use proper key management in production)
const keyPair = await crypto.subtle.generateKey(
  {
    name: 'RSASSA-PKCS1-v1_5',
    modulusLength: 2048,
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: 'SHA-256',
  },
  true,
  ['sign', 'verify'],
);

const storage = new MemoryStorage();

const ltiTool = new LTITool({
  stateSecret: new TextEncoder().encode('your-secret'),
  keyPair,
  storage,
});
```

## Features

- **Zero Dependencies** - No external storage required
- **Fast Performance** - Sub-millisecond operations
- **Development Ready** - Perfect for local development
- **Auto-cleanup** - Expired nonces and sessions removed automatically

## Configuration

### Basic Usage

```typescript
const storage = new MemoryStorage();
```

### With Logger

```typescript
import pino from 'pino';

const storage = new MemoryStorage({
  logger: pino(),
});
```

## Limitations

- **No Persistence** - Data lost on restart
- **Single Instance** - Not suitable for multi-server deployments
- **Memory Usage** - All data stored in RAM
- **No Clustering** - Cannot share state across processes

## Performance

- **All operations**: <1ms
- **Memory efficient**: Automatic cleanup of expired data
- **No I/O blocking**: Synchronous operations
