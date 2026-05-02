"use client";

/**
 * AbilityCell renders a single ability name inside the species picker grid.
 *
 * - Displays an em-dash when no ability is assigned (null name).
 * - Shows a tooltip with the ability's short description (if one exists).
 * - Marks hidden abilities with an italic style and a "Hidden" badge in the tooltip.
 * - Calls `onFilter` when clicked so the picker can filter species by ability.
 */

import { getAbilityShortDesc } from "@trainers/pokemon";

import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AbilityCellProps {
  name: string | null;
  slot: "slot1" | "slot2" | "hidden";
  onFilter?: (abilityName: string) => void;
}

export function AbilityCell({ name, slot, onFilter }: AbilityCellProps) {
  if (!name) {
    return (
      <span className="text-muted-foreground/40 text-[11px] italic">—</span>
    );
  }

  const desc = getAbilityShortDesc(name);
  const isHidden = slot === "hidden";

  const trigger = (
    <span
      className={cn(
        "inline-block max-w-full overflow-hidden text-[11px] leading-snug text-ellipsis whitespace-nowrap",
        "border-muted-foreground/40 border-b border-dotted",
        onFilter && "hover:border-primary/60 hover:text-primary cursor-pointer",
        isHidden && "text-muted-foreground italic"
      )}
      onClick={onFilter ? () => onFilter(name) : undefined}
    >
      {name}
    </span>
  );

  if (!desc) return trigger;

  return (
    <Tooltip>
      <TooltipTrigger render={<span className="min-w-0 overflow-hidden" />}>
        {trigger}
      </TooltipTrigger>
      <TooltipContent
        side="top"
        align="start"
        className="max-w-56 rounded-lg bg-slate-800 px-3 py-2 shadow-xl"
      >
        <p className="text-sm font-semibold text-slate-100">
          {name}
          {isHidden && (
            <span className="ml-1.5 rounded bg-violet-500/25 px-1 text-[9px] font-semibold text-violet-300">
              Hidden
            </span>
          )}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-slate-400">{desc}</p>
      </TooltipContent>
    </Tooltip>
  );
}
