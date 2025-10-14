import * as z from 'zod';

export const ToolPlatformSchema = z
  .object({
    guid: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    url: z.string().optional(),
    product_family_code: z.string().optional(),
    contact_email: z.string().optional(),
    version: z.string().optional(),
  })
  .optional();

export const LaunchPresentationSchema = z
  .object({
    target: z.string().optional(),
    url: z.string().optional(),
    locale: z.string().optional(),
  })
  .optional();

export const LisSchema = z
  .object({
    person_sourcedid: z.string().optional(),
  })
  .optional();
