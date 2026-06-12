"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/lib/supabase";
import { useApiQuery } from "@trainers/supabase/react-query";
import {
  type TournamentPairingsData,
  type PhaseRoundsWithMatchesRow,
} from "@/lib/data/tournament-pairings-endpoint";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Gavel,
  Users,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  Circle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  RealtimeStatusBadge,
  type RealtimeStatus,
} from "./realtime-status-badge";

interface TournamentPairingsJudgeProps {
  tournament: {
    id: number;
    slug: string;
    currentPhaseId?: number | null;
  };
}

type MatchPlayer = {
  id: number;
  username: string;
  display_name: string | null;
} | null;

/**
 * Match shape from `allPhaseRounds` in the pairings API response.
 * Includes all `tournament_matches.*` fields plus limited alt joins.
 */
type MatchData = PhaseRoundsWithMatchesRow["matches"][number];

function getPlayerName(player: MatchPlayer, fallback: string): string {
  if (!player) return fallback;
  return player.display_name || player.username;
}

function MatchStatusDisplay({ match }: { match: MatchData }) {
  const p1 = match.player1 as MatchPlayer;
  const p2 = match.player2 as MatchPlayer;
  // allPhaseRounds matches do not include a `winner` join — fall back to game wins
  const status = match.status ?? "pending";

  if (match.is_bye) {
    return <span className="text-muted-foreground text-sm italic">BYE</span>;
  }

  if (status === "completed") {
    const g1 = match.game_wins1 ?? 0;
    const g2 = match.game_wins2 ?? 0;
    const score = `${g1}-${g2}`;
    const winnerName =
      g1 > g2 ? getPlayerName(p1, "P1") : getPlayerName(p2, "P2");
    return (
      <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
        <CheckCircle2 className="size-3.5 shrink-0" />
        <span>
          Won {score} ({winnerName})
        </span>
      </div>
    );
  }

  if (match.staff_requested) {
    return (
      <div className="flex items-center gap-1.5 text-sm font-medium text-red-600 dark:text-red-400">
        <AlertCircle className="size-3.5 shrink-0" />
        <span>Judge Call</span>
      </div>
    );
  }

  if (status === "active") {
    const g1 = match.game_wins1 ?? 0;
    const g2 = match.game_wins2 ?? 0;
    return (
      <div className="flex items-center gap-1.5 text-sm font-medium text-blue-600 dark:text-blue-400">
        <Circle className="size-2 shrink-0 fill-current" />
        <span className="font-mono font-bold tabular-nums">
          {g1}-{g2}
        </span>
      </div>
    );
  }

  // Pending status — check if players have checked in
  const p1Confirmed = match.player1_match_confirmed ?? false;
  const p2Confirmed = match.player2_match_confirmed ?? false;

  if (p1Confirmed && p2Confirmed) {
    return (
      <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
        <Circle className="size-2 shrink-0 fill-current" />
        <span>Ready</span>
      </div>
    );
  }

  if (!p1Confirmed && !p2Confirmed) {
    return (
      <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
        <Clock className="size-3.5 shrink-0 animate-pulse" />
        <span>Waiting for check-in</span>
      </div>
    );
  }

  const waitingFor = !p1Confirmed
    ? getPlayerName(p1, "P1")
    : getPlayerName(p2, "P2");

  return (
    <div className="flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400">
      <Clock className="size-3.5 shrink-0 animate-pulse" />
      <span>Waiting for {waitingFor}</span>
    </div>
  );
}

type MatchSection = "attention" | "active" | "completed";

function classifyMatch(match: MatchData): MatchSection {
  if (match.staff_requested) return "attention";
  if (match.status === "completed" || match.is_bye) return "completed";
  return "active";
}

const sectionConfig: Record<
  MatchSection,
  { label: string; borderColor: string }
> = {
  attention: {
    label: "Needs Attention",
    borderColor: "border-l-red-500",
  },
  active: {
    label: "Active",
    borderColor: "border-l-blue-500",
  },
  completed: {
    label: "Completed",
    borderColor: "border-l-muted-foreground/30",
  },
};

