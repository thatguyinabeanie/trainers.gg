/**
 * Tournament Generator
 *
 * Generates tournaments with phases for each organization.
 *
 * Schema notes:
 * - tournaments have organization_id, tournament_format enum
 * - tournament_phases have tournament_id, phase_type, phase_order
 * - tournament_registrations link alts to tournaments (alt_id, not user_id)
 */

import {
  SEED_CONFIG,
  type TournamentFormat,
  type PhaseType,
} from "../config.js";
import {
  deterministicPick,
  deterministicShuffle,
  deterministicUUID,
  hash,
  weightedSelect,
  deterministicInt,
} from "../utils/deterministic.js";
import { type GeneratedOrganization } from "./organizations.js";
import { type GeneratedAlt } from "./users.js";

/**
 * Tournament status enum - must match database enum:
 * 'draft', 'upcoming', 'active', 'paused', 'completed', 'cancelled'
 */
export type TournamentStatus =
  | "draft"
  | "upcoming"
  | "active"
  | "paused"
  | "completed"
  | "cancelled";

export type PhaseStatus = "pending" | "active" | "completed";

export interface GeneratedTournament {
  id: number;
  organizationId: number;
  name: string;
  slug: string;
  description: string;
  format: string;
  status: TournamentStatus;
  startDate: Date;
  endDate: Date;
  maxParticipants: number;
  topCutSize: number | null;
  swissRounds: number | null;
  tournamentFormat: TournamentFormat;
  roundTimeMinutes: number;
  featured: boolean;
  week: number;
  weekOffset: number; // negative = past, 0 = current, positive = future
  isMain: boolean; // main tournament vs practice
  isFlagship: boolean;
  forceActive: boolean; // true for flagship tournaments that should always appear in-progress
}

export interface GeneratedTournamentPhase {
  id: number;
  tournamentId: number;
  name: string;
  phaseOrder: number;
  phaseType: PhaseType;
  status: PhaseStatus;
  bestOf: number; // 1, 3, or 5
  roundTimeMinutes: number;
  plannedRounds: number | null;
  currentRound: number;
  cutRule: string | null; // "x-1", "x-2", "x-3", "top-4", "top-8", "top-16", "top-32"
  checkInTimeMinutes: number;
}

export interface GeneratedTournamentRegistration {
  id: number;
  tournamentId: number;
  altId: number;
  status: "registered" | "checked_in";
  registeredAt: Date;
  checkedInAt: Date | null;
  /** Set by team generator for checked-in registrations */
  teamId: number | null;
  /** When team was submitted */
  teamSubmittedAt: Date | null;
  /** Whether team is locked (cannot be changed) */
  teamLocked: boolean;
  /** Whether this upcoming registration has a team submitted (for testing enforcement) */
  hasTeamSubmitted: boolean;
}

/**
 * Calculate the Monday of a given week offset from today
 */
function getWeekStartDate(weeksAgo: number): Date {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const monday = new Date(today);
  monday.setDate(today.getDate() - daysToMonday - weeksAgo * 7);
  monday.setHours(0, 0, 0, 0);

  return monday;
}

/**
 * Get the date for a specific day of the week within a given week
 */
function getDayInWeek(weekStart: Date, dayOfWeek: number, hour: number): Date {
  const date = new Date(weekStart);
  // dayOfWeek: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  date.setDate(weekStart.getDate() + daysFromMonday);
  date.setHours(hour, 0, 0, 0);
  return date;
}

/**
 * Generate tournament name
 */
function generateTournamentName(
  org: GeneratedOrganization,
  week: number,
  isMain: boolean,
  isFlagship: boolean,
  flagshipName?: string
): string {
  if (isFlagship && flagshipName) {
    return flagshipName;
  }

  const weekLabel = `Week ${week}`;

  if (isMain) {
    return `${org.name} ${weekLabel} Championship`;
  } else {
    return `${org.name} ${weekLabel} Practice`;
  }
}

/**
 * Generate tournament slug
 */
