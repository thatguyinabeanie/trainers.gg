"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Trophy, ChevronDown, ChevronRight, Loader2, X } from "lucide-react";
import { useSupabaseQuery } from "@/lib/supabase";
import { getUserTournamentHistory } from "@trainers/supabase";
import type { TypedSupabaseClient } from "@trainers/supabase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TournamentEntry = Awaited<
  ReturnType<typeof getUserTournamentHistory>
>[number];

type FilterChip = "all" | "live" | "upcoming" | "completed";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function spriteUrl(species: string): string {
  return `https://play.pokemonshowdown.com/sprites/gen5/${species.toLowerCase().replace(/[^a-z0-9-]/g, "")}.png`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function ordinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]!);
}

function formatWinRate(wins: number, losses: number): string {
  const total = wins + losses;
  if (total === 0) return "—";
  return `${((wins / total) * 100).toFixed(1)}%`;
}

function calcAvgPlace(entries: TournamentEntry[]): string {
  const placed = entries.filter((e) => e.placement !== null && e.placement > 0);
  if (placed.length === 0) return "—";
  const avg =
    placed.reduce((sum, e) => sum + (e.placement ?? 0), 0) / placed.length;
  return avg.toFixed(1);
}

// ---------------------------------------------------------------------------
// Status badge for the tournament lifecycle
// The existing StatusBadge doesn't cover "live" / "late_reg" labels we need,
// so we inline a small variant here.
// ---------------------------------------------------------------------------

type TournamentBadgeStatus = "live" | "registered" | "late_reg" | "completed";

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

