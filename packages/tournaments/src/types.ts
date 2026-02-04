/**
 * Tournament-related types for trainers.gg
 */

/**
 * Phase type options
 */
export type PhaseType = "swiss" | "single_elimination" | "double_elimination";

/**
 * Cut rule for elimination phases preceded by Swiss
 * - x-1, x-2, x-3: All players with ≤N losses advance
 * - top-4, top-8, top-16, top-32: Top N by standings advance
 */
export type CutRule =
  | "x-1"
  | "x-2"
  | "x-3"
  | "top-4"
  | "top-8"
  | "top-16"
  | "top-32";

/**
 * Phase configuration for tournament creation
 */
export interface PhaseConfig {
  id: string; // Temporary client-side ID for React keys
  name: string;
  phaseType: PhaseType;
  // Match settings
  bestOf: 1 | 3 | 5;
  roundTimeMinutes: number; // null/0 = no timer
  checkInTimeMinutes: number; // Time before no-show gets game loss (default 5)
  // Swiss-specific settings
  plannedRounds?: number; // null = auto based on registrations
  // Elimination-specific settings (when preceded by Swiss)
  cutRule?: CutRule; // null for standalone phases
}

/**
 * Preset template identifiers
 */
export type TournamentPreset = "swiss_only" | "swiss_with_cut" | "custom";

/**
 * Form data for creating a new tournament
 */
/**
 * Platform where battles take place
 */
export type BattlePlatform = "cartridge" | "showdown";

/**
 * Battle format (singles or doubles)
 */
export type BattleFormat = "singles" | "doubles";

/**
 * Registration type for tournaments
 */
export type RegistrationType = "open" | "invite_only";

export interface TournamentFormData {
  organizationId?: number;
  name: string;
  slug: string;
  description?: string;
  // Game settings
  game?: string; // Pokemon game ID (e.g., "sv", "swsh")
  gameFormat?: string; // Format ID within the game (e.g., "reg-i", "series-13")
  platform: BattlePlatform; // Where battles take place
  battleFormat: BattleFormat; // Singles or doubles
  // Legacy field kept for backward compatibility, derived from phases
  tournamentFormat:
    | "swiss_only"
    | "swiss_with_cut"
    | "single_elimination"
    | "double_elimination";
  // New phase-based configuration
  preset: TournamentPreset;
  phases: PhaseConfig[];
  maxParticipants?: number;
  roundTimeMinutes: number;
  swissRounds?: number;
  topCutSize?: number;
  startDate?: number;
  endDate?: number;
  // Registration settings
  registrationType: RegistrationType;
  playerCapEnabled: boolean; // When false, maxParticipants is unlimited (null in DB)
  checkInRequired: boolean;
  allowLateRegistration: boolean;
  lateCheckInMaxRound?: number;
}

/**
 * Tournament match data
 */
export interface TournamentMatch {
  id: string;
  matchNumber: number;
  status: string;
  gameWins1: number;
  gameWins2: number;
  winnerProfileId?: string | null;
  isBye?: boolean;
  participant1?: {
    id?: string;
    name: string;
    seed?: number;
    isBye?: boolean;
    record?: { wins: number; losses: number };
  } | null;
  participant2?: {
    id?: string;
    name: string;
    seed?: number;
    record?: { wins: number; losses: number };
  } | null;
}

/**
 * Tournament round data
 */
export interface TournamentRound {
  id: string;
  roundNumber: number;
  name: string;
  status: string;
  matches: TournamentMatch[];
}

/**
 * Tournament phase data
 */
export interface TournamentPhase {
  id: string;
  name: string;
  format: string;
  status: string;
  rounds: TournamentRound[];
}

/**
 * Selected player for invitations
 */
export interface SelectedPlayer {
  id: number;
  username: string;
  displayName: string;
  avatarUrl?: string;
  tier?: string;
}
