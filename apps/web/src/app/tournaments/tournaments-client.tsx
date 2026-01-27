"use client";

import {
  type TournamentWithOrg,
  type GroupedTournaments,
} from "@trainers/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Search, Users, Calendar } from "lucide-react";
import { useState, useMemo, useCallback } from "react";

// ============================================================================
// Date Formatting Utilities & Components
// ============================================================================

/**
 * Get the user's timezone from the browser
 */
function getUserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function getDateParts(dateString: string | null): {
  month: string;
  day: string;
  time: string;
  year: string;
} | null {
  if (!dateString) return null;

  const date = new Date(dateString);
  const timeZone = getUserTimeZone();

  return {
    month: new Intl.DateTimeFormat("en-US", { month: "short", timeZone })
      .format(date)
      .toUpperCase(),
    day: new Intl.DateTimeFormat("en-US", { day: "numeric", timeZone }).format(
      date
    ),
    time: new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
      timeZone,
    }).format(date),
    year: new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      timeZone,
    }).format(date),
  };
}

/**
 * Compact horizontal date chip with colored month
 */
function DateChip({
  dateString,
  showTime = true,
  showYear = false,
}: {
  dateString: string | null;
  showTime?: boolean;
  showYear?: boolean;
}) {
  const parts = getDateParts(dateString);

  if (!parts) {
    return <span className="text-muted-foreground text-sm">TBD</span>;
  }

  return (
    <div className="inline-flex items-center gap-2">
      <span className="bg-muted rounded px-2 py-0.5 text-xs font-medium">
        <span className="text-primary">{parts.month}</span>
        <span className="text-foreground"> {parts.day}</span>
        {showYear && (
          <span className="text-muted-foreground">, {parts.year}</span>
        )}
      </span>
      {showTime && (
        <span className="text-muted-foreground text-xs">{parts.time}</span>
      )}
    </div>
  );
}

// ============================================================================
// Section Header Component
// ============================================================================

function SectionHeader({ title, count }: { title: string; count: number }) {
  if (count === 0) return null;

  return (
    <div className="flex items-center gap-2 pt-6 pb-3 first:pt-0">
      <h2 className="text-lg font-semibold">{title}</h2>
      <Badge variant="secondary" className="text-xs">
        {count}
      </Badge>
    </div>
  );
}

// ============================================================================
// Empty State Component
// ============================================================================

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <Icon className="text-muted-foreground mb-4 h-12 w-12" />
        <h3 className="mb-2 text-lg font-semibold">{title}</h3>
        <p className="text-muted-foreground text-center">{description}</p>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Active Tournaments Table
// ============================================================================

