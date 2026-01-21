"use client";

import { useQuery } from "convex/react";
import { api } from "@/lib/convex/api";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Trophy,
  Plus,
  Calendar,
  Users,
  Search,
  Loader2,
  MapPin,
} from "lucide-react";
import { useState } from "react";

type TournamentStatus =
  | "draft"
  | "upcoming"
  | "active"
  | "completed"
  | "cancelled";

const statusColors: Record<TournamentStatus, string> = {
  draft: "bg-gray-100 text-gray-800",
  upcoming: "bg-blue-100 text-blue-800",
  active: "bg-green-100 text-green-800",
  completed: "bg-purple-100 text-purple-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function TournamentsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const tournamentsData = useQuery(api.tournaments.queries.list, {
    paginationOpts: { numItems: 50, cursor: null },
    statusFilter:
      statusFilter !== "all" ? (statusFilter as TournamentStatus) : undefined,
  });

  const tournaments = tournamentsData?.page || [];
  const isLoading = tournamentsData === undefined;

  // Client-side search filter
  const filteredTournaments = tournaments.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.organization?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Trophy className="h-8 w-8" />
            Tournaments
          </h1>
          <p className="text-muted-foreground mt-1">
            Browse and join Pokemon tournaments
          </p>
        </div>
        <Link href="/tournaments/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Tournament
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search tournaments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value ?? "all")}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredTournaments.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Trophy className="text-muted-foreground mb-4 h-12 w-12" />
            <h3 className="mb-2 text-lg font-semibold">No tournaments found</h3>
            <p className="text-muted-foreground mb-4 text-center">
              {searchQuery || statusFilter !== "all"
                ? "Try adjusting your filters"
                : "Be the first to create a tournament!"}
            </p>
            <Link href="/tournaments/create">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Tournament
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Tournament Grid */}
      {!isLoading && filteredTournaments.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTournaments.map((tournament) => (
            <Link
              key={tournament._id}
              href={`/${tournament.organization?.slug ?? "unknown"}/${tournament.slug}`}
            >
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="line-clamp-1 text-lg">
                      {tournament.name}
                    </CardTitle>
                    <Badge
                      className={
                        statusColors[tournament.status as TournamentStatus]
                      }
                    >
                      {tournament.status}
                    </Badge>
                  </div>
                  {tournament.organization?.name && (
                    <CardDescription className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {tournament.organization.name}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="text-muted-foreground space-y-2 text-sm">
                    {tournament.startDate && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {new Date(tournament.startDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>
                        {tournament.participants?.length || 0}
                        {tournament.maxParticipants
                          ? ` / ${tournament.maxParticipants}`
                          : ""}{" "}
                        players
                      </span>
                    </div>
                    {tournament.format && (
                      <div className="flex items-center gap-2">
                        <Trophy className="h-4 w-4" />
                        <span>{tournament.format}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
