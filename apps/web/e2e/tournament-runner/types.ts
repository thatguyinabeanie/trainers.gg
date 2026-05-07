/**
 * Tournament Runner Types
 *
 * Defines the scenario format for UI-driven tournament simulations.
 * Each scenario defines a tournament config, player pool, deterministic
 * outcome rules, and assertions to verify after each round.
 */

import type { BrowserContext, Page } from "@playwright/test";

// -- Test User --

export interface TestUser {
  email: string;
  password: string;
  username: string;
}

// -- Tournament Config --

export type TournamentFormat = "swiss_only" | "swiss_with_cut";
export type BestOf = 1 | 3 | 5;

export interface TournamentConfig {
  /** Community slug — host must own this community */
  community: string;
  /** Tournament name */
  name: string;
  /** Tournament format */
  format: TournamentFormat;
  /** Best-of for matches */
  bestOf: BestOf;
  /** Number of Swiss rounds */
  rounds: number;
  /** Max participants (optional) */
  maxParticipants?: number;
  /** Round time in minutes */
  roundTimeMinutes?: number;
  /**
   * Match check-in window in minutes (per game).
   * Controls how long the system waits before auto-awarding a no-show.
   * Not exposed in the creation wizard — set via Supabase in activateTournament.
   * When omitted, the DB default (5 minutes) applies.
   * Set to 1 for faster no-show resolution in test scenarios.
   */
  checkInTimeMinutes?: number;
}

// -- Scenario Definition --

export type PlayerOutcome = "win" | "loss" | "drop" | "no-show";

export interface RoundOverride {
  /** Which round this override applies to */
  round: number;
  /** Username of the player to override */
  player: string;
  /** Forced outcome for this player */
  outcome: PlayerOutcome;
}

export interface StandingsAssertion {
  /** Assert after this round number */
  afterRound: number;
  /** Expected username order (top to bottom) */
  order: string[];
}

export interface Scenario {
  /** Tournament configuration */
  config: TournamentConfig;
  /** The tournament organizer (must own the community) */
  host: TestUser;
  /** Player pool — each gets their own browser context */
  players: TestUser[];
  /**
   * Strength ordering: usernames sorted strongest-first.
   * When two players are paired, the one earlier in this list wins
   * (unless overridden).
   */
  strengthOrder: string[];
  /** Per-round overrides for specific players */
  overrides: RoundOverride[];
  /** Assertions to verify after each round */
  assertions: StandingsAssertion[];
}

// -- Runtime State --

export interface PlayerContext {
  user: TestUser;
  context: BrowserContext;
  page: Page;
}

export interface Pairing {
  /** Table/match number */
  table: number;
  /** Username of player 1 */
  player1: string;
  /** Username of player 2 (null if bye) */
  player2: string | null;
  /** URL to the match page (if available) */
  matchUrl?: string;
}

export type RoundActionType =
  | "check-in-and-report"
  | "check-in-and-wait"
  | "bye"
  | "drop"
  | "no-show";

export interface RoundAction {
  /** Username of the player */
  player: string;
  /** What this player should do */
  type: RoundActionType;
  /** Games to report: 'won' or 'lost' per game in the best-of series */
  games?: ("won" | "lost")[];
}

// -- Runner Options --

export interface RunnerOptions {
  /** Run in headed mode (visible browser) */
  headed?: boolean;
  /** Slow down actions by this many ms (for visual debugging) */
  slowMo?: number;
  /** Base URL of the web app */
  baseUrl: string;
  /** Log verbosity */
  verbose?: boolean;
}
