/**
 * Reports a React error-boundary catch. Currently just logs — plug in your
 * own error-tracking service here (Sentry, etc.) if you want alerting.
 */
export function reportBoundaryError(error: unknown, context: Record<string, unknown> = {}) {
  const message =
    error instanceof Response
      ? `Response ${error.status}${error.url ? ` at ${error.url}` : ""}`
      : error instanceof Error
        ? error.message
        : String(error);
  console.error("[error-boundary]", message, context);
}
