"use client";

import { getValidTeraTypes } from "@trainers/pokemon";

import { cn } from "@/lib/utils";

// =============================================================================
// Constants
// =============================================================================

const TYPE_COLORS: Record<string, string> = {
  Normal: "bg-stone-400 text-white",
  Bug: "bg-lime-500 text-white",
  Dark: "bg-stone-700 text-white",
  Dragon: "bg-indigo-600 text-white",
  Electric: "bg-yellow-400 text-black",
  Fairy: "bg-pink-400 text-black",
  Fighting: "bg-red-700 text-white",
  Fire: "bg-orange-500 text-white",
  Flying: "bg-sky-300 text-black",
  Ghost: "bg-purple-600 text-white",
  Grass: "bg-green-500 text-white",
  Ground: "bg-amber-600 text-white",
  Ice: "bg-cyan-300 text-black",
  Poison: "bg-purple-500 text-white",
  Psychic: "bg-pink-500 text-white",
  Rock: "bg-amber-700 text-white",
  Steel: "bg-slate-400 text-white",
  Water: "bg-blue-500 text-white",
  Stellar: "bg-gradient-to-r from-purple-500 to-pink-500 text-white",
};

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
          const colorClass = TYPE_COLORS[type] ?? "bg-muted text-foreground";
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
