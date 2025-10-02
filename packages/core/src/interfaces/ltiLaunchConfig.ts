/**
 * Configuration required for LTI 1.3 launch authentication flow.
 * Contains platform endpoints and identifiers needed for OIDC authentication.
 */
export interface LTILaunchConfig {
  /** Platform issuer URL that uniquely identifies the LMS */
  iss: string;

  /** OAuth2 client identifier assigned to your tool by the platform */
  clientId: string;

  /** Deployment identifier within the platform context */
  deploymentId: string;

  /** Platform's OIDC authentication endpoint URL */
  authUrl: string;

  /** Platform's OAuth2 token endpoint URL for service access */
  tokenUrl: string;

  /** Platform's JSON Web Key Set endpoint URL for JWT verification */
  jwksUrl: string;
}
