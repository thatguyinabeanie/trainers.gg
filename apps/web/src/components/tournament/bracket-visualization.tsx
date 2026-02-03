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
  canManage?: boolean;
  onMatchClick?: (matchId: string) => void;
  /** When provided, only matches where this returns true are clickable */
  canClickMatch?: (match: TournamentMatch) => boolean;
}

const TOP_CUT_TAB_ID = "__top_cut__";

/**
 * Unified bracket view — all Swiss rounds as numbered tabs,
 * with Top Cut as a final tab (Limitless-style).
 */
export function BracketVisualization({
  phases,
  canManage: _canManage = false,
  onMatchClick,
  canClickMatch,
}: BracketVisualizationProps) {
  const swissPhase = phases.find((p) => p.format === "swiss");
  const eliminationPhase = phases.find(
    (p) =>
      p.format === "single_elimination" || p.format === "double_elimination"
  );

  const swissRounds = swissPhase?.rounds ?? [];
  const elimRounds = eliminationPhase?.rounds ?? [];
  const hasTopCut = elimRounds.length > 0;

  if (swissRounds.length === 0 && !hasTopCut) {
    return (
      <EmptyBracket message="Bracket will be generated once the tournament starts" />
    );
  }

  // Pick the default tab: active Swiss round > latest completed Swiss > Top Cut if active > first
  const activeSwiss = swissRounds.find((r) => r.status === "active");
  const latestCompletedSwiss = [...swissRounds]
    .filter((r) => r.status === "completed")
    .sort((a, b) => b.roundNumber - a.roundNumber)[0];
  const topCutActive = elimRounds.some((r) => r.status === "active");

  let defaultTab: string;
  if (activeSwiss) {
    defaultTab = activeSwiss.id;
  } else if (topCutActive && hasTopCut) {
    defaultTab = TOP_CUT_TAB_ID;
  } else if (latestCompletedSwiss) {
    defaultTab = latestCompletedSwiss.id;
  } else if (swissRounds[0]) {
    defaultTab = swissRounds[0].id;
  } else {
    defaultTab = TOP_CUT_TAB_ID;
  }

  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <div className="mb-5">
        <TabsList variant="line" className="w-full gap-0">
          {/* Swiss round tabs: numbered 1, 2, 3, ... */}
          {swissRounds.map((round) => (
            <TabsTrigger
              key={round.id}
              value={round.id}
              className="group/round relative flex items-center gap-2 px-3 py-2"
            >
              <RoundStatusDot status={round.status} />
              <span className="text-sm">{round.roundNumber}</span>
            </TabsTrigger>
          ))}

          {/* Top Cut tab */}
          {hasTopCut && (
            <TabsTrigger
              value={TOP_CUT_TAB_ID}
              className="group/round relative flex items-center gap-2 px-3 py-2"
            >
              <RoundStatusDot
                status={
                  elimRounds.some((r) => r.status === "active")
                    ? "active"
                    : elimRounds.every((r) => r.status === "completed")
                      ? "completed"
                      : "pending"
                }
              />
              <span className="text-sm">Top Cut</span>
            </TabsTrigger>
          )}
        </TabsList>
      </div>

      {/* Swiss round contents */}
      {swissRounds.map((round) => (
        <TabsContent key={round.id} value={round.id}>
          <RoundSummaryBar round={round} />
          {round.matches.length === 0 ? (
            <EmptyBracket message="Pairings haven't been generated for this round yet." />
          ) : (
            <MatchSections
              matches={round.matches}
              renderMatch={(match, index) => {
                const clickable = !canClickMatch || canClickMatch(match);
                return (
                  <SwissMatchRow
                    key={match.id}
                    match={match}
                    index={index}
                    onClick={
                      clickable ? () => onMatchClick?.(match.id) : undefined
                    }
                  />
                );
              }}
              layout="list"
            />
          )}
        </TabsContent>
      ))}

      {/* Top Cut content — all elimination rounds shown together */}
      {hasTopCut && (
        <TabsContent value={TOP_CUT_TAB_ID}>
          <TopCutDisplay
            rounds={elimRounds}
            totalRounds={elimRounds.length}
            onMatchClick={onMatchClick}
            canClickMatch={canClickMatch}
          />
        </TabsContent>
      )}
    </Tabs>
  );
}

/**
 * Status dot used in round tabs.
 */
