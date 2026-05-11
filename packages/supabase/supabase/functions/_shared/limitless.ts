/**
 * Shared Limitless API + import logic
 *
 * Used by both limitless-import (admin) and limitless-webhook edge functions.
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

// ---------------------------------------------------------------------------
// Limitless API client
// ---------------------------------------------------------------------------

async function limitlessFetch<T>(path: string, apiKey?: string): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (apiKey) headers["X-Access-Key"] = apiKey;

  const res = await fetch(`${LIMITLESS_BASE_URL}${path}`, { headers });
  if (!res.ok) {
    throw new Error(`Limitless API ${res.status}: ${res.statusText} (${path})`);
  }
  return res.json() as Promise<T>;
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
 * Import a single tournament into the limitless schema.
 * Idempotent — deletes existing data first (cascade handles children).
 */
export async function importTournament(
  supabase: SupabaseClient,
  data: TournamentData,
  limitlessFormat: string
): Promise<ImportResult> {
  const { details, standings, pairings } = data;
  const tournamentId = details.id;
  const formatId = LIMITLESS_TO_FORMAT[limitlessFormat];

  if (!formatId) {
    throw new Error(`Unknown Limitless format: ${limitlessFormat}`);
  }

  // 1. Delete existing (cascade handles phases, standings, team_pokemon, match_results)
  await supabase
    .schema("limitless")
    .from("tournaments")
    .delete()
    .eq("tournament_id", tournamentId);

  // 2. Insert tournament
  const { error: tErr } = await supabase
    .schema("limitless")
    .from("tournaments")
    .insert({
      tournament_id: tournamentId,
      name: details.name,
      format_id: formatId,
      date: details.date.split("T")[0],
      player_count: details.players ?? 0,
      platform: details.platform ?? null,
      is_online: details.isOnline ?? true,
      decklists: details.decklists ?? false,
      organizer_name: details.organizer?.name ?? null,
    });
  if (tErr) throw new Error(`Tournament insert failed: ${tErr.message}`);

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

  return {
    tournamentId,
    name: details.name,
    players: playerIdCache.size,
    standings: standings.length,
    pokemon: totalPokemon,
    matches: matchCount,
  };
}
