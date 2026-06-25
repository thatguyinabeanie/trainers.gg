"use client";

import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import { type SortMode, type Density } from "../persistence/landing-prefs-types";

// =============================================================================
// Constants
// =============================================================================

/** Human-readable labels for each SortMode value. */
const SORT_LABELS: Record<SortMode, string> = {
  recent: "Recent",
  name: "Name",
  format: "Format",
  completeness: "Completeness",
  custom: "Custom",
};

// =============================================================================
// Props
// =============================================================================

interface LandingToolbarProps {
  sort: SortMode;
  density: Density;
  /** Optional team count rendered as muted "{n} teams" label. */
  resultCount?: number;
  onSortChange: (s: SortMode) => void;
  onDensityChange: (d: Density) => void;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Toolbar for the /builder landing: sort order + density controls.
 *
 * Fully controlled — callers own `sort`, `density`, and the change handlers.
 * Layout: horizontal row on desktop, stacks/wraps on mobile; controls
 * grow to full width on mobile (mobile-responsiveness rule).
 */
export function LandingToolbar({
  sort,
  density,
  resultCount,
  onSortChange,
  onDensityChange,
}: LandingToolbarProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      {/* Left group: sort + density */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        {/* Sort select */}
        <div className="flex items-center gap-2">
          <label
            htmlFor="landing-sort"
            className="text-muted-foreground shrink-0 text-xs"
          >
            Sort
          </label>
          <Select
            value={sort}
            onValueChange={(v) => onSortChange(v as SortMode)}
          >
            <SelectTrigger
              id="landing-sort"
              aria-label="Sort teams by"
              className="h-9 w-full text-xs sm:h-8 sm:w-40"
            >
              <SelectValue placeholder="Sort by…" />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(SORT_LABELS) as [SortMode, string][]).map(
                ([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Density toggle */}
        <ToggleGroup
          value={[density]}
          onValueChange={(next) => {
            // Base UI ToggleGroup is array-shaped even in single-select mode.
            // Ignore deselect (empty array) — density must always have a value.
            const [picked] = next;
            if (picked === "comfortable" || picked === "compact") {
              onDensityChange(picked);
            }
          }}
          variant="outline"
          size="sm"
          aria-label="View density"
          className={cn("w-full sm:w-auto")}
        >
          <ToggleGroupItem
            value="comfortable"
            aria-label="Comfortable density"
            className="min-h-10 flex-1 sm:min-h-0 sm:flex-none"
          >
            Comfortable
          </ToggleGroupItem>
          <ToggleGroupItem
            value="compact"
            aria-label="Compact density"
            className="min-h-10 flex-1 sm:min-h-0 sm:flex-none"
          >
            Compact
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Right group: result count */}
      {resultCount !== undefined && (
        <span className="text-muted-foreground text-xs sm:ml-auto">
          {resultCount} {resultCount === 1 ? "team" : "teams"}
        </span>
      )}
    </div>
  );
}
