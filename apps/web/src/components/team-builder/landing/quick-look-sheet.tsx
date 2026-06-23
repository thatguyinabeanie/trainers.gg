"use client";

/**
 * QuickLookSheet — mobile bottom-sheet peek
 *
 * Slides up from the bottom of the screen showing the `QuickLookContent` for
 * a draft. The consumer controls open/close state (tap-to-open on a row card,
 * tap-scrim or swipe-down to dismiss).
 *
 * Applies the bottom-sheet internal-scroll pattern from `.claude/CLAUDE.md`:
 *   - `max-h-[85vh] overflow-hidden flex flex-col` on SheetContent (overrides
 *     the built-in `data-[side=bottom]:h-auto` without relying on a hard `h-`)
 *   - Inner wrapper `flex min-h-0 flex-1 flex-col overflow-hidden`
 *   - Scroll area `flex-1 min-h-0 overflow-y-auto`
 */

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { type QuickLookData } from "./quick-look-shared";
import { QuickLookContent } from "./quick-look-content";

// =============================================================================
// QuickLookSheet
// =============================================================================

export interface QuickLookSheetProps {
  data: QuickLookData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Mobile bottom-sheet peek.
 *
 * Renders the team's full 6 slots (item / ability / tera / moves) in a
 * scrollable bottom-sheet. The sticky header shows the team name.
 */
export function QuickLookSheet({
  data,
  open,
  onOpenChange,
}: QuickLookSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {/*
       * Bottom-sheet internal-scroll pattern:
       *  - `max-h-[85vh] overflow-hidden flex flex-col` caps height without a
       *    hard `h-[Xvh]` that fights the built-in `data-[side=bottom]:h-auto`.
       *  - The close button from SheetContent is positioned inside the popup
       *    via `absolute top-3 right-3`, so the header below it gets pr-10.
       */}
      <SheetContent
        side="bottom"
        className="flex max-h-[85vh] flex-col overflow-hidden"
      >
        {/* Sticky header */}
        <SheetHeader className="shrink-0 pr-10">
          <SheetTitle className="truncate">{data.name}</SheetTitle>
        </SheetHeader>

        {/* Scrollable body — flex-1 + min-h-0 lets the scroll area fill remaining height */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-6">
            <QuickLookContent data={data} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
