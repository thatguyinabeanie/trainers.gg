"use client";

import { CheckCircle2, X } from "lucide-react";

import { cn } from "@/lib/utils";

import { type ValidationError } from "./validation-hooks";

// =============================================================================
// Field label mapping
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

interface ValidationPanelProps {
  errors: ValidationError[];
  onSelectPokemon: (pokemonId: number) => void;
  onClose: () => void;
}

// =============================================================================
// ValidationPanel
// =============================================================================

/**
 * Collapsible panel showing all team validation issues.
 * Renders below the team strip in TeamWorkspace.
 * Clicking an error row selects the affected Pokemon in the editor.
 */
export function ValidationPanel({
  errors,
  onSelectPokemon,
  onClose,
}: ValidationPanelProps) {
  return (
    <div className="bg-muted/30 border-b">
      {/* Header row */}
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-sm font-medium">
          {errors.length === 0 ? (
            <span className="flex items-center gap-1.5 text-emerald-600">
              <CheckCircle2 className="size-4" />
              No issues found
            </span>
          ) : (
            `Validation Results — ${errors.length} ${errors.length === 1 ? "issue" : "issues"}`
          )}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground rounded p-0.5 transition-colors"
          aria-label="Close validation panel"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Issue list */}
      {errors.length > 0 && (
        <div className="max-h-48 overflow-y-auto">
          {errors.map((error, idx) => (
            <button
              key={`${error.pokemonId}-${error.field}-${idx}`}
              type="button"
              onClick={() => onSelectPokemon(error.pokemonId)}
              className={cn(
                "flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors",
                error.severity === "error"
                  ? "hover:bg-destructive/10"
                  : "hover:bg-amber-500/10"
              )}
            >
              {/* Severity indicator */}
              <span
                className={cn(
                  "size-1.5 shrink-0 rounded-full",
                  error.severity === "error" ? "bg-destructive" : "bg-amber-500"
                )}
              />

              {/* Species name */}
              <span
                className={cn(
                  "w-24 shrink-0 truncate font-medium",
                  error.severity === "error"
                    ? "text-destructive"
                    : "text-amber-600"
                )}
              >
                {error.pokemonName}
              </span>

              {/* Field label */}
              <span className="text-muted-foreground w-20 shrink-0 truncate">
                {getFieldLabel(error.field)}
              </span>

              {/* Error message */}
              <span
                className={cn(
                  "min-w-0 truncate",
                  error.severity === "error"
                    ? "text-destructive/80"
                    : "text-amber-600/80"
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