function generateTournamentSlug(
  org: GeneratedOrganization,
  week: number,
  isMain: boolean,
  isFlagship: boolean
): string {
  const weekPart = `week-${week.toString().padStart(2, "0")}`;

  if (isFlagship) {
    return `${org.slug}-championship-${weekPart}`;
  }

  if (isMain) {
    return `${org.slug}-${weekPart}`;
  } else {
    return `${org.slug}-practice-${weekPart}`;
  }
}

/**
 * Get tournament size based on config
 */
function getTournamentSize(
  seed: string,
  isMain: boolean,
  isFlagship: boolean
): number {
  if (isFlagship) {
    return SEED_CONFIG.FLAGSHIP_TOURNAMENT_SIZE;
  }

  if (isMain) {
    const options = SEED_CONFIG.MAIN_TOURNAMENT_SIZES.map((s) => ({
      value: s.size,
      weight: s.weight,
    }));
    return weightedSelect(options, seed);
  }

  // Practice tournament - pick from practice sizes
  const practiceIndex = Math.floor(
    hash(seed) * SEED_CONFIG.PRACTICE_TOURNAMENT_SIZES.length
  );
  return SEED_CONFIG.PRACTICE_TOURNAMENT_SIZES[practiceIndex]!;
}

/**
 * Get tournament format based on type
 */
function getTournamentFormat(
  seed: string,
  isMain: boolean,
  isFlagship: boolean
): TournamentFormat {
  if (isFlagship || isMain) {
    return "swiss_with_cut";
  }

  // Practice tournaments have variable formats
  const options = SEED_CONFIG.PRACTICE_FORMATS.map((f) => ({
    value: f.format,
    weight: f.weight,
  }));
  return weightedSelect(options, seed);
}

/**
 * Determine tournament status based on dates relative to now
 *
 * Maps to database enum: 'draft', 'upcoming', 'active', 'paused', 'completed', 'cancelled'
 * - upcoming: registration is open or closed, tournament hasn't started
 * - active: tournament is in progress
 * - completed: tournament has ended
 */
function getTournamentStatus(startDate: Date, endDate: Date): TournamentStatus {
  const now = new Date();

  if (now < startDate) {
    return "upcoming";
  }
  if (now < endDate) {
    return "active";
  }
  return "completed";
}

/**
 * Determine phase status based on tournament status
 */
function getPhaseStatus(
  tournamentStatus: TournamentStatus,
  phaseOrder: number
): PhaseStatus {
  if (tournamentStatus === "completed") {
    return "completed";
  }
  if (tournamentStatus === "active") {
    // For simplicity, first phase is active, rest are pending
    return phaseOrder === 1 ? "active" : "pending";
  }
  return "pending";
}

/**
 * Generate all tournaments for all organizations
 *
 * Creates 3 tournaments per org:
 * 1. Week 1 (past) — completed, full capacity, all checked in with teams
 * 2. Week 2 (current) — active flagship, full capacity, all checked in with teams
 * 3. Week 3 (upcoming) — starts in ~1 hour, partial registration, check-in open, no check-ins yet
 */
