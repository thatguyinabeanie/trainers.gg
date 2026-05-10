/**
 * Sanitize a return URL to prevent open redirect attacks.
 * Ensures the URL is a safe relative path (starts with `/`, no protocol-relative `//`).
 *
 * @param url - The URL to sanitize
 * @param fallback - Fallback path if URL is invalid (defaults to "/")
 * @returns A safe relative path
 */
export function sanitizeReturnUrl(url: string | null | undefined, fallback = "/"): string {
  if (!url) return fallback;

  // Must start with exactly one `/` (reject `//`, protocol-relative, or absolute URLs)
  if (!url.startsWith("/") || url.startsWith("//")) {
    return fallback;
  }

  // Strip any backslash tricks (e.g., `/\evil.com`)
  if (url.includes("\\")) {
    return fallback;
  }

  return url;
}
