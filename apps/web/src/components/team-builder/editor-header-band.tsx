"use client";

import { useState } from "react";

import Image from "next/image";

import {
  type GameFormat,
  type PokemonType,
  formatHasTera,
  getSpeciesTypes,
  getValidAbilities,
} from "@trainers/pokemon";
import { getPokemonSprite } from "@trainers/pokemon/sprites";
import { type Tables } from "@trainers/supabase";

import { cn } from "@/lib/utils";

import { PokemonDetailsPopover } from "./pokemon-details-popover";
import { TYPE_PILL_COLORS } from "./type-colors";
import { TypeSymbolIcon } from "./type-symbol-icon";

// =============================================================================
// Types
// =============================================================================

interface EditorHeaderBandProps {
  pokemon: Tables<"pokemon">;
  /** Active game format — drives Tera field visibility and identity control
   * behaviour (formatHasTera). */
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
  /** Optional. When provided, nickname / gender / shiny / level inline controls
   * are enabled (via onUpdate), and the ⋯ popover slot renders the Showdown
   * import/export menu. */
  detailsPopover?: {
    teamId: number;
    /** Debounced field-level updater wired in the parent workspace. */
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
        "flex flex-1 flex-col justify-center gap-0.5 px-3 py-2 text-left",
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
    <div className="flex flex-1 flex-col justify-center gap-0.5 px-3 py-2">
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
// GenderButton — compact 3-state gender control (♂ / ♀ / —)
// =============================================================================

type GenderValue = "Male" | "Female" | null;

const GENDER_OPTIONS: { value: GenderValue; label: string; symbol: string }[] =
  [
    { value: "Male", label: "Male", symbol: "♂" },
    { value: "Female", label: "Female", symbol: "♀" },
    { value: null, label: "Unknown", symbol: "—" },
  ];

interface GenderButtonProps {
  value: GenderValue;
  onChange: (next: GenderValue) => void;
  disabled?: boolean;
}

function GenderButton({ value, onChange, disabled }: GenderButtonProps) {
  return (
    <div
      role="group"
      aria-label="Gender"
      className="bg-muted/50 flex overflow-hidden rounded-md border"
    >
      {GENDER_OPTIONS.map((opt) => {
        const isActive = value === opt.value;
        return (
          <button
            key={opt.label}
            type="button"
            aria-label={opt.label}
            aria-pressed={isActive}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={cn(
              "px-2 py-1 text-xs transition-colors duration-150",
              isActive
                ? "bg-primary/10 text-primary font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {opt.symbol}
          </button>
        );
      })}
    </div>
  );
}

// =============================================================================
// EditorHeaderBand
// =============================================================================

/**
 * Single horizontal band combining identity (sprite + name + types) with
 * inline identity controls (nickname, gender, shiny, level) and the four
 * loadout fields (Ability / Item / Tera / Nature) for the editor card.
 *
 * Layout strategy: two flex rows, each allowing wrap at small widths.
 * - Row 1: sprite + name + types · [nickname] [gender] [shiny ✦] [level]
 * - Row 2: Ability · Item · [Tera] · Nature · ⋯
 *
 * Inline identity controls are active when `detailsPopover` is wired by the
 * parent. When omitted (e.g., the placeholder editor), those controls are
 * hidden — the band reverts to its original minimal appearance.
 */
export function EditorHeaderBand({
  pokemon,
  format,
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

  const hasTera = formatHasTera(format);

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

  const speciesClickable = !disabled && onOpenSpeciesPicker !== undefined;
  const showIdentityControls = detailsPopover !== undefined;

  const [_isEditingNickname, setIsEditingNickname] = useState(false);
  const [editNicknameValue, setEditNicknameValue] = useState("");

  // -------------------------------------------------------------------------
  // Identity control handlers — forward to parent's debounced onUpdate.
  // -------------------------------------------------------------------------

  function handleNicknameChange(value: string) {
    detailsPopover?.onUpdate("nickname", value || null);
  }

  function handleGenderChange(next: GenderValue) {
    detailsPopover?.onUpdate("gender", next);
  }

  function handleShinyToggle() {
    detailsPopover?.onUpdate("is_shiny", !(pokemon.is_shiny ?? false));
  }

  function handleLevelChange(value: number) {
    if (Number.isNaN(value)) return;
    const clamped = Math.max(1, Math.min(100, value));
    detailsPopover?.onUpdate("level", clamped);
  }

  function commitNickname() {
    handleNicknameChange(editNicknameValue);
    setIsEditingNickname(false);
  }

  function _handleNicknameKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      commitNickname();
    }
    if (e.key === "Escape") {
      setIsEditingNickname(false);
      setEditNicknameValue(pokemon.nickname ?? "");
    }
  }

  // -------------------------------------------------------------------------
  // Identity block (sprite + name + types)
  // -------------------------------------------------------------------------

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

      {/* Name + type pills */}
      <div className="flex min-w-0 flex-col gap-1">
        <span
          className={cn(
            "text-foreground truncate text-base leading-tight font-semibold",
            speciesClickable && "group-hover:text-primary group-hover:underline"
          )}
        >
          {pokemon.species}
        </span>
        {types.length > 0 && (
          <div className="flex gap-1">
            {types.map((type) => (
              <TypeSymbolIcon key={type} type={type as PokemonType} size={16} />
            ))}
          </div>
        )}
      </div>
    </>
  );

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div
      className={cn(
        "from-primary/5 to-card flex flex-col gap-0 border-b bg-gradient-to-b",
        className
      )}
    >
      {/* Row 1: identity + inline identity controls ----------------------------- */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 pt-3 pb-1.5">
        {/* Species block — sprite + name + types */}
        {speciesClickable ? (
          <button
            type="button"
            onClick={onOpenSpeciesPicker}
            aria-label={`Change species (currently ${pokemon.species})`}
            className="group -mx-1 grid grid-cols-[3rem_minmax(0,1fr)] items-center gap-3.5 rounded-lg px-1 py-1 text-left transition-colors hover:bg-white/40 dark:hover:bg-white/5"
          >
            {identityContent}
          </button>
        ) : (
          <div className="grid grid-cols-[3rem_minmax(0,1fr)] items-center gap-3.5">
            {identityContent}
          </div>
        )}

        {/* Inline identity controls — only when a detailsPopover is wired */}
        {showIdentityControls && (
          <div className="flex flex-wrap items-center gap-2">
            {/* Nickname — ~120px input, placeholder = species name */}
            <input
              type="text"
              aria-label="Nickname"
              value={pokemon.nickname ?? ""}
              onChange={(e) => handleNicknameChange(e.target.value)}
              placeholder={pokemon.species}
              maxLength={18}
              disabled={disabled}
              className={cn(
                "text-foreground placeholder:text-muted-foreground h-7 w-28 rounded-md border bg-transparent px-2 text-xs",
                "focus:ring-primary/50 focus:ring-2 focus:outline-none",
                "disabled:cursor-not-allowed disabled:opacity-50"
              )}
            />

            {/* Gender — compact 3-button segmented control */}
            <GenderButton
              value={(pokemon.gender as GenderValue) ?? null}
              onChange={handleGenderChange}
              disabled={disabled}
            />

            {/* Shiny — star icon button, filled when shiny */}
            <button
              type="button"
              aria-label={pokemon.is_shiny ? "Shiny (on)" : "Shiny (off)"}
              aria-pressed={pokemon.is_shiny ?? false}
              onClick={handleShinyToggle}
              disabled={disabled}
              className={cn(
                "flex size-7 items-center justify-center rounded-md border text-sm transition-colors duration-150",
                pokemon.is_shiny
                  ? "border-amber-400 bg-amber-400/10 text-amber-500"
                  : "bg-muted/50 text-muted-foreground hover:text-foreground",
                "disabled:cursor-not-allowed disabled:opacity-50"
              )}
            >
              {/* ✦ filled when shiny, ✧ outline when not */}
              {pokemon.is_shiny ? "✦" : "✧"}
            </button>

            {/* Level — compact number input, ~40px wide */}
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground text-[9px] font-semibold tracking-wider uppercase">
                Lv
              </span>
              <input
                type="number"
                aria-label="Level"
                min={1}
                max={100}
                value={pokemon.level ?? 50}
                onChange={(e) =>
                  handleLevelChange(parseInt(e.target.value, 10))
                }
                disabled={disabled}
                className={cn(
                  "text-foreground h-7 w-10 rounded-md border bg-transparent px-1 text-center font-mono text-xs tabular-nums",
                  "focus:ring-primary/50 focus:ring-2 focus:outline-none",
                  "disabled:cursor-not-allowed disabled:opacity-50"
                )}
              />
            </div>
          </div>
        )}
      </div>

      {/* Row 2: build controls (ability, item, [tera], nature, ⋯) -------------- */}
      <div className="flex flex-wrap items-center gap-x-0 gap-y-0.5 px-4 pb-1.5">
        {/* Ability */}
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

        {/* Tera type — omitted entirely for formats without Terastal */}
        {hasTera &&
          (disabled ? (
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
          ))}

        {/* Nature */}
        {disabled ? (
          <FieldStatic label="Nature">{pokemon.nature}</FieldStatic>
        ) : (
          <FieldButton label="Nature" onClick={onOpenNaturePicker}>
            {pokemon.nature}
          </FieldButton>
        )}

        {/* ⋯ popover — Showdown import/export only. Reserves slot when wired. */}
        {detailsPopover ? (
          <PokemonDetailsPopover
            teamId={detailsPopover.teamId}
            pokemon={pokemon}
            onImported={detailsPopover.onImported}
            disabled={disabled}
          />
        ) : (
          <span aria-hidden="true" />
        )}
      </div>
    </div>
  );
}
