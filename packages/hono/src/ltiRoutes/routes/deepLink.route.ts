import { type LTIConfig } from '@lti-tool/core';
import { type Handler } from 'hono';

import { getLTITool } from '../../ltiTool';

/**
 * Creates a route handler for LTI deep linking requests.
 * @param config - The LTI config
 * @returns Route handler for deep linking
 */
export function deepLinkRouteHandler(config: LTIConfig): Handler {
  return async (c) => {
    const { ltiSessionId } = c.req.query();

    const ltiTool = getLTITool(config);
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
