"use client";

import { useRef, useState } from "react";

import { getSpeciesTypes } from "@trainers/pokemon";
import { type Tables, type TablesUpdate } from "@trainers/supabase";
import { type GameFormat } from "@trainers/pokemon";

import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { type ValidationError } from "../../validation-hooks";
import { Sprite } from "../sprite";
import { TypePill } from "../type-pill";
import { formatSupportsDynamax } from "../format-gating";
import { NumberPicker } from "../pickers/number-picker";
import { FieldError } from "../validation/field-error";

// =============================================================================
// Types
// =============================================================================

interface IdentityLaneProps {
  pokemon: Tables<"pokemon">;
  format: GameFormat | undefined;
  onUpdate: (fields: Partial<TablesUpdate<"pokemon">>) => void;
  onOpenSpecies: (anchor: HTMLElement) => void;
  /** Validation errors scoped to identity fields (species, nickname, gender). */
  fieldErrors?: ValidationError[];
}

type GenderValue = "Male" | "Female" | null;

// =============================================================================
// Helpers
// =============================================================================

function genderSymbol(g: GenderValue): string {
  if (g === "Male") return "♂";
  if (g === "Female") return "♀";
  return "—";
}

function nextGender(current: GenderValue): GenderValue {
  if (current === null) return "Male";
  if (current === "Male") return "Female";
  return null;
}

function errorsForField(errors: ValidationError[], field: string): ValidationError[] {
  return errors.filter((e) => e.field === field);
}

// =============================================================================
// IdentityLane
// =============================================================================

/**
 * Left-most lane in the active row — redesigned for the PokeRow overhaul.
 *
 * Structure:
 *   [sprite 128×128] | [meta column]
 *                        - Name (editable inline input, bold)
 *                        - Muted meta line: "Lv 50 · ♂"
 *                        - Type pills
 *                        - Chip row: shiny + gender + dynamax (format-gated)
 *                        - Species validation chip
 *
 * Sprite click → opens species picker.
 * Level text click → opens NumberPicker popover.
 */
