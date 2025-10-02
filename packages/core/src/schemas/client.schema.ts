import { z } from 'zod';

import { DeploymentSchema } from './deployment.schema';

export const ClientSchema = z.object({
  id: z.uuid().describe('Internal stable UUID for the client'),
  name: z.string().min(1).describe('human-readable name for the platform'),
  iss: z.url().describe('Platform issuer (unique identifier)'),
  clientId: z.string().min(1).describe("Your app's client ID on this platform"),
  authUrl: z.url().describe("Platform's auth endpoint"),
  tokenUrl: z.url().describe("Platform's token endpoint"),
  jwksUrl: z.url().describe("Platform's JWKS endpoint"),
  deployments: z.array(DeploymentSchema),
});

export const AddClientSchema = ClientSchema.omit({ id: true, deployments: true });
export const UpdateClientSchema = ClientSchema.omit({ id: true, deployments: true });
