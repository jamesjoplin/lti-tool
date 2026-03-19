import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { LTIStorage } from '../src/interfaces/ltiStorage.js';
import type { DynamicRegistrationForm } from '../src/schemas/lti13/dynamicRegistration/ltiDynamicRegistration.schema.js';
import { DynamicRegistrationService } from '../src/services/dynamicRegistration.service.js';

const createOpenIdConfiguration = ({
  productFamilyCode,
  baseUrl = 'https://platform.example',
}: {
  productFamilyCode: string;
  baseUrl?: string;
}) => ({
  issuer: baseUrl,
  authorization_endpoint: `${baseUrl}/imsoidc/lti13/oidc_auth`,
  registration_endpoint: `${baseUrl}/imsblis/lti13/registration_endpoint/1`,
  jwks_uri: `${baseUrl}/imsblis/lti13/keyset`,
  token_endpoint: `${baseUrl}/imsblis/lti13/token/1`,
  token_endpoint_auth_methods_supported: ['private_key_jwt'],
  token_endpoint_auth_signing_alg_values_supported: ['RS256'],
  scopes_supported: ['openid'],
  response_types_supported: ['id_token'],
  id_token_signing_alg_values_supported: ['RS256'],
  claims_supported: ['iss', 'aud'],
  subject_types_supported: ['public', 'pairwise'],
  'https://purl.imsglobal.org/spec/lti-platform-configuration': {
    product_family_code: productFamilyCode,
    version: '26-SNAPSHOT',
    messages_supported: [{ type: 'LtiResourceLinkRequest' }],
  },
});

const createStorageMock = () =>
  ({
    listClients: vi.fn(),
    getClientById: vi.fn(),
    addClient: vi.fn(),
    updateClient: vi.fn(),
    deleteClient: vi.fn(),
    listDeployments: vi.fn(),
    getDeployment: vi.fn(),
    addDeployment: vi.fn(),
    updateDeployment: vi.fn(),
    deleteDeployment: vi.fn(),
    getSession: vi.fn(),
    addSession: vi.fn(),
    storeNonce: vi.fn(),
    validateNonce: vi.fn(),
    getLaunchConfig: vi.fn(),
    saveLaunchConfig: vi.fn(),
    setRegistrationSession: vi.fn(),
    getRegistrationSession: vi.fn(),
    deleteRegistrationSession: vi.fn(),
  }) as unknown as LTIStorage;

