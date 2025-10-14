import * as z from 'zod';

/**
 * Schema for LTI Assignment and Grade Services (AGS) Result.
 * Results contain richer metadata than scores, including user info and timestamps.
 *
 * @see https://www.imsglobal.org/spec/lti-ags/v2p0/#result-service
 */
export const ResultSchema = z.object({
  /** Unique identifier for the result */
  id: z.string(),

  /** Score of the result, represented as a URL */
  scoreOf: z.url(),

  /** URL identifying the Line Item to which this result belongs. */
  userId: z.string(),

  /** The score given to the user */
  resultScore: z.number().optional(),

  /** Maximum possible score */
  resultMaximum: z.number().optional(),

  /** Comment associated with the result */
  comment: z.string().optional(),

  /** Timestamp when the result was recorded */
  timestamp: z.iso.datetime({ offset: true }).optional(),

  /** Activity progress status */
  activityProgress: z
    .enum(['Initialized', 'Started', 'InProgress', 'Submitted', 'Completed'])
    .optional(),

  /** Grading progress status */
  gradingProgress: z
    .enum(['FullyGraded', 'Pending', 'PendingManual', 'Failed', 'NotReady'])
    .optional(),
});

/**
 * Schema for an array of results returned from the results service.
 */
export const ResultsSchema = z.array(ResultSchema);

/**
 * Type representing a validated result for LTI AGS.
 */
export type Result = z.infer<typeof ResultSchema>;

/**
 * Type representing an array of results.
 */
export type Results = z.infer<typeof ResultsSchema>;
