/**
 * Tournament phase presets and utility functions
 *
 * Shared between create wizard and edit settings.
 */

import type {
  PhaseConfig,
  TournamentPreset,
  CutRule,
} from "@trainers/tournaments/types";

/**
 * Preset configuration for quick tournament setup
 */
export interface PresetConfig {
  id: TournamentPreset;
  name: string;
  description: string;
  phases: Omit<PhaseConfig, "id">[];
}

/**
 * Standard tournament presets
 */
export const TOURNAMENT_PRESETS: PresetConfig[] = [
  {
    id: "swiss_with_cut",
    name: "Competitive Tournament",
    description: "Swiss rounds followed by single elimination bracket",
    phases: [
      {
        name: "Swiss Rounds",
        phaseType: "swiss",
        bestOf: 3,
        roundTimeMinutes: 50,
        checkInTimeMinutes: 5,
      },
      {
        name: "Top Cut",
        phaseType: "single_elimination",
        bestOf: 3,
        roundTimeMinutes: 50,
        checkInTimeMinutes: 5,
        cutRule: "x-2" as CutRule,
      },
    ],
  },
  {
    id: "swiss_only",
    name: "Practice Tournament",
    description: "Swiss rounds with no elimination bracket",
    phases: [
      {
        name: "Swiss Rounds",
        phaseType: "swiss",
        bestOf: 3,
        roundTimeMinutes: 50,
        checkInTimeMinutes: 5,
      },
    ],
  },
];

/**
 * Generate a unique phase ID for client-side tracking
 */
export function generatePhaseId(): string {
  return `phase-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Derive the legacy tournamentFormat from phases for backward compatibility
 */
export function deriveTournamentFormat(
  phases: PhaseConfig[]
):
  | "swiss_only"
  | "swiss_with_cut"
  | "single_elimination"
  | "double_elimination" {
  if (phases.length === 0) return "swiss_only";

  const hasSwiss = phases.some((p) => p.phaseType === "swiss");
  const hasElimination = phases.some(
    (p) =>
      p.phaseType === "single_elimination" ||
      p.phaseType === "double_elimination"
  );
  const hasDoubleElim = phases.some(
    (p) => p.phaseType === "double_elimination"
  );

  if (hasSwiss && hasElimination) return "swiss_with_cut";
  if (hasDoubleElim) return "double_elimination";
  if (hasElimination) return "single_elimination";
  return "swiss_only";
}

/**
 * Detect which preset matches the current phase configuration
 * Returns undefined if no preset matches (custom configuration)
 */
export function detectActivePreset(
  phases: PhaseConfig[]
): TournamentPreset | undefined {
  if (phases.length === 0) return undefined;

  for (const preset of TOURNAMENT_PRESETS) {
    if (phases.length !== preset.phases.length) continue;

    const matches = phases.every((phase, index) => {
      const presetPhase = preset.phases[index];
      if (!presetPhase) return false;

      // Compare phase types - that's the key differentiator
      return phase.phaseType === presetPhase.phaseType;
    });

    if (matches) return preset.id;
  }

  return "custom";
}

/**
 * Apply a preset to generate new phases with unique IDs
 */
export function applyPreset(preset: PresetConfig): PhaseConfig[] {
  return preset.phases.map((p) => ({
    ...p,
    id: generatePhaseId(),
  }));
}

/**
 * Find a preset by ID
 */
export function getPresetById(id: TournamentPreset): PresetConfig | undefined {
  return TOURNAMENT_PRESETS.find((p) => p.id === id);
}
