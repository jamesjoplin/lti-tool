/**
 * JSON Web Key Set (JWKS) structure as defined by RFC 7517.
 * Used to expose public keys for JWT signature verification.
 */
export interface JWKS {
  /** Array of JSON Web Key (JWK) objects */
  keys: Array<{
    /** Key usage - typically 'sig' for signature verification */
    use: string;

    /** Algorithm intended for use with this key - typically 'RS256' for LTI */
    alg: string;

    /** Key identifier used to match keys in JWT headers */
    kid: string;

    /** Additional JWK parameters (kty, n, e, etc.) as defined by RFC 7517 */
    [key: string]: unknown;
  }>;
}
