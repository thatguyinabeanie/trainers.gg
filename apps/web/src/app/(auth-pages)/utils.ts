/** Read the `redirect` query param from the given search params. */
export function getRedirectParam(searchParams: URLSearchParams): string | null {
  return searchParams.get("redirect");
}

/** Build a path with the redirect param preserved, if present. */
export function withRedirectParam(
  basePath: string,
  searchParams: URLSearchParams
): string {
  const redirect = getRedirectParam(searchParams);
  if (redirect && redirect.startsWith("/")) {
    return `${basePath}?redirect=${encodeURIComponent(redirect)}`;
  }
  return basePath;
}
