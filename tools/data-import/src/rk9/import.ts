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
  await supabase.schema("rk9").from("match_results").delete().eq("event_id", eventId);
  await supabase.schema("rk9").from("phases").delete().eq("event_id", eventId);

  let totalMatches = 0;
  let totalRounds = 0;

  for (const { division, rounds } of divisionPairings) {
    if (rounds.size === 0) continue;

    // Load players for this specific division
    const { data: standingPlayers } = await supabase
      .schema("rk9")
      .from("standings")
      .select("player_id")
      .eq("event_id", eventId)
      .eq("division", division);

    if (!standingPlayers || standingPlayers.length === 0) continue;

    const playerIds = standingPlayers.map((s) => s.player_id);
    const { data: eventPlayers } = await supabase
      .schema("rk9")
      .from("players")
      .select("id, first_name, last_name")
      .in("id", playerIds);

    if (!eventPlayers || eventPlayers.length === 0) continue;

    const nameToId = new Map<string, number>();
    for (const p of eventPlayers) {
      nameToId.set(`${p.first_name} ${p.last_name}`.toLowerCase().trim(), p.id);
      nameToId.set(
        `${p.last_name}, ${p.first_name}`.toLowerCase().trim(),
        p.id
      );
    }

    // Upsert phase entry for this division
    await supabase
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

    for (const [round, pairings] of rounds) {
      const matchRows: Record<string, unknown>[] = [];

      for (const p of pairings) {
        const player1Id = nameToId.get(p.player1.toLowerCase().trim());
        if (!player1Id) continue;

        const player2Id = p.player2
          ? (nameToId.get(p.player2.toLowerCase().trim()) ?? null)
          : null;

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
