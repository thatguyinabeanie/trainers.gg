import type { SupabaseClient } from "@supabase/supabase-js";
import type { RK9Pokemon } from "@trainers/data-sources";

// =============================================================================
// CLI-specific types (match scraping/pairings)
// =============================================================================

export interface PairingsEntry {
  tableNumber: number | null;
  player1: string;
  player2: string | null;
  /** true = player1 won, false = player2 won, null = bye or result not yet posted */
  player1Won: boolean | null;
}

export interface DivisionRoundPairings {
  division: "masters" | "senior" | "junior";
  rounds: Map<number, PairingsEntry[]>;
}

// =============================================================================
// Match results import
// =============================================================================

/**
 * Import match results for all divisions of one event.
 * Handles Masters, Senior, and Junior independently — each gets its own
 * phase entry and name→ID lookup scoped to that division's standings.
 */
export async function importMatchResults(
  supabase: SupabaseClient,
  eventId: string,
  divisionPairings: DivisionRoundPairings[]
): Promise<{ matches: number; rounds: number }> {
  if (divisionPairings.length === 0) return { matches: 0, rounds: 0 };

  // Delete any existing match data so reruns (--force) don't hit duplicate keys
  // Note: This delete + subsequent insert is not truly atomic. If the
  // insert fails partway through, the old data will have been deleted
  // but new data only partially written. A proper fix would use a DB
  // transaction or an RPC call to wrap both operations atomically.
  const { error: del1Err } = await supabase.schema("rk9").from("match_results").delete().eq("event_id", eventId);
  if (del1Err) throw new Error(`Delete match_results: ${del1Err.message}`);
  const { error: del2Err } = await supabase.schema("rk9").from("phases").delete().eq("event_id", eventId);
  if (del2Err) throw new Error(`Delete phases: ${del2Err.message}`);

  let totalMatches = 0;
  let totalRounds = 0;

  for (const { division, rounds } of divisionPairings) {
    if (rounds.size === 0) continue;

    // Load players for this specific division
    const { data: standingPlayers, error: spErr } = await supabase
      .schema("rk9")
      .from("standings")
      .select("player_id")
      .eq("event_id", eventId)
      .eq("division", division);
    if (spErr) throw new Error(`Standings query: ${spErr.message}`);

    if (!standingPlayers || standingPlayers.length === 0) continue;

    const playerIds = standingPlayers.map((s) => s.player_id);
    const { data: eventPlayers, error: epErr } = await supabase
      .schema("rk9")
      .from("players")
      .select("id, first_name, last_name")
      .in("id", playerIds);
    if (epErr) throw new Error(`Players query: ${epErr.message}`);

    if (!eventPlayers || eventPlayers.length === 0) continue;

    const nameToId = new Map<string, number[]>();
    for (const p of eventPlayers) {
      const key1 = `${p.first_name} ${p.last_name}`.toLowerCase().trim();
      const key2 = `${p.last_name}, ${p.first_name}`.toLowerCase().trim();
      if (!nameToId.has(key1)) nameToId.set(key1, []);
      if (!nameToId.has(key2)) nameToId.set(key2, []);
      nameToId.get(key1)!.push(p.id);
      nameToId.get(key2)!.push(p.id);
    }

    // Upsert phase entry for this division
    const { error: upErr } = await supabase
      .schema("rk9")
      .from("phases")
      .upsert(
        {
          event_id: eventId,
          division,
          phase_number: 1,
          type: "swiss",
          rounds: rounds.size,
        },
        { onConflict: "event_id,division,phase_number" }
      );
    if (upErr) throw new Error(`Phase upsert: ${upErr.message}`);

    for (const [round, pairings] of rounds) {
      const matchRows: Record<string, unknown>[] = [];

      for (const p of pairings) {
        const player1Ids = nameToId.get(p.player1.toLowerCase().trim());
        if (!player1Ids || player1Ids.length !== 1) {
          if (player1Ids && player1Ids.length > 1) {
            console.warn(`[import] Ambiguous player name: ${p.player1}`);
          }
          continue;
        }
        const player1Id = player1Ids[0];

        // Resolve player2 — if present but unresolvable, skip the entire row
        let player2Id: number | null = null;
        if (p.player2) {
          const p2Ids = nameToId.get(p.player2.toLowerCase().trim());
          if (!p2Ids || p2Ids.length !== 1) {
            if (p2Ids && p2Ids.length > 1) {
              console.warn(`[import] Ambiguous player name: ${p.player2}`);
            }
            continue;
          }
          player2Id = p2Ids[0];
        }

        let winnerId: number | null = null;
        if (p.player1Won === true) winnerId = player1Id;
        else if (p.player1Won === false) winnerId = player2Id;

        matchRows.push({
          event_id: eventId,
          division,
          phase_number: 1,
          round,
          table_number: p.tableNumber,
          player1_id: player1Id,
          player2_id: player2Id,
          winner_id: winnerId,
        });
      }

      if (matchRows.length > 0) {
        const { error } = await supabase
          .schema("rk9")
          .from("match_results")
          .insert(matchRows);
        if (error) {
          console.warn(
            `[import] Match results ${division} round ${round}: ${error.message}`
          );
          continue;
        }
        totalMatches += matchRows.length;
        totalRounds++;
      }
    }
  }

  return { matches: totalMatches, rounds: totalRounds };
}
