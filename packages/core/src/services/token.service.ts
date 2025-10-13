import { SignJWT } from 'jose';

/**
 * Service for handling OAuth2 client credentials flow and JWT client assertions.
 * Used for obtaining bearer tokens to access LTI Advantage services (AGS, NRPS, etc.).
 *
 * Implements RFC 7523 (JWT Profile for OAuth 2.0 Client Authentication and Authorization Grants)
 * as required by LTI 1.3 security framework.
 */
export class TokenService {
  /**
   * Creates a new TokenService instance.
   *
   * @param keyPair - RSA key pair for signing client assertion JWTs (must be RS256 compatible)
   * @param keyId - Key identifier for JWT header, should match JWKS key ID (defaults to 'main')
   */
  constructor(
    private keyPair: CryptoKeyPair,
    private keyId = 'main',
  ) {}

  /**
   * Creates a JWT client assertion for OAuth2 client credentials flow.
   *
   * @param clientId - OAuth2 client identifier
   * @param tokenUrl - Platform's token endpoint URL
   * @returns Signed JWT client assertion
   */
  async createClientAssertion(clientId: string, tokenUrl: string): Promise<string> {
    return await new SignJWT({
      iss: clientId,
      sub: clientId,
      aud: tokenUrl,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 300,
      jti: crypto.randomUUID(),
    })
      .setProtectedHeader({
        alg: 'RS256',
        kid: this.keyId,
        typ: 'JWT',
      })
      .sign(this.keyPair.privateKey);
  }

  /**
   * Obtains an OAuth2 bearer token using client credentials flow with JWT assertion.
   *
   * @param clientId - OAuth2 client identifier
   * @param tokenUrl - Platform's token endpoint URL
   * @param scope - Requested OAuth2 scope (e.g., AGS score scope)
   * @returns Bearer access token for API calls
   */
  async getBearerToken(
    clientId: string,
    tokenUrl: string,
    scope: string,
  ): Promise<string> {
    const assertion = await this.createClientAssertion(clientId, tokenUrl);

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
        client_assertion: assertion,
        scope,
      }),
    });

    if (!response.ok) {
      const errorDetail = await response.text();
      throw new Error(
        `Token request failed: ${response.status} ${response.statusText} ${errorDetail}`,
      );
    }

    const tokenData = await response.json();

    if (!tokenData.access_token) {
      throw new Error('Token response missing access_token');
    }

    return tokenData.access_token;
  }
}
