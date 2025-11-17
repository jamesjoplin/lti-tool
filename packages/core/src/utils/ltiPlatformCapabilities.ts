import type { OpenIDConfiguration } from '../schemas';

/**
 * Checks if an LTI platform supports Assignment and Grade Services (AGS).
 * Examines the platform's OpenID configuration for AGS-related OAuth scopes.
 *
 * @param config - Platform's OpenID Connect configuration from discovery endpoint
 * @returns True if the platform supports any AGS scopes, false otherwise
 *
 * @example
 * ```typescript
 * if (hasAGSSupport(platformConfig)) {
 *   // Show AGS checkbox in registration form
 *   // Enable grade passback functionality
 * }
 * ```
 */
export function hasAGSSupport(config: OpenIDConfiguration): boolean {
  return (
    config.scopes_supported?.some((scope) => scope.includes('lti-ags/scope')) ?? false
  );
}

/**
 * Checks if an LTI platform supports Names and Role Provisioning Services (NRPS).
 * Examines the platform's OpenID configuration for NRPS-related OAuth scopes.
 *
 * @param config - Platform's OpenID Connect configuration from discovery endpoint
 * @returns True if the platform supports any NRPS scopes, false otherwise
 *
 * @example
 * ```typescript
 * if (hasNRPSSupport(platformConfig)) {
 *   // Show NRPS checkbox in registration form
 *   // Enable roster access functionality
 * }
 * ```
 */
export function hasNRPSSupport(config: OpenIDConfiguration): boolean {
  return (
    config.scopes_supported?.some((scope) => scope.includes('lti-nrps/scope')) ?? false
  );
}

/**
 * Checks if an LTI platform supports Deep Linking for content selection.
 * Examines the platform's LTI configuration for supported message types.
 *
 * @param config - Platform's OpenID Connect configuration from discovery endpoint
 * @returns True if the platform supports LtiDeepLinkingRequest messages, false otherwise
 *
 * @example
 * ```typescript
 * if (hasDeepLinkingSupport(platformConfig)) {
 *   // Show Deep Linking checkbox in registration form
 *   // Enable content selection functionality
 * }
 * ```
 */
export function hasDeepLinkingSupport(config: OpenIDConfiguration): boolean {
  const ltiConfig = config['https://purl.imsglobal.org/spec/lti-platform-configuration'];
  return (
    ltiConfig?.messages_supported?.some((msg) => msg.type === 'LtiDeepLinkingRequest') ??
    false
  );
}

/**
 * Extracts all Assignment and Grade Services (AGS) scopes supported by the platform.
 * Filters the platform's supported scopes to return only AGS-related scope URIs.
 *
 * @param config - Platform's OpenID Connect configuration from discovery endpoint
 * @returns Array of AGS scope URIs supported by the platform (e.g., lineitem, score, result.readonly)
 *
 * @example
 * ```typescript
 * const agsScopes = getAGSScopes(platformConfig);
 * // Returns: ['https://purl.imsglobal.org/spec/lti-ags/scope/lineitem', ...]
 * console.log('Available AGS scopes:', agsScopes.join(', '));
 * ```
 */
export function getAGSScopes(config: OpenIDConfiguration): string[] {
  return (
    config.scopes_supported?.filter((scope) => scope.includes('lti-ags/scope')) ?? []
  );
}
