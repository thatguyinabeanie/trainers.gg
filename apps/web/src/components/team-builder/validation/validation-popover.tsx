"use client";

import { CheckCircle2 } from "lucide-react";

import { cn } from "@/lib/utils";

import { type ValidationError } from "../validation-hooks";

// =============================================================================
// Field label mapping.
// =============================================================================

const FIELD_LABELS: Record<string, string> = {
  species: "Species",
  ability: "Ability",
  nature: "Nature",
  item: "Item",
  heldItem: "Item",
  nickname: "Nickname",
  gender: "Gender",
  move1: "Move 1",
  move2: "Move 2",
  move3: "Move 3",
  move4: "Move 4",
  moves: "Moves",
  evs: "EVs",
  evTotal: "EV Total",
  teamSize: "Team Size",
};

function getFieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field.replace(/([A-Z])/g, " $1").trim();
}

// =============================================================================
// Types
// =============================================================================

interface ValidationPopoverProps {
  errors: ValidationError[];
  /** Called when the user clicks an error row — jumps to that Pokemon's slot. */
  onJumpToPokemon: (pokemonId: number) => void;
}

// =============================================================================
// ValidationPopover
// =============================================================================

/**
 * Popover content for the Topbar "Validate" button.
 * Lists all team validation errors and warnings, grouped by severity.
 * Clicking a row calls onJumpToPokemon to activate that slot.
 */
export function ValidationPopover({ errors, onJumpToPokemon }: ValidationPopoverProps) {
  const errorCount = errors.filter((e) => e.severity === "error").length;
  const warnCount = errors.filter((e) => e.severity === "warning").length;

  return (
    <div className="flex w-80 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-lg">
      {/* Header */}
      <div className="border-b px-3 py-2.5">
        <span className="text-sm font-semibold">
          {errors.length === 0 ? (
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-4" />
              No issues found
            </span>
          ) : (
            <span className="text-foreground">
              {errorCount > 0 && (
                <span className="text-destructive">{errorCount} error{errorCount !== 1 && "s"}</span>
              )}
              {errorCount > 0 && warnCount > 0 && (
                <span className="text-muted-foreground"> · </span>
              )}
              {warnCount > 0 && (
                <span className="text-amber-600 dark:text-amber-400">
                  {warnCount} warning{warnCount !== 1 && "s"}
                </span>
              )}
            </span>
          )}
        </span>
        {errors.length > 0 && (
          <p className="text-muted-foreground mt-0.5 text-xs">
            Click a row to jump to that Pokémon.
          </p>
        )}
      </div>

      {/* Error list */}
      {errors.length > 0 && (
        <div className="max-h-64 overflow-y-auto" role="log" aria-live="polite">
          {errors.map((error, idx) => (
            <button
              key={`${error.pokemonId}-${error.field}-${idx}`}
              type="button"
              onClick={() => onJumpToPokemon(error.pokemonId)}
              aria-label={`${error.severity === "error" ? "Error" : "Warning"}: ${error.pokemonName} — ${getFieldLabel(error.field)}: ${error.message}`}
              className={cn(
                "flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors",
                error.severity === "error"
                  ? "hover:bg-destructive/10"
                  : "hover:bg-amber-500/10"
              )}
            >
              {/* Severity dot */}
              <span
                className={cn(
                  "size-1.5 shrink-0 rounded-full",
                  error.severity === "error" ? "bg-destructive" : "bg-amber-500"
                )}
                aria-hidden="true"
              />

              {/* Species name */}
              <span
                className={cn(
                  "w-16 shrink-0 truncate font-medium",
                  error.severity === "error"
                    ? "text-destructive"
                    : "text-amber-600 dark:text-amber-400"
                )}
              >
                {error.pokemonName}
              </span>

              {/* Field label */}
              <span className="text-muted-foreground w-14 shrink-0 truncate text-xs">
                {getFieldLabel(error.field)}
              </span>

              {/* Error message */}
              <span
                className={cn(
                  "min-w-0 truncate text-xs",
                  error.severity === "error"
                    ? "text-destructive/80"
                    : "text-amber-600/80 dark:text-amber-400/80"
                )}
              >
                {error.message}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
