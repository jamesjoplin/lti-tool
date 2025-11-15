import { createRemoteJWKSet, decodeJwt, exportJWK, jwtVerify, SignJWT } from 'jose';
import type { Logger } from 'pino';

import type { JWKS } from './interfaces/jwks.js';
import type { LTIClient } from './interfaces/ltiClient.js';
import type { LTIConfig } from './interfaces/ltiConfig.js';
import type { LTIDeployment } from './interfaces/ltiDeployment.js';
import type { LTIDynamicRegistrationSession } from './interfaces/ltiDynamicRegistrationSession.js';
import type { LTISession } from './interfaces/ltiSession.js';
import { AddClientSchema, UpdateClientSchema } from './schemas/client.schema.js';
import {
  type DynamicRegistrationForm,
  HandleLoginParamsSchema,
  type LTI13JwtPayload,
  LTI13JwtPayloadSchema,
  type RegistrationRequest,
  SessionIdSchema,
  VerifyLaunchParamsSchema,
} from './schemas/index.js';
import {
  type CreateLineItem,
  type LineItem,
  type LineItems,
  LineItemSchema,
  LineItemsSchema,
  type UpdateLineItem,
} from './schemas/lti13/ags/lineItem.schema.js';
import { type Results, ResultsSchema } from './schemas/lti13/ags/result.schema.js';
import { type ScoreSubmission } from './schemas/lti13/ags/scoreSubmission.schema.js';
import { type OpenIDConfiguration } from './schemas/lti13/dynamicRegistration/openIDConfiguration.schema.js';
import {
  type Member,
  NRPSContextMembershipResponseSchema,
} from './schemas/lti13/nrps/contextMembership.schema.js';
import { AGSService } from './services/ags.service.js';
import { DynamicRegistrationService } from './services/dynamicRegistration.service.js';
import { NRPSService } from './services/nrps.service.js';
import { createSession } from './services/session.service.js';
import { TokenService } from './services/token.service.js';
import { getValidLaunchConfig } from './utils/launchConfigValidation.js';

/**
 * Main LTI 1.3 Tool implementation providing secure authentication, launch verification,
 * and LTI Advantage services integration.
 *
 * @example
 * ```typescript
 * const ltiTool = new LTITool({
 *   stateSecret: new TextEncoder().encode('your-secret'),
 *   keyPair: await generateKeyPair('RS256'),
 *   storage: new MemoryStorage()
 * });
 *
 * // Handle login initiation
 * const authUrl = await ltiTool.handleLogin({
 *   client_id: 'your-client-id',
 *   iss: 'https://platform.example.com',
 *   launchUrl: 'https://yourtool.com/lti/launch',
 *   login_hint: 'user123',
 *   target_link_uri: 'https://yourtool.com/content',
 *   lti_deployment_id: 'deployment123'
 * });
 * ```
 */
export class LTITool {
  /** Cache for JWKS remote key sets to improve performance */
  private jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();
  private logger: Logger;
  private tokenService: TokenService;
  private agsService: AGSService;
  private nrpsService: NRPSService;
  private dynamicRegistrationService?: DynamicRegistrationService;

  /**
   * Creates a new LTI Tool instance.
   *
   * @param config - Configuration object containing secrets, keys, and storage adapter
   */
  constructor(private config: LTIConfig) {
    this.logger =
      config.logger ??
      ({
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
      } as unknown as Logger);

    this.tokenService = new TokenService(
      this.config.keyPair,
      this.config.security?.keyId ?? 'main',
    );
    this.agsService = new AGSService(this.tokenService, this.config.storage, this.logger);
    this.nrpsService = new NRPSService(
      this.tokenService,
      this.config.storage,
      this.logger,
    );
    if (this.config.dynamicRegistration) {
      this.dynamicRegistrationService = new DynamicRegistrationService(
        this.config.storage,
        this.config.dynamicRegistration,
        this.logger,
      );
    }
  }

