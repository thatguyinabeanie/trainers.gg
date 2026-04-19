"use client";

import { useTransition } from "react";
import { Pencil, Star, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";

import { type AltStats, type PlayerRating } from "@trainers/supabase";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { SpritePicker } from "@/components/profile/sprite-picker";
import { cn } from "@/lib/utils";
import { updateAltVisibilityAction } from "@/actions/profile";
import { deleteAltAction } from "@/actions/alts";
import { formatWinRate } from "../tournaments/tournament-helpers";

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
// Helpers
// ---------------------------------------------------------------------------

function isHighWinRate(wins: number, losses: number): boolean {
  const total = wins + losses;
  if (total === 0) return false;
  return wins / total >= 0.55;
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
  const [, startVisibilityTransition] = useTransition();

  const wins = altStats?.matchWins ?? 0;
  const losses = altStats?.matchLosses ?? 0;
  const events = altStats?.tournamentCount ?? 0;
  const rating = altRating?.rating ?? null;
  const noRecord = wins + losses === 0;

  const handleVisibilityChange = (checked: boolean) => {
    startVisibilityTransition(async () => {
      const result = await updateAltVisibilityAction(alt.id, checked);
      if (result.success) {
        onRefresh();
      } else {
        toast.error(result.error ?? "Failed to update visibility");
      }
    });
  };

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
        {/* Avatar with sprite picker — stop propagation so header tap doesn't fire */}
        <span onClick={(e) => e.stopPropagation()} className="shrink-0">
          <Popover key={`${alt.id}-${refreshKey}`}>
            <PopoverTrigger
              title="Change avatar"
              className="group/avatar relative shrink-0 cursor-pointer"
            >
              <div className="relative overflow-hidden rounded-full">
                <Avatar className="ring-primary/10 size-9 ring-1">
                  {alt.avatar_url && (
                    <AvatarImage src={alt.avatar_url} alt={alt.username} />
                  )}
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                    {alt.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover/avatar:bg-black/40">
                  <Pencil className="size-3 text-white opacity-0 drop-shadow-md transition-opacity group-hover/avatar:opacity-100" />
                </div>
              </div>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-2">
              <SpritePicker
                altId={alt.id}
                currentAvatarUrl={alt.avatar_url}
                onAvatarChange={onRefresh}
              />
            </PopoverContent>
          </Popover>
        </span>

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

        {/* Public toggle — stop propagation */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleVisibilityChange(!alt.is_public);
          }}
          className="shrink-0 p-1"
          aria-label={alt.is_public ? "Make private" : "Make public"}
          title={
            alt.is_public
              ? "Public — tap to make private"
              : "Private — tap to make public"
          }
        >
          <span
            className={cn(
              "block size-2.5 rounded-full",
              alt.is_public ? "bg-emerald-500" : "bg-neutral-300"
            )}
          />
        </button>

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
