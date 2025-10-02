import type { LTIDeployment } from './ltiDeployment';

/**
 * Represents an LTI (Learning Tools Interoperability) platform configuration.
 * Contains all necessary endpoints and identifiers for LTI 1.3 integration.
 */
export interface LTIClient {
  /** Unique identifier for the client */
  id: string;
  /** human-readable name for the platform */
  name: string;
  /** Platform issuer (unique identifier) */
  iss: string;
  /** Your app's client ID on this platform */
  clientId: string;
  /** Platform's auth endpoint */
  authUrl: string;
  /** Platform's token endpoint */
  tokenUrl: string;
  /** Platform's JWKS endpoint */
  jwksUrl: string;
  /** Array of deployment IDs associated with this platform */
  deployments: LTIDeployment[];
}
