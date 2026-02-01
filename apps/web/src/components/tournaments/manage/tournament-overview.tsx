"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Trophy,
  Calendar,
  Play,
  Download,
  AlertCircle,
  TrendingUp,
  ChevronRight,
} from "lucide-react";

interface TournamentOverviewProps {
  tournament: {
    name: string;
    status: string;
    registrations?: Array<unknown>;
    maxParticipants?: number;
    startDate?: number;
    endDate?: number;
    tournamentFormat: string;
    format: string;
    currentRound?: number;
    roundTimeMinutes?: number;
    swissRounds?: number;
    topCutSize?: number;
    rentalTeamPhotosEnabled?: boolean;
    _creationTime?: number;
  };
}

export function TournamentOverview({ tournament }: TournamentOverviewProps) {
  const registrationCount = tournament.registrations?.length || 0;
  const maxParticipants = tournament.maxParticipants || 0;
  const registrationProgress =
    maxParticipants > 0 ? (registrationCount / maxParticipants) * 100 : 0;

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "Not set";
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  // Build attention items based on tournament state
  const attentionItems: Array<{ id: string; message: string; action: string }> =
    [];

  if (tournament.status === "draft") {
    attentionItems.push({
      id: "publish",
      message: "Tournament is still in draft mode",
      action: "Publish",
    });
  }

  if (tournament.status === "upcoming" && !tournament.startDate) {
    attentionItems.push({
      id: "start-date",
      message: "No start date set",
      action: "Set Date",
    });
  }

  if (
    tournament.status === "active" &&
    registrationCount > 0 &&
    !tournament.currentRound
  ) {
    attentionItems.push({
      id: "start-round",
      message: "Tournament active but no rounds started",
      action: "Start Round 1",
    });
  }

  const isActive = tournament.status === "active";
  const isUpcoming = tournament.status === "upcoming";

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        {isActive && (
          <Button className="gap-2">
            <Play className="h-4 w-4" />
            {tournament.currentRound
              ? `Start Round ${tournament.currentRound + 1}`
              : "Start Round 1"}
          </Button>
        )}
        {isUpcoming && (
          <Button className="gap-2">
            <Play className="h-4 w-4" />
            Start Tournament
          </Button>
        )}
        <Button variant="outline" className="gap-2">
          <Trophy className="h-4 w-4" />
          View Bracket
        </Button>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export Results
        </Button>
      </div>

      {/* Attention Needed */}
      {attentionItems.length > 0 && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              Needs Attention
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {attentionItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between py-2"
              >
                <span className="text-sm">{item.message}</span>
                <Button size="sm" variant="ghost" className="gap-1">
                  {item.action}
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* At a Glance - Compact metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="bg-muted/50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold">{registrationCount}</div>
          <div className="text-muted-foreground text-xs">
            {maxParticipants ? `of ${maxParticipants}` : "Registered"}
          </div>
        </div>
        <div className="bg-muted/50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold">
            {tournament.currentRound || 0}
          </div>
          <div className="text-muted-foreground text-xs">
            {tournament.swissRounds
              ? `of ${tournament.swissRounds} rounds`
              : "Current Round"}
          </div>
        </div>
        <div className="bg-muted/50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold">
            {tournament.roundTimeMinutes || 50}m
          </div>
          <div className="text-muted-foreground text-xs">Round Time</div>
        </div>
        <div className="bg-muted/50 rounded-lg p-4 text-center">
          <div className="text-lg font-bold">
            <Badge variant="secondary" className="text-xs">
              {tournament.format || "Custom"}
            </Badge>
          </div>
          <div className="text-muted-foreground mt-1 text-xs">Format</div>
        </div>
      </div>

      {/* Registration Progress - Only if cap set */}
      {maxParticipants > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">
                Registration
              </CardTitle>
              <span className="text-muted-foreground text-sm">
                {registrationCount} / {maxParticipants}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <Progress value={registrationProgress} className="h-2" />
            <p className="text-muted-foreground mt-2 text-xs">
              {maxParticipants - registrationCount} spots remaining
            </p>
          </CardContent>
        </Card>
      )}

      {/* Schedule & Details - Condensed */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Calendar className="h-4 w-4" />
              Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Start</span>
              <span>{formatDate(tournament.startDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">End</span>
              <span>{formatDate(tournament.endDate)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Trophy className="h-4 w-4" />
              Format
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type</span>
              <span>
                {tournament.tournamentFormat?.replace(/_/g, " ") || "Swiss"}
              </span>
            </div>
            {tournament.swissRounds && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Swiss Rounds</span>
                <span>{tournament.swissRounds}</span>
              </div>
            )}
            {tournament.topCutSize && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Top Cut</span>
                <span>Top {tournament.topCutSize}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity - Compact */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <TrendingUp className="h-4 w-4" />
            Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-sm">
              <div className="h-2 w-2 shrink-0 rounded-full bg-green-500" />
              <span className="flex-1">Tournament created</span>
              <span className="text-muted-foreground text-xs">
                {tournament._creationTime
                  ? new Date(tournament._creationTime).toLocaleDateString()
                  : "—"}
              </span>
            </div>
            {tournament.status !== "draft" && (
              <div className="flex items-center gap-3 text-sm">
                <div className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                <span className="flex-1">Registration opened</span>
                <span className="text-muted-foreground text-xs">Recently</span>
              </div>
            )}
            {registrationCount > 0 && (
              <div className="flex items-center gap-3 text-sm">
                <div className="h-2 w-2 shrink-0 rounded-full bg-purple-500" />
                <span className="flex-1">
                  {registrationCount} players registered
                </span>
                <span className="text-muted-foreground text-xs">Ongoing</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
