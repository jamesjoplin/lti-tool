/**
 * Represents a specific deployment of your LTI tool within a platform/LMS.
 * Each platform can have multiple deployments (e.g., different courses, contexts).
 */
export interface LTIDeployment {
  /** Internal stable UUID for this deployment configuration */
  id: string;

  /** LMS-provided deployment identifier used in LTI launch requests */
  deploymentId: string;

  /** Optional human-readable name for this deployment */
  name?: string;

  /** Optional description of what this deployment is used for */
  description?: string;
}
