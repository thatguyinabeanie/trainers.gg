/**
 * Dashboard Types
 *
 * Type definitions for the trainer dashboard components.
 */

export interface DashboardTournament {
  _id: string;
  name: string;
  startDate?: number;
  status?: "upcoming" | "in_progress" | "completed";
  format?: string;
  playerCount?: number;
  maxPlayers?: number;
}

export interface DashboardOrganization {
  _id: string;
  name: string;
  role: string;
  slug?: string;
}

export interface DashboardActivity {
  _id: string;
  tournamentName: string;
  opponentName: string;
  result: "won" | "lost";
  date: number;
}

export interface DashboardAchievement {
  id: string;
  title: string;
  description: string;
  icon: "Trophy" | "Award" | "Star";
  color: string;
  earnedAt?: number;
}

export interface DashboardStats {
  winRate: number;
  winRateChange: number;
  currentRating: number;
  ratingRank: number;
  activeTournaments: number;
  totalEnrolled: number;
  championPoints: number;
}
