"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  Trophy,
  Calendar,
  Clock,
  Target,
  TrendingUp,
} from "lucide-react";

interface TournamentOverviewProps {
  tournament: {
    name: string;
    status: string;
    registrations?: Array<unknown>;
    maxParticipants?: number;
    startDate?: number;
    endDate?: number;
    registrationDeadline?: number;
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
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const stats = [
    {
      title: "Registered Players",
      value: registrationCount,
      icon: Users,
      description: maxParticipants
        ? `of ${maxParticipants} max`
        : "No limit set",
    },
    {
      title: "Current Round",
      value: tournament.currentRound || 0,
      icon: Trophy,
      description:
        tournament.status === "active" ? "In progress" : "Not started",
    },
    {
      title: "Tournament Format",
      value: tournament.tournamentFormat?.replace("_", " ") || "Not set",
      icon: Target,
      description: tournament.format || "Custom format",
    },
    {
      title: "Round Time",
      value: `${tournament.roundTimeMinutes || 50}m`,
      icon: Clock,
      description: "Per round",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Key Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-muted-foreground text-xs">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Registration Progress */}
      {maxParticipants > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Registration Progress</CardTitle>
            <CardDescription>
              {registrationCount} of {maxParticipants} spots filled
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={registrationProgress} className="h-3" />
            <div className="text-muted-foreground mt-2 flex justify-between text-sm">
              <span>{registrationCount} registered</span>
              <span>{maxParticipants - registrationCount} spots remaining</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tournament Details */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <span className="font-medium">Start Date:</span>
              <p className="text-muted-foreground text-sm">
                {formatDate(tournament.startDate)}
              </p>
            </div>
            <div>
              <span className="font-medium">End Date:</span>
              <p className="text-muted-foreground text-sm">
                {formatDate(tournament.endDate)}
              </p>
            </div>
            <div>
              <span className="font-medium">Registration Deadline:</span>
              <p className="text-muted-foreground text-sm">
                {formatDate(tournament.registrationDeadline) ||
                  "Tournament start time"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Format Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="font-medium">Game Format:</span>
              <Badge variant="secondary">{tournament.format || "Custom"}</Badge>
            </div>
            {tournament.swissRounds && (
              <div>
                <span className="font-medium">Swiss Rounds:</span>
                <span className="ml-2">{tournament.swissRounds}</span>
              </div>
            )}
            {tournament.topCutSize && (
              <div>
                <span className="font-medium">Top Cut:</span>
                <span className="ml-2">Top {tournament.topCutSize}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="font-medium">Rental Photos:</span>
              <Badge
                variant={
                  tournament.rentalTeamPhotosEnabled ? "default" : "secondary"
                }
              >
                {tournament.rentalTeamPhotosEnabled ? "Enabled" : "Disabled"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span>Tournament created</span>
              <span className="text-muted-foreground ml-auto">
                {tournament._creationTime
                  ? new Date(tournament._creationTime).toLocaleDateString()
                  : "Unknown"}
              </span>
            </div>
            {tournament.status !== "draft" && (
              <div className="flex items-center gap-3 text-sm">
                <div className="h-2 w-2 rounded-full bg-blue-500" />
                <span>Registration opened</span>
                <span className="text-muted-foreground ml-auto">Recently</span>
              </div>
            )}
            {registrationCount > 0 && (
              <div className="flex items-center gap-3 text-sm">
                <div className="h-2 w-2 rounded-full bg-purple-500" />
                <span>{registrationCount} players registered</span>
                <span className="text-muted-foreground ml-auto">Ongoing</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