  /**
   * Handles LTI 1.3 login initiation by generating state/nonce and redirecting to platform auth.
   *
   * @param params - Login parameters from the platform
   * @param params.client_id - OAuth2 client identifier for this tool
   * @param params.iss - Platform issuer URL (identifies the LMS)
   * @param params.launchUrl - URL where platform will POST the id_token after auth
   * @param params.login_hint - Platform-specific user identifier hint
   * @param params.target_link_uri - Final destination URL after successful launch
   * @param params.lti_deployment_id - Deployment identifier within the platform
   * @param params.lti_message_hint - Optional platform-specific message context
   * @returns Authorization URL to redirect user to for authentication
   * @throws {Error} When platform configuration is not found
   */
  async handleLogin(params: {
    client_id: string;
    iss: string;
    launchUrl: URL | string;
    login_hint: string;
    target_link_uri: string;
    lti_deployment_id: string;
    lti_message_hint?: string;
  }): Promise<string> {
    const validatedParams = HandleLoginParamsSchema.parse(params);

    const nonce = crypto.randomUUID();

    // Store nonce with expiration for replay attack prevention
    const nonceExpirationSeconds = this.config.security?.nonceExpirationSeconds ?? 600;
    const nonceExpiresAt = new Date(Date.now() + nonceExpirationSeconds * 1000);
    await this.config.storage.storeNonce(nonce, nonceExpiresAt);

    const state = await new SignJWT({
      nonce,
      iss: validatedParams.iss,
      client_id: validatedParams.client_id,
      target_link_uri: validatedParams.target_link_uri,
      exp:
        Math.floor(Date.now() / 1000) +
        (this.config.security?.stateExpirationSeconds ?? 600),
    })
      .setProtectedHeader({ alg: 'HS256' })
      .sign(this.config.stateSecret);

    const launchConfig = await getValidLaunchConfig(
      this.config.storage,
      validatedParams.iss,
      validatedParams.client_id,
      validatedParams.lti_deployment_id,
    );

    const authUrl = new URL(launchConfig.authUrl);
    authUrl.searchParams.set('scope', 'openid');
    authUrl.searchParams.set('response_type', 'id_token');
    authUrl.searchParams.set('response_mode', 'form_post');
    authUrl.searchParams.set('prompt', 'none');
    authUrl.searchParams.set('client_id', validatedParams.client_id);
    authUrl.searchParams.set('redirect_uri', validatedParams.launchUrl.toString());
    authUrl.searchParams.set('login_hint', validatedParams.login_hint);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('nonce', nonce);
    authUrl.searchParams.set('lti_deployment_id', validatedParams.lti_deployment_id);

    if (validatedParams.lti_message_hint) {
      authUrl.searchParams.set('lti_message_hint', validatedParams.lti_message_hint);
    }

    return authUrl.toString();
  }

