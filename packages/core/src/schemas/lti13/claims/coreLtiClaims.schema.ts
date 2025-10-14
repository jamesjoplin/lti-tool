import * as z from 'zod';

export const CoreLtiClaimsSchema = z.object({
  'https://purl.imsglobal.org/spec/lti/claim/message_type': z.union([
    z.literal('LtiResourceLinkRequest'),
    z.literal('LtiDeepLinkingRequest'),
  ]),
  'https://purl.imsglobal.org/spec/lti/claim/version': z.literal('1.3.0'),
  'https://purl.imsglobal.org/spec/lti/claim/deployment_id': z.string(),
  'https://purl.imsglobal.org/spec/lti/claim/target_link_uri': z.string(),
  'https://purl.imsglobal.org/spec/lti/claim/roles': z.array(z.string()).optional(),
});
