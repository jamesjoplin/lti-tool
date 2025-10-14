import { LTI13LoginSchema, type LTIConfig } from '@lti-tool/core';
import { type Handler } from 'hono';

import { getLTITool } from '../../ltiTool';

/**
 * Creates a route handler for LTI login requests.
 * @param config - The LTI config
 * @returns Route handler for LTI login
 */
export function loginRouteHandler(config: LTIConfig): Handler {
  return async (c) => {
    const formData = await c.req.formData();

    const params = LTI13LoginSchema.parse({
      iss: formData.get('iss'),
      login_hint: formData.get('login_hint'),
      target_link_uri: formData.get('target_link_uri'),
      client_id: formData.get('client_id'),
      lti_deployment_id: formData.get('lti_deployment_id'),
      lti_message_hint: formData.get('lti_message_hint') || undefined,
    });

    const ltiTool = getLTITool(config);
    const baseUrl = new URL(c.req.url).origin;
    const currentPath = new URL(c.req.url).pathname;
    const launchPath = currentPath.replace(/\/login$/, '/launch');
    const launchUrl = new URL(launchPath, baseUrl);

    const authRedirectUrl = await ltiTool.handleLogin({
      ...params,
      launchUrl,
    });

    return c.redirect(authRedirectUrl);
  };
}
