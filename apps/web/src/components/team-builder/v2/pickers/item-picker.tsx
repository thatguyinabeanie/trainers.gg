"use client";

import { useEffect, useRef, useState } from "react";

import {
  getAllItems,
  getItemShortDesc,
  getLegalItems,
  type GameFormat,
} from "@trainers/pokemon";

import { cn } from "@/lib/utils";

// =============================================================================
// Types
// =============================================================================

interface ItemPickerProps {
  value: string | null | undefined;
  format: GameFormat | undefined;
  /** Items held by other team members — used for duplicate warning. */
  teamItems: string[];
  onPick: (itemName: string) => void;
  onClose: () => void;
}

// Compute once at module load — items list is static at runtime
const ALL_ITEMS = getAllItems();
const MAX_VISIBLE = 80;

// =============================================================================
// ItemPicker
// =============================================================================

/**
 * Searchable item picker scoped to format-legal items.
 * Shows a "held" duplicate warning when another team member already holds the item.
 * Capped to 80 visible entries.
 */
export function ItemPicker({
  value,
  format,
  teamItems,
  onPick,
  onClose,
}: ItemPickerProps) {
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const legal = format ? getLegalItems(format.id) : undefined;
  const formatItems = legal
    ? ALL_ITEMS.filter((name) => legal.has(name))
    : ALL_ITEMS;

  const filtered = search
    ? formatItems.filter((name) =>
        name.toLowerCase().includes(search.toLowerCase())
      )
    : formatItems;

  const visible = filtered.slice(0, MAX_VISIBLE);

  return (
    <div className="bg-popover text-popover-foreground flex w-72 flex-col overflow-hidden rounded-lg border shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-muted-foreground font-mono text-[9.5px] font-medium tracking-widest uppercase">
          Item
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

      {/* Search */}
      <input
        ref={inputRef}
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search items…"
        className="bg-muted/40 border-b px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/60 focus:bg-card"
      />

      {/* Count hint */}
      {filtered.length > MAX_VISIBLE && (
        <p className="text-muted-foreground border-b px-3 py-1 text-[10px]">
          {filtered.length} items — search to narrow
        </p>
      )}

      {/* Item list */}
      <div className="max-h-72 overflow-y-auto p-1">
        {visible.map((itemName) => {
          const desc = getItemShortDesc(itemName);
          const isSelected = itemName === value;
          const isDuplicate = teamItems.includes(itemName);

          return (
            <button
              key={itemName}
              type="button"
              onClick={() => {
                onPick(itemName);
                onClose();
              }}
              className={cn(
                "flex w-full flex-col rounded px-2 py-1.5 text-left transition-colors",
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
                  <span className="shrink-0 rounded bg-amber-100 px-1 py-0.5 text-[9px] leading-none font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    held
                  </span>
                )}
              </div>
              {desc && (
                <span className="text-muted-foreground mt-0.5 line-clamp-1 text-xs leading-tight">
                  {desc}
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
    </div>
  );
}
