"use client";

import { type ReactNode } from "react";

import { Tooltip, TooltipContent } from "@/components/ui/tooltip";

interface DescriptionTooltipProps {
  /** Optional bold header rendered above the description (e.g. ability name). */
  title?: string | null;
  description: string | null | undefined;
  // Suppress the tooltip body while a sibling picker popover is open so the
  // hover content doesn't overlap the picker.
  showContent: boolean;
  /** The trigger element — typically a `TooltipTrigger`. */
  children: ReactNode;
}

export function DescriptionTooltip({
  title,
  description,
  showContent,
  children,
}: DescriptionTooltipProps) {
  const visible = Boolean(showContent && description);
  return (
    <Tooltip>
      {children}
      {visible && (
        <TooltipContent side="bottom" className="max-w-64 text-xs">
          {title && <span className="font-semibold">{title}</span>}
          <span className="block">{description}</span>
        </TooltipContent>
      )}
    </Tooltip>
  );
}
