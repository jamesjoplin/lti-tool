import * as z from 'zod';

export const LTI13LoginSchema = z.object({
  iss: z.string().min(1),
  login_hint: z.string().min(1),
  target_link_uri: z.url(),
  client_id: z.string().min(1),
  lti_deployment_id: z.string().min(1),
  lti_message_hint: z.string().optional(),
});

/**
 * Schema for handleLogin method parameters - extends LTI13LoginSchema
 * with the additional launchUrl parameter needed for method calls
 */
export const HandleLoginParamsSchema = LTI13LoginSchema.extend({
  launchUrl: z.union([z.url(), z.instanceof(URL)]),
});
