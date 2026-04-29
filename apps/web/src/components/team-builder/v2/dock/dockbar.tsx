"use client";

import { type GameFormat } from "@trainers/pokemon";
import { type TeamWithPokemon } from "@trainers/supabase";

import { cn } from "@/lib/utils";

import { getTeamDefensiveSummary } from "./heatmap-panel";
import { getTeamFastestSpeed } from "./speed-tiers-panel";

// =============================================================================
// Types
// =============================================================================

export interface DockbarProps {
  drawer: "matchups" | "speed" | null;
  onOpen: (key: "matchups" | "speed") => void;
  team: TeamWithPokemon["team_pokemon"];
  format: GameFormat | undefined;
}

// =============================================================================
// Dockbar
// =============================================================================

/**
 * Bottom dock toolbar with two pill buttons: Type matchups and Speed tiers.
 *
 * Each pill shows live mini-stats derived from the current team:
 *   - Matchups: "<weakCount> weak · <coveredCount> covered"
 *   - Speed: "<fastest> fastest · vs format"
 *
 * The active pill is highlighted. An Esc hint is shown on the trailing end.
 */
export function Dockbar({ drawer, onOpen, team, format }: DockbarProps) {
  const { weakCount, coveredCount } = getTeamDefensiveSummary(team);
  const fastest =
    format ? getTeamFastestSpeed(team, format) : 0;

  return (
    <div
      role="toolbar"
      aria-label="Builder tools"
      className="flex min-w-0 flex-wrap items-center gap-2 border-t bg-background px-3 py-2"
    >
      {/* Type matchups pill */}
      <button
        type="button"
        onClick={() => onOpen("matchups")}
        title="Defensive type matchups"
        aria-pressed={drawer === "matchups"}
        className={cn(
          "flex min-w-0 shrink items-center gap-2 rounded-full border px-3 py-1.5 text-left transition-colors duration-150",
          drawer === "matchups"
            ? "border-primary bg-primary/10 text-primary"
            : "border-border bg-card text-foreground hover:border-primary/50 hover:bg-muted/50"
        )}
      >
        <span className="shrink-0 text-[15px] leading-none" aria-hidden>
          ▦
        </span>
        <span className="flex min-w-0 flex-col gap-0">
          <span className="text-xs font-semibold leading-tight">
            Type matchups
          </span>
          <span className="flex min-w-0 items-center gap-1 font-mono text-[10px] leading-tight text-muted-foreground">
            <span
              className={cn(
                "font-semibold",
                weakCount > 0 ? "text-destructive" : "text-muted-foreground"
              )}
            >
              {weakCount}
            </span>
            <span>weak</span>
            <span className="opacity-40">·</span>
            <span
              className={cn(
                "font-semibold",
                coveredCount > 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-muted-foreground"
              )}
            >
              {coveredCount}
            </span>
            <span className="hidden sm:inline">covered</span>
          </span>
        </span>
        <span className="ml-1 shrink-0 text-[10px] text-muted-foreground" aria-hidden>
          {drawer === "matchups" ? "▾" : "▴"}
        </span>
      </button>

      {/* Speed tiers pill */}
      <button
        type="button"
        onClick={() => onOpen("speed")}
        title="Speed tier ladder"
        aria-pressed={drawer === "speed"}
        className={cn(
          "flex min-w-0 shrink items-center gap-2 rounded-full border px-3 py-1.5 text-left transition-colors duration-150",
          drawer === "speed"
            ? "border-primary bg-primary/10 text-primary"
            : "border-border bg-card text-foreground hover:border-primary/50 hover:bg-muted/50"
        )}
      >
        <span className="shrink-0 text-[15px] leading-none" aria-hidden>
          ≫
        </span>
        <span className="flex min-w-0 flex-col gap-0">
          <span className="text-xs font-semibold leading-tight">
            Speed tiers
          </span>
          <span className="flex min-w-0 items-center gap-1 font-mono text-[10px] leading-tight text-muted-foreground">
            <span className="font-semibold">
              {fastest > 0 ? fastest : "—"}
            </span>
            <span>fastest</span>
            <span className="hidden opacity-40 sm:inline">·</span>
            <span className="hidden sm:inline">vs format</span>
          </span>
        </span>
        <span className="ml-1 shrink-0 text-[10px] text-muted-foreground" aria-hidden>
          {drawer === "speed" ? "▾" : "▴"}
        </span>
      </button>

      {/* Spacer */}
      <span className="flex-1" />

      {/* Esc hint — desktop only */}
      <span className="hidden items-center gap-1 font-mono text-[10px] text-muted-foreground sm:flex">
        <kbd className="rounded border border-border bg-muted px-1 py-0.5 text-[9px] font-semibold">
          Esc
        </kbd>
        close
      </span>
    </div>
  );
}
