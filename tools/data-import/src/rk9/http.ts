export const RK9_BASE_URL = "https://rk9.gg";
export const FETCH_TIMEOUT_MS = 30_000;
export const DELAY_TEAM_MS = 1500;
export const DELAY_ROSTER_MS = 1000;
export const DEFAULT_TEAM_CONCURRENCY = 3;

export function buildRk9Url(path: string): string {
  if (!/^\/[\w\-/.]+$/.test(path)) {
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

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
