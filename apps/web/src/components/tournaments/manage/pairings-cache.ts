/**
 * Pure cache-merge helpers for the judge pairings board.
 *
 * Phase 3 (P3-5): the `pairings-matches-${roundId}` realtime channel feeds the
 * changed `tournament_matches` row straight into the TanStack cache via
 * `setQueryData` instead of triggering a full refetch. `upsertMatchInPairings`
 * is the pure reducer that performs that merge so it can be unit-tested in
 * isolation.
 *
 * NOTE (dedup opportunity): P3-4 owns a `match/realtime-helpers.ts` for the
 * match-detail surface. When that file lands, this match-upsert-by-id logic
 * could be hoisted there (or into a shared `@trainers/...` helper) and imported
 * by both surfaces. It is intentionally local for now — P3-5 must not edit
 * P3-4's file.
 */

import {
  type TournamentPairingsData,
  type PhaseRoundsWithMatchesRow,
} from "@/lib/data/tournament-pairings-endpoint";

/** A single match row as it appears inside `allPhaseRounds[*][*].matches`. */
type PairingsMatch = PhaseRoundsWithMatchesRow["matches"][number];

/**
 * Shape of the changed-match payload delivered by the realtime UPDATE event.
 *
 * Realtime only sends the columns present on the `tournament_matches` row — it
 * does NOT include the `player1` / `player2` / `*Stats` joins that the API
 * fetcher hydrates. We therefore merge the incoming scalar columns onto the
 * EXISTING cached match (preserving its joins) rather than replacing the match
 * wholesale. A partial payload that does not match any cached row is ignored.
 */
type MatchUpdatePayload = { id?: number | string | null } & Record<
  string,
  unknown
>;

/**
 * Return a new `TournamentPairingsData` with the match identified by
 * `payload.id` patched in place across `allPhaseRounds`.
 *
 * - Scalar columns from `payload` are shallow-merged onto the existing cached
 *   match, so realtime updates (status, game wins, staff_requested, …) apply
 *   without dropping the hydrated player joins.
 * - If no cached match has the payload's id (or the payload has no id), the
 *   original `data` reference is returned unchanged — callers can rely on
 *   reference equality to skip a no-op render.
 * - When `data` is undefined (cache not yet populated), undefined is returned
 *   so `setQueryData` leaves the cache untouched until the first fetch lands.
 *
 * The function is pure: it never mutates the input.
 */
export function upsertMatchInPairings(
  data: TournamentPairingsData | undefined,
  payload: MatchUpdatePayload
): TournamentPairingsData | undefined {
  if (!data) return data;

  const rawId = payload.id;
  if (rawId == null) return data;
  const targetId = typeof rawId === "string" ? Number(rawId) : rawId;
  if (Number.isNaN(targetId)) return data;

  let changed = false;

  const allPhaseRounds = data.allPhaseRounds.map((rounds) =>
    rounds.map((round) => {
      const matchIndex = round.matches.findIndex((m) => m.id === targetId);
      if (matchIndex === -1) return round;

      const existing = round.matches[matchIndex]!;
      // Shallow-merge the incoming scalar columns onto the cached row so the
      // player/stat joins the API hydrated are preserved.
      const merged = { ...existing, ...payload, id: existing.id };

      const nextMatches = round.matches.slice();
      nextMatches[matchIndex] = merged as PairingsMatch;
      changed = true;
      return { ...round, matches: nextMatches };
    })
  );

  if (!changed) return data;

  return { ...data, allPhaseRounds };
}
