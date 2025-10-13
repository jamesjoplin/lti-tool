import type { BaseLogger } from 'pino';

import type { LTISession } from '../interfaces/ltiSession.js';
import type { LTIStorage } from '../interfaces/ltiStorage.js';
import type { ScoreSubmission } from '../schemas/lti13/ags/scoreSubmission.schema.js';
import { getValidLaunchConfig } from '../utils/launchConfigValidation.js';

import type { TokenService } from './token.service.js';

/**
 * Assignment and Grade Services (AGS) implementation for LTI 1.3.
 * Provides methods to submit grades and scores back to the platform.
 *
 * @see https://www.imsglobal.org/spec/lti-ags/v2p0
 */
export class AGSService {
  constructor(
    private tokenService: TokenService,
    private storage: LTIStorage,
    private logger: BaseLogger,
  ) {}

  /**
   * Submits a grade score to the platform using LTI Assignment and Grade Services.
   *
   * @param session - Active LTI session containing AGS endpoint configuration
   * @param score - Score submission data including grade value and metadata
   * @returns Promise resolving to the HTTP response from the platform
   * @throws {Error} When AGS is not available for the session or submission fails
   *
   * @example
   * ```typescript
   * await agsService.submitScore(session, {
   *   scoreGiven: 85,
   *   scoreMaximum: 100,
   *   comment: 'Great work!',
   *   activityProgress: 'Completed',
   *   gradingProgress: 'FullyGraded'
   * });
   * ```
   */
  async submitScore(session: LTISession, score: ScoreSubmission): Promise<Response> {
    if (!session.services?.ags?.lineitem) {
      throw new Error('AGS not available for this session');
    }

    // Get launch config to access token URL
    const launchConfig = await getValidLaunchConfig(
      this.storage,
      session.platform.issuer,
      session.platform.clientId,
      session.platform.deploymentId,
    );

    const token = await this.tokenService.getBearerToken(
      session.platform.clientId,
      // Need to get token URL from platform storage
      launchConfig.tokenUrl,
      'https://purl.imsglobal.org/spec/lti-ags/scope/score',
    );

    const scorePayload = {
      userId: score.userId,
      scoreGiven: score.scoreGiven,
      scoreMaximum: score.scoreMaximum,
      comment: score.comment,
      timestamp: score.timestamp || new Date().toISOString(),
      activityProgress: score.activityProgress,
      gradingProgress: score.gradingProgress,
    };

    const response = await fetch(`${session.services.ags.lineitem}/scores`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/vnd.ims.lis.v1.score+json',
      },
      body: JSON.stringify(scorePayload),
    });

    if (!response.ok) {
      const error = await response.json();
      this.logger.error(
        { error, status: response.status, statusText: response.statusText },
        'AGS score submission failed',
      );
      throw new Error(`AGS score submission failed: ${response.statusText}`);
    }

    return response;
  }

  /**
   * Retrieves line items (gradebook columns) from the platform using Assignment and Grade Services.
   *
   * @param session - Active LTI session containing AGS line items endpoint configuration
   * @returns Promise resolving to the HTTP response containing line items data
   * @throws {Error} When AGS line items service is not available for the session or request fails
   *
   * @example
   * ```typescript
   * const response = await agsService.listLineItems(session);
   * const lineItems = await response.json();
   * console.log('Available gradebook columns:', lineItems);
   * ```
   */
  async listLineItems(session: LTISession): Promise<Response> {
    if (!session.services?.ags?.lineitems) {
      throw new Error('AGS list line items not available for this session');
    }

    // Get launch config to access token URL
    const launchConfig = await getValidLaunchConfig(
      this.storage,
      session.platform.issuer,
      session.platform.clientId,
      session.platform.deploymentId,
    );

    const token = await this.tokenService.getBearerToken(
      session.platform.clientId,
      // Need to get token URL from platform storage
      launchConfig.tokenUrl,
      'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly',
    );

    const response = await fetch(`${session.services.ags.lineitems}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.ims.lis.v2.lineitemcontainer+json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      this.logger.error(
        { error, status: response.status, statusText: response.statusText },
        'AGS list line items failed',
      );
      throw new Error(`AGS list line items failed: ${response.statusText}`);
    }

    return response;
  }

  /**
   * Retrieves a specific line item (gradebook column) from the platform using Assignment and Grade Services.
   *
   * @param session - Active LTI session containing AGS line item endpoint configuration
   * @returns Promise resolving to the HTTP response containing the line item data
   * @throws {Error} When AGS line item service is not available for the session or request fails
   *
   * @example
   * ```typescript
   * const response = await agsService.getLineItem(session);
   * const lineItem = await response.json();
   * console.log('Line item details:', lineItem);
   * ```
   */
  async getLineItem(session: LTISession): Promise<Response> {
    if (!session.services?.ags?.lineitems) {
      throw new Error('AGS list line items not available for this session');
    }

    // Get launch config to access token URL
    const launchConfig = await getValidLaunchConfig(
      this.storage,
      session.platform.issuer,
      session.platform.clientId,
      session.platform.deploymentId,
    );

    const token = await this.tokenService.getBearerToken(
      session.platform.clientId,
      // Need to get token URL from platform storage
      launchConfig.tokenUrl,
      'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly',
    );

    const response = await fetch(`${session.services.ags.lineitem}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.ims.lis.v2.lineitem+json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      this.logger.error(
        { error, status: response.status, statusText: response.statusText },
        'AGS list line items failed',
      );
      throw new Error(`AGS list line items failed: ${response.statusText}`);
    }

    return response;
  }
}
