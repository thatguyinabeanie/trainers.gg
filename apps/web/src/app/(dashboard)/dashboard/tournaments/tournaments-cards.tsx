"use client";

import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

import { formatDate } from "./tournament-helpers";
import {
  type TournamentBadgeStatus,
  type TournamentEntry,
  OpponentSchedule,
  PlaceCell,
  SpriteRow,
  TournamentStatusBadge,
} from "./tournament-row-helpers";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface TournamentsCardsProps {
  entries: TournamentEntry[];
  expandedId: number | null;
  onToggle: (id: number) => void;
}

// ---------------------------------------------------------------------------
// TournamentCard
// ---------------------------------------------------------------------------

interface TournamentCardProps {
  entry: TournamentEntry;
  isExpanded: boolean;
  onToggle: () => void;
}

function TournamentCard({ entry, isExpanded, onToggle }: TournamentCardProps) {
  // Currently all entries from getUserTournamentHistory are completed.
  // When live/upcoming data is added, status will come from the entry.
  const status: TournamentBadgeStatus = "completed";
  const isCompleted = status === "completed";
  const noRecord = entry.wins + entry.losses === 0;

  return (
    <div
      className={cn(
        "ring-foreground/10 bg-card overflow-hidden rounded-xl ring-1 transition-colors",
        isExpanded && "bg-muted/30"
      )}
    >
      {/* Header — tappable region toggles expansion */}
      <div
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.currentTarget !== e.target) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        className="hover:bg-muted/40 flex min-h-[44px] cursor-pointer items-start gap-2 px-3 py-3"
      >
        {/* Left: status + name + meta */}
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <TournamentStatusBadge status={status} />
            <Link
              href={`/tournaments/${entry.tournamentSlug}`}
              onClick={(e) => e.stopPropagation()}
              className="truncate text-sm font-medium text-teal-600 underline decoration-teal-200 underline-offset-2 hover:text-teal-500 dark:text-teal-400 dark:decoration-teal-800"
            >
              {entry.tournamentName}
            </Link>
          </div>
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <span>{formatDate(entry.startDate)}</span>
            <span>·</span>
            <Link
              href={`/dashboard/alts/${entry.altUsername}/tournaments`}
              onClick={(e) => e.stopPropagation()}
              className="text-teal-600 underline decoration-teal-200 underline-offset-2 hover:text-teal-500 dark:text-teal-400 dark:decoration-teal-800"
            >
              {entry.altUsername}
            </Link>
            <span>·</span>
            <span>{entry.format ?? "—"}</span>
          </div>
          <SpriteRow species={entry.teamPokemon} size={20} />
        </div>

        {/* Right: place + record + chevron */}
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <PlaceCell placement={entry.placement} />
          <span
            className={cn(
              "font-mono text-xs",
              noRecord && "text-muted-foreground"
            )}
          >
            {isCompleted ? `${entry.wins}-${entry.losses}` : "—"}
          </span>
          {isCompleted &&
            (isExpanded ? (
              <ChevronDown className="text-muted-foreground size-4" />
            ) : (
              <ChevronRight className="text-muted-foreground size-4" />
            ))}
        </div>
      </div>

      {/* Expanded panel */}
      {isExpanded && isCompleted && (
        <div className="bg-muted/20 border-t px-3 pt-2 pb-3">
          <OpponentSchedule entry={entry} />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TournamentsCards
// ---------------------------------------------------------------------------

export function TournamentsCards({
  entries,
  expandedId,
  onToggle,
}: TournamentsCardsProps) {
  return (
    <div className="flex flex-col gap-2">
      {entries.map((entry) => (
        <TournamentCard
          key={entry.id}
          entry={entry}
          isExpanded={expandedId === entry.id}
          onToggle={() => onToggle(entry.id)}
        />
      ))}
    </div>
  );
}
