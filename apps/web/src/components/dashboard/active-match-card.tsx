"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Swords, MapPin, ChevronRight } from "lucide-react";
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
  const isActive = match.status === "active";
  const statusLabel = isActive ? "LIVE" : "READY";

  return (
    <Card className="border-primary/30 from-primary/10 via-background to-background relative overflow-hidden bg-gradient-to-br">
      {/* Animated pulsing border for live matches */}
      {isActive && (
        <div className="absolute inset-0 animate-pulse">
          <div className="border-primary/50 absolute inset-0 rounded-lg border-2" />
        </div>
      )}

      {/* Diagonal accent stripe */}
      <div className="bg-primary/10 absolute top-0 right-0 h-32 w-32 translate-x-8 -translate-y-8 rotate-45" />

      <CardHeader className="relative">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary/20 flex size-10 items-center justify-center rounded-lg">
              <Swords className="text-primary size-5" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                  Active Match
                </span>
              </CardTitle>
            </div>
          </div>
          <Badge
            variant={isActive ? "default" : "secondary"}
            className={cn(
              "font-mono text-xs font-bold",
              isActive && "animate-pulse bg-emerald-500 text-white"
            )}
          >
            {statusLabel}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="relative space-y-4">
        {/* Tournament info */}
        <div className="space-y-1">
          <p className="text-base font-bold">{match.tournamentName}</p>
          <div className="text-muted-foreground flex items-center gap-2 text-xs">
            <span className="font-medium">{match.phaseName}</span>
            <span>&bull;</span>
            <span className="font-mono font-semibold">
              Round {match.roundNumber}
            </span>
          </div>
        </div>

        {/* Opponent info - VS style */}
        {match.opponent && (
          <div className="border-primary/20 from-primary/5 relative overflow-hidden rounded-lg border bg-gradient-to-r to-transparent p-4">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                  Opponent
                </p>
                <p className="mt-1 text-base font-bold">
                  {match.opponent.displayName}
                </p>
                <p className="text-muted-foreground mt-0.5 font-mono text-xs">
                  @{match.opponent.username}
                </p>
              </div>
              <div className="bg-primary/10 text-primary flex size-12 shrink-0 items-center justify-center rounded-lg font-mono text-2xl font-bold">
                VS
              </div>
            </div>
          </div>
        )}

        {/* Table number */}
        {match.table != null && (
          <div className="bg-muted/50 flex items-center gap-2 rounded-lg px-3 py-2">
            <MapPin className="text-muted-foreground size-4" />
            <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
              Table
            </span>
            <span className="ml-auto font-mono text-sm font-bold tabular-nums">
              {match.table}
            </span>
          </div>
        )}

        {/* Action button - prominent CTA */}
        <Link
          href={`/tournaments/${match.tournamentSlug}/matches/${match.id}`}
          className={cn(
            "group bg-primary text-primary-foreground hover:bg-primary/90 relative inline-flex h-11 w-full items-center justify-center gap-2 overflow-hidden rounded-lg px-4 text-sm font-bold tracking-wide uppercase transition-all"
          )}
        >
          <span>Enter Battle</span>
          <ChevronRight className="size-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </CardContent>
    </Card>
  );
}
