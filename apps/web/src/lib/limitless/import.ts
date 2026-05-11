/**
 * Limitless database import logic for Next.js cron routes.
 *
 * Ported from packages/supabase/supabase/functions/_shared/limitless.ts
 * to work with createServiceRoleClient() instead of Deno.env + createClient().
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  LIMITLESS_TO_FORMAT,
  KNOWN_FORMATS,
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

  // Deduplicate by tournament_id — pagination can return the same tournament
  // on multiple pages if new tournaments are added between requests
  const seen = new Set<string>();
  const uniqueRows = rows.filter((r) => {
    const tid = r.tournament_id as string;
    if (seen.has(tid)) return false;
    seen.add(tid);
    return true;
  });

  // Batch upsert in chunks of 500
  for (let i = 0; i < uniqueRows.length; i += 500) {
    const batch = uniqueRows.slice(i, i + 500);
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

  // 1. Atomically delete child data for idempotency (single transaction)
  const { error: clearErr } = await supabase
    .schema("limitless")
    .rpc("atomic_clear_tournament", { p_tournament_id: tournamentId });
  if (clearErr)
    throw new Error(`Clear tournament data failed: ${clearErr.message}`);

  // 2. Insert phases, upsert organizer, and upsert tournament metadata in parallel
  const [orgResult, tResult, pResult] = await Promise.all([
    // Upsert organizer (if present) and get organizer_id
    (async (): Promise<number | null> => {
      if (!details.organizer?.id) return null;
      const { data: orgData, error: orgErr } = await supabase
        .schema("limitless")
        .from("organizers")
        .upsert(
          {
            limitless_id: details.organizer.id,
            name: details.organizer.name,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "limitless_id" }
        )
        .select("id")
        .single();
      if (orgErr) throw new Error(`Organizer upsert failed: ${orgErr.message}`);
      return orgData.id;
    })(),

    // Upsert tournament metadata (WITHOUT data_imported_at — set after all children succeed)
    supabase
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
      ),

    // Insert phases (independent of players/standings)
    details.phases && details.phases.length > 0
      ? supabase
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
          )
      : Promise.resolve({ error: null }),
  ]);

  const organizerId = orgResult;
  if (tResult.error) throw new Error(`Tournament upsert failed: ${tResult.message}`);
  if (pResult?.error) throw new Error(`Phases insert failed: ${pResult.error.message}`);

  // 4. Batch upsert all players (collect from standings + pairings)
  const playerIdCache = new Map<string, number>();

  // Collect unique players from standings and pairings
  const playerMap = new Map<
    string,
    { username: string; display_name: string | null; country: string | null }
  >();

  for (const standing of standings) {
    playerMap.set(standing.player, {
      username: standing.player,
      display_name: standing.name ?? null,
      country: standing.country ?? null,
    });
  }

  if (pairings && pairings.length > 0) {
    for (const p of pairings) {
      if (p.player1 && !playerMap.has(p.player1)) {
        playerMap.set(p.player1, {
          username: p.player1,
          display_name: null,
          country: null,
        });
      }
      if (p.player2 && !playerMap.has(p.player2)) {
        playerMap.set(p.player2, {
          username: p.player2,
          display_name: null,
          country: null,
        });
      }
    }
  }

  // Batch upsert players in chunks of 1000
  const playerRows = Array.from(playerMap.values());
  for (let i = 0; i < playerRows.length; i += 1000) {
    const batch = playerRows.slice(i, i + 200);
    const { data: upserted, error: pErr } = await supabase
      .schema("limitless")
      .from("players")
      .upsert(batch, { onConflict: "username" })
      .select("id, username");

    if (pErr)
      throw new Error(`Player batch upsert at offset ${i}: ${pErr.message}`);
    for (const row of upserted ?? []) {
      playerIdCache.set(row.username, row.id);
    }
  }

  // 5. Batch insert standings in chunks of 1000, then team_pokemon
  let totalPokemon = 0;

  // Insert standings in batches and collect IDs for team_pokemon
  const standingIds: Array<{ id: number; index: number }> = [];

  for (let i = 0; i < standings.length; i += 1000) {
    const batch = standings.slice(i, i + 200);
    const rows = batch.map((standing) => ({
      tournament_id: tournamentId,
      player_id: playerIdCache.get(standing.player) ?? null,
      placement: standing.placing ?? 0,
      record_wins: standing.record?.wins ?? 0,
      record_losses: standing.record?.losses ?? 0,
      record_ties: standing.record?.ties ?? 0,
      drop_round: standing.drop ?? null,
    }));

    const { data: inserted, error: sErr } = await supabase
      .schema("limitless")
      .from("standings")
      .insert(rows)
      .select("id");

    if (sErr)
      throw new Error(`Standings batch at offset ${i}: ${sErr.message}`);

    // Map returned IDs back to original standings index
    const insertedRows = inserted ?? [];
    for (let j = 0; j < insertedRows.length; j++) {
      const row = insertedRows[j];
      if (row) standingIds.push({ id: row.id, index: i + j });
    }
  }

  // Batch insert team_pokemon (collect all, then insert in chunks of 500)
  const allPokemonRows: Array<{
    standing_id: number;
    position: number;
    species: string;
    ability: string | null;
    held_item: string | null;
    tera_type: string | null;
    moves: string[];
  }> = [];
  for (const { id: standingId, index } of standingIds) {
    const standing = standings[index];
    if (!standing) continue;
    if (standing.decklist && standing.decklist.length > 0) {
      for (let pos = 0; pos < standing.decklist.length; pos++) {
        const mon = standing.decklist[pos];
        if (!mon) continue;
        allPokemonRows.push({
          standing_id: standingId,
          position: pos + 1,
          species: mon.id,
          ability: mon.ability ?? null,
          held_item: mon.item ?? null,
          tera_type: mon.tera ?? null,
          moves: mon.attacks ?? [],
        });
      }
    }
  }

  for (let i = 0; i < allPokemonRows.length; i += 500) {
    const batch = allPokemonRows.slice(i, i + 500);
    const { error: pkErr } = await supabase
      .schema("limitless")
      .from("team_pokemon")
      .insert(batch);

    if (pkErr)
      throw new Error(`Team pokemon batch at offset ${i}: ${pkErr.message}`);
  }
  totalPokemon = allPokemonRows.length;

  // 6. Insert match results
  let matchCount = 0;
  if (pairings && pairings.length > 0) {
    const phaseNumbers = new Set(details.phases?.map((p) => p.phase) ?? []);
    const validPairings = pairings.filter((p) => phaseNumbers.has(p.phase));

    // Batch insert (1000 at a time)
    for (let i = 0; i < validPairings.length; i += 1000) {
      const batch = validPairings.slice(i, i + 200);
      const rows = batch.map((p) => ({
        tournament_id: tournamentId,
        phase: p.phase,
        round: p.round,
        table_number: p.table ?? null,
        match_label: p.match ?? null,
        player1_id: playerIdCache.get(p.player1) ?? null,
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

  // 7. Mark tournament as fully imported + update queue status
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
  /** True if the claim was contested by another worker — not a queue-empty signal. */
  skipped?: boolean;
}

