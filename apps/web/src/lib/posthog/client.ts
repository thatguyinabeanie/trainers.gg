import posthog from "posthog-js";

export function initPostHog() {
  if (typeof window === "undefined") return;
  if (posthog.__loaded) return;

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

  if (!key || !host) return;

  try {
    posthog.init(key, {
      api_host: host,
      persistence: "localStorage+cookie",
      // Start opted out — only track after cookie consent
      opt_out_capturing_by_default: true,
      // App Router: capture pageviews manually via PostHogPageview component
      capture_pageview: false,
      capture_pageleave: true,
      // Capture clicks, form submissions, and other DOM interactions
      autocapture: true,
      // Session replay is enabled here but does not start recording
      // until the user opts in via the cookie consent banner
      disable_session_recording: false,
    });
  } catch (e) {
    console.error("Failed to initialize PostHog:", e);
  }
}

/**
 * Capture a caught exception in PostHog.
 * Uses PostHog's built-in exception capture which formats
 * stack traces and error metadata automatically.
 *
 * No-op when called server-side or when PostHog has not initialized
 * (e.g. missing env vars, init failure, or blocked by ad-blocker).
 */
export function captureException(
  error: unknown,
  additionalProperties?: Record<string, unknown>
) {
  if (typeof window === "undefined") return;
  if (!posthog.__loaded) return;

  try {
    posthog.captureException(error, additionalProperties);
  } catch (e) {
    console.error("Failed to capture exception in PostHog:", e);
  }
}

export { posthog };
