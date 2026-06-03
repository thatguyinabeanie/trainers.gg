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

import { PickerShell } from "./picker-shell";

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

// =============================================================================
// ItemPicker
// =============================================================================

/**
 * Searchable item picker scoped to format-legal items.
 * Shows a "held" duplicate warning when another team member already holds the item.
 * Virtualized via @tanstack/react-virtual — no row cap.
 */
export function ItemPicker({
  value,
  format,
  teamItems,
  onPick,
  onClose,
}: ItemPickerProps) {
  const [search, setSearch] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const legal = format
    ? legalSetOrPermissive(getLegalItems(format.id))
    : undefined;
  const formatItems = legal
    ? ALL_ITEMS.filter((name) => legal.has(name))
    : ALL_ITEMS;

  const filteredItems = search
    ? formatItems.filter((name) =>
        name.toLowerCase().includes(search.toLowerCase())
      )
    : formatItems;

  const rowVirtualizer = useVirtualizer({
    count: filteredItems.length,
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
        {filteredItems.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center text-sm">
            No items found
          </p>
        ) : (
          <div
            className="relative w-full"
            style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const itemName = filteredItems[virtualRow.index];
              if (!itemName) return null;
              const desc = getItemShortDesc(itemName);
              const isSelected = itemName === value;
              const isDuplicate = teamItems.includes(itemName);

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
