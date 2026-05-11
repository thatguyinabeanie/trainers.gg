"use client";

import { useState, useEffect } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  CloudDownload,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { supabase } from "@/lib/supabase/client";
import { LIMITLESS_TO_FORMAT } from "@/lib/limitless";
import {
  discoverRk9Events,
  scrapeRk9Roster,
  scrapeRk9TeamsBatch,
} from "@/actions/rk9";
import {
  queueTournamentForImport,
  batchQueueTournaments,
  triggerLimitlessSync,
} from "@/actions/limitless";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RK9EventRow {
  event_id: string;
  name: string;
  tier: string;
  date_start: string;
  date_end: string | null;
  location_city: string | null;
  location_country: string | null;
  player_count: number | null;
  has_team_lists: boolean;
  import_status: string;
  import_error: string | null;
}

interface LimitlessTournamentRow {
  tournament_id: string;
  name: string;
  format_id: string;
  date: string;
  player_count: number;
  data_imported_at: string | null;
  import_status: string | null;
  import_requested_at: string | null;
  import_error: string | null;
  import_attempts: number | null;
}

interface LimitlessStatsResponse {
  totalSynced: number;
  totalImported: number;
  formats: {
    limitlessCode: string;
    formatId: string;
    synced: number;
    imported: number;
  }[];
}

type Source = "rk9" | "limitless";
type StatusFilter = "all" | "pending" | "complete" | "failed" | "in-progress";
type SortDirection = "asc" | "desc";

type RK9SortColumn =
  | "name"
  | "tier"
  | "date_start"
  | "player_count"
  | "import_status";
type LimitlessSortColumn =
  | "name"
  | "format_id"
  | "date"
  | "player_count"
  | "import_status";

interface SortState<T extends string> {
  column: T;
  direction: SortDirection;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isUpcoming(dateStart: string): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return dateStart > today;
}

// Sortable table header
function SortableHeader<T extends string>({
  column,
  label,
  sort,
  onSort,
  className,
}: {
  column: T;
  label: string;
  sort: SortState<T>;
  onSort: (column: T) => void;
  className?: string;
}) {
  const isActive = sort.column === column;
  return (
    <TableHead className={className}>
      <button
        className="hover:text-foreground inline-flex items-center gap-1"
        onClick={() => onSort(column)}
      >
        {label}
        {isActive ? (
          sort.direction === "asc" ? (
            <ArrowUp className="h-3.5 w-3.5" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5" />
          )
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
        )}
      </button>
    </TableHead>
  );
}

// Generic sort toggle handler
function toggleSort<T extends string>(
  current: SortState<T>,
  column: T
): SortState<T> {
  if (current.column === column) {
    return { column, direction: current.direction === "asc" ? "desc" : "asc" };
  }
  return { column, direction: "asc" };
}

// Compare values for sorting (handles strings, numbers, nulls)
function compareValues(
  a: string | number | null | undefined,
  b: string | number | null | undefined,
  direction: SortDirection
): number {
  const aVal = a ?? "";
  const bVal = b ?? "";
  let result: number;
  if (typeof aVal === "number" && typeof bVal === "number") {
    result = aVal - bVal;
  } else {
    result = String(aVal).localeCompare(String(bVal));
  }
  return direction === "desc" ? -result : result;
}

