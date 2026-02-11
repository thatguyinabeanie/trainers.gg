"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Swords, MapPin } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface ActiveMatchCardProps {
  match: {
    id: number;
    status: "pending" | "active";
    tournamentId: number;
    tournamentName: string;
    tournamentSlug: string;
    roundNumber: number;
    phaseName: string;
    opponent: {
      id: number;
      displayName: string;
      username: string;
    } | null;
    table: number | null;
  };
}

export function ActiveMatchCard({ match }: ActiveMatchCardProps) {
  const statusVariant = match.status === "active" ? "default" : "secondary";
  const statusLabel = match.status === "active" ? "In Progress" : "Ready";

  return (
    <Card className="border-primary/50 bg-primary/5">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Swords className="text-primary h-5 w-5" />
            <CardTitle className="text-base">Active Match</CardTitle>
          </div>
          <Badge variant={statusVariant}>{statusLabel}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tournament info */}
        <div>
          <p className="text-sm font-medium">{match.tournamentName}</p>
          <p className="text-muted-foreground text-xs">
            {match.phaseName} &bull; Round {match.roundNumber}
          </p>
        </div>

        {/* Opponent info */}
        {match.opponent && (
          <div className="bg-muted rounded-lg p-3">
            <p className="text-muted-foreground mb-1 text-xs font-medium">
              Opponent
            </p>
            <p className="text-sm font-medium">{match.opponent.displayName}</p>
            <p className="text-muted-foreground text-xs">
              @{match.opponent.username}
            </p>
          </div>
        )}

        {/* Table number */}
        {match.table != null && (
          <div className="flex items-center gap-1.5 text-sm">
            <MapPin className="text-muted-foreground h-4 w-4" />
            <span className="text-muted-foreground">Table {match.table}</span>
          </div>
        )}

        {/* Action button */}
        <Link
          href={`/tournaments/${match.tournamentSlug}/match/${match.id}`}
          className={cn(
            "bg-primary text-primary-foreground hover:bg-primary/80 inline-flex h-8 w-full items-center justify-center rounded-lg border border-transparent px-2.5 text-sm font-medium whitespace-nowrap transition-all"
          )}
        >
          View Match
        </Link>
      </CardContent>
    </Card>
  );
}
