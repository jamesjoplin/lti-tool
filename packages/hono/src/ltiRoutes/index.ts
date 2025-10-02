import { OpenAPIHono } from '@hono/zod-openapi';
import { type LTIConfig } from '@lti-tool/core';

import { getLTITool } from '../ltiTool';

import { deepLinkRoute, deepLinkRouteHandler } from './routes/deepLink.route';
import { jwksRoute, jwksRouteHandler } from './routes/jwks.route';
import { launchRoute, launchRouteHandler } from './routes/launch.route';
import { loginRoute, loginRouteHandler } from './routes/login.route';

/**
 * Creates a Hono app with LTI routes configured.
 * @param config - The LTI configuration object
 * @param basePath - Base path for LTI routes (defaults to '/lti')
 * @returns OpenAPIHono app with LTI routes configured
 */
export function useLTI(config: LTIConfig, basePath = '/lti'): OpenAPIHono {
  const app = new OpenAPIHono();
  const ltiTool = getLTITool(config);

  // routes
  app.openapi(deepLinkRoute, deepLinkRouteHandler(ltiTool)); // TODO - do we expose this?
  app.openapi(jwksRoute, jwksRouteHandler(ltiTool));
  app.openapi(launchRoute, launchRouteHandler(ltiTool));
  app.openapi(loginRoute, loginRouteHandler(ltiTool, basePath));

  return app;
}
