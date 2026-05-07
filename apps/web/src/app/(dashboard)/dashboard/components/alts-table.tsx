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

export interface AltsTableProps {
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
// AltTableRow
// ---------------------------------------------------------------------------

function AltTableRow({
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

  return (
    <>
      {/* Main row */}
      <tr
        onClick={onToggle}
        onKeyDown={(e) => {
          // Ignore keydowns that bubble from nested interactive controls
          // (avatar popover trigger, visibility toggle) — keyboard users
          // shouldn't accidentally expand/collapse by pressing Space/Enter
          // on those inner buttons. Matches the card variant's guard.
          if (e.currentTarget !== e.target) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        className={cn(
          "hover:bg-muted/50 cursor-pointer border-b transition-colors",
          isExpanded && "bg-muted/30",
          !isExpanded && "last:border-0"
        )}
      >
        {/* Chevron */}
        <td className="w-8 px-2 py-2.5 text-center">
          {isExpanded ? (
            <ChevronDown className="text-muted-foreground mx-auto size-3.5" />
          ) : (
            <ChevronRight className="text-muted-foreground mx-auto size-3.5" />
          )}
        </td>

        {/* Handle */}
        <td className="w-[200px] px-3 py-2.5">
          <div className="flex items-center gap-2">
            <AltAvatarPicker
              altId={alt.id}
              username={alt.username}
              avatarUrl={alt.avatar_url}
              onAvatarChange={onRefresh}
              refreshKey={refreshKey}
              size="sm"
            />
            <span className="flex min-w-0 items-center gap-1.5">
              <span
                className={cn(
                  "truncate text-[13px] font-semibold",
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
            </span>
          </div>
        </td>

        {/* Record */}
        <td className="px-3 py-2.5 text-right">
          <span
            className={cn(
              "font-mono text-xs",
              wins + losses === 0 && "text-muted-foreground",
              isExpanded && "font-semibold"
            )}
          >
            {wins}-{losses}
          </span>
        </td>

        {/* Win % */}
        <td className="px-3 py-2.5 text-right">
          <span
            className={cn(
              "font-mono text-xs",
              wins + losses === 0 && "text-muted-foreground",
              isExpanded && isHighWinRate(wins, losses)
                ? "font-semibold text-teal-600 dark:text-teal-400"
                : isExpanded
                  ? "font-semibold"
                  : ""
            )}
          >
            {formatWinRate(wins, losses)}
          </span>
        </td>

        {/* Rating */}
        <td className="px-3 py-2.5 text-right">
          <span
            className={cn(
              "font-mono text-xs",
              !rating && "text-muted-foreground",
              isExpanded && "font-semibold"
            )}
          >
            {rating ?? "—"}
          </span>
        </td>

        {/* Events */}
        <td className="px-3 py-2.5 text-right">
          <span
            className={cn(
              "font-mono text-xs",
              events === 0 && "text-muted-foreground"
            )}
          >
            {events}
          </span>
        </td>

        {/* Teams — full team data loads on expand via TeamsSubTable */}
        <td className="px-3 py-2.5 text-right">
          <span className="text-muted-foreground font-mono text-xs">—</span>
        </td>

        {/* Public dot — stop propagation to allow toggling without expanding row */}
        <td
          className="px-3 py-2.5 text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <AltVisibilityToggle
            altId={alt.id}
            isPublic={alt.is_public}
            onRefresh={onRefresh}
            layout="cell"
          />
        </td>
      </tr>

      {/* Expanded panel */}
      {isExpanded && (
        <tr className="bg-muted/20 border-b last:border-0">
          <td colSpan={8} className="px-3 pt-1 pb-3">
            <TeamsSubTable
              altId={alt.id}
              altUsername={alt.username}
              isMain={isMain}
              onDeleteAlt={onDelete}
              isDeletePending={isDeletePending}
              refreshKey={refreshKey}
            />
          </td>
        </tr>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// AltsTable
// ---------------------------------------------------------------------------

export function AltsTable({
  alts,
  mainAltId,
  bulkStats,
  bulkRatings,
  selectedAltUsername,
  onAltSelect,
  onRefresh,
  refreshKey,
}: AltsTableProps) {
  const [isPending, startTransition] = useTransition();

  // Find the expanded alt by matching username
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

  // TODO: Replace with archiveAltAction when archive system is built
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
        toast.error(result.error ?? "Failed to delete alt");
      }
    });
  };

  return (
    <div className="bg-muted/30 overflow-hidden rounded-lg">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="h-8 w-8" />
              <th className="text-muted-foreground h-8 w-[200px] px-3 text-left text-xs font-medium tracking-wide uppercase">
                Handle
              </th>
              <th className="text-muted-foreground h-8 px-3 text-right text-xs font-medium tracking-wide uppercase">
                Record
              </th>
              <th className="text-muted-foreground h-8 px-3 text-right text-xs font-medium tracking-wide uppercase">
                Win %
              </th>
              <th className="text-muted-foreground h-8 px-3 text-right text-xs font-medium tracking-wide uppercase">
                ELO
              </th>
              <th className="text-muted-foreground h-8 px-3 text-right text-xs font-medium tracking-wide uppercase">
                Events
              </th>
              <th className="text-muted-foreground h-8 px-3 text-right text-xs font-medium tracking-wide uppercase">
                Teams
              </th>
              <th className="text-muted-foreground h-8 px-3 text-center text-xs font-medium tracking-wide uppercase">
                Public
              </th>
            </tr>
          </thead>
          <tbody>
            {alts.map((alt) => (
              <AltTableRow
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
          </tbody>
        </table>
      </div>
    </div>
  );
}