async function callLimitlessStats(): Promise<LimitlessStatsResponse> {
  const { data, error } = await supabase.functions.invoke<{
    success: boolean;
    data: LimitlessStatsResponse;
    error?: string;
  }>("limitless-import", { body: { action: "stats" } });

  if (error) throw error;
  if (!data?.success) throw new Error(data?.error ?? "Unknown error");
  return data.data;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ExternalData() {
  const [source, setSource] = useState<Source>("rk9");
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // RK9 state
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoverMessage, setDiscoverMessage] = useState<string | null>(null);
  const [activeJobs, setActiveJobs] = useState<
    Map<string, { type: string; scraped?: number; total?: number }>
  >(new Map());

  // Limitless state
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [queuingIds, setQueuingIds] = useState<Set<string>>(new Set());
  const [batchQueuing, setBatchQueuing] = useState(false);
  const [queueBatchSize, setQueueBatchSize] = useState(500);

  // Sort state
  const [rk9Sort, setRk9Sort] = useState<SortState<RK9SortColumn>>({
    column: "date_start",
    direction: "desc",
  });
  const [limitlessSort, setLimitlessSort] = useState<
    SortState<LimitlessSortColumn>
  >({
    column: "date",
    direction: "desc",
  });

  // Handler to switch source and reset filters
  function switchSource(newSource: Source) {
    setSource(newSource);
    setSearchQuery("");
    setStatusFilter("all");
  }

  // -------------------------------------------------------------------------
  // RK9 data
  // -------------------------------------------------------------------------

  const {
    data: rk9Events,
    error: rk9Error,
    isLoading: rk9Loading,
  } = useSupabaseQuery(
    async (sb) => {
      if (source !== "rk9") return [];
      const { data, error } = await sb
        .schema("rk9")
        .from("events")
        .select(
          "event_id, name, tier, date_start, date_end, location_city, location_country, player_count, has_team_lists, import_status, import_error"
        )
        .order("date_start", { ascending: false });
      if (error) throw error;
      return (data ?? []) as RK9EventRow[];
    },
    [source, refreshKey]
  );

  // -------------------------------------------------------------------------
  // Limitless data
  // -------------------------------------------------------------------------

  const {
    data: limitlessStats,
    error: limitlessStatsError,
    isLoading: limitlessStatsLoading,
  } = useSupabaseQuery(async () => {
    if (source !== "limitless") return null;
    return callLimitlessStats();
  }, [source, refreshKey]);

  const {
    data: limitlessTournaments,
    error: limitlessError,
    isLoading: limitlessLoading,
  } = useSupabaseQuery(
    async (sb) => {
      if (source !== "limitless") return [];
      const { data, error } = await sb
        .schema("limitless")
        .from("tournaments")
        .select(
          "tournament_id, name, format_id, date, player_count, data_imported_at, import_status, import_requested_at, import_error, import_attempts"
        )
        .order("date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as LimitlessTournamentRow[];
    },
    [source, refreshKey]
  );

  // Build format lookup
  const FORMAT_ID_TO_CODE: Record<string, string> = {};
  if (limitlessStats) {
    for (const f of limitlessStats.formats) {
      FORMAT_ID_TO_CODE[f.formatId] = f.limitlessCode;
    }
  }
  for (const [code, fmtId] of Object.entries(LIMITLESS_TO_FORMAT)) {
    FORMAT_ID_TO_CODE[fmtId] = code;
  }

  // -------------------------------------------------------------------------
  // Auto-poll for Limitless queue
  // -------------------------------------------------------------------------

  const limitlessQueuedCount = (limitlessTournaments ?? []).filter(
    (t) => t.import_status === "queued"
  ).length;
  const limitlessImportingCount = (limitlessTournaments ?? []).filter(
    (t) => t.import_status === "importing"
  ).length;
  const hasActiveQueue =
    limitlessQueuedCount > 0 || limitlessImportingCount > 0;

  useEffect(() => {
    if (source !== "limitless" || !hasActiveQueue) return;
    const interval = setInterval(() => {
      setRefreshKey((k) => k + 1);
    }, 5000);
    return () => clearInterval(interval);
  }, [source, hasActiveQueue]);

  // -------------------------------------------------------------------------
  // RK9 filtering + sorting
  // -------------------------------------------------------------------------

  const filteredRk9 = (rk9Events ?? [])
    .filter((e) => {
      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (
          !e.name.toLowerCase().includes(q) &&
          !e.event_id.toLowerCase().includes(q)
        )
          return false;
      }
      // Status filter
      if (statusFilter === "pending" && e.import_status !== "pending")
        return false;
      if (statusFilter === "complete" && e.import_status !== "complete")
        return false;
      if (statusFilter === "failed" && e.import_status !== "failed")
        return false;
      if (
        statusFilter === "in-progress" &&
        e.import_status !== "roster" &&
        e.import_status !== "teams"
      )
        return false;
      return true;
    })
    .sort((a, b) => {
      const { column, direction } = rk9Sort;
      switch (column) {
        case "name":
          return compareValues(a.name, b.name, direction);
        case "tier":
          return compareValues(a.tier, b.tier, direction);
        case "date_start":
          return compareValues(a.date_start, b.date_start, direction);
        case "player_count":
          return compareValues(a.player_count, b.player_count, direction);
        case "import_status":
          return compareValues(a.import_status, b.import_status, direction);
        default:
          return 0;
      }
    });

  // -------------------------------------------------------------------------
  // Limitless filtering + sorting
  // -------------------------------------------------------------------------

  const filteredLimitless = (limitlessTournaments ?? [])
    .filter((t) => {
      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (
          !t.name.toLowerCase().includes(q) &&
          !t.tournament_id.toLowerCase().includes(q) &&
          !(FORMAT_ID_TO_CODE[t.format_id] ?? t.format_id)
            .toLowerCase()
            .includes(q)
        )
          return false;
      }
      // Status filter
      const s = t.import_status;
      if (statusFilter === "pending" && s !== null && s !== "failed")
        return false;
      if (statusFilter === "complete" && s !== "completed") return false;
      if (statusFilter === "failed" && s !== "failed") return false;
      if (statusFilter === "in-progress" && s !== "queued" && s !== "importing")
        return false;
      return true;
    })
    .sort((a, b) => {
      const { column, direction } = limitlessSort;
      switch (column) {
        case "name":
          return compareValues(a.name, b.name, direction);
        case "format_id":
          return compareValues(
            FORMAT_ID_TO_CODE[a.format_id] ?? a.format_id,
            FORMAT_ID_TO_CODE[b.format_id] ?? b.format_id,
            direction
          );
        case "date":
          return compareValues(a.date, b.date, direction);
        case "player_count":
          return compareValues(a.player_count, b.player_count, direction);
        case "import_status":
          return compareValues(a.import_status, b.import_status, direction);
        default:
          return 0;
      }
    });

  // -------------------------------------------------------------------------
  // RK9 stats
  // -------------------------------------------------------------------------

  const rk9Total = rk9Events?.length ?? 0;
  const rk9Imported =
    rk9Events?.filter(
      (e) =>
        e.import_status === "roster" ||
        e.import_status === "teams" ||
        e.import_status === "complete"
    ).length ?? 0;
  const rk9WithTeams = rk9Events?.filter((e) => e.has_team_lists).length ?? 0;

  // -------------------------------------------------------------------------
  // RK9 actions
  // -------------------------------------------------------------------------

  async function handleDiscover() {
    setIsDiscovering(true);
    setDiscoverMessage(null);
    try {
      const result = await discoverRk9Events();
      if (result.success) {
        const count = result.events?.length ?? 0;
        const live = result.sources?.live ?? 0;
        const archive = result.sources?.archive ?? 0;
        setDiscoverMessage(
          `Discovered ${count} events (${live} live, ${archive} from archive)`
        );
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
      let done = false;
      while (!done) {
        const result = await scrapeRk9TeamsBatch(eventId);
        if (!result.success) break;
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
  // Limitless actions
  // -------------------------------------------------------------------------

  async function handleSync() {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const result = await triggerLimitlessSync();
      if (!result.success) throw new Error(result.error);
      setSyncMessage("Sync completed successfully");
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setSyncMessage(
        `Error: ${err instanceof Error ? err.message : "Sync failed"}`
      );
    } finally {
      setSyncing(false);
    }
  }

  async function handleQueueOne(tournamentId: string) {
    setQueuingIds((prev) => new Set(prev).add(tournamentId));
    try {
      const result = await queueTournamentForImport(tournamentId);
      if (!result.success) throw new Error(result.error);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      console.error("Failed to queue tournament:", err);
    } finally {
      setQueuingIds((prev) => {
        const next = new Set(prev);
        next.delete(tournamentId);
        return next;
      });
    }
  }

  async function handleQueueAll() {
    const toQueue = filteredLimitless
      .filter((t) => !t.import_status || t.import_status === "failed")
      .slice(0, queueBatchSize);
    if (toQueue.length === 0) return;

    setBatchQueuing(true);
    try {
      const ids = toQueue.map((t) => t.tournament_id);
      const result = await batchQueueTournaments(ids);
      if (!result.success) throw new Error(result.error);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      console.error("Failed to batch queue:", err);
    } finally {
      setBatchQueuing(false);
    }
  }

  const limitlessPendingCount = (limitlessTournaments ?? []).filter(
    (t) => !t.import_status || t.import_status === "failed"
  ).length;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const isLoading = source === "rk9" ? rk9Loading : limitlessLoading;
  const queryError = source === "rk9" ? rk9Error : limitlessError;

  return (
    <div className="space-y-6">
      {/* Source Toggle */}
      <div className="flex items-center justify-between">
        <div className="inline-flex rounded-lg border p-1">
          <button
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
              source === "rk9"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => switchSource("rk9")}
          >
            RK9
          </button>
          <button
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
              source === "limitless"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => switchSource("limitless")}
          >
            Limitless
          </button>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setRefreshKey((k) => k + 1)}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Stats Row */}
      {source === "rk9" ? (
        <Card>
          <CardContent className="flex items-center gap-6 p-4">
            <div className="flex items-center gap-2">
              <Globe className="text-muted-foreground h-4 w-4" />
              <div>
                <p className="text-2xl font-bold">{rk9Total}</p>
                <p className="text-muted-foreground text-xs">Events</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <div>
                <p className="text-2xl font-bold">{rk9Imported}</p>
                <p className="text-muted-foreground text-xs">Imported</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Users className="text-muted-foreground h-4 w-4" />
              <div>
                <p className="text-2xl font-bold">{rk9WithTeams}</p>
                <p className="text-muted-foreground text-xs">With teams</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-4 p-4">
            {limitlessStatsLoading ? (
              <Skeleton className="h-6 w-64" />
            ) : limitlessStats ? (
              <>
                <Badge variant="secondary" className="text-sm">
                  {limitlessStats.totalSynced} synced
                </Badge>
                <Badge variant="default" className="text-sm">
                  {limitlessStats.totalImported} imported
                </Badge>
                {limitlessQueuedCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="bg-amber-500/10 text-sm text-amber-700 dark:text-amber-400"
                  >
                    <Clock className="mr-1 h-3 w-3" />
                    {limitlessQueuedCount} queued
                  </Badge>
                )}
                {limitlessImportingCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="bg-blue-500/10 text-sm text-blue-700 dark:text-blue-400"
                  >
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    {limitlessImportingCount} importing
                  </Badge>
                )}
              </>
            ) : null}
            {limitlessStatsError && (
              <p className="text-xs text-red-500">
                {limitlessStatsError.message}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Primary Action */}
      <div className="flex flex-wrap items-center gap-3">
        {source === "rk9" ? (
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
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <Button onClick={handleSync} disabled={syncing} size="sm">
                {syncing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CloudDownload className="mr-2 h-4 w-4" />
                )}
                Sync Now
              </Button>
              {syncMessage && (
                <p
                  className={cn(
                    "text-xs",
                    syncMessage.startsWith("Error")
                      ? "text-red-500"
                      : "text-muted-foreground"
                  )}
                >
                  {syncMessage}
                </p>
              )}
            </div>
            {limitlessPendingCount > 0 && (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={5000}
                  value={queueBatchSize}
                  onChange={(e) =>
                    setQueueBatchSize(
                      Math.max(1, parseInt(e.target.value, 10) || 1)
                    )
                  }
                  className="w-20"
                />
                <Button
                  onClick={handleQueueAll}
                  disabled={batchQueuing}
                  size="sm"
                  variant="outline"
                >
                  {batchQueuing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Queue {Math.min(limitlessPendingCount, queueBatchSize)}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Filters Row */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder={
              source === "rk9"
                ? "Search events..."
                : "Search tournaments by name, ID, or format..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as StatusFilter)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in-progress">In progress</SelectItem>
            <SelectItem value="complete">Complete</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Error */}
      {queryError && (
        <div className="rounded-lg bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400">
          {queryError.message}
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : source === "rk9" ? (
        filteredRk9.length === 0 ? (
          <div className="text-muted-foreground py-12 text-center text-sm">
            {rk9Total === 0
              ? 'No events found. Click "Discover Events" to fetch from RK9.'
              : "No events match your filters."}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHeader
                    column="name"
                    label="Event"
                    sort={rk9Sort}
                    onSort={(c) => setRk9Sort(toggleSort(rk9Sort, c))}
                  />
                  <SortableHeader
                    column="tier"
                    label="Tier"
                    sort={rk9Sort}
                    onSort={(c) => setRk9Sort(toggleSort(rk9Sort, c))}
                  />
                  <SortableHeader
                    column="date_start"
                    label="Date"
                    sort={rk9Sort}
                    onSort={(c) => setRk9Sort(toggleSort(rk9Sort, c))}
                  />
                  <SortableHeader
                    column="player_count"
                    label="Players"
                    sort={rk9Sort}
                    onSort={(c) => setRk9Sort(toggleSort(rk9Sort, c))}
                  />
                  <SortableHeader
                    column="import_status"
                    label="Status"
                    sort={rk9Sort}
                    onSort={(c) => setRk9Sort(toggleSort(rk9Sort, c))}
                  />
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRk9.map((event) => {
                  const upcoming = isUpcoming(event.date_start);
                  const activeJob = activeJobs.get(event.event_id) ?? null;
                  const isBusy = activeJob !== null;

                  return (
                    <TableRow
                      key={event.event_id}
                      className={upcoming ? "opacity-60" : undefined}
                    >
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
                            {event.location_country
                              ? `, ${event.location_country}`
                              : ""}
                          </p>
                        )}
                        {!upcoming && (
                          <div className="mt-0.5 flex items-center gap-2 text-xs">
                            <a
                              href={`https://rk9.gg/roster/${event.event_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-foreground hover:underline"
                            >
                              Roster
                            </a>
                            <a
                              href={`https://rk9.gg/pairings/${event.event_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-foreground hover:underline"
                            >
                              Pairings
                            </a>
                            <a
                              href={`https://rk9.gg/standings/${event.event_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-foreground hover:underline"
                            >
                              Standings
                            </a>
                          </div>
                        )}
                        {event.import_error && (
                          <p className="mt-0.5 text-xs text-red-500">
                            {event.import_error}
                          </p>
                        )}
                      </TableCell>

                      {/* Tier */}
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className="text-xs capitalize"
                        >
                          {event.tier}
                        </Badge>
                      </TableCell>

                      {/* Date */}
                      <TableCell className="text-sm">
                        {event.date_start}
                      </TableCell>

                      {/* Players */}
                      <TableCell className="text-sm">
                        {event.player_count ?? "—"}
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <RK9StatusBadge
                          status={event.import_status}
                          activeJob={activeJob}
                          upcoming={upcoming}
                        />
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        {upcoming ? null : event.import_status === "complete" &&
                          event.has_team_lists ? (
                          <CheckCircle2 className="ml-auto h-4 w-4 text-emerald-500" />
                        ) : event.import_status === "pending" ||
                          event.import_status === "failed" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleScrapeRoster(event.event_id)}
                            disabled={isBusy}
                          >
                            {activeJob?.type === "roster" ? (
                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Download className="mr-1.5 h-3.5 w-3.5" />
                            )}
                            Roster
                          </Button>
                        ) : event.import_status === "roster" ||
                          event.import_status === "teams" ||
                          (event.import_status === "complete" &&
                            !event.has_team_lists) ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleScrapeTeams(event.event_id)}
                            disabled={isBusy}
                          >
                            {activeJob?.type === "teams" ? (
                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Download className="mr-1.5 h-3.5 w-3.5" />
                            )}
                            Teams
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )
      ) : filteredLimitless.length === 0 ? (
        <div className="text-muted-foreground py-12 text-center text-sm">
          {(limitlessTournaments ?? []).length === 0
            ? 'No tournaments found. Click "Sync Now" to fetch from Limitless.'
            : "No tournaments match your filters."}
        </div>
      ) : (
        <div className="rounded-md border">
          <div className="text-muted-foreground px-4 py-2 text-xs">
            Showing {filteredLimitless.length} of{" "}
            {(limitlessTournaments ?? []).length} tournaments
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHeader
                  column="name"
                  label="Tournament"
                  sort={limitlessSort}
                  onSort={(c) => setLimitlessSort(toggleSort(limitlessSort, c))}
                />
                <SortableHeader
                  column="format_id"
                  label="Format"
                  sort={limitlessSort}
                  onSort={(c) => setLimitlessSort(toggleSort(limitlessSort, c))}
                />
                <SortableHeader
                  column="date"
                  label="Date"
                  sort={limitlessSort}
                  onSort={(c) => setLimitlessSort(toggleSort(limitlessSort, c))}
                />
                <SortableHeader
                  column="player_count"
                  label="Players"
                  sort={limitlessSort}
                  onSort={(c) => setLimitlessSort(toggleSort(limitlessSort, c))}
                  className="text-right"
                />
                <SortableHeader
                  column="import_status"
                  label="Status"
                  sort={limitlessSort}
                  onSort={(c) => setLimitlessSort(toggleSort(limitlessSort, c))}
                />
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLimitless.map((t) => {
                const isQueuing = queuingIds.has(t.tournament_id);

                return (
                  <TableRow key={t.tournament_id}>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <a
                          href={`https://play.limitlesstcg.com/tournament/${t.tournament_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium hover:underline"
                        >
                          {t.name}
                        </a>
                        <a
                          href={`https://play.limitlesstcg.com/tournament/${t.tournament_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                      <div className="text-muted-foreground font-mono text-xs">
                        {t.tournament_id}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs">
                        <a
                          href={`https://play.limitlesstcg.com/tournament/${t.tournament_id}/standings`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground hover:underline"
                        >
                          Standings
                        </a>
                        <a
                          href={`https://play.limitlesstcg.com/tournament/${t.tournament_id}/pairings`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground hover:underline"
                        >
                          Pairings
                        </a>
                        <a
                          href={`https://play.limitlesstcg.com/tournament/${t.tournament_id}/players`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground hover:underline"
                        >
                          Players
                        </a>
                      </div>
                      {t.import_error && (
                        <p className="mt-0.5 text-xs text-red-500">
                          {t.import_error}
                        </p>
                      )}
                    </TableCell>

                    {/* Format */}
                    <TableCell>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {FORMAT_ID_TO_CODE[t.format_id] ?? t.format_id}
                      </Badge>
                    </TableCell>

                    {/* Date */}
                    <TableCell className="text-sm">{t.date}</TableCell>

                    {/* Players */}
                    <TableCell className="text-right text-sm">
                      {t.player_count}
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <LimitlessStatusBadge tournament={t} />
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
                      {(!t.import_status || t.import_status === "failed") && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleQueueOne(t.tournament_id)}
                          disabled={isQueuing || batchQueuing}
                        >
                          {isQueuing ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// RK9 Status Badge
// ---------------------------------------------------------------------------

function RK9StatusBadge({
  status,
  activeJob,
  upcoming,
}: {
  status: string;
  activeJob: { type: string; scraped?: number; total?: number } | null;
  upcoming: boolean;
}) {
  if (upcoming) {
    return (
      <Badge variant="outline" className="text-xs text-blue-600">
        <Clock className="mr-1 h-3 w-3" />
        Upcoming
      </Badge>
    );
  }

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
          <Users className="mr-1 h-3 w-3" />
          Roster ready
        </Badge>
      );
    case "teams":
      return (
        <Badge variant="secondary" className="text-xs">
          <Clock className="mr-1 h-3 w-3" />
          Teams partial
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

// ---------------------------------------------------------------------------
// Limitless Status Badge
// ---------------------------------------------------------------------------

function LimitlessStatusBadge({
  tournament,
}: {
  tournament: LimitlessTournamentRow;
}) {
  const { import_status, import_attempts } = tournament;

  switch (import_status) {
    case "queued":
      return (
        <Badge
          variant="secondary"
          className="bg-amber-500/10 text-xs text-amber-700 dark:text-amber-400"
        >
          <Clock className="mr-1 h-3 w-3" />
          Queued
        </Badge>
      );
    case "importing":
      return (
        <Badge
          variant="secondary"
          className="bg-blue-500/10 text-xs text-blue-700 dark:text-blue-400"
        >
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          Importing
        </Badge>
      );
    case "completed":
      return (
        <Badge variant="default" className="text-xs">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Imported
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="destructive" className="text-xs">
          <XCircle className="mr-1 h-3 w-3" />
          Failed{import_attempts ? ` (${import_attempts}x)` : ""}
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
