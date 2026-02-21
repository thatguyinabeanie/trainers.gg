// Shared PostHog utilities for edge functions
// Fire-and-forget event capture via PostHog's HTTP API

const POSTHOG_API_KEY = Deno.env.get("POSTHOG_API_KEY");
const POSTHOG_HOST = Deno.env.get("POSTHOG_HOST") || "https://us.i.posthog.com";

// 5-second timeout for analytics requests
const POSTHOG_TIMEOUT_MS = 5_000;

interface CaptureEventParams {
  event: string;
  distinctId: string;
  properties?: Record<string, unknown>;
}

/**
 * Capture an event via PostHog's HTTP API.
 * Fire-and-forget — errors are caught and logged, never thrown.
 * Silent no-op when POSTHOG_API_KEY is not set (local dev).
 */
export async function captureEvent({
  event,
  distinctId,
  properties,
}: CaptureEventParams): Promise<void> {
  if (!POSTHOG_API_KEY) return;

  try {
    await fetch(`${POSTHOG_HOST}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: POSTHOG_API_KEY,
        event,
        distinct_id: distinctId,
        properties: {
          ...properties,
          $lib: "trainers-edge-functions",
        },
      }),
      signal: AbortSignal.timeout(POSTHOG_TIMEOUT_MS),
    });
  } catch (error) {
    console.warn("[PostHog] Failed to capture event:", error);
  }
}

/**
 * Capture an event with IP and User-Agent extracted from the request.
 * Enables GeoIP resolution in PostHog.
 * Fire-and-forget — errors are caught and logged, never thrown.
 * Silent no-op when POSTHOG_API_KEY is not set (local dev).
 */
export async function captureEventWithRequest(
  req: Request,
  { event, distinctId, properties }: CaptureEventParams
): Promise<void> {
  if (!POSTHOG_API_KEY) return;

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip");
  const userAgent = req.headers.get("user-agent");

  try {
    await fetch(`${POSTHOG_HOST}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: POSTHOG_API_KEY,
        event,
        distinct_id: distinctId,
        properties: {
          ...properties,
          $lib: "trainers-edge-functions",
          ...(ip && { $ip: ip }),
          ...(userAgent && { $useragent: userAgent }),
        },
      }),
      signal: AbortSignal.timeout(POSTHOG_TIMEOUT_MS),
    });
  } catch (error) {
    console.warn("[PostHog] Failed to capture event:", error);
  }
}
