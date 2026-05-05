"use client";

import { cn } from "@/lib/utils";

// =============================================================================
// MegaToggle
//
// Per-calc-side toggle for mega evolution. Lets users compare damage with
// the mega form active vs the base form. Useful for:
//   - Pre-mega turn 1 vs post-mega turn 2+ scenarios
//   - Two-mega teams (only one Pokemon can mega per match in canon, so the
//     calc needs to model "what if THIS one megas" vs "what if that one")
//
// Caller is responsible for hiding the toggle when the species isn't a mega
// form (toggle has no meaning otherwise). When `active` is true, the calc
// uses the mega's stats and post-evolution ability; when false, the base
// form's stats and the stored base ability.
// =============================================================================

interface MegaToggleProps {
  active: boolean;
  onToggle: () => void;
}

export function MegaToggle({ active, onToggle }: MegaToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      title={
        active
          ? "Mega active — click to calc as base form"
          : "Mega inactive — click to calc as Mega form"
      }
      className={cn(
        "rounded-md border px-1.5 py-0.5 font-mono text-[9.5px] font-bold uppercase tracking-wider transition-colors",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-muted-foreground/40 text-muted-foreground hover:border-muted-foreground/70"
      )}
    >
      Mega
    </button>
  );
}
