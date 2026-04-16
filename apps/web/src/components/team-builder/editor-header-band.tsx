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

import { PokemonDetailsPopover } from "./pokemon-details-popover";
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
  /** Optional. When provided, the sprite + name become a single clickable
   * affordance that opens the species picker (change-species flow). When
   * omitted, the sprite + name render as static decoration (e.g., the
   * disabled placeholder editor). */
  onOpenSpeciesPicker?: () => void;
  /** Optional. When provided, the rightmost ⋯ slot renders the per-Pokémon
   * details popover (nickname, gender, shiny, level, import/export). The
   * popover needs the team id and an update callback to write back. */
  detailsPopover?: {
    teamId: number;
    onUpdate: (field: string, value: unknown) => void;
    onImported?: () => void;
  };
  /** When true, all loadout field buttons render as static text — no clicks. */
  disabled?: boolean;
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
  onOpenSpeciesPicker,
  detailsPopover,
  disabled = false,
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

  // Sprite + name + types collapse into a single click target when a species
  // picker handler is provided and the band is enabled — the entire identity
  // block becomes the affordance for swapping species. When no handler is
  // provided (e.g., the disabled placeholder editor), it renders as static
  // decoration without hover affordances.
  const speciesClickable = !disabled && onOpenSpeciesPicker !== undefined;

  const identityContent = (
    <>
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
        <span
          className={cn(
            "text-foreground truncate text-base leading-tight font-semibold",
            // Subtle hover affordance — the underline tells the user the
            // sprite + name are interactive, without making the band feel
            // like a giant button.
            speciesClickable && "group-hover:text-primary group-hover:underline"
          )}
        >
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
    </>
  );

  return (
    <div
      // 7-col grid: identity (sprite + name span 2) · ability · item · tera ·
      // nature · ⋯ details popover. The popover is only rendered when wired
      // by the parent — its column slot still reserves space via `auto`.
      className={cn(
        "from-primary/5 to-card grid grid-cols-[auto_minmax(160px,1fr)_auto_auto_auto_auto_auto] items-center gap-3.5 border-b bg-gradient-to-b px-4 py-3",
        className
      )}
    >
      {speciesClickable ? (
        <button
          type="button"
          onClick={onOpenSpeciesPicker}
          aria-label={`Change species (currently ${pokemon.species})`}
          // `group` lets the inner name trigger its own hover style above —
          // grid template above keeps the button spanning sprite + identity
          // columns so the click target matches the visible identity block.
          className="group col-span-2 -mx-1 grid grid-cols-[3rem_minmax(160px,1fr)] items-center gap-3.5 rounded-lg px-1 py-1 text-left transition-colors hover:bg-white/40 dark:hover:bg-white/5"
        >
          {identityContent}
        </button>
      ) : (
        // Static (placeholder / disabled) — render as a regular grid cell so
        // the column template still behaves the same.
        <div className="col-span-2 grid grid-cols-[3rem_minmax(160px,1fr)] items-center gap-3.5">
          {identityContent}
        </div>
      )}

      {/* Ability — static when single-ability species or disabled, button otherwise */}
      {isSingleAbility || disabled ? (
        <FieldStatic label="Ability">{pokemon.ability}</FieldStatic>
      ) : (
        <FieldButton label="Ability" onClick={onOpenAbilityPicker}>
          {pokemon.ability}
        </FieldButton>
      )}

      {/* Item */}
      {disabled ? (
        <FieldStatic label="Item">{pokemon.held_item ?? "None"}</FieldStatic>
      ) : (
        <FieldButton label="Item" onClick={onOpenItemPicker}>
          {pokemon.held_item ?? "None"}
        </FieldButton>
      )}

      {/* Tera type — render with type pill inline */}
      {disabled ? (
        <FieldStatic label="Tera">
          {pokemon.tera_type ? (
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] leading-none font-semibold",
                TYPE_PILL_COLORS[
                  pokemon.tera_type as PokemonType | "Stellar"
                ] ?? "bg-muted text-foreground"
              )}
            >
              {pokemon.tera_type}
            </span>
          ) : (
            "None"
          )}
        </FieldStatic>
      ) : (
        <FieldButton label="Tera" onClick={onOpenTeraPicker}>
          {pokemon.tera_type ? (
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] leading-none font-semibold",
                TYPE_PILL_COLORS[
                  pokemon.tera_type as PokemonType | "Stellar"
                ] ?? "bg-muted text-foreground"
              )}
            >
              {pokemon.tera_type}
            </span>
          ) : (
            "None"
          )}
        </FieldButton>
      )}

      {/* Nature */}
      {disabled ? (
        <FieldStatic label="Nature">{pokemon.nature}</FieldStatic>
      ) : (
        <FieldButton label="Nature" onClick={onOpenNaturePicker}>
          {pokemon.nature}
        </FieldButton>
      )}

      {/* Per-Pokémon details popover (nickname, gender, shiny, level,
          import/export). Reserves a column slot only when the parent wires
          it — render nothing otherwise so the grid template still aligns. */}
      {detailsPopover ? (
        <PokemonDetailsPopover
          teamId={detailsPopover.teamId}
          pokemon={pokemon}
          onUpdate={detailsPopover.onUpdate}
          onImported={detailsPopover.onImported}
          disabled={disabled}
        />
      ) : (
        <span aria-hidden="true" />
      )}
    </div>
  );
}
