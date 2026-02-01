/** Read the `redirect` query param directly from the URL. */
export function getRedirectParam(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("redirect");
}

/** Build a path with the redirect param preserved, if present. */
export function withRedirectParam(basePath: string): string {
  const redirect = getRedirectParam();
  if (redirect && redirect.startsWith("/")) {
    return `${basePath}?redirect=${encodeURIComponent(redirect)}`;
  }
  return basePath;
}
