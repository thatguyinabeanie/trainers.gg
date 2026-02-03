"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { StatusBadge, type Status } from "@/components/ui/status-badge";
import { ShieldAlert, User, Gamepad2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export interface PlayerInfo {
  id: number;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  in_game_name: string | null;
}

export interface PlayerStats {
  wins: number;
  losses: number;
}

interface MatchHeaderProps {
  opponent: PlayerInfo | null;
  myPlayer: PlayerInfo | null;
  opponentStats: PlayerStats | null;
  myStats: PlayerStats | null;
  myWins: number;
  opponentWins: number;
  bestOf: number;
  matchStatus: string;
  staffRequested: boolean;
  roundNumber: number | null;
  tableNumber: number | null;
}

// ============================================================================
// Sub-components
// ============================================================================

function PlayerCard({
  player,
  stats,
  isOpponent,
  className,
}: {
  player: PlayerInfo | null;
  stats: PlayerStats | null;
  isOpponent: boolean;
  className?: string;
}) {
  if (!player) return null;

  const displayName = player.display_name ?? player.username;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Avatar className="h-10 w-10">
        <AvatarImage src={player.avatar_url ?? undefined} />
        <AvatarFallback>
          <User className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{displayName}</span>
          {stats && (
            <Badge variant="secondary" className="text-[10px]">
              {stats.wins}-{stats.losses}
            </Badge>
          )}
        </div>
        {isOpponent && player.in_game_name && (
          <div className="mt-0.5 flex items-center gap-1">
            <Gamepad2 className="text-muted-foreground h-3 w-3 shrink-0" />
            <span className="text-muted-foreground font-mono text-xs">
              {player.in_game_name}
            </span>
            <CopyButton
              text={player.in_game_name}
              label="Copy IGN to clipboard"
              toastMessage="IGN copied!"
              size="xs"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function SeriesScore({
  myWins,
  opponentWins,
  bestOf,
}: {
  myWins: number;
  opponentWins: number;
  bestOf: number;
}) {
  const winsNeeded = Math.ceil(bestOf / 2);

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Score numbers */}
      <div className="flex items-center gap-4">
        <span
          className={cn(
            "text-3xl font-bold tabular-nums",
            opponentWins > myWins && "text-primary"
          )}
        >
          {opponentWins}
        </span>
        <span className="text-muted-foreground text-lg">&ndash;</span>
        <span
          className={cn(
            "text-3xl font-bold tabular-nums",
            myWins > opponentWins && "text-primary"
          )}
        >
          {myWins}
        </span>
      </div>

      {/* Score pips */}
      <div className="flex items-center gap-3">
        {/* Opponent pips (left) */}
        <div className="flex gap-1">
          {Array.from({ length: winsNeeded }, (_, i) => (
            <div
              key={`opp-${i}`}
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                i < opponentWins ? "bg-primary" : "bg-foreground/10"
              )}
            />
          ))}
        </div>
        <div className="text-muted-foreground text-[10px]">Bo{bestOf}</div>
        {/* My pips (right) */}
        <div className="flex gap-1">
          {Array.from({ length: winsNeeded }, (_, i) => (
            <div
              key={`my-${i}`}
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                i < myWins ? "bg-primary" : "bg-foreground/10"
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Match Header
// ============================================================================

export function MatchHeader({
  opponent,
  myPlayer,
  opponentStats,
  myStats,
  myWins,
  opponentWins,
  bestOf,
  matchStatus,
  staffRequested,
  roundNumber,
  tableNumber,
}: MatchHeaderProps) {
  return (
    <Card>
      <CardContent className="p-4">
        {/* Metadata row */}
        <div className="mb-3 flex items-center justify-between">
          <div className="text-muted-foreground flex items-center gap-2 text-xs">
            {roundNumber !== null && <span>Round {roundNumber}</span>}
            {tableNumber !== null && (
              <>
                <span>&middot;</span>
                <span>Table {tableNumber}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {staffRequested && (
              <Badge variant="destructive" className="gap-1">
                <ShieldAlert className="h-3 w-3" />
                Judge Requested
              </Badge>
            )}
            <StatusBadge status={matchStatus as Status} />
          </div>
        </div>

        {/* Players + Score */}
        <div className="flex items-center justify-between gap-4">
          {/* Opponent (left) */}
          <PlayerCard
            player={opponent}
            stats={opponentStats}
            isOpponent={true}
            className="flex-1"
          />

          {/* Series Score (center) */}
          <SeriesScore
            myWins={myWins}
            opponentWins={opponentWins}
            bestOf={bestOf}
          />

          {/* Me (right) — compact on desktop, hidden on mobile */}
          <PlayerCard
            player={myPlayer}
            stats={myStats}
            isOpponent={false}
            className="hidden flex-1 justify-end lg:flex"
          />
        </div>
      </CardContent>
    </Card>
  );
}
