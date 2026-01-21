"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { type DashboardTournament } from "@/lib/types/dashboard";

interface QuickStatsProps {
  myTournaments: DashboardTournament[];
}

export function QuickStats({ myTournaments }: QuickStatsProps) {
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Quick Stats</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">Total Matches</span>
          <span className="font-semibold">0</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">Win Rate</span>
          <span className="font-semibold">-</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">Tournaments</span>
          <span className="font-semibold">{myTournaments.length}</span>
        </div>
        <Link
          href="/analytics"
          className={cn(buttonVariants({ variant: "outline" }), "mt-4 w-full")}
        >
          View Full Stats
        </Link>
      </CardContent>
    </Card>
  );
}