describe('DynamicRegistrationService', () => {
  const originalFetch = global.fetch;
  const originalRandomUUID = global.crypto.randomUUID;

  beforeEach(() => {
    global.crypto.randomUUID = vi.fn(() => 'session-token-123') as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    global.fetch = originalFetch;
    global.crypto.randomUUID = originalRandomUUID;
  });

  it('renders the generic registration page for spec-compliant platforms', async () => {
    const storage = createStorageMock();
    const logger = { debug: vi.fn(), error: vi.fn() } as any;
    const service = new DynamicRegistrationService(
      storage,
      {
        url: 'https://lti.local.test',
        name: 'My LTI Tool',
      },
      logger,
    );

    global.fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify(
            createOpenIdConfiguration({
              productFamilyCode: 'sakailms.org',
              baseUrl: 'https://sakai.example',
            }),
          ),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
    ) as any;

    const html = await service.initiateDynamicRegistration(
      {
        openid_configuration:
          'https://sakai.example/imsblis/lti13/well_known?key=1&clientId=abc',
        registration_token: 'reg-token-123',
      },
      '/lti/register',
    );

    expect(html).toContain('Configure LTI Advantage Settings');
    expect(html).not.toContain('for Sakai');
    expect(storage.setRegistrationSession).toHaveBeenCalledWith(
      'session-token-123',
      expect.objectContaining({
        registrationToken: 'reg-token-123',
      }),
    );
  });

  it('posts registration to the platform endpoint with bearer token and stores deployment', async () => {
    const storage = createStorageMock();
    const logger = { debug: vi.fn(), error: vi.fn() } as any;
    const service = new DynamicRegistrationService(
      storage,
      {
        url: 'https://lti.local.test',
        name: 'My LTI Tool',
      },
      logger,
    );

    const sessionToken = 'session-token-123';
    (storage.getRegistrationSession as any).mockResolvedValue({
      openIdConfiguration: createOpenIdConfiguration({
        productFamilyCode: 'sakailms.org',
        baseUrl: 'https://sakai.example',
      }),
      registrationToken: 'reg-token-123',
      expiresAt: Date.now() + 10_000,
    });
    (storage.addClient as any).mockResolvedValue('client-record-id');
    (storage.addDeployment as any).mockResolvedValue('deployment-record-id');

    global.fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            client_id: 'sakai-client-id',
            application_type: 'web',
            response_types: ['id_token'],
            grant_types: ['implicit', 'client_credentials'],
            initiate_login_uri: 'https://lti.local.test/lti/login',
            redirect_uris: [
              'https://lti.local.test',
              'https://lti.local.test/lti/launch',
            ],
            client_name: 'My LTI Tool',
            jwks_uri: 'https://lti.local.test/lti/jwks',
            token_endpoint_auth_method: 'private_key_jwt',
            scope: '',
            'https://purl.imsglobal.org/spec/lti-tool-configuration': {
              domain: 'lti.local.test',
              target_link_uri: 'https://lti.local.test',
              claims: ['iss', 'sub', 'name', 'email'],
              messages: [{ type: 'LtiResourceLinkRequest' }],
              deployment_id: '1',
            },
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
    ) as any;

    const form: DynamicRegistrationForm = {
      sessionToken,
      services: [],
    };
    await service.completeDynamicRegistration(form);

    expect(storage.deleteRegistrationSession).toHaveBeenCalledWith(sessionToken);
    expect(storage.addClient).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 'sakai-client-id',
        iss: 'https://sakai.example',
      }),
    );
    expect(storage.addDeployment).toHaveBeenCalledWith('client-record-id', {
      deploymentId: '1',
      name: 'Default Deployment via dynamic registration provided deployment id',
    });

    const fetchCall = (global.fetch as any).mock.calls[0] as [string, RequestInit];
    expect(fetchCall[0]).toBe(
      'https://sakai.example/imsblis/lti13/registration_endpoint/1',
    );
    const headers = new Headers(fetchCall[1].headers);
    expect(headers.get('Authorization')).toBe('Bearer reg-token-123');
  });

  it('uses the Canvas profile to expand deep-linking messages', async () => {
    const storage = createStorageMock();
    const logger = { debug: vi.fn(), error: vi.fn() } as any;
    const service = new DynamicRegistrationService(
      storage,
      {
        url: 'https://lti.local.test',
        name: 'My LTI Tool',
      },
      logger,
    );

    const sessionToken = 'session-token-123';
    (storage.getRegistrationSession as any).mockResolvedValue({
      openIdConfiguration: createOpenIdConfiguration({
        productFamilyCode: 'canvas',
        baseUrl: 'https://canvas.example',
      }),
      registrationToken: 'reg-token-123',
      expiresAt: Date.now() + 10_000,
    });
    (storage.addClient as any).mockResolvedValue('client-record-id');
    (storage.addDeployment as any).mockResolvedValue('deployment-record-id');

    global.fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            client_id: 'canvas-client-id',
            application_type: 'web',
            response_types: ['id_token'],
            grant_types: ['implicit', 'client_credentials'],
            initiate_login_uri: 'https://lti.local.test/lti/login',
            redirect_uris: [
              'https://lti.local.test',
              'https://lti.local.test/lti/launch',
            ],
            client_name: 'My LTI Tool',
            jwks_uri: 'https://lti.local.test/lti/jwks',
            token_endpoint_auth_method: 'private_key_jwt',
            scope: '',
            'https://purl.imsglobal.org/spec/lti-tool-configuration': {
              domain: 'lti.local.test',
              target_link_uri: 'https://lti.local.test',
              claims: ['iss', 'sub', 'name', 'email'],
              messages: [{ type: 'LtiResourceLinkRequest' }],
            },
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
    ) as any;

    const form: DynamicRegistrationForm = {
      sessionToken,
      services: ['deep_linking'],
    };
    await service.completeDynamicRegistration(form);

    const fetchCall = (global.fetch as any).mock.calls[0] as [string, RequestInit];
    const requestBody = JSON.parse(fetchCall[1].body as string);
    const messages =
      requestBody['https://purl.imsglobal.org/spec/lti-tool-configuration'].messages;

    expect(messages).toHaveLength(6);
    expect(messages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'LtiResourceLinkRequest' }),
        expect.objectContaining({ placements: ['editor_button'] }),
        expect.objectContaining({ placements: ['module_menu_modal'] }),
        expect.objectContaining({ placements: ['assignment_selection'] }),
        expect.objectContaining({ placements: ['module_index_menu_modal'] }),
        expect.objectContaining({ placements: ['link_selection'] }),
      ]),
    );
  });
});
