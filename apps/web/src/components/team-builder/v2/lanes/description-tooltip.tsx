"use client";

import { useState, type ReactNode } from "react";

import { Tooltip, TooltipContent } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface DescriptionTooltipProps {
  /** Optional bold header rendered above the description (e.g. ability name). */
  title?: string | null;
  description: string | null | undefined;
  // Suppress the tooltip body while a sibling picker popover is open so the
  // hover content doesn't overlap the picker.
  showContent: boolean;
  /** The trigger element — typically a `TooltipTrigger`. */
  children: ReactNode;
  /** Override classes on the tooltip content container. */
  tooltipClassName?: string;
}

export function DescriptionTooltip({
  title,
  description,
  showContent,
  children,
  tooltipClassName,
}: DescriptionTooltipProps) {
  const visible = Boolean(showContent && description);
  // When showContent flips false → true (e.g. a sibling picker popover just
  // closed after the user committed a selection), bump remountKey so the
  // entire Tooltip subtree unmounts and remounts. Base UI's hover detection
  // tracks state on the live trigger element — without the remount, the
  // trigger is still "hovered" from before the picker opened and the tooltip
  // pops up immediately on close, which looks like the tooltip is "stuck".
  // Remounting forces a fresh trigger so the tooltip stays closed until the
  // user actually moves their mouse out and back in.
  const [remountKey, setRemountKey] = useState(0);
  const [prevShowContent, setPrevShowContent] = useState(showContent);
  if (prevShowContent !== showContent) {
    setPrevShowContent(showContent);
    if (showContent) {
      setRemountKey((k) => k + 1);
    }
  }

  return (
    <Tooltip key={remountKey}>
      {children}
      {visible && (
        <TooltipContent side="bottom" className={cn("max-w-64 text-xs", tooltipClassName)}>
          {title && <span className="font-semibold">{title}</span>}
          <span className="block">{description}</span>
        </TooltipContent>
      )}
    </Tooltip>
  );
}
