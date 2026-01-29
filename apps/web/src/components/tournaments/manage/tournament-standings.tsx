"use client";

import { useSupabaseQuery } from "@/lib/supabase";
import { getTournamentPlayerStats } from "@trainers/supabase";
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
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Medal, Award, Loader2 } from "lucide-react";

interface TournamentStandingsProps {
  tournament: {
    id: number;
    status: string;
  };
}

export function TournamentStandings({ tournament }: TournamentStandingsProps) {
  // Fetch player stats for standings
  const queryFn = (supabase: Parameters<typeof getTournamentPlayerStats>[0]) =>
    getTournamentPlayerStats(supabase, tournament.id, {
      includeDropped: true,
    });

  const { data: playerStats, isLoading } = useSupabaseQuery(queryFn, [
    tournament.id,
  ]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-4 w-4 text-yellow-500" />;
      case 2:
        return <Medal className="h-4 w-4 text-gray-400" />;
      case 3:
        return <Award className="h-4 w-4 text-amber-600" />;
      default:
        return null;
    }
  };

  const getRankBadge = (rank: number, isDropped: boolean) => {
    if (isDropped) {
      return (
        <Badge variant="outline" className="text-muted-foreground">
          Dropped
        </Badge>
      );
    }
    if (rank <= 3) {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          {getRankIcon(rank)}#{rank}
        </Badge>
      );
    }
    return <Badge variant="outline">#{rank}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Transform data for display
  const standings = (playerStats ?? []).map((player) => ({
    rank: player.current_standing ?? 999,
    player: {
      name: player.alt?.display_name ?? player.alt?.username ?? "Unknown",
      username: player.alt?.username ?? "unknown",
      avatar: player.alt?.avatar_url ?? null,
    },
    record: {
      wins: player.match_wins ?? 0,
      losses: player.match_losses ?? 0,
    },
    matchPoints: player.match_points ?? 0,
    gameWinPercentage: player.game_win_percentage
      ? Number(player.game_win_percentage)
      : 0,
    opponentWinPercentage: player.opponent_match_win_percentage
      ? Number(player.opponent_match_win_percentage)
      : 0,
    isDropped: player.is_dropped ?? false,
  }));

  // Sort by rank, with dropped players at the end
  standings.sort((a, b) => {
    if (a.isDropped && !b.isDropped) return 1;
    if (!a.isDropped && b.isDropped) return -1;
    return a.rank - b.rank;
  });

  const activeStandings = standings.filter((s) => !s.isDropped);
  const top3 = activeStandings.slice(0, 3);

  if (standings.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Standings</h2>
          <p className="text-muted-foreground">
            Current tournament standings and player statistics
          </p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Trophy className="text-muted-foreground mb-4 h-12 w-12 opacity-50" />
            <h3 className="mb-2 text-lg font-semibold">No standings yet</h3>
            <p className="text-muted-foreground text-sm">
              Standings will appear once matches have been played.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Standings</h2>
        <p className="text-muted-foreground">
          Current tournament standings and player statistics
        </p>
      </div>

      {/* Top 3 Highlight */}
      {top3.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          {top3.map((player, index) => (
            <Card
              key={player.player.username}
              className={index === 0 ? "border-yellow-200 bg-yellow-50" : ""}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getRankIcon(player.rank)}
                    <span className="font-semibold">#{player.rank}</span>
                  </div>
                  <Badge variant={index === 0 ? "default" : "secondary"}>
                    {player.record.wins}-{player.record.losses}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={player.player.avatar || undefined} />
                    <AvatarFallback>
                      {player.player.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{player.player.name}</div>
                    <div className="text-muted-foreground text-sm">
                      @{player.player.username}
                    </div>
                  </div>
                </div>
                <div className="mt-3 text-sm">
                  <div className="flex justify-between">
                    <span>Match Points:</span>
                    <span className="font-medium">{player.matchPoints}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Game Win %:</span>
                    <span className="font-medium">
                      {player.gameWinPercentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Full Standings Table */}
      <Card>
        <CardHeader>
          <CardTitle>Complete Standings</CardTitle>
          <CardDescription>
            All players ranked by match points and tiebreakers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Player</TableHead>
                <TableHead>Record</TableHead>
                <TableHead>Match Points</TableHead>
                <TableHead>Game Win %</TableHead>
                <TableHead>Opp. Win %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {standings.map((player) => (
                <TableRow
                  key={player.player.username}
                  className={player.isDropped ? "opacity-50" : ""}
                >
                  <TableCell>
                    {getRankBadge(player.rank, player.isDropped)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={player.player.avatar || undefined} />
                        <AvatarFallback>
                          {player.player.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{player.player.name}</div>
                        <div className="text-muted-foreground text-sm">
                          @{player.player.username}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {player.record.wins}-{player.record.losses}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    {player.matchPoints}
                  </TableCell>
                  <TableCell>{player.gameWinPercentage.toFixed(1)}%</TableCell>
                  <TableCell>
                    {player.opponentWinPercentage.toFixed(1)}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
