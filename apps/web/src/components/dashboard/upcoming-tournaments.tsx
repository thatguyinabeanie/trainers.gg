"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Plus, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { DashboardTournament } from "@/types/dashboard";

export function UpcomingTournaments({
  myTournaments,
}: {
  myTournaments: DashboardTournament[];
}) {
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
            <Link href="/tournaments">
              <Button variant="ghost" size="sm">
                View all
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
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
              <Link href="/tournaments">
                <Button size="sm" className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Find Tournaments
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {myTournaments.map((tournament) => (
                <div
                  key={tournament.id}
                  className="flex items-center justify-between rounded-md border p-4"
                >
                  <div>
                    <Link
                      href={`/tournaments/${tournament.id}`}
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
                  <Link href={`/tournaments/${tournament.id}`}>
                    <Button variant="secondary" size="sm">
                      View
                    </Button>
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
