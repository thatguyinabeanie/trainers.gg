"use client";

import { cn } from "@/lib/utils";

import s from "../../builder.module.css";

// =============================================================================
// IdentityLaneGhost — static visual placeholder (no interactive elements)
//
// Rendered by the dispatcher when pokemon == null. No buttons, inputs, or
// popovers — safe to place inside an outer <button> wrapper (EmptyRow)
// without violating nested-button constraints.
// =============================================================================

export function IdentityLaneGhost() {
  return (
    <div className="flex min-w-0 gap-3 p-3">
      {/* Sprite column */}
      <div className="flex shrink-0 flex-col items-center justify-center gap-2 self-center">
        {/* Species pill ghost — static div, NOT a button */}
        <div className="border-border bg-background flex w-36 items-center gap-1 rounded-md border border-dashed px-2 py-1.5 text-left text-xs sm:w-40 md:w-44">
          <span className="text-muted-foreground/50 min-w-0 flex-1 truncate">
            + Add Pokémon
          </span>
          <span aria-hidden className="text-muted-foreground/30 text-[9px]">
            ▾
          </span>
        </div>
        {/* Sprite ghost — static div, NOT a button */}
        <div className="bg-muted/40 size-[144px] rounded-xl" />
      </div>

      {/* Form column */}
      <div className="flex w-56 min-w-0 shrink-0 flex-col justify-center gap-0.5">
        {/* Banner ghost — same className as real banner */}
        <div className={s.idBanner}>
          <div className="flex h-[22px] items-center">
            <span className="text-muted-foreground/20 text-sm font-normal italic">
              Nickname
            </span>
          </div>
          <div className="flex h-[18px] items-center gap-1">
            <div className="bg-muted/30 h-3.5 w-10 rounded" />
          </div>
        </div>
        {/* Loadout rows ghost — Item / Abil / Nat with em-dashes, static divs */}
        {(["Item", "Abil", "Nat"] as const).map((label) => (
          <div key={label} className={s.formRow}>
            <span className={s.formLabel}>{label}</span>
            <span
              className={cn(s.formValue, "text-muted-foreground/25 italic")}
            >
              —
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
