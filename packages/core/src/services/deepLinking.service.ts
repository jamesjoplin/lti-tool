import { SignJWT } from 'jose';
import type { BaseLogger } from 'pino';

import type { LTISession } from '../interfaces/ltiSession.js';
import type { DeepLinkingContentItem } from '../schemas/lti13/deepLinking/contentItem.schema.js';

/**
 * Deep Linking service for LTI 1.3.
 * Generates signed JWT responses containing selected content items to return to the platform.
 *
 * @param keyPair - RSA key pair for signing client assertion JWTs (must be RS256 compatible)
 * @param keyId - Key identifier for JWT header, should match JWKS key ID (defaults to 'main')
 * @see https://www.imsglobal.org/spec/lti-dl/v2p0
 */
export class DeepLinkingService {
  constructor(
    private keyPair: CryptoKeyPair,
    private logger: BaseLogger,
    private keyId = 'main',
  ) {}

  /**
   * Creates a Deep Linking response with selected content items.
   * Generates a signed JWT and returns an HTML form that auto-submits to the platform.
   *
   * @param session - Active LTI session containing Deep Linking configuration
   * @param contentItems - Array of content items selected by the user
   * @returns HTML string containing auto-submit form
   * @throws {Error} When Deep Linking is not available for the session
   *
   * @example
   * ```typescript
   * const html = await deepLinkingService.createResponse(session, [
   *   {
   *     type: 'ltiResourceLink',
   *     title: 'Quiz 1',
   *     url: 'https://tool.example.com/quiz/1'
   *   }
   * ]);
   * // Returns HTML form that auto-submits to platform
   * ```
   */
  async createResponse(
    session: LTISession,
    contentItems: DeepLinkingContentItem[],
  ): Promise<string> {
    if (!session.services?.deepLinking) {
      throw new Error('Deep Linking not available for this session');
    }

    this.logger.debug(
      {
        contentItemCount: contentItems.length,
        returnUrl: session.services.deepLinking.returnUrl,
      },
      'Creating Deep Linking response',
    );

    const jwt = await this.createDeepLinkingJWT(session, contentItems);
    return this.generateAutoSubmitForm(session.services.deepLinking.returnUrl, jwt);
  }

  /**
   * Creates a signed JWT containing the Deep Linking response payload.
   *
   * @param session - Active LTI session with Deep Linking configuration
   * @param contentItems - Array of selected content items
   * @returns Signed JWT string
   */
  private async createDeepLinkingJWT(
    session: LTISession,
    contentItems: DeepLinkingContentItem[],
  ): Promise<string> {
    const deepLinking = session.services!.deepLinking!;

    const payload = {
      iss: session.platform.clientId,
      aud: session.platform.issuer,
      exp: Math.floor(Date.now() / 1000) + 600,
      iat: Math.floor(Date.now() / 1000),
      nonce: crypto.randomUUID(),
      'https://purl.imsglobal.org/spec/lti/claim/message_type': 'LtiDeepLinkingResponse',
      'https://purl.imsglobal.org/spec/lti/claim/version': '1.3.0',
      'https://purl.imsglobal.org/spec/lti/claim/deployment_id':
        session.platform.deploymentId,
      'https://purl.imsglobal.org/spec/lti-dl/claim/content_items': contentItems,
      'https://purl.imsglobal.org/spec/lti-dl/claim/data': deepLinking.data,
    };

    return await new SignJWT(payload)
      .setProtectedHeader({
        alg: 'RS256',
        typ: 'JWT',
        kid: this.keyId,
      })
      .sign(this.keyPair.privateKey);
  }

  /**
   * Generates an HTML form that auto-submits the Deep Linking response to the platform.
   *
   * @param returnUrl - Platform's Deep Linking return URL
   * @param jwt - Signed JWT containing the response
   * @returns HTML string with auto-submit form
   */
  private generateAutoSubmitForm(returnUrl: string, jwt: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <title>Returning to platform...</title>
</head>
<body>
  <form id="deepLinkingForm" method="POST" action="${returnUrl}">
    <input type="hidden" name="JWT" value="${jwt}" />
  </form>
  <script>
    document.getElementById('deepLinkingForm').submit();
  </script>
</body>
</html>`;
  }
}
