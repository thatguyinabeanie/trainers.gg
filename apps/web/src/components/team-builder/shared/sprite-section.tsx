"use client";

import { type PokemonType } from "@trainers/pokemon";
import { type Tables } from "@trainers/supabase";

import { cn } from "@/lib/utils";

import { Sprite } from "../sprite";

// =============================================================================
// SpriteSection — sprite button + species pill in compact or hero arrangement
//
// variant="pill-top"    → species pill ABOVE sprite (compact-mode shape, ≥1240px)
// variant="pill-bottom" → species pill BELOW sprite (MidStack shape, <1240px)
// =============================================================================

interface SpriteSectionProps {
  pokemon: Tables<"pokemon">;
  /** Click handler — opens the species picker dialog. */
  onSpeciesClick: () => void;
  /**
   * "pill-top"    — species pill renders ABOVE the sprite (compact-mode shape).
   * "pill-bottom" — species pill renders BELOW the sprite (MidStack shape).
   */
  variant: "pill-top" | "pill-bottom";
  /** Forwarded to the species pill button (so validation ring can be applied). */
  speciesHasError?: boolean;
  /** Pre-derived type array from useIdentityState — required for Sprite tinting. */
  types: PokemonType[];
  /** Render the shiny variant of the sprite. */
  isShiny?: boolean;
}

export function SpriteSection({
  pokemon,
  onSpeciesClick,
  variant,
  speciesHasError = false,
  types,
  isShiny = false,
}: SpriteSectionProps) {
  // ── pill-top (compact / SingleRow) ────────────────────────────────────────
  if (variant === "pill-top") {
    const pill = (
      <button
        type="button"
        onClick={onSpeciesClick}
        aria-label={`Change species (${pokemon.species ?? "none"})`}
        className={cn(
          "border-border bg-background hover:border-primary focus-visible:border-primary",
          "flex w-44 items-center gap-1 rounded-md border px-2 py-1.5 text-left text-xs",
          "transition-colors outline-none sm:w-48 md:w-52",
          speciesHasError && "ring-destructive/40 rounded ring-1"
        )}
      >
        <span
          className={cn(
            "min-w-0 flex-1 truncate",
            pokemon.species
              ? "text-foreground font-medium"
              : "text-muted-foreground"
          )}
          title={pokemon.species ?? undefined}
        >
          {pokemon.species ?? "Choose species…"}
        </span>
        <span aria-hidden className="text-muted-foreground text-[9px]">
          ▾
        </span>
      </button>
    );

    const spriteBtn = (
      <button
        type="button"
        onClick={onSpeciesClick}
        aria-hidden="true"
        tabIndex={-1}
        className="shrink-0 transition-opacity hover:opacity-80"
      >
        <Sprite
          species={pokemon.species ?? ""}
          types={types}
          size={144}
          shiny={isShiny}
        />
      </button>
    );

    return (
      <>
        {pill}
        {spriteBtn}
      </>
    );
  }

  // ── pill-bottom (MidStack) ─────────────────────────────────────────────────
  const spriteBtn = (
    <button
      type="button"
      aria-hidden="true"
      tabIndex={-1}
      className="flex cursor-pointer items-center justify-center border-0 bg-transparent p-0 transition-opacity hover:opacity-80"
      onClick={onSpeciesClick}
    >
      <Sprite
        species={pokemon.species ?? ""}
        types={types}
        size={144}
        shiny={isShiny}
      />
    </button>
  );

  const pill = (
    <button
      type="button"
      aria-label={`Change species (${pokemon.species ?? "none"})`}
      className={cn(
        "flex w-full min-w-0 cursor-pointer items-center justify-between gap-1 rounded-md border border-border bg-background px-2.5 py-1 font-mono text-[11px] font-semibold transition-colors hover:border-primary focus-visible:border-primary focus-visible:outline-none",
        speciesHasError && "ring-destructive/40 rounded ring-1"
      )}
      onClick={onSpeciesClick}
    >
      <span
        className={cn(
          "min-w-0 truncate",
          pokemon.species ? "font-semibold" : "text-muted-foreground"
        )}
        title={pokemon.species ?? undefined}
      >
        {pokemon.species ?? "Choose species…"}
      </span>
      <span aria-hidden className="text-muted-foreground text-[9px]">
        ▾
      </span>
    </button>
  );

  return (
    <>
      {spriteBtn}
      {pill}
    </>
  );
}
