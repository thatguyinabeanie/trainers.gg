"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Trophy, ChevronRight, Users, Minus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  TournamentMatch,
  TournamentPhase,
  TournamentRound,
} from "@/lib/types/tournament";

interface BracketVisualizationProps {
  phases: TournamentPhase[];
  _currentPhase?: string;
  canManage?: boolean;
  onMatchClick?: (matchId: string) => void;
}

export function BracketVisualization({
  phases,
  canManage = false,
  onMatchClick,
}: BracketVisualizationProps) {
  const eliminationPhase = phases.find(
    (p) =>
      p.format === "single_elimination" || p.format === "double_elimination"
  );

  const swissPhase = phases.find((p) => p.format === "swiss");

  if (!eliminationPhase && !swissPhase) {
    return (
      <EmptyBracket message="Bracket will be generated once the tournament starts" />
    );
  }

  if (eliminationPhase) {
    return (
      <EliminationDisplay
        phase={eliminationPhase}
        canManage={canManage}
        onMatchClick={onMatchClick}
      />
    );
  }

  if (swissPhase) {
    return (
      <SwissDisplay
        phase={swissPhase}
        canManage={canManage}
        onMatchClick={onMatchClick}
      />
    );
  }

  return null;
}

// ============================================================================
// Shared helpers
// ============================================================================

/**
 * Pick the best default round: active > latest completed > first.
 */
function getDefaultRound(rounds: TournamentRound[]): string {
  const active = rounds.find((r) => r.status === "active");
  if (active) return active.id;

  const completed = [...rounds]
    .filter((r) => r.status === "completed")
    .sort((a, b) => b.roundNumber - a.roundNumber);
  if (completed[0]) return completed[0].id;

  return rounds[0]?.id ?? "";
}

function EmptyBracket({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="bg-muted mb-4 flex h-14 w-14 items-center justify-center rounded-full">
        <Users className="text-muted-foreground h-7 w-7" />
      </div>
      <p className="text-muted-foreground text-sm">{message}</p>
    </div>
  );
}

// ============================================================================
// Match sections — separates ongoing from completed matches
// ============================================================================

