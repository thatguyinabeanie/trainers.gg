"use client";

/**
 * QuickLook — desktop HoverCard peek
 *
 * Wraps `children` (a row or any trigger element) in a Base UI PreviewCard
 * (exposed through `@/components/ui/hover-card`) so that hovering or focusing
 * the trigger floats the `QuickLookContent` panel above/below with no layout
 * shift.
 *
 * The consumer picks desktop vs mobile via `useIsMobile()`; this file exports
 * only the desktop path. The mobile path is in `quick-look-sheet.tsx`.
 */

import { type ReactNode } from "react";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

import { type QuickLookData } from "./quick-look-shared";
import { QuickLookContent } from "./quick-look-content";

// =============================================================================
// QuickLook
// =============================================================================

export interface QuickLookProps {
  data: QuickLookData;
  /** The trigger element (e.g. a TeamRow). Wrapped in the HoverCard trigger. */
  children: ReactNode;
}

/**
 * Desktop hovercard peek.
 *
 * Shows `QuickLookContent` in a floating panel on hover / keyboard focus.
 * Uses Base UI `PreviewCard` under the hood (via `@/components/ui/hover-card`)
 * which is keyboard-accessible and does not require asChild.
 */
export function QuickLook({ data, children }: QuickLookProps) {
  return (
    <HoverCard>
      <HoverCardTrigger className="block w-full">
        {children}
      </HoverCardTrigger>
      <HoverCardContent
        side="bottom"
        align="start"
        sideOffset={6}
        className="w-80 p-2"
      >
        {/* Team name header */}
        <p className="mb-2 truncate text-sm font-semibold">{data.name}</p>
        <QuickLookContent data={data} />
      </HoverCardContent>
    </HoverCard>
  );
}
