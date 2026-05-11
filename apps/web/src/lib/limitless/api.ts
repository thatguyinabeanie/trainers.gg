/**
 * Limitless API client for Next.js cron routes.
 *
 * Ported from packages/supabase/supabase/functions/_shared/limitless.ts
 * (the edge function version uses Deno APIs). This version uses Node.js
 * fetch and process.env.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LIMITLESS_BASE_URL = "https://play.limitlesstcg.com/api";

/**
 * Limitless format code → Showdown canonical format ID.
 * Only known VGC formats — CUSTOM / empty / null are skipped.
 */
export const LIMITLESS_TO_FORMAT: Record<string, string> = {
  "M-A": "gen9championsvgc2026regma",
  SVI: "gen9vgc2025regi",
  SVH: "gen9vgc2024regh",
  SVG: "gen9vgc2024regg",
  SVF: "gen9vgc2024regf",
  SVE: "gen9vgc2024rege",
  VGC23: "gen9vgc2023regd",
  "23S3": "gen9vgc2023regc",
  "23S2": "gen9vgc2023regb",
  "23S1": "gen9vgc2023rega",
  VGC22: "gen8vgc2022",
};

export const KNOWN_FORMATS = new Set(Object.keys(LIMITLESS_TO_FORMAT));

// ---------------------------------------------------------------------------
// Types — raw Limitless API shapes
// ---------------------------------------------------------------------------

export interface LimitlessTournament {
  id: string;
  game: string;
  format: string;
  name: string;
  date: string;
  players: number;
}

export interface LimitlessTournamentDetails {
  id: string;
  game: string;
  format: string;
  name: string;
  date: string;
  players: number;
  organizer?: { id: number; name: string };
  platform?: string;
  decklists?: boolean;
  isPublic?: boolean;
  isOnline?: boolean;
  phases?: Array<{
    phase: number;
    type: string;
    rounds: number;
    mode: string;
  }>;
}

export interface LimitlessStanding {
  player: string;
  name: string;
  country?: string;
  placing: number;
  record?: { wins: number; losses: number; ties: number };
  drop?: number | null;
  decklist?: Array<{
    id: string;
    name: string;
    item?: string;
    ability?: string;
    attacks?: string[];
    tera?: string | null;
  }> | null;
}

export interface LimitlessPairing {
  round: number;
  phase: number;
  table?: number;
  match?: string;
  player1: string;
  player2?: string | null;
  winner?: string | null;
}

export interface TournamentData {
  details: LimitlessTournamentDetails;
  standings: LimitlessStanding[];
  pairings: LimitlessPairing[];
}

export interface SyncResult {
  synced: number;
  skipped: number;
  total: number;
  mapped: number;
  unmapped: number;
  unmappedFormats: Record<string, number>;
}

export interface ImportResult {
  tournamentId: string;
  name: string;
  players: number;
  standings: number;
  pokemon: number;
  matches: number;
}

// ---------------------------------------------------------------------------
// API client with retry
// ---------------------------------------------------------------------------

const MAX_RETRIES = 5;
const INITIAL_BACKOFF_MS = 1000;
const FETCH_TIMEOUT_MS = 30_000;

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
        attempt < MAX_RETRIES
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
    if (res.status === 429 && attempt < MAX_RETRIES) {
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
    if (res.status >= 500 && res.status < 600 && attempt < MAX_RETRIES) {
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
  if (first.length < 500) return first;

  // More pages available — fetch remaining pages concurrently (5 at a time)
  const all: LimitlessTournament[] = [...first];
  const MAX_CONCURRENT = 5;

  for (let page = 2; ; page += MAX_CONCURRENT) {
    const pages = Array.from({ length: MAX_CONCURRENT }, (_, i) => page + i);
    const results = await Promise.all(
      pages.map((p) =>
        limitlessFetch<LimitlessTournament[]>(
          `/tournaments?game=VGC&limit=500&page=${p}`,
          apiKey
        ).catch(() => null)
      )
    );

    for (const batch of results) {
      if (!batch || batch.length === 0) return all;
      all.push(...batch);
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