  /**
   * Verifies and validates an LTI 1.3 launch by checking JWT signatures, nonces, and claims.
   *
   * Performs comprehensive security validation including:
   * - JWT signature verification using platform's JWKS
   * - State JWT verification to prevent CSRF
   * - Nonce validation to prevent replay attacks
   * - Client ID and deployment ID verification
   * - LTI 1.3 claim structure validation
   *
   * @param idToken - JWT id_token received from platform after authentication
   * @param state - State JWT that was generated during login initiation
   * @returns Validated and parsed LTI 1.3 JWT payload
   * @throws {Error} When verification fails for security reasons
   */
  async verifyLaunch(idToken: string, state: string): Promise<LTI13JwtPayload> {
    const validatedParams = VerifyLaunchParamsSchema.parse({ idToken, state });

    // 1. UNVERIFIED - get issuer
    const unverified = decodeJwt(validatedParams.idToken);
    if (!unverified.iss) {
      throw new Error('No issuer in token');
    }

    // 2. get the launchConfig so we can get the remote JWKS from our data store
    const launchConfig = await getValidLaunchConfig(
      this.config.storage,
      unverified.iss,
      unverified.aud as string,
      unverified['https://purl.imsglobal.org/spec/lti/claim/deployment_id'] as string,
    );

    // 3. Verify LMS JWT
    let jwks = this.jwksCache.get(launchConfig.jwksUrl);
    if (!jwks) {
      jwks = createRemoteJWKSet(new URL(launchConfig.jwksUrl));
      this.jwksCache.set(launchConfig.jwksUrl, jwks);
    }
    const { payload } = await jwtVerify(validatedParams.idToken, jwks);

    // 4. Verify our state JWT
    const { payload: stateData } = await jwtVerify(
      validatedParams.state,
      this.config.stateSecret,
    );

    // 5. Parse and validate LMS JWT
    const validated = LTI13JwtPayloadSchema.parse(payload);

    // 6. Verify client id matches (audience claim)
    if (validated.aud !== launchConfig.clientId) {
      throw new Error(
        `Invalid client_id: expected ${launchConfig.clientId}, got ${validated.aud}`,
      );
    }

    // 7. Verify nonce matches
    if (stateData.nonce !== validated.nonce) {
      throw new Error('Nonce mismatch');
    }

    // 8. Check nonce hasn't been used before (prevent replay attacks)
    const isValidNonce = await this.config.storage.validateNonce(validated.nonce);
    if (!isValidNonce) {
      throw new Error('Nonce has already been used or expired');
    }

    return validated;
  }

  /**
   * Generates JSON Web Key Set (JWKS) containing the tool's public key for platform verification.
   *
   * @returns JWKS object with the tool's public key for JWT signature verification
   */
  async getJWKS(): Promise<JWKS> {
    const publicJwk = await exportJWK(this.config.keyPair.publicKey);
    return {
      keys: [
        {
          ...publicJwk,
          use: 'sig',
          alg: 'RS256',
          kid: this.config.security?.keyId ?? 'main',
        },
      ],
    };
  }

  /**
   * Creates and stores a new LTI session from validated JWT payload.
   *
   * @param lti13JwtPayload - Validated LTI 1.3 JWT payload from successful launch
   * @returns Created session object with user, context, and service information
   */
  async createSession(lti13JwtPayload: LTI13JwtPayload): Promise<LTISession> {
    const session = createSession(lti13JwtPayload);
    await this.config.storage.addSession(session);
    return session;
  }

  /**
   * Retrieves an existing LTI session by session ID.
   *
   * @param sessionId - Unique session identifier
   * @returns Session object if found, undefined otherwise
   */
  async getSession(sessionId: string): Promise<LTISession | undefined> {
    const validatedSessionId = SessionIdSchema.parse(sessionId);
    return await this.config.storage.getSession(validatedSessionId);
  }

  /**
   * Submits a grade score to the platform using Assignment and Grade Services (AGS).
   *
   * @param session - Active LTI session containing AGS service endpoints
   * @param score - Score submission data including grade value and user ID
   * @throws {Error} When AGS is not available or submission fails
   */
  async submitScore(session: LTISession, score: ScoreSubmission): Promise<void> {
    if (!session) {
      throw new Error('session is required');
    }
    if (!score) {
      throw new Error('score is required');
    }

    await this.agsService.submitScore(session, score);
  }

  /**
   * Retrieves all scores for a specific line item from the platform using Assignment and Grade Services (AGS).
   *
   * @param session - Active LTI session containing AGS service endpoints
   * @returns Array of score submissions for the line item
   * @throws {Error} When AGS is not available or request fails
   *
   * @example
   * ```typescript
   * const scores = await ltiTool.getScores(session);
   * console.log('All scores:', scores.map(s => `${s.userId}: ${s.scoreGiven}`));
   * ```
   */
  async getScores(session: LTISession): Promise<Results> {
    if (!session) {
      throw new Error('session is required');
    }

    const response = await this.agsService.getScores(session);
    const data = await response.json();
    return ResultsSchema.parse(data);
  }

