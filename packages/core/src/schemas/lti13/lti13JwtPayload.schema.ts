import { z } from 'zod';

import { BaseJwtClaimsSchema } from './claims/baseJwtClaims.schema.js';
import { ContextSchema, ResourceLinkSchema } from './claims/contextClaims.schema.js';
import { CoreLtiClaimsSchema } from './claims/coreLtiClaims.schema.js';
import {
  LaunchPresentationSchema,
  LisSchema,
  ToolPlatformSchema,
} from './claims/platformClaims.schema.js';
import { PrivacyClaimsSchema } from './claims/privacyClaims.schema.js';
import {
  AgsEndpointSchema,
  DeepLinkingSettingsSchema,
  NrpsServiceSchema,
} from './claims/serviceClaims.schema.js';

export const LTI13JwtPayloadSchema = BaseJwtClaimsSchema.extend(PrivacyClaimsSchema.shape)
  .extend(CoreLtiClaimsSchema.shape)
  .extend({
    'https://purl.imsglobal.org/spec/lti/claim/resource_link': ResourceLinkSchema,
    'https://purl.imsglobal.org/spec/lti/claim/context': ContextSchema,
    'https://purl.imsglobal.org/spec/lti/claim/tool_platform': ToolPlatformSchema,
    'https://purl.imsglobal.org/spec/lti/claim/lis': LisSchema,
    'https://purl.imsglobal.org/spec/lti/claim/launch_presentation':
      LaunchPresentationSchema,
    'https://purl.imsglobal.org/spec/lti/claim/custom': z
      .record(z.string(), z.string())
      .optional(),
    'https://purl.imsglobal.org/spec/lti-ags/claim/endpoint': AgsEndpointSchema,
    'https://purl.imsglobal.org/spec/lti-nrps/claim/namesroleservice': NrpsServiceSchema,
    'https://purl.imsglobal.org/spec/lti-dl/claim/deep_linking_settings':
      DeepLinkingSettingsSchema,
  });

export type LTI13JwtPayload = z.infer<typeof LTI13JwtPayloadSchema>;