export interface BatchQueueResult {
  results: QueueProcessResult[];
  totalProcessed: number;
  totalErrors: number;
}

/**
 * Process queued tournament imports in batch.
 *
 * 1. Check for stale "importing" entries (stuck > 10 min) and requeue them.
 * 2. Pick up to `batchSize` oldest "queued" tournaments and import them sequentially.
 * 3. Set status to "importing" with a timestamp.
 * 4. Fetch data from Limitless API and import.
 * 5. On success: mark "completed". On failure: mark "failed" with error.
 */
export async function processImportQueue(
  supabase: SupabaseClient,
  apiKey?: string,
  batchSize: number = 1
): Promise<BatchQueueResult> {
  const results: QueueProcessResult[] = [];

  // 1. Recover stale imports (only once per invocation)
  const staleThreshold = new Date(
    Date.now() - STALE_IMPORT_TIMEOUT_MS
  ).toISOString();

  const { data: staleRows, error: staleErr } = await supabase
    .schema("limitless")
    .from("tournaments")
    .select("tournament_id, import_attempts")
    .eq("import_status", "importing")
    .lt("import_started_at", staleThreshold)
    .limit(5);

  if (staleErr) {
    console.error("[limitless-import] Stale import query failed:", staleErr.message);
  } else if (staleRows && staleRows.length > 0) {
    for (const row of staleRows) {
      const attempts = (row.import_attempts ?? 0) + 1;
      if (attempts >= MAX_ATTEMPTS) {
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

    results.push({ processed: false, recovered: true });
    // Continue to process queue — don't short-circuit after recovery
  }

  // 2. Process up to batchSize tournaments
  const effectiveBatch = Math.max(1, Math.min(batchSize, 50)); // Cap at 50
  let totalProcessed = 0;
  let totalErrors = 0;

  for (let i = 0; i < effectiveBatch; i++) {
    const singleResult = await processOne(supabase, apiKey);
    results.push(singleResult);

    if (!singleResult.processed && !singleResult.skipped) break; // Queue empty
    totalProcessed++;
    if (singleResult.error) totalErrors++;
  }

  return { results, totalProcessed, totalErrors };
}

/**
 * Process a single queued tournament. Internal helper.
 */
async function processOne(
  supabase: SupabaseClient,
  apiKey?: string
): Promise<QueueProcessResult> {
  // Pick the oldest queued tournament
  const { data: queued, error: qErr } = await supabase
    .schema("limitless")
    .from("tournaments")
    .select("tournament_id, format_id, import_attempts")
    .eq("import_status", "queued")
    .order("import_requested_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (qErr) throw new Error(`Queue fetch failed: ${qErr.message}`);
  if (!queued) return { processed: false };

  const { tournament_id: tournamentId, format_id: formatId } = queued;
  const currentAttempts = queued.import_attempts ?? 0;

  // Skip tournaments with unknown format — the sync cron hasn't filled the row yet
  if (!formatId || formatId === "unknown" || !KNOWN_FORMATS.has(formatId)) {
    console.warn(`[limitless-import] Skipping ${tournamentId}: unknown format "${formatId}" — re-queuing`);
    // Don't claim — leave it queued for the next sync to fill
    return { processed: false };
  }

  // Claim the tournament (set importing) — verify exactly 1 row updated
  const { data: claimed, error: claimErr } = await supabase
    .schema("limitless")
    .from("tournaments")
    .update({
      import_status: "importing",
      import_started_at: new Date().toISOString(),
      import_error: null,
    })
    .eq("tournament_id", tournamentId)
    .eq("import_status", "queued") // Optimistic lock
    .select("tournament_id")
    .maybeSingle();

  if (claimErr)
    throw new Error(`Failed to claim tournament: ${claimErr.message}`);
  if (!claimed) {
    // Claim contested — another worker got it. Don't break the batch.
    return { processed: false, skipped: true };
  }

  // Fetch and import
  try {
    const data = await fetchTournamentData(tournamentId, apiKey);
    const result = await importTournament(supabase, data, formatId);
    return { processed: true, tournamentId, result };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";

    // Increment attempt counter atomically (use value fetched at claim time)
    const attempts = currentAttempts + 1;
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
