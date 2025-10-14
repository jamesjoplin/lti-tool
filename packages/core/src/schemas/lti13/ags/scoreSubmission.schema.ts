import * as z from 'zod';

/**
 * Schema for submitting grades via LTI Assignment and Grade Services (AGS).
 * Validates score data according to LTI AGS v2.0 specification.
 *
 * @see https://www.imsglobal.org/spec/lti-ags/v2p0/#score-publish-service
 */
export const ScoreSubmissionSchema = z.object({
  /** Points awarded to the student (must be non-negative) */
  scoreGiven: z.number().min(0),

  /** Maximum possible points for this assignment (must be non-negative) */
  scoreMaximum: z.number().min(0),

  /** Optional feedback comment to display to the student */
  comment: z.string().optional(),

  /** User ID to submit score for (optional - defaults to session user if not provided) */
  userId: z.string().optional(),

  /** Timestamp when score was generated (optional - defaults to current time) */
  timestamp: z.iso.datetime().optional(),

  /**
   * Student's progress on the activity itself.
   * - Initialized: Student has started but not made progress
   * - Started: Student has begun working
   * - InProgress: Student is actively working
   * - Submitted: Student has submitted work for review
   * - Completed: Student has finished the activity
   */
  activityProgress: z
    .enum(['Initialized', 'Started', 'InProgress', 'Submitted', 'Completed'])
    .default('Completed'),

  /**
   * Instructor's progress on grading the submission.
   * - NotReady: Submission not ready for grading
   * - Failed: Grading failed due to error
   * - Pending: Awaiting automatic grading
   * - PendingManual: Awaiting manual grading
   * - FullyGraded: Grading is complete
   */
  gradingProgress: z
    .enum(['NotReady', 'Failed', 'Pending', 'PendingManual', 'FullyGraded'])
    .default('FullyGraded'),
});

/**
 * Type representing a validated score submission for LTI AGS.
 * Contains grade data and metadata to be sent to the platform.
 */
export type ScoreSubmission = z.infer<typeof ScoreSubmissionSchema>;
