/**
 * Detects if the application is running in a serverless environment.
 *
 * Checks for environment variables commonly set by serverless platforms:
 * - AWS Lambda: AWS_LAMBDA_FUNCTION_NAME, AWS_EXECUTION_ENV, LAMBDA_TASK_ROOT
 * - Google Cloud Functions/Run: FUNCTION_NAME, FUNCTION_TARGET, K_SERVICE
 * - Azure Functions: FUNCTIONS_WORKER_RUNTIME, AZURE_FUNCTIONS_ENVIRONMENT
 * - Vercel: VERCEL, VERCEL_ENV
 * - Netlify Functions: NETLIFY
 *
 * @returns true if serverless environment detected, false otherwise
 */
export function isServerlessEnvironment(): boolean {
  return !!(
    // AWS Lambda
    (
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.AWS_EXECUTION_ENV ||
      process.env.LAMBDA_TASK_ROOT ||
      // Google Cloud Functions / Cloud Run
      process.env.FUNCTION_NAME ||
      process.env.FUNCTION_TARGET ||
      process.env.K_SERVICE ||
      // Azure Functions
      process.env.FUNCTIONS_WORKER_RUNTIME ||
      process.env.AZURE_FUNCTIONS_ENVIRONMENT ||
      // Vercel
      process.env.VERCEL ||
      // Netlify Functions
      process.env.NETLIFY
    )
  );
}
