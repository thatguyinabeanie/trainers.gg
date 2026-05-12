import { mkdir, writeFile, readFile } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, resolve, join } from "path";
import {
  fetchRk9Html,
  sleep,
  DELAY_ROSTER_MS,
  DELAY_TEAM_MS,
  DEFAULT_TEAM_CONCURRENCY,
} from "./http.js";
import {
  parseEventsPage,
  parseRosterPage,
  parseTeamListPage,
  parsePairingsPage,
} from "./parsers.js";
import { detectEventFormat, formatDetectionNeedsHtml } from "./normalize.js";
import type {
  RK9Event,
  RK9RosterEntry,
  RK9Pokemon,
  PairingsEntry,
} from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = resolve(__dirname, "../../../data");

function eventDir(eventId: string): string {
  return join(DATA_DIR, "rk9", eventId);
}

async function ensureDir(p: string): Promise<void> {
  await mkdir(p, { recursive: true });
}

async function writeJson(path: string, data: unknown): Promise<void> {
  await writeFile(path, JSON.stringify(data, null, 2), "utf-8");
}

export async function readJson<T>(path: string): Promise<T> {
  const raw = await readFile(path, "utf-8");
  return JSON.parse(raw) as T;
}

// ---------------------------------------------------------------------------
// Discover: scrape events page → data/rk9/events.json
// ---------------------------------------------------------------------------

export async function scrapeEvents(): Promise<RK9Event[]> {
  const html = await fetchRk9Html("/events/pokemon");
  const events = parseEventsPage(html);
  await ensureDir(join(DATA_DIR, "rk9"));
  await writeJson(join(DATA_DIR, "rk9", "events.json"), events);
  console.log(`Discovered ${events.length} events → data/rk9/events.json`);
  return events;
}

export async function readEvents(): Promise<RK9Event[]> {
  return readJson<RK9Event[]>(join(DATA_DIR, "rk9", "events.json"));
}

// ---------------------------------------------------------------------------
// Roster: scrape roster page → data/rk9/<eventId>/roster.json
// Also detects + writes format_id to data/rk9/<eventId>/meta.json
// ---------------------------------------------------------------------------

export interface EventMeta {
  eventId: string;
  formatId: string | null;
}

export async function scrapeRoster(
  eventId: string,
  dateStart: string
): Promise<{ roster: RK9RosterEntry[]; formatId: string | null }> {
  const dir = eventDir(eventId);
  await ensureDir(dir);

  let formatId: string | null = null;

  if (formatDetectionNeedsHtml(dateStart)) {
    await sleep(DELAY_ROSTER_MS);
    const tournHtml = await fetchRk9Html(`/tournament/${eventId}`);
    formatId = detectEventFormat(tournHtml, dateStart);
  } else {
    formatId = detectEventFormat("", dateStart);
  }

  await writeJson(
    join(dir, "meta.json"),
    { eventId, formatId } satisfies EventMeta
  );

  await sleep(DELAY_ROSTER_MS);
  const rosterHtml = await fetchRk9Html(`/roster/${eventId}`);
  const roster = parseRosterPage(rosterHtml);

  await writeJson(join(dir, "roster.json"), roster);
  console.log(
    `  Roster: ${roster.length} players → data/rk9/${eventId}/roster.json`
  );
  return { roster, formatId };
}

export async function readRoster(eventId: string): Promise<RK9RosterEntry[]> {
  return readJson<RK9RosterEntry[]>(join(eventDir(eventId), "roster.json"));
}

// ---------------------------------------------------------------------------
// Teams: scrape all team lists → data/rk9/<eventId>/teams.json
// ---------------------------------------------------------------------------

export interface ScrapeTeamsResult {
  total: number;
  scraped: number;
  failed: number;
}

