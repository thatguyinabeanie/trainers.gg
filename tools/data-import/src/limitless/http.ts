import type {
  LimitlessTournament,
  LimitlessTournamentDetails,
  LimitlessStanding,
  LimitlessPairing,
  TournamentData,
} from "./types.js";

const LIMITLESS_BASE_URL = "https://play.limitlesstcg.com/api";

// Retry config for rate-limited requests
const MAX_RETRIES = 5;
const INITIAL_BACKOFF_MS = 1000;

async function limitlessFetch<T>(path: string, apiKey?: string): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (apiKey) headers["X-Access-Key"] = apiKey;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(`${LIMITLESS_BASE_URL}${path}`, { headers });

    // Retry on 429 (rate limited) with exponential backoff
    if (res.status === 429 && attempt < MAX_RETRIES) {
      const retryAfter = res.headers.get("Retry-After");
      let delayMs: number;
      if (retryAfter) {
        // Try delta-seconds first, fall back to HTTP-date, then exponential backoff
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
        `Limitless API 429 on ${path} — retrying in ${delayMs}ms (attempt ${attempt + 1}/${MAX_RETRIES})`
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

  // Should not reach here, but satisfies TypeScript
  throw new Error(`Limitless API: exhausted ${MAX_RETRIES} retries (${path})`);
}

/**
 * Fetch all VGC tournaments from Limitless (paginates until < 500 returned).
 */
export async function fetchTournamentList(
  apiKey?: string
): Promise<LimitlessTournament[]> {
  const all: LimitlessTournament[] = [];
  let page = 1;

  while (true) {
    const batch = await limitlessFetch<LimitlessTournament[]>(
      `/tournaments?game=VGC&limit=500&page=${page}`,
      apiKey
    );
    if (!batch || batch.length === 0) break;
    all.push(...batch);
    if (batch.length < 500) break;
    page++;
  }

  return all;
}

/**
 * Fetch details + standings + pairings for one tournament (sequential to avoid rate spikes).
 */
export async function fetchTournamentData(
  tournamentId: string,
  apiKey?: string
): Promise<TournamentData> {
  // Sequential to avoid spiking 3 concurrent requests against rate limits
  const details = await limitlessFetch<LimitlessTournamentDetails>(
    `/tournaments/${tournamentId}/details`,
    apiKey
  );
  const standings = await limitlessFetch<LimitlessStanding[]>(
    `/tournaments/${tournamentId}/standings`,
    apiKey
  );
  const pairings = await limitlessFetch<LimitlessPairing[]>(
    `/tournaments/${tournamentId}/pairings`,
    apiKey
  );

  return { details, standings, pairings };
}
