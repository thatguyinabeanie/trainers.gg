/**
 * Resolve Round Actions
 *
 * Given the actual pairings for a round and the scenario's strength order,
 * determines what each player should do: report a win, wait, drop, or no-show.
 */

import type { BestOf, Pairing, RoundAction, RoundOverride, Scenario } from "./types";

/**
 * For a given round, resolve what each player should do based on:
 * 1. The actual pairings (who is playing whom)
 * 2. The strength order (lower index = stronger)
 * 3. Any overrides for this round (drops, forced outcomes, no-shows)
 *
 * Returns one RoundAction per player involved in the round.
 */
export function resolveRoundActions(
  pairings: Pairing[],
  scenario: Scenario,
  round: number
): RoundAction[] {
  const actions: RoundAction[] = [];
  const overrides = scenario.overrides.filter((o) => o.round === round);

  for (const pairing of pairings) {
    // Handle byes — player with bye does nothing (no match page exists)
    if (!pairing.player2) {
      actions.push({
        player: pairing.player1,
        type: "bye",
      });
      continue;
    }

    const p1Override = findOverride(overrides, pairing.player1);
    const p2Override = findOverride(overrides, pairing.player2);

    // Handle drops
    if (p1Override?.outcome === "drop") {
      actions.push({ player: pairing.player1, type: "drop" });
      actions.push({ player: pairing.player2, type: "check-in-and-wait" });
      continue;
    }
    if (p2Override?.outcome === "drop") {
      actions.push({ player: pairing.player1, type: "check-in-and-wait" });
      actions.push({ player: pairing.player2, type: "drop" });
      continue;
    }

    // Handle no-shows
    if (p1Override?.outcome === "no-show") {
      actions.push({ player: pairing.player1, type: "no-show" });
      actions.push({ player: pairing.player2, type: "check-in-and-wait" });
      continue;
    }
    if (p2Override?.outcome === "no-show") {
      actions.push({ player: pairing.player1, type: "check-in-and-wait" });
      actions.push({ player: pairing.player2, type: "no-show" });
      continue;
    }

    // Determine winner by strength order (or override)
    const winner = determineWinner(
      pairing.player1,
      pairing.player2,
      scenario.strengthOrder,
      p1Override,
      p2Override
    );

    const loser =
      winner === pairing.player1 ? pairing.player2 : pairing.player1;

    // Winner reports: derive game count from bestOf config (wins needed = ceil(bestOf/2))
    const gamesNeeded = getWinGames(scenario.config.bestOf);
    actions.push({
      player: winner,
      type: "check-in-and-report",
      games: gamesNeeded,
    });

    // Loser just checks in and waits for the match to resolve
    actions.push({
      player: loser,
      type: "check-in-and-wait",
    });
  }

  return actions;
}

/**
 * Determine the winner of a head-to-head matchup.
 *
 * Priority:
 * 1. If a player has a forced "win" override, they win
 * 2. If a player has a forced "loss" override, the other wins
 * 3. Otherwise, the player earlier in strengthOrder wins
 */
function determineWinner(
  player1: string,
  player2: string,
  strengthOrder: string[],
  p1Override: RoundOverride | undefined,
  p2Override: RoundOverride | undefined
): string {
  // Forced win takes priority
  if (p1Override?.outcome === "win") return player1;
  if (p2Override?.outcome === "win") return player2;

  // Forced loss means the other wins
  if (p1Override?.outcome === "loss") return player2;
  if (p2Override?.outcome === "loss") return player1;

  // Default: strength order (lower index = stronger = wins)
  const p1Strength = strengthOrder.indexOf(player1);
  const p2Strength = strengthOrder.indexOf(player2);

  // If a player isn't in the strength order, they lose
  if (p1Strength === -1) return player2;
  if (p2Strength === -1) return player1;

  return p1Strength < p2Strength ? player1 : player2;
}

function findOverride(
  overrides: RoundOverride[],
  player: string
): RoundOverride | undefined {
  return overrides.find((o) => o.player === player);
}

/**
 * Derive the minimum games a winner must report for a clean sweep.
 * BO1 → ["won"], BO3 → ["won", "won"], BO5 → ["won", "won", "won"]
 */
function getWinGames(bestOf: BestOf): ("won" | "lost")[] {
  const winsNeeded = Math.ceil(bestOf / 2);
  return Array.from({ length: winsNeeded }, () => "won" as const);
}
