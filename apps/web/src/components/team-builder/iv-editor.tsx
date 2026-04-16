"use client";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

import {
  type StatKey,
  type StatValues,
  STAT_KEYS,
  STAT_LABELS,
} from "./stat-types";

// =============================================================================
// Constants
// =============================================================================

const MAX_IV = 31;

// =============================================================================
// Types
// =============================================================================

interface IvEditorProps {
  ivs: StatValues;
  onChange: (stat: StatKey, value: number) => void;
  /**
   * When true, all IV inputs are disabled and the strip appears dimmed.
   * Use this to render a placeholder shell when no species is selected.
   */
  disabled?: boolean;
}

// =============================================================================
// Helpers
// =============================================================================

/** Build a summary string listing only non-31 IVs (e.g. "0 Atk, 27 Spe"). */
function buildSummary(ivs: IvEditorProps["ivs"]): string {
  return STAT_KEYS.filter((key) => ivs[key] !== MAX_IV)
    .map((key) => `${ivs[key]} ${STAT_LABELS[key]}`)
    .join(", ");
}

// =============================================================================
// IvEditor
// =============================================================================

/**
 * Compact IV editor for the team builder Pokemon editor.
 *
 * Displays 6 numeric inputs (0–31) in a 2-column grid. When any IV deviates
 * from the default of 31 a summary line is shown above the grid.
 */
export function IvEditor({ ivs, onChange, disabled = false }: IvEditorProps) {
  const hasNonStandard = STAT_KEYS.some((key) => ivs[key] !== MAX_IV);
  const summary = hasNonStandard ? buildSummary(ivs) : null;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className={cn("flex flex-col gap-2", disabled && "opacity-50")}>
      {/* Header */}
      <div className="flex items-baseline gap-2">
        <span className="text-xs font-semibold tracking-wide uppercase">
          IVs
        </span>
        {summary && (
          <span className="text-muted-foreground truncate text-[10px]">
            {summary}
          </span>
        )}
      </div>

      {/* Stat grid — 2 columns of 3 rows */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        {STAT_KEYS.map((statKey) => {
          const value = ivs[statKey];
          const isNonStandard = value !== MAX_IV;

          return (
            <div key={statKey} className="flex items-center gap-1.5">
              {/* Stat label */}
              <span
                className={cn(
                  "w-7 shrink-0 text-right text-[10px] font-medium tabular-nums",
                  isNonStandard
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-muted-foreground"
                )}
              >
                {STAT_LABELS[statKey]}
              </span>

              {/* Numeric input */}
              <Input
                type="number"
                min={0}
                max={MAX_IV}
                value={value}
                onChange={(e) => {
                  if (disabled) return;
                  const raw = parseInt(e.target.value, 10);
                  if (isNaN(raw)) return;
                  // Clamp to 0–31
                  const clamped = Math.max(0, Math.min(raw, MAX_IV));
                  onChange(statKey, clamped);
                }}
                disabled={disabled}
                aria-label={`${STAT_LABELS[statKey]} IV`}
                className={cn(
                  "h-6 min-w-0 px-1 text-right text-xs tabular-nums",
                  isNonStandard && "text-amber-600 dark:text-amber-400"
                )}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
