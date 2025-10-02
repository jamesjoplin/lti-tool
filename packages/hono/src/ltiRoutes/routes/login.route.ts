import { createRoute, type RouteHandler } from '@hono/zod-openapi';
import { LTI13LoginSchema, type LTITool } from '@lti-tool/core';

/**
 * OpenAPI route definition for LTI login endpoint.
 */
export const loginRoute = createRoute({
  tags: ['lti'],
  method: 'post',
  path: '/login',
  request: {
    body: {
      content: {
        'application/x-www-form-urlencoded': {
          schema: LTI13LoginSchema,
        },
      },
    },
  },
  responses: {
    302: {
      description: 'Redirect to LMS',
    },
  },
});

/**
 * Creates a route handler for LTI login requests.
 * @param ltiTool - The LTI tool instance
 * @param basePath - Base path for LTI routes
 * @returns Route handler for LTI login
 */
export function loginRouteHandler(
  ltiTool: LTITool,
  basePath: string,
): RouteHandler<typeof loginRoute> {
  return async (c) => {
    const params = c.req.valid('form');

    const baseUrl = new URL(c.req.url).origin;
    const launchUrl = new URL(`${basePath}/launch`, baseUrl);
    const authRedirectUrl = await ltiTool.handleLogin({
      ...params,
      launchUrl,
    });
    return c.redirect(authRedirectUrl);
  };
}
