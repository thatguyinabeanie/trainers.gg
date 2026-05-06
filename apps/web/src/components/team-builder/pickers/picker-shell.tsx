"use client";

import { type ReactNode } from "react";

import { cn } from "@/lib/utils";

// =============================================================================
// Types
// =============================================================================

interface PickerShellProps {
  title: string;
  onClose: () => void;
  /** Optional search input rendered below the header. Omit for non-searching pickers. */
  search?: {
    value: string;
    onChange: (next: string) => void;
    placeholder?: string;
  };
  /** Optional content rendered between header and search (e.g., filter chips). */
  toolbar?: ReactNode;
  /** Explicit width applied via inline style (e.g., "480px", 480). */
  width?: number | string;
  className?: string;
  children: ReactNode;
}

// =============================================================================
// PickerShell
// =============================================================================

/**
 * Shared outer shell for all team-builder pickers.
 * Provides the consistent popover container, header (title + close button),
 * and optional search input. Picker-specific body goes in children.
 */
export function PickerShell({
  title,
  onClose,
  search,
  toolbar,
  width,
  className,
  children,
}: PickerShellProps) {
  return (
    <div
      className={cn(
        "bg-popover text-popover-foreground flex max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-lg border shadow-md",
        className
      )}
      style={width !== undefined ? { width } : undefined}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-muted-foreground font-mono text-[9.5px] font-medium tracking-widest uppercase">
          {title}
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

      {/* Toolbar slot (e.g., filter chips) */}
      {toolbar !== undefined && (
        <div className="border-b px-3 py-2">{toolbar}</div>
      )}

      {/* Search input */}
      {search !== undefined && (
        <input
          type="text"
          value={search.value}
          onChange={(e) => search.onChange(e.target.value)}
          placeholder={search.placeholder ?? "Search…"}
          autoFocus
          className="bg-muted/40 border-b px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/60 focus:bg-card"
        />
      )}

      {children}
    </div>
  );
}
