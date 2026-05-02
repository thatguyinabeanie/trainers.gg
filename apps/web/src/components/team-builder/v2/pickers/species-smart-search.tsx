/**
 * SpeciesSmartSearch — search hint panel rendered above the species table when
 * the picker has a non-empty query. Categorizes the query into Type / Moves /
 * Abilities suggestions so the user can promote the search into a structured
 * filter (e.g. typing "fire" surfaces "Filter by Type: Fire"). Pokémon results
 * are NOT duplicated here — the main species table below is filtered by the
 * same query and shows them as full rich rows.
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
}

// =============================================================================
// Constants
// =============================================================================

const MAX_PER_CATEGORY = 5;

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
}: SpeciesSmartSearchProps) {
  const q = query.trim().toLowerCase();
  if (!q) return null;

  // Types (cap 5)
  const matchedTypes = (ALL_TYPES as readonly string[])
    .filter((t) => t.toLowerCase().includes(q))
    .slice(0, MAX_PER_CATEGORY);

  // Moves (cap 5) — only when format is known
  const matchedMoves = format?.id
    ? getAllLegalMoves(format.id)
        .filter((m) => m.toLowerCase().includes(q))
        .slice(0, MAX_PER_CATEGORY)
    : [];

  // Abilities (cap 5) — walk index collecting unique matches
  const abilitySet = new Set<string>();
  for (const entry of index) {
    for (const a of [
      entry.abilitySlot1,
      entry.abilitySlot2,
      entry.hiddenAbility,
    ]) {
      if (a && a.toLowerCase().includes(q)) abilitySet.add(a);
    }
  }
  const matchedAbilities = Array.from(abilitySet).slice(0, MAX_PER_CATEGORY);

  // Species are rendered by the main table (filtered by query) below the
  // smart-search panel — no need to duplicate them here. The smart-search
  // panel only surfaces non-species categories (Type / Moves / Abilities)
  // that the user might want to apply as filters.
  const total =
    matchedTypes.length + matchedMoves.length + matchedAbilities.length;

  // Empty smart-search results don't render any chrome at all — the main
  // table (with its own "No Pokémon match" empty state) takes over.
  if (total === 0) return null;

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
    </div>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

/**
 * Labeled group separated from siblings by a stronger top border + tinted
 * sticky header. The first section drops its top divider so it sits flush
 * with the picker chrome.
 */
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-border/80 border-t first:border-t-0">
      <h3 className="bg-muted/40 text-muted-foreground border-border/60 sticky top-0 z-10 border-b px-4 py-2 text-[10px] font-bold tracking-widest uppercase">
        {title}
      </h3>
      <div className="py-1">{children}</div>
    </div>
  );
}

interface RowProps {
  label: string;
  sub?: string;
  actionLabel: string;
  onAction: () => void;
}

/**
 * Single result row. The full row is the click target — clicking anywhere
 * triggers `onAction`. The `actionLabel` pill renders as a visual cue inside
 * the same button (it is presentational only, not a nested button).
 */
function Row({ label, sub, actionLabel, onAction }: RowProps) {
  return (
    <button
      type="button"
      onClick={onAction}
      className={cn(
        "hover:bg-muted/50 flex w-full items-center gap-3 px-4 py-1.5 text-left transition-colors",
        "focus-visible:bg-muted/60 focus-visible:outline-none"
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm">{label}</div>
        {sub && (
          <div className="text-muted-foreground truncate text-xs">{sub}</div>
        )}
      </div>
      <span className="border-primary/30 bg-primary/10 text-primary rounded-full border px-3 py-0.5 text-xs font-semibold">
        {actionLabel}
      </span>
    </button>
  );
}