export function IdentityLane({
  pokemon,
  format,
  onUpdate,
  onOpenSpecies,
  fieldErrors = [],
}: IdentityLaneProps) {
  const types = getSpeciesTypes(pokemon.species ?? "");
  const nicknameRef = useRef<HTMLInputElement>(null);
  const [nickDraft, setNickDraft] = useState(pokemon.nickname ?? "");
  const [levelOpen, setLevelOpen] = useState(false);
  const [dmaxOpen, setDmaxOpen] = useState(false);

  const level = pokemon.level ?? 50;
  const gender = pokemon.gender as GenderValue;
  const isShiny = pokemon.is_shiny ?? false;
  const showDynamax = formatSupportsDynamax(format);

  const nicknameErrors = errorsForField(fieldErrors, "nickname");
  const speciesErrors = errorsForField(fieldErrors, "species");
  const genderErrors = errorsForField(fieldErrors, "gender");

  function handleNickBlur() {
    const trimmed = nickDraft.trim();
    const next = trimmed === "" ? null : trimmed;
    if (next !== pokemon.nickname) {
      onUpdate({ nickname: next });
    }
  }

  function handleGenderToggle() {
    onUpdate({ gender: nextGender(gender) });
  }

  function handleShinyToggle() {
    onUpdate({ is_shiny: !isShiny });
  }

  // Muted meta line text: "Lv 50 · ♂" or "Lv 50 · ♀" or just "Lv 50"
  const genderSuffix =
    gender === "Male" ? " · ♂" : gender === "Female" ? " · ♀" : "";

  return (
    <div className="flex min-w-[240px] flex-shrink-0 gap-3 p-3">
      {/* Sprite — 128×128, click to open species picker */}
      <button
        type="button"
        onClick={(e) => onOpenSpecies(e.currentTarget)}
        aria-label={`Change species (${pokemon.species})`}
        className="shrink-0 transition-opacity hover:opacity-80"
      >
        <Sprite species={pokemon.species ?? ""} types={types} size={128} />
      </button>

      {/* Meta column — stacked tight to the right of the sprite */}
      <div className="flex min-w-0 flex-1 flex-col gap-1 justify-center">
        {/* Name field — editable inline input (nickname, falls back to species) */}
        <div className="flex flex-col">
          <input
            ref={nicknameRef}
            type="text"
            value={nickDraft}
            onChange={(e) => setNickDraft(e.target.value)}
            onBlur={handleNickBlur}
            onKeyDown={(e) => {
              if (e.key === "Enter") nicknameRef.current?.blur();
            }}
            placeholder={pokemon.species ?? "Nickname"}
            maxLength={24}
            aria-label="Nickname"
            className={cn(
              "bg-transparent w-full min-w-0 truncate text-sm font-bold outline-none",
              "border-b border-transparent placeholder:text-muted-foreground/50",
              "hover:border-border focus:border-primary",
              "leading-snug",
              nicknameErrors.length > 0 && "border-destructive focus:border-destructive"
            )}
          />
          {nicknameErrors.map((err, i) => (
            <FieldError key={i} message={err.message} severity={err.severity} />
          ))}
        </div>

        {/* Muted meta line: "Lv 50 · ♂" — level is clickable */}
        <div className="flex items-center gap-1">
          <Popover open={levelOpen} onOpenChange={setLevelOpen}>
            <PopoverTrigger
              render={
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground text-[11px] transition-colors"
                />
              }
            >
              Lv {level}
              {genderSuffix}
            </PopoverTrigger>
            <PopoverContent
              side="bottom"
              align="start"
              className="w-auto p-0"
            >
              <NumberPicker
                title="Level"
                value={level}
                min={1}
                max={100}
                onChange={(v) => onUpdate({ level: v })}
                onClose={() => setLevelOpen(false)}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Type pills */}
        <div className="flex flex-wrap gap-1">
          {types.map((t) => (
            <TypePill key={t} t={t} />
          ))}
        </div>

        {/* Chip row: Gender toggle + Shiny toggle + Dynamax (format-gated) */}
        <div className="flex flex-wrap items-center gap-1 pt-0.5">
          {/* Gender 3-way toggle: ♂ / ♀ / — */}
          <div className="flex flex-col">
            <button
              type="button"
              onClick={handleGenderToggle}
              title="Toggle gender"
              className={cn(
                "bg-muted/60 hover:bg-muted border-border rounded border px-1.5 py-0.5 text-[10px] font-medium",
                genderErrors.length > 0 && "border-destructive"
              )}
            >
              {genderSymbol(gender)}
            </button>
            {genderErrors.map((err, i) => (
              <FieldError key={i} message={err.message} severity={err.severity} />
            ))}
          </div>

          {/* Shiny toggle */}
          <button
            type="button"
            onClick={handleShinyToggle}
            aria-pressed={isShiny}
            title={isShiny ? "Shiny (click to clear)" : "Not shiny (click to set)"}
            className={cn(
              "border-border rounded border px-1.5 py-0.5 text-[10px] font-medium transition-colors",
              isShiny
                ? "bg-yellow-400/20 text-yellow-600 border-yellow-400/40 dark:text-yellow-400"
                : "bg-muted/60 hover:bg-muted text-muted-foreground"
            )}
          >
            ✦
          </button>

          {/* Dynamax level chip — only shown when format supports it */}
          {showDynamax && (
            <Popover open={dmaxOpen} onOpenChange={setDmaxOpen}>
              <PopoverTrigger
                render={
                  <button
                    type="button"
                    className="bg-muted/60 hover:bg-muted border-border rounded border px-1.5 py-0.5 font-mono text-[10px] font-medium"
                  />
                }
              >
                DMax {(pokemon as Record<string, unknown>)["dynamax_level"] as number ?? 10}
              </PopoverTrigger>
              <PopoverContent
                side="bottom"
                align="start"
                className="w-auto p-0"
              >
                <NumberPicker
                  title="Dynamax Level"
                  value={
                    ((pokemon as Record<string, unknown>)["dynamax_level"] as number) ?? 10
                  }
                  min={0}
                  max={10}
                  onChange={(v) =>
                    onUpdate({
                      ["dynamax_level" as keyof TablesUpdate<"pokemon">]: v as never,
                    })
                  }
                  onClose={() => setDmaxOpen(false)}
                />
              </PopoverContent>
            </Popover>
          )}
        </div>

        {/* Species validation errors — below the chip row */}
        {speciesErrors.map((err, i) => (
          <FieldError key={i} message={err.message} severity={err.severity} />
        ))}
      </div>
    </div>
  );
}
