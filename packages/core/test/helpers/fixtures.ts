import type { LTI13JwtPayload } from '../../src/schemas/index.js';

export const createMockLTIPayload = (overrides = {}): Partial<LTI13JwtPayload> => ({
  iss: 'https://platform.example.com',
  aud: 'client123',
  sub: 'user123',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 300,
  nonce: 'test-nonce',
  given_name: 'Jane',
  family_name: 'Smith',
  name: 'Jane Smith',
  email: 'jane.smith@university.edu',
  'https://purl.imsglobal.org/spec/lti/claim/message_type': 'LtiResourceLinkRequest',
  'https://purl.imsglobal.org/spec/lti/claim/version': '1.3.0',
  'https://purl.imsglobal.org/spec/lti/claim/deployment_id': 'deployment1',
  'https://purl.imsglobal.org/spec/lti/claim/target_link_uri':
    'https://tool.example.com/content',
  'https://purl.imsglobal.org/spec/lti/claim/roles': [
    'http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor',
  ],
  'https://purl.imsglobal.org/spec/lti/claim/context': {
    id: 'course456',
    label: 'MATH201',
    title: 'Advanced Mathematics',
  },
  'https://purl.imsglobal.org/spec/lti/claim/resource_link': {
    id: 'assignment789',
    title: 'Homework 3',
  },
  'https://purl.imsglobal.org/spec/lti-ags/claim/endpoint': {
    lineitem: 'https://platform.example.com/api/ags/lineitem/789',
    lineitems: 'https://platform.example.com/api/ags/lineitems',
    scope: ['https://purl.imsglobal.org/spec/lti-ags/scope/score'],
  },
  ...overrides,
});