  /**
   * Retrieves line items (gradebook columns) from the platform using Assignment and Grade Services (AGS).
   *
   * @param session - Active LTI session containing AGS service endpoints
   * @returns Array of line items from the platform
   * @throws {Error} When AGS is not available or request fails
   */
  async listLineItems(session: LTISession): Promise<LineItems> {
    if (!session) {
      throw new Error('session is required');
    }

    const response = await this.agsService.listLineItems(session);
    const data = await response.json();
    return LineItemsSchema.parse(data);
  }

  /**
   * Retrieves a specific line item (gradebook column) from the platform using Assignment and Grade Services (AGS).
   *
   * @param session - Active LTI session containing AGS service endpoints
   * @returns Line item data from the platform
   * @throws {Error} When AGS is not available or request fails
   */
  async getLineItem(session: LTISession): Promise<LineItem> {
    if (!session) {
      throw new Error('session is required');
    }

    const response = await this.agsService.getLineItem(session);
    const data = await response.json();
    return LineItemSchema.parse(data);
  }

  /**
   * Creates a new line item (gradebook column) on the platform using Assignment and Grade Services (AGS).
   *
   * @param session - Active LTI session containing AGS service endpoints
   * @param createLineItem - Line item data including label, scoreMaximum, and optional metadata
   * @returns Created line item with platform-generated ID and validated data
   * @throws {Error} When AGS is not available, input validation fails, or creation fails
   *
   * @example
   * ```typescript
   * const newLineItem = await ltiTool.createLineItem(session, {
   *   label: 'Quiz 1',
   *   scoreMaximum: 100,
   *   tag: 'quiz',
   *   resourceId: 'quiz-001'
   * });
   * console.log('Created line item:', newLineItem.id);
   * ```
   */
  async createLineItem(
    session: LTISession,
    createLineItem: CreateLineItem,
  ): Promise<LineItem> {
    if (!session) {
      throw new Error('session is required');
    }
    if (!createLineItem) {
      throw new Error('createLineItem is required');
    }

    const response = await this.agsService.createLineItem(session, createLineItem);
    const data = await response.json();
    return LineItemSchema.parse(data);
  }

  /**
   * Updates an existing line item (gradebook column) on the platform using Assignment and Grade Services (AGS).
   *
   * @param session - Active LTI session containing AGS service endpoints
   * @param updateLineItem - Updated line item data including all required fields
   * @returns Updated line item with validated data from the platform
   * @throws {Error} When AGS is not available, input validation fails, or update fails
   */
  async updateLineItem(
    session: LTISession,
    updateLineItem: UpdateLineItem,
  ): Promise<LineItem> {
    if (!session) {
      throw new Error('session is required');
    }
    if (!updateLineItem) {
      throw new Error('lineItem is required');
    }

    const response = await this.agsService.updateLineItem(session, updateLineItem);
    const data = await response.json();
    return LineItemSchema.parse(data);
  }

  /**
   * Deletes a line item (gradebook column) from the platform using Assignment and Grade Services (AGS).
   *
   * @param session - Active LTI session containing AGS service endpoints
   * @throws {Error} When AGS is not available or deletion fails
   */
  async deleteLineItem(session: LTISession): Promise<void> {
    if (!session) {
      throw new Error('session is required');
    }

    await this.agsService.deleteLineItem(session);
  }

  /**
   * Retrieves course/context members using Names and Role Provisioning Services (NRPS).
   *
   * @param session - Active LTI session containing NRPS service endpoints
   * @returns Array of members with clean camelCase properties
   * @throws {Error} When NRPS is not available or request fails
   *
   * @example
   * ```typescript
   * const members = await ltiTool.getMembers(session);
   * const instructors = members.filter(m =>
   *   m.roles.some(role => role.includes('Instructor'))
   * );
   * ```
   */
  async getMembers(session: LTISession): Promise<Member[]> {
    if (!session) {
      throw new Error('session is required');
    }

    const response = await this.nrpsService.getMembers(session);
    const data = await response.json();
    const validated = NRPSContextMembershipResponseSchema.parse(data);

    // Transform to clean camelCase format
    return validated.members.map((member) => ({
      status: member.status,
      name: member.name,
      picture: member.picture,
      givenName: member.given_name,
      familyName: member.family_name,
      middleName: member.middle_name,
      email: member.email,
      userId: member.user_id,
      lisPersonSourcedId: member.lis_person_sourcedid,
      roles: member.roles,
    }));
  }

