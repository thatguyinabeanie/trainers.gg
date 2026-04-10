"use client";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

// =============================================================================
// Constants
// =============================================================================

const MAX_IV = 31;

/** Stat keys in the order they are displayed. */
const STAT_KEYS = [
  "hp",
  "attack",
  "defense",
  "specialAttack",
  "specialDefense",
  "speed",
] as const;

type StatKey = (typeof STAT_KEYS)[number];

/** Short display labels for each stat. */
const STAT_LABELS: Record<StatKey, string> = {
  hp: "HP",
  attack: "Atk",
  defense: "Def",
  specialAttack: "SpA",
  specialDefense: "SpD",
  speed: "Spe",
};

// =============================================================================
// Types
// =============================================================================

interface IvEditorProps {
  ivs: {
    hp: number;
    attack: number;
    defense: number;
    specialAttack: number;
    specialDefense: number;
    speed: number;
  };
  onChange: (stat: string, value: number) => void;
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
export function IvEditor({ ivs, onChange }: IvEditorProps) {
  const hasNonStandard = STAT_KEYS.some((key) => ivs[key] !== MAX_IV);
  const summary = hasNonStandard ? buildSummary(ivs) : null;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="flex flex-col gap-2">
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
                  const raw = parseInt(e.target.value, 10);
                  if (isNaN(raw)) return;
                  // Clamp to 0–31
                  const clamped = Math.max(0, Math.min(raw, MAX_IV));
                  onChange(statKey, clamped);
                }}
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
