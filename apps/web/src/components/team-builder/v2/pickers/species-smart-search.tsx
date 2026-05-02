/**
 * SpeciesSmartSearch — search overlay rendered when the species picker has a
 * non-empty query. Categorizes matches into Type, Moves, Abilities, and Pokémon
 * sections, each with an inline action button (Filter / Select).
 */
"use client";

import React from "react";

import {
  ALL_TYPES,
  getAbilityShortDesc,
  getAllLegalMoves,
  type GameFormat,
  type SpeciesSearchEntry,
} from "@trainers/pokemon";

import { cn } from "@/lib/utils";

// =============================================================================
// Types
// =============================================================================

interface FilterAction {
  type?: string;
  move?: string;
  ability?: string;
}

interface SpeciesSmartSearchProps {
  query: string;
  index: SpeciesSearchEntry[];
  format: GameFormat | undefined;
  onFilter: (action: FilterAction) => void;
  onPick: (species: string) => void;
}

// =============================================================================
// Constants
// =============================================================================

const MAX_PER_CATEGORY = 5;
const MAX_SPECIES = 8;

// =============================================================================
// Main component
// =============================================================================

/**
 * Displays categorized search results for the species picker overlay.
 * Returns null when the trimmed query is empty.
 */
export function SpeciesSmartSearch({
  query,
  index,
  format,
  onFilter,
  onPick,
}: SpeciesSmartSearchProps) {
  const q = query.trim().toLowerCase();
  if (!q) return null;

  // Types (cap 5)
  const matchedTypes = (ALL_TYPES as readonly string[])
    .filter((t) => t.toLowerCase().includes(q))
    .slice(0, MAX_PER_CATEGORY);

  // Moves (cap 5) — only when format is known
  const matchedMoves =
    format?.id
      ? getAllLegalMoves(format.id)
          .filter((m) => m.toLowerCase().includes(q))
          .slice(0, MAX_PER_CATEGORY)
      : [];

  // Abilities (cap 5) — walk index collecting unique matches
  const abilitySet = new Set<string>();
  for (const entry of index) {
    for (const a of [entry.abilitySlot1, entry.abilitySlot2, entry.hiddenAbility]) {
      if (a && a.toLowerCase().includes(q)) abilitySet.add(a);
    }
  }
  const matchedAbilities = Array.from(abilitySet).slice(0, MAX_PER_CATEGORY);

  // Species (cap 8)
  const matchedSpecies = index
    .filter((e) => e.species.toLowerCase().includes(q))
    .slice(0, MAX_SPECIES);

  const total =
    matchedTypes.length +
    matchedMoves.length +
    matchedAbilities.length +
    matchedSpecies.length;

  if (total === 0) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        No results for &ldquo;{query}&rdquo;
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {matchedTypes.length > 0 && (
        <Section title="Type">
          {matchedTypes.map((t) => (
            <Row
              key={t}
              label={t}
              actionLabel="Filter"
              onAction={() => onFilter({ type: t })}
            />
          ))}
        </Section>
      )}

      {matchedMoves.length > 0 && (
        <Section title="Moves">
          {matchedMoves.map((m) => (
            <Row
              key={m}
              label={m}
              actionLabel="Filter"
              onAction={() => onFilter({ move: m })}
            />
          ))}
        </Section>
      )}

      {matchedAbilities.length > 0 && (
        <Section title="Abilities">
          {matchedAbilities.map((a) => (
            <Row
              key={a}
              label={a}
              sub={getAbilityShortDesc(a) ?? undefined}
              actionLabel="Filter"
              onAction={() => onFilter({ ability: a })}
            />
          ))}
        </Section>
      )}

      {matchedSpecies.length > 0 && (
        <Section title="Pokémon">
          {matchedSpecies.map((s) => (
            <Row
              key={s.species}
              label={s.species}
              actionLabel="Select"
              onAction={() => onPick(s.species)}
            />
          ))}
        </Section>
      )}
    </div>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

/** Labeled group with a bottom border divider (removed on last child). */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-border/40 last:border-b-0">
      <h3 className="px-4 py-1.5 text-[9.5px] font-bold uppercase tracking-widest text-muted-foreground">
        {title}
      </h3>
      {children}
    </div>
  );
}

interface RowProps {
  label: string;
  sub?: string;
  actionLabel: string;
  onAction: () => void;
}

/** Single result row with an optional subtitle and an action pill button. */
function Row({ label, sub, actionLabel, onAction }: RowProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-1.5",
        "hover:bg-muted/50"
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm">{label}</div>
        {sub && (
          <div className="truncate text-xs text-muted-foreground">{sub}</div>
        )}
      </div>
      <button
        type="button"
        onClick={onAction}
        className="rounded-full border border-primary/30 bg-primary/10 px-3 py-0.5 text-xs font-semibold text-primary hover:bg-primary/20"
      >
        {actionLabel}
      </button>
    </div>
  );
}
