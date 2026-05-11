/**
 * Limitless VGC Data Downloader
 *
 * Downloads VGC tournament data from the Limitless API and saves
 * raw JSON responses to data/limitless/, organized by format.
 *
 * File structure:
 *   data/limitless/
 *     tournaments.json          # raw tournament list + fetched_at timestamp
 *     download.log              # append-only log of all runs
 *     M-A/
 *       manifest.json           # tracks downloaded M-A tournaments
 *       {tournament_id}.json    # { details, standings, pairings }
 *     SVI/
 *       manifest.json
 *       {tournament_id}.json
 *     ...
 *
 * Usage:
 *   pnpm limitless:download              # download M-A (default)
 *   pnpm limitless:download -- --format SVI
 *   pnpm limitless:download -- --format all
 *   pnpm limitless:download -- --refresh  # force re-fetch tournament list
 */

import dotenv from "dotenv";
import { existsSync } from "node:fs";
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// Load .env.local
// ---------------------------------------------------------------------------

dotenv.config({ path: join(process.cwd(), ".env.local") });

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const BASE_URL = "https://play.limitlesstcg.com/api";
const API_KEY = process.env.LIMITLESS_API_KEY ?? "";
const DATA_DIR = join(process.cwd(), "data", "limitless");
const TOURNAMENTS_PATH = join(DATA_DIR, "tournaments.json");
const LOG_PATH = join(DATA_DIR, "download.log");
const DELAY_MS = 200;
const BATCH_SIZE = 10;
const TOURNAMENTS_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const formatArg = args.includes("--format")
  ? args[args.indexOf("--format") + 1]
  : "M-A";
const forceRefresh = args.includes("--refresh");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LimitlessTournament {
  id: string;
  game: string;
  format: string;
  name: string;
  date: string;
  players: number;
}

interface TournamentsCache {
  fetched_at: string;
  tournaments: LimitlessTournament[];
}

interface ManifestEntry {
  name: string;
  date: string;
  downloaded_at: string;
}

interface Manifest {
  format: string;
  last_updated: string;
  tournaments: Record<string, ManifestEntry>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function log(message: string): Promise<void> {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}\n`;
  await appendFile(LOG_PATH, line);
}

async function fetchJson<T>(path: string): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (API_KEY) {
    headers["X-Access-Key"] = API_KEY;
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status} for ${url}: ${response.statusText}`
    );
  }

  return response.json() as Promise<T>;
}

function manifestPath(format: string): string {
  return join(DATA_DIR, format, "manifest.json");
}

async function loadManifest(format: string): Promise<Manifest> {
  const path = manifestPath(format);
  if (!existsSync(path)) {
    return { format, last_updated: new Date().toISOString(), tournaments: {} };
  }
  const raw = await readFile(path, "utf-8");
  return JSON.parse(raw) as Manifest;
}

async function saveManifest(manifest: Manifest): Promise<void> {
  manifest.last_updated = new Date().toISOString();
  await writeFile(
    manifestPath(manifest.format),
    JSON.stringify(manifest, null, 2)
  );
}

async function isTournamentsListFresh(): Promise<boolean> {
  if (!existsSync(TOURNAMENTS_PATH)) return false;
  try {
    const raw = await readFile(TOURNAMENTS_PATH, "utf-8");
    const cache = JSON.parse(raw) as TournamentsCache;
    const fetchedAt = new Date(cache.fetched_at).getTime();
    return Date.now() - fetchedAt < TOURNAMENTS_MAX_AGE_MS;
  } catch {
    return false;
  }
}

async function loadCachedTournaments(): Promise<LimitlessTournament[]> {
  const raw = await readFile(TOURNAMENTS_PATH, "utf-8");
  const cache = JSON.parse(raw) as TournamentsCache;
  return cache.tournaments;
}

// ---------------------------------------------------------------------------
// Download a single format
// ---------------------------------------------------------------------------

