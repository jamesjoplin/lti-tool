import type { OpenIDConfiguration } from '../schemas/lti13/dynamicRegistration/openIDConfiguration.schema';

/**
 * Temporary session data stored during LTI 1.3 dynamic registration flow.
 * Used to maintain state between the registration initiation and completion steps.
 */
export interface LTIDynamicRegistrationSession {
  /** Platform's OpenID Connect configuration retrieved during registration initiation */
  openIdConfiguration: OpenIDConfiguration;
  /** Registration token provided by the platform for this registration attempt */
  registrationToken?: string;
  /** Unix timestamp (milliseconds) when this session expires and should be cleaned up */
  expiresAt: number;
}
