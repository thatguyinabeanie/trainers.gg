import PostHog from "posthog-react-native";

// Lazy singleton — only created when first accessed
let _posthog: PostHog | null = null;

/**
 * Get the PostHog client instance.
 * Returns null when env vars are missing (local dev without PostHog).
 */
export function getPostHog(): PostHog | null {
  if (_posthog) return _posthog;

  const key = process.env.EXPO_PUBLIC_POSTHOG_KEY;
  const host = process.env.EXPO_PUBLIC_POSTHOG_HOST;

  if (!key || !host) {
    if (__DEV__) {
      console.warn(
        "[PostHog] Missing EXPO_PUBLIC_POSTHOG_KEY or EXPO_PUBLIC_POSTHOG_HOST — analytics disabled."
      );
    }
    return null;
  }

  _posthog = new PostHog(key, {
    host,
    // Track app open, background, and close events automatically
    captureAppLifecycleEvents: true,
    // Enable session recording (can be toggled remotely)
    enableSessionReplay: true,
  });

  return _posthog;
}

/**
 * Capture a caught exception in PostHog.
 * No-op when PostHog has not initialized (missing env vars).
 */
export function captureException(
  error: unknown,
  additionalProperties?: Record<string, string | number | boolean | null>
) {
  const ph = getPostHog();
  if (!ph) return;

  try {
    ph.captureException(error, additionalProperties);
  } catch (e) {
    console.error("Failed to capture exception in PostHog:", e);
  }
}
