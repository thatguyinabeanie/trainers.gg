"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

// =============================================================================
// Types
// =============================================================================

interface ListPickerProps<T extends string> {
  title: string;
  options: T[];
  value: T | null | undefined;
  onPick: (val: T) => void;
  onClose: () => void;
  width?: number;
  renderOption?: (opt: T) => React.ReactNode;
  searchPlaceholder?: string;
  emptyHint?: string;
}

const MAX_VISIBLE = 200;

// =============================================================================
// ListPicker
// =============================================================================

/**
 * Generic searchable list picker used as popover content.
 * Renders a title eyebrow, search input, and a scrollable option list.
 * Caps display to 200 rows for performance and shows a footnote when truncated.
 */
export function ListPicker<T extends string>({
  title,
  options,
  value,
  onPick,
  onClose,
  width = 260,
  renderOption,
  searchPlaceholder = "Search…",
  emptyHint = "No matches",
}: ListPickerProps<T>) {
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus the search input when the picker opens
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Reset search when the picker re-opens (caller uses key={isOpen} or similar)
  useEffect(() => {
    setSearch("");
  }, [value]);

  const lower = search.toLowerCase();
  const filtered = search
    ? options.filter((o) => o.toLowerCase().includes(lower))
    : options;

  const visible = filtered.slice(0, MAX_VISIBLE);
  const truncated = filtered.length > MAX_VISIBLE;

  return (
    <div
      className="bg-popover text-popover-foreground flex flex-col overflow-hidden rounded-lg border shadow-md"
      style={{ width, maxWidth: "calc(100vw - 2rem)" }}
    >
      {/* Title eyebrow */}
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-muted-foreground font-mono text-[9.5px] font-medium tracking-widest uppercase">
          {title}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="text-muted-foreground hover:text-foreground hover:bg-muted flex size-4 items-center justify-center rounded text-sm transition-colors"
        >
          ×
        </button>
      </div>

      {/* Search input */}
      <input
        ref={inputRef}
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={searchPlaceholder}
        className="bg-muted/40 border-b px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/60 focus:bg-card"
      />

      {/* Options list */}
      <div className="max-h-[280px] overflow-y-auto p-1">
        {visible.map((opt, i) => {
          const isSelected = opt === value;
          return (
            <button
              key={i}
              type="button"
              onClick={() => {
                onPick(opt);
                onClose();
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                isSelected && "bg-accent text-accent-foreground"
              )}
            >
              {renderOption ? renderOption(opt) : opt}
            </button>
          );
        })}

        {visible.length === 0 && (
          <p className="text-muted-foreground py-4 text-center text-sm">
            {emptyHint}
          </p>
        )}
      </div>

      {/* Truncation footnote */}
      {truncated && (
        <div className="border-t px-3 py-1.5">
          <span className="text-muted-foreground text-[10px]">
            Showing first {MAX_VISIBLE} of {filtered.length} — search to narrow
          </span>
        </div>
      )}
    </div>
  );
}
