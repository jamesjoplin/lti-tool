import { type LTIConfig } from '@lti-tool/core';
import { type Handler } from 'hono';

import { getLTITool } from '../../ltiTool';

/**
 * Creates a route handler for JWKS requests.
 * @param config - The LTI config
 * @returns Route handler for JWKS endpoint
 */
export function jwksRouteHandler(config: LTIConfig): Handler {
  return async (c) => {
    const ltiTool = getLTITool(config);
    return c.json(await ltiTool.getJWKS());
  };
}
