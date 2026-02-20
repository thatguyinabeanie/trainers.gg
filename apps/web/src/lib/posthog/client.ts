import posthog from "posthog-js";

export function initPostHog() {
  if (typeof window === "undefined") return;
  if (posthog.__loaded) return;

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

  if (!key || !host) return;

  posthog.init(key, {
    api_host: host,
    persistence: "localStorage+cookie",
    // Start opted out — only track after cookie consent
    opt_out_capturing_by_default: true,
    // App Router: capture pageviews manually via PostHogPageview component
    capture_pageview: false,
    capture_pageleave: true,
    // Exception autocapture (replaces Sentry)
    autocapture: true,
    // Session replay — controlled by consent opt-in
    disable_session_recording: false,
  });
}

/**
 * Capture a caught exception in PostHog.
 * For unhandled exceptions, PostHog autocapture handles them automatically.
 */
export function captureException(error: unknown) {
  if (typeof window === "undefined") return;
  if (!posthog.__loaded) return;

  if (error instanceof Error) {
    posthog.capture("$exception", {
      $exception_message: error.message,
      $exception_type: error.name,
      $exception_stack_trace_raw: error.stack,
    });
  } else {
    posthog.capture("$exception", {
      $exception_message: String(error),
    });
  }
}

export { posthog };
