/**
 * Limitless Data Importer
 *
 * Reads downloaded tournament JSON files from data/limitless/{format}/
 * and imports them into the local Supabase `limitless` schema.
 *
 * Uses service_role key to bypass RLS. Idempotent — re-running deletes
 * and re-inserts tournament data (cascade handles children).
 *
 * Usage:
 *   pnpm limitless:import                # import M-A (default)
 *   pnpm limitless:import -- --format SVI
 *   pnpm limitless:import -- --format all
 *   pnpm limitless:import -- --force      # re-import already-imported tournaments
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// Load .env.local
// ---------------------------------------------------------------------------

dotenv.config({ path: join(process.cwd(), ".env.local") });

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DATA_DIR = join(process.cwd(), "data", "limitless");

// Auto-detect local Supabase credentials if not in env
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.log("Supabase env vars not found, detecting from local Supabase...");
  try {
    const statusEnv = execSync("pnpm supabase status -o env", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    if (!supabaseUrl) {
      const urlMatch = statusEnv.match(/^API_URL="(.+)"$/m);
      if (urlMatch) supabaseUrl = urlMatch[1];
    }
    if (!supabaseServiceKey) {
      const keyMatch = statusEnv.match(/^SERVICE_ROLE_KEY="(.+)"$/m);
      if (keyMatch) supabaseServiceKey = keyMatch[1];
    }
  } catch {
    // supabase CLI not available or not running
  }
}

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Could not determine Supabase URL and service role key.");
  console.error(
    "Either set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local,"
  );
  console.error("or ensure local Supabase is running (pnpm db:start).");
  process.exit(1);
}

// Service role client — bypasses RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const formatArg = args.includes("--format")
  ? args[args.indexOf("--format") + 1]
  : "M-A";
const forceReimport = args.includes("--force");

// ---------------------------------------------------------------------------
// Format mapping: Limitless code → Showdown canonical format ID
// ---------------------------------------------------------------------------

const LIMITLESS_TO_FORMAT: Record<string, string> = {
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

// Formats we support importing (skip CUSTOM, empty, null)
const KNOWN_FORMATS = new Set(Object.keys(LIMITLESS_TO_FORMAT));

// ---------------------------------------------------------------------------
// Types (raw API shapes from downloaded JSON)
// ---------------------------------------------------------------------------

interface RawTournamentDetails {
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

interface RawStanding {
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

interface RawPairing {
  round: number;
  phase: number;
  table?: number;
  match?: string;
  player1: string;
  player2?: string | null;
  winner?: string | null;
}

interface TournamentFile {
  details: RawTournamentDetails;
  standings: RawStanding[];
  pairings: RawPairing[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Get or create a player by username. Returns the player ID.
 * Updates display_name and country if they've changed.
 */
async function upsertPlayer(
  username: string,
  displayName: string | null,
  country: string | null
): Promise<number> {
  const { data, error } = await supabase
    .schema("limitless")
    .from("players")
    .upsert(
      {
        username,
        display_name: displayName,
        country: country ?? null,
      },
      { onConflict: "username" }
    )
    .select("id")
    .single();

  if (error)
    throw new Error(`Failed to upsert player "${username}": ${error.message}`);
  return data.id;
}

/**
 * Import a single tournament into the database.
 * Deletes existing data first (cascade) for idempotency.
 */
