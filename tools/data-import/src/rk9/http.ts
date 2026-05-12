export const RK9_BASE_URL = "https://rk9.gg";
export const FETCH_TIMEOUT_MS = 30_000;
export const DELAY_ROSTER_MS = 1000;
export const DEFAULT_TEAM_CONCURRENCY = 20;

const MAX_RETRIES = 4;
const INITIAL_BACKOFF_MS = 1000;

export function buildRk9Url(path: string): string {
  // Validate only the path segment (before '?') — query string is fine
  const [pathPart] = path.split("?");
  if (!pathPart || !/^\/[\w\-/.]+$/.test(pathPart)) {
    throw new Error(`Invalid RK9 path: ${path}`);
  }
  const url = new URL(path, RK9_BASE_URL);
  if (url.origin !== RK9_BASE_URL) {
    throw new Error(`URL origin mismatch: ${url.origin}`);
  }
  return url.href;
}

export async function fetchRk9Html(path: string): Promise<string> {
  const url = buildRk9Url(path);

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "trainers.gg-rk9-scraper/1.0 (data import)",
          Accept: "text/html",
        },
        signal: controller.signal,
      });

      if (response.status === 429 && attempt < MAX_RETRIES) {
        const retryAfter = response.headers.get("Retry-After");
        const delayMs = retryAfter
          ? (Number(retryAfter) * 1000 || INITIAL_BACKOFF_MS * 2 ** attempt)
          : INITIAL_BACKOFF_MS * 2 ** attempt;
        console.warn(`\n  429 on ${path} — backing off ${delayMs}ms (attempt ${attempt + 1})`);
        await sleep(delayMs);
        continue;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.text();
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error(`Exhausted ${MAX_RETRIES} retries for ${path}`);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
