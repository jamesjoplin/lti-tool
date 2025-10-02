import { z } from 'zod';

/**
 * Zod schema for validating LTI content requests.
 */
export const LTIContentRequestSchema = z.object({
  ltiSessionId: z.uuid(), // Validates it's a proper UUID
});

/**
 * Type representing a validated LTI content request.
 */
export type LTIContentRequest = z.infer<typeof LTIContentRequestSchema>;
