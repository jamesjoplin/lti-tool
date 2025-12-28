/**
 * Formats an unknown error into a readable string message.
 * Handles Error objects, strings, and other types safely.
 *
 * @param error - The error to format (can be Error, string, or any other type)
 * @returns Formatted error message string
 *
 * @example
 * ```typescript
 * try {
 *   await riskyOperation();
 * } catch (error) {
 *   throw new Error(`Operation failed: ${formatError(error)}`);
 * }
 * ```
 */
export function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
