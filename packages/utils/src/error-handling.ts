/**
 * Error handling utilities
 */

// Library tsconfig uses ES2022 without DOM — declare console ambiently so
// the default sink compiles without pulling in @types/node or DOM lib.
declare const console: {
  error(...data: unknown[]): void;
};

/**
 * Extract error message from various error types (Error, Supabase PostgrestError, etc.)
 *
 * @param error - The error to extract a message from
 * @param fallback - Fallback message if extraction fails
 * @param shouldSanitize - Whether to use fallback instead of actual error (default: false)
 *                          Set to true in production to avoid leaking error details
 */
export function getErrorMessage(
  error: unknown,
  fallback: string,
  shouldSanitize = false
): string {
  if (error instanceof Error) {
    return shouldSanitize ? fallback : error.message;
  }
  if (typeof error === "object" && error !== null && "message" in error) {
    const maybeMessage = (error as { message: unknown }).message;
    if (typeof maybeMessage === "string") {
      return shouldSanitize ? fallback : maybeMessage;
    }
    return fallback;
  }
  return fallback;
}

// =============================================================================
// logError — central error sink
// =============================================================================

type ErrorContext = Record<string, unknown>;

type ErrorSink = (
  scope: string,
  error: unknown,
  context?: ErrorContext
) => void;

/**
 * Default sink: structured `console.error` with a stable `[error-sink]`
 * prefix so Vercel runtime logs are easy to filter for production triage.
 *
 * The single-line shape (scope + extracted message + JSON context) plays
 * well with log shipping and grep — keep it that way.
 */
function defaultSink(
  scope: string,
  error: unknown,
  context?: ErrorContext
): void {
  const message = getErrorMessage(error, "<unknown error>");
  const ctx = context ? ` ${JSON.stringify(context)}` : "";
  // Use a constant format string and pass the dynamic, potentially
  // externally-controlled parts (error message, JSON context) as %s args so
  // they can't be interpreted as console format specifiers
  // (CodeQL js/tainted-format-string). Output shape is unchanged.
  console.error("[error-sink] %s: %s%s", scope, message, ctx, error);
}

let currentSink: ErrorSink = defaultSink;

/**
 * Override the project-wide error sink. Apps wire this once at startup —
 * web wires it to `posthog.captureException`, edge functions can wire it
 * to whatever sink they have. Calling with no args resets to the default.
 *
 * Returns a `restore` function so test suites can stub the sink and put
 * it back in afterEach.
 */
export function setErrorSink(sink: ErrorSink | null): () => void {
  const previous = currentSink;
  currentSink = sink ?? defaultSink;
  return () => {
    currentSink = previous;
  };
}

/**
 * Report an error to the project's error sink. Call this anywhere a
 * `catch` block previously fell through to `console.warn` / `console.error`
 * — packages and edge functions all funnel through here so a single sink
 * decision (PostHog, Sentry, OTel) is wired in one place per app.
 *
 * `scope` is a short tag (`"calc.buildAttacker"`, `"submitTeam.deleteOldTeam"`)
 * so log lines stay searchable. Pass extra fields via `context` —
 * teamId/registrationId/species etc.
 */
export function logError(
  scope: string,
  error: unknown,
  context?: ErrorContext
): void {
  try {
    currentSink(scope, error, context);
  } catch {
    // The sink itself failing must never propagate — fall back to a bare
    // console.error so we don't lose the original signal.
    console.error("[error-sink:fallback] %s", scope, error);
  }
}
