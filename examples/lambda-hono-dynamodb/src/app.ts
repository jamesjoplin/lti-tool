import type { LTISession } from '@lti-tool/core';
import {
  completeDynamicRegistrationRouteHandler,
  initiateDynamicRegistrationRouteHandler,
  jwksRouteHandler,
  launchRouteHandler,
  loginRouteHandler,
  secureLTISession,
  type LTIContextVariables,
} from '@lti-tool/hono';
import { Hono } from 'hono';
import { html } from 'hono/html';
import type { HtmlEscapedString } from 'hono/utils/html';

import { ltiConfig } from './config.js';

export const app = new Hono<{ Variables: LTIContextVariables }>();

app.on(['GET', 'POST'], '/lti/login', loginRouteHandler(ltiConfig));
app.post('/lti/launch', launchRouteHandler(ltiConfig));
app.get('/lti/jwks', jwksRouteHandler(ltiConfig));

// The initiate form posts to its own path plus `/complete`.
app.get('/lti/register', initiateDynamicRegistrationRouteHandler(ltiConfig));
app.post('/lti/register/complete', completeDynamicRegistrationRouteHandler(ltiConfig));

// Dynamic registration registers the base URL as target_link_uri, so launches land
// here with ?ltiSessionId=… and are forwarded to the protected page.
app.get('/', (c) => c.redirect(`/app${new URL(c.req.url).search}`));

app.get('/app', secureLTISession(ltiConfig), (c) =>
  c.html(debugPage(c.get('ltiSession'))),
);

type Section = [heading: string, rows: [label: string, value: string | undefined][]];

// Only identifying details are shown. Tokens and the raw JWT payload are deliberately left out.
function debugSections({
  user,
  context,
  platform,
  launch,
  resourceLink,
}: LTISession): Section[] {
  return [
    [
      'User',
      [
        ['ID', user.id],
        ['Name', user.name],
        ['Email', user.email],
        ['Roles', user.roles.join('\n')],
      ],
    ],
    [
      'Context',
      [
        ['ID', context.id],
        ['Label', context.label],
        ['Title', context.title],
      ],
    ],
    [
      'Platform',
      [
        ['Name', platform.name],
        ['Issuer', platform.issuer],
        ['Client ID', platform.clientId],
        ['Deployment ID', platform.deploymentId],
      ],
    ],
    [
      'Launch',
      [
        ['Target', launch.target],
        ['Resource link', resourceLink?.title ?? resourceLink?.id],
      ],
    ],
  ];
}

// The html helper escapes every interpolated value.
function debugPage(session: LTISession): HtmlEscapedString | Promise<HtmlEscapedString> {
  return html`<!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>LTI launch</title>
        <style>
          body {
            font-family: system-ui, sans-serif;
            margin: 2rem;
            line-height: 1.5;
          }
          th {
            text-align: left;
            padding-right: 1.5rem;
            vertical-align: top;
          }
          td {
            white-space: pre-line;
            word-break: break-all;
          }
        </style>
      </head>
      <body>
        <h1>Launch succeeded</h1>
        ${debugSections(session).map(
          ([heading, rows]) => html`
            <h2>${heading}</h2>
            <table>
              ${rows.map(
                ([label, value]) =>
                  html`<tr>
                    <th>${label}</th>
                    <td>${value ?? '-'}</td>
                  </tr>`,
              )}
            </table>
          `,
        )}
      </body>
    </html>`;
}
