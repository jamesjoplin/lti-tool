import * as z from 'zod';

export const DeploymentSchema = z.object({
  id: z.uuid().describe('Internal stable UUID for this deployment configuration'),
  deploymentId: z.string().min(1).describe('LMS-provided deployment identifier'),
  name: z
    .string()
    .min(1)
    .optional()
    .describe('Optional human-readable name for the deployment'),
  description: z.string().optional().describe('Optional description of the deployment'),
});
