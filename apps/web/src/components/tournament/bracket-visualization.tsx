"use client";

import { useMemo } from "react";
import type { Id } from "@trainers/backend/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { Trophy, ChevronRight, Users, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type {
  TournamentMatch,
  TournamentPhase,
} from "@/lib/types/tournament";

interface BracketVisualizationProps {
  phases: TournamentPhase[];
  _currentPhase?: Id<"tournamentPhases">;
  canManage?: boolean;
  onMatchClick?: (matchId: Id<"tournamentMatches">) => void;
}

export function BracketVisualization({
  phases,
  canManage = false,
  onMatchClick,
}: BracketVisualizationProps) {
  // Find the elimination bracket phase
  const eliminationPhase = useMemo(
    () =>
      phases.find(
        (p) =>
          p.format === "single_elimination" || p.format === "double_elimination"
      ),
    [phases]
  );

  const swissPhase = useMemo(
    () => phases.find((p) => p.format === "swiss"),
    [phases]
  );

  if (!eliminationPhase && !swissPhase) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Users className="text-muted-foreground mb-4 h-12 w-12" />
        <h3 className="mb-2 text-lg font-semibold">No Bracket Data</h3>
        <p className="text-muted-foreground text-center">
          Bracket will be generated once the tournament starts
        </p>
      </div>
    );
  }

  // For single elimination, create bracket tree structure
  if (eliminationPhase) {
    return (
      <SingleEliminationBracket
        phase={eliminationPhase}
        canManage={canManage}
        onMatchClick={onMatchClick}
      />
    );
  }

  // For Swiss, show round-robin style display
  if (swissPhase) {
    return (
      <SwissRoundsDisplay
        phase={swissPhase}
        canManage={canManage}
        onMatchClick={onMatchClick}
      />
    );
  }

  return null;
}

