"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  Globe,
  Loader2,
  RefreshCw,
  Search,
  Users,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useSupabaseQuery } from "@/lib/supabase";
import {
  discoverRk9Events,
  scrapeRk9Roster,
  scrapeRk9TeamsBatch,
} from "@/actions/rk9";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RK9EventRow {
  event_id: string;
  name: string;
  tier: string;
  date_start: string;
  location_city: string | null;
  location_country: string | null;
  player_count: number | null;
  has_team_lists: boolean;
  import_status: string;
  import_error: string | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RK9Import() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoverMessage, setDiscoverMessage] = useState<string | null>(null);
  const [activeJobs, setActiveJobs] = useState<
    Map<string, { type: string; scraped?: number; total?: number }>
  >(new Map());

  // Fetch events from DB (sorted by date, most recent first)
  const {
    data: events,
    error: queryError,
    isLoading,
  } = useSupabaseQuery(
    async (sb) => {
      const { data, error } = await sb
        .schema("rk9")
        .from("events")
        .select("*")
        .order("date_start", { ascending: false });
      if (error) throw error;
      return (data ?? []) as RK9EventRow[];
    },
    [refreshKey]
  );

  // Filter events by search
  const filteredEvents = (events ?? []).filter(
    (e) =>
      !searchQuery ||
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.event_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Stats
  const totalEvents = events?.length ?? 0;
  const importedEvents =
    events?.filter((e) => e.import_status === "complete").length ?? 0;
  const withTeams = events?.filter((e) => e.has_team_lists).length ?? 0;

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  async function handleDiscover() {
    setIsDiscovering(true);
    setDiscoverMessage(null);
    try {
      const result = await discoverRk9Events();
      if (result.success) {
        const count = result.events?.length ?? 0;
        setDiscoverMessage(`Discovered ${count} events from RK9`);
        setRefreshKey((k) => k + 1);
      } else {
        setDiscoverMessage(`Error: ${result.error}`);
      }
    } finally {
      setIsDiscovering(false);
    }
  }

  async function handleScrapeRoster(eventId: string) {
    setActiveJobs((prev) => new Map(prev).set(eventId, { type: "roster" }));
    try {
      await scrapeRk9Roster(eventId);
    } finally {
      setActiveJobs((prev) => {
        const next = new Map(prev);
        next.delete(eventId);
        return next;
      });
      setRefreshKey((k) => k + 1);
    }
  }

  async function handleScrapeTeams(eventId: string) {
    setActiveJobs((prev) =>
      new Map(prev).set(eventId, { type: "teams", scraped: 0, total: 0 })
    );

    try {
      // Call the chunked action in a loop until done
      let done = false;
      while (!done) {
        const result = await scrapeRk9TeamsBatch(eventId);
        if (!result.success) {
          break;
        }
        done = result.done ?? false;
        setActiveJobs((prev) =>
          new Map(prev).set(eventId, {
            type: "teams",
            scraped: result.scraped ?? 0,
            total: result.total ?? 0,
          })
        );
      }
    } finally {
      setActiveJobs((prev) => {
        const next = new Map(prev);
        next.delete(eventId);
        return next;
      });
      setRefreshKey((k) => k + 1);
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Stats + Discover */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <Card className="flex-1">
          <CardContent className="flex items-center gap-6 p-4">
            <div className="flex items-center gap-2">
              <Globe className="text-muted-foreground h-4 w-4" />
              <div>
                <p className="text-2xl font-bold">{totalEvents}</p>
                <p className="text-muted-foreground text-xs">Events</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <div>
                <p className="text-2xl font-bold">{importedEvents}</p>
                <p className="text-muted-foreground text-xs">Imported</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Users className="text-muted-foreground h-4 w-4" />
              <div>
                <p className="text-2xl font-bold">{withTeams}</p>
                <p className="text-muted-foreground text-xs">With teams</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-2">
          <Button onClick={handleDiscover} disabled={isDiscovering}>
            {isDiscovering ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Discover Events
          </Button>
          {discoverMessage && (
            <p
              className={cn(
                "text-xs",
                discoverMessage.startsWith("Error")
                  ? "text-red-500"
                  : "text-muted-foreground"
              )}
            >
              {discoverMessage}
            </p>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          placeholder="Search events..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Error */}
      {queryError && (
        <div className="rounded-lg bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400">
          {queryError.message}
        </div>
      )}

      {/* Events Table */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="text-muted-foreground py-12 text-center text-sm">
          {totalEvents === 0
            ? 'No events found. Click "Discover Events" to fetch from RK9.'
            : "No events match your search."}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Players</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEvents.map((event) => (
                <EventTableRow
                  key={event.event_id}
                  event={event}
                  activeJob={activeJobs.get(event.event_id) ?? null}
                  onScrapeRoster={() => handleScrapeRoster(event.event_id)}
                  onScrapeTeams={() => handleScrapeTeams(event.event_id)}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Event Row
// ---------------------------------------------------------------------------

interface JobState {
  type: string;
  scraped?: number;
  total?: number;
}

interface EventTableRowProps {
  event: RK9EventRow;
  activeJob: JobState | null;
  onScrapeRoster: () => void;
  onScrapeTeams: () => void;
}

function EventTableRow({
  event,
  activeJob,
  onScrapeRoster,
  onScrapeTeams,
}: EventTableRowProps) {
  const isBusy = activeJob !== null;

  return (
    <TableRow>
      {/* Event name + location */}
      <TableCell>
        <div className="flex items-center gap-1.5">
          <a
            href={`https://rk9.gg/tournament/${event.event_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium hover:underline"
          >
            {event.name}
          </a>
          <Badge variant="secondary" className="text-xs capitalize">
            {event.tier}
          </Badge>
          <a
            href={`https://rk9.gg/tournament/${event.event_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
        {event.location_city && (
          <p className="text-muted-foreground text-xs">
            {event.location_city}
            {event.location_country ? `, ${event.location_country}` : ""}
          </p>
        )}
        {event.import_error && (
          <p className="mt-0.5 text-xs text-red-500">{event.import_error}</p>
        )}
      </TableCell>

      {/* Date */}
      <TableCell className="text-sm">{event.date_start}</TableCell>

      {/* Players */}
      <TableCell className="text-sm">{event.player_count ?? "—"}</TableCell>

      {/* Status */}
      <TableCell>
        <EventStatusBadge status={event.import_status} activeJob={activeJob} />
      </TableCell>

      {/* Actions */}
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          {/* Scrape Roster button */}
          {(event.import_status === "pending" ||
            event.import_status === "failed") && (
            <Button
              variant="outline"
              size="sm"
              onClick={onScrapeRoster}
              disabled={isBusy}
            >
              {activeJob?.type === "roster" ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="mr-1.5 h-3.5 w-3.5" />
              )}
              Roster
            </Button>
          )}

          {/* Scrape Teams button */}
          {(event.import_status === "roster" ||
            event.import_status === "complete") &&
            !event.has_team_lists && (
              <Button
                variant="outline"
                size="sm"
                onClick={onScrapeTeams}
                disabled={isBusy}
              >
                {activeJob?.type === "teams" ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                )}
                Teams
              </Button>
            )}

          {/* Complete indicator */}
          {event.import_status === "complete" && event.has_team_lists && (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

// ---------------------------------------------------------------------------
// Status Badge
// ---------------------------------------------------------------------------

interface EventStatusBadgeProps {
  status: string;
  activeJob: JobState | null;
}

function EventStatusBadge({
  status,
  activeJob,
}: EventStatusBadgeProps) {
  if (activeJob) {
    if (activeJob.type === "teams" && activeJob.total && activeJob.total > 0) {
      const pct = Math.round(
        ((activeJob.scraped ?? 0) / activeJob.total) * 100
      );
      return (
        <Badge variant="secondary" className="text-xs">
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          Teams {activeJob.scraped}/{activeJob.total} ({pct}%)
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="text-xs">
        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
        {activeJob.type === "roster"
          ? "Scraping roster..."
          : "Scraping teams..."}
      </Badge>
    );
  }

  switch (status) {
    case "complete":
      return (
        <Badge variant="default" className="text-xs">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Complete
        </Badge>
      );
    case "roster":
      return (
        <Badge variant="secondary" className="text-xs">
          <Clock className="mr-1 h-3 w-3" />
          Roster imported
        </Badge>
      );
    case "teams":
      return (
        <Badge variant="secondary" className="text-xs">
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          Importing teams
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="destructive" className="text-xs">
          <XCircle className="mr-1 h-3 w-3" />
          Failed
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-xs">
          Pending
        </Badge>
      );
  }
}