export function generateTournaments(
  organizations: GeneratedOrganization[]
): GeneratedTournament[] {
  const tournaments: GeneratedTournament[] = [];
  let tournamentId = 1;

  const pastWeeks = SEED_CONFIG.WEEKS_OF_PAST_TOURNAMENTS;
  const futureWeeks = SEED_CONFIG.WEEKS_OF_FUTURE_TOURNAMENTS;
  const totalWeeks = pastWeeks + futureWeeks + 1; // +1 for current week

  // Generate weekly main tournaments
  for (let weekIndex = 0; weekIndex < totalWeeks; weekIndex++) {
    const weekOffset = weekIndex - pastWeeks;
    const weekNumber = weekIndex + 1;
    const weekStart = getWeekStartDate(-weekOffset);

    for (const org of organizations) {
      // Check if this is a flagship week
      const flagshipConfig =
        weekOffset <= 0
          ? SEED_CONFIG.FLAGSHIP_TOURNAMENTS.find(
              (f) => f.orgSlug === org.slug && f.week === weekNumber
            )
          : undefined;
      const isFlagship = !!flagshipConfig;

      const mainSeed = `tournament-${org.slug}-week${weekNumber}-main`;
      const mainSize = getTournamentSize(mainSeed, true, isFlagship);
      const mainFormat = getTournamentFormat(mainSeed, true, isFlagship);

      const forceActive =
        flagshipConfig && "active" in flagshipConfig && flagshipConfig.active;
      let mainStartDate: Date;
      let mainEndDate: Date;

      if (forceActive) {
        const now = new Date();
        mainStartDate = new Date(now.getTime() - 3 * 60 * 60 * 1000);
        mainEndDate = new Date(now.getTime() + 5 * 60 * 60 * 1000);
      } else {
        mainStartDate = getDayInWeek(weekStart, org.mainDay, 14);
        mainEndDate = new Date(mainStartDate.getTime() + 6 * 60 * 60 * 1000);
      }

      tournaments.push({
        id: tournamentId++,
        organizationId: org.id,
        name: generateTournamentName(
          org,
          weekNumber,
          true,
          isFlagship,
          flagshipConfig?.name
        ),
        slug: generateTournamentSlug(org, weekNumber, true, isFlagship),
        description: `${org.name} tournament for week ${weekNumber}`,
        format: "VGC",
        status: getTournamentStatus(mainStartDate, mainEndDate),
        startDate: mainStartDate,
        endDate: mainEndDate,
        maxParticipants: mainSize,
        topCutSize:
          mainFormat === "swiss_with_cut"
            ? SEED_CONFIG.TOP_CUT_SIZES[
                mainSize as keyof typeof SEED_CONFIG.TOP_CUT_SIZES
              ] || 8
            : null,
        swissRounds:
          SEED_CONFIG.SWISS_ROUNDS[
            mainSize as keyof typeof SEED_CONFIG.SWISS_ROUNDS
          ] || 5,
        tournamentFormat: mainFormat,
        roundTimeMinutes: SEED_CONFIG.ROUND_TIME_MINUTES,
        featured: isFlagship,
        week: weekNumber,
        weekOffset,
        isMain: true,
        isFlagship,
        forceActive: !!forceActive,
      });
    }
  }

  // Generate a "starting soon" upcoming tournament per org
  // These have check-in windows open (startDate = NOW + 1 hour)
  for (const org of organizations) {
    const weekNumber = totalWeeks + 1; // Week 3
    const upcomingSeed = `tournament-${org.slug}-week${weekNumber}-upcoming`;
    const size = getTournamentSize(upcomingSeed, true, false);
    const format = getTournamentFormat(upcomingSeed, true, false);

    const now = new Date();
    const startDate = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
    const endDate = new Date(startDate.getTime() + 6 * 60 * 60 * 1000);

    tournaments.push({
      id: tournamentId++,
      organizationId: org.id,
      name: `${org.name} Week ${weekNumber} Championship`,
      slug: `${org.slug}-week-${weekNumber.toString().padStart(2, "0")}`,
      description: `${org.name} tournament for week ${weekNumber} — check-in open!`,
      format: "VGC",
      status: "upcoming",
      startDate,
      endDate,
      maxParticipants: size,
      topCutSize:
        format === "swiss_with_cut"
          ? SEED_CONFIG.TOP_CUT_SIZES[
              size as keyof typeof SEED_CONFIG.TOP_CUT_SIZES
            ] || 8
          : null,
      swissRounds:
        SEED_CONFIG.SWISS_ROUNDS[
          size as keyof typeof SEED_CONFIG.SWISS_ROUNDS
        ] || 5,
      tournamentFormat: format,
      roundTimeMinutes: SEED_CONFIG.ROUND_TIME_MINUTES,
      featured: false,
      week: weekNumber,
      weekOffset: 1,
      isMain: true,
      isFlagship: false,
      forceActive: false,
    });
  }

  return tournaments;
}

/**
 * Generate phases for a tournament
 *
 * Phase status is derived from tournament status:
 * - completed tournament -> all phases completed
 * - in_progress tournament -> first phase in_progress, rest pending
 * - registration_open/closed -> all phases pending
 */
