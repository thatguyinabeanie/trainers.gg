"use client";

import { getLegalTeraTypes, getValidTeraTypes } from "@trainers/pokemon";

import { cn } from "@/lib/utils";

import { TYPE_BG_COLORS } from "./type-colors";

// =============================================================================
// Types
// =============================================================================

interface TeraPickerProps {
  value: string | null;
  onSelect: (type: string) => void;
  onClose: () => void;
  /** Format ID — when provided, filters to format-legal Tera types. */
  formatId?: string;
}

// =============================================================================
// TeraPicker
// =============================================================================

/**
 * Inline Tera Type picker for the team builder Pokemon editor.
 * Displays all valid Tera Types in a colored grid.
 */
export function TeraPicker({
  value,
  onSelect,
  onClose,
  formatId,
}: TeraPickerProps) {
  const allTypes = getValidTeraTypes();
  const legal = formatId ? getLegalTeraTypes(formatId) : undefined;
  const teraTypes = legal ? allTypes.filter((t) => legal.has(t)) : allTypes;

  function handleSelect(type: string) {
    onSelect(type);
    onClose();
  }

  return (
    <div className="bg-popover rounded-lg border p-3 shadow-md">
      {teraTypes.length === 0 && (
        <p className="text-muted-foreground px-1 py-4 text-center text-xs">
          Tera isn&apos;t allowed in this format.
        </p>
      )}
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
              aria-pressed={isSelected}
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