function MatchSections({
  matches,
  renderMatch,
  layout,
}: {
  matches: TournamentMatch[];
  renderMatch: (match: TournamentMatch) => ReactNode;
  layout: "list" | "grid";
}) {
  const ongoing = matches.filter((m) => m.status !== "completed");
  const completed = matches.filter((m) => m.status === "completed");

  // If all matches are in one category, skip the section headers
  if (ongoing.length === 0 || completed.length === 0) {
    return (
      <div
        className={cn(
          layout === "list" ? "space-y-1.5" : "grid gap-3 sm:grid-cols-2"
        )}
      >
        {matches.map((match) => renderMatch(match))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Ongoing matches */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="bg-primary absolute inline-flex h-full w-full animate-ping rounded-full opacity-50" />
            <span className="bg-primary relative inline-flex h-full w-full rounded-full" />
          </span>
          <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            In Progress ({ongoing.length})
          </h3>
        </div>
        <div
          className={cn(
            layout === "list" ? "space-y-1.5" : "grid gap-3 sm:grid-cols-2"
          )}
        >
          {ongoing.map((match) => renderMatch(match))}
        </div>
      </div>

      {/* Completed matches */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Completed ({completed.length})
          </h3>
        </div>
        <div
          className={cn(
            layout === "list" ? "space-y-1.5" : "grid gap-3 sm:grid-cols-2"
          )}
        >
          {completed.map((match) => renderMatch(match))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Round stepper tabs — shows progression through rounds
// ============================================================================

function RoundTabs({
  rounds,
  defaultRound,
  renderRoundLabel,
  children,
}: {
  rounds: TournamentRound[];
  defaultRound: string;
  renderRoundLabel?: (round: TournamentRound, index: number) => string;
  children: ReactNode;
}) {
  return (
    <Tabs defaultValue={defaultRound} className="w-full">
      <div className="mb-5">
        <TabsList variant="line" className="w-full gap-0">
          {rounds.map((round, index) => (
            <TabsTrigger
              key={round.id}
              value={round.id}
              className="group/round relative flex items-center gap-2 px-3 py-2"
            >
              {/* Status indicator dot */}
              <span
                className={cn(
                  "relative flex h-2 w-2 shrink-0",
                  round.status === "active" && "h-2.5 w-2.5"
                )}
              >
                {/* Ping animation for active round */}
                {round.status === "active" && (
                  <span className="bg-primary absolute inline-flex h-full w-full animate-ping rounded-full opacity-50" />
                )}
                <span
                  className={cn(
                    "relative inline-flex h-full w-full rounded-full",
                    round.status === "completed" && "bg-emerald-500",
                    round.status === "active" && "bg-primary",
                    round.status === "pending" && "bg-muted-foreground/30"
                  )}
                />
              </span>

              {/* Round label */}
              <span className="text-sm">
                {renderRoundLabel ? renderRoundLabel(round, index) : round.name}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      {children}
    </Tabs>
  );
}

// ============================================================================
// Swiss rounds display
// ============================================================================

function SwissDisplay({
  phase,
  canManage: _canManage,
  onMatchClick,
}: {
  phase: TournamentPhase;
  canManage: boolean;
  onMatchClick?: (matchId: string) => void;
}) {
  const rounds = phase.rounds;

  if (rounds.length === 0) {
    return (
      <EmptyBracket message="Rounds will appear once pairings are generated." />
    );
  }

  return (
    <RoundTabs rounds={rounds} defaultRound={getDefaultRound(rounds)}>
      {rounds.map((round) => (
        <TabsContent key={round.id} value={round.id}>
          {/* Round summary bar */}
          <RoundSummaryBar round={round} />

          {/* Match list */}
          {round.matches.length === 0 ? (
            <EmptyBracket message="Pairings haven't been generated for this round yet." />
          ) : (
            <MatchSections
              matches={round.matches}
              renderMatch={(match) => (
                <SwissMatchRow
                  key={match.id}
                  match={match}
                  onClick={() => onMatchClick?.(match.id)}
                />
              )}
              layout="list"
            />
          )}
        </TabsContent>
      ))}
    </RoundTabs>
  );
}

function RoundSummaryBar({ round }: { round: TournamentRound }) {
  const total = round.matches.length;
  const completed = round.matches.filter(
    (m) => m.status === "completed"
  ).length;
  const active = round.matches.filter((m) => m.status === "active").length;

  return (
    <div className="mb-4 flex items-center gap-3">
      <div className="text-muted-foreground flex items-center gap-4 text-xs">
        <span>{total} matches</span>
        {round.status === "active" && completed > 0 && (
          <>
            <span className="bg-border h-3 w-px" />
            <span className="text-emerald-600 dark:text-emerald-400">
              {completed} done
            </span>
          </>
        )}
        {round.status === "active" && active > 0 && (
          <>
            <span className="bg-border h-3 w-px" />
            <span className="text-primary">{active} live</span>
          </>
        )}
      </div>

      {/* Progress bar for active rounds */}
      {round.status === "active" && total > 0 && (
        <div className="bg-muted ml-auto h-1 w-24 overflow-hidden rounded-full">
          <div
            className="bg-primary h-full rounded-full transition-all duration-500"
            style={{ width: `${(completed / total) * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Swiss match row — horizontal layout inspired by Limitless TCG.
 * Table # | Player 1 | Score | Player 2 | →
 */
function SwissMatchRow({
  match,
  onClick,
}: {
  match: TournamentMatch;
  onClick?: () => void;
}) {
  const p1Won = match.winnerProfileId === match.participant1?.id;
  const p2Won = match.winnerProfileId === match.participant2?.id;
  const isCompleted = match.status === "completed";
  const isActive = match.status === "active";
  const isBye = match.isBye || !match.participant2;

  return (
    <div
      className={cn(
        "group/match flex cursor-pointer items-center rounded-lg border px-3 py-2.5 transition-all",
        "hover:border-border hover:bg-muted/40",
        isActive && "border-primary/20 bg-primary/[0.03]",
        !isActive && "border-transparent"
      )}
      onClick={onClick}
    >
      {/* Table number */}
      <div className="text-muted-foreground/50 w-8 shrink-0 text-center text-[11px] font-medium">
        {isBye ? (
          <span className="text-[10px] tracking-wider uppercase">bye</span>
        ) : (
          match.matchNumber || <Minus className="mx-auto h-3 w-3 opacity-50" />
        )}
      </div>

      {/* Player 1 name — right-aligned */}
      <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5">
        {isCompleted && p1Won && (
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
        )}
        <span
          className={cn(
            "truncate text-sm",
            p1Won && "font-semibold",
            isCompleted && !p1Won && "text-muted-foreground"
          )}
        >
          {match.participant1?.name || "TBD"}
        </span>
      </div>

      {/* Center score / vs */}
      <div className="mx-3 flex shrink-0 items-center justify-center">
        {isCompleted || isActive ? (
          <div className="flex items-center gap-0.5 font-mono text-sm tabular-nums">
            <span
              className={cn(p1Won ? "font-semibold" : "text-muted-foreground")}
            >
              {match.gameWins1}
            </span>
            <span className="text-muted-foreground/40 mx-1">-</span>
            <span
              className={cn(p2Won ? "font-semibold" : "text-muted-foreground")}
            >
              {match.gameWins2}
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground/30 text-xs">vs</span>
        )}
      </div>

      {/* Player 2 name — left-aligned */}
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <span
          className={cn(
            "truncate text-sm",
            p2Won && "font-semibold",
            isCompleted && !p2Won && "text-muted-foreground",
            isBye && "text-muted-foreground italic"
          )}
        >
          {isBye ? "BYE" : match.participant2?.name || "TBD"}
        </span>
        {isCompleted && p2Won && (
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
        )}
      </div>

      {/* Arrow on hover */}
      <ChevronRight className="text-muted-foreground/0 group-hover/match:text-muted-foreground/60 ml-2 h-4 w-4 shrink-0 transition-colors" />
    </div>
  );
}

// ============================================================================
// Elimination display
// ============================================================================

function EliminationDisplay({
  phase,
  canManage: _canManage,
  onMatchClick,
}: {
  phase: TournamentPhase;
  canManage: boolean;
  onMatchClick?: (matchId: string) => void;
}) {
  const rounds = phase.rounds || [];

  if (rounds.length === 0) {
    return (
      <EmptyBracket message="Bracket will appear once pairings are generated." />
    );
  }

  return (
    <RoundTabs
      rounds={rounds}
      defaultRound={getDefaultRound(rounds)}
      renderRoundLabel={(round, index) =>
        index === rounds.length - 1 && rounds.length > 1 ? "Finals" : round.name
      }
    >
      {rounds.map((round, roundIndex) => (
        <TabsContent key={round.id} value={round.id}>
          <RoundSummaryBar round={round} />

          {round.matches.length === 0 ? (
            <EmptyBracket message="Pairings haven't been generated for this round yet." />
          ) : (
            <MatchSections
              matches={round.matches}
              renderMatch={(match) => (
                <EliminationMatchCard
                  key={match.id}
                  match={match}
                  onClick={() => onMatchClick?.(match.id)}
                  isFinals={roundIndex === rounds.length - 1}
                />
              )}
              layout="grid"
            />
          )}
        </TabsContent>
      ))}
    </RoundTabs>
  );
}

/**
 * Elimination match card — bracket-slot style with two player rows,
 * score centered, winner highlighted with teal accent bar.
 */
function EliminationMatchCard({
  match,
  onClick,
  isFinals = false,
}: {
  match: TournamentMatch;
  onClick?: () => void;
  isFinals?: boolean;
}) {
  const p1Won = match.winnerProfileId === match.participant1?.id;
  const p2Won = match.winnerProfileId === match.participant2?.id;
  const isCompleted = match.status === "completed";
  const isActive = match.status === "active";

  return (
    <div
      className={cn(
        "group/match ring-foreground/10 cursor-pointer overflow-hidden rounded-xl ring-1 transition-all",
        "hover:ring-foreground/20 hover:shadow-sm",
        isFinals && "ring-amber-500/30 dark:ring-amber-400/20",
        isActive && "ring-primary/30"
      )}
      onClick={onClick}
    >
      {/* Finals banner */}
      {isFinals && (
        <div className="flex items-center justify-center gap-1.5 bg-amber-500/10 py-1 dark:bg-amber-500/5">
          <Trophy className="h-3 w-3 text-amber-600 dark:text-amber-400" />
          <span className="text-[10px] font-semibold tracking-widest text-amber-600 uppercase dark:text-amber-400">
            Finals
          </span>
        </div>
      )}

      {/* Player 1 slot */}
      <PlayerSlot
        participant={match.participant1}
        score={match.gameWins1}
        isWinner={p1Won}
        isCompleted={isCompleted}
        isActive={isActive}
        position="top"
      />

      {/* Divider */}
      <div className="bg-border/50 h-px" />

      {/* Player 2 slot */}
      <PlayerSlot
        participant={match.participant2}
        score={match.gameWins2}
        isWinner={p2Won}
        isCompleted={isCompleted}
        isActive={isActive}
        position="bottom"
        isBye={match.isBye}
      />

      {/* Footer with table number */}
      <div
        className={cn(
          "text-muted-foreground/50 flex items-center justify-between border-t px-3 py-1.5",
          "border-foreground/5 bg-muted/30"
        )}
      >
        <span className="text-[11px]">
          {match.isBye ? "BYE" : `Table ${match.matchNumber || "-"}`}
        </span>
        <ChevronRight className="h-3 w-3 opacity-0 transition-opacity group-hover/match:opacity-100" />
      </div>
    </div>
  );
}

function PlayerSlot({
  participant,
  score,
  isWinner,
  isCompleted,
  isActive = false,
  position,
  isBye = false,
}: {
  participant?: TournamentMatch["participant1"];
  score: number;
  isWinner: boolean;
  isCompleted: boolean;
  isActive?: boolean;
  position: "top" | "bottom";
  isBye?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative flex items-center gap-2 px-3 py-2.5",
        isWinner && "bg-emerald-500/[0.06]",
        isCompleted && !isWinner && "opacity-50",
        position === "top" && !isBye && "rounded-t-xl",
        position === "bottom" && "rounded-b-xl"
      )}
    >
      {/* Winner accent bar */}
      {isWinner && (
        <div className="absolute inset-y-0 left-0 w-0.5 rounded-full bg-emerald-500" />
      )}

      {/* Seed badge */}
      {participant?.seed && (
        <span className="text-muted-foreground text-[11px] tabular-nums">
          {participant.seed}
        </span>
      )}

      {/* Player name */}
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-sm",
          isWinner && "font-semibold",
          isBye && "text-muted-foreground italic",
          !participant && "text-muted-foreground"
        )}
      >
        {isBye ? "BYE" : participant?.name || "TBD"}
      </span>

      {/* Score */}
      {(isCompleted || isActive) && (
        <span
          className={cn(
            "font-mono text-sm tabular-nums",
            isWinner ? "font-semibold" : "text-muted-foreground"
          )}
        >
          {score}
        </span>
      )}
    </div>
  );
}
