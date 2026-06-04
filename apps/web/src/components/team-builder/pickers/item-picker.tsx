"use client";

import { useRef, useState } from "react";

import { useVirtualizer } from "@tanstack/react-virtual";

import {
  getAllItems,
  getItemShortDesc,
  getLegalItems,
  legalSetOrPermissive,
  type GameFormat,
} from "@trainers/pokemon";

import { cn } from "@/lib/utils";

import { UsageSparkline } from "../usage-sparkline";
import { useUsageData } from "../use-usage-data";
import { PickerShell } from "./picker-shell";

// =============================================================================
// Types
// =============================================================================

interface ItemPickerProps {
  value: string | null | undefined;
  /** Species currently in this slot — used to fetch per-Pokemon item usage. */
  species: string | undefined;
  format: GameFormat | undefined;
  /** Items held by other team members — used for duplicate warning. */
  teamItems: string[];
  onPick: (itemName: string) => void;
  onClose: () => void;
}

// Compute once at module load — items list is static at runtime
const ALL_ITEMS = getAllItems();

// =============================================================================
// Helpers
// =============================================================================

/**
 * Normalize an item name/id to a comparison key.
 *
 * DB item values may differ in casing or separators from the builder's internal
 * item ids (e.g. "Choice Band" vs "choice-band"). Lowercasing and stripping
 * spaces, hyphens, and apostrophes produces a canonical key for both sides.
 */
function normalizeItemKey(name: string): string {
  return name.toLowerCase().replace(/[\s\-']/g, "");
}

type ItemUsageEntry = { currentPct: number; series: number[] };

// =============================================================================
// ItemPicker
// =============================================================================

/**
 * Searchable item picker scoped to format-legal items.
 *
 * When `species` and `format` are both provided, fetches per-Pokemon item usage
 * rollups (via `useUsageData`) and:
 *   - Shows a usage % label and sparkline on each row.
 *   - Auto-sorts items by descending latest usage % (unknown/0 last), falling
 *     back to the current search-filtered order when no usage data is available.
 *
 * Shows a "held" duplicate warning when another team member already holds the item.
 * Virtualized via @tanstack/react-virtual — no row cap.
 */
export function ItemPicker({
  value,
  species,
  format,
  teamItems,
  onPick,
  onClose,
}: ItemPickerProps) {
  const [search, setSearch] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // ---------------------------------------------------------------------------
  // Usage data — fetch rollup for this species + format.
  // Build a normalized map: itemKey → { currentPct, series }.
  // ---------------------------------------------------------------------------

  const { data: usagePeriods } = useUsageData(species, format);

  const usageMap = new Map<string, ItemUsageEntry>();
  if (usagePeriods && usagePeriods.length > 0) {
    // Accumulate per-item series across periods (oldest → newest).
    const seriesAccumulator = new Map<string, number[]>();
    for (const period of usagePeriods) {
      for (const item of period.items) {
        const key = normalizeItemKey(item.value);
        const existing = seriesAccumulator.get(key);
        if (existing) {
          existing.push(item.pct);
        } else {
          seriesAccumulator.set(key, [item.pct]);
        }
      }
    }
    // The last period is the most recent; its value is the current usage %.
    for (const [key, series] of seriesAccumulator) {
      const currentPct = series[series.length - 1] ?? 0;
      usageMap.set(key, { currentPct, series });
    }
  }

  const hasUsageData = usageMap.size > 0;

  // ---------------------------------------------------------------------------
  // Format-legal item list
  // ---------------------------------------------------------------------------

  const legal = format
    ? legalSetOrPermissive(getLegalItems(format.id))
    : undefined;
  const formatItems = legal
    ? ALL_ITEMS.filter((name) => legal.has(name))
    : ALL_ITEMS;

  // ---------------------------------------------------------------------------
  // Search + sort pipeline
  // ---------------------------------------------------------------------------

  const filteredItems = search
    ? formatItems.filter((name) =>
        name.toLowerCase().includes(search.toLowerCase())
      )
    : formatItems;

  // When usage data is present, sort descending by latest usage % (unknown/0
  // last). This integrates with the existing search-filtered order: when there
  // is no usage data, the original list order is preserved.
  const sortedItems = hasUsageData
    ? [...filteredItems].sort((a, b) => {
        const au = usageMap.get(normalizeItemKey(a))?.currentPct ?? 0;
        const bu = usageMap.get(normalizeItemKey(b))?.currentPct ?? 0;
        if (bu !== au) return bu - au; // higher usage first
        return a.localeCompare(b); // tie-break alphabetically
      })
    : filteredItems;

  const rowVirtualizer = useVirtualizer({
    count: sortedItems.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 68,
    overscan: 5,
  });

  return (
    <PickerShell
      title="Item"
      onClose={onClose}
      width="620px"
      search={{
        value: search,
        onChange: setSearch,
        placeholder: "Search items…",
      }}
    >
      {/* Item list — virtualized */}
      <div ref={scrollRef} className="max-h-72 overflow-y-auto p-1">
        {sortedItems.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center text-sm">
            No items found
          </p>
        ) : (
          <div
            className="relative w-full"
            style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const itemName = sortedItems[virtualRow.index];
              if (!itemName) return null;
              const desc = getItemShortDesc(itemName);
              const isSelected = itemName === value;
              const isDuplicate = teamItems.includes(itemName);
              const usageEntry = usageMap.get(normalizeItemKey(itemName));
              const usagePct = usageEntry?.currentPct;
              const usageSeries = usageEntry?.series;

              return (
                <div
                  key={itemName}
                  className="absolute left-0 w-full"
                  style={{
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onPick(itemName);
                      onClose();
                    }}
                    className={cn(
                      "flex h-full w-full flex-col justify-center rounded px-2 py-1.5 text-left transition-colors",
                      "hover:bg-accent hover:text-accent-foreground",
                      isSelected && "bg-accent text-accent-foreground"
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span
                        className={cn(
                          "min-w-0 flex-1 truncate text-sm font-medium",
                          isSelected && "font-semibold"
                        )}
                      >
                        {itemName}
                      </span>
                      {isDuplicate && !isSelected && (
                        <span className="shrink-0 rounded bg-amber-100 px-1 py-0.5 text-xs leading-none font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                          held
                        </span>
                      )}
                      {/* Usage % — tabular-nums, muted when 0/unknown */}
                      {hasUsageData && (
                        <span
                          className={cn(
                            "shrink-0 font-mono text-xs tabular-nums",
                            usagePct != null && usagePct > 0
                              ? "text-foreground"
                              : "text-muted-foreground/40"
                          )}
                        >
                          {usagePct != null && usagePct > 0
                            ? `${usagePct}%`
                            : "—"}
                        </span>
                      )}
                      {/* Sparkline — only when there are ≥2 data points */}
                      {usageSeries && usageSeries.length >= 2 && (
                        <UsageSparkline
                          points={usageSeries}
                          ariaLabel={`${itemName} usage trend`}
                        />
                      )}
                    </div>
                    {desc && (
                      <span className="text-muted-foreground mt-0.5 line-clamp-2 text-xs leading-tight">
                        {desc}
                      </span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PickerShell>
  );
}
