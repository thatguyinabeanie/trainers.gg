/**
 * Tournament Runner
 *
 * UI-driven tournament simulation using isolated Playwright browser contexts.
 * Each player gets their own browser context with isolated auth state.
 *
 * Architecture:
 * - Host context: creates tournament, manages rounds, reads pairings/standings
 * - Player contexts (N): register, submit teams, check in, report matches
 * - Orchestrator: phase-driven execution with parallel player actions
 * - Scenarios: define tournament config, player pool, deterministic outcomes
 *
 * Usage:
 *   pnpm test:tournament                          # Run default scenario
 *   pnpm test:tournament --scenario swiss-8-drops  # Run with drops/upsets
 *   pnpm test:tournament --headed                  # Watch it run
 *   pnpm test:tournament --headed --slow-mo 500    # Slow for debugging
 */

export { TournamentOrchestrator } from "./orchestrator";
export { resolveRoundActions } from "./resolve-actions";
export { swiss8 } from "./scenarios/swiss-8";
export { swiss8Drops } from "./scenarios/swiss-8-drops";
export type * from "./types";
