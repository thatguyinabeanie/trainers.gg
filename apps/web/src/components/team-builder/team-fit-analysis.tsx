"use client";

import {
  calculateTeamSynergy,
  getDefensiveMatchups,
  getSpeciesTypes,
  getValidAbilities,
  getLearnableMoves,
} from "@trainers/pokemon";

import { cn } from "@/lib/utils";

// =============================================================================
// Constants
// =============================================================================

/** Abilities that signal a competitive support role. */
const COMPETITIVE_ABILITIES = new Set([
  "Intimidate",
  "Prankster",
  "Drought",
  "Drizzle",
  "Sand Stream",
  "Snow Warning",
  "Electric Surge",
  "Grassy Surge",
  "Psychic Surge",
  "Misty Surge",
  "Regenerator",
  "Magic Bounce",
  "Unaware",
  "Neutralizing Gas",
  "Pressure",
  "Sticky Hold",
  "Gale Wings",
  "Triage",
]);

/** Moves that signal a competitive support role. */
const SUPPORT_MOVES = new Set([
  "Fake Out",
  "Tailwind",
  "Trick Room",
  "Follow Me",
  "Rage Powder",
  "Spore",
  "Thunder Wave",
  "Will-O-Wisp",
  "Icy Wind",
  "Electroweb",
  "Helping Hand",
  "Wide Guard",
  "Quick Guard",
  "Ally Switch",
]);

// =============================================================================
// Types
// =============================================================================

interface TeamFitAnalysisProps {
  currentTeam: Array<{ species: string }>;
  candidateSpecies: string;
}

interface AnalysisItem {
  signal: "+" | "-" | "~";
  text: string;
}

// =============================================================================
// TeamFitAnalysis
// =============================================================================

/**
 * Analyzes how a candidate species fits into the current team.
 *
 * Shows green "+" items for new resistances/immunities and competitive roles,
 * red "−" items for introduced weaknesses or duplicated types,
 * and amber "~" items for neutral observations.
 */
export function TeamFitAnalysis({
  currentTeam,
  candidateSpecies,
}: TeamFitAnalysisProps) {
  const items: AnalysisItem[] = [];

  const candidateTypes = getSpeciesTypes(candidateSpecies);
  const candidateMatchups = getDefensiveMatchups(candidateTypes);

  const currentSynergy = calculateTeamSynergy(currentTeam);
  const withCandidate = calculateTeamSynergy([
    ...currentTeam,
    { species: candidateSpecies },
  ]);

  // -- New resistances/immunities added --
  const currentMatchups = getDefensiveMatchups(
    currentTeam.flatMap((m) => getSpeciesTypes(m.species))
  );

  for (const immunity of candidateMatchups.immunities) {
    if (!currentMatchups.immunities.includes(immunity)) {
      items.push({ signal: "+", text: `Immune to ${immunity}` });
    }
  }

  for (const [type, mult] of Object.entries(candidateMatchups.resistances)) {
    if (!(type in currentMatchups.resistances) && mult !== undefined) {
      items.push({ signal: "+", text: `Resists ${type}` });
    }
  }

  // -- Weaknesses introduced where team already has 2+ weak --
  for (const [type, count] of Object.entries(withCandidate.sharedWeaknesses)) {
    const prevCount = currentSynergy.sharedWeaknesses[type as never] ?? 0;
    if (count >= 2 && count > prevCount) {
      items.push({
        signal: "-",
        text: `Adds ${type} weakness (${count} team members weak)`,
      });
    }
  }

  // -- Duplicated types --
  const existingTypes = new Set(
    currentTeam.flatMap((m) => getSpeciesTypes(m.species))
  );
  for (const type of candidateTypes) {
    if (existingTypes.has(type)) {
      items.push({
        signal: "~",
        text: `Shares ${type} type with existing member`,
      });
    }
  }

  // -- Competitive abilities --
  const abilities = getValidAbilities(candidateSpecies);
  for (const ability of abilities) {
    if (COMPETITIVE_ABILITIES.has(ability)) {
      items.push({ signal: "+", text: `Has ${ability}` });
    }
  }

  // -- Competitive support moves --
  const learnableMoves = new Set(getLearnableMoves(candidateSpecies));
  const supportFound: string[] = [];
  for (const move of SUPPORT_MOVES) {
    if (learnableMoves.has(move)) {
      supportFound.push(move);
    }
  }
  if (supportFound.length > 0) {
    items.push({
      signal: "+",
      text: `Learns: ${supportFound.slice(0, 4).join(", ")}`,
    });
  }

  // -- Uncovered type coverage improvements --
  const prevUncovered = currentSynergy.uncoveredTypes.size;
  const newUncovered = withCandidate.uncoveredTypes.size;
  if (newUncovered < prevUncovered) {
    items.push({
      signal: "+",
      text: `Covers ${prevUncovered - newUncovered} previously uncovered type${prevUncovered - newUncovered > 1 ? "s" : ""}`,
    });
  }

  if (items.length === 0) {
    items.push({
      signal: "~",
      text: "Neutral fit — no significant overlaps or gaps addressed",
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
        Team Fit
      </p>
      {items.map((item) => (
        <div
          key={`${item.signal}:${item.text}`}
          className={cn(
            "flex items-start gap-1.5 text-xs",
            item.signal === "+" && "text-emerald-600 dark:text-emerald-400",
            item.signal === "-" && "text-red-600 dark:text-red-400",
            item.signal === "~" && "text-amber-600 dark:text-amber-400"
          )}
        >
          <span className="mt-0.5 shrink-0 font-bold">
            {item.signal === "+" ? "+" : item.signal === "-" ? "−" : "~"}
          </span>
          <span>{item.text}</span>
        </div>
      ))}
    </div>
  );
}
