"use client";

import { ALL_TYPES } from "@trainers/pokemon";

import { cn } from "@/lib/utils";

import { TYPE_BG_COLORS } from "../../type-colors";

// =============================================================================
// Types
// =============================================================================

interface TypePickerProps {
  value: string | null | undefined;
  onPick: (type: string) => void;
  onClose: () => void;
  /** Optional whitelist — only these types are enabled. Defaults to all 18. */
  legalTypes?: string[];
}

// =============================================================================
// TypePicker
// =============================================================================

/**
 * 4-column grid of type pills. Highlights current selection.
 * Disables types not in `legalTypes` when a whitelist is provided.
 */
export function TypePicker({ value, onPick, onClose, legalTypes }: TypePickerProps) {
  return (
    <div className="bg-popover text-popover-foreground w-72 max-w-[calc(100vw-2rem)] rounded-lg border p-3 shadow-md">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <span className="text-muted-foreground font-mono text-[9.5px] font-medium tracking-widest uppercase">
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
                "flex items-center justify-center rounded py-2 text-center text-[9px] font-semibold uppercase tracking-wide transition-all",
                colorClass,
                isSelected && "ring-ring ring-2 ring-offset-1",
                !isSelected && !isDisabled && "hover:opacity-90 active:scale-95",
                isDisabled && "cursor-not-allowed opacity-30"
              )}
            >
              {type.slice(0, 3)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
