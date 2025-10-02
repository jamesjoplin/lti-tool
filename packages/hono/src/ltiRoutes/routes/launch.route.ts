import { createRoute, type RouteHandler } from '@hono/zod-openapi';
import { LTI13LaunchSchema, type LTITool } from '@lti-tool/core';

/**
 * OpenAPI route definition for LTI launch endpoint.
 */
export const launchRoute = createRoute({
  tags: ['lti'],
  method: 'post',
  path: '/launch',
  request: {
    body: {
      content: {
        'application/x-www-form-urlencoded': {
          schema: LTI13LaunchSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Return launch content',
    },
  },
});

/**
 * Creates a route handler for LTI launch requests.
 * @param ltiTool - The LTI tool instance
 * @returns Route handler for LTI launch
 */
export function launchRouteHandler(ltiTool: LTITool): RouteHandler<typeof launchRoute> {
  return async (c) => {
    const { id_token, state } = c.req.valid('form');

    const validated = await ltiTool.verifyLaunch(id_token, state);
    const session = await ltiTool.createSession(validated);

    const targetUrl = new URL(session.launch.target);
    targetUrl.searchParams.set('ltiSessionId', session.id);
    return c.redirect(targetUrl);
  };
}
