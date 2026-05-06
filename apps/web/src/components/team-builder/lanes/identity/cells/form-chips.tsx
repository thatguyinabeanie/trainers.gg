"use client";

import {
  getCanonicalBaseSpecies,
  getFormsForSpecies,
  getMegaStoneForSpecies,
} from "@trainers/pokemon";

import { cn } from "@/lib/utils";

// =============================================================================
// FormChips — species form switcher (regular ↔ mega ↔ alt)
// =============================================================================

export interface FormChipsProps {
  currentSpecies: string;
  currentItem: string | null;
  onPick: (species: string) => void;
}

/**
 * Render a row of one-tap chips for switching between a Pokemon's alternate
 * forms (megas + battle-mode forms like Aegislash-Blade). Hidden when the
 * species has only one form.
 *
 * Mega chips are **disabled** unless the held item is the matching mega
 * stone — they need the stone to fire in canon. Disabled chips show a
 * tooltip explaining the requirement; clicking is a no-op.
 *
 * Battle-mode alt forms (Aegislash-Blade, Wishiwashi-School, Greninja-Ash,
 * Mimikyu-Busted) have no item requirement — those chips are always
 * enabled.
 *
 * Toggle-off behavior: clicking the active chip returns to the base form
 * but **does not clear the held item** — leaves the mega stone attached so
 * the user can re-toggle quickly. Holding a mega stone with the base form
 * is not illegal; it simply doesn't do anything until the user toggles
 * back to the mega form.
 */
export function FormChips({ currentSpecies, currentItem, onPick }: FormChipsProps) {
  const forms = getFormsForSpecies(currentSpecies);
  if (forms.length <= 1) return null;
  const base = getCanonicalBaseSpecies(currentSpecies);
  const altForms = forms.filter((f) => f !== base);
  return (
    <div className="flex items-center gap-1">
      {altForms.map((form) => {
        const active = form === currentSpecies;
        const requiredStone = getMegaStoneForSpecies(form);
        // Mega chips need their stone held. Non-mega alt forms (Aegislash-
        // Blade etc) have no item requirement.
        const enabled =
          requiredStone === null ? true : currentItem === requiredStone;
        // Common case: alt form is "<base>-<suffix>" (Charizard-Mega-Y,
        // Aegislash-Blade). Strip the base + dash and render the rest.
        // Edge case (Floette): canonical base is "Floette-Eternal" but the
        // alt is "Floette-Mega" — they share a root, not a prefix. Fall
        // back to the substring after the last hyphen so we still render
        // a meaningful chip ("Mega").
        const label = form.startsWith(base + "-")
          ? form.slice(base.length + 1).replace(/-/g, " ")
          : form.slice(form.lastIndexOf("-") + 1);
        const tooltip = !enabled
          ? `Hold ${requiredStone} to use this form`
          : active
            ? `Toggle off — return to ${base}`
            : form;
        // Click an inactive chip → switch to that form (no item change).
        // Click the active chip → toggle back to the base form (item kept).
        const target = active ? base : form;
        return (
          <button
            key={form}
            type="button"
            onClick={enabled ? () => onPick(target) : undefined}
            disabled={!enabled}
            aria-pressed={active}
            aria-disabled={!enabled}
            title={tooltip}
            className={cn(
              "rounded border px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap transition-colors",
              !enabled
                ? "border-border/50 text-muted-foreground/40 cursor-not-allowed border-dashed"
                : active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground"
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
