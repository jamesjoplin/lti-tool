import { z } from 'zod';

/**
 * Schema for LTI Assignment and Grade Services (AGS) Line Item.
 * Represents a gradebook column/assignment according to LTI AGS v2.0 specification.
 *
 * @see https://www.imsglobal.org/spec/lti-ags/v2p0/#line-item-service
 */
export const LineItemSchema = z.object({
  /** Unique identifier for the line item */
  id: z.url(),

  /** Maximum score possible for this line item */
  scoreMaximum: z.number().min(0),

  /** Human-readable label for the line item */
  label: z.string(),

  /** Optional resource identifier that this line item is associated with */
  resourceId: z.string().optional(),

  /** Optional resource link identifier */
  resourceLinkId: z.string().optional(),

  /** Optional tag to identify the line item */
  tag: z.string().optional(),

  /** Optional start date/time for the assignment */
  startDateTime: z.iso.datetime().optional(),

  /** Optional end date/time for the assignment */
  endDateTime: z.iso.datetime().optional(),
});

/**
 * Schema for an array of line items returned from the line items service.
 */
export const LineItemsSchema = z.array(LineItemSchema);

/**
 * Type representing a validated line item for LTI AGS.
 * Represents a gradebook column or assignment.
 */
export type LineItem = z.infer<typeof LineItemSchema>;

/**
 * Type representing an array of line items.
 */
export type LineItems = z.infer<typeof LineItemsSchema>;
