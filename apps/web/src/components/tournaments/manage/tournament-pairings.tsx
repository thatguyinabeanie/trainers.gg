"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shuffle, Play, Clock, Trophy, AlertCircle } from "lucide-react";

interface TournamentPairingsProps {
  tournament: {
    status: string;
    currentRound?: number;
  };
}

export function TournamentPairings({ tournament }: TournamentPairingsProps) {
  const [selectedRound, setSelectedRound] = useState("1");

  // Mock data - replace with actual queries
  const rounds = [
    { number: 1, status: "completed", matches: 8 },
    { number: 2, status: "active", matches: 8 },
    { number: 3, status: "pending", matches: 0 },
  ];

  const pairings = [
    {
      id: 1,
      table: 1,
      player1: { name: "Alice Johnson", record: "2-0" },
      player2: { name: "Bob Smith", record: "2-0" },
      status: "in_progress",
      result: null,
    },
    {
      id: 2,
      table: 2,
      player1: { name: "Charlie Brown", record: "1-1" },
      player2: { name: "Diana Prince", record: "1-1" },
      status: "completed",
      result: { winner: "Charlie Brown", score: "2-1" },
    },
  ];

  const currentRound = rounds.find((r) => r.number === parseInt(selectedRound));
  const canGeneratePairings =
    tournament.status === "active" && currentRound?.status === "pending";
  const canStartRound =
    currentRound?.status === "pending" && currentRound?.matches > 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Pairings & Matches</h2>
          <p className="text-muted-foreground">
            Manage tournament rounds and player pairings
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={selectedRound}
            onValueChange={(value: string | null) => setSelectedRound(value || "")}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {rounds.map((round) => (
                <SelectItem key={round.number} value={round.number.toString()}>
                  Round {round.number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canGeneratePairings && (
            <Button>
              <Shuffle className="mr-2 h-4 w-4" />
              Generate Pairings
            </Button>
          )}
          {canStartRound && (
            <Button>
              <Play className="mr-2 h-4 w-4" />
              Start Round
            </Button>
          )}
        </div>
      </div>

      {/* Round Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Round {selectedRound} Status</CardTitle>
              <CardDescription>
                {currentRound?.matches || 0} matches in this round
              </CardDescription>
            </div>
            <Badge
              className={getStatusColor(currentRound?.status || "pending")}
            >
              {currentRound?.status?.replace("_", " ").toUpperCase() ||
                "PENDING"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {currentRound?.status === "pending" && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This round hasn&apos;t started yet. Generate pairings to begin.
              </AlertDescription>
            </Alert>
          )}

          {currentRound?.status === "active" && (
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {pairings.filter((p) => p.status === "in_progress").length}
                </div>
                <div className="text-muted-foreground text-sm">In Progress</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {pairings.filter((p) => p.status === "completed").length}
                </div>
                <div className="text-muted-foreground text-sm">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {Math.round(
                    (pairings.filter((p) => p.status === "completed").length /
                      pairings.length) *
                      100
                  )}
                  %
                </div>
                <div className="text-muted-foreground text-sm">Progress</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pairings Table */}
      <Card>
        <CardHeader>
          <CardTitle>Round {selectedRound} Pairings</CardTitle>
          <CardDescription>
            Match pairings and results for the current round
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pairings.length === 0 ? (
            <div className="py-8 text-center">
              <Trophy className="text-muted-foreground mx-auto mb-4 h-12 w-12 opacity-50" />
              <h3 className="mb-2 text-lg font-semibold">No pairings yet</h3>
              <p className="text-muted-foreground">
                Generate pairings to start this round.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Table</TableHead>
                  <TableHead>Player 1</TableHead>
                  <TableHead>Player 2</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pairings.map((pairing) => (
                  <TableRow key={pairing.id}>
                    <TableCell className="font-medium">
                      Table {pairing.table}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {pairing.player1.name}
                        </div>
                        <div className="text-muted-foreground text-sm">
                          {pairing.player1.record}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {pairing.player2.name}
                        </div>
                        <div className="text-muted-foreground text-sm">
                          {pairing.player2.record}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(pairing.status)}>
                        {pairing.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {pairing.result ? (
                        <div>
                          <div className="font-medium">
                            {pairing.result.winner}
                          </div>
                          <div className="text-muted-foreground text-sm">
                            {pairing.result.score}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {pairing.status === "in_progress" && (
                        <Button variant="outline" size="sm">
                          <Clock className="mr-2 h-4 w-4" />
                          Report Result
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
