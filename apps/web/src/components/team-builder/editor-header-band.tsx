"use client";

import Image from "next/image";

import {
  type GameFormat,
  type PokemonType,
  getSpeciesTypes,
  getValidAbilities,
} from "@trainers/pokemon";
import { getPokemonSprite } from "@trainers/pokemon/sprites";
import { type Tables } from "@trainers/supabase";

import { cn } from "@/lib/utils";

import { TYPE_PILL_COLORS } from "./type-colors";

// =============================================================================
// Types
// =============================================================================

interface EditorHeaderBandProps {
  pokemon: Tables<"pokemon">;
  /** Active game format — currently unused inside the band but kept on the API
   * so the next refactor task can drive format-aware labels (e.g., disabling
   * Tera in formats without it). */
  format: GameFormat | undefined;
  onOpenAbilityPicker: () => void;
  onOpenItemPicker: () => void;
  onOpenTeraPicker: () => void;
  onOpenNaturePicker: () => void;
  className?: string;
}

interface FieldButtonProps {
  label: string;
  onClick: () => void;
  /** Accessible label override — defaults to `Edit ${label}` for screen readers. */
  ariaLabel?: string;
  children: React.ReactNode;
}

// =============================================================================
// FieldButton — caption + clickable value, used for each loadout field
// =============================================================================

function FieldButton({
  label,
  onClick,
  ariaLabel,
  children,
}: FieldButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel ?? `Edit ${label}`}
      className={cn(
        "flex flex-col gap-0.5 rounded-lg px-3 py-1.5 text-left",
        "hover:bg-muted/50 transition-colors duration-150"
      )}
    >
      <span className="text-muted-foreground text-[9px] font-semibold tracking-wider uppercase">
        {label}
      </span>
      <span className="text-foreground flex items-center gap-1 text-sm font-medium whitespace-nowrap">
        {children}
        <span className="text-muted-foreground" aria-hidden="true">
          ›
        </span>
      </span>
    </button>
  );
}

// =============================================================================
// FieldStatic — static label + value (single-ability species, no click)
// =============================================================================

interface FieldStaticProps {
  label: string;
  children: React.ReactNode;
}

function FieldStatic({ label, children }: FieldStaticProps) {
  return (
    <div className="flex flex-col gap-0.5 px-3 py-1.5">
      <span className="text-muted-foreground text-[9px] font-semibold tracking-wider uppercase">
        {label}
      </span>
      <span className="text-foreground text-sm font-medium whitespace-nowrap">
        {children}
      </span>
    </div>
  );
}

// =============================================================================
// EditorHeaderBand
// =============================================================================

/**
 * Single horizontal band combining identity (sprite + name + type pills) with
 * the four loadout fields (Ability / Item / Tera / Nature) for the editor card.
 *
 * Layout: CSS grid with sprite, identity column, then four field buttons.
 * Background uses a subtle teal gradient and a single bottom divider — no
 * surrounding borders.
 */
export function EditorHeaderBand({
  pokemon,
  format: _format,
  onOpenAbilityPicker,
  onOpenItemPicker,
  onOpenTeraPicker,
  onOpenNaturePicker,
  className,
}: EditorHeaderBandProps) {
  // -------------------------------------------------------------------------
  // Derived values
  // -------------------------------------------------------------------------

  const sprite = getPokemonSprite(pokemon.species, {
    shiny: pokemon.is_shiny ?? false,
    gender:
      pokemon.gender === "Male"
        ? "M"
        : pokemon.gender === "Female"
          ? "F"
          : undefined,
  });

  const types = getSpeciesTypes(pokemon.species);
  const validAbilities = getValidAbilities(pokemon.species);
  const isSingleAbility = validAbilities.length <= 1;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div
      className={cn(
        "from-primary/5 to-card grid grid-cols-[48px_minmax(160px,1fr)_auto_auto_auto_auto] items-center gap-3.5 border-b bg-gradient-to-b px-4 py-3",
        className
      )}
    >
      {/* Sprite: 48x48 circle with primary-soft radial gradient */}
      <div className="bg-primary/10 flex size-12 shrink-0 items-center justify-center rounded-full">
        <Image
          src={sprite.url}
          alt={pokemon.species}
          width={sprite.w}
          height={sprite.h}
          className={cn(
            "size-10 object-contain",
            sprite.pixelated && "image-rendering-pixelated"
          )}
          unoptimized
        />
      </div>

      {/* Identity — name + type pills */}
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-foreground truncate text-base leading-tight font-semibold">
          {pokemon.species}
        </span>
        {types.length > 0 && (
          <div className="flex gap-1">
            {types.map((type) => (
              <span
                key={type}
                className={cn(
                  "rounded px-1.5 py-0.5 text-[10px] leading-none font-semibold",
                  TYPE_PILL_COLORS[type] ?? "bg-muted text-foreground"
                )}
              >
                {type}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Ability — static when single-ability species, button otherwise */}
      {isSingleAbility ? (
        <FieldStatic label="Ability">{pokemon.ability}</FieldStatic>
      ) : (
        <FieldButton label="Ability" onClick={onOpenAbilityPicker}>
          {pokemon.ability}
        </FieldButton>
      )}

      {/* Item */}
      <FieldButton label="Item" onClick={onOpenItemPicker}>
        {pokemon.held_item ?? "None"}
      </FieldButton>

      {/* Tera type — render with type pill inline */}
      <FieldButton label="Tera" onClick={onOpenTeraPicker}>
        {pokemon.tera_type ? (
          <span
            className={cn(
              "rounded px-1.5 py-0.5 text-[10px] leading-none font-semibold",
              TYPE_PILL_COLORS[pokemon.tera_type as PokemonType | "Stellar"] ??
                "bg-muted text-foreground"
            )}
          >
            {pokemon.tera_type}
          </span>
        ) : (
          "None"
        )}
      </FieldButton>

      {/* Nature */}
      <FieldButton label="Nature" onClick={onOpenNaturePicker}>
        {pokemon.nature}
      </FieldButton>
    </div>
  );
}