async function importTournament(
  tournamentId: string,
  file: TournamentFile,
  limitlessFormat: string
): Promise<{
  players: number;
  standings: number;
  pokemon: number;
  matches: number;
}> {
  const { details, standings, pairings } = file;
  // Use Showdown format ID if mapped, otherwise keep the raw Limitless code
  const formatId = LIMITLESS_TO_FORMAT[limitlessFormat] ?? limitlessFormat;

  // 1. Delete existing tournament data (cascade handles phases, standings, match_results)
  await supabase
    .schema("limitless")
    .from("tournaments")
    .delete()
    .eq("tournament_id", tournamentId);

  // 2. Insert tournament
  const { error: tournamentError } = await supabase
    .schema("limitless")
    .from("tournaments")
    .insert({
      tournament_id: tournamentId,
      name: details.name,
      format_id: formatId,
      date: details.date.slice(0, 10), // date only
      player_count: details.players ?? 0,
      platform: details.platform ?? null,
      is_online: details.isOnline ?? true,
      decklists: details.decklists ?? false,
      organizer_name: details.organizer?.name ?? null,
    });

  if (tournamentError)
    throw new Error(`Failed to insert tournament: ${tournamentError.message}`);

  // 3. Insert phases
  if (details.phases && details.phases.length > 0) {
    const { error: phasesError } = await supabase
      .schema("limitless")
      .from("phases")
      .insert(
        details.phases.map((p) => ({
          tournament_id: tournamentId,
          phase_number: p.phase,
          type: p.type,
          rounds: p.rounds,
          mode: p.mode,
        }))
      );

    if (phasesError)
      throw new Error(`Failed to insert phases: ${phasesError.message}`);
  }

  // 4. Upsert players and create standings + team_pokemon
  let totalPokemon = 0;
  const playerIdCache = new Map<string, number>();

  // Helper to resolve player username → DB id (with caching)
  async function resolvePlayerId(username: string): Promise<number> {
    const cached = playerIdCache.get(username);
    if (cached !== undefined) return cached;

    // Find the standing for this player to get display name + country
    const standing = standings.find((s) => s.player === username);
    const id = await upsertPlayer(
      username,
      standing?.name ?? null,
      standing?.country ?? null
    );
    playerIdCache.set(username, id);
    return id;
  }

  // Process standings sequentially to avoid race conditions on player upserts
  for (const standing of standings) {
    const playerId = await resolvePlayerId(standing.player);

    // Insert standing
    const { data: standingRow, error: standingError } = await supabase
      .schema("limitless")
      .from("standings")
      .insert({
        tournament_id: tournamentId,
        player_id: playerId,
        placement: standing.placing ?? 0,
        record_wins: standing.record?.wins ?? 0,
        record_losses: standing.record?.losses ?? 0,
        record_ties: standing.record?.ties ?? 0,
        drop_round: standing.drop ?? null,
      })
      .select("id")
      .single();

    if (standingError)
      throw new Error(
        `Failed to insert standing for "${standing.player}": ${standingError.message}`
      );

    // Insert team pokemon (if decklist exists)
    if (standing.decklist && standing.decklist.length > 0) {
      const pokemonRows = standing.decklist.map((mon, index) => ({
        standing_id: standingRow.id,
        position: index + 1,
        species: mon.id,
        ability: mon.ability ?? null,
        held_item: mon.item ?? null,
        tera_type: mon.tera ?? null,
        moves: mon.attacks ?? [],
      }));

      const { error: pokemonError } = await supabase
        .schema("limitless")
        .from("team_pokemon")
        .insert(pokemonRows);

      if (pokemonError)
        throw new Error(
          `Failed to insert team_pokemon for "${standing.player}": ${pokemonError.message}`
        );
      totalPokemon += pokemonRows.length;
    }
  }

  // 5. Insert match results
  let matchCount = 0;
  if (pairings && pairings.length > 0) {
    // Ensure all player usernames from pairings are resolved
    for (const pairing of pairings) {
      if (pairing.player1) await resolvePlayerId(pairing.player1);
      if (pairing.player2) await resolvePlayerId(pairing.player2);
      // winner is always one of player1/player2, already resolved
    }

    // Check which phases actually exist in the DB
    const phaseNumbers = new Set(details.phases?.map((p) => p.phase) ?? []);

    // Filter pairings to only those with valid phases
    const validPairings = pairings.filter((p) => phaseNumbers.has(p.phase));

    if (validPairings.length > 0) {
      // Batch insert match results (chunks of 100 to avoid payload limits)
      const BATCH_SIZE = 100;
      for (let i = 0; i < validPairings.length; i += BATCH_SIZE) {
        const batch = validPairings.slice(i, i + BATCH_SIZE);

        const matchRows = await Promise.all(
          batch.map(async (pairing) => {
            const player1Id = playerIdCache.get(pairing.player1)!;
            const player2Id = pairing.player2
              ? (playerIdCache.get(pairing.player2) ?? null)
              : null;
            const winnerId = pairing.winner
              ? (playerIdCache.get(pairing.winner) ?? null)
              : null;

            return {
              tournament_id: tournamentId,
              phase: pairing.phase,
              round: pairing.round,
              table_number: pairing.table ?? null,
              match_label: pairing.match ?? null,
              player1_id: player1Id,
              player2_id: player2Id,
              winner_id: winnerId,
            };
          })
        );

        const { error: matchError } = await supabase
          .schema("limitless")
          .from("match_results")
          .insert(matchRows);

        if (matchError)
          throw new Error(
            `Failed to insert match_results batch: ${matchError.message}`
          );
        matchCount += matchRows.length;
      }
    }

    // Log skipped pairings (invalid phases)
    const skipped = pairings.length - validPairings.length;
    if (skipped > 0) {
      console.log(`    ⚠ Skipped ${skipped} pairings with unknown phases`);
    }
  }

  // 6. Mark tournament as fully imported
  const { error: markError } = await supabase
    .schema("limitless")
    .from("tournaments")
    .update({ data_imported_at: new Date().toISOString() })
    .eq("tournament_id", tournamentId);
  if (markError)
    throw new Error(`Failed to mark tournament imported: ${markError.message}`);

  return {
    players: playerIdCache.size,
    standings: standings.length,
    pokemon: totalPokemon,
    matches: matchCount,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("Limitless Data Importer");
  console.log(`Format: ${formatArg === "all" ? "ALL" : formatArg}`);
  console.log(`Force re-import: ${forceReimport}`);
  console.log("─".repeat(40));

  // Determine which formats to import
  const formatsToImport =
    formatArg === "all" ? [...KNOWN_FORMATS] : [formatArg];

  // Validate format — allow unmapped formats (they use the raw code as format_id)
  for (const fmt of formatsToImport) {
    if (!KNOWN_FORMATS.has(fmt)) {
      console.warn(
        `Warning: "${fmt}" has no Showdown mapping — will use raw code as format_id`
      );
    }
  }

  let totalImported = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  for (const limitlessFormat of formatsToImport) {
    const formatDir = join(DATA_DIR, limitlessFormat);
    if (!existsSync(formatDir)) {
      console.log(`\n${limitlessFormat}: no data directory found, skipping`);
      continue;
    }

    // Read all tournament JSON files in this format directory
    const files = (await readdir(formatDir)).filter(
      (f) => f.endsWith(".json") && f !== "manifest.json"
    );

    if (files.length === 0) {
      console.log(`\n${limitlessFormat}: no tournament files found`);
      continue;
    }

    console.log(
      `\n${limitlessFormat} → ${LIMITLESS_TO_FORMAT[limitlessFormat]}`
    );
    console.log(`  ${files.length} tournament files`);

    // Check which tournaments are already imported (skip unless --force)
    // Only skip if data_imported_at is set — partial imports should be retried
    let toImport = files;
    if (!forceReimport) {
      const tournamentIds = files.map((f) => f.replace(".json", ""));
      const { data: existing } = await supabase
        .schema("limitless")
        .from("tournaments")
        .select("tournament_id, data_imported_at")
        .in("tournament_id", tournamentIds);

      const existingIds = new Set(
        existing
          ?.filter((r) => r.data_imported_at)
          .map((r) => r.tournament_id) ?? []
      );
      toImport = files.filter((f) => !existingIds.has(f.replace(".json", "")));
      const skipped = files.length - toImport.length;
      if (skipped > 0) {
        console.log(`  ${skipped} already imported (use --force to re-import)`);
        totalSkipped += skipped;
      }
    }

    if (toImport.length === 0) {
      console.log(`  Nothing new to import`);
      continue;
    }

    console.log(`  Importing ${toImport.length} tournaments...`);

    for (const fileName of toImport) {
      const tournamentId = fileName.replace(".json", "");
      const filePath = join(formatDir, fileName);

      try {
        const raw = await readFile(filePath, "utf-8");
        const file = JSON.parse(raw) as TournamentFile;

        const stats = await importTournament(
          tournamentId,
          file,
          limitlessFormat
        );
        totalImported++;

        console.log(
          `  ✓ ${file.details.name} — ` +
            `${stats.players}p, ${stats.standings}s, ${stats.pokemon}pk, ${stats.matches}m`
        );
      } catch (err) {
        totalFailed++;
        const message = err instanceof Error ? err.message : String(err);
        console.error(`  ✗ ${tournamentId}: ${message}`);
      }
    }
  }

  console.log("\n" + "─".repeat(40));
  console.log(
    `Complete: ${totalImported} imported, ${totalSkipped} skipped, ${totalFailed} failed`
  );
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
