/**
 * Tournament-related types for trainers.gg
 */

/**
 * Phase type options
 */
export type PhaseType = "swiss" | "single_elimination" | "double_elimination";

/**
 * Match format options
 */
export type MatchFormat = "best_of_1" | "best_of_3" | "best_of_5";

/**
 * Advancement type for determining who advances to the next phase
 */
export type AdvancementType = "top_count" | "record_cutoff";

/**
 * Phase configuration for tournament creation
 */
export interface PhaseConfig {
  id: string; // Temporary client-side ID for React keys
  name: string;
  phaseType: PhaseType;
  matchFormat: MatchFormat;
  // Swiss-specific settings
  plannedRounds?: number;
  // Advancement settings (for phases that feed into elimination)
  advancementType?: AdvancementType; // "top_count" = Top 8, "record_cutoff" = X-1
  advancementCount?: number; // For top_count: 4, 8, 16, 32. For record_cutoff: max losses (1, 2, 3)
  // Elimination-specific settings (deprecated in favor of advancement on Swiss phase)
  bracketSize?: number;
}

/**
 * Preset template identifiers
 */
export type TournamentPreset =
  | "swiss_only"
  | "swiss_with_cut"
  | "single_elimination"
  | "double_elimination"
  | "custom";

/**
 * Form data for creating a new tournament
 */
export interface TournamentFormData {
  organizationId?: number;
  name: string;
  slug: string;
  description?: string;
  format?: string;
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
  registrationDeadline?: number;
  rentalTeamPhotosEnabled: boolean;
  rentalTeamPhotosRequired: boolean;
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
  } | null;
  participant2?: {
    id?: string;
    name: string;
    seed?: number;
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