  /**
   * Fetches and validates the OpenID Connect configuration from an LTI platform during dynamic registration.
   * Validates that the OIDC endpoint and issuer have matching hostnames for security.
   *
   * @param registrationRequest - Registration request containing openid_configuration URL and optional registration_token
   * @returns Validated OpenID configuration with platform endpoints and supported features
   * @throws {Error} When the configuration fetch fails, validation fails, or hostname mismatch detected
   *
   * @example
   * ```typescript
   * const config = await ltiTool.fetchPlatformConfiguration({
   *   openid_configuration: 'https://platform.edu/.well-known/openid_configuration',
   *   registration_token: 'optional-bearer-token'
   * });
   * console.log('Platform issuer:', config.issuer);
   * ```
   */
  async fetchPlatformConfiguration(
    registrationRequest: RegistrationRequest,
  ): Promise<OpenIDConfiguration> {
    if (!this.dynamicRegistrationService) {
      throw new Error('Dynamic registration service is not configured');
    }
    return await this.dynamicRegistrationService.fetchPlatformConfiguration(
      registrationRequest,
    );
  }

  /**
   * Initiates LTI 1.3 dynamic registration by fetching platform configuration and generating registration form.
   * Creates a temporary session and returns vendor-specific HTML form for service selection.
   *
   * @param registrationRequest - Registration request containing openid_configuration URL and optional registration_token
   * @param requestPath - Current request path used to build form action URLs
   * @returns HTML form for service selection and registration completion
   * @throws {Error} When dynamic registration service is not configured or platform configuration fails
   */
  async initiateDynamicRegistration(
    registrationRequest: RegistrationRequest,
    requestPath: string,
  ): Promise<string> {
    if (!this.dynamicRegistrationService) {
      throw new Error('Dynamic registration service is not configured');
    }
    return await this.dynamicRegistrationService.initiateDynamicRegistration(
      registrationRequest,
      requestPath,
    );
  }

  /**
   * Completes LTI 1.3 dynamic registration by processing form submission and storing client configuration.
   * Validates session, registers with platform, stores client/deployment data, and returns success page.
   *
   * @param dynamicRegistrationForm - Validated form data containing selected services and session token
   * @returns HTML success page with registration details and close button
   * @throws {Error} When dynamic registration service is not configured or registration process fails
   */
  async completeDynamicRegistration(
    dynamicRegistrationForm: DynamicRegistrationForm,
  ): Promise<string> {
    if (!this.dynamicRegistrationService) {
      throw new Error('Dynmaic registration service is not configured');
    }

    return await this.dynamicRegistrationService.completeDynamicRegistration(
      dynamicRegistrationForm,
    );
  }

  // Client management

  /**
   * Retrieves all configured LTI client platforms.
   *
   * @returns Array of client configurations (without deployment details)
   */
  async listClients(): Promise<Omit<LTIClient, 'deployments'>[]> {
    return await this.config.storage.listClients();
  }

  /**
   * Updates an existing client configuration.
   *
   * @param clientId - Unique client identifier
   * @param client - Partial client object with fields to update
   */
  async updateClient(
    clientId: string,
    client: Partial<Omit<LTIClient, 'id' | 'deployments'>>,
  ): Promise<void> {
    const validated = UpdateClientSchema.parse(client);
    return await this.config.storage.updateClient(clientId, validated);
  }