async function downloadFormat(
  format: string,
  tournaments: LimitlessTournament[]
): Promise<{ processed: number; failed: number; skipped: number }> {
  const manifest = await loadManifest(format);
  const alreadyProcessed = new Set(Object.keys(manifest.tournaments));
  const toProcess = tournaments.filter((t) => !alreadyProcessed.has(t.id));

  console.log(
    `\n${format}: ${tournaments.length} total, ${alreadyProcessed.size} already downloaded, ${toProcess.length} to download`
  );
  await log(
    `Format "${format}": ${tournaments.length} total, ${alreadyProcessed.size} skipped, ${toProcess.length} to download`
  );

  if (toProcess.length === 0) {
    return { processed: 0, failed: 0, skipped: alreadyProcessed.size };
  }

  let processed = 0;
  let failed = 0;

  for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
    const batch = toProcess.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(toProcess.length / BATCH_SIZE);

    console.log(
      `  Batch ${batchNum}/${totalBatches} (${batch.length} tournaments)`
    );

    const results = await Promise.allSettled(
      batch.map(async (tournament) => {
        const filePath = join(DATA_DIR, format, `${tournament.id}.json`);

        // Fetch all three endpoints in parallel
        const [details, standings, pairings] = await Promise.all([
          fetchJson(`/tournaments/${tournament.id}/details`),
          fetchJson(`/tournaments/${tournament.id}/standings`),
          fetchJson(`/tournaments/${tournament.id}/pairings`),
        ]);

        // Write combined file
        await writeFile(
          filePath,
          JSON.stringify({ details, standings, pairings }, null, 2)
        );

        return tournament;
      })
    );

    // Process results and update manifest for successful downloads
    for (const result of results) {
      if (result.status === "fulfilled") {
        const tournament = result.value;
        manifest.tournaments[tournament.id] = {
          name: tournament.name,
          date: tournament.date,
          downloaded_at: new Date().toISOString(),
        };
        processed++;
        console.log(`    ✓ ${tournament.name}`);
        await log(`✓ ${tournament.id} ${tournament.name} (${format})`);
      } else {
        failed++;
        const reason =
          result.reason instanceof Error
            ? result.reason.message
            : String(result.reason);
        console.error(`    ✗ Failed: ${reason}`);
        await log(`✗ FAILED (${format}): ${reason}`);
      }
    }

    // Save manifest once per batch
    await saveManifest(manifest);

    // Delay between batches
    if (i + BATCH_SIZE < toProcess.length) {
      await sleep(DELAY_MS);
    }
  }

  return { processed, failed, skipped: alreadyProcessed.size };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("Limitless VGC Data Downloader");
  console.log(`Format: ${formatArg === "all" ? "ALL" : formatArg}`);
  console.log("─".repeat(40));

  if (!API_KEY) {
    console.warn(
      "Warning: No LIMITLESS_API_KEY found in env. Rate limits may apply."
    );
  }

  // Ensure data directory exists
  await mkdir(DATA_DIR, { recursive: true });

  await log(`── Run started ── format=${formatArg} refresh=${forceRefresh}`);

  // Load or fetch tournament list
  let allTournaments: LimitlessTournament[];

  if (!forceRefresh && (await isTournamentsListFresh())) {
    console.log("Using cached tournament list (less than 24h old)");
    allTournaments = await loadCachedTournaments();
    console.log(`  ${allTournaments.length} tournaments in cache`);
  } else {
    console.log("Fetching tournament list from API...");
    allTournaments = [];
    let page = 1;

    while (true) {
      const batch = await fetchJson<LimitlessTournament[]>(
        `/tournaments?game=VGC&limit=500&page=${page}`
      );

      if (!batch || batch.length === 0) break;

      allTournaments.push(...batch);
      console.log(
        `  Page ${page}: ${batch.length} tournaments (${allTournaments.length} total)`
      );

      if (batch.length < 500) break;
      page++;
      await sleep(DELAY_MS);
    }

    // Save with timestamp
    const cache: TournamentsCache = {
      fetched_at: new Date().toISOString(),
      tournaments: allTournaments,
    };
    await writeFile(TOURNAMENTS_PATH, JSON.stringify(cache, null, 2));
    await log(`Fetched tournament list: ${allTournaments.length} tournaments`);
    console.log(`  Saved tournament list (${allTournaments.length} total)`);
  }

  // Create format directories upfront
  const allFormats = [
    ...new Set(allTournaments.map((t) => t.format).filter(Boolean)),
  ];
  await Promise.all(
    allFormats.map((f) => mkdir(join(DATA_DIR, f), { recursive: true }))
  );
  console.log(`\nFormats found: ${allFormats.join(", ")}`);

  // Determine which formats to download
  const formatsToDownload = formatArg === "all" ? allFormats : [formatArg];

  // Validate requested format exists
  if (formatArg !== "all" && !allFormats.includes(formatArg)) {
    console.log(`\nNo tournaments found for format "${formatArg}".`);
    console.log(`Available formats: ${allFormats.join(", ")}`);
    return;
  }

  // Download each format
  let totalProcessed = 0;
  let totalFailed = 0;
  let totalSkipped = 0;

  for (const format of formatsToDownload) {
    const formatTournaments = allTournaments.filter((t) => t.format === format);
    const result = await downloadFormat(format, formatTournaments);
    totalProcessed += result.processed;
    totalFailed += result.failed;
    totalSkipped += result.skipped;
  }

  console.log("\n" + "─".repeat(40));
  console.log(
    `Complete: ${totalProcessed} downloaded, ${totalFailed} failed, ${totalSkipped} skipped`
  );
  await log(
    `── Run complete ── ${totalProcessed} downloaded, ${totalFailed} failed, ${totalSkipped} skipped`
  );
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
