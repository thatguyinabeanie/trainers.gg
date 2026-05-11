/**
 * Limitless database import logic for Next.js cron routes.
 *
 * Ported from packages/supabase/supabase/functions/_shared/limitless.ts
 * to work with createServiceRoleClient() instead of Deno.env + createClient().
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  LIMITLESS_TO_FORMAT,
  fetchTournamentList,
  fetchTournamentData,
  type TournamentData,
  type SyncResult,
  type ImportResult,
} from "./api";

// ---------------------------------------------------------------------------
// Sync: Stage 1 — upsert tournament metadata
// ---------------------------------------------------------------------------

/**
 * Sync the tournament list from Limitless API into the DB.
 *
 * Fetches all VGC tournaments and upserts metadata rows. Tournaments with
 * a known format mapping get a Showdown format ID; others keep the raw
 * Limitless format code as format_id so we still have their data.
 * Does NOT touch child data (phases, standings, etc.) or overwrite
 * data_imported_at / import queue columns.
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

  const rows: Array<Record<string, unknown>> = [];

  for (const t of allTournaments) {
    const rawCode = t.format ?? "";

    if (!rawCode) {
      skipped++;
      unmappedFormats["(empty)"] = (unmappedFormats["(empty)"] ?? 0) + 1;
      continue;
    }

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
      .upsert(batch, { onConflict: "tournament_id" });
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

// ---------------------------------------------------------------------------
// Import: Stage 2 — full tournament data
// ---------------------------------------------------------------------------

/**
 * Import full tournament data (details, standings, teams, matches).
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
  const formatId = LIMITLESS_TO_FORMAT[limitlessFormat] ?? limitlessFormat;

  // 1. Delete child data for idempotency
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

  // 6. Mark tournament as fully imported + update queue status
  const { error: markErr } = await supabase
    .schema("limitless")
    .from("tournaments")
    .update({
      data_imported_at: new Date().toISOString(),
      import_status: "completed",
      import_error: null,
    })
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

// ---------------------------------------------------------------------------
// Queue-based import: process next queued tournament
// ---------------------------------------------------------------------------

/** Max time a tournament can be "importing" before we consider it stuck. */
const STALE_IMPORT_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

/** Max retry attempts before marking as permanently failed. */
const MAX_ATTEMPTS = 3;

export interface QueueProcessResult {
  processed: boolean;
  tournamentId?: string;
  result?: ImportResult;
  error?: string;
  /** True if a stale import was recovered and requeued. */
  recovered?: boolean;
}

/**
 * Process the next queued tournament import.
 *
 * 1. Check for stale "importing" entries (stuck > 10 min) and requeue them.
 * 2. Pick the oldest "queued" tournament.
 * 3. Set status to "importing" with a timestamp.
 * 4. Fetch data from Limitless API and import.
 * 5. On success: mark "completed". On failure: mark "failed" with error.
 */
export async function processImportQueue(
  supabase: SupabaseClient,
  apiKey?: string
): Promise<QueueProcessResult> {
  // 1. Recover stale imports
  const staleThreshold = new Date(
    Date.now() - STALE_IMPORT_TIMEOUT_MS
  ).toISOString();

  const { data: staleRows } = await supabase
    .schema("limitless")
    .from("tournaments")
    .select("tournament_id, import_attempts")
    .eq("import_status", "importing")
    .lt("import_started_at", staleThreshold)
    .limit(5);

  if (staleRows && staleRows.length > 0) {
    for (const row of staleRows) {
      const attempts = (row.import_attempts ?? 0) + 1;
      if (attempts >= MAX_ATTEMPTS) {
        // Permanently failed
        await supabase
          .schema("limitless")
          .from("tournaments")
          .update({
            import_status: "failed",
            import_error: `Timed out after ${MAX_ATTEMPTS} attempts`,
            import_attempts: attempts,
          })
          .eq("tournament_id", row.tournament_id);
      } else {
        // Requeue for retry
        await supabase
          .schema("limitless")
          .from("tournaments")
          .update({
            import_status: "queued",
            import_attempts: attempts,
          })
          .eq("tournament_id", row.tournament_id);
      }
    }

    return { processed: false, recovered: true };
  }

  // 2. Pick the oldest queued tournament
  const { data: queued, error: qErr } = await supabase
    .schema("limitless")
    .from("tournaments")
    .select("tournament_id, format_id")
    .eq("import_status", "queued")
    .order("import_requested_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (qErr) throw new Error(`Queue fetch failed: ${qErr.message}`);
  if (!queued) return { processed: false };

  const { tournament_id: tournamentId, format_id: formatId } = queued;

  // 3. Claim the tournament (set importing)
  const { error: claimErr } = await supabase
    .schema("limitless")
    .from("tournaments")
    .update({
      import_status: "importing",
      import_started_at: new Date().toISOString(),
      import_error: null,
    })
    .eq("tournament_id", tournamentId)
    .eq("import_status", "queued"); // Optimistic lock

  if (claimErr)
    throw new Error(`Failed to claim tournament: ${claimErr.message}`);

  // 4. Fetch and import
  try {
    const data = await fetchTournamentData(tournamentId, apiKey);
    const result = await importTournament(supabase, data, formatId);
    return { processed: true, tournamentId, result };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";

    // Mark as failed
    const attempts =
      ((
        await supabase
          .schema("limitless")
          .from("tournaments")
          .select("import_attempts")
          .eq("tournament_id", tournamentId)
          .single()
      ).data?.import_attempts ?? 0) + 1;

    const newStatus = attempts >= MAX_ATTEMPTS ? "failed" : "queued";

    await supabase
      .schema("limitless")
      .from("tournaments")
      .update({
        import_status: newStatus,
        import_error: errorMsg,
        import_attempts: attempts,
      })
      .eq("tournament_id", tournamentId);

    return { processed: true, tournamentId, error: errorMsg };
  }
}