export function generateTournamentPhases(
  tournaments: GeneratedTournament[]
): GeneratedTournamentPhase[] {
  const phases: GeneratedTournamentPhase[] = [];
  let phaseId = 1;

  for (const tournament of tournaments) {
    const isCompleted = tournament.status === "completed";

    switch (tournament.tournamentFormat) {
      case "swiss_with_cut": {
        // Phase 1: Swiss rounds
        const swissPhaseStatus = getPhaseStatus(tournament.status, 1);
        const swissCurrentRound = isCompleted
          ? (tournament.swissRounds ?? 0)
          : 0;

        phases.push({
          id: phaseId++,
          tournamentId: tournament.id,
          name: "Swiss Rounds",
          phaseOrder: 1,
          phaseType: "swiss",
          status: swissPhaseStatus,
          bestOf: 3,
          roundTimeMinutes: tournament.roundTimeMinutes,
          plannedRounds: tournament.swissRounds,
          currentRound: swissCurrentRound,
          cutRule: null, // Swiss phase doesn't have cut rule
          checkInTimeMinutes: 5,
        });

        // Phase 2: Top Cut (single elimination)
        // Determine cut rule based on top cut size
        const topCutSize = tournament.topCutSize || 8;
        const cutRule = `top-${topCutSize}`;
        const topCutRounds = Math.ceil(Math.log2(topCutSize));
        const topCutPhaseStatus = getPhaseStatus(tournament.status, 2);
        const topCutCurrentRound = isCompleted ? topCutRounds : 0;

        phases.push({
          id: phaseId++,
          tournamentId: tournament.id,
          name: "Top Cut",
          phaseOrder: 2,
          phaseType: "single_elimination",
          status: topCutPhaseStatus,
          bestOf: 3,
          roundTimeMinutes: tournament.roundTimeMinutes,
          plannedRounds: null,
          currentRound: topCutCurrentRound,
          cutRule: cutRule, // e.g., "top-8"
          checkInTimeMinutes: 5,
        });
        break;
      }

      case "swiss_only": {
        const phaseStatus = getPhaseStatus(tournament.status, 1);
        const currentRound = isCompleted ? (tournament.swissRounds ?? 0) : 0;

        phases.push({
          id: phaseId++,
          tournamentId: tournament.id,
          name: "Swiss Rounds",
          phaseOrder: 1,
          phaseType: "swiss",
          status: phaseStatus,
          bestOf: 3,
          roundTimeMinutes: tournament.roundTimeMinutes,
          plannedRounds: tournament.swissRounds,
          currentRound: currentRound,
          cutRule: null, // Standalone Swiss has no cut
          checkInTimeMinutes: 5,
        });
        break;
      }

      case "single_elimination": {
        const rounds = Math.ceil(Math.log2(tournament.maxParticipants));
        const phaseStatus = getPhaseStatus(tournament.status, 1);
        const currentRound = isCompleted ? rounds : 0;

        phases.push({
          id: phaseId++,
          tournamentId: tournament.id,
          name: "Bracket",
          phaseOrder: 1,
          phaseType: "single_elimination",
          status: phaseStatus,
          bestOf: 3,
          roundTimeMinutes: tournament.roundTimeMinutes,
          plannedRounds: null,
          currentRound: currentRound,
          cutRule: null, // Standalone elimination has no cut rule
          checkInTimeMinutes: 5,
        });
        break;
      }

      case "double_elimination": {
        // For simplicity, treat as single elimination for now
        // TODO: Implement proper double elimination bracket
        const rounds = Math.ceil(Math.log2(tournament.maxParticipants)) + 1;
        const phaseStatus = getPhaseStatus(tournament.status, 1);
        const currentRound = isCompleted ? rounds : 0;

        phases.push({
          id: phaseId++,
          tournamentId: tournament.id,
          name: "Bracket",
          phaseOrder: 1,
          phaseType: "double_elimination",
          status: phaseStatus,
          bestOf: 3,
          roundTimeMinutes: tournament.roundTimeMinutes,
          plannedRounds: null,
          currentRound: currentRound,
          cutRule: null, // Standalone elimination has no cut rule
          checkInTimeMinutes: 5,
        });
        break;
      }
    }
  }

  return phases;
}

