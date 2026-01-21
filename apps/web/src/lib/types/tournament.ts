/**
 * Tournament-related types for trainers.gg
 */

import type { Id } from "@trainers/backend-convex/convex/_generated/dataModel";

/**
 * Form data for creating a new tournament
 */
export interface TournamentFormData {
  organizationId?: string;
  name: string;
  slug: string;
  description?: string;
  format?: string;
  tournamentFormat:
    | "swiss_only"
    | "swiss_with_cut"
    | "single_elimination"
    | "double_elimination";
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
  _id: Id<"tournamentMatches">;
  matchNumber: number;
  status: string;
  gameWins1: number;
  gameWins2: number;
  winnerProfileId?: Id<"profiles"> | null;
  isBye?: boolean;
  participant1?: {
    id?: Id<"profiles">;
    name: string;
    seed?: number;
    isBye?: boolean;
  } | null;
  participant2?: {
    id?: Id<"profiles">;
    name: string;
    seed?: number;
  } | null;
}

/**
 * Tournament round data
 */
export interface TournamentRound {
  _id: Id<"tournamentRounds">;
  roundNumber: number;
  name: string;
  status: string;
  matches: TournamentMatch[];
}

/**
 * Tournament phase data
 */
export interface TournamentPhase {
  _id: Id<"tournamentPhases">;
  name: string;
  format: string;
  status: string;
  rounds: TournamentRound[];
}

/**
 * Selected player for invitations
 */
export interface SelectedPlayer {
  _id: Id<"profiles">;
  username: string;
  displayName: string;
  avatarUrl?: string;
  tier?: string;
}
