"use client";

import { useEffect, useRef, useState } from "react";

import {
  buildSpeciesSearchIndex,
  type GameFormat,
  type SpeciesSearchEntry,
  getSpeciesTypes,
} from "@trainers/pokemon";

import { cn } from "@/lib/utils";

import { Sprite } from "../sprite";
import { TypePill } from "../type-pill";

// =============================================================================
// Types
// =============================================================================

interface SpeciesPickerProps {
  value: string | null | undefined;
  format: GameFormat | undefined;
  onPick: (speciesId: string) => void;
  onClose: () => void;
}

// Module-level cache — buildSpeciesSearchIndex is expensive (~1200+ species)
const indexCache = new Map<string, SpeciesSearchEntry[]>();

function getCachedIndex(formatId: string): SpeciesSearchEntry[] {
  let idx = indexCache.get(formatId);
  if (!idx) {
    idx = buildSpeciesSearchIndex(formatId);
    indexCache.set(formatId, idx);
  }
  return idx;
}

const MAX_VISIBLE = 80;

// =============================================================================
// SpeciesPicker
// =============================================================================

/**
 * Searchable species picker. Filters by format legality.
 * Each option shows sprite, species name, types, and base stat total.
 *
 * TODO Phase 9: type pill filters, role filters, BST sliders.
 */
export function SpeciesPicker({
  value,
  format,
  onPick,
  onClose,
}: SpeciesPickerProps) {
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Use format ID for index lookup; fall back to a permissive index
  const formatId = format?.id ?? "gen9vgc2025regg";
  const index = getCachedIndex(formatId);

  const lower = search.toLowerCase();

  const filtered = search
    ? index.filter((e) => e.species.toLowerCase().includes(lower))
    : index;

  const visible = filtered.slice(0, MAX_VISIBLE);
  const truncated = filtered.length > MAX_VISIBLE;

  return (
    <div className="bg-popover text-popover-foreground flex w-72 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-lg border shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-muted-foreground font-mono text-[9.5px] font-medium tracking-widest uppercase">
          Species
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="text-muted-foreground hover:text-foreground flex size-4 items-center justify-center rounded text-sm"
        >
          ×
        </button>
      </div>

      {/* Search */}
      <input
        ref={inputRef}
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search species…"
        className="bg-muted/40 border-b px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/60 focus:bg-card"
      />

      {/* Species list */}
      <div className="max-h-[320px] overflow-y-auto p-1">
        {visible.map((entry) => {
          const speciesId = entry.species;
          const isSelected = speciesId === value;
          const types = getSpeciesTypes(speciesId);

          return (
            <button
              key={speciesId}
              type="button"
              onClick={() => {
                onPick(speciesId);
                onClose();
              }}
              className={cn(
                "flex w-full items-center gap-2.5 rounded px-2 py-1.5 text-left transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                isSelected && "bg-accent text-accent-foreground"
              )}
            >
              <Sprite species={speciesId} types={types} size={28} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {speciesId}
                </span>
                <span className="flex gap-1 pt-0.5">
                  {types.map((t) => (
                    <TypePill key={t} t={t} />
                  ))}
                </span>
              </span>
            </button>
          );
        })}

        {visible.length === 0 && (
          <p className="text-muted-foreground py-4 text-center text-sm">
            No species found
          </p>
        )}
      </div>

      {/* Truncation footnote */}
      {truncated && (
        <div className="border-t px-3 py-1.5">
          <span className="text-muted-foreground text-[10px]">
            Showing first {MAX_VISIBLE} of {filtered.length} — search to narrow
          </span>
        </div>
      )}

    </div>
  );
}
