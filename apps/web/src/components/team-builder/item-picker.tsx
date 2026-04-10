"use client";

import { useState } from "react";

import { Dex } from "@pkmn/dex";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

// =============================================================================
// Types
// =============================================================================

interface ItemPickerProps {
  value: string | null;
  onSelect: (item: string) => void;
  onClose: () => void;
  /** Items held by other Pokemon on the team — for duplicate warning. */
  teamItems: string[];
}

// =============================================================================
// Static data — computed once at module load
// =============================================================================

const gen9 = Dex.forGen(9);

/** All Gen 9 item names, sorted alphabetically. */
const allItems = gen9.items
  .all()
  .filter((item) => item.exists && item.name)
  .map((item) => item.name)
  .sort();

// =============================================================================
// ItemPicker
// =============================================================================

/**
 * Inline item picker for the team builder Pokemon editor.
 * Searches across all Gen 9 items with short descriptions.
 * Shows a duplicate warning when another team member already holds the item.
 *
 * The list is capped to 80 visible entries; search narrows the results.
 */
export function ItemPicker({
  value,
  onSelect,
  onClose,
  teamItems,
}: ItemPickerProps) {
  const [search, setSearch] = useState("");

  const filtered = search
    ? allItems.filter((name) =>
        name.toLowerCase().includes(search.toLowerCase())
      )
    : allItems;

  // Cap to 80 when unsearched — items list can be 1,000+
  const visible = filtered.slice(0, 80);

  function handleSelect(item: string) {
    onSelect(item);
    onClose();
  }

  return (
    <div className="bg-popover flex flex-col gap-2 rounded-lg border p-2 shadow-md">
      {/* Search */}
      <Input
        placeholder="Search items…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        autoFocus
        className="h-7 text-sm"
      />

      {/* Result count hint */}
      {filtered.length > 80 && (
        <p className="text-muted-foreground px-1 text-xs">
          {filtered.length} items — search to narrow
        </p>
      )}

      {/* Item list */}
      <ScrollArea className="h-72">
        <div className="flex flex-col gap-0.5 pr-2">
          {visible.map((itemName) => {
            const itemData = gen9.items.get(itemName);
            const description = itemData?.shortDesc ?? null;
            const isSelected = itemName === value;
            const isDuplicate = teamItems.includes(itemName);

            return (
              <button
                key={itemName}
                type="button"
                onClick={() => handleSelect(itemName)}
                className={cn(
                  "flex flex-col rounded px-2 py-1.5 text-left transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  isSelected && "bg-accent text-accent-foreground"
                )}
              >
                {/* Name row + duplicate badge */}
                <div className="flex min-w-0 items-center gap-1.5">
                  <span
                    className={cn(
                      "flex-1 truncate text-sm font-medium",
                      isSelected && "font-semibold"
                    )}
                  >
                    {itemName}
                  </span>
                  {isDuplicate && !isSelected && (
                    <span className="shrink-0 rounded bg-amber-100 px-1 py-0.5 text-[10px] leading-none font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      held
                    </span>
                  )}
                </div>

                {/* Short description */}
                {description && (
                  <span className="text-muted-foreground mt-0.5 line-clamp-1 text-xs leading-tight">
                    {description}
                  </span>
                )}
              </button>
            );
          })}

          {visible.length === 0 && (
            <p className="text-muted-foreground py-4 text-center text-sm">
              No items found
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
