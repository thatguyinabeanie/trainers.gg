"use client";

import { ALL_TYPES, type GameFormat } from "@trainers/pokemon";

import { cn } from "@/lib/utils";

import { useUsageData } from "../use-usage-data";
import { TYPE_BG_COLORS } from "../type-colors";

// =============================================================================
// Types
// =============================================================================

interface TypePickerProps {
  value: string | null | undefined;
  /** Species currently in this slot — used to fetch per-Pokemon tera usage. */
  species: string | undefined;
  /** Active format — used alongside species to scope the usage query. */
  format: GameFormat | undefined;
  onPick: (type: string) => void;
  onClose: () => void;
  /** Optional whitelist — only these types are enabled. Defaults to all 18. */
  legalTypes?: string[];
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Normalize a type name/id for DB-to-UI key matching.
 * Type ids are already lowercase single words, but normalizing both sides
 * of the lookup is defensive against DB inconsistencies.
 */
function normalizeTypeKey(name: string): string {
  return name.toLowerCase().replace(/[\s\-']/g, "");
}

// =============================================================================
// TypePicker
// =============================================================================

/**
 * 4-column grid of type pills. Highlights current selection.
 * Disables types not in `legalTypes` when a whitelist is provided.
 *
 * When `species` and `format` are both provided, fetches per-Pokemon tera
 * usage rollups (via `useUsageData`) and overlays a compact usage % on each
 * pill. The most-used tera type receives a subtle `ring-primary/40` highlight
 * so it catches the eye without overriding the type color palette.
 * No sparkline — the grid is too compact for trend lines.
 */
export function TypePicker({
  value,
  species,
  format,
  onPick,
  onClose,
  legalTypes,
}: TypePickerProps) {
  // ---------------------------------------------------------------------------
  // Usage data — fetch rollup for this species + format.
  // Build normalized map: typeKey → currentPct (latest period only).
  // No sparkline for tera — the grid is too compact.
  // ---------------------------------------------------------------------------

  const { data: usagePeriods } = useUsageData(species, format);

  const teraUsageMap = new Map<string, number>();
  if (usagePeriods && usagePeriods.length > 0) {
    // The last period in the array is the most recent.
    const latestPeriod = usagePeriods[usagePeriods.length - 1];
    if (latestPeriod) {
      for (const tera of latestPeriod.tera) {
        teraUsageMap.set(normalizeTypeKey(tera.value), tera.pct);
      }
    }
  }

  // Find the type with the highest usage for a subtle top-pick highlight.
  let topTeraKey = "";
  let topTeraPct = 0;
  for (const [key, pct] of teraUsageMap) {
    if (pct > topTeraPct) {
      topTeraPct = pct;
      topTeraKey = key;
    }
  }

  const hasUsageData = teraUsageMap.size > 0;

  return (
    <div className="bg-popover text-popover-foreground w-72 max-w-[calc(100vw-2rem)] rounded-lg border p-3 shadow-md">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <span className="text-muted-foreground font-mono text-xs font-medium tracking-widest uppercase">
          Tera type
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

      {/* Type grid */}
      <div className="grid grid-cols-4 gap-1.5">
        {ALL_TYPES.map((type) => {
          const isSelected = value === type;
          const isDisabled = legalTypes ? !legalTypes.includes(type) : false;
          const colorClass =
            TYPE_BG_COLORS[type as keyof typeof TYPE_BG_COLORS] ??
            "bg-muted text-foreground";
          const typeKey = normalizeTypeKey(type);
          const usagePct = teraUsageMap.get(typeKey);
          // Subtle highlight on the most-used tera only when it isn't already
          // selected (selection ring takes visual priority).
          const isTopPick =
            hasUsageData &&
            topTeraKey === typeKey &&
            topTeraPct > 0 &&
            !isSelected;

          return (
            <button
              key={type}
              type="button"
              disabled={isDisabled}
              onClick={() => {
                if (!isDisabled) {
                  onPick(type);
                  onClose();
                }
              }}
              aria-pressed={isSelected}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 rounded py-1.5 text-center text-xs font-semibold uppercase tracking-wide transition-all",
                colorClass,
                isSelected && "ring-ring ring-2 ring-offset-1",
                isTopPick && "ring-primary/40 ring-2 ring-offset-1",
                !isSelected && !isDisabled && "hover:opacity-90 active:scale-95",
                isDisabled && "cursor-not-allowed opacity-30"
              )}
            >
              <span>{type.slice(0, 3)}</span>
              {/* Usage % badge — compact, muted when 0/unknown */}
              {hasUsageData && (
                <span
                  className={cn(
                    "font-mono text-[10px] tabular-nums leading-none font-normal",
                    usagePct != null && usagePct > 0
                      ? "opacity-90"
                      : "opacity-40"
                  )}
                >
                  {usagePct != null && usagePct > 0 ? `${usagePct}%` : "—"}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
