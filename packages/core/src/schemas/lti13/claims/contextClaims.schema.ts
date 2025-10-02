import { z } from 'zod';

export const ResourceLinkSchema = z
  .object({
    id: z.string(),
    title: z.string().optional(),
  })
  .optional();

export const ContextSchema = z
  .object({
    id: z.string(),
    label: z.string().optional(),
    title: z.string().optional(),
  })
  .optional();