  /**
   * Retrieves a specific client configuration by ID.
   *
   * @param clientId - Unique client identifier
   * @returns Client configuration if found, undefined otherwise
   */
  async getClientById(clientId: string): Promise<LTIClient | undefined> {
    return await this.config.storage.getClientById(clientId);
  }

  /**
   * Adds a new LTI client platform configuration.
   *
   * @param client - Client configuration (ID will be auto-generated)
   * @returns The generated client ID
   */
  async addClient(client: Omit<LTIClient, 'id' | 'deployments'>): Promise<string> {
    const validated = AddClientSchema.parse(client);
    return await this.config.storage.addClient(validated);
  }

  /**
   * Removes a client configuration and all its deployments.
   *
   * @param clientId - Unique client identifier
   */
  async deleteClient(clientId: string): Promise<void> {
    return await this.config.storage.deleteClient(clientId);
  }

  // Deployment management

  /**
   * Lists all deployments for a specific client platform.
   *
   * @param clientId - Client identifier
   * @returns Array of deployment configurations for the client
   */
  async listDeployments(clientId: string): Promise<LTIDeployment[]> {
    return await this.config.storage.listDeployments(clientId);
  }

  /**
   * Retrieves a specific deployment configuration.
   *
   * @param clientId - Client identifier
   * @param deploymentId - Deployment identifier
   * @returns Deployment configuration if found, undefined otherwise
   */
  async getDeployment(
    clientId: string,
    deploymentId: string,
  ): Promise<LTIDeployment | undefined> {
    return await this.config.storage.getDeployment(clientId, deploymentId);
  }

  /**
   * Adds a new deployment to an existing client.
   *
   * @param clientId - Client identifier
   * @param deployment - Deployment configuration to add
   * @returns The generated deployment ID
   */
  async addDeployment(
    clientId: string,
    deployment: Omit<LTIDeployment, 'id'>,
  ): Promise<string> {
    return await this.config.storage.addDeployment(clientId, deployment);
  }

  /**
   * Updates an existing deployment configuration.
   *
   * @param clientId - Client identifier
   * @param deploymentId - Deployment identifier
   * @param deployment - Partial deployment object with fields to update
   */
  async updateDeployment(
    clientId: string,
    deploymentId: string,
    deployment: Partial<LTIDeployment>,
  ): Promise<void> {
    return await this.config.storage.updateDeployment(clientId, deploymentId, deployment);
  }

  /**
   * Removes a deployment from a client.
   *
   * @param clientId - Client identifier
   * @param deploymentId - Deployment identifier to remove
   */
  async deleteDeployment(clientId: string, deploymentId: string): Promise<void> {
    return await this.config.storage.deleteDeployment(clientId, deploymentId);
  }

  // Dynamic Registration Session Management

  /**
   * Stores a temporary registration session during LTI 1.3 dynamic registration flow.
   * Sessions automatically expire after the configured TTL period.
   *
   * @param sessionId - Unique session identifier (typically a UUID)
   * @param session - Registration session data including platform config and tokens
   */
  async setRegistrationSession(
    sessionId: string,
    session: LTIDynamicRegistrationSession,
  ): Promise<void> {
    return await this.config.storage.setRegistrationSession(sessionId, session);
  }

  /**
   * Retrieves a registration session by its ID for validation during completion.
   * Returns undefined if the session is not found or has expired.
   *
   * @param sessionId - Unique session identifier
   * @returns Registration session if found and not expired, undefined otherwise
   */
  async getRegistrationSession(
    sessionId: string,
  ): Promise<LTIDynamicRegistrationSession | undefined> {
    return await this.config.storage.getRegistrationSession(sessionId);
  }

  /**
   * Removes a registration session from storage after completion or expiration.
   * Used for cleanup to prevent session accumulation.
   *
   * @param sessionId - Unique session identifier to delete
   */
  async deleteRegistrationSession(sessionId: string): Promise<void> {
    return await this.config.storage.deleteRegistrationSession(sessionId);
  }
}
