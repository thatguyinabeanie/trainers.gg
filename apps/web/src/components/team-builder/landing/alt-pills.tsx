"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useDroppable } from "@dnd-kit/core";

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
// Sub-component: plain pill button (used for non-droppable "All alts")
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
// Sub-component: droppable alt pill (inline row)
//
// Each alt pill is a drop target — teams can be dragged onto it to reassign
// the team to that alt. useDroppable must be called inside a component (not
// inside a .map() callback) to satisfy the Rules of Hooks.
// =============================================================================

interface AltPillProps {
  alt: { id: number; username: string };
  selected: boolean;
  onSelect: () => void;
}

function AltPill({ alt, selected, onSelect }: AltPillProps) {
  // id scheme: "alt-drop-{altId}" — matched by prefix in the orchestrator's onDragEnd
  const { setNodeRef, isOver } = useDroppable({ id: `alt-drop-${alt.id}` });

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full border px-3 text-sm font-medium transition-colors select-none",
        "min-h-10 sm:min-h-8",
        "focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px]",
        "disabled:pointer-events-none disabled:opacity-50",
        selected
          ? "border-transparent bg-primary text-primary-foreground"
          : "border-border bg-background text-foreground hover:bg-muted hover:text-foreground",
        // Drop-active highlight — only visible while a drag is in progress over this pill
        isOver && "ring-2 ring-primary bg-primary/10"
      )}
    >
      @{alt.username}
    </button>
  );
}

// =============================================================================
// Sub-component: droppable overflow dropdown item
//
// Alts inside the "▾ N more" overflow dropdown are also drop targets.
// Extracted as a component so useDroppable isn't called in a .map() callback.
// =============================================================================

interface OverflowAltItemProps {
  alt: { id: number; username: string };
  selected: boolean;
  onSelect: () => void;
}

function OverflowAltItem({ alt, selected, onSelect }: OverflowAltItemProps) {
  // Same id scheme — orchestrator matches by "alt-drop-" prefix
  const { setNodeRef, isOver } = useDroppable({ id: `alt-drop-${alt.id}` });

  return (
    // Wrap in a div to attach the droppable ref; DropdownMenuItem (Base UI) does
    // not expose a forwarded ref surface, so we attach the sensor to the wrapper.
    <div ref={setNodeRef}>
      <DropdownMenuItem
        className={cn(
          selected && "bg-primary/10 text-primary font-medium",
          // Drop-active highlight inside the dropdown
          isOver && "bg-primary/15 text-primary"
        )}
        onClick={onSelect}
      >
        @{alt.username}
      </DropdownMenuItem>
    </div>
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
 *   - "All alts" pill — selected when `selectedAltId === null` (NOT a drop target)
 *   - One pill per alt (label = @username) — each is a droppable (§10.3)
 *   - When there are more than `INLINE_LIMIT` alts, the tail is folded into
 *     a "▾ N more" overflow dropdown. Overflow items are also droppable.
 *     A "Manage alts" link appears at the bottom of the dropdown.
 *
 * Returns `null` when `alts` is empty (guests have no alts; the orchestrating
 * component renders the sign-in hint).
 *
 * Drop targets use id scheme `alt-drop-{altId}` — the orchestrator's onDragEnd
 * matches by that prefix.
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
      {/* "All alts" pill — NOT a drop target (can't move a team to "all alts") */}
      <Pill
        label="All alts"
        selected={selectedAltId === null}
        onSelect={() => onSelect(null)}
      />

      {/* Inline alt pills (up to INLINE_LIMIT) — each is a droppable drop target */}
      {inlineAlts.map((alt) => (
        <AltPill
          key={alt.id}
          alt={alt}
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
            {/* Each overflow item is also a droppable — uses OverflowAltItem to call useDroppable per-component */}
            {overflowAlts.map((alt) => (
              <OverflowAltItem
                key={alt.id}
                alt={alt}
                selected={selectedAltId === alt.id}
                onSelect={() => onSelect(alt.id)}
              />
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
