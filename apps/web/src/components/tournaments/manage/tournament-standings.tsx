"use client";

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
import { Trophy, Medal, Award } from "lucide-react";

interface TournamentStandingsProps {
  tournament: {
    status: string;
  };
}

export function TournamentStandings(_props: TournamentStandingsProps) {
  // Mock standings data - replace with actual query
  const standings = [
    {
      rank: 1,
      player: { name: "Alice Johnson", username: "alice_j", avatar: null },
      record: { wins: 3, losses: 0 },
      matchPoints: 9,
      gameWinPercentage: 85.7,
      opponentWinPercentage: 66.7,
    },
    {
      rank: 2,
      player: { name: "Bob Smith", username: "bob_smith", avatar: null },
      record: { wins: 2, losses: 1 },
      matchPoints: 6,
      gameWinPercentage: 71.4,
      opponentWinPercentage: 55.6,
    },
    {
      rank: 3,
      player: { name: "Charlie Brown", username: "charlie_b", avatar: null },
      record: { wins: 2, losses: 1 },
      matchPoints: 6,
      gameWinPercentage: 66.7,
      opponentWinPercentage: 61.1,
    },
  ];

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

  const getRankBadge = (rank: number) => {
    if (rank <= 3) {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          {getRankIcon(rank)}#{rank}
        </Badge>
      );
    }
    return <Badge variant="outline">#{rank}</Badge>;
  };

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
      <div className="grid gap-4 md:grid-cols-3">
        {standings.slice(0, 3).map((player, index) => (
          <Card
            key={player.rank}
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
                    {player.gameWinPercentage}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

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
                <TableRow key={player.rank}>
                  <TableCell>{getRankBadge(player.rank)}</TableCell>
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
                  <TableCell>{player.gameWinPercentage}%</TableCell>
                  <TableCell>{player.opponentWinPercentage}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
