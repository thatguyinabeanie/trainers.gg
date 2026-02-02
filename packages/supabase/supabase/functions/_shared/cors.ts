// CORS headers for edge functions

const ALLOWED_ORIGINS = [
  "https://trainers.gg",
  "https://www.trainers.gg",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

/**
 * Get CORS headers with a validated origin.
 * Returns the request's origin if it's in the allowlist, otherwise
 * falls back to an empty origin (which will block the request
 * in the browser but won't leak a wildcard).
 */
export function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("Origin") ?? "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : "";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}