function MatchTable({
  matches,
  section,
  roundNumber,
  onNavigate,
}: {
  matches: MatchData[];
  section: MatchSection;
  roundNumber: number;
  onNavigate: (roundNumber: number, tableNumber: number) => void;
}) {
  const config = sectionConfig[section];

  if (matches.length === 0) return null;

  return (
    <div className={cn("rounded-lg border-l-4", config.borderColor)}>
      <div className="px-4 py-2">
        <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
          {config.label} ({matches.length})
        </span>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Table</TableHead>
            <TableHead>Player 1</TableHead>
            <TableHead>Player 2</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {matches.map((match) => {
            const p1 = match.player1 as MatchPlayer;
            const p2 = match.player2 as MatchPlayer;
            return (
              <TableRow
                key={match.id}
                className={cn(
                  "hover:bg-muted/50 cursor-pointer transition-colors",
                  match.staff_requested && "bg-red-50/50 dark:bg-red-950/20"
                )}
                onClick={() => onNavigate(roundNumber, match.table_number ?? 0)}
              >
                <TableCell className="font-mono tabular-nums">
                  {match.table_number ?? "—"}
                </TableCell>
                <TableCell className="font-medium">
                  {getPlayerName(p1, "BYE")}
                </TableCell>
                <TableCell className="font-medium">
                  {getPlayerName(p2, "BYE")}
                </TableCell>
                <TableCell>
                  <MatchStatusDisplay match={match} />
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigate(roundNumber, match.table_number ?? 0);
                    }}
                  >
                    <ExternalLink className="size-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

const UNINITIALIZED = Symbol();

export function TournamentPairingsJudge({
  tournament,
}: TournamentPairingsJudgeProps) {
  const router = useRouter();
  const supabase = useSupabase();
  const [activeTab, setActiveTab] = useState<"pairings" | "judge">("pairings");
  const [realtimeStatus, setRealtimeStatus] =
    useState<RealtimeStatus>("connected");
  const refreshTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const [selectedPhaseId, setSelectedPhaseId] = useState<number | null>(
    tournament.currentPhaseId ?? null
  );
  const [selectedRoundId, setSelectedRoundId] = useState<number | null>(null);

  // Fetch all pairings data via the auth-gated API route (S-bucket safe).
  // `staleTime: 0` so realtime-triggered refetches always get fresh data.
  const {
    data: pairings,
    refetch: refetchPairings,
  } = useApiQuery<TournamentPairingsData>(
    ["tournament", tournament.id, "pairings-judge"],
    () =>
      fetch(`/api/v1/tournaments/${tournament.id}/pairings`).then((r) =>
        r.json()
      ),
    { staleTime: 0 }
  );

  // Stable debounced refresh ref — avoids tearing down realtime channels
  // when the component re-renders. Calls refetchPairings after a short delay
  // so rapid realtime events coalesce into a single fetch.
  const triggerRefreshRef = useRef(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    refreshTimeoutRef.current = setTimeout(() => {
      void refetchPairings();
    }, 500);
  });

  const navigateToMatch = (roundNumber: number, tableNumber: number) => {
    router.push(
      `/tournaments/${tournament.slug}/r/${roundNumber}/t/${tableNumber}`
    );
  };

  // Derive data from pairings API response.
  const phases = pairings?.phases ?? null;

  // Find the index for the selected phase.
  const selectedPhaseIndex =
    phases && selectedPhaseId != null
      ? phases.findIndex((p) => p.id === selectedPhaseId)
      : -1;

  // Rounds for selected phase — from roundsWithStats (first phase) or allPhaseRounds.
  // roundsWithStats includes match-count stats; allPhaseRounds only has round metadata.
  const roundsForSelectedPhase =
    selectedPhaseIndex === 0
      ? (pairings?.roundsWithStats ?? [])
      : selectedPhaseIndex > 0
        ? (pairings?.allPhaseRounds[selectedPhaseIndex] ?? []).map((r) => ({
            id: r.id,
            round_number: r.round_number,
            status: r.status,
          }))
        : [];

  // Matches for selected round — from allPhaseRounds (includes all tournament_matches.* fields).
  const matchesForSelectedRound: MatchData[] =
    selectedPhaseIndex >= 0 && selectedRoundId != null
      ? ((pairings?.allPhaseRounds[selectedPhaseIndex] ?? []).find(
          (r) => r.id === selectedRoundId
        )?.matches ?? [])
      : [];

  // Initialize selectedPhaseId from phases — render-time adjustment
  const [prevPhases, setPrevPhases] = useState<typeof phases | symbol>(
    UNINITIALIZED
  );
  if (phases !== prevPhases) {
    setPrevPhases(phases);
    if (!selectedPhaseId && phases && phases.length > 0 && phases[0]) {
      setSelectedPhaseId(phases[0].id);
    }
  }

  // Auto-select active round, or latest round — render-time adjustment
  const [prevRounds, setPrevRounds] = useState<
    typeof roundsForSelectedPhase | symbol
  >(UNINITIALIZED);
  if (roundsForSelectedPhase !== prevRounds) {
    setPrevRounds(roundsForSelectedPhase);
    if (!roundsForSelectedPhase || roundsForSelectedPhase.length === 0) {
      setSelectedRoundId(null);
    } else if (
      selectedRoundId == null ||
      !roundsForSelectedPhase.some((r) => r.id === selectedRoundId)
    ) {
      const active = roundsForSelectedPhase.find((r) => r.status === "active");
      if (active) {
        setSelectedRoundId(active.id);
      } else {
        setSelectedRoundId(
          roundsForSelectedPhase[roundsForSelectedPhase.length - 1]!.id
        );
      }
    }
  }

  const activeRound = roundsForSelectedPhase?.find(
    (r) => r.status === "active"
  );
  const isViewingActiveRound =
    activeRound != null && selectedRoundId === activeRound.id;

  // Realtime: match updates for the selected round (only when viewing active round).
  // tournament_matches is NOT in the revoke set — anon SELECT is retained.
  useEffect(() => {
    if (!selectedRoundId || !isViewingActiveRound) return;

    const channel = supabase
      .channel(`pairings-matches-${selectedRoundId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tournament_matches",
          filter: `round_id=eq.${selectedRoundId}`,
        },
        () => {
          triggerRefreshRef.current();
        }
      )
      .subscribe((status, err) => {
        if (status === "SUBSCRIBED") {
          setRealtimeStatus("connected");
        } else if (status === "CLOSED") {
          setRealtimeStatus("disconnected");
        } else if (err) {
          console.error("[Realtime] pairings match error:", err);
          setRealtimeStatus("error");
        }
      });

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      channel.unsubscribe();
    };
  }, [supabase, selectedRoundId, isViewingActiveRound]);

  // Realtime: new round detection (INSERT/UPDATE on tournament_rounds).
  // tournament_matches is used as the change signal; rounds data comes from the API.
  useEffect(() => {
    if (!selectedPhaseId) return;

    const channel = supabase
      .channel(`pairings-rounds-${selectedPhaseId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tournament_rounds",
          filter: `phase_id=eq.${selectedPhaseId}`,
        },
        () => {
          triggerRefreshRef.current();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [supabase, selectedPhaseId]);

  // Categorize matches into sections
  const attentionMatches = matchesForSelectedRound.filter(
    (m) => classifyMatch(m) === "attention"
  );
  const activeMatches = matchesForSelectedRound.filter(
    (m) => classifyMatch(m) === "active"
  );
  const completedMatches = matchesForSelectedRound.filter(
    (m) => classifyMatch(m) === "completed"
  );

  // Judge queue: staff_requested matches
  const judgeQueue = matchesForSelectedRound.filter(
    (m) => m.staff_requested === true
  );

  const currentRound = roundsForSelectedPhase?.find(
    (r) => r.id === selectedRoundId
  );

  if (!phases || phases.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pairings</CardTitle>
          <CardDescription>
            No phases configured. Set up tournament phases before pairings can
            be generated.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with selectors */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Pairings & Matches</h2>
          <p className="text-muted-foreground">
            Manage pairings and judge requests
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {phases.length > 1 && (
            <Select
              value={selectedPhaseId?.toString() ?? ""}
              onValueChange={(value) => {
                if (value) {
                  setSelectedPhaseId(parseInt(value));
                  setSelectedRoundId(null);
                }
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Select phase" />
              </SelectTrigger>
              <SelectContent>
                {phases.map((phase) => (
                  <SelectItem key={phase.id} value={phase.id.toString()}>
                    {phase.name ?? `Phase ${phase.phase_order}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {roundsForSelectedPhase && roundsForSelectedPhase.length > 0 && (
            <Select
              value={selectedRoundId?.toString() ?? ""}
              onValueChange={(value) =>
                value && setSelectedRoundId(parseInt(value))
              }
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Round" />
              </SelectTrigger>
              <SelectContent>
                {roundsForSelectedPhase.map((round) => (
                  <SelectItem key={round.id} value={round.id.toString()}>
                    <span className="flex items-center gap-2">
                      Round {round.round_number}
                      {round.status === "active" && (
                        <Circle className="size-2 fill-emerald-500 text-emerald-500" />
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {isViewingActiveRound && (
            <RealtimeStatusBadge status={realtimeStatus} />
          )}
        </div>
      </div>

      {!currentRound ? (
        <Card>
          <CardHeader>
            <CardTitle>No Rounds</CardTitle>
            <CardDescription>
              Start the first round from the Overview tab.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as typeof activeTab)}
        >
          <TabsList>
            <TabsTrigger value="pairings">
              <Users className="mr-2 h-4 w-4" />
              Pairings
            </TabsTrigger>
            <TabsTrigger value="judge">
              <Gavel className="mr-2 h-4 w-4" />
              Judge Queue
              {judgeQueue.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {judgeQueue.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pairings">
            <Card>
              <CardHeader>
                <CardTitle>Round {currentRound.round_number} Matches</CardTitle>
                <CardDescription>
                  {matchesForSelectedRound.length} matches &middot;{" "}
                  {completedMatches.length} completed
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {matchesForSelectedRound.length === 0 ? (
                  <p className="text-muted-foreground py-8 text-center">
                    No matches found for this round.
                  </p>
                ) : (
                  <>
                    <MatchTable
                      matches={attentionMatches}
                      section="attention"
                      roundNumber={currentRound.round_number}
                      onNavigate={navigateToMatch}
                    />
                    <MatchTable
                      matches={activeMatches}
                      section="active"
                      roundNumber={currentRound.round_number}
                      onNavigate={navigateToMatch}
                    />
                    <MatchTable
                      matches={completedMatches}
                      section="completed"
                      roundNumber={currentRound.round_number}
                      onNavigate={navigateToMatch}
                    />
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="judge">
            <Card>
              <CardHeader>
                <CardTitle>Judge Queue</CardTitle>
                <CardDescription>
                  Matches requesting staff assistance
                </CardDescription>
              </CardHeader>
              <CardContent>
                {judgeQueue.length === 0 ? (
                  <p className="text-muted-foreground py-8 text-center">
                    No pending judge requests.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Table</TableHead>
                        <TableHead>Player 1</TableHead>
                        <TableHead>Player 2</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-24" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {judgeQueue.map((match) => {
                        const p1 = match.player1 as MatchPlayer;
                        const p2 = match.player2 as MatchPlayer;
                        return (
                          <TableRow
                            key={match.id}
                            className="cursor-pointer bg-red-50/50 transition-colors hover:bg-red-50 dark:bg-red-950/20 dark:hover:bg-red-950/30"
                            onClick={() =>
                              navigateToMatch(
                                currentRound.round_number,
                                match.table_number ?? 0
                              )
                            }
                          >
                            <TableCell className="font-mono tabular-nums">
                              {match.table_number ?? "—"}
                            </TableCell>
                            <TableCell className="font-medium">
                              {getPlayerName(p1, "BYE")}
                            </TableCell>
                            <TableCell className="font-medium">
                              {getPlayerName(p2, "BYE")}
                            </TableCell>
                            <TableCell>
                              <MatchStatusDisplay match={match} />
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigateToMatch(
                                    currentRound.round_number,
                                    match.table_number ?? 0
                                  );
                                }}
                              >
                                Respond
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
