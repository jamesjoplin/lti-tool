import type { LTIMessage } from '../schemas/lti13/dynamicRegistration/ltiMessages.schema.js';
import type { OpenIDConfiguration } from '../schemas/lti13/dynamicRegistration/openIDConfiguration.schema.js';

interface DynamicRegistrationMessageContext {
  selectedServices: string[];
  deepLinkingUri: string;
  toolName: string;
}

interface DynamicRegistrationProfile {
  matches(openIdConfiguration: OpenIDConfiguration): boolean;
  buildMessages(context: DynamicRegistrationMessageContext): LTIMessage[];
}

function buildDefaultDeepLinkingMessage(
  deepLinkingUri: string,
  toolName: string,
): LTIMessage {
  return {
    type: 'LtiDeepLinkingRequest' as const,
    target_link_uri: deepLinkingUri,
    label: toolName,
    placements: ['editor_button' as const],
    supported_types: ['ltiResourceLink' as const],
  };
}

function buildCanvasDeepLinkingMessages(
  deepLinkingUri: string,
  toolName: string,
): LTIMessage[] {
  return [
    {
      type: 'LtiDeepLinkingRequest' as const,
      target_link_uri: deepLinkingUri,
      label: toolName,
      placements: ['editor_button' as const],
      supported_types: ['ltiResourceLink' as const],
    },
    {
      type: 'LtiDeepLinkingRequest' as const,
      target_link_uri: deepLinkingUri,
      label: toolName,
      placements: ['module_menu_modal' as const],
      supported_types: ['ltiResourceLink' as const],
    },
    {
      type: 'LtiDeepLinkingRequest' as const,
      target_link_uri: deepLinkingUri,
      label: toolName,
      placements: ['assignment_selection' as const],
      supported_types: ['ltiResourceLink' as const],
    },
    {
      type: 'LtiDeepLinkingRequest' as const,
      target_link_uri: deepLinkingUri,
      label: toolName,
      placements: ['module_index_menu_modal' as const],
      supported_types: ['ltiResourceLink' as const],
    },
    {
      type: 'LtiDeepLinkingRequest' as const,
      target_link_uri: deepLinkingUri,
      label: toolName,
      placements: ['link_selection' as const],
      supported_types: ['ltiResourceLink' as const],
    },
  ];
}

const defaultDynamicRegistrationProfile: DynamicRegistrationProfile = {
  matches: () => true,
  buildMessages({ selectedServices, deepLinkingUri, toolName }) {
    const messages: LTIMessage[] = [{ type: 'LtiResourceLinkRequest' as const }];

    if (selectedServices.includes('deep_linking')) {
      messages.push(buildDefaultDeepLinkingMessage(deepLinkingUri, toolName));
    }

    return messages;
  },
};

const canvasDynamicRegistrationProfile: DynamicRegistrationProfile = {
  matches(openIdConfiguration) {
    return (
      openIdConfiguration[
        'https://purl.imsglobal.org/spec/lti-platform-configuration'
      ].product_family_code.toLowerCase() === 'canvas'
    );
  },
  buildMessages({ selectedServices, deepLinkingUri, toolName }) {
    const messages: LTIMessage[] = [{ type: 'LtiResourceLinkRequest' as const }];

    if (selectedServices.includes('deep_linking')) {
      messages.push(...buildCanvasDeepLinkingMessages(deepLinkingUri, toolName));
    }

    return messages;
  },
};

const dynamicRegistrationProfiles: DynamicRegistrationProfile[] = [
  canvasDynamicRegistrationProfile,
];

export function buildDynamicRegistrationMessages(
  openIdConfiguration: OpenIDConfiguration,
  context: DynamicRegistrationMessageContext,
): LTIMessage[] {
  const profile =
    dynamicRegistrationProfiles.find((candidate) =>
      candidate.matches(openIdConfiguration),
    ) ?? defaultDynamicRegistrationProfile;

  return profile.buildMessages(context);
}