function ActiveTournamentsTable({
  tournaments,
}: {
  tournaments: TournamentWithOrg[];
}) {
  const router = useRouter();

  if (tournaments.length === 0) return null;

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Organization</TableHead>
            <TableHead className="text-right">Players</TableHead>
            <TableHead>Progress</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tournaments.map((tournament) => (
            <TableRow
              key={tournament.id}
              className="hover:bg-muted/50 cursor-pointer"
              onClick={() => router.push(`/tournaments/${tournament.slug}`)}
              onKeyDown={(e) =>
                e.key === "Enter" &&
                router.push(`/tournaments/${tournament.slug}`)
              }
              tabIndex={0}
              role="link"
            >
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
                  </span>
                  <Link
                    href={`/tournaments/${tournament.slug}`}
                    className="hover:text-primary hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {tournament.name}
                  </Link>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {tournament.organization?.name || "—"}
              </TableCell>
              <TableCell className="text-muted-foreground text-right">
                {tournament._count.registrations}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {tournament.current_round
                  ? `Round ${tournament.current_round}${tournament.swiss_rounds ? ` of ${tournament.swiss_rounds}` : ""}`
                  : "In Progress"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ============================================================================
// Upcoming Tournaments Table
// ============================================================================

function UpcomingTournamentsTable({
  tournaments,
}: {
  tournaments: TournamentWithOrg[];
}) {
  const router = useRouter();

  if (tournaments.length === 0) return null;

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <div className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Date & Time
              </div>
            </TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Organization</TableHead>
            <TableHead className="text-right">
              <div className="flex items-center justify-end gap-1">
                <Users className="h-3.5 w-3.5" />
                Spots
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tournaments.map((tournament) => {
            const spotsText = tournament.max_participants
              ? `${tournament._count.registrations} / ${tournament.max_participants}`
              : `${tournament._count.registrations}`;

            const isFull =
              tournament.max_participants &&
              tournament._count.registrations >= tournament.max_participants;

            return (
              <TableRow
                key={tournament.id}
                className="hover:bg-muted/50 cursor-pointer"
                onClick={() => router.push(`/tournaments/${tournament.slug}`)}
                onKeyDown={(e) =>
                  e.key === "Enter" &&
                  router.push(`/tournaments/${tournament.slug}`)
                }
                tabIndex={0}
                role="link"
              >
                <TableCell>
                  <DateChip dateString={tournament.start_date} showTime />
                </TableCell>
                <TableCell className="font-medium">
                  <Link
                    href={`/tournaments/${tournament.slug}`}
                    className="hover:text-primary hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {tournament.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {tournament.organization?.name || "—"}
                </TableCell>
                <TableCell className="text-right">
                  {isFull ? (
                    <Badge variant="secondary" className="text-xs">
                      Full
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">{spotsText}</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

// ============================================================================
// Completed Tournaments Table
// ============================================================================

function CompletedTournamentsTable({
  tournaments,
}: {
  tournaments: TournamentWithOrg[];
}) {
  const router = useRouter();

  if (tournaments.length === 0) return null;

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Organization</TableHead>
            <TableHead className="text-right">Players</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tournaments.map((tournament) => (
            <TableRow
              key={tournament.id}
              className="hover:bg-muted/50 cursor-pointer"
              onClick={() => router.push(`/tournaments/${tournament.slug}`)}
              onKeyDown={(e) =>
                e.key === "Enter" &&
                router.push(`/tournaments/${tournament.slug}`)
              }
              tabIndex={0}
              role="link"
            >
              <TableCell>
                <DateChip
                  dateString={tournament.end_date || tournament.start_date}
                  showTime={false}
                  showYear
                />
              </TableCell>
              <TableCell className="font-medium">
                <Link
                  href={`/tournaments/${tournament.slug}`}
                  className="hover:text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {tournament.name}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {tournament.organization?.name || "—"}
              </TableCell>
              <TableCell className="text-muted-foreground text-right">
                {tournament._count.registrations}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ============================================================================
// Main Client Component
// ============================================================================

export function TournamentsClient({ data }: { data: GroupedTournaments }) {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter tournaments by search query
  const filterBySearch = useCallback(
    (tournaments: TournamentWithOrg[]) => {
      if (!searchQuery) return tournaments;
      const query = searchQuery.toLowerCase();
      return tournaments.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.organization?.name?.toLowerCase().includes(query)
      );
    },
    [searchQuery]
  );

  // Memoized filtered data
  const filteredData = useMemo(() => {
    return {
      active: filterBySearch(data.active),
      upcoming: filterBySearch(data.upcoming),
      completed: filterBySearch(data.completed),
    };
  }, [data, filterBySearch]);

  const totalCount =
    filteredData.active.length +
    filteredData.upcoming.length +
    filteredData.completed.length;

  const hasNoResults = totalCount === 0;
  const isSearching = searchQuery.length > 0;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Trophy className="h-8 w-8" />
            Tournaments
          </h1>
          <p className="text-muted-foreground mt-1">
            Browse and join Pokemon tournaments
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search tournaments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Empty State */}
      {hasNoResults && (
        <EmptyState
          icon={Trophy}
          title="No tournaments found"
          description={
            isSearching
              ? "Try adjusting your search query"
              : "Check back later for upcoming tournaments!"
          }
        />
      )}

      {/* Tournament Sections */}
      {!hasNoResults && (
        <div className="space-y-2">
          {filteredData.active.length > 0 && (
            <>
              <SectionHeader
                title="Active Now"
                count={filteredData.active.length}
              />
              <ActiveTournamentsTable tournaments={filteredData.active} />
            </>
          )}

          {filteredData.upcoming.length > 0 && (
            <>
              <SectionHeader
                title="Upcoming"
                count={filteredData.upcoming.length}
              />
              <UpcomingTournamentsTable tournaments={filteredData.upcoming} />
            </>
          )}

          {filteredData.completed.length > 0 && (
            <>
              <SectionHeader
                title="Recently Completed"
                count={filteredData.completed.length}
              />
              <CompletedTournamentsTable tournaments={filteredData.completed} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
