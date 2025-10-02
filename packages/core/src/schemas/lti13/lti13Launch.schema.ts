import { z } from 'zod';

export const LTI13LaunchSchema = z.object({
  id_token: z.jwt(),
  state: z.string(),
});

/**
 * Schema for verifyLaunch method parameters - uses consistent camelCase naming
 * for method parameters while LTI13LaunchSchema uses spec-compliant snake_case
 */
export const VerifyLaunchParamsSchema = z.object({
  idToken: z.string().min(1, 'idToken is required'),
  state: z.string().min(1, 'state is required'),
});
