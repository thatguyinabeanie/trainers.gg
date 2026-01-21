"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Trophy, Plus, ChevronRight } from "lucide-react";
import Link from "next/link";
import { type DashboardTournament } from "@/lib/types/dashboard";

interface UpcomingTournamentsProps {
  myTournaments: DashboardTournament[];
}

export function UpcomingTournaments({
  myTournaments,
}: UpcomingTournamentsProps) {
  return (
    <div className="lg:col-span-2">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Upcoming Tournaments</CardTitle>
              <CardDescription>
                Tournaments you&apos;re registered for
              </CardDescription>
            </div>
            <Link
              href="/tournaments"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
            >
              View all
              <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {myTournaments.length === 0 ? (
            <div className="py-12 text-center">
              <Trophy className="text-muted-foreground/30 mx-auto h-12 w-12" />
              <h3 className="mt-4 text-sm font-semibold">
                No upcoming tournaments
              </h3>
              <p className="text-muted-foreground mt-2 text-sm">
                Browse available tournaments to join
              </p>
              <Link
                href="/tournaments"
                className={cn(buttonVariants({ size: "sm" }), "mt-4")}
              >
                <Plus className="mr-2 h-4 w-4" />
                Find Tournaments
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {myTournaments.map((tournament) => (
                <div
                  key={tournament._id}
                  className="flex items-center justify-between rounded-md border p-4"
                >
                  <div>
                    <Link
                      href={`/tournaments/${tournament._id}`}
                      className="font-semibold hover:underline"
                    >
                      {tournament.name}
                    </Link>
                    <p className="text-muted-foreground text-sm">
                      {tournament.startDate
                        ? new Date(tournament.startDate).toLocaleDateString()
                        : "Date TBD"}
                    </p>
                  </div>
                  <Link
                    href={`/tournaments/${tournament._id}`}
                    className={cn(
                      buttonVariants({ variant: "secondary", size: "sm" })
                    )}
                  >
                    View
                  </Link>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
