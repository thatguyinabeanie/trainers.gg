/**
 * Tournament Data Adapters
 *
 * Convert between database format (snake_case, ISO strings) and
 * frontend form format (camelCase, PhaseConfig[]).
 */

import type { PhaseConfig, PhaseType, PhaseStatus, CutRule } from "./types";

/**
 * Database phase row type (from Supabase)
 */
export interface DBPhase {
  id: number;
  tournament_id: number;
  name: string;
  phase_order: number;
  phase_type: string;
  status: string | null;
  best_of: number | null;
  round_time_minutes: number | null;
  check_in_time_minutes: number | null;
  planned_rounds: number | null;
  current_round: number | null;
  cut_rule: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string | null;
}

/**
 * Phase update format for database mutations
 */
export interface DBPhaseUpdate {
  id?: number; // undefined for new phases
  name: string;
  phase_order: number;
  phase_type: string;
  best_of: number;
  round_time_minutes: number;
  check_in_time_minutes: number;
  planned_rounds?: number | null;
  cut_rule?: string | null;
}

/**
 * Valid phase types for type narrowing
 */
const VALID_PHASE_TYPES: PhaseType[] = [
  "swiss",
  "single_elimination",
  "double_elimination",
];

/**
 * Valid cut rules for type narrowing
 */
const VALID_CUT_RULES: CutRule[] = [
  "x-1",
  "x-2",
  "x-3",
  "top-4",
  "top-8",
  "top-16",
  "top-32",
];

/**
 * Valid phase statuses for type narrowing
 */
const VALID_PHASE_STATUSES: PhaseStatus[] = ["pending", "active", "completed"];

/**
 * Type guard for PhaseStatus
 */
function isPhaseStatus(value: string | null): value is PhaseStatus {
  return value !== null && VALID_PHASE_STATUSES.includes(value as PhaseStatus);
}

/**
 * Type guard for PhaseType
 */
function isPhaseType(value: string): value is PhaseType {
  return VALID_PHASE_TYPES.includes(value as PhaseType);
}

/**
 * Type guard for CutRule
 */
function isCutRule(value: string | null): value is CutRule {
  return value !== null && VALID_CUT_RULES.includes(value as CutRule);
}

/**
 * Type guard for BestOf values
 */
function isBestOf(value: number | null): value is 1 | 3 | 5 {
  return value === 1 || value === 3 || value === 5;
}

/**
 * Generate a temporary client-side ID for new phases
 */
function generatePhaseId(): string {
  return `phase-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Convert database phases to frontend PhaseConfig format
 */
export function dbPhasesToPhaseConfigs(dbPhases: DBPhase[]): PhaseConfig[] {
  return dbPhases
    .sort((a, b) => a.phase_order - b.phase_order)
    .map((dbPhase) => {
      const phaseType = isPhaseType(dbPhase.phase_type)
        ? dbPhase.phase_type
        : "swiss";

      const bestOf = isBestOf(dbPhase.best_of) ? dbPhase.best_of : 3;

      return {
        id: `db-${dbPhase.id}`,
        name: dbPhase.name,
        phaseType,
        bestOf,
        roundTimeMinutes: dbPhase.round_time_minutes ?? 50,
        checkInTimeMinutes: dbPhase.check_in_time_minutes ?? 5,
        plannedRounds: dbPhase.planned_rounds ?? undefined,
        cutRule: isCutRule(dbPhase.cut_rule) ? dbPhase.cut_rule : undefined,
        status: isPhaseStatus(dbPhase.status) ? dbPhase.status : undefined,
      };
    });
}

/**
 * Convert frontend PhaseConfig to database update format
 */
export function phaseConfigToDbUpdate(
  phase: PhaseConfig,
  order: number
): DBPhaseUpdate {
  // Extract DB ID if this is an existing phase
  const dbId = phase.id.startsWith("db-")
    ? parseInt(phase.id.replace("db-", ""), 10)
    : undefined;

  return {
    id: dbId,
    name: phase.name,
    phase_order: order,
    phase_type: phase.phaseType,
    best_of: phase.bestOf,
    round_time_minutes: phase.roundTimeMinutes,
    check_in_time_minutes: phase.checkInTimeMinutes,
    planned_rounds: phase.plannedRounds ?? null,
    cut_rule: phase.cutRule ?? null,
  };
}

/**
 * Convert array of PhaseConfigs to database update format
 */
export function phaseConfigsToDbUpdates(
  phases: PhaseConfig[]
): DBPhaseUpdate[] {
  return phases.map((phase, index) => phaseConfigToDbUpdate(phase, index + 1));
}

/**
 * Create a default Swiss phase configuration
 */
export function createDefaultSwissPhase(): PhaseConfig {
  return {
    id: generatePhaseId(),
    name: "Swiss Rounds",
    phaseType: "swiss",
    bestOf: 3,
    roundTimeMinutes: 50,
    checkInTimeMinutes: 5,
  };
}

/**
 * Create a default elimination phase configuration
 */
export function createDefaultEliminationPhase(
  hasSwissBefore: boolean
): PhaseConfig {
  return {
    id: generatePhaseId(),
    name: "Top Cut",
    phaseType: "single_elimination",
    bestOf: 3,
    roundTimeMinutes: 50,
    checkInTimeMinutes: 5,
    cutRule: hasSwissBefore ? "x-2" : undefined,
  };
}

/**
 * Get default phase name based on type
 */
export function getDefaultPhaseName(phaseType: PhaseType): string {
  switch (phaseType) {
    case "swiss":
      return "Swiss Rounds";
    case "single_elimination":
      return "Top Cut";
    case "double_elimination":
      return "Double Elimination";
  }
}

/**
 * Get default round time based on Best Of format
 * VGC: ~20 min/game + ~5 min buffer per game
 */
export function getDefaultRoundTime(bestOf: 1 | 3 | 5): number {
  switch (bestOf) {
    case 1:
      return 25;
    case 3:
      return 50;
    case 5:
      return 75;
  }
}
