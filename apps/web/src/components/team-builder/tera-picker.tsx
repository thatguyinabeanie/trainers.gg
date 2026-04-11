"use client";

import { getValidTeraTypes } from "@trainers/pokemon";

import { cn } from "@/lib/utils";

import { TYPE_BG_COLORS } from "./type-colors";

// =============================================================================
// Types
// =============================================================================

interface TeraPickerProps {
  value: string | null;
  onSelect: (type: string) => void;
  onClose: () => void;
}

// =============================================================================
// TeraPicker
// =============================================================================

/**
 * Inline Tera Type picker for the team builder Pokemon editor.
 * Displays all valid Tera Types in a colored grid.
 */
export function TeraPicker({ value, onSelect, onClose }: TeraPickerProps) {
  const teraTypes = getValidTeraTypes();

  function handleSelect(type: string) {
    onSelect(type);
    onClose();
  }

  return (
    <div className="bg-popover rounded-lg border p-3 shadow-md">
      <div className="grid grid-cols-4 gap-1.5">
        {teraTypes.map((type) => {
          const colorClass =
            TYPE_BG_COLORS[type as keyof typeof TYPE_BG_COLORS] ??
            "bg-muted text-foreground";
          const isSelected = type === value;

          return (
            <button
              key={type}
              type="button"
              onClick={() => handleSelect(type)}
              className={cn(
                "flex items-center justify-center rounded px-2 py-1.5 text-center text-xs font-medium transition-all",
                colorClass,
                isSelected && "ring-ring ring-2 ring-offset-1",
                !isSelected && "hover:opacity-90 active:scale-95"
              )}
            >
              {type}
            </button>
          );
        })}
      </div>
    </div>
  );
}