/**
 * Generate tournament registrations
 *
 * Randomly selects alts to register for tournaments.
 * Uses primary alts by default but occasionally uses alternate alts.
 *
 * Registration status depends on tournament status:
 * - completed/in_progress tournaments: all players checked_in
 * - registration_closed tournaments: all players checked_in (ready to start)
 * - registration_open tournaments: players are registered (not yet checked in)
 *
 * Future tournaments have fewer registrations (they're still filling up).
 */
export function generateTournamentRegistrations(
  tournaments: GeneratedTournament[],
  alts: GeneratedAlt[]
): GeneratedTournamentRegistration[] {
  const registrations: GeneratedTournamentRegistration[] = [];
  let registrationId = 1;

  // Get primary alts (for most registrations)
  const primaryAlts = alts.filter((a) => a.isPrimary);

  for (const tournament of tournaments) {
    const seed = `registrations-${tournament.id}`;

    // Future tournaments have partial registration (40-80% full)
    // Past/current tournaments are at max capacity
    let targetParticipants = tournament.maxParticipants;
    if (tournament.status === "upcoming") {
      const fillRate = 0.4 + hash(`fill-${tournament.id}`) * 0.4; // 40-80%
      targetParticipants = Math.floor(tournament.maxParticipants * fillRate);
    }

    // Pick random alts for this tournament
    const participants = deterministicPick(
      primaryAlts,
      targetParticipants,
      seed
    );

    // Occasionally swap in an alternate alt (10% of the time)
    for (let i = 0; i < participants.length; i++) {
      const participant = participants[i]!;
      const altSwapChance = hash(`alt-swap-${tournament.id}-${i}`);

      if (altSwapChance < 0.1) {
        // Find an alternate alt for this user
        const userAlts = alts.filter(
          (a) => a.userId === participant.userId && !a.isPrimary
        );
        if (userAlts.length > 0) {
          const altIndex = Math.floor(
            hash(`alt-pick-${tournament.id}-${i}`) * userAlts.length
          );
          participants[i] = userAlts[altIndex]!;
        }
      }
    }

    // Determine registration status based on tournament status
    // Players are checked in for active/completed tournaments
    const isCheckedIn =
      tournament.status === "completed" || tournament.status === "active";

    // Create registrations
    const now = new Date();
    for (let pIdx = 0; pIdx < participants.length; pIdx++) {
      const alt = participants[pIdx]!;
      // Registration time: random time before start (or before now for future tournaments)
      const regWindowEnd =
        tournament.startDate < now ? tournament.startDate : now;
      const regWindowStart = new Date(
        regWindowEnd.getTime() - 7 * 24 * 60 * 60 * 1000
      ); // Up to 7 days before

      const regTimeOffset =
        hash(`reg-time-${tournament.id}-${alt.id}`) *
        (regWindowEnd.getTime() - regWindowStart.getTime());
      const regTime = new Date(regWindowStart.getTime() + regTimeOffset);

      // For upcoming tournaments, ~60% of registered players have teams submitted
      const hasTeamSubmitted =
        !isCheckedIn && hash(`has-team-${tournament.id}-${alt.id}`) < 0.6;

      registrations.push({
        id: registrationId++,
        tournamentId: tournament.id,
        altId: alt.id,
        status: isCheckedIn ? "checked_in" : "registered",
        registeredAt: regTime,
        checkedInAt: isCheckedIn ? tournament.startDate : null,
        // Team fields set later by team generator for checked-in; or here for upcoming
        teamId: null,
        teamSubmittedAt: null,
        teamLocked: false,
        hasTeamSubmitted,
      });
    }
  }

  return registrations;
}

/**
 * Get registrations for a specific tournament
 */
export function getTournamentRegistrations(
  tournamentId: number,
  registrations: GeneratedTournamentRegistration[]
): GeneratedTournamentRegistration[] {
  return registrations.filter((r) => r.tournamentId === tournamentId);
}

/**
 * Get alt IDs for a tournament's participants
 */
export function getTournamentParticipantAltIds(
  tournamentId: number,
  registrations: GeneratedTournamentRegistration[]
): number[] {
  return getTournamentRegistrations(tournamentId, registrations).map(
    (r) => r.altId
  );
}
