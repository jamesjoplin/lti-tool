import { z } from 'zod';

export const PrivacyClaimsSchema = z.object({
  given_name: z.string(),
  family_name: z.string(),
  name: z.string(),
  email: z.string(),
});
