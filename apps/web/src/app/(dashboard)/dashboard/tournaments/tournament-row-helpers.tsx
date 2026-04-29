/**
 * Shared display helpers for the dashboard tournament history list — used by
 * both the desktop `TournamentsTable` and the mobile `TournamentsCards` layouts.
 *
 * Pure presentational components; no hooks, no state.
 */

import Image from "next/image";

import { type getUserTournamentHistory } from "@trainers/supabase";
import { getPokemonSprite } from "@trainers/pokemon/sprites";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { ordinalSuffix } from "./tournament-helpers";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TournamentEntry = Awaited<
  ReturnType<typeof getUserTournamentHistory>
>[number];

export type TournamentBadgeStatus =
  | "live"
  | "registered"
  | "late_reg"
  | "completed";

// ---------------------------------------------------------------------------
// Sprite helper
// ---------------------------------------------------------------------------

export function spriteUrl(species: string): string {
  return getPokemonSprite(species).url;
}

// ---------------------------------------------------------------------------
// Status badge for the tournament lifecycle
// The shared StatusBadge doesn't cover "live" / "late_reg" labels, so we
// inline a small variant here.
// ---------------------------------------------------------------------------

const badgeConfig: Record<
  TournamentBadgeStatus,
  { label: string; className: string }
> = {
  live: {
    label: "Live",
    className:
      "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
  },
  registered: {
    label: "Registered",
    className:
      "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/25",
  },
  late_reg: {
    label: "Late Reg",
    className:
      "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25",
  },
  completed: {
    label: "Completed",
    className:
      "bg-gray-500/15 text-gray-600 dark:text-gray-400 border-gray-500/25",
  },
};

interface TournamentStatusBadgeProps {
  status: TournamentBadgeStatus;
}

export function TournamentStatusBadge({ status }: TournamentStatusBadgeProps) {
  const config = badgeConfig[status];
  return (
    <Badge variant="outline" className={cn("text-[10px]", config.className)}>
      {config.label}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Pokemon sprite row
// ---------------------------------------------------------------------------

interface SpriteRowProps {
  species: string[];
  size?: number;
  opacity?: number;
}

export function SpriteRow({ species, size = 24, opacity }: SpriteRowProps) {
  if (species.length === 0) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }
  return (
    <div className="flex">
      {species.map((s, i) => (
        <Image
          key={i}
          src={spriteUrl(s)}
          alt={s}
          width={size}
          height={size}
          className="object-contain"
          style={{ imageRendering: "pixelated", opacity }}
          unoptimized
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Place cell — teal + trophy for 1st
// ---------------------------------------------------------------------------

interface PlaceCellProps {
  placement: number | null;
  playerCount?: number | null;
}

export function PlaceCell({ placement, playerCount }: PlaceCellProps) {
  if (placement === null) {
    return <span className="text-muted-foreground font-mono text-xs">—</span>;
  }

  const label = ordinalSuffix(placement);
  const isFirst = placement === 1;

  return (
    <span
      className={cn(
        "font-mono text-xs font-semibold",
        isFirst ? "text-teal-600 dark:text-teal-400" : "text-foreground"
      )}
    >
      {isFirst ? `${label} 🏆` : label}
      {playerCount != null && (
        <span className="text-muted-foreground font-normal">
          {" "}
          / {playerCount}
        </span>
      )}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Expanded opponent schedule sub-table
// ---------------------------------------------------------------------------

interface OpponentScheduleProps {
  entry: TournamentEntry;
}

export function OpponentSchedule({ entry: _entry }: OpponentScheduleProps) {
  // Placeholder — round-by-round match data is not in the current query.
  // When match data is available, render round rows here.
  return (
    <div className="bg-background/60 rounded-lg">
      <div className="overflow-x-auto">
        <table className="w-full text-xs" style={{ tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: 36 }} />
            <col style={{ width: 60 }} />
            <col style={{ width: "40%" }} />
            <col />
          </colgroup>
          <thead>
            <tr className="bg-muted/30">
              <th
                scope="col"
                className="text-muted-foreground px-2.5 py-1 text-[10px] font-medium tracking-wider uppercase"
              >
                RND
              </th>
              <th
                scope="col"
                className="text-muted-foreground px-2.5 py-1 text-[10px] font-medium tracking-wider uppercase"
              >
                SCORE
              </th>
              <th
                scope="col"
                className="text-muted-foreground px-2.5 py-1 text-[10px] font-medium tracking-wider uppercase"
              >
                MATCHUP
              </th>
              <th
                scope="col"
                className="text-muted-foreground px-2.5 py-1 text-[10px] font-medium tracking-wider uppercase"
              >
                OPP TEAM
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td
                colSpan={4}
                className="text-muted-foreground px-2.5 py-4 text-center text-xs"
              >
                Round-by-round data not yet available
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
