/**
 * Shared Limitless API + import logic
 *
 * Used by the limitless-import edge function (admin) and the Next.js
 * webhook route at /api/webhooks/limitless.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

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

export interface ImportResult {
  tournamentId: string;
  name: string;
  players: number;
  standings: number;
  pokemon: number;
  matches: number;
}

export interface SyncResult {
  synced: number;
  skipped: number;
  total: number;
  /** Count of tournaments with a known Showdown format mapping */
  mapped: number;
  /** Count of tournaments with an unmapped (raw) format code */
  unmapped: number;
  /** Breakdown: raw format code → count for unmapped tournaments */
  unmappedFormats: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Limitless API client
// ---------------------------------------------------------------------------

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
 * Fetch the full tournament list from Limitless (VGC only).
 * Paginates through all pages (500 per page).
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
 * Fetch all data for a single tournament (details + standings + pairings).
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

// ---------------------------------------------------------------------------
// Database import
// ---------------------------------------------------------------------------

/**
 * Create a service role Supabase client for DB writes.
 */
export function createAdminClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Stage 1: Sync the tournament list from Limitless API into the DB.
 *
 * Fetches all VGC tournaments and upserts metadata rows. Tournaments with
 * a known format mapping get a Showdown format ID; others keep the raw
 * Limitless format code as format_id so we still have their data.
 * Does NOT touch child data (phases, standings, etc.) or overwrite
 * data_imported_at.
 */
export async function syncTournamentList(
  supabase: SupabaseClient,
  apiKey?: string
): Promise<SyncResult> {
  const allTournaments = await fetchTournamentList(apiKey);

  let synced = 0;
  let skipped = 0;
  let mapped = 0;
  let unmapped = 0;
  const unmappedFormats: Record<string, number> = {};

  // Build upsert rows for ALL VGC tournaments
  const rows: Array<{
    tournament_id: string;
    name: string;
    format_id: string;
    date: string;
    player_count: number;
    imported_at: string;
  }> = [];

  for (const t of allTournaments) {
    const rawCode = t.format ?? "";

    // Skip tournaments with no format at all (empty or null)
    if (!rawCode) {
      skipped++;
      unmappedFormats["(empty)"] = (unmappedFormats["(empty)"] ?? 0) + 1;
      continue;
    }

    // Use Showdown format ID if we have a mapping, otherwise keep raw code
    const showdownId = LIMITLESS_TO_FORMAT[rawCode];
    if (showdownId) {
      mapped++;
    } else {
      unmapped++;
      unmappedFormats[rawCode] = (unmappedFormats[rawCode] ?? 0) + 1;
    }

    rows.push({
      tournament_id: t.id,
      name: t.name,
      format_id: showdownId ?? rawCode,
      date: t.date.split("T")[0],
      player_count: t.players ?? 0,
      imported_at: new Date().toISOString(),
    });
  }

  // Batch upsert in chunks of 500
  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500);
    const { error } = await supabase
      .schema("limitless")
      .from("tournaments")
      .upsert(batch, {
        onConflict: "tournament_id",
        // Only update metadata fields — never overwrite stage 2 columns
        // (platform, is_online, decklists, organizer_name, data_imported_at)
      });
    if (error) throw new Error(`Sync batch at offset ${i}: ${error.message}`);
    synced += batch.length;
  }

  return {
    synced,
    skipped,
    total: allTournaments.length,
    mapped,
    unmapped,
    unmappedFormats,
  };
}

/**
 * Stage 2: Import full tournament data (details, standings, teams, matches).
 *
 * Upserts the tournament row (enriching stage 1 metadata with detail fields),
 * sets data_imported_at, and replaces all child data (phases, standings, etc.).
 * Idempotent — safe to re-run on an already-imported tournament.
 */
