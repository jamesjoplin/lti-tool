# @lti-tool/hono

<p align="center">Hono middleware for LTI 1.3. Serverless-optimized with automatic route handling.</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@lti-tool/hono"><img alt="npm" src="https://img.shields.io/npm/v/%40lti-tool%2Fhono" /></a>
</p>

## Quick Start

Create a new Hono app

```bash
npm create hono@latest
```

Install the packages

```bash
npm install @lti-tool/core @lti-tool/hono @lti-tool/memory
```

Create a minimal Hono powered LTI tool

```typescript
import { Hono } from 'hono';
import { LTITool } from '@lti-tool/core';
import { useLTI, secureLTISession } from '@lti-tool/hono';
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

const ltiTool = new LTITool({
  stateSecret: new TextEncoder().encode('your-secret'),
  keyPair,
  storage: new MemoryStorage(),
});

const app = new Hono();

// Add LTI routes (/login, /launch, /jwks)
app.route('/lti', useLTI(ltiTool.config));

// Protect routes with LTI session
app.use('/protected/*', secureLTISession(ltiTool.config));

app.get('/protected/content', (c) => {
  const session = c.get('ltiSession');
  return c.json({ message: `Hello ${session.user.name}!` });
});
```

## Features

- **Automatic Routes** - `/login`, `/launch`, `/jwks` endpoints
- **Session Protection** - Middleware for protected routes
- **Type Safety** - Full TypeScript support with Hono context
- **Error Handling** - Structured error responses
- **Serverless Ready** - Optimized for AWS Lambda, Cloudflare Workers

## API Reference

### useLTI(config)

Creates LTI route handlers for a Hono app.

**Routes Created:**

- `POST /login` - LTI login initiation
- `POST /launch` - LTI launch verification
- `GET /jwks` - Public key set

```typescript
import { useLTI } from '@lti-tool/hono';

app.route('/lti', useLTI(ltiTool.config));
```

### secureLTISession(config)

Middleware to protect routes with LTI session validation.

```typescript
import { secureLTISession } from '@lti-tool/hono';

app.use('/protected/*', secureLTISession(ltiTool.config));

app.get('/protected/grades', (c) => {
  const session = c.get('ltiSession'); // Typed LTISession
  // Handle authenticated request
});
```

## Context Extensions

The middleware extends Hono context with:

```typescript
interface HonoLTIContext {
  ltiSession: LTISession; // Available in protected routes
}
```

## Performance

Optimized for serverless:

- 3-5ms login handling
- 12-15ms launch verification
- Minimal cold start impact
