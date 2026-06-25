"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// =============================================================================
// Constants
// =============================================================================

/** Alts beyond this count are folded into the overflow dropdown. */
const INLINE_LIMIT = 4;

// =============================================================================
// Props
// =============================================================================

interface AltPillsProps {
  /** List of alts owned by the authenticated user. */
  alts: { id: number; username: string }[];
  /**
   * The currently selected alt ID, or `null` to show teams from all alts.
   * Controls which pill is highlighted.
   */
  selectedAltId: number | null;
  /** Called when the user clicks a pill or a dropdown item. */
  onSelect: (altId: number | null) => void;
}

// =============================================================================
// Sub-component: individual pill button
// =============================================================================

interface PillProps {
  label: string;
  selected: boolean;
  onSelect: () => void;
}

function Pill({ label, selected, onSelect }: PillProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        // Base shape — rounded-full pill look, sm text
        "inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full border px-3 text-sm font-medium transition-colors select-none",
        // Mobile tap target ≥40px, desktop tighter
        "min-h-10 sm:min-h-8",
        // focus ring
        "focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px]",
        // disabled / inactive state guard
        "disabled:pointer-events-none disabled:opacity-50",
        selected
          ? // Teal / primary — matches interactive accent across the app
            "border-transparent bg-primary text-primary-foreground"
          : // Muted outline — unselected state
            "border-border bg-background text-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {label}
    </button>
  );
}

// =============================================================================
// Main component
// =============================================================================

/**
 * "Viewing" alt-pills control for the team-builder landing page (spec §5,
 * Decision D5).
 *
 * Renders a horizontal row of one-click pills:
 *   - "All alts" pill — selected when `selectedAltId === null`
 *   - One pill per alt (label = @username)
 *   - When there are more than `INLINE_LIMIT` alts, the tail is folded into
 *     a "▾ N more" overflow dropdown. A "Manage alts" link appears at the
 *     bottom of the dropdown.
 *
 * Returns `null` when `alts` is empty (guests have no alts; the orchestrating
 * component renders the sign-in hint).
 */
export function AltPills({ alts, selectedAltId, onSelect }: AltPillsProps) {
  // Guests have no alts — render nothing.
  if (alts.length === 0) return null;

  const inlineAlts = alts.slice(0, INLINE_LIMIT);
  const overflowAlts = alts.slice(INLINE_LIMIT);
  const hasOverflow = overflowAlts.length > 0;

  // Is the currently selected alt hidden in the overflow dropdown?
  const selectedIsOverflow =
    selectedAltId !== null &&
    overflowAlts.some((a) => a.id === selectedAltId);

  return (
    <div
      role="group"
      aria-label="View teams by alt"
      className="flex flex-wrap items-center gap-2"
    >
      {/* "All alts" pill */}
      <Pill
        label="All alts"
        selected={selectedAltId === null}
        onSelect={() => onSelect(null)}
      />

      {/* Inline alt pills (up to INLINE_LIMIT) */}
      {inlineAlts.map((alt) => (
        <Pill
          key={alt.id}
          label={`@${alt.username}`}
          selected={selectedAltId === alt.id}
          onSelect={() => onSelect(alt.id)}
        />
      ))}

      {/* Overflow dropdown — only rendered when there are more than INLINE_LIMIT alts */}
      {hasOverflow && (
        <DropdownMenu>
          <DropdownMenuTrigger
            // If the selected alt is in the overflow list, style the trigger
            // as "selected" so the user gets visual feedback.
            className={cn(
              "inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-full border px-3 text-sm font-medium transition-colors select-none",
              "min-h-10 sm:min-h-8",
              "focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px]",
              selectedIsOverflow
                ? "border-transparent bg-primary text-primary-foreground"
                : "border-border bg-background text-foreground hover:bg-muted hover:text-foreground"
            )}
            aria-label={`${overflowAlts.length} more alts`}
          >
            <ChevronDown className="size-3.5" aria-hidden="true" />
            <span>{overflowAlts.length} more</span>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="start">
            {overflowAlts.map((alt) => (
              <DropdownMenuItem
                key={alt.id}
                className={cn(
                  selectedAltId === alt.id &&
                    "bg-primary/10 text-primary font-medium"
                )}
                onClick={() => onSelect(alt.id)}
              >
                @{alt.username}
              </DropdownMenuItem>
            ))}

            <DropdownMenuSeparator />

            {/* Manage alts link — opens the alts dashboard section */}
            <DropdownMenuItem render={<Link href="/dashboard" />}>
              Manage alts
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
