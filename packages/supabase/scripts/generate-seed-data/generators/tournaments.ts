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

export interface GeneratedTournament {
  id: number;
  organizationId: number;
  name: string;
  slug: string;
  description: string;
  format: string;
  status: "completed";
  startDate: Date;
  endDate: Date;
  registrationDeadline: Date;
  maxParticipants: number;
  topCutSize: number | null;
  swissRounds: number | null;
  tournamentFormat: TournamentFormat;
  roundTimeMinutes: number;
  featured: boolean;
  week: number;
  isMain: boolean; // main tournament vs practice
  isFlagship: boolean;
}

export interface GeneratedTournamentPhase {
  id: number;
  tournamentId: number;
  name: string;
  phaseOrder: number;
  phaseType: PhaseType;
  status: "completed";
  matchFormat: string;
  roundTimeMinutes: number;
  plannedRounds: number | null;
  currentRound: number;
  advancementCount: number | null;
  bracketSize: number | null;
  totalRounds: number | null;
}

export interface GeneratedTournamentRegistration {
  id: number;
  tournamentId: number;
  altId: number;
  status: "registered" | "checked_in";
  registeredAt: Date;
  checkedInAt: Date | null;
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
 * Generate all tournaments for all organizations
 */
export function generateTournaments(
  organizations: GeneratedOrganization[]
): GeneratedTournament[] {
  const tournaments: GeneratedTournament[] = [];
  let tournamentId = 1;

  // Generate tournaments for each week
  for (let week = 1; week <= SEED_CONFIG.WEEKS_OF_HISTORY; week++) {
    const weekStart = getWeekStartDate(SEED_CONFIG.WEEKS_OF_HISTORY - week + 1);

    for (const org of organizations) {
      // Check if this is a flagship week for this org
      const flagshipConfig = SEED_CONFIG.FLAGSHIP_TOURNAMENTS.find(
        (f) => f.orgSlug === org.slug && f.week === week
      );
      const isFlagship = !!flagshipConfig;

      // Main tournament (on org's main day)
      const mainSeed = `tournament-${org.slug}-week${week}-main`;
      const mainSize = getTournamentSize(mainSeed, true, isFlagship);
      const mainFormat = getTournamentFormat(mainSeed, true, isFlagship);
      const mainStartDate = getDayInWeek(weekStart, org.mainDay, 14); // 2 PM

      tournaments.push({
        id: tournamentId++,
        organizationId: org.id,
        name: generateTournamentName(
          org,
          week,
          true,
          isFlagship,
          flagshipConfig?.name
        ),
        slug: generateTournamentSlug(org, week, true, isFlagship),
        description: `${org.name} tournament for week ${week}`,
        format: "VGC",
        status: "completed",
        startDate: mainStartDate,
        endDate: new Date(mainStartDate.getTime() + 6 * 60 * 60 * 1000), // 6 hours
        registrationDeadline: new Date(
          mainStartDate.getTime() - 60 * 60 * 1000
        ), // 1 hour before
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
        week,
        isMain: true,
        isFlagship,
      });

      // Practice tournament (on org's practice day)
      const practiceSeed = `tournament-${org.slug}-week${week}-practice`;
      const practiceSize = getTournamentSize(practiceSeed, false, false);
      const practiceFormat = getTournamentFormat(practiceSeed, false, false);
      const practiceStartDate = getDayInWeek(weekStart, org.practiceDay, 19); // 7 PM

      const practiceSwissRounds =
        practiceFormat === "swiss_only"
          ? SEED_CONFIG.SWISS_ROUNDS[
              practiceSize as keyof typeof SEED_CONFIG.SWISS_ROUNDS
            ] || 4
          : null;

      tournaments.push({
        id: tournamentId++,
        organizationId: org.id,
        name: generateTournamentName(org, week, false, false),
        slug: generateTournamentSlug(org, week, false, false),
        description: `Practice tournament for ${org.name}`,
        format: "VGC",
        status: "completed",
        startDate: practiceStartDate,
        endDate: new Date(practiceStartDate.getTime() + 4 * 60 * 60 * 1000), // 4 hours
        registrationDeadline: new Date(
          practiceStartDate.getTime() - 30 * 60 * 1000
        ), // 30 min before
        maxParticipants: practiceSize,
        topCutSize: null, // No top cut for practice
        swissRounds: practiceSwissRounds,
        tournamentFormat: practiceFormat,
        roundTimeMinutes: SEED_CONFIG.ROUND_TIME_MINUTES,
        featured: false,
        week,
        isMain: false,
        isFlagship: false,
      });
    }
  }

  return tournaments;
}

/**
 * Generate phases for a tournament
 */
export function generateTournamentPhases(
  tournaments: GeneratedTournament[]
): GeneratedTournamentPhase[] {
  const phases: GeneratedTournamentPhase[] = [];
  let phaseId = 1;

  for (const tournament of tournaments) {
    switch (tournament.tournamentFormat) {
      case "swiss_with_cut": {
        // Phase 1: Swiss rounds
        phases.push({
          id: phaseId++,
          tournamentId: tournament.id,
          name: "Swiss Rounds",
          phaseOrder: 1,
          phaseType: "swiss",
          status: "completed",
          matchFormat: "Best of 3",
          roundTimeMinutes: tournament.roundTimeMinutes,
          plannedRounds: tournament.swissRounds,
          currentRound: tournament.swissRounds ?? 0,
          advancementCount: tournament.topCutSize,
          bracketSize: null,
          totalRounds: null,
        });

        // Phase 2: Top Cut (single elimination)
        const topCutRounds = Math.log2(tournament.topCutSize || 8);
        phases.push({
          id: phaseId++,
          tournamentId: tournament.id,
          name: "Top Cut",
          phaseOrder: 2,
          phaseType: "single_elimination",
          status: "completed",
          matchFormat: "Best of 3",
          roundTimeMinutes: tournament.roundTimeMinutes,
          plannedRounds: null,
          currentRound: topCutRounds,
          advancementCount: null,
          bracketSize: tournament.topCutSize,
          totalRounds: topCutRounds,
        });
        break;
      }

      case "swiss_only": {
        phases.push({
          id: phaseId++,
          tournamentId: tournament.id,
          name: "Swiss Rounds",
          phaseOrder: 1,
          phaseType: "swiss",
          status: "completed",
          matchFormat: "Best of 3",
          roundTimeMinutes: tournament.roundTimeMinutes,
          plannedRounds: tournament.swissRounds,
          currentRound: tournament.swissRounds ?? 0,
          advancementCount: null,
          bracketSize: null,
          totalRounds: null,
        });
        break;
      }

      case "single_elimination": {
        const rounds = Math.log2(tournament.maxParticipants);
        phases.push({
          id: phaseId++,
          tournamentId: tournament.id,
          name: "Bracket",
          phaseOrder: 1,
          phaseType: "single_elimination",
          status: "completed",
          matchFormat: "Best of 3",
          roundTimeMinutes: tournament.roundTimeMinutes,
          plannedRounds: null,
          currentRound: rounds,
          advancementCount: null,
          bracketSize: tournament.maxParticipants,
          totalRounds: rounds,
        });
        break;
      }

      case "double_elimination": {
        // For simplicity, treat as single elimination for now
        // TODO: Implement proper double elimination bracket
        const rounds = Math.log2(tournament.maxParticipants) + 1;
        phases.push({
          id: phaseId++,
          tournamentId: tournament.id,
          name: "Bracket",
          phaseOrder: 1,
          phaseType: "double_elimination",
          status: "completed",
          matchFormat: "Best of 3",
          roundTimeMinutes: tournament.roundTimeMinutes,
          plannedRounds: null,
          currentRound: rounds,
          advancementCount: null,
          bracketSize: tournament.maxParticipants,
          totalRounds: rounds,
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

    // Pick random alts for this tournament
    const participants = deterministicPick(
      primaryAlts,
      tournament.maxParticipants,
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

    // Create registrations
    for (const alt of participants) {
      const regTime = new Date(
        tournament.registrationDeadline.getTime() -
          hash(`reg-time-${tournament.id}-${alt.id}`) * 7 * 24 * 60 * 60 * 1000 // Random time within week before
      );

      registrations.push({
        id: registrationId++,
        tournamentId: tournament.id,
        altId: alt.id,
        status: "checked_in",
        registeredAt: regTime,
        checkedInAt: tournament.startDate,
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
