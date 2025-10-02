import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { LTI13JwtPayload } from '../src/schemas/index.js';
import { createSession } from '../src/services/session.service.js';

// Mock crypto.randomUUID for consistent session IDs
const originalRandomUUID = global.crypto.randomUUID;
beforeEach(() => {
  global.crypto.randomUUID = vi.fn(() => 'session-uuid-123') as any;
});

afterEach(() => {
  global.crypto.randomUUID = originalRandomUUID;
});

describe('createSession', () => {
  // Create a minimal valid payload that satisfies the schema
  const createMinimalPayload = (overrides = {}): LTI13JwtPayload =>
    ({
      iss: 'https://platform.example.com',
      aud: 'client123',
      sub: 'user123',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      nonce: 'nonce123',
      given_name: 'John',
      family_name: 'Doe',
      name: 'John Doe',
      email: 'john@example.com',
      'https://purl.imsglobal.org/spec/lti/claim/message_type': 'LtiResourceLinkRequest',
      'https://purl.imsglobal.org/spec/lti/claim/version': '1.3.0',
      'https://purl.imsglobal.org/spec/lti/claim/deployment_id': 'deployment1',
      'https://purl.imsglobal.org/spec/lti/claim/target_link_uri':
        'https://tool.example.com/launch',
      'https://purl.imsglobal.org/spec/lti/claim/roles': [],
      'https://purl.imsglobal.org/spec/lti/claim/context': {
        id: 'context123',
        label: 'CS101',
        title: 'Computer Science 101',
      },
      ...overrides,
    }) as LTI13JwtPayload;

  it('creates basic session with minimal JWT payload', () => {
    const payload = createMinimalPayload();
    const session = createSession(payload);

    expect(session.id).toBe('session-uuid-123');
    expect(session.user.id).toBe('user123');
    expect(session.user.name).toBe('John Doe');
    expect(session.platform.issuer).toBe('https://platform.example.com');
    expect(session.platform.clientId).toBe('client123');
    expect(session.context.id).toBe('context123');
    expect(session.isAdmin).toBe(false);
    expect(session.isInstructor).toBe(false);
    expect(session.isStudent).toBe(false);
  });

  it('correctly identifies instructor role', () => {
    const payload = createMinimalPayload({
      'https://purl.imsglobal.org/spec/lti/claim/roles': [
        'http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor',
      ],
    });

    const session = createSession(payload);

    expect(session.isInstructor).toBe(true);
    expect(session.isStudent).toBe(false);
    expect(session.isAdmin).toBe(false);
    expect(session.user.roles).toContain('instructor');
  });

  it('correctly identifies student role', () => {
    const payload = createMinimalPayload({
      'https://purl.imsglobal.org/spec/lti/claim/roles': [
        'http://purl.imsglobal.org/vocab/lis/v2/membership#Learner',
      ],
    });

    const session = createSession(payload);

    expect(session.isStudent).toBe(true);
    expect(session.isInstructor).toBe(false);
    expect(session.isAdmin).toBe(false);
    expect(session.user.roles).toContain('student');
  });

  it('correctly identifies admin role', () => {
    const payload = createMinimalPayload({
      'https://purl.imsglobal.org/spec/lti/claim/roles': [
        'http://purl.imsglobal.org/vocab/lis/v2/institution#Administrator',
      ],
    });

    const session = createSession(payload);

    expect(session.isAdmin).toBe(true);
    expect(session.isInstructor).toBe(false);
    expect(session.isStudent).toBe(false);
    expect(session.user.roles).toContain('admin');
  });

  it('handles multiple roles and deduplicates', () => {
    const payload = createMinimalPayload({
      'https://purl.imsglobal.org/spec/lti/claim/roles': [
        'http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor',
        'http://purl.imsglobal.org/vocab/lis/v2/membership#ContentDeveloper',
        'http://purl.imsglobal.org/vocab/lis/v2/membership#Member',
        'http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor', // duplicate
      ],
    });

    const session = createSession(payload);

    expect(session.isInstructor).toBe(true);
    expect(session.user.roles).toEqual(['instructor', 'content-developer', 'member']);
  });

  it('extracts resource link information', () => {
    const payload = createMinimalPayload({
      'https://purl.imsglobal.org/spec/lti/claim/resource_link': {
        id: 'resource123',
        title: 'Assignment 1',
      },
    });

    const session = createSession(payload);

    expect(session.resourceLink).toEqual({
      id: 'resource123',
      title: 'Assignment 1',
    });
  });

  it('extracts custom parameters', () => {
    const payload = createMinimalPayload({
      'https://purl.imsglobal.org/spec/lti/claim/custom': {
        course_id: 'CS101',
        section: 'A',
      },
    });

    const session = createSession(payload);

    expect(session.customParameters).toEqual({
      course_id: 'CS101',
      section: 'A',
    });
  });

  it('extracts AGS service information', () => {
    const payload = createMinimalPayload({
      'https://purl.imsglobal.org/spec/lti-ags/claim/endpoint': {
        lineitem: 'https://platform.example.com/api/ags/lineitem/123',
        lineitems: 'https://platform.example.com/api/ags/lineitems',
        scope: ['https://purl.imsglobal.org/spec/lti-ags/scope/score'],
      },
    });

    const session = createSession(payload);

    expect(session.isAssignmentAndGradesAvailable).toBe(true);
    expect(session.services?.ags).toEqual({
      lineitem: 'https://platform.example.com/api/ags/lineitem/123',
      lineitems: 'https://platform.example.com/api/ags/lineitems',
      scopes: ['https://purl.imsglobal.org/spec/lti-ags/scope/score'],
    });
  });

  it('extracts NRPS service information', () => {
    const payload = createMinimalPayload({
      'https://purl.imsglobal.org/spec/lti-nrps/claim/namesroleservice': {
        context_memberships_url: 'https://platform.example.com/api/nrps/memberships',
        service_versions: ['2.0'],
      },
    });

    const session = createSession(payload);

    expect(session.isNameAndRolesAvailable).toBe(true);
    expect(session.services?.nrps).toEqual({
      membershipUrl: 'https://platform.example.com/api/nrps/memberships',
      versions: ['2.0'],
    });
  });

  it('extracts deep linking service information', () => {
    const payload = createMinimalPayload({
      'https://purl.imsglobal.org/spec/lti-dl/claim/deep_linking_settings': {
        deep_link_return_url: 'https://platform.example.com/deep_links',
        accept_types: ['link', 'file'],
        accept_presentation_document_targets: ['iframe', 'window'],
        accept_media_types: 'image/*,text/html',
        auto_create: true,
        data: 'custom_data_123',
      },
    });

    const session = createSession(payload);

    expect(session.isDeepLinkingAvailable).toBe(true);
    expect(session.services?.deepLinking).toEqual({
      returnUrl: 'https://platform.example.com/deep_links',
      acceptTypes: ['link', 'file'],
      acceptPresentationDocumentTargets: ['iframe', 'window'],
      acceptMediaTypes: 'image/*,text/html',
      autoCreate: true,
      data: 'custom_data_123',
    });
  });

  it('creates session with no services when none present', () => {
    const payload = createMinimalPayload();

    const session = createSession(payload);

    expect(session.services).toBeUndefined();
    expect(session.isAssignmentAndGradesAvailable).toBe(false);
    expect(session.isNameAndRolesAvailable).toBe(false);
    expect(session.isDeepLinkingAvailable).toBe(false);
  });
});
