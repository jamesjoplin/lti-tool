import { z } from 'zod';

/**
 * Common validation schemas used across the LTI tool
 */

export const SessionIdSchema = z.string().min(1, 'sessionId is required');
