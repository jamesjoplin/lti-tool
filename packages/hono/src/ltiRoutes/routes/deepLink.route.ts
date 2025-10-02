import { createRoute, type RouteHandler } from '@hono/zod-openapi';
import { type LTITool } from '@lti-tool/core';

import { LTIContentRequestSchema } from '../../schemas/ltiContentRequest.schema';

/**
 * OpenAPI route definition for LTI deep linking endpoint.
 */
export const deepLinkRoute = createRoute({
  tags: ['lti'],
  method: 'get',
  path: '/deepLinking',
  request: {
    query: LTIContentRequestSchema,
  },
  responses: {
    200: { description: 'LTI protected content' },
    403: { description: 'Session not found' },
  },
});

/**
 * Creates a route handler for LTI deep linking requests.
 * @param ltiTool - The LTI tool instance
 * @returns Route handler for deep linking
 */
export function deepLinkRouteHandler(
  ltiTool: LTITool,
): RouteHandler<typeof deepLinkRoute> {
  return async (c) => {
    const { ltiSessionId } = c.req.valid('query');

    const session = await ltiTool.getSession(ltiSessionId);
    if (!session) {
      return c.text('no session found', 403);
    }
    const { jwtPayload: _jwtPayload, ...sessionForDebug } = session;

    return c.html(
      `<h1>Hello ${sessionForDebug.user.name}!</h1><h2>This was a deep link launch!</h2><p>Your session id is ${ltiSessionId} and here's an LTI session payload: <pre>${JSON.stringify(sessionForDebug, null, 2)}</pre>`,
    );
  };
}