function SingleEliminationBracket({
  phase,
  canManage,
  onMatchClick,
}: {
  phase: TournamentPhase;
  canManage: boolean;
  onMatchClick?: (matchId: Id<"tournamentMatches">) => void;
}) {
  const rounds = phase.rounds || [];

  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-max gap-8 p-4">
        {rounds.map((round, roundIndex) => (
          <div key={round._id} className="flex flex-col gap-4">
            <div className="mb-2 text-center">
              <h3 className="font-semibold">{round.name}</h3>
              <Badge variant="outline" className="text-xs">
                {round.status === "completed"
                  ? "Completed"
                  : round.status === "active"
                    ? "In Progress"
                    : "Upcoming"}
              </Badge>
            </div>

            <div
              className={cn(
                "flex flex-col gap-4",
                // Space matches vertically based on round
                roundIndex > 0 && `mt-${Math.pow(2, roundIndex) * 2}`
              )}
              style={{
                gap: `${Math.pow(2, roundIndex) * 2}rem`,
              }}
            >
              {round.matches.map((match) => (
                <MatchCard
                  key={match._id}
                  match={match}
                  canManage={canManage}
                  onClick={() => onMatchClick?.(match._id)}
                  isFinals={roundIndex === rounds.length - 1}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SwissRoundsDisplay({
  phase,
  canManage,
  onMatchClick,
}: {
  phase: TournamentPhase;
  canManage: boolean;
  onMatchClick?: (matchId: Id<"tournamentMatches">) => void;
}) {
  return (
    <div className="space-y-6">
      {phase.rounds.map((round) => (
        <div key={round._id} className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{round.name}</h3>
            <Badge
              variant={
                round.status === "completed"
                  ? "default"
                  : round.status === "active"
                    ? "secondary"
                    : "outline"
              }
            >
              {round.status === "completed"
                ? "Completed"
                : round.status === "active"
                  ? "In Progress"
                  : "Upcoming"}
            </Badge>
          </div>

          <div className="grid gap-2">
            {round.matches.map((match) => (
              <SwissMatchCard
                key={match._id}
                match={match}
                canManage={canManage}
                onClick={() => onMatchClick?.(match._id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function MatchCard({
  match,
  canManage,
  onClick,
  isFinals = false,
}: {
  match: TournamentMatch;
  canManage: boolean;
  onClick?: () => void;
  isFinals?: boolean;
}) {
  const participant1Won = match.winnerProfileId === match.participant1?.id;
  const participant2Won = match.winnerProfileId === match.participant2?.id;

  return (
    <div
      className={cn(
        "bg-card hover:bg-muted/50 cursor-pointer rounded-lg border transition-colors",
        isFinals && "border-amber-500/50 shadow-lg"
      )}
      onClick={onClick}
    >
      {isFinals && (
        <div className="flex items-center justify-center gap-2 border-b bg-amber-500/10 px-3 py-1">
          <Trophy className="h-4 w-4 text-amber-600" />
          <span className="text-xs font-semibold text-amber-600">FINALS</span>
        </div>
      )}

      <div className="min-w-[200px] space-y-2 p-3">
        {/* Participant 1 */}
        <div
          className={cn(
            "flex items-center justify-between rounded p-2",
            participant1Won && "bg-green-500/10 font-semibold",
            match.status === "completed" && !participant1Won && "opacity-60"
          )}
        >
          <div className="flex items-center gap-2">
            {match.participant1?.seed && (
              <Badge variant="outline" className="text-xs">
                {match.participant1.seed}
              </Badge>
            )}
            <span className="text-sm">{match.participant1?.name || "TBD"}</span>
          </div>
          {match.status === "completed" && (
            <Badge variant={participant1Won ? "default" : "secondary"}>
              {match.gameWins1}
            </Badge>
          )}
        </div>

        {/* VS Divider */}
        <div className="text-muted-foreground text-center text-xs">VS</div>

        {/* Participant 2 */}
        <div
          className={cn(
            "flex items-center justify-between rounded p-2",
            participant2Won && "bg-green-500/10 font-semibold",
            match.status === "completed" && !participant2Won && "opacity-60"
          )}
        >
          <div className="flex items-center gap-2">
            {match.participant2?.seed && (
              <Badge variant="outline" className="text-xs">
                {match.participant2.seed}
              </Badge>
            )}
            <span className="text-sm">{match.participant2?.name || "TBD"}</span>
          </div>
          {match.status === "completed" && (
            <Badge variant={participant2Won ? "default" : "secondary"}>
              {match.gameWins2}
            </Badge>
          )}
        </div>

        {/* Match Status */}
        {match.status === "active" && (
          <div className="flex items-center justify-center gap-1 text-xs text-yellow-600">
            <Clock className="h-3 w-3" />
            In Progress
          </div>
        )}
      </div>

      {canManage && (
        <div className="flex items-center justify-center border-t px-3 py-2">
          <span className="text-muted-foreground text-xs">
            Table {match.matchNumber}
          </span>
          <ChevronRight className="ml-1 h-3 w-3" />
        </div>
      )}
    </div>
  );
}

function SwissMatchCard({
  match,
  canManage,
  onClick,
}: {
  match: TournamentMatch;
  canManage: boolean;
  onClick?: () => void;
}) {
  const participant1Won = match.winnerProfileId === match.participant1?.id;
  const participant2Won = match.winnerProfileId === match.participant2?.id;

  return (
    <div
      className="bg-card hover:bg-muted/50 cursor-pointer rounded-lg border p-3 transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex flex-1 items-center gap-4">
          <span className="text-muted-foreground text-sm font-medium">
            Table {match.matchNumber}
          </span>

          <div className="flex flex-1 items-center gap-2">
            {/* Participant 1 */}
            <div
              className={cn(
                "flex flex-1 items-center gap-2",
                participant1Won && "font-semibold"
              )}
            >
              {match.participant1?.seed && (
                <Badge variant="outline" className="text-xs">
                  {match.participant1.seed}
                </Badge>
              )}
              <span className="text-sm">
                {match.participant1?.name || "BYE"}
              </span>
              {match.status === "completed" && (
                <Badge
                  variant={participant1Won ? "default" : "secondary"}
                  className="ml-auto"
                >
                  {match.gameWins1}
                </Badge>
              )}
            </div>

            <span className="text-muted-foreground">vs</span>

            {/* Participant 2 */}
            <div
              className={cn(
                "flex flex-1 items-center gap-2",
                participant2Won && "font-semibold"
              )}
            >
              {match.participant2?.seed && (
                <Badge variant="outline" className="text-xs">
                  {match.participant2.seed}
                </Badge>
              )}
              <span className="text-sm">
                {match.participant2?.name || "BYE"}
              </span>
              {match.status === "completed" && (
                <Badge
                  variant={participant2Won ? "default" : "secondary"}
                  className="ml-auto"
                >
                  {match.gameWins2}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {match.status === "completed" && (
            <Badge variant="outline" className="text-green-600">
              Completed
            </Badge>
          )}
          {match.status === "active" && (
            <Badge variant="outline" className="text-yellow-600">
              <Clock className="mr-1 h-3 w-3" />
              In Progress
            </Badge>
          )}
          {match.status === "pending" && (
            <Badge variant="outline" className="text-gray-600">
              Pending
            </Badge>
          )}

          {canManage && (
            <ChevronRight className="text-muted-foreground h-4 w-4" />
          )}
        </div>
      </div>
    </div>
  );
}