function RoundStatusDot({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "relative flex shrink-0",
        status === "active" ? "h-2.5 w-2.5" : "h-2 w-2"
      )}
    >
      {status === "active" && (
        <span className="bg-primary absolute inline-flex h-full w-full animate-ping rounded-full opacity-50" />
      )}
      <span
        className={cn(
          "relative inline-flex h-full w-full rounded-full",
          status === "completed" && "bg-emerald-500",
          status === "active" && "bg-primary",
          status === "pending" && "bg-muted-foreground/30"
        )}
      />
    </span>
  );
}

/**
 * Top Cut display — shows all elimination rounds stacked vertically.
 */
function TopCutDisplay({
  rounds,
  totalRounds,
  onMatchClick,
  canClickMatch,
}: {
  rounds: TournamentRound[];
  totalRounds: number;
  onMatchClick?: (matchId: string) => void;
  canClickMatch?: (match: TournamentMatch) => boolean;
}) {
  if (rounds.length === 0) {
    return (
      <EmptyBracket message="Top Cut bracket will appear once it begins." />
    );
  }

  return (
    <div className="space-y-8">
      {rounds.map((round, index) => {
        const isFinals = index === totalRounds - 1 && totalRounds > 1;
        const roundLabel = isFinals ? "Finals" : round.name;

        return (
          <div key={round.id}>
            <div className="mb-3 flex items-center gap-2">
              <RoundStatusDot status={round.status} />
              <h3 className="text-sm font-semibold">{roundLabel}</h3>
            </div>
            <RoundSummaryBar round={round} />
            {round.matches.length === 0 ? (
              <EmptyBracket message="Pairings haven't been generated for this round yet." />
            ) : (
              <MatchSections
                matches={round.matches}
                renderMatch={(match, _index) => {
                  const clickable = !canClickMatch || canClickMatch(match);
                  return (
                    <EliminationMatchCard
                      key={match.id}
                      match={match}
                      onClick={
                        clickable ? () => onMatchClick?.(match.id) : undefined
                      }
                      isFinals={isFinals}
                    />
                  );
                }}
                layout="grid"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Shared helpers
// ============================================================================

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
  renderMatch: (match: TournamentMatch, index: number) => ReactNode;
  layout: "list" | "grid";
}) {
  const ongoing = matches.filter((m) => m.status !== "completed");
  const completed = matches.filter((m) => m.status === "completed");

  // Wrap list-layout matches in a shared card container with dividers
  const wrapMatches = (items: TournamentMatch[], isLive = false) =>
    layout === "list" ? (
      <div
        className={cn(
          "bg-card overflow-hidden rounded-xl ring-1",
          isLive ? "ring-primary/20" : "ring-foreground/10"
        )}
      >
        {items.map((match, i) => renderMatch(match, i))}
      </div>
    ) : (
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((match, i) => renderMatch(match, i))}
      </div>
    );

  // If all matches are in one category, skip the section headers
  if (ongoing.length === 0 || completed.length === 0) {
    return wrapMatches(matches);
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
          <h3 className="text-primary text-xs font-medium tracking-wide uppercase">
            In Progress ({ongoing.length})
          </h3>
        </div>
        {wrapMatches(ongoing, true)}
      </div>

      {/* Completed matches */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Completed ({completed.length})
          </h3>
        </div>
        {wrapMatches(completed)}
      </div>
    </div>
  );
}

// ============================================================================
// Swiss rounds display
// ============================================================================

function RoundSummaryBar({ round }: { round: TournamentRound }) {
  const total = round.matches.length;
  const completed = round.matches.filter(
    (m) => m.status === "completed"
  ).length;
  const active = round.matches.filter((m) => m.status === "active").length;
  const pending = total - completed - active;

  return (
    <div className="mb-4 flex items-center gap-3">
      <div className="text-muted-foreground flex items-center gap-2 text-xs">
        <span className="tabular-nums">{total} matches</span>
        {round.status === "active" && (
          <>
            <span className="text-muted-foreground/30">·</span>
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {completed}
            </span>
            <span className="text-primary inline-flex items-center gap-1">
              <span className="relative flex h-1.5 w-1.5">
                <span className="bg-primary absolute inline-flex h-full w-full animate-ping rounded-full opacity-40" />
                <span className="bg-primary relative inline-flex h-full w-full rounded-full" />
              </span>
              {active}
            </span>
            {pending > 0 && (
              <span className="text-muted-foreground/50 tabular-nums">
                {pending}
              </span>
            )}
          </>
        )}
      </div>

      {/* Segmented progress bar for active rounds */}
      {round.status === "active" && total > 0 && (
        <div className="bg-muted ml-auto flex h-1.5 w-28 overflow-hidden rounded-full">
          <div
            className="rounded-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${(completed / total) * 100}%` }}
          />
          <div
            className="bg-primary transition-all duration-500"
            style={{ width: `${(active / total) * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Swiss match row — table row inside a shared card container.
 * Table # | Player 1 (W-L) | Score | (W-L) Player 2 | →
 */
function SwissMatchRow({
  match,
  onClick,
  index = 0,
}: {
  match: TournamentMatch;
  onClick?: () => void;
  index?: number;
}) {
  const p1Won = match.winnerProfileId === match.participant1?.id;
  const p2Won = match.winnerProfileId === match.participant2?.id;
  const isCompleted = match.status === "completed";
  const isActive = match.status === "active";
  const isBye = match.isBye || !match.participant2;

  return (
    <div
      className={cn(
        "group/match flex items-center border-l-2 px-4 py-3 transition-colors",
        onClick
          ? "hover:bg-primary/[0.04] cursor-pointer"
          : "border-l-transparent opacity-60",
        onClick && (isActive ? "border-l-primary" : "border-l-primary/30"),
        isActive && onClick && "bg-primary/[0.06]",
        !isActive && index % 2 === 1 && "bg-muted/30"
      )}
      onClick={onClick}
    >
      {/* Table number badge */}
      <div className="w-10 shrink-0 text-center">
        {isBye ? (
          <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
            bye
          </span>
        ) : (
          <span
            className={cn(
              "inline-flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-medium tabular-nums",
              isActive && onClick
                ? "bg-primary/15 text-primary"
                : "bg-muted text-muted-foreground"
            )}
          >
            {match.matchNumber || <Minus className="h-3 w-3 opacity-50" />}
          </span>
        )}
      </div>

      {/* Player 1 name — centered */}
      <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5">
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
        {match.participant1?.record &&
          match.participant1.record.wins + match.participant1.record.losses >
            0 && (
            <span className="text-muted-foreground/50 shrink-0 text-[11px] tabular-nums">
              {match.participant1.record.wins}-
              {match.participant1.record.losses}
            </span>
          )}
      </div>

      {/* Center score / vs */}
      <div className="mx-3 flex w-14 shrink-0 items-center justify-center sm:mx-4">
        {isCompleted || isActive ? (
          <div className="flex items-center gap-1 font-mono text-sm font-medium tabular-nums">
            <span
              className={cn(
                p1Won
                  ? "text-foreground"
                  : isActive
                    ? "text-primary"
                    : "text-muted-foreground"
              )}
            >
              {match.gameWins1}
            </span>
            <span className="text-muted-foreground/30">–</span>
            <span
              className={cn(
                p2Won
                  ? "text-foreground"
                  : isActive
                    ? "text-primary"
                    : "text-muted-foreground"
              )}
            >
              {match.gameWins2}
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground/30 text-xs font-medium">
            vs
          </span>
        )}
      </div>

      {/* Player 2 name — centered */}
      <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5">
        {match.participant2?.record &&
          match.participant2.record.wins + match.participant2.record.losses >
            0 && (
            <span className="text-muted-foreground/50 shrink-0 text-[11px] tabular-nums">
              {match.participant2.record.wins}-
              {match.participant2.record.losses}
            </span>
          )}
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

      {/* Arrow on hover — only for clickable rows, same width for all */}
      <div className="flex w-8 shrink-0 items-center justify-center">
        {onClick && (
          <ChevronRight className="text-primary/0 group-hover/match:text-primary/60 h-4 w-4 transition-colors" />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Elimination match cards
// ============================================================================

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
        "group/match ring-foreground/10 overflow-hidden rounded-xl ring-1 transition-all",
        onClick
          ? "hover:ring-primary/30 cursor-pointer hover:shadow-sm"
          : "opacity-75",
        isFinals && "ring-amber-500/30 dark:ring-amber-400/20",
        isActive && onClick && "ring-primary/40",
        isActive && !onClick && "ring-foreground/10"
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
        {onClick && (
          <ChevronRight className="text-primary h-3 w-3 opacity-0 transition-opacity group-hover/match:opacity-100" />
        )}
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
        "relative flex items-center gap-2 px-4 py-3",
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

      {/* Record (hidden when 0-0) */}
      {participant?.record &&
        participant.record.wins + participant.record.losses > 0 && (
          <span className="text-muted-foreground shrink-0 text-xs">
            ({participant.record.wins}-{participant.record.losses})
          </span>
        )}

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
