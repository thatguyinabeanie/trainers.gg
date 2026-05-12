import { mkdir, writeFile, readFile } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, resolve, join } from "path";
import { fetchTournamentList, fetchTournamentData } from "./http.js";
import type { LimitlessTournament, TournamentData } from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = resolve(__dirname, "../../../data");

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
// Sync: fetch tournament list → data/limitless/tournaments.json
// ---------------------------------------------------------------------------

export async function syncTournaments(
  apiKey?: string
): Promise<LimitlessTournament[]> {
  const tournaments = await fetchTournamentList(apiKey);
  await ensureDir(join(DATA_DIR, "limitless"));
  await writeJson(
    join(DATA_DIR, "limitless", "tournaments.json"),
    tournaments
  );
  console.log(
    `Synced ${tournaments.length} tournaments → data/limitless/tournaments.json`
  );
  return tournaments;
}

export async function readTournaments(): Promise<LimitlessTournament[]> {
  return readJson<LimitlessTournament[]>(
    join(DATA_DIR, "limitless", "tournaments.json")
  );
}

// ---------------------------------------------------------------------------
// Scrape: fetch tournament details → data/limitless/data/<id>.json
// ---------------------------------------------------------------------------

export async function scrapeTournament(
  tournamentId: string,
  apiKey?: string
): Promise<TournamentData> {
  const data = await fetchTournamentData(tournamentId, apiKey);
  await ensureDir(join(DATA_DIR, "limitless", "data"));
  await writeJson(
    join(DATA_DIR, "limitless", "data", `${tournamentId}.json`),
    data
  );
  console.log(
    `  Scraped ${data.details.name} → data/limitless/data/${tournamentId}.json`
  );
  return data;
}

export async function readTournamentData(
  tournamentId: string
): Promise<TournamentData> {
  return readJson<TournamentData>(
    join(DATA_DIR, "limitless", "data", `${tournamentId}.json`)
  );
}
