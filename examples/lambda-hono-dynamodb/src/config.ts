import { createPrivateKey, createPublicKey } from 'node:crypto';

import { GetParametersCommand, SSMClient } from '@aws-sdk/client-ssm';
import type { LTIConfig } from '@lti-tool/core';
import { DynamoDbStorage } from '@lti-tool/dynamodb';
import pino from 'pino';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

const baseUrl = requireEnv('BASE_URL');
const privateKeyParam = requireEnv('PRIVATE_KEY_PARAM');
const stateSecretParam = requireEnv('STATE_SECRET_PARAM');
const secretsVersion = requireEnv('SECRETS_VERSION');

// The @lti-tool packages log errors under `error`, which pino only serializes under `err`.
// Writes are synchronous because Lambda freezes the process once the response is sent,
// which would drop anything still buffered.
const logger = pino(
  {
    level: process.env.LOG_LEVEL ?? 'info',
    serializers: { error: pino.stdSerializers.err },
  },
  pino.destination({ dest: 1, sync: true }),
);

// Read both secrets once per cold start. Every instance reads the same values,
// so all instances publish one JWKS and accept each other's login state.
const ssm = new SSMClient();
const { Parameters = [], InvalidParameters = [] } = await ssm.send(
  new GetParametersCommand({
    Names: [privateKeyParam, stateSecretParam],
    WithDecryption: true,
  }),
);
if (InvalidParameters.length > 0) {
  throw new Error(`Parameters not found: ${InvalidParameters.join(', ')}`);
}
const parameterValue = (name: string): string => {
  const value = Parameters.find((p) => p.Name === name)?.Value;
  if (!value) {
    throw new Error(`Parameter ${name} has no value`);
  }
  return value;
};

// Only the private key is stored. The public key is derived from it, so there is
// no second parameter that could drift. getJWKS() exports the public key, so it
// must be extractable; the private key never needs to be.
const rs256 = { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' };
const privateKeyObject = createPrivateKey(parameterValue(privateKeyParam));
const keyPair: CryptoKeyPair = {
  privateKey: await crypto.subtle.importKey(
    'pkcs8',
    privateKeyObject.export({ type: 'pkcs8', format: 'der' }),
    rs256,
    false,
    ['sign'],
  ),
  publicKey: await crypto.subtle.importKey(
    'spki',
    createPublicKey(privateKeyObject).export({ type: 'spki', format: 'der' }),
    rs256,
    true,
    ['verify'],
  ),
};

export const ltiConfig: LTIConfig = {
  stateSecret: new TextEncoder().encode(parameterValue(stateSecretParam)),
  keyPair,
  storage: new DynamoDbStorage({
    controlPlaneTable: requireEnv('CONTROL_TABLE'),
    dataPlaneTable: requireEnv('DATA_TABLE'),
    launchConfigTable: requireEnv('LAUNCH_CONFIG_TABLE'),
    logger,
  }),
  logger,
  security: {
    // A new secrets_version writes a new key, so it gets a new kid. Never reuse a kid.
    keyId: `v${secretsVersion}`,
  },
  dynamicRegistration: {
    url: baseUrl,
    name: 'lti-tool Lambda example',
    description: 'Example LTI 1.3 tool built with @lti-tool/hono and @lti-tool/dynamodb',
  },
};
