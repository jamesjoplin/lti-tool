import { LTI13LaunchSchema, type LTIConfig } from '@lti-tool/core';
import { type Handler } from 'hono';

import { getLTITool } from '../../ltiTool';

/**
 * Creates a route handler for LTI launch requests.
 * @param config - The LTI config
 * @returns Route handler for LTI launch
 */
export function launchRouteHandler(config: LTIConfig): Handler {
  return async (c) => {
    const formData = await c.req.formData();
    const { id_token, state } = LTI13LaunchSchema.parse({
      id_token: formData.get('id_token'),
      state: formData.get('state'),
    });

    const ltiTool = getLTITool(config);
    const validated = await ltiTool.verifyLaunch(id_token, state);
    const session = await ltiTool.createSession(validated);

    const targetUrl = new URL(session.launch.target);
    targetUrl.searchParams.set('ltiSessionId', session.id);
    return c.redirect(targetUrl);
  };
}
