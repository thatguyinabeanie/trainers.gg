"use client";

import { useState } from "react";

import Image from "next/image";

import {
  type GameFormat,
  type PokemonType,
  formatHasTera,
  getMegaStoneForSpecies,
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
  /** When true, hides the `›` chevron suffix (e.g. when a pill is already shown). */
  hideChevron?: boolean;
  children: React.ReactNode;
}

// =============================================================================
// FieldButton — caption + clickable value, used for each loadout field
// =============================================================================

function FieldButton({
  label,
  onClick,
  ariaLabel,
  hideChevron = false,
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
        {!hideChevron && (
          <span className="text-muted-foreground" aria-hidden="true">
            ›
          </span>
        )}
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

/** Normalise a raw DB gender string to the 3-state GenderValue. Maps legacy
 * single-char tokens ("M" → "Male", "F" → "Female") and treats anything else
 * (e.g. "Genderless", "N", unknown future values) as null. */
function normalizeGender(raw: string | null): GenderValue {
  if (raw === "Male" || raw === "M") return "Male";
  if (raw === "Female" || raw === "F") return "Female";
  return null;
}

function GenderButton({ value, onChange, disabled }: GenderButtonProps) {
  // Use radiogroup semantics: only the active radio is in the tab order, and
  // arrow keys move focus through the options. This matches WAI-ARIA radio
  // group expectations and improves screen-reader output.
  function handleArrowKey(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const currentIdx = GENDER_OPTIONS.findIndex((o) => o.value === value);
    const delta = e.key === "ArrowRight" ? 1 : -1;
    const nextIdx =
      (currentIdx + delta + GENDER_OPTIONS.length) % GENDER_OPTIONS.length;
    onChange(GENDER_OPTIONS[nextIdx]!.value);
  }

  return (
    <div
      role="radiogroup"
      aria-label="Gender"
      className="bg-muted/50 flex overflow-hidden rounded-md border"
    >
      {GENDER_OPTIONS.map((opt) => {
        const isActive = value === opt.value;
        return (
          <button
            key={opt.label}
            type="button"
            role="radio"
            aria-label={opt.label}
            aria-checked={isActive}
            tabIndex={isActive ? 0 : -1}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            onKeyDown={handleArrowKey}
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
  // Mega-evolved species must hold their mega stone — the item field is locked.
  const isMegaLocked = getMegaStoneForSpecies(pokemon.species) !== null;

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

  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [editNicknameValue, setEditNicknameValue] = useState(
    pokemon.nickname ?? ""
  );

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

  function handleNicknameKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      commitNickname();
    }
    if (e.key === "Escape") {
      setIsEditingNickname(false);
      setEditNicknameValue(pokemon.nickname ?? "");
    }
  }

  function startEditingNickname() {
    setEditNicknameValue(pokemon.nickname ?? "");
    setIsEditingNickname(true);
  }

  // -------------------------------------------------------------------------
  // Extracted variables
  // -------------------------------------------------------------------------

  const spriteImage = (
    <Image
      src={sprite.url}
      alt={pokemon.species}
      width={sprite.w}
      height={sprite.h}
      className={cn(
        "size-9 object-contain",
        sprite.pixelated && "image-rendering-pixelated"
      )}
      unoptimized
    />
  );

  const teraContent = pokemon.tera_type ? (
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
  );

  // -------------------------------------------------------------------------
  // Build-field components — extracted so they can render either inline in
  // the desktop band row or as a 2-col grid below the row on phones (since
  // identity + 4 fields + meta controls do not fit in a single 393px row).
  // -------------------------------------------------------------------------

  const abilityField =
    isSingleAbility || disabled ? (
      <FieldStatic label="Ability">
        {pokemon.ability ?? validAbilities[0] ?? "—"}
      </FieldStatic>
    ) : (
      <FieldButton label="Ability" onClick={onOpenAbilityPicker}>
        {pokemon.ability ?? validAbilities[0] ?? "—"}
      </FieldButton>
    );

  const itemField =
    disabled || isMegaLocked ? (
      <FieldStatic label="Item">{pokemon.held_item ?? "None"}</FieldStatic>
    ) : (
      <FieldButton label="Item" onClick={onOpenItemPicker}>
        {pokemon.held_item ?? "None"}
      </FieldButton>
    );

  const teraField = hasTera ? (
    disabled ? (
      <FieldStatic label="Tera">{teraContent}</FieldStatic>
    ) : (
      <FieldButton
        label="Tera"
        onClick={onOpenTeraPicker}
        hideChevron={pokemon.tera_type !== null}
      >
        {teraContent}
      </FieldButton>
    )
  ) : null;

  const natureField = disabled ? (
    <FieldStatic label="Nature">{pokemon.nature}</FieldStatic>
  ) : (
    <FieldButton label="Nature" onClick={onOpenNaturePicker}>
      {pokemon.nature}
    </FieldButton>
  );

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div
      className={cn(
        "from-primary/5 to-card border-b bg-gradient-to-b",
        className
      )}
    >
      {/* Row 1: Identity + (build fields at md+) + meta. Always one h-[68px]
          row. Phones drop the build fields out of this row and render them
          below in a 2-col grid (Row 2 below). */}
      <div className="flex h-[68px] items-stretch">
        {/* ── Zone 1: Identity — flex-1 on phones (fills space left of meta);
              shrink-0 on md+ where build fields take the middle flex-1 slot. */}
        <div className="flex min-w-0 flex-1 items-center gap-2.5 px-3 md:flex-none md:shrink-0">
          {/* Sprite — opens species picker when available */}
          {speciesClickable ? (
            <button
              type="button"
              aria-label={`Change species (currently ${pokemon.species})`}
              onClick={onOpenSpeciesPicker}
              className="bg-primary/10 hover:bg-primary/20 flex size-10 shrink-0 items-center justify-center rounded-full transition-colors"
            >
              {spriteImage}
            </button>
          ) : (
            <div className="bg-primary/10 flex size-10 shrink-0 items-center justify-center rounded-full">
              {spriteImage}
            </div>
          )}

          {/* Name stack */}
          <div className="flex min-w-0 flex-col justify-center gap-0.5">
            {/* Primary line */}
            {showIdentityControls && isEditingNickname ? (
              <input
                type="text"
                name="nickname"
                aria-label="Nickname"
                autoComplete="off"
                value={editNicknameValue}
                onChange={(e) => setEditNicknameValue(e.target.value)}
                onBlur={commitNickname}
                onKeyDown={handleNicknameKeyDown}
                placeholder={pokemon.species}
                maxLength={18}
                autoFocus
                disabled={disabled}
                className={cn(
                  "text-foreground placeholder:text-muted-foreground w-32 rounded border bg-transparent px-1.5 py-0.5 text-sm font-semibold",
                  "focus:ring-primary/50 focus:ring-1 focus:outline-none"
                )}
              />
            ) : showIdentityControls ? (
              <button
                type="button"
                aria-label="Edit nickname"
                onClick={startEditingNickname}
                disabled={disabled}
                className="text-foreground truncate text-left text-sm font-semibold hover:underline disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pokemon.nickname ?? pokemon.species}
              </button>
            ) : (
              <span className="text-foreground truncate text-sm font-semibold">
                {pokemon.species}
              </span>
            )}

            {/* Secondary line */}
            <div className="flex items-center gap-1.5">
              {pokemon.nickname &&
                showIdentityControls &&
                (speciesClickable ? (
                  <button
                    type="button"
                    aria-label={`Change species (currently ${pokemon.species})`}
                    onClick={onOpenSpeciesPicker}
                    className="text-muted-foreground hover:text-foreground truncate text-[10.5px] transition-colors"
                  >
                    {pokemon.species}
                  </button>
                ) : (
                  <span className="text-muted-foreground truncate text-[10.5px]">
                    {pokemon.species}
                  </span>
                ))}
              {types.length > 0 && (
                <div className="flex gap-1">
                  {types.map((type) => (
                    <TypeSymbolIcon
                      key={type}
                      type={type as PokemonType}
                      size={14}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Zone 2: Build fields (inline at md+ only — phones move these
              to Row 2 below to free space for identity + meta in Row 1).
              CSS-based hiding (`hidden md:flex` / `md:hidden`) instead of
              `useIsMobile()` so the SSR HTML is mobile-safe and there's no
              hydration flash of the overflowing desktop layout on phones. */}
        <div
          className="bg-border my-2.5 hidden w-px shrink-0 md:block"
          aria-hidden="true"
        />
        <div
          className="hidden flex-1 items-stretch md:flex"
          data-testid="editor-header-band-desktop-fields"
        >
          {abilityField}
          <div className="bg-border my-2.5 w-px shrink-0" aria-hidden="true" />
          {itemField}
          {teraField && (
            <>
              <div
                className="bg-border my-2.5 w-px shrink-0"
                aria-hidden="true"
              />
              {teraField}
            </>
          )}
          <div className="bg-border my-2.5 w-px shrink-0" aria-hidden="true" />
          {natureField}
        </div>

        {/* ── Zone 3: Meta controls (only when detailsPopover wired) ────── */}
        {showIdentityControls && (
          <>
            <div
              className="bg-border my-2.5 w-px shrink-0"
              aria-hidden="true"
            />
            <div className="flex shrink-0 items-center gap-1.5 px-3">
              <GenderButton
                value={normalizeGender(pokemon.gender)}
                onChange={handleGenderChange}
                disabled={disabled}
              />

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
                {pokemon.is_shiny ? "✦" : "✧"}
              </button>

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

              {detailsPopover ? (
                <PokemonDetailsPopover
                  teamId={detailsPopover.teamId}
                  pokemon={pokemon}
                  onImported={detailsPopover.onImported}
                  disabled={disabled}
                />
              ) : null}
            </div>
          </>
        )}
      </div>

      {/* Row 2: Build fields shown only on phones (`md:hidden`). 2-col grid;
          thin borders between rows/cols replace the inline dividers used in
          the desktop layout above. The desktop branch's `hidden md:flex`
          ensures display:none excludes its FieldButtons from the keyboard
          tab order and accessibility tree on phones, so the duplicate render
          doesn't create a11y collisions. */}
      <div
        className="grid grid-cols-2 border-t md:hidden"
        data-testid="editor-header-band-mobile-fields"
      >
        <div className="border-r">{abilityField}</div>
        <div>{itemField}</div>
        {teraField ? (
          <>
            <div className="border-t border-r">{teraField}</div>
            <div className="border-t">{natureField}</div>
          </>
        ) : (
          <div className="col-span-2 border-t">{natureField}</div>
        )}
      </div>
    </div>
  );
}
