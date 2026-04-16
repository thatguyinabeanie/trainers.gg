/**
 * Server-side PostHog event capture for Next.js API routes and Server Actions.
 *
 * Uses the PostHog HTTP Capture API directly — no posthog-node SDK required.
 * Fire-and-forget: errors are logged and never thrown so analytics never
 * blocks or breaks request handling.
 *
 * Mirror of packages/supabase/supabase/functions/_shared/posthog.ts but
 * reads env vars at call time (not module-scope) for Next.js compatibility.
 */

// 5-second timeout — analytics must never hang a request
const POSTHOG_TIMEOUT_MS = 5_000;

interface CaptureEventParams {
  event: string;
  distinctId: string;
  properties?: Record<string, unknown>;
}

/**
 * Capture a server-side event via the PostHog HTTP Capture API.
 * Fire-and-forget — errors are caught and logged, never thrown.
 * Silent no-op when POSTHOG_API_KEY is not configured (local dev).
 */
export async function captureServerEvent({
  event,
  distinctId,
  properties,
}: CaptureEventParams): Promise<void> {
  const apiKey = process.env.POSTHOG_API_KEY;
  const host = process.env.POSTHOG_HOST ?? process.env.NEXT_PUBLIC_POSTHOG_HOST;

  if (!apiKey) return;

  const posthogHost = host ?? "https://us.i.posthog.com";

  try {
    await fetch(`${posthogHost}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        event,
        distinct_id: distinctId,
        properties: {
          ...properties,
          $lib: "trainers-web-server",
        },
      }),
      signal: AbortSignal.timeout(POSTHOG_TIMEOUT_MS),
    });
  } catch (error) {
    console.warn("[PostHog] Failed to capture server event:", error);
  }
}
