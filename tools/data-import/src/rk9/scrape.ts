import { mkdir, writeFile, readFile } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, resolve, join } from "path";
import {
  fetchRk9Html,
  sleep,
  DELAY_ROSTER_MS,
  DEFAULT_TEAM_CONCURRENCY,
} from "./http.js";
import {
  parseEventsPage,
  parseRosterPage,
  parseTeamListPage,
  parsePairingsNav,
  parsePairingsFragment,
} from "./parsers.js";
import { detectEventFormat, formatDetectionNeedsHtml } from "./normalize.js";
import type {
  RK9Event,
  RK9RosterEntry,
  RK9Pokemon,
} from "@trainers/data-sources";
import type {
  PairingsEntry,
  DivisionRoundPairings,
} from "./import.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = resolve(__dirname, "../../data");

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
  let done = 0;
  let failed = 0;

  // Pool pattern: keep `concurrency` workers running at all times.
  // Each worker pulls the next entry from a shared index — no idle gaps
  // between requests unlike the old chunk-based approach.
  let next = 0;

  async function worker(): Promise<void> {
    while (true) {
      const i = next++;
      if (i >= eligible.length) break;
      const entry = eligible[i]!;
      if (entry.rosterEntryId) {
        try {
          const html = await fetchRk9Html(
            `/teamlist/public/${eventId}/${entry.rosterEntryId}`
          );
          const pokemon = parseTeamListPage(html);
          teams.push({ rosterEntryId: entry.rosterEntryId, pokemon });
        } catch {
          // Network errors on individual teams are non-fatal
          failed++;
        }
      }
      done++;
      process.stdout.write(
        `\r  Teams: ${done}/${eligible.length} (${failed} failed)`
      );
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, eligible.length) }, worker)
  );

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

/**
 * Scrape all pairings for every division and round.
 *
 * Fetches the nav page once to discover divisions (pods) and round counts,
 * then fetches each /pairings/{eventId}?pod={N}&rnd={M} endpoint.
 * All data lands in data/rk9/{eventId}/matches.json.
 */
export async function scrapeMatches(
  eventId: string
): Promise<DivisionRoundPairings[]> {
  const dir = eventDir(eventId);
  await ensureDir(dir);

  // Step 1: Discover divisions + round counts from the nav page
  await sleep(DELAY_ROSTER_MS);
  const navHtml = await fetchRk9Html(`/pairings/${eventId}`);
  const divisionInfos = parsePairingsNav(navHtml);

  if (divisionInfos.length === 0) {
    console.log(`  Matches: no divisions found — skipping`);
    await writeJson(join(dir, "matches.json"), []);
    return [];
  }

  const results: DivisionRoundPairings[] = [];

  // Step 2: For each division, fetch each round
  for (const divInfo of divisionInfos) {
    const rounds = new Map<number, PairingsEntry[]>();

    for (let round = 1; round <= divInfo.roundCount; round++) {
      await sleep(DELAY_ROSTER_MS);
      let html: string;
      try {
        html = await fetchRk9Html(
          `/pairings/${eventId}?pod=${divInfo.podId}&rnd=${round}`
        );
      } catch {
        break;
      }
      const pairings = parsePairingsFragment(html);
      if (pairings.length === 0) break;
      rounds.set(round, pairings);
      process.stdout.write(
        `\r  ${divInfo.division}: round ${round}/${divInfo.roundCount} (${pairings.length} matches)`
      );
    }

    process.stdout.write("\n");
    results.push({ division: divInfo.division, rounds });
    console.log(
      `  ${divInfo.division}: ${rounds.size} rounds scraped`
    );
  }

  // Serialize: array of { division, rounds: [{ round, pairings }] }
  const serialized = results.map((dr) => ({
    division: dr.division,
    rounds: Array.from(dr.rounds.entries()).map(([round, pairings]) => ({
      round,
      pairings,
    })),
  }));
  await writeJson(join(dir, "matches.json"), serialized);
  console.log(`  Matches saved → data/rk9/${eventId}/matches.json`);
  return results;
}

export async function readMatches(
  eventId: string
): Promise<DivisionRoundPairings[]> {
  const raw = await readJson<
    Array<{
      division: string;
      rounds: Array<{ round: number; pairings: PairingsEntry[] }>;
    }>
  >(join(eventDir(eventId), "matches.json"));

  return raw.map((entry) => {
    const rounds = new Map<number, PairingsEntry[]>();
    for (const r of entry.rounds) {
      rounds.set(r.round, r.pairings);
    }
    return { division: entry.division as DivisionRoundPairings["division"], rounds };
  });
}
