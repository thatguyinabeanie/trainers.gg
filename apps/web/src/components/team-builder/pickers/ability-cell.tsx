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
      <span className="text-muted-foreground/40 text-xs italic">—</span>
    );
  }

  const desc = getAbilityShortDesc(name);
  const isHidden = slot === "hidden";

  // When `onFilter` is provided the cell is interactive — render a real
  // <button> so keyboard / screen-reader users can apply the ability filter.
  // Otherwise render a plain <span> so the cell is non-focusable.
  const triggerClass = cn(
    "inline-block max-w-full overflow-hidden text-xs leading-snug text-ellipsis whitespace-nowrap text-left",
    "border-muted-foreground/40 border-b border-dotted",
    onFilter &&
      "hover:border-primary/60 hover:text-primary focus-visible:text-primary cursor-pointer outline-none focus-visible:border-primary/80",
    isHidden && "text-muted-foreground italic"
  );

  const trigger = onFilter ? (
    <button
      type="button"
      aria-label={`Filter by ${name}`}
      onClick={(e) => {
        e.stopPropagation();
        onFilter(name);
      }}
      onKeyDown={(e) => e.stopPropagation()}
      className={triggerClass}
    >
      {name}
    </button>
  ) : (
    <span className={triggerClass}>{name}</span>
  );

  if (!desc) return trigger;

  return (
    <Tooltip>
      <TooltipTrigger render={<span className="min-w-0 overflow-hidden" />}>
        {trigger}
      </TooltipTrigger>
      <TooltipContent
        side="right"
        align="center"
        sideOffset={8}
        className="w-[28rem] max-w-[calc(100vw-2rem)] rounded-lg bg-slate-800 px-4 py-2.5 shadow-xl"
      >
        <p className="text-sm font-semibold text-slate-100">
          {name}
          {isHidden && (
            <span className="ml-1.5 rounded bg-violet-500/25 px-1 text-xs font-semibold text-violet-300">
              Hidden
            </span>
          )}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-slate-300">{desc}</p>
      </TooltipContent>
    </Tooltip>
  );
}