export async function scrapeTeams(
  eventId: string,
  roster: RK9RosterEntry[],
  concurrency = DEFAULT_TEAM_CONCURRENCY
): Promise<ScrapeTeamsResult> {
  const dir = eventDir(eventId);
  await ensureDir(dir);

  const eligible = roster.filter((r) => r.rosterEntryId !== null);
  const teams: Array<{ rosterEntryId: string; pokemon: RK9Pokemon[] }> = [];
  let failed = 0;

  async function scrapeOne(entry: RK9RosterEntry): Promise<{
    ok: boolean;
    data?: { rosterEntryId: string; pokemon: RK9Pokemon[] };
  }> {
    if (!entry.rosterEntryId) return { ok: false };
    try {
      const html = await fetchRk9Html(
        `/teamlist/public/${eventId}/${entry.rosterEntryId}`
      );
      const pokemon = parseTeamListPage(html);
      return { ok: true, data: { rosterEntryId: entry.rosterEntryId, pokemon } };
    } catch {
      return { ok: false };
    }
  }

  for (let i = 0; i < eligible.length; i += concurrency) {
    const chunk = eligible.slice(i, i + concurrency);
    const results = await Promise.all(chunk.map(scrapeOne));
    for (const r of results) {
      if (r.ok && r.data) {
        teams.push(r.data);
      } else {
        failed++;
      }
    }
    const progress = Math.min(i + concurrency, eligible.length);
    process.stdout.write(
      `\r  Teams: ${progress}/${eligible.length} scraped (${failed} failed)`
    );
    if (i + concurrency < eligible.length) {
      await sleep(DELAY_TEAM_MS);
    }
  }

  process.stdout.write("\n");

  await writeJson(join(dir, "teams.json"), teams);
  console.log(
    `  Teams: ${teams.length} written → data/rk9/${eventId}/teams.json`
  );
  return { total: eligible.length, scraped: teams.length, failed };
}

export async function readTeams(
  eventId: string
): Promise<Array<{ rosterEntryId: string; pokemon: RK9Pokemon[] }>> {
  return readJson(join(eventDir(eventId), "teams.json"));
}

// ---------------------------------------------------------------------------
// Matches: scrape pairings → data/rk9/<eventId>/matches.json
// ---------------------------------------------------------------------------

export async function scrapeMatches(
  eventId: string,
  playerCount: number
): Promise<Map<number, PairingsEntry[]>> {
  const dir = eventDir(eventId);
  await ensureDir(dir);

  const maxRounds =
    playerCount <= 8
      ? 3
      : playerCount <= 16
        ? 4
        : playerCount <= 32
          ? 5
          : playerCount <= 64
            ? 6
            : playerCount <= 128
              ? 7
              : 8;

  const pairingsByRound = new Map<number, PairingsEntry[]>();

  for (let round = 1; round <= maxRounds; round++) {
    await sleep(DELAY_ROSTER_MS);
    let html: string;
    try {
      html = await fetchRk9Html(`/pairings/${eventId}/${round}`);
    } catch {
      break; // No more rounds
    }
    const pairings = parsePairingsPage(html);
    if (pairings.length === 0) break;
    pairingsByRound.set(round, pairings);
    console.log(`  Round ${round}: ${pairings.length} matches`);
  }

  // Serialize as array of { round, pairings } for JSON
  const serialized = Array.from(pairingsByRound.entries()).map(
    ([round, pairings]) => ({
      round,
      pairings,
    })
  );
  await writeJson(join(dir, "matches.json"), serialized);
  console.log(
    `  Matches: ${pairingsByRound.size} rounds → data/rk9/${eventId}/matches.json`
  );
  return pairingsByRound;
}

export async function readMatches(
  eventId: string
): Promise<Map<number, PairingsEntry[]>> {
  const raw = await readJson<Array<{ round: number; pairings: PairingsEntry[] }>>(
    join(eventDir(eventId), "matches.json")
  );
  const map = new Map<number, PairingsEntry[]>();
  for (const entry of raw) {
    map.set(entry.round, entry.pairings);
  }
  return map;
}
