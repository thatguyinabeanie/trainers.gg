/**
 * Limitless HTTP API client.
 *
 * Pure fetch() — no framework imports. Usable in Next.js, edge functions,
 * CLI tools, and tests alike.
 */

import type {
  LimitlessTournament,
  LimitlessTournamentDetails,
  LimitlessStanding,
  LimitlessPairing,
  TournamentData,
} from "./types";

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

const LIMITLESS_BASE_URL = "https://play.limitlesstcg.com/api";

const MAX_RETRIES = 5;
const INITIAL_BACKOFF_MS = 1000;
const FETCH_TIMEOUT_MS = 30_000;

// ---------------------------------------------------------------------------
// Private fetch helper with retry / rate-limit handling
// ---------------------------------------------------------------------------

async function limitlessFetch<T>(path: string, apiKey?: string): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (apiKey) headers["X-Access-Key"] = apiKey;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch(`${LIMITLESS_BASE_URL}${path}`, {
        headers,
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timer);
      // Treat timeout (AbortError) as retryable
      if (
        err instanceof Error &&
        err.name === "AbortError" &&
        attempt < MAX_RETRIES - 1
      ) {
        const delayMs = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
        console.warn(
          `[limitless] Timeout on ${path} — retrying in ${delayMs}ms (attempt ${attempt + 1}/${MAX_RETRIES})`
        );
        await new Promise((r) => setTimeout(r, delayMs));
        continue;
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }

    // Retry on 429 (rate limited) with exponential backoff
    if (res.status === 429 && attempt < MAX_RETRIES - 1) {
      const retryAfter = res.headers.get("Retry-After");
      let delayMs: number;
      if (retryAfter) {
        const seconds = Number(retryAfter);
        if (!isNaN(seconds) && seconds > 0) {
          delayMs = seconds * 1000;
        } else {
          const date = Date.parse(retryAfter);
          delayMs =
            !isNaN(date) && date > Date.now()
              ? date - Date.now()
              : INITIAL_BACKOFF_MS * Math.pow(2, attempt);
        }
      } else {
        delayMs = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
      }
      console.warn(
        `[limitless] 429 on ${path} — retrying in ${delayMs}ms (attempt ${attempt + 1}/${MAX_RETRIES})`
      );
      await new Promise((r) => setTimeout(r, delayMs));
      continue;
    }

    // Retry on 5xx (transient server errors) with exponential backoff
    if (res.status >= 500 && res.status < 600 && attempt < MAX_RETRIES - 1) {
      const delayMs = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
      console.warn(
        `[limitless] ${res.status} on ${path} — retrying in ${delayMs}ms (attempt ${attempt + 1}/${MAX_RETRIES})`
      );
      await new Promise((r) => setTimeout(r, delayMs));
      continue;
    }

    if (!res.ok) {
      throw new Error(
        `Limitless API ${res.status}: ${res.statusText} (${path})`
      );
    }
    return res.json() as Promise<T>;
  }

  throw new Error(`Limitless API: exhausted ${MAX_RETRIES} retries (${path})`);
}

// ---------------------------------------------------------------------------
// Public API functions
// ---------------------------------------------------------------------------

/**
 * Fetch the full tournament list from Limitless (VGC only).
 * Paginates through all pages (500 per page).
 */
export async function fetchTournamentList(
  apiKey?: string
): Promise<LimitlessTournament[]> {
  // Fetch first page to determine total pages
  const first = await limitlessFetch<LimitlessTournament[]>(
    `/tournaments?game=VGC&limit=500&page=1`,
    apiKey
  );
  if (!first || first.length === 0) return [];
  // Safety filter — the query param should handle this, but guard defensively
  const vgcFirst = first.filter((t) => t.game === "VGC");
  if (first.length < 500) return vgcFirst;

  // More pages available — fetch remaining pages concurrently (5 at a time)
  const all: LimitlessTournament[] = [...vgcFirst];
  const MAX_CONCURRENT = 5;

  for (let page = 2; ; page += MAX_CONCURRENT) {
    const pages = Array.from({ length: MAX_CONCURRENT }, (_, i) => page + i);
    const results = await Promise.all(
      pages.map((p) =>
        limitlessFetch<LimitlessTournament[]>(
          `/tournaments?game=VGC&limit=500&page=${p}`,
          apiKey
        ).catch((err) => {
          console.warn(
            `[limitless] Page ${p} fetch failed:`,
            err instanceof Error ? err.message : err
          );
          return null;
        })
      )
    );

    for (const batch of results) {
      if (!batch || batch.length === 0) return all;
      all.push(...batch.filter((t) => t.game === "VGC"));
      if (batch.length < 500) return all;
    }
  }
}

/**
 * Fetch all data for a single tournament (details + standings + pairings).
 */
export async function fetchTournamentData(
  tournamentId: string,
  apiKey?: string
): Promise<TournamentData> {
  // 3 concurrent requests — rate limit retry handles any throttling
  const [details, standings, pairings] = await Promise.all([
    limitlessFetch<LimitlessTournamentDetails>(
      `/tournaments/${tournamentId}/details`,
      apiKey
    ),
    limitlessFetch<LimitlessStanding[]>(
      `/tournaments/${tournamentId}/standings`,
      apiKey
    ),
    limitlessFetch<LimitlessPairing[]>(
      `/tournaments/${tournamentId}/pairings`,
      apiKey
    ),
  ]);

  return { details, standings, pairings };
}