function TournamentStatusBadge({ status }: { status: TournamentBadgeStatus }) {
  const config = badgeConfig[status];
  return (
    <Badge variant="outline" className={cn("text-[10px]", config.className)}>
      {config.label}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Pokemon sprite row (24px, gen5)
// ---------------------------------------------------------------------------

function SpriteRow({
  species,
  size = 24,
  opacity,
}: {
  species: string[];
  size?: number;
  opacity?: number;
}) {
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
// Expanded opponent schedule sub-table
// ---------------------------------------------------------------------------

function OpponentSchedule({ entry: _entry }: { entry: TournamentEntry }) {
  // Placeholder — round-by-round match data is not in the current query.
  // When match data is available, render round rows here.
  // The existing getUserTournamentHistory does not expose per-round match results.
  return (
    <div className="bg-background rounded-lg border">
      <div className="overflow-x-auto">
        <table className="w-full text-xs" style={{ tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: 36 }} />
            <col style={{ width: 60 }} />
            <col style={{ width: "40%" }} />
            <col />
          </colgroup>
          <thead>
            <tr className="border-b">
              <td className="text-muted-foreground px-2.5 py-1 text-[10px] font-medium tracking-wider uppercase">
                RND
              </td>
              <td className="text-muted-foreground px-2.5 py-1 text-[10px] font-medium tracking-wider uppercase">
                SCORE
              </td>
              <td className="text-muted-foreground px-2.5 py-1 text-[10px] font-medium tracking-wider uppercase">
                MATCHUP
              </td>
              <td className="text-muted-foreground px-2.5 py-1 text-[10px] font-medium tracking-wider uppercase">
                OPP TEAM
              </td>
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

// ---------------------------------------------------------------------------
// Place cell — teal + trophy for 1st
// ---------------------------------------------------------------------------

function PlaceCell({
  placement,
  playerCount,
}: {
  placement: number | null;
  playerCount?: number | null;
}) {
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
// Tournament table row (collapsed + expanded)
// ---------------------------------------------------------------------------

function TournamentRow({
  entry,
  isExpanded,
  onToggle,
}: {
  entry: TournamentEntry;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  // Currently all entries from getUserTournamentHistory are completed.
  // When live/upcoming data is added, status will come from the entry.
  const status: TournamentBadgeStatus = "completed";
  const isCompleted = status === "completed";

  return (
    <>
      <tr
        onClick={onToggle}
        className={cn(
          "hover:bg-muted/50 cursor-pointer border-b transition-colors",
          isExpanded && "bg-muted/30",
          !isExpanded && "last:border-0"
        )}
      >
        {/* Status */}
        <td className="w-[100px] px-3 py-2.5">
          <TournamentStatusBadge status={status} />
        </td>

        {/* Tournament name + date */}
        <td className="px-3 py-2.5">
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <Link
              href={`/tournaments/${entry.tournamentSlug}`}
              onClick={(e) => e.stopPropagation()}
              className="text-sm font-medium text-teal-600 underline decoration-teal-200 underline-offset-2 hover:text-teal-500 dark:text-teal-400 dark:decoration-teal-800"
            >
              {entry.tournamentName}
            </Link>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground text-xs">
              {formatDate(entry.startDate)}
            </span>
          </span>
        </td>

        {/* Alt */}
        <td className="px-3 py-2.5">
          <Link
            href={`/dashboard/alts/${entry.altUsername}/tournaments`}
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-teal-600 underline decoration-teal-200 underline-offset-2 hover:text-teal-500 dark:text-teal-400 dark:decoration-teal-800"
          >
            {entry.altUsername}
          </Link>
        </td>

        {/* Format */}
        <td className="text-muted-foreground px-3 py-2.5 text-xs">
          {entry.format ?? "—"}
        </td>

        {/* Team sprites */}
        <td className="px-3 py-2.5">
          <SpriteRow species={entry.teamPokemon} size={24} />
        </td>

        {/* Record */}
        <td className="px-3 py-2.5 text-right">
          <span
            className={cn(
              "font-mono text-xs",
              entry.wins + entry.losses === 0 && "text-muted-foreground"
            )}
          >
            {isCompleted ? `${entry.wins}-${entry.losses}` : "—"}
          </span>
        </td>

        {/* Place */}
        <td className="px-3 py-2.5 text-right">
          <PlaceCell placement={entry.placement} />
        </td>

        {/* Expand chevron */}
        <td className="w-8 px-2 py-2.5 text-center">
          {isCompleted ? (
            isExpanded ? (
              <ChevronDown className="text-muted-foreground mx-auto size-3.5" />
            ) : (
              <ChevronRight className="text-muted-foreground mx-auto size-3.5" />
            )
          ) : null}
        </td>
      </tr>

      {/* Expanded panel — opponent schedule */}
      {isExpanded && isCompleted && (
        <tr className="bg-muted/20 border-b last:border-0">
          <td colSpan={8} className="px-3 pt-1 pb-3">
            <OpponentSchedule entry={entry} />
          </td>
        </tr>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Summary stats row
// ---------------------------------------------------------------------------

function SummaryStats({ entries }: { entries: TournamentEntry[] }) {
  const played = entries.length;
  const totalWins = entries.reduce((s, e) => s + e.wins, 0);
  const totalLosses = entries.reduce((s, e) => s + e.losses, 0);
  const bestPlacement = entries
    .map((e) => e.placement)
    .filter((p): p is number => p !== null && p > 0)
    .sort((a, b) => a - b)[0];

  return (
    <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
      <div className="bg-muted/50 rounded-lg p-3">
        <div className="text-muted-foreground mb-0.5 text-[10px] font-semibold tracking-widest uppercase">
          Played
        </div>
        <div className="font-mono text-lg font-bold">{played}</div>
      </div>
      <div className="bg-muted/50 rounded-lg p-3">
        <div className="text-muted-foreground mb-0.5 text-[10px] font-semibold tracking-widest uppercase">
          Win Rate
        </div>
        <div className="font-mono text-lg font-bold">
          {formatWinRate(totalWins, totalLosses)}
        </div>
      </div>
      <div className="bg-muted/50 rounded-lg p-3">
        <div className="text-muted-foreground mb-0.5 text-[10px] font-semibold tracking-widest uppercase">
          Best Finish
        </div>
        <div
          className={cn(
            "font-mono text-lg font-bold",
            bestPlacement === 1 && "text-teal-600 dark:text-teal-400"
          )}
        >
          {bestPlacement != null ? ordinalSuffix(bestPlacement) : "—"}
        </div>
      </div>
      <div className="bg-muted/50 rounded-lg p-3">
        <div className="text-muted-foreground mb-0.5 text-[10px] font-semibold tracking-widest uppercase">
          Avg Place
        </div>
        <div className="font-mono text-lg font-bold">
          {calcAvgPlace(entries)}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Filter chips
// ---------------------------------------------------------------------------

const CHIP_LABELS: Record<FilterChip, string> = {
  all: "All",
  live: "Live",
  upcoming: "Upcoming",
  completed: "Completed",
};

function FilterChips({
  active,
  counts,
  onChange,
}: {
  active: FilterChip;
  counts: Record<FilterChip, number>;
  onChange: (chip: FilterChip) => void;
}) {
  return (
    <div className="flex gap-1.5">
      {(["all", "live", "upcoming", "completed"] as FilterChip[]).map(
        (chip) => (
          <button
            key={chip}
            onClick={() => onChange(chip)}
            className={cn(
              "cursor-pointer rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
              active === chip
                ? "border-foreground bg-foreground text-background"
                : "text-muted-foreground hover:border-border border-border bg-background hover:text-foreground"
            )}
          >
            {CHIP_LABELS[chip]}
            <span
              className={cn(
                "ml-1 text-[10px]",
                active === chip ? "text-background/70" : "text-muted-foreground"
              )}
            >
              {counts[chip]}
            </span>
          </button>
        )
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="bg-primary/10 flex size-14 items-center justify-center rounded-full">
        <Trophy className="text-primary size-7" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">No tournaments yet</h3>
      <p className="text-muted-foreground mt-2 max-w-sm text-sm">
        Register for a tournament to start tracking your competitive journey.
      </p>
      <Button className="mt-6" render={<Link href="/tournaments" />}>
        Browse Tournaments
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const historyQueryFn = (client: TypedSupabaseClient) =>
  getUserTournamentHistory(client);

export function TournamentsClient({
  selectedAltUsername,
}: {
  selectedAltUsername: string | null;
}) {
  const [activeChip, setActiveChip] = useState<FilterChip>("all");
  const [selectedAlt, setSelectedAlt] = useState<string>(
    selectedAltUsername ?? "all"
  );
  const [selectedFormat, setSelectedFormat] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: history, isLoading } = useSupabaseQuery(historyQueryFn, [
    "tournamentHistory",
  ]);

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="text-muted-foreground size-8 animate-spin" />
      </div>
    );
  }

  const entries = history ?? [];

  // Build unique alt and format options
  const altOptions = Array.from(
    new Set(entries.map((e) => e.altUsername).filter(Boolean))
  ).sort();
  const formatOptions = Array.from(
    new Set(entries.map((e) => e.format).filter((f): f is string => f !== null))
  ).sort();

  // Currently all entries from getUserTournamentHistory are completed.
  // Live/upcoming will be "0" until a full lifecycle query is added.
  const counts: Record<FilterChip, number> = {
    all: entries.length,
    live: 0,
    upcoming: 0,
    completed: entries.length,
  };

  // Filter by chip
  const chipFiltered = entries.filter((_e) => {
    if (activeChip === "all") return true;
    // All current entries are completed; live/upcoming show nothing for now
    if (activeChip === "completed") return true;
    return false;
  });

  // Filter by alt
  const altFiltered =
    selectedAlt === "all"
      ? chipFiltered
      : chipFiltered.filter((e) => e.altUsername === selectedAlt);

  // Filter by format
  const formatFiltered =
    selectedFormat === "all"
      ? altFiltered
      : altFiltered.filter((e) => e.format === selectedFormat);

  const visibleEntries = formatFiltered;

  const handleToggle = (id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Heading + filters row */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold tracking-tight">Tournaments</h1>
        <div className="flex items-center gap-2">
          {/* Alt dropdown */}
          <Select
            value={selectedAlt}
            onValueChange={(v) => setSelectedAlt(v ?? "all")}
          >
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue placeholder="All alts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All alts</SelectItem>
              {altOptions.map((alt) => (
                <SelectItem key={alt} value={alt}>
                  {alt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Clear alt filter */}
          {selectedAlt !== "all" && (
            <button
              onClick={() => setSelectedAlt("all")}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Clear alt filter"
            >
              <X className="size-3.5" />
            </button>
          )}

          {/* Format dropdown */}
          <Select
            value={selectedFormat}
            onValueChange={(v) => setSelectedFormat(v ?? "all")}
          >
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue placeholder="All formats" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All formats</SelectItem>
              {formatOptions.map((fmt) => (
                <SelectItem key={fmt} value={fmt}>
                  {fmt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Clear format filter */}
          {selectedFormat !== "all" && (
            <button
              onClick={() => setSelectedFormat("all")}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Clear format filter"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Filter chips */}
      <FilterChips
        active={activeChip}
        counts={counts}
        onChange={setActiveChip}
      />

      {/* Summary stats — respond to alt/format filter */}
      <SummaryStats entries={visibleEntries} />

      {/* Empty state or table */}
      {entries.length === 0 ? (
        <EmptyState />
      ) : visibleEntries.length === 0 ? (
        <div className="text-muted-foreground rounded-lg border border-dashed py-12 text-center text-sm">
          No tournaments match the current filters.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/30 border-b">
                  <th className="text-muted-foreground h-9 w-[100px] px-3 text-left text-[10px] font-medium tracking-wider uppercase">
                    Status
                  </th>
                  <th className="text-muted-foreground h-9 px-3 text-left text-[10px] font-medium tracking-wider uppercase">
                    Tournament
                  </th>
                  <th className="text-muted-foreground h-9 px-3 text-left text-[10px] font-medium tracking-wider uppercase">
                    Alt
                  </th>
                  <th className="text-muted-foreground h-9 px-3 text-left text-[10px] font-medium tracking-wider uppercase">
                    Format
                  </th>
                  <th className="text-muted-foreground h-9 px-3 text-left text-[10px] font-medium tracking-wider uppercase">
                    Team
                  </th>
                  <th className="text-muted-foreground h-9 px-3 text-right text-[10px] font-medium tracking-wider uppercase">
                    Record
                  </th>
                  <th className="text-muted-foreground h-9 px-3 text-right text-[10px] font-medium tracking-wider uppercase">
                    Place
                  </th>
                  <th className="h-9 w-8" />
                </tr>
              </thead>
              <tbody>
                {visibleEntries.map((entry) => (
                  <TournamentRow
                    key={entry.id}
                    entry={entry}
                    isExpanded={expandedId === entry.id}
                    onToggle={() => handleToggle(entry.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
