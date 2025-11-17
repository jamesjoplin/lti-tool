import * as z from 'zod';

export const RegistrationRequestSchema = z.object({
  openid_configuration: z.url(),
  registration_token: z.string().optional(),
});

export type RegistrationRequest = z.infer<typeof RegistrationRequestSchema>;
