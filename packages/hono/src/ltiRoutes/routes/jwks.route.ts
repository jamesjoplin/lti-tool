import { createRoute, type RouteHandler } from '@hono/zod-openapi';
import { type LTITool } from '@lti-tool/core';

/**
 * OpenAPI route definition for JWKS (JSON Web Key Set) endpoint.
 */
export const jwksRoute = createRoute({
  tags: ['jwks'],
  method: 'get',
  path: '/jwks',
  responses: {
    200: { description: 'LTI tool public keys in JWKS format' },
  },
});

/**
 * Creates a route handler for JWKS requests.
 * @param ltiTool - The LTI tool instance
 * @returns Route handler for JWKS endpoint
 */
export function jwksRouteHandler(ltiTool: LTITool): RouteHandler<typeof jwksRoute> {
  return async (c) => {
    return c.json(await ltiTool.getJWKS());
  };
}
