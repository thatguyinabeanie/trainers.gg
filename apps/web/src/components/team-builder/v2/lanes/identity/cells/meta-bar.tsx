"use client";

import { useState } from "react";

import { type GameFormat } from "@trainers/pokemon";
import { type Tables, type TablesUpdate } from "@trainers/supabase";

import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { type ValidationError } from "../../../../validation-hooks";
import { NumberPicker } from "../../../pickers/number-picker";
import { FieldErrors } from "../../../validation/field-error";
import s from "../identity-lane.module.css";

// =============================================================================
// Types
// =============================================================================

type GenderValue = "Male" | "Female" | null;

interface MetaBarProps {
  pokemon: Tables<"pokemon">;
  format: GameFormat | undefined;
  /** Pulled from useIdentityState — controlled nickname draft. */
  nickDraft: string;
  setNickDraft: (v: string) => void;
  nicknameRef: React.RefObject<HTMLInputElement | null>;
  /** Computed: pokemon.gender mapped to "Male" | "Female" | null */
  gender: GenderValue;
  isShiny: boolean;
  level: number;
  showLevel: boolean;
  /** Format-gating + handler */
  handleNickBlur: () => void;
  handleGenderToggle: () => void;
  handleShinyToggle: () => void;
  onUpdate: (fields: Partial<TablesUpdate<"pokemon">>) => void;
  nicknameErrors: ValidationError[];
  genderErrors: ValidationError[];
  /**
   * "banner" — the compact-mode inner meta-row (flex items-center gap-2) —
   *   s.idBanner wrapper remains in the parent; FormChips is a sibling.
   * "row" — the MidStack meta bar (.midMetaBar):
   *   auto 1fr auto grid — Lv pill left, nickname centered, gender+shiny right.
   */
  variant: "banner" | "row";
}

// =============================================================================
// Helpers
// =============================================================================

function genderSymbol(g: GenderValue): string {
  if (g === "Male") return "♂";
  if (g === "Female") return "♀";
  return "—";
}

// =============================================================================
// MetaBar — Lv popover + nickname input + gender chip + shiny chip
//
// Extracted from IdentityLaneReal. Two rendering modes via `variant` prop:
//   banner — compact-mode inner row (no Lv popover)
//   row    — MidStack meta bar (auto 1fr auto grid: Lv left, nick center,
//             gender+shiny right) with Lv popover, gated by showLevel
// =============================================================================

export function MetaBar({
  nickDraft,
  setNickDraft,
  nicknameRef,
  gender,
  isShiny,
  level,
  showLevel,
  handleNickBlur,
  handleGenderToggle,
  handleShinyToggle,
  onUpdate,
  nicknameErrors,
  genderErrors,
  variant,
}: MetaBarProps) {
  const [levelOpen, setLevelOpen] = useState(false);

  if (variant === "banner") {
    return (
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 flex-col">
          <input
            ref={nicknameRef}
            type="text"
            value={nickDraft}
            onChange={(e) => setNickDraft(e.target.value)}
            onBlur={handleNickBlur}
            onKeyDown={(e) => {
              if (e.key === "Enter") nicknameRef.current?.blur();
            }}
            placeholder="Nickname"
            maxLength={24}
            aria-label="Nickname"
            className={cn(
              "w-full min-w-0 truncate bg-transparent text-sm font-bold outline-none",
              "placeholder:text-muted-foreground/50 border-b border-transparent placeholder:font-normal",
              "hover:border-border focus:border-primary hover:border-dashed focus:border-solid",
              "py-0.5 leading-snug",
              nicknameErrors.length > 0 &&
                "border-destructive focus:border-destructive"
            )}
          />
          <FieldErrors errors={nicknameErrors} />
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {/* Gender 3-way toggle */}
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
            <FieldErrors errors={genderErrors} />
          </div>

          {/* Shiny toggle */}
          <button
            type="button"
            onClick={handleShinyToggle}
            aria-pressed={isShiny}
            title={
              isShiny
                ? "Shiny (click to clear)"
                : "Not shiny (click to set)"
            }
            className={cn(
              "border-border rounded border px-1.5 py-0.5 text-[10px] font-medium transition-colors",
              isShiny
                ? "border-yellow-400/40 bg-yellow-400/20 text-yellow-600 dark:text-yellow-400"
                : "bg-muted/60 hover:bg-muted text-muted-foreground"
            )}
          >
            ✦
          </button>
        </div>
      </div>
    );
  }

  // variant === "row" — MidStack meta bar
  // Layout (Lv shown):    auto 1fr auto — Lv | nickname | gender+shiny
  // Layout (Lv hidden):        1fr auto — nickname | gender+shiny  (visually centered)
  return (
    <div className={cn(s.midMetaBar, !showLevel && s.midMetaBarNoLv)}>
      {/* Left: Lv pill — only rendered when format supports level */}
      {showLevel && (
        <Popover open={levelOpen} onOpenChange={setLevelOpen}>
          <PopoverTrigger
            render={
              <button
                type="button"
                title={`Level ${level}`}
                className={cn(s.midPill, s.midLvPill)}
              />
            }
          >
            <span>Lv {level}</span>
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
              onChange={(v: number) => onUpdate({ level: v })}
              onClose={() => setLevelOpen(false)}
            />
          </PopoverContent>
        </Popover>
      )}

      {/* Center: nickname input */}
      <input
        type="text"
        value={nickDraft}
        onChange={(e) => setNickDraft(e.target.value)}
        onBlur={handleNickBlur}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        placeholder="Nickname"
        maxLength={24}
        aria-label="Nickname"
        className={cn(
          s.midNickname,
          nicknameErrors.length > 0 && "border-b-destructive focus:border-b-destructive"
        )}
      />

      {/* Right: gender + shiny pills */}
      <span className={s.midRightPills}>
        <button
          type="button"
          onClick={handleGenderToggle}
          title="Toggle gender"
          className={cn(
            s.midPill,
            genderErrors.length > 0 && "border-destructive"
          )}
        >
          {genderSymbol(gender)}
        </button>
        <button
          type="button"
          onClick={handleShinyToggle}
          aria-pressed={isShiny}
          title={
            isShiny
              ? "Shiny (click to clear)"
              : "Not shiny (click to set)"
          }
          className={cn(
            s.midPill,
            isShiny
              ? "border-yellow-400/40 bg-yellow-400/20 text-yellow-600 dark:text-yellow-400"
              : "text-muted-foreground"
          )}
        >
          ✦
        </button>
      </span>
    </div>
  );
}
