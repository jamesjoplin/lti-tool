import type { LTISession } from '../interfaces/ltiSession.js';
import type { LTI13JwtPayload } from '../schemas/index.js';

const ROLE_MAPPINGS: Record<string, string> = {
  Instructor: 'instructor',
  Learner: 'student',
  Administrator: 'admin',
  ContentDeveloper: 'content-developer',
  Member: 'member',
};

/**
 * Creates an LTI session object from a validated LTI 1.3 JWT payload.
 * Extracts user information, context data, and available services into a structured session.
 *
 * @param lti13JwtPayload - Validated LTI 1.3 JWT payload from successful launch
 * @returns Complete LTI session object with user, context, and service information
 */
// oxlint-disable-next-line max-lines-per-function complexity -- flat data mapping
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

  const isInstructor = hasRole(roles, 'Instructor');
  const isStudent = hasRole(roles, 'Learner');
  const isAdmin = hasRole(roles, 'Administrator');

  const services: Record<string, unknown> = {};
  if (agsEndpoint) {
    let lineItemUrl: string | undefined;
    if (agsEndpoint.lineitem) {
      const url = new URL(agsEndpoint.lineitem);
      lineItemUrl = `${url.origin}${url.pathname}`; // quirk: moodle adds a url search param
    }
    services.ags = {
      lineitem: lineItemUrl,
      lineitems: agsEndpoint.lineitems, // quirk: keep the moodle url search param
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
  const simplifiedRoles = simplifyRoles(roles);

  return {
    jwtPayload: lti13JwtPayload,
    id: crypto.randomUUID(),
    user: {
      id: lti13JwtPayload.sub,
      name: lti13JwtPayload.name,
      email: lti13JwtPayload.email,
      familyName: lti13JwtPayload.family_name,
      givenName: lti13JwtPayload.given_name,
      roles: simplifiedRoles,
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

function simplifyRoles(roles: string[]): string[] {
  const simplified = new Set<string>();
  for (const role of roles) {
    for (const [key, value] of Object.entries(ROLE_MAPPINGS)) {
      if (role.includes(key)) {
        simplified.add(value);
      }
    }
  }
  return [...simplified];
}

function hasRole(roles: string[], pattern: string): boolean {
  return roles.some((role) => role.includes(pattern));
}
