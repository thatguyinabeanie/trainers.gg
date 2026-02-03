"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { StatusBadge, type Status } from "@/components/ui/status-badge";
import { ShieldAlert, User, Gamepad2, Gavel } from "lucide-react";
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
  isStaff?: boolean;
}

// ============================================================================
// Sub-components
// ============================================================================

function PlayerCard({
  player,
  stats,
  showIGN,
  align = "left",
  className,
}: {
  player: PlayerInfo | null;
  stats: PlayerStats | null;
  showIGN: boolean;
  align?: "left" | "right";
  className?: string;
}) {
  if (!player) return null;

  const displayName = player.display_name ?? player.username;
  const isRight = align === "right";

  return (
    <div
      className={cn(
        "flex items-center gap-3",
        isRight && "flex-row-reverse",
        className
      )}
    >
      <Avatar className="h-10 w-10 shrink-0 sm:h-12 sm:w-12">
        <AvatarImage src={player.avatar_url ?? undefined} />
        <AvatarFallback>
          <User className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>
      <div className={cn("min-w-0", isRight && "text-right")}>
        <div
          className={cn(
            "flex items-center gap-2",
            isRight && "flex-row-reverse"
          )}
        >
          <span className="truncate text-sm font-medium sm:text-base">
            {displayName}
          </span>
          {stats && (
            <Badge variant="secondary" className="shrink-0 text-[10px]">
              {stats.wins}W-{stats.losses}L
            </Badge>
          )}
        </div>
        {showIGN && player.in_game_name && (
          <div
            className={cn(
              "mt-0.5 flex items-center gap-1",
              isRight && "flex-row-reverse"
            )}
          >
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
    <div className="flex flex-col items-center gap-1.5">
      {/* Score numbers */}
      <div className="flex items-center gap-3 sm:gap-5">
        <span
          className={cn(
            "text-4xl font-bold tabular-nums transition-colors duration-300 sm:text-5xl",
            opponentWins > myWins ? "text-primary" : "text-foreground"
          )}
        >
          {opponentWins}
        </span>
        <span className="text-muted-foreground text-xl sm:text-2xl">
          &ndash;
        </span>
        <span
          className={cn(
            "text-4xl font-bold tabular-nums transition-colors duration-300 sm:text-5xl",
            myWins > opponentWins ? "text-primary" : "text-foreground"
          )}
        >
          {myWins}
        </span>
      </div>

      {/* Score pips */}
      <div className="flex items-center gap-3">
        {/* Opponent pips (left) */}
        <div className="flex gap-1.5">
          {Array.from({ length: winsNeeded }, (_, i) => (
            <div
              key={`opp-${i}`}
              className={cn(
                "h-2 w-2 rounded-full transition-colors duration-300",
                i < opponentWins ? "bg-primary" : "bg-foreground/10"
              )}
            />
          ))}
        </div>
        <div className="text-muted-foreground text-xs">Bo{bestOf}</div>
        {/* My pips (right) */}
        <div className="flex gap-1.5">
          {Array.from({ length: winsNeeded }, (_, i) => (
            <div
              key={`my-${i}`}
              className={cn(
                "h-2 w-2 rounded-full transition-colors duration-300",
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
  isStaff = false,
}: MatchHeaderProps) {
  return (
    <Card>
      <CardContent className="p-4 sm:px-6 sm:py-4">
        {/* Metadata row */}
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {roundNumber !== null && (
              <span className="text-muted-foreground text-xs font-medium">
                Round {roundNumber}
              </span>
            )}
            {tableNumber !== null && (
              <span className="bg-muted text-foreground rounded-full px-2.5 py-0.5 text-xs font-medium">
                Table {tableNumber}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {staffRequested && (
              <Badge variant="destructive" className="gap-1">
                <ShieldAlert className="h-3 w-3" />
                Judge Requested
              </Badge>
            )}
            {isStaff && (
              <Badge
                variant="outline"
                className="gap-1 border-amber-500/25 bg-amber-500/15 text-amber-600 dark:text-amber-400"
              >
                <Gavel className="h-3 w-3" />
                Judge
              </Badge>
            )}
            <StatusBadge status={matchStatus as Status} />
          </div>
        </div>

        {/* Desktop: Players + Score horizontal — constrained to center */}
        <div className="mx-auto hidden max-w-2xl items-center justify-between gap-6 sm:flex">
          <PlayerCard
            player={opponent}
            stats={opponentStats}
            showIGN={true}
            align="left"
          />

          <SeriesScore
            myWins={myWins}
            opponentWins={opponentWins}
            bestOf={bestOf}
          />

          <PlayerCard
            player={myPlayer}
            stats={myStats}
            showIGN={false}
            align="right"
          />
        </div>

        {/* Mobile: Stacked layout */}
        <div className="flex flex-col items-center gap-3 sm:hidden">
          <PlayerCard
            player={opponent}
            stats={opponentStats}
            showIGN={true}
            align="left"
            className="w-full"
          />

          <SeriesScore
            myWins={myWins}
            opponentWins={opponentWins}
            bestOf={bestOf}
          />

          <PlayerCard
            player={myPlayer}
            stats={myStats}
            showIGN={false}
            align="right"
            className="w-full"
          />
        </div>
      </CardContent>
    </Card>
  );
}
