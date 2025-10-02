import type { LTISession } from '../interfaces/ltiSession.js';
import type { LTI13JwtPayload } from '../schemas/index.js';

/**
 * Creates an LTI session object from a validated LTI 1.3 JWT payload.
 * Extracts user information, context data, and available services into a structured session.
 *
 * @param lti13JwtPayload - Validated LTI 1.3 JWT payload from successful launch
 * @returns Complete LTI session object with user, context, and service information
 */
// oxlint-disable-next-line max-lines-per-function
export function createSession(lti13JwtPayload: LTI13JwtPayload): LTISession {
  const roles = lti13JwtPayload['https://purl.imsglobal.org/spec/lti/claim/roles'] || [];
  const context = lti13JwtPayload['https://purl.imsglobal.org/spec/lti/claim/context'];
  const platform =
    lti13JwtPayload['https://purl.imsglobal.org/spec/lti/claim/tool_platform'];
  const resourceLink =
    lti13JwtPayload['https://purl.imsglobal.org/spec/lti/claim/resource_link'];
  const customClaims =
    lti13JwtPayload['https://purl.imsglobal.org/spec/lti/claim/custom'] || {};
  const agsEndpoint =
    lti13JwtPayload['https://purl.imsglobal.org/spec/lti-ags/claim/endpoint'];
  const nrpsService =
    lti13JwtPayload['https://purl.imsglobal.org/spec/lti-nrps/claim/namesroleservice'];
  const deepLinkingSettings =
    lti13JwtPayload['https://purl.imsglobal.org/spec/lti-dl/claim/deep_linking_settings'];

  const isInstructor = roles.some((role) => role.includes('Instructor'));
  const isStudent = roles.some((role) => role.includes('Learner'));
  const isAdmin = roles.some((role) => role.includes('Administrator'));

  const services: Record<string, unknown> = {};
  if (agsEndpoint) {
    services.ags = {
      lineitem: agsEndpoint.lineitem,
      lineitems: agsEndpoint.lineitems,
      scopes: agsEndpoint.scope || [],
    };
  }
  if (nrpsService) {
    services.nrps = {
      membershipUrl: nrpsService.context_memberships_url,
      versions: nrpsService.service_versions || [],
    };
  }
  if (deepLinkingSettings) {
    services.deepLinking = {
      returnUrl: deepLinkingSettings.deep_link_return_url,
      acceptTypes: deepLinkingSettings.accept_types || [],
      acceptPresentationDocumentTargets:
        deepLinkingSettings.accept_presentation_document_targets || [],
      acceptMediaTypes: deepLinkingSettings.accept_media_types,
      autoCreate: deepLinkingSettings.auto_create,
      data: deepLinkingSettings.data,
    };
  }

  // Extract simplified roles
  const simplifiedRoles: string[] = [];
  for (const role of roles) {
    if (role.includes('Instructor')) simplifiedRoles.push('instructor');
    if (role.includes('Learner')) simplifiedRoles.push('student');
    if (role.includes('Administrator')) simplifiedRoles.push('admin');
    if (role.includes('ContentDeveloper')) simplifiedRoles.push('content-developer');
    if (role.includes('Member')) simplifiedRoles.push('member');
  }

  // Remove duplicates
  const uniqueRoles = [...new Set(simplifiedRoles)];

  return {
    jwtPayload: lti13JwtPayload,
    id: crypto.randomUUID(),
    user: {
      id: lti13JwtPayload.sub,
      name: lti13JwtPayload.name,
      email: lti13JwtPayload.email,
      familyName: lti13JwtPayload.family_name,
      givenName: lti13JwtPayload.given_name,
      roles: uniqueRoles,
    },
    context: {
      id: context?.id || '',
      label: context?.label || context?.id || '',
      title: context?.title || '',
    },
    platform: {
      issuer: lti13JwtPayload.iss,
      clientId: Array.isArray(lti13JwtPayload.aud)
        ? lti13JwtPayload.aud[0]
        : lti13JwtPayload.aud,
      deploymentId:
        lti13JwtPayload['https://purl.imsglobal.org/spec/lti/claim/deployment_id'],
      name: platform?.name || lti13JwtPayload.iss,
    },
    launch: {
      target:
        lti13JwtPayload['https://purl.imsglobal.org/spec/lti/claim/target_link_uri'],
    },
    resourceLink: resourceLink
      ? {
          id: resourceLink.id,
          title: resourceLink.title,
        }
      : undefined,
    customParameters: customClaims,
    services: Object.keys(services).length > 0 ? services : undefined,
    isAdmin,
    isInstructor,
    isStudent,
    isAssignmentAndGradesAvailable: !!agsEndpoint,
    isDeepLinkingAvailable: !!deepLinkingSettings,
    isNameAndRolesAvailable: !!nrpsService,
  };
}
