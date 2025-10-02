import type { Logger } from 'pino';

import type { LTIStorage } from './ltiStorage.js';

/**
 * Configuration object for initializing an LTI Tool instance.
 * Contains cryptographic keys, secrets, and storage adapter.
 */
export interface LTIConfig {
  /** Secret key used for signing state JWTs during OIDC flow (minimum 32 bytes recommended) */
  stateSecret: Uint8Array;

  /** RSA key pair for signing JWTs and providing JWKS endpoint */
  keyPair: CryptoKeyPair;

  /** Storage adapter for persisting platforms, sessions, and nonces */
  storage: LTIStorage;

  /** Optional pino logger */
  logger?: Logger;

  /** Security configuration options */
  security?: {
    /** Key ID for JWKS and JWT signing (defaults to 'main') */
    keyId?: string;
    /** State JWT expiration time in seconds (defaults to 600 = 10 minutes) */
    stateExpirationSeconds?: number;
    /** Nonce expiration time in seconds (defaults to 600 = 10 minutes) */
    nonceExpirationSeconds?: number;
  };
}
