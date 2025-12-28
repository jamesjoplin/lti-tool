import * as z from 'zod';

/**
 * Zod schema for LTI 1.3 Resource Link Request message configuration.
 * Represents the standard tool launch message type for accessing tool content.
 * This is the most common LTI message type for regular tool launches.
 */
const LTIResourceLinkMessageSchema = z.object({
  type: z.literal('LtiResourceLinkRequest'),
});

/**
 * Zod schema for LTI 1.3 Deep Linking Request message configuration.
 * Represents the message type used when the tool supports content selection/authoring.
 * Allows instructors to select or create content that will be linked back to the LMS.
 *
 * @property type - Always 'LtiDeepLinkingRequest' for deep linking messages
 * @property target_link_uri - Optional URL where deep linking requests should be sent
 * @property label - Optional human-readable label for the deep linking option
 * @property placements - Optional array of where the tool can be placed in the LMS UI
 * @property supported_types - Optional array of content types the tool can create/select
 * @property supported_media_types - Optional array of MIME types the tool supports
 * @property roles - Optional array of LIS role URIs that can access deep linking
 * @property custom_parameters - Optional custom parameters for deep linking configuration
 */
const LTIDeepLinkingMessageSchema = z.object({
  type: z.literal('LtiDeepLinkingRequest'),
  target_link_uri: z.url().optional(),
  label: z.string().optional(),
  placements: z
    .array(
      z.enum([
        'editor_button',
        'assignment_selection',
        'link_selection',
        'module_index_menu_modal',
        'module_menu_modal',
      ]),
    )
    .optional(),
  supported_types: z
    .array(z.enum(['ltiResourceLink', 'file', 'html', 'link', 'image']))
    .optional(),
  supported_media_types: z.array(z.string()).optional(), // e.g., ['image/*', 'video/*']
  roles: z.array(z.string()).optional(), // LIS role URIs
  custom_parameters: z.record(z.string(), z.string()).optional(),
});

/**
 * Discriminated union schema for all supported LTI 1.3 message types.
 * Used during dynamic registration to declare which message types the tool supports.
 * The platform uses this to determine what launch options to provide to users.
 */
export const LTIMessageSchema = z.discriminatedUnion('type', [
  LTIResourceLinkMessageSchema,
  LTIDeepLinkingMessageSchema,
]);

/**
 * Schema for validating arrays of LTI message configurations.
 * Used in tool registration payloads to declare multiple supported message types.
 */
export const LTIMessagesArraySchema = z.array(LTIMessageSchema);

export type LTIMessage = z.infer<typeof LTIMessageSchema>;
export type LTIResourceLinkMessage = z.infer<typeof LTIResourceLinkMessageSchema>;
export type LTIDeepLinkingMessage = z.infer<typeof LTIDeepLinkingMessageSchema>;
