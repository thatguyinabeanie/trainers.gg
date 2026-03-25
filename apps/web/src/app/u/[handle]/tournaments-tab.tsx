"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Trophy, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { formatPlacement, formatDate } from "./utils";

// ============================================================================
// Types
// ============================================================================

interface TournamentHistoryFullEntry {
  id: number;
  tournamentId: number;
  tournamentName: string;
  tournamentSlug: string;
  startDate: string | null;
  status: string;
  format: string | null;
  organizationName: string | null;
  organizationSlug: string | null;
  placement: number | null;
  wins: number;
  losses: number;
}

interface TournamentHistoryResponse {
  data: TournamentHistoryFullEntry[];
  totalCount: number;
  page: number;
}

// ============================================================================
// Query key factories
// ============================================================================

const tournamentHistoryKeys = {
  all: (handle: string) => ["player", handle, "tournament-history"] as const,
  filtered: (
    handle: string,
    filters: { format: string; year: string; status: string; page: number }
  ) => [...tournamentHistoryKeys.all(handle), filters] as const,
};

// Current year and a few previous years for the year filter
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) =>
  String(CURRENT_YEAR - i)
);

// ============================================================================
// Main component
// ============================================================================

interface TournamentsTabProps {
  altIds: number[];
  handle: string;
}

export function TournamentsTab({ altIds, handle }: TournamentsTabProps) {
  const [format, setFormat] = useState("all");
  const [year, setYear] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);

  const filters = { format, year, status, page };

  const { data, isLoading } = useQuery<TournamentHistoryResponse>({
    queryKey: tournamentHistoryKeys.filtered(handle, filters),
    queryFn: async () => {
      const params = new URLSearchParams({
        altIds: altIds.join(","),
        page: String(page),
      });
      if (format !== "all") params.set("format", format);
      if (year !== "all") params.set("year", year);
      if (status !== "all") params.set("status", status);

      const res = await fetch(
        `/api/players/tournament-history?${params.toString()}`
      );
      if (!res.ok) throw new Error("Failed to fetch tournament history");
      return res.json();
    },
    enabled: altIds.length > 0,
  });

  const tournaments = data?.data ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / 20));

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select
          value={format}
          onValueChange={(v) => {
            if (v) setFormat(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Format" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Formats</SelectItem>
            <SelectItem value="vgc">VGC</SelectItem>
            <SelectItem value="bss">BSS</SelectItem>
            <SelectItem value="smogon_ou">Smogon OU</SelectItem>
            <SelectItem value="smogon_uu">Smogon UU</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={year}
          onValueChange={(v) => {
            if (v) setYear(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            {YEAR_OPTIONS.map((y) => (
              <SelectItem key={y} value={y}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={status}
          onValueChange={(v) => {
            if (v) setStatus(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="flex items-center gap-4 pt-6">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-6 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && tournaments.length === 0 && (
        <div className="text-muted-foreground py-12 text-center text-sm">
          No tournaments found matching your filters.
        </div>
      )}

      {/* Results */}
      {!isLoading && tournaments.length > 0 && (
        <div className="space-y-3">
          {tournaments.map((entry) => (
            <Card key={entry.id}>
              <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="bg-primary/10 mt-0.5 rounded-full p-2">
                    <Trophy className="text-primary h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <Link
                      href={`/tournaments/${entry.tournamentSlug}`}
                      className="hover:text-primary font-medium transition-colors"
                    >
                      {entry.tournamentName}
                    </Link>
                    <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
                      {entry.organizationName && entry.organizationSlug && (
                        <Link
                          href={`/organizations/${entry.organizationSlug}`}
                          className="hover:underline"
                        >
                          {entry.organizationName}
                        </Link>
                      )}
                      {entry.startDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(entry.startDate)}
                        </span>
                      )}
                      {entry.format && (
                        <span>{entry.format.toUpperCase()}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm sm:text-right">
                  <StatusBadge
                    status={
                      entry.status as
                        | "active"
                        | "upcoming"
                        | "draft"
                        | "completed"
                        | "cancelled"
                    }
                  />
                  <div>
                    <span className="text-muted-foreground">Record: </span>
                    <span className="font-medium">
                      {entry.wins}-{entry.losses}
                    </span>
                  </div>
                  {entry.placement != null && (
                    <div className="bg-muted rounded-md px-2.5 py-1 text-xs font-semibold">
                      {formatPlacement(entry.placement)}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-muted-foreground text-sm">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
