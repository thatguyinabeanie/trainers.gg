"use client";

import { useTransition } from "react";
import { Star, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";

import { type AltStats, type PlayerRating } from "@trainers/supabase";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { deleteAltAction } from "@/actions/alts";
import { formatWinRate } from "../tournaments/tournament-helpers";

import { AltAvatarPicker } from "./alt-avatar-picker";
import { AltVisibilityToggle } from "./alt-visibility-toggle";
import { isHighWinRate } from "./alt-row-helpers";
import { TeamsSubTable } from "./teams-sub-table";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Alt = {
  id: number;
  username: string;
  avatar_url: string | null;
  is_public: boolean;
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface AltsCardsProps {
  alts: Alt[];
  mainAltId: number | null;
  bulkStats: Record<number, AltStats> | undefined;
  bulkRatings: Record<number, PlayerRating> | undefined;
  selectedAltUsername: string | null;
  onAltSelect: (username: string | null) => void;
  onRefresh: () => void;
  refreshKey: number;
}

// ---------------------------------------------------------------------------
// StatCell — label + value pair inside the card stat grid
// ---------------------------------------------------------------------------

function StatCell({
  label,
  value,
  muted = false,
  accent = false,
}: {
  label: string;
  value: string | number;
  muted?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col items-start">
      <span className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
        {label}
      </span>
      <span
        className={cn(
          "font-mono text-sm font-semibold tabular-nums",
          muted && "text-muted-foreground font-normal",
          accent && "text-teal-600 dark:text-teal-400"
        )}
      >
        {value}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AltCard
// ---------------------------------------------------------------------------

function AltCard({
  alt,
  isMain,
  isExpanded,
  onToggle,
  onDelete,
  isDeletePending,
  onRefresh,
  refreshKey,
  altStats,
  altRating,
}: {
  alt: Alt;
  isMain: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  isDeletePending: boolean;
  onRefresh: () => void;
  refreshKey: number;
  altStats: AltStats | undefined;
  altRating: PlayerRating | null;
}) {
  const wins = altStats?.matchWins ?? 0;
  const losses = altStats?.matchLosses ?? 0;
  const events = altStats?.tournamentCount ?? 0;
  const rating = altRating?.rating ?? null;
  const noRecord = wins + losses === 0;

  return (
    <div
      className={cn(
        "ring-foreground/10 bg-card overflow-hidden rounded-xl ring-1 transition-colors",
        isExpanded && "bg-muted/20"
      )}
    >
      {/* Header — tappable region toggles expansion */}
      <div
        onClick={onToggle}
        onKeyDown={(e) => {
          // Ignore keydowns that bubble from nested interactive controls
          // (avatar popover trigger, visibility toggle) — keyboard users
          // shouldn't accidentally expand/collapse by pressing Space/Enter
          // on those inner buttons.
          if (e.currentTarget !== e.target) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        className="hover:bg-muted/40 flex cursor-pointer items-center gap-3 px-3 py-3"
      >
        <AltAvatarPicker
          altId={alt.id}
          username={alt.username}
          avatarUrl={alt.avatar_url}
          onAvatarChange={onRefresh}
          refreshKey={refreshKey}
          size="md"
        />

        {/* Username + Main badge */}
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          <span
            className={cn(
              "truncate text-sm font-semibold",
              isExpanded && "font-bold"
            )}
          >
            {alt.username}
          </span>
          {isMain && (
            <Badge className="gap-0.5 border-amber-500/30 bg-amber-500/10 px-1.5 py-0 text-[10px] text-amber-600 dark:text-amber-400">
              <Star className="size-2.5 fill-current" />
              Main
            </Badge>
          )}
        </div>

        <AltVisibilityToggle
          altId={alt.id}
          isPublic={alt.is_public}
          onRefresh={onRefresh}
        />

        {/* Chevron */}
        {isExpanded ? (
          <ChevronDown className="text-muted-foreground size-4 shrink-0" />
        ) : (
          <ChevronRight className="text-muted-foreground size-4 shrink-0" />
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-2 px-3 pb-3">
        <StatCell label="Record" value={`${wins}-${losses}`} muted={noRecord} />
        <StatCell
          label="Win %"
          value={formatWinRate(wins, losses)}
          muted={noRecord}
          accent={!noRecord && isHighWinRate(wins, losses)}
        />
        <StatCell label="ELO" value={rating ?? "—"} muted={rating === null} />
        <StatCell label="Events" value={events} muted={events === 0} />
      </div>

      {/* Expanded detail */}
      {isExpanded && (
        <div className="bg-muted/20 border-t">
          <TeamsSubTable
            altId={alt.id}
            altUsername={alt.username}
            isMain={isMain}
            onDeleteAlt={onDelete}
            isDeletePending={isDeletePending}
            refreshKey={refreshKey}
          />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// AltsCards
// ---------------------------------------------------------------------------

export function AltsCards({
  alts,
  mainAltId,
  bulkStats,
  bulkRatings,
  selectedAltUsername,
  onAltSelect,
  onRefresh,
  refreshKey,
}: AltsCardsProps) {
  const [isPending, startTransition] = useTransition();

  const expandedAlt = selectedAltUsername
    ? alts.find((a) => a.username === selectedAltUsername)
    : null;
  const expandedAltId = expandedAlt?.id ?? null;

  const handleToggleExpand = (alt: Alt) => {
    if (selectedAltUsername === alt.username) {
      onAltSelect(null);
    } else {
      onAltSelect(alt.username);
    }
  };

  const handleDelete = (altId: number, altName: string) => {
    if (mainAltId === altId) {
      toast.error("Cannot delete your main alt.");
      return;
    }
    if (!confirm(`Delete alt "${altName}"? This cannot be undone.`)) return;

    startTransition(async () => {
      const result = await deleteAltAction(altId);
      if (result.success) {
        toast.success("Alt deleted");
        onAltSelect(null);
        onRefresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="flex flex-col gap-2">
      {alts.map((alt) => (
        <AltCard
          key={alt.id}
          alt={alt}
          isMain={mainAltId === alt.id}
          isExpanded={expandedAltId === alt.id}
          onToggle={() => handleToggleExpand(alt)}
          onDelete={() => handleDelete(alt.id, alt.username)}
          isDeletePending={isPending}
          onRefresh={onRefresh}
          refreshKey={refreshKey}
          altStats={bulkStats?.[alt.id]}
          altRating={bulkRatings?.[alt.id] ?? null}
        />
      ))}
    </div>
  );
}