export async function importTournament(
  supabase: SupabaseClient,
  data: TournamentData,
  limitlessFormat: string
): Promise<ImportResult> {
  const { details, standings, pairings } = data;
  const tournamentId = details.id;
  // Use Showdown format ID if mapped, otherwise keep the raw Limitless code
  const formatId = LIMITLESS_TO_FORMAT[limitlessFormat] ?? limitlessFormat;

  // 1. Delete child data for idempotency (cascade from phases + standings
  //    handles team_pokemon + match_results)
  const { error: delPhasesErr } = await supabase
    .schema("limitless")
    .from("phases")
    .delete()
    .eq("tournament_id", tournamentId);
  if (delPhasesErr)
    throw new Error(`Delete phases failed: ${delPhasesErr.message}`);

  const { error: delStandingsErr } = await supabase
    .schema("limitless")
    .from("standings")
    .delete()
    .eq("tournament_id", tournamentId);
  if (delStandingsErr)
    throw new Error(`Delete standings failed: ${delStandingsErr.message}`);

  const { error: delMatchesErr } = await supabase
    .schema("limitless")
    .from("match_results")
    .delete()
    .eq("tournament_id", tournamentId);
  if (delMatchesErr)
    throw new Error(`Delete match_results failed: ${delMatchesErr.message}`);

  // 2. Upsert tournament metadata (WITHOUT data_imported_at — set after all children succeed)
  const { error: tErr } = await supabase
    .schema("limitless")
    .from("tournaments")
    .upsert(
      {
        tournament_id: tournamentId,
        name: details.name,
        format_id: formatId,
        date: details.date.split("T")[0],
        player_count: details.players ?? 0,
        platform: details.platform ?? null,
        is_online: details.isOnline ?? true,
        decklists: details.decklists ?? false,
        organizer_name: details.organizer?.name ?? null,
      },
      { onConflict: "tournament_id" }
    );
  if (tErr) throw new Error(`Tournament upsert failed: ${tErr.message}`);

  // 3. Insert phases
  if (details.phases && details.phases.length > 0) {
    const { error: pErr } = await supabase
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
    if (pErr) throw new Error(`Phases insert failed: ${pErr.message}`);
  }

  // 4. Upsert players, create standings + team_pokemon
  const playerIdCache = new Map<string, number>();

  async function resolvePlayer(
    username: string,
    displayName?: string | null,
    country?: string | null
  ): Promise<number> {
    const cached = playerIdCache.get(username);
    if (cached !== undefined) return cached;

    const { data: row, error } = await supabase
      .schema("limitless")
      .from("players")
      .upsert(
        {
          username,
          display_name: displayName ?? null,
          country: country ?? null,
        },
        { onConflict: "username" }
      )
      .select("id")
      .single();

    if (error) throw new Error(`Player upsert "${username}": ${error.message}`);
    playerIdCache.set(username, row.id);
    return row.id;
  }

  let totalPokemon = 0;

  for (const standing of standings) {
    const playerId = await resolvePlayer(
      standing.player,
      standing.name,
      standing.country
    );

    const { data: sRow, error: sErr } = await supabase
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

    if (sErr)
      throw new Error(`Standing for "${standing.player}": ${sErr.message}`);

    // Team pokemon
    if (standing.decklist && standing.decklist.length > 0) {
      const pokemonRows = standing.decklist.map((mon, i) => ({
        standing_id: sRow.id,
        position: i + 1,
        species: mon.id,
        ability: mon.ability ?? null,
        held_item: mon.item ?? null,
        tera_type: mon.tera ?? null,
        moves: mon.attacks ?? [],
      }));

      const { error: pkErr } = await supabase
        .schema("limitless")
        .from("team_pokemon")
        .insert(pokemonRows);

      if (pkErr)
        throw new Error(
          `Team pokemon for "${standing.player}": ${pkErr.message}`
        );
      totalPokemon += pokemonRows.length;
    }
  }

  // 5. Insert match results
  let matchCount = 0;
  if (pairings && pairings.length > 0) {
    // Resolve all player usernames from pairings
    for (const p of pairings) {
      if (p.player1) await resolvePlayer(p.player1);
      if (p.player2) await resolvePlayer(p.player2);
    }

    const phaseNumbers = new Set(details.phases?.map((p) => p.phase) ?? []);
    const validPairings = pairings.filter((p) => phaseNumbers.has(p.phase));

    // Batch insert (100 at a time)
    for (let i = 0; i < validPairings.length; i += 100) {
      const batch = validPairings.slice(i, i + 100);
      const rows = batch.map((p) => ({
        tournament_id: tournamentId,
        phase: p.phase,
        round: p.round,
        table_number: p.table ?? null,
        match_label: p.match ?? null,
        player1_id: playerIdCache.get(p.player1)!,
        player2_id: p.player2 ? (playerIdCache.get(p.player2) ?? null) : null,
        winner_id: p.winner ? (playerIdCache.get(p.winner) ?? null) : null,
      }));

      const { error: mErr } = await supabase
        .schema("limitless")
        .from("match_results")
        .insert(rows);

      if (mErr) throw new Error(`Match results batch: ${mErr.message}`);
      matchCount += rows.length;
    }
  }

  // 6. Mark tournament as fully imported AFTER all children succeed
  const { error: markErr } = await supabase
    .schema("limitless")
    .from("tournaments")
    .update({ data_imported_at: new Date().toISOString() })
    .eq("tournament_id", tournamentId);
  if (markErr)
    throw new Error(`Failed to mark tournament imported: ${markErr.message}`);

  return {
    tournamentId,
    name: details.name,
    players: playerIdCache.size,
    standings: standings.length,
    pokemon: totalPokemon,
    matches: matchCount,
  };
}
