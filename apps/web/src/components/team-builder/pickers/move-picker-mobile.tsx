"use client";

/**
 * MovePickerMobile — bottom-sheet Drawer for move selection on mobile.
 *
 * Mirrors SpeciesPickerMobile: Vaul Drawer, sticky search header, scrollable
 * list, and tap-to-select rows. Reuses the same move dataset and legality
 * source as the desktop MovePicker so identical moves appear on both surfaces.
 *
 * Filters: search by name/type/category/effect (matching desktop). Type/
 * category/role filters from the desktop sidebar are deferred — the mobile
 * surface ships with search + USG chip for MVP (see DONE_WITH_CONCERNS note
 * in PR description).
 */

import { useState } from "react";

import { Search } from "lucide-react";

import {
  getLearnableMoves,
  getLegalMoves,
  getMoveData,
  legalSetOrPermissive,
  type GameFormat,
  type MoveData,
} from "@trainers/pokemon";

import {
  Drawer,
  DrawerContent,
  DrawerTitle,
} from "@/components/ui/drawer";

import { useUsageData } from "../use-usage-data";
import { normalizeMoveKey } from "./move-list-shared";
import { MoveMobileRow } from "./move-mobile-row";

// =============================================================================
// Types
// =============================================================================

interface MovePickerMobileProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Currently selected move name, or null when no move is set. */
  value: string | null | undefined;
  species: string;
  format: GameFormat | undefined;
  onPick: (moveName: string) => void;
}

type MoveEntry = {
  name: string;
  data: MoveData;
};

// =============================================================================
// MovePickerMobile
// =============================================================================

/**
 * Mobile-native move picker.
 *
 * Opens as a bottom-sheet Drawer. Provides:
 * - Full-width search input (name, type, category, shortDesc)
 * - Scrollable list of species-legal moves
 * - Per-row USG chip when usage data is available
 * - Tap-to-select with current selection highlight
 */
export function MovePickerMobile({
  open,
  onOpenChange,
  value,
  species,
  format,
  onPick,
}: MovePickerMobileProps) {
  const [query, setQuery] = useState("");

  // -------------------------------------------------------------------------
  // Usage data — same hook as desktop MovePicker
  // -------------------------------------------------------------------------
  const { data: usagePeriods } = useUsageData(species, format);

  // Build normalized-key → currentPct map from the latest period only.
  // Mobile doesn't show sparklines, so only the most recent usage % is needed.
  // Using the latest period directly avoids stale values for moves absent from
  // recent periods (sparse accumulation would keep the last-seen pct in place).
  const usageMap = new Map<string, number>();
  const latestPeriod = usagePeriods?.[usagePeriods.length - 1];
  if (latestPeriod) {
    for (const move of latestPeriod.moves) {
      usageMap.set(normalizeMoveKey(move.value), move.pct);
    }
  }

  // -------------------------------------------------------------------------
  // Candidate move list — same as desktop picker
  // -------------------------------------------------------------------------
  const legalMoves = format
    ? Array.from(
        legalSetOrPermissive(getLegalMoves(species, format.id)) ??
          getLearnableMoves(species)
      ).sort()
    : getLearnableMoves(species);

  // -------------------------------------------------------------------------
  // Filter pipeline — search by name, type, category, or shortDesc
  // -------------------------------------------------------------------------
  const lower = query.toLowerCase();
  const filtered: MoveEntry[] = [];
  for (const name of legalMoves) {
    const data = getMoveData(name, format?.id);
    // Skip moves with no data — excluding here keeps the counter accurate
    // (a null entry counted in filtered.length but skipped in the render
    // would show a mismatch between the "X/Y" chip and visible rows).
    if (!data) continue;
    if (lower) {
      const matches =
        name.toLowerCase().includes(lower) ||
        data.shortDesc?.toLowerCase().includes(lower) ||
        data.type?.toLowerCase().includes(lower) ||
        data.category?.toLowerCase().includes(lower);
      if (!matches) continue;
    }
    filtered.push({ name, data });
  }

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) setQuery("");
    onOpenChange(nextOpen);
  }

  function handlePick(moveName: string) {
    onPick(moveName);
    handleOpenChange(false);
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent
        showHandle={false}
        className="h-[95dvh] data-[vaul-drawer-direction=bottom]:max-h-[95dvh] overflow-hidden rounded-t-2xl p-0"
      >
        <DrawerTitle className="sr-only">Choose move</DrawerTitle>

        {/* Drag handle */}
        <div
          aria-hidden="true"
          className="mx-auto mt-2 mb-1 h-1 w-9 shrink-0 rounded-full bg-muted-foreground/20"
        />

        {/* Bounded container — flex-1 fills the remaining drawer height */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {/* Search header — sticky at the top of the drawer */}
          <div className="flex h-11 shrink-0 items-center gap-2 border-b border-border px-3">
            <Search className="text-muted-foreground size-4 shrink-0" />
            <input
              type="text"
              placeholder="Search by name, type, or effect…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search moves"
              className="placeholder:text-muted-foreground/60 min-w-0 flex-1 bg-transparent text-[16px] leading-tight focus:outline-none sm:text-sm" // text-[16px]: prevents iOS auto-zoom on focus (zoom triggers below 16px)
            />
            <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
              {filtered.length}/{legalMoves.length}
            </span>
          </div>

          {/* Scrollable move list */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {filtered.map(({ name, data }) => {
              // Ensure move data has the canonical name from our list
              const moveData = { ...data, name };
              return (
                <MoveMobileRow
                  key={name}
                  move={moveData}
                  isSelected={name === value}
                  usagePct={usageMap.get(normalizeMoveKey(name))}
                  onPick={handlePick}
                />
              );
            })}
            {filtered.length === 0 && (
              <div className="text-muted-foreground p-6 text-center text-sm">
                No moves match your search.
              </div>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
